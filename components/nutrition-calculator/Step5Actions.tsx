'use client';

import { motion } from 'framer-motion';
import {
  Check, CheckCircle2, FileText, FlaskConical, MessageCircle, Printer, RotateCcw,
  Save, Loader2,
} from 'lucide-react';
import { FormulaItem, calculateNutrients, exportFormulaAsText } from '@/lib/calculations';
import { useState, useEffect, useRef } from 'react';
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
  showBreakdownBtn?: boolean;
  onTriggerSpecialTap?: () => void;
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
      className={`w-full rounded-xl px-4 py-3.5 flex items-center gap-3 text-left transition-all tap-transparent disabled:cursor-default ${
        done
          ? 'bg-[#f4f8ee] border border-[#558b2f]/40 text-[#4d7c0f]'
          : 'bg-gradient-to-r from-[#0e3b5e] to-[#155e75] hover:from-[#09253b] hover:to-[#0e3b5e] text-white shadow-md shadow-[#0e3b5e]/20'
      }`}
    >
      <span className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${
        done ? 'bg-[#558b2f] text-white' : 'bg-white/20'
      }`}>
        {loading ? <Loader2 className="w-4 h-4 animate-spin" />
          : done ? <Check className="w-4 h-4" strokeWidth={3} />
          : <Save className="w-4 h-4" />}
      </span>
      <span className="min-w-0">
        <span className="block text-sm font-bold leading-tight">{label}</span>
        <span className={`block text-[11px] ${done ? 'text-[#4d7c0f]' : 'text-emerald-50/90'}`}>{hint}</span>
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
      className="rounded-xl border border-slate-200 bg-white px-2.5 py-3 sm:px-3 text-left hover:border-[#558b2f] hover:bg-[#f4f8ee]/40 hover:shadow-sm transition-all tap-transparent disabled:opacity-60 group"
    >
      <span className="flex items-center gap-1.5 text-[#0e3b5e] group-hover:text-[#558b2f] transition-colors">
        {loading ? <Loader2 className="w-4 h-4 flex-shrink-0 animate-spin" /> : icon}
        <span className="text-[12px] sm:text-[13px] font-bold leading-tight truncate">{label}</span>
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
  showBreakdownBtn: propShowBreakdownBtn = false,
  onTriggerSpecialTap,
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

  // Secret unlock state for special persons (10 clicks in 1 minute on download)
  const [localShowBreakdownBtn, setLocalShowBreakdownBtn] = useState(false);
  const [specialUnlockedToast, setSpecialUnlockedToast] = useState(false);
  const downloadClickTimestamps = useRef<number[]>([]);

  const isUnlocked = propShowBreakdownBtn || localShowBreakdownBtn;

  useEffect(() => {
    try {
      if (typeof window !== 'undefined' && sessionStorage.getItem('rumicalc_special_unlocked') === 'true') {
        setLocalShowBreakdownBtn(true);
      }
    } catch {
      // ignore
    }
  }, []);

  const registerDownloadTap = () => {
    onTriggerSpecialTap?.();
    const now = Date.now();
    // Keep clicks within the last 60 seconds (1 minute)
    downloadClickTimestamps.current = downloadClickTimestamps.current.filter((t) => now - t <= 60000);
    downloadClickTimestamps.current.push(now);

    if (downloadClickTimestamps.current.length >= 10 && !isUnlocked) {
      setLocalShowBreakdownBtn(true);
      try {
        sessionStorage.setItem('rumicalc_special_unlocked', 'true');
      } catch {
        // ignore
      }
      setSpecialUnlockedToast(true);
      setTimeout(() => setSpecialUnlockedToast(false), 5000);
    }
  };

  const nutrients = calculateNutrients(formula);
  const ranges = getNutritionRange(animalId, stageIndex);
  const onTarget = countOnTarget(nutrients, ranges);

  const t = {
    formulaComplete: language === 'en' ? 'Formula ready' : 'فارمولا کامیابی سے تیار ہو گیا! 🎉',
    congratulations: language === 'en'
      ? 'Save it, share it, or print it for the feed mill.'
      : 'فارمولا محفوظ کریں، واٹس ایپ پر شیئر کریں یا فیڈ مل کے لیے پرنٹ نکالیں:',
    saveFarmula: language === 'en' ? 'Save Formula' : 'فارمولا محفوظ کریں',
    saveDesc: language === 'en' ? 'Keep it on this device to reuse later' : 'آئندہ استعمال کے لیے اپنے فون میں محفوظ کریں',
    savedLabel: language === 'en' ? 'Saved' : '✓ محفوظ ہو گیا',
    savedHint: language === 'en' ? 'Find it under the bookmark icon' : 'اوپر بک مارک آئیکن میں محفوظ فارمولے دیکھیں',
    shareWhatsApp: language === 'en' ? 'WhatsApp' : 'واٹس ایپ پر شیئر',
    shareDesc: language === 'en' ? 'Send as a message' : 'فارمولا پیغام کے طور پر بھیجیں',
    // This button writes a .txt file, not a PDF. It was labelled "Download PDF",
    // which was simply false and left two buttons appearing to do the same job —
    // the PDF path is the print dialog's "Save as PDF".
    downloadPDF: language === 'en' ? 'Text file' : 'ٹیکسٹ فائل (.txt)',
    downloadDesc: language === 'en' ? 'Download as .txt' : 'ٹیکسٹ فائل ڈاؤن لوڈ کریں',
    createNew: language === 'en' ? 'Start a new formula' : '🔄 نیا فارمولا شروع کریں',
    saved: language === 'en' ? 'Formula saved successfully!' : 'فارمولا کامیابی سے فون میں محفوظ ہو گیا!',
    printRecipe: language === 'en' ? 'Print / PDF' : 'پرنٹ / PDF ڈاؤن لوڈ',
    printDesc:   language === 'en'
      ? 'Print or "Save as PDF"'
      : 'پرنٹ کریں یا PDF محفوظ کریں',
    breakdown:     language === 'en' ? 'See background calculation' : 'حساب کی تفصیلی سائنسی رپورٹ',
    breakdownDesc: language === 'en'
      ? 'See every step of the maths — and download it as a table'
      : 'غذائیت کا ہر حساب دیکھیں اور ٹیبل ڈاؤن لوڈ کریں',
    summary: language === 'en' ? 'Formula summary' : 'فارمولے کا خلاصہ',
    animalLbl: language === 'en' ? 'Animal' : 'جانور',
    stageLbl: language === 'en' ? 'Stage' : 'مرحلہ / عمر',
    weightLbl: language === 'en' ? 'Batch' : 'بیچ سائز',
    perKgLbl: language === 'en' ? 'Cost / kg' : 'قیمت فی کلو',
    totalLbl: language === 'en' ? 'Total cost' : 'کل لاگت',
    targetsLbl: language === 'en' ? 'Targets met' : 'غذائی اہداف',
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
    registerDownloadTap();
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

  const handleDownloadPDF = async () => {
    registerDownloadTap();
    setLoadingAction('pdf');
    try {
      const text = exportFormulaAsText(formula, language);
      const fileName = `rumicalc-formula-${Date.now()}.txt`;
      const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });

      // 1. Try Mobile Web Share API first (best native experience on iOS & Android mobile)
      if (typeof navigator !== 'undefined' && navigator.share && navigator.canShare) {
        try {
          const file = new File([blob], fileName, { type: 'text/plain' });
          if (navigator.canShare({ files: [file] })) {
            await navigator.share({
              title: language === 'en' ? 'RumiCalc Formula' : 'رومی کیلک فارمولا',
              files: [file],
            });
            return;
          }
        } catch {
          // If user cancels share or file sharing is not supported, fall through to blob download
        }
      }

      // 2. Blob URL Download (Works on Chrome, Safari, Firefox, Opera)
      const url = URL.createObjectURL(blob);
      const element = document.createElement('a');
      element.href = url;
      element.download = fileName;
      element.style.display = 'none';
      document.body.appendChild(element);
      element.click();

      // Clean up after download completes
      setTimeout(() => {
        if (document.body.contains(element)) {
          document.body.removeChild(element);
        }
        URL.revokeObjectURL(url);
      }, 1000);
    } catch (error) {
      console.error('Error downloading text file:', error);
      // Fallback: Copy to clipboard if file saving is totally blocked in webview
      try {
        const text = exportFormulaAsText(formula, language);
        if (typeof navigator !== 'undefined' && navigator.clipboard) {
          await navigator.clipboard.writeText(text);
          alert(language === 'en' 
            ? 'Formula copied to clipboard!' 
            : 'فارمولا کلپ بورڈ میں کاپی ہو گیا!');
        }
      } catch {
        // ignore
      }
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
  const handlePrint = async () => {
    registerDownloadTap();
    setLoadingAction('print');
    try {
      if (typeof window !== 'undefined' && typeof window.print === 'function') {
        // Ensure no stale data-printing dataset exists
        delete document.body.dataset.printing;
        window.print();
      } else {
        throw new Error('window.print not supported');
      }
    } catch (error) {
      console.warn('Print error or unsupported browser:', error);
      // Fallback for mobile WebViews / unsupported browsers
      try {
        const text = exportFormulaAsText(formula, language);
        if (typeof navigator !== 'undefined' && navigator.clipboard) {
          await navigator.clipboard.writeText(text);
          alert(language === 'en'
            ? 'Print is not supported in this browser. Formula copied to clipboard!'
            : 'اس براؤزر میں پرنٹ میسر نہیں۔ فارمولا کلپ بورڈ پر کاپی کر دیا گیا ہے!');
        } else {
          const win = window.open('', '_blank');
          if (win) {
            win.document.write(`<pre style="font-family:sans-serif;white-space:pre-wrap;padding:20px;">${text}</pre>`);
            win.document.close();
          }
        }
      } catch {
        // ignore
      }
    } finally {
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
      <div className="flex items-center gap-3 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3.5 shadow-2xs">
        <span className="w-9 h-9 rounded-full bg-emerald-600 text-white flex items-center justify-center flex-shrink-0">
          <CheckCircle2 className="w-5 h-5" />
        </span>
        <div className="min-w-0">
          <h2 className="text-base sm:text-lg font-bold text-emerald-950 leading-tight">{t.formulaComplete}</h2>
          <p className="text-[11px] sm:text-xs text-emerald-800 font-medium">{t.congratulations}</p>
        </div>
      </div>

      {/* Summary — the numbers a farmer actually needs at hand-off. */}
      <div className="rounded-xl border border-slate-200 bg-white overflow-hidden shadow-2xs">
        <div className="px-4 py-2.5 border-b border-slate-100">
          <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-600">{t.summary}</h3>
        </div>

        <dl className="divide-y divide-slate-100">
          <div className="flex items-baseline justify-between gap-3 px-4 py-2">
            <dt className="text-xs text-slate-500 font-semibold">{t.animalLbl}</dt>
            <dd className="text-sm font-bold text-slate-900 text-right">{animal}</dd>
          </div>
          <div className="flex items-baseline justify-between gap-3 px-4 py-2">
            <dt className="text-xs text-slate-500 font-semibold">{t.stageLbl}</dt>
            <dd className="text-sm font-bold text-slate-900 text-right">{stage}</dd>
          </div>
        </dl>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-px bg-slate-100 border-t border-slate-100" dir="ltr">
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

      {/* Hidden by default — revealed only when secret 10-tap trigger in 1 minute on download is activated */}
      {isUnlocked && (
        <motion.button
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          whileHover={{ y: -1 }}
          whileTap={{ scale: 0.99 }}
          onClick={() => setBreakdownOpen(true)}
          className="w-full rounded-xl border-2 border-indigo-500/30 bg-gradient-to-r from-slate-900 to-indigo-950 text-white px-4 py-3 flex items-center gap-3 text-left hover:border-indigo-400 transition-colors tap-transparent shadow-md"
        >
          <span className="w-9 h-9 rounded-lg bg-indigo-600 text-white flex items-center justify-center flex-shrink-0 font-bold shadow-xs">
            <FlaskConical className="w-4 h-4" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-sm font-bold leading-tight flex items-center gap-2">
              {t.breakdown}
              <span className="bg-indigo-500/40 text-indigo-200 text-[10px] px-2 py-0.5 rounded-full font-mono border border-indigo-400/30">
                {language === 'en' ? 'Special Access' : 'خاص رسائی'}
              </span>
            </span>
            <span className="block text-[11px] text-slate-300">{t.breakdownDesc}</span>
          </span>
          <span className="text-slate-400 text-lg leading-none flex-shrink-0">›</span>
        </motion.button>
      )}

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

      {/* Special Access Granted Toast */}
      {specialUnlockedToast && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 20 }}
          className="fixed bottom-16 sm:bottom-20 left-4 sm:left-6 right-4 sm:right-6 bg-indigo-900 text-white border border-indigo-400/50 rounded-xl p-4 shadow-xl z-50 mb-safe-bottom flex items-center gap-3"
        >
          <span className="text-2xl">🔓</span>
          <div>
            <div className="font-extrabold text-sm text-indigo-200">
              {language === 'en' ? 'Special Access Granted!' : 'خاص رسائی فعال ہو گئی!'}
            </div>
            <div className="text-xs text-indigo-100/90">
              {language === 'en'
                ? 'Background calculation breakdown is now unlocked.'
                : 'پیچھے کا حساب دیکھنے کی سہولت اب ظاہر کر دی گئی ہے۔'}
            </div>
          </div>
        </motion.div>
      )}
    </motion.div>
  );
}
