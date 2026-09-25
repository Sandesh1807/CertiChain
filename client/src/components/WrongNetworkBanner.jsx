import { AlertTriangle, RefreshCw } from "lucide-react";
import { useState } from "react";
import { useWallet } from "../context/WalletContext";
import { SEPOLIA } from "../config/chains";
import { Button } from "./ui";

/** Shown when the connected wallet is on a chain this app doesn't support. */
export default function WrongNetworkBanner() {
  const wallet = useWallet();
  const [switching, setSwitching] = useState(false);
  const [switchError, setSwitchError] = useState("");

  if (!wallet.isConnected || !wallet.isWrongNetwork) return null;

  async function handleSwitch() {
    setSwitchError("");
    setSwitching(true);
    try {
      await wallet.ensureSepolia();
    } catch (err) {
      setSwitchError(err?.message || "Could not switch network. Try switching in your wallet.");
    } finally {
      setSwitching(false);
    }
  }

  return (
    <div className="mb-6 rounded-xl border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm text-amber-200">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          Your wallet is on an unsupported network
          {wallet.chainId != null ? ` (chain id ${wallet.chainId})` : ""}. Switch to {SEPOLIA.label}
          to use this app.
        </p>
        <Button variant="secondary" onClick={handleSwitch} loading={switching} className="!px-3 !py-1.5 text-xs">
          {!switching && <RefreshCw className="h-3.5 w-3.5" />}
          Switch to {SEPOLIA.name}
        </Button>
      </div>
      {switchError && <p className="mt-2 text-xs text-amber-300/80">{switchError}</p>}
    </div>
  );
}
