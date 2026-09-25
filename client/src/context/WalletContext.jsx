import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { BrowserProvider } from "ethers";
import { KNOWN_CHAINS, LOCAL, SEPOLIA } from "../config/chains";
import { humanError } from "../lib/web3";

/**
 * Reusable Web3 wallet provider (EIP-1193 / MetaMask-compatible).
 *
 * Responsibilities:
 *  1. connect()          — request accounts via the browser wallet
 *  2. address            — connected wallet address for display
 *  3. chainId/chainInfo  — current network for display
 *  4. disconnect()       — reset local UI state (+ best-effort revoke)
 *  5. connect errors     — rejected prompts surface as `error`, not crashes
 *  6. wrong network      — `isWrongNetwork` + ensureChain(id) switch helper
 *  7. missing extension  — `hasWallet: false` lets the UI show install hints
 *
 * No private keys ever pass through this module: signing is delegated to the
 * wallet extension. Session restore uses eth_accounts (silent, no popup).
 */
const WalletContext = createContext(null);

export function WalletProvider({ children }) {
  const [address, setAddress] = useState(null);
  const [chainId, setChainId] = useState(null);
  const [connecting, setConnecting] = useState(false);
  const [error, setError] = useState("");
  const [hasWallet, setHasWallet] = useState(false);

  const eth = typeof window !== "undefined" ? window.ethereum : undefined;

  // Detect wallet extension (also catches late injection by some wallets).
  useEffect(() => {
    setHasWallet(!!window.ethereum);
    const onLoad = () => setHasWallet(!!window.ethereum);
    window.addEventListener("load", onLoad);
    // EIP-6963 style announcement + poll fallback for late injection.
    const onAnnounce = () => setHasWallet(!!window.ethereum);
    window.addEventListener("eip6963:announceProvider", onAnnounce);
    const poll = setInterval(() => {
      setHasWallet((prev) => prev || !!window.ethereum);
    }, 800);
    setTimeout(() => clearInterval(poll), 8000);
    return () => {
      window.removeEventListener("load", onLoad);
      window.removeEventListener("eip6963:announceProvider", onAnnounce);
      clearInterval(poll);
    };
  }, []);

  // Restore a previously-authorized session silently on load.
  useEffect(() => {
    let cancelled = false;
    async function restore() {
      if (!window.ethereum) return;
      try {
        const browserProvider = new BrowserProvider(window.ethereum, "any");
        const accounts = await browserProvider.send("eth_accounts", []);
        if (cancelled || accounts.length === 0) return;
        const network = await browserProvider.getNetwork();
        if (cancelled) return;
        setAddress(accounts[0]);
        setChainId(Number(network.chainId));
      } catch {
        /* stay disconnected */
      }
    }
    restore();
    return () => {
      cancelled = true;
    };
  }, []);

  // Track wallet-driven account/network changes.
  useEffect(() => {
    if (!window.ethereum?.on) return;
    const onAccountsChanged = (accounts) => {
      setAddress(accounts && accounts.length > 0 ? accounts[0] : null);
      if (!accounts || accounts.length === 0) setChainId(null);
    };
    const onChainChanged = (chainIdHex) => setChainId(parseInt(chainIdHex, 16));
    window.ethereum.on("accountsChanged", onAccountsChanged);
    window.ethereum.on("chainChanged", onChainChanged);
    return () => {
      window.ethereum.removeListener("accountsChanged", onAccountsChanged);
      window.ethereum.removeListener("chainChanged", onChainChanged);
    };
  }, []);

  /** Request accounts. Rejections surface as a friendly `error`, never throw. */
  const connect = useCallback(async () => {
    setError("");
    if (!window.ethereum) {
      setError("No browser wallet found. Install MetaMask to continue.");
      return null;
    }
    setConnecting(true);
    try {
      const browserProvider = new BrowserProvider(window.ethereum, "any");
      await browserProvider.send("eth_requestAccounts", []);
      const signer = await browserProvider.getSigner();
      const network = await browserProvider.getNetwork();
      setAddress(signer.address);
      setChainId(Number(network.chainId));
      return signer.address;
    } catch (err) {
      // 4001 / ACTION_REJECTED = user closed or denied the wallet popup.
      setError(
        err?.code === "ACTION_REJECTED" || /reject|denied/i.test(String(err?.message))
          ? "Connection request was rejected in your wallet."
          : humanError(err)
      );
      return null;
    } finally {
      setConnecting(false);
    }
  }, []);

  /**
   * Reset the app's wallet UI state. The wallet itself cannot be force-
   * disconnected, so we also fire the optional wallet_revokePermissions
   * call (best-effort) so the next connect() re-prompts.
   */
  const disconnect = useCallback(async () => {
    setAddress(null);
    setChainId(null);
    setError("");
    try {
      await window.ethereum?.request?.({
        method: "wallet_revokePermissions",
        params: [{ eth_accounts: {} }],
      });
    } catch {
      /* optional method — unsupported wallets simply keep the grant */
    }
  }, []);

  /** Switch (or add, for known chains) the wallet's active network. */
  const ensureChain = useCallback(async (targetChainId) => {
    const meta = KNOWN_CHAINS[targetChainId];
    if (!meta) throw new Error(`Unsupported chain id: ${targetChainId}`);
    if (Number(chainId) === Number(targetChainId)) return;
    try {
      await window.ethereum.request({
        method: "wallet_switchEthereumChain",
        params: [{ chainId: meta.chainIdHex }],
      });
      setChainId(Number(targetChainId));
    } catch (err) {
      // 4902 = chain not added to the wallet yet
      if (err?.code === 4902 || /unrecognized|not added/i.test(String(err?.message))) {
        const params = [
          {
            chainId: meta.chainIdHex,
            chainName: meta.label,
            nativeCurrency: { name: `${meta.name} Ether`, symbol: "ETH", decimals: 18 },
            rpcUrls: [meta.rpcUrl],
          },
        ];
        if (meta.explorer) params[0].blockExplorerUrls = [meta.explorer];
        await window.ethereum.request({ method: "wallet_addEthereumChain", params });
        setChainId(Number(targetChainId));
      } else {
        throw err;
      }
    }
  }, [chainId]);

  const value = useMemo(() => {
    const meta = chainId != null ? KNOWN_CHAINS[chainId] : undefined;
    const onSepolia = chainId === SEPOLIA.chainId;
    const onLocal = chainId === LOCAL.chainId;
    return {
      // state
      address,
      chainId,
      chainInfo: meta || null,
      connecting,
      error,
      hasWallet,
      // derived
      isConnected: !!address,
      isKnownChain: !!meta,
      isWrongNetwork: !!address && !meta, // connected but on an unknown chain
      onSepolia,
      onLocal,
      // actions
      connect,
      disconnect,
      ensureChain,
      ensureSepolia: () => ensureChain(SEPOLIA.chainId),
      clearError: () => setError(""),
    };
  }, [address, chainId, connecting, error, hasWallet, connect, disconnect, ensureChain]);

  return <WalletContext.Provider value={value}>{children}</WalletContext.Provider>;
}

export function useWallet() {
  const ctx = useContext(WalletContext);
  if (!ctx) throw new Error("useWallet must be used inside <WalletProvider>");
  return ctx;
}
