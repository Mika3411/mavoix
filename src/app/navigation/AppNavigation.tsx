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
        border: `2px solid ${activeTheme?.pageBackground || "#0b1220"}`,
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
        borderRadius: "18px",
        background: caregiverAlertSending ? "#92400e" : "#f59e0b",
        color: "#111827",
        border: "none",
        fontSize,
        fontWeight: 800,
        cursor: caregiverAlertSending ? "wait" : "pointer",
        boxShadow: "0 8px 25px rgba(0,0,0,0.24)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        lineHeight: 1,
        ...style,
      }}
    >
      🔔
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
        borderRadius: 18,
        background: activeTheme?.cardBackground || "#1e293b",
        boxShadow: "0 16px 40px rgba(0,0,0,0.28)",
        border: "1px solid rgba(255,255,255,0.08)",
        backdropFilter: "blur(8px)",
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
        style={page === "notice" ? styles.primaryButton : styles.secondaryButton}
        onClick={openNoticeSection}
      >
        Notice
      </button>

      <button
        onClick={() => {
          setIsMoreMenuOpen(false);
          window.open(
            "https://paypal.me/anime1120",
            "_blank",
            "noopener,noreferrer"
          );
        }}
        style={{
          padding: "6px 18px",
          fontSize: isLandscapeMobileLayout ? "14px" : "15px",
          borderRadius: "18px",
          background: "#22c55e",
          color: "white",
          border: "none",
          fontWeight: "600",
          cursor: "pointer",
        }}
      >
        Soutenez-moi ❤️
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
  const topNavBorderRadius = isLandscapeMobileLayout ? 14 : 18;
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
            height: isCompactLayout ? 64 : isLandscapeMobileLayout ? 54 : 80,
            objectFit: "contain",
            flexShrink: 0,
          }}
        />

        <div
          style={{
            fontSize: isCompactLayout ? 20 : isLandscapeMobileLayout ? 17 : 22,
            fontWeight: 600,
            lineHeight: 1.15,
            minWidth: 0,
            wordBreak: "break-word",
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
            Communication
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
            Parler
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
            Infos
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
              <span aria-hidden="true">✉</span>
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
              ☰
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
        padding: isLandscapeMobileLayout ? "8px 0 0" : "10px 0 0",
        borderTop: `1px solid ${activeTheme?.inputBorder || "#334155"}`,
        background: activeTheme?.pageBackground || "#0b1220",
        boxShadow: "0 -14px 28px rgba(2,6,23,0.74)",
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
            <span aria-hidden="true">✉</span>
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
            ☰
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
        boxShadow: "0 8px 25px rgba(0,0,0,0.3)",
      }}
    />
  );
}
