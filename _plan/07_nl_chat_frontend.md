# Step 7 — Chat UI + Dynamic Charts + Explainability

**Maps to grading:** Frontend (15%) + AI Orchestration (15%) + Product & UX (15%).
**Depends on:** Step 5 (`POST /api/chat`), Step 6 (`<DynamicChart>`).
**Est. effort:** 2–2.5 hr.

---

## Concepts for a backend engineer (read this first)

This page is one **client** component (`"use client"`) with a tiny bit of state. The whole loop:

```tsx
const [messages, setMessages] = useState([]);   // chat history
const [loading, setLoading] = useState(false);

async function ask(question) {
  setLoading(true);
  const res  = await fetch('/api/chat', { method:'POST', body: JSON.stringify({ question }) });
  const data = await res.json();                 // { answer, chartSpec, rows, explainability }
  setMessages(m => [...m, { question, ...data }]);  // append → React re-renders the list
  setLoading(false);
}
```

That's the entire frontend "AI" surface: **POST text, get JSON, render it.** No streaming required
(nice-to-have). The intelligence lives server-side in step 5. You render three things from the JSON:
the **answer sentence**, a **chart** (reuse `<DynamicChart>`), and an **explainability panel**.

The only React idea beyond step 6 is `useState` for the message list and the loading flag — append
to the array, React redraws. Same pattern you'd use for any "submit form → show result" page.

---

## Goal

A natural-language box where a user asks a question and gets back: a direct answer, an
auto-selected chart, and an explainability panel — fulfilling brief §4.2, §4.3, §4.4.

## Steps

1. **Chat panel** (`src/components/Chat.tsx`, client component): input + send button + a scrolling
   list of Q→A turns. Show a loading indicator while awaiting `/api/chat`.
2. **Render the answer**: the sentence Claude produced (round 2 of step 5).
3. **Dynamic chart**: pass the response's `chartSpec` + `rows` into the **same `<DynamicChart>`** from
   step 6. The chart type was already chosen server-side (time→line, category→bar, share→pie), so the
   UI just renders whatever spec it's handed. *This is the "dynamic chart generation" requirement.*
4. **Explainability panel** (`src/components/Explainability.tsx`) — **required for every answer**
   (brief §4.4, worth real points). Collapsible, showing:
   - **Filters used** (e.g. resolved time range).
   - **Metric & dimensions** involved.
   - **Query plan** — the validated tool args + the SQL/params from `queryPlan`.
   - **Underlying data** — a small table of the returned rows the user can inspect.
   This panel is the strongest visual proof that the AI isn't hallucinating numbers — make it obvious.
5. **Example prompts**: render 3–4 clickable sample questions (the brief's examples) so a reviewer
   can try it instantly without thinking of a query. Big UX win for graders.
6. **Graceful failure**: if the API returns an "unsupported/ambiguous" result, show what was understood
   and what *is* supported — don't show a broken chart.

## Key decisions

- **No streaming** for v1 — a loading spinner + final render is enough and simpler. Streaming is a
  bonus polish item if time remains.
- **Explainability is built from the response payload**, not re-derived in the UI — the server already
  returns `queryPlan`/filters/rows (steps 3 & 5). The panel just displays them.
- **Reuse `<DynamicChart>`** — dashboard and chat share one renderer.

## Definition of done

- [ ] Asking each sample question returns answer + correct chart + populated explainability panel.
- [ ] Chart type auto-varies by question (line vs bar vs pie) with no UI code change.
- [ ] Explainability shows filters, metric/dimensions, query plan, and an inspectable data table.
- [ ] Forecasting question renders the history+forecast chart and the inventory recommendation.
- [ ] Unsupported question shows a graceful, honest message.
