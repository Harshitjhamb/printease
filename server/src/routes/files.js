import express from "express";
import multer from "multer";
import fs from "node:fs";
import path from "node:path";
import { nanoid } from "nanoid";
import { requireAuth } from "../middleware/auth.js";
import { StoredFile } from "../models/StoredFile.js";
import { getSetting, SETTINGS_KEYS } from "../utils/settings.js";

const router = express.Router();

// Store files on server disk (required if user must open/print later)
const uploadDir = path.resolve(process.cwd(), "uploads");
fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: function (_req, _file, cb) {
    cb(null, uploadDir);
  },
  filename: function (_req, file, cb) {
    const safe = file.originalname.replace(/[^\w.\-]+/g, "_");
    cb(null, `${Date.now()}_${nanoid(8)}_${safe}`);
  }
});
const upload = multer({ storage, limits: { fileSize: 50 * 1024 * 1024 } });

router.post("/upload", requireAuth, upload.single("file"), async (req, res) => {
  const printerActive = await getSetting(SETTINGS_KEYS.PRINTER_ACTIVE, true);
  if (!printerActive) return res.status(403).json({ message: "Printing is currently inactive. Please try later." });
  if (!req.file) return res.status(400).json({ message: "No file uploaded" });

  const pageCountRaw = req.body?.pageCount;
  const pageCount = Number(pageCountRaw);

  const doc = await StoredFile.create({
    ownerUserId: req.user.userId,
    originalName: req.file.originalname,
    mimeType: req.file.mimetype,
    sizeBytes: req.file.size,
    diskPath: req.file.path,
    pageCount: Number.isFinite(pageCount) && pageCount > 0 ? Math.floor(pageCount) : undefined
  });

  return res.json({
    file: {
      id: doc._id,
      originalName: doc.originalName,
      mimeType: doc.mimeType,
      sizeBytes: doc.sizeBytes,
      pageCount: doc.pageCount
    }
  });
});

// VIEW ONLY (inline). No explicit download endpoint.
router.get("/:id/view", requireAuth, async (req, res) => {
  const file = await StoredFile.findById(req.params.id);
  if (!file) return res.status(404).json({ message: "File not found" });

  const isOwner = String(file.ownerUserId) === String(req.user.userId);
  const isAdmin = req.user.role === "admin";
  if (!isOwner && !isAdmin) return res.status(403).json({ message: "Forbidden" });

  if (file.deletedAt) {
    return res.status(404).json({
      message: "This file has expired and was automatically deleted from server storage (7-day retention)."
    });
  }

  // If the DB record exists but the underlying disk file is missing (common on ephemeral hosts),
  // return a JSON 404 so the frontend can show a useful message.
  try {
    if (!file.diskPath || !fs.existsSync(file.diskPath)) {
      return res.status(404).json({
        message:
          "File is not available on server storage (it may have been cleared after redeploy). Please re-upload and place the order again."
      });
    }
  } catch {
    return res.status(404).json({ message: "File is not available on server storage. Please re-upload." });
  }

  res.setHeader("Content-Type", file.mimeType || "application/octet-stream");
  res.setHeader("Content-Disposition", `inline; filename="${encodeURIComponent(file.originalName)}"`);
  return res.sendFile(path.resolve(file.diskPath));
});
export default router;
