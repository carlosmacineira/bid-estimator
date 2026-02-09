import ExcelJS from "exceljs";

interface ProjectForExport {
  name: string;
  clientName: string;
  clientCompany: string | null;
  address: string;
  city: string;
  state: string;
  zip: string;
  overheadPct: number;
  profitPct: number;
  laborRate: number;
  lineItems: Array<{
    description: string;
    category: string;
    quantity: number;
    unit: string;
    unitPrice: number;
    laborHours: number;
    laborRate: number | null;
  }>;
}

interface SettingsForExport {
  companyName: string;
  address: string;
  phone: string;
  license: string;
  email: string;
}

export async function generateExcelEstimate(
  project: ProjectForExport,
  settings: SettingsForExport
): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = settings.companyName;
  workbook.created = new Date();

  // ---------------------------------------------------------------------------
  // Styles / constants
  // ---------------------------------------------------------------------------
  const currencyFmt = '"$"#,##0.00';
  const headerFill: ExcelJS.Fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FF1A1A1A" },
  };
  const headerFont: Partial<ExcelJS.Font> = {
    bold: true,
    color: { argb: "FFFFFFFF" },
    size: 11,
  };
  const altRowFill: ExcelJS.Fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FFF5F5F5" },
  };
  const grandTotalFont: Partial<ExcelJS.Font> = {
    bold: true,
    color: { argb: "FFCC0000" },
    size: 14,
  };
  const thinBorder: Partial<ExcelJS.Borders> = {
    bottom: { style: "thin", color: { argb: "FFCCCCCC" } },
  };

  const dateStr = new Date().toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  // ---------------------------------------------------------------------------
  // Sheet 1 – Estimate (Line Items detail)
  // ---------------------------------------------------------------------------
  const ws = workbook.addWorksheet("Estimate");

  // Column widths
  ws.columns = [
    { key: "A", width: 8 },   // Item #
    { key: "B", width: 40 },  // Description
    { key: "C", width: 16 },  // Category
    { key: "D", width: 10 },  // Qty
    { key: "E", width: 10 },  // Unit
    { key: "F", width: 14 },  // Unit Price
    { key: "G", width: 12 },  // Labor Hrs
    { key: "H", width: 13 },  // Labor Rate
    { key: "I", width: 16 },  // Material Cost
    { key: "J", width: 16 },  // Labor Cost
    { key: "K", width: 16 },  // Line Total
  ];

  // ---- Rows 1-4: Company header ----

  // Row 1: Company name (left) | Date (right-aligned in K)
  const row1 = ws.getRow(1);
  row1.getCell("A").value = settings.companyName;
  row1.getCell("A").font = { bold: true, size: 16, color: { argb: "FFCC0000" } };
  row1.getCell("K").value = dateStr;
  row1.getCell("K").alignment = { horizontal: "right" };

  // Row 2: Company address | Project Name
  const row2 = ws.getRow(2);
  row2.getCell("A").value = settings.address;
  row2.getCell("K").value = project.name;
  row2.getCell("K").font = { bold: true, size: 14 };
  row2.getCell("K").alignment = { horizontal: "right" };

  // Row 3: Phone, License | Client Name
  const row3 = ws.getRow(3);
  row3.getCell("A").value = `${settings.phone}  |  License: ${settings.license}`;
  const clientDisplay = project.clientCompany
    ? `${project.clientName} — ${project.clientCompany}`
    : project.clientName;
  row3.getCell("K").value = clientDisplay;
  row3.getCell("K").alignment = { horizontal: "right" };

  // Row 4: blank (already blank)

  // Row 5: empty spacer (already blank)

  // ---- Row 6: Column headers ----
  const headers = [
    "Item #",
    "Description",
    "Category",
    "Qty",
    "Unit",
    "Unit Price",
    "Labor Hrs",
    "Labor Rate",
    "Material Cost",
    "Labor Cost",
    "Line Total",
  ];
  const headerRow = ws.getRow(6);
  headers.forEach((h, i) => {
    const cell = headerRow.getCell(i + 1);
    cell.value = h;
    cell.font = headerFont;
    cell.fill = headerFill;
    cell.alignment = { horizontal: i >= 3 ? "center" : "left", vertical: "middle" };
    cell.border = thinBorder;
  });
  headerRow.height = 24;

  // ---- Rows 7+: Line items ----
  const firstDataRow = 7;
  project.lineItems.forEach((item, idx) => {
    const rowNum = firstDataRow + idx;
    const row = ws.getRow(rowNum);

    const effectiveLaborRate = item.laborRate ?? project.laborRate;
    const materialCost = item.quantity * item.unitPrice;
    const laborCost = item.laborHours * effectiveLaborRate;
    const lineTotal = materialCost + laborCost;

    row.getCell("A").value = idx + 1;
    row.getCell("A").alignment = { horizontal: "center" };
    row.getCell("B").value = item.description;
    row.getCell("C").value = item.category;
    row.getCell("D").value = item.quantity;
    row.getCell("D").alignment = { horizontal: "center" };
    row.getCell("E").value = item.unit;
    row.getCell("E").alignment = { horizontal: "center" };
    row.getCell("F").value = item.unitPrice;
    row.getCell("F").numFmt = currencyFmt;
    row.getCell("G").value = item.laborHours;
    row.getCell("G").alignment = { horizontal: "center" };
    row.getCell("H").value = effectiveLaborRate;
    row.getCell("H").numFmt = currencyFmt;

    // Formula cells with pre-computed result
    row.getCell("I").value = {
      formula: `D${rowNum}*F${rowNum}`,
      result: materialCost,
    } as ExcelJS.CellFormulaValue;
    row.getCell("I").numFmt = currencyFmt;

    row.getCell("J").value = {
      formula: `G${rowNum}*H${rowNum}`,
      result: laborCost,
    } as ExcelJS.CellFormulaValue;
    row.getCell("J").numFmt = currencyFmt;

    row.getCell("K").value = {
      formula: `I${rowNum}+J${rowNum}`,
      result: lineTotal,
    } as ExcelJS.CellFormulaValue;
    row.getCell("K").numFmt = currencyFmt;

    // Alternating row shading
    if (idx % 2 === 1) {
      for (let c = 1; c <= 11; c++) {
        row.getCell(c).fill = altRowFill;
      }
    }

    row.getCell("B").border = thinBorder;
    row.getCell("K").border = thinBorder;
  });

  const lastDataRow = firstDataRow + project.lineItems.length - 1;

  // ---- Totals row ----
  const totalsRowNum = lastDataRow + 2; // one blank row gap
  const totalsRow = ws.getRow(totalsRowNum);

  // Pre-compute totals for result values
  let totalMaterial = 0;
  let totalLabor = 0;
  project.lineItems.forEach((item) => {
    const effectiveRate = item.laborRate ?? project.laborRate;
    totalMaterial += item.quantity * item.unitPrice;
    totalLabor += item.laborHours * effectiveRate;
  });
  const totalDirect = totalMaterial + totalLabor;

  totalsRow.getCell("H").value = "TOTALS";
  totalsRow.getCell("H").font = { bold: true, size: 12 };
  totalsRow.getCell("H").alignment = { horizontal: "right" };

  totalsRow.getCell("I").value = {
    formula: `SUM(I${firstDataRow}:I${lastDataRow})`,
    result: totalMaterial,
  } as ExcelJS.CellFormulaValue;
  totalsRow.getCell("I").numFmt = currencyFmt;
  totalsRow.getCell("I").font = { bold: true };

  totalsRow.getCell("J").value = {
    formula: `SUM(J${firstDataRow}:J${lastDataRow})`,
    result: totalLabor,
  } as ExcelJS.CellFormulaValue;
  totalsRow.getCell("J").numFmt = currencyFmt;
  totalsRow.getCell("J").font = { bold: true };

  totalsRow.getCell("K").value = {
    formula: `SUM(K${firstDataRow}:K${lastDataRow})`,
    result: totalDirect,
  } as ExcelJS.CellFormulaValue;
  totalsRow.getCell("K").numFmt = currencyFmt;
  totalsRow.getCell("K").font = { bold: true };

  // Bold top border on totals row
  for (let c = 9; c <= 11; c++) {
    totalsRow.getCell(c).border = {
      top: { style: "medium", color: { argb: "FF1A1A1A" } },
      bottom: { style: "double", color: { argb: "FF1A1A1A" } },
    };
  }

  // ---- Demo Subtotal (Demolition category sum using SUMPRODUCT) ----
  const demoRowNum = totalsRowNum + 2;
  const demoRow = ws.getRow(demoRowNum);
  const demoTotal = project.lineItems
    .filter((li) => li.category === "Demolition")
    .reduce((sum, li) => {
      const rate = li.laborRate ?? project.laborRate;
      return sum + li.quantity * li.unitPrice + li.laborHours * rate;
    }, 0);

  demoRow.getCell("H").value = "Demo Subtotal";
  demoRow.getCell("H").font = { italic: true };
  demoRow.getCell("H").alignment = { horizontal: "right" };
  demoRow.getCell("K").value = {
    formula: `SUMPRODUCT((C${firstDataRow}:C${lastDataRow}="Demolition")*K${firstDataRow}:K${lastDataRow})`,
    result: demoTotal,
  } as ExcelJS.CellFormulaValue;
  demoRow.getCell("K").numFmt = currencyFmt;

  // ---- Direct Cost ----
  const directCostRowNum = demoRowNum + 1;
  const directCostRow = ws.getRow(directCostRowNum);
  directCostRow.getCell("H").value = "Direct Cost";
  directCostRow.getCell("H").font = { bold: true };
  directCostRow.getCell("H").alignment = { horizontal: "right" };
  directCostRow.getCell("K").value = {
    formula: `K${totalsRowNum}`,
    result: totalDirect,
  } as ExcelJS.CellFormulaValue;
  directCostRow.getCell("K").numFmt = currencyFmt;
  directCostRow.getCell("K").font = { bold: true };

  // ---- Overhead ----
  const overheadRowNum = directCostRowNum + 1;
  const overheadRow = ws.getRow(overheadRowNum);
  const overheadAmt = totalDirect * project.overheadPct;
  overheadRow.getCell("H").value = `Overhead (${(project.overheadPct * 100).toFixed(0)}%)`;
  overheadRow.getCell("H").alignment = { horizontal: "right" };
  overheadRow.getCell("K").value = {
    formula: `K${totalsRowNum}*${project.overheadPct}`,
    result: overheadAmt,
  } as ExcelJS.CellFormulaValue;
  overheadRow.getCell("K").numFmt = currencyFmt;

  // ---- Subtotal with Overhead ----
  const subtotalRowNum = overheadRowNum + 1;
  const subtotalRow = ws.getRow(subtotalRowNum);
  const subtotalAmt = totalDirect + overheadAmt;
  subtotalRow.getCell("H").value = "Subtotal with Overhead";
  subtotalRow.getCell("H").font = { bold: true };
  subtotalRow.getCell("H").alignment = { horizontal: "right" };
  subtotalRow.getCell("K").value = {
    formula: `K${totalsRowNum}+K${overheadRowNum}`,
    result: subtotalAmt,
  } as ExcelJS.CellFormulaValue;
  subtotalRow.getCell("K").numFmt = currencyFmt;
  subtotalRow.getCell("K").font = { bold: true };

  // ---- Profit ----
  const profitRowNum = subtotalRowNum + 1;
  const profitRow = ws.getRow(profitRowNum);
  const profitAmt = subtotalAmt * project.profitPct;
  profitRow.getCell("H").value = `Profit (${(project.profitPct * 100).toFixed(0)}%)`;
  profitRow.getCell("H").alignment = { horizontal: "right" };
  profitRow.getCell("K").value = {
    formula: `K${subtotalRowNum}*${project.profitPct}`,
    result: profitAmt,
  } as ExcelJS.CellFormulaValue;
  profitRow.getCell("K").numFmt = currencyFmt;

  // ---- GRAND TOTAL ----
  const grandTotalRowNum = profitRowNum + 1;
  const grandTotalRow = ws.getRow(grandTotalRowNum);
  const grandTotalAmt = subtotalAmt + profitAmt;
  grandTotalRow.getCell("H").value = "GRAND TOTAL";
  grandTotalRow.getCell("H").font = grandTotalFont;
  grandTotalRow.getCell("H").alignment = { horizontal: "right" };
  grandTotalRow.getCell("K").value = {
    formula: `K${subtotalRowNum}+K${profitRowNum}`,
    result: grandTotalAmt,
  } as ExcelJS.CellFormulaValue;
  grandTotalRow.getCell("K").numFmt = currencyFmt;
  grandTotalRow.getCell("K").font = grandTotalFont;
  grandTotalRow.getCell("K").border = {
    top: { style: "medium", color: { argb: "FF1A1A1A" } },
    bottom: { style: "double", color: { argb: "FFCC0000" } },
  };

  // ---------------------------------------------------------------------------
  // Sheet 2 – Summary
  // ---------------------------------------------------------------------------
  const summaryWs = workbook.addWorksheet("Summary");

  summaryWs.columns = [
    { key: "A", width: 8 },
    { key: "B", width: 40 },
    { key: "C", width: 16 },
    { key: "D", width: 16 },
    { key: "E", width: 16 },
  ];

  // ---- Company header (same as Sheet 1) ----
  const sRow1 = summaryWs.getRow(1);
  sRow1.getCell("A").value = settings.companyName;
  sRow1.getCell("A").font = { bold: true, size: 16, color: { argb: "FFCC0000" } };
  sRow1.getCell("E").value = dateStr;
  sRow1.getCell("E").alignment = { horizontal: "right" };

  const sRow2 = summaryWs.getRow(2);
  sRow2.getCell("A").value = settings.address;
  sRow2.getCell("E").value = project.name;
  sRow2.getCell("E").font = { bold: true, size: 14 };
  sRow2.getCell("E").alignment = { horizontal: "right" };

  const sRow3 = summaryWs.getRow(3);
  sRow3.getCell("A").value = `${settings.phone}  |  License: ${settings.license}`;
  sRow3.getCell("E").value = clientDisplay;
  sRow3.getCell("E").alignment = { horizontal: "right" };

  // Row 5: "ESTIMATE SUMMARY" title
  const sTitleRow = summaryWs.getRow(5);
  sTitleRow.getCell("A").value = "ESTIMATE SUMMARY";
  sTitleRow.getCell("A").font = { bold: true, size: 14 };

  // Row 6: blank spacer

  // ---- Summary table header ----
  const summaryHeaderRow = summaryWs.getRow(7);
  const summaryHeaders = ["", "Category", "", "", "Amount"];
  summaryHeaders.forEach((h, i) => {
    const cell = summaryHeaderRow.getCell(i + 1);
    cell.value = h;
    cell.font = headerFont;
    cell.fill = headerFill;
  });

  // ---- Summary rows with cross-sheet references ----

  // Material Subtotal
  const matSumRow = 8;
  const matRow = summaryWs.getRow(matSumRow);
  matRow.getCell("B").value = "Material Subtotal";
  matRow.getCell("B").font = { bold: true };
  matRow.getCell("E").value = {
    formula: `'Estimate'!I${totalsRowNum}`,
    result: totalMaterial,
  } as ExcelJS.CellFormulaValue;
  matRow.getCell("E").numFmt = currencyFmt;

  // Labor Subtotal
  const labSumRow = 9;
  const labRow = summaryWs.getRow(labSumRow);
  labRow.getCell("B").value = "Labor Subtotal";
  labRow.getCell("B").font = { bold: true };
  labRow.getCell("E").value = {
    formula: `'Estimate'!J${totalsRowNum}`,
    result: totalLabor,
  } as ExcelJS.CellFormulaValue;
  labRow.getCell("E").numFmt = currencyFmt;

  // Direct Cost
  const dcSumRow = 10;
  const dcRow = summaryWs.getRow(dcSumRow);
  dcRow.getCell("B").value = "Direct Cost";
  dcRow.getCell("B").font = { bold: true };
  dcRow.getCell("E").value = {
    formula: `'Estimate'!K${totalsRowNum}`,
    result: totalDirect,
  } as ExcelJS.CellFormulaValue;
  dcRow.getCell("E").numFmt = currencyFmt;
  dcRow.getCell("E").font = { bold: true };
  dcRow.getCell("E").border = {
    bottom: { style: "thin", color: { argb: "FF999999" } },
  };

  // Overhead
  const ohSumRow = 11;
  const ohRow = summaryWs.getRow(ohSumRow);
  ohRow.getCell("B").value = `Overhead (${(project.overheadPct * 100).toFixed(0)}%)`;
  ohRow.getCell("E").value = {
    formula: `'Estimate'!K${overheadRowNum}`,
    result: overheadAmt,
  } as ExcelJS.CellFormulaValue;
  ohRow.getCell("E").numFmt = currencyFmt;

  // Profit
  const prSumRow = 12;
  const prRow = summaryWs.getRow(prSumRow);
  prRow.getCell("B").value = `Profit (${(project.profitPct * 100).toFixed(0)}%)`;
  prRow.getCell("E").value = {
    formula: `'Estimate'!K${profitRowNum}`,
    result: profitAmt,
  } as ExcelJS.CellFormulaValue;
  prRow.getCell("E").numFmt = currencyFmt;

  // Grand Total
  const gtSumRow = 13;
  const gtRow = summaryWs.getRow(gtSumRow);
  gtRow.getCell("B").value = "GRAND TOTAL";
  gtRow.getCell("B").font = grandTotalFont;
  gtRow.getCell("E").value = {
    formula: `'Estimate'!K${grandTotalRowNum}`,
    result: grandTotalAmt,
  } as ExcelJS.CellFormulaValue;
  gtRow.getCell("E").numFmt = currencyFmt;
  gtRow.getCell("E").font = grandTotalFont;
  gtRow.getCell("E").border = {
    top: { style: "medium", color: { argb: "FF1A1A1A" } },
    bottom: { style: "double", color: { argb: "FFCC0000" } },
  };

  // Alternating shading on summary rows
  [matSumRow, dcSumRow, prSumRow].forEach((rn) => {
    for (let c = 1; c <= 5; c++) {
      summaryWs.getRow(rn).getCell(c).fill = altRowFill;
    }
  });

  // ---------------------------------------------------------------------------
  // Write workbook to buffer
  // ---------------------------------------------------------------------------
  const arrayBuffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(arrayBuffer);
}
