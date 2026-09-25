import QRCode from "qrcode";

/**
 * Renders the printable certificate as a PNG via an OffscreenCanvas — no new
 * dependencies (the `qrcode` package was already in the bundle for QRDisplay).
 * The canvas drawing mirrors index.css colors (slate-950 / brand-400).
 */

const qrDataUrl = (text) =>
  QRCode.toDataURL(text, {
    width: 640,
    margin: 2,
    errorCorrectionLevel: "M",
    color: { dark: "#0f172a", light: "#ffffff" },
  });

const loadImage = (src) =>
  new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("QR image failed to load"));
    img.src = src;
  });

function rr(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

const truncate = (s, n) => (String(s).length > n ? `${String(s).slice(0, n - 1)}…` : String(s));

/**
 * Draw the certificate share card. Kept intentionally simple and
 * dependency-free — a wide 16:9-ish landscape PNG that prints cleanly.
 */
export async function renderCertificateCard({ certId, title, student, course, institution, issueDate, status, verifyLink, txHash, network }) {
  const W = 1600;
  const H = 1000;
  const qr = await loadImage(await qrDataUrl(verifyLink));

  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d");

  // Background
  ctx.fillStyle = "#020617";
  ctx.fillRect(0, 0, W, H);

  // Border
  ctx.strokeStyle = "#1e293b";
  ctx.lineWidth = 3;
  rr(ctx, 40, 40, W - 80, H - 80, 28);
  ctx.stroke();

  // Header kicker
  ctx.fillStyle = "#34d399";
  ctx.font = "600 26px system-ui, sans-serif";
  ctx.textBaseline = "alphabetic";
  ctx.fillText("C E R T I C H A I N  ·  B L O C K C H A I N  C E R T I F I C A T E", 120, 150);

  // Title
  ctx.fillStyle = "#f1f5f9";
  ctx.font = "700 76px Georgia, 'Times New Roman', serif";
  ctx.fillText(truncate(title || "Certificate", 34), 120, 260);

  // Verdict chip
  const chipText = status === "REVOKED" ? "REVOKED" : "VERIFIED ON-CHAIN";
  ctx.font = "700 30px system-ui, sans-serif";
  const chipW = ctx.measureText(chipText).width + 48;
  ctx.fillStyle = status === "REVOKED" ? "rgba(239,68,68,0.18)" : "rgba(52,211,153,0.14)";
  rr(ctx, 120, 300, chipW, 56, 28);
  ctx.fill();
  ctx.fillStyle = status === "REVOKED" ? "#f87171" : "#34d399";
  ctx.fillText(chipText, 144, 339);

  // Body fields
  const lines = [
    ["Awarded to", student || "Student identity committed on-chain"],
    ["Course", course || "Course content committed on-chain"],
    ["Institution", institution || "—"],
    ["Issue date", issueDate || "—"],
  ];
  let y = 470;
  for (const [label, value] of lines) {
    ctx.fillStyle = "#64748b";
    ctx.font = "600 26px system-ui, sans-serif";
    ctx.fillText(label.toUpperCase(), 120, y);
    ctx.fillStyle = "#e2e8f0";
    ctx.font = "500 40px system-ui, sans-serif";
    ctx.fillText(truncate(value, 48), 120, y + 52);
    y += 118;
  }

  // Footer: cert ID + network + tx
  ctx.fillStyle = "#475569";
  ctx.font = "500 26px ui-monospace, monospace";
  ctx.fillText(truncate(`ID ${certId}`, 44), 120, 930);
  if (txHash) ctx.fillText(truncate(`tx ${txHash}`, 52), 620, 930);
  ctx.fillText(truncate(network || "", 28), 1210, 930);

  // QR block (right)
  const qx = W - 460;
  ctx.fillStyle = "#ffffff";
  rr(ctx, qx - 30, 440, 400, 400, 24);
  ctx.fill();
  ctx.drawImage(qr, qx, 470, 340, 340);
  ctx.fillStyle = "#64748b";
  ctx.font = "600 24px system-ui, sans-serif";
  ctx.fillText("SCAN TO VERIFY", qx + 62, 800);

  return canvas.toDataURL("image/png");
}

/** Trigger a browser download for a data URL. */
export function downloadDataUrl(dataUrl, fileName) {
  const a = document.createElement("a");
  a.href = dataUrl;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  a.remove();
}
