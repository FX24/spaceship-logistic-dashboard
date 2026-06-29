import { NextResponse } from "next/server";
import { getDashboardData } from "@/lib/tools/kpis";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const data = getDashboardData();
    return NextResponse.json(data);
  } catch (err) {
    console.error("[/api/kpis]", err);
    return NextResponse.json(
      { error: "Failed to compute dashboard data." },
      { status: 500 },
    );
  }
}
