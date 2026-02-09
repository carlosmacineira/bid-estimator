import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const lineItems = await prisma.lineItem.findMany({
      where: { projectId: id },
      orderBy: { sortOrder: "asc" },
    });

    return NextResponse.json(lineItems);
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to fetch line items" },
      { status: 500 }
    );
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();

    // Verify project exists
    const project = await prisma.project.findUnique({
      where: { id },
    });

    if (!project) {
      return NextResponse.json(
        { error: "Project not found" },
        { status: 404 }
      );
    }

    // If materialId is provided, look up the material to pre-fill fields
    if (body.materialId) {
      const material = await prisma.material.findUnique({
        where: { id: body.materialId },
      });

      if (material) {
        if (!body.description) body.description = material.name;
        if (!body.unit) body.unit = material.unit;
        if (body.unitPrice === undefined) body.unitPrice = material.unitPrice;
      }
    }

    const lineItem = await prisma.lineItem.create({
      data: {
        ...body,
        projectId: id,
      },
    });

    return NextResponse.json(lineItem, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to create line item" },
      { status: 500 }
    );
  }
}
