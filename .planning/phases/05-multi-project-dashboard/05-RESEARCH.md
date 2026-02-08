# Phase 5: Multi-Project Dashboard - Research

**Researched:** 2026-02-07
**Domain:** React dashboard UI with CRUD operations, confirmation dialogs, inline editing, project card layouts
**Confidence:** HIGH

## Summary

Phase 5 transforms the existing placeholder `DashboardPage.tsx` into a fully functional multi-project dashboard with CRUD operations. The current codebase already has all the foundational infrastructure in place: `ProjectsContext` exposes `createProject`, `updateProject`, and `removeProject` methods backed by `storageService.ts` with debounced writes and quota handling. The existing `DashboardPage.tsx` already renders a project list with navigation to `/project/:projectId` and a "New Transcription" button that navigates to `/project/new`. The route `project/:projectId` exists in `App.tsx` but `ProjectPage.tsx` currently only handles the `new` case (file upload flow) -- loading an existing project's transcript is deferred to this phase with an explicit comment: `const _ = isNew; // Acknowledge -- existing project loading deferred to Phase 5`.

The work divides into four clear requirements: (PROJ-01) enhancing the dashboard layout to be a proper landing page with list/grid display, (PROJ-02) wiring the "create new project" flow so that upload triggers project creation in storage, (PROJ-03) inline rename functionality for projects, and (PROJ-04) delete with confirmation dialog. No new npm dependencies are needed. The HTML `<dialog>` element provides built-in focus trapping, backdrop, and Escape-key dismissal -- eliminating the need for a modal library. Inline rename follows the standard "click to edit" pattern with a controlled input, Enter/Escape key handling, and focus management via `useRef`.

**Primary recommendation:** Enhance the existing `DashboardPage.tsx` with project card actions (rename, delete), build a reusable `ConfirmDialog` component using the native `<dialog>` element, implement inline rename with keyboard support, and wire the create flow to persist projects via `useProjects().createProject`. Also complete the deferred `ProjectPage` work to load existing projects from storage.

## Standard Stack

### Core

No new npm dependencies required. This phase uses only existing project infrastructure and browser APIs.

| Tool                            | Version            | Purpose                                      | Why Standard                                                                |
| ------------------------------- | ------------------ | -------------------------------------------- | --------------------------------------------------------------------------- |
| React Context (ProjectsContext) | React 18.3.1       | Project CRUD state management                | Already built in Phase 4, exposes createProject/updateProject/removeProject |
| storageService.ts               | Custom (Phase 3)   | localStorage persistence                     | Already handles project CRUD, debounced writes, quota detection             |
| HTML `<dialog>` element         | Web API            | Modal confirmation dialog                    | Native focus trap, backdrop, Escape handling -- no library needed           |
| Tailwind CSS                    | 3.4.18 (installed) | Styling dashboard cards, dialog, inline edit | Already the project's styling system                                        |
| react-router                    | 7.13.0 (installed) | Navigation from dashboard to project         | Already configured with routes                                              |

### Supporting

| Tool                  | Version      | Purpose                                       | When to Use                                           |
| --------------------- | ------------ | --------------------------------------------- | ----------------------------------------------------- |
| `useRef`              | React 18.3.1 | Focus management for inline rename and dialog | When switching between view/edit mode, opening dialog |
| `crypto.randomUUID()` | Web API      | Project ID generation                         | Already used by `createProject` in storageService     |

### Alternatives Considered

| Instead of              | Could Use                              | Tradeoff                                                                                                                                                                                        |
| ----------------------- | -------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Native `<dialog>`       | Headless UI Dialog / Radix AlertDialog | Libraries add ~5-15KB for one dialog. Native `<dialog>` has full browser support (Baseline 2022) and built-in focus trap/backdrop. Overkill for a single confirmation dialog.                   |
| Hand-rolled inline edit | react-inline-editing npm               | Package has 12 weekly downloads and no TypeScript types. Our rename input is a single text field -- a controlled `<input>` with onKeyDown is simpler and more maintainable.                     |
| Custom card grid        | Material Tailwind / Flowbite cards     | Adds component library dependency. The existing project already uses raw Tailwind classes for all UI. A responsive grid with `grid-cols-1 md:grid-cols-2 lg:grid-cols-3` is 1 line of Tailwind. |

