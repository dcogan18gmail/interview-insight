# Pitfalls Research: Hardening Interview Insight

**Research Date:** 2026-02-06
**Scope:** Common mistakes when hardening a prototype React app into a public-facing product with BYOK, localStorage persistence, Netlify deployment, and streaming AI integration.

## Executive Summary

30 specific pitfalls identified across 5 domains. 8 are critical blockers that must be fixed before public launch.

---

## 1. BYOK Pattern Implementation

### Pitfall 1: API Key Validation Too Late
**What Goes Wrong:** User enters invalid key, starts a long upload, key fails mid-transcription. All progress lost.
**Warning Signs:** Users reporting "it worked for a while then stopped"
**Prevention:** Validate key immediately on entry with a lightweight API call (e.g., list models endpoint). Show clear valid/invalid status before allowing uploads.
**Phase:** Security hardening

### Pitfall 2: localStorage Keys Visible in DevTools
**What Goes Wrong:** Users (or shared computer users) can see API keys in DevTools → Application → localStorage.
**Warning Signs:** Security-conscious users complaining
**Prevention:** Encrypt keys before storing. Add clear UX messaging: "Your key is stored locally in your browser. Clear browser data to remove it." Consider session-only storage option.
**Phase:** Security hardening

### Pitfall 3: Key Rotation Breaking Existing Projects
**What Goes Wrong:** User changes API key. Old projects stored file URIs that reference the previous key's uploads. Gemini file URIs are key-scoped.
**Warning Signs:** "File not found" errors on old projects after key change
**Prevention:** Store file URIs with associated key hash. Warn users that changing keys may affect access to previously uploaded files. Consider re-upload option.
**Phase:** Project management

### Pitfall 4: Missing API Quota/Usage Feedback
**What Goes Wrong:** User hits Gemini rate limits or quota. Error is cryptic ("429 Too Many Requests" or generic failure).
**Warning Signs:** Users confused about why processing stopped
**Prevention:** Catch rate limit errors specifically. Show friendly message with estimated wait time. Display usage stats if available from Gemini API.
**Phase:** Error handling

### Pitfall 5: Browser Extension Theft Risk
**What Goes Wrong:** Malicious browser extensions can read localStorage and steal API keys.
**Warning Signs:** Inherent to browser-based BYOK, can't fully prevent
**Prevention:** Document the risk. Recommend users use API keys with restricted permissions/quotas. Suggest rotating keys periodically. This is an accepted tradeoff of browser-based BYOK.
**Phase:** Documentation

---

## 2. localStorage for Application State

### Pitfall 6: No Schema Versioning (CRITICAL)
**What Goes Wrong:** App update changes data shape. Existing localStorage data can't be parsed. App crashes on load.
**Warning Signs:** White screen after deploy, works in incognito
**Prevention:** Version the schema from day one. Include migration functions for each version bump. Always wrap localStorage reads in try/catch.
**Phase:** Foundation (must be first localStorage implementation)

### Pitfall 7: localStorage Quota Silently Failing (CRITICAL)
**What Goes Wrong:** localStorage has ~5-10MB limit. Long transcripts fill it up. Saves fail silently.
**Warning Signs:** Data disappearing after "successful" saves, inconsistent state
**Prevention:** Catch QuotaExceededError. Show clear "storage full" message. Implement data size tracking. Consider IndexedDB for large transcript data (much higher limits).
**Phase:** Storage layer

### Pitfall 8: Private Browsing Kills Persistence
**What Goes Wrong:** Safari private browsing throws on localStorage.setItem. Some browsers have reduced quotas in private mode.
**Warning Signs:** App broken for privacy-conscious users
**Prevention:** Feature-detect localStorage availability on app load. Show clear warning in private browsing mode. Still allow usage, just warn data won't persist.
**Phase:** Storage layer

### Pitfall 9: Multiple Tabs Corrupting Data
**What Goes Wrong:** User has app open in two tabs. Both write to localStorage. Last write wins, potentially losing data from the other tab.
**Warning Signs:** Intermittent data loss, "I swear I saved that"
**Prevention:** Use the `storage` event listener to detect cross-tab changes. Show "data changed in another tab" notification. Consider tab locking for write operations.
**Phase:** Storage layer

### Pitfall 10: JSON Parse Errors Crashing App (CRITICAL)
**What Goes Wrong:** Corrupted localStorage entry (incomplete write, manual tampering) causes JSON.parse to throw. App white-screens.
**Warning Signs:** Sporadic crashes, especially after browser crashes or force-quits
**Prevention:** Always wrap JSON.parse in try/catch. On failure, back up corrupted data, reset to defaults, show recovery message. Never trust localStorage content.
**Phase:** Foundation

### Pitfall 11: Performance Degradation with Large Project Lists
**What Goes Wrong:** Loading entire project history from localStorage on every page load. Gets slow as projects accumulate.
**Warning Signs:** Slow app startup, increasing over time
**Prevention:** Lazy-load project data. Store project list (metadata only) separately from full transcript data. Load transcripts on demand.
**Phase:** Storage optimization

