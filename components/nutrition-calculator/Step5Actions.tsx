'use client';

import { motion } from 'framer-motion';
import {
  Check, CheckCircle2, FileText, FlaskConical, MessageCircle, Printer, RotateCcw,
  Save, Loader2,
} from 'lucide-react';
import { FormulaItem, calculateNutrients, exportFormulaAsText } from '@/lib/calculations';
import { useState } from 'react';
import { saveFormula } from '@/lib/savedFormulas';
import { getOverride } from '@/lib/ingredientOverrides';
import { getNutritionRange } from '@/lib/constants';
import { PrintableRecipe } from './PrintableRecipe';
import { TARGETED, countOnTarget } from './NutrientGrid';
import { CalculationBreakdownModal } from './CalculationBreakdownModal';

interface Step5ActionsProps {
  language: 'en' | 'ur';
  formula: FormulaItem[];
  animal: string;                                    // display label, e.g. "Dairy Cow"
  stage: string;                                     // display label, e.g. "Early Lactation (0-100 days)"
  animalId: string | null;                           // for restoration on load
  stageIndex: number;                                // for restoration on load
  chosenIngredients: Record<string, string[]>;      // for restoration on load
  onReset: () => void;
}

/**
 * Actions on this screen used to be five identical bordered rows with a grey
 * arrow, which gave the destructive "start over" the same visual weight as
 * "save your work". They are now tiered: one filled primary, a grid of
 * secondary export actions, and the reset separated below a rule.
 */
