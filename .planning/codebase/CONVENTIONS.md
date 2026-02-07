# Coding Conventions

**Analysis Date:** 2026-02-06

## Naming Patterns

**Files:**

- React components: PascalCase `.tsx` files (e.g., `components/FileUpload.tsx`, `components/TranscriptView.tsx`)
- Services: camelCase `.ts` files (e.g., `services/geminiService.ts`)
- Type definitions: camelCase `.ts` files (e.g., `types.ts`)
- Config files: lowercase with dots (e.g., `vite.config.ts`, `tailwind.config.js`, `postcss.config.js`)
- Netlify functions: kebab-case `.ts` files (e.g., `netlify/functions/gemini-upload.ts`, `netlify/edge-functions/proxy-upload.ts`)

**Functions:**

- Use camelCase for all functions: `handleFileSelected`, `handleStartTranscription`, `handleReset`
- Event handlers prefixed with `handle`: `handleDrag`, `handleDrop`, `handleChange`, `handleDownload`, `handleCopy`
- Callbacks prefixed with `on`: `onFileSelected`, `onProgress`, `onUploadProgress`
- Helper/utility functions: camelCase descriptive verbs: `parseBuffer`, `isDuplicate`, `formatTime`, `generateDocxBlob`, `saveBlob`
- Lazy initializers prefixed with `get`: `getAI()`

**Variables:**

- Use camelCase for all variables: `fileData`, `errorMessage`, `currentSegment`
- Constants: UPPER_SNAKE_CASE for module-level constants: `MAX_SIZE_MB`, `MODEL_NAME`, `CHUNK_SIZE`, `MAX_RETRIES`, `MAX_LOOPS`
- Boolean variables: descriptive names without `is` prefix at component level: `dragActive`, `loading`, `showDownloadMenu`
- Boolean helper functions: prefixed with `is`: `isDuplicate`, `isContinuation`, `isComplete`, `isLastChunk`, `isTranslated`

**Types:**

- Interfaces: PascalCase with descriptive suffix: `FileUploadProps`, `LoadingStateProps`, `TranscriptViewProps`
- Enums: PascalCase with UPPER_SNAKE_CASE values: `TranscriptionStatus.IDLE`, `TranscriptionStatus.PROCESSING`
- Shared types defined in root `types.ts`: `TranscriptSegment`, `FileData`, `TranscriptionStatus`
- Component prop interfaces defined inline in the component file, not exported

## Code Style

**Formatting:**

- No dedicated formatter configured (no Prettier, no ESLint)
- Indentation: 2 spaces throughout
- Semicolons: used consistently
- Quotes: double quotes for JSX attributes, double quotes for strings in most files
- Trailing commas: used in multi-line objects and arrays
- Line length: no enforced limit; some JSX lines exceed 200 characters (especially Tailwind class strings)

**Linting:**

- No linter configured (no ESLint, no Biome)
- TypeScript compiler (`tsc`) with `noEmit: true` is the only static check
- `skipLibCheck: true` in `tsconfig.json` disables library type checking
- `allowJs: true` permits JavaScript files

**TypeScript Configuration:**

- Target: ES2022
- Module: ESNext with bundler resolution
- JSX: react-jsx (automatic runtime)
- Path alias: `@/*` maps to project root (`./`)
- `isolatedModules: true` and `moduleDetection: "force"` enabled

## Import Organization

**Order:**

1. React and React ecosystem imports (`import React, { useState } from 'react'`)
2. Third-party library imports (`import { Document, Packer, ... } from 'docx'`, `import { GoogleGenAI } from "@google/genai"`)
3. Local type imports (`import { FileData, TranscriptSegment } from '../types'` or `'./types'`)
4. Local module imports (`import { generateTranscript, uploadFile } from './services/geminiService'`)
5. CSS imports (`import './index.css'`)

**Path Aliases:**

- `@/*` alias configured in `tsconfig.json` mapping to project root, but NOT actively used in source code
- All imports use relative paths: `'../types'`, `'./components/FileUpload'`, `'./services/geminiService'`

**Style:**

- Named imports preferred: `import { useState } from 'react'`
- Default imports for components: `import FileUpload from './components/FileUpload'`
- Named exports for service functions: `export const uploadFile = ...`, `export const generateTranscript = ...`
- Default exports for React components: `export default FileUpload`

## Error Handling

**Patterns:**

