// ================================================================================
// CUSTOM INGREDIENTS — user-defined feed ingredients
// ================================================================================
//
// Persists in `localStorage` under `custom_ingredients` as a JSON array of
// `Ingredient` objects (same shape as the built-in registry in `constants.ts`).
//
// Read/write semantics:
//   • Reads always go through `getCustomIngredients()` so the rest of the app
//     can call it safely from anywhere (server-render, before mount, etc.).
//   • The store falls back to an empty array if localStorage is unavailable
//     (Node, SSR) or if the saved JSON is malformed.
//   • `saveCustomIngredient` is upsert by key — saving a key that already
//     exists replaces the previous record.
//
// Custom ingredients participate in every downstream calculation (DM-basis
// math, LP solver, diagnostics) by virtue of `getIngredient(key)` falling
// back to this store after the built-in registry. See `lib/constants.ts`.
// ================================================================================

import type { Ingredient } from './constants';

const STORAGE_KEY = 'custom_ingredients';

/**
 * Read every custom ingredient currently in localStorage. Returns `[]` if the
 * store is empty, missing, or malformed — never throws.
 */
export function getCustomIngredients(): Ingredient[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    // Defensive — strip any items that don't have the bare-minimum shape
    return parsed.filter(
      (i): i is Ingredient =>
        i && typeof i.key === 'string' && typeof i.category === 'string'
    );
  } catch {
    return [];
  }
}

/** Look up a single custom ingredient by key. Returns undefined if not found. */
export function getCustomIngredient(key: string): Ingredient | undefined {
  return getCustomIngredients().find((i) => i.key === key);
}

/** Returns true if the given key was created by the user (not a built-in). */
export function isCustomIngredient(key: string): boolean {
  return getCustomIngredient(key) !== undefined;
}

/**
 * Add or replace a custom ingredient. Upserts by `key` — if the key already
 * exists in the store, the existing record is overwritten.
 */
export function saveCustomIngredient(ing: Ingredient): void {
  if (typeof window === 'undefined') return;
  const others = getCustomIngredients().filter((i) => i.key !== ing.key);
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify([...others, ing]));
}

/** Remove a custom ingredient by key. Silently no-ops if the key isn't found. */
export function removeCustomIngredient(key: string): void {
  if (typeof window === 'undefined') return;
  const next = getCustomIngredients().filter((i) => i.key !== key);
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
}

/**
 * Generate a unique snake_case key from a name, suffixing a number if needed
 * to avoid collisions with both built-in and existing custom ingredients.
 */
export function generateUniqueKey(
  name: string,
  takenKeys: Set<string>,
): string {
  const base =
    name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '_')
      .replace(/^_|_$/g, '')
      .slice(0, 32) || 'custom';

  if (!takenKeys.has(base)) return base;
  let n = 2;
  while (takenKeys.has(`${base}_${n}`)) n += 1;
  return `${base}_${n}`;
}
