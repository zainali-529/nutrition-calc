'use client';

import { motion } from 'framer-motion';
import { FormulaItem, calculateNutrients, exportFormulaAsText } from '@/lib/calculations';
import { Button } from '@/components/ui/button';
import { useState } from 'react';
import { saveFormula } from '@/lib/savedFormulas';
import { getOverride } from '@/lib/ingredientOverrides';
import { PrintableRecipe } from './PrintableRecipe';

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

function ActionButton({
  icon,
  title,
  description,
  onClick,
  loading,
}: {
  icon: string;
  title: string;
  description: string;
  onClick: () => void;
  loading?: boolean;
}) {
  return (
    <motion.button
      whileHover={{ y: -4 }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      disabled={loading}
      className="w-full text-left bg-white rounded-lg border-2 border-gray-200 p-4 hover:border-emerald-500 hover:shadow-lg transition-all"
    >
      <div className="flex items-start gap-4">
        <span className="text-3xl">{icon}</span>
        <div className="flex-1">
          <h4 className="font-bold text-gray-900">{title}</h4>
          <p className="text-sm text-gray-600">{description}</p>
        </div>
        <motion.span
          animate={{ x: loading ? -5 : 0 }}
          className="text-xl text-gray-400"
        >
          →
        </motion.span>
      </div>
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

  const t = {
    formulaComplete: language === 'en' ? 'Formula Complete!' : 'فارمولا مکمل!',
    congratulations: language === 'en' ? 'Congratulations' : 'مبارک ہو',
    saveFarmula: language === 'en' ? 'Save Formula' : 'فارمولا محفوظ کریں',
    saveDesc: language === 'en' ? 'Save this formula for future reference' : 'مستقبل کے حوالے کے لیے محفوظ کریں',
    shareWhatsApp: language === 'en' ? 'Share on WhatsApp' : 'واٹس اپ پر شیئر کریں',
    shareDesc:
      language === 'en'
        ? 'Send formula to your phone via WhatsApp'
        : 'واٹس اپ کے ذریعے اپنے فون پر بھیجیں',
    downloadPDF: language === 'en' ? 'Download PDF' : 'PDF ڈاؤن لوڈ کریں',
    downloadDesc: language === 'en' ? 'Get a detailed PDF report' : 'تفصیلی PDF رپورٹ حاصل کریں',
    createNew: language === 'en' ? 'Create New Formula' : 'نیا فارمولا بنائیں',
    createDesc: language === 'en' ? 'Start calculating another formula' : 'ایک اور فارمولا شروع کریں',
    saved: language === 'en' ? 'Formula saved successfully!' : 'فارمولا کامیابی سے محفوظ ہو گیا!',
    printRecipe: language === 'en' ? 'Print Recipe' : 'فارمولا پرنٹ کریں',
    printDesc:   language === 'en'
      ? 'Print or save as PDF — take it to your feed mill or stick it on the feed bin.'
      : 'پرنٹ کریں یا PDF محفوظ کریں — فیڈ مل کے لیے یا فیڈ ڈبے پر چپکائیں۔',
  };

  const handleSave = async () => {
    setLoadingAction('save');
    try {
      const n = calculateNutrients(formula);

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
      className="space-y-8"
    >
      {/* Success Banner — tighter on mobile */}
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-gradient-to-r from-emerald-500 to-green-500 rounded-lg p-5 sm:p-8 text-white text-center"
      >
        <div className="text-4xl sm:text-5xl mb-2 sm:mb-4">🎉</div>
        <h2 className="text-2xl sm:text-3xl font-bold mb-1 sm:mb-2">{t.formulaComplete}</h2>
        <p className="text-emerald-100 text-sm sm:text-base">{t.congratulations}! Your formula is ready to use.</p>
      </motion.div>

      {/* Formula Summary */}
      <div className="bg-white rounded-lg border border-gray-200 p-4 sm:p-6">
        <h3 className="font-bold text-lg mb-4">Formula Summary</h3>
        <div className="space-y-3 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-600">Animal:</span>
            <span className="font-semibold">{animal}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Stage:</span>
            <span className="font-semibold">{stage}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Items:</span>
            <span className="font-semibold">{formula.length}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Date:</span>
            <span className="font-semibold">{new Date().toLocaleDateString()}</span>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="space-y-3">
        <ActionButton
          icon="💾"
          title={t.saveFarmula}
          description={t.saveDesc}
          onClick={handleSave}
          loading={loadingAction === 'save'}
        />

        <ActionButton
          icon="💬"
          title={t.shareWhatsApp}
          description={t.shareDesc}
          onClick={handleShare}
          loading={loadingAction === 'share'}
        />

        <ActionButton
          icon="🖨️"
          title={t.printRecipe}
          description={t.printDesc}
          onClick={handlePrint}
          loading={loadingAction === 'print'}
        />

        <ActionButton
          icon="📄"
          title={t.downloadPDF}
          description={t.downloadDesc}
          onClick={handleDownloadPDF}
          loading={loadingAction === 'pdf'}
        />

        <ActionButton
          icon="✨"
          title={t.createNew}
          description={t.createDesc}
          onClick={onReset}
          loading={false}
        />
      </div>

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
