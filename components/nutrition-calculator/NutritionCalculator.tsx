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
import {
  CATEGORY_KEYS,
  categoryOfIngredient,
  emptyChosenIngredients,
  getIngredient,
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
   *
   * Step 2 normally requires at least one energy source and one protein source
   * before Next unlocks. That's right for someone building a ration from
   * scratch, but it traps the other kind of user: a farmer who already feeds a
   * fixed mix and only wants to know whether it hits the targets. When this is
   * on, Next unlocks with any non-empty selection.
   *
   * Lives here rather than inside Step 2 because `AnimatePresence` unmounts each
   * step on navigation — as local state it would reset the moment the user went
   * to Step 3 and came back, re-locking the button they just unlocked.
   */
  const [skipValidation, setSkipValidation] = useState(false);

  // Step 3 State
  const [formula, setFormula] = useState<FormulaItem[]>([]);

  // Transient flag: when the user enters Step 3 with a freshly-built formula
  // (not a back-navigation, not a loaded save), we auto-run the Balanced LP
  // so they see a sensible starting recipe instead of the even-10kg-each
  // distribution. Step 3 consumes this flag once and tells us to clear it.
  const [autoBalanceOnMount, setAutoBalanceOnMount] = useState(false);

  // Saved-formulas modal
  const [savedOpen, setSavedOpen] = useState(false);

  // First-time onboarding modal — auto-shows on first visit (localStorage flag).
  // Re-openable any time via the Help icon in the header.
  const [onboardingOpen, setOnboardingOpen] = useState(false);
  useEffect(() => {
    if (!hasSeenOnboarding()) setOnboardingOpen(true);
  }, []);
  const closeOnboarding = useCallback(() => {
    markOnboardingSeen();
    setOnboardingOpen(false);
  }, []);

  // Glossary modal — accessible from Help icon, explains nutrient abbreviations
  const [glossaryOpen, setGlossaryOpen] = useState(false);

  // Nutrition conflict resolution
  const [conflictData, setConflictData] = useState<{
    entry: SavedFormula;
    conflicts: NutritionConflict[];
  } | null>(null);

  const handleAnimalSelect = useCallback((animal: string) => {
    setSelectedAnimal((prev) => {
      // Reset stage to 0 when switching animals — stage indices differ per species
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
      // Detect items that disappeared via Step3's X icon and also remove them
      // from chosenIngredients, so going Back to Step 2 reflects the same state.
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
    // When moving from Step 2 (ingredient selection) to Step 3 (formula editor),
    // sync the formula with the user's current ingredient selection:
    //   • KEEP existing entries (and their custom kg / price) that are still selected
    //   • ADD entries for any newly-selected ingredients
    //   • DROP entries the user deselected on Step 2
    // This preserves the user's customizations across Back/Forward navigation.
    //
    // On a TRULY-fresh Step 3 entry (no prior formula), set the auto-balance
    // flag so Step 3 mounts and auto-runs the Balanced LP for a sensible
    // starting recipe. Returning users with prior kg edits won't be overridden.
    if (currentStep === 1) {
      const wasEmpty = formula.length === 0;
      setFormula((prev) => mergeFormulaWithSelection(prev, chosenIngredients));
      // Skip the auto-balance when the user opted out of the checks. Their
      // selection is deliberately their own mix, so the Balanced LP would very
      // likely be infeasible and greet them with a red error on arrival — right
      // after we told them they'd only lose the automatic balancing. They get
      // the even starting split to edit by hand instead.
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
    // `entry.chosenIngredients` has already been normalised + re-bucketed by
    // savedFormulas.normalise(), so old saves that filed minerals under 'fat'
    // arrive here with them under 'supplement'. Merge over an empty map so
    // every bucket is guaranteed present.
    setChosenIngredients({
      ...emptyChosenIngredients(),
      ...entry.chosenIngredients,
    });
    setFormula(entry.formula);
    setCompletedSteps([0, 1]);
    setCurrentStep(2);
    // Loading a saved recipe — don't run Balanced over it.
    setAutoBalanceOnMount(false);
  }, []);

  /**
   * Load handler called by SavedFormulasModal.
   * Checks for nutrition conflicts before applying.
   */
  const handleLoadSaved = useCallback((entry: SavedFormula) => {
    const formulaKeys = entry.formula.map((f) => f.key);
    const conflicts = detectConflicts(formulaKeys, entry.ingredientOverrides ?? {});

    if (conflicts.length === 0) {
      // No conflicts — load directly
      applyLoadedFormula(entry);
      return;
    }

    // Conflicts found — show the resolution modal
    setConflictData({ entry, conflicts });
  }, [applyLoadedFormula]);

  /** User chose "Use Current Values" — load recipe, keep current ingredient database. */
  const handleConflictUseCurrent = useCallback(() => {
    if (!conflictData) return;
    applyLoadedFormula(conflictData.entry);
    setConflictData(null);
  }, [conflictData, applyLoadedFormula]);

  /** User chose "Use Saved Values" — restore the overrides from save time, then load. */
  const handleConflictUseSaved = useCallback(() => {
    if (!conflictData) return;
    const savedOverrides = conflictData.entry.ingredientOverrides ?? {};

    // For each ingredient in the formula, apply the saved override
    // (or remove current override if ingredient had no override at save time)
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
    // Re-enable auto-balance for the next session
    setAutoBalanceOnMount(false);
  }, []);

  /**
   * Quick-start template: jump straight to Step 3 with a pre-built recipe.
   * Mirrors `applyLoadedFormula` but starts from a curated template instead
   * of a user-saved formula. We DO want auto-balance to fire on top of the
   * template's selection, so the LP gives a properly-tuned recipe (the
   * template only specifies WHICH ingredients, not quantities).
   */
  const handleUseTemplate = useCallback((template: QuickStartTemplate) => {
    const picks = { ...emptyChosenIngredients(), ...template.chosenIngredients };
    setSelectedAnimal(template.animalId);
    setSelectedStage(template.stageIndex);
    setChosenIngredients(picks);
    // Build initial even-distribution formula; Balanced LP will overwrite it
    setFormula(buildFormula(picks));
    setCompletedSteps([0, 1]);
    setCurrentStep(2);
    // Run Balanced LP on Step 3 mount to populate proper kg values
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

  return (
    <div className="min-h-screen relative pb-safe-bottom">
      {/* Header — slim on mobile, full on desktop */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white/80 backdrop-blur-md border-b border-gray-200/50 sticky top-0 z-40 pt-safe-top px-safe"
      >
        <div className="max-w-4xl mx-auto px-3 sm:px-4 py-3 sm:py-4 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            <Link href="/" className="flex items-center gap-2.5 sm:gap-3 min-w-0 group">
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

            {/* Switch to TMR (full-ration) calculator. Icon-only on mobile, with label on sm+. */}
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
              className="relative w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-white border border-slate-200 shadow-xs flex items-center justify-center text-[#0e3b5e] hover:text-[#558b2f] hover:border-[#558b2f]/50 hover:shadow-sm transition-all tap-transparent"
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

      {/* First-time onboarding (auto-shown once, re-openable from Help icon) */}
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
      <div className="max-w-4xl mx-auto px-3 sm:px-4 py-4 sm:py-8 relative z-10 px-safe">
        {/* Stepper */}
        <Stepper
          currentStep={currentStep}
          totalSteps={5}
          onStepClick={handleStepClick}
          completedSteps={completedSteps}
          language={language}
        />

        {/* Steps Content */}
        {/*
          AnimatePresence MUST receive exactly one direct child whose `key`
          changes when content changes — otherwise rapid back-and-forth between
          steps (after a state mutation like removing an ingredient) can leave
          the panel blank because exit/enter handshakes get out of sync.
        */}
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

      {/* Footer */}
      <Footer language={language} />
    </div>
  );
}
