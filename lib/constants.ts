// Nutrition database extracted from HTML calculator
// Values updated based on user provided data (Mcal/kg DM basis)

export const NUTRITION_DATA = {
  corn: {
    nameUr: 'مکئی',
    nameEn: 'Corn (Makai)',
    energyLevel: 'high',
    proteinLevel: 'low',
    cp: 9,
    me: 3.25, // Mcal/kg DM
    ndf: 12,
    adf: 4,
    fat: 4,
    ca: 0.03,
    p: 0.28,
    dm: 89,
    tdn: 88,
    starch: 70,
    ash: 1.3,
    price: 102,
    notesUr: 'کاربوہائیڈریٹ میں زیادہ، پروٹین کم',
    notesEn: 'High starch, low protein',
  },
  barley: {
    nameUr: 'جو',
    nameEn: 'Barley',
    energyLevel: 'med',
    proteinLevel: 'low',
    cp: 11,
    me: 2.62, // Converted from 11 MJ
    ndf: 18,
    adf: 6,
    fat: 2,
    ca: 0.05,
    p: 0.38,
    dm: 89, // Assumed
    tdn: 82, // Assumed
    starch: 60, // Assumed
    ash: 2.5, // Assumed
    price: 80, // Assumed
    notesUr: 'متوسط توانائی',
    notesEn: 'Moderate energy',
  },
  wheat_bran: {
    nameUr: 'چوکر',
    nameEn: 'Wheat Bran (Chokhar)',
    energyLevel: 'med',
    proteinLevel: 'med',
    cp: 16,
    me: 2.63, // Mcal/kg DM
    ndf: 45,
    adf: 13,
    fat: 4,
    ca: 0.13,
    p: 1.1,
    dm: 87,
    tdn: 68,
    starch: 22,
    ash: 6,
    price: 75,
    notesUr: 'فاسفورس زیادہ',
    notesEn: 'High phosphorus',
  },
  millet: {
    nameUr: 'باجرہ',
    nameEn: 'Millet',
    energyLevel: 'med',
    proteinLevel: 'low',
    cp: 10,
    me: 2.62, // Converted from 11 MJ
    ndf: 14,
    adf: 6,
    fat: 4,
    ca: 0.02,
    p: 0.3,
    dm: 90,
    tdn: 70,
    starch: 55,
    ash: 3,
    price: 90,
  },
  rice_polish: {
    nameUr: 'رائس پولش',
    nameEn: 'Rice Polish',
    energyLevel: 'high',
    proteinLevel: 'low',
    cp: 13,
    me: 2.86, // Converted from 12 MJ
    ndf: 22,
    adf: 9,
    fat: 13,
    ca: 0.1,
    p: 1.5,
    dm: 90,
    tdn: 85,
    starch: 40,
    ash: 8,
    price: 100,
    notesUr: 'گرمیوں میں مائیکوٹاکسن کا خطرہ',
    notesEn: 'Mycotoxin risk in monsoon',
  },
  sbm: {
    nameUr: 'سویا کھل',
    nameEn: 'Soybean Meal',
    energyLevel: 'low',
    proteinLevel: 'high',
    cp: 46,
    me: 3.18, // Mcal/kg DM
    ndf: 13,
    adf: 7,
    fat: 2,
    ca: 0.27,
    p: 0.65,
    dm: 89,
    tdn: 84,
    starch: 6,
    ash: 6.5,
    price: 300,
  },
  csm: {
    nameUr: 'کپاس کھل',
    nameEn: 'Cottonseed Meal',
    energyLevel: 'low',
    proteinLevel: 'high',
    cp: 38,
    me: 2.15, // Converted from 9 MJ
    ndf: 25,
    adf: 18,
    fat: 2,
    ca: 0.15,
    p: 1.2,
    dm: 90,
    tdn: 70,
    starch: 5,
    ash: 6,
    price: 150,
    notesUr: 'افلاٹوکسِن خطرہ (بارشوں میں)',
    notesEn: 'Aflatoxin caution (monsoon)',
  },
  sfm: {
    nameUr: 'سورج مکھی کھل',
    nameEn: 'Sunflower Meal',
    energyLevel: 'low',
    proteinLevel: 'med',
    cp: 32,
    me: 1.91, // Converted from 8 MJ
    ndf: 30,
    adf: 22,
    fat: 1,
    ca: 0.3, // Added missing
    p: 0.8, // Added missing
    dm: 90,
    tdn: 65,
    starch: 2,
    ash: 6,
    price: 130,
  },
  rsm: {
    nameUr: 'سرسوں کھل',
    nameEn: 'Rapeseed Meal (Sarso)',
    energyLevel: 'low',
    proteinLevel: 'med',
    cp: 35,
    me: 2.65, // Mcal/kg DM
    ndf: 28,
    adf: 18,
    fat: 7,
    ca: 0.62,
    p: 1.1,
    dm: 90,
    tdn: 66,
    starch: 8,
    ash: 7.5,
    price: 110,
  },
  canola_meal: {
    nameUr: 'کینولا میل',
    nameEn: 'Canola Meal',
    energyLevel: 'low',
    proteinLevel: 'high',
    cp: 36,
    me: 2.7, // Mcal/kg DM
    ndf: 27,
    adf: 17,
    fat: 4,
    ca: 0.75,
    p: 1.1,
    dm: 90,
    tdn: 67,
    starch: 10,
    ash: 6.5,
    price: 180,
  },
  sesame_cake: {
    nameUr: 'تل کھل',
    nameEn: 'Sesame Cake (Til)',
    energyLevel: 'high', // High fat (10%)
    proteinLevel: 'high', // 40% CP
    cp: 40,
    me: 2.99, // Mcal/kg DM
    ndf: 30,
    adf: 22,
    fat: 10,
    ca: 1.2,
    p: 0.65,
    dm: 90,
    tdn: 68,
    starch: 3,
    ash: 11,
    price: 120,
  },
  guar: {
    nameUr: 'گوار کھل',
    nameEn: 'Guar Meal',
    energyLevel: 'low',
    proteinLevel: 'high',
    cp: 48,
    me: 1.91, // Converted from 8 MJ
    ndf: 28,
    adf: 20,
    fat: 6,
    ca: 0.2, // Added missing
    p: 0.5, // Added missing
    dm: 90,
    tdn: 75,
    starch: 5,
    ash: 5,
    price: 160,
  },
  straw: {
    nameUr: 'بھوسہ',
    nameEn: 'Straw',
    energyLevel: 'low',
    proteinLevel: 'low',
    cp: 4,
    me: 1.19, // Converted from 5 MJ
    ndf: 70,
    adf: 45,
    fat: 1,
    ca: 0.2, // Added missing
    p: 0.1, // Added missing
    dm: 90,
    tdn: 45,
    starch: 1,
    ash: 8,
    price: 20,
  },
  hay: {
    nameUr: 'خشک گھاس',
    nameEn: 'Hay',
    energyLevel: 'low',
    proteinLevel: 'low',
    cp: 9,
    me: 1.67, // Converted from 7 MJ
    ndf: 55,
    adf: 35,
    fat: 2,
    ca: 0.4, // Added missing
    p: 0.2, // Added missing
    dm: 88,
    tdn: 55,
    starch: 2,
    ash: 7,
    price: 30,
  },
  silage: {
    nameUr: 'سائیلج',
    nameEn: 'Silage',
    energyLevel: 'med',
    proteinLevel: 'low',
    cp: 9,
    me: 1.91, // Converted from 8 MJ
    ndf: 45,
    adf: 30,
    fat: 3,
    ca: 0.3, // Added missing
    p: 0.2, // Added missing
    dm: 30, // Silage is wet
    tdn: 65,
    starch: 25,
    ash: 5,
    price: 15,
  },
  bypassFat: {
    nameUr: 'بائی پاس فیٹ',
    nameEn: 'Bypass Fat',
    energyLevel: 'high',
    proteinLevel: 'low',
    cp: 0,
    me: 4.78, // Converted from 20 MJ
    ndf: 0,
    adf: 0,
    fat: 99,
    ca: 0, // Added missing
    p: 0, // Added missing
    dm: 99,
    tdn: 180, // High TDN
    starch: 0,
    ash: 0,
    price: 400,
    notesUr: 'زیادہ مقدار سے احتیاط',
    notesEn: 'Use within limits',
  },
  molasses: {
    nameUr: 'شیرہ',
    nameEn: 'Molasses (Sheera)',
    energyLevel: 'high',
    proteinLevel: 'low',
    cp: 4,
    me: 2.29, // Mcal/kg DM
    ndf: 0,
    adf: 0,
    fat: 0,
    ca: 1,
    p: 0.06,
    dm: 75,
    tdn: 75,
    starch: 0,
    ash: 11,
    price: 75,
    notesUr: 'چپکاؤ کم کرنے کو خشک اجزاء کے ساتھ ملائیں',
    notesEn: 'Mix with dry matter',
  },
  limestone: {
    nameUr: 'چونا پتھر',
    nameEn: 'Limestone',
    energyLevel: 'low',
    proteinLevel: 'low',
    cp: 0,
    me: 0,
    ndf: 0,
    adf: 0,
    fat: 0,
    ca: 36,
    p: 0,
    dm: 98,
    tdn: 0,
    starch: 0,
    ash: 95,
    price: 50,
  },
};

