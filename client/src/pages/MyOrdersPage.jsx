import React, { useEffect, useState } from "react";
import { api } from "../lib/api";
import { Card, Button, Badge } from "../components/ui.jsx";
import { Link } from "react-router-dom";
import { useAuth } from "../lib/auth.jsx";
import { orderTag } from "../lib/format";

function toneForPrintStatus(status) {
  if (status === "completed") return "green";
  if (status === "in_progress") return "yellow";
  return "slate";
}

function toneForPaymentStatus(status) {
  if (status === "paid") return "green";
  if (status === "failed") return "red";
  return "yellow";
}

function labelPrintStatus(status) {
  if (status === "in_progress") return "In Progress";
  if (status === "completed") return "Completed";
  return "Pending";
}

function labelPaymentStatus(status) {
  if (status === "paid") return "Paid";
  if (status === "failed") return "Failed";
  return "Pending";
}

export default function MyOrdersPage() {
  const [orders, setOrders] = useState([]);
  const { user } = useAuth();
  const [payingOrder, setPayingOrder] = useState(null);
  const [busyPay, setBusyPay] = useState(false);
  const [payErr, setPayErr] = useState("");
  const [paypalOrderId, setPaypalOrderId] = useState("");
  const [busyOpen, setBusyOpen] = useState(false);
  const [openErr, setOpenErr] = useState("");

  useEffect(() => {
    api.get("/orders/my")
      .then((r) => setOrders(r.data.orders || []))
      .catch(() => setOrders([]));
  }, []);

  async function loadScript(src) {
    if (document.querySelector(`script[src="${src}"]`)) return;
    await new Promise((resolve, reject) => {
      const s = document.createElement("script");
      s.src = src;
      s.async = true;
      s.onload = resolve;
      s.onerror = reject;
      document.body.appendChild(s);
    });
  }

  async function refreshOrders() {
    const r = await api.get("/orders/my");
    setOrders(r.data.orders || []);
  }

  async function payWithRazorpay(order) {
    setPayErr("");
    setBusyPay(true);
    try {
      await loadScript("https://checkout.razorpay.com/v1/checkout.js");
      const { data } = await api.post("/payments/razorpay/create-order", { orderId: order._id });
      const opts = {
        key: data.keyId,
        amount: data.amount,
        currency: data.currency,
        name: "PrintEase",
        description: "Print Order",
        order_id: data.razorpayOrderId,
        handler: async function (response) {
          await api.post("/payments/razorpay/verify", { orderId: order._id, ...response });
          setPayingOrder(null);
          await refreshOrders();
          alert("Payment Successful!");
        }
      };
      // eslint-disable-next-line no-undef
      const rzp = new window.Razorpay(opts);
      rzp.open();
    } catch (e) {
      setPayErr(e?.response?.data?.message || "Razorpay Payment Failed (Check Keys)");
    } finally {
      setBusyPay(false);
    }
  }

  async function payWithPayPal(order) {
    setPayErr("");
    setBusyPay(true);
    try {
      const { data } = await api.post("/payments/paypal/create-order", { orderId: order._id });
      setPaypalOrderId(data.paypalOrderId || "");
      if (data.approveUrl) window.open(data.approveUrl, "_blank", "noopener,noreferrer");
    } catch (e) {
      setPayErr(e?.response?.data?.message || "PayPal Payment Setup Failed (Check Keys)");
    } finally {
      setBusyPay(false);
    }
  }

  async function capturePayPal(order) {
    if (!paypalOrderId) return;
    setPayErr("");
    setBusyPay(true);
    try {
      await api.post("/payments/paypal/capture", { orderId: order._id, paypalOrderId });
      setPayingOrder(null);
      setPaypalOrderId("");
      await refreshOrders();
      alert("Payment Captured!");
    } catch (e) {
      setPayErr(e?.response?.data?.message || "PayPal Capture Failed");
    } finally {
      setBusyPay(false);
    }
  }

  async function openFileInline(fileId) {
    setOpenErr("");
    setBusyOpen(true);
    try {
      const resp = await api.get(`/files/${fileId}/view`, { responseType: "blob" });
      const url = window.URL.createObjectURL(resp.data);
      window.open(url, "_blank", "noopener,noreferrer");
      setTimeout(() => window.URL.revokeObjectURL(url), 60_000);
    } catch (e) {
      setOpenErr(e?.response?.data?.message || "Could Not Open File");
    } finally {
      setBusyOpen(false);
    }
  }

  return (
    <div>
      <div className="flex items-end justify-between gap-4 flex-wrap">
        <div>
          <h1 className="page-title">My Orders</h1>
          <p className="page-subtitle">Track payment, printing status, and open files for printing.</p>
        </div>
        <Link to="/app/new">
          <Button>+ New Order</Button>
        </Link>
      </div>

      <Card className="mt-6 overflow-hidden">
        <div className="overflow-x-auto">
          <div className="min-w-[880px]">
        <div className="grid grid-cols-12 gap-2 bg-slate-50 px-4 py-3 text-xs font-extrabold text-slate-600 border-b border-slate-200/60">
              <div className="col-span-3">Order</div>
              <div className="col-span-4">Documents</div>
              <div className="col-span-2">Status</div>
              <div className="col-span-2">Payment</div>
              <div className="col-span-1 text-right">Amount</div>
            </div>
            <div className="divide-y divide-slate-200/60">
          {orders.length === 0 ? (
            <div className="p-6 text-sm text-slate-500">No orders yet.</div>
          ) : (
            orders.map((o) => (
              <div key={o._id} className="grid grid-cols-12 gap-2 px-4 py-4 text-sm hover:bg-slate-50/60">
                <div className="col-span-3">
                  <div className="font-semibold">{orderTag({ rollNo: user?.rollNo, orderId: o._id })}</div>
                  <div className="text-xs text-slate-500">{new Date(o.createdAt).toLocaleString()}</div>
                </div>
                <div className="col-span-4 text-slate-700 space-y-1">
                  {(o.items || []).map((it, idx) => (
                    <div key={idx} className="flex items-center justify-between gap-2">
                      <div className="truncate">{it.fileName}</div>
                      {it.fileId ? (
                        <button
                          className="text-xs font-extrabold text-sky-700 hover:underline shrink-0"
                          onClick={() => openFileInline(it.fileId)}
                          disabled={busyOpen}
                        >
                          Open
                        </button>
                      ) : (
                        <span className="text-xs text-slate-400 shrink-0">Open N/A</span>
                      )}
                    </div>
                  ))}
                </div>
                <div className="col-span-2">
                  <Badge tone={toneForPrintStatus(o.status)}>{labelPrintStatus(o.status)}</Badge>
                </div>
                <div className="col-span-2">
                  <div className="flex items-center gap-2">
                    <Badge tone={toneForPaymentStatus(o.paymentStatus)}>{labelPaymentStatus(o.paymentStatus)}</Badge>
                    {o.paymentStatus !== "paid" ? (
                      <button
                        className="text-xs font-extrabold text-sky-700 hover:underline"
                        onClick={() => {
                          setPayingOrder(o);
                          setPaypalOrderId("");
                          setPayErr("");
                        }}
                      >
                        Pay Now
                      </button>
                    ) : null}
                  </div>
                </div>
                <div className="col-span-1 text-right font-extrabold">₹{o.totalAmount.toFixed(2)}</div>
              </div>
            ))
          )}
            </div>
          </div>
        </div>
      </Card>

      {openErr ? <div className="mt-3 text-sm text-red-600">{openErr}</div> : null}

      {payingOrder ? (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4">
          <Card className="w-full max-w-lg p-6">
            <div className="text-xl font-extrabold">Complete Payment</div>
            <div className="mt-1 text-sm text-slate-500">
              Order {orderTag({ rollNo: user?.rollNo, orderId: payingOrder._id })} • ₹{payingOrder.totalAmount.toFixed(2)}
            </div>

            <div className="mt-4 space-y-3">
              <Button className="w-full" onClick={() => payWithRazorpay(payingOrder)} disabled={busyPay}>
                Pay With Razorpay / UPI
              </Button>
              <Button className="w-full" variant="secondary" onClick={() => payWithPayPal(payingOrder)} disabled={busyPay}>
                Pay With PayPal
              </Button>

              {paypalOrderId ? (
                <div className="rounded-xl border border-slate-200 p-3 text-sm">
                  <div className="font-semibold">PayPal Flow</div>
                  <div className="text-slate-600 mt-1">Complete the payment in the opened tab, then click:</div>
                  <Button className="mt-3 w-full" onClick={() => capturePayPal(payingOrder)} disabled={busyPay}>
                    I Completed Payment (Capture)
                  </Button>
                </div>
              ) : null}
            </div>

            {payErr ? <div className="mt-3 text-sm text-red-600">{payErr}</div> : null}

            <div className="mt-4 flex justify-end">
              <Button
                variant="ghost"
                onClick={() => {
                  setPayingOrder(null);
                  setPaypalOrderId("");
                }}
                disabled={busyPay}
              >
                Close
              </Button>
            </div>
          </Card>
        </div>
      ) : null}
    </div>
  );
}
