---
status: fixing
trigger: "Transcription completion totally broken - completed project shows No Transcription Started, /project/new shows the transcript, can't start new projects"
created: 2026-02-11T00:00:00Z
updated: 2026-02-11T00:01:00Z
---

## Current Focus

hypothesis: CONFIRMED -- stale closure in startTranscription captures initial empty projectsState.projects
test: Applied projectsRef fix, TypeScript compiles cleanly
expecting: All 5 find() calls now read latest projects via ref
next_action: Verify fix resolves all 3 symptoms

## Symptoms

expected: After transcription completes, clicking the project in sidebar shows the full transcript
actual: (1) Completed project shows "No Transcription Started". (2) /project/new shows the transcript result. (3) Cannot start new projects.
errors: No runtime errors -- silent logic failure
reproduction: Start transcription, navigate away, navigate back after completion, observe sidebar project shows "No Transcription Started"
started: Since startTranscription was extracted into TranscriptionContext with useCallback([], [])

## Eliminated

(none yet -- first investigation)

## Evidence

- timestamp: 2026-02-11T00:01:00Z
  checked: TranscriptionContext.tsx lines 253-404 -- startTranscription useCallback dependency array
  found: |
  useCallback(async (...) => { ... }, []) at line 253/404.
  The callback captures `projectsState` and `updateProject` from the render scope at mount time.
  `projectsState` is destructured from `useProjects()` at line 217: `const { state: projectsState, updateProject } = useProjects();`
  Since deps = [], `projectsState` is frozen at its INITIAL value: `{ projects: [], initialized: false }`.
  implication: Every `projectsState.projects.find()` inside the callback searches an empty array and returns undefined.

- timestamp: 2026-02-11T00:02:00Z
  checked: All 5 projectsState.projects.find() calls inside startTranscription
  found: |
  Line 269: `const project = projectsState.projects.find((p) => p.id === projectId);` -- STALE, returns undefined
  Line 299: `const currentProject = projectsState.projects.find(...)` -- STALE, returns undefined
  Line 346: `const completedProject = projectsState.projects.find(...)` -- STALE, returns undefined
  Line 375: `const cancelledProject = projectsState.projects.find(...)` -- STALE, returns undefined
  Line 395: `const errorProject = projectsState.projects.find(...)` -- STALE, returns undefined

  Every `if (project)` / `if (currentProject)` / etc. guard evaluates to FALSE.
  Therefore updateProject() is NEVER called inside startTranscription.
  implication: |
  The project metadata in localStorage/React state is NEVER updated from its initial status.
  After createProject(), status starts as 'idle' (per storageService).
  It stays 'idle' forever because none of the updateProject() calls execute.

- timestamp: 2026-02-11T00:03:00Z
  checked: updateProject function stability
  found: |
  `updateProject` is created via useCallback([], []) in ProjectsContext.tsx line 110.
  It takes the FULL project object as argument and writes it to storage + dispatches.
  The function itself is stable (no stale closure issue on updateProject).
  The PROBLEM is that the callers spread a stale project object: `updateProject({ ...completedProject, status: 'completed' })`.
  Since completedProject is undefined, the spread + updateProject call never happens.
  implication: Even if updateProject were called with just {id, status}, it would work. The issue is entirely that the find() returns undefined.

- timestamp: 2026-02-11T00:04:00Z
  checked: CenterPanel.tsx routing logic (lines 1-79)
  found: |
  When user clicks a project in sidebar, CenterPanel renders at /project/:projectId.
  Line 66-75: If transcriptionState.activeProjectId === projectId AND isTranscribing, shows ProjectPage (live view).
  Line 78: Otherwise shows TranscriptPanel with the project metadata.

  After transcription completes, isTranscribing = false (state is 'completed' not in ['uploading','processing','cancelling']).
  So CenterPanel renders TranscriptPanel.
  implication: CenterPanel routing is correct -- it delegates to TranscriptPanel for completed projects.

- timestamp: 2026-02-11T00:05:00Z
  checked: TranscriptPanel.tsx rendering logic (lines 1-229)
  found: |
  Line 25: `if (project.status === 'idle')` --> renders "No Transcription Started"

  Since the stale closure prevented updateProject from ever changing status from 'idle',
  the project.status is STILL 'idle' even after transcription completed successfully.
  TranscriptPanel sees status='idle' and renders "No Transcription Started".
  implication: This is the direct cause of Symptom #1. The transcript data IS saved to localStorage (saveTranscript at line 334 uses projectId directly, not a stale closure), but the metadata status was never updated.

