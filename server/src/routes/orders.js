import express from "express";
import { z } from "zod";
import { requireAuth } from "../middleware/auth.js";
import { Order } from "../models/Order.js";
import { StoredFile } from "../models/StoredFile.js";
import { parsePrintComment } from "../utils/commentParser.js";
import { calcBillingUnits, calcLineAmountINR, calcOrderTotalINR } from "../utils/pricing.js";
import { getSetting, SETTINGS_KEYS } from "../utils/settings.js";

const router = express.Router();

const orderItemSchema = z.object({
  fileId: z.string().min(1),
  printType: z.enum(["bw", "color"]),
  sides: z.enum(["single", "double"]).default("single"),
  pageStart: z.number().int().min(1),
  pageEnd: z.number().int().min(1),
  copies: z.number().int().min(1).default(1),
  paperSize: z.enum(["A4", "A3", "Legal"]).default("A4"),
  comment: z.string().optional().default("")
});

router.post("/", requireAuth, async (req, res) => {
  const printerActive = await getSetting(SETTINGS_KEYS.PRINTER_ACTIVE, true);
  if (!printerActive) return res.status(403).json({ message: "Printing is currently inactive. Please try later." });

  const schema = z.object({
    items: z.array(orderItemSchema).min(1)
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ message: "Invalid input", issues: parsed.error.issues });

  // Verify ownership of files
  const fileIds = parsed.data.items.map((i) => i.fileId);
  const files = await StoredFile.find({ _id: { $in: fileIds }, ownerUserId: req.user.userId });
  if (files.length !== fileIds.length) return res.status(403).json({ message: "One or more files not owned" });
  const fileMap = new Map(files.map((f) => [String(f._id), f]));

  // Validate page ranges if we know pageCount (from StoredFile)
  for (const it of parsed.data.items) {
    const f = fileMap.get(String(it.fileId));
    if (!f) continue;
    const pageStart = Math.min(it.pageStart, it.pageEnd);
    const pageEnd = Math.max(it.pageStart, it.pageEnd);
    if (f.pageCount && pageEnd > f.pageCount) {
      return res.status(400).json({
        message: `Page range out of bounds for ${f.originalName}. Max pages: ${f.pageCount}`
      });
    }
    if (f.pageCount && pageStart < 1) {
      return res.status(400).json({ message: `Invalid page range for ${f.originalName}` });
    }
  }

  const items = parsed.data.items.map((it) => {
    const basePageStart = Math.min(it.pageStart, it.pageEnd);
    const basePageEnd = Math.max(it.pageStart, it.pageEnd);

    const f = fileMap.get(String(it.fileId));
    const maxPages = f?.pageCount || basePageEnd;

    // First pass: parse using full available range so we can detect range instructions
    const parsedWide = parsePrintComment({ comment: it.comment, pageStart: 1, pageEnd: maxPages });
    const range = parsedWide.range
      ? {
          pageStart: Math.min(Math.max(parsedWide.range.pageStart, 1), maxPages),
          pageEnd: Math.min(Math.max(parsedWide.range.pageEnd, 1), maxPages)
        }
      : { pageStart: basePageStart, pageEnd: basePageEnd };

    // Second pass: re-parse within the effective range so overrides are filtered correctly
    const parsedComment = parsePrintComment({ comment: it.comment, pageStart: range.pageStart, pageEnd: range.pageEnd });
    parsedComment.range = range;

    const effectivePrintType = parsedComment.defaults?.printType || it.printType;
    const effectiveSides = parsedComment.defaults?.sides || it.sides;

    const pageCountSelected = calcBillingUnits({
      pageStart: range.pageStart,
      pageEnd: range.pageEnd,
      sides: effectiveSides,
      overrides: parsedComment.overrides
    });

    const lineAmount = calcLineAmountINR({
      printType: effectivePrintType,
      sides: effectiveSides,
      pageStart: range.pageStart,
      pageEnd: range.pageEnd,
      copies: it.copies,
      overrides: parsedComment.overrides
    });

    return {
      fileId: it.fileId,
      fileName: f.originalName,
      pageCount: f.pageCount,
      printType: effectivePrintType,
      sides: effectiveSides,
      pageStart: range.pageStart,
      pageEnd: range.pageEnd,
      copies: it.copies,
      paperSize: it.paperSize,
      comment: it.comment || "",
      parsedComment,
      pageCountSelected,
      lineAmount
    };
  });

  const totalAmount = calcOrderTotalINR(items);
  const order = await Order.create({
    userId: req.user.userId,
    items,
    totalAmount,
    status: "pending",
    paymentStatus: "pending",
    paymentProvider: "none"
  });

  return res.json({ order });
});

router.get("/my", requireAuth, async (req, res) => {
  const orders = await Order.find({ userId: req.user.userId }).sort({ createdAt: -1 }).limit(50);
  return res.json({ orders });
});

router.get("/:id", requireAuth, async (req, res) => {
  const order = await Order.findById(req.params.id);
  if (!order) return res.status(404).json({ message: "Order not found" });

  const isOwner = String(order.userId) === String(req.user.userId);
  const isAdmin = req.user.role === "admin";
  if (!isOwner && !isAdmin) return res.status(403).json({ message: "Forbidden" });

  return res.json({ order });
});

export default router;
