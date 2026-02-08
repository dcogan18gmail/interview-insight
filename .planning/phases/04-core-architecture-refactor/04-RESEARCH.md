# Phase 4: Core Architecture Refactor - Research

**Researched:** 2026-02-07
**Domain:** React SPA architecture (routing, context, hooks, module organization)
**Confidence:** HIGH

## Summary

Phase 4 decomposes a monolithic 330-line `App.tsx` with 7 `useState` hooks into a feature-based module structure under `src/`. The codebase currently has no `src/` directory -- all source files live at the project root (`App.tsx`, `index.tsx`, `index.css`, `types.ts`) with `components/` and `services/` as direct children of root. The refactor introduces React Router v7 for navigation (dashboard, project detail, settings), Context API for state management (SettingsContext, ProjectsContext), a `useTranscription` hook with an explicit state machine replacing the current implicit `TranscriptionStatus` enum, and extraction of DOCX export logic into a dedicated service. Three bugs must be fixed: ObjectURL memory leak in FileUpload, brittle setTimeout-based download timing in TranscriptView, and silent 0-duration failure in FileUpload.

The current architecture is a wizard-style single-view flow (upload -> process -> view) with all state in the root component and zero client-side routing. Phase 3 already built the storage layer (`storageService.ts` with CRUD, debounced writes, schema versioning) that this phase will wire into the contexts. Phase 2 established ESLint 9 strict mode and Prettier, so all new code must pass the existing linting pipeline.

**Primary recommendation:** Use React Router v7 (single `react-router` package) in declarative mode with `BrowserRouter`, a layout route for the shared header/shell, and three main routes. Create two focused Context providers (Settings, Projects) following Kent C. Dodds' pattern (custom hook with undefined guard). Implement the transcription state machine with `useReducer` and a typed transition map. Move all source files into `src/` and update Vite/TypeScript configuration accordingly.

<user_constraints>

## User Constraints (from CONTEXT.md)

### Locked Decisions

#### Bug fixes

- ObjectURL memory leak: URL.revokeObjectURL called on cleanup (required)
- Download timing: async/await replaces brittle setTimeout (required)
- Duration extraction: handle 0-duration gracefully without silent failure (required)

### Claude's Discretion

All four architectural areas (routing, folder organization, state boundaries, state machine design) are fully at Claude's discretion. User explicitly deferred to best practices with no specific preferences. Bug fixes have clear requirements from the roadmap.

### Deferred Ideas (OUT OF SCOPE)

None -- discussion stayed within phase scope.
</user_constraints>

## Standard Stack

### Core

| Library      | Version | Purpose                                                                            | Why Standard                                                                                                                                              |
| ------------ | ------- | ---------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| react-router | 7.13.0  | Client-side routing (BrowserRouter, Routes, Route, Outlet, useNavigate, useParams) | Official React Router for React 18+. v7 merged react-router-dom into single package. Non-breaking upgrade path from v6. Declarative mode perfect for SPA. |

### Supporting

| Library             | Version | Purpose                                            | When to Use                                                                                                                          |
| ------------------- | ------- | -------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| vite-tsconfig-paths | 6.0.5   | Auto-sync tsconfig path aliases with Vite resolver | Eliminates duplicating `@/` alias in both tsconfig.json and vite.config.ts. Already have manual alias -- plugin replaces it cleanly. |

### Alternatives Considered

| Instead of               | Could Use            | Tradeoff                                                                                                                                                                                      |
| ------------------------ | -------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| react-router             | TanStack Router      | TanStack has better type safety for route params, but react-router is far more established, has simpler migration, and the app's routing needs are straightforward (3 routes). Overkill here. |
| Context API              | Zustand              | Zustand is simpler for global state but adds a dependency. With only 2 contexts and React 18, Context API is the standard zero-dependency approach.                                           |
| useReducer state machine | XState               | XState is production-grade for complex machines but weighs ~33KB. Our state machine has 5-7 states with simple transitions -- useReducer with a typed transition map is the right weight.     |
| vite-tsconfig-paths      | Manual resolve.alias | Manual works but duplicates config. Plugin is 1 dev dependency, zero config, auto-syncs.                                                                                                      |

