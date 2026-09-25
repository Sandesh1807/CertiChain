import { GraduationCap, Code2 } from "lucide-react";
import { Link } from "react-router-dom";
import { SEPOLIA } from "../config/chains";

export default function Footer() {
  const year = new Date().getFullYear();
  return (
    <footer className="border-t border-slate-800/70 bg-slate-950/60">
      <div className="mx-auto grid max-w-6xl gap-10 px-4 py-12 sm:grid-cols-2 lg:grid-cols-4">
        <div className="sm:col-span-2">
          <Link to="/" className="flex items-center gap-2.5">
            <span className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br from-brand-400 to-teal-600 shadow-lg shadow-brand-500/20">
              <GraduationCap className="h-5 w-5 text-slate-950" strokeWidth={2.2} />
            </span>
            <span className="font-display text-lg font-bold tracking-tight text-slate-100">
              Certi<span className="text-brand-400">Chain</span>
            </span>
          </Link>
          <p className="mt-3 max-w-sm text-sm leading-relaxed text-slate-500">
            Tamper-resistant digital certificates, verified in seconds. Issued by college wallets,
            proven by the blockchain — no backend, no database, no middleman.
          </p>
          <p className="mt-4 inline-flex items-center gap-2 rounded-full border border-slate-800 bg-slate-900/60 px-3 py-1.5 text-xs text-slate-400">
            <span className="h-1.5 w-1.5 rounded-full bg-brand-400" />
            Live on the {SEPOLIA.label} · free forever
          </p>
        </div>

        <nav aria-label="Product">
          <h3 className="text-xs font-semibold uppercase tracking-widest text-slate-500">Product</h3>
          <ul className="mt-3 space-y-2 text-sm">
            <li><Link className="text-slate-400 transition-colors hover:text-brand-300" to="/verify">Verify a certificate</Link></li>
            <li><Link className="text-slate-400 transition-colors hover:text-brand-300" to="/dashboard">Issuer dashboard</Link></li>
            <li><Link className="text-slate-400 transition-colors hover:text-brand-300" to="/verify/CERT-2026-0001">Demo certificate</Link></li>
          </ul>
        </nav>

        <nav aria-label="Resources">
          <h3 className="text-xs font-semibold uppercase tracking-widest text-slate-500">Resources</h3>
          <ul className="mt-3 space-y-2 text-sm">
            <li>
              <a className="text-slate-400 transition-colors hover:text-brand-300" href={SEPOLIA.explorer} target="_blank" rel="noreferrer">
                Sepolia Etherscan ↗
              </a>
            </li>
            <li>
              <a className="text-slate-400 transition-colors hover:text-brand-300" href="https://cloud.google.com/application/web3/faucet/ethereum/sepolia" target="_blank" rel="noreferrer">
                Sepolia faucet ↗
              </a>
            </li>
            <li>
              <a className="inline-flex items-center gap-1.5 text-slate-400 transition-colors hover:text-brand-300" href="https://github.com" target="_blank" rel="noreferrer">
                <Code2 className="h-3.5 w-3.5" /> Source
              </a>
            </li>
          </ul>
        </nav>
      </div>

      <div className="border-t border-slate-800/70 py-5 text-center text-xs text-slate-600">
        © {year} CertiChain · MIT · Hackathon MVP · verify anything on-chain, trust nothing else
      </div>
    </footer>
  );
}
