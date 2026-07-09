export const THEMES = {
  dark: {
    pageBackground:
      "linear-gradient(160deg, #05070a 0%, #0a111a 48%, #10131b 100%)",
    cardBackground:
      "linear-gradient(180deg, rgba(18, 25, 34, 0.92), rgba(10, 15, 23, 0.9))",
    textColor: "#edf5ff",
    titleColor: "#ffffff",
    subtitleColor: "#a9b7c9",
    inputBackground: "rgba(5, 10, 17, 0.82)",
    inputBorder: "rgba(132, 157, 184, 0.28)",
    primaryButtonBackground:
      "linear-gradient(135deg, #19c2ff 0%, #2474ff 58%, #1454d6 100%)",
    secondaryButtonBackground:
      "linear-gradient(180deg, rgba(255,255,255,0.085), rgba(255,255,255,0.035))",
    secondaryButtonText: "#e8f1fb",
    accentColor: "#19c2ff",
    supportButtonBackground:
      "linear-gradient(135deg, #25d39f 0%, #0f9f73 100%)",
    recordingButtonBackground:
      "linear-gradient(135deg, #ff6464 0%, #d82445 100%)",
    deleteButtonBackground: "rgba(127, 29, 29, 0.78)",
    deleteButtonBorder: "rgba(248, 113, 113, 0.55)",
    deleteButtonText: "#ffe4e6",
    infoBoxBackground:
      "linear-gradient(180deg, rgba(255,255,255,0.07), rgba(255,255,255,0.035))",
    mutedText: "#a9b7c9",
    surfaceAlt: "rgba(255, 255, 255, 0.055)",
    categoryCardBackground:
      "linear-gradient(180deg, rgba(255,255,255,0.075), rgba(255,255,255,0.028))",
    categoryCardActiveBackground:
      "linear-gradient(180deg, rgba(25,194,255,0.24), rgba(36,116,255,0.12))",
    badgeSuccessBackground: "rgba(37, 211, 159, 0.18)",
    badgeSuccessText: "#9ff3d7",
    badgeNeutralBackground: "rgba(255, 255, 255, 0.09)",
    badgeNeutralText: "#d7e4f2",
  },

  light: {
    pageBackground: "linear-gradient(160deg, #f6f8fb 0%, #e7edf5 100%)",
    cardBackground:
      "linear-gradient(180deg, rgba(255,255,255,0.98), rgba(247,250,253,0.96))",
    textColor: "#101722",
    titleColor: "#070b12",
    subtitleColor: "#536171",
    inputBackground: "#ffffff",
    inputBorder: "rgba(76, 93, 116, 0.24)",
    primaryButtonBackground:
      "linear-gradient(135deg, #0284c7 0%, #2563eb 100%)",
    secondaryButtonBackground:
      "linear-gradient(180deg, #ffffff, #eef3f8)",
    secondaryButtonText: "#172033",
    accentColor: "#0284c7",
    supportButtonBackground:
      "linear-gradient(135deg, #0fbd87 0%, #07845f 100%)",
    recordingButtonBackground:
      "linear-gradient(135deg, #ef4444 0%, #be123c 100%)",
    deleteButtonBackground: "#fff1f2",
    deleteButtonBorder: "#fb7185",
    deleteButtonText: "#9f1239",
    infoBoxBackground:
      "linear-gradient(180deg, #ffffff, #f3f7fb)",
    mutedText: "#536171",
    surfaceAlt: "rgba(248, 250, 252, 0.9)",
    categoryCardBackground:
      "linear-gradient(180deg, #ffffff, #f3f7fb)",
    categoryCardActiveBackground:
      "linear-gradient(180deg, rgba(2,132,199,0.14), rgba(255,255,255,1))",
    badgeSuccessBackground: "#d8f8eb",
    badgeSuccessText: "#047857",
    badgeNeutralBackground: "#e8eef5",
    badgeNeutralText: "#334155",
  },

  colorful: {
    pageBackground:
      "linear-gradient(160deg, #130f2c 0%, #063c43 46%, #11131a 100%)",
    cardBackground:
      "linear-gradient(180deg, rgba(26, 31, 46, 0.92), rgba(12, 18, 27, 0.9))",
    textColor: "#fff8e6",
    titleColor: "#ffffff",
    subtitleColor: "#ffe0a6",
    inputBackground: "rgba(12, 18, 27, 0.86)",
    inputBorder: "rgba(255, 212, 122, 0.34)",
    primaryButtonBackground:
      "linear-gradient(135deg, #ffb020 0%, #ef4444 100%)",
    secondaryButtonBackground:
      "linear-gradient(180deg, rgba(255,255,255,0.1), rgba(255,255,255,0.045))",
    secondaryButtonText: "#ffffff",
    accentColor: "#ffb020",
    supportButtonBackground:
      "linear-gradient(135deg, #35e6a6 0%, #0f9f73 100%)",
    recordingButtonBackground:
      "linear-gradient(135deg, #fb7185 0%, #be123c 100%)",
    deleteButtonBackground: "rgba(127, 29, 29, 0.78)",
    deleteButtonBorder: "rgba(251, 113, 133, 0.55)",
    deleteButtonText: "#fff1f2",
    infoBoxBackground:
      "linear-gradient(180deg, rgba(255,255,255,0.09), rgba(255,255,255,0.04))",
    mutedText: "#ffe0a6",
    surfaceAlt: "rgba(255, 255, 255, 0.06)",
    categoryCardBackground:
      "linear-gradient(180deg, rgba(255,255,255,0.085), rgba(255,255,255,0.035))",
    categoryCardActiveBackground:
      "linear-gradient(180deg, rgba(255,176,32,0.28), rgba(239,68,68,0.13))",
    badgeSuccessBackground: "rgba(53, 230, 166, 0.18)",
    badgeSuccessText: "#c3ffe9",
    badgeNeutralBackground: "rgba(255, 255, 255, 0.11)",
    badgeNeutralText: "#ffffff",
  },
};

