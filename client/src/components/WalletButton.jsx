import { useEffect, useRef, useState } from "react";
import { BrowserProvider, formatEther } from "ethers";
import { AlertTriangle, ChevronDown, Copy, Check, ExternalLink, LogOut, Wallet } from "lucide-react";
import { useWallet } from "../context/WalletContext";
import { humanError, shortenAddress } from "../lib/web3";
import { Button } from "./ui";

/** Deterministic gradient avatar from a wallet address. */
function WalletAvatar({ address }) {
  const palettes = [
    "from-emerald-400 to-teal-600",
    "from-sky-400 to-indigo-600",
    "from-violet-400 to-purple-600",
    "from-amber-400 to-orange-600",
    "from-rose-400 to-pink-600",
  ];
  const idx = parseInt(String(address || "0x").slice(2, 6), 16) % palettes.length || 0;
  return (
    <span
      className={`grid h-5 w-5 shrink-0 place-items-center rounded-full bg-gradient-to-br ${palettes[idx]} text-[8px] font-bold text-slate-950`}
      aria-hidden="true"
    >
      {String(address || "0x").slice(2, 4).toUpperCase()}
    </span>
  );
}

/**
 * Wallet connect / account menu. Covers: connect, address display,
 * balance, wrong-network switch, disconnect and rejected-connection error.
 */
