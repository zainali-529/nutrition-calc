'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { X, AlertCircle, Plus } from 'lucide-react';
import { useMemo, useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  type Ingredient,
  type IngredientCategory,
  getAllIngredients,
} from '@/lib/constants';
import { generateUniqueKey, saveCustomIngredient } from '@/lib/customIngredients';

interface AddIngredientModalProps {
  isOpen: boolean;
  language: 'en' | 'ur';
  onClose: () => void;
  /** Called after a custom ingredient has been persisted. */
  onAdded: (ing: Ingredient) => void;
}

// ---------------------------------------------------------------------------
// Form schema — every numeric field with validation bounds and bilingual
// labels. The "required" flag drives both visual asterisks and save-time
// validation (LP solver requires these to produce a meaningful formula).
// ---------------------------------------------------------------------------
type Field = {
  /** Object key on the eventual `Ingredient` record. */
  name:
    | 'dm' | 'cp' | 'me' | 'tdn' | 'adf' | 'ndf' | 'fat' | 'starch'
    | 'ca' | 'p' | 'ash' | 'price' | 'maxInclusion';
  labelEn: string;
  labelUr: string;
  unit: string;
  min: number;
  max: number;
  required: boolean;
  /** Short example string shown as placeholder. */
  example: string;
};

const COMPOSITION_FIELDS: Field[] = [
  { name: 'dm',     labelEn: 'Dry Matter',          labelUr: 'خشک مادہ',          unit: '%',         min: 1,  max: 100, required: true,  example: 'corn 89, urea 99' },
  { name: 'cp',     labelEn: 'Crude Protein',       labelUr: 'پروٹین',             unit: '% DM',      min: 0,  max: 300, required: true,  example: 'sbm 46, corn 9' },
  { name: 'me',     labelEn: 'Energy (ME)',         labelUr: 'توانائی',           unit: 'Mcal/kg DM',min: 0,  max: 8,   required: true,  example: 'corn 3.25, fat 4.78' },
  { name: 'tdn',    labelEn: 'TDN',                 labelUr: 'TDN',                unit: '% DM',      min: 0,  max: 200, required: true,  example: 'corn 88, fat 180' },
  { name: 'ndf',    labelEn: 'NDF (Fibre)',         labelUr: 'فائبر (NDF)',        unit: '% DM',      min: 0,  max: 100, required: true,  example: 'corn 12, bran 45' },
  { name: 'fat',    labelEn: 'Crude Fat',           labelUr: 'چکنائی',             unit: '% DM',      min: 0,  max: 100, required: true,  example: 'corn 4, oil 99' },
  { name: 'ca',     labelEn: 'Calcium',             labelUr: 'کیلشیم',             unit: '% DM',      min: 0,  max: 50,  required: true,  example: 'limestone 36' },
  { name: 'p',      labelEn: 'Phosphorus',          labelUr: 'فاسفورس',            unit: '% DM',      min: 0,  max: 50,  required: true,  example: 'DCP 18, bran 1.1' },
  { name: 'adf',    labelEn: 'ADF (optional)',      labelUr: 'ADF (اختیاری)',      unit: '% DM',      min: 0,  max: 100, required: false, example: '0 if unknown' },
  { name: 'starch', labelEn: 'Starch (optional)',   labelUr: 'نشاستہ (اختیاری)',   unit: '% DM',      min: 0,  max: 100, required: false, example: '0 if unknown' },
  { name: 'ash',    labelEn: 'Ash (optional)',      labelUr: 'راکھ (اختیاری)',     unit: '% DM',      min: 0,  max: 100, required: false, example: '0 if unknown' },
];

const COMMERCIAL_FIELDS: Field[] = [
  { name: 'price',         labelEn: 'Price',         labelUr: 'قیمت',                unit: 'Rs/kg as-fed', min: 0.1, max: 10000, required: true, example: 'corn 102, sbm 300' },
  { name: 'maxInclusion',  labelEn: 'Max inclusion', labelUr: 'زیادہ سے زیادہ شمولیت', unit: '%',            min: 0.5, max: 100,   required: true, example: 'protein 25-30, fat 5' },
];

const CATEGORIES: { value: IngredientCategory; en: string; ur: string; icon: string }[] = [
  { value: 'energy',  en: 'Energy Source',     ur: 'توانائی کا ذریعہ',  icon: '🌾' },
  { value: 'protein', en: 'Protein Source',    ur: 'پروٹین کا ذریعہ',   icon: '🫘' },
  { value: 'fiber',   en: 'Bran / Fiber',      ur: 'چوکر / فائبر',       icon: '🟫' },
  { value: 'fat',     en: 'Supplement / Mineral', ur: 'سپلیمنٹ / معدنیات', icon: '💊' },
];

