import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import { installDismissKeyboardOnOutsideTap } from "./utils/dismissKeyboard";

const rootElement = document.getElementById("root");
if (!rootElement) {
  throw new Error('Root element "#root" introuvable.');
}

const root = ReactDOM.createRoot(rootElement);
installDismissKeyboardOnOutsideTap();
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

const isDesktopApp = window.maVoixDesktopApp?.isDesktopApp === true;

if (import.meta.env.PROD && !isDesktopApp && "serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register(`${import.meta.env.BASE_URL}sw.js`).catch((error) => {
      console.warn("Impossible d'enregistrer le service worker :", error);
    });
  });
}
