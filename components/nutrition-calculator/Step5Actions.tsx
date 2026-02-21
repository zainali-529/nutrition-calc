'use client';

import { motion } from 'framer-motion';
import { FormulaItem, exportFormulaAsText } from '@/lib/calculations';
import { Button } from '@/components/ui/button';
import { useState } from 'react';

interface Step5ActionsProps {
  language: 'en' | 'ur';
  formula: FormulaItem[];
  animal: string;
  stage: string;
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
  };

  const handleSave = async () => {
    setLoadingAction('save');
    try {
      const saved = JSON.parse(localStorage.getItem('saved_formulas') || '[]');
      const newEntry = {
        id: Date.now(),
        animal,
        stage,
        formula,
        date: new Date().toLocaleDateString(),
        timestamp: Date.now(),
      };
      saved.unshift(newEntry);
      localStorage.setItem('saved_formulas', JSON.stringify(saved));
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

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="space-y-8"
    >
      {/* Success Banner */}
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-gradient-to-r from-emerald-500 to-green-500 rounded-lg p-8 text-white text-center"
      >
        <div className="text-5xl mb-4">🎉</div>
        <h2 className="text-3xl font-bold mb-2">{t.formulaComplete}</h2>
        <p className="text-emerald-100">{t.congratulations}! Your formula is ready to use.</p>
      </motion.div>

      {/* Formula Summary */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
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

      {/* Success Toast */}
      {savedSuccess && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 20 }}
          className="fixed bottom-6 left-6 right-6 bg-green-500 text-white rounded-lg p-4 shadow-lg"
        >
          ✓ {t.saved}
        </motion.div>
      )}
    </motion.div>
  );
}
