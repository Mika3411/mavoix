import React, { useEffect, useState } from "react";

export default function InstallButton(props: any) {
  const { styles } = props;
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [showHelp, setShowHelp] = useState(false);

  useEffect(() => {
    const handleBeforeInstallPrompt = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };

    const handleAppInstalled = () => {
      setIsInstalled(true);
      setDeferredPrompt(null);
    };

    const isStandalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      window.navigator.standalone === true;

    if (isStandalone) {
      setIsInstalled(true);
    }

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    window.addEventListener("appinstalled", handleAppInstalled);

    return () => {
      window.removeEventListener(
        "beforeinstallprompt",
        handleBeforeInstallPrompt
      );
      window.removeEventListener("appinstalled", handleAppInstalled);
    };
  }, []);

  async function handleInstall() {
    if (!deferredPrompt) {
      setShowHelp(true);
      return;
    }

    deferredPrompt.prompt();
    await deferredPrompt.userChoice;
    setDeferredPrompt(null);
  }

  if (isInstalled) {
    return null;
  }

  return (
    <div
      style={{
        ...styles.card,
        display: "flex",
        flexDirection: "column",
        gap: 8,
        marginBottom: 14,
        padding: 14,
        borderRadius: 18,
        border: "2px solid rgba(59,130,246,0.35)",
      }}
    >
      <h2 style={{ ...styles.sectionTitle, fontSize: 20, marginBottom: 8, lineHeight: 1.25 }}>Installer l’application</h2>

      <p style={{ ...styles.subtitle, fontSize: 16, marginTop: 0 }}>
        Installez Ma Voix sur cet appareil pour l’ouvrir plus facilement.
      </p>

      <div style={styles.inlineButtons}>
        <button
          onClick={handleInstall}
          style={{
            ...styles.primaryButton,
            fontSize: 17,
            minHeight: 50,
            borderRadius: 16,
            padding: "10px 14px",
            lineHeight: 1.3,
          }}
        >
          📲 Installer l’application
        </button>

        <button
          onClick={() => setShowHelp((prev) => !prev)}
          style={{ ...styles.secondaryButton, fontSize: 17, minHeight: 50, borderRadius: 16, padding: "10px 14px", lineHeight: 1.3 }}
        >
          Aide
        </button>
      </div>

      {showHelp ? (
        <div style={styles.readOnlyBox}>
          <strong>Si le bouton ne lance pas l’installation :</strong>
          <br />
          - Sur ordinateur : cliquez sur l’icône d’installation dans la barre du
          navigateur.
          <br />
          - Sur iPhone / iPad : touchez Partager puis “Sur l’écran d’accueil”.
          <br />- Sur Android : ouvrez le menu du navigateur puis “Installer
          l’application”.
        </div>
      ) : null}
    </div>
  );
}
