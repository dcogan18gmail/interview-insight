---
phase: 01-security-hardening
plan: 02
subsystem: server-functions
tags: [cors, ssrf, rate-limiting, error-sanitization, byok, netlify, edge-functions, serverless]

requires: []
provides:
  - Hardened edge function proxy with CORS allowlist, SSRF prevention, rate limiting
  - Hardened serverless upload function with BYOK header support, rate limiting, error sanitization
  - v2 format migration for gemini-upload
affects:
  - 01-03 (client must send X-Gemini-Key header and use new /api/gemini-upload path)

tech-stack:
  added: []
  patterns:
    - "Origin allowlist CORS (no wildcard)"
    - "SSRF prevention via URL hostname/protocol/path validation"
    - "BYOK via X-Gemini-Key request header with env var fallback"
    - "Netlify rate limiting via config export"
    - "Error sanitization with server-side logging"
    - "Netlify Functions v2 format (Request/Response)"

key-files:
  created: []
  modified:
    - netlify/edge-functions/proxy-upload.ts
    - netlify/functions/gemini-upload.ts

key-decisions:
  - id: SEC-CORS
    decision: "CORS restricted to explicit origin allowlist instead of wildcard"
    rationale: "Prevents unauthorized cross-origin access; Vary header ensures CDN correctness"
  - id: SEC-SSRF
    decision: "Upload URL validated against generativelanguage.googleapis.com hostname, https protocol, and /upload/ path prefix"
    rationale: "Prevents SSRF by ensuring proxy only forwards to intended Google API endpoint"
  - id: SEC-BYOK
    decision: "API key read from X-Gemini-Key header first, falling back to process.env.GEMINI_API_KEY"
    rationale: "Enables BYOK model where each user provides their own key; fallback preserves backward compatibility during transition"
  - id: SEC-RATE
    decision: "Rate limits set at 100/60s for proxy-upload (high volume PUT uploads) and 20/60s for gemini-upload (session initiation)"
    rationale: "Different limits reflect different usage patterns; initiation is rarer than chunk uploads"
  - id: SEC-V2
    decision: "Migrated gemini-upload to Netlify Functions v2 format"
    rationale: "Required for rate limiting config support; modernizes to Web-standard Request/Response API"

duration: ~1 minute
completed: 2026-02-07
---

# Phase 1 Plan 2: Server-Side Security Hardening Summary

Hardened both server functions with CORS origin allowlist, SSRF URL validation, BYOK header support, Netlify rate limiting, and sanitized error responses -- closing SEC-04/05/06/08/09.

## Performance

| Metric | Value |
|--------|-------|
| Duration | ~1 minute |
| Started | 2026-02-07T17:47:22Z |
| Completed | 2026-02-07T17:48:34Z |
| Tasks | 2/2 |
| Files modified | 2 |

## Accomplishments

1. **CORS Origin Allowlist (SEC-05):** Replaced wildcard `*` CORS with explicit allowlist of production Netlify URL and localhost dev URLs. Added `Vary: Origin` header for CDN caching correctness.

2. **SSRF Prevention (SEC-06):** Added `isAllowedUploadUrl()` function that validates upload URLs against `https:` protocol, `generativelanguage.googleapis.com` hostname, and `/upload/` path prefix before proxying.

3. **BYOK Header Support (SEC-04):** `gemini-upload.ts` now reads API key from `X-Gemini-Key` request header first, falling back to `process.env.GEMINI_API_KEY`. Returns 401 with user-friendly message if neither exists.

4. **Rate Limiting (SEC-09):** Both functions export Netlify rate limiting config -- 100 requests/60s for proxy-upload (chunk uploads), 20 requests/60s for gemini-upload (session initiation).

5. **Error Sanitization (SEC-08):** All error responses now return generic JSON messages. Raw API errors and stack traces are logged server-side via `console.error` only.

6. **v2 Migration:** `gemini-upload.ts` migrated from Netlify Functions v1 (Handler/event) to v2 (Request/Response) format. Removed unused `GoogleAIFileManager` import.

## Task Commits

| Task | Name | Commit | Key Changes |
|------|------|--------|-------------|
| 1 | Harden proxy-upload.ts | `025b621` | CORS allowlist, SSRF prevention, rate limiting, error sanitization |
| 2 | Migrate gemini-upload.ts to v2 with BYOK | `a20b58e` | v2 format, X-Gemini-Key header, rate limiting, error sanitization |

## Files Modified

| File | Changes |
|------|---------|
| `netlify/edge-functions/proxy-upload.ts` | Added ALLOWED_ORIGINS, getCorsHeaders(), isAllowedUploadUrl(), rate limit config, sanitized errors |
| `netlify/functions/gemini-upload.ts` | Migrated to v2 format, added X-Gemini-Key header read, rate limit config, sanitized errors, removed unused import |

## Decisions Made

1. **CORS Allowlist (SEC-CORS):** Restricted to `https://celebrated-selkie-3cbc3b.netlify.app`, `http://localhost:3000`, `http://localhost:8888`. Additional origins can be added to the `ALLOWED_ORIGINS` array.

2. **SSRF URL Validation (SEC-SSRF):** Three-layer check: protocol must be `https:`, hostname must be `generativelanguage.googleapis.com`, path must start with `/upload/`. This prevents abuse of the proxy to reach internal/arbitrary URLs.

3. **BYOK Header Name (SEC-BYOK):** Using `X-Gemini-Key` as the header name. Client code (Plan 03) will need to send this header.

4. **Rate Limit Tiers (SEC-RATE):** 100/60s for proxy (handles many chunk PUTs per upload session) vs 20/60s for initiation (one per file upload). Aggregated by IP + domain.

5. **v2 Migration (SEC-V2):** Required for Netlify Functions rate limiting config. Also changes endpoint from `/.netlify/functions/gemini-upload` to `/api/gemini-upload` -- client update needed in Plan 03.

## Deviations from Plan

None -- plan executed exactly as written.

## Issues Encountered

None.

## Next Phase Readiness

**For Plan 03 (Client-Side Security):**
- Client must be updated to send `X-Gemini-Key` header in upload initiation requests
- Client must update upload endpoint URL from `/.netlify/functions/gemini-upload` to `/api/gemini-upload`
- Client should handle 401 responses (missing API key) with appropriate UI guidance

**For deployment:**
- Rate limiting config uses Netlify's built-in rate limiting -- no additional infrastructure needed
- CORS allowlist may need updating if production URL changes

## Self-Check: PASSED
