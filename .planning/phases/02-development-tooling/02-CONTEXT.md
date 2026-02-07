# Phase 2: Development Tooling - Context

**Gathered:** 2026-02-07
**Status:** Ready for planning

<domain>
## Phase Boundary

Set up ESLint, Prettier, pre-commit hooks, TypeScript strict mode, and CI pipeline. The goal is a development environment that catches errors automatically and keeps code consistent. This phase does NOT add features or change app behavior.

</domain>

<decisions>
## Implementation Decisions

### Formatting & code style

- Industry-standard defaults for React/TypeScript projects
- 2-space indentation, single quotes, semicolons, 80-char line width
- Prettier with Tailwind plugin for consistent formatting
- Trailing commas in multi-line (ES5 style)

### Editor integration

- User uses Cursor (VS Code-based)
- Include `.vscode/settings.json` with format-on-save and ESLint auto-fix on save
- Extensions recommendations for ESLint and Prettier

### Pre-commit behavior

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

</decisions>

<specifics>
## Specific Ideas

- User is not a developer — tooling should "just work" with minimal manual intervention
- Best practices over customization — don't overthink or overengineer
- Auto-fix on save is important for the workflow (catch issues immediately, not at commit time)

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

_Phase: 02-development-tooling_
_Context gathered: 2026-02-07_
