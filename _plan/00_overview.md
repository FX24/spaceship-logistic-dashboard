# Build Plan — Overview & Roadmap

This folder breaks the assignment into **9 sequential steps**, each in its own file. Build them
top-to-bottom; each step lists what it depends on. The plans are written for a **backend engineer**:
backend/data steps are terse, while the **frontend** and **AI** steps include a
"Concepts for a backend engineer" section that explains the unfamiliar parts from first principles.

## The mental model (one sentence)

> It's a normal backend service — deterministic functions over a SQL database — with **two unusual
> clients**: a React dashboard, and an LLM that calls your functions via structured JSON instead of HTTP.

If you think of the AI as *"a client that picks which of my functions to call and fills in the
arguments,"* the whole thing collapses into familiar territory. You still own the data, the queries,
and the math. The LLM never computes anything.

## The data flow (memorize this)

```
                                 ┌─────────────────────────────────────────┐
   Browser (React)               │              Next.js server             │
   ┌───────────────┐             │  ┌───────────────┐   ┌────────────────┐ │
   │ Dashboard      │──fetch────▶│  │ /api routes    │──▶│ tools (TS):    │ │
   │ Chat box       │            │  │ + AI router    │   │ query_analytics│ │
   │ Charts         │◀──JSON─────│  │ (Claude)       │   │ forecast_demand│ │
   └───────────────┘             │  └───────────────┘   └───────┬────────┘ │
                                 │                              │          │
                                 │                      parameterized SQL  │
                                 │                              ▼          │
                                 │                       ┌────────────┐    │
                                 │                       │ SQLite DB  │    │
                                 │                       └────────────┘    │
                                 └─────────────────────────────────────────┘
```

Two entry paths hit the **same** deterministic tools:
- **Dashboard** calls the tools directly (no AI needed — the KPIs are fixed).
- **Chat** sends the user's text to Claude, which *chooses a tool and fills its arguments*; your
  code validates those args and runs the exact same tool.

This is the key architectural insight: **the AI is just a router in front of functions you already
have.** Build the functions first, bolt the AI on after.

## The steps

| # | Step | File | Your comfort | Grading weight touched |
|---|------|------|--------------|------------------------|
| 1 | Project setup & scaffolding | `01_project_setup.md` | High | Backend/Arch (20%) |
| 2 | Data layer (schema, seed, definitions) | `02_data_layer.md` | High | **Data correctness (20%)** |
| 3 | Analytics backend (`query_analytics`) | `03_analytics_backend.md` | High | Data + Backend (40%) |
| 4 | Forecasting backend (`forecast_demand`) | `04_forecasting_backend.md` | Med | Forecasting (10%) |
| 5 | AI orchestration (Claude tool-use) | `05_ai_orchestration.md` | **Low → taught** | AI (15%) |
| 6 | Dashboard frontend (KPIs + charts) | `06_dashboard_frontend.md` | **Low → taught** | Frontend + UX (30%) |
| 7 | Chat UI + dynamic charts + explainability | `07_nl_chat_frontend.md` | **Low → taught** | Frontend + AI + UX |
| 8 | Deployment (Vercel) | `08_deployment.md` | Med | Deployment (5%) |
| 9 | README & docs | `09_readme_docs.md` | High | (required deliverable) |

## Recommended build order & why

1–4 first (**pure backend you're comfortable with**) — this gets correct numbers flowing before any
AI or UI exists. You can unit-test the tools from the command line. Then 5 (wire the AI router on top
of working tools), then 6–7 (UI), then 8–9 (ship + write up). Front-load the 40% that is data +
backend; that's your strength and the biggest grade chunk.

## Stack decisions locked for these plans

- **Next.js (App Router) + TypeScript** — one deployable (UI + API) on Vercel.
- **SQLite** (via `better-sqlite3`) — real SQL, single file, zero external service. The brief says
  *"don't over-engineer"*; SQLite gives you correct `GROUP BY` / `DATE` bucketing without a DB server.
- **Recharts** for charts, **Tailwind + shadcn/ui** for UI, **Zod** for validation.
- **Anthropic Claude** with **tool use** for the chat router (default `claude-sonnet-4-6`; verify the
  model id with the `claude-api` skill at build time).

## Open items to confirm before step 2

- The **dataset is not in the repo yet** (`data/` is empty). Step 2's schema is written against the
  *expected* logistics columns and will be adjusted to the real file once it lands.
- Final call on **SQLite vs Postgres** — plans assume SQLite; swappable with ~1 file of change.
