# Requirements: Interview Insight

**Defined:** 2026-02-06
**Core Value:** Users can upload an interview recording and get a complete, structured transcript with translations and analysis — with full visibility into the process.

## v1 Requirements

Requirements for initial release. Each maps to roadmap phases.

### Security

- [ ] **SEC-01**: User can provide their own Gemini API key via a settings page
- [ ] **SEC-02**: API key is encrypted before storing in localStorage (Web Crypto AES-GCM)
- [ ] **SEC-03**: API key is validated against Gemini API on entry (lightweight test call)
- [ ] **SEC-04**: Embedded/build-time API key is completely removed from codebase
- [ ] **SEC-05**: Edge function CORS restricted to app domain (no wildcard)
- [ ] **SEC-06**: Upload proxy validates target URL (only allows Google API endpoints, prevents SSRF)
- [ ] **SEC-07**: Security headers configured in netlify.toml (CSP, X-Frame-Options, X-Content-Type-Options, Referrer-Policy)
- [ ] **SEC-08**: Error messages sanitized — no raw API errors or stack traces returned to client
- [ ] **SEC-09**: Rate limiting or abuse protection on serverless function endpoints

### Project Management

- [ ] **PROJ-01**: User sees a project dashboard as the landing page (list/grid of all projects)
- [ ] **PROJ-02**: User can create a new project (triggers upload flow)
- [ ] **PROJ-03**: User can rename a project
- [ ] **PROJ-04**: User can delete a project (with confirmation)
- [ ] **PROJ-05**: Project state persists in localStorage across page refresh and browser close
- [ ] **PROJ-06**: localStorage schema is versioned with migration support
- [ ] **PROJ-07**: App handles localStorage quota exceeded gracefully (clear error message)
- [ ] **PROJ-08**: App handles corrupted localStorage data without crashing (fallback to defaults)
- [ ] **PROJ-09**: Project metadata stored separately from transcript data (lazy loading)

### Transcription

- [ ] **TRNS-01**: User can see the full growing transcript during processing (scrollable, auto-scrolling)
- [ ] **TRNS-02**: User can scroll up to review earlier segments while processing continues
- [ ] **TRNS-03**: User can cancel in-progress transcription (AbortController)
- [ ] **TRNS-04**: Partial results are saved to localStorage during processing (debounced flush)
- [ ] **TRNS-05**: Interrupted transcriptions are detected on app reload and show partial data
- [ ] **TRNS-06**: User can retry a failed transcription
- [ ] **TRNS-07**: Progress display shows stage-based progress (uploading → transcribing → complete)

### Architecture

- [ ] **ARCH-01**: App.tsx decomposed into feature-based module structure (src/ directory)
- [ ] **ARCH-02**: React Router provides navigation between dashboard, project detail, and settings
- [ ] **ARCH-03**: SettingsContext manages API key and user preferences
- [ ] **ARCH-04**: ProjectsContext manages project list and CRUD operations
- [ ] **ARCH-05**: Gemini service functions accept API key as parameter (no global state)
- [ ] **ARCH-06**: Transcription logic extracted into useTranscription hook with state machine
- [ ] **ARCH-07**: Export logic extracted into dedicated service (docxExport.ts)

### UI/UX

- [ ] **UX-01**: Loading skeletons shown while data loads
- [ ] **UX-02**: Toast notifications for user-facing operations (save, delete, error)
- [ ] **UX-03**: Error boundaries at route level (graceful crash recovery)
- [ ] **UX-04**: Empty states for no projects, no transcript, no API key
- [ ] **UX-05**: ARIA labels on interactive elements
- [ ] **UX-06**: Keyboard navigation works for all primary flows
- [ ] **UX-07**: Focus management on route transitions and modal open/close

### Code Quality

- [ ] **QUAL-01**: ESLint 9 (flat config) with TypeScript, React, React Hooks, and accessibility plugins
- [ ] **QUAL-02**: Prettier with Tailwind plugin configured
- [ ] **QUAL-03**: Pre-commit hooks via Husky + lint-staged (lint + format on commit)
- [ ] **QUAL-04**: TypeScript strict mode enabled (strict, noUncheckedIndexedAccess)
- [ ] **QUAL-05**: All dependencies pinned to specific versions (no "latest")
- [ ] **QUAL-06**: Vitest configured with React Testing Library
- [ ] **QUAL-07**: Tests for critical logic: JSONL parser, deduplication, storage service, crypto
- [ ] **QUAL-08**: Tests for key components: ApiKeyForm, ProjectDashboard

### Deployment & Infrastructure

