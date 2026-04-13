import React from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../lib/auth.jsx";
import clsx from "clsx";

export default function AppShell({ children }) {
  const { user, logout, activeMode } = useAuth();
  const nav = useNavigate();

  const linkClass = ({ isActive }) =>
    clsx(
      "inline-flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold transition",
      isActive ? "bg-white/15 text-white ring-1 ring-white/15" : "text-slate-200 hover:bg-white/10 hover:text-white"
    );

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Background decoration */}
      <div className="pointer-events-none fixed inset-0 -z-10">
        <div className="absolute -top-24 -left-24 h-72 w-72 rounded-full bg-sky-400/15 blur-3xl" />
        <div className="absolute -bottom-24 -right-24 h-80 w-80 rounded-full bg-indigo-400/10 blur-3xl" />
      </div>
      <div className="sticky top-0 z-50 bg-slate-950/90 text-white backdrop-blur border-b border-white/10">
        <div className="container-app flex items-center justify-between py-3">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-xl bg-white/10 ring-1 ring-white/10 flex items-center justify-center">
              <span className="text-white font-extrabold">P</span>
            </div>
            <span className="font-extrabold tracking-tight">PrintEase</span>
            <span className="hidden sm:inline text-xs font-bold text-white/60 rounded-full border border-white/10 px-2 py-1">
              {activeMode === "admin" ? "Admin" : "User"}
            </span>
          </div>

          <div className="flex items-center gap-2">
            {activeMode === "admin" ? (
              <NavLink to="/admin" className={linkClass}>
                Admin
              </NavLink>
            ) : (
              <>
                <NavLink to="/app" className={linkClass} end>
                  Dashboard
                </NavLink>
                <NavLink to="/app/new" className={linkClass}>
                  + New Order
                </NavLink>
                <NavLink to="/app/orders" className={linkClass}>
                  My Orders
                </NavLink>
              </>
            )}
          </div>

          <div className="flex items-center gap-3">
            <div className="hidden md:flex items-center gap-2 rounded-xl bg-white/10 px-3 py-2">
              <div className="h-8 w-8 rounded-full bg-white/20 flex items-center justify-center">
                <span className="text-xs font-bold">{(user?.name || "U").slice(0, 1).toUpperCase()}</span>
              </div>
              <div className="text-sm">
                <div className="font-semibold leading-4">{user?.name || "User"}</div>
                <div className="text-xs text-slate-300 leading-4">{user?.email}</div>
              </div>
            </div>
            <button
              className="text-sm font-extrabold text-white/80 hover:text-white transition"
              onClick={() => {
                logout(activeMode);
                nav("/");
              }}
            >
              Logout
            </button>
          </div>
        </div>
      </div>

      <main className="container-app py-6">{children}</main>
    </div>
  );
}
