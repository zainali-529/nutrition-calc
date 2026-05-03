'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { X, BookOpen } from 'lucide-react';

interface GlossaryModalProps {
  isOpen: boolean;
  language: 'en' | 'ur';
  onClose: () => void;
}

interface GlossaryEntry {
  abbreviation: string;
  fullEn: string;
  fullUr: string;
  whatEn: string;
  whatUr: string;
  whyEn: string;
  whyUr: string;
  goodRangeEn: string;
  goodRangeUr: string;
  icon: string;
  accentClass: string;
}

const ENTRIES: GlossaryEntry[] = [
  {
    abbreviation: 'CP',
    fullEn: 'Crude Protein',
    fullUr: 'پروٹین',
    whatEn: 'Building blocks for milk and muscle. Comes mostly from oilcakes (sbm, csm, mongphali khal).',
    whatUr: 'دودھ اور گوشت بنانے کے ضروری اجزاء۔ زیادہ تر تیلی کھلوں (سویا میل، بنولہ کھل، مونگ پھلی کھل) سے ملتا ہے۔',
    whyEn: 'Too low → less milk, slow growth. Too high → wasted (excreted as urine), expensive feed.',
    whyUr: 'کم → دودھ اور وزن کم۔ زیادہ → ضائع (پیشاب سے نکل جاتا ہے)، فیڈ مہنگا۔',
    goodRangeEn: '14-22 % of feed (DM) for dairy cows depending on stage',
    goodRangeUr: 'دودھیل گائے کے لیے 14-22 فیصد (مرحلے کے مطابق)',
    icon: '🥩',
    accentClass: 'bg-blue-50 text-blue-900 border-blue-200',
  },
  {
    abbreviation: 'ME',
    fullEn: 'Energy (Metabolizable Energy)',
    fullUr: 'توانائی',
    whatEn: 'Fuel for the cow\'s body — used to produce milk, grow muscle, and stay warm.',
    whatUr: 'جانور کے جسم کا ایندھن — دودھ بنانے، وزن بڑھانے اور گرم رہنے کے لیے۔',
    whyEn: 'Too low → thin cow, low milk. Too high → fat cow, acidosis (rumen pH drop), reduced fertility.',
    whyUr: 'کم → کمزور جانور، کم دودھ۔ زیادہ → موٹاپا، تیزابیت (acidosis)، زرخیزی متاثر۔',
    goodRangeEn: '2.4-3.1 Mcal/kg DM depending on stage',
    goodRangeUr: '2.4-3.1 Mcal/kg DM، مرحلے کے مطابق',
    icon: '⚡',
    accentClass: 'bg-amber-50 text-amber-900 border-amber-200',
  },
  {
    abbreviation: 'TDN',
    fullEn: 'Total Digestible Nutrients',
    fullUr: 'کل قابل ہضم اجزاء',
    whatEn: 'How much of the feed the animal can actually digest and use. Includes sugars, starch, protein, fat.',
    whatUr: 'فیڈ کا کتنا حصہ جانور ہضم کر کے استعمال کر سکتا ہے۔',
    whyEn: 'Higher TDN = more nutrition from the same kg of feed. Like getting more juice from each fruit.',
    whyUr: 'زیادہ TDN = ہر کلو فیڈ سے زیادہ غذائیت۔ کم لاگت میں زیادہ پیداوار۔',
    goodRangeEn: '60-85 % depending on stage (higher for fattening, lower for dry)',
    goodRangeUr: '60-85% مرحلے کے مطابق (موٹا کرنے میں زیادہ، خشک میں کم)',
    icon: '🍃',
    accentClass: 'bg-purple-50 text-purple-900 border-purple-200',
  },
  {
    abbreviation: 'NDF',
    fullEn: 'Fiber (Neutral Detergent Fiber)',
    fullUr: 'فائبر',
    whatEn: 'The "rough" or "scratchy" part of feed — the woody parts of plants. Comes mostly from chokar, bhusa, and forage.',
    whatUr: 'فیڈ کا "کھردرا" حصہ — پودوں کے ریشہ دار اجزاء۔ زیادہ تر چوکر، بھوسے اور چارے سے۔',
    whyEn: 'Cows MUST chew fibre — it makes saliva that protects the rumen. Too low → acidosis. Too high → full belly but poor nutrition.',
    whyUr: 'فائبر چبانے سے تھوک بنتا ہے جو رومن کی حفاظت کرتا ہے۔ کم → تیزابیت۔ زیادہ → پیٹ بھرا مگر غذائیت کم۔',
    goodRangeEn: '15-25 % in concentrate alone, 28-45 % in whole TMR diet',
    goodRangeUr: 'صرف کانسنٹریٹ میں 15-25%، مکمل TMR میں 28-45%',
    icon: '🌿',
    accentClass: 'bg-green-50 text-green-900 border-green-200',
  },
  {
    abbreviation: 'Fat',
    fullEn: 'Crude Fat',
    fullUr: 'چکنائی',
    whatEn: 'Concentrated energy — has 2.25 times more energy per gram than starch.',
    whatUr: 'گاڑھی توانائی — نشاستے سے 2.25 گنا زیادہ توانائی فی گرام۔',
    whyEn: 'Too high (>6 %) coats fibre and stops rumen bacteria from digesting it — milk fat then drops.',
    whyUr: 'زیادہ (6% سے اوپر) فائبر پر تہہ بناتی ہے، رومن کے جراثیم اسے ہضم نہیں کر سکتے — دودھ کی چکنائی گر جاتی ہے۔',
    goodRangeEn: '3-6 % of feed (DM)',
    goodRangeUr: 'فیڈ کا 3-6 فیصد',
    icon: '🛢️',
    accentClass: 'bg-orange-50 text-orange-900 border-orange-200',
  },
  {
    abbreviation: 'Ca',
    fullEn: 'Calcium',
    fullUr: 'کیلشیم',
    whatEn: 'Builds strong bones and is the main mineral in milk. Comes from limestone (chuna), DCP, sesame cake, alfalfa.',
    whatUr: 'مضبوط ہڈیاں اور دودھ کا اہم جزو۔ چونا پتھر، DCP، تل کھل، لوسرن سے ملتا ہے۔',
    whyEn: 'Low → milk fever (cow can\'t stand after calving). High → wasted, may cause mineral imbalance.',
    whyUr: 'کم → دودھ بخار (بچہ پیدا ہونے کے بعد گائے کھڑی نہیں ہو پاتی)۔ زیادہ → ضائع، توازن بگڑتا ہے۔',
    goodRangeEn: '0.4-1.2 % depending on stage (highest in early lactation)',
    goodRangeUr: '0.4-1.2% مرحلے کے مطابق (شروع کے دودھ میں سب سے زیادہ)',
    icon: '🦴',
    accentClass: 'bg-red-50 text-red-900 border-red-200',
  },
  {
    abbreviation: 'P',
    fullEn: 'Phosphorus',
    fullUr: 'فاسفورس',
    whatEn: 'Partner of calcium for bones. Also vital for fertility and energy use. Found in chokar, rice polish, DCP.',
    whatUr: 'ہڈیوں کے لیے کیلشیم کا ساتھی۔ زرخیزی اور توانائی کے لیے ضروری۔ چوکر، رائس پولش، DCP میں۔',
    whyEn: 'Low → poor reproduction, weak bones, "pica" (eating soil). High → expensive, environmental waste.',
    whyUr: 'کم → خراب زرخیزی، کمزور ہڈیاں، مٹی کھانے کی عادت۔ زیادہ → مہنگا، ماحولیاتی نقصان۔',
    goodRangeEn: '0.25-0.65 % depending on stage',
    goodRangeUr: '0.25-0.65% مرحلے کے مطابق',
    icon: '💎',
    accentClass: 'bg-cyan-50 text-cyan-900 border-cyan-200',
  },
  {
    abbreviation: 'DM',
    fullEn: 'Dry Matter',
    fullUr: 'خشک مادہ',
    whatEn: 'How much of the feed is NOT water. Fresh berseem is 18 % DM, dry chokar is 87 % DM.',
    whatUr: 'فیڈ کا کتنا حصہ پانی نہیں ہے۔ تازہ برسیم 18% DM، خشک چوکر 87% DM۔',
    whyEn: 'Cows eat ~3 % of body weight as DM per day. We measure all nutrients on DM basis so the comparison is fair.',
    whyUr: 'گائے روزانہ اپنے وزن کا تقریباً 3% خشک مادہ کھاتی ہے۔ سب نمبر DM پر ناپتے ہیں تاکہ مقابلہ صحیح ہو۔',
    goodRangeEn: 'Display only — not a target. Concentrate is ~88 % DM, fresh forage 18-25 %.',
    goodRangeUr: 'صرف معلومات کے لیے، کوئی ہدف نہیں۔ کانسنٹریٹ ~88% DM، تازہ چارہ 18-25%۔',
    icon: '🌾',
    accentClass: 'bg-slate-50 text-slate-900 border-slate-200',
  },
  {
    abbreviation: 'ADF',
    fullEn: 'Acid Detergent Fiber',
    fullUr: 'ADF فائبر',
    whatEn: 'The hardest-to-digest part of fibre — mostly cellulose and lignin from plant cell walls.',
    whatUr: 'فائبر کا سب سے مشکل ہضم حصہ — پودوں کی دیواروں کا سیلولوز اور لگنن۔',
    whyEn: 'Higher ADF = lower digestibility. Useful as a quality indicator alongside NDF.',
    whyUr: 'زیادہ ADF = کم ہضم۔ NDF کے ساتھ معیار جانچنے کا ذریعہ۔',
    goodRangeEn: '17-25 % typical for dairy. Display-only — not a hard target in this app.',
    goodRangeUr: 'دودھیل کے لیے 17-25%۔ ہدف نہیں، صرف معلومات۔',
    icon: '🪵',
    accentClass: 'bg-stone-50 text-stone-900 border-stone-200',
  },
];

