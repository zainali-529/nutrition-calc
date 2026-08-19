'use client';

import { AnimatePresence, motion } from 'framer-motion';
import {
  INGREDIENT_CATEGORIES,
  getIngredient,
  getIngredientIcon,
  getCategoryIngredientKeys,
  getNutritionRange,
} from '@/lib/constants';
import { isCustomIngredient, removeCustomIngredient } from '@/lib/customIngredients';
import { Button } from '@/components/ui/button';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertTriangle, CheckCircle2, ChevronRight, ClipboardCheck, Info, Plus,
  SkipForward, Sparkles, Trash2,
} from 'lucide-react';
import { toast } from 'sonner';
import { IngredientDetailModal } from './IngredientDetailModal';
import { AddIngredientModal } from './AddIngredientModal';
import {
  autoFormulate,
  type IngredientFix,
  type InfeasibilityAnalysis,
  type NutrientGap,
} from '@/lib/autoFormulate';

interface Step2IngredientsProps {
  language: 'en' | 'ur';
  chosenIngredients: Record<string, string[]>;
  /** From Step 1 — needed to run a live LP feasibility check on the current selection. */
  selectedAnimal: string | null;
  /** From Step 1 — needed to look up the nutrient range for the LP. */
  selectedStage: number;
  onIngredientToggle: (category: string, ingredient: string) => void;
  onNext: () => void;
  onBack: () => void;
  /** When true, the per-category minimums no longer gate the Next button. */
  skipValidation: boolean;
  onSkipValidationChange: (v: boolean) => void;
}

/**
 * Live feasibility status of the current ingredient selection.
 *
 *  pending     — user hasn't met the per-category minimums yet (1 energy + 1 protein),
 *                so it's too early to run the LP. Show a neutral "keep picking" hint.
 *  no_targets  — Step 1 wasn't completed, so we have no nutrient ranges to test against.
 *  feasible    — the LP succeeded; the selected ingredients CAN meet every target.
 *  infeasible  — LP failed; surface the bottleneck so the user knows what to add.
 */
type FeasibilityStatus =
  | { kind: 'pending'; missingCategories: string[] }
  | { kind: 'no_targets' }
  | { kind: 'feasible' }
  | { kind: 'infeasible'; analysis?: InfeasibilityAnalysis };

/**
 * Bilingual display data per nutrient — labels, units, and a short imperative
 * verb used in the "what to do" line. Keys mirror the LP's range-key set.
 */
const NUTRIENT_INFO: Record<
  string,
  { en: string; ur: string; unit: string; raise: { en: string; ur: string }; lower: { en: string; ur: string } }
> = {
  protein:    { en: 'Protein',    ur: 'پروٹین',  unit: '%',         raise: { en: 'add a high-protein ingredient',     ur: 'پروٹین والا جزو شامل کریں'    }, lower: { en: 'reduce a protein-heavy ingredient',  ur: 'پروٹین والا جزو کم کریں'   } },
  energy:     { en: 'Energy',     ur: 'توانائی', unit: ' Mcal/kg',  raise: { en: 'add a high-energy ingredient',      ur: 'توانائی والا جزو شامل کریں'    }, lower: { en: 'reduce an energy-dense ingredient',  ur: 'توانائی والا جزو کم کریں'  } },
  tdn:        { en: 'TDN',        ur: 'TDN',     unit: '%',         raise: { en: 'add a grain (corn, wheat, barley)', ur: 'کوئی دانہ شامل کریں (مکئی، گندم)' }, lower: { en: 'cut down on grains',                 ur: 'دانے کم کریں'              } },
  fiber:      { en: 'Fiber',      ur: 'فائبر',   unit: '%',         raise: { en: 'add a bran (wheat bran, rice bran)', ur: 'چوکر شامل کریں'              }, lower: { en: 'reduce wheat bran or PKC',           ur: 'چوکر یا PKC کم کریں'      } },
  fat:        { en: 'Fat',        ur: 'چکنائی',  unit: '%',         raise: { en: 'add bypass fat or oilcake',         ur: 'بائی پاس فیٹ شامل کریں'      }, lower: { en: 'reduce bypass fat / cottonseed',     ur: 'بائی پاس فیٹ کم کریں'      } },
  calcium:    { en: 'Calcium',    ur: 'کیلشیم',  unit: '%',         raise: { en: 'add limestone',                     ur: 'چونا پتھر شامل کریں'         }, lower: { en: 'reduce limestone or sesame cake',    ur: 'چونا پتھر یا تل کھل کم کریں' } },
  phosphorus: { en: 'Phosphorus', ur: 'فاسفورس', unit: '%',         raise: { en: 'add DCP or wheat bran',             ur: 'DCP یا چوکر شامل کریں'        }, lower: { en: 'reduce wheat bran or DCP',           ur: 'چوکر یا DCP کم کریں'       } },
};

/**
 * How generously an ingredient can be used, derived from its `maxInclusion`.
 *
 * This is the single most useful safety signal we can put on a card: a farmer
 * scanning the grid needs to know at a glance that wheat bran can make up a
 * third of the mix while salt must stay under 1%. Deriving it from the existing
 * cap means it can never drift out of sync with the LP's actual constraint.
 */
function usageTier(maxInclusion: number) {
  if (maxInclusion >= 25) {
    return {
      key: 'free' as const,
      en: 'Use freely', ur: 'کھل کر استعمال',
      chip: 'bg-emerald-50 text-emerald-700 border-emerald-200',
      icon: '👍',
    };
  }
  if (maxInclusion >= 5) {
    return {
      key: 'medium' as const,
      en: 'Medium amount', ur: 'درمیانی مقدار',
      chip: 'bg-amber-50 text-amber-800 border-amber-200',
      icon: '⚖️',
    };
  }
  return {
    key: 'small' as const,
    en: 'Small amount only', ur: 'تھوڑی مقدار',
    chip: 'bg-rose-50 text-rose-700 border-rose-200',
    icon: '⚠️',
  };
}

/**
 * Modern minimalist nutrient badge row showing real values (P: x%, E: x.xx, F: x%)
 * with dynamic intensity background styling (high = emerald/amber, med = balanced, low = muted).
 */
