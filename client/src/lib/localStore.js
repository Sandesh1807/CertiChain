/**
 * Local (browser-only) certificate records for the MVP.
 *
 * The chain stores only hashes; these records keep the issuer's own copy of
 * what each certificate ID means (student label, course, tx hash) so the
 * dashboard can display it. Stored in localStorage, keyed per chain+wallet.
 * This is convenience data — the blockchain record is always the source of
 * truth and verification never reads this store.
 */

const key = (chainId, address) =>
  `certichain:issued:${Number(chainId)}:${String(address || "").toLowerCase()}`;

export function loadLocalRecords(chainId, address) {
  if (!chainId || !address) return [];
  try {
    const raw = localStorage.getItem(key(chainId, address));
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

/** Merge-save one issued certificate (idempotent per certId). */
export function saveLocalRecord(chainId, address, record) {
  if (!chainId || !address || !record?.certId) return;
  try {
    const records = loadLocalRecords(chainId, address).filter(
      (r) => r.certId !== record.certId
    );
    records.unshift(record);
    localStorage.setItem(key(chainId, address), JSON.stringify(records.slice(0, 100)));
  } catch {
    /* storage full / private mode — non-fatal */
  }
}

/** True if this browser previously issued this ID on this chain+wallet. */
export function hasLocalRecord(chainId, address, certId) {
  return loadLocalRecords(chainId, address).some((r) => r.certId === certId);
}

/**
 * Cross-wallet lookup for verification: scans every `certichain:issued:*`
 * wallet key for a record of this chain+certId and returns the first match
 * (records are immutable facts of an issuance, so any wallet's copy serves).
 * The verify page uses this to surface the plaintext student/course label —
 * it must still be displayed as "locally stored", never as chain data.
 */
export function findLocalRecordAnyWallet(chainId, certId) {
  try {
    const suffix = `:${Number(chainId)}:`;
    const wanted = String(certId || "");
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (!k || !k.startsWith("certichain:issued:") || !k.includes(suffix)) continue;
      const records = JSON.parse(localStorage.getItem(k) || "[]");
      if (!Array.isArray(records)) continue;
      const hit = records.find((r) => r?.certId === wanted);
      if (hit) return hit;
    }
  } catch {
    /* storage unavailable — fall through */
  }
  return null;
}

/** Cache of every certId this wallet has issued on this chain (for generators). */
export function loadKnownIds(chainId) {
  try {
    const raw = localStorage.getItem(`certichain:knownIds:${Number(chainId)}`);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? new Set(parsed) : new Set();
  } catch {
    return new Set();
  }
}

export function rememberKnownId(chainId, certId) {
  try {
    const ids = loadKnownIds(chainId);
    ids.add(certId);
    localStorage.setItem(
      `certichain:knownIds:${Number(chainId)}`,
      JSON.stringify([...ids].slice(-500))
    );
  } catch {
    /* non-fatal */
  }
}
