# Phase 2: Development Tooling - Research

**Researched:** 2026-02-07
**Domain:** ESLint, Prettier, Pre-commit Hooks, TypeScript Strict Mode, CI Pipeline
**Confidence:** HIGH

## Summary

This research covers the complete development tooling stack for a React 18 + TypeScript + Vite + Tailwind CSS project. The standard approach is ESLint 9 (flat config) with typescript-eslint v8, Prettier 3.x with the Tailwind plugin, Husky 9 + lint-staged for pre-commit hooks, TypeScript strict mode enablement, and GitHub Actions for CI.

A critical finding: ESLint 10.0.0 was released on 2026-02-06 (yesterday). However, typescript-eslint v8 only supports `^8.57.0 || ^9.0.0` -- ESLint 10 is NOT yet in the supported range. We must use ESLint 9.x (latest: 9.39.2) for compatibility with the entire plugin ecosystem. This is a HIGH-confidence recommendation backed by the official typescript-eslint dependency versions page.

The codebase is small (~1400 lines across 10 source files) with only 2 TypeScript strict mode errors, making the migration straightforward -- fix all errors at once rather than incrementally.

**Primary recommendation:** Use ESLint 9.39.2 (NOT ESLint 10), Prettier 3.8.1, Husky 9.1.7, lint-staged 16.2.7. Pin all versions exactly. Enable TypeScript strict mode + noUncheckedIndexedAccess and fix the 2 resulting errors in one pass.

---

<user_constraints>

## User Constraints (from CONTEXT.md)

### Locked Decisions

**Formatting & code style:**

- Industry-standard defaults for React/TypeScript projects
- 2-space indentation, single quotes, semicolons, 80-char line width
- Prettier with Tailwind plugin for consistent formatting
- Trailing commas in multi-line (ES5 style)

**Editor integration:**

- User uses Cursor (VS Code-based)
- Include `.vscode/settings.json` with format-on-save and ESLint auto-fix on save
- Extensions recommendations for ESLint and Prettier

**Pre-commit behavior:**

- Husky + lint-staged for pre-commit hooks
- Commits are blocked if lint errors exist (strict gate)
- lint-staged runs on staged files only (fast, not full repo)
- Auto-fix formatting on commit (Prettier runs as part of lint-staged)

### Claude's Discretion

- ESLint rule strictness and specific rule set choices (use recommended + React + TypeScript + accessibility plugins as specified in roadmap)
- Prettier detailed config beyond the basics above
- TypeScript strict mode migration approach (fix all errors vs incremental)
- GitHub Actions CI pipeline configuration (triggers, caching, job structure)
- Whether to add any additional quality tools (e.g., sort-imports)

### Deferred Ideas (OUT OF SCOPE)

None -- discussion stayed within phase scope
</user_constraints>

---

## Standard Stack

### Core

| Library             | Version | Purpose                                         | Why Standard                                                                                                                      |
| ------------------- | ------- | ----------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| `eslint`            | 9.39.2  | JavaScript/TypeScript linter                    | Industry standard; ESLint 10 released 2026-02-06 but plugin ecosystem not ready yet                                               |
| `@eslint/js`        | 9.39.2  | ESLint recommended rules config                 | Must match ESLint major version                                                                                                   |
| `typescript-eslint` | 8.54.0  | TypeScript ESLint integration (parser + plugin) | Official TS-ESLint package; supports ESLint 9; replaces separate `@typescript-eslint/parser` + `@typescript-eslint/eslint-plugin` |
| `prettier`          | 3.8.1   | Code formatter                                  | Industry standard; install with `--save-exact` per official guidance                                                              |
| `husky`             | 9.1.7   | Git hooks manager                               | De facto standard for npm Git hooks                                                                                               |
| `lint-staged`       | 16.2.7  | Run commands on staged files                    | Pairs with Husky for fast pre-commit checks                                                                                       |

### Supporting

