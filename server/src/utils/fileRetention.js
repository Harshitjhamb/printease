import fs from "node:fs";
import path from "node:path";
import { StoredFile } from "../models/StoredFile.js";

function safeUnlink(p) {
  try {
    if (p && fs.existsSync(p)) fs.unlinkSync(p);
    return true;
  } catch {
    return false;
  }
}

export async function cleanupExpiredFiles({ retentionDays = 7 } = {}) {
  const days = Math.max(1, Number(retentionDays || 7));
  const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

  const candidates = await StoredFile.find({
    storage: "disk",
    deletedAt: { $exists: false },
    createdAt: { $lt: cutoff }
  }).limit(2000);

  let deletedCount = 0;
  for (const f of candidates) {
    const diskPath = f.diskPath ? path.resolve(f.diskPath) : "";
    safeUnlink(diskPath);
    f.deletedAt = new Date();
    f.diskPath = "";
    // Keep metadata (originalName/mimeType/pageCount) but clear size to avoid implying file exists
    f.sizeBytes = 0;
    await f.save();
    deletedCount += 1;
  }

  return { retentionDays: days, cutoff, scanned: candidates.length, markedDeleted: deletedCount };
}

export function startRetentionJob({ retentionDays = 7 } = {}) {
  // Run once at startup, then every 24 hours.
  const run = async () => {
    try {
      const res = await cleanupExpiredFiles({ retentionDays });
      // eslint-disable-next-line no-console
      console.log(`[retention] markedDeleted=${res.markedDeleted} cutoff=${res.cutoff.toISOString()}`);
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error("[retention] cleanup failed", e);
    }
  };

  run();
  setInterval(run, 24 * 60 * 60 * 1000);
}

