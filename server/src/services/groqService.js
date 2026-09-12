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
  },
  {
    pattern: /insulin|injection|syringe/i,
    en: 'Insulin should be injected into the fat layer under the skin, usually the abdomen, thigh, or upper arm. Rotate injection sites to prevent lumps. Never reuse needles.',
    hi: 'इंसुलिन को त्वचा के नीचे की वसा परत में इंजेक्ट किया जाना चाहिए, आमतौर पर पेट, जांघ या ऊपरी बांह में। गांठ को रोकने के लिए इंजेक्शन साइटों को बदलें। कभी भी सुइयों का दोबारा उपयोग न करें।'
  },
  {
    pattern: /sugar|glucose|hypo|low/i,
    en: 'If your blood sugar drops below 70 mg/dL, consume 15 grams of fast-acting carbs (like 1/2 cup fruit juice or 3-4 glucose tablets). Wait 15 minutes, recheck, and repeat if still low.',
    hi: 'यदि आपका ब्लड शुगर 70 mg/dL से नीचे चला जाता है, तो 15 ग्राम फास्ट-एक्टिंग कार्ब्स (जैसे 1/2 कप फलों का रस या 3-4 ग्लूकोज टैबलेट) लें। 15 मिनट तक प्रतीक्षा करें, फिर से जांचें, और यदि अभी भी कम है तो दोहराएं।'
  },
  {
    pattern: /exercise|workout|walk|yoga/i,
    en: 'Regular exercise is excellent, but check your blood sugar before starting if on insulin or sulfonylureas. Carry a fast-acting carb with you. Hydrate well before, during, and after your activity.',
    hi: 'नियमित व्यायाम उत्कृष्ट है, लेकिन इंसुलिन पर होने पर शुरू करने से पहले अपना ब्लड शुगर जांचें। अपने साथ एक फास्ट-एक्टिंग कार्ब रखें। अपनी गतिविधि से पहले, दौरान और बाद में अच्छी तरह से हाइड्रेट करें।'
  },
  {
    pattern: /sleep|neend|insomnia|rest/i,
    en: 'Taking certain medicines right before bed, like diuretics (water pills), can disrupt sleep due to frequent urination. Try to take them earlier in the day. Ensure a dark, quiet sleep environment.',
    hi: 'सोने से ठीक पहले कुछ दवाएं लेना, जैसे कि मूत्रवर्धक (पानी की गोलियां), बार-बार पेशाब आने के कारण नींद में खलल डाल सकती हैं। उन्हें दिन में पहले लेने की कोशिश करें।'
  },
  {
    pattern: /diet|sweet|meetha|food/i,
    en: 'For a diabetic diet, focus on high-fiber foods, lean proteins, and complex carbohydrates. Limit processed sugars and white flours. Portion control is key even for healthy foods.',
    hi: 'मधुमेह आहार के लिए, उच्च फाइबर वाले खाद्य पदार्थों, दुबले प्रोटीन और जटिल कार्बोहाइड्रेट पर ध्यान केंद्रित करें। प्रसंस्कृत शर्करा और सफेद आटे को सीमित करें।'
  },
  {
    pattern: /emergency|ambulance|chest|heart/i,
    en: 'If you experience severe chest pain, shortness of breath, sudden weakness/numbness on one side, or sudden speech difficulty, seek immediate emergency medical care or call an ambulance.',
    hi: 'यदि आपको सीने में गंभीर दर्द, सांस लेने में तकलीफ, एक तरफ अचानक कमजोरी/सुन्नता, या अचानक बोलने में कठिनाई का अनुभव होता है, तो तुरंत आपातकालीन चिकित्सा देखभाल लें या एम्बुलेंस को कॉल करें।'
  },
  {
    pattern: /side effect|reaction|rash|itching/i,
    en: 'Common mild side effects may subside as your body adjusts. However, if you develop a severe rash, facial swelling, or severe difficulty breathing, stop the medicine and consult a doctor immediately.',
    hi: 'आपके शरीर के अनुकूल होने पर सामान्य हल्के दुष्प्रभाव कम हो सकते हैं। हालाँकि, यदि आपको गंभीर दाने, चेहरे पर सूजन, या सांस लेने में गंभीर कठिनाई होती है, तो दवा बंद कर दें और तुरंत डॉक्टर से सलाह लें।'
  },
  {
    pattern: /store|keep|fridge|sun/i,
    en: 'Most medicines should be stored in a cool, dry place away from direct sunlight. Unopened insulin usually needs refrigeration, but in-use pens can be kept at room temperature (check specific label).',
    hi: 'अधिकांश दवाओं को सीधी धूप से दूर ठंडी, सूखी जगह पर संग्रहित किया जाना चाहिए। बिना खुले इंसुलिन को आमतौर पर प्रशीतन की आवश्यकता होती है, लेकिन उपयोग में आने वाले पेन को कमरे के तापमान पर रखा जा सकता है।'
  },
  {
    pattern: /water|hydration|paani/i,
    en: 'Drink adequate water throughout the day, especially when taking medicines. Some drugs require extra hydration. If you are on fluid restriction for heart issues, strictly follow your doctor’s limit.',
    hi: 'दिन भर में पर्याप्त पानी पिएं, खासकर दवा लेते समय। यदि आप हृदय संबंधी समस्याओं के लिए तरल पदार्थ के प्रतिबंध पर हैं, तो अपने डॉक्टर की सीमा का सख्ती से पालन करें।'
  },
  {
    pattern: /alcohol|daaru|drink/i,
    en: 'Alcohol can interact dangerously with many medications (like Metformin) and can cause unsafe drops in blood sugar. It is best to avoid alcohol while managing these chronic conditions.',
    hi: 'शराब कई दवाओं (जैसे मेटफॉर्मिन) के साथ खतरनाक रूप से बातचीत कर सकती है और ब्लड शुगर में असुरक्षित गिरावट का कारण बन सकती है। इन पुरानी स्थितियों का प्रबंधन करते समय शराब से बचना सबसे अच्छा है।'
  },
  {
    pattern: /pregnant|breastfeed|baby/i,
    en: 'Many common chronic medications are not safe during pregnancy or breastfeeding. If planning a pregnancy or currently breastfeeding, discuss your medication list with your doctor immediately.',
    hi: 'गर्भावस्था या स्तनपान के दौरान कई सामान्य पुरानी दवाएं सुरक्षित नहीं हैं। यदि गर्भावस्था की योजना बना रहे हैं या वर्तमान में स्तनपान करा रहे हैं, तो तुरंत अपने डॉक्टर से अपनी दवा सूची पर चर्चा करें।'
  },
  {
    pattern: /vitamin|supplement|calcium|iron/i,
    en: 'Supplements like Iron and Calcium can interfere with the absorption of other medicines (like thyroid drugs). Usually, it is advised to separate their intake by at least 2 hours.',
    hi: 'आयरन और कैल्शियम जैसे सप्लीमेंट अन्य दवाओं (जैसे थायराइड की दवाओं) के अवशोषण में हस्तक्षेप कर सकते हैं। आमतौर पर, उनके सेवन को कम से कम 2 घंटे अलग करने की सलाह दी जाती है।'
  },
  {
    pattern: /eye|drop|vision|aankh/i,
    en: 'When using eye drops, wash your hands first. Pull down the lower lid, instill the drop without touching the eye, and close your eye gently for 1-2 minutes. Wait 5 minutes between different drops.',
    hi: 'आई ड्रॉप का उपयोग करते समय पहले अपने हाथ धो लें। निचली पलक को नीचे खींचें, आंख को छुए बिना बूंद डालें, और 1-2 मिनट के लिए अपनी आंख को धीरे से बंद करें।'
  },
  {
    pattern: /inhaler|asthma|breathe|pump/i,
    en: 'If using a steroid inhaler, always rinse your mouth with water and spit it out after use to prevent fungal infections (thrush). Ensure proper technique for maximum medicine delivery.',
    hi: 'यदि स्टेरॉयड इनहेलर का उपयोग कर रहे हैं, तो फंगल संक्रमण को रोकने के लिए उपयोग के बाद हमेशा अपने मुंह को पानी से धो लें और थूक दें।'
  }
];

