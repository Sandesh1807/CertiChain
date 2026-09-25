import { Contract, Interface, JsonRpcProvider, keccak256, toUtf8Bytes } from "ethers";
import { getSigner } from "../lib/web3";
import deployments from "./deployments.registry.json";
import { KNOWN_CHAINS, LOCAL, READ_RPC_URLS, SEPOLIA } from "../config/chains";
import { env } from "../config/env";

export const REGISTRY_ABI = deployments.CertificateRegistry.abi;
const ADDRESSES = deployments.CertificateRegistry.addresses; // { [chainId]: "0x..." }

/** Resolve the deployed registry address for a chain id (env override wins). */
export function getRegistryAddress(chainId) {
  const override =
    Number(chainId) === SEPOLIA.chainId
      ? env.registryAddressSepolia
      : Number(chainId) === LOCAL.chainId
        ? env.registryAddressLocal
        : "";
  const addr = override || ADDRESSES[String(chainId)] || ADDRESSES[chainId];
  if (!addr) {
    throw new Error(
      `CertificateRegistry is not deployed on chain ${chainId} in this build. ` +
        `Deploy and sync: cd contracts && npm run deploy:registry:local && npm run sync:registry:local`
    );
  }
  return addr;
}

export function hasRegistryDeployment(chainId) {
  const override =
    Number(chainId) === SEPOLIA.chainId
      ? env.registryAddressSepolia
      : Number(chainId) === LOCAL.chainId
        ? env.registryAddressLocal
        : "";
  return !!(override || ADDRESSES[String(chainId)] || ADDRESSES[chainId]);
}

/** Read-only provider with fallback across free public RPCs. */
export function makeReadProvider(chainId) {
  // A public (non-localhost) deployment must never try the developer's local
  // node — a random visitor has nothing at 127.0.0.1:8545 and would wait for
  // the timeout before the NOT_FOUND verdict renders. Localhost is attempted
  // only when the build actually ships a local deployment AND this browser
  // session previously issued there (i.e. it is the demo driver's machine).
  const shippedLocal = hasRegistryDeployment(LOCAL.chainId);
  const base = String(window?.location?.hostname || "").toLowerCase();
  const isLocalBrowser = base === "localhost" || base === "127.0.0.1" || base === "[::1]";
  const allowLocalNode = !shippedLocal || isLocalBrowser;
  if (Number(chainId) === LOCAL.chainId && !allowLocalNode) {
    throw new Error(
      "This build has no deployed registry on chain 31337 for public visitors. " +
        "Open the app from localhost after starting the local node."
    );
  }
  const url = Number(chainId) === LOCAL.chainId ? LOCAL.rpcUrl : READ_RPC_URLS[0];
  return new JsonRpcProvider(url, Number(chainId), { staticNetwork: true, batchMaxCount: 0 });
}

/** Read-only registry (verification flows — no wallet needed). */
export function makeReadRegistry(chainId) {
  return new Contract(getRegistryAddress(chainId), REGISTRY_ABI, makeReadProvider(chainId));
}

/** Registry bound to the browser-wallet signer (writes). */
export async function makeWriteRegistry(chainId) {
  const signer = await getSigner();
  return new Contract(getRegistryAddress(chainId), REGISTRY_ABI, signer);
}

/** Default institution recorded at deploy time (id + public name). */
export function defaultInstitution() {
  return deployments.CertificateRegistry.defaultInstitution || { id: null, name: "" };
}

/**
 * Local record index derived from on-chain CertificateIssued /
 * CertificateRevoked events — this is how the dashboard lists raw
 * certificate IDs (storage itself is keyed by ID hash only).
 */
export async function fetchIssuedByIssuer(chainId, issuerAddress, fromBlock) {
  const provider = makeReadProvider(chainId);
  const address = getRegistryAddress(chainId);
  const iface = new Interface(REGISTRY_ABI);
  const logs = await provider.getLogs({
    address,
    fromBlock: (fromBlock ?? Number(deployments.CertificateRegistry.fromBlock)) || 0,
    toBlock: "latest",
  });

  const items = [];
  // CertificateRevoked's certId is an indexed string: its topic carries only
  // the keccak256 hash (no raw copy in data), so key revocations by the topic
  // hash and translate back to plain IDs for the issued items below.
  const revokedByHash = new Map(); // keccak256(certId) topic -> { reason, by }
  for (const log of logs) {
    let parsed;
    try {
      parsed = iface.parseLog(log);
    } catch {
      continue;
    }
    if (parsed?.name === "CertificateRevoked") {
      revokedByHash.set(log.topics[1], { reason: parsed.args.reason, by: parsed.args.by });
    } else if (parsed?.name === "CertificateIssued") {
      if (parsed.args.issuer.toLowerCase() === String(issuerAddress).toLowerCase()) {
        items.push({
          certId: parsed.args.certId, // raw ID now decodable from event data
          studentHash: parsed.args.studentHash,
          certHash: parsed.args.certHash,
          issueDate: parsed.args.issueDate,
          institutionId: parsed.args.institutionId,
          txHash: log.transactionHash,
          blockNumber: log.blockNumber,
        });
      }
    }
  }
  items.sort((a, b) => b.blockNumber - a.blockNumber);
  const revoked = new Map(); // plain certId -> { reason, by }
  for (const item of items) {
    const hit = revokedByHash.get(keccak256(toUtf8Bytes(item.certId)));
    if (hit) revoked.set(item.certId, hit);
  }
  return { items, revoked };
}