export function getActiveTheme(profile) {
  if (!profile) return THEMES.dark;

  if (profile.themeMode === "custom") {
    const custom = profile.customTheme || {};
    return {
      ...THEMES.dark,
      pageBackground: custom.pageBackground || THEMES.dark.pageBackground,
      cardBackground: custom.cardBackground || THEMES.dark.cardBackground,
      textColor: custom.textColor || THEMES.dark.textColor,
      titleColor:
        custom.titleColor || custom.textColor || THEMES.dark.titleColor,
      subtitleColor:
        custom.subtitleColor || custom.textColor || THEMES.dark.subtitleColor,
      inputBackground: custom.inputBackground || THEMES.dark.inputBackground,
      inputBorder: custom.inputBorder || THEMES.dark.inputBorder,
      primaryButtonBackground:
        custom.primaryButtonBackground || THEMES.dark.primaryButtonBackground,
      secondaryButtonBackground:
        custom.secondaryButtonBackground ||
        THEMES.dark.secondaryButtonBackground,
      secondaryButtonText:
        custom.secondaryButtonText || THEMES.dark.secondaryButtonText,
      accentColor: custom.accentColor || THEMES.dark.accentColor,
      supportButtonBackground:
        custom.supportButtonBackground || THEMES.dark.supportButtonBackground,
      recordingButtonBackground:
        custom.recordingButtonBackground ||
        THEMES.dark.recordingButtonBackground,
      deleteButtonBackground:
        custom.deleteButtonBackground || THEMES.dark.deleteButtonBackground,
      deleteButtonBorder:
        custom.deleteButtonBorder || THEMES.dark.deleteButtonBorder,
      deleteButtonText: custom.deleteButtonText || THEMES.dark.deleteButtonText,
      infoBoxBackground:
        custom.infoBoxBackground || THEMES.dark.infoBoxBackground,
      mutedText:
        custom.mutedText || custom.subtitleColor || THEMES.dark.mutedText,
      surfaceAlt: custom.surfaceAlt || THEMES.dark.surfaceAlt,
      categoryCardBackground:
        custom.categoryCardBackground || THEMES.dark.categoryCardBackground,
      categoryCardActiveBackground:
        custom.categoryCardActiveBackground ||
        THEMES.dark.categoryCardActiveBackground,
      badgeSuccessBackground:
        custom.badgeSuccessBackground || THEMES.dark.badgeSuccessBackground,
      badgeSuccessText: custom.badgeSuccessText || THEMES.dark.badgeSuccessText,
      badgeNeutralBackground:
        custom.badgeNeutralBackground || THEMES.dark.badgeNeutralBackground,
      badgeNeutralText: custom.badgeNeutralText || THEMES.dark.badgeNeutralText,
    };
  }

  return THEMES[profile.themeMode] || THEMES.dark;
}

