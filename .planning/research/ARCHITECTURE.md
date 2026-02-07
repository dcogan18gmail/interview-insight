# Architecture Research: Hardening Interview Insight

**Research Date:** 2026-02-06
**Scope:** Architecture patterns for refactoring monolithic React app into multi-project tool with BYOK, localStorage persistence, and streaming AI integration.

## Executive Summary

The current app is a monolithic single-component React SPA (App.tsx owns all state). The target architecture uses feature-based modules, React Context for shared state, React Router for navigation, and a localStorage persistence layer with schema versioning.

**Key Principle:** Incremental strangler fig migration. The existing App.tsx works — wrap it in the new architecture and gradually replace pieces. At every step, the app remains functional and deployable.

---

## 1. Recommended Component Architecture

### Directory Structure (Feature-Based)

```
src/
├── main.tsx                    # Entry point, mounts App
├── App.tsx                     # Providers + Router
├── contexts/
│   ├── SettingsContext.tsx      # API key, user preferences
│   ├── ProjectsContext.tsx     # Project list, CRUD operations
│   └── ToastContext.tsx        # Ephemeral notifications
├── hooks/
│   ├── useLocalStorage.ts      # Type-safe localStorage wrapper
│   └── useAbortController.ts   # Cancellation support
├── services/
│   ├── storage/
│   │   ├── storageService.ts   # localStorage read/write with versioning
│   │   └── migrations.ts       # Schema migration functions
│   ├── gemini/
│   │   ├── geminiUpload.ts     # File upload (extracted from geminiService)
│   │   ├── geminiTranscribe.ts # Transcription (extracted from geminiService)
│   │   └── types.ts            # API types
│   └── export/
│       └── docxExport.ts       # DOCX generation (extracted from TranscriptView)
├── features/
│   ├── dashboard/
│   │   ├── components/
│   │   │   ├── ProjectDashboard.tsx   # Project list/grid
│   │   │   ├── ProjectCard.tsx        # Single project card
│   │   │   └── NewProjectButton.tsx
│   │   └── index.ts                   # Barrel export
│   ├── settings/
│   │   ├── components/
│   │   │   ├── SettingsPage.tsx
│   │   │   └── ApiKeyForm.tsx         # BYOK key management
│   │   └── index.ts
│   ├── upload/
│   │   ├── components/
│   │   │   └── FileUpload.tsx         # Refactored upload
│   │   ├── hooks/
│   │   │   └── useFileUpload.ts
│   │   └── index.ts
│   ├── transcription/
│   │   ├── components/
│   │   │   ├── TranscriptionProgress.tsx  # Replaces LoadingState
│   │   │   ├── LiveTranscriptFeed.tsx     # Full growing transcript
│   │   │   └── TranscriptionControls.tsx  # Start/cancel/retry
│   │   ├── hooks/
│   │   │   └── useTranscription.ts        # State machine
│   │   └── index.ts
│   └── transcript/
│       ├── components/
│       │   ├── TranscriptView.tsx     # Completed transcript display
│       │   └── TranscriptToolbar.tsx  # Export, copy, view modes
│       └── index.ts
├── components/
│   └── ui/                            # Shared UI primitives
│       ├── Button.tsx
│       ├── Card.tsx
│       ├── Modal.tsx
│       ├── ProgressBar.tsx
│       ├── Badge.tsx
│       └── EmptyState.tsx
├── layouts/
│   └── AppShell.tsx                   # Header + main content
└── types/
    └── index.ts                       # Shared types
```

### Why Feature-Based (Not Layer-Based)

Layer-based (`components/`, `hooks/`, `services/` all flat) doesn't scale — you end up with 30 files in components/ and no way to tell what belongs together. Feature-based groups related code by domain, making it easy to understand, test, and modify each feature independently.

---

## 2. Component Boundaries

### Context Providers (App-Level State)

**SettingsContext** — Owns:
- API key (encrypted in localStorage)
- Key validation status
- User preferences (theme, defaults)
- Read/write to localStorage settings key

**ProjectsContext** — Owns:
- Project list (metadata only — not full transcripts)
- CRUD operations (create, rename, delete, update status)
- Read/write to localStorage projects key
- Does NOT own transcript data (too large for context)

