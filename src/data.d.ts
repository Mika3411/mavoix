import type { Category, Profile } from "./types";

export const AVAILABLE_ICONS: string[];
export const DEFAULT_CATEGORIES: Category[];
export function createProfile(name?: string): Profile;
export function generateId(): string;
export function getCategoryBackground(categoryName: string): string;
export function readJSON<T = unknown>(key: string, fallback?: T | null): T | null;