**Installation:**

```bash
# No new packages needed
```

## Architecture Patterns

### Recommended Project Structure

```
src/
  features/
    dashboard/
      DashboardPage.tsx         # Enhanced: project grid, empty state, create button
      components/
        ProjectCard.tsx          # Individual project card with rename/delete actions
        ConfirmDialog.tsx        # Reusable native <dialog> confirmation component
        EmptyState.tsx           # Empty dashboard state with CTA
  contexts/
    ProjectsContext.tsx          # Already exists -- no changes needed
  services/
    storageService.ts           # Already exists -- no changes needed
```

**Key decisions:**

1. **`ConfirmDialog` lives in dashboard/components** because it is first used here. If later reused across features, it can be promoted to a shared `components/` directory. Premature generalization is an anti-pattern.
2. **`ProjectCard` is extracted** from the dashboard to keep the page component focused on layout and coordination. Each card encapsulates its own rename/delete UI state.
3. **No new contexts or hooks needed.** `useProjects()` already provides everything. The dashboard is a consumer, not a state owner.

### Pattern 1: Native `<dialog>` for Confirmation

**What:** Use the HTML `<dialog>` element with `showModal()` for the delete confirmation dialog. It provides built-in focus trapping, backdrop (`::backdrop` CSS pseudo-element), Escape key dismissal, and proper ARIA semantics.

**When to use:** Any modal that blocks interaction with the page content.

**Example:**

```typescript
// Source: https://developer.mozilla.org/en-US/docs/Web/HTML/Element/dialog
// Adapted for React with useRef

import { useRef, useEffect } from 'react';

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
  variant?: 'danger' | 'default';
}

function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  onConfirm,
  onCancel,
  variant = 'default',
}: ConfirmDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (open && !dialog.open) {
      dialog.showModal();
    } else if (!open && dialog.open) {
      dialog.close();
    }
  }, [open]);

  return (
    <dialog
      ref={dialogRef}
      onCancel={onCancel}  // Handles Escape key
      className="rounded-xl border-0 p-0 shadow-xl backdrop:bg-black/50"
    >
      <div className="w-80 p-6">
        <h3 className="mb-2 text-lg font-semibold text-slate-900">{title}</h3>
        <p className="mb-6 text-sm text-slate-600">{message}</p>
        <div className="flex justify-end gap-3">
          <button onClick={onCancel} className="...">
            {cancelLabel}
          </button>
          <button
            onClick={onConfirm}
            className={variant === 'danger' ? 'bg-red-600 ...' : 'bg-indigo-600 ...'}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </dialog>
  );
}
```

**Rationale:** The native `<dialog>` element is Baseline 2022 (supported in all modern browsers). When opened with `showModal()`, it automatically traps focus within the dialog, shows a `::backdrop` overlay, and closes on Escape. This eliminates the need for `focus-trap-react` or Headless UI -- both of which solve the same problem but add bundle weight. The CSS-Tricks article "There is No Need to Trap Focus on a Dialog Element" confirms that `showModal()` provides native inert behavior for background content.

### Pattern 2: Inline Rename with Controlled Input

**What:** Click-to-edit pattern where the project name text becomes an input field on click. Enter saves, Escape cancels, and blur saves.

**When to use:** For PROJ-03 (rename project).

**Example:**

