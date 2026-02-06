# Technology Stack

**Analysis Date:** 2026-02-06

## Languages

**Primary:**
- TypeScript ~5.8.2 - All application code (components, services, serverless functions)
- TSX - React component files (`App.tsx`, `components/*.tsx`)

**Secondary:**
- CSS - Tailwind utility classes and custom animations (`index.css`)
- Bash - Setup/deployment script (`start.sh`)
- JSON - Configuration and metadata (`package.json`, `tsconfig.json`, `metadata.json`)

## Runtime

**Environment:**
- Node.js (no `.nvmrc` present; no version pinned)
- Deno - Used by Netlify Edge Functions runtime (`deno.lock` present; managed by Netlify, not user-configured)

**Package Manager:**
- npm
- Lockfile: `package-lock.json` (present)

## Frameworks

**Core:**
- React 18.3.1 - UI framework, functional components with hooks
- Vite 6.2.0 - Dev server and production bundler

**Styling:**
- Tailwind CSS 3.4.0 - Utility-first CSS framework
- PostCSS 8.4.0 - CSS processing pipeline
- Autoprefixer 10.4.0 - Vendor prefix automation

**Serverless:**
- Netlify Functions (via `@netlify/functions` ^5.1.0) - Backend serverless functions
- Netlify Edge Functions (via `@netlify/edge-functions` from Deno) - Streaming upload proxy

**Build/Dev:**
- Vite 6.2.0 - Bundler and dev server (`vite.config.ts`)
- `@vitejs/plugin-react` ^5.0.0 - React Fast Refresh and JSX support
- TypeScript ~5.8.2 - Type checking (no emit, `noEmit: true`)
- `netlify-cli` ^23.11.1 - Local dev with `netlify dev` and deployment

## Key Dependencies

**Critical:**
- `@google/genai` (latest) - Google Gemini AI SDK for transcript generation and file upload. Used in both client-side service (`services/geminiService.ts`) and server-side function (`netlify/functions/gemini-upload.ts`). Pinned to `latest` -- see CONCERNS.
- `react` ^18.3.1 - Core UI rendering
- `react-dom` ^18.3.1 - DOM rendering target

**Infrastructure:**
- `@netlify/functions` ^5.1.0 - Serverless function handler types and runtime (`netlify/functions/gemini-upload.ts`)
- `docx` ^9.0.0 - Client-side DOCX document generation for transcript export (`components/TranscriptView.tsx`)

**Dev Dependencies:**
- `@types/node` ^22.14.0 - Node.js type definitions
- `@types/react` ^18.3.12 - React type definitions
- `@types/react-dom` ^18.3.1 - ReactDOM type definitions

## Configuration

**TypeScript (`tsconfig.json`):**
- Target: ES2022
- Module: ESNext with bundler resolution
- JSX: `react-jsx` (automatic runtime)
- Path alias: `@/*` maps to project root (`./`)
- `experimentalDecorators: true` (enabled but not used)
- `allowImportingTsExtensions: true` with `noEmit: true`

**Vite (`vite.config.ts`):**
- Dev server on port 3000, bound to `0.0.0.0`
- Defines `process.env.API_KEY` and `process.env.GEMINI_API_KEY` from `GEMINI_API_KEY` env var at build time
- Path alias: `@` maps to project root

**Tailwind (`tailwind.config.js`):**
- Content paths: `./index.html`, `./**/*.{js,ts,jsx,tsx}`
- Custom font family: Inter (loaded from Google Fonts CDN in `index.html`)

**PostCSS (`postcss.config.js`):**
- Plugins: tailwindcss, autoprefixer

**Netlify (`netlify.toml`):**
- Build command: `npm run build`
- Publish directory: `dist`
- Dev target port: 3000
- Functions directory: `netlify/functions`
- Edge function: `proxy-upload` at path `/proxy-upload`
- SPA fallback redirect: `/* -> /index.html` (status 200)

**Environment:**
- `.env.example` present - template for local config
- `.env.local` present - local environment configuration (not committed)
- Single required env var: `GEMINI_API_KEY`

## Build & Scripts

**Available npm scripts (`package.json`):**
```bash
npm run dev        # Start Vite dev server (port 3000)
npm start          # Start Netlify Dev (wraps Vite + functions)
npm run build      # Production build via Vite (output: dist/)
npm run preview    # Preview production build locally
```

**Startup helper:** `start.sh` - Interactive bash script for setup, local dev, build, and Netlify deployment.

## Platform Requirements

**Development:**
- Node.js (version not pinned)
- npm
- Gemini API key (from https://aistudio.google.com/app/apikey)
- `netlify-cli` for full-stack local dev (functions + edge functions)

**Production:**
- Netlify (hosting, serverless functions, edge functions)
- Google Gemini API access
- `GEMINI_API_KEY` environment variable set in Netlify dashboard

---

*Stack analysis: 2026-02-06*
