import { CheckCircle2, ExternalLink, Loader2, Clock } from "lucide-react";
import { Alert } from "./ui";
import TxSteps from "./TxSteps";
import { SEPOLIA } from "../config/chains";

/**
 * Lifecycle banner for an issue transaction. Mirrors the exact on-chain
 * progression — a success state is ONLY rendered after `tx.wait()` resolved.
 *
 *   status: "pending"     → wallet/tx submitted, waiting for the network
 *           "confirming"  → tx mined, waiting for confirmations
 *           "success"     → confirmed on-chain
 *           "error"       → rejected or failed
 */
export default function TxStatusCard({ status, txHash, chainId, error, onReset }) {
  const explorer = Number(chainId) === SEPOLIA.chainId ? SEPOLIA.explorer : null;

  if (status === "pending") {
    return (
      <div className="animate-scale-in rounded-xl border border-sky-500/40 bg-sky-500/10 px-4 py-3.5">
        <div className="flex items-center gap-3">
          <span className="relative grid h-8 w-8 shrink-0 place-items-center">
            <span className="animate-pulse-ring absolute inset-0 rounded-full bg-sky-500/30" />
            <Clock className="relative h-4.5 w-4.5 text-sky-300" />
          </span>
          <div className="min-w-0">
            <p className="text-sm font-bold text-sky-200">Transaction pending</p>
            <p className="text-xs text-sky-200/70">
              {txHash
                ? "Submitted to the network — waiting to be mined…"
                : "Waiting for you to confirm in your wallet…"}
            </p>
          </div>
          <Loader2 className="ml-auto h-4 w-4 shrink-0 animate-spin text-sky-300" />
        </div>
        <div className="mt-3 border-t border-sky-500/20 pt-2.5">
          <TxSteps phase={status} />
        </div>
        {txHash && (
          <p className="mt-2 truncate font-mono text-[11px] text-sky-200/60" title={txHash}>
            {txHash}
          </p>
        )}
      </div>
    );
  }

  if (status === "confirming") {
    return (
      <div className="animate-scale-in rounded-xl border border-amber-500/40 bg-amber-500/10 px-4 py-3.5">
        <div className="flex items-center gap-3">
          <Loader2 className="h-4.5 w-4.5 shrink-0 animate-spin text-amber-300" />
          <div className="min-w-0">
            <p className="text-sm font-bold text-amber-200">Confirming on-chain…</p>
            <p className="text-xs text-amber-200/70">Transaction mined — waiting for confirmations.</p>
          </div>
        </div>
        <div className="mt-3 border-t border-amber-500/20 pt-2.5">
          <TxSteps phase={status} />
        </div>
        {txHash && (
          <p className="mt-2 truncate font-mono text-[11px] text-amber-200/60" title={txHash}>
            {txHash}
          </p>
        )}
      </div>
    );
  }

  if (status === "success") {
    return (
      <div className="animate-scale-in rounded-xl border border-brand-500/40 bg-brand-500/10 px-4 py-3.5">
        <div className="flex items-center gap-3">
          <CheckCircle2 className="h-5 w-5 shrink-0 text-brand-300" strokeWidth={2.4} />
          <div className="min-w-0">
            <p className="text-sm font-bold text-brand-200">Certificate issued successfully</p>
            <p className="text-xs text-brand-200/70">Confirmed on-chain — the record is permanent.</p>
          </div>
        </div>
        {txHash && (
          <div className="mt-2.5 flex flex-wrap items-center gap-2">
            <span className="text-[11px] uppercase tracking-wider text-brand-200/60">Tx hash</span>
            <code
              className="max-w-full truncate rounded-lg border border-brand-500/30 bg-slate-950/60 px-2 py-1 font-mono text-[11px] text-brand-200"
              title={txHash}
            >
              {txHash}
            </code>
            {explorer && (
              <a
                className="inline-flex items-center gap-1 text-[11px] font-medium text-brand-300 hover:underline"
                href={`${explorer}/tx/${txHash}`}
                target="_blank"
                rel="noreferrer"
              >
                Etherscan <ExternalLink className="h-3 w-3" />
              </a>
            )}
          </div>
        )}
      </div>
    );
  }

  if (status === "error") {
    return (
      <div className="mt-1">
        <Alert tone="error">{error || "The transaction failed."}</Alert>
        {onReset && (
          <button
            type="button"
            onClick={onReset}
            className="mt-2 text-xs font-medium text-slate-400 underline-offset-2 hover:text-slate-200 hover:underline"
          >
            Dismiss and try again
          </button>
        )}
      </div>
    );
  }

  return null;
}