```typescript
// Source: https://www.emgoto.com/react-inline-edit/
// Adapted for this project's patterns

import { useState, useRef, useEffect } from 'react';

function InlineEdit({
  value,
  onSave,
}: {
  value: string;
  onSave: (newValue: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editing) {
      inputRef.current?.focus();
      inputRef.current?.select();
    }
  }, [editing]);

  const handleSave = () => {
    const trimmed = draft.trim();
    if (trimmed && trimmed !== value) {
      onSave(trimmed);
    } else {
      setDraft(value); // Revert if empty or unchanged
    }
    setEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSave();
    } else if (e.key === 'Escape') {
      setDraft(value);
      setEditing(false);
    }
  };

  if (editing) {
    return (
      <input
        ref={inputRef}
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={handleSave}
        onKeyDown={handleKeyDown}
        className="rounded border border-indigo-300 px-2 py-1 text-sm outline-none focus:ring-2 focus:ring-indigo-500"
        aria-label="Project name"
      />
    );
  }

  return (
    <button
      onClick={() => setEditing(true)}
      className="truncate text-left font-medium text-slate-800 hover:text-indigo-600"
      title="Click to rename"
    >
      {value}
    </button>
  );
}
```

**Rationale:** The click-to-edit pattern is well-established for inline rename. The critical accessibility requirements are: (1) focus moves to the input when editing starts, (2) Enter and Escape provide keyboard-only operation, (3) blur saves to prevent data loss from clicking away. The `onSave` callback calls `updateProject` from `ProjectsContext`, which writes through to `storageService.saveProject` with debounced persistence.

### Pattern 3: Responsive Card Grid

**What:** Use Tailwind CSS grid to display project cards in a responsive layout.

**When to use:** For PROJ-01 (project dashboard landing page).

**Example:**

```typescript
// Responsive grid: 1 column on mobile, 2 on tablet, 3 on desktop
<div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
  {projects.map((project) => (
    <ProjectCard key={project.id} project={project} />
  ))}
</div>
```

**Rationale:** The current `DashboardPage` uses a `space-y-3` vertical list with `max-w-2xl` constraint. The phase 5 upgrade should use a grid layout that scales better with many projects. The Tailwind grid utilities handle responsive breakpoints without custom CSS.

### Pattern 4: Empty State with Call to Action

**What:** When no projects exist, show a friendly empty state with a prominent call to action.

**When to use:** Dashboard with zero projects.

**Example:**

```typescript
<div className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-slate-300 py-16 text-center">
  {/* Icon */}
  <svg className="mb-4 h-12 w-12 text-slate-400" ...>...</svg>
  <h3 className="mb-2 text-lg font-semibold text-slate-700">
    No projects yet
  </h3>
  <p className="mb-6 text-sm text-slate-500">
    Upload an audio or video file to get started with your first transcription.
  </p>
  <button
    onClick={() => navigate('/project/new')}
    className="rounded-lg bg-indigo-600 px-6 py-3 font-medium text-white ..."
  >
    New Transcription
  </button>
</div>
```

**Rationale:** The current DashboardPage already has an empty state, but it is minimal ("No projects yet. Start a new transcription to get going."). Phase 5 should enhance this with a more visually engaging empty state that includes an icon and prominent CTA button, consistent with the hero section pattern already used in the dashboard.

### Pattern 5: Project Card with Actions Menu

**What:** Each project card shows metadata (name, date, status, segment count) and provides rename/delete action buttons. Actions can be icon buttons or a three-dot dropdown menu.

**When to use:** For each project in the dashboard grid.

**Example approach:**

```typescript
function ProjectCard({ project }: { project: ProjectMetadata }) {
  const navigate = useNavigate();
  const { updateProject, removeProject } = useProjects();
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const handleRename = (newName: string) => {
    updateProject({ ...project, name: newName });
  };

  const handleDelete = () => {
    removeProject(project.id);
    setShowDeleteConfirm(false);
  };

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm ...">
      {/* Clickable area navigates to project */}
      <button onClick={() => navigate(`/project/${project.id}`)} className="...">
        <InlineEdit value={project.name} onSave={handleRename} />
        <p className="text-sm text-slate-500">
          {new Date(project.createdAt).toLocaleDateString()}
          {' \u00b7 '}{project.segmentCount} segments
          {' \u00b7 '}<StatusBadge status={project.status} />
        </p>
      </button>

      {/* Action buttons */}
      <div className="flex gap-2">
        <button onClick={() => setShowDeleteConfirm(true)} title="Delete project">
          {/* Trash icon */}
        </button>
      </div>

      <ConfirmDialog
        open={showDeleteConfirm}
        title="Delete Project"
        message={`Are you sure you want to delete "${project.name}"? This cannot be undone.`}
        confirmLabel="Delete"
        onConfirm={handleDelete}
        onCancel={() => setShowDeleteConfirm(false)}
        variant="danger"
      />
    </div>
  );
}
```

