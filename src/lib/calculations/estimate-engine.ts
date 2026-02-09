export interface LineItemCalc {
  quantity: number;
  unitPrice: number;
  laborHours: number;
  laborRate: number;
  category: string;
}

export interface LineItemResult {
  materialCost: number;
  laborCost: number;
  lineTotal: number;
}

export interface EstimateTotals {
  materialSubtotal: number;
  laborSubtotal: number;
  demolitionSubtotal: number;
  directCost: number;
  overhead: number;
  subtotalWithOverhead: number;
  profit: number;
  grandTotal: number;
}

export function computeLineItem(item: LineItemCalc): LineItemResult {
  const materialCost = item.quantity * item.unitPrice;
  const laborCost = item.laborHours * item.laborRate;
  return {
    materialCost,
    laborCost,
    lineTotal: materialCost + laborCost,
  };
}

export function computeEstimateTotals(
  lineItems: LineItemCalc[],
  overheadPct: number,
  profitPct: number
): EstimateTotals {
  let materialSubtotal = 0;
  let laborSubtotal = 0;
  let demolitionSubtotal = 0;

  for (const item of lineItems) {
    const result = computeLineItem(item);
    if (item.category === "Demolition") {
      demolitionSubtotal += result.lineTotal;
    } else {
      materialSubtotal += result.materialCost;
      laborSubtotal += result.laborCost;
    }
  }

  const directCost = materialSubtotal + laborSubtotal + demolitionSubtotal;
  const overhead = directCost * overheadPct;
  const subtotalWithOverhead = directCost + overhead;
  const profit = subtotalWithOverhead * profitPct;
  const grandTotal = subtotalWithOverhead + profit;

  return {
    materialSubtotal,
    laborSubtotal,
    demolitionSubtotal,
    directCost,
    overhead,
    subtotalWithOverhead,
    profit,
    grandTotal,
  };
}