type FormState = {
  category: IngredientCategory;
  nameEn: string;
  nameUr: string;
  icon: string;
  /** Numeric fields — kept as strings to mirror raw input until validation. */
  values: Partial<Record<Field['name'], string>>;
};

const INITIAL_STATE: FormState = {
  category: 'energy',
  nameEn: '',
  nameUr: '',
  icon: '',
  values: {},
};

export function AddIngredientModal({
  isOpen,
  language,
  onClose,
  onAdded,
}: AddIngredientModalProps) {
  const [form, setForm] = useState<FormState>(INITIAL_STATE);
  const [submitted, setSubmitted] = useState(false);

  // Existing keys to detect collisions when generating a unique slug
  const takenKeys = useMemo(() => new Set(getAllIngredients().map((i) => i.key)), [isOpen]);

  // ----------------- validation -----------------
  const errors = useMemo(() => validate(form, language), [form, language]);
  const hasErrors = Object.keys(errors).length > 0;

  // ----------------- handlers -----------------
  const setField = (name: Field['name'], val: string) =>
    setForm((f) => ({ ...f, values: { ...f.values, [name]: val } }));

  const reset = () => {
    setForm(INITIAL_STATE);
    setSubmitted(false);
  };

  const handleSave = () => {
    setSubmitted(true);
    if (hasErrors) {
      toast.error(
        language === 'en'
          ? 'Please fix the highlighted fields before saving.'
          : 'محفوظ کرنے سے پہلے غلط فیلڈز درست کریں۔',
        { id: 'add-ing-validation' }
      );
      return;
    }

    const ing = buildIngredient(form, takenKeys);
    saveCustomIngredient(ing);

    toast.success(
      language === 'en'
        ? `Added "${ing.nameEn}" — it's now available in Step 2.`
        : `"${ing.nameUr}" شامل کر دیا گیا — اب مرحلہ 2 میں دستیاب ہے۔`,
      { id: 'add-ing-success' }
    );

    onAdded(ing);
    reset();
    onClose();
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  if (!isOpen) return null;

  // -------------------------------------------------------------------------
  // Helper to render a numeric input row with inline validation feedback.
  // -------------------------------------------------------------------------
  const renderNumeric = (f: Field) => {
    const id = `field-${f.name}`;
    const err = errors[f.name];
    const showError = submitted && err;
    return (
      <div key={f.name} className="space-y-1">
        <Label htmlFor={id} className="text-xs font-semibold text-gray-700 flex items-center gap-1">
          {language === 'en' ? f.labelEn : f.labelUr}
          {f.required && <span className="text-red-500">*</span>}
          <span className="ml-auto text-[10px] font-normal text-gray-400">{f.unit}</span>
        </Label>
        <Input
          id={id}
          type="number"
          step="any"
          inputMode="decimal"
          placeholder={f.example}
          value={form.values[f.name] ?? ''}
          onChange={(e) => setField(f.name, e.target.value)}
          className={`h-9 text-sm ${showError ? 'border-red-400 focus-visible:ring-red-200' : ''}`}
        />
        {showError && (
          <p className="text-[11px] text-red-600 leading-tight">{err}</p>
        )}
      </div>
    );
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={handleClose}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[70]"
          />

          {/* Modal — bottom sheet on mobile, centered card on desktop */}
          <motion.div
            initial={{ opacity: 0, y: 40, scale: 0.98 }}
            animate={{ opacity: 1, y: 0,  scale: 1 }}
            exit={{    opacity: 0, y: 40, scale: 0.98 }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            className="fixed inset-x-0 bottom-0 sm:left-1/2 sm:top-1/2 sm:bottom-auto sm:inset-x-auto sm:-translate-x-1/2 sm:-translate-y-1/2 w-full sm:w-[85vw] lg:w-[75vw] max-w-3xl z-[71] max-h-[92vh] flex flex-col"
          >
            <div className="bg-gradient-to-br from-white to-slate-50 rounded-t-2xl sm:rounded-2xl shadow-2xl border border-white/40 overflow-hidden flex flex-col max-h-[92vh] pb-safe-bottom sm:pb-0">
              {/* Header */}
              <div className="relative bg-gradient-to-r from-emerald-500 to-emerald-600 px-6 py-5 text-white flex-shrink-0">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-11 h-11 rounded-xl bg-white/20 flex items-center justify-center">
                      <Plus className="w-5 h-5" />
                    </div>
                    <div>
                      <h2 className="text-lg sm:text-xl font-bold">
                        {language === 'en' ? 'Add a Custom Ingredient' : 'حسبِ ضرورت اجزاء شامل کریں'}
                      </h2>
                      <p className="text-xs sm:text-sm opacity-90">
                        {language === 'en'
                          ? 'Provide nutrient values on a Dry Matter (DM) basis. Saved to this device only.'
                          : 'غذائی اقدار خشک مادہ (DM) کی بنیاد پر دیں۔ صرف اس آلے میں محفوظ ہوں گی۔'}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={handleClose}
                    className="p-1.5 rounded-lg hover:bg-white/20 transition-colors flex-shrink-0"
                    aria-label={language === 'en' ? 'Close' : 'بند کریں'}
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* Body — scrollable form */}
              <div className="px-6 py-5 overflow-y-auto flex-1">
                {/* Identity */}
                <Section title={language === 'en' ? 'Identity' : 'شناخت'}>
                  <div className="space-y-1">
                    <Label className="text-xs font-semibold text-gray-700">
                      {language === 'en' ? 'Category' : 'زمرہ'}
                      <span className="text-red-500"> *</span>
                    </Label>
                    <select
                      value={form.category}
                      onChange={(e) => setForm((f) => ({ ...f, category: e.target.value as IngredientCategory }))}
                      className="w-full h-9 px-3 rounded-md border border-gray-300 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-300"
                    >
                      {CATEGORIES.map((c) => (
                        <option key={c.value} value={c.value}>
                          {c.icon} {language === 'en' ? c.en : c.ur}
                        </option>
                      ))}
                    </select>
                  </div>

                  <FieldText
                    id="nameEn"
                    label={language === 'en' ? 'Name (English)' : 'نام (انگریزی)'}
                    required
                    error={submitted ? errors.nameEn : undefined}
                    value={form.nameEn}
                    placeholder="e.g. Custom Mash"
                    onChange={(v) => setForm((f) => ({ ...f, nameEn: v }))}
                  />

                  <FieldText
                    id="nameUr"
                    label={language === 'en' ? 'Name (Urdu)' : 'نام (اردو)'}
                    required
                    error={submitted ? errors.nameUr : undefined}
                    value={form.nameUr}
                    placeholder="مثال: کسٹم میش"
                    onChange={(v) => setForm((f) => ({ ...f, nameUr: v }))}
                  />

                  <FieldText
                    id="icon"
                    label={language === 'en' ? 'Icon (single emoji)' : 'آئیکن (ایک ایموجی)'}
                    required={false}
                    value={form.icon}
                    placeholder="📦"
                    onChange={(v) => setForm((f) => ({ ...f, icon: v.slice(0, 4) }))}
                    helper={language === 'en' ? 'Defaults to a category icon if blank.' : 'خالی چھوڑنے پر زمرے کا آئیکن استعمال ہو گا۔'}
                  />
                </Section>

                {/* Composition (DM basis) */}
                <Section title={language === 'en' ? 'Composition (DM basis)' : 'ترکیب (خشک مادہ بنیاد)'}>
                  {COMPOSITION_FIELDS.map(renderNumeric)}
                </Section>

                {/* Commercial */}
                <Section title={language === 'en' ? 'Pricing & Inclusion' : 'قیمت اور حد'}>
                  {COMMERCIAL_FIELDS.map(renderNumeric)}
                </Section>

                {/* Required-fields explanation */}
                <div className="mt-4 rounded-md bg-blue-50 border border-blue-200 p-3 text-xs text-blue-900 flex gap-2">
                  <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5 text-blue-600" />
                  <p className="leading-relaxed">
                    {language === 'en'
                      ? 'Fields marked * are required for the LP solver to use this ingredient. ADF, Starch, and Ash are display-only and default to 0 if blank.'
                      : '* والے فیلڈز LP کیلکولیٹر کے لیے ضروری ہیں۔ ADF، نشاستہ اور راکھ صرف ڈسپلے کے لیے ہیں — خالی پر 0 سمجھے جائیں گے۔'}
                  </p>
                </div>
              </div>

              {/* Footer */}
              <div className="px-6 py-4 border-t border-gray-200 bg-white flex items-center justify-between gap-3 flex-shrink-0">
                {submitted && hasErrors ? (
                  <p className="text-xs text-red-600 font-medium">
                    {language === 'en'
                      ? `${Object.keys(errors).length} field${Object.keys(errors).length === 1 ? '' : 's'} need attention`
                      : `${Object.keys(errors).length} فیلڈز درست کریں`}
                  </p>
                ) : <span />}
                <div className="flex gap-2">
                  <Button variant="outline" onClick={handleClose} className="h-9">
                    {language === 'en' ? 'Cancel' : 'منسوخ'}
                  </Button>
                  <Button
                    onClick={handleSave}
                    className="h-9 bg-emerald-600 hover:bg-emerald-700 text-white"
                  >
                    {language === 'en' ? 'Save Ingredient' : 'محفوظ کریں'}
                  </Button>
                </div>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

// ---------------------------------------------------------------------------
// Section wrapper — visual grouping with a heading + responsive 2-col grid.
// ---------------------------------------------------------------------------
function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mb-5">
      <h3 className="text-sm font-bold text-emerald-800 uppercase tracking-wide mb-3 pb-1 border-b border-emerald-100">
        {title}
      </h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">{children}</div>
    </section>
  );
}

function FieldText({
  id,
  label,
  required,
  error,
  value,
  placeholder,
  onChange,
  helper,
}: {
  id: string;
  label: string;
  required: boolean;
  error?: string;
  value: string;
  placeholder?: string;
  onChange: (v: string) => void;
  helper?: string;
}) {
  return (
    <div className="space-y-1">
      <Label htmlFor={id} className="text-xs font-semibold text-gray-700">
        {label}
        {required && <span className="text-red-500"> *</span>}
      </Label>
      <Input
        id={id}
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className={`h-9 text-sm ${error ? 'border-red-400 focus-visible:ring-red-200' : ''}`}
      />
      {error && <p className="text-[11px] text-red-600 leading-tight">{error}</p>}
      {!error && helper && <p className="text-[11px] text-gray-500 leading-tight">{helper}</p>}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Validation — returns a map of field → error message. Empty map = valid.
// ---------------------------------------------------------------------------
function validate(form: FormState, language: 'en' | 'ur'): Record<string, string> {
  const errors: Record<string, string> = {};
  const trans = {
    required: language === 'en' ? 'Required' : 'درکار',
    range:    language === 'en' ? 'Must be between {min} and {max}' : 'حد {min} سے {max} کے درمیان',
    invalid:  language === 'en' ? 'Enter a number' : 'عدد درج کریں',
  };

  if (!form.nameEn.trim()) errors.nameEn = trans.required;
  if (!form.nameUr.trim()) errors.nameUr = trans.required;

  for (const f of [...COMPOSITION_FIELDS, ...COMMERCIAL_FIELDS]) {
    const raw = form.values[f.name];
    const trimmed = raw?.trim() ?? '';

    if (!trimmed) {
      if (f.required) errors[f.name] = trans.required;
      continue;
    }
    const num = Number(trimmed);
    if (!Number.isFinite(num)) {
      errors[f.name] = trans.invalid;
      continue;
    }
    if (num < f.min || num > f.max) {
      errors[f.name] = trans.range
        .replace('{min}', String(f.min))
        .replace('{max}', String(f.max));
    }
  }

  return errors;
}

// ---------------------------------------------------------------------------
// Build the final Ingredient record from a validated form. Falls back to
// sensible defaults for optional fields and auto-derives intensity levels.
// ---------------------------------------------------------------------------
function buildIngredient(form: FormState, takenKeys: Set<string>): Ingredient {
  const num = (name: Field['name'], fallback = 0): number => {
    const raw = form.values[name]?.trim();
    if (!raw) return fallback;
    const n = Number(raw);
    return Number.isFinite(n) ? n : fallback;
  };

  const cp = num('cp');
  const me = num('me');

  // Auto-derive simple "intensity" labels so the existing badges in Step 2
  // light up reasonably for user-added ingredients.
  const energyLevel: 'high' | 'med' | 'low' =
    me >= 3.0 ? 'high' : me >= 2.4 ? 'med' : 'low';
  const proteinLevel: 'high' | 'med' | 'low' =
    cp >= 30 ? 'high' : cp >= 15 ? 'med' : 'low';

  const categoryIcon =
    CATEGORIES.find((c) => c.value === form.category)?.icon ?? '📦';

  return {
    key: generateUniqueKey(form.nameEn, takenKeys),
    category: form.category,
    icon: form.icon.trim() || categoryIcon,
    nameEn: form.nameEn.trim(),
    nameUr: form.nameUr.trim() || form.nameEn.trim(),
    energyLevel,
    proteinLevel,
    dm:     num('dm', 90),
    cp,
    me,
    tdn:    num('tdn'),
    adf:    num('adf'),
    ndf:    num('ndf'),
    fat:    num('fat'),
    starch: num('starch'),
    ca:     num('ca'),
    p:      num('p'),
    ash:    num('ash'),
    price:        num('price'),
    maxInclusion: num('maxInclusion', 25),
    capReasonEn:
      'User-defined ingredient. Adjust the max-inclusion based on your own experience and the ingredient\'s anti-nutritional factors.',
    capReasonUr:
      'صارف کا اپنا جزو۔ زیادہ سے زیادہ شمولیت کو اپنے تجربے اور جزو کے غذائی خواص کے مطابق مقرر کریں۔',
  };
}