**Rationale:** The interaction design separates the card's primary action (navigate to project) from secondary actions (rename, delete). The rename is inline (Pattern 2) and the delete uses a confirmation dialog (Pattern 1). This avoids the complexity of a dropdown actions menu while making common operations accessible.

### Anti-Patterns to Avoid

- **Putting CRUD logic in the dashboard component:** The dashboard should call `useProjects()` methods, not directly call `storageService` functions. The context is the single source of truth for project state.
- **Optimistic UI without error handling:** `createProject` and `saveProject` return `WriteResult` with `ok: boolean`. Always check the result and show an error if the write fails (e.g., quota exceeded).
- **Forgetting to handle the `/project/new` vs `/project/:id` distinction:** `ProjectPage` currently only handles the `new` case. Phase 5 must add logic to load existing project data from storage when `projectId` is not `"new"`.
- **Inline edit without keyboard support:** Rename MUST support Enter (save), Escape (cancel), and blur (save). Missing any of these is an accessibility failure.
- **Dialog without `showModal()`:** Using the `open` attribute directly (instead of calling `showModal()`) does NOT provide focus trapping or backdrop. Always use the imperative API via `ref`.

## Don't Hand-Roll

| Problem                  | Don't Build                             | Use Instead                                          | Why                                                                                    |
| ------------------------ | --------------------------------------- | ---------------------------------------------------- | -------------------------------------------------------------------------------------- |
| Modal focus trapping     | Custom focus trap with tabindex cycling | Native `<dialog>` with `showModal()`                 | Built-in focus trap, backdrop, Escape handling. Zero JS needed for these features.     |
| Project ID generation    | Custom random ID                        | `crypto.randomUUID()`                                | Already used by storageService.createProject. Cryptographically random, no collisions. |
| Project state management | Local useState for project list         | `useProjects()` context hook                         | Already built in Phase 4. Syncs with localStorage automatically.                       |
| Date formatting          | Custom date formatter                   | `toLocaleDateString()`                               | Built-in Intl API, respects user locale. Sufficient for "Jan 15, 2026" display.        |
| Responsive grid          | Custom CSS media queries                | Tailwind `grid-cols-1 md:grid-cols-2 lg:grid-cols-3` | One className, responsive by default.                                                  |

**Key insight:** Phase 5 is primarily a UI composition phase. All the hard infrastructure (storage, contexts, routing) was built in Phases 3-4. The risk is in UI polish and interaction design, not in data management. Keep components focused and lean.

## Common Pitfalls

### Pitfall 1: `<dialog>` Opened with `open` Attribute Instead of `showModal()`

**What goes wrong:** Setting the `open` attribute directly on `<dialog>` (e.g., `<dialog open>`) opens the dialog as non-modal. It does NOT trap focus, does NOT show a backdrop, and does NOT block interaction with the rest of the page.
**Why it happens:** React developers expect declarative attribute control. The `<dialog>` element requires imperative `showModal()` / `close()` via a ref, which is atypical in React.
**How to avoid:** Always use `useRef<HTMLDialogElement>` and call `dialogRef.current.showModal()` in a `useEffect` triggered by an `open` state prop. Never set the `open` attribute directly in JSX.
**Warning signs:** Dialog appears but user can still tab to background elements, no backdrop overlay visible.

### Pitfall 2: Inline Edit Loses Focus on Re-render

**What goes wrong:** When the project list re-renders (e.g., another project is updated), the inline edit input loses focus because React re-creates the DOM node.
**Why it happens:** If the component key changes or the parent re-renders, React may unmount and remount the input. The `useEffect` that sets focus only runs on mount, not on subsequent renders.
**How to avoid:** Use a stable `key` prop (project ID, which never changes). Keep the editing state local to the `ProjectCard` component, not lifted to the parent. Ensure `useProjects()` returns a referentially stable projects array (it does -- the reducer creates new arrays only on actual changes).
**Warning signs:** User starts typing a rename, then the cursor disappears and they're typing into the void.

