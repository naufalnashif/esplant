import { Suspense, lazy } from "react";
import { Routes, Route } from "react-router-dom";
import { Toaster } from "sonner";
import { StorageProvider, useStorage } from "@/lib/storageContext";
import { LandingPreview } from "@/components/LandingPreview";

// The dashboard (charts, panels, IndexedDB layer) is only fetched once a
// workspace exists, so first paint for new visitors stays light.
const Home = lazy(() => import("@/pages/Home"));

function DashboardLoader() {
  return (
    <div className="grid min-h-svh place-items-center bg-background" data-testid="dashboard-loader">
      <div className="flex flex-col items-center gap-3">
        <span className="size-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        <p className="font-data text-xs text-muted-foreground">memuat workspace…</p>      </div>
    </div>
  );
}

function Workspace() {
  const { profile } = useStorage();
  if (!profile?.onboarded) return <LandingPreview />;
  return (
    <Suspense fallback={<DashboardLoader />}>
      <Home />
    </Suspense>
  );
}

export default function App() {
  return (
    <StorageProvider>
      <Routes>
        <Route path="/" element={<Workspace />} />
        <Route path="*" element={<Workspace />} />
      </Routes>
      <Toaster position="top-center" theme="dark" richColors closeButton />
    </StorageProvider>
  );
}