export default function WalletButton() {
  const wallet = useWallet();
  const [balance, setBalance] = useState(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const menuRef = useRef(null);

  // Close the menu on outside click and Escape.
  useEffect(() => {
    function onDocClick(e) {
      if (menuRef.current && !menuRef.current.contains(e.target)) setMenuOpen(false);
    }
    function onKey(e) {
      if (e.key === "Escape") setMenuOpen(false);
    }
    document.addEventListener("mousedown", onDocClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDocClick);
      document.removeEventListener("keydown", onKey);
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    async function loadBalance() {
      setBalance(null);
      if (!wallet.address || !window.ethereum) return;
      try {
        const provider = new BrowserProvider(window.ethereum, "any");
        const raw = await provider.getBalance(wallet.address);
        if (!cancelled) setBalance(Number(formatEther(raw)).toFixed(3));
      } catch {
        /* balance is cosmetic; ignore failures */
      }
    }
    loadBalance();
    return () => {
      cancelled = true;
    };
  }, [wallet.address, wallet.chainId]);

  // Missing wallet extension: install hint (requirement 7).
  if (!wallet.hasWallet) {
    return (
      <a
        href="https://metamask.io/download/"
        target="_blank"
        rel="noreferrer"
        className="inline-flex shrink-0 items-center gap-2 whitespace-nowrap rounded-xl bg-gradient-to-r from-amber-400 to-amber-500 px-3.5 py-2.5 text-sm font-semibold text-slate-950 shadow-lg shadow-amber-500/20 transition hover:from-amber-300 hover:to-amber-400 active:scale-[0.98]"
      >
        <Wallet className="h-4 w-4" />
        <span className="hidden min-[400px]:inline">Install MetaMask</span>
        <span className="min-[400px]:hidden">Get wallet</span>
      </a>
    );
  }

  // Not connected: plain connect button (rejection handled in context).
  if (!wallet.isConnected) {
    return (
      <div className="flex items-center gap-2">
        {wallet.error && (
          <span className="hidden max-w-44 truncate text-xs text-red-300 md:inline" title={wallet.error}>
            {wallet.error}
          </span>
        )}
        <Button onClick={wallet.connect} loading={wallet.connecting} className="shrink-0 whitespace-nowrap">
          {!wallet.connecting && <Wallet className="h-4 w-4" />}
          {wallet.connecting ? "Check your wallet…" : "Connect Wallet"}
        </Button>
      </div>
    );
  }

  // Connected, but on a chain the app doesn't know.
  if (wallet.isWrongNetwork) {
    return (
      <Button variant="danger" onClick={wallet.ensureSepolia} className="shrink-0 whitespace-nowrap">
        <AlertTriangle className="h-4 w-4" />
        Wrong network
        <span className="hidden md:inline">· switch</span>
      </Button>
    );
  }

  // Connected + known chain: account chip with dropdown menu.
  return (
    <div className="relative flex items-center gap-2" ref={menuRef}>
      {wallet.error && (
        <span className="hidden max-w-44 truncate text-xs text-red-300 md:inline" title={wallet.error}>
          {wallet.error}
        </span>
      )}
      <button
        type="button"
        onClick={() => setMenuOpen((v) => !v)}
        aria-expanded={menuOpen}
        className="inline-flex shrink-0 items-center gap-2 whitespace-nowrap rounded-xl border border-slate-700 bg-slate-900/70 py-2 pl-2.5 pr-3 text-sm font-semibold text-slate-100 transition hover:border-brand-500/40"
      >
        <WalletAvatar address={wallet.address} />
        <span className="hidden font-mono text-[13px] min-[420px]:inline">{shortenAddress(wallet.address, 4)}</span>
        {balance && <span className="hidden text-xs font-normal text-slate-400 lg:inline">{balance} ETH</span>}
        <ChevronDown className={`h-3.5 w-3.5 text-slate-500 transition-transform ${menuOpen ? "rotate-180" : ""}`} />
      </button>

      {menuOpen && (
        <div className="animate-scale-in absolute right-0 top-12 z-40 w-64 overflow-hidden rounded-2xl border border-slate-700/80 bg-slate-900/95 shadow-2xl shadow-black/60 backdrop-blur-xl">
          <div className="border-b border-slate-800 px-4 py-3.5">
            <div className="flex items-center gap-2.5">
              <WalletAvatar address={wallet.address} />
              <div className="min-w-0">
                <p className="text-[10px] uppercase tracking-widest text-slate-500">Connected</p>
                <button
                  type="button"
                  className="flex w-full items-center justify-between gap-2 font-mono text-xs text-slate-200 hover:text-brand-300"
                  onClick={async () => {
                    try {
                      await navigator.clipboard.writeText(wallet.address);
                      setCopied(true);
                      setTimeout(() => setCopied(false), 1200);
                    } catch {
                      /* clipboard unavailable */
                    }
                  }}
                  title="Copy address"
                >
                  <span className="truncate">{shortenAddress(wallet.address, 10)}</span>
                  {copied ? <Check className="h-3.5 w-3.5 shrink-0 text-brand-400" /> : <Copy className="h-3.5 w-3.5 shrink-0 text-slate-500" />}
                </button>
              </div>
            </div>
            {wallet.chainInfo && (
              <p className="mt-2.5 flex items-center gap-1.5 text-xs text-slate-400">
                <span className="h-1.5 w-1.5 rounded-full bg-brand-400" />
                {wallet.chainInfo.label}
                {balance ? ` · ${balance} ETH` : ""}
              </p>
            )}
          </div>
          {wallet.chainInfo?.explorer ? (
            <a
              href={`${wallet.chainInfo.explorer}/address/${wallet.address}`}
              target="_blank"
              rel="noreferrer"
              onClick={() => setMenuOpen(false)}
              className="flex w-full items-center gap-2 px-4 py-3 text-sm text-slate-300 transition hover:bg-slate-800/70 hover:text-slate-100"
            >
              <ExternalLink className="h-4 w-4 text-slate-500" /> View on explorer
            </a>
          ) : null}
          <button
            type="button"
            onClick={async () => {
              setMenuOpen(false);
              await wallet.disconnect();
            }}
            className="flex w-full items-center gap-2 border-t border-slate-800 px-4 py-3 text-sm text-red-300 transition hover:bg-red-500/10"
          >
            <LogOut className="h-4 w-4" /> Disconnect
          </button>
        </div>
      )}
    </div>
  );
}
