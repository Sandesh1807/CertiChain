import { useCallback, useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
  ArrowLeft,
  Building2,
  CalendarDays,
  Download,
  ExternalLink,
  Fingerprint,
  GraduationCap,
  Hash,
  Search,
  ShieldX,
} from "lucide-react";
import StatusBadge from "../components/StatusBadge";
import QRDisplay from "../components/QRDisplay";
import WrongNetworkBanner from "../components/WrongNetworkBanner";
import { Alert, Button, Card, CopyChip, SectionTitle, Skeleton } from "../components/ui";
import { KNOWN_CHAINS, SEPOLIA } from "../config/chains";
import { findCertificateTxs, institutionName, resolveCertificate } from "../contract/registry";
import { findLocalRecordAnyWallet } from "../lib/localStore";
import { downloadDataUrl, renderCertificateCard } from "../lib/certificateCard";
import { verifyUrl } from "../lib/qr";

function Row({ icon: Icon, label, children }) {
  return (
    <div className="flex flex-col gap-1 py-3 sm:flex-row sm:items-baseline sm:justify-between sm:gap-6">
      <dt className="flex shrink-0 items-center gap-2 text-sm font-medium text-slate-400">
        {Icon && <Icon className="h-4 w-4 text-slate-500" />}
        {label}
      </dt>
      <dd className="text-right text-sm font-semibold text-slate-100">{children}</dd>
    </div>
  );
}

