import React, { useMemo, useRef, useState } from "react";
import { api } from "../lib/api";
import { Card, Button, Input, Select } from "../components/ui.jsx";
import { parsePrintComment } from "../lib/commentParser";
import { calcBillingUnits, calcLineAmountINR, PRICING_INR } from "../lib/pricing";
import { fetchMeta } from "../lib/meta";
import { PDFDocument } from "pdf-lib";

function Stepper({ step }) {
  const steps = ["Document", "Options", "Comment", "Review"];
  return (
    <div className="flex items-center gap-3">
      {steps.map((s, idx) => {
        const n = idx + 1;
        const done = n < step;
        const active = n === step;
        return (
          <div key={s} className="flex items-center gap-3">
            <div
              className={[
                "h-9 w-9 rounded-full flex items-center justify-center text-sm font-bold",
                done || active ? "bg-sky-500 text-white" : "bg-slate-200 text-slate-600"
              ].join(" ")}
            >
              {done ? "✓" : n}
            </div>
            <div className={done || active ? "text-slate-900 font-semibold" : "text-slate-500"}>{s}</div>
            {idx < steps.length - 1 ? <div className="h-px w-16 bg-slate-200" /> : null}
          </div>
        );
      })}
    </div>
  );
}

function Toggle({ value, onChange, options }) {
  return (
    <div className="flex gap-2">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          onClick={() => onChange(o.value)}
          className={[
            "rounded-2xl px-4 py-2 text-sm font-semibold border",
            value === o.value ? "border-sky-400 bg-sky-50 text-sky-700" : "border-slate-200 bg-white text-slate-700"
          ].join(" ")}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

async function getPageCountForFile(file) {
  const name = (file?.name || "").toLowerCase();
  const type = (file?.type || "").toLowerCase();

  if (type.startsWith("image/")) return 1;
  if (type === "application/pdf" || name.endsWith(".pdf")) {
    const buf = await file.arrayBuffer();
    const pdf = await PDFDocument.load(buf);
    return pdf.getPageCount();
  }
  return undefined;
}

function clamp(n, min, max) {
  const x = Number(n);
  if (!Number.isFinite(x)) return min;
  return Math.max(min, Math.min(max, x));
}

async function uploadFileToServer(file, pageCount) {
  const fd = new FormData();
  fd.append("file", file);
  if (typeof pageCount === "number") fd.append("pageCount", String(pageCount));
  const { data } = await api.post("/files/upload", fd, { headers: { "Content-Type": "multipart/form-data" } });
  return data.file; // {id, originalName, ...}
}

async function openFileInline(fileId) {
  const resp = await api.get(`/files/${fileId}/view`, { responseType: "blob" });
  const url = window.URL.createObjectURL(resp.data);
  window.open(url, "_blank", "noopener,noreferrer");
  setTimeout(() => window.URL.revokeObjectURL(url), 60_000);
}

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

export default function NewOrderPage() {
  const [step, setStep] = useState(1);
  const [docs, setDocs] = useState([]);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [order, setOrder] = useState(null);
  const [paymentUi, setPaymentUi] = useState({ open: false, paypalOrderId: "", approveUrl: "" });
  const [printerActive, setPrinterActive] = useState(true);
  const fileInputRef = useRef(null);
  const driveTokenRef = useRef("");

  React.useEffect(() => {
    fetchMeta()
      .then((m) => setPrinterActive(Boolean(m.printerActive)))
      .catch(() => setPrinterActive(true));
  }, []);

  const totals = useMemo(() => {
    const lines = docs.map((d) => {
      const pageStart = Number(d.pageStart || 1);
      const pageEnd = Number(d.pageEnd || 1);
      const parsed = parsePrintComment({ comment: d.comment || "", pageStart: Math.min(pageStart, pageEnd), pageEnd: Math.max(pageStart, pageEnd) });
      const lineAmount = calcLineAmountINR({
        printType: d.printType || "bw",
        sides: d.sides || "single",
        pageStart: Math.min(pageStart, pageEnd),
        pageEnd: Math.max(pageStart, pageEnd),
        copies: Number(d.copies || 1),
        overrides: parsed.overrides
      });
      return { id: d.localId, lineAmount };
    });
    const total = lines.reduce((s, l) => s + l.lineAmount, 0);
    return { lines, total };
  }, [docs]);

  async function addFiles(files) {
    if (!printerActive) {
      setErr("Printing is currently inactive. Upload is disabled.");
      return;
    }
    const arr = Array.from(files || []);
    setBusy(true);
    try {
      const enriched = [];
      for (const file of arr) {
        let pageCount;
        try {
          pageCount = await getPageCountForFile(file);
        } catch {
          pageCount = undefined;
        }
        enriched.push({
          localId: `${Date.now()}_${Math.random().toString(16).slice(2)}`,
          file,
          fileId: "",
          fileName: file.name,
          pageCount, // used for default ranges + validation
          printType: "bw",
          sides: "single",
          pageStart: 1,
          pageEnd: typeof pageCount === "number" ? pageCount : 1,
          copies: 1,
          paperSize: "A4",
          comment: ""
        });
      }
      setDocs((prev) => [...prev, ...enriched]);
    } finally {
      setBusy(false);
    }
  }

  async function addSingleFile(file) {
    if (!printerActive) {
      setErr("Printing is currently inactive. Upload is disabled.");
      return;
    }
    setBusy(true);
    try {
      let pageCount;
      try {
        pageCount = await getPageCountForFile(file);
      } catch {
        pageCount = undefined;
      }

      const enriched = {
        localId: `${Date.now()}_${Math.random().toString(16).slice(2)}`,
        file,
        fileId: "",
        fileName: file.name,
        pageCount,
        printType: "bw",
        sides: "single",
        pageStart: 1,
        pageEnd: typeof pageCount === "number" ? pageCount : 1,
        copies: 1,
        paperSize: "A4",
        comment: ""
      };
      setDocs((prev) => [...prev, enriched]);
    } finally {
      setBusy(false);
    }
  }

  async function pickFromGoogleDrive() {
    setErr("");
    if (!printerActive) return setErr("Printing is currently inactive. Please try later.");

    const CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID;
    const API_KEY = import.meta.env.VITE_GOOGLE_API_KEY;
    if (!CLIENT_ID || !API_KEY) {
      setErr("Missing Google Drive credentials. Add VITE_GOOGLE_CLIENT_ID and VITE_GOOGLE_API_KEY in client/.env and restart.");
      return;
    }

    setBusy(true);
    try {
      await loadScript("https://apis.google.com/js/api.js");
      await loadScript("https://accounts.google.com/gsi/client");

      // Load Picker
      await new Promise((resolve) => {
        // eslint-disable-next-line no-undef
        window.gapi.load("picker", { callback: resolve });
      });

      // Get/refresh access token
      const token = await new Promise((resolve, reject) => {
        try {
          // eslint-disable-next-line no-undef
          const tokenClient = window.google.accounts.oauth2.initTokenClient({
            client_id: CLIENT_ID,
            scope: "https://www.googleapis.com/auth/drive.readonly",
            callback: (resp) => {
              if (resp?.access_token) resolve(resp.access_token);
              else reject(new Error("Google auth failed"));
            }
          });
          tokenClient.requestAccessToken({ prompt: driveTokenRef.current ? "" : "consent" });
        } catch (e) {
          reject(e);
        }
      });
      driveTokenRef.current = token;

      // Open picker (PDF only)
      const picker = new window.google.picker.PickerBuilder()
        .setDeveloperKey(API_KEY)
        .setOAuthToken(token)
        .setOrigin(window.location.origin)
        .addView(new window.google.picker.DocsView(window.google.picker.ViewId.PDFS).setIncludeFolders(false))
        .setCallback(async (data) => {
          try {
            if (data.action !== window.google.picker.Action.PICKED) return;
            const doc = data.docs?.[0];
            if (!doc?.id) return;

            const fileId = doc.id;
            const fileName = doc.name || "document.pdf";

            const resp = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`, {
              headers: { Authorization: `Bearer ${token}` }
            });
            if (!resp.ok) throw new Error("Failed to download from Google Drive");
            const blob = await resp.blob();

            // Enforce PDF only
            const type = blob.type || "application/pdf";
            if (type !== "application/pdf") {
              setErr("Only PDF files are allowed from Google Drive.");
              return;
            }

            const f = new File([blob], fileName.endsWith(".pdf") ? fileName : `${fileName}.pdf`, { type: "application/pdf" });
            await addSingleFile(f);
          } catch (e) {
            setErr(e?.message || "Google Drive import failed");
          }
        })
        .build();

      picker.setVisible(true);
    } catch (e) {
      setErr(e?.message || "Google Drive picker failed to load");
    } finally {
      setBusy(false);
    }
  }

  async function goToOptions() {
    setErr("");
    if (!printerActive) return setErr("Printing is currently inactive. Please try later.");
    if (docs.length === 0) return setErr("Please add at least one document.");
    setBusy(true);
    try {
      const next = [...docs];
      for (let i = 0; i < next.length; i++) {
        if (!next[i].fileId) {
          const uploaded = await uploadFileToServer(next[i].file, next[i].pageCount);
          next[i].fileId = uploaded.id;
          next[i].fileName = uploaded.originalName;
          next[i].pageCount = typeof uploaded.pageCount === "number" ? uploaded.pageCount : next[i].pageCount;
          if (typeof next[i].pageCount === "number") {
            next[i].pageStart = clamp(next[i].pageStart, 1, next[i].pageCount);
            next[i].pageEnd = clamp(next[i].pageEnd, next[i].pageStart, next[i].pageCount);
          }
        }
      }
      setDocs(next);
      setStep(2);
    } catch (e) {
      setErr(e?.response?.data?.message || "Upload failed");
    } finally {
      setBusy(false);
    }
  }

  async function placeOrder() {
    setErr("");
    if (!printerActive) return setErr("Printing is currently inactive. Please try later.");
    setBusy(true);
    try {
      const payload = {
        items: docs.map((d) => ({
          fileId: d.fileId,
          printType: d.printType,
          sides: d.sides,
          pageStart: Number(d.pageStart),
          pageEnd: Number(d.pageEnd),
          copies: Number(d.copies),
          paperSize: d.paperSize,
          comment: d.comment || ""
        }))
      };
      const { data } = await api.post("/orders", payload);
      setOrder(data.order);
      setPaymentUi({ open: true, paypalOrderId: "", approveUrl: "" });
    } catch (e) {
      setErr(e?.response?.data?.message || "Order failed");
    } finally {
      setBusy(false);
    }
  }

  async function payWithRazorpay() {
    if (!order) return;
    setErr("");
    setBusy(true);
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
          setPaymentUi({ open: false, paypalOrderId: "", approveUrl: "" });
          alert("Payment successful!");
        }
      };
      // eslint-disable-next-line no-undef
      const rzp = new window.Razorpay(opts);
      rzp.open();
    } catch (e) {
      setErr(e?.response?.data?.message || "Razorpay payment setup failed (check keys)");
    } finally {
      setBusy(false);
    }
  }

  async function payWithPayPal() {
    if (!order) return;
    setErr("");
    setBusy(true);
    try {
      const { data } = await api.post("/payments/paypal/create-order", { orderId: order._id });
      setPaymentUi({ open: true, paypalOrderId: data.paypalOrderId, approveUrl: data.approveUrl });
      if (data.approveUrl) window.open(data.approveUrl, "_blank", "noopener,noreferrer");
    } catch (e) {
      setErr(e?.response?.data?.message || "PayPal payment setup failed (check keys)");
    } finally {
      setBusy(false);
    }
  }

  async function capturePayPal() {
    if (!order || !paymentUi.paypalOrderId) return;
    setErr("");
    setBusy(true);
    try {
      await api.post("/payments/paypal/capture", { orderId: order._id, paypalOrderId: paymentUi.paypalOrderId });
      setPaymentUi({ open: false, paypalOrderId: "", approveUrl: "" });
      alert("Payment captured!");
    } catch (e) {
      setErr(e?.response?.data?.message || "PayPal capture failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <div>
        <h1 className="page-title">New Print Order</h1>
        <p className="page-subtitle">Upload, choose options, review, and pay.</p>
      </div>

      <div className="mt-4">
        <Stepper step={step} />
      </div>

      <Card className="mt-6 p-6">
        {step === 1 ? (
          <div>
            <h2 className="text-xl font-extrabold">Upload Document</h2>
            <div className="mt-4 flex gap-2">
              <label className="inline-flex cursor-pointer">
                <input
                  type="file"
                  multiple
                  className="hidden"
                  ref={fileInputRef}
                  onChange={(e) => addFiles(e.target.files)}
                  accept=".pdf,.doc,.docx,.png,.jpg,.jpeg"
                  disabled={!printerActive}
                />
                <span className="rounded-2xl border border-sky-400 bg-sky-50 px-4 py-2 text-sm font-semibold text-sky-700">
                  ⬆ Upload File(s)
                </span>
              </label>
              <Button
                type="button"
                variant="secondary"
                onClick={pickFromGoogleDrive}
                disabled={!printerActive || busy}
              >
                Google Drive (PDF)
              </Button>
            </div>

            <button
              type="button"
              disabled={!printerActive}
              onClick={() => fileInputRef.current?.click()}
              className="mt-4 w-full rounded-2xl border border-dashed border-slate-300 p-10 text-center text-sm text-slate-500 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <span className="block font-semibold text-slate-700">Drop Your File Here Or</span>
              <span className="block text-sky-600 font-semibold">Click To Browse</span>
              <span className="mt-2 block text-xs text-slate-500">PDF, Word, Images (Max 50MB)</span>
            </button>

            {docs.length ? (
              <div className="mt-4 space-y-2">
                {docs.map((d) => (
                  <div key={d.localId} className="flex items-center justify-between rounded-xl border border-slate-100 px-4 py-3">
                    <div className="truncate">
                      <div className="font-semibold truncate">{d.fileName}</div>
                      <div className="text-xs text-slate-500">{Math.round((d.file?.size || 0) / 1024)} KB</div>
                    </div>
                    <Button
                      variant="ghost"
                      type="button"
                      onClick={() => setDocs((prev) => prev.filter((x) => x.localId !== d.localId))}
                    >
                      Remove
                    </Button>
                  </div>
                ))}
              </div>
            ) : null}

            <div className="mt-6 flex items-center justify-between">
              <Button variant="ghost" disabled>
                ← Back
              </Button>
              <Button onClick={goToOptions} disabled={busy}>
                {busy ? "Uploading..." : "Continue →"}
              </Button>
            </div>
          </div>
        ) : null}

        {step === 2 ? (
          <div>
            <h2 className="text-xl font-extrabold">Print Options</h2>
            <div className="mt-4 space-y-5">
              {docs.map((d, idx) => (
                <div key={d.localId} className="rounded-2xl border border-slate-100 p-4">
                  <div className="font-semibold truncate">Document {idx + 1}: {d.fileName}</div>

                  <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <div className="text-sm font-semibold text-slate-700">Print type</div>
                      <div className="mt-2">
                        <Toggle
                          value={d.printType}
                          onChange={(v) => setDocs((prev) => prev.map((x) => (x.localId === d.localId ? { ...x, printType: v } : x)))}
                          options={[
                            { value: "bw", label: `Black & White (₹${PRICING_INR.bwPerPage}/page)` },
                            { value: "color", label: `Color (₹${PRICING_INR.colorPerPage}/page)` }
                          ]}
                        />
                      </div>
                    </div>

                    <div>
                      <div className="text-sm font-semibold text-slate-700">Sides</div>
                      <div className="mt-2">
                        <Toggle
                          value={d.sides}
                          onChange={(v) => setDocs((prev) => prev.map((x) => (x.localId === d.localId ? { ...x, sides: v } : x)))}
                          options={[
                            { value: "single", label: "Single-sided" },
                            { value: "double", label: "Double-sided" }
                          ]}
                        />
                      </div>
                    </div>

                    <div>
                      <div className="text-sm font-semibold text-slate-700">Page Range (Start)</div>
                      <Input
                        className="mt-2"
                        type="number"
                        min={1}
                        value={d.pageStart}
                        onChange={(e) =>
                          setDocs((prev) =>
                            prev.map((x) => {
                              if (x.localId !== d.localId) return x;
                              const max = typeof x.pageCount === "number" ? x.pageCount : 999999;
                              const nextStart = clamp(e.target.value, 1, max);
                              const nextEnd = clamp(x.pageEnd, nextStart, max);
                              return { ...x, pageStart: nextStart, pageEnd: nextEnd };
                            })
                          )
                        }
                      />
                    </div>
                    <div>
                      <div className="text-sm font-semibold text-slate-700">Page Range (End)</div>
                      <Input
                        className="mt-2"
                        type="number"
                        min={1}
                        value={d.pageEnd}
                        onChange={(e) =>
                          setDocs((prev) =>
                            prev.map((x) => {
                              if (x.localId !== d.localId) return x;
                              const max = typeof x.pageCount === "number" ? x.pageCount : 999999;
                              const start = clamp(x.pageStart, 1, max);
                              const end = clamp(e.target.value, start, max);
                              return { ...x, pageStart: start, pageEnd: end };
                            })
                          )
                        }
                      />
                      <div className="mt-1 text-xs text-slate-500">
                        {d.sides === "double"
                          ? `${calcBillingUnits({
                              pageStart: Math.min(Number(d.pageStart), Number(d.pageEnd)),
                              pageEnd: Math.max(Number(d.pageStart), Number(d.pageEnd)),
                              sides: "double"
                            })} sheets selected (double-sided)`
                          : `${Math.abs(Number(d.pageEnd) - Number(d.pageStart)) + 1} pages selected`}
                        {typeof d.pageCount === "number" ? <span className="ml-2 text-slate-400">• Max {d.pageCount}</span> : null}
                      </div>
                    </div>

                    <div>
                      <div className="text-sm font-semibold text-slate-700">Copies</div>
                      <Input
                        className="mt-2"
                        type="number"
                        min={1}
                        value={d.copies}
                        onChange={(e) => setDocs((prev) => prev.map((x) => (x.localId === d.localId ? { ...x, copies: e.target.value } : x)))}
                      />
                    </div>
                    <div>
                      <div className="text-sm font-semibold text-slate-700">Paper size</div>
                      <Select
                        className="mt-2"
                        value={d.paperSize}
                        onChange={(e) => setDocs((prev) => prev.map((x) => (x.localId === d.localId ? { ...x, paperSize: e.target.value } : x)))}
                      >
                        <option value="A4">A4</option>
                        <option value="A3">A3</option>
                        <option value="Legal">Legal</option>
                      </Select>
                    </div>
                  </div>

                  <div className="mt-3 text-xs text-slate-500">
                    Binding/Staple/Bundling: <span className="font-semibold">not available</span>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-6 flex items-center justify-between">
              <Button variant="ghost" onClick={() => setStep(1)}>
                ← Back
              </Button>
              <Button onClick={() => setStep(3)}>Continue →</Button>
            </div>
          </div>
        ) : null}

        {step === 3 ? (
          <div>
            <h2 className="text-xl font-extrabold">Special Instructions</h2>
            <p className="mt-1 text-sm text-slate-500">
              Add any special instructions for the print shop. Our system will automatically analyze your request.
            </p>

            <div className="mt-5 space-y-5">
              {docs.map((d, idx) => (
                <div key={d.localId} className="rounded-2xl border border-slate-100 p-4">
                  <div className="font-semibold truncate">Document {idx + 1}: {d.fileName}</div>
                  <div className="mt-3 text-sm font-semibold text-slate-700">Comments (optional)</div>
                  <textarea
                    className="mt-2 w-full rounded-2xl border border-slate-200 bg-white p-3 text-sm outline-none focus:ring-2 focus:ring-sky-200"
                    rows={4}
                    placeholder="E.g. Pages 2 and 6 colored. Urgent — needed by tomorrow morning."
                    value={d.comment}
                    onChange={(e) => setDocs((prev) => prev.map((x) => (x.localId === d.localId ? { ...x, comment: e.target.value } : x)))}
                  />
                  <div className="mt-2 text-xs text-slate-500">
                    Tip: You can write: “pages 2,6 colored” or “colored pages 2-4”.
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-6 flex items-center justify-between">
              <Button variant="ghost" onClick={() => setStep(2)}>
                ← Back
              </Button>
              <Button onClick={() => setStep(4)}>Continue →</Button>
            </div>
          </div>
        ) : null}

        {step === 4 ? (
          <div>
            <h2 className="text-xl font-extrabold">Order Summary</h2>
            <div className="mt-4 space-y-4">
              {docs.map((d, idx) => {
                const line = totals.lines.find((l) => l.id === d.localId);
                const pageStart = Math.min(Number(d.pageStart), Number(d.pageEnd));
                const pageEnd = Math.max(Number(d.pageStart), Number(d.pageEnd));
                const billedUnits = calcBillingUnits({ pageStart, pageEnd, sides: d.sides });
                return (
                  <div key={d.localId} className="rounded-2xl bg-slate-50 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="font-semibold">Document {idx + 1}</div>
                        <div className="text-sm text-slate-700 truncate">{d.fileName}</div>
                      </div>
                      {d.fileId ? (
                        <Button variant="secondary" onClick={() => openFileInline(d.fileId)} disabled={busy}>
                          Open
                        </Button>
                      ) : null}
                    </div>
                    <div className="mt-3 grid grid-cols-2 gap-y-2 text-sm">
                      <div className="text-slate-500">Print Type</div>
                      <div className="text-right font-semibold">{d.printType === "bw" ? "Black & White" : "Color"}</div>

                      <div className="text-slate-500">Sides</div>
                      <div className="text-right font-semibold">{d.sides === "single" ? "Single-sided" : "Double-sided"}</div>

                      <div className="text-slate-500">Pages</div>
                      <div className="text-right font-semibold">
                        {pageStart}–{pageEnd} ({pageEnd - pageStart + 1} pages){" "}
                        {d.sides === "double" ? (
                          <span className="text-slate-500">• billed as {billedUnits} sheets</span>
                        ) : null}
                      </div>

                      <div className="text-slate-500">Copies</div>
                      <div className="text-right font-semibold">{d.copies} copy</div>

                      <div className="text-slate-500">Paper Size</div>
                      <div className="text-right font-semibold">{d.paperSize}</div>

                      <div className="text-slate-500">Estimated Amount</div>
                      <div className="text-right font-extrabold">₹{(line?.lineAmount || 0).toFixed(2)}</div>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="mt-4 rounded-2xl bg-sky-50 p-4 flex items-center justify-between">
              <div className="font-extrabold">Total Amount</div>
              <div className="text-2xl font-extrabold">₹{totals.total.toFixed(2)}</div>
            </div>

            <div className="mt-6 flex items-center justify-between">
              <Button variant="ghost" onClick={() => setStep(3)}>
                ← Back
              </Button>
              <Button onClick={placeOrder} disabled={busy}>
                {busy ? "Placing..." : "Place Order & Pay →"}
              </Button>
            </div>
          </div>
        ) : null}

        {err ? <div className="mt-4 text-sm text-red-600">{err}</div> : null}
      </Card>

      {paymentUi.open && order ? (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4">
          <Card className="w-full max-w-lg p-6">
            <div className="text-xl font-extrabold">Pay for Order</div>
            <div className="mt-1 text-sm text-slate-500">Order #{String(order._id).slice(-6)} • ₹{order.totalAmount.toFixed(2)}</div>

            <div className="mt-4 space-y-3">
              <Button className="w-full" onClick={payWithRazorpay} disabled={busy}>
                Pay with Razorpay / UPI
              </Button>
              <Button className="w-full" variant="secondary" onClick={payWithPayPal} disabled={busy}>
                Pay with PayPal
              </Button>
              {paymentUi.paypalOrderId ? (
                <div className="rounded-xl border border-slate-200 p-3 text-sm">
                  <div className="font-semibold">PayPal flow</div>
                  <div className="text-slate-600 mt-1">
                    Complete the PayPal payment in the opened tab, then come back and click:
                  </div>
                  <Button className="mt-3 w-full" onClick={capturePayPal} disabled={busy}>
                    I completed payment (Capture)
                  </Button>
                </div>
              ) : null}
            </div>

            <div className="mt-4 flex justify-end">
              <Button
                variant="ghost"
                onClick={() => setPaymentUi({ open: false, paypalOrderId: "", approveUrl: "" })}
                disabled={busy}
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