**ToastContext** — Owns:
- Toast queue
- Auto-dismiss timers
- No persistence

### Feature Modules

Each feature module owns:
- Its own components (visual)
- Its own hooks (behavior/state)
- Its own types (if feature-specific)

Features communicate through:
- Context (for shared state like API key, project list)
- Props (for parent-child)
- Route params (for navigation)

Features do NOT:
- Import from other features directly
- Share internal components
- Access localStorage directly (go through services)

---

## 3. Data Flow

```
User Action
    │
    ▼
Component (feature module)
    │
    ├─► useContext(Settings) ──► localStorage (encrypted key)
    │
    ├─► useContext(Projects) ──► localStorage (project metadata)
    │
    ├─► useTranscription() ──► geminiUpload/geminiTranscribe services
    │       │                      │
    │       │                      ├─► Netlify Function (upload initiation)
    │       │                      ├─► Edge Function (chunk upload proxy)
    │       │                      └─► Gemini API (transcription)
    │       │
    │       └─► Dispatches segments ──► Component state (useReducer)
    │               │
    │               └─► Debounced flush ──► localStorage (transcript data)
    │
    └─► UI renders from component state
```

### Key Data Flow Rules

1. **Settings flow down:** SettingsContext provides API key to any component that needs it
2. **Project metadata in context, transcript data on demand:** ProjectsContext holds the list; transcript content loaded when project is opened
3. **Streaming data stays in component state:** useTranscription uses useReducer for real-time segment accumulation; periodic flush to localStorage
4. **Services are stateless:** Upload, transcribe, export services accept parameters and return results. No global state.

---

## 4. Storage Layer — localStorage Schema

### Schema Design

```typescript
// Single top-level key with versioned schema
const STORAGE_KEY = 'interview-insight';

interface StorageSchema {
  version: 2;
  settings: {
    apiKey: string | null;      // Encrypted with Web Crypto
    apiKeyHash: string | null;  // For display/comparison without decrypting
    preferences: {
      defaultExportFormat: 'english' | 'original' | 'combined';
      autoScroll: boolean;
    };
  };
  projects: ProjectMeta[];      // Metadata only (small)
}

interface ProjectMeta {
  id: string;                   // UUID
  name: string;
  createdAt: string;            // ISO date
  updatedAt: string;
  status: 'uploading' | 'transcribing' | 'completed' | 'error' | 'cancelled' | 'interrupted';
  fileInfo: {
    name: string;
    size: number;
    mimeType: string;
    duration: number;
  };
  segmentCount: number;
  error?: string;
  groupId?: string;             // For future folder/grouping
}

// Transcript data stored in separate keys (one per project)
// Key format: 'interview-insight:transcript:{projectId}'
interface TranscriptData {
  projectId: string;
  segments: TranscriptSegment[];
  lastTimestamp: string;         // For resume capability
}
```

### Why Separate Keys for Transcripts

localStorage has a ~5-10MB total limit. Storing all transcripts in one key:
- Risks hitting quota on a single write
- Requires loading ALL transcript data to read ONE project
- Makes corruption affect ALL projects

Separate keys (`interview-insight:transcript:{id}`):
- Each project's transcript is independent
- Loading project list is fast (metadata only)
- Corruption is isolated
- Easier to implement "delete project" (just remove the key)

### Schema Versioning

```typescript
const CURRENT_VERSION = 2;

function loadStorage(): StorageSchema {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return createDefault();

    const data = JSON.parse(raw);
    if (data.version < CURRENT_VERSION) {
      return migrate(data);
    }
    return data;
  } catch {
    // Corrupted data — backup and reset
    const corrupted = localStorage.getItem(STORAGE_KEY);
    if (corrupted) {
      localStorage.setItem(`${STORAGE_KEY}:backup:${Date.now()}`, corrupted);
    }
    return createDefault();
  }
}

function migrate(data: any): StorageSchema {
  // Version 1 -> 2: add preferences
  if (data.version === 1) {
    data.preferences = { defaultExportFormat: 'combined', autoScroll: true };
    data.version = 2;
  }
  return data;
}
```

---

## 5. BYOK Pattern

### Security Model

