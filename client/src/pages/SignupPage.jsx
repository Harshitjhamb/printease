import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../lib/auth.jsx";
import { Button, Card, Input } from "../components/ui.jsx";

export default function SignupPage() {
  const nav = useNavigate();
  const { signup } = useAuth();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [rollNo, setRollNo] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  async function onSubmit(e) {
    e.preventDefault();
    setErr("");
    setBusy(true);
    try {
      await signup(name, email, phone, rollNo, password);
      nav("/app");
    } catch (e2) {
      setErr(e2?.response?.data?.message || "Signup failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="min-h-screen grid grid-cols-1 md:grid-cols-2">
      <div className="hidden md:flex items-center justify-center bg-slate-950 text-white relative overflow-hidden">
        <div className="absolute -left-24 -bottom-24 h-72 w-72 rounded-full bg-sky-500/10" />
        <div className="absolute -right-24 -top-24 h-64 w-64 rounded-full bg-sky-500/10" />
        <div className="max-w-md px-10">
          <div className="h-14 w-14 rounded-2xl bg-sky-500/20 ring-1 ring-sky-400/30 flex items-center justify-center mb-6">
            <span className="text-sky-200 text-xl font-extrabold">⎙</span>
          </div>
          <h1 className="text-4xl font-extrabold tracking-tight">Join PrintEase</h1>
          <p className="mt-4 text-slate-300">Create your account and start ordering professional prints in minutes.</p>
          <ul className="mt-8 space-y-2 text-sm text-slate-300">
            <li>• Upload from your device or Google Drive</li>
            <li>• Choose B&amp;W or full color printing</li>
            <li>• Real-time cost calculation</li>
            <li>• Track orders and payments</li>
          </ul>
        </div>
      </div>

      <div className="flex items-center justify-center p-6 bg-slate-50">
        <div className="w-full max-w-md">
          <Card className="p-8">
            <h2 className="text-2xl font-extrabold tracking-tight">Create Account</h2>
            <p className="mt-1 text-sm text-slate-500">Start printing professionally today.</p>

            <form className="mt-6 space-y-4" onSubmit={onSubmit}>
              <div>
                <label className="text-sm font-semibold text-slate-700">Full name</label>
                <Input className="mt-1" value={name} onChange={(e) => setName(e.target.value)} placeholder="John Doe" />
              </div>
              <div>
                <label className="text-sm font-semibold text-slate-700">Email address</label>
                <Input className="mt-1" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" />
              </div>
              <div>
                <label className="text-sm font-semibold text-slate-700">Phone number</label>
                <Input className="mt-1" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="10-digit mobile number" />
              </div>
              <div>
                <label className="text-sm font-semibold text-slate-700">Roll number</label>
                <Input className="mt-1" value={rollNo} onChange={(e) => setRollNo(e.target.value)} placeholder="College roll number" />
              </div>
              <div>
                <label className="text-sm font-semibold text-slate-700">Password</label>
                <Input className="mt-1" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Min. 6 characters" />
              </div>

              {err ? <div className="text-sm text-red-600">{err}</div> : null}

              <Button className="w-full py-3" disabled={busy}>
                {busy ? "Creating..." : "Create account"}
              </Button>
            </form>

            <div className="mt-4 text-center text-sm text-slate-600">
              Already have an account?{" "}
              <Link className="text-sky-600 font-semibold" to="/">
                Sign in
              </Link>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
