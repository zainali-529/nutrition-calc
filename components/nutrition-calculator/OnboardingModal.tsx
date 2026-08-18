'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { X, Sparkles, Beef, ListChecks, FileDown, Languages } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface OnboardingModalProps {
  isOpen: boolean;
  language: 'en' | 'ur';
  onClose: () => void;
}

const STORAGE_KEY = 'has_seen_onboarding_v1';

/** Has the user dismissed the onboarding before? */
export function hasSeenOnboarding(): boolean {
  if (typeof window === 'undefined') return true; // SSR: skip
  try {
    return window.localStorage.getItem(STORAGE_KEY) === 'true';
  } catch {
    return true;
  }
}

export function markOnboardingSeen(): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(STORAGE_KEY, 'true');
  } catch {
    /* ignore quota / disabled storage */
  }
}

/**
 * First-time welcome screen. Auto-shown on first app visit, also re-openable
 * from the Help icon in the header. Explains in 30 seconds what the app does
 * and how the 5-step wizard works — important because zero-knowledge farmers
 * land on Step 1 with no context.
 */
export function OnboardingModal({ isOpen, language, onClose }: OnboardingModalProps) {
  const t = {
    title:    language === 'en' ? 'Welcome to RumiCalc' : 'رومی کیلک (RumiCalc) میں خوش آمدید',
    subtitle: language === 'en'
      ? 'Build a healthy, low-cost feed mix for your cow, buffalo, or goat — in 5 quick steps.'
      : 'اپنی گائے، بھینس یا بکری کے لیے صحت مند اور سستا فارمولا بنائیں — صرف 5 آسان مراحل میں۔',
    howItWorks: language === 'en' ? 'How it works' : 'یہ کیسے کام کرتا ہے',
    feature1Title: language === 'en' ? 'Pick your animal' : 'جانور منتخب کریں',
    feature1Desc:  language === 'en'
      ? 'Cow, buffalo, heifer, fattening bull, or goat — and pick the production stage.'
      : 'گائے، بھینس، بچھڑی، بیل یا بکری — اور پیداواری مرحلہ چنیں۔',
    feature2Title: language === 'en' ? 'Choose your ingredients' : 'اپنے اجزاء چنیں',
    feature2Desc:  language === 'en'
      ? 'Pick what\'s available locally — corn, wheat bran, oilcakes, etc. Live guidance shows if your selection can meet the targets.'
      : 'جو مقامی طور پر دستیاب ہو وہ منتخب کریں — مکئی، چوکر، تیلی کھل وغیرہ۔ زندہ رہنمائی بتاتی ہے کہ آپ کا انتخاب ہدف پورا کرے گا یا نہیں۔',
    feature3Title: language === 'en' ? 'Auto-Formulate' : 'خودکار فارمولا',
    feature3Desc:  language === 'en'
      ? 'One tap and the calculator finds the cheapest balanced mix that meets every nutrient target.'
      : 'ایک کلک پر کیلکولیٹر سب سے سستا متوازن فارمولا تلاش کرتا ہے جو ہر غذائی ہدف پورا کرے۔',
    feature4Title: language === 'en' ? 'Save, share, print' : 'محفوظ، شیئر، پرنٹ',
    feature4Desc:  language === 'en'
      ? 'Save your formulas, share them on WhatsApp, or print the recipe to take to your feed mill.'
      : 'فارمولے محفوظ کریں، واٹس ایپ پر شیئر کریں، یا فیڈ مل کے لیے پرنٹ نکالیں۔',
    bilingualNote: language === 'en' ? 'Available in English and اردو' : 'انگریزی اور اردو دونوں میں دستیاب',
    cta:           language === 'en' ? 'Get Started' : 'شروع کریں',
    skip:          language === 'en' ? 'Skip' : 'چھوڑیں',
  };

  const features = [
    { icon: Beef,        title: t.feature1Title, desc: t.feature1Desc },
    { icon: ListChecks,  title: t.feature2Title, desc: t.feature2Desc },
    { icon: Sparkles,    title: t.feature3Title, desc: t.feature3Desc },
    { icon: FileDown,    title: t.feature4Title, desc: t.feature4Desc },
  ];

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[80]"
          />

          <motion.div
            initial={{ opacity: 0, y: 40, scale: 0.98 }}
            animate={{ opacity: 1, y: 0,  scale: 1 }}
            exit={{    opacity: 0, y: 40, scale: 0.98 }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            className="fixed inset-x-0 bottom-0 sm:left-1/2 sm:top-1/2 sm:bottom-auto sm:inset-x-auto sm:-translate-x-1/2 sm:-translate-y-1/2 w-full sm:w-[90vw] max-w-2xl z-[81] max-h-[92vh] flex flex-col pb-safe-bottom sm:pb-0"
          >
            <div className="bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
              {/* Header */}
              <div className="relative bg-gradient-to-br from-emerald-600 via-emerald-700 to-[#0e3b5e] px-6 py-6 sm:py-8 text-white flex-shrink-0">
                <button
                  onClick={onClose}
                  className="absolute top-3 right-3 p-2 rounded-lg hover:bg-white/20 transition-colors tap-transparent"
                  aria-label={t.skip}
                >
                  <X className="w-5 h-5" />
                </button>
                <div className="flex items-center gap-3.5 sm:gap-4">
                  <img
                    src="/rumicalc-logo.png"
                    alt="RumiCalc Logo"
                    className="w-14 h-14 sm:w-16 sm:h-16 object-contain rounded-2xl bg-white p-1.5 shadow-lg flex-shrink-0"
                  />
                  <div>
                    <h2 className="text-xl sm:text-2xl font-extrabold leading-tight tracking-tight">{t.title}</h2>
                    <p className="text-sm sm:text-base text-emerald-50/95 mt-1 leading-snug">{t.subtitle}</p>
                  </div>
                </div>
              </div>

              {/* Body */}
              <div className="px-6 py-5 sm:py-6 overflow-y-auto flex-1">
                <p className="text-xs font-bold uppercase tracking-wider text-emerald-700 mb-3">
                  {t.howItWorks}
                </p>

                <ol className="space-y-3 sm:space-y-4">
                  {features.map((f, idx) => {
                    const Icon = f.icon;
                    return (
                      <li key={idx} className="flex items-start gap-3">
                        <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center flex-shrink-0 font-bold relative">
                          <Icon className="w-5 h-5" />
                          <span className="absolute -top-1 -right-1 w-5 h-5 bg-emerald-600 text-white rounded-full text-[10px] font-bold flex items-center justify-center">
                            {idx + 1}
                          </span>
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="font-bold text-gray-900 text-sm sm:text-base">{f.title}</p>
                          <p className="text-xs sm:text-sm text-gray-600 leading-relaxed">{f.desc}</p>
                        </div>
                      </li>
                    );
                  })}
                </ol>

                {/* Bilingual note & Powered by badge */}
                <div className="mt-5 sm:mt-6 space-y-2">
                  <div className="flex items-center justify-between gap-2 p-2.5 rounded-xl bg-slate-50 border border-slate-200">
                    <div className="flex items-center gap-1.5 text-xs text-slate-700 font-semibold">
                      <Languages className="w-3.5 h-3.5 text-[#558b2f]" />
                      <span>{t.bilingualNote}</span>
                    </div>
                    <div className="text-[11px] font-bold text-[#0e3b5e] bg-[#0e3b5e]/5 border border-[#0e3b5e]/15 px-2.5 py-0.5 rounded-full">
                      {language === 'en' ? 'Powered by Sabtain Animal Talk' : 'پیشکش: سبطین اینیمل ٹاک'}
                    </div>
                  </div>
                </div>
              </div>

              {/* Footer */}
              <div className="px-6 py-4 border-t border-gray-200 bg-white flex-shrink-0">
                <Button
                  onClick={onClose}
                  className="w-full h-12 bg-gradient-to-r from-[#0e3b5e] to-[#155e75] hover:from-[#09253b] hover:to-[#0e3b5e] text-white font-bold text-base rounded-xl shadow-md shadow-[#0e3b5e]/20 tap-transparent"
                >
                  {t.cta} →
                </Button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