| Library                       | Version | Purpose                                           | When to Use                                                                        |
| ----------------------------- | ------- | ------------------------------------------------- | ---------------------------------------------------------------------------------- |
| `eslint-plugin-react`         | 7.37.5  | React-specific linting rules                      | Catches React-specific issues (key props, prop-types, etc.)                        |
| `eslint-plugin-react-hooks`   | 7.0.1   | React Hooks rules                                 | Enforces rules-of-hooks and exhaustive-deps; v7 safe with React 18                 |
| `eslint-plugin-jsx-a11y`      | 6.10.2  | Accessibility rules for JSX                       | Catches a11y issues at lint time (missing alt text, ARIA roles, etc.)              |
| `eslint-config-prettier`      | 10.1.8  | Disables ESLint rules that conflict with Prettier | MUST be last in ESLint config array to override formatting rules                   |
| `prettier-plugin-tailwindcss` | 0.7.2   | Sorts Tailwind CSS classes                        | Auto-sorts class attributes per recommended Tailwind order                         |
| `globals`                     | 17.3.0  | Global variable definitions for ESLint            | Provides `globals.browser` for flat config (replaces old `env: { browser: true }`) |

### Alternatives Considered

| Instead of                     | Could Use                                  | Tradeoff                                                                                                                                                                                      |
| ------------------------------ | ------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| ESLint 9.39.2                  | ESLint 10.0.0                              | ESLint 10 released 2026-02-06 but typescript-eslint v8 only supports `^8.57.0 \|\| ^9.0.0`. Upgrading now would break TypeScript linting. Wait for typescript-eslint v9.                      |
| `eslint-plugin-react`          | `@eslint-react/eslint-plugin`              | eslint-react is newer/faster but eslint-plugin-react is more established; stick with standard for this project                                                                                |
| `eslint-plugin-prettier`       | Separate Prettier + eslint-config-prettier | eslint-plugin-prettier runs Prettier as an ESLint rule (slower, red squiggles for formatting). Best practice is to keep them separate -- use eslint-config-prettier to disable conflicts only |
| Additional sort-imports plugin | None                                       | NOT recommended for this project. Prettier + ESLint already handle enough. Adds complexity for marginal benefit on a small codebase.                                                          |

**Installation:**

```bash
npm install --save-dev --save-exact eslint@9.39.2 @eslint/js@9.39.2 typescript-eslint@8.54.0 prettier@3.8.1 eslint-plugin-react@7.37.5 eslint-plugin-react-hooks@7.0.1 eslint-plugin-jsx-a11y@6.10.2 eslint-config-prettier@10.1.8 prettier-plugin-tailwindcss@0.7.2 globals@17.3.0 husky@9.1.7 lint-staged@16.2.7
```

Note: Use `--save-exact` (no `^` or `~` ranges) per requirement QUAL-05: all dependencies pinned to specific versions.

## Architecture Patterns

### Recommended File Structure

```
project-root/
├── eslint.config.mjs          # ESLint 9 flat config (ESM)
├── .prettierrc                 # Prettier config (JSON)
├── .prettierignore             # Prettier ignore patterns
├── .vscode/
│   ├── settings.json           # Format-on-save, ESLint auto-fix
│   └── extensions.json         # Recommended extensions
├── .husky/
│   └── pre-commit              # Hook script (runs lint-staged)
├── .github/
│   └── workflows/
│       └── ci.yml              # GitHub Actions CI pipeline
├── tsconfig.json               # TypeScript config (with strict mode)
└── package.json                # lint-staged config + scripts
```

### Pattern 1: ESLint 9 Flat Config for React + TypeScript

**What:** Single `eslint.config.mjs` file using ESM imports and the new flat config format.
**When to use:** All ESLint 9+ projects. Required -- legacy `.eslintrc` is deprecated in ESLint 9 and removed in ESLint 10.

