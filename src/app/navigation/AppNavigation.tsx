import type React from "react";
import type { Profile, StateSetter, StyleMap } from "../../shared/types";

type AppNavigationProps = {
  styles: StyleMap;
  activeTheme: Record<string, string>;
  page: string;
  setPage: (page: string) => void;
  currentProfile: Profile;
  isCompactLayout: boolean;
  isLandscapeMobileLayout: boolean;
  isFooterNavLayout: boolean;
  isNativeApp: boolean;
  isMoreMenuOpen: boolean;
  setIsMoreMenuOpen: StateSetter<boolean>;
  moreMenuRef: React.RefObject<HTMLDivElement>;
  unreadCaregiverMessageCount: number;
  caregiverAlertSending: boolean;
  selectedCaregiverAlertTargetName: string;
  sendCaregiverAlert: () => void | Promise<void>;
  markCaregiverMessagesRead: () => void;
  openNoticeSection: () => void;
};

type CaregiverAlertButtonProps = {
  caregiverAlertSending: boolean;
  selectedCaregiverAlertTargetName: string;
  sendCaregiverAlert: () => void | Promise<void>;
  size: number;
  fontSize: string;
  style?: React.CSSProperties;
};

type NavGlyphName =
  | "communication"
  | "talk"
  | "info"
  | "messages"
  | "menu"
  | "bell";

function NavGlyph({
  name,
  size = 18,
}: {
  name: NavGlyphName;
  size?: number;
}) {
  const commonProps = {
    width: size,
    height: size,
    viewBox: "0 0 24 24",
    fill: "none",
    xmlns: "http://www.w3.org/2000/svg",
    "aria-hidden": true,
    focusable: "false",
    style: { display: "block", flex: "0 0 auto" },
  } as const;
  const strokeProps = {
    stroke: "currentColor",
    strokeWidth: 1.9,
    strokeLinecap: "round",
    strokeLinejoin: "round",
  } as const;

  if (name === "communication") {
    return (
      <svg {...commonProps}>
        <path
          d="M5.25 6.25h13.5a2.5 2.5 0 0 1 2.5 2.5v5.2a2.5 2.5 0 0 1-2.5 2.5H12.6l-4.35 3.3v-3.3h-3a2.5 2.5 0 0 1-2.5-2.5v-5.2a2.5 2.5 0 0 1 2.5-2.5Z"
          {...strokeProps}
        />
        <path d="M7.5 10h9M7.5 13h5.25" {...strokeProps} />
      </svg>
    );
  }

  if (name === "talk") {
    return (
      <svg {...commonProps}>
        <rect x="8.75" y="3.5" width="6.5" height="10" rx="3.25" {...strokeProps} />
        <path d="M5.5 11.5v.7a6.5 6.5 0 0 0 13 0v-.7M12 18.7V21M8.8 21h6.4" {...strokeProps} />
      </svg>
    );
  }

  if (name === "info") {
    return (
      <svg {...commonProps}>
        <circle cx="12" cy="12" r="8.6" {...strokeProps} />
        <path d="M12 10.8v5.2M12 7.65h.01" {...strokeProps} />
      </svg>
    );
  }

  if (name === "messages") {
    return (
      <svg {...commonProps}>
        <path d="M4.25 6.75h15.5v10.5H4.25z" {...strokeProps} />
        <path d="m5.2 7.7 6.8 5 6.8-5" {...strokeProps} />
      </svg>
    );
  }

  if (name === "bell") {
    return (
      <svg {...commonProps}>
        <path d="M6.3 10.5a5.7 5.7 0 0 1 11.4 0c0 4.7 1.55 5.4 2.1 6.1H4.2c.55-.7 2.1-1.4 2.1-6.1Z" {...strokeProps} />
        <path d="M9.8 19.1a2.35 2.35 0 0 0 4.4 0" {...strokeProps} />
      </svg>
    );
  }

  return (
    <svg {...commonProps}>
      <path d="M4.5 6.5h15M4.5 12h15M4.5 17.5h15" {...strokeProps} />
    </svg>
  );
}

function NavButtonContent({
  icon,
  label,
  compact,
  iconSize,
}: {
  icon: NavGlyphName;
  label?: string;
  compact?: boolean;
  iconSize?: number;
}) {
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        gap: compact ? 5 : 8,
        minWidth: 0,
      }}
    >
      <NavGlyph name={icon} size={iconSize ?? (compact ? 15 : 17)} />
      {label ? <span style={{ minWidth: 0 }}>{label}</span> : null}
    </span>
  );
}

