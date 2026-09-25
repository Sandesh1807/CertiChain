import { useEffect, useState } from "react";
import QRCode from "qrcode";
import { Copy, Check, Download, Printer } from "lucide-react";

/**
 * Renders a QR code for `url` with download / print / copy actions.
 * Pure client-side (qrcode npm package) — no external API.
 */
export default function QRDisplay({ url, fileName = "certificate-qr.png" }) {
  const [dataUrl, setDataUrl] = useState("");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    let cancelled = false;
    QRCode.toDataURL(url, {
      width: 512,
      margin: 2,
      errorCorrectionLevel: "M",
      color: { dark: "#0f172a", light: "#ffffff" },
    })
      .then((u) => {
        if (!cancelled) setDataUrl(u);
      })
      .catch(() => setDataUrl(""));
    return () => {
      cancelled = true;
    };
  }, [url]);

  function printQr() {
    const win = window.open("", "_blank", "width=480,height=640");
    if (!win) return;
    win.document.write(
      `<html><head><title>CertiChain QR</title></head>
       <body style="font-family:system-ui;text-align:center;padding:24px">
         <h2 style="margin:0 0 4px">Scan to verify this certificate</h2>
         <p style="color:#475569;margin:0 0 16px;font-size:13px">CertiChain · on-chain verification</p>
         <img src="${dataUrl}" width="320" height="320" />
         <p style="font-family:monospace;font-size:12px;color:#334155">${url}</p>
       </body></html>`
    );
    win.document.close();
    win.focus();
    win.print();
  }

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* clipboard unavailable */
    }
  }

  return (
    <div className="flex flex-col items-center gap-3">
      {dataUrl ? (
        <img
          src={dataUrl}
          alt="Certificate verification QR code"
          className="animate-scale-in h-44 w-44 rounded-xl bg-white p-2 shadow-lg shadow-black/30"
        />
      ) : (
        <div className="skeleton h-44 w-44" aria-hidden="true" />
      )}
      <div className="flex flex-wrap justify-center gap-2 text-xs">
        <a
          href={dataUrl || "#"}
          download={fileName}
          className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-2 font-semibold transition ${
            dataUrl
              ? "bg-slate-800 text-slate-100 hover:bg-slate-700"
              : "pointer-events-none opacity-50 bg-slate-800 text-slate-100"
          }`}
        >
          <Download className="h-3.5 w-3.5" /> PNG
        </a>
        <button
          type="button"
          onClick={printQr}
          disabled={!dataUrl}
          className="inline-flex items-center gap-1.5 rounded-lg bg-slate-800 px-3 py-2 font-semibold text-slate-100 transition hover:bg-slate-700 disabled:opacity-50"
        >
          <Printer className="h-3.5 w-3.5" /> Print
        </button>
        <button
          type="button"
          onClick={copyLink}
          className="inline-flex items-center gap-1.5 rounded-lg bg-slate-800 px-3 py-2 font-semibold text-slate-100 transition hover:bg-slate-700"
        >
          {copied ? <Check className="h-3.5 w-3.5 text-brand-400" /> : <Copy className="h-3.5 w-3.5" />}
          {copied ? "Copied" : "Copy link"}
        </button>
      </div>
    </div>
  );
}
