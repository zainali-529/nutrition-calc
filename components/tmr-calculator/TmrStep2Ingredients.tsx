'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { useEffect, useMemo, useRef, useState } from 'react';
import { AlertTriangle, CheckCircle2, Info, Sparkles } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { CATEGORY_KEYS, INGREDIENT_CATEGORIES, getCategoryIngredientKeys } from '@/lib/constants';
import {
  FORAGES,
  getAnyIngredient,
  getForage,
  getForageKeysBySubcategory,
  type ForageSubcategory,
} from '@/lib/forages';
import { tmrFormulate } from '@/lib/tmrFormulate';
import { getTmrNutritionRange } from '@/lib/tmrRanges';
import { IngredientDetailModal } from '@/components/nutrition-calculator/IngredientDetailModal';

interface TmrStep2IngredientsProps {
  language: 'en' | 'ur';
  selectedAnimal: string | null;
  selectedStage: number;
  forageDmPct: number;
  selectedForages: string[];
  selectedConcentrates: string[];
  onForageToggle: (key: string) => void;
  onConcentrateToggle: (key: string) => void;
  onNext: () => void;
  onBack: () => void;
}

type TabKey = 'forage' | 'concentrate';

type FeasibilityStatus =
  | { kind: 'pending'; reason: 'need_forage' | 'need_concentrate' | 'need_both' | 'no_targets' }
  | { kind: 'feasible' }
  | { kind: 'infeasible'; bottleneck?: string };

// ────────────────────────────────────────────────────────────────────────────
// Usage tier safety signal
// ────────────────────────────────────────────────────────────────────────────
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

  // Standard ingredients (Forages, Grains, Brans, Oilcakes)
  const pStyle =
    cp >= 20
      ? 'bg-emerald-100 text-emerald-900 border-emerald-300 font-bold'
      : cp >= 10
        ? 'bg-emerald-50 text-emerald-800 border-emerald-200 font-semibold'
        : 'bg-slate-50 text-slate-400 border-slate-200 font-medium';

  const eStyle =
    me >= 2.7
      ? 'bg-amber-100 text-amber-900 border-amber-300 font-bold'
      : me >= 2.0
        ? 'bg-amber-50 text-amber-800 border-amber-200 font-semibold'
        : 'bg-slate-50 text-slate-400 border-slate-200 font-medium';

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

