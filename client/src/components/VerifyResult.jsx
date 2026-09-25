import { ExternalLink, SearchX, ShieldAlert, ShieldCheck } from "lucide-react";
import { Card, CopyChip, Skeleton } from "./ui";
import { SEPOLIA } from "../config/chains";
import { shortenAddress } from "../lib/web3";

/* ---------------------------------------------------------------
   Verdict headers — the exact strings the verification page shows
--------------------------------------------------------------- */
const VERDICTS = {
  VALID: {
    title: "✓ Certificate Verified",
    sub: "This certificate exists in CertificateRegistry and has not been revoked.",
    icon: ShieldCheck,
    banner: "border-brand-500/40 from-brand-500/15 via-brand-500/5",
    iconWrap: "border-brand-500/40 bg-brand-500/15 text-brand-300",
    titleTone: "text-brand-200",
  },
  REVOKED: {
    title: "⚠ Certificate Revoked",
    sub: "The issuer or platform owner revoked this certificate on-chain.",
    icon: ShieldAlert,
    banner: "border-red-500/40 from-red-500/15 via-red-500/5",
    iconWrap: "border-red-500/40 bg-red-500/15 text-red-300",
    titleTone: "text-red-200",
  },
  NOT_FOUND: {
    title: "✕ Certificate Not Found",
    sub: "No certificate with this ID is registered in CertificateRegistry.",
    icon: SearchX,
    banner: "border-slate-600/60 from-slate-500/10 via-slate-500/5",
    iconWrap: "border-slate-500/40 bg-slate-500/15 text-slate-300",
    titleTone: "text-slate-200",
  },
};

function VerdictBanner({ status }) {
  const v = VERDICTS[status] || VERDICTS.NOT_FOUND;
  const Icon = v.icon;
  return (
    <div className={`flex items-center gap-4 rounded-xl border bg-gradient-to-br to-transparent p-5 ${v.banner}`}>
      <span className={`grid h-12 w-12 shrink-0 place-items-center rounded-xl border ${v.iconWrap}`}>
        <Icon className="h-6 w-6" />
      </span>
      <div>
        <p className={`font-display text-xl font-bold tracking-tight sm:text-2xl ${v.titleTone}`}>{v.title}</p>
        <p className="mt-0.5 text-sm text-slate-400">{v.sub}</p>
      </div>
    </div>
  );
}

function Row({ label, children }) {
  return (
    <div className="flex flex-col gap-1 py-3 sm:flex-row sm:items-baseline sm:justify-between sm:gap-6">
      <dt className="shrink-0 text-sm font-medium text-slate-400">{label}</dt>
      <dd className="break-all text-right text-sm font-semibold text-slate-100">{children}</dd>
    </div>
  );
}

/** Marks a value that came from this browser's saved issuance record. */
function LocalTag() {
  return (
    <span
      title="This label comes from this browser's saved issuance record — the blockchain stores only the hash."
      className="ml-2 inline-flex shrink-0 items-center rounded-full border border-amber-500/40 bg-amber-500/10 px-2 py-0.5 align-middle text-[10px] font-semibold uppercase tracking-wider text-amber-300"
    >
      locally stored
    </span>
  );
}

const hashDisplay = (h) => `${h.slice(0, 10)}…${h.slice(-8)}`;

function SkeletonResult() {
  return (
    <Card aria-busy="true" aria-label="Verifying certificate">
      <div className="flex items-center gap-4 rounded-xl border border-slate-800 p-5">
        <Skeleton className="h-12 w-12 rounded-xl" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-5 w-56" />
          <Skeleton className="h-3.5 w-72 max-w-full" />
        </div>
      </div>
      <dl className="mt-2 divide-y divide-slate-800/70">
        {[
          "w-40",
          "w-64",
          "w-52",
          "w-44",
          "w-32",
          "w-60",
          "w-64",
          "w-56",
          "w-48",
        ].map((w, i) => (
          <div key={i} className="flex items-center justify-between py-3.5">
            <Skeleton className="h-3.5 w-36" />
            <Skeleton className={`h-3.5 ${w}`} />
          </div>
        ))}
      </dl>
    </Card>
  );
}

/**
 * Premium verification result for CertificateRegistry — handles all three
 * verdicts (VALID / REVOKED / NOT_FOUND). Every chain field comes from the
 * contract (`resolveCertificate`) or its events (`findCertificateTxs` via
 * `txInfo`); `localRecord` is the only browser-derived data and is always
 * marked as locally stored.
 */
