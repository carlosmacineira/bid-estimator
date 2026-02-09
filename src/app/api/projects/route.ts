import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

interface LineItem {
  quantity: number;
  unitPrice: number;
  laborHours: number;
  laborRate: number | null;
  category: string | null;
}

interface ProjectWithLineItems {
  id: string;
  laborRate: number;
  overheadPct: number;
  profitPct: number;
  lineItems: LineItem[];
  _count: { lineItems: number };
  [key: string]: unknown;
}

function computeProjectTotals(project: ProjectWithLineItems) {
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

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");
    const search = searchParams.get("search");

    const where: Record<string, unknown> = {};

    if (status) {
      where.status = status;
    }

    if (search) {
      where.OR = [
        { name: { contains: search } },
        { clientName: { contains: search } },
      ];
    }

    const projects = await prisma.project.findMany({
      where,
      include: {
        lineItems: true,
        _count: { select: { lineItems: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    const projectsWithTotals = projects.map((project: ProjectWithLineItems) => {
      const totals = computeProjectTotals(project);
      return {
        ...project,
        totals,
      };
    });

    return NextResponse.json(projectsWithTotals);
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to fetch projects" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();

    if (!body.name) {
      return NextResponse.json(
        { error: "Project name is required" },
        { status: 400 }
      );
    }

    const project = await prisma.project.create({
      data: body,
    });

    return NextResponse.json(project, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to create project" },
      { status: 500 }
    );
  }
}