function NutrientBadges({
  cp,
  me,
  ndf,
  fat,
  ca,
  p,
  category,
}: {
  cp: number;
  me: number;
  ndf: number;
  fat: number;
  ca: number;
  p: number;
  category?: string;
}) {
  // If it's a mineral / supplement
  if (category === 'supplement') {
    return (
      <div className="flex items-center gap-1 flex-wrap justify-center my-0.5">
        {ca > 0 && (
          <span className="inline-flex items-center text-[10px] font-mono font-bold px-1.5 py-0.5 rounded-md border bg-red-50 text-red-800 border-red-200">
            Ca: {ca}%
          </span>
        )}
        {p > 0 && (
          <span className="inline-flex items-center text-[10px] font-mono font-bold px-1.5 py-0.5 rounded-md border bg-blue-50 text-blue-800 border-blue-200">
            P: {p}%
          </span>
        )}
        {ca === 0 && p === 0 && (
          <span className="inline-flex items-center text-[10px] font-mono font-semibold px-1.5 py-0.5 rounded-md border bg-slate-50 text-slate-500 border-slate-200">
            Mineral
          </span>
        )}
      </div>
    );
  }

  // If it's pure fat / bypass fat
  if (category === 'fat' || (fat >= 50 && cp === 0)) {
    return (
      <div className="flex items-center gap-1 flex-wrap justify-center my-0.5">
        <span className="inline-flex items-center text-[10px] font-mono font-bold px-1.5 py-0.5 rounded-md border bg-amber-100 text-amber-900 border-amber-300">
          Fat: {fat}%
        </span>
        <span className="inline-flex items-center text-[10px] font-mono font-bold px-1.5 py-0.5 rounded-md border bg-amber-50 text-amber-800 border-amber-200">
          E: {me.toFixed(2)}
        </span>
      </div>
    );
  }

  // Standard ingredients (Grains, Brans, Oilcakes, Forages)
  // Dynamic Protein (P) design
  const pStyle =
    cp >= 22
      ? 'bg-emerald-100 text-emerald-900 border-emerald-300 font-bold'
      : cp >= 12
        ? 'bg-emerald-50 text-emerald-800 border-emerald-200 font-semibold'
        : 'bg-slate-50 text-slate-400 border-slate-200 font-medium';

  // Dynamic Energy (E) design
  const eStyle =
    me >= 2.85
      ? 'bg-amber-100 text-amber-900 border-amber-300 font-bold'
      : me >= 2.2
        ? 'bg-amber-50 text-amber-800 border-amber-200 font-semibold'
        : 'bg-slate-50 text-slate-400 border-slate-200 font-medium';

  // Dynamic Fiber (F) design
  const fStyle =
    ndf >= 35
      ? 'bg-green-100 text-green-900 border-green-300 font-bold'
      : ndf >= 15
        ? 'bg-slate-100 text-slate-700 border-slate-200 font-semibold'
        : 'bg-slate-50 text-slate-400 border-slate-200 font-medium';

  return (
    <div className="flex items-center gap-1 flex-wrap justify-center my-0.5">
      <span
        title={`Crude Protein: ${cp}%`}
        className={`inline-flex items-center text-[10px] font-mono px-1.5 py-0.5 rounded-md border leading-none transition-colors ${pStyle}`}
      >
        P: {cp.toFixed(0)}%
      </span>
      <span
        title={`Energy (ME): ${me.toFixed(2)} Mcal/kg`}
        className={`inline-flex items-center text-[10px] font-mono px-1.5 py-0.5 rounded-md border leading-none transition-colors ${eStyle}`}
      >
        E: {me.toFixed(2)}
      </span>
      <span
        title={`Fiber (NDF): ${ndf}%`}
        className={`inline-flex items-center text-[10px] font-mono px-1.5 py-0.5 rounded-md border leading-none transition-colors ${fStyle}`}
      >
        F: {ndf.toFixed(0)}%
      </span>
    </div>
  );
}

interface IngredientCardProps {
  id: string;
  name: string;
  language: 'en' | 'ur';
  cp: number;
  me: number;
  ndf: number;
  fat: number;
  ca: number;
  p: number;
  category?: string;
  maxInclusion: number;
  isSelected: boolean;
  /** True if this is a user-added (custom) ingredient — gets a "Custom" pill + delete control. */
  isCustom?: boolean;
  /**
   * True when the solver says adding THIS ingredient fixes the current
   * selection. Gets a prominent emerald treatment so the eye lands on it.
   */
  isRecommended?: boolean;
  onSelect: () => void;
  onInfo: () => void;
  /** Only invoked for custom ingredients (the parent passes this only when isCustom is true). */
  onDelete?: () => void;
}

