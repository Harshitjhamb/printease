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

function uniqBy(arr, keyFn) {
  const m = new Map();
  for (const item of arr) m.set(keyFn(item), item);
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
  if (!text) return { raw: "", overrides: [], notes: "" };

  const overrides = [];
  const notes = [];

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

  const deduped = uniqBy(overrides, (o) => String(o.page));
  if (deduped.length === 0) {
    notes.push("No structured page overrides detected; admin should read the raw comment.");
  }

  return {
    raw: text,
    overrides: deduped.sort((a, b) => a.page - b.page),
    notes: notes.join(" ")
  };
}

