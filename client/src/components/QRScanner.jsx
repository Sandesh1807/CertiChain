import { useEffect, useRef, useState } from "react";
import { Html5Qrcode } from "html5-qrcode";
import { Camera, CameraOff } from "lucide-react";

/**
 * Camera QR scanner built on html5-qrcode.
 * Props:
 *   onScan(text)  — called with the decoded string.
 *   onError(msg)  — camera/permission problems.
 * The scanner is started/stopped via the visible button; it also stops
 * automatically when the component unmounts.
 */
export default function QRScanner({ onScan, onError }) {
  const scannerRef = useRef(null);
  const [scanning, setScanning] = useState(false);

  useEffect(() => {
    return () => {
      stopScanner();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function stopScanner() {
    const scanner = scannerRef.current;
    if (scanner) {
      try {
        const state = scanner.getState?.();
        if (state === 2 /* SCANNING */) await scanner.stop();
      } catch {
        /* already stopped */
      }
      scanner.clear();
      scannerRef.current = null;
    }
    setScanning(false);
  }

  async function startScanner() {
    try {
      const scanner = new Html5Qrcode("qr-reader-region", {
        verbose: false,
        formatsToSupport: undefined,
      });
      scannerRef.current = scanner;
      setScanning(true);
      await scanner.start(
        { facingMode: "environment" },
        { fps: 10, qrbox: { width: 240, height: 240 } },
        async (decodedText) => {
          await stopScanner();
          onScan(decodedText);
        },
        () => {
          /* per-frame decode misses; ignore */
        }
      );
    } catch (err) {
      await stopScanner();
      const msg = String(err?.message || err || "");
      onError(
        /permission|NotAllowed/i.test(msg)
          ? "Camera permission denied. You can paste the QR link or type the certificate ID instead."
          : `Camera unavailable: ${msg}`
      );
    }
  }

  return (
    <div>
      <div
        id="qr-reader-region"
        className={`mx-auto overflow-hidden rounded-xl border border-slate-700 bg-slate-950 ${
          scanning ? "block w-full max-w-sm" : "hidden"
        }`}
      />
      {!scanning && (
        <div className="mx-auto grid h-40 w-full max-w-sm place-items-center rounded-xl border border-dashed border-slate-700/80 bg-slate-950/50 dot-grid">
          <Camera className="h-8 w-8 text-slate-600" />
        </div>
      )}
      <div className="mt-3 flex justify-center">
        {scanning ? (
          <button
            type="button"
            onClick={stopScanner}
            className="inline-flex items-center gap-2 rounded-xl bg-slate-800 px-4 py-2.5 text-sm font-semibold text-slate-100 transition hover:bg-slate-700"
          >
            <CameraOff className="h-4 w-4" /> Stop camera
          </button>
        ) : (
          <button
            type="button"
            onClick={startScanner}
            className="inline-flex items-center gap-2 rounded-xl bg-slate-800 px-4 py-2.5 text-sm font-semibold text-slate-100 transition hover:bg-slate-700"
          >
            <Camera className="h-4 w-4" /> Scan QR with camera
          </button>
        )}
      </div>
      <p className="mt-2 text-center text-xs text-slate-500">
        Camera needs permission and a secure (https / localhost) page.
      </p>
    </div>
  );
}