function PrimaryAction({
  label, hint, done, loading, onClick,
}: {
  label: string;
  hint: string;
  done?: boolean;
  loading?: boolean;
  onClick: () => void;
}) {
  return (
    <motion.button
      whileHover={{ y: -1 }}
      whileTap={{ scale: 0.99 }}
      onClick={onClick}
      disabled={loading || done}
      className={`w-full rounded-xl px-4 py-3.5 flex items-center gap-3 text-left transition-colors tap-transparent disabled:cursor-default ${
        done
          ? 'bg-emerald-50 border border-emerald-300 text-emerald-800'
          : 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm'
      }`}
    >
      <span className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${
        done ? 'bg-emerald-600 text-white' : 'bg-white/20'
      }`}>
        {loading ? <Loader2 className="w-4 h-4 animate-spin" />
          : done ? <Check className="w-4 h-4" strokeWidth={3} />
          : <Save className="w-4 h-4" />}
      </span>
      <span className="min-w-0">
        <span className="block text-sm font-bold leading-tight">{label}</span>
        <span className={`block text-[11px] ${done ? 'text-emerald-700' : 'text-emerald-50/90'}`}>{hint}</span>
      </span>
    </motion.button>
  );
}

function SecondaryAction({
  icon, label, hint, loading, onClick,
}: {
  icon: React.ReactNode;
  label: string;
  hint: string;
  loading?: boolean;
  onClick: () => void;
}) {
  return (
    <motion.button
      whileHover={{ y: -2 }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      disabled={loading}
      className="rounded-xl border border-slate-200 bg-white px-2.5 py-3 sm:px-3 text-left hover:border-emerald-400 hover:shadow-sm transition-all tap-transparent disabled:opacity-60"
    >
      <span className="flex items-center gap-1.5 text-emerald-700">
        {loading ? <Loader2 className="w-4 h-4 flex-shrink-0 animate-spin" /> : icon}
        <span className="text-[12px] sm:text-[13px] font-bold text-slate-900 leading-tight truncate">{label}</span>
      </span>
      {/* Hint is desktop-only: three columns at 390px can't fit a sentence each,
          and the icon + label already say what the button does. */}
      <span className="mt-0.5 hidden sm:block text-[11px] text-slate-500 leading-snug">{hint}</span>
    </motion.button>
  );
}

export function Step5Actions({
  language,
  formula,
  animal,
  stage,
  animalId,
  stageIndex,
  chosenIngredients,
  onReset,
}: Step5ActionsProps) {
  const [loadingAction, setLoadingAction] = useState<string | null>(null);
  const [savedSuccess, setSavedSuccess] = useState(false);
  /**
   * Sticky, unlike `savedSuccess` which clears after 3s to dismiss the toast.
   * The primary button stays in its "Saved" state so the user gets a lasting
   * confirmation and can't create duplicate entries by tapping twice.
   */
  const [saved, setSaved] = useState(false);
  const [breakdownOpen, setBreakdownOpen] = useState(false);

  const nutrients = calculateNutrients(formula);
  const ranges = getNutritionRange(animalId, stageIndex);
  const onTarget = countOnTarget(nutrients, ranges);

  const t = {
    formulaComplete: language === 'en' ? 'Formula ready' : 'فارمولا تیار',
    congratulations: language === 'en'
      ? 'Save it, share it, or print it for the feed mill.'
      : 'محفوظ کریں، شیئر کریں، یا فیڈ مل کے لیے پرنٹ کریں۔',
    saveFarmula: language === 'en' ? 'Save Formula' : 'فارمولا محفوظ کریں',
    saveDesc: language === 'en' ? 'Keep it on this device to reuse later' : 'اس آلے میں محفوظ رکھیں',
    savedLabel: language === 'en' ? 'Saved' : 'محفوظ ہو گیا',
    savedHint: language === 'en' ? 'Find it under the bookmark icon' : 'بک مارک آئیکن میں دیکھیں',
    shareWhatsApp: language === 'en' ? 'WhatsApp' : 'واٹس ایپ',
    shareDesc: language === 'en' ? 'Send as a message' : 'پیغام کے طور پر بھیجیں',
    // This button writes a .txt file, not a PDF. It was labelled "Download PDF",
    // which was simply false and left two buttons appearing to do the same job —
    // the PDF path is the print dialog's "Save as PDF".
    downloadPDF: language === 'en' ? 'Text file' : 'ٹیکسٹ فائل',
    downloadDesc: language === 'en' ? 'Download as .txt' : '.txt ڈاؤن لوڈ کریں',
    createNew: language === 'en' ? 'Start a new formula' : 'نیا فارمولا شروع کریں',
    saved: language === 'en' ? 'Formula saved successfully!' : 'فارمولا کامیابی سے محفوظ ہو گیا!',
    printRecipe: language === 'en' ? 'Print / PDF' : 'پرنٹ / PDF',
    printDesc:   language === 'en'
      ? 'Print or "Save as PDF"'
      : 'پرنٹ یا PDF محفوظ کریں',
    breakdown:     language === 'en' ? 'See background calculation' : 'پیچھے کا حساب دیکھیں',
    breakdownDesc: language === 'en'
      ? 'See every step of the maths — and download it as a table'
      : 'حساب کا ہر مرحلہ دیکھیں — اور ٹیبل ڈاؤن لوڈ کریں',
    summary: language === 'en' ? 'Formula summary' : 'فارمولا خلاصہ',
    animalLbl: language === 'en' ? 'Animal' : 'جانور',
    stageLbl: language === 'en' ? 'Stage' : 'مرحلہ',
    weightLbl: language === 'en' ? 'Batch' : 'بیچ',
    perKgLbl: language === 'en' ? 'Cost / kg' : 'فی کلو',
    totalLbl: language === 'en' ? 'Total cost' : 'کل لاگت',
    targetsLbl: language === 'en' ? 'Targets met' : 'اہداف',
  };

  const handleSave = async () => {
    setLoadingAction('save');
    try {
      const n = nutrients;

      // Capture ingredient overrides active right now for conflict detection on load
      const activeOverrides: Record<string, Record<string, number>> = {};
      for (const item of formula) {
        const ovr = getOverride(item.key);
        if (ovr) activeOverrides[item.key] = ovr as Record<string, number>;
      }

      saveFormula({
        animalId,
        animalLabel:       animal,
        stageIndex,
        stageLabel:        stage,
        chosenIngredients,
        formula,
        totals: {
          weight:     n.totalAsFed,
          perKgPrice: n.perKgPrice,
          protein:    n.protein,
          energy:     n.energy,
        },
        ingredientOverrides: activeOverrides,
      });
      setSaved(true);
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 3000);
    } catch (error) {
      console.error('Error saving formula:', error);
    } finally {
      setLoadingAction(null);
    }
  };

  const handleShare = () => {
    setLoadingAction('share');
    try {
      const text = exportFormulaAsText(formula, language);
      const encodedText = encodeURIComponent(text);
      window.open(`https://wa.me/?text=${encodedText}`, '_blank');
    } catch (error) {
      console.error('Error sharing:', error);
    } finally {
      setLoadingAction(null);
    }
  };

  const handleDownloadPDF = () => {
    setLoadingAction('pdf');
    try {
      const text = exportFormulaAsText(formula, language);
      const element = document.createElement('a');
      element.setAttribute('href', 'data:text/plain;charset=utf-8,' + encodeURIComponent(text));
      element.setAttribute('download', `formula-${Date.now()}.txt`);
      element.style.display = 'none';
      document.body.appendChild(element);
      element.click();
      document.body.removeChild(element);
    } catch (error) {
      console.error('Error downloading:', error);
    } finally {
      setLoadingAction(null);
    }
  };

  /**
   * Print the recipe sheet. Triggers the native print dialog — the user can
   * either send to a real printer or "Save as PDF" from the dialog.
   *
   * The actual print rendering is driven by globals.css's @media print rules,
   * which hide everything except the .printable-recipe block (rendered at the
   * bottom of this component).
   */
  const handlePrint = () => {
    setLoadingAction('print');
    try {
      window.print();
    } finally {
      // Tiny defer so the print dialog has time to open before the spinner clears
      setTimeout(() => setLoadingAction(null), 300);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="space-y-5"
    >
      {/* Slim success header. The old version was a full-width saturated
          gradient block with a 5xl emoji, which cost most of a phone screen to
          say one thing the stepper already implies. */}
      <div className="flex items-center gap-3 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3">
        <span className="w-9 h-9 rounded-full bg-emerald-600 text-white flex items-center justify-center flex-shrink-0">
          <CheckCircle2 className="w-5 h-5" />
        </span>
        <div className="min-w-0">
          <h2 className="text-base sm:text-lg font-bold text-emerald-900 leading-tight">{t.formulaComplete}</h2>
          <p className="text-[11px] sm:text-xs text-emerald-700">{t.congratulations}</p>
        </div>
      </div>

      {/* Summary — the numbers a farmer actually needs at hand-off.
          "Items: 5" and the date told them nothing they'd act on; batch size,
          cost per kg, total cost and targets-met are what matter when taking
          this to a feed mill. Date moves to a small footer line. */}
      <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
        <div className="px-4 py-2.5 border-b border-slate-100">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">{t.summary}</h3>
        </div>

        <dl className="divide-y divide-slate-100">
          <div className="flex items-baseline justify-between gap-3 px-4 py-2">
            <dt className="text-xs text-slate-500">{t.animalLbl}</dt>
            <dd className="text-sm font-semibold text-slate-900 text-right">{animal}</dd>
          </div>
          <div className="flex items-baseline justify-between gap-3 px-4 py-2">
            <dt className="text-xs text-slate-500">{t.stageLbl}</dt>
            <dd className="text-sm font-semibold text-slate-900 text-right">{stage}</dd>
          </div>
        </dl>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-px bg-slate-100 border-t border-slate-100">
          {[
            { label: t.weightLbl, value: `${nutrients.totalAsFed.toFixed(0)} kg` },
            { label: t.perKgLbl,  value: `₨${nutrients.perKgPrice.toFixed(2)}` },
            { label: t.totalLbl,  value: `₨${nutrients.cost.toLocaleString('en-PK')}` },
            {
              label: t.targetsLbl,
              value: ranges ? `${onTarget}/${TARGETED.length}` : '—',
              good: ranges ? onTarget === TARGETED.length : undefined,
            },
          ].map((s) => (
            <div key={s.label} className="bg-white px-3 py-2.5">
              <div className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">{s.label}</div>
              <div className={`text-base font-bold tabular-nums leading-tight ${
                s.good === undefined ? 'text-slate-900' : s.good ? 'text-emerald-700' : 'text-amber-700'
              }`}>
                {s.value}
              </div>
            </div>
          ))}
        </div>

        <div className="px-4 py-2 border-t border-slate-100 text-[10px] text-slate-400">
          {new Date().toLocaleDateString()}
        </div>
      </div>

      {/* Sits directly under the summary on purpose: the natural next question
          after seeing those numbers is "where did they come from?". */}
      <motion.button
        whileHover={{ y: -1 }}
        whileTap={{ scale: 0.99 }}
        onClick={() => setBreakdownOpen(true)}
        className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 flex items-center gap-3 text-left hover:border-slate-400 hover:bg-slate-50 transition-colors tap-transparent"
      >
        <span className="w-9 h-9 rounded-lg bg-slate-900 text-white flex items-center justify-center flex-shrink-0">
          <FlaskConical className="w-4 h-4" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-bold text-slate-900 leading-tight">{t.breakdown}</span>
          <span className="block text-[11px] text-slate-500">{t.breakdownDesc}</span>
        </span>
        <span className="text-slate-400 text-lg leading-none flex-shrink-0">›</span>
      </motion.button>

      {/* Primary action */}
      <PrimaryAction
        label={saved ? t.savedLabel : t.saveFarmula}
        hint={saved ? t.savedHint : t.saveDesc}
        done={saved}
        loading={loadingAction === 'save'}
        onClick={handleSave}
      />

      {/* Secondary export actions — equal weight, one tidy row at every width */}
      <div className="grid grid-cols-3 gap-2 sm:gap-2.5">
        <SecondaryAction
          icon={<MessageCircle className="w-4 h-4" />}
          label={t.shareWhatsApp}
          hint={t.shareDesc}
          loading={loadingAction === 'share'}
          onClick={handleShare}
        />
        <SecondaryAction
          icon={<Printer className="w-4 h-4" />}
          label={t.printRecipe}
          hint={t.printDesc}
          loading={loadingAction === 'print'}
          onClick={handlePrint}
        />
        <SecondaryAction
          icon={<FileText className="w-4 h-4" />}
          label={t.downloadPDF}
          hint={t.downloadDesc}
          loading={loadingAction === 'pdf'}
          onClick={handleDownloadPDF}
        />
      </div>

      {/* Reset, separated — it throws the current formula away, so it should not
          look like just another export button. */}
      <div className="pt-3 border-t border-slate-200">
        <button
          onClick={onReset}
          className="inline-flex items-center gap-2 text-sm font-semibold text-slate-500 hover:text-slate-800 transition-colors tap-transparent"
        >
          <RotateCcw className="w-4 h-4" />
          {t.createNew}
        </button>
      </div>

      <CalculationBreakdownModal
        isOpen={breakdownOpen}
        language={language}
        formula={formula}
        animal={animal}
        stage={stage}
        animalId={animalId}
        stageIndex={stageIndex}
        onClose={() => setBreakdownOpen(false)}
      />

      {/* Print-only recipe sheet — invisible on screen, only rendered when the
          user triggers `window.print()` via the Print Recipe button above. */}
      <PrintableRecipe
        language={language}
        animal={animal}
        stage={stage}
        animalId={animalId}
        stageIndex={stageIndex}
        formula={formula}
      />

      {/* Success Toast — sits above the iOS home indicator */}
      {savedSuccess && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 20 }}
          className="fixed bottom-4 sm:bottom-6 left-4 sm:left-6 right-4 sm:right-6 bg-green-500 text-white rounded-lg p-4 shadow-lg z-50 mb-safe-bottom"
        >
          ✓ {t.saved}
        </motion.div>
      )}
    </motion.div>
  );
}
