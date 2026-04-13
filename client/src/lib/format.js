export function orderTag({ rollNo, orderId }) {
  const suffix = String(orderId || "").slice(-6).toUpperCase();
  const rn = String(rollNo || "").trim();
  if (!rn) return `#${suffix}`;
  return `#${rn}_${suffix}`;
}

