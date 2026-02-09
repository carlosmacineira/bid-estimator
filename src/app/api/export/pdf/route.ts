import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(request: Request) {
  try {
    const { projectId } = await request.json();

    const project = await prisma.project.findUnique({
      where: { id: projectId },
      include: { lineItems: { orderBy: { sortOrder: "asc" } } },
    });

    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    const settings = await prisma.settings.upsert({
      where: { id: "default" },
      update: {},
      create: { id: "default" },
    });

    // Compute totals
    let materialSubtotal = 0;
    let laborSubtotal = 0;
    let demolitionSubtotal = 0;

    const lineItemDetails = project.lineItems.map((item) => {
      const rate = item.laborRate ?? project.laborRate;
      const materialCost = item.quantity * item.unitPrice;
      const laborCost = item.laborHours * rate;
      const lineTotal = materialCost + laborCost;

      if (item.category === "Demolition") {
        demolitionSubtotal += lineTotal;
      } else {
        materialSubtotal += materialCost;
        laborSubtotal += laborCost;
      }

      return { ...item, materialCost, laborCost, lineTotal, rate };
    });

    const directCost = materialSubtotal + laborSubtotal + demolitionSubtotal;
    const overhead = directCost * project.overheadPct;
    const subtotalWithOverhead = directCost + overhead;
    const profit = subtotalWithOverhead * project.profitPct;
    const grandTotal = subtotalWithOverhead + profit;

    const fmt = (n: number) => `$${n.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ",")}`;
    const pct = (n: number) => `${(n * 100).toFixed(1)}%`;

    // Generate HTML-based PDF using a simple approach
    const html = `
<!DOCTYPE html>
<html>
<head>
<style>
  @page { size: letter; margin: 0.75in; }
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: -apple-system, 'Segoe UI', Roboto, sans-serif; font-size: 10px; color: #333; }
  .header { display: flex; justify-content: space-between; border-bottom: 3px solid #CC0000; padding-bottom: 15px; margin-bottom: 25px; }
  .company-name { font-size: 20px; font-weight: bold; color: #CC0000; margin-bottom: 4px; }
  .company-info { font-size: 9px; color: #666; line-height: 1.5; }
  .project-title { font-size: 16px; font-weight: bold; text-align: right; margin-bottom: 4px; }
  .project-info { font-size: 9px; color: #666; text-align: right; line-height: 1.5; }
  table { width: 100%; border-collapse: collapse; margin: 15px 0; }
  th { background: #1A1A1A; color: #fff; padding: 6px 8px; font-size: 8px; text-transform: uppercase; letter-spacing: 0.5px; font-weight: 600; }
  th:first-child { text-align: left; }
  td { padding: 5px 8px; font-size: 9px; border-bottom: 1px solid #eee; }
  tr:nth-child(even) { background: #f9f9f9; }
  .right { text-align: right; }
  .mono { font-family: 'Courier New', monospace; }
  .totals { margin-top: 20px; float: right; width: 280px; }
  .total-row { display: flex; justify-content: space-between; padding: 4px 0; font-size: 10px; }
  .total-row.border { border-top: 1px solid #ddd; padding-top: 8px; margin-top: 4px; }
  .grand-total { font-size: 18px; font-weight: bold; color: #CC0000; border-top: 3px solid #CC0000; padding-top: 8px; margin-top: 8px; }
  .terms { margin-top: 40px; clear: both; padding-top: 20px; border-top: 1px solid #eee; }
  .terms-title { font-size: 10px; font-weight: bold; margin-bottom: 5px; }
  .terms-text { font-size: 8px; color: #888; line-height: 1.5; }
  .footer { position: fixed; bottom: 0.5in; left: 0.75in; right: 0.75in; text-align: center; font-size: 7px; color: #aaa; border-top: 1px solid #eee; padding-top: 8px; }
</style>
</head>
<body>
  <div class="header">
    <div>
      <div class="company-name">${settings.companyName}</div>
      <div class="company-info">
        ${settings.address}<br>
        ${settings.phone}${settings.email ? ` | ${settings.email}` : ""}<br>
        FL License: ${settings.license}
      </div>
    </div>
    <div>
      <div class="project-title">${project.name}</div>
      <div class="project-info">
        Client: ${project.clientName}${project.clientCompany ? ` — ${project.clientCompany}` : ""}<br>
        ${project.address}, ${project.city}, ${project.state} ${project.zip}<br>
        Date: ${new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}
      </div>
    </div>
  </div>

  <table>
    <thead>
      <tr>
        <th style="width:5%">#</th>
        <th style="width:25%; text-align:left">Description</th>
        <th style="width:12%; text-align:left">Category</th>
        <th style="width:6%" class="right">Qty</th>
        <th style="width:6%">Unit</th>
        <th style="width:10%" class="right">Unit Price</th>
        <th style="width:10%" class="right">Material</th>
        <th style="width:10%" class="right">Labor</th>
        <th style="width:12%" class="right">Total</th>
      </tr>
    </thead>
    <tbody>
      ${lineItemDetails
        .map(
          (item, i) => `
        <tr>
          <td class="right">${i + 1}</td>
          <td>${item.description}</td>
          <td>${item.category}</td>
          <td class="right mono">${item.quantity}</td>
          <td>${item.unit}</td>
          <td class="right mono">${fmt(item.unitPrice)}</td>
          <td class="right mono">${fmt(item.materialCost)}</td>
          <td class="right mono">${fmt(item.laborCost)}</td>
          <td class="right mono" style="font-weight:600">${fmt(item.lineTotal)}</td>
        </tr>
      `
        )
        .join("")}
    </tbody>
  </table>

  <div class="totals">
    <div class="total-row"><span>Material Subtotal</span><span class="mono">${fmt(materialSubtotal)}</span></div>
    <div class="total-row"><span>Labor Subtotal</span><span class="mono">${fmt(laborSubtotal)}</span></div>
    ${demolitionSubtotal > 0 ? `<div class="total-row"><span>Demolition</span><span class="mono">${fmt(demolitionSubtotal)}</span></div>` : ""}
    <div class="total-row border"><span style="font-weight:600">Direct Cost</span><span class="mono" style="font-weight:600">${fmt(directCost)}</span></div>
    <div class="total-row"><span>Overhead (${pct(project.overheadPct)})</span><span class="mono">${fmt(overhead)}</span></div>
    <div class="total-row"><span>Profit (${pct(project.profitPct)})</span><span class="mono">${fmt(profit)}</span></div>
    <div class="total-row grand-total"><span>GRAND TOTAL</span><span class="mono">${fmt(grandTotal)}</span></div>
  </div>

  ${
    project.terms
      ? `
  <div class="terms">
    <div class="terms-title">Terms & Conditions</div>
    <div class="terms-text">${project.terms}</div>
  </div>
  `
      : ""
  }

  <div class="footer">
    ${settings.companyName} | ${settings.address} | ${settings.phone} | FL License: ${settings.license}<br>
    Generated on ${new Date().toLocaleDateString("en-US")}
  </div>
</body>
</html>`;

    // Return HTML that can be printed to PDF from the browser
    return new NextResponse(html, {
      headers: {
        "Content-Type": "text/html",
        "Content-Disposition": `inline; filename="${project.name.replace(/[^a-zA-Z0-9]/g, "_")}_Estimate.html"`,
      },
    });
  } catch (error) {
    console.error("PDF export error:", error);
    return NextResponse.json({ error: "Failed to generate PDF" }, { status: 500 });
  }
}
