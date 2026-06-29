# Step 5 — AI Orchestration (Claude tool-use)

**Maps to grading:** AI Orchestration (15%).
**Depends on:** Steps 3 & 4 (the tools must already work standalone).
**Est. effort:** 2 hr.

---

## Concepts for a backend engineer (read this first)

You already understand this — you just don't know it's this simple yet. **"Tool use" (a.k.a.
function calling) is RPC where the LLM is the caller.** Here's the entire idea:

1. You give Claude a **menu of functions** — name, description, and a **JSON Schema** for each
   function's arguments. (Your two tools: `query_analytics`, `forecast_demand`.)
2. You send the user's sentence: *"Which carrier has the highest delay rate?"*
3. Claude does **not** answer. It replies with a structured message: *"call `query_analytics` with
   `{metric:'on_time_rate', dimensions:['carrier'], ...}`"* — just **JSON arguments**, no prose, no SQL.
4. **Your code** validates that JSON (Zod), runs your real function (which runs parameterized SQL),
   and gets back real numbers.
5. You send those numbers **back to Claude** in a second request, and now it writes the
   human-friendly sentence: *"FedEx has the highest delay rate at 12.4%."*

That's it. The LLM is a **parser + presenter** bolted onto functions you already built and tested.
It never touches the database and never invents a number. If you've written an API gateway that
routes a request to a handler, you've built the same shape — the only new part is that the "router"
is a language model and the "request schema" is JSON Schema instead of OpenAPI.

```
user text ──▶ Claude(round 1) ──▶ {tool, args}  ──▶ Zod validate ──▶ your tool ──▶ SQL ──▶ rows
                                                                                          │
   final sentence ◀── Claude(round 2) ◀────────────────── rows + result ◀────────────────┘
```

Why this satisfies the brief: the model **selects the computation path and presents results** but
**all numbers come from your deterministic tools** (CLAUDE.md §2). The two-round loop is the
"orchestration" being graded.

---

## Goal

An `/api/chat` endpoint that takes a user question, runs the tool-use loop with Claude, executes the
chosen deterministic tool, and returns `{ answer, chartSpec, data, explainability }`.

## Steps

1. **Declare the tools to Claude** (`src/lib/ai/tools.ts`): for each tool, a `name`, a precise
   `description` (this is what Claude uses to choose — write it carefully), and an `input_schema`
   (JSON Schema mirroring the Zod schema). Generate the JSON Schema from Zod so they can't drift.
2. **System prompt** (`src/lib/ai/systemPrompt.ts`): state the assistant's job — pick exactly one
   tool, never compute or guess numbers, ask for clarification if the question is unsupported. List
   what the dataset can answer so it doesn't hallucinate capabilities.
3. **Router** (`src/lib/ai/router.ts`): the loop —
   a. send system prompt + tools + user message;
   b. if Claude returns a `tool_use` block → **Zod-validate the args** → run the matching tool;
   c. send the tool result back as a `tool_result`;
   d. return Claude's final text **plus** the structured result (chartSpec, rows, queryPlan).
4. **Validation gate**: if Zod rejects the args, return the error to Claude and let it retry once;
   if it still fails, return a graceful "I understood X but can't answer Y" (brief §11, §14).
5. **Endpoint** `POST /api/chat` returns the full payload the frontend needs (step 7).
6. **Model**: default `claude-sonnet-4-6` (fast, cheap, capable enough to pick between two tools).
   **Confirm the exact model id and SDK call shape with the `claude-api` skill — do not hardcode from
   memory.** Escalate to `claude-opus-4-8` only if routing is unreliable.

## Key decisions

- **Single source of schema truth**: Zod schema → derive JSON Schema for Claude. One definition,
  validated on the way in, advertised to the model.
- **The model never sees SQL and never returns SQL.** It returns args; the builder (step 3) owns SQL.
- **Keep it to 2 tools.** More tools = more routing errors for marginal benefit on a take-home.

## Definition of done

- [ ] The 3 sample questions (CLAUDE.md §5.2) each route to the right tool and return correct numbers.
- [ ] A forecasting question ("predict demand for SKU X for 4 months") routes to `forecast_demand`.
- [ ] Invalid/ambiguous input degrades gracefully with a clear message, no crash, no fake numbers.
- [ ] Response payload includes the structured `queryPlan` for explainability (step 7 renders it).