function getCaregiverAlertLabel(
  caregiverAlertSending: boolean,
  selectedCaregiverAlertTargetName: string
) {
  if (caregiverAlertSending) {
    return "Envoi de l'appel aidant";
  }

  return selectedCaregiverAlertTargetName
    ? `Appel aidant : ${selectedCaregiverAlertTargetName}`
    : "Appel aidant";
}

function caregiverMessagesButtonLabel(unreadCaregiverMessageCount: number) {
  return unreadCaregiverMessageCount > 0
    ? `Messages aidants, ${unreadCaregiverMessageCount} message${
        unreadCaregiverMessageCount > 1 ? "s" : ""
      } non lu${unreadCaregiverMessageCount > 1 ? "s" : ""}`
    : "Messages aidants";
}

function unreadCaregiverMessageBadge(unreadCaregiverMessageCount: number) {
  return unreadCaregiverMessageCount > 99
    ? "99+"
    : String(unreadCaregiverMessageCount);
}

function CaregiverUnreadBadge({
  activeTheme,
  unreadCaregiverMessageCount,
  isCompactLayout,
  top,
  right,
}: {
  activeTheme: Record<string, string>;
  unreadCaregiverMessageCount: number;
  isCompactLayout: boolean;
  top: number;
  right: number;
}) {
  if (unreadCaregiverMessageCount <= 0) {
    return null;
  }

  return (
    <span
      aria-hidden="true"
      style={{
        position: "absolute",
        top: isCompactLayout ? -7 : top,
        right: isCompactLayout ? -7 : right,
        minWidth: 21,
        height: 21,
        padding: "0 5px",
        borderRadius: 999,
        background: "#ef4444",
        color: "white",
        border: "2px solid rgba(5, 10, 17, 0.95)",
        boxSizing: "border-box",
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: 11,
        fontWeight: 900,
        lineHeight: 1,
        boxShadow: "0 6px 14px rgba(0,0,0,0.28)",
      }}
    >
      {unreadCaregiverMessageBadge(unreadCaregiverMessageCount)}
    </span>
  );
}

function CaregiverAlertButton({
  caregiverAlertSending,
  selectedCaregiverAlertTargetName,
  sendCaregiverAlert,
  size,
  fontSize,
  style,
}: CaregiverAlertButtonProps) {
  const label = getCaregiverAlertLabel(
    caregiverAlertSending,
    selectedCaregiverAlertTargetName
  );
  const buttonRadius = Math.max(16, Math.round(size * 0.31));
  const highlightRadius = Math.max(12, buttonRadius - 5);
  const bellSize = Math.max(22, Math.round(size * 0.46));

  return (
    <button
      onClick={sendCaregiverAlert}
      disabled={caregiverAlertSending}
      aria-label={label}
      title={label}
      style={{
        width: size,
        height: size,
        padding: 0,
        borderRadius: buttonRadius,
        background: caregiverAlertSending
          ? "linear-gradient(145deg, #9a3412 0%, #c2410c 45%, #7c2d12 100%)"
          : "linear-gradient(145deg, #ffe08a 0%, #ffbf35 42%, #f59e0b 76%, #d97706 100%)",
        color: "#101827",
        border: "1px solid rgba(255, 237, 179, 0.78)",
        fontSize,
        fontWeight: 850,
        cursor: caregiverAlertSending ? "wait" : "pointer",
        boxShadow:
          "0 22px 44px rgba(245, 158, 11, 0.32), 0 12px 24px rgba(0, 0, 0, 0.3), inset 0 1px 0 rgba(255,255,255,0.66), inset 0 -12px 22px rgba(146, 64, 14, 0.16)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        lineHeight: 1,
        position: "relative",
        overflow: "hidden",
        transform: "translateZ(0)",
        transition:
          "transform 160ms ease, box-shadow 160ms ease, filter 160ms ease",
        ...style,
      }}
    >
      <span
        aria-hidden="true"
        style={{
          position: "absolute",
          inset: 4,
          borderRadius: highlightRadius,
          background:
            "linear-gradient(180deg, rgba(255,255,255,0.42), rgba(255,255,255,0.08) 38%, rgba(255,255,255,0) 68%)",
          pointerEvents: "none",
        }}
      />
      <span
        aria-hidden="true"
        style={{
          position: "absolute",
          width: "62%",
          height: "62%",
          borderRadius: 999,
          background:
            "radial-gradient(circle, rgba(255,255,255,0.26) 0%, rgba(255,255,255,0) 66%)",
          pointerEvents: "none",
        }}
      />
      <span
        aria-hidden="true"
        style={{
          position: "relative",
          zIndex: 1,
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          filter: "drop-shadow(0 1px 0 rgba(255,255,255,0.32))",
        }}
      >
        <NavGlyph name="bell" size={bellSize} />
      </span>
    </button>
  );
}