/**
 * "What do these mean?" reference shown via the Help icon. Bilingual cards
 * for every nutrient the calculator uses, written for farmers (not nutritionists).
 */
export function GlossaryModal({ isOpen, language, onClose }: GlossaryModalProps) {
  const t = {
    title:    language === 'en' ? 'What do these mean?' : 'ان کا کیا مطلب ہے؟',
    subtitle: language === 'en'
      ? 'Plain-language guide to every nutrient we measure.'
      : 'ہر غذائی جزو کی آسان وضاحت۔',
    what:     language === 'en' ? 'What is it?' : 'یہ کیا ہے؟',
    why:      language === 'en' ? 'Why it matters' : 'کیوں اہم ہے',
    range:    language === 'en' ? 'Good range' : 'بہترین حد',
    close:    language === 'en' ? 'Close' : 'بند کریں',
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[80]"
          />

          <motion.div
            initial={{ opacity: 0, y: 40, scale: 0.98 }}
            animate={{ opacity: 1, y: 0,  scale: 1 }}
            exit={{    opacity: 0, y: 40, scale: 0.98 }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            className="fixed inset-x-0 bottom-0 sm:left-1/2 sm:top-1/2 sm:bottom-auto sm:inset-x-auto sm:-translate-x-1/2 sm:-translate-y-1/2 w-full sm:w-[90vw] max-w-3xl z-[81] max-h-[92vh] flex flex-col pb-safe-bottom sm:pb-0"
          >
            <div className="bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
              {/* Header */}
              <div className="relative bg-gradient-to-r from-emerald-500 to-emerald-600 px-6 py-5 text-white flex items-start justify-between flex-shrink-0">
                <div className="flex items-start gap-3">
                  <div className="bg-white/15 backdrop-blur-sm p-2.5 rounded-xl">
                    <BookOpen className="w-6 h-6" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold">{t.title}</h2>
                    <p className="text-sm text-emerald-50/95 mt-0.5">{t.subtitle}</p>
                  </div>
                </div>
                <button
                  onClick={onClose}
                  className="p-2 hover:bg-white/20 rounded-lg transition-colors tap-transparent"
                  aria-label={t.close}
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Body — scrollable list of entries */}
              <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-4 sm:py-5 bg-gradient-to-b from-slate-50 to-white">
                <ul className="space-y-3">
                  {ENTRIES.map((e) => (
                    <li key={e.abbreviation} className={`rounded-xl border-2 p-3 sm:p-4 ${e.accentClass}`}>
                      <div className="flex items-start gap-3">
                        <span className="text-2xl sm:text-3xl flex-shrink-0">{e.icon}</span>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-bold text-base sm:text-lg">{language === 'en' ? e.fullEn : e.fullUr}</span>
                            <span className="text-xs font-mono bg-white/70 px-2 py-0.5 rounded border border-current/20">
                              {e.abbreviation}
                            </span>
                          </div>

                          <div className="mt-2 space-y-1.5 text-xs sm:text-sm">
                            <p className="leading-relaxed">
                              <span className="font-bold opacity-80">{t.what}: </span>
                              {language === 'en' ? e.whatEn : e.whatUr}
                            </p>
                            <p className="leading-relaxed">
                              <span className="font-bold opacity-80">{t.why}: </span>
                              {language === 'en' ? e.whyEn : e.whyUr}
                            </p>
                            <p className="leading-relaxed opacity-80 italic">
                              <span className="font-bold not-italic">{t.range}: </span>
                              {language === 'en' ? e.goodRangeEn : e.goodRangeUr}
                            </p>
                          </div>
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
