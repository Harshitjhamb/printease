import React, { useEffect, useState } from "react";
import { api } from "../lib/api";
import { useAuth } from "../lib/auth.jsx";
import { Card, Button, Input, Select } from "../components/ui.jsx";
import { orderTag } from "../lib/format";

function Chip({ children, tone = "slate" }) {
  const tones = {
    slate: "bg-slate-100 text-slate-700",
    green: "bg-green-100 text-green-800",
    red: "bg-red-100 text-red-800",
    blue: "bg-sky-100 text-sky-800",
    yellow: "bg-amber-100 text-amber-900"
  };
  return (
    <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-bold ${tones[tone] || tones.slate}`}>
      {children}
    </span>
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
  if (status === "pending") return "yellow";
  return "slate";
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

export default function AdminPage() {
  const { user } = useAuth();
  const [orders, setOrders] = useState([]);
  const [revenue, setRevenue] = useState({ daily: [], payments: [] });
  const [revFrom, setRevFrom] = useState("");
  const [revTo, setRevTo] = useState("");
  const [revOrderId, setRevOrderId] = useState("");
  const [showAllPayments, setShowAllPayments] = useState(false);
  const [paymentSearch, setPaymentSearch] = useState("");
  const [orderSearch, setOrderSearch] = useState("");
  const [view, setView] = useState("pending"); // pending | in_progress | completed | detail
  const [selectedOrderId, setSelectedOrderId] = useState("");
  const [printerActive, setPrinterActive] = useState(true);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [verifyBusy, setVerifyBusy] = useState("");

  async function openFileInline(fileId) {
    setErr("");
    setBusy(true);
    try {
      const resp = await api.get(`/files/${fileId}/view`, { responseType: "blob" });
      const url = window.URL.createObjectURL(resp.data);
      window.open(url, "_blank", "noopener,noreferrer");
      setTimeout(() => window.URL.revokeObjectURL(url), 60_000);
    } catch (e) {
      setErr(e?.response?.data?.message || "Could Not Open File");
    } finally {
      setBusy(false);
    }
  }

  async function loadOrders() {
    setErr("");
    try {
      const { data } = await api.get("/admin/orders");
      setOrders(data.orders || []);
    } catch (e) {
      setErr(e?.response?.data?.message || "Failed to load admin orders");
    }
  }

  async function loadRevenue() {
    setErr("");
    try {
      const params = {};
      if (revFrom) params.from = revFrom;
      if (revTo) params.to = revTo;
      if (revOrderId) params.orderId = revOrderId;
      params.limit = showAllPayments ? 500 : 6;
      const { data } = await api.get("/admin/revenue", { params });
      setRevenue({ daily: data.daily || [], payments: data.payments || [] });
    } catch (e) {
      setErr(e?.response?.data?.message || "Failed to load revenue");
    }
  }

  async function verifyPayment(orderId) {
    setErr("");
    setVerifyBusy(String(orderId));
    try {
      const { data } = await api.get(`/admin/orders/${orderId}/verify-payment`);
      const lines = [
        `Provider: ${data.provider}`,
        `Provider status: ${data.providerStatus}`,
        `Is paid: ${data.isPaid ? "YES" : "NO"}`,
        `Amount matches: ${data.amount?.matches ? "YES" : "NO"}`,
        `Expected: ₹${Number(data.amount?.expectedINR || 0).toFixed(2)}`,
        `Provider: ₹${Number(data.amount?.providerINR || 0).toFixed(2)}`
      ];
      alert(lines.join("\n"));
    } catch (e) {
      setErr(e?.response?.data?.message || "Payment verification failed");
    } finally {
      setVerifyBusy("");
    }
  }

  function toCsv(rows) {
    const header = ["PaidAt", "OrderTag", "OrderId", "RollNo", "User", "Phone", "Amount", "Provider", "RazorpayOrderId", "RazorpayPaymentId", "PaypalOrderId"];
    const escape = (v) => `"${String(v ?? "").replace(/"/g, '""')}"`;
    const lines = [header.join(",")];
    for (const r of rows) {
      lines.push(
        [
          r.paidAt ? new Date(r.paidAt).toISOString() : "",
          orderTag({ rollNo: r.user?.rollNo, orderId: r.orderId }),
          r.orderId,
          r.user?.rollNo || "",
          r.user?.name || "",
          r.user?.phone || "",
          r.amount || 0,
          r.provider || "",
          r.paymentDetails?.razorpayOrderId || "",
          r.paymentDetails?.razorpayPaymentId || "",
          r.paymentDetails?.paypalOrderId || ""
        ]
          .map(escape)
          .join(",")
      );
    }
    return lines.join("\n");
  }

  async function downloadRevenueCsv() {
    setErr("");
    setBusy(true);
    try {
      const params = {};
      if (revFrom) params.from = revFrom;
      if (revTo) params.to = revTo;
      if (revOrderId) params.orderId = revOrderId;
      params.limit = 500;
      const { data } = await api.get("/admin/revenue", { params });
      const csv = toCsv(data.payments || []);
      const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `printease_payments_${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => window.URL.revokeObjectURL(url), 10_000);
    } catch (e) {
      setErr(e?.response?.data?.message || "Failed to download CSV");
    } finally {
      setBusy(false);
    }
  }

  async function loadPrinterStatus() {
    try {
      const { data } = await api.get("/admin/printer-status");
      setPrinterActive(Boolean(data.printerActive));
    } catch {
      // ignore
    }
  }

  async function togglePrinterStatus(nextValue) {
    setErr("");
    setBusy(true);
    try {
      const { data } = await api.patch("/admin/printer-status", { printerActive: nextValue });
      setPrinterActive(Boolean(data.printerActive));
    } catch (e) {
      setErr(e?.response?.data?.message || "Failed to update printer status");
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => {
    if (user?.role === "admin") {
      loadOrders();
      loadRevenue();
      loadPrinterStatus();
    }
  }, [user?.role]);

  useEffect(() => {
    if (user?.role === "admin") loadRevenue();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showAllPayments]);

  async function updateOrder(id, patch) {
    setErr("");
    setBusy(true);
    try {
      const { data } = await api.patch(`/admin/orders/${id}`, patch);
      setOrders((prev) => prev.map((o) => (o._id === id ? data.order : o)));
    } catch (e) {
      setErr(e?.response?.data?.message || "Update failed");
    } finally {
      setBusy(false);
    }
  }

  async function notify(id, message) {
    setErr("");
    setBusy(true);
    try {
      const { data } = await api.post(`/admin/orders/${id}/notify`, { message });
      setOrders((prev) => prev.map((o) => (o._id === id ? data.order : o)));
    } catch (e) {
      setErr(e?.response?.data?.message || "Notify failed");
    } finally {
      setBusy(false);
    }
  }

  if (user?.role !== "admin") {
    return (
      <Card className="p-6">
        <div className="text-xl font-extrabold">Admin Portal</div>
        <p className="mt-2 text-sm text-slate-600">You must sign in with an admin account to access this page.</p>
      </Card>
    );
  }

  const q = orderSearch.trim().toLowerCase();
  const filteredOrders = q
    ? orders.filter((o) => {
        const tag = orderTag({ rollNo: o.userId?.rollNo, orderId: o._id }).toLowerCase();
        const name = (o.userId?.name || "").toLowerCase();
        const roll = (o.userId?.rollNo || "").toLowerCase();
        const email = (o.userId?.email || "").toLowerCase();
        const fileNames = (o.items || []).map((it) => (it.fileName || "").toLowerCase()).join(" ");
        return [tag, name, roll, email, fileNames, String(o._id)].some((s) => s.includes(q));
      })
    : orders;

  const pendingOrders = filteredOrders.filter((o) => o.status === "pending");
  const inProgressOrders = filteredOrders.filter((o) => o.status === "in_progress");
  const completedOrders = filteredOrders.filter((o) => o.status === "completed");
  const selectedOrder = orders.find((o) => String(o._id) === String(selectedOrderId)) || null;

  const activeList =
    view === "pending" ? pendingOrders : view === "in_progress" ? inProgressOrders : view === "completed" ? completedOrders : [];

  const pq = paymentSearch.trim().toLowerCase();
  const filteredPayments = pq
    ? (revenue.payments || []).filter((p) => {
        const tag = orderTag({ rollNo: p.user?.rollNo, orderId: p.orderId }).toLowerCase();
        const orderId = String(p.orderId || "").toLowerCase();
        const roll = String(p.user?.rollNo || "").toLowerCase();
        const name = String(p.user?.name || "").toLowerCase();
        const phone = String(p.user?.phone || "").toLowerCase();
        return [tag, orderId, roll, name, phone].some((s) => s.includes(pq));
      })
    : revenue.payments || [];

  function openOrder(o) {
    setSelectedOrderId(String(o._id));
    setView("detail");
  }

  function ViewBtn({ target, label, count }) {
    const active = view === target;
    return (
      <button
        type="button"
        className={[
          "rounded-2xl px-4 py-2 text-sm font-extrabold border",
          active
            ? "border-sky-400 bg-sky-50 text-sky-700"
            : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
        ].join(" ")}
        onClick={() => {
          setView(target);
          setSelectedOrderId("");
        }}
      >
        {label} <span className="ml-1 text-slate-500 font-bold">({count})</span>
      </button>
    );
  }

  function renderOrderCard(o) {
    return (
      <Card key={o._id} className="p-6">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
          <div className="lg:col-span-8">
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <div className="text-lg font-extrabold">{orderTag({ rollNo: o.userId?.rollNo, orderId: o._id })}</div>
              <div className="text-xs text-slate-500">{new Date(o.createdAt).toLocaleString()}</div>
            </div>

            <div className="mt-3 flex flex-wrap gap-2">
              <Chip tone="blue">Amount: ₹{o.totalAmount.toFixed(2)}</Chip>
              <Chip tone={toneForPaymentStatus(o.paymentStatus)}>Payment: {labelPaymentStatus(o.paymentStatus)}</Chip>
              <Chip tone={toneForPrintStatus(o.status)}>Print: {labelPrintStatus(o.status)}</Chip>
              {o.userId?.name ? <Chip tone="slate">User: {o.userId.name}</Chip> : null}
            </div>
          </div>

          <div className="lg:col-span-4 grid grid-cols-2 gap-2">
            <div>
              <div className="text-xs font-semibold text-slate-600">Print Status</div>
              <Select value={o.status} onChange={(e) => updateOrder(o._id, { status: e.target.value })}>
                <option value="pending">Pending</option>
                <option value="in_progress">In Progress</option>
                <option value="completed">Completed</option>
              </Select>
            </div>
            <div>
              <div className="text-xs font-semibold text-slate-600">Payment Status</div>
              <Select
                value={o.paymentStatus}
                disabled={o.paymentStatus === "paid"}
                onChange={(e) => updateOrder(o._id, { paymentStatus: e.target.value })}
              >
                <option value="pending">Pending</option>
                <option value="paid">Paid</option>
                <option value="failed">Failed</option>
              </Select>
              {o.paymentStatus === "paid" ? (
                <div className="mt-1 text-[11px] text-slate-500">Locked after paid.</div>
              ) : null}
            </div>
          </div>
        </div>

        <div className="mt-4">
          <div className="text-sm font-extrabold">Documents</div>
          <div className="mt-2 space-y-2">
            {(o.items || []).map((it, idx) => (
              <div key={idx} className="rounded-2xl border border-slate-100 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="font-semibold truncate">{it.fileName}</div>
                    <div className="mt-2 flex flex-wrap gap-2">
                      <Chip>Pages {it.pageStart}-{it.pageEnd}</Chip>
                      <Chip>Copies {it.copies}</Chip>
                      <Chip tone={it.printType === "color" ? "blue" : "slate"}>{it.printType === "color" ? "Color" : "B/W"}</Chip>
                      <Chip>{it.paperSize}</Chip>
                    </div>
                  </div>
                  <div className="shrink-0">
                    {it.fileId ? (
                      <Button variant="secondary" type="button" onClick={() => openFileInline(it.fileId)} disabled={busy}>
                        Open
                      </Button>
                    ) : (
                      <Chip tone="slate">No File</Chip>
                    )}
                  </div>
                </div>

                {it.parsedComment?.overrides?.length ? (
                  <div className="mt-3 rounded-xl bg-slate-50 p-3 text-xs text-slate-700">
                    <div className="font-bold text-slate-800">Detected Special Pages</div>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {it.parsedComment.overrides.map((o2) => (
                        <Chip
                          key={`${o2.page}_${o2.type || "na"}_${o2.sides || "na"}`}
                          tone={o2.type === "color" ? "blue" : o2.sides ? "yellow" : "slate"}
                        >
                          p{o2.page}:{o2.type ? ` ${o2.type}` : ""}{o2.sides ? `${o2.type ? "," : ""} ${o2.sides}` : ""}
                        </Chip>
                      ))}
                    </div>
                  </div>
                ) : null}

                {it.comment ? (
                  <div className="mt-3 rounded-xl bg-white p-3 border border-slate-100 text-sm">
                    <div className="text-xs font-bold text-slate-600">User Instruction</div>
                    <div className="mt-1 text-slate-800">{it.comment}</div>
                  </div>
                ) : null}
              </div>
            ))}
          </div>
        </div>

        <div className="mt-4 rounded-2xl border border-slate-100 p-4">
          <div className="text-sm font-extrabold">Notify User</div>
          <div className="mt-2 grid grid-cols-1 md:grid-cols-4 gap-2">
            <div className="md:col-span-3">
              <Input
                placeholder="Type message and press Enter…"
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    const msg = e.currentTarget.value.trim();
                    if (!msg) return;
                    notify(o._id, msg);
                    e.currentTarget.value = "";
                  }
                }}
              />
            </div>
            <div className="text-xs text-slate-500 flex items-center">Sent messages appear on the user dashboard.</div>
          </div>
        </div>
      </Card>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="page-title">Admin Portal</h1>
          <p className="page-subtitle">Manage orders, revenue, printer status, and notifications</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="text-sm font-semibold text-slate-700">
            Printer:{" "}
            <span className={printerActive ? "text-green-700" : "text-red-700"}>
              {printerActive ? "ACTIVE" : "INACTIVE"}
            </span>
          </div>
          <div className="flex items-center gap-1 rounded-2xl bg-slate-100 p-1">
            <button
              className={[
                "px-3 py-1.5 text-xs font-extrabold rounded-xl",
                printerActive ? "bg-white text-slate-900 shadow" : "text-slate-600 hover:text-slate-900"
              ].join(" ")}
              onClick={() => togglePrinterStatus(true)}
              disabled={busy}
            >
              Active
            </button>
            <button
              className={[
                "px-3 py-1.5 text-xs font-extrabold rounded-xl",
                !printerActive ? "bg-white text-slate-900 shadow" : "text-slate-600 hover:text-slate-900"
              ].join(" ")}
              onClick={() => togglePrinterStatus(false)}
              disabled={busy}
            >
              Inactive
            </button>
          </div>
          <Button variant="secondary" onClick={loadOrders} disabled={busy}>
            Refresh
          </Button>
        </div>
      </div>

      <Card className="mt-6 p-5">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div>
            <div className="font-extrabold">College center revenue</div>
            <div className="text-sm text-slate-600">Paid orders (date-wise) + payment list</div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="secondary" onClick={loadRevenue} disabled={busy}>
              Refresh Revenue
            </Button>
            <Button variant="secondary" onClick={() => setShowAllPayments((v) => !v)} disabled={busy}>
              {showAllPayments ? "Show Recent" : "See All Records"}
            </Button>
            <Button onClick={downloadRevenueCsv} disabled={busy}>
              Download CSV
            </Button>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-1 md:grid-cols-4 gap-3">
          <div>
            <div className="text-xs font-semibold text-slate-600">From (YYYY-MM-DD)</div>
            <Input value={revFrom} onChange={(e) => setRevFrom(e.target.value)} placeholder="2026-04-01" />
          </div>
          <div>
            <div className="text-xs font-semibold text-slate-600">To (YYYY-MM-DD)</div>
            <Input value={revTo} onChange={(e) => setRevTo(e.target.value)} placeholder="2026-04-30" />
          </div>
        </div>

        <div className="mt-4 grid grid-cols-1 gap-4">
          <div className="rounded-2xl border border-slate-100 p-4">
            <div className="font-extrabold">Daily totals</div>
            <div className="mt-3 space-y-2">
              {revenue.daily.length === 0 ? (
                <div className="text-sm text-slate-500">No paid orders in this range.</div>
              ) : (
                revenue.daily.map((d) => (
                  <div key={d._id} className="flex items-center justify-between text-sm">
                    <div className="font-semibold">{d._id}</div>
                    <div className="text-slate-600">
                      {d.count} order(s) • <span className="font-extrabold">₹{Number(d.totalAmount || 0).toFixed(2)}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="rounded-2xl border border-slate-100 p-4 overflow-auto">
            <div className="flex items-start justify-between gap-3 flex-wrap">
              <div>
                <div className="font-extrabold">Payments</div>
                <div className="mt-1 text-xs text-slate-500">
                  Showing {showAllPayments ? "all" : "recent"} records (max {showAllPayments ? "500" : "6"}).
                  {paymentSearch.trim() ? ` Filtered: ${filteredPayments.length}` : ""}
                </div>
              </div>
              <div className="w-full md:w-[320px]">
                <Input
                  value={paymentSearch}
                  onChange={(e) => setPaymentSearch(e.target.value)}
                  placeholder="Search payments: name/roll/order/phone"
                />
              </div>
            </div>
            <div className="mt-3">
              {filteredPayments.length === 0 ? (
                <div className="text-sm text-slate-500">No payments found.</div>
              ) : (
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-xs text-slate-500">
                      <th className="py-2 pr-2">Date</th>
                      <th className="py-2 pr-2">Order</th>
                      <th className="py-2 pr-2">Name</th>
                      <th className="py-2 pr-2">Roll</th>
                      <th className="py-2 pr-2">Verify</th>
                      <th className="py-2 text-right">Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredPayments.map((p) => (
                      <tr key={p.orderId} className="border-t align-top">
                        <td className="py-2 pr-2 whitespace-nowrap">
                          {p.paidAt ? new Date(p.paidAt).toLocaleString() : "-"}
                        </td>
                        <td className="py-2 pr-2 font-semibold">{orderTag({ rollNo: p.user?.rollNo, orderId: p.orderId })}</td>
                        <td className="py-2 pr-2">{p.user?.name || "-"}</td>
                        <td className="py-2 pr-2">{p.user?.rollNo || "-"}</td>
                        <td className="py-2 pr-2">
                          <Button
                            variant="secondary"
                            size="sm"
                            type="button"
                            onClick={() => verifyPayment(p.orderId)}
                            disabled={busy || verifyBusy === String(p.orderId) || !p.provider || p.provider === "none"}
                          >
                            {p.provider && p.provider !== "none" ? (verifyBusy === String(p.orderId) ? "Verifying..." : "Verify") : "N/A"}
                          </Button>
                        </td>
                        <td className="py-2 text-right font-extrabold">₹{Number(p.amount || 0).toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      </Card>

      {err ? <div className="mt-4 text-sm text-red-600">{err}</div> : null}

      <Card className="mt-6 p-5">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <div className="font-extrabold">Orders</div>
            <div className="text-sm text-slate-600">Select Pending / In Progress / Completed, then open an order</div>
          </div>
          <div className="w-full md:w-[520px]">
            <Input
              value={orderSearch}
              onChange={(e) => setOrderSearch(e.target.value)}
              placeholder="Search: Order ID / Roll / Name / File…"
            />
          </div>
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          <ViewBtn target="pending" label="Pending" count={pendingOrders.length} />
          <ViewBtn target="in_progress" label="In Progress" count={inProgressOrders.length} />
          <ViewBtn target="completed" label="Completed" count={completedOrders.length} />
        </div>
      </Card>

      {view === "detail" && selectedOrder ? (
        <div className="mt-4">
          <div className="flex items-center justify-between mb-3">
            <button
              className="text-sm font-extrabold text-sky-600 hover:underline"
              onClick={() => {
                // go back to list based on current status
                const next =
                  selectedOrder.status === "completed"
                    ? "completed"
                    : selectedOrder.status === "in_progress"
                      ? "in_progress"
                      : "pending";
                setView(next);
                setSelectedOrderId("");
              }}
            >
              ← Back To List
            </button>
            <div className="text-xs text-slate-500">Order Details</div>
          </div>
          {renderOrderCard(selectedOrder)}
        </div>
      ) : (
        <div className="mt-4 space-y-3">
          {activeList.length === 0 ? (
            <Card className="p-6 text-sm text-slate-500">No orders found.</Card>
          ) : (
            activeList.map((o) => (
              <Card key={o._id} className="p-5">
                <div className="flex items-center justify-between gap-3 flex-wrap">
                  <div>
                    <div className="text-lg font-extrabold">{orderTag({ rollNo: o.userId?.rollNo, orderId: o._id })}</div>
                    <div className="mt-2 flex flex-wrap gap-2">
                      <Chip tone={toneForPaymentStatus(o.paymentStatus)}>Payment: {labelPaymentStatus(o.paymentStatus)}</Chip>
                      <Chip tone={toneForPrintStatus(o.status)}>Print: {labelPrintStatus(o.status)}</Chip>
                      <Chip tone="blue">₹{o.totalAmount.toFixed(2)}</Chip>
                      {o.userId?.name ? <Chip tone="slate">{o.userId.name}</Chip> : null}
                    </div>
                  </div>
                  <Button onClick={() => openOrder(o)}>Open</Button>
                </div>
              </Card>
            ))
          )}
        </div>
      )}
    </div>
  );
}