function short(hash) {
  return `${String(hash).slice(0, 10)}…${String(hash).slice(-8)}`;
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

const fmtDate = (secs) =>
  new Date(Number(secs) * 1000).toLocaleDateString(undefined, {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

export default function CertificateDetails() {
  const { certId } = useParams();
  const [state, setState] = useState({ loading: true, result: null, instLabel: "", txInfo: null, localRecord: null, error: "" });
  const [downloading, setDownloading] = useState(false);

  const load = useCallback(async (id) => {
    setState({ loading: true, result: null, instLabel: "", txInfo: null, localRecord: null, error: "" });
    try {
      const result = await resolveCertificate(id);
      let instLabel = "";
      let txInfo = null;
      let localRecord = null;
      if (result.status !== "NOT_FOUND") {
        // Plaintext labels only from a locally saved issuance record (any
        // wallet's copy) — the chain intentionally stores commits only.
        localRecord = findLocalRecordAnyWallet(result.chainId, id);
        instLabel = await institutionName(result.chainId, result.institutionId);
        txInfo = await findCertificateTxs(result.chainId, id);
      }
      setState({ loading: false, result, instLabel, txInfo, localRecord, error: "" });
    } catch (err) {
      setState({ loading: false, result: null, instLabel: "", txInfo: null, localRecord: null, error: String(err?.message || err) });
    }
  }, []);

  useEffect(() => {
    if (certId) load(certId);
  }, [certId, load]);

  const meta = state.result ? KNOWN_CHAINS[state.result.chainId] : null;
  const explorer = state.result?.chainId === SEPOLIA.chainId ? SEPOLIA.explorer : null;
  const chainLabel = meta ? meta.label : "";
  const link = certId ? verifyUrl(certId) : "";

  async function handleDownload() {
    if (!state.result || state.result.status === "NOT_FOUND") return;
    setDownloading(true);
    try {
      const png = await renderCertificateCard({
        certId,
        title: state.localRecord?.course || "Certificate",
        student: state.localRecord?.studentLabel || "",
        course: state.localRecord?.course || "",
        institution: state.instLabel,
        issueDate: state.txInfo?.issueDate != null ? fmtDate(state.txInfo.issueDate) : "",
        status: state.result.status,
        verifyLink: link,
        txHash: state.txInfo?.issueTx || "",
        network: meta?.label || "",
      });
      downloadDataUrl(png, `${certId}-certificate.png`);
    } catch {
      /* canvas/QR failure — button simply does nothing visible */
    } finally {
      setDownloading(false);
    }
  }

  return (
    <div className="space-y-8">
      <Link
        to="/verify"
        className="inline-flex items-center gap-1.5 text-sm text-slate-400 transition-colors hover:text-brand-300"
      >
        <ArrowLeft className="h-4 w-4" /> Back to verification
      </Link>

      <SectionTitle kicker="Certificate preview" title="Certificate" />
      <WrongNetworkBanner />

      {state.loading && (
        <Card>
          <div className="animate-pulse space-y-4">
            <Skeleton className="h-8 w-56" />
            <div className="space-y-3">
              {[0, 1, 2, 3, 4, 5].map((i) => (
                <Skeleton key={i} className="h-5 w-full" />
              ))}
            </div>
          </div>
        </Card>
      )}

      {!state.loading && state.error && <Alert tone="error">{state.error}</Alert>}

      {!state.loading && !state.error && state.result?.status === "NOT_FOUND" && (
        <Card className="mx-auto max-w-lg text-center">
          <span className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-slate-500/10 text-slate-400 ring-1 ring-slate-500/25">
            <Search className="h-6 w-6" />
          </span>
          <h3 className="mt-4 font-display text-xl font-bold text-slate-100">Certificate not found</h3>
          <p className="mx-auto mt-2 max-w-sm text-sm text-slate-400">
            No record with ID <span className="font-mono text-slate-200">{certId}</span> exists on{" "}
            {chainLabel || "the supported chains"}. Check the ID for typos, or verify it directly:
          </p>
          <Link
            to={`/verify/${encodeURIComponent(certId || "")}`}
            className="mt-5 inline-flex items-center gap-2 rounded-xl bg-brand-500 px-5 py-2.5 text-sm font-bold text-slate-950 shadow-lg shadow-brand-500/25 transition hover:bg-brand-400"
          >
            <Search className="h-4 w-4" /> Verify this ID
          </Link>
        </Card>
      )}

      {!state.loading && !state.error && state.result && state.result.status !== "NOT_FOUND" && (
        <div className="animate-fade-up grid gap-6 lg:grid-cols-5">
          {/* ---------------- certificate preview ---------------- */}
          <Card className="lg:col-span-3">
            <div className="flex flex-col items-center gap-3 border-b border-slate-800 pb-5 sm:flex-row sm:justify-between">
              <div className="text-center sm:text-left">
                <p className="text-xs uppercase tracking-widest text-slate-500">Certificate title</p>
                <p className="font-display text-lg font-bold text-slate-100">
                  {state.localRecord?.course || "Certificate"}
                  {state.localRecord?.course && <LocalTag />}
                </p>
              </div>
              <StatusBadge status={state.result.status} />
            </div>

            <dl className="divide-y divide-slate-800/70">
              <Row icon={GraduationCap} label="Student">
                {state.localRecord?.studentLabel ? (
                  <span>
                    {state.localRecord.studentLabel} <LocalTag />
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-2">
                    identity committed off-chain
                    <CopyChip value={state.result.studentHash} display={`studentHash ${short(state.result.studentHash)}`} />
                  </span>
                )}
              </Row>
              <Row icon={Hash} label="Course">
                {state.localRecord?.course ? (
                  <span>
                    {state.localRecord.course} <LocalTag />
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-2">
                    content committed on-chain
                    <CopyChip value={state.result.certHash} display={`certHash ${short(state.result.certHash)}`} />
                  </span>
                )}
              </Row>
              <Row icon={Building2} label="Institution">
                {state.instLabel || (state.result.institutionId ? `Institution #${state.result.institutionId}` : "—")}
              </Row>
              <Row icon={CalendarDays} label="Issue date">
                {state.txInfo?.issueDate != null ? fmtDate(state.txInfo.issueDate) : "—"}
              </Row>
              <Row icon={Fingerprint} label="Certificate ID">
                <span className="font-mono">{certId}</span>
              </Row>
            </dl>

            {state.result.status === "VALID" && (
              <div className="mt-5">
                <Alert tone="success">
                  This certificate exists on {chainLabel} and has not been revoked.
                </Alert>
              </div>
            )}
            {state.result.status === "REVOKED" && (
              <div className="mt-5">
                <Alert tone="error">
                  This certificate was revoked on-chain — treat any printed copy as invalid.
                </Alert>
              </div>
            )}
          </Card>

          {/* ---------------- QR + blockchain verification ---------------- */}
          <div className="space-y-6 lg:col-span-2">
            <Card>
              <h3 className="mb-1 text-center font-display font-bold text-slate-100">Verification QR</h3>
              <p className="mb-4 text-center text-xs text-slate-500">
                Encodes only the public verification URL — no keys, hashes or personal data.
              </p>
              <QRDisplay url={link} fileName={`${certId}-qr.png`} />
              <Button className="mt-4 w-full" loading={downloading} onClick={handleDownload}>
                {!downloading && <Download className="h-4 w-4" />} Download Certificate
              </Button>
              <p className="mt-2 text-center text-[11px] text-slate-500">
                Printable PNG with the live on-chain verdict and QR.
              </p>
            </Card>

            <Card>
              <h3 className="font-display font-bold text-slate-100">Blockchain verification</h3>
              <dl className="mt-2 divide-y divide-slate-800/70">
                <Row label="Network">{chainLabel || `chain ${state.result.chainId}`}</Row>
                <Row label="Issued by (wallet)">
                  {explorer ? (
                    <a
                      className="inline-flex items-center gap-1 font-mono text-xs text-brand-300 hover:underline"
                      href={`${explorer}/address/${state.result.issuer}`}
                      target="_blank"
                      rel="noreferrer"
                    >
                      {short(state.result.issuer)} <ExternalLink className="h-3 w-3" />
                    </a>
                  ) : (
                    <span className="font-mono text-xs">{short(state.result.issuer)}</span>
                  )}
                </Row>
                <Row label="Transaction hash">
                  {state.txInfo?.issueTx ? (
                    explorer ? (
                      <a
                        className="inline-flex items-center gap-1.5 font-mono text-xs text-brand-300 hover:underline"
                        href={`${explorer}/tx/${state.txInfo.issueTx}`}
                        target="_blank"
                        rel="noreferrer"
                        title="Open issue transaction in explorer"
                      >
                        {short(state.txInfo.issueTx)} <ExternalLink className="h-3 w-3" />
                      </a>
                    ) : (
                      <CopyChip value={state.txInfo.issueTx} display={short(state.txInfo.issueTx)} />
                    )
                  ) : (
                    <span className="text-xs text-slate-500">resolving from events…</span>
                  )}
                </Row>
                {state.result.status === "REVOKED" && (
                  <Row icon={ShieldX} label="Revocation reason">
                    {state.txInfo?.revokeReason || "—"}
                  </Row>
                )}
              </dl>
              <p className="mt-3 text-xs leading-relaxed text-slate-500">
                Read live from the <span className="font-mono">CertificateRegistry</span> contract —
                the verdict is the chain's own answer, not a cached result.
              </p>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
}
