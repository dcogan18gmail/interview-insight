# Project Research Summary

**Project:** Interview Insight (Hardening)
**Domain:** AI-powered interview transcription and analysis tool
**Researched:** 2026-02-06
**Confidence:** HIGH

## Executive Summary

Interview Insight is a React-based interview transcription tool transitioning from a 2-user prototype to a public-facing product with Bring-Your-Own-API-Key (BYOK) model. The current app is a monolithic single-component SPA with exposed API keys, no testing, and minimal error handling. The research identifies 8 critical security vulnerabilities that must be addressed before public launch, including API key exposure, SSRF vulnerability in the proxy, missing security headers, and potential data loss from localStorage quota issues.

The recommended hardening approach uses an incremental "strangler fig" migration strategy: wrap the existing working app in new architecture (React Router, Context providers, localStorage service) and gradually extract features into modules. This ensures the app remains functional at every step while addressing security, testing, and UX requirements. The stack remains lightweight (React 18 + TypeScript + Vite + Tailwind + Netlify), adding only security tools (DOMPurify, Web Crypto), testing frameworks (Vitest + Playwright), and linting/CI (ESLint 9 + GitHub Actions).

Key risks include browser-based BYOK security limitations (keys accessible to malicious extensions), localStorage capacity constraints (5-10MB limit can be exceeded by long transcripts), and streaming AI response handling (network interruptions lose all progress). Mitigation strategies involve client-side encryption with Web Crypto, separate localStorage keys per project to avoid quota issues, and intermediate state persistence for resumability.

## Key Findings

### Recommended Stack

The current foundation is solid: React 18, TypeScript, Vite, Tailwind, and Netlify Functions. Hardening requires focused additions across four layers: security, testing, linting, and CI/CD. The research emphasizes Vite-native tooling (Vitest not Jest, SWC not Babel) and avoiding over-engineering (no Redux, React Router, or CSS-in-JS needed initially).

**Core technologies:**

- **DOMPurify 3.2.2**: Sanitizes transcript content before rendering to prevent XSS attacks
- **Vitest 3.0 + React Testing Library**: Native Vite integration, 10x faster than Jest for Vite projects
- **ESLint 9 (flat config)**: New standard configuration format, required for future-proofing
- **Playwright 1.50**: End-to-end testing with real browsers, better TypeScript support than Cypress
- **Web Crypto (built-in)**: AES-GCM encryption for API keys in localStorage, no external dependency
- **react-helmet-async 2.0.5**: Content Security Policy implementation to prevent XSS
- **GitHub Actions + Netlify**: CI/CD pipeline for automated testing and deployment

**Critical version updates:**

- Pin `@google/genai` from "latest" to specific version to prevent breaking changes
- Enable TypeScript strict mode and additional checks (noUncheckedIndexedAccess, noImplicitReturns)

**What NOT to use:**

- Redux/Zustand (React Context sufficient for app complexity)
- React Router initially (defer until multi-project UI needed)
- Styled Components (already using Tailwind)
- Axios (native fetch sufficient)
- crypto-js (Web Crypto API built into browsers)

### Expected Features

Interview transcription tools have matured from basic speech-to-text to comprehensive analysis platforms. Table stakes now includes real-time processing with streaming feedback, project management, and data privacy controls. The BYOK model is becoming table stakes for power users concerned about cost transparency and data privacy.

**Must have (table stakes):**

- Progress visibility during processing (stage-based with streaming transcript preview)
- Project organization (create/rename/delete projects, assign recordings, search)
- Multiple file format support (MP3, WAV, M4A, OGG, MP4, MOV up to 2GB+)
- BYOK API key management (user provides key, encrypted storage, usage tracking)
- Export capabilities (plain text, PDF, JSON, copy to clipboard)
- Mobile-responsive design (readable on mobile, touch-friendly controls)
- Basic metadata editing (recording name, date, speaker names, tags)
- Data privacy controls (clear retention policy, user-initiated deletion, no training on data)

**Should have (competitive differentiators):**

- Automated interview insights (themes, sentiment, action items per speaker)
- Audio/video playback sync (clickable timestamps, highlight current sentence)
- Search across all transcripts (full-text with filters)
- Folders and advanced organization (nested folders, drag-and-drop, bulk actions)
- Custom analysis templates (sales discovery, user research sessions)

