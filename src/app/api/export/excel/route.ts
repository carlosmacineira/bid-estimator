import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { generateExcelEstimate } from "@/lib/export/excel-generator";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { projectId } = body;

    if (!projectId || typeof projectId !== "string") {
      return NextResponse.json(
        { error: "projectId is required" },
        { status: 400 }
      );
    }

    // Fetch the project with its line items
    const project = await prisma.project.findUnique({
      where: { id: projectId },
      include: {
        lineItems: {
          orderBy: { sortOrder: "asc" },
        },
      },
    });

    if (!project) {
      return NextResponse.json(
        { error: "Project not found" },
        { status: 404 }
      );
    }

    // Fetch company settings (singleton row with id "default")
    let settings = await prisma.settings.findUnique({
      where: { id: "default" },
    });

    if (!settings) {
      // Fall back to schema defaults if no settings row exists yet
      settings = {
        id: "default",
        companyName: "Manny Source Electric Corp",
        address: "3932 SW 160th St, Miami, FL 33177",
        phone: "(786) 299-2168",
        license: "ER13016064",
        email: "",
        website: "mannysourceelectric.com",
        defaultLaborRate: 65.0,
        defaultOverhead: 0.15,
        defaultProfit: 0.1,
        taxRate: 0,
        defaultTerms: "",
      };
    }

    // Generate the Excel workbook buffer
    const buffer = await generateExcelEstimate(
      {
        name: project.name,
        clientName: project.clientName,
        clientCompany: project.clientCompany,
        address: project.address,
        city: project.city,
        state: project.state,
        zip: project.zip,
        overheadPct: project.overheadPct,
        profitPct: project.profitPct,
        laborRate: project.laborRate,
        lineItems: project.lineItems.map((li) => ({
          description: li.description,
          category: li.category,
          quantity: li.quantity,
          unit: li.unit,
          unitPrice: li.unitPrice,
          laborHours: li.laborHours,
          laborRate: li.laborRate,
        })),
      },
      {
        companyName: settings.companyName,
        address: settings.address,
        phone: settings.phone,
        license: settings.license,
        email: settings.email,
      }
    );

    // Sanitize project name for the filename
    const safeName = project.name.replace(/[^a-zA-Z0-9_\- ]/g, "").trim();
    const fileName = `${safeName}_Estimate.xlsx`;

    return new NextResponse(new Uint8Array(buffer), {
      status: 200,
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="${fileName}"`,
      },
    });
  } catch (error) {
    console.error("Excel export error:", error);
    return NextResponse.json(
      { error: "Failed to generate Excel export" },
      { status: 500 }
    );
  }
}
