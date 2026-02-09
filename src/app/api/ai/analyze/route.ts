import { NextResponse } from "next/server";
import { analyzePlans } from "@/lib/ai/analyze-plans";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { projectId, documentIds } = body;

    if (!projectId || !Array.isArray(documentIds) || documentIds.length === 0) {
      return NextResponse.json(
        { error: "projectId and documentIds[] are required" },
        { status: 400 }
      );
    }

    const result = await analyzePlans(projectId, documentIds);

    return NextResponse.json(result);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "AI analysis failed";
    console.error("AI analysis error:", error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
