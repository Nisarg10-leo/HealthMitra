import { repository } from '../data/repository.js';

// Curated clinical dietary & interaction safety database for geriatric medications.
const DRUG_DATABASE = {
  metformin: {
    dietary: {
      en: 'Take with or immediately after meals to reduce stomach upset. Avoid heavy alcohol.',
      hi: 'पेट की परेशानी से बचने के लिए भोजन के साथ या तुरंत बाद लें। शराब से बचें।'
    },
    icon: '🍚',
    category: 'Antidiabetic',
    cautions: ['Do not double dose if missed', 'Stay well hydrated'],
    interactionsWith: ['contrast dye', 'cimetidine']
  },
  amlodipine: {
    dietary: {
      en: 'Avoid grapefruit and grapefruit juice, as it can dangerously elevate medication levels.',
      hi: 'चकोतरा (Grapefruit) और उसके रस से बचें, यह दवा के असर को खतरनाक रूप से बढ़ा सकता है।'
    },
    icon: '🍊⚠️',
    category: 'Antihypertensive (Calcium Channel Blocker)',
    cautions: ['Rise slowly from sitting or lying down to prevent dizziness'],
    interactionsWith: ['simvastatin', 'diltiazem']
  },
  'vitamin d3': {
    dietary: {
      en: 'Take with your largest meal containing healthy fats for maximum absorption.',
      hi: 'बेहतर अवशोषण के लिए भोजन (जिसमें थोड़ा वसा/घी हो) के साथ लें।'
    },
    icon: '🥗',
    category: 'Supplement',
    cautions: ['Do not exceed prescribed dosage'],
    interactionsWith: ['orlistat', 'steroids']
  },
  paracetamol: {
    dietary: {
      en: 'Can be taken with or without food. Do not exceed 3000 mg in 24 hours.',
      hi: 'भोजन के साथ या बिना भोजन के ले सकते हैं। 24 घंटे में 3000 mg से अधिक न लें।'
    },
    icon: '💧',
    category: 'Analgesic / Antipyretic',
    cautions: ['Check other cold medicines to avoid accidental acetaminophen overdose'],
    interactionsWith: ['warfarin', 'alcohol']
  },
  aspirin: {
    dietary: {
      en: 'Always take with food or a glass of milk to protect stomach lining.',
      hi: 'पेट की सुरक्षा के लिए हमेशा भोजन या दूध के साथ लें।'
    },
    icon: '🥛',
    category: 'Antiplatelet / NSAID',
    cautions: ['Watch for unexplained bruising or dark stools'],
    interactionsWith: ['ibuprofen', 'warfarin', 'heparin']
  },
  atorvastatin: {
    dietary: {
      en: 'Avoid large quantities of grapefruit juice. Preferably take at bedtime.',
      hi: 'चकोतरे (Grapefruit) के रस से बचें। रात को सोते समय लेना बेहतर होता है।'
    },
    icon: '🌙',
    category: 'Lipid-lowering',
    cautions: ['Report persistent muscle pain to your doctor'],
    interactionsWith: ['clarithromycin', 'gemfibrozil']
  },
  losartan: {
    dietary: {
      en: 'Avoid high-potassium salt substitutes unless advised by your doctor.',
      hi: 'डॉक्टर की सलाह के बिना अधिक पोटेशियम वाले नमक के विकल्पों से बचें।'
    },
    icon: '🧂⚠️',
    category: 'Antihypertensive (ARB)',
    cautions: ['Stay adequately hydrated in hot weather'],
    interactionsWith: ['potassium supplements', 'spironolactone', 'nsaids']
  },
  pantoprazole: {
    dietary: {
      en: 'Take 30–60 minutes before your first meal of the day on an empty stomach.',
      hi: 'सुबह के पहले भोजन से 30–60 मिनट पहले खाली पेट लें।'
    },
    icon: '⏰',
    category: 'Proton Pump Inhibitor (Antacid)',
    cautions: ['Swallow whole; do not crush or chew'],
    interactionsWith: ['iron supplements', 'methotrexate']
  }
};

function normalizeName(name) {
  return String(name || '').toLowerCase().trim();
}

function findDrugInfo(medicationName) {
  const norm = normalizeName(medicationName);
  for (const [key, info] of Object.entries(DRUG_DATABASE)) {
    if (norm.includes(key)) return { key, ...info };
  }
  return null;
}

// Cross-checks all active medications for interactions and provides dietary guidelines.
export async function getSafetyAdvisory(patientId, language = 'en') {
  const medications = await repository.medications.forPatient(patientId);
  const drugMatches = medications.map((med) => ({
    medicationId: med.id,
    name: med.name,
    dosage: med.dosage,
    color: med.color,
    info: findDrugInfo(med.name)
  }));

  // 1. Dietary advice for each medication
  const dietaryGuidelines = drugMatches.map((item) => ({
    medicationId: item.medicationId,
    medicationName: item.name,
    icon: item.info?.icon || '💊',
    category: item.info?.category || 'General Medication',
    instruction: item.info?.dietary?.[language] || item.info?.dietary?.en || 'Take as prescribed with water.',
    cautions: item.info?.cautions || []
  }));

  // 2. Cross-medication interactions
  const interactions = [];
  for (let i = 0; i < drugMatches.length; i += 1) {
    for (let j = i + 1; j < drugMatches.length; j += 1) {
      const a = drugMatches[i];
      const b = drugMatches[j];
      const nameA = normalizeName(a.name);
      const nameB = normalizeName(b.name);

      // Check known interactions
      if (a.info?.interactionsWith?.some((sub) => nameB.includes(sub))) {
        interactions.push({
          severity: 'moderate',
          drugs: [a.name, b.name],
          title: `${a.name} + ${b.name}`,
          message: `${a.name} may interact with ${b.name}. Consult your physician to ensure safe dosing intervals.`
        });
      }

      // Check duplicate therapeutic class (e.g. 2 antihypertensives)
      if (a.info && b.info && a.info.category === b.info.category) {
        interactions.push({
          severity: 'info',
          drugs: [a.name, b.name],
          title: `Dual ${a.info.category}`,
          message: `You are taking two medications in the same therapeutic class (${a.name} and ${b.name}). Verify this is intentional with your doctor.`
        });
      }
    }
  }

  // 3. Polypharmacy count alert
  const polypharmacyWarning = medications.length >= 5
    ? {
        flag: true,
        count: medications.length,
        message: 'Patient is on 5+ concurrent medications (polypharmacy). Periodic medication reconciliation by a physician is advised.'
      }
    : { flag: false, count: medications.length, message: 'Current medication regimen is within standard limits.' };

  return {
    patientId,
    totalMedications: medications.length,
    dietaryGuidelines,
    interactions,
    polypharmacyWarning
  };
}

export function dietaryForMedication(name, language = 'en') {
  const match = findDrugInfo(name);
  if (!match) return null;
  return {
    icon: match.icon,
    instruction: match.dietary?.[language] || match.dietary?.en || 'Take as directed with water.',
    cautions: match.cautions
  };
}
