import { repository } from '../data/repository.js';

// Comprehensive clinical fallback guidelines for offline / fallback mode
const EXTENDED_CLINICAL_GUIDANCE = {
  headache: {
    en: 'Rest in a quiet, dimly lit room and stay well-hydrated. If you take blood pressure medications like Amlodipine, check your BP as both high and low BP can trigger headaches. Consider a gentle cool compress. If accompanied by sudden vision changes or weakness, seek emergency care immediately.',
    hi: 'एक शांत, मंद रोशनी वाले कमरे में आराम करें और पर्याप्त पानी पिएं। यदि आप एम्लोडिपिन जैसी बीपी की दवा ले रहे हैं, तो अपना बीपी जरूर मापें। सिर पर ठंडे पानी की पट्टी रख सकते हैं। यदि अचानक दृष्टि में बदलाव या कमजोरी महसूस हो, तो तुरंत डॉक्टर से संपर्क करें।'
  },
  'mild fever': {
    en: 'Rest and consume warm fluids like soup and herbal teas. Wear light clothing and sponge with lukewarm water if uncomfortable. Paracetamol (up to 650mg) is generally safe, but keep track of your temperature every 4 hours. Diabetic patients should monitor blood sugar closely during fever as infections raise glucose levels.',
    hi: 'आराम करें और गुनगुने तरल पदार्थ जैसे सूप या काढ़ा लें। हल्के कपड़े पहनें। पैरासिटामोल (650mg तक) आमतौर पर सुरक्षित है, लेकिन हर 4 घंटे में तापमान नोट करें। मधुमेह के रोगियों को बुखार के दौरान अपने शुगर की नियमित जांच करनी चाहिए।'
  },
  'common cold': {
    en: 'Drink warm water with honey, inhale steam for nasal congestion, and rest your voice. Avoid multi-ingredient over-the-counter decongestants (pseudoephedrine) without asking your doctor, as they can significantly raise blood pressure in hypertensive patients.',
    hi: 'शहद के साथ गुनगुना पानी पिएं, बंद नाक के लिए भाप लें और आराम करें। बिना डॉक्टर की सलाह के मेडिकल स्टोर से सर्दी की डीकंजेस्टेंट दवाएं न लें, क्योंकि वे बीपी के मरीजों में रक्तचाप बढ़ा सकती हैं।'
  },
  'mild body ache': {
    en: 'Gentle stretching, a warm bath or heating pad, and adequate hydration help relieve mild body aches. If taking cholesterol medications (statins like Atorvastatin), notice if muscle aches are unusual or bilateral, and mention it to your physician.',
    hi: 'हल्का खिंचाव, गर्म पानी से स्नान या सिकाई और पर्याप्त पानी पीने से बदन दर्द में राहत मिलती है। यदि आप कोलेस्ट्रॉल की दवा ले रहे हैं, तो असामान्य मांसपेशियों के दर्द पर ध्यान दें और अपने डॉक्टर को सूचित करें।'
  },
  'mild cough': {
    en: 'Sip warm fluids, gargle with warm saline water, and use steam inhalation. Note: If you take ACE inhibitors (like Lisinopril, Ramipril, or Enalapril), they frequently cause a chronic dry, tickling cough as a known side effect that warrants a medication review.',
    hi: 'गुनगुना पानी पिएं, नमक के गुनगुने पानी से गरारे करें और भाप लें। ध्यान दें: यदि आप बीपी के लिए एसीई इन्हिबिटर दवा ले रहे हैं, तो यह सूखी खांसी का एक सामान्य दुष्प्रभाव हो सकता है जिस पर डॉक्टर से सलाह लेनी चाहिए।'
  },
  'acidity & heartburn': {
    en: 'Avoid lying flat for at least 2 hours after meals. Elevate the head of your bed slightly. Sip cold milk or room-temperature water. Avoid spicy, oily foods and caffeine. Ensure Metformin is taken strictly with food to reduce gastric acid flare-ups.',
    hi: 'भोजन के बाद कम से कम 2 घंटे तक सीधे न लेटें। थोड़ा ठंडा दूध या सामान्य पानी पिएं। मसालेदार, तैलीय भोजन से बचें। पेट की जलन से बचने के लिए मेटफ़ॉर्मिन हमेशा खाने के साथ ही लें।'
  },
  'nausea & upset stomach': {
    en: 'Sip clear liquids like lemon water or ginger tea in small, frequent amounts. Eat bland foods like plain crackers, toast, or khichdi. Metformin commonly causes mild nausea when starting or adjusting doses. Never skip prescribed diabetes medicines without consulting your doctor.',
    hi: 'नींबू पानी या अदरक की चाय थोड़े-थोड़े अंतराल पर पिएं। हल्का भोजन जैसे सादा टोस्ट या खिचड़ी लें। मेटफ़ॉर्मिन शुरू करने पर हल्का जी मिचलाना सामान्य है। डॉक्टर की सलाह के बिना शुगर की दवा कभी बंद न करें।'
  },
  'mild dizziness': {
    en: 'Sit or lie down immediately with feet elevated to restore cerebral blood flow. When getting out of bed, sit on the edge for 1 minute before standing (postural hypotension). Blood pressure medications frequently cause lightheadedness; hydrate well and re-check your blood pressure.',
    hi: 'चक्कर आने पर तुरंत बैठ या लेट जाएं। बिस्तर से उठते समय पहले 1 मिनट किनारे बैठें फिर धीरे से खड़े हों। बीपी की दवाओं से हल्का चक्कर आना संभव है; पर्याप्त पानी पिएं और अपना बीपी मापें।'
  },
  'joint pain': {
    en: 'Apply a warm compress for stiff joints or a cool gel pack for swollen, hot joints. Maintain gentle range-of-motion movements without straining. Avoid high-dose ibuprofen without doctor approval, especially if you have high blood pressure or kidney concerns.',
    hi: 'अकड़े जोड़ों पर गर्म सिकाई और सूजे हुए जोड़ों पर ठंडी पट्टी लगाएं। बिना ज्यादा ज़ोर दिए हल्की हलचल जारी रखें। हाई बीपी या किडनी की समस्या होने पर बिना डॉक्टर की सलाह के ब्रूफेन जैसी दवाएं न लें।'
  },
  fatigue: {
    en: 'Ensure consistent 7-8 hours of sleep and balanced hydration. Check your morning and post-meal blood sugar levels, as both elevated and low glucose cause pronounced fatigue. If accompanied by chest tightness or breathlessness, seek immediate evaluation.',
    hi: '7-8 घंटे की नियमित नींद लें और पर्याप्त पानी पिएं। अपने ब्लड शुगर की जांच करें, क्योंकि शुगर कम या ज्यादा दोनों होने पर कमजोरी महसूस होती है। यदि सीने में भारीपन या सांस फूलने के साथ हो, तो तुरंत जांच कराएं।'
  }
};