```javascript
// eslint.config.mjs
// Source: https://typescript-eslint.io/getting-started/
// Source: https://eslint.org/docs/latest/use/configure/configuration-files
import eslint from '@eslint/js';
import tseslint from 'typescript-eslint';
import reactPlugin from 'eslint-plugin-react';
import reactHooks from 'eslint-plugin-react-hooks';
import jsxA11y from 'eslint-plugin-jsx-a11y';
import eslintConfigPrettier from 'eslint-config-prettier/flat';
import globals from 'globals';

export default [
  // Global ignores (replaces .eslintignore)
  {
    ignores: ['dist/', 'node_modules/', '.netlify/', 'netlify/edge-functions/'],
  },

  // Base ESLint recommended rules
  eslint.configs.recommended,

  // TypeScript recommended rules
  ...tseslint.configs.recommended,

  // React recommended rules
  {
    ...reactPlugin.configs.flat.recommended,
    settings: {
      react: { version: 'detect' },
    },
  },

  // React JSX runtime (React 17+ -- no need to import React)
  reactPlugin.configs.flat['jsx-runtime'],

  // React Hooks rules
  {
    plugins: {
      'react-hooks': reactHooks,
    },
    rules: {
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'warn',
    },
  },

  // Accessibility rules
  jsxA11y.flatConfigs.recommended,

  // Project-specific settings
  {
    files: ['**/*.{ts,tsx}'],
    languageOptions: {
      globals: {
        ...globals.browser,
      },
    },
  },

  // Prettier MUST be last -- disables conflicting formatting rules
  eslintConfigPrettier,
];
```

### Pattern 2: Prettier Config with Tailwind Plugin

**What:** `.prettierrc` with locked formatting choices and Tailwind class sorting.
**When to use:** All files processed by Prettier.

```json
{
  "semi": true,
  "singleQuote": true,
  "tabWidth": 2,
  "trailingComma": "es5",
  "printWidth": 80,
  "plugins": ["prettier-plugin-tailwindcss"]
}
```

### Pattern 3: lint-staged Config in package.json

**What:** Run ESLint --fix and Prettier --write on staged files before commit.
**When to use:** Pre-commit hook via Husky.

```json
{
  "lint-staged": {
    "*.{ts,tsx}": ["eslint --fix", "prettier --write"],
    "*.{json,md,css,html}": ["prettier --write"]
  }
}
```

### Pattern 4: VS Code Settings for Format-on-Save

**What:** `.vscode/settings.json` and `.vscode/extensions.json` for auto-formatting.
**When to use:** Cursor/VS Code editor.

```json
// .vscode/settings.json
{
  "editor.formatOnSave": true,
  "editor.defaultFormatter": "esbenp.prettier-vscode",
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": "explicit"
  },
  "[typescript]": {
    "editor.defaultFormatter": "esbenp.prettier-vscode"
  },
  "[typescriptreact]": {
    "editor.defaultFormatter": "esbenp.prettier-vscode"
  }
}
```

```json
// .vscode/extensions.json
{
  "recommendations": ["esbenp.prettier-vscode", "dbaeumer.vscode-eslint"]
}
```

### Pattern 5: GitHub Actions CI Pipeline

**What:** `.github/workflows/ci.yml` running lint, type-check, and build on PRs.
**When to use:** Every pull request to main/master.

```yaml
name: CI

on:
  pull_request:
    branches: [main]
  push:
    branches: [main]

jobs:
  quality:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: '22'
          cache: 'npm'

      - run: npm ci

      - name: Lint
        run: npm run lint

      - name: Type Check
        run: npm run type-check

      - name: Build
        run: npm run build
```

### Anti-Patterns to Avoid

- **Running eslint-plugin-prettier:** Do NOT use `eslint-plugin-prettier` (which runs Prettier as an ESLint rule). It's slower and shows red squiggles for formatting issues. Instead, keep Prettier and ESLint separate, using `eslint-config-prettier` to disable conflicts.
- **Overly strict ESLint on day one:** Use `recommended` presets, not `strict`. The `strict` preset from typescript-eslint is more opinionated and may flag many issues in the existing codebase that are not actual bugs. Better to start with `recommended` and tighten later.
- **Linting Netlify Edge Functions with project ESLint:** Netlify edge functions use Deno runtime types (`@netlify/edge-functions`) which are not installed as npm packages. They should be excluded from the project ESLint config to avoid false errors.
- **Using .eslintrc format:** ESLint 9 uses flat config (`eslint.config.mjs`). The old `.eslintrc.*` format is deprecated in v9 and completely removed in v10.

## Don't Hand-Roll

