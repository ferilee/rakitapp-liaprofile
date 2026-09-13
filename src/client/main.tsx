import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./styles.css";
import { App } from "./App";

if ("serviceWorker" in navigator && import.meta.env.PROD) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/sw.js").catch((error) => {
      console.warn("PWA service worker gagal didaftarkan", error);
    });
  });
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