**Installation:**

```bash
npm install react-router
npm install -D vite-tsconfig-paths
```

## Architecture Patterns

### Recommended Project Structure

```
src/
├── app/                        # App shell and routing
│   ├── App.tsx                 # BrowserRouter + Routes + Layout
│   └── Layout.tsx              # Shared header/nav + Outlet
├── features/                   # Feature-based modules
│   ├── dashboard/              # Dashboard/landing page (Phase 5 placeholder)
│   │   └── DashboardPage.tsx   # Route component
│   ├── project/                # Project detail (transcription flow)
│   │   ├── ProjectPage.tsx     # Route component
│   │   ├── components/         # Feature-scoped components
│   │   │   ├── FileUpload.tsx
│   │   │   ├── TranscriptView.tsx
│   │   │   └── LoadingState.tsx
│   │   └── hooks/
│   │       └── useTranscription.ts
│   └── settings/               # Settings
│       ├── SettingsPage.tsx     # Route component (or modal, see below)
│       └── components/
│           └── ApiKeyForm.tsx
├── contexts/                   # Global contexts
│   ├── SettingsContext.tsx      # API key state + preferences
│   └── ProjectsContext.tsx     # Project list + CRUD via storageService
├── services/                   # Business logic (stateless)
│   ├── geminiService.ts        # Gemini API integration (accepts apiKey param)
│   ├── cryptoService.ts        # Encryption/decryption
│   ├── storageService.ts       # localStorage CRUD (from Phase 3)
│   ├── storageService.types.ts # Storage types (from Phase 3)
│   └── docxExport.ts           # Extracted DOCX generation
├── types/                      # Shared type definitions
│   └── index.ts                # TranscriptSegment, FileData, etc.
├── index.tsx                   # Entry point (ReactDOM.createRoot)
└── index.css                   # Tailwind directives + custom CSS
```

**Key decisions in this structure:**

1. **Feature-based, not layer-based.** Components, hooks, and types live next to the feature they serve. Shared items (contexts, services, types) get their own top-level directories.
2. **`app/` directory** contains the routing shell (App.tsx, Layout.tsx) -- the "frame" that wraps all features.
3. **`features/` directory** holds route-level pages and their collocated components/hooks. Each feature is self-contained.
4. **`contexts/` at top level** because both SettingsContext and ProjectsContext are consumed across multiple features.
5. **`services/` stays flat** because the app has only 4-5 service modules. No need for further nesting.
6. **Dashboard is a placeholder** -- Phase 5 will build the actual UI. Phase 4 creates the route and empty page.

### Pattern 1: React Router Declarative Layout

**What:** Use `BrowserRouter` with a layout route that renders the shared header and `<Outlet />` for child routes.

**When to use:** SPAs with a persistent navigation shell across all pages.

**Example:**

```typescript
// Source: https://reactrouter.com/start/declarative/routing
import { BrowserRouter, Routes, Route } from 'react-router';
import Layout from './Layout';
import DashboardPage from '@/features/dashboard/DashboardPage';
import ProjectPage from '@/features/project/ProjectPage';
import SettingsPage from '@/features/settings/SettingsPage';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route index element={<DashboardPage />} />
          <Route path="project/:projectId" element={<ProjectPage />} />
          <Route path="settings" element={<SettingsPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
```

**Route design rationale:**

- `/` -- Dashboard (landing page, project list) -- Phase 5 builds the UI, Phase 4 creates the route
- `/project/:projectId` -- Project detail with transcription flow (the current App.tsx wizard becomes this)
- `/settings` -- Full settings page (currently a modal overlay; a route is cleaner for deep-linking and back-button behavior)
- Settings as a route (not modal) is preferred because it supports direct linking (`/settings`), works naturally with browser back button, and the modal can still be used within the settings page for confirmations

### Pattern 2: Context Provider with Custom Hook

