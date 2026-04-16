// ================================================================================
// SAVED FORMULAS — localStorage-backed persistence layer
// ================================================================================
// Stored under one key (`saved_formulas`) as a JSON array, newest first.
// Schema is forward/backward-compatible: missing fields fall back to safe defaults
// so older saves (without animalId / stageIndex / chosenIngredients) still load.
// ================================================================================

import type { FormulaItem } from './calculations';
import { ANIMALS, INGREDIENT_CATEGORIES } from './constants';

const STORAGE_KEY = 'saved_formulas';

export interface SavedFormulaTotals {
  weight: number;        // kg as-fed
  perKgPrice: number;    // Rs / kg
  protein: number;       // % CP on DM basis
  energy: number;        // Mcal/kg DM
}

export interface SavedFormula {
  id: number;                                     // unique, used for delete
  animalId: string | null;                        // 'dairy_cow' etc — used to restore state
  animalLabel: string;                            // 'Dairy Cow' — display
  stageIndex: number;                             // 0..n
  stageLabel: string;                             // 'Early Lactation (0–100 days)' — display
  chosenIngredients: Record<string, string[]>;    // by category — used to restore Step 2
  formula: FormulaItem[];                         // the actual recipe
  totals: SavedFormulaTotals;                     // pre-computed at save time for the list view
  /** Ingredient nutrition overrides that were active when this formula was saved.
   *  Used to detect conflicts on load (user may have changed/reset values since). */
  ingredientOverrides: Record<string, Record<string, number>>;
  date: string;                                   // human-friendly date
  timestamp: number;                              // for sorting
}

// ---- helpers ----------------------------------------------------------------

const isBrowser = (): boolean => typeof window !== 'undefined';

function readRaw(): SavedFormula[] {
  if (!isBrowser()) return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeRaw(items: SavedFormula[]): void {
  if (!isBrowser()) return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  } catch (err) {
    console.error('Failed to persist saved formulas:', err);
  }
}

/**
 * Reverse-lookup an animal ID from a display label stored by older saves.
 * e.g. "Dairy Cow" → "dairy_cow",  "Fattening Bull" → "fattening_bull"
 */
function reverseAnimalId(label: string): string | null {
  if (!label) return null;
  const lower = label.toLowerCase().trim();
  // Try exact match on labelEn (lowercased)
  const exact = ANIMALS.find((a) => a.labelEn.toLowerCase() === lower);
  if (exact) return exact.id;
  // Try contains match (old saves may have different casing)
  const partial = ANIMALS.find((a) => lower.includes(a.id.replace(/_/g, ' ')));
  return partial?.id ?? null;
}

/**
 * Reconstruct chosenIngredients from a formula's keys if the saved entry
 * doesn't have them (old schema).
 */
function reconstructChosenIngredients(
  formula: FormulaItem[]
): Record<string, string[]> {
  const chosen: Record<string, string[]> = { energy: [], protein: [], fiber: [], fat: [] };
  for (const item of formula) {
    for (const [catKey, cat] of Object.entries(INGREDIENT_CATEGORIES)) {
      if (cat.ingredients.includes(item.key)) {
        if (!chosen[catKey].includes(item.key)) {
          chosen[catKey].push(item.key);
        }
        break;
      }
    }
  }
  return chosen;
}

/**
 * Coerce stored objects to the current shape.
 * Handles both the old schema (animal/stage strings, no chosenIngredients)
 * and the new schema (animalId, stageIndex, chosenIngredients).
 */
function normalise(raw: any): SavedFormula {
  const formula: FormulaItem[] = Array.isArray(raw?.formula) ? raw.formula : [];

  // --- animalId: prefer new field, fall back to reverse-lookup from old label ---
  const animalId = raw?.animalId ?? reverseAnimalId(raw?.animal ?? raw?.animalLabel ?? '') ?? null;

  // --- chosenIngredients: prefer new field, reconstruct from formula if missing ---
  const hasChosenIngredients =
    raw?.chosenIngredients &&
    Object.values(raw.chosenIngredients).some((arr: any) => Array.isArray(arr) && arr.length > 0);
  const chosenIngredients = hasChosenIngredients
    ? raw.chosenIngredients
    : reconstructChosenIngredients(formula);

  return {
    id:                raw?.id ?? Date.now(),
    animalId,
    animalLabel:       raw?.animalLabel ?? raw?.animal ?? 'Unknown',
    stageIndex:        Number.isFinite(raw?.stageIndex) ? raw.stageIndex : Number(raw?.stage) || 0,
    stageLabel:        raw?.stageLabel ?? (raw?.stage != null ? `Stage ${raw.stage}` : ''),
    chosenIngredients,
    formula,
    totals: {
      weight:     raw?.totals?.weight     ?? 0,
      perKgPrice: raw?.totals?.perKgPrice ?? 0,
      protein:    raw?.totals?.protein    ?? 0,
      energy:     raw?.totals?.energy     ?? 0,
    },
    ingredientOverrides: raw?.ingredientOverrides ?? {},
    date:      raw?.date ?? new Date().toLocaleDateString(),
    timestamp: raw?.timestamp ?? Date.now(),
  };
}

// ---- public API -------------------------------------------------------------

/** Return all saved formulas, newest first. */
export function listSavedFormulas(): SavedFormula[] {
  return readRaw().map(normalise).sort((a, b) => b.timestamp - a.timestamp);
}

/** Persist a new formula (auto-fills id, date, timestamp). Returns the saved entry. */
export function saveFormula(
  entry: Omit<SavedFormula, 'id' | 'date' | 'timestamp'>
): SavedFormula {
  const now = Date.now();
  const full: SavedFormula = {
    ...entry,
    id:        now,
    date:      new Date().toLocaleDateString(),
    timestamp: now,
  };
  const all = readRaw().map(normalise);
  all.unshift(full);
  writeRaw(all);
  return full;
}

/** Remove a formula by id. */
export function deleteSavedFormula(id: number): void {
  const all = readRaw().map(normalise).filter((f) => f.id !== id);
  writeRaw(all);
}

/** Wipe all saved formulas. */
export function clearAllSavedFormulas(): void {
  writeRaw([]);
}