export function createStyles(theme) {
  return {
    page: {
      minHeight: "100vh",
      background: theme.pageBackground,
      fontFamily:
        'Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
      padding: 14,
      color: theme.textColor,
      letterSpacing: 0,
    },
    container: {
      maxWidth: 1440,
      margin: "0 auto",
    },
    header: {
      display: "flex",
      justifyContent: "space-between",
      gap: 16,
      alignItems: "center",
      flexWrap: "wrap",
      marginBottom: 14,
    },
    title: {
      fontSize: 36,
      margin: 0,
      color: theme.titleColor,
      letterSpacing: 0,
      fontWeight: 800,
    },
    subtitle: {
      marginTop: 8,
      color: theme.subtitleColor,
      fontSize: 16,
      lineHeight: 1.5,
    },
    topButtons: {
      display: "flex",
      gap: 8,
      flexWrap: "wrap",
    },
    grid: {
      display: "grid",
      gridTemplateColumns: "1fr 1fr",
      gap: 10,
    },
    gridSingle: {
      display: "grid",
      gridTemplateColumns: "1fr",
      gap: 14,
    },
    card: {
      background: theme.cardBackground,
      borderRadius: 8,
      padding: 18,
      boxShadow:
        "0 24px 70px rgba(0,0,0,0.34), inset 0 1px 0 rgba(255,255,255,0.07)",
      border: `1px solid ${theme.inputBorder}`,
      backdropFilter: "blur(18px)",
    },
    sectionTitle: {
      marginTop: 0,
      marginBottom: 14,
      fontSize: 22,
      color: theme.titleColor,
      fontWeight: 850,
      lineHeight: 1.15,
    },
    text: {
      color: theme.textColor,
      fontSize: 16,
      lineHeight: 1.55,
    },
    label: {
      color: theme.textColor,
      fontWeight: 750,
      fontSize: 15,
      lineHeight: 1.25,
    },
    textarea: {
      width: "100%",
      minHeight: 180,
      padding: 16,
      borderRadius: 12,
      border: `1px solid ${theme.inputBorder}`,
      fontSize: 28,
      lineHeight: 1.4,
      boxSizing: "border-box",
      marginBottom: 18,
      background: theme.inputBackground,
      color: theme.textColor,
      outline: "none",
      boxShadow: "inset 0 1px 0 rgba(255,255,255,0.05)",
    },
    smallTextarea: {
      width: "100%",
      minHeight: 108,
      padding: 12,
      borderRadius: 12,
      border: `1px solid ${theme.inputBorder}`,
      fontSize: 18,
      boxSizing: "border-box",
      background: theme.inputBackground,
      color: theme.textColor,
      outline: "none",
      lineHeight: 1.5,
      boxShadow: "inset 0 1px 0 rgba(255,255,255,0.05)",
    },
    input: {
      width: "100%",
      padding: "10px 12px",
      borderRadius: 12,
      border: `1px solid ${theme.inputBorder}`,
      fontSize: 17,
      boxSizing: "border-box",
      marginTop: 6,
      background: theme.inputBackground,
      color: theme.textColor,
      outline: "none",
      minHeight: 46,
      boxShadow: "inset 0 1px 0 rgba(255,255,255,0.05)",
    },
    colorInput: {
      width: "100%",
      height: 48,
      padding: 6,
      borderRadius: 12,
      border: `1px solid ${theme.inputBorder}`,
      background: theme.inputBackground,
      boxSizing: "border-box",
      marginTop: 8,
      cursor: "pointer",
    },
    buttonGrid: {
      display: "grid",
      gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
      gap: 10,
      marginBottom: 12,
    },
    inlineButtons: {
      display: "flex",
      gap: 8,
      flexWrap: "wrap",
      alignItems: "center",
    },
    primaryButton: {
      background: theme.primaryButtonBackground,
      color: "white",
      border: "1px solid rgba(255,255,255,0.14)",
      borderRadius: 14,
      padding: "12px 14px",
      cursor: "pointer",
      fontSize: 17,
      fontWeight: 850,
      boxShadow:
        "0 14px 28px rgba(20, 116, 255, 0.22), inset 0 1px 0 rgba(255,255,255,0.22)",
      minHeight: 52,
    },
    secondaryButton: {
      background: theme.secondaryButtonBackground,
      color: theme.secondaryButtonText,
      border: `1px solid ${theme.inputBorder}`,
      borderRadius: 14,
      padding: "12px 14px",
      cursor: "pointer",
      fontSize: 17,
      fontWeight: 760,
      minHeight: 52,
      boxShadow: "inset 0 1px 0 rgba(255,255,255,0.06)",
    },
    supportButton: {
      background: theme.supportButtonBackground,
      color: "white",
      border: "1px solid rgba(255,255,255,0.14)",
      borderRadius: 14,
      padding: "12px 14px",
      cursor: "pointer",
      fontSize: 19,
      fontWeight: 850,
      boxShadow:
        "0 14px 28px rgba(15, 159, 115, 0.2), inset 0 1px 0 rgba(255,255,255,0.22)",
      minHeight: 52,
    },
    recordingButton: {
      background: theme.recordingButtonBackground,
      color: "white",
      border: "1px solid rgba(255,255,255,0.14)",
      borderRadius: 14,
      padding: "12px 14px",
      cursor: "pointer",
      fontSize: 19,
      fontWeight: 850,
      boxShadow:
        "0 14px 28px rgba(216, 36, 69, 0.2), inset 0 1px 0 rgba(255,255,255,0.2)",
      minHeight: 52,
    },
    deleteButton: {
      background: theme.deleteButtonBackground,
      color: theme.deleteButtonText,
      border: `1px solid ${theme.deleteButtonBorder}`,
      borderRadius: 10,
      padding: "6px 10px",
      cursor: "pointer",
      fontWeight: 850,
      fontSize: 12,
      minWidth: 78,
      height: 38,
    },
    favoriteButton: {
      width: 38,
      minWidth: 38,
      height: 38,
      borderRadius: 10,
      border: `1px solid ${theme.inputBorder}`,
      background: theme.inputBackground,
      color: "#facc15",
      fontSize: 18,
      cursor: "pointer",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      padding: 0,
    },
    smallActionButton: {
      background: theme.secondaryButtonBackground,
      color: theme.secondaryButtonText,
      border: `1px solid ${theme.inputBorder}`,
      borderRadius: 10,
      padding: "6px 8px",
      cursor: "pointer",
      fontSize: 14,
      fontWeight: 800,
      minWidth: 38,
      height: 38,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
    },
    importLabel: {
      display: "inline-flex",
      alignItems: "center",
      justifyContent: "center",
      background: theme.secondaryButtonBackground,
      color: theme.secondaryButtonText,
      border: `1px solid ${theme.inputBorder}`,
      borderRadius: 14,
      padding: "12px 14px",
      cursor: "pointer",
      fontSize: 16,
      fontWeight: 700,
      minHeight: 60,
    },
    formRow: {
      display: "grid",
      gridTemplateColumns: "1fr 1fr",
      gap: 10,
    },
    formGroup: {
      marginBottom: 12,
    },
    phraseEditorBox: {
      border: `1px solid ${theme.inputBorder}`,
      borderRadius: 8,
      padding: 12,
      background: theme.surfaceAlt,
    },
    infoBox: {
      background: theme.infoBoxBackground,
      padding: 14,
      borderRadius: 8,
      color: theme.textColor,
      lineHeight: 1.7,
      border: `1px solid ${theme.inputBorder}`,
      fontSize: 16,
    },
    readOnlyBox: {
      width: "100%",
      minHeight: 40,
      padding: "10px 12px",
      borderRadius: 8,
      background: theme.inputBackground,
      border: `1px solid ${theme.inputBorder}`,
      color: theme.textColor,
      lineHeight: 1.5,
      whiteSpace: "pre-wrap",
      boxSizing: "border-box",
      fontSize: 16,
    },
    recordingBox: {
      background: theme.surfaceAlt,
      border: `1px solid ${theme.inputBorder}`,
      borderRadius: 8,
      padding: 12,
      marginTop: 8,
    },
    recordingTitle: {
      color: theme.titleColor,
      fontSize: 18,
    },
    recordingText: {
      marginTop: 8,
      marginBottom: 12,
      color: theme.mutedText,
      fontSize: 16,
      lineHeight: 1.55,
    },
    recordingBadge: {
      display: "inline-block",
      background: theme.badgeSuccessBackground,
      color: theme.badgeSuccessText,
      padding: "8px 12px",
      borderRadius: 999,
      fontSize: 16,
      fontWeight: "bold",
      border: `1px solid ${theme.inputBorder}`,
    },
    noRecordingBadge: {
      display: "inline-block",
      background: theme.badgeNeutralBackground,
      color: theme.badgeNeutralText,
      padding: "8px 12px",
      borderRadius: 999,
      fontSize: 16,
      border: `1px solid ${theme.inputBorder}`,
    },
    filterTitle: {
      marginBottom: 10,
      fontWeight: 800,
      color: theme.textColor,
      fontSize: 16,
    },
    emptyText: {
      color: theme.mutedText,
      fontSize: 18,
    },
    categoryGrid: {
      display: "grid",
      gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))",
      gap: 8,
      marginTop: 8,
    },
    categoryCard: {
      background: theme.categoryCardBackground,
      border: `1px solid ${theme.inputBorder}`,
      borderRadius: 12,
      padding: "12px 10px",
      cursor: "pointer",
      display: "flex",
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 10,
      minHeight: 72,
      fontSize: 12,
      transition: "all 0.2s ease",
      color: theme.textColor,
      boxShadow: "inset 0 1px 0 rgba(255,255,255,0.05)",
    },
    categoryCardActive: {
      border: `1px solid ${theme.accentColor}`,
      background: theme.categoryCardActiveBackground,
      boxShadow:
        "0 12px 30px rgba(20, 116, 255, 0.2), inset 0 1px 0 rgba(255,255,255,0.16)",
    },
    categoryEmoji: {
      fontSize: 28,
      lineHeight: 1,
    },
    categoryLabel: {
      fontSize: 15,
      fontWeight: 800,
      textAlign: "center",
      color: theme.textColor,
      lineHeight: 1.15,
    },
    quickPhraseGrid: {
      display: "grid",
      gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
      gap: 10,
      alignItems: "start",
    },
    quickPhraseCard: {
      display: "flex",
      flexDirection: "column",
      gap: 8,
      padding: 8,
      borderRadius: 8,
      background: theme.surfaceAlt,
      border: `1px solid ${theme.inputBorder}`,
      boxShadow: "inset 0 1px 0 rgba(255,255,255,0.045)",
    },
    quickPhraseButton: {
      width: "100%",
      minHeight: 66,
      border: "1px solid rgba(255,255,255,0.12)",
      borderRadius: 10,
      color: "#ffffff",
      fontSize: 16,
      fontWeight: 850,
      lineHeight: 1.15,
      padding: "8px 10px",
      cursor: "pointer",
      boxShadow:
        "0 12px 24px rgba(0,0,0,0.22), inset 0 1px 0 rgba(255,255,255,0.18)",
    },
    quickPhraseActions: {
      display: "flex",
      gap: 6,
      alignItems: "center",
      justifyContent: "space-between",
      flexWrap: "nowrap",
    },
    categoryManagerBox: {
      background: theme.surfaceAlt,
      border: `1px solid ${theme.inputBorder}`,
      borderRadius: 8,
      padding: 14,
    },
    managerTitle: {
      marginTop: 0,
      marginBottom: 8,
      color: theme.titleColor,
      fontSize: 19,
      fontWeight: 800,
    },
    managerText: {
      marginTop: 0,
      marginBottom: 12,
      color: theme.mutedText,
      fontSize: 16,
      lineHeight: 1.55,
    },
    iconPickerGrid: {
      display: "grid",
      gridTemplateColumns: "repeat(6, minmax(0, 1fr))",
      gap: 8,
      marginTop: 8,
    },
    iconButton: {
      background: theme.categoryCardBackground,
      border: `1px solid ${theme.inputBorder}`,
      borderRadius: 12,
      width: "100%",
      aspectRatio: "1 / 1",
      minHeight: 52,
      padding: 0,
      display: "inline-flex",
      alignItems: "center",
      justifyContent: "center",
      fontSize: 24,
      lineHeight: 1,
      textAlign: "center",
      boxSizing: "border-box",
      cursor: "pointer",
      color: theme.textColor,
    },
    iconButtonActive: {
      border: `1px solid ${theme.accentColor}`,
      background: theme.categoryCardActiveBackground,
      boxShadow: "0 10px 20px rgba(0,0,0,0.12)",
    },
    customCategoryList: {
      marginTop: 16,
      display: "flex",
      flexDirection: "column",
      gap: 8,
    },
    customCategoryItem: {
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      gap: 10,
      background: theme.surfaceAlt,
      border: `1px solid ${theme.inputBorder}`,
      borderRadius: 8,
      padding: 12,
    },
    customCategoryInfo: {
      display: "flex",
      alignItems: "center",
      gap: 10,
    },
    customCategoryIcon: {
      fontSize: 28,
    },
    customCategoryName: {
      fontSize: 16,
      fontWeight: 700,
      color: theme.titleColor,
    },
    themePreviewRow: {
      display: "flex",
      gap: 8,
      flexWrap: "wrap",
      marginTop: 10,
    },
    themePreviewChip: {
      padding: "10px 14px",
      borderRadius: 999,
      border: `1px solid ${theme.inputBorder}`,
      background: theme.surfaceAlt,
      color: theme.textColor,
      fontWeight: 700,
      fontSize: 14,
    },
  };
}
