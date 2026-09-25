import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { ImageUp, RefreshCw, Search } from "lucide-react";
import QRScanner from "../components/QRScanner";
import VerifyResult, { VerifyResultSkeleton } from "../components/VerifyResult";
import { Alert, Button, Card, EmptyState, Input, SectionTitle } from "../components/ui";
import { findCertificateTxs, institutionName, resolveCertificate } from "../contract/registry";
import { humanError } from "../lib/web3";
import { findLocalRecordAnyWallet } from "../lib/localStore";
import { certIdFromScan } from "../lib/qr";

export default function Verify() {
  const params = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  // Path deep link (/verify/<id>) wins; legacy ?cert= still honored.
  const deepLinkId = params.certId || searchParams.get("cert") || "";
  const [certId, setCertId] = useState(deepLinkId);
  const [result, setResult] = useState(null); // resolveCertificate() output
  const [instLabel, setInstLabel] = useState("");
  const [instLoading, setInstLoading] = useState(false);
  const [txInfo, setTxInfo] = useState(null);
  const [txLoading, setTxLoading] = useState(false);
  const [localRecord, setLocalRecord] = useState(null);
  const [checking, setChecking] = useState(false);
  const [lastSearched, setLastSearched] = useState("");
  const [error, setError] = useState("");
  const [fileError, setFileError] = useState("");
  const fileInputRef = useRef(null);
  const lastRunRef = useRef("");

  const runCheck = useCallback(async (rawId) => {
    const id = String(rawId || "").trim();
    if (!id) return;
    setError("");
    setResult(null);
    setTxInfo(null);
    setInstLabel("");
    setLocalRecord(null);
    setLastSearched(id);
    setChecking(true);
    try {
      const res = await resolveCertificate(id);
      setResult(res);
      if (res.status === "NOT_FOUND") return;
      // The plaintext student/course never lives on-chain: if this browser
      // saved an issuance record for this ID (from any wallet), show it —
      // clearly marked "locally stored" — otherwise show the keccak commit.
      setLocalRecord(findLocalRecordAnyWallet(res.chainId, id));
      setInstLoading(true);
      institutionName(res.chainId, res.institutionId)
        .then(setInstLabel)
        .finally(() => setInstLoading(false));
      setTxLoading(true);
      findCertificateTxs(res.chainId, id)
        .then(setTxInfo)
        .finally(() => setTxLoading(false));
    } catch (err) {
      setError(humanError(err));
    } finally {
      setChecking(false);
    }
  }, []);

  // Deep links (/verify/<id> and legacy ?cert=): auto-verify exactly once per
  // ID, without fighting manual edits to the input.
  useEffect(() => {
    const fromUrl = params.certId || searchParams.get("cert") || "";
    if (!fromUrl || fromUrl === lastRunRef.current) return;
    lastRunRef.current = fromUrl;
    setCertId(fromUrl);
    runCheck(fromUrl);
  }, [params.certId, searchParams, runCheck]);

  function submit(e) {
    e.preventDefault();
    const id = certId.trim();
    if (!id) return;
    lastRunRef.current = id;
    navigate(`/verify/${encodeURIComponent(id)}`);
    runCheck(id);
  }

  function retry() {
    if (lastSearched) runCheck(lastSearched);
  }

  function handleScan(text) {
    const id = certIdFromScan(text);
    if (!id) {
      setError("Could not read a certificate reference from that QR code.");
      return;
    }
    setCertId(id);
    lastRunRef.current = id;
    navigate(`/verify/${encodeURIComponent(id)}`);
    runCheck(id);
  }

  async function handleImageUpload(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileError("");
    try {
      const { Html5Qrcode } = await import("html5-qrcode");
      const scanner = new Html5Qrcode("qr-file-target", { verbose: false });
      const text = await scanner.scanFile(file, false);
      await scanner.clear();
      handleScan(text);
    } catch {
      setFileError("No QR code found in that image. Try a sharper screenshot or scan with the camera.");
    } finally {
      e.target.value = "";
    }
  }

  return (
    <div className="space-y-8">
      <SectionTitle kicker="For everyone" title="Verify a certificate">
        Enter the certificate ID or scan its QR code. The verdict is read directly from the
        blockchain via a public RPC — no wallet or account needed.
      </SectionTitle>

      <div className="grid gap-6 lg:grid-cols-5">
        <div className="space-y-6 lg:col-span-3">
          <Card>
            <form onSubmit={submit} className="flex flex-col gap-3 sm:flex-row">
              <Input
                value={certId}
                onChange={(e) => setCertId(e.target.value)}
                placeholder="e.g. CERT-2026-0001"
                className="flex-1"
                aria-label="Certificate ID"
              />
              <Button type="submit" loading={checking} className="sm:w-44">
                {!checking && <Search className="h-4 w-4" />}
                Verify
              </Button>
            </form>
            {error && (
              <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex-1">
                  <Alert tone="error">
                    {error}
                    {lastSearched && <span className="block mt-0.5 text-xs opacity-75">Searched for “{lastSearched}”.</span>}
                  </Alert>
                </div>
                <Button variant="outline" onClick={retry} className="shrink-0">
                  <RefreshCw className="h-4 w-4" /> Retry
                </Button>
              </div>
            )}
          </Card>

          {/* loading — skeleton while the chain query is in flight */}
          {checking && <VerifyResultSkeleton />}

          {/* found — premium result for valid / revoked */}
          {!checking && result && result.status !== "NOT_FOUND" && (
            <VerifyResult
              result={result}
              certId={lastSearched}
              instLabel={instLabel}
              instLoading={instLoading}
              txInfo={txInfo}
              txLoading={txLoading}
              chainLabel={result.chainLabel}
              localRecord={localRecord}
            />
          )}

          {/* not found verdict */}
          {!checking && result && result.status === "NOT_FOUND" && (
            <VerifyResult result={result} certId={lastSearched} chainLabel={result.chainLabel} />
          )}

          {/* empty — nothing searched yet */}
          {!result && !checking && !error && (
            <Card className="border-dashed">
              <EmptyState
                icon={Search}
                title="No search yet"
                action={
                  <button
                    type="button"
                    onClick={() => setCertId("CERT-2026-0001")}
                    className="text-xs font-medium text-brand-300 underline-offset-4 hover:underline"
                  >
                    Use the demo ID CERT-2026-0001
                  </button>
                }
              >
                Enter a certificate ID above — or scan its QR code — and the verification result
                will appear here: status, institution, issue date, issuer wallet, on-chain hashes
                and the issuing transaction, read straight from the blockchain.
              </EmptyState>
            </Card>
          )}
        </div>

        <div className="space-y-6 lg:col-span-2">
          <Card>
            <h3 className="font-bold text-slate-100">Scan a QR code</h3>
            <div className="mt-4">
              <QRScanner onScan={handleScan} onError={(msg) => setError(msg)} />
            </div>
          </Card>

          <Card>
            <h3 className="font-bold text-slate-100">No camera? Upload instead</h3>
            <p className="mt-1 text-sm text-slate-400">
              Upload a screenshot of the QR code — it's decoded locally in your browser.
            </p>
            <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
            {/* html5-qrcode needs a target element for file scanning */}
            <div id="qr-file-target" className="hidden" />
            <Button variant="outline" className="mt-3 w-full" onClick={() => fileInputRef.current?.click()}>
              <ImageUp className="h-4 w-4" /> Upload QR image
            </Button>
            {fileError && (
              <div className="mt-3">
                <Alert tone="warn">{fileError}</Alert>
              </div>
            )}
          </Card>

          <Card>
            <h3 className="font-bold text-slate-100">What the result means</h3>
            <ul className="mt-2 space-y-2 text-sm text-slate-400">
              <li>
                <b className="text-brand-300">✓ Verified</b> — the record exists in
                CertificateRegistry and was never revoked.
              </li>
              <li>
                <b className="text-red-300">⚠ Revoked</b> — the issuing institution or platform
                owner marked it invalid on-chain.
              </li>
              <li>
                <b className="text-slate-300">✕ Not found</b> — no record with that ID exists on
                this chain.
              </li>
              <li className="text-xs text-slate-500">
                Personal data is never on-chain — the chain stores keccak256 commits only. A
                plaintext student/course label is shown just when this browser holds a saved
                issuance record, and is always marked “locally stored”.
              </li>
            </ul>
          </Card>
        </div>
      </div>
    </div>
  );
}