Browser-based BYOK has inherent limitations — any key stored in the browser is accessible to JavaScript running on the page (including browser extensions). The goal is defense-in-depth:

1. **Encrypt at rest** — Use Web Crypto AES-GCM (built into browsers, no dependency)
2. **Never log** — API key never appears in console, error messages, or network URLs
3. **Pass as header** — Key sent to Netlify Functions via request header, not URL parameter
4. **Educate users** — Clear messaging about where the key is stored and how to remove it
5. **Validate early** — Test key on entry before allowing uploads

### Web Crypto Implementation (No Dependencies)

```typescript
// services/crypto.ts
const ALGORITHM = 'AES-GCM';
const KEY_DERIVATION = 'PBKDF2';

// Derive an encryption key from a passphrase
// For BYOK, use a fixed app-level salt (not secret, but unique to this app)
const APP_SALT = new TextEncoder().encode('interview-insight-v1');

async function deriveKey(passphrase: string): Promise<CryptoKey> {
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(passphrase),
    KEY_DERIVATION,
    false,
    ['deriveKey']
  );
  return crypto.subtle.deriveKey(
    { name: KEY_DERIVATION, salt: APP_SALT, iterations: 100000, hash: 'SHA-256' },
    keyMaterial,
    { name: ALGORITHM, length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
}

export async function encryptApiKey(apiKey: string): Promise<string> {
  const key = await deriveKey(window.location.origin);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encrypted = await crypto.subtle.encrypt(
    { name: ALGORITHM, iv },
    key,
    new TextEncoder().encode(apiKey)
  );
  // Store IV + ciphertext as base64
  const combined = new Uint8Array(iv.length + new Uint8Array(encrypted).length);
  combined.set(iv);
  combined.set(new Uint8Array(encrypted), iv.length);
  return btoa(String.fromCharCode(...combined));
}

export async function decryptApiKey(stored: string): Promise<string> {
  const key = await deriveKey(window.location.origin);
  const combined = Uint8Array.from(atob(stored), c => c.charCodeAt(0));
  const iv = combined.slice(0, 12);
  const ciphertext = combined.slice(12);
  const decrypted = await crypto.subtle.decrypt(
    { name: ALGORITHM, iv },
    key,
    ciphertext
  );
  return new TextDecoder().decode(decrypted);
}
```

### Netlify Function Changes

```typescript
// netlify/functions/gemini-upload.ts (modified)
const handler: Handler = async (event) => {
  const apiKey = event.headers['x-gemini-api-key'];
  if (!apiKey) {
    return { statusCode: 401, body: 'API key required' };
  }
  if (!apiKey.startsWith('AIza') || apiKey.length < 30) {
    return { statusCode: 400, body: 'Invalid API key format' };
  }
  // Use apiKey from header instead of process.env
};
```

---

## 6. Streaming Pattern

### Transcription State Machine

```typescript
type TranscriptionState =
  | { phase: 'idle' }
  | { phase: 'uploading'; progress: number }
  | { phase: 'processing'; progress: number; segmentCount: number; elapsedMs: number }
  | { phase: 'completed'; totalSegments: number; totalMs: number }
  | { phase: 'error'; message: string; partialSegments: number }
  | { phase: 'cancelled'; partialSegments: number }
  | { phase: 'interrupted'; partialSegments: number };
```

### useTranscription Hook Pattern

- Uses useReducer for state management
- AbortController for cancellation (threaded through all fetch calls)
- Debounced localStorage flush during streaming (every 10 segments or 5 seconds)
- Intermediate state saved so interrupted transcriptions can be detected on reload

### LiveTranscriptFeed Component

- Auto-scrolls to bottom as new segments arrive
- Detects user scroll-up and pauses auto-scroll
- "Jump to latest" button when user has scrolled up
- For long transcripts (500+ segments), consider @tanstack/react-virtual

---

## 7. Suggested Build Order

### Phase 0: Foundation (Before Any Features)
- Create src/ directory structure
- Install react-router-dom
- Create base route definitions
- Create AppShell layout
- Create localStorage service with schema versioning
- Create SettingsContext, ProjectsContext, ToastContext
- Wire up providers in App.tsx
- Pin @google/genai version

**Dependencies:** None (this is the foundation)

