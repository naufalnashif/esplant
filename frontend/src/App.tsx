import { Routes, Route } from "react-router-dom";
import Home from "@/pages/Home";
import { StorageProvider } from "@/lib/storageContext";

// One <Route> per page in src/pages; BrowserRouter already wraps this in main.tsx.
export default function App() {
  return (
    <StorageProvider>
      <Routes>
        <Route path="/" element={<Home />} />
      </Routes>
    </StorageProvider>
  );
}
