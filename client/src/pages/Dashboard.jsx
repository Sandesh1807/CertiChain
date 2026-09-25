import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowUpRight,
  BadgeCheck,
  Ban,
  Blocks,
  Droplets,
  FilePlus2,
  Fingerprint,
  RefreshCw,
  ScrollText,
  ShieldCheck,
  Wallet,
  QrCode,
} from "lucide-react";
import IssueForm from "../components/IssueForm";
import QRDisplay from "../components/QRDisplay";
import WrongNetworkBanner from "../components/WrongNetworkBanner";
import ChainBadge from "../components/ChainBadge";
import { Alert, Badge, Button, Card, EmptyState, Input, SectionTitle, Skeleton } from "../components/ui";
import { LOCAL, SEPOLIA } from "../config/chains";
import {
  defaultInstitution,
  fetchIssuedByIssuer,
  hasRegistryDeployment,
  makeReadRegistry,
  makeWriteRegistry,
} from "../contract/registry";
import { loadLocalRecords } from "../lib/localStore";
import { verifyUrl } from "../lib/qr";
import { useWallet } from "../context/WalletContext";
import { getSigner, humanError, shortenAddress } from "../lib/web3";

export default function Dashboard() {
  const wallet = useWallet();
  const [issued, setIssued] = useState(null); // last issued payload for QR panel
  const [recent, setRecent] = useState([]);
  const [revoked, setRevoked] = useState(new Map());
  const [loadingRecent, setLoadingRecent] = useState(false);
  const [recentError, setRecentError] = useState("");
  const [ownerAddress, setOwnerAddress] = useState("");
  const [newIssuer, setNewIssuer] = useState("");
  const [adminBusy, setAdminBusy] = useState(false);
  const [adminMsg, setAdminMsg] = useState(null);
  const [revokingId, setRevokingId] = useState(null);

  const activeChainId = wallet.onSepolia
    ? SEPOLIA.chainId
    : wallet.onLocal
      ? LOCAL.chainId
      : wallet.chainId || LOCAL.chainId;
  const deployedHere = hasRegistryDeployment(activeChainId);
  const isOwner =
    !!wallet.address && !!ownerAddress && ownerAddress.toLowerCase() === wallet.address.toLowerCase();

  // Contract presence + owner address (for the admin panel).
  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!deployedHere) return;
      try {
        const owner = await makeReadRegistry(activeChainId).owner();
        if (!cancelled) setOwnerAddress(owner);
      } catch {
        if (!cancelled) setOwnerAddress("");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [deployedHere, activeChainId]);

  /** Load this wallet's issuances + revocations from on-chain events. */
  const refreshRecent = useCallback(async () => {
    if (!wallet.address || !deployedHere) return;
    setLoadingRecent(true);
    setRecentError("");
    try {
      const { items, revoked: revokedMap } = await fetchIssuedByIssuer(activeChainId, wallet.address);
      setRevoked(revokedMap);

      // Merge in local MVP records (student label etc.) so the list shows
      // human-readable info the chain deliberately does not store.
      const local = loadLocalRecords(activeChainId, wallet.address);
      const byId = new Map(local.map((r) => [r.certId, r]));
      const merged = items.map((item) => ({
        ...item,
        course: byId.get(item.certId)?.course || "",
        studentLabel: byId.get(item.certId)?.studentLabel || "",
      }));
      // Local records whose event isn't indexed yet (rare RPC lag) still show.
      const seen = new Set(items.map((i) => i.certId));
      for (const rec of local) {
        if (!seen.has(rec.certId)) {
          merged.unshift({
            certId: rec.certId,
            issueDate: Math.floor(new Date(`${rec.issueDate}T00:00:00Z`).getTime() / 1000),
            txHash: rec.txHash,
            blockNumber: 0,
            course: rec.course,
            studentLabel: rec.studentLabel,
            pendingLocal: true,
          });
        }
      }
      setRecent(merged.slice(0, 12));
    } catch (err) {
      setRecentError(humanError(err));
    } finally {
      setLoadingRecent(false);
    }
  }, [wallet.address, deployedHere, activeChainId]);

  useEffect(() => {
    refreshRecent();
  }, [refreshRecent]);

  function handleIssued(payload) {
    setIssued(payload);
    refreshRecent();
  }

  async function handleRevoke(certId) {
    const reason = window.prompt(
      `Revoke "${certId}"?\nThis permanently marks it invalid on-chain. Enter a short public reason:`,
      "forgery reported"
    );
    if (reason == null) return; // cancelled
    if (reason.trim().length > 96) {
      // The contract rejects reasons longer than 96 bytes (TooLong).
      window.alert("Reason must be 96 characters or fewer.");
      return;
    }
    setRevokingId(certId);
    try {
      const targetChainId = wallet.onSepolia ? SEPOLIA.chainId : LOCAL.chainId;
      const registry = await makeWriteRegistry(targetChainId);
      const tx = await registry.revokeCertificate(certId, reason.trim() || "revoked by issuer");
      await tx.wait(1);
      await refreshRecent();
    } catch (err) {
      window.alert(humanError(err));
    } finally {
      setRevokingId(null);
    }
  }

  async function handleAddIssuer(e) {
    e.preventDefault();
    setAdminMsg(null);
    if (!/^0x[a-fA-F0-9]{40}$/.test(newIssuer.trim())) {
      setAdminMsg({ tone: "error", text: "Enter a valid 0x wallet address." });
      return;
    }
    setAdminBusy(true);
    try {
      const institution = defaultInstitution();
      const registry = await makeWriteRegistry(wallet.onSepolia ? SEPOLIA.chainId : LOCAL.chainId);
      const institutionId =
        institution.id != null ? Number(institution.id) : Number(await registry.institutionCount());
      const tx = await registry.addIssuer(newIssuer.trim(), institutionId);
      await tx.wait(1);
      setAdminMsg({ tone: "success", text: `Issuer added for "${institution.name}" (id ${institutionId}).` });
      setNewIssuer("");
    } catch (err) {
      setAdminMsg({ tone: "error", text: humanError(err) });
    } finally {
      setAdminBusy(false);
    }
  }

  const activeCount = recent.filter((r) => !revoked.has(r.certId)).length;
  const revokedCount = recent.filter((r) => revoked.has(r.certId)).length;

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <SectionTitle kicker="For colleges" title="Issuer Dashboard">
          Writes go through your browser wallet. Only whitelisted issuer wallets can record
          certificates; the deployer also gets an owner panel.
        </SectionTitle>
        <ChainBadge className="mb-8" />
      </div>

      <WrongNetworkBanner />

      {!deployedHere && (
        <Alert tone="warn">
          CertificateRegistry is not deployed on this chain for this build. Deploy and sync:
          <code className="mx-1 rounded bg-slate-800 px-1.5 py-0.5 text-xs">
            cd contracts &amp;&amp; npm run deploy:registry:sepolia &amp;&amp; npm run sync:registry:sepolia
          </code>
        </Alert>
      )}

      {/* Wallet gate */}
      {!wallet.isConnected ? (
        <Card className="mx-auto max-w-lg text-center">
          <span className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-brand-500/10 text-brand-300 ring-1 ring-brand-500/25">
            <Wallet className="h-6 w-6" />
          </span>
          <h3 className="mt-4 font-display text-xl font-bold text-slate-100">Connect your college wallet</h3>
          <p className="mx-auto mt-2 max-w-sm text-sm text-slate-400">
            Issuing certificates writes to the blockchain, so it needs a whitelisted wallet. Use the
            <b className="text-slate-200"> Connect Wallet</b> button in the top bar.
          </p>
          {wallet.error && (
            <div className="mt-4">
              <Alert tone="error">{wallet.error}</Alert>
            </div>
          )}
          <div className="mt-5 grid gap-2 text-left text-sm text-slate-400">
            <p className="flex items-start gap-2">
              <BadgeCheck className="mt-0.5 h-4 w-4 shrink-0 text-brand-400" />
              Only whitelisted issuer wallets can write — the platform owner manages the list.
            </p>
            <p className="flex items-start gap-2">
              <Blocks className="mt-0.5 h-4 w-4 shrink-0 text-brand-400" />
              Student identifiers are hashed in your browser before they ever touch the chain.
            </p>
          </div>
        </Card>
      ) : (
        <>
          {/* Stats */}
          <div className="stagger grid grid-cols-3 gap-3">
            {[
              { icon: ScrollText, label: "Issued by you", value: recent.length },
              { icon: BadgeCheck, label: "Active", value: activeCount },
              { icon: Ban, label: "Revoked", value: revokedCount },
            ].map((s) => (
              <Card key={s.label} className="!p-4 sm:!p-5">
                <s.icon className="h-4 w-4 text-brand-400" />
                {loadingRecent && recent.length === 0 ? (
                  <Skeleton className="mt-2 h-7 w-10" />
                ) : (
                  <p className="mt-1.5 font-display text-2xl font-bold text-slate-50">{s.value}</p>
                )}
                <p className="text-xs text-slate-500">{s.label}</p>
              </Card>
            ))}
          </div>

          <div className="grid gap-6 lg:grid-cols-5">
            {/* Form + issued list */}
            <div className="space-y-6 lg:col-span-3">
              <Card>
                <div className="mb-5 flex items-center gap-3">
                  <span className="grid h-10 w-10 place-items-center rounded-xl bg-brand-500/10 text-brand-300 ring-1 ring-brand-500/25">
                    <FilePlus2 className="h-5 w-5" />
                  </span>
                  <div>
                    <h3 className="font-display font-bold text-slate-100">Issue a certificate</h3>
                    <p className="text-xs text-slate-500">One transaction, permanent on-chain record</p>
                  </div>
                </div>
                <IssueForm onIssued={handleIssued} />
              </Card>

              <Card>
                <div className="mb-4 flex items-center justify-between">
                  <h3 className="font-display font-bold text-slate-100">Issued by this wallet</h3>
                  <Button variant="ghost" onClick={refreshRecent} loading={loadingRecent} className="!px-3">
                    {!loadingRecent && <RefreshCw className="h-3.5 w-3.5" />} Refresh
                  </Button>
                </div>
                {recentError && <Alert tone="error">{recentError}</Alert>}
                {!recentError && !loadingRecent && recent.length === 0 && (
                  <EmptyState
                    compact
                    icon={ScrollText}
                    title="Nothing issued yet"
                  >
                    Certificates issued by this wallet appear here, read back from on-chain events.
                  </EmptyState>
                )}
                {loadingRecent && recent.length === 0 && (
                  <div className="space-y-2 py-2">
                    {[0, 1, 2].map((i) => (
                      <Skeleton key={i} className="h-12 w-full" />
                    ))}
                  </div>
                )}
                <ul className="divide-y divide-slate-800/70">
                  {recent.map((item) => {
                    const revocation = revoked.get(item.certId);
                    return (
                      <li key={`${item.txHash}-${item.certId}`} className="flex items-center justify-between gap-3 py-3">
                        <div className="min-w-0">
                          <p className="flex items-center gap-2 truncate font-mono text-sm font-semibold text-slate-100">
                            <Link className="hover:text-brand-300" to={`/certificate/${encodeURIComponent(item.certId)}`}>
                              {item.certId}
                            </Link>
                            {revocation && (
                              <Badge tone="REVOKED" className="!px-1.5 !py-0.5 !text-[10px]" title={revocation.reason}>
                                revoked
                              </Badge>
                            )}
                          </p>
                          <p className="truncate text-xs text-slate-500">
                            {item.studentLabel ? `${item.studentLabel} · ` : ""}
                            {item.course ? `${item.course} · ` : ""}
                            {new Date(Number(item.issueDate) * 1000).toLocaleDateString()}
                            {item.blockNumber ? ` · block #${item.blockNumber}` : ""}
                            {item.pendingLocal ? " · local record" : ""}
                          </p>
                        </div>
                        <div className="flex shrink-0 items-center gap-2">
                          <Link
                            className="text-slate-400 transition-colors hover:text-brand-300"
                            to={`/certificate/${encodeURIComponent(item.certId)}`}
                            title="View certificate details"
                          >
                            <Fingerprint className="h-4 w-4" />
                          </Link>
                          {wallet.onSepolia && (
                            <a
                              className="inline-flex items-center gap-0.5 text-xs text-brand-300 hover:underline"
                              href={`${SEPOLIA.explorer}/tx/${item.txHash}`}
                              target="_blank"
                              rel="noreferrer"
                            >
                              tx <ArrowUpRight className="h-3 w-3" />
                            </a>
                          )}
                          {!revocation && (
                            <Button
                              variant="danger"
                              className="!px-2.5 !py-1.5 text-xs"
                              loading={revokingId === item.certId}
                              onClick={() => handleRevoke(item.certId)}
                            >
                              Revoke
                            </Button>
                          )}
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </Card>
            </div>

            {/* Side column */}
            <div className="space-y-6 lg:col-span-2">
              {issued ? (
                <Card className="animate-fade-up">
                  <h3 className="mb-1 text-center font-display font-bold text-slate-100">Shareable QR</h3>
                  <p className="mb-4 text-center text-xs text-slate-500">
                    Print it on the certificate — scanning opens the public verify page.
                  </p>
                  <QRDisplay url={verifyUrl(issued.certId)} fileName={`${issued.certId}-qr.png`} />
                </Card>
              ) : (
                <Card>
                  <EmptyState compact icon={QrCode} title="QR appears after issuing">
                    Issue a certificate and its printable verification QR shows up here.
                  </EmptyState>
                </Card>
              )}

              {isOwner && (
                <Card>
                  <h3 className="flex items-center gap-2 font-display font-bold text-slate-100">
                    <ShieldCheck className="h-4 w-4 text-brand-400" /> Owner · issuer whitelist
                  </h3>
                  <p className="mt-1 text-xs text-slate-500">
                    You are the registry owner. Add college wallets for{" "}
                    <b className="text-slate-300">{defaultInstitution().name || "your institution"}</b>.
                  </p>
                  <form onSubmit={handleAddIssuer} className="mt-4 space-y-3">
                    <Input
                      value={newIssuer}
                      onChange={(e) => setNewIssuer(e.target.value)}
                      placeholder="0x…college wallet address"
                    />
                    <Button type="submit" loading={adminBusy} className="w-full">
                      Add issuer
                    </Button>
                  </form>
                  {adminMsg && (
                    <div className="mt-3">
                      <Alert tone={adminMsg.tone}>{adminMsg.text}</Alert>
                    </div>
                  )}
                </Card>
              )}

              <Card>
                <h3 className="flex items-center gap-2 font-display font-bold text-slate-100">
                  <Droplets className="h-4 w-4 text-brand-400" /> Getting test ETH
                </h3>
                <p className="mt-1 text-sm text-slate-400">
                  Issuing costs a tiny amount of testnet ETH (free). Claim from a public faucet:
                </p>
                <ul className="mt-3 space-y-1.5 text-sm">
                  <li>
                    <a className="text-brand-300 hover:underline" href={SEPOLIA.faucetHint} target="_blank" rel="noreferrer">
                      Google Cloud Web3 faucet ↗
                    </a>
                  </li>
                  <li>
                    <a
                      className="text-brand-300 hover:underline"
                      href="https://www.alchemy.com/faucets/ethereum-sepolia"
                      target="_blank"
                      rel="noreferrer"
                    >
                      Alchemy faucet ↗
                    </a>
                  </li>
                  <li>
                    <a
                      className="text-brand-300 hover:underline"
                      href="https://sepolia-faucet.pk910.de/"
                      target="_blank"
                      rel="noreferrer"
                    >
                      PoW faucet (no balance needed) ↗
                    </a>
                  </li>
                </ul>
              </Card>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
