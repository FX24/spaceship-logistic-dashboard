import { NextResponse } from "next/server";

// Natural-language orchestration endpoint.
// Implemented in step 5 (see _plan/05_ai_orchestration.md): runs the Claude
// tool-use loop, executes the chosen deterministic tool, and returns
// { answer, chartSpec, data, explainability }.
export async function POST() {
  return NextResponse.json(
    { error: "Not implemented yet (step 5 — AI orchestration)." },
    { status: 501 },
  );
}