### Pitfall 3: Delete Removes From Context But Navigation Still Points to Deleted Project

**What goes wrong:** After deleting a project, if the user has the project page open in another tab or navigates back, the `/project/:id` route tries to load a non-existent project.
**Why it happens:** `removeProject` dispatches `PROJECT_DELETED` which removes from context state, and `storageDeleteProject` removes from localStorage. But there is no route-level guard.
**How to avoid:** In `ProjectPage`, after loading the project by ID from `useProjects().state.projects`, check if the project exists. If not, navigate to `/` (dashboard). Show a brief "Project not found" message or simply redirect.
**Warning signs:** Blank project page or error when navigating to a deleted project's URL.

### Pitfall 4: Create Project Flow Does Not Persist Transcript

**What goes wrong:** The "New Transcription" button navigates to `/project/new`, which triggers the upload/transcription flow. But currently, `useTranscription` does not call `createProject` or `saveTranscript`. The completed transcript exists only in the hook's local state -- it is never persisted to localStorage.
**Why it happens:** Phase 4 built the transcription flow separately from the storage layer. The integration (wiring `useTranscription` to create a project and save the transcript) is Phase 5's responsibility.
**How to avoid:** When transcription completes, call `createProject(fileName, fileInfo)` to create the project in storage, then call `saveTranscript({ projectId, segments, completedAt })` to persist the transcript. This should happen in the `ProjectPage` component which has access to both the transcription hook and the projects context.
**Warning signs:** User transcribes a file, goes back to dashboard, but the project is not listed (or listed without transcript data).

### Pitfall 5: Rename Allows Empty String

**What goes wrong:** User clears the name field and clicks away (blur). The project name becomes an empty string, which looks broken in the dashboard and violates the ProjectMetadata validation that requires `name` to be a non-empty string.
**Why it happens:** No validation on the rename input.
**How to avoid:** In the `handleSave` function, trim the draft value. If the trimmed value is empty, revert to the original name instead of saving. The `onSave` callback should only be called with a valid, non-empty string.
**Warning signs:** Project card shows with no visible name, or validation error in storage.

### Pitfall 6: Multiple Rapid Deletes Cause Stale State

**What goes wrong:** User quickly deletes multiple projects. Each `removeProject` call reads the full projects array from localStorage, filters out the deleted project, and writes back. If calls overlap due to React batching, a later call may re-include a project that was already deleted.
**Why it happens:** `storageDeleteProject` reads-then-writes the projects array. This is not atomic. If two deletes execute before the state settles, they can both read the same initial array.
**How to avoid:** This is already mitigated by React's reducer pattern -- `PROJECT_DELETED` dispatches are processed sequentially by the reducer, and each `removeProject` callback calls `storageDeleteProject` which uses `safeWrite` (immediate, not debounced). However, confirm that `deleteProject` in `storageService.ts` always reads the current state, not a stale closure. Inspection confirms it does: `getProjects()` reads from localStorage on each call.
**Warning signs:** Deleted project reappears after another deletion.

## Code Examples

Verified patterns from official sources and codebase analysis:

### Wiring Create Project to Transcription Flow

```typescript
// In ProjectPage.tsx -- integrate transcription completion with project storage
// Source: Codebase analysis of useTranscription.ts + ProjectsContext.tsx

const { createProject } = useProjects();
const { machineState, startTranscription, reset } = useTranscription();

// After transcription completes, persist to storage
useEffect(() => {
  if (machineState.state === 'completed' && isNew) {
    // Create project in storage with file info
    const { project, ok } = createProject(fileName, fileInfo);
    if (ok) {
      // Save transcript data
      saveTranscript({
        projectId: project.id,
        segments: machineState.transcript,
        completedAt: new Date().toISOString(),
      });
      // Navigate to the new project's URL
      navigate(`/project/${project.id}`, { replace: true });
    }
  }
}, [machineState.state]);
```

### Loading Existing Project on ProjectPage

