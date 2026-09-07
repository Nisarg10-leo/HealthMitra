// Curated, rule-based guidance for five minor symptoms. Deliberately a static
// lookup: the product decision is that this feature never generates advice.
const SUGGESTIONS = {
  headache: {
    en: 'Rest in a quiet room, drink water, and consider an OTC pain reliever only as directed on its label.',
    hi: 'शांत कमरे में आराम करें, पानी पिएँ और OTC दर्द की दवा केवल लेबल के निर्देश के अनुसार लें।'
  },
  'mild fever': {
    en: 'Rest, drink fluids, and consider paracetamol only as directed on its label.',
    hi: 'आराम करें, तरल पदार्थ लें और पैरासिटामोल केवल लेबल के निर्देश के अनुसार लें।'
  },
  'common cold': {
    en: 'Rest, drink warm fluids, and ask a pharmacist before using OTC cold medicine.',
    hi: 'आराम करें, गुनगुने तरल पदार्थ लें और OTC सर्दी की दवा से पहले फार्मासिस्ट से पूछें।'
  },
  'mild body ache': {
    en: 'Rest, try gentle movement, and use an OTC pain reliever only as directed on its label.',
    hi: 'आराम करें, हल्की गतिविधि करें और OTC दर्द की दवा केवल लेबल के निर्देश के अनुसार लें।'
  },
  'mild cough': {
    en: 'Warm fluids or honey (for adults) may soothe a mild cough.',
    hi: 'गुनगुने तरल पदार्थ या शहद (वयस्कों के लिए) हल्की खाँसी में राहत दे सकते हैं।'
  }
};

const DISCLAIMER = {
  en: 'This is not medical advice. Consult a doctor if symptoms persist or worsen.',
  hi: 'यह चिकित्सा सलाह नहीं है। लक्षण बने रहें या बढ़ें तो डॉक्टर से सलाह लें।'
};

const ESCALATE = { en: 'For severe or unlisted symptoms, please consult a doctor.', hi: 'कृपया डॉक्टर से सलाह लें।' };

export function symptomGuidance({ symptom, language, severe }) {
  const key = String(symptom || '').trim().toLowerCase();
  const lang = language === 'hi' ? 'hi' : 'en';
  const suggestion = SUGGESTIONS[key]?.[lang];
  const safe = Boolean(suggestion) && severe !== true;
  return { symptom: key, safe, suggestion: safe ? suggestion : ESCALATE[lang], disclaimer: DISCLAIMER[lang] };
}
