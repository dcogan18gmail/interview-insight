# Testing Patterns

**Analysis Date:** 2026-02-06

## Test Framework

**Runner:**

- No test framework is installed or configured
- No test runner (no Jest, Vitest, Mocha, or any other)
- No test script in `package.json` (only `dev`, `start`, `build`, `preview`)

**Assertion Library:**

- None installed

**Run Commands:**

```bash
# No test commands exist. These would need to be added:
# npm test           # Not configured
# npm run test       # Not configured
```

## Test File Organization

**Location:**

- No test files exist anywhere in the project source
- No `__tests__/` directories
- No `*.test.ts`, `*.test.tsx`, `*.spec.ts`, or `*.spec.tsx` files outside `node_modules/`

**Naming:**

- No convention established

**Structure:**

- No test directory structure exists. If tests are added, the recommended approach based on codebase structure would be:

```
[project-root]/
├── __tests__/                    # or co-located with source
│   ├── components/
│   │   ├── FileUpload.test.tsx
│   │   ├── LoadingState.test.tsx
│   │   └── TranscriptView.test.tsx
│   ├── services/
│   │   └── geminiService.test.ts
│   └── App.test.tsx
```

## Test Structure

**Suite Organization:**

- No existing tests to reference

**Recommended pattern based on codebase conventions:**

```typescript
// Vitest recommended (already uses Vite for builds)
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import FileUpload from '../components/FileUpload';

describe('FileUpload', () => {
  it('should render upload area', () => {
    render(<FileUpload onFileSelected={vi.fn()} disabled={false} />);
    expect(screen.getByText(/Click to upload/)).toBeDefined();
  });
});
```

## Mocking

**Framework:** None installed

**What would need mocking (based on codebase analysis):**

- `@google/genai` SDK (`GoogleGenAI`, `generateContentStream`) -- used in `services/geminiService.ts`
- `fetch` API -- used in `services/geminiService.ts` for `uploadFile` (lines 71, 102) and in `netlify/functions/gemini-upload.ts` (line 38)
- `process.env.API_KEY` / `process.env.GEMINI_API_KEY` -- environment variables accessed in `services/geminiService.ts` line 8 and `netlify/functions/gemini-upload.ts` line 16
- `navigator.clipboard.writeText` -- used in `components/TranscriptView.tsx` line 122
- `URL.createObjectURL` / `URL.revokeObjectURL` -- used in `components/FileUpload.tsx` line 74 and `components/TranscriptView.tsx` line 86
- `document.createElement('video')` -- used for duration extraction in `components/FileUpload.tsx` line 46
- `docx` library (`Document`, `Packer.toBlob`) -- used in `components/TranscriptView.tsx` for DOCX generation

**Recommended mocking pattern:**

```typescript
// For the Gemini AI client (services/geminiService.ts)
vi.mock('@google/genai', () => ({
  GoogleGenAI: vi.fn().mockImplementation(() => ({
    models: {
      generateContentStream: vi.fn().mockResolvedValue({
        [Symbol.asyncIterator]: async function* () {
          yield {
            text: '{"speaker":"Guest","originalText":"Hello","englishText":"Hello","timestamp":0}\n',
          };
        },
      }),
    },
  })),
}));

// For fetch (upload flow)
global.fetch = vi.fn().mockResolvedValue({
  ok: true,
  json: () => Promise.resolve({ uploadUrl: 'https://example.com/upload' }),
  text: () => Promise.resolve(''),
  headers: new Headers({ 'x-goog-upload-url': 'https://example.com/upload' }),
});
```

## Fixtures and Factories

**Test Data:**

- No fixtures exist. Key types that would need test factories:

```typescript
// Based on types.ts
import { FileData, TranscriptSegment, TranscriptionStatus } from '../types';

const createMockFileData = (overrides?: Partial<FileData>): FileData => ({
  name: 'test-interview.mp3',
  type: 'audio/mpeg',
  size: 1024 * 1024, // 1MB
  duration: 120, // 2 minutes
  file: new File([''], 'test-interview.mp3', { type: 'audio/mpeg' }),
  ...overrides,
});

const createMockTranscriptSegment = (
  overrides?: Partial<TranscriptSegment>
): TranscriptSegment => ({
  speaker: 'Interviewer',
  originalText: 'How are you today?',
  englishText: 'How are you today?',
  timestamp: 0,
  ...overrides,
});
```

**Location:**

- No fixtures directory exists

## Coverage

**Requirements:** None enforced. No coverage tooling configured.

**To add coverage (recommended setup):**

```bash
# With Vitest (recommended since Vite is already the build tool):
npx vitest --coverage
```

## Test Types

**Unit Tests:**

- None exist
- High-value targets for unit tests:
  - `parseBuffer()` in `services/geminiService.ts` -- pure function, parses JSONL streaming data
  - `isDuplicate()` in `services/geminiService.ts` -- pure function, deduplication logic
  - `formatTime()` in `components/TranscriptView.tsx` -- pure function, time formatting
  - `generateDocxBlob()` in `components/TranscriptView.tsx` -- document generation logic

**Integration Tests:**

- None exist
- High-value targets:
  - `uploadFile()` flow in `services/geminiService.ts` -- chunked upload with progress callbacks
  - `generateTranscript()` flow in `services/geminiService.ts` -- streaming transcription with retry logic
  - `App.tsx` state machine transitions (IDLE -> UPLOADING -> PROCESSING -> COMPLETED/ERROR)

**E2E Tests:**

- Not configured (no Playwright, Cypress, or similar)
- Would cover: file upload -> transcription -> download DOCX flow

## Critical Testability Gaps

**`services/geminiService.ts`:**

- The `getAI()` singleton pattern (lazy-initialized module-level `let ai`) makes the AI client hard to inject for testing
- `parseBuffer()` and `isDuplicate()` are module-private (not exported); they should be exported or extracted to a utilities file for direct unit testing
- Files: `services/geminiService.ts` lines 5-15 (singleton), lines 20-44 (parseBuffer), lines 47-66 (isDuplicate)

**`components/TranscriptView.tsx`:**

- `generateDocxBlob()` and `saveBlob()` are defined inside the component, making them untestable in isolation
- `handleCopy()` uses `alert()` for user feedback -- hard to assert in tests
- Files: `components/TranscriptView.tsx` lines 19-83 (generateDocxBlob), lines 85-94 (saveBlob), line 123 (alert)

**`components/FileUpload.tsx`:**

- Duration extraction relies on browser `<video>` element with `onloadedmetadata` event -- requires DOM mocking
- Files: `components/FileUpload.tsx` lines 46-74

## Recommended Test Setup

**Installation (to establish testing from scratch):**

```bash
npm install -D vitest @testing-library/react @testing-library/jest-dom jsdom
```

**Vitest config (add to `vite.config.ts`):**

```typescript
/// <reference types="vitest" />
import { defineConfig } from 'vite';

export default defineConfig({
  // ... existing config
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./test/setup.ts'],
  },
});
```

**Add test script to `package.json`:**

```json
{
  "scripts": {
    "test": "vitest",
    "test:coverage": "vitest --coverage"
  }
}
```

---

_Testing analysis: 2026-02-06_