```typescript
// In ProjectPage.tsx -- load existing project data
// Source: Codebase analysis of ProjectsContext + storageService

const { projectId } = useParams();
const { state: projectsState } = useProjects();
const isNew = projectId === 'new';

// Find existing project
const project = isNew
  ? null
  : (projectsState.projects.find((p) => p.id === projectId) ?? null);

// Redirect if project not found
useEffect(() => {
  if (!isNew && projectsState.initialized && !project) {
    navigate('/', { replace: true });
  }
}, [isNew, projectsState.initialized, project, navigate]);

// Load transcript for existing project
const transcript = project ? getTranscript(project.id) : null;
```

### Delete Confirmation Flow

```typescript
// Source: MDN <dialog> element docs
// https://developer.mozilla.org/en-US/docs/Web/HTML/Element/dialog

// In ProjectCard.tsx
const [confirmDelete, setConfirmDelete] = useState(false);
const { removeProject } = useProjects();

const handleDelete = () => {
  removeProject(project.id);
  setConfirmDelete(false);
};

// JSX
<button
  onClick={(e) => {
    e.stopPropagation(); // Don't navigate to project
    setConfirmDelete(true);
  }}
  className="rounded p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600"
  title="Delete project"
  aria-label={`Delete ${project.name}`}
>
  {/* Trash icon SVG */}
</button>

<ConfirmDialog
  open={confirmDelete}
  title="Delete Project"
  message={`Are you sure you want to delete "${project.name}"? This action cannot be undone.`}
  confirmLabel="Delete"
  onConfirm={handleDelete}
  onCancel={() => setConfirmDelete(false)}
  variant="danger"
/>
```

### Status Badge Component

```typescript
// Source: Existing pattern from DashboardPage.tsx line 63-69
// Extracted into a reusable pattern

function StatusBadge({ status }: { status: ProjectStatus }) {
  const styles: Record<ProjectStatus, string> = {
    completed: 'bg-green-100 text-green-700',
    error: 'bg-red-100 text-red-700',
    idle: 'bg-slate-100 text-slate-600',
    uploading: 'bg-blue-100 text-blue-700',
    processing: 'bg-amber-100 text-amber-700',
  };

  return (
    <span
      className={`inline-block rounded px-1.5 py-0.5 text-xs font-medium ${styles[status]}`}
    >
      {status}
    </span>
  );
}
```

## State of the Art

| Old Approach                                               | Current Approach                                      | When Changed                                  | Impact                                                                         |
| ---------------------------------------------------------- | ----------------------------------------------------- | --------------------------------------------- | ------------------------------------------------------------------------------ |
| External modal libraries (react-modal, Headless UI Dialog) | Native HTML `<dialog>` with `showModal()`             | Baseline 2022 (all browsers)                  | Zero-dependency modals with built-in focus trap, backdrop, Escape handling     |
| Custom focus trap implementations (focus-trap-react)       | `<dialog>.showModal()` provides native focus trapping | Realized with full browser support ~2022-2023 | No JS needed for focus management in modals                                    |
| Large grid layout libraries (react-grid-layout, etc.)      | Tailwind CSS `grid` utilities                         | Tailwind 3.x stable since 2022                | Responsive grids in one className, no runtime overhead                         |
| Separate confirmation dialog libraries                     | Inline `<dialog>` per component                       | Modern React pattern                          | Each component manages its own dialog state. Simpler than global dialog state. |

**Deprecated/outdated:**

- **react-modal**: Still widely used but adds unnecessary bundle weight when native `<dialog>` covers the use case. `<dialog>` is the platform standard.
- **focus-trap-react**: Useful for non-dialog modals (e.g., drawer, dropdown), but redundant for `<dialog>` with `showModal()`. See CSS-Tricks: "There is No Need to Trap Focus on a Dialog Element."

## Open Questions

1. **List view vs. grid view toggle**
   - What we know: PROJ-01 says "list/grid of all projects." This could mean either list OR grid, or a toggle between them.
   - What's unclear: Whether the user expects a view toggle (list/grid switcher) or a single layout.
   - Recommendation: Start with grid layout (responsive cards). A view toggle is a nice-to-have but adds UI complexity and state management (persisting the preference). Defer the toggle unless explicitly requested. Grid is the more modern default for project dashboards.

