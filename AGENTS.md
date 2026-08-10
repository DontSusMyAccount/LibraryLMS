# LibraryLMS — Monorepo Conventions

## Commit Workflow

- Use `git-cz` (conventional commits) for every commit; non-interactive:
  `git-cz --non-interactive --type=<type> --scope=<scope> --subject="<summary>"`
- Valid types (lowercase): feat, fix, docs, chore, refactor, test, style, ci, perf, build, revert
- Never commit `.env*` files. Never push commits — the user pushes manually.
- Branch naming: `<type>/<short-description>`.

## Architecture

- Hexagonal: `app/` = Next.js frontend, `server/` = ElysiaJS backend (Bun),
  `server/src/infrastructure/database/schema/` = Drizzle schema.
- `@libsys/shared` alias points to `server/src/shared.ts` (shared types/contracts).

## Code Conventions

- UI text is in Thai (user-facing strings).
- Icons: `lucide-react` only — never hand-authored `<svg>`.
- No `any` — use strict TypeScript.

## Config Tasks

- `package.json` owns ALL dependencies; later tasks must not add deps except Tailwind refinement (Task 12).