**What:** Create context with `undefined` default, Provider component with `useReducer`, and a custom `useXxx()` hook that throws if used outside the Provider.

**When to use:** Any React Context that manages shared state.

**Example:**

```typescript
// Source: https://kentcdodds.com/blog/how-to-use-react-context-effectively
import { createContext, useContext, useReducer, type ReactNode } from 'react';

// --- Types ---
interface SettingsState {
  apiKeyConfigured: boolean;
}

type SettingsAction =
  | { type: 'KEY_SAVED' }
  | { type: 'KEY_CLEARED' };

interface SettingsContextValue {
  state: SettingsState;
  dispatch: React.Dispatch<SettingsAction>;
}

// --- Context ---
const SettingsContext = createContext<SettingsContextValue | undefined>(undefined);

function settingsReducer(state: SettingsState, action: SettingsAction): SettingsState {
  switch (action.type) {
    case 'KEY_SAVED':
      return { ...state, apiKeyConfigured: true };
    case 'KEY_CLEARED':
      return { ...state, apiKeyConfigured: false };
    default:
      return state;
  }
}

// --- Provider ---
export function SettingsProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(settingsReducer, {
    apiKeyConfigured: hasStoredKey(),
  });
  return (
    <SettingsContext.Provider value={{ state, dispatch }}>
      {children}
    </SettingsContext.Provider>
  );
}

// --- Custom Hook ---
export function useSettings(): SettingsContextValue {
  const context = useContext(SettingsContext);
  if (context === undefined) {
    throw new Error('useSettings must be used within a SettingsProvider');
  }
  return context;
}
```

### Pattern 3: useReducer State Machine with Typed Transition Map

**What:** Define a transition map object that maps `[currentState][event] -> nextState`. The reducer looks up the next state. TypeScript enforces valid transitions at compile time.

**When to use:** When state transitions need to be explicit and predictable -- not just "set to any value."

**Example:**

```typescript
// Source: https://kyleshevlin.com/how-to-use-usereducer-as-a-finite-state-machine/
// Adapted with TypeScript for this project's transcription flow

type TranscriptionState =
  | 'idle'
  | 'uploading'
  | 'processing'
  | 'completed'
  | 'error';

type TranscriptionEvent =
  | { type: 'START_UPLOAD' }
  | { type: 'UPLOAD_COMPLETE'; fileUri: string }
  | { type: 'UPLOAD_ERROR'; error: string }
  | { type: 'PROCESSING_COMPLETE'; segments: TranscriptSegment[] }
  | { type: 'PROCESSING_ERROR'; error: string }
  | { type: 'RESET' };

interface TranscriptionMachineState {
  status: TranscriptionState;
  fileUri: string | null;
  segments: TranscriptSegment[];
  error: string | null;
  progress: number;
}

// Transition map: which events are valid in which states
const TRANSITIONS: Record<
  TranscriptionState,
  Partial<Record<TranscriptionEvent['type'], TranscriptionState>>
> = {
  idle: { START_UPLOAD: 'uploading' },
  uploading: {
    UPLOAD_COMPLETE: 'processing',
    UPLOAD_ERROR: 'error',
    RESET: 'idle',
  },
  processing: {
    PROCESSING_COMPLETE: 'completed',
    PROCESSING_ERROR: 'error',
    RESET: 'idle',
  },
  completed: { RESET: 'idle' },
  error: { RESET: 'idle', START_UPLOAD: 'uploading' },
};

function transcriptionReducer(
  state: TranscriptionMachineState,
  event: TranscriptionEvent
): TranscriptionMachineState {
  const nextStatus = TRANSITIONS[state.status][event.type];
  if (!nextStatus) return state; // Invalid transition -- ignore

  switch (event.type) {
    case 'START_UPLOAD':
      return { ...state, status: nextStatus, error: null, progress: 0 };
    case 'UPLOAD_COMPLETE':
      return {
        ...state,
        status: nextStatus,
        fileUri: event.fileUri,
        progress: 0,
      };
    case 'UPLOAD_ERROR':
      return { ...state, status: nextStatus, error: event.error };
    case 'PROCESSING_COMPLETE':
      return {
        ...state,
        status: nextStatus,
        segments: event.segments,
        progress: 100,
      };
    case 'PROCESSING_ERROR':
      return { ...state, status: nextStatus, error: event.error };
    case 'RESET':
      return {
        status: 'idle',
        fileUri: null,
        segments: [],
        error: null,
        progress: 0,
      };
    default:
      return state;
  }
}
```