- [ ] **DEPL-01**: GitHub Actions CI pipeline (lint, type-check, test, build on PR)
- [ ] **DEPL-02**: Netlify auto-deploy on merge to main
- [ ] **DEPL-03**: Custom domain configured and pointing to Netlify
- [ ] **DEPL-04**: SPA redirect configured in netlify.toml (/* → /index.html)
- [ ] **DEPL-05**: Professional README with project description, screenshots, tech stack, and setup instructions

### Bug Fixes

- [ ] **BUG-01**: Fix ObjectURL memory leak in FileUpload (URL.revokeObjectURL on cleanup)
- [ ] **BUG-02**: Fix "Download All" brittle setTimeout timing (use async/await)
- [ ] **BUG-03**: Fix silent duration extraction failure (handle 0-duration gracefully)

## v2 Requirements

Deferred to future release. Tracked but not in current roadmap.

### Project Organization

- **PROJ-10**: User can organize projects into folders/groups
- **PROJ-11**: User can search across all project transcripts (full-text)
- **PROJ-12**: User can bulk-select and delete/move projects

### Enhanced UX

- **UX-08**: Responsive design (mobile/tablet optimized)
- **UX-09**: Audio/video playback synced with transcript (clickable timestamps)
- **UX-10**: Virtual scrolling for transcripts with 500+ segments

### Platform

- **PLAT-01**: User accounts with email/password authentication
- **PLAT-02**: Cloud database for cross-device persistence
- **PLAT-03**: Multi-model support (Claude, GPT, in addition to Gemini)
- **PLAT-04**: Shareable interview analysis links

### Advanced Analysis

- **ANLYS-01**: Automated interview insights (themes, sentiment, action items)
- **ANLYS-02**: Custom analysis templates (recruiting, UX research, sales)

## Out of Scope

| Feature | Reason |
|---------|--------|
| Live transcription during calls | Different product model, very high complexity |
| Video recording/editing | Outside core competency |
| Built-in video conferencing | Not differentiating, Zoom/Meet already won |
| Unlimited storage | Unsustainable, localStorage has natural limits |
| Real-time streaming transcription | Different architecture than upload workflow |
| Team workspaces / collaboration | Requires auth + cloud, defer well past v2 |
| Mobile native app | Web-first, responsive design sufficient |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| SEC-01 | TBD | Pending |
| SEC-02 | TBD | Pending |
| SEC-03 | TBD | Pending |
| SEC-04 | TBD | Pending |
| SEC-05 | TBD | Pending |
| SEC-06 | TBD | Pending |
| SEC-07 | TBD | Pending |
| SEC-08 | TBD | Pending |
| SEC-09 | TBD | Pending |
| PROJ-01 | TBD | Pending |
| PROJ-02 | TBD | Pending |
| PROJ-03 | TBD | Pending |
| PROJ-04 | TBD | Pending |
| PROJ-05 | TBD | Pending |
| PROJ-06 | TBD | Pending |
| PROJ-07 | TBD | Pending |
| PROJ-08 | TBD | Pending |
| PROJ-09 | TBD | Pending |
| TRNS-01 | TBD | Pending |
| TRNS-02 | TBD | Pending |
| TRNS-03 | TBD | Pending |
| TRNS-04 | TBD | Pending |
| TRNS-05 | TBD | Pending |
| TRNS-06 | TBD | Pending |
| TRNS-07 | TBD | Pending |
| ARCH-01 | TBD | Pending |
| ARCH-02 | TBD | Pending |
| ARCH-03 | TBD | Pending |
| ARCH-04 | TBD | Pending |
| ARCH-05 | TBD | Pending |
| ARCH-06 | TBD | Pending |
| ARCH-07 | TBD | Pending |
| UX-01 | TBD | Pending |
| UX-02 | TBD | Pending |
| UX-03 | TBD | Pending |
| UX-04 | TBD | Pending |
| UX-05 | TBD | Pending |
| UX-06 | TBD | Pending |
| UX-07 | TBD | Pending |
| QUAL-01 | TBD | Pending |
| QUAL-02 | TBD | Pending |
| QUAL-03 | TBD | Pending |
| QUAL-04 | TBD | Pending |
| QUAL-05 | TBD | Pending |
| QUAL-06 | TBD | Pending |
| QUAL-07 | TBD | Pending |
| QUAL-08 | TBD | Pending |
| DEPL-01 | TBD | Pending |
| DEPL-02 | TBD | Pending |
| DEPL-03 | TBD | Pending |
| DEPL-04 | TBD | Pending |
| DEPL-05 | TBD | Pending |
| BUG-01 | TBD | Pending |
| BUG-02 | TBD | Pending |
| BUG-03 | TBD | Pending |

**Coverage:**
- v1 requirements: 48 total
- Mapped to phases: 0 (pending roadmap)
- Unmapped: 48

---
*Requirements defined: 2026-02-06*
*Last updated: 2026-02-06 after initial definition*