/**
 * Resolve a certificate across known chains (local first only when this
 * browser session issued there). Returns { cert-like fields, status, chainId }.
 */
export async function resolveCertificate(rawId) {
  const id = String(rawId || "").trim();
  if (!id) throw new Error("Empty certificate ID");

  const wasLocalIssue = (() => {
    try {
      return sessionStorage.getItem("certichain:local") === "1";
    } catch {
      return false;
    }
  })();

  const candidates = [SEPOLIA.chainId, LOCAL.chainId]
    .filter((c) => hasRegistryDeployment(c))
    .sort((a) => (wasLocalIssue && a === LOCAL.chainId ? -1 : 0));

  let lastErr = null;
  for (const chainId of candidates) {
    try {
      const registry = makeReadRegistry(chainId);
      const [ok, status, issuer, institutionId, studentHash, certHash] =
        await registry.verifyCertificate(id);
      if (status === "NOT_FOUND") {
        if (chainId === candidates[candidates.length - 1]) {
          return { status: "NOT_FOUND", chainId, chainLabel: KNOWN_CHAINS[chainId]?.label || `chain ${chainId}` };
        }
        continue;
      }
      return {
        status: ok ? "VALID" : "REVOKED",
        chainId,
        issuer,
        institutionId: Number(institutionId),
        studentHash,
        certHash,
        chainLabel: KNOWN_CHAINS[chainId]?.label || `chain ${chainId}`,
        raw: { ok, status },
      };
    } catch (err) {
      lastErr = err;
      const msg = String(err?.message || err || "");
      const isTransport = /network|fetch|timeout|SERVER_ERROR|NETWORK_ERROR/i.test(msg);
      if (!isTransport && chainId === candidates[candidates.length - 1]) break;
      continue;
    }
  }
  throw lastErr || new Error("Verification failed");
}

/** Public institution name for an id, with graceful failure. */
export async function institutionName(chainId, id) {
  try {
    return await makeReadRegistry(chainId).getInstitution(Number(id));
  } catch {
    return "";
  }
}

/**
 * Locate a certificate's issue/revocation transactions and event-only fields
 * (issueDate, revokedAt, reason) via topic-filtered log lookups.
 */
export async function findCertificateTxs(chainId, certId) {
  const empty = { issueTx: "", issueDate: null, revokeTx: "", revokedAt: null, revokedBy: null, revokeReason: "" };
  if (!hasRegistryDeployment(chainId)) return empty;
  const provider = makeReadProvider(chainId);
  const address = getRegistryAddress(chainId);
  const iface = new Interface(REGISTRY_ABI);
  const fromBlock = Number(deployments.CertificateRegistry.fromBlock) || 0;
  // The contract's indexed-string topic is keccak256(bytes(certId)) — the
  // same value Solidity computes, so keccak of the utf8 bytes matches it.
  const idTopic = keccak256(toUtf8Bytes(String(certId || "").trim()));

  const out = { ...empty };
  try {
    const issuedTopic = iface.getEvent("CertificateIssued").topicHash;
    const issuedLogs = await provider.getLogs({
      address,
      topics: [issuedTopic, idTopic],
      fromBlock,
      toBlock: "latest",
    });
    if (issuedLogs.length > 0) {
      const parsed = iface.parseLog(issuedLogs[0]);
      out.issueTx = issuedLogs[0].transactionHash;
      out.issueDate = parsed.args.issueDate;
    }
  } catch {
    /* RPC without log support — hashes degrade to empty */
  }
  try {
    const revokedTopic = iface.getEvent("CertificateRevoked").topicHash;
    const revokedLogs = await provider.getLogs({
      address,
      topics: [revokedTopic, idTopic],
      fromBlock,
      toBlock: "latest",
    });
    if (revokedLogs.length > 0) {
      const parsed = iface.parseLog(revokedLogs[0]);
      out.revokeTx = revokedLogs[0].transactionHash;
      out.revokedAt = parsed.args.revokedAt;
      out.revokedBy = parsed.args.by;
      out.revokeReason = parsed.args.reason;
    }
  } catch {
    /* same graceful degradation */
  }
  return out;
}

export { KNOWN_CHAINS, LOCAL, SEPOLIA };
