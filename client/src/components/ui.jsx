import clsx from "clsx";

export function Card({ className, ...props }) {
  return (
    <div
      className={clsx(
        "rounded-2xl bg-white/90 backdrop-blur shadow-soft border border-slate-200/60",
        "transition-shadow hover:shadow-[0_16px_38px_rgba(0,0,0,0.08)]",
        className
      )}
      {...props}
    />
  );
}

export function Button({ className, variant = "primary", size = "md", ...props }) {
  const base =
    "inline-flex items-center justify-center gap-2 rounded-xl font-semibold transition active:translate-y-[1px] disabled:opacity-50 disabled:cursor-not-allowed";

  const sizes =
    size === "sm"
      ? "px-3 py-1.5 text-sm"
      : size === "lg"
        ? "px-5 py-3 text-sm"
        : "px-4 py-2 text-sm";

  const styles =
    variant === "primary"
      ? "bg-sky-600 text-white hover:bg-sky-700 shadow-sm shadow-sky-600/20"
      : variant === "secondary"
        ? "bg-white text-slate-900 border border-slate-200 hover:bg-slate-50"
        : variant === "danger"
          ? "bg-rose-600 text-white hover:bg-rose-700"
          : "bg-transparent text-slate-700 hover:bg-slate-100";

  return <button className={clsx(base, sizes, styles, className)} {...props} />;
}

export function Input({ className, ...props }) {
  return (
    <input
      className={clsx(
        "w-full rounded-xl border border-slate-200 bg-white/90 px-3 py-2 text-sm text-slate-900 outline-none",
        "placeholder:text-slate-400 focus:ring-2 focus:ring-sky-200 focus:border-sky-300",
        "disabled:bg-slate-50 disabled:text-slate-500",
        className
      )}
      {...props}
    />
  );
}

export function Select({ className, children, ...props }) {
  return (
    <select
      className={clsx(
        "w-full rounded-xl border border-slate-200 bg-white/90 px-3 py-2 text-sm text-slate-900 outline-none",
        "focus:ring-2 focus:ring-sky-200 focus:border-sky-300 disabled:bg-slate-50 disabled:text-slate-500",
        className
      )}
      {...props}
    >
      {children}
    </select>
  );
}

export function Badge({ className, tone = "slate", children }) {
  const tones = {
    slate: "bg-slate-100 text-slate-700",
    green: "bg-green-100 text-green-800",
    yellow: "bg-amber-100 text-amber-900",
    red: "bg-rose-100 text-rose-900",
    blue: "bg-sky-100 text-sky-900"
  };
  return (
    <span
      className={clsx(
        "inline-flex items-center rounded-full px-3 py-1 text-xs font-extrabold tracking-tight",
        tones[tone] || tones.slate,
        className
      )}
    >
      {children}
    </span>
  );
}
