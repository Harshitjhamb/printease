export const PRICING_INR = {
  bwPerPage: 2,
  colorPerPage: 6
};

function getSheetIndexForPage({ page, pageStart }) {
  return Math.floor((page - pageStart) / 2) + 1;
}

export function calcBillingUnits({ pageStart, pageEnd, sides }) {
  const pageCount = pageEnd - pageStart + 1;
  if (sides === "double") return Math.ceil(pageCount / 2);
  return pageCount;
}

export function calcLineAmountINR({ printType, sides = "single", pageStart, pageEnd, copies, overrides = [] }) {
  const pageCount = pageEnd - pageStart + 1;
  const overrideMap = new Map(overrides.map((o) => [o.page, o.type]));

  if (sides === "double") {
    const sheetCount = Math.ceil(pageCount / 2);
    const sheetType = new Map();
    for (let i = 1; i <= sheetCount; i++) sheetType.set(i, printType);

    for (let p = pageStart; p <= pageEnd; p++) {
      const t = overrideMap.get(p);
      if (t === "color") {
        const sheetIdx = getSheetIndexForPage({ page: p, pageStart });
        sheetType.set(sheetIdx, "color");
      }
    }

    let perCopy = 0;
    for (let i = 1; i <= sheetCount; i++) {
      perCopy += sheetType.get(i) === "color" ? PRICING_INR.colorPerPage : PRICING_INR.bwPerPage;
    }
    return perCopy * copies;
  }

  let perCopy = 0;
  for (let p = pageStart; p <= pageEnd; p++) {
    const t = overrideMap.get(p) || printType;
    perCopy += t === "color" ? PRICING_INR.colorPerPage : PRICING_INR.bwPerPage;
  }
  return perCopy * copies;
}
