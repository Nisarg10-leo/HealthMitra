import { repository } from '../data/repository.js';

// Local clinical knowledge fallback for common geriatric queries
const CLINICAL_KNOWLEDGE = [
  {
    pattern: /grapefruit|juice|mosambi|santra/i,
    en: 'Grapefruit and its juice block the enzyme (CYP3A4) that breaks down Amlodipine in your liver. This causes the drug to build up to dangerous levels, causing severe low blood pressure and dizziness. Please avoid grapefruit while on Amlodipine.',
    hi: 'चकोतरा (Grapefruit) आपके लिवर में उस एंजाइम को रोकता है जो एम्लोडिपिन को पचाता है। इससे रक्त में दवा की मात्रा खतरनाक रूप से बढ़ जाती है और ब्लड प्रेशर बहुत कम हो सकता है। कृपया इसके रस से बचें।'
  },
  {
    pattern: /food|khana|pet|stomach|meal/i,
    en: 'Metformin should always be taken with or right after your meal. Taking it on an empty stomach commonly causes nausea, stomach cramps, and loose motions. Food cushions your stomach lining.',
    hi: 'मेटफ़ॉर्मिन हमेशा भोजन के साथ या तुरंत बाद लेनी चाहिए। इसे खाली पेट लेने से मतली, पेट दर्द और दस्त हो सकते हैं। भोजन पेट की अंदरूनी परत को सुरक्षित रखता है।'
  },
  {
    pattern: /miss|bhul|chhoot|forget/i,
    en: 'If you miss a dose, take it as soon as you remember. However, if it is almost time for your next scheduled dose, skip the missed one. NEVER take two pills at once to make up for a missed dose.',
    hi: 'अगर आप खुराक भूल जाएँ, तो याद आते ही ले लें। लेकिन अगर अगली खुराक का समय नज़दीक है, तो भूली हुई खुराक छोड़ दें। छूटी हुई दवा की भरपाई के लिए कभी भी एक साथ दो गोलियाँ न लें।'
  },
  {
    pattern: /paracetamol|crocin|dolo|fever|dard|pain/i,
    en: 'Paracetamol (up to 650 mg) is generally safe to take with your current blood pressure and diabetes medicines. Do not exceed 3000 mg in 24 hours. Avoid taking multiple cold medicines at the same time.',
    hi: 'पैरासिटामोल (650 mg तक) आपकी मौजूदा बीपी और शुगर की दवाओं के साथ लेना सुरक्षित है। 24 घंटे में 3000 mg से ज़्यादा न लें। एक साथ कई सर्दी की दवाइयाँ लेने से बचें।'
  },
  {
    pattern: /dizzy|chakkar|lightheaded/i,
    en: 'Blood pressure medications like Amlodipine can cause mild dizziness, especially when standing up quickly (postural hypotension). Sit on the edge of the bed for 30 seconds before standing up, and stay well hydrated.',
    hi: 'एम्लोडिपिन जैसी बीपी की दवाओं से अचानक खड़े होने पर चक्कर आ सकते हैं। बिस्तर से उठने से पहले 30 सेकंड किनारे बैठें, और पर्याप्त पानी पिएं।'
  }
];

export async function askMitra({ question, patientId, language = 'en' }) {
  const [patient, medications] = await Promise.all([
    repository.users.findById(patientId),
    repository.medications.forPatient(patientId)
  ]);

  const medsSummary = medications.map((m) => `${m.name} (${m.dosage})`).join(', ') || 'Metformin, Amlodipine';

  // 1. If GROQ_API_KEY is configured in environment, call Groq Llama 3.3 70B
  if (process.env.GROQ_API_KEY) {
    try {
      const systemPrompt = `You are Mitra, an empathetic, clinically rigorous geriatric medical assistant for elderly Indian patients. The patient is ${patient?.name || 'Meera'} who takes: ${medsSummary}. Answer in simple, reassuring words in ${language === 'hi' ? 'Hindi' : 'English'}. Address food/drug safety, warn against double-dosing, and keep response under 100 words. Always include a brief disclaimer to consult their doctor.`;

      const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${process.env.GROQ_API_KEY}`
        },
        body: JSON.stringify({
          model: 'llama-3.3-70b-versatile',
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: question }
          ],
          temperature: 0.3,
          max_tokens: 300
        })
      });

      if (response.ok) {
        const json = await response.json();
        const answer = json.choices?.[0]?.message?.content;
        if (answer) {
          return {
            source: 'groq-llama-3.3-70b',
            question,
            answer,
            disclaimer: language === 'hi' ? 'चिकित्सा अस्वीकरण: यह जानकारी केवल सहायता के लिए है। किसी भी बदलाव से पहले अपने डॉक्टर से सलाह लें।' : 'Medical disclaimer: For guidance only. Please consult your physician before altering any prescription.'
          };
        }
      }
    } catch (err) {
      console.warn('[groq] Groq API call failed, falling back to clinical engine:', err.message);
    }
  }

  // 2. Intelligent Clinical Reasoning Engine Fallback
  const matched = CLINICAL_KNOWLEDGE.find((k) => k.pattern.test(question));
  let answerText = '';

  if (matched) {
    answerText = language === 'hi' ? matched.hi : matched.en;
  } else {
    answerText = language === 'hi'
      ? `आपकी मौजूदा दवाएँ (${medsSummary}) आपके स्वास्थ्य के लिए महत्वपूर्ण हैं। इस सवाल के लिए कृपया अपने डॉक्टर डॉ. आर. नायर से संपर्क करें या समय पर अपनी निर्धारित दवा लें।`
      : `Based on your active medications (${medsSummary}), always take doses at consistent times with meals as indicated. For this specific medical query, we recommend speaking with your family doctor Dr. R. Nair.`;
  }

  return {
    source: 'clinical-rules-engine',
    question,
    answer: answerText,
    disclaimer: language === 'hi' ? 'चिकित्सा अस्वीकरण: यह जानकारी केवल सहायता के लिए है। किसी भी बदलाव से पहले अपने डॉक्टर से सलाह लें।' : 'Medical disclaimer: For guidance only. Please consult your physician before altering any prescription.'
  };
}
