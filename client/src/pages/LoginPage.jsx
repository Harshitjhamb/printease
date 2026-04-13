import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../lib/auth.jsx";
import { Button, Card, Input } from "../components/ui.jsx";

export default function LoginPage() {
  const nav = useNavigate();
  const { loginAs } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [mode, setMode] = useState("user"); // user | admin
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  async function onSubmit(e) {
    e.preventDefault();
    setErr("");
    setBusy(true);
    try {
      await loginAs(mode, email, password);
      nav(mode === "admin" ? "/admin" : "/app");
    } catch (e2) {
      setErr(e2?.response?.data?.message || e2?.message || "Login failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="min-h-screen grid grid-cols-1 md:grid-cols-2">
      <div className="hidden md:flex items-center justify-center bg-slate-950 text-white relative overflow-hidden">
        <div className="absolute -left-24 -top-24 h-64 w-64 rounded-full bg-sky-500/10" />
        <div className="absolute -right-24 -bottom-24 h-72 w-72 rounded-full bg-sky-500/10" />
        <div className="max-w-md px-10">
          <div className="h-14 w-14 rounded-2xl bg-sky-500/20 ring-1 ring-sky-400/30 flex items-center justify-center mb-6">
            <span className="text-sky-200 text-xl font-extrabold">⎙</span>
          </div>
          <h1 className="text-4xl font-extrabold tracking-tight">PrintEase</h1>
          <p className="mt-4 text-slate-300">
            Professional printing at your fingertips. Upload, configure, pay — done.
          </p>
          <div className="mt-8 grid grid-cols-2 gap-3 text-sm">
            <div className="rounded-2xl bg-white/5 px-4 py-3">Print Types<br />B&amp;W + Color</div>
            <div className="rounded-2xl bg-white/5 px-4 py-3">Paper Sizes<br />A4, A3, Legal</div>
            <div className="rounded-2xl bg-white/5 px-4 py-3">Binding<br />Not available</div>
            <div className="rounded-2xl bg-white/5 px-4 py-3">Delivery<br />Fast &amp; Reliable</div>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-center p-6 bg-slate-50">
        <div className="w-full max-w-md">
          <Card className="p-8">
            <h2 className="text-2xl font-extrabold tracking-tight">Welcome Back</h2>
            <p className="mt-1 text-sm text-slate-500">Sign in to manage your print orders.</p>

            <form className="mt-6 space-y-4" onSubmit={onSubmit}>
              <div>
                <label className="text-sm font-semibold text-slate-700">Login as</label>
                <div className="mt-2 flex gap-2">
                  <button
                    type="button"
                    className={[
                      "flex-1 rounded-2xl px-4 py-2 text-sm font-semibold border",
                      mode === "user"
                        ? "border-sky-400 bg-sky-50 text-sky-700"
                        : "border-slate-200 bg-white text-slate-700"
                    ].join(" ")}
                    onClick={() => setMode("user")}
                  >
                    User
                  </button>
                  <button
                    type="button"
                    className={[
                      "flex-1 rounded-2xl px-4 py-2 text-sm font-semibold border",
                      mode === "admin"
                        ? "border-sky-400 bg-sky-50 text-sky-700"
                        : "border-slate-200 bg-white text-slate-700"
                    ].join(" ")}
                    onClick={() => setMode("admin")}
                  >
                    Admin
                  </button>
                </div>
                <div className="mt-2 text-xs text-slate-500">
                  Tip: You can stay logged-in as both by logging into User and Admin separately.
                </div>
              </div>
              <div>
                <label className="text-sm font-semibold text-slate-700">Email address</label>
                <Input className="mt-1" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" />
              </div>
              <div>
                <label className="text-sm font-semibold text-slate-700">Password</label>
                <Input className="mt-1" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Enter your password" />
              </div>

              {err ? <div className="text-sm text-red-600">{err}</div> : null}

              <Button className="w-full py-3" disabled={busy}>
                {busy ? "Signing in..." : "Sign in"}
              </Button>
            </form>

            <div className="mt-4 text-center text-sm text-slate-600">
              Don’t have an account?{" "}
              <Link className="text-sky-600 font-semibold" to="/signup">
                Create one
              </Link>
            </div>
          </Card>

        </div>
      </div>
    </div>
  );
}