### Pattern 4: Gemini Service Accepts API Key as Parameter (ARCH-05)

**What:** Remove the implicit `createAI()` that reads from localStorage. Instead, `generateTranscript()` and `uploadFile()` accept an `apiKey` parameter explicitly.

**When to use:** When services should be stateless and testable -- no hidden dependencies on global state.

**Example:**

```typescript
// Current (problematic):
const createAI = async (): Promise<GoogleGenAI> => {
  const apiKey = await getDecryptedKey(); // Hidden localStorage dependency
  return new GoogleGenAI({ apiKey });
};

// Refactored (explicit):
export async function generateTranscript(
  apiKey: string, // Explicit parameter
  fileUri: string,
  mimeType: string,
  durationSeconds: number,
  onProgress: ProgressCallback
): Promise<TranscriptSegment[]> {
  const aiClient = new GoogleGenAI({ apiKey });
  // ... rest unchanged
}
```

The calling context (useTranscription hook) gets the API key from SettingsContext, which decrypts it on demand. This makes the service layer pure and testable.

### Anti-Patterns to Avoid

- **God Component:** Don't let the new `ProjectPage.tsx` become the new App.tsx. State machine lives in `useTranscription`, export logic lives in `docxExport.ts`, the page just composes them.
- **Context as Redux:** Don't put everything in one context. Two focused contexts (Settings, Projects) are correct. Each manages its own domain.
- **Prop drilling through layouts:** Layout.tsx renders `<Outlet />`. It should NOT pass state down as props. Child routes get state from contexts.
- **Circular imports:** Services should NOT import from contexts. Data flows: Context -> Hook -> Service call. Services are pure functions accepting parameters.
- **Moving files but not fixing imports:** When moving everything to `src/`, all import paths change. The `@/` alias must point to `src/` (currently points to root). Every import must be verified.

## Don't Hand-Roll

| Problem               | Don't Build                                                     | Use Instead                                | Why                                                                                                                             |
| --------------------- | --------------------------------------------------------------- | ------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------- |
| Client-side routing   | Custom hash-based router or conditional rendering               | `react-router` v7 BrowserRouter            | Handles URL parsing, history, nested layouts, params, redirects. Current conditional rendering in App.tsx is already straining. |
| Path alias resolution | Manual `resolve.alias` in both vite.config.ts and tsconfig.json | `vite-tsconfig-paths` plugin               | Eliminates config duplication. Single source of truth in tsconfig.json.                                                         |
| DOCX generation       | Custom XML builder                                              | `docx` library (already installed, v9.5.1) | Already in use. Just extract from TranscriptView into a service.                                                                |

**Key insight:** The architecture refactor is about decomposition and wiring, not adding new capabilities. The primary risk is breaking existing functionality during the move, not choosing wrong libraries.

## Common Pitfalls

### Pitfall 1: Import Path Breakage During src/ Migration

**What goes wrong:** Moving files from root into `src/` breaks every relative import in the codebase. The `@/` path alias currently points to `.` (root) via `tsconfig.json` and `vite.config.ts`. If the alias is updated to `src/` but some imports still reference old paths, the build fails silently or at runtime.
**Why it happens:** Two separate config files must agree: `tsconfig.json` (for editor/type-checking) and `vite.config.ts` (for bundling). They can desync.
**How to avoid:** Use `vite-tsconfig-paths` to eliminate the Vite-side config entirely. Update `tsconfig.json` paths to `"@/*": ["./src/*"]`. Run `tsc --noEmit` after every file move batch.
**Warning signs:** TypeScript compiles but Vite dev server shows "Module not found" errors, or vice versa.

