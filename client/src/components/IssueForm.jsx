import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowUpRight, ExternalLink, Hash, QrCode, RotateCcw, Wand2 } from "lucide-react";
import { certificateCommit, studentCommit } from "../lib/hashing";
import { loadKnownIds, rememberKnownId, saveLocalRecord } from "../lib/localStore";
import { markLocalIssue } from "../lib/session";
import { useWallet } from "../context/WalletContext";
import { defaultInstitution, makeWriteRegistry, LOCAL, SEPOLIA } from "../contract/registry";
import { humanError } from "../lib/web3";
import TxStatusCard from "./TxStatusCard";
import { Alert, Button, Field, Input } from "./ui";

const ID_PREFIX = "CERT-";

/** Map any failure to (message, kind) so the UI can react precisely. */
function classifyIssueError(err) {
  // Classify on the FRIENDLY message — humanError decodes raw revert data
  // (hex custom-error selectors) that the raw message alone may not expose.
  const text = humanError(err);
  if (/already exists on-chain/i.test(text) || /DuplicateCertId/i.test(String(err?.message))) {
    return { message: text, kind: "duplicate" };
  }
  return { message: text, kind: /rejected/i.test(text) ? "rejected" : "error" };
}

/**
 * Generate a unique certificate ID: CERT-<year>-<6 random base32 chars>,
 * retried against locally known IDs. Uniqueness on-chain is still enforced
 * by the contract (DuplicateCertId) — this just avoids user friction.
 */
function useUniqueId(activeChainId) {
  return useCallback(function generate() {
    const known = loadKnownIds(activeChainId);
    const year = new Date().getFullYear();
    const alphabet = "ABCDEFGHJKMNPQRSTUVWXYZ23456789"; // no I/L/O/0/1 lookalikes
    for (let attempt = 0; attempt < 8; attempt++) {
      let suffix = "";
      const bytes = new Uint8Array(6);
      crypto.getRandomValues(bytes);
      for (const b of bytes) suffix += alphabet[b % alphabet.length];
      const candidate = `${ID_PREFIX}${year}-${suffix}`;
      if (!known.has(candidate)) {
        return candidate;
      }
    }
    return `${ID_PREFIX}${year}-${Date.now().toString(36).toUpperCase()}`;
  }, [activeChainId]);
}

