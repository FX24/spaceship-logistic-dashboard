# Step 8 — Deployment (Vercel)

**Maps to grading:** Deployment (5%) — small weight, but a broken/missing URL caps everything else.
**Depends on:** a working app (steps 1–7).
**Est. effort:** 45 min–1 hr.

## Goal

A publicly accessible, stable URL that works with **zero local setup** for reviewers (brief §6).

## The one real gotcha: SQLite on Vercel

Vercel's serverless filesystem is **read-only and ephemeral** except the build output. So:

- **Commit the seeded `app.db` file** (or seed it during build) and read it **read-only** at runtime
  from the bundled path. Since the app never writes, a read-only bundled SQLite file works fine.
- Ensure `better-sqlite3` (native module) builds on Vercel — it usually does; if it fights you,
  the fallback is **Vercel Postgres / Neon** (swap `connection.ts` only). Decide early if you want to
  avoid native-module risk.

> If native-module or read-only-FS issues eat time, switch the data layer to Neon Postgres. The query
> builder (step 3) is DB-agnostic enough that only `connection.ts` and the SQL dialect change.

## Steps

1. Push repo to GitHub (private is fine; add reviewer if required).
2. Import into Vercel; framework auto-detected (Next.js).
3. Set env var **`ANTHROPIC_API_KEY`** in Vercel project settings (never commit it).
4. Ensure the DB is available in the deployment: commit the prebuilt `app.db`, **or** run `npm run
   seed` as part of the build with the dataset committed under `data/`.
5. Deploy. Open the URL in a clean browser (no extensions/login) to confirm zero-setup usability.
6. Smoke test on the live URL: dashboard loads, each sample question works, forecasting works.

## Definition of done

- [ ] Public URL loads the dashboard with real data.
- [ ] Chat + forecasting work on the deployed URL (API key wired, DB readable).
- [ ] No secrets in the repo; `ANTHROPIC_API_KEY` set only in Vercel.
- [ ] Verified in a fresh browser session — no local setup needed.
