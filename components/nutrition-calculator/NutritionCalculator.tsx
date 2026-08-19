'use client';

import { useState, useCallback, useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Bookmark, HelpCircle, Layers } from 'lucide-react';
import Link from 'next/link';
import { Stepper } from './Stepper';
import { LanguageSwitch } from './LanguageSwitch';
import { Step1Animal } from './Step1Animal';
import { Step2Ingredients } from './Step2Ingredients';
import { Step3Formula } from './Step3Formula';
import { Step4Status } from './Step4Status';
import { Step5Actions } from './Step5Actions';
import { SavedFormulasModal } from './SavedFormulasModal';
import { NutritionConflictModal, detectConflicts, type NutritionConflict } from './NutritionConflictModal';
import { OnboardingModal, hasSeenOnboarding, markOnboardingSeen } from './OnboardingModal';
import { GlossaryModal } from './GlossaryModal';
import { Footer } from '@/components/Footer';
import { buildFormula, FormulaItem } from '@/lib/calculations';
import { autoFormulate } from '@/lib/autoFormulate';
import {
  CATEGORY_KEYS,
  categoryOfIngredient,
  emptyChosenIngredients,
  getIngredient,
  getNutritionRange,
  INGREDIENT_CATEGORIES,
  STAGES,
} from '@/lib/constants';
import { saveOverride, type IngredientOverride } from '@/lib/ingredientOverrides';
import type { SavedFormula } from '@/lib/savedFormulas';
import type { QuickStartTemplate } from '@/lib/templates';

/**
 * Merge an existing customised formula with the user's current ingredient
 * selection. Preserves kg/price overrides for items still selected, drops
 * deselected ones, and appends newly-selected ones (with default kg/price).
 */
function mergeFormulaWithSelection(
  existing: FormulaItem[],
  chosen: Record<string, string[]>
): FormulaItem[] {
  const selectedKeys = new Set<string>(
    CATEGORY_KEYS.flatMap((cat) => chosen[cat] || [])
  );

  // If we have nothing yet (first time entering Step 3), build from scratch.
  if (existing.length === 0) return buildFormula(chosen);

  // Keep entries that are still selected (preserves their kg / price)
  const kept = existing.filter((item) => selectedKeys.has(item.key));
  const keptKeys = new Set(kept.map((i) => i.key));

  // Append any newly-selected keys that aren't yet in the formula
  const additions: FormulaItem[] = [];
  for (const key of selectedKeys) {
    if (keptKeys.has(key)) continue;
    const data = getIngredient(key);
    additions.push({
      name:    data?.nameEn || key.replace(/_/g, ' '),
      key,
      kg:      0,                  // user enters quantity
      price:   data?.price || 0,
      quality: 'average',
    });
  }

  return [...kept, ...additions];
}

