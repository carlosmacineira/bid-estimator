import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const settings = await prisma.settings.upsert({
      where: { id: "default" },
      update: {},
      create: { id: "default" },
    });
    return NextResponse.json(settings);
  } catch (error) {
    console.error("Settings GET error:", error);
    return NextResponse.json(
      { error: "Failed to fetch settings" },
      { status: 500 }
    );
  }
}

export async function PUT(request: Request) {
  try {
    const body = await request.json();

    if (!body || typeof body !== "object") {
      return NextResponse.json(
        { error: "Invalid request body" },
        { status: 400 }
      );
    }

    // Only allow known fields to be updated (prevents passing `id` or unknown fields to Prisma)
    const allowedFields: Record<string, "string" | "number"> = {
      companyName: "string",
      address: "string",
      phone: "string",
      license: "string",
      email: "string",
      website: "string",
      defaultLaborRate: "number",
      defaultOverhead: "number",
      defaultProfit: "number",
      taxRate: "number",
      anthropicApiKey: "string",
      defaultTerms: "string",
    };

    const data: Record<string, string | number> = {};
    for (const [key, expectedType] of Object.entries(allowedFields)) {
      if (key in body) {
        if (expectedType === "number") {
          data[key] = Number(body[key]) || 0;
        } else {
          data[key] = String(body[key] ?? "");
        }
      }
    }

    const settings = await prisma.settings.update({
      where: { id: "default" },
      data,
    });
    return NextResponse.json(settings);
  } catch (error) {
    console.error("Settings PUT error:", error);
    return NextResponse.json(
      { error: "Failed to update settings" },
      { status: 500 }
    );
  }
}
