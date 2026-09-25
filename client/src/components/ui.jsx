import { AlertTriangle, CheckCircle2, Info, Loader2, XCircle } from "lucide-react";

/* ---------------------------------------------------------------
   Card — glass surface used across every page
--------------------------------------------------------------- */
export function Card({ children, className = "", padded = true, glass = true }) {
  return (
    <div
      className={`${glass ? "glass hairline" : "bg-slate-900/70 border border-slate-800"} ${
        padded ? "p-6 sm:p-8" : ""
      } rounded-2xl ${className}`}
    >
      {children}
    </div>
  );
}

/* Kicker + gradient title + description block */
export function SectionTitle({ kicker, title, children, align = "left" }) {
  const centered = align === "center";
  return (
    <div className={`mb-8 ${centered ? "text-center" : ""}`}>
      {kicker && (
        <p
          className={`inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-brand-400 ${
            centered ? "justify-center" : ""
          }`}
        >
          <span className="h-px w-6 bg-gradient-to-r from-transparent to-brand-500/60" />
          {kicker}
          <span className="h-px w-6 bg-gradient-to-l from-transparent to-brand-500/60" />
        </p>
      )}
      <h2 className="mt-3 font-display text-3xl font-bold tracking-tight text-slate-100 sm:text-4xl">
        {title}
      </h2>
      {children && (
        <p className={`mt-3 max-w-2xl text-sm leading-relaxed text-slate-400 sm:text-base ${centered ? "mx-auto" : ""}`}>
          {children}
        </p>
      )}
    </div>
  );
}

/* ---------------------------------------------------------------
   Button — primary / secondary / danger / ghost / outline
--------------------------------------------------------------- */
const BUTTON_VARIANTS = {
  primary:
    "bg-brand-500 text-slate-950 shadow-lg shadow-brand-500/25 hover:bg-brand-400 hover:shadow-brand-400/30 focus-visible:outline-brand-400 disabled:bg-brand-500/40",
  secondary:
    "bg-slate-800/90 text-slate-100 hover:bg-slate-700/90 focus-visible:outline-slate-500 disabled:opacity-50",
  danger:
    "bg-red-500/90 text-white shadow-lg shadow-red-500/20 hover:bg-red-500 focus-visible:outline-red-400 disabled:opacity-50",
  ghost:
    "bg-transparent text-slate-300 hover:bg-slate-800/70 hover:text-slate-100 focus-visible:outline-slate-600 disabled:opacity-50",
  outline:
    "border border-slate-700 bg-slate-900/40 text-slate-200 hover:border-brand-500/50 hover:text-brand-300 focus-visible:outline-brand-500/50 disabled:opacity-50",
};

export function Button({ variant = "primary", className = "", loading = false, children, ...props }) {
  return (
    <button
      className={`inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition-all duration-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 active:scale-[0.98] disabled:cursor-not-allowed disabled:active:scale-100 ${BUTTON_VARIANTS[variant]} ${className}`}
      disabled={loading || props.disabled}
      {...props}
    >
      {loading && <Loader2 className="h-4 w-4 animate-spin" />}
      {children}
    </button>
  );
}

export function Input({ className = "", ...props }) {
  return (
    <input
      className={`w-full rounded-xl border border-slate-700/80 bg-slate-950/60 px-4 py-2.5 text-sm text-slate-100 transition-colors placeholder:text-slate-500 focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-400/20 ${className}`}
      {...props}
    />
  );
}

export function Field({ label, hint, children }) {
  return (
    <label className="block">
      <span className="mb-1.5 flex items-baseline justify-between text-sm font-medium text-slate-300">
        {label}
        {hint && <span className="text-xs font-normal text-slate-500">{hint}</span>}
      </span>
      {children}
    </label>
  );
}

