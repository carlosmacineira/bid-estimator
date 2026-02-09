import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string; itemId: string }> }
) {
  try {
    const { id, itemId } = await params;
    const body = await request.json();

    // Verify the line item belongs to the project
    const existing = await prisma.lineItem.findFirst({
      where: { id: itemId, projectId: id },
    });

    if (!existing) {
      return NextResponse.json(
        { error: "Line item not found" },
        { status: 404 }
      );
    }

    const lineItem = await prisma.lineItem.update({
      where: { id: itemId },
      data: body,
    });

    return NextResponse.json(lineItem);
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to update line item" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string; itemId: string }> }
) {
  try {
    const { id, itemId } = await params;

    // Verify the line item belongs to the project
    const existing = await prisma.lineItem.findFirst({
      where: { id: itemId, projectId: id },
    });

    if (!existing) {
      return NextResponse.json(
        { error: "Line item not found" },
        { status: 404 }
      );
    }

    await prisma.lineItem.delete({
      where: { id: itemId },
    });

    return NextResponse.json({ message: "Line item deleted successfully" });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to delete line item" },
      { status: 500 }
    );
  }
}
