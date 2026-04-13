import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../lib/api";
import { Card, Button, Badge } from "../components/ui.jsx";
import { useAuth } from "../lib/auth.jsx";
import { fetchMeta } from "../lib/meta";
import banner from "../assets/printer-banner.jpg";
import { orderTag } from "../lib/format";

function StatCard({ label, value }) {
  return (
    <Card className="p-5">
      <div className="text-xs font-semibold text-slate-500">{label}</div>
      <div className="mt-2 text-2xl font-extrabold">{value}</div>
    </Card>
  );
}

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

export default function DashboardPage() {
  const { user } = useAuth();
  const [orders, setOrders] = useState([]);
  const [printerActive, setPrinterActive] = useState(true);

  useEffect(() => {
    api.get("/orders/my")
      .then((r) => setOrders(r.data.orders || []))
      .catch(() => setOrders([]));

    fetchMeta()
      .then((m) => setPrinterActive(Boolean(m.printerActive)))
      .catch(() => setPrinterActive(true));
  }, []);

  const stats = useMemo(() => {
    const total = orders.length;
    const pending = orders.filter((o) => o.status !== "completed").length;
    const completed = orders.filter((o) => o.status === "completed").length;
    const spent = orders.reduce((s, o) => s + (o.paymentStatus === "paid" ? o.totalAmount : 0), 0);
    return { total, pending, completed, spent };
  }, [orders]);

  const recent = orders.slice(0, 5);
  const notifications = recent.flatMap((o) =>
    (o.notifications || []).slice(-2).map((n) => ({ ...n, orderId: o._id }))
  );

  return (
    <div>
      <Card className="overflow-hidden">
        <div className="relative">
          <img src={banner} alt="Printer banner" className="h-52 w-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-r from-slate-950/60 via-slate-950/25 to-transparent" />
          <div className="absolute inset-0 flex items-center">
            <div className="px-6">
              <h1 className="text-3xl font-extrabold text-white">Welcome back, {user?.name}</h1>
              <p className="mt-1 text-sm text-white/90">Here’s your print activity overview</p>
              <div className="mt-3 inline-flex items-center gap-2 rounded-full bg-white/90 px-3 py-1 text-xs font-bold">
                Printer status:
                <span className={printerActive ? "text-green-700" : "text-red-700"}>
                  {printerActive ? "ACTIVE" : "INACTIVE"}
                </span>
              </div>
            </div>
          </div>
        </div>
        <div className="flex items-center justify-between px-6 py-4 bg-white/70">
          <div className="text-sm text-slate-600">
            {printerActive ? "You can place new orders right now." : "Printing is currently inactive. Upload is disabled."}
          </div>
          <Link to="/app/new">
            <Button disabled={!printerActive}>+ New Order</Button>
          </Link>
        </div>
      </Card>

      <div className="mt-6 grid grid-cols-1 md:grid-cols-4 gap-4">
        <StatCard label="Total Orders" value={stats.total} />
        <StatCard label="Pending" value={stats.pending} />
        <StatCard label="Completed" value={stats.completed} />
        <StatCard label="Total Spent" value={`₹${stats.spent.toFixed(2)}`} />
      </div>

      <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="p-5 md:col-span-2">
          <div className="flex items-center justify-between">
            <div className="font-extrabold">Recent Orders</div>
            <Link className="text-sm font-semibold text-sky-600" to="/app/orders">
              View all →
            </Link>
          </div>
          <div className="mt-4">
            {recent.length === 0 ? (
              <div className="text-center text-sm text-slate-500 py-10">
                No orders yet<br />
                <Link className="text-sky-600 font-semibold" to="/app/new">
                  Place your first order
                </Link>
              </div>
            ) : (
              <div className="space-y-3">
                {recent.map((o) => (
                  <div
                    key={o._id}
                    className="flex items-center justify-between rounded-2xl border border-slate-200/60 bg-white px-4 py-3"
                  >
                    <div>
                      <div className="font-semibold">{orderTag({ rollNo: user?.rollNo, orderId: o._id })}</div>
                      <div className="mt-2 flex flex-wrap gap-2">
                        <Badge tone="slate">{o.items?.length || 0} Doc(s)</Badge>
                        <Badge tone={toneForPrintStatus(o.status)}>{labelPrintStatus(o.status)}</Badge>
                        <Badge tone={toneForPaymentStatus(o.paymentStatus)}>Payment {labelPaymentStatus(o.paymentStatus)}</Badge>
                      </div>
                    </div>
                    <div className="font-extrabold">₹{o.totalAmount.toFixed(2)}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </Card>

        <Card className="p-5">
          <div className="flex items-center justify-between">
            <div className="font-extrabold">Notifications</div>
            <span className="text-sm text-slate-400">—</span>
          </div>
          <div className="mt-4">
            {notifications.length === 0 ? (
              <div className="text-center text-sm text-slate-500 py-10">No new notifications</div>
            ) : (
              <div className="space-y-3">
                {notifications.map((n, idx) => (
                  <div key={idx} className="rounded-2xl border border-slate-200/60 px-4 py-3 bg-white">
                    <div className="text-xs text-slate-500">{orderTag({ rollNo: user?.rollNo, orderId: n.orderId })}</div>
                    <div className="text-sm">{n.message}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}
