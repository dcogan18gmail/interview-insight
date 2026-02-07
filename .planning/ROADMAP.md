# Roadmap: Interview Insight

## Overview

Interview Insight transforms from a working 2-user prototype into a hardened, public-facing product through 9 phases. The journey prioritizes security (enabling BYOK for public use), establishes solid persistence foundation (preventing data loss), refactors monolithic architecture into maintainable modules, delivers multi-project management, enhances transcription experience with resilience and visibility, polishes UX for production readiness, adds test coverage, and finalizes deployment with professional presentation.

## Phases

**Phase Numbering:**
- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

Decimal phases appear between their surrounding integers in numeric order.

- [x] **Phase 1: Security Hardening** - BYOK model with encrypted storage, secure proxy, comprehensive headers
- [ ] **Phase 2: Development Tooling** - ESLint, Prettier, pre-commit hooks, TypeScript strict mode
- [ ] **Phase 3: Storage Foundation** - Versioned localStorage with migrations, quota handling, corruption recovery
- [ ] **Phase 4: Core Architecture Refactor** - Decompose App.tsx into modules, extract hooks, fix memory leaks
- [ ] **Phase 5: Multi-Project Dashboard** - Project list UI, CRUD operations, navigation
- [ ] **Phase 6: Enhanced Transcription Experience** - Full transcript visibility, cancel/retry, progress stages
- [ ] **Phase 7: UI/UX Polish** - Loading states, error handling, accessibility, empty states
- [ ] **Phase 8: Testing Coverage** - Vitest setup, critical path tests, component tests
- [ ] **Phase 9: Deployment & Documentation** - CI/CD, custom domain, professional README

## Phase Details

### Phase 1: Security Hardening
**Goal**: App is secure for public deployment with BYOK model
**Depends on**: Nothing (first phase, critical blocker for public launch)
**Requirements**: SEC-01, SEC-02, SEC-03, SEC-04, SEC-05, SEC-06, SEC-07, SEC-08, SEC-09
**Success Criteria** (what must be TRUE):
  1. User can provide their own Gemini API key via settings page and it's encrypted in localStorage
  2. Embedded API key is completely removed from codebase and build artifacts
  3. Edge function proxy validates URLs (only Google APIs) and restricts CORS to app domain
  4. Security headers (CSP, X-Frame-Options, HSTS, etc.) are configured in netlify.toml
  5. Error messages shown to users are sanitized with no raw API errors or stack traces
**Plans**: 3 plans

Plans:
- [x] 01-01-PLAN.md — Crypto service (AES-GCM encryption) + security headers in netlify.toml
- [x] 01-02-PLAN.md — Harden server functions (CORS, SSRF, rate limiting, error sanitization, BYOK header)
- [x] 01-03-PLAN.md — Settings UI + remove embedded key + rewire app for BYOK

### Phase 2: Development Tooling
**Goal**: Development environment supports quality work and prevents common errors
**Depends on**: Nothing (can run parallel to Phase 1, enables confident refactoring in later phases)
**Requirements**: QUAL-01, QUAL-02, QUAL-03, QUAL-04, QUAL-05, DEPL-01
**Success Criteria** (what must be TRUE):
  1. ESLint 9 with TypeScript, React, and accessibility plugins catches errors on save
  2. Prettier with Tailwind plugin formats code consistently
  3. Pre-commit hooks via Husky prevent committing unlinted/unformatted code
  4. TypeScript strict mode is enabled and codebase compiles without errors
  5. GitHub Actions CI pipeline runs lint and type-check on every PR
**Plans**: 2 plans

Plans:
- [ ] 02-01-PLAN.md — ESLint 9 + Prettier config, editor integration, initial formatting pass
- [ ] 02-02-PLAN.md — TypeScript strict mode, dependency pinning, Husky + lint-staged, CI pipeline

### Phase 3: Storage Foundation
**Goal**: Persistent storage is reliable, versioned, and handles edge cases gracefully
**Depends on**: Nothing (foundational, must complete before Phase 4 and Phase 5)
**Requirements**: PROJ-05, PROJ-06, PROJ-07, PROJ-08, PROJ-09
**Success Criteria** (what must be TRUE):
  1. Project state persists across page refresh and browser close
  2. localStorage schema is versioned and app migrates old data automatically without crashing
  3. App handles localStorage quota exceeded with clear error message (not silent failure)
  4. App handles corrupted localStorage data without crashing (fallback to defaults)
  5. Project metadata and transcript data use separate localStorage keys for lazy loading
**Plans**: TBD

Plans:
- [ ] 03-01: TBD