| Problem                       | Don't Build                               | Use Instead                       | Why                                                                     |
| ----------------------------- | ----------------------------------------- | --------------------------------- | ----------------------------------------------------------------------- |
| Formatting consistency        | Custom ESLint formatting rules            | Prettier                          | Prettier handles all formatting; ESLint should only handle code quality |
| ESLint/Prettier conflicts     | Manual rule-by-rule disabling             | eslint-config-prettier            | Automatically turns off all conflicting ESLint rules                    |
| Pre-commit file selection     | Custom git diff parsing                   | lint-staged                       | Handles staged file detection, partial staging, and file filtering      |
| Git hook management           | Manual `.git/hooks/` scripts              | Husky                             | Manages hooks portably across the team with npm lifecycle scripts       |
| TypeScript parsing for ESLint | Custom parser config                      | typescript-eslint unified package | Single `typescript-eslint` import replaces separate parser + plugin     |
| Browser globals definition    | Manual `{ window: true, document: true }` | `globals` npm package             | Comprehensive, maintained list of all browser globals                   |

**Key insight:** The development tooling ecosystem is mature and highly standardized. Every tool in this stack has a single "right" way to configure it. Custom solutions are strictly worse.

## Common Pitfalls

### Pitfall 1: ESLint Config Array Order Matters

**What goes wrong:** ESLint rules don't apply correctly, or Prettier conflicts persist.
**Why it happens:** In flat config, later entries override earlier ones. If `eslint-config-prettier` is NOT last, formatting rules from other plugins remain active and conflict with Prettier.
**How to avoid:** Always put `eslintConfigPrettier` as the LAST item in the config array.
**Warning signs:** ESLint reports formatting issues that Prettier would fix; conflicting autofix loops.

### Pitfall 2: ESLint 10 Incompatibility (CRITICAL - 2026-02-07)

**What goes wrong:** TypeScript ESLint plugin fails to load or produces errors.
**Why it happens:** ESLint 10.0.0 was released 2026-02-06. typescript-eslint v8.54.0 declares peer dependency `^8.57.0 || ^9.0.0`, which does NOT include ESLint 10. Installing ESLint without a version pin will pull v10.
**How to avoid:** Pin ESLint to `9.39.2` exactly. Do NOT use `^9.0.0` or unversioned install.
**Warning signs:** npm peer dependency warnings mentioning ESLint version mismatch.

### Pitfall 3: .vscode/ in .gitignore

**What goes wrong:** `.vscode/settings.json` and `.vscode/extensions.json` are not committed, so editor integration doesn't work for the user.
**Why it happens:** The current `.gitignore` includes `.vscode/`.
**How to avoid:** Remove `.vscode/` from `.gitignore` (or use `!.vscode/settings.json` and `!.vscode/extensions.json` negation patterns). These specific files are project-level configs that SHOULD be committed. Personal settings like `.vscode/*.code-workspace` can stay ignored.
**Warning signs:** After cloning, format-on-save doesn't work until manual editor setup.

### Pitfall 4: Netlify Edge Function TypeScript Errors