---

## 3. Netlify Deployment & CI/CD

### Pitfall 12: Environment Variable Confusion (Build-time vs Runtime)
**What Goes Wrong:** Vite env vars (import.meta.env) are replaced at build time. Changing Netlify env vars requires a rebuild. Developers expect runtime behavior.
**Warning Signs:** "I changed the env var but nothing happened"
**Prevention:** Clearly distinguish build-time config from runtime config. For BYOK, API keys should NEVER be in env vars — they're user-provided at runtime. Document which vars are build-time vs runtime.
**Phase:** CI/CD setup

### Pitfall 13: Function Timeout Gotchas
**What Goes Wrong:** Netlify Functions have 10-second timeout (free tier), 26 seconds (paid). Long transcription proxying can timeout.
**Warning Signs:** Intermittent 502 errors on large files
**Prevention:** Use Edge Functions for streaming (already done correctly). Ensure chunked upload stays within timeout per chunk. Consider background functions for truly long operations.
**Phase:** Already handled

### Pitfall 14: Cold Start Latency
**What Goes Wrong:** First request after inactivity takes 3-10 seconds. Users think the app is broken.
**Warning Signs:** "Sometimes it's fast, sometimes it hangs"
**Prevention:** Show immediate UI feedback before function responds. Use Edge Functions (faster cold start than regular functions). Consider keepalive pings for critical paths.
**Phase:** Performance

### Pitfall 15: Deploy Preview URLs Leaking
**What Goes Wrong:** Netlify generates preview URLs for every commit. These can be indexed by search engines or shared accidentally.
**Warning Signs:** Old preview URLs appearing in search results
**Prevention:** Add `x-robots-tag: noindex` to preview deploys. Use branch deploy settings carefully. Document which URLs are production vs preview.
**Phase:** CI/CD setup

### Pitfall 16: Custom Domain HTTPS Failing Silently
**What Goes Wrong:** DNS propagation delays cause SSL certificate provisioning to fail. Site works on HTTP but HTTPS shows errors.
**Warning Signs:** "Your connection is not private" errors for some users
**Prevention:** Configure DNS before pointing domain. Use Netlify DNS for easiest setup. Wait for certificate provisioning (can take up to 24 hours). Test with multiple browsers.
**Phase:** Deployment

### Pitfall 17: Build Cache Causing Stale Deploys
**What Goes Wrong:** Netlify caches node_modules. Dependency updates don't take effect.
**Warning Signs:** "It works locally but not in production"
**Prevention:** Clear build cache when debugging deploy issues. Pin dependency versions. Use lock file (package-lock.json) consistently.
**Phase:** CI/CD setup

### Pitfall 18: Missing Redirects for SPA
**What Goes Wrong:** User bookmarks or refreshes a deep URL. Netlify returns 404 because there's no server-side route.
**Warning Signs:** 404 on page refresh (if routing is added)
**Prevention:** Add catch-all redirect in netlify.toml: `[[redirects]] from = "/*" to = "/index.html" status = 200`. Already partially configured but verify.
**Phase:** Deployment config

---

## 4. Streaming AI Response Integration

### Pitfall 19: Memory Leaks in Long Operations (CRITICAL — Known Bug)
**What Goes Wrong:** ObjectURLs from createObjectURL never revoked. Each file selection leaks memory. Over multiple uploads, browser tab consumes excessive memory.
**Warning Signs:** Browser tab memory growing, eventual tab crash
**Prevention:** Call URL.revokeObjectURL() in cleanup. Track created URLs and revoke on component unmount. Current bug in FileUpload.tsx line 74.
**Phase:** Bug fixes

### Pitfall 20: Streaming Errors Silently Lost
**What Goes Wrong:** Error in middle of streaming response. Parser skips bad chunks. User sees incomplete transcript with no error indication.
**Warning Signs:** Transcripts ending abruptly without error messages
**Prevention:** Track expected vs received segment counts. Detect abnormal stream termination. Show clear "transcription incomplete" with retry option. Current issue in geminiService.ts JSONL parser.
**Phase:** Error handling

### Pitfall 21: Progress Bar Lying
**What Goes Wrong:** Progress percentage based on time estimate, not actual progress. Long files show 90% for most of the processing time.
**Warning Signs:** User frustration, "it's been at 90% for 10 minutes"
**Prevention:** Base progress on actual data (segments received / estimated total). Show stage-based progress instead of percentage. Be honest about uncertainty.
**Phase:** UX polish

### Pitfall 22: Mobile Safari Killing Background Tabs
**What Goes Wrong:** iOS Safari aggressively suspends background tabs. Long-running transcription dies silently when user switches apps.
**Warning Signs:** iOS users reporting lost progress
**Prevention:** Detect visibility change (document.visibilitychange event). Warn users to keep tab in foreground during processing. Save intermediate state frequently so work can be resumed.
**Phase:** Mobile support

