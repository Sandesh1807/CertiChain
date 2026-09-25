import { BrowserProvider, formatEther } from "ethers";

/**
 * Thin wallet helpers shared by pages. All network switching and connection
 * state lives in WalletContext — this module only signs and formats.
 */

export function getSigner() {
  if (typeof window === "undefined" || !window.ethereum) {
    const err = new Error("No browser wallet found. Please install MetaMask.");
    err.code = "NO_WALLET";
    throw err;
  }
  return new BrowserProvider(window.ethereum, "any").getSigner();
}

export function shortenAddress(addr, size = 4) {
  if (!addr) return "";
  return `${addr.slice(0, 2 + size)}…${addr.slice(-size)}`;
}

export function formatEth(wei) {
  try {
    return `${Number(formatEther(wei)).toFixed(4)} ETH`;
  } catch {
    return "—";
  }
}

/**
 * Solidity custom-error selectors (keccak256("Name()")[0:4]) for the registry.
 * Some wallets/RPCs surface reverts only as raw hex in `data`, so we decode
 * them ourselves instead of relying on message text.
 */
export const CUSTOM_ERROR_SELECTORS = {
  "0xaa3013bb": "That certificate ID already exists on-chain.", // DuplicateCertId()
  "0x54ec5063": "This wallet is not whitelisted as an issuer.", // NotIssuer()
  "0xc5723b51": "Certificate not found on-chain.", // NotFound()
  "0xa447fc53": "Please fill in every field.", // EmptyInput()
  "0x4ee45b56": "One of the fields is too long (ID ≤ 64 chars).", // TooLong()
  "0x3cd0c9ff": "Issue date is more than a year in the future.", // FutureIssueDate()
  "0x905e7107": "This certificate is already revoked.", // AlreadyRevoked()
  "0x1c26b841": "Institution not found — your wallet may not be whitelisted.", // InstitutionNotFound()
  "0xf542f2b1": "This wallet is bound to a different institution.", // InstitutionMismatch()
  "0x30cd7471": "Only the platform owner can do that.", // NotOwner()
};

/** Find a custom-error selector inside any hex blob in the message. */
function matchCustomError(text) {
  for (const [sel, friendly] of Object.entries(CUSTOM_ERROR_SELECTORS)) {
    if (text.toLowerCase().includes(sel)) return friendly;
  }
  return null;
}

/** Map raw wallet/contract errors to short, human-friendly messages. */
export function humanError(err) {
  const msg = err?.message || String(err || "");
  const code = err?.code;

  if (code === "ACTION_REJECTED" || code === 4001 || /user rejected|user denied/i.test(msg)) {
    return "Transaction was rejected in your wallet. Nothing was sent on-chain.";
  }
  // Transport / RPC failures — the chain is unreachable, not a contract revert.
  // ethers surfaces these as NETWORK_ERROR / TIMEOUT, SERVER_ERROR (HTTP 4xx/
  // 5xx, with info.response.statusCode), or the browser's raw fetch TypeError
  // ("Failed to fetch" / "Load failed" / "NetworkError" when the request
  // never completes — connection refused, DNS, offline, CORS).
  const cause = `${msg} ${err?.cause?.message || ""}`;
  if (
    code === "NETWORK_ERROR" ||
    code === "TIMEOUT" ||
    /failed to fetch|load failed|networkerror|network request failed|connection refused|econnrefused|err_(connection|internet|name)|socket hang up/i.test(cause)
  ) {
    return "Can't reach the blockchain network — check your connection or RPC URL, then retry.";
  }
  if (code === "SERVER_ERROR") {
    const status = err?.info?.response?.statusCode;
    if (status === 429 || /throttle|exceeded maximum retry/i.test(msg)) {
      return "The public RPC is rate-limiting requests right now. Wait a few seconds and retry.";
    }
    return `The blockchain node returned a server error${status ? ` (HTTP ${status})` : ""}. It may be down or overloaded — try again shortly.`;
  }
  // Raw revert data (e.g. from gas estimation) — decode custom errors first.
  const custom = matchCustomError(msg) || matchCustomError(String(err?.info?.error?.data || ""));
  if (custom) return custom;
  if (code === "INSUFFICIENT_FUNDS" || err?.info?.error?.code === -32000 && /insufficient/i.test(msg)) {
    return "Not enough test ETH to cover gas. Claim free Sepolia ETH from a faucet and retry.";
  }
  if (/insufficient funds|exceeds balance|not enough .*eth/i.test(msg)) {
    return "Not enough test ETH to cover gas. Claim free Sepolia ETH from a faucet and retry.";
  }
  if (/gas required exceeds allowance|intrinsic gas too low|out of gas/i.test(msg)) {
    return "The transaction needs more gas than allowed. Try again, or raise the gas limit in your wallet.";
  }
  if (code === "UNPREDICTABLE_GAS_LIMIT" || /cannot estimate gas/i.test(msg)) {
    // Usually a reverted call hiding behind the estimation failure.
    const inner = err?.info?.error?.message || err?.error?.message || "";
    if (/DuplicateCertId/i.test(inner)) return "That certificate ID already exists on-chain.";
    if (/NotIssuer/i.test(inner)) return "This wallet is not whitelisted as an issuer.";
    if (/EmptyInput/i.test(inner)) return "Please fill in every field.";
    if (/TooLong/i.test(inner)) return "One of the fields is too long (ID ≤ 64 chars).";
    if (/FutureIssueDate/i.test(inner)) return "Issue date is more than a year in the future.";
    if (/AlreadyRevoked/i.test(inner)) return "This certificate is already revoked.";
    if (/InstitutionNotFound/i.test(inner)) return "Your wallet has no institution assigned.";
    return "The transaction would fail on-chain (contract check). Review the form and your wallet network, then retry.";
  }
  if (/DuplicateCertId/i.test(msg)) return "That certificate ID already exists on-chain.";
  if (/NotIssuer\b/.test(msg)) return "This wallet is not whitelisted as an issuer. Ask the platform owner to add it.";
  if (/InstitutionNotFound/.test(msg)) return "Your wallet has no institution assigned. Contact the platform owner.";
  if (/FutureIssueDate/.test(msg)) return "Issue date is more than a year in the future.";
  if (/TooLong/.test(msg)) return "One of the fields is too long (ID ≤ 64 chars).";
  if (/EmptyInput/.test(msg)) return "Please fill in every field.";
  if (/AlreadyRevoked/.test(msg)) return "This certificate is already revoked.";
  if (code === "NO_WALLET") return "No browser wallet found. Please install MetaMask.";
  if (err?.info?.error?.message) return err.info.error.message;
  if (/chain .*not deployed|not deployed on chain/i.test(msg)) return msg;
  // Unknown errors: a trimmed one-line pass-through, never a raw stack.
  const clean = String(msg).replace(/\s+/g, " ").trim();
  return clean.length > 220 ? `${clean.slice(0, 220)}…` : clean;
}
