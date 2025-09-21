# Repository Guidelines

## Project Structure & Module Organization
- `src/` — application code.
  - `api/` HTTP wrappers; `router/` routes in `src/router/routes.js` and setup in `src/router/index.js`.
  - `components/` reusable Vue components; `pages/` routed views (e.g., `pages/tools/gacha-calc.vue`, `pages/home/index.page.vue`).
  - `assets/` styles and images; `static/json/` large game/data payloads.
- `docs/` — documentation SPA mounted via `docs.html` (router redirects `/docs/*` to it).
- `public/` — static assets copied as‑is.
- `server.js` — simple Express static server for `dist/`.
- `vite.config.js` — Vite config (multi‑page build: `index.html`, `docs.html`; alias `@ -> src`).

## Build, Test, and Development Commands
- `npm run dev` — start Vite dev server on `0.0.0.0:4000`.
- `npm run build` — production build to `dist/` (app + docs).
- `npm run preview` — preview the built app locally.
- `npm run server` — serve `dist/` via Express on port 4000. Stop any dev server first.

## Coding Style & Naming Conventions
- Formatting is enforced by Prettier (`.prettierrc`): 2‑space indent, semicolons, double quotes, trailing commas (ES5), print width 160.
- Vue SFCs: use PascalCase for components (e.g., `UserInfo.vue`). For routed pages, prefer feature directories and the existing patterns: `<feature>/<name>.vue` or `<feature>/<name>.page.vue`.
- Imports: absolute from project root (e.g., `/src/utils/...`) or `@/utils/...`; keep one style consistent within a file.

## Testing Guidelines
- No test runner is configured yet. When adding tests, prefer Vitest + Vue Test Utils.
- Name tests `*.spec.js` and colocate with the unit under test or use `src/__tests__/`.
- Include at least a render smoke test for new components.

## Commit & Pull Request Guidelines
- Follow `type(scope): message` (see `GitHub提交格式.md`). Example: `fix(攒抽计算器): 每月黄票兑换月份错误`.
- PRs: concise description, linked issues (e.g., `#123`), screenshots/GIFs for UI changes, and docs updates (`docs-md/` or `docs/pages/`) when applicable.
- Keep diffs focused; run Prettier and ensure `npm run build` succeeds before opening a PR. If adding routes, update `src/router/routes.js` and verify `LinkedTable` entries.

## Security & Configuration Tips
- Never commit secrets or tokens. Large JSON under `src/static/json/` feeds views; validate format before changes.
- `vite.config.js` exposes multi‑page build; avoid ad‑hoc HTML entrypoints.
