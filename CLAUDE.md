# CLAUDE.md

Guidance for Claude Code (and humans) working in this repository.

## 1. What we are building

An **AI-powered logistics analytics dashboard** for a logistics client. One web app, one
unified dataset, three levels of intelligence:

1. **Descriptive** — a traditional dashboard (KPIs + charts).
2. **Diagnostic** — a natural-language interface that answers business questions *from the data*.
3. **Predictive/Prescriptive** — demand forecasting with an inventory recommendation.

This is a take-home assignment scoped to **6–10 hours of effort**. The graders value
**clarity, correctness, and reasoning over completeness and polish**. Do **not** over-engineer.
The full brief is in `Coding_assignment.docx`.

## 2. The one principle that drives the architecture

> **The AI layer routes and orchestrates. It is never the source of truth.**

The AI interprets the question, picks the right tool, and presents the result. **All numbers
come from deterministic computation over the dataset — never from the model.** If the AI ever
returns a figure it did not get back from a tool, that is a bug.

Concretely:
- **Do not** execute raw AI-generated SQL. The model emits **structured, validated parameters**
  (metric, dimensions, filters, time range); our code turns those into a parameterized query.
- Keep three layers cleanly separated: **AI interpretation** → **data computation** → **business logic / presentation**.
- Treat all data as **read-only**.

## 3. System flow

```
User question
  → AI interpretation (Claude tool-use: choose tool + structured args)
  → Tool selection (query_analytics | forecast_demand)
  → Validate args (Zod schema)
  → Deterministic computation (parameterized SQL / forecasting in code)
  → Result + explainability metadata
  → Render: direct answer, chart, and "how this was computed" panel
```

## 4. Recommended stack (chosen for fast, stable deployment)

The brief allows any stack. We commit to one cohesive, single-deployable choice:

- **Framework:** Next.js (App Router) + **TypeScript** — frontend and API routes in one Vercel deploy.
- **UI:** Tailwind CSS + shadcn/ui.
- **Charts:** Recharts.
- **Data:** Postgres (Neon / Vercel Postgres). SQLite is an acceptable simpler alternative if the
  dataset is small and we want zero external services. Load the provided dataset once via a seed script.
- **AI orchestration:** Anthropic Claude with **tool use (function calling)**. Default model
  `claude-sonnet-4-6` for routing (fast + capable + cost-effective); escalate to `claude-opus-4-8`
  only if routing quality demands it. Verify model IDs and API details against the `claude-api` skill
  rather than from memory.
- **Validation:** Zod for every tool's input/output.
- **Deploy:** Vercel (publicly accessible URL, no local setup required to use it).

Keep dependencies minimal — every addition should earn its place.

## 5. Core requirements (the grading checklist)

### 5.1 Dashboard — Descriptive
KPIs (minimum): total orders, delivered orders, delayed orders, **on-time delivery rate**,
**average delivery time**.
Charts (≥2 of): order volume over time, delivery performance (delayed vs on-time),
carrier/destination breakdown.

### 5.2 Natural-language queries — Diagnostic
Support questions like:
- "Show delayed orders by week for the last 3 months"
- "Which carrier has the highest delay rate?"
- "How many orders were delivered late last month?"

Each answer returns **a direct answer, a chart, or both**, plus explainability (§7).

### 5.3 Dynamic chart generation
The system auto-selects an appropriate chart type and renders it dynamically for the supported
query subset. Time series → line; categorical breakdown → bar; share/proportion → bar or pie.

### 5.4 Forecasting — Predictive/Prescriptive
Tool answers "predict demand for SKU X for the next N months" / "how much inventory should I plan?".
Requirements:
- Use **historical dataset data** only.
- Apply a **basic** method: moving average, linear regression, exponential smoothing, or simple trend.
- Return: forecast values, a **historical + forecast** visualization, an **inventory recommendation**,
  and a plain-language **explanation of the methodology**.

## 6. Required analytical tools (AI tool definitions)

**A. `query_analytics`** — dashboard queries, aggregations, KPI calculations.
Structured input: `{ metric, dimensions[], filters[], timeRange, granularity }`.
Output: rows + chart spec + the resolved query plan.

**B. `forecast_demand`** — future demand prediction.
Structured input: `{ target (e.g. SKU/series), horizon, method }`.
Output: historical series, forecast series, inventory recommendation, methodology note.

The model's only job is to choose the tool and fill these args. Our code does the math.

## 7. Explainability (required for every answer/chart)

Always surface:
- **Filters used** (e.g. time range).
- **Metrics and dimensions** involved.
- The **query plan / structured interpretation** (the validated tool args).
- **Access to underlying data** (a table or summary the user can inspect).

Build this into the response payload from day one — it is 15% of orchestration grading and the
clearest signal that the AI is not hallucinating numbers.

## 8. Data handling

- Load the **provided dataset** (place under `data/`, seed into the DB once).
- **Read-only** — no mutations from the app.
- Get **aggregation and filtering correct**; this is 20% of the grade. Watch timezones, date
  boundaries ("last month"), null/late-delivery definitions, and on-time vs delayed logic.
- Define and document the rule for "delayed" (e.g. `delivered_at > promised_at`) in one place.

## 9. Proposed project structure

```
data/                     # provided dataset + seed script (read-only source)
src/
  app/                    # Next.js routes (dashboard UI + /api endpoints)
  app/api/chat/           # NL endpoint: orchestration entrypoint
  lib/ai/                 # tool definitions, system prompt, router
  lib/tools/              # query_analytics, forecast_demand (deterministic)
  lib/db/                 # connection, parameterized query builders
  lib/forecast/           # moving average / linear regression, etc.
  lib/schemas/            # Zod schemas for tool I/O
  components/             # dashboard, charts, explainability panel
```

## 10. Commands

_No code exists yet. Fill in actual commands as they are created._ Expected shape:
- `npm run dev` — local dev server
- `npm run seed` — load the provided dataset into the DB
- `npm run build` / `npm start` — production build/serve
- `npm test` — tests (bonus, but worth it for forecasting/aggregation correctness)

## 11. Conventions & guardrails

- **Never** let the model run SQL it wrote. Structured args → validated → parameterized query only.
- Validate **every** tool input and output with Zod; reject and re-prompt on invalid args.
- **Never commit secrets.** API keys/DB URLs go in `.env.local` (gitignored); document required
  env vars in the README. Provide test credentials in the README if auth is added.
- Disclose AI usage honestly in the README — undisclosed AI usage is penalized.
- Prefer **simple, correct** solutions; explain tradeoffs rather than hiding them.
- Handle ambiguous/unsupported queries gracefully: say what was understood, what is supported.

## 12. Deliverables

1. Source code repository.
2. **Live deployed app URL** — fully usable without local setup, stable for reviewers.
3. `README.md` covering: setup (local steps + env vars), architecture (overview, key design
   decisions, data flow), AI approach (how questions are interpreted, how tools are selected),
   assumptions/simplifications, limitations (unsupported queries), and future improvements.

## 13. Evaluation weights (where to spend effort)

| Area | Weight |
|---|---|
| Data correctness | 20% |
| Backend & architecture | 20% |
| Product & UX | 15% |
| Frontend | 15% |
| AI orchestration | 15% |
| Forecasting | 10% |
| Deployment | 5% |

Correctness + backend/architecture together are 40% — protect them first.

## 14. Bonus (only if core is solid)

Query history, caching, tests, Docker setup, advanced explainability, ambiguous-query handling.