export const INGREDIENT_CATEGORIES = {
  energy: {
    titleEn: 'Energy Sources',
    titleUr: 'توانائی کے ذرائع',
    min: 1,
    ingredients: ['corn', 'barley', 'millet', 'rice_polish', 'molasses'],
  },
  protein: {
    titleEn: 'Protein Sources',
    titleUr: 'پروٹین کے ذرائع',
    min: 1,
    ingredients: ['sbm', 'csm', 'guar', 'sfm', 'rsm', 'canola_meal', 'sesame_cake'],
  },
  fiber: {
    titleEn: 'Fiber Sources',
    titleUr: 'فائبر کے ذرائع',
    min: 1,
    ingredients: ['straw', 'hay', 'silage', 'wheat_bran'],
  },
  fat: {
    titleEn: 'Fat & Supplements',
    titleUr: 'چکنائی اور سپلیمنٹس',
    min: 0,
    ingredients: ['bypassFat', 'limestone'],
  },
};

export const STAGES = {
  dairy_cow: {
    en: ['Early Lactation', 'Mid Lactation', 'Late Lactation', 'Dry Period'],
    ur: ['شروع کا دودھ', 'درمیانی دودھ', 'آخری دودھ', 'خشک دور'],
  },
  bull: {
    en: ['Growing (100-200kg)', 'Fattening (200-300kg)', 'Finishing (>300kg)'],
    ur: ['بڑھوتری (100-200 کلو)', 'موٹا کرنا (200-300 کلو)', 'تیاری (>300 کلو)'],
  },
  buffalo: {
    en: ['Early Lactation', 'Mid Lactation', 'Late Lactation', 'Dry'],
    ur: ['شروع کا دودھ', 'درمیانی دودھ', 'آخری دودھ', 'خشک'],
  },
  heifer: {
    en: ['Weaning', 'Yearling', 'Pregnant'],
    ur: ['دودھ چھڑائی', 'ایک سال', 'گابھن'],
  },
};