// ────────────────────────────────────────────────────────────────────────────
// Ingredient card (mirrors the one in the concentrate calculator's Step 2)
// ────────────────────────────────────────────────────────────────────────────
function IngredientCard({
  id,
  name,
  language,
  isSelected,
  onSelect,
  onInfo,
}: {
  id: string;
  name: string;
  language: 'en' | 'ur';
  isSelected: boolean;
  onSelect: () => void;
  onInfo: () => void;
}) {
  const data = getAnyIngredient(id);
  const icon = data?.icon ?? '🌾';
  const maxInclusion = data?.maxInclusion ?? 100;
  const tier = usageTier(maxInclusion);

  return (
    <motion.div
      whileHover={{ y: -3 }}
      className={`relative rounded-2xl border-2 transition-all flex flex-col items-center text-center cursor-pointer group tap-transparent ${
        isSelected
          ? 'border-[#558b2f] bg-[#f4f8ee] shadow-sm ring-1 ring-[#558b2f]/50'
          : 'border-slate-200 bg-white hover:border-[#0e3b5e]/40 hover:shadow-sm'
      }`}
    >
      <motion.button
        onClick={(e) => { e.stopPropagation(); onInfo(); }}
        whileTap={{ scale: 0.92 }}
        className="absolute top-1.5 right-1.5 z-10 p-1.5 bg-blue-50 hover:bg-blue-100 text-blue-600 rounded-full shadow-xs touch-reveal tap-transparent"
        title="View details"
        aria-label="View details"
      >
        <Info className="w-3.5 h-3.5" />
      </motion.button>

      <motion.button
        onClick={onSelect}
        whileTap={{ scale: 0.97 }}
        className="w-full flex flex-col items-center gap-1.5 px-2.5 pt-4 pb-3 tap-transparent"
      >
        <span className="text-3xl sm:text-4xl leading-none group-hover:scale-105 transition-transform">{icon}</span>
        <span className={`text-[13px] sm:text-sm font-bold leading-tight ${isSelected ? 'text-[#0e3b5e]' : 'text-slate-900'}`}>
          {name}
        </span>

        {data && (
          <NutrientBadges
            cp={data.cp}
            me={data.me}
            ndf={data.ndf}
            fat={data.fat}
            ca={data.ca}
            p={data.p}
            category={data.category}
          />
        )}

        {/* Safety usage tier */}
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

// ────────────────────────────────────────────────────────────────────────────
// A subcategory section (forage subcat OR concentrate category)
// ────────────────────────────────────────────────────────────────────────────
function IngredientSection({
  title, language, ingredientKeys, selectedKeys, onToggle, onInfo,
}: {
  title: string;
  language: 'en' | 'ur';
  ingredientKeys: string[];
  selectedKeys: string[];
  onToggle: (key: string) => void;
  onInfo: (key: string) => void;
}) {
  if (ingredientKeys.length === 0) return null;
  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-base font-bold text-[#0e3b5e]">{title}</h3>
        <span className="text-xs text-slate-500 font-medium">
          {selectedKeys.filter((k) => ingredientKeys.includes(k)).length}/{ingredientKeys.length}
        </span>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 sm:gap-3">
        {ingredientKeys.map((key) => {
          const data = getAnyIngredient(key);
          if (!data) return null;
          return (
            <IngredientCard
              key={key}
              id={key}
              name={data[language === 'en' ? 'nameEn' : 'nameUr']}
              language={language}
              isSelected={selectedKeys.includes(key)}
              onSelect={() => onToggle(key)}
              onInfo={() => onInfo(key)}
            />
          );
        })}
      </div>
    </motion.div>
  );
}

// ────────────────────────────────────────────────────────────────────────────
// Feasibility guide (live LP check — mirrors concentrate calc's pattern)
// ────────────────────────────────────────────────────────────────────────────
function FeasibilityGuide({
  language, status, forageDmPct, compact = false,
}: {
  language: 'en' | 'ur';
  status: FeasibilityStatus;
  forageDmPct: number;
  compact?: boolean;
}) {
  if (compact && status.kind === 'pending' && status.reason === 'no_targets') return null;

  const palette =
    status.kind === 'feasible'
      ? { bg: 'bg-emerald-50', border: 'border-emerald-300', text: 'text-emerald-900', icon: 'text-emerald-600' }
      : status.kind === 'infeasible'
        ? { bg: 'bg-amber-50', border: 'border-amber-300', text: 'text-amber-900', icon: 'text-amber-600' }
        : { bg: 'bg-slate-50', border: 'border-slate-200', text: 'text-slate-700', icon: 'text-slate-500' };

  const Icon = status.kind === 'feasible' ? CheckCircle2 :
               status.kind === 'infeasible' ? AlertTriangle :
               Sparkles;

  const title =
    status.kind === 'feasible'
      ? language === 'en' ? `Looks good — TMR will hit ${forageDmPct}% forage` : `سب ٹھیک — TMR ${forageDmPct}% چارے پر چلے گا`
      : status.kind === 'infeasible'
        ? language === 'en' ? "Selection can't reach the targets at this DM split" : 'اس DM تقسیم پر اہداف پورے نہیں ہو رہے'
        : language === 'en' ? 'Keep selecting' : 'منتخب کرتے رہیں';

  const subtitle = (() => {
    if (status.kind === 'feasible') {
      return language === 'en'
        ? 'Auto-Formulate will find a feasible TMR in Step 3.'
        : 'مرحلہ 3 میں TMR آٹو فارمولیٹ ایک قابلِ عمل مرکب تلاش کرے گا۔';
    }
    if (status.kind === 'infeasible') {
      return status.bottleneck ?? (language === 'en'
        ? 'Try a wider forage/concentrate split or add more variety.'
        : 'وسیع تقسیم استعمال کریں یا اور اجزاء شامل کریں۔');
    }
    if (status.reason === 'no_targets') {
      return language === 'en' ? "Pick an animal in Step 1 first." : 'پہلے مرحلہ 1 میں جانور منتخب کریں۔';
    }
    if (status.reason === 'need_both')        return language === 'en' ? 'Pick at least one forage AND one concentrate.' : 'کم از کم ایک چارہ اور ایک کانسنٹریٹ منتخب کریں۔';
    if (status.reason === 'need_forage')      return language === 'en' ? 'Pick at least one forage from the Forage tab.' : 'چارہ ٹیب سے کم از کم ایک چارہ منتخب کریں۔';
    if (status.reason === 'need_concentrate') return language === 'en' ? 'Pick at least one concentrate from the Concentrate tab.' : 'کانسنٹریٹ ٹیب سے کم از کم ایک منتخب کریں۔';
    return '';
  })();

  if (compact) {
    return (
      <AnimatePresence mode="wait">
        <motion.div
          key={status.kind + ('reason' in status ? status.reason : '')}
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -4 }}
          transition={{ duration: 0.18 }}
          className={`flex items-center gap-2 rounded-md border px-3 py-2 text-sm ${palette.bg} ${palette.border} ${palette.text}`}
        >
          <Icon className={`w-4 h-4 flex-shrink-0 ${palette.icon}`} />
          <span className="font-medium leading-tight">{title}</span>
        </motion.div>
      </AnimatePresence>
    );
  }

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={status.kind + ('reason' in status ? status.reason : '')}
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

const FORAGE_SUBCATS: { key: ForageSubcategory; en: string; ur: string }[] = [
  { key: 'fresh',  en: 'Fresh Greens',          ur: 'تازہ سبز چارہ' },
  { key: 'silage', en: 'Silages',               ur: 'سائلج'         },
  { key: 'dry',    en: 'Hay & Straw',           ur: 'گھاس اور بھوسہ'},
];

// Concentrate-side sections shown under the "Concentrate" tab. Sourced from
// CATEGORY_KEYS so a new concentrate category appears here automatically.
const CONC_CATS = CATEGORY_KEYS;

export function TmrStep2Ingredients({
  language,
  selectedAnimal,
  selectedStage,
  forageDmPct,
  selectedForages,
  selectedConcentrates,
  onForageToggle,
  onConcentrateToggle,
  onNext,
  onBack,
}: TmrStep2IngredientsProps) {
  const [activeTab, setActiveTab] = useState<TabKey>('forage');
  const [infoKey, setInfoKey] = useState<string | null>(null);

  // ── Live LP feasibility ───────────────────────────────────────────────────
  const feasibility = useMemo<FeasibilityStatus>(() => {
    const ranges = getTmrNutritionRange(selectedAnimal, selectedStage);
    if (!ranges) return { kind: 'pending', reason: 'no_targets' };

    const needForage      = forageDmPct > 0   && selectedForages.length === 0;
    const needConcentrate = forageDmPct < 100 && selectedConcentrates.length === 0;
    if (needForage && needConcentrate) return { kind: 'pending', reason: 'need_both' };
    if (needForage)                    return { kind: 'pending', reason: 'need_forage' };
    if (needConcentrate)               return { kind: 'pending', reason: 'need_concentrate' };

    const result = tmrFormulate({
      ingredientKeys: [...selectedForages, ...selectedConcentrates],
      ranges,
      forageDmPct,
    });
    if (result.success) return { kind: 'feasible' };
    return { kind: 'infeasible', bottleneck: result.bottleneck };
  }, [selectedAnimal, selectedStage, forageDmPct, selectedForages, selectedConcentrates]);

  // Toast on feasibility transitions (debounced, replaceable)
  const prevKindRef = useRef<FeasibilityStatus['kind'] | null>(null);
  useEffect(() => {
    const handle = setTimeout(() => {
      const prev = prevKindRef.current;
      const curr = feasibility.kind;
      if (prev !== null && prev !== curr) {
        if (curr === 'feasible') {
          toast.success(
            language === 'en'
              ? 'Selection can hit the TMR targets — ready to formulate.'
              : 'TMR کے اہداف پورے ہو سکتے ہیں — اب فارمولا بنائیں۔',
            { id: 'tmr-feasibility', duration: 3500 }
          );
        } else if (curr === 'infeasible') {
          toast.warning(
            language === 'en'
              ? "Selection can't reach the TMR targets at this DM split."
              : 'اس DM تقسیم پر منتخب اجزاء سے ہدف پورے نہیں ہو رہے۔',
            { id: 'tmr-feasibility', duration: 5000 }
          );
        }
      }
      prevKindRef.current = curr;
    }, 600);
    return () => clearTimeout(handle);
  }, [feasibility.kind, language]);

  const t = {
    title:        language === 'en' ? 'Pick Forages & Concentrates' : 'چارہ اور کانسنٹریٹ منتخب کریں',
    subtitle:     language === 'en'
      ? `Currently set to ${forageDmPct}% forage / ${100 - forageDmPct}% concentrate (DM basis). Adjust in Step 1.`
      : `${forageDmPct}% چارہ / ${100 - forageDmPct}% کانسنٹریٹ (DM)۔ مرحلہ 1 میں تبدیل کریں۔`,
    forage:       language === 'en' ? 'Forage' : 'چارہ',
    concentrate:  language === 'en' ? 'Concentrate' : 'کانسنٹریٹ',
    next:         language === 'en' ? 'Next' : 'اگلا',
    back:         language === 'en' ? 'Back' : 'واپس',
    forageEmpty:  language === 'en' ? 'No forages added yet.' : 'ابھی کوئی چارہ نہیں۔',
    concentrateEmpty: language === 'en' ? 'No concentrates added yet.' : 'ابھی کوئی کانسنٹریٹ نہیں۔',
  };

  // Concentrate categories, with bilingual section titles
  const concentrateSections = CONC_CATS.map((catKey) => ({
    key: catKey,
    title: INGREDIENT_CATEGORIES[catKey][language === 'en' ? 'titleEn' : 'titleUr'],
    keys: getCategoryIngredientKeys(catKey),
  }));

  const forageSections = FORAGE_SUBCATS.map((sub) => ({
    key: sub.key,
    title: language === 'en' ? sub.en : sub.ur,
    keys: getForageKeysBySubcategory(sub.key),
  }));

  // Selection counts for the tab badges
  const forageCount = selectedForages.length;
  const concCount   = selectedConcentrates.length;

  return (
    <>
      <IngredientDetailModal
        isOpen={infoKey !== null}
        ingredientKey={infoKey}
        language={language}
        onClose={() => setInfoKey(null)}
      />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        className="space-y-6 sm:space-y-8"
      >
        <div>
          <h2 className="text-xl sm:text-2xl font-bold mb-1 sm:mb-2 flex items-center gap-2">
            <span className="text-2xl sm:text-3xl">🌾</span>
            {t.title}
          </h2>
          <p className="text-gray-600 text-xs sm:text-sm leading-snug">{t.subtitle}</p>
        </div>

        <FeasibilityGuide language={language} status={feasibility} forageDmPct={forageDmPct} />

        {/* Tab bar */}
        <div className="flex gap-2 border-b-2 border-gray-200">
          <TabButton
            active={activeTab === 'forage'}
            onClick={() => setActiveTab('forage')}
            label={t.forage}
            icon="🌿"
            count={forageCount}
          />
          <TabButton
            active={activeTab === 'concentrate'}
            onClick={() => setActiveTab('concentrate')}
            label={t.concentrate}
            icon="⚙️"
            count={concCount}
          />
        </div>

        {/* Tab content */}
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, x: activeTab === 'forage' ? -10 : 10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: activeTab === 'forage' ? 10 : -10 }}
            transition={{ duration: 0.2 }}
            className="space-y-6 sm:space-y-8"
          >
            {activeTab === 'forage' && forageSections.map((section) => (
              <IngredientSection
                key={section.key}
                title={section.title}
                language={language}
                ingredientKeys={section.keys}
                selectedKeys={selectedForages}
                onToggle={onForageToggle}
                onInfo={setInfoKey}
              />
            ))}
            {activeTab === 'concentrate' && concentrateSections.map((section) => (
              <IngredientSection
                key={section.key}
                title={section.title}
                language={language}
                ingredientKeys={section.keys}
                selectedKeys={selectedConcentrates}
                onToggle={onConcentrateToggle}
                onInfo={setInfoKey}
              />
            ))}
          </motion.div>
        </AnimatePresence>

        {/* Sticky compact guide above buttons */}
        <FeasibilityGuide language={language} status={feasibility} forageDmPct={forageDmPct} compact />

        {/* Action buttons */}
        <div className="flex gap-3 pt-6 sm:pt-8">
          <Button variant="outline" onClick={onBack} className="flex-1 h-12 sm:h-11 rounded-xl border-slate-300 font-semibold tap-transparent">
            {t.back}
          </Button>
          <Button
            onClick={onNext}
            disabled={selectedForages.length === 0 && selectedConcentrates.length === 0}
            className="flex-1 h-12 sm:h-11 rounded-xl bg-gradient-to-r from-[#0e3b5e] to-[#155e75] hover:from-[#09253b] hover:to-[#0e3b5e] text-white font-bold shadow-md shadow-[#0e3b5e]/20 tap-transparent disabled:opacity-50"
          >
            {t.next}
          </Button>
        </div>
      </motion.div>
    </>
  );
}

function TabButton({
  active, onClick, label, icon, count,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  icon: string;
  count: number;
}) {
  return (
    <button
      onClick={onClick}
      className={`relative flex-1 px-3 py-3 sm:py-2.5 text-sm font-bold transition-all border-b-2 -mb-0.5 tap-transparent ${
        active
          ? 'text-[#0e3b5e] border-[#558b2f]'
          : 'text-slate-500 border-transparent hover:text-[#0e3b5e]'
      }`}
    >
      <span className="mr-1.5">{icon}</span>
      {label}
      {count > 0 && (
        <span className={`ml-2 inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full text-[10px] font-bold ${
          active ? 'bg-[#558b2f] text-white' : 'bg-slate-200 text-slate-700'
        }`}>
          {count}
        </span>
      )}
    </button>
  );
}
