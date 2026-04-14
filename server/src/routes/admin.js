import express from "express";
import { z } from "zod";
import Razorpay from "razorpay";
import paypal from "@paypal/checkout-server-sdk";
import { requireAuth, requireAdmin } from "../middleware/auth.js";
import { Order } from "../models/Order.js";
import { getSetting, setSetting, SETTINGS_KEYS } from "../utils/settings.js";

const router = express.Router();

function getRazorpayClient() {
  if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) return null;
  return new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET
  });
}

function getPayPalClient() {
  const env = process.env.PAYPAL_ENV === "live" ? paypal.core.LiveEnvironment : paypal.core.SandboxEnvironment;
  if (!process.env.PAYPAL_CLIENT_ID || !process.env.PAYPAL_CLIENT_SECRET) return null;
  const environment = new env(process.env.PAYPAL_CLIENT_ID, process.env.PAYPAL_CLIENT_SECRET);
  return new paypal.core.PayPalHttpClient(environment);
}

router.get("/orders", requireAuth, requireAdmin, async (_req, res) => {
  const orders = await Order.find({})
    .sort({ createdAt: -1 })
    .limit(200)
    .populate("userId", "name email phone rollNo");
  return res.json({ orders });
});

router.get("/revenue", requireAuth, requireAdmin, async (req, res) => {
  // date-wise totals + list; filterable by orderId
  const { from, to, orderId, limit } = req.query;
  const match = { paymentStatus: "paid" };
  if (orderId) match._id = orderId;

  if (from || to) {
    match.paidAt = {};
    if (from) match.paidAt.$gte = new Date(String(from));
    if (to) match.paidAt.$lte = new Date(String(to));
  }

  const n = Math.max(1, Math.min(500, Number(limit || 6)));
  const payments = await Order.find(match)
    .sort({ paidAt: -1 })
    .limit(n)
    .populate("userId", "name email phone rollNo");

  const daily = await Order.aggregate([
    { $match: match },
    {
      $group: {
        _id: { $dateToString: { date: "$paidAt", format: "%Y-%m-%d", timezone: "Asia/Kolkata" } },
        totalAmount: { $sum: "$totalAmount" },
        count: { $sum: 1 }
      }
    },
    { $sort: { _id: -1 } }
  ]);

  return res.json({
    daily,
    payments: payments.map((o) => ({
      orderId: String(o._id),
      paidAt: o.paidAt,
      amount: o.totalAmount,
      provider: o.paymentProvider,
      paymentRef: o.paymentRef,
      paymentDetails: o.paymentDetails,
      user: o.userId
        ? { name: o.userId.name, email: o.userId.email, phone: o.userId.phone, rollNo: o.userId.rollNo }
        : null
    }))
  });
});

router.get("/printer-status", requireAuth, requireAdmin, async (_req, res) => {
  const printerActive = await getSetting(SETTINGS_KEYS.PRINTER_ACTIVE, true);
  return res.json({ printerActive: Boolean(printerActive) });
});

router.patch("/printer-status", requireAuth, requireAdmin, async (req, res) => {
  const schema = z.object({ printerActive: z.boolean() });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ message: "Invalid input" });

  const value = await setSetting(SETTINGS_KEYS.PRINTER_ACTIVE, parsed.data.printerActive);
  return res.json({ printerActive: Boolean(value) });
});

router.patch("/orders/:id", requireAuth, requireAdmin, async (req, res) => {
  const schema = z.object({
    status: z.enum(["pending", "in_progress", "completed"]).optional(),
    paymentStatus: z.enum(["pending", "paid", "failed"]).optional()
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ message: "Invalid input" });

  const existing = await Order.findById(req.params.id);
  if (!existing) return res.status(404).json({ message: "Order not found" });

  // If payment is already marked as PAID, do not allow changing it back (safety).
  if (
    typeof parsed.data.paymentStatus === "string" &&
    existing.paymentStatus === "paid" &&
    parsed.data.paymentStatus !== "paid"
  ) {
    return res.status(400).json({ message: "Payment status is locked after it is marked as PAID." });
  }

  const order = await Order.findByIdAndUpdate(req.params.id, parsed.data, { new: true });
  if (!order) return res.status(404).json({ message: "Order not found" });
  return res.json({ order });
});

// Verify payment status by asking the provider directly (admin-only).
router.get("/orders/:id/verify-payment", requireAuth, requireAdmin, async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);
    if (!order) return res.status(404).json({ message: "Order not found" });

    const provider = order.paymentProvider || "none";
    const expectedAmountINR = Number(order.totalAmount || 0);

    if (provider === "razorpay") {
      const client = getRazorpayClient();
      if (!client) return res.status(500).json({ message: "Razorpay keys not configured" });

      const paymentId = order.paymentDetails?.razorpayPaymentId || order.paymentRef;
      if (!paymentId) return res.status(400).json({ message: "Missing Razorpay payment id for this order" });

      const payment = await client.payments.fetch(paymentId);
      const amountINR = Number(payment.amount || 0) / 100;
      const isPaid = payment.status === "captured";

      return res.json({
        provider: "razorpay",
        db: { paymentStatus: order.paymentStatus, paymentRef: order.paymentRef, paidAt: order.paidAt },
        providerStatus: payment.status,
        providerIds: { razorpayPaymentId: paymentId, razorpayOrderId: payment.order_id },
        amount: { expectedINR: expectedAmountINR, providerINR: amountINR, matches: Math.abs(amountINR - expectedAmountINR) < 0.01 },
        isPaid
      });
    }

    if (provider === "paypal") {
      const client = getPayPalClient();
      if (!client) return res.status(500).json({ message: "PayPal keys not configured" });

      const paypalOrderId = order.paymentDetails?.paypalOrderId || order.paymentRef;
      if (!paypalOrderId) return res.status(400).json({ message: "Missing PayPal order id for this order" });

      const request = new paypal.orders.OrdersGetRequest(paypalOrderId);
      const response = await client.execute(request);
      const status = response.result?.status || "UNKNOWN";
      const isPaid = status === "COMPLETED";

      const pu = response.result?.purchase_units?.[0];
      const providerINR = Number(pu?.amount?.value || 0);

      return res.json({
        provider: "paypal",
        db: { paymentStatus: order.paymentStatus, paymentRef: order.paymentRef, paidAt: order.paidAt },
        providerStatus: status,
        providerIds: { paypalOrderId },
        amount: { expectedINR: expectedAmountINR, providerINR, matches: Math.abs(providerINR - expectedAmountINR) < 0.01 },
        isPaid
      });
    }

    return res.status(400).json({ message: "Order has no payment provider / not paid yet" });
  } catch (e) {
    // Avoid crashing the process (Render will show 502 with no CORS headers if it crashes)
    return res.status(500).json({
      message: "Payment verification failed on server (check provider keys / order ids)."
    });
  }
});

router.post("/orders/:id/notify", requireAuth, requireAdmin, async (req, res) => {
  const schema = z.object({ message: z.string().min(1).max(500) });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ message: "Invalid input" });

  const order = await Order.findById(req.params.id);
  if (!order) return res.status(404).json({ message: "Order not found" });

  order.notifications.push({ message: parsed.data.message });
  await order.save();
  return res.json({ ok: true, order });
});

export default router;
