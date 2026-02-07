---
phase: 01-security-hardening
plan: 03
subsystem: client-security
tags: [byok, settings-ui, api-key-management, aes-gcm, react, vite, gemini-api]

requires:
  - 01-01 (cryptoService with encrypt/decrypt/validate/passphrase/storage functions)
  - 01-02 (server functions with X-Gemini-Key header support and /api/gemini-upload v2 path)
provides:
  - Settings UI for API key entry, validation, encryption, storage, and clearing
  - BYOK-wired geminiService (decrypts key for SDK init and server header)
  - Zero embedded API keys in build artifacts
  - User-facing "API Key Required" prompt when no key is stored
affects:
  - Phase 2+ (all future features can assume BYOK is active)
  - Deployment (no GEMINI_API_KEY env var needed for client build)

tech-stack:
  added: []
  patterns:
    - "BYOK Settings modal with validate-before-save flow"
    - "Async AI client creation (getDecryptedKey per invocation)"
    - "X-Gemini-Key header for server function BYOK"
    - "Vite config stripped of env var injection"

key-files:
  created:
    - components/Settings.tsx
  modified:
    - services/geminiService.ts
    - App.tsx
    - vite.config.ts

key-decisions:
  - id: BYOK-VALIDATE-FIRST
    decision: "Validate API key against Gemini API before encrypting and storing"
    rationale: "Prevents users from storing invalid keys, provides immediate feedback"
  - id: BYOK-ASYNC-CLIENT
    decision: "createAI() is async and creates a fresh GoogleGenAI instance per generateTranscript call"
    rationale: "Old singleton broke if key changed; one creation per transcription is negligible overhead"
  - id: BYOK-SEPARATE-DECRYPT
    decision: "uploadFile and generateTranscript each independently call getDecryptedKey"
    rationale: "uploadFile needs plaintext key for X-Gemini-Key header; generateTranscript needs it for SDK; both are fast"
  - id: VITE-SIMPLE-CONFIG
    decision: "Simplified vite.config.ts to plain defineConfig({}) without loadEnv"
    rationale: "loadEnv was only used for API key injection; no other env vars needed"

duration: 2m 58s
completed: 2026-02-07
---

# Phase 1 Plan 3: Client-Side BYOK Integration Summary

Settings UI with validate-before-save flow, geminiService rewired to decrypt stored key for SDK and server header, vite.config.ts stripped of embedded API key injection -- completing the full BYOK experience.

## Performance

| Metric | Value |
|--------|-------|
| Duration | 2m 58s |
| Started | 2026-02-07T17:53:11Z |
| Completed | 2026-02-07T17:56:09Z |
| Tasks | 2/2 |
| Files created | 1 |
| Files modified | 3 |

## Accomplishments

1. **Settings component** (`components/Settings.tsx`): Modal UI for BYOK API key management. Password-masked input, validates key against Gemini API before saving, encrypts with AES-GCM via cryptoService, stores in localStorage. Displays key status (green "Key configured" badge), supports clearing stored key, shows error/success messaging, and includes security note about AES-256-GCM browser-only storage.

2. **geminiService.ts rewired for BYOK**: Removed build-time `process.env.API_KEY` singleton. Replaced with async `createAI()` that decrypts key from localStorage via `getDecryptedKey()`. `uploadFile` now sends `X-Gemini-Key` header and uses `/api/gemini-upload` v2 endpoint. `generateTranscript` creates AI client once before the loop.

3. **vite.config.ts cleaned**: Removed entire `define` block that injected `process.env.API_KEY` and `process.env.GEMINI_API_KEY` into build. Removed `loadEnv` import. Build now succeeds without `GEMINI_API_KEY` env var.

4. **App.tsx integrated**: Settings gear icon in header (always visible), Settings modal with key-changed callback, "API Key Required" amber prompt when no key stored, transcription blocked until key is configured.

## Task Commits

| Task | Name | Commit | Key Files |
|------|------|--------|-----------|
| 1 | Create Settings component with API key entry, validation, and management | `521f214` | components/Settings.tsx |
| 2 | Remove embedded API key and rewire geminiService.ts + App.tsx for BYOK | `f41a6c2` | services/geminiService.ts, App.tsx, vite.config.ts |

## Files Created

- `components/Settings.tsx` -- 163 lines. Settings modal with API key input (password type), validation (validateGeminiApiKey), encryption (encryptApiKey), localStorage storage, clear key, status display, error/success messaging.

## Files Modified

| File | Changes |
|------|---------|
| `services/geminiService.ts` | Replaced getAI() singleton with async createAI() using getDecryptedKey(); uploadFile sends X-Gemini-Key header, uses /api/gemini-upload path; removed process.env.API_KEY |
| `App.tsx` | Added Settings/hasStoredKey imports, showSettings + apiKeyConfigured state, gear icon in header, API key prompt, Settings modal, transcription guard |
| `vite.config.ts` | Removed define block with API key injection, removed loadEnv, simplified to plain defineConfig({}) |

## Decisions Made

| Decision | Rationale |
|----------|-----------|
| Validate key before storing | Prevents storing invalid keys; gives immediate feedback |
| Async createAI() replaces sync getAI() | Old singleton broke on key change; fresh instance per transcription is negligible overhead |
| uploadFile and generateTranscript each decrypt independently | Different needs: header for upload, SDK init for transcript; both fast |
| Removed loadEnv entirely from vite.config.ts | Only used for API key injection; no other env vars needed |

## Deviations from Plan

None -- plan executed exactly as written.

## Issues Encountered

Pre-existing TypeScript error in `netlify/edge-functions/proxy-upload.ts` (missing `@netlify/edge-functions` type declarations). Unrelated to this plan, same as noted in 01-01-SUMMARY.

## Next Phase Readiness

**Phase 1 complete.** All three plans delivered:
- 01-01: Crypto service + security headers
- 01-02: Server-side hardening (CORS, SSRF, rate limiting, BYOK header)
- 01-03: Client-side BYOK integration (Settings UI, rewired service, clean build)

**Full BYOK flow is operational:**
User opens Settings -> enters key -> validated against Gemini API -> encrypted with AES-GCM -> stored in localStorage -> decrypted on use -> passed to SDK (createAI) and server function (X-Gemini-Key header) -> build artifacts contain zero keys.

**For Phase 2+:**
- All Gemini API calls now use BYOK -- no env var dependency for client
- Settings component available for future preference additions
- Error handling surfaces "No API key configured" message naturally via existing error UI

## Self-Check: PASSED
