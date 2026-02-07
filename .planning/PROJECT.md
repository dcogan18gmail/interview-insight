# Interview Insight

## What This Is

A web-based tool that lets users upload audio/video recordings of interviews and get AI-powered analysis — structured transcripts with multi-language support, scoring, and recommendations. Currently a working prototype built with an agentic IDE, deployed on Netlify. Being hardened into a public-facing product and professional portfolio flagship.

## Core Value

Users can upload an interview recording and get a complete, structured transcript with translations and analysis — with full visibility into the process, not a black box.

## Requirements

### Validated

- ✓ File upload with validation (audio/video types, 2GB size limit) — existing
- ✓ Chunked upload to Gemini File API (8MB resumable chunks) — existing
- ✓ AI-powered transcription via Gemini with streaming progress — existing
- ✓ Multi-language support (original language + English translation per segment) — existing
- ✓ Real-time segment display during transcription — existing
- ✓ DOCX export in 3 formats (English-only, original-language, bilingual) + download all — existing
- ✓ Copy-to-clipboard for formatted transcript — existing
- ✓ File metadata extraction (duration) — existing

### Active

**Security & API Model:**

- [ ] BYOK: User provides their own Gemini API key (stored in browser localStorage)
- [ ] Remove embedded/build-time API key entirely
- [ ] Fix wildcard CORS on edge function (restrict to app domain)
- [ ] Validate upload proxy URL targets (only allow Google API endpoints)
- [ ] Sanitize error messages (no raw API errors or stack traces to client)
- [ ] Add rate limiting to upload endpoints

**Project Management:**

- [ ] Multi-project support: each interview is a project with its own state
- [ ] Project list/dashboard as landing page
- [ ] Project grouping/folders (e.g., "Senior Eng Hiring Round")
- [ ] Persistent project state in localStorage (survives page refresh)
- [ ] Full transcript visibility during processing (scrollable, growing transcript — not just current segment snapshots)
- [ ] Ability to cancel in-progress transcription

**UI/UX Polish:**

- [ ] Decompose monolithic App.tsx into proper component hierarchy
- [ ] Responsive design (works on mobile/tablet)
- [ ] Proper loading states and error handling throughout
- [ ] Accessibility basics (ARIA labels, keyboard navigation)
- [ ] Polished visual design (not homebrew-looking)

**Code Quality:**

- [ ] Pin all dependencies (remove `"latest"` version)
- [ ] Add ESLint + Prettier configuration
- [ ] Add test framework (Vitest) with coverage for critical paths
- [ ] Fix known bugs: memory leak (ObjectURL), brittle download timing, silent duration failure
- [ ] Extract custom hooks from monolithic state management

**Deployment & Infrastructure:**

- [ ] CI/CD: GitHub push triggers Netlify deploy
- [ ] Custom domain (user to purchase and configure)
- [ ] Proper environment variable handling across environments
- [ ] README rewrite for portfolio presentation

### Out of Scope

- User accounts / authentication — v2 (browser-only persistence is sufficient for v1)
- Cloud database / cross-device sync — v2 (requires auth, significantly more scope)
- Multi-model support (Claude, GPT, etc.) — v2 (BYOK Gemini only for v1)
- Sharing/collaboration features — v2 (requires cloud persistence)
- Real-time chat / live interview mode — different product direction
- Mobile native app — web-first, responsive design sufficient

## Context

- Built originally with an agentic IDE — functional but not hardened
- Currently deployed at https://celebrated-selkie-3cbc3b.netlify.app/
- 2 current users (builder + spouse)
- Going public-facing: anyone should be able to use it with their own Gemini key
- First project in a professional portfolio — needs to demonstrate "shipped product" quality
- Tech stack: React 18 + TypeScript + Vite + Tailwind CSS + Netlify (functions + edge functions)
- Codebase has zero test coverage, monolithic component structure, several known bugs
- Codebase map available at `.planning/codebase/`

## Constraints

- **Hosting**: Netlify — staying on Netlify for v1 (already deployed, familiar, free tier)
- **AI Provider**: Gemini only for v1 — existing integration, BYOK model
- **Persistence**: Browser localStorage only — no backend database for v1
- **Budget**: Minimal — free tier services, user-funded API usage via BYOK
- **Source Control**: Personal GitHub (dcogan18gmail/interview-insight) — separate from work account

## Key Decisions

| Decision                             | Rationale                                                                                  | Outcome   |
| ------------------------------------ | ------------------------------------------------------------------------------------------ | --------- |
| BYOK (Bring Your Own Key) model      | Solves billing problem, enables public-facing usage without owner paying for all API calls | — Pending |
| Browser localStorage for persistence | Ships faster than cloud DB, sufficient for v1, accounts/sync deferred to v2                | — Pending |
| Stay on Netlify                      | Already deployed, free tier, serverless functions work well for proxy pattern              | — Pending |
| Personal GitHub (not work)           | Portfolio project, separate identity from employer                                         | — Pending |
| Phase v1/v2 split                    | Harden and ship what exists before adding cloud layer                                      | — Pending |

---

_Last updated: 2026-02-06 after initialization_