export default function IssueForm({ onIssued }) {
  const wallet = useWallet();
  const activeChainId = wallet.onSepolia
    ? SEPOLIA.chainId
    : wallet.chainId && wallet.chainId !== 1
      ? wallet.chainId
      : LOCAL.chainId;

  const [certId, setCertId] = useState(() => {
    try {
      return `CERT-${new Date().getFullYear()}-`;
    } catch {
      return "CERT-";
    }
  });
  const [studentId, setStudentId] = useState("");
  const [course, setCourse] = useState("");
  const [issueDate, setIssueDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [phase, setPhase] = useState("idle"); // idle | signing | pending | confirming | success
  const [txHash, setTxHash] = useState("");
  const [error, setError] = useState(""); // { message, kind } rendered via Alert
  const [success, setSuccess] = useState(null); // full record after confirmation

  const generateId = useUniqueId(activeChainId);

  // Prefill an unused ID once the wallet/chain is known.
  useEffect(() => {
    if (wallet.isConnected && /^CERT-\d{4}-$/.test(certId)) {
      setCertId(generateId());
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [wallet.isConnected, activeChainId]);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setSuccess(null);
    setTxHash("");

    if (!wallet.isConnected) {
      setError({ message: "Connect your wallet first (button in the top bar).", kind: "error" });
      return;
    }
    if (wallet.isWrongNetwork) {
      setError({ message: "Your wallet is on an unsupported network. Switch networks first.", kind: "network" });
      return;
    }
    if (!studentId.trim() || !course.trim() || !certId.trim()) {
      setError({ message: "Please fill in every field.", kind: "error" });
      return;
    }
    const isoDate = issueDate; // yyyy-mm-dd
    const ts = Math.floor(new Date(`${isoDate}T00:00:00Z`).getTime() / 1000);
    if (Number.isNaN(ts)) {
      setError({ message: "Invalid issue date.", kind: "error" });
      return;
    }

    // Target whatever known chain the wallet is already on. Wrong/unknown
    // networks are blocked above; the local dev chain and Sepolia both work.
    const targetChainId = wallet.onSepolia
      ? SEPOLIA.chainId
      : wallet.onLocal
        ? LOCAL.chainId
        : wallet.chainId;

    setPhase("signing");
    try {
      // 4-5. Hash off-chain, then call the contract through the wallet.
      const sHash = studentCommit(studentId);
      const cHash = certificateCommit({
        course,
        institution: defaultInstitution().name,
        issueDate: isoDate,
      });

      const registry = await makeWriteRegistry(targetChainId);
      const tx = await registry.issueCertificate(certId.trim(), sHash, cHash, BigInt(ts));
      // 7. The wallet has returned a signed transaction.
      setTxHash(tx.hash);
      setPhase("pending");

      // 8. Wait for the network: mine, then reach 1 confirmation. Polling the
      // receipt keeps the lifecycle honest — the phase flips only when the
      // chain itself reports the state.
      const provider = registry.runner.provider;
      let receipt = await provider.getTransactionReceipt(tx.hash);
      while (!receipt) {
        await new Promise((r) => setTimeout(r, 700));
        receipt = await provider.getTransactionReceipt(tx.hash);
      }
      setPhase("confirming");
      // A receipt with status 1 means the transaction was mined — i.e. it has
      // its first confirmation by definition. Some RPCs omit/zero the
      // `confirmations` field on the raw receipt, so treat "receipt exists +
      // status 1" as confirmed, with a short bounded grace period.
      if (Number(receipt.status) !== 1) {
        throw new Error("Transaction reverted on-chain.");
      }
      const confs = Number(receipt.confirmations ?? 0);
      if (!Number.isFinite(confs) || confs < 1) {
        await new Promise((r) => setTimeout(r, 600)); // brief finalize grace
      }

      // 9-11. Confirmed — success state, tx hash display, local MVP record.
      setPhase("success");
      rememberKnownId(targetChainId, certId.trim());
      if (targetChainId === LOCAL.chainId) markLocalIssue();
      const record = {
        certId: certId.trim(),
        course: course.trim(),
        studentLabel: studentId.trim(),
        issueDate: isoDate,
        txHash: tx.hash,
        chainId: targetChainId,
        issuedAt: Date.now(),
      };
      saveLocalRecord(targetChainId, wallet.address, record);
      setSuccess(record);
      onIssued?.(record);
    } catch (err) {
      // The wallet may report the rejection without a tx ever existing.
      const { message, kind } = classifyIssueError(err);
      setError({ message, kind });
      setPhase("idle");
    }
  }

  function reset() {
    setPhase("idle");
    setTxHash("");
    setSuccess(null);
    setError("");
    setStudentId("");
    setCourse("");
    setCertId(generateId());
  }

  const busy = phase === "signing" || phase === "pending" || phase === "confirming";
  const stageHint = !wallet.isConnected
    ? "Connect your college wallet to begin."
    : wallet.isWrongNetwork
      ? "Switch your wallet to a supported network first."
      : busy
        ? "Follow the prompts in your wallet…"
        : wallet.onSepolia
          ? "Ready — this writes to the Sepolia testnet."
          : "Ready — this writes to the local dev chain.";

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="rounded-xl border border-slate-800 bg-slate-950/50 px-4 py-3 text-sm text-slate-300">
        {stageHint}
        {busy && <span className="ml-1 inline-block animate-pulse text-brand-300">●</span>}
      </div>

      <Field
        label="Certificate ID"
        hint={
          <span className="inline-flex items-center gap-1">
            unique on-chain
            <button
              type="button"
              onClick={() => setCertId(generateId())}
              className="inline-flex items-center gap-1 text-brand-300 hover:underline"
              title="Generate a fresh unique ID"
            >
              <Wand2 className="h-3 w-3" /> generate
            </button>
          </span>
        }
      >
        <div className="flex gap-2">
          <Input
            value={certId}
            onChange={(e) => setCertId(e.target.value)}
            placeholder="CERT-2026-XXXXX"
            maxLength={64}
            required
          />
        </div>
      </Field>

      <Field label="Student identifier" hint="hashed in your browser — never sent raw">
        <Input
          value={studentId}
          onChange={(e) => setStudentId(e.target.value)}
          placeholder="e.g. roll number or student ID"
          maxLength={96}
          required
        />
      </Field>

      <Field label="Course / certificate name">
        <Input
          value={course}
          onChange={(e) => setCourse(e.target.value)}
          placeholder="B.Tech Computer Science"
          maxLength={96}
          required
        />
      </Field>

      <Field label="Issue date" hint="as printed on the certificate">
        <Input type="date" value={issueDate} onChange={(e) => setIssueDate(e.target.value)} required />
      </Field>

      {/* 7-10: explicit, honest transaction lifecycle */}
      {busy && <TxStatusCard status={phase === "signing" ? "pending" : phase} txHash={txHash} chainId={activeChainId} />}
      {phase === "success" && success && (
        <TxStatusCard status="success" txHash={success.txHash} chainId={success.chainId} />
      )}

      {error && (
        <div>
          <Alert tone="error">
            <span className="flex items-start gap-2">
              <span>{error.message}</span>
            </span>
          </Alert>
          {error.kind === "duplicate" && (
            <button
              type="button"
              onClick={() => setCertId(generateId())}
              className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-brand-300 hover:underline"
            >
              <Hash className="h-3 w-3" /> Generate a fresh ID instead
            </button>
          )}
        </div>
      )}

      {phase === "success" && success && (
        <div className="animate-fade-up flex flex-wrap items-center gap-x-4 gap-y-2 text-sm">
          <Link
            className="inline-flex items-center gap-1 font-medium text-brand-300 hover:underline"
            to={`/verify/${encodeURIComponent(success.certId)}`}
          >
            Open its verification page <ArrowUpRight className="h-3.5 w-3.5" />
          </Link>
          <Link
            className="inline-flex items-center gap-1 font-medium text-slate-300 hover:text-brand-300"
            to={`/certificate/${encodeURIComponent(success.certId)}`}
          >
            Certificate & QR <QrCode className="h-3.5 w-3.5" />
          </Link>
          {success.chainId === SEPOLIA.chainId && (
            <a
              className="inline-flex items-center gap-1 font-mono text-xs text-slate-400 hover:text-brand-300"
              href={`${SEPOLIA.explorer}/tx/${success.txHash}`}
              target="_blank"
              rel="noreferrer"
            >
              tx {success.txHash.slice(0, 14)}… <ExternalLink className="h-3 w-3" />
            </a>
          )}
          <button
            type="button"
            onClick={reset}
            className="inline-flex items-center gap-1 font-medium text-slate-400 hover:text-slate-200"
          >
            <RotateCcw className="h-3.5 w-3.5" /> Issue another
          </button>
        </div>
      )}

      <Button type="submit" loading={busy} className="w-full">
        {phase === "signing"
          ? "Confirm in your wallet…"
          : phase === "pending"
            ? "Pending on-chain…"
            : phase === "confirming"
              ? "Confirming…"
              : "Issue certificate"}
      </Button>
    </form>
  );
}