function IngredientCard({
  id,
  name,
  language,
  cp,
  me,
  ndf,
  fat,
  ca,
  p,
  category,
  maxInclusion,
  isSelected,
  isCustom = false,
  isRecommended = false,
  onSelect,
  onInfo,
  onDelete,
}: IngredientCardProps) {
  const tier = usageTier(maxInclusion);

  // Selected wins over recommended — once it's in, the ring shouldn't keep
  // shouting "add me". Recommended only styles UNselected cards.
  const showRecommended = isRecommended && !isSelected;

  return (
    <motion.div
      whileHover={{ y: -3 }}
      animate={showRecommended ? { scale: [1, 1.015, 1] } : { scale: 1 }}
      transition={showRecommended ? { duration: 1.8, repeat: Infinity, ease: 'easeInOut' } : undefined}
      className={`relative rounded-2xl border-2 transition-all flex flex-col items-center text-center cursor-pointer group ${
        isSelected
          ? 'border-[#558b2f] bg-[#f4f8ee] shadow-sm ring-1 ring-[#558b2f]/50'
          : showRecommended
            ? 'border-[#558b2f] bg-gradient-to-b from-[#f4f8ee] to-white shadow-md ring-2 ring-[#558b2f]/30'
            : isCustom
              ? 'border-purple-200 bg-purple-50/40 hover:border-purple-400'
              : 'border-slate-200 bg-white hover:border-[#0e3b5e]/40 hover:shadow-sm'
      }`}
    >
      {/* Top-right action buttons */}
      <div className="absolute top-1.5 right-1.5 z-10 flex gap-1 touch-reveal">
        {isCustom && onDelete && (
          <motion.button
            onClick={(e) => {
              e.stopPropagation();
              onDelete();
            }}
            whileTap={{ scale: 0.92 }}
            className="p-1.5 bg-red-100 hover:bg-red-200 text-red-600 rounded-full shadow-xs tap-transparent"
            title="Delete custom ingredient"
            aria-label="Delete custom ingredient"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </motion.button>
        )}
        <motion.button
          onClick={(e) => {
            e.stopPropagation();
            onInfo();
          }}
          whileTap={{ scale: 0.92 }}
          className="p-1.5 bg-blue-50 hover:bg-blue-100 text-blue-600 rounded-full shadow-xs tap-transparent"
          title="View details"
          aria-label="View details"
        >
          <Info className="w-3.5 h-3.5" />
        </motion.button>
      </div>

      {/* Corner ribbons — "Custom" (author) and "Recommended" (solver) */}
      {isCustom && (
        <span className="absolute top-1.5 left-1.5 z-10 text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-purple-100 text-purple-700 border border-purple-200">
          {language === 'en' ? 'Custom' : 'اپنا'}
        </span>
      )}
      {showRecommended && !isCustom && (
        <motion.span
          initial={{ scale: 0.7, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="absolute -top-2.5 left-1/2 -translate-x-1/2 z-10 inline-flex items-center gap-1 text-[9px] font-extrabold px-2.5 py-0.5 rounded-full bg-[#558b2f] text-white shadow-md whitespace-nowrap"
        >
          <Sparkles className="w-2.5 h-2.5" />
          {language === 'en' ? 'ADD THIS' : 'یہ شامل کریں'}
        </motion.span>
      )}

      {/* Main tap target */}
      <motion.button
        onClick={onSelect}
        whileTap={{ scale: 0.97 }}
        className="w-full flex flex-col items-center gap-1.5 px-2.5 pt-4 pb-3 tap-transparent"
      >
        <span className="text-3xl sm:text-4xl leading-none group-hover:scale-105 transition-transform">
          {getIngredientIcon(id)}
        </span>

        <span className={`text-[13px] sm:text-sm font-bold leading-tight ${isSelected ? 'text-[#0e3b5e]' : 'text-slate-900'}`}>
          {name}
        </span>

        {/* Real nutrient value badges (P: x%, E: x.xx, F: x%) */}
        <NutrientBadges
          cp={cp}
          me={me}
          ndf={ndf}
          fat={fat}
          ca={ca}
          p={p}
          category={category}
        />

        {/* How much may be used safety tier pill */}
        <span className={`inline-flex items-center gap-1 text-[9px] font-semibold px-2 py-0.5 rounded-full border ${tier.chip}`}>
          <span aria-hidden>{tier.icon}</span>
          {language === 'en' ? tier.en : tier.ur}
          <span className="opacity-65">≤{maxInclusion}%</span>
        </span>

        {isSelected && (
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="mt-0.5 w-5 h-5 rounded-full bg-[#558b2f] text-white flex items-center justify-center text-xs font-extrabold shadow-xs"
          >
            ✓
          </motion.div>
        )}
      </motion.button>
    </motion.div>
  );
}

function IngredientGroup({
  title,
  language,
  ingredients,
  selected,
  minRequired,
  recommendedKeys,
  onToggle,
  onIngredientInfo,
  onIngredientDelete,
}: {
  title: string;
  language: 'en' | 'ur';
  ingredients: string[];
  selected: string[];
  minRequired: number;
  /** Keys the solver says would fix the current selection — get the ADD THIS treatment. */
  recommendedKeys: Set<string>;
  onToggle: (ingredient: string) => void;
  onIngredientInfo: (ingredientKey: string) => void;
  /** Invoked when the user clicks the trash icon on a custom-ingredient card. */
  onIngredientDelete: (ingredientKey: string) => void;
}) {
  const isValid = selected.length >= minRequired;
  const needed = Math.max(0, minRequired - selected.length);

  // Plain-language section status. "Need at least 1" told the user nothing about
  // whether they'd done it; this states the requirement AND the current count.
  const status = (() => {
    if (minRequired === 0) {
      return selected.length > 0
        ? (language === 'en' ? `${selected.length} chosen` : `${selected.length} منتخب`)
        : (language === 'en' ? 'Optional' : 'اختیاری');
    }
    if (isValid) {
      return language === 'en' ? `✓ ${selected.length} chosen` : `✓ ${selected.length} منتخب`;
    }
    return language === 'en'
      ? `Pick ${needed} more`
      : `${needed} اور منتخب کریں`;
  })();

  const statusStyle = minRequired === 0
    ? (selected.length > 0 ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500')
    : (isValid ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-800');

  // Count of solver-recommended items sitting in this section, so the user knows
  // to look here even before scrolling to the highlighted card.
  const recoHere = ingredients.filter((k) => recommendedKeys.has(k)).length;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-3"
    >
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <h3 className="text-lg font-bold flex items-center gap-2">
          {title}
          {recoHere > 0 && (
            <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-600 text-white">
              <Sparkles className="w-2.5 h-2.5" />
              {recoHere} {language === 'en' ? 'suggested' : 'تجویز'}
            </span>
          )}
        </h3>
        <span className={`text-xs font-semibold px-3 py-1 rounded-full ${statusStyle}`}>
          {status}
          {minRequired > 0 && !isValid && (
            <span className="ml-1 font-normal opacity-70">
              ({language === 'en' ? `min ${minRequired}` : `کم از کم ${minRequired}`})
            </span>
          )}
        </span>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 sm:gap-3">
        {ingredients.map((ingredientKey) => {
          const data = getIngredient(ingredientKey);
          if (!data) return null;
          const custom = isCustomIngredient(ingredientKey);

          return (
            <IngredientCard
              key={ingredientKey}
              id={ingredientKey}
              name={data[language === 'en' ? 'nameEn' : 'nameUr']}
              language={language}
              cp={data.cp}
              me={data.me}
              ndf={data.ndf}
              fat={data.fat}
              ca={data.ca}
              p={data.p}
              category={data.category}
              maxInclusion={data.maxInclusion}
              isSelected={selected.includes(ingredientKey)}
              isCustom={custom}
              isRecommended={recommendedKeys.has(ingredientKey)}
              onSelect={() => onToggle(ingredientKey)}
              onInfo={() => onIngredientInfo(ingredientKey)}
              onDelete={custom ? () => onIngredientDelete(ingredientKey) : undefined}
            />
          );
        })}
      </div>
    </motion.div>
  );
}

/**
 * Format a NutrientGap value with its appropriate unit (% for most, Mcal/kg for energy).
 * Numbers are rounded to one decimal, since farmers don't need solver-level precision.
 */
function formatGapValue(gap: NutrientGap): string {
  const info = NUTRIENT_INFO[gap.nutrient];
  return `${gap.achievable.toFixed(1)}${info?.unit ?? ''}`;
}

function formatGapTarget(gap: NutrientGap): string {
  const info = NUTRIENT_INFO[gap.nutrient];
  const op = gap.direction === 'too_low' ? '≥' : '≤';
  return `${op} ${gap.required}${info?.unit ?? ''}`;
}

/** Plain-language name for each Step 2 section, used in the fix chips. */
const CATEGORY_LABEL: Record<string, { en: string; ur: string; icon: string }> = {
  energy:     { en: 'Energy',     ur: 'توانائی',   icon: '🌾' },
  protein:    { en: 'Protein',    ur: 'پروٹین',    icon: '🫘' },
  fiber:      { en: 'Fiber',      ur: 'فائبر',      icon: '🟫' },
  fat:        { en: 'Fat / Oil',  ur: 'چکنائی',     icon: '🛢️' },
  supplement: { en: 'Mineral',    ur: 'معدنیات',    icon: '💊' },
};

/**
 * One tappable "add this ingredient" chip.
 *
 * This is the core of the guidance rewrite. Instead of telling the farmer to
 * "pick an ingredient strong in the nutrient you are missing" — which assumes
 * they can read a nutrient table — we name the ingredient, show its picture,
 * say which section it lives in, and let them add it with a single tap.
 */
function FixChip({
  fix,
  language,
  onAdd,
}: {
  fix: IngredientFix;
  language: 'en' | 'ur';
  onAdd: () => void;
}) {
  const ing = getIngredient(fix.key);
  if (!ing) return null;

  const cat = CATEGORY_LABEL[fix.category] ?? { en: fix.category, ur: fix.category, icon: '🌾' };
  const catName = language === 'en' ? cat.en : cat.ur;
  const solves = fix.kind === 'exact_fix';

  // For 'helps' chips, say WHAT it does in the simplest possible terms.
  const effect = (() => {
    if (solves) return null;
    const info = NUTRIENT_INFO[fix.nutrient ?? ''];
    if (!info) return null;
    const nutrientName = language === 'en' ? info.en : info.ur;
    if (fix.direction === 'too_low') {
      return language === 'en' ? `more ${nutrientName}` : `${nutrientName} بڑھائے`;
    }
    return language === 'en' ? `less ${nutrientName}` : `${nutrientName} گھٹائے`;
  })();

  return (
    <motion.button
      onClick={onAdd}
      whileHover={{ y: -2 }}
      whileTap={{ scale: 0.97 }}
      className={`group flex items-center gap-2.5 rounded-xl border-2 bg-white px-3 py-2.5 text-left shadow-sm transition-all tap-transparent ${
        solves
          ? 'border-emerald-400 hover:border-emerald-600 hover:shadow-md'
          : 'border-slate-200 hover:border-emerald-400 hover:shadow-md'
      }`}
    >
      <span className="text-2xl leading-none flex-shrink-0">{ing.icon}</span>

      <span className="min-w-0 flex-1">
        <span className="block text-[13px] font-bold text-slate-900 leading-tight truncate">
          {language === 'en' ? ing.nameEn : ing.nameUr}
        </span>
        <span className="mt-0.5 flex items-center gap-1.5 flex-wrap">
          <span className="inline-flex items-center gap-0.5 text-[10px] font-semibold text-slate-600">
            <span aria-hidden>{cat.icon}</span>
            {catName}
          </span>
          {effect && (
            <span className="text-[10px] font-semibold text-emerald-700">
              · {effect}
            </span>
          )}
          {solves && fix.perKgPrice !== undefined && (
            <span className="text-[10px] font-medium text-slate-500">
              · ₨{Math.round(fix.perKgPrice)}/kg
            </span>
          )}
        </span>
      </span>

      {/* The affordance: a plus button that reads as "tap to add" */}
      <span
        className={`flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center transition-colors ${
          solves
            ? 'bg-emerald-600 text-white group-hover:bg-emerald-700'
            : 'bg-slate-100 text-slate-600 group-hover:bg-emerald-600 group-hover:text-white'
        }`}
        aria-hidden
      >
        <Plus className="w-4 h-4" />
      </span>
    </motion.button>
  );
}

/**
 * Inline guidance panel rendered above and below the ingredient grid in Step 2.
 *
 * Reflects the current LP-feasibility status of the user's selection. Two
 * visual variants:
 *   • full    — bordered card. For 'infeasible', renders the structured
 *               diagnosis as grouped "Need to lower" / "Need to raise"
 *               sections with a single concrete Quick-fix recommendation.
 *   • compact — slim status bar that sits right above the Next button.
 *
 * Designed for non-technical farmers — no LP jargon, no "min achievable ≈"
 * style phrasing. Numbers carry units (% or Mcal/kg) and each gap shows a
 * suggested action verb localised per nutrient.
 */
function FeasibilityGuide({
  language,
  status,
  compact = false,
  onAddIngredient,
}: {
  language: 'en' | 'ur';
  status: FeasibilityStatus;
  compact?: boolean;
  /** Adds a suggested ingredient straight from a fix chip. */
  onAddIngredient?: (category: string, key: string) => void;
}) {
  // Don't render the compact variant before Step 1 is done — the top card
  // already shows the "pick an animal first" hint, no need to duplicate.
  if (compact && status.kind === 'no_targets') return null;

  const palette =
    status.kind === 'feasible'
      ? { bg: 'bg-emerald-50', border: 'border-emerald-300', text: 'text-emerald-900', icon: 'text-emerald-600', accent: 'bg-emerald-100' }
      : status.kind === 'infeasible'
        ? { bg: 'bg-amber-50', border: 'border-amber-300', text: 'text-amber-900', icon: 'text-amber-600', accent: 'bg-white/70' }
        : { bg: 'bg-slate-50', border: 'border-slate-200', text: 'text-slate-700', icon: 'text-slate-500', accent: 'bg-white/70' };

  const Icon =
    status.kind === 'feasible' ? CheckCircle2 :
    status.kind === 'infeasible' ? AlertTriangle :
    status.kind === 'no_targets' ? Info :
    Sparkles;

  // Localised top-level title for every state. For the infeasible case the
  // headline states the ACTION, not the problem — "Add one more ingredient"
  // tells the farmer what to do; "Adjust your selection" does not.
  const title = (() => {
    if (status.kind === 'feasible')   return language === 'en' ? "Looks good — you're ready" : 'سب ٹھیک ہے — آپ تیار ہیں';
    if (status.kind === 'no_targets') return language === 'en' ? 'Pick an animal and stage first' : 'پہلے جانور اور مرحلہ منتخب کریں';
    if (status.kind === 'pending')    return language === 'en' ? 'Keep selecting'   : 'منتخب کرتے رہیں';
    const oneTapFixes = status.analysis?.fixes.some((f) => f.kind === 'exact_fix');
    if (oneTapFixes) return language === 'en' ? 'Add one more ingredient' : 'ایک اور جزو شامل کریں';
    return language === 'en' ? 'Add a few more ingredients' : 'مزید اجزاء شامل کریں';
  })();

  // Subtitle for non-infeasible states (the infeasible state renders a richer body).
  const subtitle = (() => {
    if (status.kind === 'feasible') {
      return language === 'en'
        ? 'Your ingredients can meet every nutrient target. Tap Next to formulate.'
        : 'آپ کے اجزاء تمام غذائی اہداف پورا کر سکتے ہیں۔ آگے بڑھنے کے لیے Next دبائیں۔';
    }
    if (status.kind === 'no_targets') {
      return language === 'en'
        ? "Without a target range we can't check if your selection is enough."
        : 'ہدف کی غیر موجودگی میں جانچ ممکن نہیں۔';
    }
    if (status.kind === 'pending') {
      // Name the exact sections and how many are still needed, e.g.
      // "Choose 1 from Energy Sources and 1 from Protein Sources."
      const parts = status.missingCategories.map((k) => {
        const cat = INGREDIENT_CATEGORIES[k as keyof typeof INGREDIENT_CATEGORIES];
        const name = cat?.[language === 'en' ? 'titleEn' : 'titleUr'] ?? k;
        return language === 'en' ? `${cat?.min ?? 1} from ${name}` : `${name} سے ${cat?.min ?? 1}`;
      });
      const list = parts.join(language === 'en' ? ' and ' : ' اور ');
      return language === 'en'
        ? `Choose ${list}. Then we can check the animal's targets for you.`
        : `${list} منتخب کریں۔ پھر ہم جانور کے اہداف کی جانچ کر دیں گے۔`;
    }
    return '';
  })();

  if (compact) {
    return (
      <AnimatePresence mode="wait">
        <motion.div
          key={status.kind}
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -4 }}
          transition={{ duration: 0.18 }}
          className={`flex items-center gap-2 rounded-md border px-3 py-2 text-sm ${palette.bg} ${palette.border} ${palette.text}`}
        >
          <Icon className={`w-4 h-4 flex-shrink-0 ${palette.icon}`} />
          <span className="font-medium">{title}</span>
        </motion.div>
      </AnimatePresence>
    );
  }

  // -------- Rich infeasible body (the main UX win) --------
  //
  // Ordering is deliberate, and it is the opposite of what the panel used to do.
  // The FIX comes first and takes up most of the space; the nutrient numbers are
  // demoted to an optional "why" section underneath. A farmer who can't read a
  // nutrient table can still act on a row of pictures with plus buttons.
  if (status.kind === 'infeasible' && status.analysis) {
    const { hardBlockers, conflictingNutrients, fixes } = status.analysis;
    const tooHigh = hardBlockers.filter((g) => g.direction === 'too_high');
    const tooLow  = hardBlockers.filter((g) => g.direction === 'too_low');
    const hasExactFix = fixes.some((f) => f.kind === 'exact_fix');

    return (
      <AnimatePresence mode="wait">
        <motion.div
          key="infeasible-rich"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.2 }}
          className={`rounded-xl border-2 p-4 sm:p-5 ${palette.bg} ${palette.border} ${palette.text}`}
        >
          <div className="flex items-start gap-3">
            <Icon className={`w-5 h-5 flex-shrink-0 mt-0.5 ${palette.icon}`} />
            <div className="flex-1 min-w-0">
              <p className="font-bold text-base">{title}</p>
              <p className="text-sm opacity-90 mt-0.5 leading-relaxed">
                {hasExactFix
                  ? (language === 'en'
                      ? 'Tap any ONE of these and your feed will be balanced:'
                      : 'ان میں سے کوئی ایک دبائیں، آپ کا فارمولا مکمل ہو جائے گا:')
                  : (language === 'en'
                      ? 'Your picks cannot meet the target yet. Adding these will help:'
                      : 'ابھی ہدف پورا نہیں ہو رہا۔ یہ اجزاء شامل کرنے سے مدد ملے گی:')}
              </p>
            </div>
          </div>

          {/* THE FIX — tappable ingredient chips */}
          {fixes.length > 0 && (
            <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-2">
              {fixes.map((f) => (
                <FixChip
                  key={f.key}
                  fix={f}
                  language={language}
                  onAdd={() => onAddIngredient?.(f.category, f.key)}
                />
              ))}
            </div>
          )}

          {/* Secondary "why" — the actual numbers, for users who want them.
              Collapsed into a <details> so it never competes with the fix. */}
          {(hardBlockers.length > 0 || conflictingNutrients.length > 0) && (
            <details className="mt-3 group">
              <summary className="cursor-pointer text-xs font-semibold opacity-75 hover:opacity-100 select-none list-none flex items-center gap-1">
                <ChevronRight className="w-3.5 h-3.5 transition-transform group-open:rotate-90" />
                {language === 'en' ? 'Why? (show numbers)' : 'کیوں؟ (تفصیل دیکھیں)'}
              </summary>

              {hardBlockers.length > 0 && (
                <div className="mt-2 grid sm:grid-cols-2 gap-3">
                  {tooHigh.length > 0 && (
                    <GapColumn language={language} direction="too_high" gaps={tooHigh} accent={palette.accent} />
                  )}
                  {tooLow.length > 0 && (
                    <GapColumn language={language} direction="too_low" gaps={tooLow} accent={palette.accent} />
                  )}
                </div>
              )}

              {hardBlockers.length === 0 && conflictingNutrients.length > 0 && (
                <div className={`mt-2 rounded-md p-3 text-sm ${palette.accent}`}>
                  <p className="font-medium">
                    {language === 'en'
                      ? 'These targets pull against each other:'
                      : 'یہ اہداف ایک دوسرے سے ٹکراؤ میں ہیں:'}
                  </p>
                  <p className="mt-1 opacity-90">
                    {conflictingNutrients
                      .map((n) => NUTRIENT_INFO[n]?.[language === 'en' ? 'en' : 'ur'] ?? n)
                      .join(language === 'en' ? ', ' : '، ')}
                  </p>
                </div>
              )}
            </details>
          )}
        </motion.div>
      </AnimatePresence>
    );
  }

  // Fallback — feasible / pending / no_targets all render this simple card
  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={status.kind}
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -8 }}
        transition={{ duration: 0.2 }}
        className={`rounded-lg border-2 p-4 flex gap-3 ${palette.bg} ${palette.border} ${palette.text}`}
      >
        <Icon className={`w-5 h-5 flex-shrink-0 mt-0.5 ${palette.icon}`} />
        <div className="space-y-1">
          <p className="font-semibold">{title}</p>
          {subtitle && <p className="text-sm leading-relaxed opacity-90">{subtitle}</p>}
        </div>
      </motion.div>
    </AnimatePresence>
  );
}

