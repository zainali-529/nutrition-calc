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
  fiber: number; // NDF
  adf: number;
  fat: number;
  calcium: number;
  phosphorus: number;
  dm: number;
  tdn: number;
  starch: number;
  ash: number;
  cost: number;
  perKgPrice: number;
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
 * Returns values on DM basis (except DM itself which is % of As Fed)
 */
export function calculateNutrients(formula: FormulaItem[]): NutrientCalculation {
  let totalAsFed = 0;
  let totalDM = 0;
  
  let totalCP_Kg = 0; // Calculated on DM basis: kg DM * CP%
  let totalME = 0;
  let totalNDF = 0;
  let totalADF = 0;
  let totalFat = 0;
  let totalCa = 0;
  let totalP = 0;
  let totalTDN = 0;
  let totalStarch = 0;
  let totalAsh = 0;
  let totalCost = 0;

  formula.forEach((item) => {
    const data = NUTRITION_DATA[item.key as keyof typeof NUTRITION_DATA];
    if (data) {
      const weight = item.kg;
      totalAsFed += weight;
      
      // Calculate DM weight for this ingredient
      const dmPercent = (data.dm || 90); // Default 90% if missing
      const dmWeight = weight * (dmPercent / 100);
      totalDM += dmWeight;

      // Nutrients are usually on DM basis in NUTRITION_DATA (as per our update)
      // So we multiply by dmWeight
      // CP, NDF, ADF, Fat, Ca, P, TDN, Starch, Ash are % of DM
      // ME is Mcal/kg DM
      
      totalCP_Kg += dmWeight * ((data.cp || 0) / 100);
      totalME += dmWeight * (data.me || 0);
      totalNDF += dmWeight * ((data.ndf || 0) / 100);
      totalADF += dmWeight * ((data.adf || 0) / 100);
      totalFat += dmWeight * ((data.fat || 0) / 100);
      totalCa += dmWeight * ((data.ca || 0) / 100);
      totalP += dmWeight * ((data.p || 0) / 100);
      totalTDN += dmWeight * ((data.tdn || 0) / 100);
      totalStarch += dmWeight * ((data.starch || 0) / 100);
      totalAsh += dmWeight * ((data.ash || 0) / 100);

      // Cost is As Fed basis
      totalCost += weight * (item.price || data.price || 0);
    }
  });

  if (totalDM === 0) {
    return {
      protein: 0,
      energy: 0,
      fiber: 0,
      adf: 0,
      fat: 0,
      calcium: 0,
      phosphorus: 0,
      dm: 0,
      tdn: 0,
      starch: 0,
      ash: 0,
      cost: 0,
      perKgPrice: 0,
    };
  }

  // NOTE: Based on user's Google Sheet logic:
  // CP is calculated as: (Total Protein Kg / Total As-Fed Kg) * 100
  // Other nutrients are calculated on DM basis: (Total Nutrient / Total DM) * 100

  return {
    protein: Math.round((totalCP_Kg / totalAsFed) * 100 * 10) / 10, // As-Fed Basis!
    energy: Math.round((totalME / totalDM) * 100) / 100, // Mcal/kg DM
    fiber: Math.round((totalNDF / totalDM) * 100 * 10) / 10,
    adf: Math.round((totalADF / totalDM) * 100 * 10) / 10,
    fat: Math.round((totalFat / totalDM) * 100 * 10) / 10,
    calcium: Math.round((totalCa / totalDM) * 100 * 100) / 100,
    phosphorus: Math.round((totalP / totalDM) * 100 * 100) / 100,
    dm: Math.round((totalDM / totalAsFed) * 100 * 10) / 10,
    tdn: Math.round((totalTDN / totalDM) * 100 * 10) / 10,
    starch: Math.round((totalStarch / totalDM) * 100 * 10) / 10,
    ash: Math.round((totalAsh / totalDM) * 100 * 10) / 10,
    cost: Math.round(totalCost),
    perKgPrice: totalAsFed > 0 ? Math.round((totalCost / totalAsFed) * 10) / 10 : 0,
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

  const formula: FormulaItem[] = items.map((key) => {
    const data = NUTRITION_DATA[key as keyof typeof NUTRITION_DATA];
    return {
      name: data?.nameEn || key.replace(/_/g, ' '),
      key,
      kg: eachWeight,
      price: data?.price || 0,
      quality: 'average',
    };
  });

  // Distribute remaining weight
  let index = 0;
  while (remaining > 0.05 && formula.length > 0) {
    if (index >= formula.length) index = 0;
    const toAdd = Math.min(0.1, remaining);
    formula[index].kg = Math.round((formula[index].kg + toAdd) * 10) / 10;
    remaining = Math.round((remaining - toAdd) * 10) / 10;
    index++;
  }

  // Add mineral mix if not already selected? 
  // Wait, if user selected Limestone, we might not need generic Mineral Mix.
  // But let's keep it if logic requires it, or maybe user selects it.
  // The user didn't mention Mineral Mix, but provided Lime Stone.
  // The original code adds "Mineral Mix" hardcoded.
  // I'll keep it but maybe it should be 'limestone' if available?
  // I'll leave it as is for now to avoid breaking existing flow.
  
  // formula.push({
  //   name: 'Mineral Mix',
  //   key: 'mineral_mix',
  //   kg: mineralWeight,
  //   price: 0,
  //   quality: 'excellent',
  // });
  
  // Actually, let's NOT push 'mineral_mix' if it's not in NUTRITION_DATA, 
  // because it will cause lookups to fail or return undefined.
  // The original NUTRITION_DATA didn't have 'mineral_mix'.
  // The original `calculateNutrients` check `if (data)`.
  // So 'mineral_mix' was just a placeholder with no nutrients?
  // Yes.
  // I will keep it but maybe change key to 'limestone' if user wants minerals?
  // Or just keep as is.
  
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
  tolerance: number = 0 // Stricter tolerance or pass it
): 'success' | 'warning' | 'error' {
  // tolerance can be a percentage or absolute. Original was absolute 10?
  // 10 seems huge for protein (12-16). 12-10=2.
  // Let's use small tolerance.
  const tol = tolerance || (max - min) * 0.1; // 10% of range
  
  const belowMin = min - tol;
  const aboveMax = max + tol;

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
 * Updated with dynamic ranges
 */
export function generateRecommendations(
  calculations: NutrientCalculation,
  ranges?: any // Added ranges parameter
): { nutrient: string; status: string; recommendation: string }[] {
  const recommendations = [];

  // Default ranges if none provided
  const r = ranges || {
    protein: { min: 14, max: 18 },
    energy: { min: 2.4, max: 2.8 },
    tdn: { min: 70, max: 80 },
    fiber: { min: 25, max: 35 },
    calcium: { min: 0.5, max: 1.0 },
    phosphorus: { min: 0.3, max: 0.5 },
  };

  // Protein check
  const proteinStatus = getNutrientStatus(calculations.protein, r.protein.min, r.protein.max);
  recommendations.push({
    nutrient: 'Protein (As-Fed)',
    status: proteinStatus,
    recommendation:
      proteinStatus === 'error'
        ? 'Adjust protein sources (Soybean meal, Canola meal, Til khal)'
        : proteinStatus === 'warning'
          ? 'Monitor protein levels'
          : 'Protein is within optimal range',
  });

  // Energy check
  const energyStatus = getNutrientStatus(calculations.energy, r.energy.min, r.energy.max, 0.2);
  recommendations.push({
    nutrient: 'Energy (ME)',
    status: energyStatus,
    recommendation:
      energyStatus === 'error'
        ? 'Adjust energy sources (Corn, Molasses)'
        : energyStatus === 'warning'
          ? 'Monitor energy levels'
          : 'Energy is within optimal range',
  });

  // TDN check
  const tdnStatus = getNutrientStatus(calculations.tdn, r.tdn.min, r.tdn.max);
  recommendations.push({
    nutrient: 'TDN',
    status: tdnStatus,
    recommendation:
      tdnStatus === 'error'
        ? 'Adjust digestibility (Corn, SBM)'
        : tdnStatus === 'warning'
          ? 'Monitor TDN'
          : 'TDN is within optimal range',
  });
  
  // Fiber (NDF) check
  const fiberStatus = getNutrientStatus(calculations.fiber, r.fiber.min, r.fiber.max);
  recommendations.push({
    nutrient: 'NDF',
    status: fiberStatus,
    recommendation:
      fiberStatus === 'error'
        ? 'Adjust fiber sources (Wheat Bran, Fodder)'
        : fiberStatus === 'warning'
          ? 'Monitor NDF levels'
          : 'NDF is within optimal range',
  });

  // Calcium check
  const caStatus = getNutrientStatus(calculations.calcium, r.calcium.min, r.calcium.max, 0.1);
  recommendations.push({
    nutrient: 'Calcium',
    status: caStatus,
    recommendation:
      caStatus === 'error'
        ? 'Adjust Calcium (Limestone)'
        : caStatus === 'warning'
          ? 'Monitor Calcium'
          : 'Calcium is within optimal range',
  });

  return recommendations;
}

/**
 * Export formula as text
 */
export function exportFormulaAsText(formula: FormulaItem[], language: 'en' | 'ur' = 'en'): string {
  const header =
    language === 'ur'
      ? 'فارمولا Report\n' + '='.repeat(40) + '\n'
      : 'Formula Report\n' + '='.repeat(40) + '\n';

  const items = formula
    .map((f) => `• ${f.name}: ${f.kg.toFixed(1)} kg`)
    .join('\n');

  const total = calculateTotalWeight(formula);
  const cost = calculateTotalCost(formula);
  const nutrients = calculateNutrients(formula);
  
  const footer = `\n${'='.repeat(40)}\nTotal Weight: ${total.toFixed(1)} kg\nTotal Cost: ₨${cost.toFixed(0)}\nPer Kg Price: ₨${nutrients.perKgPrice}\n\nNutrients:\nCP (As-Fed): ${nutrients.protein}%\nME (DM): ${nutrients.energy} Mcal/kg\nTDN (DM): ${nutrients.tdn}%\nNDF (DM): ${nutrients.fiber}%\nCost: ₨${nutrients.cost}`;

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

FORMULA COMPOSITION
${formula.map((f) => `${f.name}: ${f.kg.toFixed(1)} kg (₨${((f.price || 0) * f.kg).toFixed(0)})`).join('\n')}

Total Weight: ${calculateTotalWeight(formula)} kg
Total Cost: ₨${calculateTotalCost(formula).toFixed(0)}
Per Kg Price: ₨${calculations.perKgPrice}

NUTRITIONAL ANALYSIS
Dry Matter: ${calculations.dm.toFixed(1)}%
Crude Protein (As-Fed): ${calculations.protein.toFixed(1)}%
Metabolizable Energy (DM): ${calculations.energy.toFixed(2)} Mcal/kg
TDN (DM): ${calculations.tdn.toFixed(1)}%
NDF (Fiber) (DM): ${calculations.fiber.toFixed(1)}%
ADF (DM): ${calculations.adf.toFixed(1)}%
Fat (DM): ${calculations.fat.toFixed(1)}%
Starch (DM): ${calculations.starch.toFixed(1)}%
Calcium (DM): ${calculations.calcium.toFixed(2)}%
Phosphorus (DM): ${calculations.phosphorus.toFixed(2)}%
Ash (DM): ${calculations.ash.toFixed(1)}%
`;
  return content;
}
