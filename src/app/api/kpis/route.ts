import { NextResponse } from "next/server";

// Dashboard KPI + chart-data endpoint.
// Implemented in step 3 (see _plan/03_analytics_backend.md): returns the five
// required KPIs and the dashboard chart datasets from deterministic SQL.
export async function GET() {
  return NextResponse.json(
    { error: "Not implemented yet (step 3 — query_analytics / KPIs)." },
    { status: 501 },
  );
}
