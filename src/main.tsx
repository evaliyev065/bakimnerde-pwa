import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { App } from "./app/App";
import { PreferencesProvider } from "./app/PreferencesContext";
import { FieldAuthProvider } from "./auth/FieldAuthContext";
import "./styles/global.css";

createRoot(document.getElementById("root")!).render(<StrictMode><BrowserRouter><PreferencesProvider><FieldAuthProvider><App /></FieldAuthProvider></PreferencesProvider></BrowserRouter></StrictMode>);

if ("serviceWorker" in navigator && import.meta.env.PROD) {
  window.addEventListener("load", () => void navigator.serviceWorker.register("/sw.js"));
}