### Pitfall 2: index.html Script Path After src/ Move

**What goes wrong:** `index.html` currently has `<script type="module" src="/index.tsx"></script>`. After moving to `src/`, this must become `src/index.tsx`. If missed, the app loads a blank page with no errors in the terminal.
**Why it happens:** `index.html` is not a TypeScript file -- linting and type-checking don't catch path issues in HTML.
**How to avoid:** Update `index.html` script src and verify the dev server loads correctly immediately after the move.
**Warning signs:** Blank page on `localhost:3000` with no build errors.

### Pitfall 3: Tailwind Content Paths After src/ Move

**What goes wrong:** `tailwind.config.js` currently scans `'./**/*.{js,ts,jsx,tsx}'` from root. After moving to `src/`, this glob still works (it's recursive) but is overly broad. More critically, if the content path is changed to `'./src/**/*.{ts,tsx}'` but `index.html` (which uses Tailwind classes) is not included, styles break silently.
**Why it happens:** Tailwind purges unused CSS based on content paths. Missing a path means those classes get purged in production but appear fine in dev (since dev doesn't purge).
**How to avoid:** Set content to `['./index.html', './src/**/*.{js,ts,jsx,tsx}']`. Test with a production build (`npm run build && npm run preview`).
**Warning signs:** Styles work in dev but vanish in production.

### Pitfall 4: Context Provider Ordering

**What goes wrong:** If `ProjectsContext` depends on `SettingsContext` (e.g., needs to know if API key is configured), the providers must be nested in the correct order. Wrong nesting causes `useSettings()` to throw "must be used within SettingsProvider."
**Why it happens:** Context providers form a tree. Inner providers can access outer contexts, but not vice versa.
**How to avoid:** Nest providers from most-foundational (outermost) to most-dependent (innermost): `SettingsProvider` wraps `ProjectsProvider` wraps `BrowserRouter` wraps `Routes`.
**Warning signs:** Runtime error on app load: "useSettings must be used within a SettingsProvider."

### Pitfall 5: Losing beforeunload Listener After Refactor

**What goes wrong:** `storageService.ts` registers a `window.addEventListener('beforeunload', flushPendingWrites)` at module load time. If the refactored app conditionally imports the storage service or if the listener is accidentally removed, debounced writes may be lost on tab close.
**Why it happens:** Module-level side effects are fragile during refactors. The listener registration depends on the module being imported early enough.
**How to avoid:** Verify the beforeunload listener is still registered after the refactor. The storage service module should be imported by `ProjectsContext` on app load, which ensures the side effect runs.
**Warning signs:** Pending writes lost when closing the tab during rapid edits (hard to test, easy to miss).

### Pitfall 6: ObjectURL Leak Fix Must Handle Re-renders

**What goes wrong:** The fix for BUG-01 is to call `URL.revokeObjectURL(url)` in a cleanup function. But if the cleanup runs on every re-render (not just unmount), the URL becomes invalid while still in use.
**Why it happens:** `useEffect` cleanup runs both on unmount AND before re-running the effect. If the ObjectURL is created inside the effect and the effect has dependencies that change, the URL is revoked too early.
**How to avoid:** Use `useEffect` with a ref to track the current ObjectURL. Revoke the previous URL when creating a new one, and revoke on unmount. Don't depend on changing state -- depend only on the File object.
**Warning signs:** Media element fails to load after component re-render.

### Pitfall 7: SPA Redirect Must Exclude API Paths

**What goes wrong:** The Netlify SPA redirect `/* -> /index.html (200)` is already in place. But if the redirect rule is placed before the edge function routing, API calls to `/proxy-upload` or `/.netlify/functions/*` could be caught by the redirect.
**Why it happens:** Netlify processes redirects in order. Edge function routes defined in `[[edge_functions]]` take priority over `[[redirects]]`, but only if the edge function is deployed correctly.
**How to avoid:** The current `netlify.toml` already has the correct ordering (edge_functions before redirects). Don't change this ordering during the refactor.
**Warning signs:** Upload fails with HTML response instead of JSON.

## Code Examples

Verified patterns from official sources:

### BrowserRouter + Layout Route Setup

```typescript
// Source: https://reactrouter.com/start/library/installation
// Source: https://reactrouter.com/start/declarative/routing
import { BrowserRouter, Routes, Route, Outlet, NavLink, useNavigate } from 'react-router';

// Layout.tsx -- shared header + child route rendering
function Layout() {
  const navigate = useNavigate();
  return (
    <div className="min-h-screen">
      <header>
        <NavLink to="/" className={({ isActive }) => isActive ? 'active' : ''}>
          Dashboard
        </NavLink>
        <NavLink to="/settings">Settings</NavLink>
      </header>
      <main>
        <Outlet /> {/* Child routes render here */}
      </main>
    </div>
  );
}

// App.tsx -- route definition
function App() {
  return (
    <BrowserRouter>
      <SettingsProvider>
        <ProjectsProvider>
          <Routes>
            <Route element={<Layout />}>
              <Route index element={<DashboardPage />} />
              <Route path="project/:projectId" element={<ProjectPage />} />
              <Route path="settings" element={<SettingsPage />} />
            </Route>
          </Routes>
        </ProjectsProvider>
      </SettingsProvider>
    </BrowserRouter>
  );
}
```

### ObjectURL Memory Leak Fix (BUG-01)

```typescript
// Source: https://developer.mozilla.org/en-US/docs/Web/API/URL/revokeObjectURL_static
// In FileUpload.tsx processFile callback:

const processFile = useCallback(
  (file: File) => {
    // ...validation...

    const media = document.createElement('video');
    media.preload = 'metadata';

    const objectUrl = URL.createObjectURL(file);

    const cleanup = () => {
      URL.revokeObjectURL(objectUrl); // Fix: always revoke
      media.remove();
    };

    media.onloadedmetadata = () => {
      const duration = media.duration;
      cleanup();
      onFileSelected({
        /* ... */ duration: duration && isFinite(duration) ? duration : 0,
      });
      setLoading(false);
    };

    media.onerror = () => {
      cleanup();
      onFileSelected({ /* ... */ duration: 0 });
      setLoading(false);
    };

    media.src = objectUrl;
  },
  [onFileSelected]
);
```

### Download Timing Fix (BUG-02)

```typescript
// Current (brittle):
if (type === 'all') {
  const blobEng = await generateDocxBlob('english');
  saveBlob(blobEng, 'transcript_english.docx');
  const blobOrg = await generateDocxBlob('original');
  setTimeout(() => saveBlob(blobOrg, 'transcript_original.docx'), 200); // Race condition!
  const blobComb = await generateDocxBlob('combined');
  setTimeout(() => saveBlob(blobComb, 'transcript_combined.docx'), 400); // Race condition!
}

// Fixed (sequential async/await):
if (type === 'all') {
  const types: Array<{ variant: DocxVariant; filename: string }> = [
    { variant: 'english', filename: 'transcript_english.docx' },
    { variant: 'original', filename: 'transcript_original.docx' },
    { variant: 'combined', filename: 'transcript_combined.docx' },
  ];
  for (const { variant, filename } of types) {
    const blob = await generateDocxBlob(variant);
    saveBlob(blob, filename);
    // Small delay between downloads to avoid browser throttling
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
}
```

### Duration Extraction Fix (BUG-03)

```typescript
// Current (silent failure):
media.onerror = () => {
  console.warn('Could not extract duration');
  onFileSelected({ ...data, duration: 0 }); // Silently sets 0
};

// Fixed (explicit handling + UI feedback):
media.onloadedmetadata = () => {
  const duration = media.duration;
  cleanup();

  if (!duration || !isFinite(duration) || duration === 0) {
    // Duration is unavailable -- proceed but flag it
    console.warn(
      '[FileUpload] Duration extraction returned 0 or invalid. File may still be usable.'
    );
    onFileSelected({ ...data, duration: 0, durationUnknown: true });
  } else {
    onFileSelected({ ...data, duration });
  }
  setLoading(false);
};

media.onerror = () => {
  cleanup();
  console.warn(
    '[FileUpload] Could not load media metadata for duration extraction.'
  );
  onFileSelected({ ...data, duration: 0, durationUnknown: true });
  setLoading(false);
};
```

Note: The `durationUnknown` flag requires adding an optional boolean to the `FileData` type. The transcription service already handles `durationSeconds === 0` (it uses a percentage fallback), but the flag enables the UI to show "Duration: unknown" instead of "0s" in the file info display.

### DOCX Export Service Extraction (ARCH-07)

```typescript
// docxExport.ts -- extracted from TranscriptView.tsx
import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  HeadingLevel,
  AlignmentType,
} from 'docx';
import type { TranscriptSegment } from '@/types';

export type DocxVariant = 'english' | 'original' | 'combined';

export function formatTimestamp(seconds?: number): string {
  if (seconds === undefined) return '00:00';
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

export async function generateDocxBlob(
  transcript: TranscriptSegment[],
  variant: DocxVariant
): Promise<Blob> {
  // ... (move existing generateDocxBlob logic here, accepting transcript as parameter)
}

export function saveBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const element = document.createElement('a');
  element.href = url;
  element.download = filename;
  document.body.appendChild(element);
  element.click();
  document.body.removeChild(element);
  URL.revokeObjectURL(url);
}
```

## State of the Art

| Old Approach                                       | Current Approach                                          | When Changed                            | Impact                                                                                 |
| -------------------------------------------------- | --------------------------------------------------------- | --------------------------------------- | -------------------------------------------------------------------------------------- |
| `react-router-dom` + `react-router` (two packages) | `react-router` (single package)                           | v7 (late 2024)                          | Only install `react-router`. Import everything from `react-router`.                    |
| Class-based components with lifecycle methods      | Function components with hooks                            | React 16.8+ (2019)                      | All new components should be functional. Existing components already are.              |
| Redux for all state                                | Context API for "prop drilling" state, local state for UI | React 16.3+ Context, refined through 18 | Two small contexts are correct for this app's scale. No external state library needed. |
| `TranscriptionStatus` enum with string comparisons | `useReducer` state machine with typed transition map      | Current best practice                   | Prevents impossible state transitions. Makes state diagram explicit and testable.      |

**Deprecated/outdated:**

- `react-router-dom`: Merged into `react-router` in v7. Still works as a wrapper but is unnecessary.
- `Switch` component: Replaced by `Routes` in React Router v6+. This app has no existing router so not relevant.

## Configuration Changes Required

### Vite Config

```typescript
// vite.config.ts -- after migration to src/
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tsconfigPaths from 'vite-tsconfig-paths';

export default defineConfig({
  server: { port: 3000, host: '0.0.0.0' },
  plugins: [react(), tsconfigPaths()],
  // Remove manual resolve.alias -- vite-tsconfig-paths handles it
});
```

### TypeScript Config

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "lib": ["ES2022", "DOM", "DOM.Iterable"],
    "skipLibCheck": true,
    "types": ["node"],
    "moduleResolution": "bundler",
    "isolatedModules": true,
    "moduleDetection": "force",
    "allowJs": true,
    "jsx": "react-jsx",
    "paths": {
      "@/*": ["./src/*"]
    },
    "allowImportingTsExtensions": true,
    "noEmit": true,
    "strict": true,
    "noUncheckedIndexedAccess": true
  },
  "include": ["src"],
  "exclude": ["netlify/edge-functions"]
}
```

### index.html

```html
<script type="module" src="/src/index.tsx"></script>
```

### Tailwind Config

```javascript
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  // ... rest unchanged
};
```

### ESLint Config

The existing `eslint.config.mjs` file patterns (`**/*.{ts,tsx}`) will still work after the move to `src/` because they use recursive globs from the project root. No changes needed.

## Open Questions

1. **Settings as route vs. modal**
   - What we know: Currently Settings is a modal overlay in App.tsx. ARCH-02 says routes for "dashboard, project detail, and settings."
   - What's unclear: Whether the user expects a full-page settings route or a modal accessible from any page.
   - Recommendation: Make Settings a full route (`/settings`) for consistency with the requirements. The route renders the same form component. If the user later wants modal behavior too (e.g., "quick API key entry" prompt), the form component can be reused inside a modal without changing the route.

2. **Dashboard content for Phase 4**
   - What we know: The dashboard route is part of ARCH-02, but the dashboard UI and multi-project features are Phase 5.
   - What's unclear: How much dashboard content to create in Phase 4.
   - Recommendation: Create the route with a minimal placeholder page (project list from storageService, or empty state message). Phase 5 builds the real UI. The architectural skeleton must exist for Phase 5 to plug into.

3. **Gemini service API key parameter threading**
   - What we know: ARCH-05 requires gemini service functions to accept API key as parameter. Currently `createAI()` reads from localStorage.
   - What's unclear: Whether the API key should be decrypted in the context or in the hook on each call.
   - Recommendation: `useTranscription` hook calls `getDecryptedKey()` once when starting transcription and passes it to service functions. This keeps decryption lazy (only when needed) and the service pure.

## Sources

### Primary (HIGH confidence)

- [React Router v7 Installation](https://reactrouter.com/start/library/installation) -- Verified v7.13.0, single `react-router` package, React 18 compatible
- [React Router v7 Declarative Routing](https://reactrouter.com/start/declarative/routing) -- Route, Routes, Outlet, layout patterns, dynamic segments
- [React Router v7 Navigation](https://reactrouter.com/start/declarative/navigating) -- Link, NavLink, useNavigate patterns
- [MDN URL.revokeObjectURL](https://developer.mozilla.org/en-US/docs/Web/API/URL/revokeObjectURL_static) -- Correct cleanup pattern for ObjectURLs
- [Kent C. Dodds: How to Use React Context Effectively](https://kentcdodds.com/blog/how-to-use-react-context-effectively) -- Provider + custom hook pattern, undefined default, TypeScript typing
- [vite-tsconfig-paths npm](https://www.npmjs.com/package/vite-tsconfig-paths) -- v6.0.5, auto-syncs tsconfig paths with Vite resolver

### Secondary (MEDIUM confidence)

- [Kyle Shevlin: useReducer as Finite State Machine](https://kyleshevlin.com/how-to-use-usereducer-as-a-finite-state-machine/) -- Transition map pattern, verified against React docs
- [undefined.technology: State Machine in React with useReducer](https://undefined.technology/blog/state-machine-in-react-with-usereducer/) -- TypeScript typing for state machines with useReducer
- [Robin Wieruch: React Folder Structure in 5 Steps](https://www.robinwieruch.de/react-folder-structure/) -- Feature-based organization, colocation principles
- [Netlify: React Router Deployment](https://docs.netlify.com/build/frameworks/framework-setup-guides/react-router/) -- SPA redirect configuration

### Tertiary (LOW confidence)

- None -- all findings verified with at least two sources.

## Metadata

**Confidence breakdown:**

- Standard stack: HIGH -- React Router v7 verified on npm and official docs, vite-tsconfig-paths verified, all libraries well-established
- Architecture: HIGH -- Feature-based structure is well-documented consensus, Context API pattern from Kent C. Dodds is de facto standard, state machine pattern with useReducer is well-established
- Pitfalls: HIGH -- Based on direct analysis of the actual codebase (import paths, config files, existing bugs). Not hypothetical.
- Bug fixes: HIGH -- All three bugs visible in the source code with clear fixes documented in MDN/official sources

**Research date:** 2026-02-07
**Valid until:** 2026-03-07 (stable -- React Router v7 is mature, patterns well-established)
