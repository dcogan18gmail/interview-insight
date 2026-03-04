# Phase 3: Storage Foundation - Context

**Gathered:** 2026-02-07
**Status:** Ready for planning

<domain>
## Phase Boundary

Build a reliable, versioned localStorage persistence layer for project and transcript data. Includes schema versioning with automatic migrations, quota handling, corruption recovery, and separation of metadata from transcript data for lazy loading. The existing encrypted API key storage (cryptoService.ts) is already in place and out of scope for this phase.

</domain>

<decisions>
## Implementation Decisions

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

</decisions>

<specifics>
## Specific Ideas

No specific requirements — open to standard approaches. User noted this is not their area of expertise and trusts Claude's understanding of best practices in the context of this project.

**Current state context for researcher/planner:**

- Only 2 localStorage keys exist today: `gemini_encrypted_key` and `gemini_key_passphrase` (managed by cryptoService.ts)
- No project or transcript data is persisted yet — everything is in-memory only
- cryptoService.ts is the only abstraction over localStorage currently
- Settings.tsx has one direct localStorage.setItem call that should be routed through the new storage service

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

_Phase: 03-storage-foundation_
_Context gathered: 2026-02-07_
