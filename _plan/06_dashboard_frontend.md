# Step 6 — Dashboard Frontend (KPIs + charts)

**Maps to grading:** Frontend (15%) + Product & UX (15%) = 30%.
**Depends on:** Step 3 (`GET /api/kpis`).
**Est. effort:** 2 hr.

---

## Concepts for a backend engineer (read this first)

Three ideas cover 90% of what you need; the rest is plumbing.

**1. A component is a function that returns HTML.** React UI is just functions (`components`) that
take inputs (`props`, like function arguments) and return markup. You compose them like you compose
functions. `<KpiCard title="On-time rate" value="92%" />` is calling a function with two props.

**2. Server vs Client components (Next.js App Router).** By default a component runs **on the server**
(it can query the DB directly, no API call, no JS shipped to the browser). If a component needs
**interactivity** (clicks, input, state) it must say `"use client"` at the top and runs in the browser.
- Your **dashboard page** can be a *server* component: it calls your KPI function directly and renders
  numbers. No `fetch`, no API round-trip needed. Simple and fast.
- Your **chat box** (step 7) must be a *client* component (it has an input and updating state).

**3. State = a variable React re-renders when it changes.** `const [x, setX] = useState(...)`. When
you call `setX(newValue)`, the component re-runs and the screen updates. That's the entire model.
The dashboard barely needs state; the chat page needs it for messages and loading.

**Charts:** Recharts is declarative — you hand a component an **array of objects** and tell it which
keys are the axes. No canvas drawing. Example:
```tsx
<LineChart data={rows}>            {/* rows = [{week:'W1', delayed:4}, ...] */}
  <XAxis dataKey="week" /><YAxis /><Tooltip />
  <Line dataKey="delayed" />
</LineChart>
```
If you can produce that array from SQL (you can — step 3 returns exactly this), you can render any chart.

---

## Goal

A clean descriptive dashboard: the 5 required KPIs as cards, plus ≥2 charts, fed by `/api/kpis`
(or a direct server-side call). This is the first thing a reviewer sees — make it legible, not fancy.

## Steps

1. **KPI cards** (`src/components/KpiCard.tsx`): total orders, delivered, delayed, on-time rate,
   avg delivery time. A simple grid of cards (shadcn `Card`).
2. **Charts** (pick ≥2 from brief §5.1), each a small wrapper around Recharts:
   - Order volume over time → **line**.
   - Delivery performance delayed vs on-time → **bar** (or stacked bar).
   - Carrier/destination breakdown → **bar**.
3. **Dashboard page** (`src/app/page.tsx`): a *server* component that calls the KPI function and
   passes data as props to the cards/charts. Lay out with Tailwind grid.
4. **Loading & empty states**: a skeleton/spinner and a "no data" fallback. Cheap UX points.
5. **Reuse the chart components in step 7** — the chat answers render the same `chartSpec`, so build
   one generic `<DynamicChart spec={...} data={...} />` here and reuse it.

## Key decisions

- **Dashboard reads data directly server-side** (no AI). KPIs are fixed; routing them through Claude
  would be slower and pointless. AI is only for the free-text chat.
- **One generic chart renderer** keyed by `chartSpec.type` so step 7 gets dynamic charts for free.
- **shadcn/ui for primitives** (Card, Button, Input) — copy-paste components, no heavy UI framework.

## Definition of done

- [ ] All 5 KPIs render with correct values matching the backend.
- [ ] ≥2 charts render from real data.
- [ ] Layout is responsive and readable; loading/empty states exist.
- [ ] `<DynamicChart>` exists and is reused (not duplicated) for step 7.
