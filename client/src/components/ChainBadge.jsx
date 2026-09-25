import { useWallet } from "../context/WalletContext";

const DOT = {
  ok: "bg-brand-400",
  wrong: "bg-amber-400",
  off: "bg-slate-600",
};

/** Compact network indicator for the navbar / dashboard. */
export default function ChainBadge({ className = "" }) {
  const wallet = useWallet();

  if (!wallet.isConnected) {
    return (
      <span
        className={`inline-flex items-center gap-1.5 rounded-full border border-slate-700 bg-slate-900/60 px-2.5 py-1 text-xs text-slate-500 ${className}`}
      >
        <span className={`h-1.5 w-1.5 rounded-full ${DOT.off}`} />
        No network
      </span>
    );
  }

  const wrong = wallet.isWrongNetwork;
  const label = wallet.chainInfo?.label || (wallet.chainId != null ? `Chain ${wallet.chainId}` : "Unknown");

  return (
    <span
      title={`Chain id ${wallet.chainId}`}
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium ${
        wrong
          ? "border-amber-500/40 bg-amber-500/10 text-amber-300"
          : "border-brand-500/40 bg-brand-500/10 text-brand-300"
      } ${className}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${wrong ? DOT.wrong : DOT.ok}`} />
      {label}
    </span>
  );
}
