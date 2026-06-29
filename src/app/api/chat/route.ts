import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { chat } from "@/lib/ai/router";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  let question: string;
  try {
    const body = (await req.json()) as { question?: unknown };
    question = typeof body.question === "string" ? body.question.trim() : "";
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  if (!question) {
    return NextResponse.json({ error: "question is required." }, { status: 400 });
  }

  try {
    const result = await chat(question);
    return NextResponse.json(result);
  } catch (err) {
    console.error("[/api/chat]", err);
    const message = err instanceof Error ? err.message : "Internal server error.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
