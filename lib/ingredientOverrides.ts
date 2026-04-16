// ================================================================================
// INGREDIENT NUTRITION OVERRIDES — localStorage-backed persistence
// ================================================================================
// Stores only the fields the user explicitly changed, keyed by ingredient key.
// At read time, callers merge the override on top of the hardcoded default.
// An in-memory cache avoids repeated JSON.parse on every getIngredient() call.
// ================================================================================

import type { Ingredient } from './constants';

const STORAGE_KEY = 'ingredient_overrides';

/**
 * Partial ingredient values — only the fields the user changed.
 * The nutritional fields are the editable subset of `Ingredient`.
 */
export type IngredientOverride = Partial<
  Pick<Ingredient, 'dm' | 'cp' | 'me' | 'tdn' | 'adf' | 'ndf' | 'fat' | 'starch' | 'ca' | 'p' | 'ash' | 'price'>
>;

// ---------------------------------------------------------------------------
// In-memory cache (invalidated on every write)
// ---------------------------------------------------------------------------
let _cache: Record<string, IngredientOverride> | null = null;

const isBrowser = (): boolean => typeof window !== 'undefined';

function readAll(): Record<string, IngredientOverride> {
  if (_cache) return _cache;
  if (!isBrowser()) return {};
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    _cache = typeof parsed === 'object' && parsed !== null ? parsed : {};
    return _cache!;
  } catch {
    return {};
  }
}

function writeAll(data: Record<string, IngredientOverride>): void {
  _cache = data;
  if (!isBrowser()) return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch (err) {
    console.error('Failed to persist ingredient overrides:', err);
  }
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/** Get the override for a single ingredient (or null if none). */
export function getOverride(key: string): IngredientOverride | null {
  const all = readAll();
  return all[key] ?? null;
}

/** Check whether an ingredient has user overrides. */
export function hasOverride(key: string): boolean {
  const all = readAll();
  return key in all && Object.keys(all[key]).length > 0;
}

/**
 * Save an override for one ingredient. Only stores fields that differ from
 * the provided `defaults` — keeps localStorage sparse.
 */
export function saveOverride(
  key: string,
  values: IngredientOverride,
  defaults: IngredientOverride
): void {
  const all = readAll();
  const sparse: IngredientOverride = {};
  for (const [field, val] of Object.entries(values)) {
    const defVal = defaults[field as keyof IngredientOverride];
    if (val !== defVal) {
      (sparse as any)[field] = val;
    }
  }
  if (Object.keys(sparse).length > 0) {
    all[key] = sparse;
  } else {
    delete all[key]; // all values match defaults → no override needed
  }
  writeAll({ ...all });
}

/** Remove all overrides for a single ingredient (reset to default). */
export function removeOverride(key: string): void {
  const all = readAll();
  delete all[key];
  writeAll({ ...all });
}

/** Wipe ALL ingredient overrides (global reset). */
export function clearAllOverrides(): void {
  writeAll({});
}

/** Invalidate the in-memory cache (e.g. if another tab changed localStorage). */
export function invalidateCache(): void {
  _cache = null;
}
