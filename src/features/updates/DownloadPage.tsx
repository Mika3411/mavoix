import InstallButton from "../../ui/buttons/InstallButton";
import type { StyleMap } from "../../shared/types";
import type { DownloadDevice } from "./downloadDevice";

const APK_DOWNLOAD_URL = "/ma-voix.apk";
const AIDANT_APK_DOWNLOAD_URL = "/ma-voix-aidant.apk";

type DownloadPageProps = {
  styles: StyleMap;
  activeTheme: Record<string, string>;
  downloadDevice: DownloadDevice;
};

export default function DownloadPage({
  styles,
  activeTheme,
  downloadDevice,
}: DownloadPageProps) {
  return (
    <div
      style={{
        padding: 20,
        display: "flex",
        flexDirection: "column",
        gap: 20,
      }}
    >
      <div
        style={{
          background:
            "linear-gradient(135deg, rgba(37,99,235,0.22), rgba(15,23,42,0.88))",
          border: "1px solid rgba(255,255,255,0.1)",
          borderRadius: 28,
          padding: 28,
          boxShadow: "0 18px 45px rgba(0,0,0,0.22)",
          overflow: "hidden",
          position: "relative",
        }}
      >
        <div
          style={{
            position: "absolute",
            top: -40,
            right: -10,
            fontSize: 120,
            opacity: 0.08,
            pointerEvents: "none",
          }}
        >
          ⬇️
        </div>

        <div
          style={{
            fontSize: 14,
            fontWeight: 700,
            letterSpacing: 1.2,
            opacity: 0.75,
            textTransform: "uppercase",
            marginBottom: 10,
          }}
        >
          Centre de téléchargement
        </div>
        <div style={{ fontSize: 32, fontWeight: 800, marginBottom: 10, lineHeight: 1.15 }}>
          Installe Ma Voix sur le bon appareil
        </div>
        <div style={{ fontSize: 18, opacity: 0.9, lineHeight: 1.6, maxWidth: 820 }}>
          Choisis la version adaptée à ton appareil. Sur ordinateur, tu peux installer
          l'application depuis le navigateur. Sur Android, tu peux télécharger
          l'application pour smartphone ou tablette.
        </div>

        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: 10,
            marginTop: 18,
          }}
        >
          <div
            style={{
              padding: "8px 14px",
              borderRadius: 999,
              background:
                downloadDevice === "desktop"
                  ? "rgba(34,197,94,0.18)"
                  : "rgba(255,255,255,0.08)",
              border: "1px solid rgba(255,255,255,0.08)",
              fontSize: 14,
              fontWeight: 600,
            }}
          >
            {downloadDevice === "desktop"
              ? "✅ Appareil détecté : PC"
              : "💻 Version PC disponible"}
          </div>
          <div
            style={{
              padding: "8px 14px",
              borderRadius: 999,
              background:
                downloadDevice === "android"
                  ? "rgba(34,197,94,0.18)"
                  : "rgba(255,255,255,0.08)",
              border: "1px solid rgba(255,255,255,0.08)",
              fontSize: 14,
              fontWeight: 600,
            }}
          >
            {downloadDevice === "android"
              ? "✅ Appareil détecté : Android"
              : "📱 Version Android disponible"}
          </div>
        </div>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
          gap: 20,
          alignItems: "stretch",
        }}
      >
        <div
          style={{
            background: activeTheme?.cardBackground || "#0f172a",
            border:
              downloadDevice === "desktop"
                ? "1px solid rgba(34,197,94,0.45)"
                : "1px solid rgba(255,255,255,0.08)",
            borderRadius: 28,
            padding: 24,
            display: "flex",
            flexDirection: "column",
            gap: 16,
            boxShadow: "0 16px 35px rgba(0,0,0,0.18)",
            position: "relative",
            overflow: "hidden",
          }}
        >
          <div
            style={{
              position: "absolute",
              top: 18,
              right: 18,
              padding: "6px 10px",
              borderRadius: 999,
              fontSize: 12,
              fontWeight: 700,
              background:
                downloadDevice === "desktop"
                  ? "rgba(34,197,94,0.18)"
                  : "rgba(255,255,255,0.08)",
              border: "1px solid rgba(255,255,255,0.08)",
            }}
          >
            {downloadDevice === "desktop" ? "Recommandé ici" : "PC uniquement"}
          </div>

          <div style={{ fontSize: 44, lineHeight: 1 }}>💻</div>
          <div>
            <div style={{ fontSize: 26, fontWeight: 800, marginBottom: 8 }}>
              Version PC
            </div>
            <div style={{ fontSize: 17, opacity: 0.88, lineHeight: 1.6 }}>
              Installe l'application directement depuis le navigateur sur ordinateur.
              Idéal pour un accès rapide comme une vraie appli.
            </div>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 10, fontSize: 15, opacity: 0.82 }}>
            <div>• Installation rapide sur Windows, Mac ou Linux</div>
            <div>• Lance l'application depuis le bureau ou le menu démarrer</div>
            <div>• Mise à jour simple depuis le site</div>
          </div>

          <div style={{ marginTop: "auto", display: "flex", flexDirection: "column", alignItems: "flex-start", gap: 10 }}>
            {downloadDevice === "desktop" ? (
              <InstallButton styles={styles} />
            ) : (
              <button
                disabled
                style={{
                  ...styles.secondaryButton,
                  opacity: 0.5,
                  cursor: "not-allowed",
                }}
              >
                Bouton visible sur PC
              </button>
            )}
            <div style={{ fontSize: 13, opacity: 0.65 }}>
              Le bouton d'installation PWA s'affiche uniquement sur ordinateur.
            </div>
          </div>
        </div>

        <div
          style={{
            background: activeTheme?.cardBackground || "#0f172a",
            border:
              downloadDevice === "android"
                ? "1px solid rgba(34,197,94,0.45)"
                : "1px solid rgba(255,255,255,0.08)",
            borderRadius: 28,
            padding: 24,
            display: "flex",
            flexDirection: "column",
            gap: 16,
            boxShadow: "0 16px 35px rgba(0,0,0,0.18)",
            position: "relative",
            overflow: "hidden",
          }}
        >
          <div
            style={{
              position: "absolute",
              top: 18,
              right: 18,
              padding: "6px 10px",
              borderRadius: 999,
              fontSize: 12,
              fontWeight: 700,
              background:
                downloadDevice === "android"
                  ? "rgba(34,197,94,0.18)"
                  : "rgba(255,255,255,0.08)",
              border: "1px solid rgba(255,255,255,0.08)",
            }}
          >
            {downloadDevice === "android" ? "Recommandé ici" : "Android uniquement"}
          </div>

          <div style={{ fontSize: 44, lineHeight: 1 }}>📱</div>
          <div>
            <div style={{ fontSize: 26, fontWeight: 800, marginBottom: 8 }}>
              Version Android
            </div>
            <div style={{ fontSize: 17, opacity: 0.88, lineHeight: 1.6 }}>
              Télécharge l'application pour installer Ma Voix sur smartphone ou tablette
              Android.
            </div>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 10, fontSize: 15, opacity: 0.82 }}>
            <div>• Compatible téléphones et tablettes Android</div>
            <div>• Installation depuis le fichier téléchargé</div>
            <div>• À ouvrir directement sur le téléphone ou la tablette</div>
          </div>

          <div style={{ marginTop: "auto", display: "flex", flexDirection: "column", alignItems: "flex-start", gap: 10 }}>
            <a
              href={APK_DOWNLOAD_URL}
              download
              style={{
                ...styles.primaryButton,
                textDecoration: "none",
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "18px",
                padding: "12px 22px",
              }}
            >
              Télécharger l'application
            </a>
            <a
              href={AIDANT_APK_DOWNLOAD_URL}
              download
              style={{
                ...styles.secondaryButton,
                textDecoration: "none",
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "16px",
                padding: "10px 18px",
              }}
            >
              Télécharger l'application aidant
            </a>
            <div style={{ fontSize: 13, opacity: 0.65 }}>
              {downloadDevice === "android"
                ? "Télécharge Ma Voix pour l'utilisateur, ou l'application aidant pour le téléphone aidant."
                : "Depuis un PC, télécharge les fichiers puis transfère le bon APK sur chaque téléphone Android."}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
