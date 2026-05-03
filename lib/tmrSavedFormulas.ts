// ================================================================================
// SAVED TMR FORMULAS — separate localStorage layer (does NOT touch concentrate)
// ================================================================================
// Stored under `saved_tmr_formulas` (different key from concentrate's
// `saved_formulas`) so the two calculators stay completely independent.
//
// Same schema shape as SavedFormula, with two additions:
//   • forageDmPct       — the user-set DM split (so loading restores the slider)
//   • achievedForagePct — the actual forage % achieved on save (audit value)
// ================================================================================

import type { TmrFormulaItem } from './tmrCalculations';

const STORAGE_KEY = 'saved_tmr_formulas';

export interface SavedTmrTotals {
  weight: number;       // kg as-fed
  perKgPrice: number;   // Rs / kg
  protein: number;      // % CP on DM basis
  energy: number;       // Mcal/kg DM
  forageDmPct: number;  // achieved forage % on DM basis
}

export interface SavedTmrFormula {
  id: number;
  animalId: string | null;
  animalLabel: string;
  stageIndex: number;
  stageLabel: string;
  /** User-set DM split target at save time, % forage on DM basis. */
  forageDmPct: number;
  /** Selected forage keys at save time (for restoring Step 2). */
  selectedForages: string[];
  /** Selected concentrate keys at save time (for restoring Step 2). */
  selectedConcentrates: string[];
  /** The actual recipe — both forages and concentrates mixed. */
  formula: TmrFormulaItem[];
  totals: SavedTmrTotals;
  /** Concentrate-side ingredient nutrition overrides at save time (used for
   *  conflict detection if the user has since edited them). Forage values
   *  aren't currently editable, so no equivalent for them yet. */
  ingredientOverrides: Record<string, Record<string, number>>;
  date: string;
  timestamp: number;
}

const isBrowser = (): boolean => typeof window !== 'undefined';

function readRaw(): SavedTmrFormula[] {
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

function writeRaw(items: SavedTmrFormula[]): void {
  if (!isBrowser()) return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
}

/** Returns all saved TMRs, newest first. */
export function listSavedTmrFormulas(): SavedTmrFormula[] {
  const items = readRaw();
  return [...items].sort((a, b) => b.timestamp - a.timestamp);
}

/** Persist a new TMR. Generates an id + timestamp + date automatically. */
export function saveTmrFormula(
  data: Omit<SavedTmrFormula, 'id' | 'timestamp' | 'date'>,
): SavedTmrFormula {
  const now = Date.now();
  const entry: SavedTmrFormula = {
    ...data,
    id:        now,
    timestamp: now,
    date:      new Date(now).toLocaleString(),
  };
  const items = readRaw();
  writeRaw([entry, ...items]);
  return entry;
}

/** Remove a TMR by id. Silently no-ops if id is unknown. */
export function deleteSavedTmrFormula(id: number): void {
  const items = readRaw();
  writeRaw(items.filter((f) => f.id !== id));
}