- timestamp: 2026-02-11T00:06:00Z
  checked: ProjectPage.tsx -- why /project/new shows the completed transcript
  found: |
  Line 377-405: When transcriptionState.state === 'completed', ProjectPage renders TranscriptView
  with transcriptionState.transcript (from context, NOT from localStorage).

  After transcription completes:
  1. The context reducer sets state='completed' with transcript data (line 331 dispatch)
  2. ProjectPage at /project/new: the reactive navigation effect (line 79-99) fires:
     - It checks `if (transcriptionState.state === 'completed')` and navigates to `/project/${createdProjectId}`.
     - BUT: does the navigate happen? Let's check...

  Actually, the reactive navigation DOES fire (line 85-87):
  `navigate(`/project/${createdProjectId}`, { replace: true })`
  This should redirect away from /project/new.

  HOWEVER: If the user manually navigates BACK to /project/new later, the context state
  is STILL 'completed' (nobody called reset()). So ProjectPage at /project/new renders
  the TranscriptView with the stale context transcript.

  The "New Transcription" button calls handleReset which calls reset() -> dispatch RESET -> idle.
  But until clicked, the completed state persists in context.
  implication: |
  Symptom #2 (/project/new shows transcript) happens when:
  - User navigates to /project/new AFTER transcription completed
  - Context state is still 'completed' (not reset)
  - OR: The initial navigation to /project/{id} lands on a project with status='idle',
    user sees "No Transcription Started", hits back/clicks "New Project", arrives at
    /project/new which still has the completed transcript in context.

- timestamp: 2026-02-11T00:07:00Z
  checked: Symptom #3 -- Can't start new projects
  found: |
  At /project/new, line 265: FileUpload only renders when `transcriptionState.state === 'idle'`.
  If context state is 'completed' (never reset), FileUpload is hidden.
  Instead, the completed TranscriptView is shown (line 377-405).
  The only escape is clicking "New Transcription" button which calls handleReset().

  So technically Symptom #3 is recoverable (user CAN click "New Transcription"),
  but the UX is broken because the transcript shown is for a DIFFERENT project.
  implication: Symptom #3 is a consequence of Symptom #2. Fixing the root cause (stale closure) fixes all three.

## Resolution

root_cause: |
**Stale closure in `startTranscription` (TranscriptionContext.tsx lines 253-404)**

`useCallback(async (...) => { ... }, [])` captures `projectsState` from the initial render.
At mount time, `projectsState.projects` is an empty array `[]`.

The callback contains 5 calls to `projectsState.projects.find((p) => p.id === projectId)`,
at lines 269, 299, 346, 375, and 395. All return `undefined` because the array is empty.

Each find() is guarded by `if (project)`, so all 5 `updateProject()` calls are silently skipped.
The project metadata status is NEVER updated from its initial 'idle' value.

**Consequence chain:**

1. Project status stays 'idle' in localStorage/React state
2. TranscriptPanel sees status='idle' -> renders "No Transcription Started"
3. Context machine state IS 'completed' with transcript data (reducer works fine)
4. ProjectPage at /project/new reads from context -> shows TranscriptView
5. FileUpload hidden because state !== 'idle' -> can't start new projects

**Secondary issue:** Even after the stale closure is fixed, the pattern of
`updateProject({ ...project, status: 'completed' })` (spreading the FULL project)
is fragile. If the project object was modified between the find() and the updateProject() call,
the spread would overwrite those changes. The safer pattern is to read the latest project
at the moment of each update.

fix: |
**Primary fix: Use a ref to always access latest projects list**

In TranscriptionContext.tsx:

1. Add a ref that tracks the latest projects array:

   ```typescript
   const projectsRef = useRef(projectsState.projects);
   useEffect(() => {
     projectsRef.current = projectsState.projects;
   }, [projectsState.projects]);
   ```

2. Replace all 5 `projectsState.projects.find(...)` calls inside startTranscription
   with `projectsRef.current.find(...)`:
   - Line 269: `projectsRef.current.find((p) => p.id === projectId)`
   - Line 299: `projectsRef.current.find((p) => p.id === projectId)`
   - Line 346: `projectsRef.current.find((p) => p.id === projectId)`
   - Line 375: `projectsRef.current.find((p) => p.id === projectId)`
   - Line 395: `projectsRef.current.find((p) => p.id === projectId)`

This is the MINIMAL change. The ref is always updated via the useEffect whenever
projectsState.projects changes, and refs are mutable so the closure reads the latest
value at call time.

**Alternative considered but rejected:**

- Adding projectsState.projects to the useCallback deps array: This would re-create
  startTranscription on every projects change, which could cause issues if
  startTranscription is in-flight (the function reference changes mid-operation,
  though the old closure would still complete). The ref approach is cleaner and
  is the established React pattern for this problem.

verification: |

- TypeScript compiles with zero errors (npx tsc --noEmit)
- All 5 projectsState.projects.find() replaced with projectsRef.current.find()
- Zero remaining stale references (grep confirms no projectsState.projects.find in file)
- projectsRef synced via useEffect on every projectsState.projects change
- Awaiting runtime verification (manual test of transcription flow)
  files_changed:
- src/contexts/TranscriptionContext.tsx
