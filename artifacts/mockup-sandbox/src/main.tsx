import { createRoot } from "react-dom/client";
import { Toaster } from "sonner";
import App from "./App";
import { AuthProvider } from "./auth/AuthContext";
import "./index.css";

createRoot(document.getElementById("root")!).render(
  <AuthProvider>
    <App />
    <Toaster
      position="top-center"
      dir="rtl"
      toastOptions={{
        style: { fontFamily: "'IBM Plex Sans Arabic', system-ui, sans-serif" },
      }}
    />
  </AuthProvider>,
);
