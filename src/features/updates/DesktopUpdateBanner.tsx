import type { AvailableAppUpdate } from "./appUpdates";
import type { StyleMap } from "../../shared/types";

type DesktopUpdateBannerProps = {
  styles: StyleMap;
  activeTheme: Record<string, string>;
  isCompactLayout: boolean;
  availableUpdate: AvailableAppUpdate;
  onUpdate: () => void;
  onDismiss: () => void;
};

export default function DesktopUpdateBanner({
  styles,
  activeTheme,
  isCompactLayout,
  availableUpdate,
  onUpdate,
  onDismiss,
}: DesktopUpdateBannerProps) {
  return (
    <div
      role="status"
      aria-live="polite"
      style={{
        display: "flex",
        flexDirection: isCompactLayout ? "column" : "row",
        alignItems: isCompactLayout ? "stretch" : "center",
        justifyContent: "space-between",
        gap: 12,
        padding: isCompactLayout ? "12px" : "14px 16px",
        marginBottom: 12,
        borderRadius: 18,
        border: `2px solid ${activeTheme?.accentColor || "#3b82f6"}`,
        background: activeTheme?.infoBoxBackground || "rgba(30, 41, 59, 0.95)",
        color: activeTheme?.textColor || "#e5eefc",
        boxShadow: "0 12px 30px rgba(0,0,0,0.24)",
        flexShrink: 0,
      }}
    >
      <div style={{ minWidth: 0 }}>
        <div
          style={{
            color: activeTheme?.titleColor || "#ffffff",
            fontSize: isCompactLayout ? 18 : 20,
            fontWeight: 900,
            lineHeight: 1.2,
          }}
        >
          Mise à jour disponible
        </div>
        <div
          style={{
            marginTop: 4,
            color: activeTheme?.subtitleColor || "#cbd5e1",
            fontSize: isCompactLayout ? 15 : 16,
            lineHeight: 1.4,
          }}
        >
          Version {availableUpdate.version}. {availableUpdate.message}
        </div>
      </div>

      <div
        style={{
          display: "flex",
          flexDirection: isCompactLayout ? "column" : "row",
          gap: 10,
          alignItems: "stretch",
          flexShrink: 0,
        }}
      >
        <button
          type="button"
          onClick={onUpdate}
          style={{
            ...styles.primaryButton,
            minHeight: 56,
            padding: "12px 18px",
            fontSize: 17,
            borderRadius: 18,
            whiteSpace: "nowrap",
          }}
        >
          Mettre à jour
        </button>
        <button
          type="button"
          onClick={onDismiss}
          style={{
            ...styles.secondaryButton,
            minHeight: 56,
            padding: "12px 18px",
            fontSize: 17,
            borderRadius: 18,
            whiteSpace: "nowrap",
          }}
        >
          Plus tard
        </button>
      </div>
    </div>
  );
}
