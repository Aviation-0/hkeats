import { NextRequest, NextResponse } from "next/server";
// @ts-ignore
import { performDailySync } from "@/lib/fehd-sync.mjs";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const force = searchParams.get("force") === "true";

    const result = await performDailySync(force);
    return NextResponse.json(result);
  } catch (error: any) {
    console.error("Manual / Scheduled Sync Error:", error);
    return NextResponse.json(
      { error: "Sync failed", details: error?.message },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  return GET(request);
}
