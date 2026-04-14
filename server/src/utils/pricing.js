export const PRICING_INR = {
  bwPerPage: 2,
  colorPerPage: 6
};

function buildOverrideMaps(overrides) {
  const type = new Map();
  const sides = new Map();
  for (const o of overrides || []) {
    if (o?.type) type.set(o.page, o.type);
    if (o?.sides) sides.set(o.page, o.sides);
  }
  return { type, sides };
}

function simulateSheets({ pageStart, pageEnd, baseType, baseSides, overrides = [] }) {
  const { type: typeMap, sides: sidesMap } = buildOverrideMaps(overrides);
  const getType = (p) => typeMap.get(p) || baseType;
  const getSides = (p) => sidesMap.get(p) || baseSides;

  const sheets = [];
  let p = pageStart;
  while (p <= pageEnd) {
    const s = getSides(p);
    if (s === "single") {
      sheets.push({ pages: [p], type: getType(p) });
      p += 1;
      continue;
    }

    const next = p + 1;
    if (next <= pageEnd && getSides(next) === "double") {
      const t1 = getType(p);
      const t2 = getType(next);
      sheets.push({ pages: [p, next], type: t1 === "color" || t2 === "color" ? "color" : "bw" });
      p += 2;
    } else {
      sheets.push({ pages: [p], type: getType(p) });
      p += 1;
    }
  }
  return sheets;
}

export function calcBillingUnits({ pageStart, pageEnd, sides = "single", overrides = [] }) {
  return simulateSheets({ pageStart, pageEnd, baseType: "bw", baseSides: sides, overrides }).length;
}

export function calcLineAmountINR({ printType, sides = "single", pageStart, pageEnd, copies, overrides = [] }) {
  const sheets = simulateSheets({ pageStart, pageEnd, baseType: printType, baseSides: sides, overrides });
  let perCopyAmount = 0;
  for (const sh of sheets) perCopyAmount += sh.type === "color" ? PRICING_INR.colorPerPage : PRICING_INR.bwPerPage;
  return perCopyAmount * copies;
}

export function calcOrderTotalINR(items) {
  return items.reduce((sum, it) => sum + (it.lineAmount || 0), 0);
}