function MoreMenu({
  styles,
  activeTheme,
  page,
  setPage,
  isCompactLayout,
  isLandscapeMobileLayout,
  setIsMoreMenuOpen,
  openNoticeSection,
  placement,
}: {
  styles: StyleMap;
  activeTheme: Record<string, string>;
  page: string;
  setPage: (page: string) => void;
  isCompactLayout: boolean;
  isLandscapeMobileLayout: boolean;
  setIsMoreMenuOpen: StateSetter<boolean>;
  openNoticeSection: () => void;
  placement: "top" | "bottom";
}) {
  const menuPosition =
    placement === "top"
      ? { top: "calc(100% + 10px)", right: 0 }
      : { bottom: "calc(100% + 10px)", right: 0 };

  return (
    <div
      role="menu"
      style={{
        position: "absolute",
        ...menuPosition,
        minWidth: placement === "top" && !isCompactLayout ? 220 : undefined,
        width:
          placement === "bottom" || isCompactLayout
            ? "min(260px, calc(100vw - 24px))"
            : undefined,
        display: "flex",
        flexDirection: "column",
        gap: 8,
        padding: 10,
        borderRadius: 12,
        background: activeTheme?.cardBackground || "#1e293b",
        boxShadow:
          "0 22px 52px rgba(0,0,0,0.36), inset 0 1px 0 rgba(255,255,255,0.07)",
        border: `1px solid ${activeTheme?.inputBorder || "rgba(255,255,255,0.12)"}`,
        backdropFilter: "blur(16px)",
        zIndex: placement === "top" ? 50 : 60,
      }}
    >
      <button
        style={page === "voix" ? styles.primaryButton : styles.secondaryButton}
        onClick={() => {
          setPage("voix");
          setIsMoreMenuOpen(false);
        }}
      >
        Voix
      </button>

      <button
        style={page === "profil" ? styles.primaryButton : styles.secondaryButton}
        onClick={() => {
          setPage("profil");
          setIsMoreMenuOpen(false);
        }}
      >
        Configurer
      </button>

      <button
        style={
          page === "dictionnaire" ? styles.primaryButton : styles.secondaryButton
        }
        onClick={() => {
          setPage("dictionnaire");
          setIsMoreMenuOpen(false);
        }}
      >
        Dictionnaire
      </button>

      <button
        style={
          page === "partage-aidant"
            ? styles.primaryButton
            : styles.secondaryButton
        }
        onClick={() => {
          setPage("partage-aidant");
          setIsMoreMenuOpen(false);
        }}
      >
        Envoyer app aidant
      </button>

      <button
        style={page === "notice" ? styles.primaryButton : styles.secondaryButton}
        onClick={openNoticeSection}
      >
        Notice
      </button>
    </div>
  );
}