export default function VerifyResult({
  result,
  certId,
  instLabel,
  instLoading = false,
  txInfo,
  txLoading = false,
  chainLabel,
  localRecord = null,
}) {
  if (!result) return null;
  const { chainId } = result;
  const explorer = chainId === SEPOLIA.chainId ? SEPOLIA.explorer : null;
  const shortTx = (tx) => `${tx.slice(0, 12)}…${tx.slice(-10)}`;

  /* -------------------------------------------------- not found */
  if (result.status === "NOT_FOUND") {
    return (
      <Card className="animate-fade-up">
        <VerdictBanner status="NOT_FOUND" />
        <dl className="mt-2 divide-y divide-slate-800/70">
          <Row label="Certificate ID">
            <CopyChip value={certId} display={certId} />
          </Row>
          <Row label="Blockchain Network">
            <span>{chainLabel || `chain ${chainId}`}</span>
            <span className="ml-1.5 text-xs font-normal text-slate-500">chainId {chainId}</span>
          </Row>
        </dl>
        <p className="mt-4 text-sm leading-relaxed text-slate-400">
          Double-check the ID for typos — issued IDs look like{" "}
          <span className="font-mono text-slate-300">CERT-2026-0001</span>. A certificate also only
          appears here if it was issued on a chain this build covers.
        </p>
      </Card>
    );
  }

  /* --------------------------------------------- found (valid / revoked) */
  const issuedAt =
    txInfo?.issueDate != null
      ? new Date(Number(txInfo.issueDate) * 1000).toLocaleDateString(undefined, {
          year: "numeric",
          month: "short",
          day: "numeric",
        })
      : null;

  return (
    <Card className="animate-fade-up">
      <VerdictBanner status={result.status} />

      <dl className="mt-4 divide-y divide-slate-800/70">
        <Row label="Certificate ID">
          <CopyChip value={certId} display={certId} />
        </Row>

        <Row label="Student">
          {localRecord?.studentLabel ? (
            <span>
              {localRecord.studentLabel} <LocalTag />
            </span>
          ) : (
            <>
              <CopyChip value={result.studentHash} display={hashDisplay(result.studentHash)} />
              <span className="mt-1 block text-xs font-normal text-slate-500">
                on-chain privacy commit — no plaintext is stored on the chain
              </span>
            </>
          )}
        </Row>

        <Row label="Certificate/Course">
          {localRecord?.course ? (
            <span>
              {localRecord.course} <LocalTag />
            </span>
          ) : (
            <>
              <CopyChip value={result.certHash} display={hashDisplay(result.certHash)} />
              <span className="mt-1 block text-xs font-normal text-slate-500">
                on-chain privacy commit — no plaintext is stored on the chain
              </span>
            </>
          )}
        </Row>

        <Row label="Institution">
          {instLoading ? (
            <Skeleton className="ml-auto h-4 w-44" />
          ) : (
            instLabel || (result.institutionId ? `Institution #${result.institutionId}` : "—")
          )}
        </Row>

        <Row label="Issue Date">
          {txLoading ? (
            <Skeleton className="ml-auto h-4 w-28" />
          ) : issuedAt ? (
            issuedAt
          ) : (
            "—"
          )}
        </Row>

        <Row label="Issuer Wallet">
          <span className="inline-flex items-center gap-1.5">
            <CopyChip value={result.issuer} display={shortenAddress(result.issuer, 6)} />
            {explorer && (
              <a
                className="text-brand-300 hover:underline"
                href={`${explorer}/address/${result.issuer}`}
                target="_blank"
                rel="noreferrer"
                aria-label="Open issuer on the block explorer"
              >
                <ExternalLink className="h-3.5 w-3.5" />
              </a>
            )}
          </span>
        </Row>

        <Row label="Certificate Hash">
          <CopyChip value={result.certHash} display={hashDisplay(result.certHash)} />
        </Row>

        <Row label="Blockchain Transaction">
          {txLoading ? (
            <Skeleton className="ml-auto h-4 w-52" />
          ) : txInfo?.issueTx ? (
            <span className="inline-flex items-center gap-1.5">
              <CopyChip value={txInfo.issueTx} display={shortTx(txInfo.issueTx)} />
              {explorer && (
                <a
                  className="text-brand-300 hover:underline"
                  href={`${explorer}/tx/${txInfo.issueTx}`}
                  target="_blank"
                  rel="noreferrer"
                  aria-label="Open transaction on the block explorer"
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                </a>
              )}
            </span>
          ) : (
            "—"
          )}
        </Row>

        <Row label="Blockchain Network">
          <span>{chainLabel || `chain ${chainId}`}</span>
          <span className="ml-1.5 text-xs font-normal text-slate-500">chainId {chainId}</span>
        </Row>

        {result.status === "REVOKED" && txInfo?.revokeReason && (
          <Row label="Revocation reason">{txInfo.revokeReason}</Row>
        )}
        {result.status === "REVOKED" && txInfo?.revokedAt != null && (
          <Row label="Revoked on">
            {new Date(Number(txInfo.revokedAt) * 1000).toLocaleString(undefined, {
              year: "numeric",
              month: "short",
              day: "numeric",
              hour: "2-digit",
              minute: "2-digit",
            })}
          </Row>
        )}
        {result.status === "REVOKED" && txInfo?.revokeTx && (
          <Row label="Revocation transaction">
            <span className="inline-flex items-center gap-1.5">
              <CopyChip value={txInfo.revokeTx} display={shortTx(txInfo.revokeTx)} />
              {explorer && (
                <a
                  className="text-red-300 hover:underline"
                  href={`${explorer}/tx/${txInfo.revokeTx}`}
                  target="_blank"
                  rel="noreferrer"
                  aria-label="Open revocation transaction on the block explorer"
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                </a>
              )}
            </span>
          </Row>
        )}
      </dl>

      <p className="mt-4 flex items-center justify-center gap-1.5 text-[11px] text-slate-500">
        <ShieldCheck className="h-3 w-3" />
        Read live from CertificateRegistry on {chainLabel || "the chain"} — the verdict is the
        contract's own answer, not a cached result.
      </p>
    </Card>
  );
}

export { SkeletonResult as VerifyResultSkeleton };
