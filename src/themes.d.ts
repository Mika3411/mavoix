import type { Profile, StyleMap } from "./types";

export function getActiveTheme(profile: Profile): Record<string, string>;
export function createStyles(theme: Record<string, string>): StyleMap;