/** One column of nutrient gaps (either all too-high or all too-low). */
function GapColumn({
  language,
  direction,
  gaps,
  accent,
}: {
  language: 'en' | 'ur';
  direction: 'too_low' | 'too_high';
  gaps: NutrientGap[];
  accent: string;
}) {
  const heading =
    direction === 'too_high'
      ? language === 'en' ? 'Need to lower' : 'ان کو کم کریں'
      : language === 'en' ? 'Need to raise' : 'ان کو بڑھائیں';
  const arrow = direction === 'too_high' ? '▼' : '▲';

  return (
    <div className={`rounded-md p-3 text-sm ${accent}`}>
      <p className="font-semibold mb-2 flex items-center gap-1.5">
        <span className="text-xs">{arrow}</span>
        {heading}
      </p>
      <ul className="space-y-1.5">
        {gaps.map((gap) => {
          const info = NUTRIENT_INFO[gap.nutrient];
          const name = info?.[language === 'en' ? 'en' : 'ur'] ?? gap.nutrient;
          const action = info?.[direction === 'too_high' ? 'lower' : 'raise'][language === 'en' ? 'en' : 'ur'];
          return (
            <li key={gap.nutrient} className="leading-snug">
              <span className="font-medium">{name}</span>
              <span className="opacity-70">
                {' '}— {formatGapValue(gap)} ({language === 'en' ? 'target' : 'ہدف'} {formatGapTarget(gap)})
              </span>
              {action && (
                <span className="block text-xs opacity-75 mt-0.5">
                  → {action}
                </span>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}

/**
 * The "I already have my own mix" escape hatch.
 *
 * Two distinct users hit this screen. One is building a ration from scratch and
 * genuinely benefits from being told "you have no protein source yet". The other
 * already feeds a fixed mix and only wants to know whether it meets the targets —
 * for them the category minimums are an obstacle, not help, and they were simply
 * stuck with a disabled Next button and no way past it.
 *
 * The trade-off is stated plainly rather than hidden: nutrition is still
 * calculated (that's the whole point of their visit), but Auto-Formulate may not
 * be able to balance the mix.
 */
function SkipValidationOffer({
  language,
  onSkip,
}: {
  language: 'en' | 'ur';
  onSkip: () => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-xl border border-slate-200 bg-slate-50 p-3.5"
    >
      <div className="flex items-start gap-2.5">
        <ClipboardCheck className="w-4 h-4 text-slate-500 flex-shrink-0 mt-0.5" />
        <div className="min-w-0 flex-1">
          <p className="text-[13px] font-bold text-slate-800">
            {language === 'en'
              ? 'Already have your own mix?'
              : 'آپ کے پاس پہلے سے اپنا فارمولا ہے؟'}
          </p>
          <p className="mt-0.5 text-xs text-slate-600 leading-relaxed">
            {language === 'en'
              ? 'Pick just the ingredients you already feed and continue. We will still calculate the nutrition and show you which targets are met — you only lose the automatic balancing.'
              : 'صرف وہی اجزاء منتخب کریں جو آپ پہلے سے دیتے ہیں اور آگے بڑھیں۔ ہم پھر بھی غذائیت کا حساب کریں گے اور بتائیں گے کون سے اہداف پورے ہوئے — صرف خودکار توازن دستیاب نہیں ہوگا۔'}
          </p>
          <button
            onClick={onSkip}
            className="mt-2 inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-bold text-slate-700 hover:border-slate-400 hover:bg-slate-100 transition-colors tap-transparent"
          >
            <SkipForward className="w-3.5 h-3.5" />
            {language === 'en' ? 'Skip checks and continue' : 'جانچ چھوڑ کر آگے بڑھیں'}
          </button>
        </div>
      </div>
    </motion.div>
  );
}

/** Persistent reminder that the checks are off, with a way back on. */
function SkipValidationActive({
  language,
  onResume,
}: {
  language: 'en' | 'ur';
  onResume: () => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-xl border border-slate-300 bg-white p-3.5 flex items-start gap-2.5"
    >
      <ClipboardCheck className="w-4 h-4 text-slate-500 flex-shrink-0 mt-0.5" />
      <div className="min-w-0 flex-1">
        <p className="text-[13px] font-bold text-slate-800">
          {language === 'en' ? 'Checks skipped — using your own mix' : 'جانچ چھوڑ دی گئی — آپ کا اپنا فارمولا'}
        </p>
        <p className="mt-0.5 text-xs text-slate-600 leading-relaxed">
          {language === 'en'
            ? 'Pick your ingredients and tap Next. Step 3 lets you type your own kg amounts, and Step 4 shows exactly which nutrients are on or off target.'
            : 'اپنے اجزاء منتخب کر کے Next دبائیں۔ مرحلہ 3 میں اپنی مقدار لکھیں، اور مرحلہ 4 بتائے گا کون سے اجزاء ہدف پر ہیں۔'}
        </p>
        <button
          onClick={onResume}
          className="mt-2 text-xs font-bold text-emerald-700 hover:text-emerald-900 underline underline-offset-2 tap-transparent"
        >
          {language === 'en' ? 'Turn checks back on' : 'جانچ دوبارہ چالو کریں'}
        </button>
      </div>
    </motion.div>
  );
}

export function Step2Ingredients({
  language,
  chosenIngredients,
  selectedAnimal,
  selectedStage,
  onIngredientToggle,
  onNext,
  onBack,
  skipValidation,
  onSkipValidationChange,
}: Step2IngredientsProps) {
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [selectedIngredientInfo, setSelectedIngredientInfo] = useState<string | null>(null);
  const [addModalOpen, setAddModalOpen] = useState(false);

  // Bumped whenever a custom ingredient is added or deleted. Acts as a re-render
  // signal AND a useMemo dependency so feasibility re-runs against the latest
  // ingredient set. (We can't read localStorage during render; this is the
  // canonical pattern for syncing external mutable state into React.)
  const [customVersion, setCustomVersion] = useState(0);
  const refreshCustom = useCallback(() => setCustomVersion((v) => v + 1), []);

  // NOTE: there is deliberately no separate "category minimums satisfied" flag.
  // The feasibility check's `pending` state already encodes exactly that
  // condition, and having two sources of truth for "can the user continue?" is
  // what let Next unlock while the panel said the targets couldn't be met.
  const totalSelected = Object.values(chosenIngredients).flat().length;

  /**
   * Delete a user-added custom ingredient. Three side-effects, in order:
   *   1. Remove from localStorage
   *   2. If currently selected by the user, also un-toggle it (otherwise the
   *      formula in Step 3 would carry a phantom key that has no metadata).
   *   3. Bump customVersion to force the grid to re-render minus this entry.
   */
  const handleDeleteCustom = useCallback(
    (ingredientKey: string) => {
      const ing = getIngredient(ingredientKey);
      removeCustomIngredient(ingredientKey);

      // Was it selected? If so, deselect it so it doesn't leak into Step 3.
      for (const [catKey, picks] of Object.entries(chosenIngredients)) {
        if (picks.includes(ingredientKey)) {
          onIngredientToggle(catKey, ingredientKey);
          break;
        }
      }

      refreshCustom();
      toast.success(
        language === 'en'
          ? `Removed "${ing?.nameEn ?? ingredientKey}".`
          : `"${ing?.nameUr ?? ingredientKey}" حذف کر دیا گیا۔`,
        { id: 'custom-ingredient-action' }
      );
    },
    [chosenIngredients, language, onIngredientToggle, refreshCustom]
  );

  // -----------------------------------------------------------------------
  // Live LP feasibility check — runs on every selection change so the user
  // gets real-time guidance instead of being surprised in Step 3.
  // -----------------------------------------------------------------------
  const feasibility = useMemo<FeasibilityStatus>(() => {
    // Which required categories (min ≥ 1) are still empty?
    const missingCategories: string[] = [];
    for (const [catKey, cat] of Object.entries(INGREDIENT_CATEGORIES)) {
      const picked = chosenIngredients[catKey] || [];
      if (cat.min > 0 && picked.length < cat.min) missingCategories.push(catKey);
    }
    if (missingCategories.length > 0) {
      return { kind: 'pending', missingCategories };
    }

    const ranges = getNutritionRange(selectedAnimal, selectedStage);
    if (!ranges) return { kind: 'no_targets' };

    const allKeys = Object.values(chosenIngredients).flat();
    if (allKeys.length === 0) return { kind: 'pending', missingCategories: ['energy', 'protein'] };

    const result = autoFormulate({ ingredientKeys: allKeys, ranges });
    if (result.success) return { kind: 'feasible' };
    return { kind: 'infeasible', analysis: result.analysis };
  }, [chosenIngredients, selectedAnimal, selectedStage, customVersion]);

  // -----------------------------------------------------------------------
  // Toast on transition between feasible ↔ infeasible. Debounced 600 ms so
  // rapid toggling doesn't spam toasts. The shared toast id makes sonner
  // replace the previous toast in place rather than stacking them.
  // -----------------------------------------------------------------------
  const prevKindRef = useRef<FeasibilityStatus['kind'] | null>(null);
  useEffect(() => {
    const handle = setTimeout(() => {
      const prev = prevKindRef.current;
      const curr = feasibility.kind;
      if (prev !== null && prev !== curr) {
        if (curr === 'feasible') {
          toast.success(
            language === 'en'
              ? 'Selection meets every nutrient target — ready to formulate.'
              : 'تمام غذائی اہداف پورے ہو سکتے ہیں — اب فارمولا بنائیں۔',
            { id: 'feasibility-status', duration: 3500 }
          );
        } else if (curr === 'infeasible') {
          toast.warning(
            language === 'en'
              ? "Your selection can't reach the targets yet — see the guide below."
              : 'منتخب اجزاء سے ہدف پورے نہیں ہو رہے — نیچے ہدایات دیکھیں۔',
            { id: 'feasibility-status', duration: 5000 }
          );
        }
      }
      prevKindRef.current = curr;
    }, 600);
    return () => clearTimeout(handle);
  }, [feasibility.kind, language]);

  /**
   * When may the user advance to Step 3?
   *
   * The gate is the LP verdict, not just the per-category minimums. Those
   * minimums only ask "is there at least one energy and one protein source?",
   * which 1 energy + 1 protein satisfies — so Next used to unlock while the
   * panel directly above it still said the targets can't be met. The button and
   * the message contradicted each other, and Auto-Formulate would then fail on
   * arrival in Step 3.
   *
   * Now Next unlocks only in the `feasible` state — the one that reads "Looks
   * good — you're ready". Every other state keeps it locked and offers the skip
   * hatch, so nobody is ever stuck without a way forward.
   */
  const canProceed = skipValidation
    // Checks off: any non-empty selection will do. An empty one would just land
    // the user on a blank Step 3.
    ? totalSelected > 0
    : feasibility.kind === 'feasible';

  // Keys the solver recommends right now — drives the "ADD THIS" card treatment
  // and the per-section "N suggested" badge.
  const recommendedKeys = useMemo(
    () => new Set(feasibility.kind === 'infeasible' ? (feasibility.analysis?.fixes ?? []).map((f) => f.key) : []),
    [feasibility]
  );

  const t = {
    ingredientSelection: language === 'en' ? 'Select Ingredients' : 'اجزاء منتخب کریں',
    next: language === 'en' ? 'Next' : 'اگلا',
    back: language === 'en' ? 'Back' : 'واپس',
  };

  /**
   * No infeasibility warning to give here any more: with validation on, Next is
   * disabled unless the selection is feasible, and with validation off the user
   * has already accepted that Auto-Formulate may not balance their mix.
   */
  const handleNext = () => onNext();

  const handleSkip = () => {
    onSkipValidationChange(true);
    toast.success(
      language === 'en'
        ? 'Checks turned off — pick your own ingredients and tap Next.'
        : 'جانچ بند کر دی گئی — اپنے اجزاء منتخب کر کے Next دبائیں۔',
      { id: 'skip-validation', duration: 4000 }
    );
  };

  return (
    <>
      <IngredientDetailModal
        isOpen={selectedIngredientInfo !== null}
        ingredientKey={selectedIngredientInfo}
        language={language}
        onClose={() => setSelectedIngredientInfo(null)}
      />

      <AddIngredientModal
        isOpen={addModalOpen}
        language={language}
        onClose={() => setAddModalOpen(false)}
        onAdded={refreshCustom}
      />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        className="space-y-8"
      >
        <div className="flex items-start justify-between gap-2 sm:gap-3">
          <div className="min-w-0">
            <h2 className="text-xl sm:text-2xl font-bold mb-1 sm:mb-2 flex items-center gap-2">
              <span className="text-2xl sm:text-3xl">🌾</span>
              {t.ingredientSelection}
            </h2>
            <p className="text-gray-600 text-xs sm:text-sm leading-snug">
              {language === 'en'
                ? 'Select at least one ingredient from each category'
                : 'ہر زمرے سے کم از کم ایک جزو منتخب کریں'}
            </p>
          </div>
          {/* + Add Ingredient — opens the custom-ingredient creation modal.
              On mobile the label is hidden so the button stays compact (icon-only). */}
          <Button
            onClick={() => setAddModalOpen(true)}
            variant="outline"
            className="flex-shrink-0 h-10 px-3 sm:px-4 border-emerald-300 text-emerald-700 hover:bg-emerald-50 hover:text-emerald-800 hover:border-emerald-400 gap-1.5 tap-transparent"
            title={language === 'en' ? 'Add a custom ingredient' : 'حسبِ ضرورت اجزاء شامل کریں'}
            aria-label={language === 'en' ? 'Add a custom ingredient' : 'حسبِ ضرورت اجزاء شامل کریں'}
          >
            <Plus className="w-4 h-4" />
            <span className="hidden sm:inline">
              {language === 'en' ? 'Add Ingredient' : 'جزو شامل کریں'}
            </span>
          </Button>
        </div>

        {/* When checks are off, the diagnostic panel is replaced by the
            "checks skipped" notice. The gap analysis still lives in Step 4,
            which is where this user wants it — as a verdict on their own mix,
            not as a gate in front of it. */}
        {skipValidation ? (
          <SkipValidationActive
            language={language}
            onResume={() => onSkipValidationChange(false)}
          />
        ) : (
          <>
            <FeasibilityGuide
              language={language}
              status={feasibility}
              onAddIngredient={onIngredientToggle}
            />
            {/* Offer the escape hatch whenever the user is blocked — keyed off
                the same condition that disables Next, so there is never a state
                with a locked button and no way past it. */}
            {!canProceed && (
              <SkipValidationOffer language={language} onSkip={handleSkip} />
            )}
          </>
        )}

        {/* Re-keyed by customVersion so newly-added ingredients appear immediately. */}
        <div className="space-y-8" key={customVersion}>
          {Object.entries(INGREDIENT_CATEGORIES).map(([categoryKey, category]) => (
            <IngredientGroup
              key={categoryKey}
              title={category[language === 'en' ? 'titleEn' : 'titleUr']}
              language={language}
              ingredients={getCategoryIngredientKeys(categoryKey as keyof typeof INGREDIENT_CATEGORIES)}
              selected={chosenIngredients[categoryKey] || []}
              minRequired={category.min}
              recommendedKeys={recommendedKeys}
              onToggle={(ingredient) => onIngredientToggle(categoryKey, ingredient)}
              onIngredientInfo={setSelectedIngredientInfo}
              onIngredientDelete={handleDeleteCustom}
            />
          ))}
        </div>

        {/* Sticky bottom guidance — visible right next to the Next button */}
        {!skipValidation && (
          <FeasibilityGuide language={language} status={feasibility} compact />
        )}

        {/* Why Next is locked, so the disabled button is never a mystery.
            Each blocked state names its own reason. */}
        {!canProceed && (
          <p className="text-[11px] text-slate-500">
            {skipValidation
              ? (language === 'en'
                  ? 'Select at least one ingredient to continue.'
                  : 'آگے بڑھنے کے لیے کم از کم ایک جزو منتخب کریں۔')
              : feasibility.kind === 'infeasible'
                ? (language === 'en'
                    ? 'Next unlocks when your ingredients can meet every target — add one of the suggestions above, or skip the checks.'
                    : 'جب آپ کے اجزاء تمام اہداف پورے کر سکیں تو Next کھل جائے گا — اوپر دی گئی تجویز شامل کریں، یا جانچ چھوڑ دیں۔')
                : feasibility.kind === 'no_targets'
                  ? (language === 'en'
                      ? 'Pick an animal and stage in Step 1 first, or skip the checks.'
                      : 'پہلے مرحلہ 1 میں جانور اور مرحلہ منتخب کریں، یا جانچ چھوڑ دیں۔')
                  : (language === 'en'
                      ? 'Keep picking — Next unlocks once your selection can meet the targets.'
                      : 'منتخب کرتے رہیں — ہدف پورے ہونے پر Next کھل جائے گا۔')}
          </p>
        )}
      </motion.div>
    </>
  );
}