**Defer (v2+):**

- Team workspaces and collaboration (high complexity, different pricing model)
- Live transcription during calls (different product model entirely)
- AI chat/Q&A on transcripts (risky to do poorly, consider after core is solid)
- Calendar/CRM/ATS integrations (focus on core workflow first)

### Architecture Approach

The target architecture uses feature-based modules with React Context for shared state and localStorage persistence. The key principle is incremental strangler fig migration: the existing App.tsx works, so wrap it in new architecture and gradually replace pieces. At every step, the app remains functional and deployable.

**Major components:**

1. **Contexts** (SettingsContext, ProjectsContext, ToastContext) — App-level state management using React Context + useReducer, sufficient for this scale without Redux
2. **Feature modules** (dashboard, settings, upload, transcription, transcript) — Self-contained domains with their own components, hooks, and types; communicate through Context, props, and route params
3. **Services layer** (storage, gemini, export) — Stateless services for localStorage (with schema versioning and migrations), Gemini API (upload/transcribe separated), and DOCX export
4. **Storage layer** — Single top-level localStorage key for metadata (settings + project list) with separate keys per project for transcript data to avoid quota issues

**Storage architecture:**

- Versioned schema with migration functions from day one to prevent data corruption
- Separate keys per project (`interview-insight:transcript:{id}`) to isolate failures and avoid hitting 5-10MB quota on single write
- Debounced flush during streaming (every 10 segments or 5 seconds) to enable resumability
- Web Crypto AES-GCM encryption for API keys using browser-native capabilities

**Migration strategy:**
Phase 0 creates foundation without breaking existing code. Each subsequent phase wraps or extracts one piece while maintaining full functionality. This approach reduces risk compared to complete rewrite.

### Critical Pitfalls

30 pitfalls identified across 5 domains. 8 are critical blockers that must be fixed before public launch.

1. **localStorage schema versioning missing** — App updates that change data shape will crash the app for existing users (white screen). Prevention: implement version field and migration functions from day one, always wrap reads in try/catch.

2. **SSRF vulnerability in proxy** — proxy-upload.ts accepts any URL in X-Upload-Url header and forwards the request, allowing attackers to reach internal services. Prevention: validate that URL starts with "https://generativelanguage.googleapis.com/" and reject all others.

3. **CORS wildcard on proxy** — Edge function allows Access-Control-Allow-Origin: \* making it an open relay. Prevention: restrict to production domain + localhost, validate Origin header server-side.

4. **Missing security headers** — No X-Frame-Options (clickjacking), no CSP (XSS), no HSTS (downgrade attacks). Prevention: add comprehensive headers in netlify.toml covering all security dimensions.

5. **ObjectURL memory leak** — createObjectURL never revoked in FileUpload.tsx line 74, causing memory to grow with each upload until tab crashes. Prevention: call URL.revokeObjectURL() in cleanup.

6. **localStorage quota silent failure** — 5-10MB limit can be exceeded by long transcripts, saves fail silently losing data. Prevention: catch QuotaExceededError, show "storage full" message, implement size tracking.

7. **Network interruption losing all progress** — Wi-Fi drops during 30-minute transcription lose all work. Prevention: save intermediate segments to localStorage as they arrive, offer resume from last saved segment.

8. **Error messages leaking internals** — Raw API errors and stack traces reveal implementation details and potentially partial credentials. Prevention: catch all errors in serverless functions, return generic user-friendly messages, log detailed errors server-side only.

## Implications for Roadmap

Based on research, suggested phase structure prioritizes security fixes first (critical blockers preventing launch), then establishes solid storage foundation (preventing data loss), followed by feature development in dependency order.

### Phase 1: Security Hardening (CRITICAL)

**Rationale:** 4 critical security vulnerabilities (SSRF, CORS wildcard, missing headers, API key exposure) must be fixed before any public deployment. These are not feature work — they are blockers.

**Delivers:** Secure proxy endpoint, comprehensive security headers, BYOK with encrypted storage, sanitized error messages

**Addresses:**

