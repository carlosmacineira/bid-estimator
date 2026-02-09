import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

interface LineItem {
  quantity: number;
  unitPrice: number;
  laborHours: number;
  laborRate: number | null;
  category: string | null;
}

interface ProjectWithRelations {
  id: string;
  laborRate: number;
  overheadPct: number;
  profitPct: number;
  lineItems: LineItem[];
  [key: string]: unknown;
}

function computeProjectTotals(project: ProjectWithRelations) {
  let materialSubtotal = 0;
  let laborSubtotal = 0;
  let demolitionSubtotal = 0;

  for (const item of project.lineItems) {
    const materialCost = item.quantity * item.unitPrice;
    const laborCost = item.laborHours * (item.laborRate ?? project.laborRate);
    const lineTotal = materialCost + laborCost;

    if (item.category === "Demolition") {
      demolitionSubtotal += lineTotal;
    } else {
      materialSubtotal += materialCost;
      laborSubtotal += laborCost;
    }
  }

  const directCost = materialSubtotal + laborSubtotal + demolitionSubtotal;
  const overhead = directCost * project.overheadPct;
  const profit = (directCost + overhead) * project.profitPct;
  const grandTotal = directCost + overhead + profit;

  return {
    materialSubtotal,
    laborSubtotal,
    demolitionSubtotal,
    directCost,
    overhead,
    profit,
    grandTotal,
  };
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const project = await prisma.project.findUnique({
      where: { id },
      include: {
        lineItems: {
          orderBy: { sortOrder: "asc" },
        },
        documents: true,
      },
    });

    if (!project) {
      return NextResponse.json(
        { error: "Project not found" },
        { status: 404 }
      );
    }

    const totals = computeProjectTotals(project as ProjectWithRelations);

    return NextResponse.json({
      ...project,
      totals,
    });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to fetch project" },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();

    const project = await prisma.project.update({
      where: { id },
      data: body,
    });

    return NextResponse.json(project);
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to update project" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    await prisma.project.delete({
      where: { id },
    });

    return NextResponse.json({ message: "Project deleted successfully" });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to delete project" },
      { status: 500 }
    );
  }
}
