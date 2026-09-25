import { useEffect } from "react";
import { HashRouter, Link, Navigate, Route, Routes, useLocation } from "react-router-dom";
import { Compass } from "lucide-react";
import Navbar from "./components/Navbar";
import Footer from "./components/Footer";
import WrongNetworkBanner from "./components/WrongNetworkBanner";
import { WalletProvider } from "./context/WalletContext";
import Home from "./pages/Home";
import Verify from "./pages/Verify";
import Dashboard from "./pages/Dashboard";
import CertificateDetails from "./pages/CertificateDetails";

/** Reset scroll on route change (smooth CSS scrolling stays for in-page anchors). */
function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: "instant" });
  }, [pathname]);
  return null;
}

function NotFound() {
  return (
    <div className="py-24 text-center">
      <span className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-slate-800/80 text-slate-400 ring-1 ring-slate-700/60">
        <Compass className="h-6 w-6" />
      </span>
      <h1 className="mt-4 font-display text-2xl font-bold text-slate-100">Page not found</h1>
      <p className="mt-2 text-sm text-slate-500">The page you're looking for doesn't exist.</p>
      <Link
        to="/"
        className="mt-6 inline-flex items-center gap-2 rounded-xl bg-brand-500 px-5 py-2.5 text-sm font-bold text-slate-950 shadow-lg shadow-brand-500/25 transition hover:bg-brand-400"
      >
        ← Back home
      </Link>
    </div>
  );
}

export default function App() {
  return (
    <WalletProvider>
      <HashRouter>
        <ScrollToTop />
        <div className="flex min-h-screen flex-col">
          <Navbar />
          <div className="mx-auto w-full max-w-6xl px-4">
            <WrongNetworkBanner />
          </div>
          <main className="mx-auto w-full max-w-6xl flex-1 px-4 pb-10 pt-6">
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/verify" element={<Verify />} />
              <Route path="/verify/:certId" element={<Verify />} />
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/certificate/:certId" element={<CertificateDetails />} />
              <Route path="/index.html" element={<Navigate to="/" replace />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </main>
          <Footer />
        </div>
      </HashRouter>
    </WalletProvider>
  );
}
