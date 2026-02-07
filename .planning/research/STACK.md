# Stack Research: Hardening Interview Insight

## Executive Summary

Based on analysis of the current Interview Insight codebase (React 18 + TypeScript + Vite + Tailwind + Netlify + Gemini), here's the recommended hardening stack for 2025/2026:

**Critical Security Findings:**
- API key currently exposed in Vite config
- No XSS protection for transcript rendering
- Missing security headers
- No CSP implementation

**Recommended Additions:**
1. **Security:** DOMPurify, react-helmet-async, crypto-js, CSP headers
2. **Testing:** Vitest + React Testing Library + Playwright
3. **Linting:** ESLint 9 (flat config) + Prettier + strict TypeScript
4. **CI/CD:** GitHub Actions + Netlify security configuration
5. **BYOK:** Client-side key encryption (localStorage)

---

## Current Stack Analysis

**From package.json:**
- `@google/genai`: "latest" — Should pin version
- `@netlify/functions`: "^5.1.0" — Good
- `docx`: "^9.0.0" — Good
- `react`: "^18.3.1" — Good
- `react-dom`: "^18.3.1" — Good
- `typescript`: "~5.8.2" — Good
- `vite`: "^6.2.0" — Good (latest)

**Issues Identified:**
1. No testing framework
2. No linting/formatting tools
3. No security libraries
4. No pre-commit hooks
5. No CI/CD configuration

---

## Security Layer

### 1. Content Security Policy (CSP)
**Package:** `react-helmet-async@^2.0.5`
**Confidence:** 95%

Prevents XSS attacks, controls resource loading, essential for BYOK model. Implement via Netlify headers in netlify.toml (preferred for production).

### 2. XSS Protection
**Package:** `dompurify@^3.2.2`
**Confidence:** 95%

Sanitizes transcript content before rendering, battle-tested, zero dependencies.

### 3. BYOK Key Management
**Package:** `crypto-js@^4.2.0`
**Confidence:** 75%

Encrypts API keys in localStorage (not perfect, but better than plaintext). Critical: remove API key from Vite config define block.

### 4. Dependency Scanning
**Tools:** npm audit + GitHub Dependabot
**Confidence:** 90%

---

## Testing Layer

### 1. Unit/Component Testing
**Framework:** `vitest@^3.0.0` + `@testing-library/react@^16.1.0`
**Confidence:** 95%

Why Vitest: Native Vite integration, 10x faster than Jest for Vite projects, ESM/TypeScript support out of the box.

Additional deps: `@testing-library/jest-dom@^6.6.3`, `@testing-library/user-event@^14.5.2`, `jsdom@^25.0.1`

**What NOT to use:** Jest (slower for Vite, complex config)

### 2. End-to-End Testing
**Framework:** `playwright@^1.50.0`
**Confidence:** 90%

Why Playwright: Tests real browsers, works with Netlify Functions, better TypeScript support than Cypress.

---

## Linting & Formatting Layer

### 1. ESLint 9 (Flat Config)
**Package:** `eslint@^9.18.0`
**Confidence:** 95%

Additional: `@typescript-eslint/eslint-plugin@^8.21.0`, `@typescript-eslint/parser@^8.21.0`, `eslint-plugin-react@^7.37.2`, `eslint-plugin-react-hooks@^5.1.0`, `eslint-plugin-jsx-a11y@^6.10.2`

**What NOT to use:** ESLint 8 .eslintrc (deprecated)

### 2. Prettier
**Package:** `prettier@^3.4.2` + `prettier-plugin-tailwindcss@^0.6.9`
**Confidence:** 100%

### 3. TypeScript Strict Mode
Enable strict, noUncheckedIndexedAccess, noImplicitReturns, noFallthroughCasesInSwitch.
**Confidence:** 90%

### 4. Pre-commit Hooks
**Tools:** `husky@^9.1.7` + `lint-staged@^15.2.11`
**Confidence:** 95%

---

## CI/CD Layer

### 1. GitHub Actions
**Confidence:** 95%

Workflow: lint, type-check, test, build, security audit on PR. Deploy to Netlify on main merge.

### 2. Netlify Configuration
Security headers in netlify.toml: X-Frame-Options DENY, X-Content-Type-Options nosniff, Referrer-Policy, Content-Security-Policy.

### 3. Code Coverage
Vitest + Codecov integration.

---

## Build Optimizations

- `@vitejs/plugin-react-swc@^3.7.3` (faster than Babel)
- `vite-plugin-compression@^0.5.1` (Brotli compression)
- `rollup-plugin-visualizer@^5.12.0` (bundle analysis)
- Manual chunks for vendor (react, react-dom) and AI (@google/genai)

---

## localStorage Patterns

Versioned storage schema with migration support. Handle QuotaExceededError. Single key `interview-insight` with typed schema.

---

## What NOT to Use

1. **Redux/MobX/Zustand** — React Context sufficient for app size
2. **React Router** — Minimal routing needs, can use simple state-based routing
3. **Styled Components** — Already using Tailwind
4. **Webpack** — Vite is faster
5. **Axios** — Native fetch is sufficient
6. **Moment.js** — Deprecated (use date-fns or native Intl)
7. **Docker** — Netlify handles deployment
8. **GraphQL** — Direct API calls only

---

## Confidence Levels

- **95%+:** ESLint, Prettier, Vitest, Playwright, Netlify headers
- **85-94%:** TypeScript strict, Husky, CSP, Code coverage
- **75-84%:** BYOK encryption, localStorage patterns
- **<75%:** PWA features, visual regression testing

---

## Key Takeaways

1. **Security is Priority #1:** Fix API key exposure, add XSS protection, implement CSP
2. **Vite-Native Tools:** Use Vitest (not Jest), SWC (not Babel)
3. **ESLint 9 Required:** Migrate to flat config (new standard)
4. **GitHub Actions + Netlify:** Best CI/CD for this stack
5. **BYOK Challenges:** Client-side encryption has limits, but better than plaintext
6. **Don't Over-Engineer:** No heavy state management, routing, or CSS-in-JS needed
7. **TypeScript Strict Mode:** Enable for better type safety
8. **Testing Strategy:** Vitest for units, Playwright for E2E

---

*Research Date: 2026-02-06*
*Researcher: Claude Sonnet 4.5*
