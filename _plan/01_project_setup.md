# Step 1 — Project Setup & Scaffolding

**Maps to grading:** Backend & Architecture (20%) — clean structure is the foundation.
**Depends on:** nothing.
**Est. effort:** 30–45 min.

## Goal

A running, empty Next.js + TypeScript app with the folder structure from CLAUDE.md §9, all
dependencies installed, and env wiring in place. No features yet — just a skeleton that boots.

## Steps

1. Scaffold: `npx create-next-app@latest` — choose **TypeScript, App Router, Tailwind, ESLint**,
   `src/` directory, import alias `@/*`.
2. Add dependencies:
   - `better-sqlite3` (synchronous SQLite driver — simplest for a seed + read-only app)
   - `zod` (validation)
   - `@anthropic-ai/sdk` (Claude)
   - `recharts` (charts)
   - shadcn/ui init (`npx shadcn@latest init`) — pulls in a few primitives only as needed.
3. Create the folder skeleton (empty files/index stubs) per CLAUDE.md §9:
   ```
   data/                     # dataset + seed.ts (added in step 2)
   src/lib/db/               # connection.ts, queryBuilder.ts
   src/lib/tools/            # queryAnalytics.ts, forecastDemand.ts
   src/lib/forecast/         # methods.ts
   src/lib/ai/               # tools.ts (definitions), systemPrompt.ts, router.ts
   src/lib/schemas/          # zod schemas
   src/components/           # dashboard + chart + explainability components
   src/app/api/chat/route.ts # NL endpoint
   src/app/api/kpis/route.ts # dashboard data endpoint
   ```
4. Env wiring: create `.env.local` with `ANTHROPIC_API_KEY=...` and add `.env.local` to
   `.gitignore` (create-next-app already gitignores it — verify). Document the var in README later.
5. Sanity check: `npm run dev` boots to the default page.

## Key decisions

- **`better-sqlite3` over an ORM (Prisma/Drizzle):** the app is read-only with a handful of queries.
  An ORM is over-engineering here; raw parameterized SQL is clearer and the brief rewards simplicity.
- **No state library, no tRPC, no auth.** Plain `fetch` to a couple of API routes is enough.

## Definition of done

- [ ] `npm run dev` serves the default page with no errors.
- [ ] Folder skeleton exists matching CLAUDE.md §9.
- [ ] `ANTHROPIC_API_KEY` reads from `.env.local`; secret is gitignored.
- [ ] `package.json` scripts stubbed: `dev`, `build`, `start`, `seed` (seed added in step 2).