export async function askMitra({ question, patientId, language = 'en' }) {
  const [patient, medications] = await Promise.all([
    repository.users.findById(patientId),
    repository.medications.forPatient(patientId)
  ]);

  const medsSummary = medications.map((m) => `${m.name} (${m.dosage})`).join(', ') || 'Metformin, Amlodipine';
  
  const patientProfile = patient ? `Patient Profile:
Name: ${patient.name || 'Unknown'}
Age: ${patient.age || 'Unknown'}
Conditions: ${patient.conditions?.join(', ') || 'None recorded'}
Allergies: ${patient.allergies?.join(', ') || 'None recorded'}` : '';

  // 1. Call AI model if GROQ_API_KEY is configured
  if (process.env.GROQ_API_KEY) {
    try {
      const systemPrompt = `You are Mitra, an empathetic, warm, and clear medical assistant for patients.
Patient Name: ${patient?.name || 'Patient'}
${patientProfile}
Active Medications: ${medsSummary}

CRITICAL FORMATTING RULES:
1. Do NOT use markdown symbols like hashtags (### or ##), divider lines (---), bold or italic asterisks (** or *), or pipe tables (|).
2. Present all information in clean, natural, plain conversational paragraphs and simple numbered lists (1. 2. 3.) or clean bullet dashes (- ).
3. Give thorough, clear, reassuring explanations without technical jargon or formatting symbols.
4. Address food/drug safety, side effects, and practical home measures.
5. Answer in ${language === 'hi' ? 'Hindi' : 'English'}.
6. End with a simple, gentle reminder to check with their doctor.`;

      let answer = null;
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
                { role: 'user', content: question }
              ],
              temperature: 0.3,
              max_tokens: 500
            })
          });

          if (response.ok) {
            const json = await response.json();
            answer = json.choices?.[0]?.message?.content;
            if (answer) {
              // Strip any stray markdown symbols (###, ---, **, tables)
              let cleanAnswer = answer
                .replace(/^#{1,6}\s+/gm, '')
                .replace(/^\s*[-*_]{3,}\s*$/gm, '')
                .replace(/\*{1,3}(.*?)\*{1,3}/g, '$1')
                .replace(/^[|\s]+|[|\s]+$/gm, '')
                .replace(/\|\s*/g, ' - ')
                .replace(/^[-\s]{4,}$/gm, '')
                .replace(/([.?!])\s*(\d+\.\s+)/g, '$1\n\n$2')
                .replace(/\n{3,}/g, '\n\n')
                .trim();

              return {
                source: 'Mitra AI',
                question,
                answer: cleanAnswer,
                disclaimer: language === 'hi'
                  ? 'चिकित्सा अस्वीकरण: यह जानकारी केवल मार्गदर्शन के लिए है। किसी भी बदलाव से पहले अपने डॉक्टर से सलाह लें।'
                  : 'Medical disclaimer: For guidance only. Please consult your physician before altering any prescription.'
              };
            }
          }
        } catch (mErr) {
          console.warn('[ai] Model attempt failed, trying fallback:', mErr.message);
        }
      }
    } catch (err) {
      console.error('[ai] Service error:', err);
    }
  }

  // 2. Intelligent Clinical Reasoning Engine Fallback
  const matched = CLINICAL_KNOWLEDGE.find((k) => k.pattern.test(question));
  let answerText = '';

  if (matched) {
    answerText = language === 'hi' ? matched.hi : matched.en;
  } else {
    answerText = language === 'hi'
      ? `आपकी मौजूदा दवाएँ (${medsSummary}) आपके स्वास्थ्य के लिए महत्वपूर्ण हैं। इस सवाल के लिए कृपया अपने डॉक्टर से संपर्क करें या समय पर अपनी निर्धारित दवा लें। हम अभी विस्तृत जानकारी प्राप्त करने में असमर्थ हैं।`
      : `Based on your active medications (${medsSummary}), always take doses at consistent times with meals as indicated. For this specific medical query, we recommend speaking with your doctor, as our detailed AI assistant is currently unreachable.`;
  }

  return {
    source: 'clinical-rules-engine',
    question,
    answer: answerText,
    disclaimer: language === 'hi' ? 'चिकित्सा अस्वीकरण: यह जानकारी केवल सहायता के लिए है। किसी भी बदलाव से पहले अपने डॉक्टर से सलाह लें।' : 'Medical disclaimer: For guidance only. Please consult your physician before altering any prescription.'
  };
}