export function NutritionCalculator() {
  const [language, setLanguage] = useState<'en' | 'ur'>('en');
  const [currentStep, setCurrentStep] = useState(0);
  const [completedSteps, setCompletedSteps] = useState<number[]>([]);

  // Step 1 State
  const [selectedAnimal, setSelectedAnimal] = useState<string | null>(null);
  const [selectedStage, setSelectedStage] = useState(0);

  // Step 2 State — one bucket per ingredient category
  const [chosenIngredients, setChosenIngredients] = useState<Record<string, string[]>>(
    emptyChosenIngredients
  );

  /**
   * "I already have my own mix" escape hatch for Step 2.
   */
  const [skipValidation, setSkipValidation] = useState(false);

  // Step 3 State
  const [formula, setFormula] = useState<FormulaItem[]>([]);

  const [autoBalanceOnMount, setAutoBalanceOnMount] = useState(false);

  // Saved-formulas modal
  const [savedOpen, setSavedOpen] = useState(false);

  // First-time onboarding modal
  const [onboardingOpen, setOnboardingOpen] = useState(false);
  useEffect(() => {
    if (!hasSeenOnboarding()) setOnboardingOpen(true);
  }, []);
  const closeOnboarding = useCallback(() => {
    markOnboardingSeen();
    setOnboardingOpen(false);
  }, []);

  // Glossary modal
  const [glossaryOpen, setGlossaryOpen] = useState(false);

  // Nutrition conflict resolution
  const [conflictData, setConflictData] = useState<{
    entry: SavedFormula;
    conflicts: NutritionConflict[];
  } | null>(null);

  const handleAnimalSelect = useCallback((animal: string) => {
    setSelectedAnimal((prev) => {
      if (prev !== animal) setSelectedStage(0);
      return animal;
    });
  }, []);

  const handleStageSelect = useCallback((stage: number) => {
    setSelectedStage(stage);
  }, []);

  const handleIngredientToggle = useCallback((category: string, ingredient: string) => {
    setChosenIngredients((prev) => {
      const current = prev[category] || [];
      const isSelected = current.includes(ingredient);
      return {
        ...prev,
        [category]: isSelected ? current.filter((i) => i !== ingredient) : [...current, ingredient],
      };
    });
  }, []);

  const handleFormulaChange = useCallback((newFormula: FormulaItem[]) => {
    setFormula((prev) => {
      const newKeys = new Set(newFormula.map((i) => i.key));
      const removedKeys = prev.filter((i) => !newKeys.has(i.key)).map((i) => i.key);
      if (removedKeys.length > 0) {
        setChosenIngredients((sel) => {
          const next = { ...sel };
          for (const removed of removedKeys) {
            const cat = categoryOfIngredient(removed);
            if (cat && next[cat]) {
              next[cat] = next[cat].filter((k) => k !== removed);
            }
          }
          return next;
        });
      }
      return newFormula;
    });
  }, []);

  const handleNextStep = useCallback(() => {
    if (currentStep === 1) {
      const wasEmpty = formula.length === 0;
      setFormula((prev) => mergeFormulaWithSelection(prev, chosenIngredients));
      if (wasEmpty && !skipValidation) setAutoBalanceOnMount(true);
    }

    setCompletedSteps((prev) => [...new Set([...prev, currentStep])]);
    setCurrentStep((prev) => Math.min(prev + 1, 4));
  }, [currentStep, chosenIngredients, formula.length, skipValidation]);

  const handleBackStep = useCallback(() => {
    setCurrentStep((prev) => Math.max(prev - 1, 0));
  }, []);

  /** Actually apply a saved formula to state and jump to Step 3. */
  const applyLoadedFormula = useCallback((entry: SavedFormula) => {
    setSelectedAnimal(entry.animalId);
    setSelectedStage(entry.stageIndex);
    setChosenIngredients({
      ...emptyChosenIngredients(),
      ...entry.chosenIngredients,
    });
    setFormula(entry.formula);
    setCompletedSteps([0, 1]);
    setCurrentStep(2);
    setAutoBalanceOnMount(false);
  }, []);

  const handleLoadSaved = useCallback((entry: SavedFormula) => {
    const formulaKeys = entry.formula.map((f) => f.key);
    const conflicts = detectConflicts(formulaKeys, entry.ingredientOverrides ?? {});

    if (conflicts.length === 0) {
      applyLoadedFormula(entry);
      return;
    }

    setConflictData({ entry, conflicts });
  }, [applyLoadedFormula]);

  const handleConflictUseCurrent = useCallback(() => {
    if (!conflictData) return;
    applyLoadedFormula(conflictData.entry);
    setConflictData(null);
  }, [conflictData, applyLoadedFormula]);

  const handleConflictUseSaved = useCallback(() => {
    if (!conflictData) return;
    const savedOverrides = conflictData.entry.ingredientOverrides ?? {};

    for (const item of conflictData.entry.formula) {
      const ovr = savedOverrides[item.key];
      if (ovr && Object.keys(ovr).length > 0) {
        const defaults = getIngredient(item.key);
        saveOverride(item.key, ovr as IngredientOverride, (defaults ?? {}) as IngredientOverride);
      }
    }

    applyLoadedFormula(conflictData.entry);
    setConflictData(null);
  }, [conflictData, applyLoadedFormula]);

  const handleReset = useCallback(() => {
    setCurrentStep(0);
    setCompletedSteps([]);
    setSelectedAnimal(null);
    setSelectedStage(0);
    setChosenIngredients(emptyChosenIngredients());
    setFormula([]);
    setSkipValidation(false);
    setAutoBalanceOnMount(false);
  }, []);

  const handleUseTemplate = useCallback((template: QuickStartTemplate) => {
    const picks = { ...emptyChosenIngredients(), ...template.chosenIngredients };
    setSelectedAnimal(template.animalId);
    setSelectedStage(template.stageIndex);
    setChosenIngredients(picks);
    setFormula(buildFormula(picks));
    setCompletedSteps([0, 1]);
    setCurrentStep(2);
    setAutoBalanceOnMount(true);
  }, []);

  const handleStepClick = (step: number) => {
    if (step <= Math.max(...completedSteps, currentStep)) {
      setCurrentStep(step);
    }
  };

  const animalLabel =
    selectedAnimal
      ?.replace(/_/g, ' ')
      .split(' ')
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(' ')
      .trim() || '';

  const stageLabel =
    selectedAnimal && STAGES[selectedAnimal as keyof typeof STAGES]
      ? STAGES[selectedAnimal as keyof typeof STAGES][language][selectedStage] ?? ''
      : '';

  const canProceedCurrentStep = (() => {
    if (currentStep === 0) return selectedAnimal !== null;
    if (currentStep === 1) {
      const totalSelected = Object.values(chosenIngredients).reduce((sum, arr) => sum + arr.length, 0);
      if (skipValidation) return totalSelected > 0;

      // Ensure required categories (min >= 1) have at least min items selected
      for (const [catKey, cat] of Object.entries(INGREDIENT_CATEGORIES)) {
        const picked = chosenIngredients[catKey] || [];
        if (cat.min > 0 && picked.length < cat.min) return false;
      }

      if (!selectedAnimal) return false;
      const ranges = getNutritionRange(selectedAnimal, selectedStage);
      if (!ranges) return false;

      const allKeys = Object.values(chosenIngredients).flat();
      if (allKeys.length === 0) return false;

      const result = autoFormulate({ ingredientKeys: allKeys, ranges });
      return result.success;
    }
    if (currentStep === 2) return formula.length > 0;
    if (currentStep === 3) return true;
    return true;
  })();

  return (
    <div className="min-h-screen">
      {/* Header */}
      <motion.div
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="bg-white/95 backdrop-blur-md border-b border-slate-200/80 sticky top-0 z-30 shadow-xs px-safe"
      >
        <div className="max-w-4xl mx-auto px-3 sm:px-4 py-2.5 sm:py-3 flex justify-between items-center gap-2 sm:gap-4">
          <div className="min-w-0">
            <Link
              href="/"
              className="flex items-center gap-2 sm:gap-3 group tap-transparent"
              title={language === 'en' ? 'RumiCalc Home' : 'رومی کیلک ہوم'}
            >
              <img
                src="/rumicalc-logo.png"
                alt="RumiCalc Logo"
                className="w-11 h-11 sm:w-13 sm:h-13 md:w-14 md:h-14 object-contain rounded-xl flex-shrink-0 group-hover:scale-105 transition-transform"
              />
              <div className="min-w-0">
                <h1 className="font-extrabold text-base sm:text-xl text-gray-900 leading-tight tracking-tight truncate flex items-center gap-1.5">
                  <span className="inline-flex items-baseline tracking-tight font-extrabold"><span className="text-[#0e3b5e]">Rumi</span><span className="text-[#558b2f]">Calc</span></span>
                  <span className="text-[10px] sm:text-xs font-bold text-[#0e3b5e] bg-[#0e3b5e]/5 border border-[#0e3b5e]/20 px-2 py-0.5 rounded-full hidden sm:inline">
                    {language === 'en' ? 'Concentrate' : 'ونڈہ'}
                  </span>
                </h1>
                <p className="hidden sm:block text-[11px] font-semibold text-slate-500 truncate">
                  {language === 'en' ? 'Livestock Feed & Wanda Calculator' : 'مویشیوں کے ونڈہ کا سمارٹ فارمولا'}
                </p>
              </div>
            </Link>
          </div>
          <div className="flex items-center gap-1.5 sm:gap-2 flex-shrink-0">
            {/* Help — opens the bilingual nutrient glossary */}
            <motion.button
              onClick={() => setGlossaryOpen(true)}
              whileHover={{ scale: 1.08, y: -1 }}
              whileTap={{ scale: 0.95 }}
              className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-white border border-slate-200 shadow-xs flex items-center justify-center text-[#0e3b5e] hover:text-[#558b2f] hover:border-[#558b2f]/50 transition-all tap-transparent"
              title={language === 'en' ? 'What do these mean?' : 'ان کا کیا مطلب ہے؟'}
              aria-label={language === 'en' ? 'Glossary' : 'لغت'}
            >
              <HelpCircle className="w-4 h-4 sm:w-5 sm:h-5" />
            </motion.button>

            {/* Switch to TMR calculator */}
            <Link
              href="/tmr"
              className="inline-flex items-center justify-center sm:justify-start gap-0 sm:gap-1.5 w-9 h-9 sm:w-auto sm:h-10 sm:px-3.5 rounded-full bg-white border border-slate-200 shadow-xs text-xs sm:text-sm font-bold text-[#0e3b5e] hover:text-[#558b2f] hover:border-[#558b2f]/50 hover:shadow-sm transition-all tap-transparent"
              title={language === 'en' ? 'Switch to TMR Calculator' : 'TMR کیلکولیٹر پر جائیں'}
              aria-label={language === 'en' ? 'Switch to TMR Calculator' : 'TMR کیلکولیٹر'}
            >
              <Layers className="w-4 h-4 sm:w-4 sm:h-4 text-[#558b2f]" />
              <span className="hidden sm:inline">TMR</span>
            </Link>
            <motion.button
              onClick={() => setSavedOpen(true)}
              whileHover={{ scale: 1.08, y: -1 }}
              whileTap={{ scale: 0.95 }}
              className="relative w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-white border border-slate-200 shadow-xs flex items-center justify-center text-[#0e3b5e] hover:text-[#558b2f] hover:border-[#558b2f]/50 transition-all tap-transparent"
              title={language === 'en' ? 'Saved Formulas' : 'محفوظ فارمولے'}
              aria-label={language === 'en' ? 'Saved Formulas' : 'محفوظ فارمولے'}
            >
              <Bookmark className="w-4 h-4 sm:w-5 sm:h-5" />
            </motion.button>
            <LanguageSwitch language={language} onChange={setLanguage} />
          </div>
        </div>
      </motion.div>

      {/* Saved-Formulas Modal */}
      <SavedFormulasModal
        isOpen={savedOpen}
        language={language}
        onClose={() => setSavedOpen(false)}
        onLoad={handleLoadSaved}
      />

      {/* First-time onboarding */}
      <OnboardingModal
        isOpen={onboardingOpen}
        language={language}
        onClose={closeOnboarding}
      />

      {/* Bilingual nutrient glossary */}
      <GlossaryModal
        isOpen={glossaryOpen}
        language={language}
        onClose={() => setGlossaryOpen(false)}
      />

      {/* Nutrition Conflict Resolution Modal */}
      <NutritionConflictModal
        isOpen={conflictData !== null}
        language={language}
        conflicts={conflictData?.conflicts ?? []}
        onUseCurrent={handleConflictUseCurrent}
        onUseSaved={handleConflictUseSaved}
        onCancel={() => setConflictData(null)}
      />

      {/* Main Content */}
      <div className="max-w-4xl mx-auto px-3 sm:px-4 py-4 sm:py-8 relative z-10 px-safe pb-32 sm:pb-36">
        {/* Stepper */}
        <Stepper
          currentStep={currentStep}
          totalSteps={5}
          onStepClick={handleStepClick}
          completedSteps={completedSteps}
          language={language}
        />

        {/* Steps Content */}
        <div className="bg-white rounded-xl sm:rounded-lg shadow-md sm:shadow-lg p-4 sm:p-6 md:p-8">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentStep}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.25 }}
            >
              {currentStep === 0 && (
                <Step1Animal
                  language={language}
                  selectedAnimal={selectedAnimal}
                  selectedStage={selectedStage}
                  onAnimalSelect={handleAnimalSelect}
                  onStageSelect={handleStageSelect}
                  onNext={handleNextStep}
                  onUseTemplate={handleUseTemplate}
                />
              )}
              {currentStep === 1 && (
                <Step2Ingredients
                  language={language}
                  chosenIngredients={chosenIngredients}
                  selectedAnimal={selectedAnimal}
                  selectedStage={selectedStage}
                  onIngredientToggle={handleIngredientToggle}
                  onNext={handleNextStep}
                  onBack={handleBackStep}
                  skipValidation={skipValidation}
                  onSkipValidationChange={setSkipValidation}
                />
              )}
              {currentStep === 2 && (
                <Step3Formula
                  language={language}
                  formula={formula}
                  selectedAnimal={selectedAnimal}
                  selectedStage={selectedStage}
                  onFormulaChange={handleFormulaChange}
                  onNext={handleNextStep}
                  onBack={handleBackStep}
                  autoBalanceOnMount={autoBalanceOnMount}
                  onAutoBalanceConsumed={() => setAutoBalanceOnMount(false)}
                />
              )}
              {currentStep === 3 && (
                <Step4Status
                  language={language}
                  formula={formula}
                  selectedAnimal={selectedAnimal}
                  selectedStage={selectedStage}
                  onNext={handleNextStep}
                  onBack={handleBackStep}
                />
              )}
              {currentStep === 4 && (
                <Step5Actions
                  language={language}
                  formula={formula}
                  animal={animalLabel}
                  stage={stageLabel}
                  animalId={selectedAnimal}
                  stageIndex={selectedStage}
                  chosenIngredients={chosenIngredients}
                  onReset={handleReset}
                />
              )}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>

      {/* Unified Fixed Bottom Navigation & Footer */}
      <Footer
        currentStep={currentStep}
        totalSteps={5}
        language={language}
        canProceed={canProceedCurrentStep}
        onNext={handleNextStep}
        onBack={handleBackStep}
      />
    </div>
  );
}