const RED_FLAGS = {
  en: 'Seek immediate emergency medical care if you experience: sudden chest pain or pressure, severe shortness of breath, sudden facial droop or arm weakness, high fever above 102°F that does not respond to medicine, or blood sugar dropping below 70 mg/dL.',
  hi: 'आपातकालीन सहायता तुरंत लें यदि: सीने में अचानक तेज दर्द या भारीपन हो, सांस लेने में अत्यधिक कठिनाई हो, चेहरे या हाथ में अचानक कमजोरी महसूस हो, या 102°F से अधिक तेज बुखार हो जो दवा से कम न हो।'
};

/**
 * AI-powered clinical symptom guidance with Groq fallback to clinical reasoning rules
 */
export async function symptomGuidance({ symptom, language = 'en', severe = false, patientId = null }) {
  const cleanSymptom = String(symptom || '').trim();
  const lang = language === 'hi' ? 'hi' : 'en';

  if (!cleanSymptom) {
    return {
      symptom: '',
      safe: true,
      triage: 'safe',
      suggestion: lang === 'hi' ? 'कृपया विश्लेषण के लिए कोई लक्षण चुनें या लिखें।' : 'Please select or enter a symptom to analyze.',
      disclaimer: lang === 'hi' ? 'चिकित्सा अस्वीकरण: यह केवल स्वास्थ्य मार्गदर्शन के लिए है।' : 'Medical disclaimer: For guidance only.'
    };
  }

  // 1. Fetch patient profile and active medications for clinical context
  let patient = null;
  let medications = [];

  if (patientId) {
    try {
      [patient, medications] = await Promise.all([
        repository.users.findById(patientId),
        repository.medications.forPatient(patientId)
      ]);
    } catch (e) {
      console.warn('[symptom-service] Could not fetch patient context:', e.message);
    }
  }

  const medsList = (medications || []).map((m) => `${m.name} (${m.dosage})`).join(', ') || 'None recorded';
  const conditionsList = (patient?.conditions || []).join(', ') || 'None recorded';
  const allergiesList = (patient?.allergies || []).join(', ') || 'None recorded';
  const age = patient?.age || 'Elderly / Adult';

  // 2. Query Groq Clinical AI if API Key is available
  if (process.env.GROQ_API_KEY) {
    try {
      const systemPrompt = `You are Mitra, a compassionate and expert clinical AI assistant specializing in geriatric care, medication interactions, and safe triage.

Patient Context:
- Age: ${age}
- Known Medical Conditions: ${conditionsList}
- Active Prescriptions: ${medsList}
- Drug Allergies: ${allergiesList}
- Reported Symptom: "${cleanSymptom}"
- Patient Reported as Severe/Worsening: ${severe ? 'YES' : 'NO'}

YOUR TASK:
Provide an authoritative, comforting, and clear clinical assessment in ${lang === 'hi' ? 'Hindi' : 'English'}.
Address:
1. Clinical Analysis: Correlate this symptom with their active medications or chronic conditions (e.g. note if any of their drugs like Metformin, Amlodipine, etc. could cause or interact with this symptom).
2. Safe Home Self-Care: 2-3 immediate, actionable comfort steps (hydration, posture, dietary adjustments, rest).
3. Red Flags: Specific emergency warning symptoms that require immediate medical attention.

CRITICAL FORMATTING INSTRUCTIONS:
- Do NOT use markdown symbols like hashtags (### or ##), divider lines (---), bold or italic asterisks (** or *), or pipe tables (|).
- Use natural plain conversational paragraphs and clean bullet dashes (- ).
- Be empathetic, practical, and clear.
- Keep the response around 120-160 words.`;

      const modelsToTry = ['openai/gpt-oss-120b', 'openai/gpt-oss-20b', 'groq/compound-mini', 'qwen/qwen3.8-27b'];

      for (const model of modelsToTry) {
        try {
          const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${process.env.GROQ_API_KEY}`
            },
            body: JSON.stringify({
              model,
              messages: [
                { role: 'system', content: systemPrompt },
                { role: 'user', content: `Please provide clinical guidance for: ${cleanSymptom}` }
              ],
              temperature: 0.3,
              max_tokens: 500
            })
          });

          if (response.ok) {
            const data = await response.json();
            const rawContent = data.choices?.[0]?.message?.content;

            if (rawContent) {
              // Clean markdown symbols for beautiful display
              const cleaned = rawContent
                .replace(/^#{1,6}\s+/gm, '')
                .replace(/^\s*[-*_]{3,}\s*$/gm, '')
                .replace(/\*{1,3}(.*?)\*{1,3}/g, '$1')
                .replace(/^[|\s]+|[|\s]+$/gm, '')
                .replace(/\|\s*/g, ' - ')
                .replace(/\n{3,}/g, '\n\n')
                .trim();

              const triageLevel = severe ? 'urgent' : /emergency|hospital|ambulance|urgent|डॉक्टर|अस्पताल|तुरंत/i.test(cleanSymptom) ? 'moderate' : 'safe';

              return {
                symptom: cleanSymptom,
                safe: triageLevel === 'safe' && !severe,
                triage: triageLevel,
                suggestion: cleaned,
                source: 'Mitra Clinical AI',
                disclaimer: lang === 'hi'
                  ? 'चिकित्सा अस्वीकरण: यह एआई विश्लेषण केवल स्वास्थ्य मार्गदर्शन के लिए है। किसी भी बदलाव या गंभीर लक्षण के लिए तुरंत अपने डॉक्टर से संपर्क करें।'
                  : 'Medical disclaimer: This clinical AI assessment is for guidance only. Consult your doctor or healthcare provider if symptoms persist or worsen.'
              };
            }
          }
        } catch (mErr) {
          console.warn('[symptom-ai] Model attempt error:', mErr.message);
        }
      }
    } catch (err) {
      console.error('[symptom-ai] Groq service error:', err);
    }
  }

  // 3. Fallback to Extended Clinical Reasoning Matrix
  const lower = cleanSymptom.toLowerCase();
  const matchedKey = Object.keys(EXTENDED_CLINICAL_GUIDANCE).find((k) => lower.includes(k) || k.includes(lower));
  const fallbackAdvice = matchedKey
    ? EXTENDED_CLINICAL_GUIDANCE[matchedKey][lang]
    : lang === 'hi'
    ? `आपके लक्षण "${cleanSymptom}" के लिए: पर्याप्त आराम करें और पानी पिएं। यदि आप नियमित दवाएं ले रहे हैं, तो उन्हें समय पर लेते रहें। यदि लक्षण 24 घंटे में ठीक नहीं होते हैं, तो डॉक्टर से सलाह लें।`
    : `For your symptom of "${cleanSymptom}": Rest in a calm environment, stay well-hydrated, and monitor for changes. Continue taking scheduled chronic prescriptions as advised. If discomfort persists past 24 hours, contact your physician.`;

  const safe = !severe && Boolean(matchedKey);
  const triage = severe ? 'urgent' : safe ? 'safe' : 'moderate';

  return {
    symptom: cleanSymptom,
    safe,
    triage,
    suggestion: fallbackAdvice,
    redFlags: RED_FLAGS[lang],
    source: 'Clinical Rules Engine',
    disclaimer: lang === 'hi'
      ? 'चिकित्सा अस्वीकरण: यह जानकारी केवल सहायता के लिए है। किसी भी लक्षण के बिगड़ने पर तुरंत डॉक्टर से सलाह लें।'
      : 'Medical disclaimer: For guidance only. Please consult your physician before altering any prescription.'
  };
}
