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
import { AlertTriangle, CheckCircle2, Info, Plus, Sparkles, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { IngredientDetailModal } from './IngredientDetailModal';
import { AddIngredientModal } from './AddIngredientModal';
import { autoFormulate, type InfeasibilityAnalysis, type NutrientGap } from '@/lib/autoFormulate';

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

interface IngredientCardProps {
  id: string;
  name: string;
  icon: string;
  energyLevel: string;
  proteinLevel: string;
  isSelected: boolean;
  /** True if this is a user-added (custom) ingredient — gets a "Custom" pill + delete control. */
  isCustom?: boolean;
  onSelect: () => void;
  onInfo: () => void;
  /** Only invoked for custom ingredients (the parent passes this only when isCustom is true). */
  onDelete?: () => void;
}

function IngredientCard({
  id,
  name,
  icon,
  energyLevel,
  proteinLevel,
  isSelected,
  isCustom = false,
  onSelect,
  onInfo,
  onDelete,
}: IngredientCardProps) {
  const getIntensityColor = (level: string) => {
    const colors: Record<string, string> = {
      high: 'bg-red-100 text-red-700 border-red-300',
      med: 'bg-yellow-100 text-yellow-700 border-yellow-300',
      low: 'bg-green-100 text-green-700 border-green-300',
    };
    return colors[level] || colors.med;
  };

  return (
    <motion.div
      whileHover={{ y: -4 }}
      className={`relative p-4 rounded-lg border-2 transition-all flex flex-col items-center gap-2 text-center cursor-pointer group ${
        isSelected
          ? 'border-emerald-500 bg-emerald-50 shadow-md'
          : isCustom
            ? 'border-purple-200 bg-purple-50/40 hover:border-purple-400'
            : 'border-gray-200 bg-white hover:border-emerald-300'
      }`}
    >
      {/* Top-right action buttons. `touch-reveal` keeps them visible on touch
          devices but lets them fade in on hover for mouse users. */}
      <div className="absolute top-2 right-2 flex gap-1 touch-reveal">
        {isCustom && onDelete && (
          <motion.button
            onClick={(e) => {
              e.stopPropagation();
              onDelete();
            }}
            whileTap={{ scale: 0.92 }}
            className="p-2 bg-red-100 hover:bg-red-200 text-red-600 rounded-full shadow-md tap-transparent"
            title="Delete custom ingredient"
            aria-label="Delete custom ingredient"
          >
            <Trash2 className="w-4 h-4" />
          </motion.button>
        )}
        <motion.button
          onClick={(e) => {
            e.stopPropagation();
            onInfo();
          }}
          whileTap={{ scale: 0.92 }}
          className="p-2 bg-blue-100 hover:bg-blue-200 text-blue-600 rounded-full shadow-md tap-transparent"
          title="View details"
          aria-label="View details"
        >
          <Info className="w-4 h-4" />
        </motion.button>
      </div>

      {/* "Custom" pill — sits in the top-left so it doesn't overlap action buttons */}
      {isCustom && (
        <span className="absolute top-2 left-2 text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-purple-100 text-purple-700 border border-purple-200">
          Custom
        </span>
      )}

      {/* Main Card Content */}
      <motion.button
        onClick={onSelect}
        whileTap={{ scale: 0.98 }}
        className="w-full flex flex-col items-center gap-2 mt-2"
      >
        <span className="text-3xl">{getIngredientIcon(id)}</span>
        <span className={`text-sm font-semibold ${isSelected ? 'text-emerald-900' : 'text-gray-900'}`}>
          {name}
        </span>

        {/* Quality Badges */}
        <div className="flex gap-1 mt-2 flex-wrap justify-center">
          <span className={`text-xs font-medium px-2 py-1 rounded border ${getIntensityColor(energyLevel)}`}>
            E
          </span>
          <span className={`text-xs font-medium px-2 py-1 rounded border ${getIntensityColor(proteinLevel)}`}>
            P
          </span>
        </div>

        {isSelected && (
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="mt-2 text-emerald-600 font-bold text-lg"
          >
            ✓
          </motion.div>
        )}
      </motion.button>
    </motion.div>
  );
}

function IngredientGroup({
  categoryKey,
  title,
  language,
  ingredients,
  selected,
  minRequired,
  onToggle,
  onIngredientInfo,
  onIngredientDelete,
}: {
  categoryKey: string;
  title: string;
  language: 'en' | 'ur';
  ingredients: string[];
  selected: string[];
  minRequired: number;
  onToggle: (ingredient: string) => void;
  onIngredientInfo: (ingredientKey: string) => void;
  /** Invoked when the user clicks the trash icon on a custom-ingredient card. */
  onIngredientDelete: (ingredientKey: string) => void;
}) {
  const isValid = selected.length >= minRequired;
  const status =
    selected.length === 0
      ? 'Need at least ' + minRequired
      : selected.length >= minRequired
        ? '✓ Valid'
        : 'Need ' + (minRequired - selected.length) + ' more';

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-4"
    >
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-bold">{title}</h3>
        <span
          className={`text-sm font-semibold px-3 py-1 rounded-full ${
            isValid
              ? 'bg-green-100 text-green-700'
              : 'bg-yellow-100 text-yellow-700'
          }`}
        >
          {status}
        </span>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {ingredients.map((ingredientKey) => {
          const data = getIngredient(ingredientKey);
          if (!data) return null;
          const custom = isCustomIngredient(ingredientKey);

          return (
            <IngredientCard
              key={ingredientKey}
              id={ingredientKey}
              name={data[language === 'en' ? 'nameEn' : 'nameUr']}
              icon=""
              energyLevel={data.energyLevel}
              proteinLevel={data.proteinLevel}
              isSelected={selected.includes(ingredientKey)}
              isCustom={custom}
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

/**
 * Pick the most actionable single piece of advice given the gaps. Common
 * patterns (protein-high + energy-low) get a tailored message; otherwise we
 * fall back to a generic add/remove recommendation based on the suggestion
 * keys returned by the LP diagnostic.
 */
function buildQuickFix(
  analysis: InfeasibilityAnalysis,
  language: 'en' | 'ur',
): string {
  const tooHigh = new Set(analysis.hardBlockers.filter((g) => g.direction === 'too_high').map((g) => g.nutrient));
  const tooLow  = new Set(analysis.hardBlockers.filter((g) => g.direction === 'too_low').map((g) => g.nutrient));

  // Pattern: protein too high + energy too low → recommend swapping
  if (tooHigh.has('protein') && tooLow.has('energy')) {
    return language === 'en'
      ? 'Replace one of your protein sources (like Soybean Meal or Cottonseed Cake) with a high-energy grain such as Corn or Wheat. This pulls protein down and lifts energy at the same time.'
      : 'اپنے کسی پروٹین کے ذریعے (جیسے سویا میل یا بنولہ کھل) کو دانے (جیسے مکئی یا گندم) سے بدلیں۔ اس سے پروٹین کم اور توانائی زیادہ ہو جائے گی۔';
  }

  // Pattern: fiber too high + energy too low → swap bran for grain
  if (tooHigh.has('fiber') && tooLow.has('energy')) {
    return language === 'en'
      ? 'Reduce a high-fibre ingredient (like Wheat Bran or Palm Kernel Cake) and add a grain (Corn, Broken Rice, or Wheat). Lower fibre, higher energy.'
      : 'فائبر والا جزو (جیسے چوکر یا PKC) کم کریں اور دانہ (مکئی، ٹکری چاول، یا گندم) شامل کریں۔ فائبر کم، توانائی زیادہ۔';
  }

  // Use ingredient suggestions from the LP diagnostic if available.
  if (analysis.suggestedAdditions.length > 0) {
    const names = analysis.suggestedAdditions
      .map((k) => getIngredient(k)?.[language === 'en' ? 'nameEn' : 'nameUr'])
      .filter(Boolean)
      .slice(0, 3)
      .join(language === 'en' ? ', ' : '، ');
    if (names) {
      return language === 'en'
        ? `Try adding: ${names}.`
        : `یہ اجزاء شامل کر کے دیکھیں: ${names}۔`;
    }
  }

  // Fallback — generic guidance
  return language === 'en'
    ? 'Pick an ingredient that is strong in the nutrient you are missing, or remove one that is overloading another nutrient.'
    : 'جس غذائی جزو کی کمی ہے، اس میں مضبوط جزو شامل کریں؛ یا جو جزو زیادہ ہو رہا ہے، اسے کم کریں۔';
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
}: {
  language: 'en' | 'ur';
  status: FeasibilityStatus;
  compact?: boolean;
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

  // Localised top-level title for every state.
  const title = (() => {
    if (status.kind === 'feasible')   return language === 'en' ? "Looks good — you're ready" : 'سب ٹھیک ہے — آپ تیار ہیں';
    if (status.kind === 'no_targets') return language === 'en' ? 'Pick an animal and stage first' : 'پہلے جانور اور مرحلہ منتخب کریں';
    if (status.kind === 'pending')    return language === 'en' ? 'Keep selecting'   : 'منتخب کرتے رہیں';
    return language === 'en' ? 'Adjust your selection' : 'اپنا انتخاب درست کریں';
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
      const missing = status.missingCategories
        .map((k) => INGREDIENT_CATEGORIES[k as keyof typeof INGREDIENT_CATEGORIES])
        .map((c) => c?.[language === 'en' ? 'titleEn' : 'titleUr'])
        .filter(Boolean)
        .join(language === 'en' ? ' and ' : ' اور ');
      return language === 'en'
        ? `Pick at least one ingredient from ${missing} so we can check the targets.`
        : `${missing} میں سے کم از کم ایک جزو منتخب کریں تاکہ ہدف کی جانچ ہو سکے۔`;
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
  if (status.kind === 'infeasible' && status.analysis) {
    const { hardBlockers, conflictingNutrients } = status.analysis;
    const tooHigh = hardBlockers.filter((g) => g.direction === 'too_high');
    const tooLow  = hardBlockers.filter((g) => g.direction === 'too_low');
    const quickFix = buildQuickFix(status.analysis, language);
    const totalIssues = hardBlockers.length || conflictingNutrients.length;

    return (
      <AnimatePresence mode="wait">
        <motion.div
          key="infeasible-rich"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.2 }}
          className={`rounded-lg border-2 p-4 sm:p-5 ${palette.bg} ${palette.border} ${palette.text}`}
        >
          <div className="flex items-start gap-3">
            <Icon className={`w-5 h-5 flex-shrink-0 mt-0.5 ${palette.icon}`} />
            <div className="flex-1 min-w-0">
              <p className="font-semibold">
                {title}
                {totalIssues > 0 && (
                  <span className="ml-2 text-xs font-normal opacity-70">
                    {language === 'en'
                      ? `${totalIssues} ${totalIssues === 1 ? 'issue' : 'issues'}`
                      : `${totalIssues} مسئلے`}
                  </span>
                )}
              </p>
              <p className="text-sm opacity-90 mt-0.5">
                {language === 'en'
                  ? "Your current ingredients can't satisfy the animal's nutrient targets — here's what's off:"
                  : 'آپ کے اجزاء جانور کے غذائی اہداف پورے نہیں کر رہے — یہ مسائل ہیں:'}
              </p>
            </div>
          </div>

          {/* Two-column gap layout: too-high on the left, too-low on the right */}
          {hardBlockers.length > 0 && (
            <div className="mt-4 grid sm:grid-cols-2 gap-3">
              {tooHigh.length > 0 && (
                <GapColumn
                  language={language}
                  direction="too_high"
                  gaps={tooHigh}
                  accent={palette.accent}
                />
              )}
              {tooLow.length > 0 && (
                <GapColumn
                  language={language}
                  direction="too_low"
                  gaps={tooLow}
                  accent={palette.accent}
                />
              )}
            </div>
          )}

          {/* Conflicting nutrients case — Pass 2 (no hard blockers but combined infeasible) */}
          {hardBlockers.length === 0 && conflictingNutrients.length > 0 && (
            <div className={`mt-4 rounded-md p-3 text-sm ${palette.accent}`}>
              <p className="font-medium">
                {language === 'en'
                  ? 'These targets conflict with each other:'
                  : 'یہ اہداف ایک دوسرے سے ٹکراؤ میں ہیں:'}
              </p>
              <p className="mt-1 opacity-90">
                {conflictingNutrients
                  .map((n) => NUTRIENT_INFO[n]?.[language === 'en' ? 'en' : 'ur'] ?? n)
                  .join(language === 'en' ? ', ' : '، ')}
              </p>
            </div>
          )}

          {/* Quick-fix recommendation */}
          <div className={`mt-4 rounded-md p-3 flex gap-2 text-sm ${palette.accent}`}>
            <Sparkles className={`w-4 h-4 flex-shrink-0 mt-0.5 ${palette.icon}`} />
            <div>
              <p className="font-semibold">
                {language === 'en' ? 'Quick fix' : 'فوری حل'}
              </p>
              <p className="opacity-90 leading-relaxed">{quickFix}</p>
            </div>
          </div>
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

export function Step2Ingredients({
  language,
  chosenIngredients,
  selectedAnimal,
  selectedStage,
  onIngredientToggle,
  onNext,
  onBack,
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

  const isComplete = Object.entries(chosenIngredients).every(([category, selected]) => {
    const cat = INGREDIENT_CATEGORIES[category as keyof typeof INGREDIENT_CATEGORIES];
    return !cat || selected.length >= cat.min;
  });

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

  const t = {
    ingredientSelection: language === 'en' ? 'Select Ingredients' : 'اجزاء منتخب کریں',
    next: language === 'en' ? 'Next' : 'اگلا',
    back: language === 'en' ? 'Back' : 'واپس',
  };

  const handleNext = () => {
    if (feasibility.kind === 'infeasible') {
      toast.warning(
        language === 'en'
          ? "Your selection can't meet the targets — Auto-Formulate will fail in Step 3."
          : 'یہ انتخاب اہداف پورے نہیں کر سکتا — مرحلہ 3 میں آٹو فارمولیٹ ناکام ہوگا۔',
        { id: 'feasibility-status', duration: 5000 }
      );
    }
    onNext();
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

        <FeasibilityGuide language={language} status={feasibility} />

        {/* Re-keyed by customVersion so newly-added ingredients appear immediately. */}
        <div className="space-y-8" key={customVersion}>
          {Object.entries(INGREDIENT_CATEGORIES).map(([categoryKey, category]) => (
            <IngredientGroup
              key={categoryKey}
              categoryKey={categoryKey}
              title={category[language === 'en' ? 'titleEn' : 'titleUr']}
              language={language}
              ingredients={getCategoryIngredientKeys(categoryKey as keyof typeof INGREDIENT_CATEGORIES)}
              selected={chosenIngredients[categoryKey] || []}
              minRequired={category.min}
              onToggle={(ingredient) => onIngredientToggle(categoryKey, ingredient)}
              onIngredientInfo={setSelectedIngredientInfo}
              onIngredientDelete={handleDeleteCustom}
            />
          ))}
        </div>

        {/* Sticky bottom guidance — visible right next to the Next button */}
        <FeasibilityGuide language={language} status={feasibility} compact />

        {/* Action Buttons — taller tap targets on mobile (min 48 px) */}
        <div className="flex gap-3 pt-6 sm:pt-8">
          <Button variant="outline" onClick={onBack} className="flex-1 h-12 sm:h-10 tap-transparent">
            {t.back}
          </Button>
          <Button
            onClick={handleNext}
            disabled={!isComplete}
            className="flex-1 h-12 sm:h-10 bg-emerald-600 hover:bg-emerald-700 text-white tap-transparent"
          >
            {t.next}
          </Button>
        </div>
      </motion.div>
    </>
  );
}