export const ANIMALS = [
  { id: 'dairy_cow', image: '/animals/dairy-cow.jpg', labelEn: 'Dairy Cow', labelUr: 'دودھ والی گائے' },
  { id: 'bull', image: '/animals/fattening-bull.jpg', labelEn: 'Fattening Bull', labelUr: 'موٹا کرنے والا بیل' },
  { id: 'buffalo', image: '/animals/dairy-cow.jpg', labelEn: 'Buffalo', labelUr: 'بھینس' },
  { id: 'heifer', image: '/animals/goat.jpg', labelEn: 'Heifer', labelUr: 'جوان گائے' },
];

export const NUTRITION_RANGES = {
  dairy_cow: [
    { protein: { min: 16, max: 18 }, energy: { min: 2.6, max: 2.8 }, tdn: { min: 72, max: 76 }, fiber: { min: 28, max: 32 }, calcium: { min: 0.6, max: 0.8 }, phosphorus: { min: 0.35, max: 0.45 } },
    { protein: { min: 14, max: 16 }, energy: { min: 2.4, max: 2.6 }, tdn: { min: 68, max: 72 }, fiber: { min: 30, max: 35 }, calcium: { min: 0.5, max: 0.7 }, phosphorus: { min: 0.3, max: 0.4 } },
    { protein: { min: 12, max: 14 }, energy: { min: 2.2, max: 2.4 }, tdn: { min: 64, max: 68 }, fiber: { min: 32, max: 38 }, calcium: { min: 0.4, max: 0.6 }, phosphorus: { min: 0.25, max: 0.35 } },
    { protein: { min: 10, max: 12 }, energy: { min: 1.8, max: 2.1 }, tdn: { min: 58, max: 62 }, fiber: { min: 40, max: 50 }, calcium: { min: 0.4, max: 0.5 }, phosphorus: { min: 0.2, max: 0.3 } },
  ],
  bull: [
    { protein: { min: 14, max: 16 }, energy: { min: 2.4, max: 2.6 }, tdn: { min: 68, max: 72 }, fiber: { min: 25, max: 30 }, calcium: { min: 0.5, max: 0.7 }, phosphorus: { min: 0.3, max: 0.4 } },
    { protein: { min: 12, max: 14 }, energy: { min: 2.8, max: 3.1 }, tdn: { min: 75, max: 80 }, fiber: { min: 20, max: 25 }, calcium: { min: 0.4, max: 0.6 }, phosphorus: { min: 0.25, max: 0.35 } },
    { protein: { min: 11, max: 13 }, energy: { min: 3.0, max: 3.3 }, tdn: { min: 78, max: 82 }, fiber: { min: 18, max: 22 }, calcium: { min: 0.3, max: 0.5 }, phosphorus: { min: 0.2, max: 0.3 } },
  ],
  buffalo: [
    { protein: { min: 16, max: 18 }, energy: { min: 2.6, max: 2.8 }, tdn: { min: 72, max: 76 }, fiber: { min: 28, max: 32 }, calcium: { min: 0.6, max: 0.8 }, phosphorus: { min: 0.35, max: 0.45 } },
    { protein: { min: 14, max: 16 }, energy: { min: 2.4, max: 2.6 }, tdn: { min: 68, max: 72 }, fiber: { min: 30, max: 35 }, calcium: { min: 0.5, max: 0.7 }, phosphorus: { min: 0.3, max: 0.4 } },
    { protein: { min: 12, max: 14 }, energy: { min: 2.2, max: 2.4 }, tdn: { min: 64, max: 68 }, fiber: { min: 32, max: 38 }, calcium: { min: 0.4, max: 0.6 }, phosphorus: { min: 0.25, max: 0.35 } },
    { protein: { min: 10, max: 12 }, energy: { min: 1.8, max: 2.1 }, tdn: { min: 58, max: 62 }, fiber: { min: 40, max: 50 }, calcium: { min: 0.4, max: 0.5 }, phosphorus: { min: 0.2, max: 0.3 } },
  ],
  heifer: [
    { protein: { min: 16, max: 18 }, energy: { min: 2.2, max: 2.4 }, tdn: { min: 62, max: 66 }, fiber: { min: 35, max: 40 }, calcium: { min: 0.5, max: 0.7 }, phosphorus: { min: 0.3, max: 0.4 } },
    { protein: { min: 14, max: 16 }, energy: { min: 2.4, max: 2.6 }, tdn: { min: 66, max: 70 }, fiber: { min: 30, max: 35 }, calcium: { min: 0.4, max: 0.6 }, phosphorus: { min: 0.25, max: 0.35 } },
    { protein: { min: 13, max: 15 }, energy: { min: 2.3, max: 2.5 }, tdn: { min: 64, max: 68 }, fiber: { min: 32, max: 38 }, calcium: { min: 0.5, max: 0.7 }, phosphorus: { min: 0.3, max: 0.4 } },
  ],
};

export const REGIONS = [
  { id: 'punjab', labelEn: 'Punjab', labelUr: 'پنجاب' },
  { id: 'sindh', labelEn: 'Sindh', labelUr: 'سندھ' },
  { id: 'kpk', labelEn: 'KPK', labelUr: 'خیبر پختونخوا' },
  { id: 'balochistan', labelEn: 'Balochistan', labelUr: 'بلوچستان' },
];

export const STATUS_INDICATORS = [
  {
    type: 'success',
    icon: '✅',
    titleUr: 'پروٹین ٹھیک ہے',
    titleEn: 'Protein is OK',
    descUr: 'تبدیلی کی ضرورت نہیں',
    descEn: 'No changes needed',
  },
  {
    type: 'warning',
    icon: '⚠️',
    titleUr: 'فائبر تھوڑا کم ہے',
    titleEn: 'Fiber slightly low',
    descUr: 'بھوسہ/خشک گھاس شامل کریں',
    descEn: 'Add straw/hay',
  },
  {
    type: 'error',
    icon: '🛑',
    titleUr: 'کیلشیم کم ہے',
    titleEn: 'Calcium low',
    descUr: 'چونا پتھر ضروری ہے',
    descEn: 'Add limestone',
  },
];