2. **Project sort order**
   - What we know: The current dashboard shows projects in storage order (insertion order). No sorting or filtering exists.
   - What's unclear: Whether projects should be sorted by most recently updated, created date, or alphabetically.
   - Recommendation: Sort by `updatedAt` descending (most recently updated first). This is the most useful default for a project dashboard. No UI sort control needed for v1 -- just apply the sort in the component.

3. **File info display on cards**
   - What we know: `ProjectMetadata` includes `fileInfo` with name, type, size, and duration. The current placeholder shows only name, date, segment count, and status.
   - What's unclear: How much file info to show on project cards.
   - Recommendation: Show file name and size on the card (e.g., "interview.mp3 -- 45MB"). Duration and type are secondary -- show them on the project detail page. Keep cards concise.

4. **Wiring transcription to storage**
   - What we know: `ProjectPage` currently runs the transcription flow but does NOT persist results to storage. The `useTranscription` hook is purely in-memory.
   - What's unclear: The exact point in the flow where the project should be created -- before transcription starts (so the project exists in storage during processing) or after completion.
   - Recommendation: Create the project in storage when the user selects a file and starts transcription (before upload begins). This ensures the project appears in the dashboard immediately with `status: 'uploading'`. Update status to `'processing'` and then `'completed'` as the flow progresses. Save transcript data on completion. This gives the user feedback that something is happening.

## Sources

### Primary (HIGH confidence)

- [MDN: `<dialog>` element](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/dialog) -- Native modal dialog with `showModal()`, focus trapping, backdrop, Escape handling
- [MDN: URL.revokeObjectURL()](https://developer.mozilla.org/en-US/docs/Web/API/URL/revokeObjectURL_static) -- Cleanup pattern for object URLs
- Codebase analysis: `storageService.ts`, `storageService.types.ts`, `ProjectsContext.tsx`, `DashboardPage.tsx`, `ProjectPage.tsx`, `App.tsx` -- Direct inspection of current implementation
- [CSS-Tricks: There is No Need to Trap Focus on a Dialog Element](https://css-tricks.com/there-is-no-need-to-trap-focus-on-a-dialog-element/) -- Confirms native focus trap in `<dialog>` with `showModal()`

### Secondary (MEDIUM confidence)

- [emgoto.com: How to Build an Inline Edit Component in React](https://www.emgoto.com/react-inline-edit/) -- Click-to-edit pattern with focus management, Enter/Escape handling
- [LogRocket: Build Inline Editable UI in React](https://blog.logrocket.com/build-inline-editable-ui-react/) -- Accessibility considerations for inline editing
- [dev.to: React Modal with dialog](https://dev.to/elsyng/react-modal-dialog-using-html-dialog-element-5afk) -- React + `<dialog>` integration pattern using useRef/useEffect
- [Tailwind CSS Grid Documentation](https://tailwindcss.com/docs/grid-template-columns) -- Responsive grid column utilities
- Phase 3 Research (`03-RESEARCH.md`) -- Storage service patterns, key conventions, CRUD operations
- Phase 4 Research (`04-RESEARCH.md`) -- Context patterns, routing structure, feature-based architecture

### Tertiary (LOW confidence)

- None -- all findings verified with at least primary or secondary sources.

## Metadata

**Confidence breakdown:**

- Standard stack: HIGH -- No new dependencies, all infrastructure already built in Phases 3-4
- Architecture: HIGH -- Building on existing patterns (Context + storageService). Component decomposition follows Phase 4's feature-based structure.
- Pitfalls: HIGH -- Based on direct analysis of the actual codebase. Pitfalls 3 and 4 are visible in the source code (explicit TODO comments in ProjectPage.tsx).
- UI patterns: HIGH -- Native `<dialog>` and inline edit are well-documented standard patterns. No novel approaches.

**Research date:** 2026-02-07
**Valid until:** 2026-03-07 (stable domain -- browser APIs and React patterns are mature)