### Pitfall 23: Network Interruptions Losing All Progress (CRITICAL)
**What Goes Wrong:** Wi-Fi drops during 30-minute transcription. All progress lost. User must restart entirely.
**Warning Signs:** Users on flaky connections losing work
**Prevention:** Save intermediate transcript segments to localStorage as they arrive. On reconnection, offer to resume from last saved segment. Current implementation sends repeated full-file API calls — each iteration is somewhat independent.
**Phase:** Error recovery

### Pitfall 24: Fetch Streams vs SSE Confusion
**What Goes Wrong:** Mixing up fetch response.body streams with Server-Sent Events. Different error handling, different reconnection patterns.
**Warning Signs:** Inconsistent streaming behavior across browsers
**Prevention:** Document which streaming pattern is used where. Current implementation uses fetch streams correctly. If adding SSE for progress, keep patterns separate.
**Phase:** Architecture

---

## 5. Prototype-to-Production Hardening

### Pitfall 25: Missing Security Headers (CRITICAL)
**What Goes Wrong:** No X-Frame-Options (clickjacking), no CSP (XSS), no HSTS (downgrade attacks). Automated security scanners flag the site.
**Warning Signs:** Security audit failures, browser warnings
**Prevention:** Add comprehensive headers in netlify.toml. Test with securityheaders.com. Include: X-Frame-Options, X-Content-Type-Options, Referrer-Policy, Content-Security-Policy, Strict-Transport-Security.
**Phase:** Security hardening (first phase)

### Pitfall 26: CORS Wildcard Persisting (CRITICAL)
**What Goes Wrong:** Edge function sets Access-Control-Allow-Origin: *. Any website can use your proxy endpoint as an open relay.
**Warning Signs:** Unexpected traffic, API abuse
**Prevention:** Restrict CORS to your production domain and localhost for dev. Validate Origin header server-side. Current issue in proxy-upload.ts.
**Phase:** Security hardening (first phase)

### Pitfall 27: Proxy URL Validation Missing (CRITICAL — SSRF)
**What Goes Wrong:** Edge function accepts any URL in X-Upload-Url header and forwards the request. Attacker can use your proxy to reach internal services.
**Warning Signs:** This is a Server-Side Request Forgery (SSRF) vulnerability
**Prevention:** Validate that X-Upload-Url starts with "https://generativelanguage.googleapis.com/". Reject all other URLs. Current issue in proxy-upload.ts line 20.
**Phase:** Security hardening (first phase)

### Pitfall 28: Error Messages Leaking Internals (CRITICAL)
**What Goes Wrong:** Raw API errors and stack traces returned to client. Reveals implementation details, API structure, potentially partial credentials.
**Warning Signs:** Users seeing technical error messages, security audit findings
**Prevention:** Catch all errors in serverless functions. Return generic user-friendly messages. Log detailed errors server-side only. Map known error codes to helpful messages.
**Phase:** Security hardening

### Pitfall 29: No Monitoring or Alerting
**What Goes Wrong:** App is broken in production and nobody knows. Users silently leave.
**Warning Signs:** You only find out about issues from user complaints
**Prevention:** Add basic error tracking (Sentry free tier). Monitor Netlify function logs. Set up uptime monitoring (free: UptimeRobot). Track key metrics: uploads started vs completed.
**Phase:** Post-launch

### Pitfall 30: Performance Regression After Refactoring
**What Goes Wrong:** Decomposing monolithic component introduces unnecessary re-renders. App becomes slower after "improvement."
**Warning Signs:** UI feels sluggish after refactor, especially during streaming
**Prevention:** Profile before and after refactoring with React DevTools. Use React.memo strategically. Keep streaming state updates minimal. Don't over-decompose — some coupling is fine.
**Phase:** Architecture refactor

---

## Critical Blockers Summary

Must fix before public launch:

| # | Pitfall | Domain | Impact |
|---|---------|--------|--------|
| 6 | No localStorage schema versioning | Storage | Data corruption on updates |
| 7 | localStorage quota silent failure | Storage | Silent data loss |
| 10 | JSON parse errors crash app | Storage | White screen of death |
| 19 | Memory leak (ObjectURL) | Streaming | Tab crashes |
| 23 | Network interruption loses progress | Streaming | Complete data loss |
| 25 | Missing security headers | Security | Vulnerable to attacks |
| 26 | CORS wildcard on proxy | Security | Open relay exploitation |
| 27 | No proxy URL validation (SSRF) | Security | Server-side request forgery |
| 28 | Error messages leak internals | Security | Information disclosure |

---

## Phase Mapping

**Phase 1 — Security:** Pitfalls 25, 26, 27, 28, 1, 2
**Phase 2 — Storage Foundation:** Pitfalls 6, 7, 8, 9, 10
**Phase 3 — Error Handling:** Pitfalls 4, 19, 20, 23
**Phase 4 — CI/CD:** Pitfalls 12, 15, 16, 17, 18
**Phase 5 — UX Polish:** Pitfalls 3, 11, 14, 21, 22
**Phase 6 — Post-Launch:** Pitfalls 5, 24, 29, 30

---

*Research Date: 2026-02-06*
*Researcher: Claude Sonnet 4.5*
