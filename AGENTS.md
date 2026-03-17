# Repository Guidelines

## Project Structure & Module Organization
This repository is a Next.js App Router project.

- `app/`: application routes, layout, page components, and global styles (`globals.css`).
- `public/`: static assets served from `/` (SVGs, icons, images).
- Root config files: `next.config.ts`, `tsconfig.json`, `eslint.config.mjs`, `postcss.config.mjs`.

Keep new UI routes and related components close to their route in `app/`. Put reusable static assets in `public/` and reference them with absolute paths like `/logo.svg`.

## Build, Test, and Development Commands
- `npm install`: install dependencies.
- `npm run dev`: start local dev server (default `http://localhost:3000`).
- `npm run build`: create production build.
- `npm run start`: run the production server from the build output.
- `npm run lint`: run ESLint (Next.js + TypeScript rules).

Use `npm run lint && npm run build` before opening a PR to catch type/lint/build regressions.

## Coding Style & Naming Conventions
- Language: TypeScript (`.ts`/`.tsx`) with `strict` mode enabled.
- Indentation: 2 spaces; prefer double quotes to match existing files.
- Components: `PascalCase` for component names; hooks/utilities in `camelCase`.
- Routes: use lowercase folder names under `app/` (for example `app/settings/page.tsx`).
- Styling: Tailwind v4 utility classes and theme tokens from `app/globals.css`.

Run `npm run lint` after edits; keep imports minimal and remove dead code.

## Testing Guidelines
No automated test framework is configured yet in this snapshot. Minimum validation for contributions:

1. `npm run lint` passes.
2. `npm run build` passes.
3. Manual smoke test in `npm run dev` for changed routes/components.

When adding tests, prefer colocated `*.test.ts(x)` files and document new test commands in `package.json`.

## Commit & Pull Request Guidelines
Git history is not available in this checkout, so follow Conventional Commits as the baseline:

- `feat: add 3x3 grid input validation`
- `fix: correct row sum calculation`
- `chore: update Next.js config`

PRs should include:
- clear summary of behavior changes,
- linked issue/task (if available),
- screenshots or short recordings for UI updates,
- validation notes (lint/build/manual test results).