- BYOK API key management (table stakes from FEATURES.md)
- Data privacy controls (table stakes from FEATURES.md)

**Avoids:**

- Pitfall 27 (SSRF vulnerability)
- Pitfall 26 (CORS wildcard)
- Pitfall 25 (missing security headers)
- Pitfall 28 (error message leakage)
- Pitfall 1 (API key validation too late)
- Pitfall 2 (localStorage keys visible)

**Uses:**

- DOMPurify for XSS protection
- Web Crypto for API key encryption
- Netlify headers for CSP, X-Frame-Options, HSTS

### Phase 2: Storage Foundation (CRITICAL)

**Rationale:** localStorage is the persistence layer for the entire app. Without schema versioning and quota handling, data corruption and silent data loss are guaranteed on first update or long transcript. This must be solid before building features that depend on it.

**Delivers:** Versioned localStorage service with migration support, quota error handling, corruption recovery, separate keys per project

**Implements:** Storage architecture from ARCHITECTURE.md (schema design, separate keys pattern)

**Avoids:**

- Pitfall 6 (no schema versioning)
- Pitfall 7 (localStorage quota silent failure)
- Pitfall 10 (JSON parse errors crashing app)
- Pitfall 8 (private browsing kills persistence)
- Pitfall 9 (multiple tabs corrupting data)

### Phase 3: Core Transcription Refactor

**Rationale:** Fixes critical memory leak and progress loss issues while extracting transcription logic into reusable modules. Establishes streaming state management pattern needed for all future features.

**Delivers:** useTranscription hook with state machine, memory leak fix, intermediate state persistence, abort/retry support

**Implements:** Streaming pattern from ARCHITECTURE.md (state machine, debounced flush)

**Avoids:**

- Pitfall 19 (ObjectURL memory leak — CRITICAL)
- Pitfall 23 (network interruption losing progress — CRITICAL)
- Pitfall 20 (streaming errors silently lost)

### Phase 4: Multi-Project Dashboard

**Rationale:** With storage foundation and core transcription solid, now safe to add project management features. This is table stakes (users expect organization) but depends on storage layer working correctly.

**Delivers:** Project list/grid UI, project CRUD operations, navigation between projects, metadata editing

**Addresses:**

- Project organization (table stakes from FEATURES.md)
- Basic metadata editing (table stakes from FEATURES.md)

**Implements:** ProjectsContext, dashboard feature module, AppShell layout

**Avoids:**

- Pitfall 3 (key rotation breaking existing projects)
- Pitfall 11 (performance degradation with large project lists)

### Phase 5: UX Polish & Error Handling

**Rationale:** With core features working, improve UX for edge cases and long-running operations. This phase makes the app production-ready from a user experience perspective.

**Delivers:** Progress visibility improvements, error recovery flows, mobile responsiveness, export enhancements

**Addresses:**

- Progress visibility during processing (table stakes from FEATURES.md)
- Mobile-responsive design (table stakes from FEATURES.md)
- Export capabilities (table stakes from FEATURES.md)

**Avoids:**

- Pitfall 4 (missing quota feedback)
- Pitfall 21 (progress bar lying)
- Pitfall 22 (mobile Safari killing tabs)

### Phase 6: Testing & CI/CD

**Rationale:** With all features implemented, establish testing and automation to prevent regressions. This enables confident iteration post-launch.

**Delivers:** Vitest + React Testing Library setup, Playwright E2E tests, ESLint 9 + Prettier, GitHub Actions pipeline

**Uses:**

- Vitest (stack recommendation from STACK.md)
- Playwright (stack recommendation from STACK.md)
- ESLint 9 flat config (stack recommendation from STACK.md)

**Avoids:**

- Pitfall 30 (performance regression after refactoring)
- Pitfall 12 (environment variable confusion)
- Pitfall 17 (build cache causing stale deploys)

### Phase Ordering Rationale

- **Security first (Phase 1):** Cannot launch with critical vulnerabilities. Non-negotiable blockers.
- **Storage second (Phase 2):** Foundation for all features. Data loss bugs are catastrophic and hard to recover from.
- **Transcription third (Phase 3):** Core value proposition. Memory leaks and progress loss affect every user.
- **Multi-project fourth (Phase 4):** Depends on storage layer working correctly. Table stakes but not blocking core workflow.
- **UX polish fifth (Phase 5):** Makes features production-ready. Can iterate post-launch but better to get right first.
- **Testing last (Phase 6):** Enables confident iteration but not blocking launch. Can add incrementally.