**What goes wrong:** ESLint or `tsc --noEmit` fails on `netlify/edge-functions/proxy-upload.ts` because `@netlify/edge-functions` types are not installed as npm dependencies (they're Deno-based).
**Why it happens:** The edge function imports `@netlify/edge-functions` which is provided by the Netlify runtime, not npm.
**How to avoid:** Exclude `netlify/edge-functions/` from both ESLint config ignores AND create a separate `tsconfig.json` exclude for these files (or a `netlify/edge-functions/tsconfig.json` that extends the root but adjusts settings).
**Warning signs:** `tsc --noEmit` reports `Cannot find module '@netlify/edge-functions'`.

### Pitfall 5: Husky Not Initializing After npm install

**What goes wrong:** Pre-commit hooks don't run after fresh clone.
**Why it happens:** Husky requires a `prepare` script in package.json to install hooks on `npm install`.
**How to avoid:** Ensure `"prepare": "husky"` is in package.json scripts. The `npx husky init` command sets this up.
**Warning signs:** Commits succeed without lint-staged running.

### Pitfall 6: lint-staged ESLint --fix Failing the Commit

**What goes wrong:** lint-staged runs `eslint --fix`, fixes some issues, but unfixable errors remain, causing commit to fail with unhelpful error output.
**Why it happens:** `eslint --fix` auto-fixes formatting/simple issues but cannot fix type errors or logic issues.
**How to avoid:** This is actually the desired behavior (strict gate). But ensure error messages are clear. Use `eslint --fix --max-warnings=0` if you also want to block on warnings.
**Warning signs:** Developer confused about why commit is blocked.

### Pitfall 7: `@google/genai` on "latest" Version

**What goes wrong:** The existing `package.json` has `"@google/genai": "latest"` which violates QUAL-05 (pinned versions).
**Why it happens:** Original project used `"latest"` tag.
**How to avoid:** Pin to the exact currently-installed version during this phase.
**Warning signs:** Different developers get different versions; builds not reproducible.

## Code Examples

### Example 1: Complete eslint.config.mjs

```javascript
// Source: https://typescript-eslint.io/getting-started/
// Source: https://github.com/jsx-eslint/eslint-plugin-react
// Source: https://github.com/jsx-eslint/eslint-plugin-jsx-a11y
import eslint from '@eslint/js';
import tseslint from 'typescript-eslint';
import reactPlugin from 'eslint-plugin-react';
import reactHooks from 'eslint-plugin-react-hooks';
import jsxA11y from 'eslint-plugin-jsx-a11y';
import eslintConfigPrettier from 'eslint-config-prettier/flat';
import globals from 'globals';

export default [
  // Global ignores
  {
    ignores: [
      'dist/**',
      'node_modules/**',
      '.netlify/**',
      'netlify/edge-functions/**',
    ],
  },

  // Base recommended
  eslint.configs.recommended,

  // TypeScript recommended
  ...tseslint.configs.recommended,

  // React
  {
    ...reactPlugin.configs.flat.recommended,
    settings: {
      react: { version: 'detect' },
    },
  },
  reactPlugin.configs.flat['jsx-runtime'],

  // React Hooks
  {
    plugins: { 'react-hooks': reactHooks },
    rules: {
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'warn',
    },
  },

  // Accessibility
  jsxA11y.flatConfigs.recommended,

  // Project settings
  {
    files: ['**/*.{ts,tsx}'],
    languageOptions: {
      globals: { ...globals.browser },
    },
    rules: {
      // Relax rules that are too noisy for this codebase
      '@typescript-eslint/no-unused-vars': [
        'error',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
        },
      ],
    },
  },

  // Prettier override MUST be last
  eslintConfigPrettier,
];
```

### Example 2: TypeScript Strict Mode Fix (the 2 errors)

Current codebase has exactly 2 errors with `strict` + `noUncheckedIndexedAccess`:

**Error 1:** `netlify/edge-functions/proxy-upload.ts` -- Cannot find module `@netlify/edge-functions`

- **Fix:** Exclude from tsconfig.json (already a known Netlify pattern)

**Error 2:** `services/geminiService.ts:331` -- `TranscriptSegment | undefined` not assignable to `TranscriptSegment | null`

- **Fix:** Add undefined check: `allSegments[allSegments.length - 1]` could be undefined with `noUncheckedIndexedAccess`. Add a guard:

```typescript
// Before:
onProgress(100, allSegments[allSegments.length - 1]);

// After:
const lastSegment = allSegments[allSegments.length - 1];
if (lastSegment) {
  onProgress(100, lastSegment);
}
```

### Example 3: Husky + lint-staged Setup

```bash
# Initialize Husky
npx husky init

# This creates .husky/pre-commit and adds "prepare": "husky" to package.json
# Replace .husky/pre-commit content with:
npx lint-staged
```

### Example 4: package.json Scripts

```json
{
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview",
    "start": "netlify dev",
    "lint": "eslint .",
    "lint:fix": "eslint . --fix",
    "format": "prettier --write .",
    "format:check": "prettier --check .",
    "type-check": "tsc --noEmit",
    "prepare": "husky"
  }
}
```

### Example 5: .prettierignore

```
dist
node_modules
.netlify
package-lock.json
*.min.js
```

### Example 6: tsconfig.json with Strict Mode

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "lib": ["ES2022", "DOM", "DOM.Iterable"],
    "skipLibCheck": true,
    "types": ["node"],
    "moduleResolution": "bundler",
    "isolatedModules": true,
    "moduleDetection": "force",
    "allowJs": true,
    "jsx": "react-jsx",
    "paths": { "@/*": ["./*"] },
    "allowImportingTsExtensions": true,
    "noEmit": true,
    "strict": true,
    "noUncheckedIndexedAccess": true
  },
  "exclude": ["netlify/edge-functions"]
}
```

Note: Removed `experimentalDecorators` and `useDefineForClassFields` -- neither is used in this codebase.

## State of the Art

| Old Approach                                                                | Current Approach                                | When Changed                | Impact                                                                                      |
| --------------------------------------------------------------------------- | ----------------------------------------------- | --------------------------- | ------------------------------------------------------------------------------------------- |
| `.eslintrc.js` / `.eslintrc.json`                                           | `eslint.config.mjs` (flat config)               | ESLint 9 (2024)             | Flat config is the only format in ESLint 10+. Must use flat config now.                     |
| `@typescript-eslint/parser` + `@typescript-eslint/eslint-plugin` (separate) | `typescript-eslint` (unified package)           | typescript-eslint v8 (2024) | Single import replaces two packages. `tseslint.configs.recommended` replaces manual config. |
| `tseslint.config(...)` helper                                               | `defineConfig(...)` from `eslint/config`        | ESLint 9.x (2025)           | `tseslint.config()` deprecated in favor of ESLint core's `defineConfig()`.                  |
| `env: { browser: true }` in eslintrc                                        | `globals.browser` from `globals` package        | ESLint 9 flat config        | `env` key doesn't exist in flat config; use `languageOptions.globals`.                      |
| Husky v4 JSON config in package.json                                        | Husky v9 `.husky/` directory with shell scripts | Husky v5+ (2021)            | Hooks are plain shell scripts in `.husky/` directory.                                       |
| `eslint-config-prettier` default import                                     | `eslint-config-prettier/flat` import            | eslint-config-prettier v10  | Use `/flat` suffix for flat config to get named config for config inspector.                |

**Deprecated/outdated:**

- `.eslintrc.*` files: Deprecated in ESLint 9, removed in ESLint 10. Use `eslint.config.mjs`.
- `eslint-plugin-prettier`: Not recommended by Prettier team. Use separate Prettier + `eslint-config-prettier` instead.
- `husky install` command: Replaced by `npx husky init` in Husky v9.
- `tseslint.config()`: Deprecated. Use `defineConfig()` from `eslint/config` or plain array export.

## Open Questions

1. **Netlify Functions TypeScript Handling**
   - What we know: `netlify/functions/gemini-upload.ts` imports `@netlify/functions` which IS an npm package (already in devDependencies as `@netlify/functions: ^5.1.0`). This should type-check fine. The EDGE function (`netlify/edge-functions/`) uses Deno-based `@netlify/edge-functions` which is NOT in npm.
   - What's unclear: Whether excluding edge functions from tsconfig is sufficient, or if we need a separate tsconfig for them.
   - Recommendation: Exclude `netlify/edge-functions` from the root `tsconfig.json`. The Netlify CLI handles building edge functions with its own TypeScript/Deno tooling. The regular Netlify function in `netlify/functions/` should work with the project tsconfig since `@netlify/functions` is in package.json.

2. **`eslint-plugin-react-hooks` v7 React Compiler Rules**
   - What we know: v7 includes React Compiler diagnostic rules in its recommended preset. This project uses React 18, which does not have the React Compiler.
   - What's unclear: Whether these compiler rules cause noise or false positives on React 18 projects.
   - Recommendation: Use the standard `recommended` preset. If compiler rules cause noise, they can be individually disabled. LOW risk since the compiler rules are designed to surface code patterns that are also beneficial without the compiler.

3. **Exact Version of `@google/genai`**
   - What we know: Currently pinned to `"latest"` in package.json, violating QUAL-05.
   - What's unclear: Exact version currently installed in node_modules.
   - Recommendation: Check `node_modules/@google/genai/package.json` for the installed version and pin to that exact version. This prevents silent upgrades.

## Sources

### Primary (HIGH confidence)

- [typescript-eslint.io/getting-started/](https://typescript-eslint.io/getting-started/) -- ESLint 9 + TypeScript setup, v8.54.0, installation commands
- [typescript-eslint.io/users/dependency-versions/](https://typescript-eslint.io/users/dependency-versions/) -- Confirmed ESLint support range: `^8.57.0 || ^9.0.0` (ESLint 10 NOT supported)
- [eslint.org/blog/2026/02/eslint-v10.0.0-released/](https://eslint.org/blog/2026/02/eslint-v10.0.0-released/) -- ESLint 10 breaking changes (confirmed eslintrc removal, Node.js requirements)
- [prettier.io/docs/install](https://prettier.io/docs/install) -- Prettier installation, `--save-exact` guidance, lint-staged integration
- [github.com/lint-staged/lint-staged](https://github.com/lint-staged/lint-staged) -- lint-staged configuration patterns
- [github.com/prettier/eslint-config-prettier](https://github.com/prettier/eslint-config-prettier) -- Flat config import: `eslint-config-prettier/flat`
- npm registry (direct fetch) -- Version verification: eslint 9.39.2/10.0.0, prettier 3.8.1, husky 9.1.7, lint-staged 16.2.7, typescript-eslint 8.54.0, eslint-plugin-react 7.37.5, eslint-plugin-react-hooks 7.0.1, eslint-plugin-jsx-a11y 6.10.2, eslint-config-prettier 10.1.8, prettier-plugin-tailwindcss 0.7.2, globals 17.3.0

### Secondary (MEDIUM confidence)

- [github.com/jsx-eslint/eslint-plugin-react](https://github.com/jsx-eslint/eslint-plugin-react) -- Flat config: `reactPlugin.configs.flat.recommended` and `reactPlugin.configs.flat['jsx-runtime']`
- [github.com/jsx-eslint/eslint-plugin-jsx-a11y](https://github.com/jsx-eslint/eslint-plugin-jsx-a11y) -- Flat config: `jsxA11y.flatConfigs.recommended`
- [react.dev/reference/eslint-plugin-react-hooks](https://react.dev/reference/eslint-plugin-react-hooks) -- React Hooks ESLint plugin official docs
- [tailwindcss.com/blog/automatic-class-sorting-with-prettier](https://tailwindcss.com/blog/automatic-class-sorting-with-prettier) -- Prettier Tailwind plugin setup
- [typicode.github.io/husky/get-started.html](https://typicode.github.io/husky/get-started.html) -- Husky v9 init command and setup
- [docs.github.com/en/actions/automating-builds-and-tests/building-and-testing-nodejs](https://docs.github.com/en/actions/automating-builds-and-tests/building-and-testing-nodejs) -- GitHub Actions Node.js workflow patterns

### Tertiary (LOW confidence)

- Various Medium/DEV.to articles on ESLint 9 flat config patterns -- used for cross-referencing, not as primary source

### Direct Codebase Analysis (HIGH confidence)

- Ran `tsc --strict --noUncheckedIndexedAccess --noEmit` on the actual codebase: exactly 2 errors found
- Examined all 10 source files (~1400 lines total) to assess migration complexity
- Verified Node.js v22.15.0 and npm v10.9.2 installed on development machine
- Current package.json uses `"type": "module"` -- ESM imports work natively, `eslint.config.mjs` is the correct extension

## Metadata

**Confidence breakdown:**

- Standard stack: HIGH -- All versions verified against npm registry on research date; ESLint 10 incompatibility confirmed via official typescript-eslint docs
- Architecture: HIGH -- All config patterns verified against official documentation; flat config examples from typescript-eslint.io and eslint.org
- Pitfalls: HIGH -- ESLint 10 timing confirmed; TypeScript strict errors counted from actual codebase run; .gitignore issue identified from actual file inspection

**Research date:** 2026-02-07
**Valid until:** 2026-03-07 (30 days -- stable ecosystem, but monitor typescript-eslint for ESLint 10 support announcement)
