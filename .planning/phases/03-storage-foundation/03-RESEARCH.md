# Phase 3: Storage Foundation - Research

**Researched:** 2026-02-07
**Domain:** localStorage persistence layer with schema versioning, migration, quota handling, corruption recovery
**Confidence:** HIGH

## Summary

This phase builds a zero-dependency localStorage persistence service for project and transcript data. The codebase currently has only two localStorage keys (`gemini_encrypted_key` and `gemini_key_passphrase`) managed by `cryptoService.ts`, plus one direct `localStorage.setItem` call in `Settings.tsx` (line 48). No project or transcript data is persisted -- everything is in-memory only.

The standard approach for this domain is a hand-rolled storage service (no npm dependencies needed) that wraps all localStorage access behind a typed API. The service handles JSON serialization, schema versioning with sequential integer migrations, quota detection via try/catch on `setItem`, and corruption recovery via `safeParse`-style validation on reads. Metadata and transcript data use separate key patterns to enable lazy loading of expensive transcript data.

**Primary recommendation:** Build a single `storageService.ts` module (~200-300 lines) with typed read/write helpers, a migration registry, quota-aware writes with error propagation, and validation-on-read for corruption recovery. No third-party libraries. Use debounced writes (300-500ms) with a `beforeunload` flush for data safety.

<user_constraints>

## User Constraints (from CONTEXT.md)

### Locked Decisions

None -- user deferred all implementation decisions to Claude's discretion.

### Claude's Discretion

User deferred all storage implementation decisions to Claude's best judgment. The following areas are fully at Claude's discretion, guided by best practices for this project:

**Schema design:**

- Key naming conventions and namespace strategy
- Schema version format and storage location
- How to split metadata keys vs transcript data keys
- Data structure for project state serialization

**Migration strategy:**

- How schema upgrades are detected and applied
- Whether migrations run eagerly on load or lazily on access
- Rollback approach (if any) for failed migrations
- How to handle data from unknown/future schema versions

**Failure handling:**

- Quota exceeded detection and user-facing error message
- Corruption detection approach (validation, checksums, etc.)
- What "fallback to defaults" means concretely (empty state, partial recovery, etc.)
- Whether to attempt partial recovery or clean reset on corruption

**Data lifecycle:**

- Write frequency (on every change, debounced, or explicit save)
- Read strategy (full load on init vs lazy per-project)
- Orphaned data cleanup approach
- Integration pattern with existing cryptoService.ts

### Deferred Ideas (OUT OF SCOPE)

None -- discussion stayed within phase scope
</user_constraints>

## Standard Stack

### Core

No new npm dependencies required. This phase uses only browser APIs and hand-rolled TypeScript.

| Tool                 | Version           | Purpose                     | Why Standard                                   |
| -------------------- | ----------------- | --------------------------- | ---------------------------------------------- |
| localStorage API     | Web API           | Key-value persistence       | Already available, 5MB quota sufficient for v1 |
| JSON.stringify/parse | Built-in          | Serialization               | Standard for localStorage data                 |
| TypeScript generics  | 5.8.3 (installed) | Type-safe read/write        | Project already uses strict TS                 |
| Web Crypto API       | Web API           | Integrity checks (optional) | Already used by cryptoService.ts               |

### Supporting

| Tool                | Purpose                         | When to Use                                      |
| ------------------- | ------------------------------- | ------------------------------------------------ |
| `structuredClone()` | Deep-clone data before mutation | When migration functions modify objects in-place |
| `performance.now()` | Debounce timer for writes       | More precise than Date.now for short intervals   |

### Alternatives Considered

| Instead of             | Could Use             | Tradeoff                                                              |
| ---------------------- | --------------------- | --------------------------------------------------------------------- |
| Hand-rolled validation | Zod (~17kB gzipped)   | Overkill for ~3-4 known shapes; adds dependency to zero-dep project   |
| Hand-rolled versioning | versioned-storage npm | Only 6 GitHub stars, purges data instead of migrating -- not suitable |
| Hand-rolled service    | typed-local-store npm | Zero-dep but no migration support, adds unnecessary abstraction       |
| localStorage           | IndexedDB             | Async API adds complexity; localStorage 5MB is sufficient for v1      |

**Installation:**

```bash
# No new packages needed
```

## Architecture Patterns

### Recommended Project Structure