- **try/catch at async boundaries:** All async operations wrapped in try/catch in `App.tsx` (`handleStartTranscription`) and `services/geminiService.ts` (`uploadFile`, `generateTranscript`)
- **Error state management:** Errors caught and stored in React state (`setErrorMessage`), then displayed in UI
- **instanceof Error check:** `error instanceof Error ? error.message : "An error occurred..."` pattern used for safe message extraction in `App.tsx` line 69
- **Re-throw after logging:** Services log errors via `console.error` then re-throw: `console.error("Upload error:", error); throw error;` in `services/geminiService.ts` line 132
- **Guard clauses with early return:** `if (!fileData) return;` in `App.tsx` line 26
- **Validation errors as thrown Errors:** `throw new Error("No file object found for upload.")` in `App.tsx` line 44
- **Silent JSON parse failures:** In `parseBuffer()` at `services/geminiService.ts` line 39, invalid JSON lines are silently caught and ignored (by design, for streaming JSONL parsing)
- **Retry logic with max attempts:** `generateTranscript` retries up to `MAX_RETRIES` (3) on failures, with a 5-second timestamp nudge between retries

**Netlify Functions:**

- Return status code objects: `{ statusCode: 400, body: 'Missing file metadata' }` in `netlify/functions/gemini-upload.ts`
- Edge functions return `new Response(...)` with explicit status codes in `netlify/edge-functions/proxy-upload.ts`
- CORS handled manually with `Access-Control-Allow-Origin: *`

## Logging

**Framework:** `console` (no logging library)

**Patterns:**

- `console.log` for informational flow: `[GeminiService] Loop ${loopCount}: Starting from approx ${currentStartTime}s` in `services/geminiService.ts` line 205
- `console.warn` for non-fatal issues: `"Could not extract duration"` in `components/FileUpload.tsx` line 63
- `console.error` for errors: `"Gemini Transcription Fatal Error:"` in `services/geminiService.ts` line 324
- Prefix convention for service logs: `[GeminiService]` prefix used in `services/geminiService.ts`
- No structured logging; all messages are plain strings or template literals

## Comments

**When to Comment:**

- Inline comments explain "why" for non-obvious logic: `// Lazy init to prevent crash on load if env var is missing` in `services/geminiService.ts` line 4
- Step-by-step numbered comments in complex flows: `// 1. Upload File if needed`, `// 2. Generate Transcript` in `App.tsx` lines 32, 55
- Section comments in JSX: `{/* Header */}`, `{/* Hero Section */}`, `{/* File Upload Stage */}` throughout `App.tsx`
- TODO/legacy comments present: `// Fallback for legacy small files...` in `App.tsx` line 39
- Protocol documentation in comments: detailed Google API resumable upload protocol documented in `netlify/functions/gemini-upload.ts` lines 26-34

**JSDoc/TSDoc:**

- Not used anywhere in the codebase
- No function documentation beyond inline comments

## Function Design

**Size:**

- Components are single-file, moderately sized (77-229 lines)
- `generateTranscript` is the largest function at ~185 lines in `services/geminiService.ts` -- complex streaming loop with retry logic
- Helper functions are small and focused: `parseBuffer` (~24 lines), `isDuplicate` (~19 lines), `formatTime` (~5 lines)

**Parameters:**

- Callback parameters used for progress reporting: `onProgress: (percentage: number, currentSegment: TranscriptSegment | null) => void`
- Props interfaces for all React components with explicit typing
- Destructured props in function signatures: `({ onFileSelected, disabled })`, `({ progress, currentSegment, status })`

**Return Values:**

- Async functions return `Promise<T>` with explicit types: `Promise<string>` for `uploadFile`, `Promise<TranscriptSegment[]>` for `generateTranscript`
- Components return JSX (implicit `React.FC` return type)
- Helper functions return typed objects: `{ segments: TranscriptSegment[], remainingBuffer: string }`

## Module Design

**Exports:**

- Components: single default export per file (`export default FileUpload`)
- Services: named exports for each public function (`export const uploadFile`, `export const generateTranscript`)
- Types: named exports from `types.ts` (`export enum TranscriptionStatus`, `export interface TranscriptSegment`)
- No re-exports or barrel files

**Barrel Files:**

- Not used. All imports reference specific files directly.

## Component Patterns

**React Component Style:**

- Functional components with `React.FC<Props>` typing: `const App: React.FC = () => {`
- Hooks: `useState` for all local state; `useCallback` for memoized handlers in `FileUpload.tsx`
- No custom hooks, no `useEffect`, no `useContext`, no `useReducer`
- No component libraries (no MUI, Chakra, shadcn, etc.)

**Styling:**

- Tailwind CSS utility classes applied directly in JSX `className` attributes
- Template literal classnames with conditional logic: ``className={`... ${condition ? 'class-a' : 'class-b'}`}``
- Custom animations defined in `index.css` using `@layer utilities` and `@keyframes`
- No CSS modules, no styled-components, no CSS-in-JS

**State Management:**

- All state lives in `App.tsx` using `useState` hooks (6 state variables)
- State passed down via props to child components
- No global state management (no Redux, Zustand, Context, etc.)
- Status tracked via `TranscriptionStatus` enum with explicit state machine transitions

---

_Convention analysis: 2026-02-06_
