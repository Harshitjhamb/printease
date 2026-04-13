import express from "express";
import crypto from "node:crypto";
import { z } from "zod";
import Razorpay from "razorpay";
import paypal from "@paypal/checkout-server-sdk";
import { requireAuth } from "../middleware/auth.js";
import { Order } from "../models/Order.js";

const router = express.Router();

function getRazorpayClient() {
  if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) return null;
  return new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET
  });
}

function getPayPalClient() {
  const env = process.env.PAYPAL_ENV === "live" ? new paypal.core.LiveEnvironment : new paypal.core.SandboxEnvironment;
  if (!process.env.PAYPAL_CLIENT_ID || !process.env.PAYPAL_CLIENT_SECRET) return null;
  const environment = new env(process.env.PAYPAL_CLIENT_ID, process.env.PAYPAL_CLIENT_SECRET);
  return new paypal.core.PayPalHttpClient(environment);
}

router.post("/razorpay/create-order", requireAuth, async (req, res) => {
  const schema = z.object({ orderId: z.string().min(1) });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ message: "Invalid input" });

  const order = await Order.findById(parsed.data.orderId);
  if (!order) return res.status(404).json({ message: "Order not found" });
  if (String(order.userId) !== String(req.user.userId)) return res.status(403).json({ message: "Forbidden" });

  const client = getRazorpayClient();
  if (!client) return res.status(500).json({ message: "Razorpay keys not configured" });

  const rpOrder = await client.orders.create({
    amount: Math.round(order.totalAmount * 100), // paise
    currency: "INR",
    receipt: `printease_${order._id}`,
    notes: { appOrderId: String(order._id) }
  });

  order.paymentProvider = "razorpay";
  order.paymentRef = rpOrder.id;
  order.paymentDetails.razorpayOrderId = rpOrder.id;
  await order.save();

  return res.json({
    keyId: process.env.RAZORPAY_KEY_ID,
    razorpayOrderId: rpOrder.id,
    amount: rpOrder.amount,
    currency: rpOrder.currency
  });
});

router.post("/razorpay/verify", requireAuth, async (req, res) => {
  const schema = z.object({
    orderId: z.string().min(1),
    razorpay_order_id: z.string().min(1),
    razorpay_payment_id: z.string().min(1),
    razorpay_signature: z.string().min(1)
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ message: "Invalid input" });

  const order = await Order.findById(parsed.data.orderId);
  if (!order) return res.status(404).json({ message: "Order not found" });
  if (String(order.userId) !== String(req.user.userId)) return res.status(403).json({ message: "Forbidden" });

  const expected = crypto
    .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET || "")
    .update(`${parsed.data.razorpay_order_id}|${parsed.data.razorpay_payment_id}`)
    .digest("hex");

  if (expected !== parsed.data.razorpay_signature) {
    order.paymentStatus = "failed";
    await order.save();
    return res.status(400).json({ message: "Payment signature verification failed" });
  }

  order.paymentStatus = "paid";
  order.paymentProvider = "razorpay";
  // store both orderId + paymentId for accounting
  order.paymentRef = parsed.data.razorpay_payment_id;
  order.paymentDetails.razorpayOrderId = parsed.data.razorpay_order_id;
  order.paymentDetails.razorpayPaymentId = parsed.data.razorpay_payment_id;
  order.paidAt = new Date();
  await order.save();
  return res.json({ ok: true });
});

router.post("/paypal/create-order", requireAuth, async (req, res) => {
  const schema = z.object({ orderId: z.string().min(1) });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ message: "Invalid input" });

  const order = await Order.findById(parsed.data.orderId);
  if (!order) return res.status(404).json({ message: "Order not found" });
  if (String(order.userId) !== String(req.user.userId)) return res.status(403).json({ message: "Forbidden" });

  const client = getPayPalClient();
  if (!client) return res.status(500).json({ message: "PayPal keys not configured" });

  const request = new paypal.orders.OrdersCreateRequest();
  request.prefer("return=representation");
  request.requestBody({
    intent: "CAPTURE",
    purchase_units: [
      {
        reference_id: String(order._id),
        amount: {
          currency_code: "INR",
          value: order.totalAmount.toFixed(2)
        }
      }
    ]
  });

  const response = await client.execute(request);
  order.paymentProvider = "paypal";
  order.paymentRef = response.result.id;
  order.paymentDetails.paypalOrderId = response.result.id;
  await order.save();

  const approve = response.result.links?.find((l) => l.rel === "approve")?.href || "";
  return res.json({ paypalOrderId: response.result.id, approveUrl: approve });
});

router.post("/paypal/capture", requireAuth, async (req, res) => {
  const schema = z.object({ orderId: z.string().min(1), paypalOrderId: z.string().min(1) });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ message: "Invalid input" });

  const order = await Order.findById(parsed.data.orderId);
  if (!order) return res.status(404).json({ message: "Order not found" });
  if (String(order.userId) !== String(req.user.userId)) return res.status(403).json({ message: "Forbidden" });

  const client = getPayPalClient();
  if (!client) return res.status(500).json({ message: "PayPal keys not configured" });

  const request = new paypal.orders.OrdersCaptureRequest(parsed.data.paypalOrderId);
  request.requestBody({});
  const response = await client.execute(request);

  const status = response.result.status;
  if (status === "COMPLETED") {
    order.paymentStatus = "paid";
    order.paymentProvider = "paypal";
    order.paymentRef = response.result.id;
    order.paymentDetails.paypalOrderId = response.result.id;
    order.paidAt = new Date();
  } else {
    order.paymentStatus = "failed";
  }
  await order.save();

  return res.json({ ok: order.paymentStatus === "paid", status });
});

export default router;