```
services/
  storageService.ts        # Core storage service (read/write/migrate/quota)
  storageService.types.ts  # TypeScript interfaces and schema definitions
  cryptoService.ts         # Existing - unchanged (API key encryption)
```

The storage service lives alongside `cryptoService.ts` in the `services/` directory, following the existing project structure. No `src/` directory exists yet (that is Phase 4's refactor), so files go at the project root in `services/`.

### Pattern 1: Namespaced Key Convention

**What:** All storage keys use a prefix namespace to avoid collisions and enable enumeration.
**When to use:** Always -- this is the foundation of the key strategy.

```typescript
// Key namespace pattern
const NAMESPACE = 'ii'; // "interview-insight" abbreviated

// Key patterns:
// ii:meta                    -> schema version + global metadata
// ii:projects                -> array of project metadata (lightweight)
// ii:transcript:{projectId}  -> full transcript data (heavy, loaded lazily)

const KEYS = {
  META: `${NAMESPACE}:meta`,
  PROJECTS: `${NAMESPACE}:projects`,
  transcript: (id: string) => `${NAMESPACE}:transcript:${id}`,
} as const;
```

**Rationale:** The existing crypto keys (`gemini_encrypted_key`, `gemini_key_passphrase`) are NOT namespaced and should remain untouched. The new `ii:` namespace clearly separates storage service keys from crypto keys, and the colon separator makes keys easy to enumerate with a prefix scan.

### Pattern 2: Schema Version in a Dedicated Key

**What:** Store schema version number in `ii:meta` alongside any global metadata.
**When to use:** Always -- checked on every app load.

```typescript
interface StorageMeta {
  schemaVersion: number; // Integer, starts at 1
  lastUpdated: string; // ISO timestamp
}

// On app initialization:
// 1. Read ii:meta
// 2. If missing -> fresh install, write version 1
// 3. If version < CURRENT_VERSION -> run migrations sequentially
// 4. If version > CURRENT_VERSION -> unknown future version, read-only / warn
// 5. If version === CURRENT_VERSION -> proceed normally
```

### Pattern 3: Eager Migration on Load

**What:** Run all pending migrations immediately when the app initializes, before any reads.
**When to use:** Always -- ensures consistent state before any component renders.

```typescript
// Migration registry: ordered array of version upgrade functions
type Migration = {
  version: number;
  up: () => void; // Reads old data, writes new format
};

const migrations: Migration[] = [
  // { version: 2, up: () => { /* migrate v1 -> v2 */ } },
  // { version: 3, up: () => { /* migrate v2 -> v3 */ } },
];

function runMigrations(currentVersion: number, targetVersion: number): void {
  const pending = migrations
    .filter((m) => m.version > currentVersion && m.version <= targetVersion)
    .sort((a, b) => a.version - b.version);

  for (const migration of pending) {
    try {
      migration.up();
      // Update stored version after each successful migration
      writeMeta({
        schemaVersion: migration.version,
        lastUpdated: new Date().toISOString(),
      });
    } catch (error) {
      console.error(`Migration to v${migration.version} failed:`, error);
      // Stop migrating -- app works with partially migrated data
      // The version number reflects the last successful migration
      break;
    }
  }
}
```

**Rationale:** Eager migration is simpler than lazy and avoids partial-state bugs. With localStorage being synchronous and migration logic being lightweight (just reshaping JSON), this adds negligible startup overhead. The migration registry starts empty in v1 -- it exists as infrastructure for future schema changes.

### Pattern 4: Validation-on-Read for Corruption Recovery

**What:** Every read validates the parsed JSON against expected shape before returning.
**When to use:** Every `getItem` call.

```typescript
type ParseResult<T> = { ok: true; data: T } | { ok: false; error: string };

function safeRead<T>(
  key: string,
  validate: (raw: unknown) => ParseResult<T>
): T | null {
  const raw = localStorage.getItem(key);
  if (raw === null) return null;

  try {
    const parsed: unknown = JSON.parse(raw);
    const result = validate(parsed);
    if (result.ok) return result.data;

    // Corrupted: valid JSON but wrong shape
    console.warn(
      `Storage corruption detected for key "${key}": ${result.error}`
    );
    localStorage.removeItem(key);
    return null;
  } catch {
    // Corrupted: not valid JSON at all
    console.warn(`Storage corruption detected for key "${key}": invalid JSON`);
    localStorage.removeItem(key);
    return null;
  }
}
```

**Rationale:** Hand-rolled validators for 3-4 known shapes are simpler and smaller than adding Zod (~17kB gzipped). The validation functions double as documentation of the expected data shape. When corruption is detected, the key is removed and `null` is returned, which callers treat as "empty state" (fresh install behavior).

### Pattern 5: Debounced Writes with beforeunload Flush

**What:** Batch rapid state changes into a single localStorage write, with a safety flush on page unload.
**When to use:** For project metadata writes that may happen in rapid succession (e.g., renaming).

```typescript
let pendingWrites: Map<string, string> = new Map();
let flushTimer: ReturnType<typeof setTimeout> | null = null;

function debouncedWrite(key: string, value: string): void {
  pendingWrites.set(key, value);
  if (flushTimer !== null) clearTimeout(flushTimer);
  flushTimer = setTimeout(flushPending, 300);
}

function flushPending(): void {
  for (const [key, value] of pendingWrites) {
    safeWrite(key, value); // try/catch with quota handling
  }
  pendingWrites.clear();
  flushTimer = null;
}

// Safety net: flush on page unload
window.addEventListener('beforeunload', flushPending);
```

**Rationale:** Debouncing prevents excessive writes during rapid changes (typing a project name, etc.). 300ms is responsive enough that users perceive saves as instant, while batching prevents thrashing. The `beforeunload` listener ensures no data loss if the user closes the tab during the debounce window. Note: `beforeunload` is reliable on desktop browsers but may not fire on mobile -- this is an accepted tradeoff since localStorage writes are fast enough that the 300ms window of potential loss is minimal.

### Pattern 6: Separate Metadata from Transcript Data

**What:** Store lightweight project list in one key, heavy transcript data in per-project keys.
**When to use:** Always -- this is a requirement (PROJ-09).

```typescript
// Lightweight: loaded on every app start
// ii:projects -> ProjectMetadata[]
interface ProjectMetadata {
  id: string; // UUID or nanoid
  name: string;
  createdAt: string; // ISO timestamp
  updatedAt: string; // ISO timestamp
  status: 'idle' | 'uploading' | 'processing' | 'completed' | 'error';
  fileInfo: {
    name: string;
    type: string;
    size: number;
    duration: number;
  };
  segmentCount: number; // Summary stat, avoid loading transcript
}

// Heavy: loaded only when viewing a specific project
// ii:transcript:{id} -> TranscriptData
interface TranscriptData {
  projectId: string;
  segments: TranscriptSegment[]; // Reuses existing type from types.ts
  completedAt: string | null;
}
```

**Rationale:** A 30-minute interview transcript with ~200 segments could be 50-200KB as JSON. Loading all transcripts to render a project list is wasteful. Separate keys allow the dashboard (Phase 5) to load only the lightweight metadata array, and fetch transcript data on demand when a user opens a project.

### Anti-Patterns to Avoid

- **Single mega-key:** Do NOT store all project data (including transcripts) in one localStorage key. This defeats lazy loading and makes quota issues worse (one corrupt key loses everything).
- **Direct localStorage access in components:** ALL reads/writes should go through `storageService.ts`. The one existing direct call in `Settings.tsx:48` (`localStorage.setItem('gemini_encrypted_key', encrypted)`) should be noted but is managed by `cryptoService.ts` and is out of scope for this phase.
- **Synchronous migration on every read:** Migrations should run once on app init, not on every key access. Lazy migration adds complexity for no benefit in this use case.
- **Storing File/Blob objects:** localStorage only handles strings. Never attempt to store raw audio/video file data -- only metadata and transcript text.

## Don't Hand-Roll

Problems that look simple but have existing solutions or hidden complexity:

| Problem                     | Don't Build                  | Use Instead                                | Why                                                        |
| --------------------------- | ---------------------------- | ------------------------------------------ | ---------------------------------------------------------- |
| UUID generation             | Custom random ID             | `crypto.randomUUID()`                      | Built into all modern browsers, cryptographically random   |
| Deep cloning for migrations | Recursive clone function     | `structuredClone()`                        | Handles edge cases (Date, RegExp, etc.)                    |
| JSON serialization          | Custom serializer            | `JSON.stringify`/`JSON.parse`              | Standard, handles nested objects correctly                 |
| Debounce utility            | Custom debounce              | Simple `setTimeout`/`clearTimeout` pattern | Only one use case, full lodash.debounce is overkill        |
| Schema validation library   | Full Zod/Valibot integration | Hand-rolled type guards                    | Only 3-4 shapes to validate, project has zero runtime deps |

**Key insight:** This storage layer has simple, well-defined data shapes. The complexity is in the orchestration (versioning, migration, error handling) not in the data validation. A full schema validation library adds weight without proportional value.

## Common Pitfalls

### Pitfall 1: Quota Exceeded Goes Undetected

**What goes wrong:** `localStorage.setItem()` throws a `DOMException` when quota is exceeded, but if not caught, the error propagates and crashes the app or silently fails.
**Why it happens:** Developers wrap reads in try/catch but forget writes are the dangerous operation. Different browsers throw slightly different error objects.
**How to avoid:** Wrap every `setItem` call in a `safeWrite` helper that catches `DOMException` and checks error code 22, code 1014, name `QuotaExceededError`, or name `NS_ERROR_DOM_QUOTA_REACHED`.
**Warning signs:** App works fine in development (small data) but crashes in production with multiple projects and long transcripts.

```typescript
function isQuotaExceededError(err: unknown): boolean {
  return (
    err instanceof DOMException &&
    (err.code === 22 ||
      err.code === 1014 ||
      err.name === 'QuotaExceededError' ||
      err.name === 'NS_ERROR_DOM_QUOTA_REACHED')
  );
}
```

### Pitfall 2: JSON.parse on Corrupted Data Crashes App

**What goes wrong:** `JSON.parse(localStorage.getItem(key))` throws `SyntaxError` if the stored value is corrupted (partial write, manual edit, browser bug).
**Why it happens:** Firefox has known bugs where localStorage data can become corrupted (Mozilla Bug 1341070, 1017066). Users can also manually edit localStorage via DevTools.
**How to avoid:** Always use the `safeRead` pattern -- try/catch around `JSON.parse`, then validate the parsed shape. Return `null` on any failure and remove the corrupted key.
**Warning signs:** Error reports mentioning "unexpected token" or "JSON.parse" in production.

### Pitfall 3: Migration Partially Applied

**What goes wrong:** A migration reads old data, transforms it, but the write back fails (quota, exception). The version number is updated but data is in an inconsistent state.
**Why it happens:** Version number update and data write are not atomic in localStorage (no transaction support).
**How to avoid:** Update the version number AFTER the data write succeeds, not before. If the data write fails, the version stays at the old number and the migration will retry on next load.
**Warning signs:** Users report "blank projects" after an app update.

### Pitfall 4: localStorage Unavailable in Private Browsing

**What goes wrong:** Some browsers (notably older Safari) throw exceptions when accessing `localStorage` in private browsing mode. More modern browsers allow access but may limit storage or evict it.
**Why it happens:** Privacy features restrict persistent storage.
**How to avoid:** Check localStorage availability at startup with a test write/read/delete cycle. If unavailable, the app still works with in-memory state (just won't persist across refreshes).
**Warning signs:** App crashes immediately in Safari private browsing.

### Pitfall 5: Orphaned Transcript Keys After Project Deletion

**What goes wrong:** Deleting a project removes it from the `ii:projects` array but the `ii:transcript:{id}` key remains, consuming quota silently.
**Why it happens:** Two separate keys need coordinated deletion, and if the transcript deletion is forgotten or fails, the data lingers.
**How to avoid:** The `deleteProject` function must always delete both the metadata entry AND the transcript key. Add an optional cleanup function that scans for transcript keys not referenced by any project.
**Warning signs:** Users report quota errors even though they've deleted projects.

### Pitfall 6: UTF-16 Encoding Doubles Apparent Size

**What goes wrong:** Developers estimate storage usage by counting string characters, but localStorage uses UTF-16 encoding internally, so each character occupies 2 bytes.
**Why it happens:** The 5MB quota is approximately 2.5 million characters, not 5 million.
**How to avoid:** Calculate size as `(key.length + value.length) * 2` bytes for each entry when estimating usage.
**Warning signs:** Quota exceeded at seemingly half the expected data volume.

## Code Examples

### Complete safeWrite with Quota Detection

```typescript
// Confidence: HIGH - Pattern verified against MDN and multiple sources
type WriteResult =
  | { ok: true }
  | {
      ok: false;
      error: 'quota_exceeded' | 'storage_unavailable' | 'unknown';
      message: string;
    };

function safeWrite(key: string, value: string): WriteResult {
  try {
    localStorage.setItem(key, value);
    return { ok: true };
  } catch (err) {
    if (isQuotaExceededError(err)) {
      return {
        ok: false,
        error: 'quota_exceeded',
        message:
          'Storage is full. Please delete some projects to free up space.',
      };
    }
    return {
      ok: false,
      error: err instanceof DOMException ? 'storage_unavailable' : 'unknown',
      message:
        'Unable to save data. Your browser may be in private browsing mode.',
    };
  }
}
```

### Storage Availability Check

```typescript
// Confidence: HIGH - Pattern from MDN and Matteo Mazzarolo's verified implementation
function isStorageAvailable(): boolean {
  try {
    const testKey = '__storage_test__';
    localStorage.setItem(testKey, testKey);
    localStorage.removeItem(testKey);
    return true;
  } catch {
    return false;
  }
}
```

### Calculate Current localStorage Usage

```typescript
// Confidence: HIGH - Standard approach, accounts for UTF-16 encoding
function getStorageUsageBytes(): number {
  let total = 0;
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key !== null) {
      const value = localStorage.getItem(key);
      if (value !== null) {
        // UTF-16: each char = 2 bytes
        total += (key.length + value.length) * 2;
      }
    }
  }
  return total;
}

function getStorageUsageMB(): number {
  return getStorageUsageBytes() / (1024 * 1024);
}
```

### Type Guard Validators (Hand-Rolled)

```typescript
// Confidence: HIGH - Standard TypeScript pattern, verified against strict mode requirements

function isProjectMetadata(value: unknown): value is ProjectMetadata {
  if (typeof value !== 'object' || value === null) return false;
  const obj = value as Record<string, unknown>;
  return (
    typeof obj['id'] === 'string' &&
    typeof obj['name'] === 'string' &&
    typeof obj['createdAt'] === 'string' &&
    typeof obj['updatedAt'] === 'string' &&
    typeof obj['status'] === 'string' &&
    ['idle', 'uploading', 'processing', 'completed', 'error'].includes(
      obj['status'] as string
    ) &&
    typeof obj['fileInfo'] === 'object' &&
    obj['fileInfo'] !== null &&
    typeof obj['segmentCount'] === 'number'
  );
}

function isProjectMetadataArray(value: unknown): value is ProjectMetadata[] {
  return Array.isArray(value) && value.every(isProjectMetadata);
}

function isTranscriptData(value: unknown): value is TranscriptData {
  if (typeof value !== 'object' || value === null) return false;
  const obj = value as Record<string, unknown>;
  return (
    typeof obj['projectId'] === 'string' && Array.isArray(obj['segments'])
    // Individual segment validation can be lighter -- just check array exists
  );
}
```

### ID Generation

```typescript
// Confidence: HIGH - crypto.randomUUID() supported in all modern browsers
function generateProjectId(): string {
  return crypto.randomUUID();
}
```

## State of the Art

| Old Approach                                      | Current Approach                       | When Changed                 | Impact                                                           |
| ------------------------------------------------- | -------------------------------------- | ---------------------------- | ---------------------------------------------------------------- |
| `JSON.parse(localStorage.getItem(key))` unguarded | Validation-on-read with type guards    | Ongoing best practice        | Prevents crash-on-corruption                                     |
| Single monolithic storage key                     | Namespaced separate keys per concern   | Ongoing best practice        | Enables lazy loading, partial failure recovery                   |
| No versioning                                     | Integer-based schema versioning        | Ongoing best practice        | Enables non-breaking schema evolution                            |
| Zod for all validation                            | Hand-rolled guards for simple shapes   | Zod 4 released 2025          | Zod valuable for complex forms, overkill for localStorage shapes |
| `navigator.storage.estimate()`                    | Direct iteration for localStorage size | API distinction clarified    | `estimate()` does NOT cover localStorage, only IndexedDB/Cache   |
| Custom UUID                                       | `crypto.randomUUID()`                  | Widely supported since ~2022 | No polyfill or library needed                                    |
| `structuredClone` polyfill                        | Native `structuredClone()`             | Widely supported since ~2022 | No polyfill needed                                               |

**Deprecated/outdated:**

- `versioned-storage` npm package: Purges data on version mismatch instead of migrating. Not suitable for production apps with user data.
- Safari private browsing localStorage restrictions: Modern Safari (15+) allows localStorage in private mode but may evict data. Still worth testing.

## Open Questions

1. **Practical transcript size**
   - What we know: A TranscriptSegment has speaker, originalText, englishText, and timestamp fields. A 30-minute interview might produce ~100-300 segments.
   - What's unclear: The exact JSON size of a typical transcript after `JSON.stringify`. Need to measure with real data.
   - Recommendation: After Phase 6 produces real transcripts, measure actual sizes. For now, design the key separation (metadata vs transcript) and assume ~100-200KB per transcript is a reasonable estimate. With 5MB quota and ~500KB for metadata overhead, that allows ~20-25 projects before quota pressure. Log a warning at 80% usage.

2. **IndexedDB migration threshold**
   - What we know: localStorage is 5MB per origin. The STATE.md flags this as a blocker/concern.
   - What's unclear: Whether v1 users will hit the 5MB limit with realistic usage.
   - Recommendation: Defer IndexedDB to v2. Build the storage service with an interface abstract enough that swapping the backing store is possible, but don't over-engineer it. Add a usage-tracking utility that can inform future decisions.

3. **Multi-tab coordination**
   - What we know: localStorage fires `storage` events when modified by another tab. Without coordination, two tabs could overwrite each other's changes.
   - What's unclear: Whether this app will realistically be used in multiple tabs simultaneously.
   - Recommendation: Out of scope for Phase 3. If needed later, the `storage` event listener can be added. For now, last-write-wins is acceptable for a single-user tool.

## Sources

### Primary (HIGH confidence)

- [MDN: Storage quotas and eviction criteria](https://developer.mozilla.org/en-US/docs/Web/API/Storage_API/Storage_quotas_and_eviction_criteria) -- Confirmed 5MB per-origin limit for localStorage across all browsers
- [MDN: Window beforeunload event](https://developer.mozilla.org/en-US/docs/Web/API/Window/beforeunload_event) -- Confirmed reliability characteristics for flush-on-close
- Codebase analysis: `cryptoService.ts`, `Settings.tsx`, `types.ts`, `App.tsx`, `geminiService.ts` -- Direct inspection of current state

### Secondary (MEDIUM confidence)

- [Matteo Mazzarolo: Handling localStorage errors](https://mmazzarolo.com/blog/2022-06-25-local-storage-status/) -- `isQuotaExceededError` pattern with cross-browser error code handling, verified against MDN
- [Mozilla Bug 1341070](https://bugzilla.mozilla.org/show_bug.cgi?id=1341070) -- localStorage corruption scenario in Firefox
- [Bundlephobia: Zod](https://bundlephobia.com/package/zod) -- Bundle size verification (~17kB gzipped for Zod 3)
- [Builder.io: Introducing Valibot](https://www.builder.io/blog/introducing-valibot) -- Valibot as lightweight alternative (~1.37kB)

### Tertiary (LOW confidence)

- [Steve Souders: Measuring localStorage Performance](https://www.stevesouders.com/blog/2014/02/11/measuring-localstorage-performance/) -- Historical performance analysis (2014), principles still apply but specific numbers may vary
- [GitHub Gist: Calculate localStorage size](https://gist.github.com/tkambler/71050d80f1a57ea83c18) -- UTF-16 size calculation pattern, community-verified

## Metadata

**Confidence breakdown:**

- Standard stack: HIGH -- No external dependencies, uses well-documented browser APIs
- Architecture: HIGH -- Patterns verified against multiple sources, consistent with existing codebase conventions
- Pitfalls: HIGH -- Quota handling and corruption recovery are well-documented across MDN and browser bug trackers
- Data shapes: MEDIUM -- ProjectMetadata interface is designed to serve Phases 4-6 needs; may need adjustment when those phases are planned
- Size estimates: LOW -- Transcript size estimates are based on field-count reasoning, not measured data

**Research date:** 2026-02-07
**Valid until:** 2026-03-07 (stable domain -- localStorage API is mature and unchanged)