This ordering follows the strangler fig migration pattern from ARCHITECTURE.md, ensuring the app works at each step while addressing critical issues first.

### Research Flags

Phases likely needing deeper research during planning:

- **Phase 3 (Transcription):** Complex streaming state management, Gemini API resumability behavior needs verification
- **Phase 4 (Multi-Project):** localStorage quota calculation for maximum projects, UX patterns for large project lists

Phases with standard patterns (skip research-phase):

- **Phase 1 (Security):** Well-documented security headers, standard Web Crypto implementation, established SSRF prevention patterns
- **Phase 2 (Storage):** localStorage versioning is a solved pattern, migration strategies are well-documented
- **Phase 5 (UX Polish):** Standard React patterns for progress, error handling, responsive design
- **Phase 6 (Testing):** Vitest and Playwright have extensive documentation and examples

## Confidence Assessment

| Area         | Confidence | Notes                                                                                                                                |
| ------------ | ---------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| Stack        | HIGH       | Current codebase analysis + official Vite/React docs. All recommended tools are mature and well-documented.                          |
| Features     | HIGH       | Clear table stakes identified from competitive analysis. BYOK model is well-established pattern in the space.                        |
| Architecture | HIGH       | Strangler fig migration is proven pattern. React Context + localStorage is appropriate for this scale. Web Crypto is browser-native. |
| Pitfalls     | HIGH       | 8 critical issues identified from codebase analysis (not speculative). Prevention strategies are specific and actionable.            |

**Overall confidence:** HIGH

### Gaps to Address

**Gemini API resumability:** Research did not verify whether Gemini's Files API supports resuming partial transcriptions. If a transcription is interrupted mid-stream, can we resume from a specific timestamp or segment? This needs verification during Phase 3 planning. If not supported, the intermediate state persistence strategy may need adjustment (save full transcript segments but re-send entire file on retry).

**IndexedDB migration threshold:** localStorage has ~5-10MB quota, but exact limits vary by browser. Research suggests monitoring size and offering IndexedDB migration when approaching limits, but didn't specify exact threshold or migration UX. During Phase 2 implementation, test with actual long transcripts to determine practical limits and migration trigger point.

**Mobile Safari background processing limits:** Pitfall 22 notes iOS Safari suspends background tabs aggressively, but research didn't quantify exact timeout thresholds or test wake lock API feasibility. During Phase 5 (mobile support), need to test actual behavior across iOS versions and evaluate whether Web Locks API or Page Visibility API provide sufficient mitigation.

**Browser extension attack surface:** Pitfall 5 notes malicious extensions can steal localStorage keys, but research didn't evaluate alternative storage mechanisms (e.g., sessionStorage, memory-only). This is an accepted tradeoff for browser-based BYOK, but worth documenting in user-facing security guidance during Phase 1.

## Sources

### Primary (HIGH confidence)

- Interview Insight codebase analysis — identified 8 critical security/data loss issues through code review
- Vite documentation — confirmed Vitest as recommended testing framework, SWC as faster alternative to Babel
- Netlify documentation — Function timeout limits, Edge Function capabilities, security headers configuration
- Web Crypto API specification — native browser encryption, no external dependency needed
- ESLint 9 migration guide — flat config is new standard, .eslintrc deprecated

### Secondary (MEDIUM confidence)

- React Context patterns — consensus that Context + useReducer sufficient for this app scale, Redux overkill
- localStorage best practices — schema versioning, separate keys, quota handling patterns
- BYOK implementation patterns — client-side encryption limitations, validation strategies
- Gemini API documentation — Files API upload patterns, streaming response format

### Tertiary (LOW confidence)

- Mobile Safari background tab behavior — needs testing to verify exact thresholds
- IndexedDB migration triggers — practical limits need real-world transcript testing
- Competitive feature analysis — table stakes inferred from product research, not user testing

---

_Research completed: 2026-02-06_
_Ready for roadmap: yes_
