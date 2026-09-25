import { Link } from "react-router-dom";
import {
  ArrowRight,
  BadgeCheck,
  Blocks,
  Building2,
  Camera,
  Eye,
  FileSearch,
  Landmark,
  Lock,
  QrCode,
  ScanLine,
  ShieldCheck,
  Smartphone,
  Zap,
} from "lucide-react";
import { Card } from "../components/ui";

const FEATURES = [
  {
    icon: Lock,
    title: "Tamper-evident by design",
    body: "Issued records live on-chain. Editing or deleting one is impossible — only a public revocation can ever change a status.",
  },
  {
    icon: Zap,
    title: "Verification in seconds",
    body: "Type an ID or scan a QR code. The answer is read straight from the blockchain — no phone calls, no emails, no waiting days.",
  },
  {
    icon: Eye,
    title: "Trustless by architecture",
    body: "There is no backend to trust. Verifiers read the chain through free public RPCs, so nobody can quietly alter a result.",
  },
  {
    icon: Building2,
    title: "Multi-college registry",
    body: "The contract owner whitelists any number of institutional wallets — one shared source of truth instead of siloed databases.",
  },
  {
    icon: FileSearch,
    title: "Fully auditable history",
    body: "Every issuance and revocation is a signed, timestamped event — permanently visible on Etherscan for anyone to audit.",
  },
  {
    icon: QrCode,
    title: "Printable QR proof",
    body: "Each issued certificate gets a QR code that deep-links to its public verification page — perfect for résumés and documents.",
  },
];

const STEPS = [
  {
    icon: Landmark,
    title: "College issues",
    body: "An authorized college wallet fills in the student, course and date. One transaction writes the record to Sepolia.",
  },
  {
    icon: Blocks,
    title: "Chain keeps it",
    body: "The certificate's content, timestamp and issuer are stored on-chain. Nobody — not even the college — can rewrite history.",
  },
  {
    icon: Smartphone,
    title: "Anyone verifies",
    body: "A recruiter scans the QR or types the ID. The app reads the chain directly: no wallet, no account, no middleman.",
  },
];

