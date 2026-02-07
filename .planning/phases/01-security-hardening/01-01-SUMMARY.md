---
phase: 01-security-hardening
plan: 01
subsystem: security
tags: [crypto, aes-gcm, pbkdf2, web-crypto, csp, security-headers, byok]
requires: []
provides:
  - AES-GCM encryption/decryption service for API key storage
  - Passphrase management via localStorage
  - Gemini API key validation
  - Production security headers on all routes
affects:
  - 01-02 (server hardening may reference crypto patterns)
  - 01-03 (Settings UI imports cryptoService for key management)
tech-stack:
  added: []
  patterns:
    - Web Crypto API (AES-GCM + PBKDF2) for client-side encryption
    - App-generated passphrase stored in localStorage
    - Netlify headers configuration for security hardening
key-files:
  created:
    - services/cryptoService.ts
  modified:
    - netlify.toml
key-decisions:
  - PBKDF2 with 100k iterations for key derivation (balance of security and performance)
  - 16-byte salt + 12-byte IV concatenated with ciphertext in single base64 blob
  - App-generated passphrase (Option 1 from research) stored in localStorage
  - CSP allows unsafe-inline for style-src (required by Tailwind)
  - connect-src whitelists generativelanguage.googleapis.com for Gemini API
duration: 1m 19s
completed: 2026-02-07
---

# Phase 1 Plan 1: Crypto Service + Security Headers Summary

AES-GCM crypto service with PBKDF2 key derivation (100k iterations, SHA-256) and Netlify security headers including CSP, HSTS, X-Frame-Options for all routes.

## Performance

| Metric | Value |
|--------|-------|
| Duration | 1m 19s |
| Started | 2026-02-07T17:46:19Z |
| Completed | 2026-02-07T17:47:38Z |
| Tasks | 2/2 |
| Files created | 1 |
| Files modified | 1 |

## Accomplishments

1. **Crypto service** (`services/cryptoService.ts`): Complete BYOK key management module with 7 exported functions -- encrypt, decrypt, passphrase management, API key validation, and storage helpers. Uses exclusively Web Crypto API with zero npm dependencies.

2. **Security headers** (`netlify.toml`): Production-grade headers applied to all routes including Content-Security-Policy (with Google Fonts and Gemini API allowances), HSTS with 1-year max-age, X-Frame-Options DENY, nosniff, Referrer-Policy, and Permissions-Policy restricting camera/microphone/geolocation.

## Task Commits

| Task | Name | Commit | Key Files |
|------|------|--------|-----------|
| 1 | Create cryptoService.ts with AES-GCM encryption | `f2398a4` | services/cryptoService.ts |
| 2 | Add security headers to netlify.toml | `5a627b5` | netlify.toml |

## Files Created

- `services/cryptoService.ts` -- 150 lines. Exports: encryptApiKey, decryptApiKey, getOrCreatePassphrase, validateGeminiApiKey, hasStoredKey, clearStoredKey, getDecryptedKey.

## Files Modified

- `netlify.toml` -- Added `[[headers]]` section with 7 security headers for all routes (`/*`).

## Decisions Made

| Decision | Rationale |
|----------|-----------|
| PBKDF2 100k iterations, SHA-256 | Balances security with browser performance; OWASP-recommended minimum |
| Salt(16) + IV(12) + ciphertext in single blob | Simplifies storage to one localStorage key; standard approach for AES-GCM |
| App-generated passphrase (not user-provided) | Research Option 1: simpler UX, encryption-at-rest protects against raw localStorage exfiltration |
| `unsafe-inline` in style-src | Required for Tailwind CSS inline styles; no workaround without nonce-based approach |
| Single CSP line in TOML | Netlify TOML multi-line strings can cause parsing issues; single line is safer |

## Deviations from Plan

None -- plan executed exactly as written.

## Issues Encountered

Pre-existing TypeScript errors in `netlify/edge-functions/proxy-upload.ts` and `netlify/functions/gemini-upload.ts` (missing type declarations for `@netlify/edge-functions` and `@google/genai/server`). These are unrelated to this plan and did not affect cryptoService.ts compilation.

## Next Phase Readiness

- **01-02 (Server Hardening):** No dependencies on this plan's output. Can proceed independently.
- **01-03 (Settings UI):** Will import `encryptApiKey`, `decryptApiKey`, `getOrCreatePassphrase`, `validateGeminiApiKey`, `hasStoredKey`, `clearStoredKey`, `getDecryptedKey` from `services/cryptoService.ts`. All exports are ready.

## Self-Check: PASSED
