const TYPE_SYNONYMS = {
  color: ["color", "colour", "colored", "coloured", "full color", "full-colour"],
  bw: ["bw", "b/w", "black and white", "black & white", "black white", "b&w"]
};

function normalizeType(word) {
  const w = (word || "").toLowerCase();
  if (TYPE_SYNONYMS.color.some((s) => w.includes(s))) return "color";
  if (TYPE_SYNONYMS.bw.some((s) => w.includes(s))) return "bw";
  return null;
}

const SIDES_SYNONYMS = {
  single: ["single", "single side", "single-sided", "one side", "one-sided", "simplex"],
  double: ["double", "double side", "double-sided", "both sides", "two side", "two-sided", "duplex"]
};

function normalizeSides(word) {
  const w = (word || "").toLowerCase();
  if (SIDES_SYNONYMS.double.some((s) => w.includes(s))) return "double";
  if (SIDES_SYNONYMS.single.some((s) => w.includes(s))) return "single";
  return null;
}

function mergeByPage(arr) {
  const m = new Map();
  for (const item of arr) {
    const key = String(item.page);
    const prev = m.get(key) || { page: item.page };
    m.set(key, { ...prev, ...item, page: item.page });
  }
  return [...m.values()];
}

function parseNumberList(raw) {
  // Supports: "2, 6", "2 and 6", "1-5", "2nd 6th", "2 to 6"
  const cleaned = raw
    .toLowerCase()
    .replace(/(st|nd|rd|th)\b/g, "") // ordinals: 2nd -> 2
    .replace(/\bto\b/g, "-")
    .replace(/\band\b/g, ",");

  const parts = cleaned
    .split(/[,/]/)
    .map((p) => p.trim())
    .filter(Boolean);

  const out = [];
  for (const p of parts) {
    const m = p.match(/^(\d+)\s*-\s*(\d+)$/);
    if (m) {
      const a = Number(m[1]);
      const b = Number(m[2]);
      const [start, end] = a <= b ? [a, b] : [b, a];
      for (let i = start; i <= end; i++) out.push(i);
      continue;
    }
    const n = Number(p);
    if (Number.isFinite(n) && n > 0) out.push(n);
  }
  return out;
}

