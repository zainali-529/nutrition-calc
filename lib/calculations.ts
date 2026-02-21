import { NUTRITION_DATA } from './constants';

export interface FormulaItem {
  name: string;
  key: string;
  kg: number;
  price?: number;
  quality?: 'excellent' | 'average' | 'poor';
}

export interface NutrientCalculation {
  protein: number;
  energy: number;
  fiber: number;
  fat: number;
  calcium: number;
  phosphorus: number;
}

export interface CalculatorState {
  selectedAnimal: string | null;
  selectedRegion: string | null;
  selectedStage: number;
  chosenIngredients: Record<string, string[]>;
  formula: FormulaItem[];
  calculations: NutrientCalculation;
}

/**
 * Calculate nutritional values for a formula
 */
export function calculateNutrients(formula: FormulaItem[]): NutrientCalculation {
  let protein = 0;
  let energy = 0;
  let fiber = 0;
  let fat = 0;
  let calcium = 0;
  let phosphorus = 0;

  formula.forEach((item) => {
    const data = NUTRITION_DATA[item.key as keyof typeof NUTRITION_DATA];
    if (data) {
      const kgFraction = item.kg / 100; // Convert to per-kg basis
      protein += (data.cp || 0) * kgFraction;
      energy += (data.me || 0) * kgFraction;
      fiber += (data.ndf || 0) * kgFraction;
      fat += (data.fat || 0) * kgFraction;
      calcium += (data.ca || 0) * kgFraction;
      phosphorus += (data.p || 0) * kgFraction;
    }
  });

  return {
    protein: Math.round(protein * 10) / 10,
    energy: Math.round(energy * 10) / 10,
    fiber: Math.round(fiber * 10) / 10,
    fat: Math.round(fat * 10) / 10,
    calcium: Math.round(calcium * 100) / 100,
    phosphorus: Math.round(phosphorus * 100) / 100,
  };
}

/**
 * Build initial formula from selected ingredients
 */
export function buildFormula(selectedIngredients: Record<string, string[]>): FormulaItem[] {
  const items = [
    ...selectedIngredients.energy,
    ...selectedIngredients.protein,
    ...selectedIngredients.fiber,
    ...selectedIngredients.fat,
  ];

  const baseWeight = 100;
  const mineralWeight = 2;
  const availableWeight = baseWeight - mineralWeight;
  const eachWeight = items.length ? Math.floor((availableWeight / items.length) * 10) / 10 : 0;

  let remaining = availableWeight - eachWeight * items.length;

  const formula: FormulaItem[] = items.map((key) => ({
    name:
      NUTRITION_DATA[key as keyof typeof NUTRITION_DATA]?.nameEn ||
      key.replace(/_/g, ' '),
    key,
    kg: eachWeight,
    price: 0,
    quality: 'average',
  }));

  // Distribute remaining weight
  let index = 0;
  while (remaining > 0.05) {
    if (index >= formula.length) index = 0;
    const toAdd = Math.min(0.1, remaining);
    formula[index].kg = Math.round((formula[index].kg + toAdd) * 10) / 10;
    remaining = Math.round((remaining - toAdd) * 10) / 10;
    index++;
  }

  // Add mineral mix
  formula.push({
    name: 'Mineral Mix',
    key: 'mineral_mix',
    kg: mineralWeight,
    price: 0,
    quality: 'excellent',
  });

  return formula;
}

/**
 * Calculate total cost of formula
 */
export function calculateTotalCost(formula: FormulaItem[]): number {
  return formula.reduce((total, item) => total + (item.kg * (item.price || 0)), 0);
}

/**
 * Calculate total weight of formula
 */
export function calculateTotalWeight(formula: FormulaItem[]): number {
  return Math.round(formula.reduce((total, item) => total + item.kg, 0) * 10) / 10;
}

/**
 * Get nutrient status (success/warning/error)
 */