export default function Home() {
  return (
    <div className="space-y-24 pb-8">
      {/* -------------------------------------------------- Hero */}
      <section className="relative pt-12 text-center sm:pt-20">
        <div className="dot-grid pointer-events-none absolute inset-x-0 -top-24 h-[420px]" aria-hidden="true" />
        <div className="relative">
          <p className="animate-fade-in mx-auto inline-flex items-center gap-2 rounded-full border border-brand-500/30 bg-brand-500/10 px-4 py-1.5 text-xs font-semibold uppercase tracking-widest text-brand-300">
            <ShieldCheck className="h-3.5 w-3.5" />
            Built on the Ethereum Sepolia testnet · free to use
          </p>
          <h1 className="animate-fade-up mx-auto mt-6 max-w-4xl text-balance font-display text-4xl font-bold leading-[1.08] tracking-tight text-slate-50 sm:text-6xl lg:text-7xl">
            Degrees that <span className="text-gradient">can't be faked</span>,<br className="hidden sm:block" /> verified in seconds.
          </h1>
          <p className="animate-fade-up mx-auto mt-6 max-w-2xl text-base leading-relaxed text-slate-400 sm:text-lg" style={{ animationDelay: "80ms" }}>
            CertiChain lets colleges issue tamper-resistant digital certificates and lets any
            recruiter, university or employer verify them with a QR code — straight from the
            blockchain, no middleman.
          </p>
          <div className="animate-fade-up mt-9 flex flex-wrap items-center justify-center gap-3" style={{ animationDelay: "160ms" }}>
            <Link
              to="/verify"
              className="group inline-flex items-center gap-2 rounded-xl bg-brand-500 px-7 py-3.5 text-sm font-bold text-slate-950 shadow-xl shadow-brand-500/25 transition-all hover:bg-brand-400 hover:shadow-brand-400/30 active:scale-[0.98]"
            >
              <ScanLine className="h-4 w-4" />
              Verify a Certificate
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
            </Link>
            <Link
              to="/dashboard"
              className="inline-flex items-center gap-2 rounded-xl border border-slate-700 bg-slate-900/50 px-7 py-3.5 text-sm font-bold text-slate-100 transition-all hover:border-brand-500/50 hover:text-brand-300 active:scale-[0.98]"
            >
              <Building2 className="h-4 w-4" />
              Issue Certificate
            </Link>
          </div>

          {/* Live-on-chain strip */}
          <div className="animate-fade-up mx-auto mt-12 grid max-w-2xl grid-cols-3 gap-3" style={{ animationDelay: "240ms" }}>
            {[
              ["100%", "on-chain records"],
              ["0", "servers to trust"],
              ["~15s", "median verification"],
            ].map(([stat, label]) => (
              <div key={label} className="glass hairline rounded-2xl px-3 py-4">
                <p className="font-display text-2xl font-bold tracking-tight text-slate-50 sm:text-3xl">{stat}</p>
                <p className="mt-1 text-[11px] uppercase tracking-wider text-slate-500">{label}</p>
              </div>
            ))}
          </div>

          {/* Demo strip — invite first-run exploration */}
          <div className="animate-fade-up mx-auto mt-4 flex max-w-2xl flex-wrap items-center justify-center gap-x-4 gap-y-1 text-xs text-slate-500" style={{ animationDelay: "300ms" }}>
            <span>Try it now — no wallet needed:</span>
            {[
              ["CERT-2026-0001", "valid"],
              ["CERT-2026-0003", "revoked"],
            ].map(([id, kind]) => (
              <Link
                key={id}
                to={`/verify/${id}`}
                className={`inline-flex items-center gap-1.5 rounded-lg border px-2 py-1 font-mono transition-colors ${
                  kind === "revoked"
                    ? "border-slate-800 text-slate-400 hover:border-red-500/40 hover:text-red-300"
                    : "border-slate-800 text-slate-400 hover:border-brand-500/40 hover:text-brand-300"
                }`}
              >
                <span className={`h-1.5 w-1.5 rounded-full ${kind === "revoked" ? "bg-red-400" : "bg-brand-400"}`} />
                {id}
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* --------------------------------------- How verification works */}
      <section>
        <div className="mb-10 text-center">
          <p className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-brand-400">
            <span className="h-px w-6 bg-gradient-to-r from-transparent to-brand-500/60" />
            Under the hood
            <span className="h-px w-6 bg-gradient-to-l from-transparent to-brand-500/60" />
          </p>
          <h2 className="mt-3 font-display text-3xl font-bold tracking-tight text-slate-100 sm:text-4xl">
            How blockchain verification works
          </h2>
          <p className="mx-auto mt-3 max-w-2xl text-sm leading-relaxed text-slate-400 sm:text-base">
            One smart contract is the entire system: an issuer whitelist, a certificate registry and
            a revocation flag. Here's the lifecycle of a certificate.
          </p>
        </div>
        <div className="stagger grid gap-4 md:grid-cols-3">
          {STEPS.map((s, i) => (
            <Card key={s.title} className="relative overflow-hidden">
              <span className="pointer-events-none absolute -right-3 -top-6 font-display text-8xl font-bold text-slate-800/40" aria-hidden="true">
                {i + 1}
              </span>
              <span className="relative grid h-11 w-11 place-items-center rounded-xl bg-brand-500/10 text-brand-300 ring-1 ring-brand-500/25">
                <s.icon className="h-5 w-5" strokeWidth={2} />
              </span>
              <h3 className="relative mt-4 font-display text-lg font-bold text-slate-100">{s.title}</h3>
              <p className="relative mt-1.5 text-sm leading-relaxed text-slate-400">{s.body}</p>
            </Card>
          ))}
        </div>
        <Card className="mt-4">
          <h3 className="font-display text-lg font-bold text-slate-100">Why a blockchain actually helps here</h3>
          <ul className="mt-4 grid gap-x-8 gap-y-3 text-sm text-slate-400 sm:grid-cols-2">
            <li className="flex gap-2.5">
              <BadgeCheck className="mt-0.5 h-4 w-4 shrink-0 text-brand-400" />
              <span><b className="text-slate-200">Tamper-evident:</b> records can't be edited or deleted — only a visible revocation changes status.</span>
            </li>
            <li className="flex gap-2.5">
              <Eye className="mt-0.5 h-4 w-4 shrink-0 text-brand-400" />
              <span><b className="text-slate-200">Trustless checks:</b> verifiers read the chain via public RPC — there are no CertiChain servers to trust.</span>
            </li>
            <li className="flex gap-2.5">
              <FileSearch className="mt-0.5 h-4 w-4 shrink-0 text-brand-400" />
              <span><b className="text-slate-200">Auditable history:</b> every issuance and revocation is a signed, timestamped event on Etherscan.</span>
            </li>
            <li className="flex gap-2.5">
              <Building2 className="mt-0.5 h-4 w-4 shrink-0 text-brand-400" />
              <span><b className="text-slate-200">Multi-college by design:</b> the contract owner whitelists any number of institutional wallets.</span>
            </li>
          </ul>
          <p className="mt-4 text-xs text-slate-500">
            MVP note: this demo runs entirely on the free Sepolia testnet — no real money, no paid APIs, no backend servers.
          </p>
        </Card>
      </section>

      {/* ------------------------------------------------------ Features */}
      <section>
        <div className="mb-10 text-center">
          <p className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-brand-400">
            <span className="h-px w-6 bg-gradient-to-r from-transparent to-brand-500/60" />
            Features
            <span className="h-px w-6 bg-gradient-to-l from-transparent to-brand-500/60" />
          </p>
          <h2 className="mt-3 font-display text-3xl font-bold tracking-tight text-slate-100 sm:text-4xl">
            Everything a credential needs
          </h2>
        </div>
        <div className="stagger grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((f) => (
            <Card key={f.title} className="group transition-colors hover:border-brand-500/30">
              <span className="grid h-11 w-11 place-items-center rounded-xl bg-slate-800/80 text-slate-300 ring-1 ring-slate-700/60 transition-colors group-hover:bg-brand-500/10 group-hover:text-brand-300 group-hover:ring-brand-500/25">
                <f.icon className="h-5 w-5" strokeWidth={2} />
              </span>
              <h3 className="mt-4 font-display text-lg font-bold text-slate-100">{f.title}</h3>
              <p className="mt-1.5 text-sm leading-relaxed text-slate-400">{f.body}</p>
            </Card>
          ))}
        </div>
      </section>

      {/* --------------------------------------------------- How it works */}
      <section>
        <div className="mb-10 text-center">
          <p className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-brand-400">
            <span className="h-px w-6 bg-gradient-to-r from-transparent to-brand-500/60" />
            How it works
            <span className="h-px w-6 bg-gradient-to-l from-transparent to-brand-500/60" />
          </p>
          <h2 className="mt-3 font-display text-3xl font-bold tracking-tight text-slate-100 sm:text-4xl">
            For verifiers and issuers
          </h2>
        </div>
        <div className="grid gap-4 lg:grid-cols-2">
          <Card>
            <div className="flex items-center gap-3">
              <span className="grid h-10 w-10 place-items-center rounded-xl bg-brand-500/10 text-brand-300 ring-1 ring-brand-500/25">
                <Camera className="h-5 w-5" />
              </span>
              <h3 className="font-display text-lg font-bold text-slate-100">You're verifying</h3>
            </div>
            <ol className="mt-4 space-y-3 text-sm text-slate-400">
              <li className="flex gap-3"><Step n="1" />Open <Link to="/verify" className="text-brand-300 hover:underline">Verify</Link> and type the certificate ID from the document.</li>
              <li className="flex gap-3"><Step n="2" />Or scan the QR code printed on the certificate with your camera.</li>
              <li className="flex gap-3"><Step n="3" />Read the on-chain status: <b className="text-brand-300">Valid</b>, <b className="text-red-300">Revoked</b> or <b className="text-slate-300">Not found</b> — plus the issuing wallet and dates.</li>
            </ol>
          </Card>
          <Card>
            <div className="flex items-center gap-3">
              <span className="grid h-10 w-10 place-items-center rounded-xl bg-brand-500/10 text-brand-300 ring-1 ring-brand-500/25">
                <Landmark className="h-5 w-5" />
              </span>
              <h3 className="font-display text-lg font-bold text-slate-100">You're issuing</h3>
            </div>
            <ol className="mt-4 space-y-3 text-sm text-slate-400">
              <li className="flex gap-3"><Step n="1" />Connect your college wallet in the <Link to="/dashboard" className="text-brand-300 hover:underline">Issuer Dashboard</Link>.</li>
              <li className="flex gap-3"><Step n="2" />Fill in the student, course and issue date — confirm in your wallet.</li>
              <li className="flex gap-3"><Step n="3" />Download the printable QR code and share it with the graduate.</li>
            </ol>
          </Card>
        </div>
      </section>

      {/* -------------------------------------------------------- CTA band */}
      <section>
        <Card className="relative overflow-hidden text-center">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(600px_200px_at_50%_0%,rgba(16,185,129,0.14),transparent_70%)]" aria-hidden="true" />
          <h2 className="relative font-display text-2xl font-bold text-slate-50 sm:text-3xl">
            Ready to check a credential?
          </h2>
          <p className="relative mx-auto mt-2 max-w-md text-sm text-slate-400">
            No wallet, no account, no sign-up. Verification is free and takes seconds.
          </p>
          <div className="relative mt-6 flex flex-wrap items-center justify-center gap-3">
            <Link
              to="/verify"
              className="inline-flex items-center gap-2 rounded-xl bg-brand-500 px-6 py-3 text-sm font-bold text-slate-950 shadow-lg shadow-brand-500/25 transition hover:bg-brand-400 active:scale-[0.98]"
            >
              <ScanLine className="h-4 w-4" /> Verify a certificate
            </Link>
            <Link
              to="/verify/CERT-2026-0001"
              className="inline-flex items-center gap-2 rounded-xl border border-slate-700 px-6 py-3 text-sm font-bold text-slate-200 transition hover:border-brand-500/50 hover:text-brand-300"
            >
              Try the demo ID
            </Link>
          </div>
        </Card>
      </section>
    </div>
  );
}

function Step({ n }) {
  return (
    <span className="grid h-5 w-5 shrink-0 place-items-center rounded-full bg-slate-800 text-[10px] font-bold text-brand-300 ring-1 ring-slate-700">
      {n}
    </span>
  );
}