export function parsePrintComment({ comment, pageStart, pageEnd }) {
  const text = (comment || "").trim();
  if (!text) return { raw: "", overrides: [], defaults: {}, range: null, notes: "" };

  const overrides = [];
  const defaults = {};
  let range = null;
  const notes = [];

  // Defaults like: "rest bw", "remaining pages double sided"
  const restType = text.match(/\b(?:rest|remaining|others)\b[\s\S]*?\b(color|colour|colored|coloured|bw|b\/w|b&w|black\s*&?\s*white|black\s*and\s*white)\b/i);
  if (restType) {
    const t = normalizeType(restType[1]);
    if (t) defaults.printType = t;
  }
  const restSides = text.match(/\b(?:rest|remaining|others)\b[\s\S]*?\b(single(?:\s*-?\s*sided)?|double(?:\s*-?\s*sided)?|duplex|simplex|both\s*sides?)\b/i);
  if (restSides) {
    const s = normalizeSides(restSides[1]);
    if (s) defaults.sides = s;
  }

  // Range detection
  const rangeAssign = text.match(/\b(?:range|pages)\s*=\s*(\d+)\s*(?:-|to)\s*(\d+)\b/i);
  const rangeBetween = text.match(/\bpages?\b[\s\S]*?\b(?:between|from)\b[^0-9]*(\d+)[^0-9]+(?:and|to)[^0-9]*(\d+)\b/i);
  const rangeSimple = text.match(/\bpages?\b[^0-9]*(\d+)\s*(?:-|to)\s*(\d+)\b/i);
  const singlePage = text.match(/\bpage\b[^0-9]*(\d+)\b/i);

  const r = rangeAssign || rangeBetween || rangeSimple;
  if (r) {
    const a = Number(r[1]);
    const b = Number(r[2]);
    if (Number.isFinite(a) && Number.isFinite(b) && a > 0 && b > 0) {
      range = { pageStart: Math.min(a, b), pageEnd: Math.max(a, b) };
    }
  } else if (singlePage) {
    const p = Number(singlePage[1]);
    if (Number.isFinite(p) && p > 0) range = { pageStart: p, pageEnd: p };
  }

  // Pattern A: "pages 2,6 colored"
  const patternA =
    /\bpage(?:s)?\b[^0-9]*([0-9][0-9,\s\-]*(?:\s*(?:and|to)\s*[0-9][0-9,\s\-]*)*)\s*(?:in\s*)?((?:black\s*&?\s*white)|(?:black\s*and\s*white)|bw|b\/w|b&w|color|colour|colored|coloured)\b/gi;

  // Pattern B: "colored pages 2 and 6"
  const patternB =
    /\b((?:black\s*&?\s*white)|(?:black\s*and\s*white)|bw|b\/w|b&w|color|colour|colored|coloured)\b[^0-9]*\bpage(?:s)?\b[^0-9]*([0-9][0-9,\s\-]*(?:\s*(?:and|to)\s*[0-9][0-9,\s\-]*)*)/gi;

  const matches = [];
  for (const re of [patternA, patternB]) {
    let m;
    while ((m = re.exec(text)) !== null) {
      matches.push({ typeWord: m[2] ?? m[1], nums: m[1] ?? m[2] });
    }
  }

  for (const match of matches) {
    const type = normalizeType(match.typeWord);
    if (!type) continue;
    const pages = parseNumberList(match.nums);
    for (const p of pages) {
      if (p < pageStart || p > pageEnd) continue;
      overrides.push({ page: p, type });
    }
  }

  // Sides overrides
  const patternC =
    /\bpage(?:s)?\b[^0-9]*([0-9][0-9,\s\-]*(?:\s*(?:and|to)\s*[0-9][0-9,\s\-]*)*)\s*(?:in\s*)?\b(single(?:\s*-?\s*sided)?|double(?:\s*-?\s*sided)?|duplex|simplex|both\s*sides?)\b/gi;
  const patternD =
    /\b(single(?:\s*-?\s*sided)?|double(?:\s*-?\s*sided)?|duplex|simplex|both\s*sides?)\b[^0-9]*\bpage(?:s)?\b[^0-9]*([0-9][0-9,\s\-]*(?:\s*(?:and|to)\s*[0-9][0-9,\s\-]*)*)/gi;

  const sideMatches = [];
  for (const re of [patternC, patternD]) {
    let m;
    while ((m = re.exec(text)) !== null) sideMatches.push({ sideWord: m[2] ?? m[1], nums: m[1] ?? m[2] });
  }
  for (const match of sideMatches) {
    const sides = normalizeSides(match.sideWord);
    if (!sides) continue;
    const pages = parseNumberList(match.nums);
    for (const p of pages) {
      if (p < pageStart || p > pageEnd) continue;
      overrides.push({ page: p, sides });
    }
  }

  // Simple assignments: "color=6; single=6; double=1-10"
  const assignments = text.split(/[;\n]/).map((s) => s.trim()).filter(Boolean);
  for (const a of assignments) {
    const m = a.match(/^(color|colour|bw|b\/w|b&w|single|double|duplex|simplex)\s*=\s*(.+)$/i);
    if (!m) continue;
    const key = m[1].toLowerCase();
    const value = m[2];
    const t = normalizeType(key);
    const s = normalizeSides(key);
    const pages = parseNumberList(value);
    for (const p of pages) {
      if (p < pageStart || p > pageEnd) continue;
      if (t) overrides.push({ page: p, type: t });
      if (s) overrides.push({ page: p, sides: s });
    }
  }

  const deduped = mergeByPage(overrides);
  if (deduped.length === 0) {
    notes.push("No structured page overrides detected; admin should read the raw comment.");
  }

  return {
    raw: text,
    overrides: deduped.sort((a, b) => a.page - b.page),
    defaults,
    range,
    notes: notes.join(" ")
  };
}