### Phase 1: BYOK + Settings
- Create SettingsPage and ApiKeyForm
- Implement Web Crypto encryption
- Update geminiService to accept apiKey as parameter
- Update Netlify Function to read key from header
- Remove process.env keys from vite.config.ts
- Restrict CORS on proxy

**Dependencies:** Phase 0

### Phase 2: Core Transcription Refactor
- Create useTranscription hook (state machine)
- Thread AbortSignal through upload/transcribe
- Create LiveTranscriptFeed
- Add debounced localStorage persistence
- Fix ObjectURL memory leak

**Dependencies:** Phase 1

### Phase 3: Multi-Project Dashboard
- ProjectDashboard, ProjectCard components
- NewProjectFlow (upload wizard)
- ProjectDetail page
- Route wiring
- Project CRUD in ProjectsContext

**Dependencies:** Phase 2

### Phase 4: Transcript View Polish
- Extract TranscriptView into feature module
- Extract DOCX generation into service
- Fix download timing issues
- Add view mode toggle and search

**Dependencies:** Phase 3

### Phase 5: UI Polish + Error Handling
- Shared UI components
- ErrorBoundary, Toast integration
- Error message sanitization
- Loading skeletons, empty states
- Responsive design, accessibility
- CSP headers

**Dependencies:** Phase 4

### Phase 6: Quality + DevEx
- ESLint + Prettier
- Vitest + React Testing Library
- Tests for critical paths
- GitHub Actions CI
- Netlify auto-deploy
- README rewrite

**Dependencies:** Phase 5

### Dependency Graph

```
Phase 0 (Foundation)
    │
    ▼
Phase 1 (BYOK + Settings)
    │
    ▼
Phase 2 (Transcription Refactor)
    │
    ▼
Phase 3 (Multi-Project Dashboard)
    │
    ▼
Phase 4 (Transcript View Polish)
    │
    ▼
Phase 5 (UI Polish + Error Handling)
    │
    ▼
Phase 6 (Quality + DevEx)
```

---

## 8. Migration Strategy: Incremental Strangler Fig

### Step 1: Move Files to src/
Move existing files into src/ directory. Update index.html, vite.config.ts, tsconfig.json, tailwind.config.js. Verify app works identically.

### Step 2: Add Router (Invisible)
Wrap existing App content in a catch-all route. Rename current App.tsx to LegacyApp.tsx. New App.tsx = Providers + Router. App works exactly as before.

### Step 3: Add Contexts (Empty Shells)
Create contexts with default values. Wrap router in providers. Nothing consumes them yet. App still works.

### Step 4: Add Settings Page (New Route)
Add /settings route alongside legacy catch-all. Build ApiKeyForm. Old app untouched.

### Step 5: Wire BYOK Into Legacy
Modify geminiService to accept apiKey parameter. LegacyApp reads from SettingsContext. Remove env vars from vite.config.ts.

### Step 6: Add Dashboard Route
Add /, /project/new, /project/:id routes. Keep /legacy for fallback.

### Step 7: Extract Components
Move components from legacy into feature modules one at a time. Each extraction: create new, update imports, delete old, verify.

### Step 8: Delete Legacy
Remove LegacyApp.tsx and /legacy route. Migration complete.

### Safety: At Every Step
- npm run dev starts without errors
- npm run build succeeds
- File upload works
- Transcription produces results
- Export works
- No console errors

---

## Appendix: Key Technical Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Router | react-router-dom v6 | De facto standard, lightweight |
| State management | React Context + useReducer | Sufficient for this scale |
| API key encryption | Web Crypto AES-GCM | Built-in, no dependency |
| Persistence | localStorage (separate keys per project) | Simple, sufficient capacity |
| Directory structure | Feature-based | Scales with features, clear ownership |
| CSS | Keep Tailwind + shared UI components | Already using Tailwind |

## Appendix: New Dependencies

Only ONE new runtime dependency: `react-router-dom ^6.x`

Everything else (Web Crypto, localStorage, AbortController) is built into the browser.

Optional later additions:
- `@tanstack/react-virtual` — virtual scrolling for long transcripts
- `clsx` or `tailwind-merge` — Tailwind class merging

---

*Research Date: 2026-02-06*
*Researcher: Claude Opus 4.6*