/* Small status pill — VALID / REVOKED / NOT_FOUND and generic variants */
const BADGE_TONES = {
  VALID: "border-brand-500/40 bg-brand-500/15 text-brand-300",
  REVOKED: "border-red-500/40 bg-red-500/15 text-red-300",
  NOT_FOUND: "border-slate-600/60 bg-slate-500/15 text-slate-300",
  neutral: "border-slate-700 bg-slate-800/60 text-slate-300",
  brand: "border-brand-500/40 bg-brand-500/10 text-brand-300",
  warn: "border-amber-500/40 bg-amber-500/15 text-amber-300",
};

export function Badge({ tone = "neutral", children, className = "" }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold tracking-wide ${BADGE_TONES[tone] || BADGE_TONES.neutral} ${className}`}
    >
      {children}
    </span>
  );
}

/* Shimmering skeleton placeholder */
export function Skeleton({ className = "h-4 w-full" }) {
  return <div className={`skeleton ${className}`} aria-hidden="true" />;
}

export function Spinner({ className = "h-5 w-5" }) {
  return <Loader2 className={`animate-spin text-current ${className}`} />;
}

/* ---------------------------------------------------------------
   Alert — info / success / error / warn, with a tone icon built in
--------------------------------------------------------------- */
const ALERT_TONES = {
  info: { cls: "border-sky-500/30 bg-sky-500/10 text-sky-200", Icon: Info, iconCls: "text-sky-300" },
  success: { cls: "border-brand-500/30 bg-brand-500/10 text-brand-200", Icon: CheckCircle2, iconCls: "text-brand-300" },
  error: { cls: "border-red-500/30 bg-red-500/10 text-red-200", Icon: XCircle, iconCls: "text-red-300" },
  warn: { cls: "border-amber-500/30 bg-amber-500/10 text-amber-200", Icon: AlertTriangle, iconCls: "text-amber-300" },
};

export function Alert({ tone = "info", children, className = "", icon = true }) {
  const { cls, Icon, iconCls } = ALERT_TONES[tone] || ALERT_TONES.info;
  return (
    <div className={`animate-scale-in rounded-xl border px-4 py-3 text-sm ${cls} ${className}`} role="status">
      <div className="flex items-start gap-2.5">
        {icon && <Icon className={`mt-0.5 h-4 w-4 shrink-0 ${iconCls}`} strokeWidth={2.2} />}
        <div className="min-w-0 flex-1">{children}</div>
      </div>
    </div>
  );
}

/* ---------------------------------------------------------------
   EmptyState — one consistent "nothing here yet" pattern
--------------------------------------------------------------- */
export function EmptyState({ icon: Icon, title, children, action, className = "", compact = false }) {
  return (
    <div className={`flex flex-col items-center text-center ${compact ? "gap-2 py-6" : "gap-3 py-10"} ${className}`}>
      {Icon && (
        <span
          className={`grid place-items-center rounded-xl border border-slate-700/80 bg-slate-950/50 text-slate-500 dot-grid ${
            compact ? "h-10 w-10" : "h-12 w-12"
          }`}
        >
          <Icon className={compact ? "h-4.5 w-4.5" : "h-5 w-5"} strokeWidth={1.8} />
        </span>
      )}
      <p className={`font-display font-bold text-slate-200 ${compact ? "text-base" : "text-lg"}`}>{title}</p>
      {children && <div className="max-w-md text-sm leading-relaxed text-slate-500">{children}</div>}
      {action && <div className="mt-1">{action}</div>}
    </div>
  );
}

/* Monospace copy-to-clipboard chip for hashes / addresses / IDs */
export function CopyChip({ value, display, className = "" }) {
  const text = display || value;
  return (
    <button
      type="button"
      title="Copy to clipboard"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(value);
        } catch {
          /* clipboard unavailable */
        }
      }}
      className={`inline-flex max-w-full items-center gap-1.5 rounded-lg border border-slate-700/70 bg-slate-950/60 px-2.5 py-1 font-mono text-xs text-slate-300 transition-colors hover:border-brand-500/40 hover:text-brand-300 ${className}`}
    >
      <span className="truncate">{text}</span>
    </button>
  );
}