export function getNutrientStatus(
  nutrient: number,
  min: number,
  max: number,
  tolerance: number = 10
): 'success' | 'warning' | 'error' {
  const belowMin = min - tolerance;
  const aboveMax = max + tolerance;

  if (nutrient < belowMin || nutrient > aboveMax) {
    return 'error';
  }
  if (nutrient < min || nutrient > max) {
    return 'warning';
  }
  return 'success';
}

/**
 * Generate formula recommendations based on status
 */
export function generateRecommendations(
  calculations: NutrientCalculation
): { nutrient: string; status: string; recommendation: string }[] {
  const recommendations = [];

  // Protein check (target: 12-16%)
  const proteinStatus = getNutrientStatus(calculations.protein, 12, 16);
  recommendations.push({
    nutrient: 'Protein',
    status: proteinStatus,
    recommendation:
      proteinStatus === 'error'
        ? 'Adjust protein sources (increase soybean meal or guar meal)'
        : proteinStatus === 'warning'
          ? 'Monitor protein levels'
          : 'Protein is within optimal range',
  });

  // Energy check (target: 9-11 MJ/kg)
  const energyStatus = getNutrientStatus(calculations.energy, 9, 11);
  recommendations.push({
    nutrient: 'Energy',
    status: energyStatus,
    recommendation:
      energyStatus === 'error'
        ? 'Adjust energy sources (add/remove grains)'
        : energyStatus === 'warning'
          ? 'Monitor energy levels'
          : 'Energy is within optimal range',
  });

  // Fiber check (target: 25-35%)
  const fiberStatus = getNutrientStatus(calculations.fiber, 25, 35);
  recommendations.push({
    nutrient: 'Fiber',
    status: fiberStatus,
    recommendation:
      fiberStatus === 'error'
        ? 'Adjust fiber sources (add straw/hay or reduce protein)'
        : fiberStatus === 'warning'
          ? 'Monitor fiber levels'
          : 'Fiber is within optimal range',
  });

  return recommendations;
}

/**
 * Export formula as text
 */
export function exportFormulaAsText(formula: FormulaItem[], language: 'en' | 'ur' = 'en'): string {
  const header =
    language === 'ur'
      ? 'فارمولا (100 کلوگرام)\n' + '='.repeat(40) + '\n'
      : 'Formula (100kg)\n' + '='.repeat(40) + '\n';

  const items = formula
    .map((f) => `• ${f.name}: ${f.kg.toFixed(1)} kg`)
    .join('\n');

  const total = calculateTotalWeight(formula);
  const footer = `\n${'='.repeat(40)}\nTotal: ${total.toFixed(1)} kg`;

  return header + items + footer;
}

/**
 * Generate PDF content (simple text-based)
 */
export function generatePDFContent(
  formula: FormulaItem[],
  animal: string,
  stage: string
): string {
  const calculations = calculateNutrients(formula);
  const content = `
NUTRITION CALCULATOR - FORMULA REPORT
Animal: ${animal}
Stage: ${stage}
Date: ${new Date().toLocaleDateString()}

FORMULA COMPOSITION (100 kg)
${formula.map((f) => `${f.name}: ${f.kg.toFixed(1)} kg (₨${((f.price || 0) * f.kg).toFixed(0)})`).join('\n')}

Total Weight: ${calculateTotalWeight(formula)} kg
Total Cost: ₨${calculateTotalCost(formula).toFixed(0)}

NUTRITIONAL ANALYSIS
Crude Protein: ${calculations.protein.toFixed(1)}%
Metabolizable Energy: ${calculations.energy.toFixed(1)} MJ/kg
NDF (Fiber): ${calculations.fiber.toFixed(1)}%
Fat: ${calculations.fat.toFixed(1)}%
Calcium: ${calculations.calcium.toFixed(2)}%
Phosphorus: ${calculations.phosphorus.toFixed(2)}%
`;
  return content;
}