export function AppHeader({
  styles,
  activeTheme,
  page,
  setPage,
  currentProfile,
  isCompactLayout,
  isLandscapeMobileLayout,
  isFooterNavLayout,
  isNativeApp,
  isMoreMenuOpen,
  setIsMoreMenuOpen,
  moreMenuRef,
  unreadCaregiverMessageCount,
  caregiverAlertSending,
  selectedCaregiverAlertTargetName,
  sendCaregiverAlert,
  markCaregiverMessagesRead,
  openNoticeSection,
}: AppNavigationProps) {
  const compactTopNavMinHeight = 48;
  const regularTopNavMinHeight = 48;
  const compactTopNavPadding = "8px 6px";
  const compactTopNavFontSize = 13;
  const topNavMinHeight = isCompactLayout
    ? compactTopNavMinHeight
    : isLandscapeMobileLayout
      ? 40
      : regularTopNavMinHeight;
  const topNavTextPadding = isCompactLayout
    ? compactTopNavPadding
    : isLandscapeMobileLayout
      ? "6px 12px"
      : "12px 14px";
  const topNavWidePadding = isCompactLayout
    ? compactTopNavPadding
    : isLandscapeMobileLayout
      ? "6px 12px"
      : "6px 18px";
  const topNavFontSize = isCompactLayout
    ? compactTopNavFontSize
    : isLandscapeMobileLayout
      ? 13
      : 15;
  const topNavIconOnlySize = isCompactLayout
    ? 22
    : isLandscapeMobileLayout
      ? 20
      : 22;
  const topNavBorderRadius = isLandscapeMobileLayout ? 12 : 12;
  const nativeHeaderAlertSize = isLandscapeMobileLayout ? 56 : 62;
  const profileFullName =
    currentProfile.firstName || currentProfile.lastName
      ? ` ${[currentProfile.firstName, currentProfile.lastName]
          .filter(Boolean)
          .join(" ")}`
      : "";
  const caregiverButtonLabel =
    caregiverMessagesButtonLabel(unreadCaregiverMessageCount);

  return (
    <div
      style={{
        ...styles.header,
        gap: isCompactLayout ? 10 : isLandscapeMobileLayout ? 12 : 16,
        alignItems: isCompactLayout ? "flex-start" : "center",
        justifyContent: "space-between",
        flexWrap: isLandscapeMobileLayout ? "nowrap" : "wrap",
        position: "relative",
        zIndex: 20,
        padding: isCompactLayout ? 10 : "12px 14px",
        borderRadius: 8,
        background:
          activeTheme?.cardBackground ||
          "linear-gradient(180deg, rgba(18, 25, 34, 0.92), rgba(10, 15, 23, 0.9))",
        border: `1px solid ${activeTheme?.inputBorder || "rgba(132,157,184,0.28)"}`,
        boxShadow:
          "0 18px 48px rgba(0,0,0,0.26), inset 0 1px 0 rgba(255,255,255,0.06)",
        backdropFilter: "blur(18px)",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: isCompactLayout ? 10 : isLandscapeMobileLayout ? 8 : 16,
          minWidth: 0,
          width: isCompactLayout
            ? isNativeApp
              ? `calc(100% - ${nativeHeaderAlertSize + 12}px)`
              : "100%"
            : undefined,
          maxWidth: isLandscapeMobileLayout ? "min(40vw, 300px)" : undefined,
          flexShrink: isLandscapeMobileLayout ? 1 : undefined,
        }}
      >
        <img
          src={`${import.meta.env.BASE_URL}picturetitle.png`}
          alt="Ma Voix"
          style={{
            height: isCompactLayout ? 58 : isLandscapeMobileLayout ? 48 : 66,
            objectFit: "contain",
            flexShrink: 0,
          }}
        />

        <div
          style={{
            fontSize: isCompactLayout ? 20 : isLandscapeMobileLayout ? 17 : 22,
            fontWeight: 780,
            lineHeight: 1.15,
            minWidth: 0,
            wordBreak: "break-word",
            color: activeTheme?.titleColor || "#ffffff",
          }}
        >
          {currentProfile.name}
          {profileFullName}
        </div>
      </div>

      {isNativeApp && (
        <CaregiverAlertButton
          caregiverAlertSending={caregiverAlertSending}
          selectedCaregiverAlertTargetName={selectedCaregiverAlertTargetName}
          sendCaregiverAlert={sendCaregiverAlert}
          size={nativeHeaderAlertSize}
          fontSize={isLandscapeMobileLayout ? "26px" : "29px"}
          style={{
            position: "absolute",
            top: isLandscapeMobileLayout ? 0 : 4,
            right: 0,
            zIndex: 30,
            borderRadius: 20,
            fontWeight: 900,
            boxShadow: "0 10px 28px rgba(0,0,0,0.30)",
          }}
        />
      )}

      {!isFooterNavLayout && (
        <div
          style={{
            ...styles.topButtons,
            position: "relative",
            gap: isCompactLayout ? 6 : isLandscapeMobileLayout ? 8 : 10,
            flexWrap: isLandscapeMobileLayout ? "nowrap" : "wrap",
            width: isCompactLayout ? "100%" : undefined,
            display: isCompactLayout ? "grid" : "flex",
            justifyContent: isCompactLayout ? undefined : "flex-end",
            marginLeft: isCompactLayout ? undefined : "auto",
            flexShrink: isLandscapeMobileLayout ? 0 : undefined,
            gridTemplateColumns: isCompactLayout
              ? "minmax(80px, 1.28fr) minmax(46px, 0.82fr) minmax(42px, 0.66fr) minmax(48px, 0.5fr) minmax(48px, 0.5fr)"
              : undefined,
          }}
        >
          <button
            style={{
              ...(page === "communication"
                ? styles.primaryButton
                : styles.secondaryButton),
              padding: topNavWidePadding,
              fontSize: topNavFontSize,
              width: isCompactLayout ? "100%" : undefined,
              minHeight: topNavMinHeight,
              borderRadius: topNavBorderRadius,
              lineHeight: isCompactLayout ? 1.1 : undefined,
            }}
            onClick={() => setPage("communication")}
          >
            <NavButtonContent
              icon="communication"
              label="Communication"
              compact={isCompactLayout || isLandscapeMobileLayout}
            />
          </button>

          <button
            style={{
              ...(page === "reglages"
                ? styles.primaryButton
                : styles.secondaryButton),
              padding: topNavTextPadding,
              fontSize: topNavFontSize,
              width: isCompactLayout ? "100%" : undefined,
              minHeight: topNavMinHeight,
              borderRadius: topNavBorderRadius,
              lineHeight: isCompactLayout ? 1.1 : undefined,
            }}
            onClick={() => setPage("reglages")}
          >
            <NavButtonContent
              icon="talk"
              label="Parler"
              compact={isCompactLayout || isLandscapeMobileLayout}
            />
          </button>

          <button
            style={{
              ...(page === "infos" ? styles.primaryButton : styles.secondaryButton),
              padding: topNavTextPadding,
              fontSize: topNavFontSize,
              width: isCompactLayout ? "100%" : undefined,
              minHeight: topNavMinHeight,
              borderRadius: topNavBorderRadius,
              lineHeight: isCompactLayout ? 1.1 : undefined,
            }}
            onClick={() => setPage("infos")}
          >
            <NavButtonContent
              icon="info"
              label="Infos"
              compact={isCompactLayout || isLandscapeMobileLayout}
            />
          </button>

          <div
            style={{
              position: "relative",
              width: isCompactLayout ? "100%" : undefined,
            }}
          >
            <button
              type="button"
              aria-label={caregiverButtonLabel}
              title={caregiverButtonLabel}
              onClick={() => {
                setPage("aidants");
                setIsMoreMenuOpen(false);
                markCaregiverMessagesRead();
              }}
              style={{
                ...(page === "aidants"
                  ? styles.primaryButton
                  : styles.secondaryButton),
                padding: topNavWidePadding,
                fontSize: isLandscapeMobileLayout ? 16 : 20,
                width: isCompactLayout ? "100%" : undefined,
                minWidth: isCompactLayout
                  ? undefined
                  : isLandscapeMobileLayout
                    ? 44
                    : 64,
                minHeight: topNavMinHeight,
                borderRadius: topNavBorderRadius,
                lineHeight: 1,
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                position: "relative",
              }}
            >
              <NavButtonContent
                icon="messages"
                compact
                iconSize={topNavIconOnlySize}
              />
              <CaregiverUnreadBadge
                activeTheme={activeTheme}
                unreadCaregiverMessageCount={unreadCaregiverMessageCount}
                isCompactLayout={isCompactLayout}
                top={-8}
                right={-8}
              />
            </button>
          </div>

          <div
            ref={moreMenuRef}
            style={{
              position: "relative",
              width: isCompactLayout ? "100%" : undefined,
            }}
          >
            <button
              type="button"
              aria-haspopup="menu"
              aria-expanded={isMoreMenuOpen}
              aria-label="Menu"
              title="Menu"
              onClick={() => setIsMoreMenuOpen((prev) => !prev)}
              style={{
                ...styles.secondaryButton,
                padding: topNavWidePadding,
                fontSize: isCompactLayout ? 18 : isLandscapeMobileLayout ? 14 : 15,
                width: isCompactLayout ? "100%" : undefined,
                minHeight: topNavMinHeight,
                minWidth: isCompactLayout
                  ? undefined
                  : isLandscapeMobileLayout
                    ? 44
                    : undefined,
                borderRadius: topNavBorderRadius,
                lineHeight: isCompactLayout ? 1.1 : undefined,
              }}
            >
              <NavButtonContent
                icon="menu"
                compact
                iconSize={topNavIconOnlySize}
              />
            </button>

            {isMoreMenuOpen && (
              <MoreMenu
                styles={styles}
                activeTheme={activeTheme}
                page={page}
                setPage={setPage}
                isCompactLayout={isCompactLayout}
                isLandscapeMobileLayout={isLandscapeMobileLayout}
                setIsMoreMenuOpen={setIsMoreMenuOpen}
                openNoticeSection={openNoticeSection}
                placement="top"
              />
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export function AppFooterNavigation({
  styles,
  activeTheme,
  page,
  setPage,
  isCompactLayout,
  isLandscapeMobileLayout,
  isNativeApp,
  isMoreMenuOpen,
  setIsMoreMenuOpen,
  moreMenuRef,
  unreadCaregiverMessageCount,
  caregiverAlertSending,
  selectedCaregiverAlertTargetName,
  sendCaregiverAlert,
  markCaregiverMessagesRead,
  openNoticeSection,
}: AppNavigationProps) {
  const footerNavMinHeight = isLandscapeMobileLayout ? 40 : 44;
  const footerNavPadding = isLandscapeMobileLayout ? "6px 10px" : "6px 3px";
  const footerNavFontSize = isLandscapeMobileLayout ? 13 : 11;
  const footerNavIconFontSize = isLandscapeMobileLayout ? 16 : 18;
  const footerNavIconOnlySize = isLandscapeMobileLayout ? 20 : 22;
  const footerAlertSize = 50;
  const shouldShowFooterAlertButton = !isNativeApp;
  const footerNavGridColumns = isLandscapeMobileLayout
    ? "minmax(104px, 1fr) minmax(58px, 0.7fr) minmax(54px, 0.62fr) minmax(42px, 0.45fr) minmax(42px, 0.45fr)"
    : "minmax(96px, 1.35fr) minmax(54px, 0.68fr) minmax(48px, 0.58fr) minmax(38px, 0.42fr) minmax(38px, 0.42fr)";
  const caregiverButtonLabel =
    caregiverMessagesButtonLabel(unreadCaregiverMessageCount);

  return (
    <div
      style={{
        flexShrink: 0,
        display: shouldShowFooterAlertButton ? "grid" : "block",
        gridTemplateColumns: shouldShowFooterAlertButton
          ? `minmax(0, 1fr) ${footerAlertSize}px`
          : undefined,
        alignItems: "center",
        gap: isLandscapeMobileLayout ? 8 : 6,
        padding: isLandscapeMobileLayout ? "8px 8px" : "10px 8px",
        borderTop: `1px solid ${activeTheme?.inputBorder || "#334155"}`,
        borderLeft: `1px solid ${activeTheme?.inputBorder || "#334155"}`,
        borderRight: `1px solid ${activeTheme?.inputBorder || "#334155"}`,
        borderRadius: 8,
        background: activeTheme?.cardBackground || "#0b1220",
        boxShadow:
          "0 -16px 34px rgba(0,0,0,0.34), inset 0 1px 0 rgba(255,255,255,0.06)",
        backdropFilter: "blur(16px)",
        position: "relative",
        zIndex: 40,
      }}
    >
      <div
        style={{
          ...styles.topButtons,
          display: "grid",
          gridTemplateColumns: footerNavGridColumns,
          gap: 6,
          width: "100%",
          minWidth: 0,
          alignItems: "stretch",
        }}
      >
        <button
          style={{
            ...(page === "communication"
              ? styles.primaryButton
              : styles.secondaryButton),
            padding: footerNavPadding,
            fontSize: footerNavFontSize,
            width: "100%",
            minWidth: 0,
            minHeight: footerNavMinHeight,
            borderRadius: 14,
            lineHeight: 1.1,
          }}
          onClick={() => setPage("communication")}
        >
          Communication
        </button>

        <button
          style={{
            ...(page === "reglages" ? styles.primaryButton : styles.secondaryButton),
            padding: footerNavPadding,
            fontSize: footerNavFontSize,
            width: "100%",
            minWidth: 0,
            minHeight: footerNavMinHeight,
            borderRadius: 14,
            lineHeight: 1.1,
          }}
          onClick={() => setPage("reglages")}
        >
          Parler
        </button>

        <button
          style={{
            ...(page === "infos" ? styles.primaryButton : styles.secondaryButton),
            padding: footerNavPadding,
            fontSize: footerNavFontSize,
            width: "100%",
            minWidth: 0,
            minHeight: footerNavMinHeight,
            borderRadius: 14,
            lineHeight: 1.1,
          }}
          onClick={() => setPage("infos")}
        >
          Infos
        </button>

        <div style={{ position: "relative", minWidth: 0 }}>
          <button
            type="button"
            aria-label={caregiverButtonLabel}
            title={caregiverButtonLabel}
            onClick={() => {
              setPage("aidants");
              setIsMoreMenuOpen(false);
              markCaregiverMessagesRead();
            }}
            style={{
              ...(page === "aidants"
                ? styles.primaryButton
                : styles.secondaryButton),
              padding: 0,
              fontSize: footerNavIconFontSize,
              width: "100%",
              minWidth: 0,
              minHeight: footerNavMinHeight,
              borderRadius: 14,
              lineHeight: 1,
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              position: "relative",
            }}
          >
            <NavButtonContent
              icon="messages"
              compact
              iconSize={footerNavIconOnlySize}
            />
            <CaregiverUnreadBadge
              activeTheme={activeTheme}
              unreadCaregiverMessageCount={unreadCaregiverMessageCount}
              isCompactLayout={false}
              top={-7}
              right={-6}
            />
          </button>
        </div>

        <div ref={moreMenuRef} style={{ position: "relative", minWidth: 0 }}>
          <button
            type="button"
            aria-haspopup="menu"
            aria-expanded={isMoreMenuOpen}
            aria-label="Menu"
            title="Menu"
            onClick={() => setIsMoreMenuOpen((prev) => !prev)}
            style={{
              ...styles.secondaryButton,
              padding: 0,
              fontSize: footerNavIconFontSize,
              width: "100%",
              minWidth: 0,
              minHeight: footerNavMinHeight,
              borderRadius: 14,
              lineHeight: 1,
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <NavButtonContent
              icon="menu"
              compact
              iconSize={footerNavIconOnlySize}
            />
          </button>

          {isMoreMenuOpen && (
            <MoreMenu
              styles={styles}
              activeTheme={activeTheme}
              page={page}
              setPage={setPage}
              isCompactLayout={isCompactLayout}
              isLandscapeMobileLayout={isLandscapeMobileLayout}
              setIsMoreMenuOpen={setIsMoreMenuOpen}
              openNoticeSection={openNoticeSection}
              placement="bottom"
            />
          )}
        </div>
      </div>

      {shouldShowFooterAlertButton && (
        <CaregiverAlertButton
          caregiverAlertSending={caregiverAlertSending}
          selectedCaregiverAlertTargetName={selectedCaregiverAlertTargetName}
          sendCaregiverAlert={sendCaregiverAlert}
          size={footerAlertSize}
          fontSize={isLandscapeMobileLayout ? "21px" : "23px"}
        />
      )}
    </div>
  );
}

export function FloatingCaregiverAlertButton({
  caregiverAlertSending,
  selectedCaregiverAlertTargetName,
  sendCaregiverAlert,
}: Pick<
  AppNavigationProps,
  | "caregiverAlertSending"
  | "selectedCaregiverAlertTargetName"
  | "sendCaregiverAlert"
>) {
  return (
    <CaregiverAlertButton
      caregiverAlertSending={caregiverAlertSending}
      selectedCaregiverAlertTargetName={selectedCaregiverAlertTargetName}
      sendCaregiverAlert={sendCaregiverAlert}
      size={62}
      fontSize="24px"
      style={{
        position: "fixed",
        right: 20,
        bottom: 96,
        zIndex: 9999,
        boxShadow:
          "0 24px 46px rgba(245, 158, 11, 0.34), 0 12px 28px rgba(0,0,0,0.34), inset 0 1px 0 rgba(255,255,255,0.68), inset 0 -12px 22px rgba(146,64,14,0.16)",
      }}
    />
  );
}
