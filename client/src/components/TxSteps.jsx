import { Check } from "lucide-react";

/**
 * Compact 3-step progress indicator for the issue transaction lifecycle
 * (sign → mine → confirm). Purely presentational — the phase still comes
 * from the chain: `confirming` flips only after the receipt exists.
 */
export default function TxSteps({ phase }) {
  const steps = ["Sign in wallet", "Mining", "Confirmed"];
  const active = phase === "pending" ? 0 : phase === "confirming" ? 1 : phase === "success" ? 2 : -1;
  return (
    <ol className="flex items-center gap-1.5 text-[11px] font-medium" aria-label="Transaction progress">
      {steps.map((label, i) => {
        const done = active > i;
        const current = active === i;
        return (
          <li key={label} className="flex items-center gap-1.5">
            <span
              className={`grid h-4.5 w-4.5 place-items-center rounded-full border transition-colors ${
                done
                  ? "border-brand-500/50 bg-brand-500/20 text-brand-300"
                  : current
                    ? "border-brand-400 bg-brand-400 text-slate-950"
                    : "border-slate-700 bg-slate-900 text-slate-600"
              }`}
            >
              {done ? <Check className="h-2.5 w-2.5" strokeWidth={3.5} /> : <span className="h-1 w-1 rounded-full bg-current" />}
            </span>
            <span className={current ? "text-brand-300" : done ? "text-slate-300" : "text-slate-600"}>{label}</span>
            {i < steps.length - 1 && <span className={`h-px w-3 ${done ? "bg-brand-500/50" : "bg-slate-700"}`} />}
          </li>
          );
      })}
    </ol>
  );
}
