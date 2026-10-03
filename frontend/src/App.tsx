import { Suspense, lazy, useEffect } from "react";
import { Routes, Route, Navigate, useNavigate, Link, useSearchParams } from "react-router-dom";
import { Toaster } from "sonner";
import { StorageProvider, useStorage, readIsDemoModeSync } from "@/lib/storageContext";
import { LandingPreview } from "@/components/LandingPreview";
import { BrandMark } from "@/components/BrandMark";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { Button } from "@/components/ui/button";
import { PwaInstallPrompt } from "@/components/mobile/PwaInstallPrompt";

// Route-based code splitting: heavy screens are only fetched when their path is hit.
const Home = lazy(() => import("@/pages/Home"));
const Docs = lazy(() => import("@/pages/Docs"));
const Faq = lazy(() => import("@/pages/Faq"));
const Terms = lazy(() => import("@/pages/Terms"));
const Privacy = lazy(() => import("@/pages/Privacy"));
const Changelog = lazy(() => import("@/pages/Changelog"));

function DashboardLoader() {
  return (
    <div className="grid min-h-svh place-items-center bg-background" data-testid="dashboard-loader">
      <div className="flex flex-col items-center gap-3">
        <span className="size-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        <p className="font-data text-xs text-muted-foreground">memuat workspace…</p>
      </div>
    </div>
  );
}

// /dashboard/* — gated on an onboarded workspace; otherwise send to the connect flow.
// Also accepts isDemoMode (read synchronously from localStorage) as a bypass so that
// EnterDemo's navigate("/dashboard") never sees a stale null profile.
function DashboardGate() {
  const { profile } = useStorage();
  // readIsDemoModeSync() reads localStorage directly — always in sync with enterDemoMode()
  // even if the React context render cycle hasn't finished yet.
  if (!profile?.onboarded && !readIsDemoModeSync()) return <Navigate to="/" replace />;
  return (
    <ErrorBoundary>
      <Suspense fallback={<DashboardLoader />}>
        <Home />
      </Suspense>
    </ErrorBoundary>
  );
}

// /demo — switch context to isolated sandbox demo, then straight to the dashboard.
// enterDemoMode() writes to localStorage synchronously (via setProfile → localStorage.setItem),
// so by the time navigate("/dashboard") fires, readIsDemoModeSync() in DashboardGate
// will already return true — no race condition.
function EnterDemo() {
  const { enterDemoMode } = useStorage();
  const navigate = useNavigate();
  useEffect(() => {
    enterDemoMode();
    navigate("/dashboard", { replace: true });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  return <DashboardLoader />;
}

function DocPage({ children }: { children: React.ReactNode }) {
  return <Suspense fallback={<DashboardLoader />}>{children}</Suspense>;
}

function NotFound() {
  return (
    <div className="grid min-h-svh place-items-center bg-background px-6 text-center" data-testid="not-found-page">
      <div className="flex flex-col items-center gap-5">
        <BrandMark size="lg" showTagline />
        <p className="font-data text-5xl font-extrabold text-primary">404</p>
        <p className="max-w-sm text-sm text-muted-foreground">Halaman yang Anda cari tidak ditemukan.</p>
        <Link to="/"><Button data-testid="not-found-home-button" className="gap-2">Kembali ke beranda</Button></Link>
      </div>
    </div>
  );
}

// "/" — if the user has already onboarded, skip landing and go to dashboard unless ?preview=true is specified.
function LandingGate() {
  const { profile } = useStorage();
  const [searchParams] = useSearchParams();
  if (profile?.onboarded && searchParams.get("preview") !== "true") {
    return <Navigate to="/dashboard" replace />;
  }
  return <LandingPreview />;
}

export default function App() {
  return (
    <StorageProvider>
      <Routes>
        <Route path="/" element={<LandingGate />} />
        <Route path="/landing" element={<LandingPreview />} />
        <Route path="/welcome" element={<LandingPreview />} />
        <Route path="/connect" element={<LandingPreview autoConnect />} />
        <Route path="/demo" element={<EnterDemo />} />
        <Route path="/dashboard/*" element={<DashboardGate />} />
        <Route path="/docs" element={<DocPage><Docs /></DocPage>} />
        <Route path="/faq" element={<DocPage><Faq /></DocPage>} />
        <Route path="/terms" element={<DocPage><Terms /></DocPage>} />
        <Route path="/privacy" element={<DocPage><Privacy /></DocPage>} />
        <Route path="/changelog" element={<DocPage><Changelog /></DocPage>} />
        <Route path="*" element={<NotFound />} />
      </Routes>
      <Toaster position="top-center" theme="dark" richColors closeButton />
      <PwaInstallPrompt />
    </StorageProvider>
  );
}