### Phase 4: Core Architecture Refactor
**Goal**: Monolithic App.tsx is decomposed into maintainable, testable modules
**Depends on**: Phase 3 (needs storage service), Phase 2 (linting/type-checking in place)
**Requirements**: ARCH-01, ARCH-02, ARCH-03, ARCH-04, ARCH-05, ARCH-06, ARCH-07, BUG-01, BUG-02, BUG-03
**Success Criteria** (what must be TRUE):
  1. App.tsx is decomposed into feature-based module structure with src/ directory organization
  2. React Router provides navigation between dashboard, project detail, and settings
  3. SettingsContext and ProjectsContext manage state via Context API (no prop drilling)
  4. Transcription logic is extracted into useTranscription hook with state machine
  5. ObjectURL memory leak is fixed (URL.revokeObjectURL called on cleanup)
  6. Download timing issues are fixed (async/await instead of brittle setTimeout)
  7. Duration extraction handles 0-duration gracefully without silent failure
**Plans**: TBD

Plans:
- [ ] 04-01: TBD

### Phase 5: Multi-Project Dashboard
**Goal**: Users can manage multiple interview projects with CRUD operations
**Depends on**: Phase 3 (storage foundation), Phase 4 (architecture with routing and contexts)
**Requirements**: PROJ-01, PROJ-02, PROJ-03, PROJ-04
**Success Criteria** (what must be TRUE):
  1. User sees project dashboard as landing page with list/grid of all projects
  2. User can create a new project which triggers upload flow
  3. User can rename a project
  4. User can delete a project with confirmation dialog
**Plans**: TBD

Plans:
- [ ] 05-01: TBD

### Phase 6: Enhanced Transcription Experience
**Goal**: Transcription process is visible, controllable, and resilient to interruptions
**Depends on**: Phase 4 (useTranscription hook and architecture)
**Requirements**: TRNS-01, TRNS-02, TRNS-03, TRNS-04, TRNS-05, TRNS-06, TRNS-07
**Success Criteria** (what must be TRUE):
  1. User can see full growing transcript during processing (scrollable, auto-scrolling to latest)
  2. User can scroll up to review earlier segments while processing continues
  3. User can cancel in-progress transcription via cancel button
  4. Partial results are saved to localStorage during processing (survives interruptions)
  5. Interrupted transcriptions are detected on app reload and show partial data with retry option
  6. Progress display shows stage-based progress (uploading → transcribing → complete)
**Plans**: TBD

Plans:
- [ ] 06-01: TBD

### Phase 7: UI/UX Polish
**Goal**: App feels production-ready with proper loading states, error handling, and accessibility
**Depends on**: Phase 5 and Phase 6 (features exist to polish)
**Requirements**: UX-01, UX-02, UX-03, UX-04, UX-05, UX-06, UX-07
**Success Criteria** (what must be TRUE):
  1. Loading skeletons are shown while data loads
  2. Toast notifications appear for user-facing operations (save, delete, errors)
  3. Error boundaries at route level prevent full app crashes (graceful degradation)
  4. Empty states exist for no projects, no transcript, and no API key scenarios
  5. ARIA labels are present on all interactive elements
  6. Keyboard navigation works for all primary flows (tab order, Enter/Space activation)
  7. Focus management works correctly on route transitions and modal open/close
**Plans**: TBD

Plans:
- [ ] 07-01: TBD

### Phase 8: Testing Coverage
**Goal**: Critical paths have automated test coverage to prevent regressions
**Depends on**: Phase 4 (architecture stable for testing)
**Requirements**: QUAL-06, QUAL-07, QUAL-08
**Success Criteria** (what must be TRUE):
  1. Vitest is configured with React Testing Library
  2. Tests exist for critical logic: JSONL parser, deduplication, storage service, crypto
  3. Tests exist for key components: ApiKeyForm, ProjectDashboard
  4. All tests pass in CI pipeline
**Plans**: TBD

Plans:
- [ ] 08-01: TBD

### Phase 9: Deployment & Documentation
**Goal**: App is deployed to production with custom domain and professional presentation
**Depends on**: All previous phases (app is feature-complete and tested)
**Requirements**: DEPL-02, DEPL-03, DEPL-04, DEPL-05
**Success Criteria** (what must be TRUE):
  1. Netlify auto-deploys on merge to main branch
  2. Custom domain is configured and pointing to Netlify
  3. SPA redirect is configured in netlify.toml (/* → /index.html)
  4. README includes project description, screenshots, tech stack, and setup instructions
**Plans**: TBD

Plans:
- [ ] 09-01: TBD

## Progress

**Execution Order:**
Phases execute in numeric order: 1 → 2 → 3 → 4 → 5 → 6 → 7 → 8 → 9

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Security Hardening | 3/3 | Complete | 2026-02-07 |
| 2. Development Tooling | 0/2 | Not started | - |
| 3. Storage Foundation | 0/TBD | Not started | - |
| 4. Core Architecture Refactor | 0/TBD | Not started | - |
| 5. Multi-Project Dashboard | 0/TBD | Not started | - |
| 6. Enhanced Transcription Experience | 0/TBD | Not started | - |
| 7. UI/UX Polish | 0/TBD | Not started | - |
| 8. Testing Coverage | 0/TBD | Not started | - |
| 9. Deployment & Documentation | 0/TBD | Not started | - |
