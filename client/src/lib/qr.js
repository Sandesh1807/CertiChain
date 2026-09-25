/**
 * Public verification URLs and QR payload parsing.
 *
 * QR codes always encode a PATH-STYLE public URL (`…/#/verify/<certificateId>`)
 * — never query strings, never hashes, keys or personal data. The certificate
 * ID alone is public by design (it is the chain's lookup key); everything
 * private (student identity, commits, wallet keys) stays off the QR payload.
 */

/** Public verification URL for a certificate ID (exactly what QR codes encode). */
export function verifyUrl(certId) {
  const base = `${window.location.origin}${window.location.pathname}`;
  return `${base}#/verify/${encodeURIComponent(String(certId || "").trim())}`;
}

/**
 * Read a certificate ID out of a scanned QR payload. Accepts the path-style
 * verify URL (our own QRs), the legacy `?cert=` deep link, and bare IDs.
 */
export function certIdFromScan(text) {
  const raw = String(text || "").trim();
  if (!raw) return "";
  // Bare ID — nothing to parse.
  if (!raw.includes("/") && !raw.includes("#")) return raw;
  try {
    const url = new URL(raw);
    const m = (url.hash || "").match(/\/verify\/([^?&]+)/);
    if (m) return decodeURIComponent(m[1]);
    const q = url.searchParams.get("cert");
    if (q) return q.trim();
    const qm = (url.hash || "").match(/cert=([^&]+)/);
    if (qm) return decodeURIComponent(qm[1]);
  } catch {
    /* not an absolute URL — fall through */
  }
  // Relative payload like "/verify/CERT-2026-0001".
  const rel = raw.match(/\/verify\/([^/?&#]+)/);
  if (rel) return decodeURIComponent(rel[1]);
  return raw;
}
