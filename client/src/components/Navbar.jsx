import { useState } from "react";
import { GraduationCap, Menu, ShieldCheck, X } from "lucide-react";
import { NavLink } from "react-router-dom";
import WalletButton from "./WalletButton";

const LINKS = [
  { to: "/", label: "Home", end: true },
  { to: "/verify", label: "Verify" },
  { to: "/dashboard", label: "Dashboard" },
];

export default function Navbar() {
  const [open, setOpen] = useState(false);

  const linkClass = ({ isActive }) =>
    `rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
      isActive
        ? "bg-brand-500/15 text-brand-300 ring-1 ring-brand-500/25"
        : "text-slate-400 hover:bg-slate-800/60 hover:text-slate-100"
    }`;

  return (
    <header className="sticky top-0 z-30 border-b border-slate-800/70 bg-slate-950/75 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4">
        <NavLink to="/" className="flex items-center gap-2.5" onClick={() => setOpen(false)}>
          <span className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br from-brand-400 to-teal-600 shadow-lg shadow-brand-500/20">
            <GraduationCap className="h-5 w-5 text-slate-950" strokeWidth={2.2} />
          </span>
          <span className="font-display text-lg font-bold tracking-tight text-slate-100">
            Certi<span className="text-brand-400">Chain</span>
          </span>
        </NavLink>

        <nav className="hidden items-center gap-1 md:flex">
          {LINKS.map((l) => (
            <NavLink key={l.to} to={l.to} end={l.end} className={linkClass}>
              {l.label}
            </NavLink>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          <WalletButton />
          <button
            type="button"
            aria-label={open ? "Close menu" : "Open menu"}
            onClick={() => setOpen((v) => !v)}
            className="grid h-10 w-10 place-items-center rounded-xl border border-slate-800 bg-slate-900/60 text-slate-300 transition-colors hover:text-slate-100 md:hidden"
          >
            {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {/* Mobile nav */}
      {open && (
        <nav className="animate-fade-in border-t border-slate-800/70 bg-slate-950/95 px-4 py-3 md:hidden">
          <div className="flex flex-col gap-1">
            {LINKS.map((l) => (
              <NavLink key={l.to} to={l.to} end={l.end} className={linkClass} onClick={() => setOpen(false)}>
                {l.label}
              </NavLink>
            ))}
            <NavLink
              to="/verify"
              className="mt-1 flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold text-brand-300"
              onClick={() => setOpen(false)}
            >
              <ShieldCheck className="h-4 w-4" /> Verify a certificate
            </NavLink>
          </div>
        </nav>
      )}
    </header>
  );
}
