# Step 9 — README & Docs

**Maps to grading:** required deliverable; underpins Product/UX and Architecture scoring. The README
is how graders understand your reasoning — the brief values **clarity and reasoning** above polish.
**Depends on:** everything (write last, but keep notes as you go).
**Est. effort:** 1 hr.

## Goal

A `README.md` that lets a reviewer run it locally, understand the architecture, and trust the AI
isn't making up numbers — matching the required sections in brief §11.

## Required sections (brief §11)

1. **Setup**
   - Local steps: `npm install` → `npm run seed` → `npm run dev`.
   - Env vars: `ANTHROPIC_API_KEY` (and DB URL if Postgres). How to get/set them.
   - The **live deployed URL** at the very top.
2. **Architecture**
   - System overview + the data-flow diagram (reuse `_plan/00_overview.md`).
   - **Key design decisions** with tradeoffs: SQLite choice, whitelisted query builder, 2-tool design,
     server vs client components, no streaming. State *why*, not just *what*.
3. **AI Approach** (this is where you show the §2 principle landed)
   - How questions are **interpreted** (tool-use loop, structured args).
   - How tools are **selected** (descriptions + system prompt).
   - **Explicitly state: all numbers come from deterministic SQL/forecasting; the model never computes.**
4. **Data correctness notes** — your definitions of "delayed", "on-time rate", "last month",
   timezone handling. This signals to the 20% data-correctness grader that the edge cases were considered.
5. **Assumptions & simplifications** — e.g. single dataset, UTC, monthly forecast buckets, safety-stock
   formula assumptions.
6. **Limitations** — unsupported query types, what the chat will decline, forecasting caveats.
7. **Future improvements** — streaming, query history, caching, more tools, auth, richer forecasting.
8. **AI usage disclosure** — honest note that Claude Code assisted development (brief §15 penalizes
   undisclosed AI usage).

## Definition of done

- [ ] All 8 sections present; live URL at the top.
- [ ] A reviewer could clone, set the key, seed, and run in <5 min following the README.
- [ ] Design decisions explain tradeoffs, not just choices.
- [ ] Data definitions and AI-not-source-of-truth principle are stated explicitly.
- [ ] AI usage disclosed.
