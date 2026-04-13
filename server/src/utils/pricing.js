export const PRICING_INR = {
  bwPerPage: 2,
  colorPerPage: 6
};

function getSheetIndexForPage({ page, pageStart }) {
  // For duplex printing, treat the selected range as consecutive pages:
  // sheet1 = (start,start+1), sheet2 = (start+2,start+3), ...
  return Math.floor((page - pageStart) / 2) + 1;
}

export function calcBillingUnits({ pageStart, pageEnd, sides }) {
  const pageCount = pageEnd - pageStart + 1;
  if (sides === "double") return Math.ceil(pageCount / 2); // sheets
  return pageCount; // pages
}

export function calcLineAmountINR({ printType, sides = "single", pageStart, pageEnd, copies, overrides = [] }) {
  const pageCount = pageEnd - pageStart + 1;
  const overrideMap = new Map(overrides.map((o) => [o.page, o.type]));

  if (sides === "double") {
    // Bill per sheet. If ANY side/page on a sheet is color, treat the sheet as color.
    const sheetCount = Math.ceil(pageCount / 2);
    const sheetType = new Map();
    for (let i = 1; i <= sheetCount; i++) sheetType.set(i, printType);

    for (let p = pageStart; p <= pageEnd; p++) {
      const t = overrideMap.get(p);
      if (!t) continue;
      if (t === "color") {
        const sheetIdx = getSheetIndexForPage({ page: p, pageStart });
        sheetType.set(sheetIdx, "color");
      }
      // "bw" overrides do not downgrade a color sheet automatically (common print-shop logic)
    }

    let perCopyAmount = 0;
    for (let i = 1; i <= sheetCount; i++) {
      perCopyAmount += sheetType.get(i) === "color" ? PRICING_INR.colorPerPage : PRICING_INR.bwPerPage;
    }
    return perCopyAmount * copies;
  }

  // Single-sided: bill per page
  let perCopyAmount = 0;
  for (let p = pageStart; p <= pageEnd; p++) {
    const t = overrideMap.get(p) || printType;
    perCopyAmount += t === "color" ? PRICING_INR.colorPerPage : PRICING_INR.bwPerPage;
  }
  return perCopyAmount * copies;
}

export function calcOrderTotalINR(items) {
  return items.reduce((sum, it) => sum + (it.lineAmount || 0), 0);
}
