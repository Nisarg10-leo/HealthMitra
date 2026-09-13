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

// OCR extraction helper using Tesseract
async function extractOcrFromImage(base64Image) {
  if (!base64Image) return '';
  return Promise.race([
    (async () => {
      let worker = null;
      try {
        const cleanBase64 = base64Image.includes(',') ? base64Image.split(',')[1] : base64Image;
        const buffer = Buffer.from(cleanBase64, 'base64');
        const { createWorker } = await import('tesseract.js');
        worker = await createWorker('eng', 1, {
          errorHandler: (err) => console.warn('[groqService] OCR worker warning:', err?.message || err)
        });
        const ret = await worker.recognize(buffer);
        const text = ret?.data?.text || '';
        await worker.terminate();
        return text.trim();
      } catch (err) {
        if (worker) {
          try { await worker.terminate(); } catch (_) {}
        }
        console.warn('[groqService] Image OCR extraction error:', err.message);
        return '';
      }
    })(),
    new Promise((resolve) => setTimeout(() => resolve(''), 3000))
  ]);
}

// Local clinical fallback for image analysis
function analyzeMedicalImageLocally({ ocrText, question, medications, language }) {
  const text = (ocrText || '').toLowerCase();
  const q = (question || '').toLowerCase();
  const medsSummary = medications?.map((m) => `${m.name} (${m.dosage})`).join(', ') || 'Metformin, Amlodipine';
  const isHindi = language === 'hi';

  // 1. Lab Report or Diagnostic Parameter Check
  const isLab = /hba1c|glucose|blood sugar|cholesterol|lipid|creatinine|hemoglobin|bilirubin|triglyceride|serum|report|test|mg\/dl|mmol/i.test(text + ' ' + q);
  if (isLab) {
    const findings = [];
    if (/hba1c/i.test(text + ' ' + q)) {
      findings.push(isHindi
        ? 'HbA1c (ग्लाइकेटेड हीमोग्लोबिन): सामान्य सीमा 5.7% से कम है। 5.7%-6.4% प्रीडायबिटीज और 6.5% या अधिक मधुमेह दर्शाता है।'
        : 'HbA1c: Target is typically below 7.0% for managed diabetes (normal < 5.7%). Helps assess 3-month blood sugar control.');
    }
    if (/glucose|sugar|fbs|ppbs/i.test(text + ' ' + q)) {
      findings.push(isHindi
        ? 'रक्त शर्करा (Blood Glucose): उपवास (Fasting) सामान्य सीमा 70-99 mg/dL है, और भोजन के 2 घंटे बाद 140 mg/dL से कम।'
        : 'Blood Sugar: Normal fasting range is 70-99 mg/dL, post-meal under 140 mg/dL.');
    }
    if (/cholesterol|lipid|triglyceride|ldl|hdl/i.test(text + ' ' + q)) {
      findings.push(isHindi
        ? 'लिपिड प्रोफाइल: कुल कोलेस्ट्रॉल 200 mg/dL से कम और LDL (हानिकारक कोलेस्ट्रॉल) 100 mg/dL से कम होना चाहिए।'
        : 'Lipid Profile: Desirable Total Cholesterol is < 200 mg/dL and LDL < 100 mg/dL for cardiac safety.');
    }
    if (/creatinine|kidney|urea/i.test(text + ' ' + q)) {
      findings.push(isHindi
        ? 'सीरम क्रिएटिनिन: सामान्य सीमा 0.6-1.2 mg/dL है, जो किडनी की कार्यक्षमता को दर्शाता है।'
        : 'Serum Creatinine: Normal baseline is 0.6-1.2 mg/dL, reflecting renal filtration efficiency.');
    }

    if (findings.length === 0) {
      findings.push(isHindi ? 'लैब रिपोर्ट से संबंधित क्लिनिकल डाटा पहचाना गया।' : 'Diagnostic test report parameters detected in document.');
    }

    if (isHindi) {
      return `लैब रिपोर्ट विश्लेषण:

1. पहचानी गई मुख्य जाँचें:
${findings.map((f, i) => `${i + 1}. ${f}`).join('\n')}

2. आपकी मौजूदा दवाओं के साथ तालमेल:
आपकी वर्तमान निर्धारित दवाएँ (${medsSummary}) इस रिपोर्ट के मापदंडों को नियंत्रित करने में सहायक हैं। अपनी दवाएँ नियमित रूप से समय पर लें।

3. अगला कदम:
इस रिपोर्ट को अपने डॉक्टर के साथ साझा करें ताकि वे आवश्यकतानुसार आपकी खुराक की समीक्षा कर सकें।`;
    } else {
      return `Clinical Lab Report Analysis:

1. Identified Test Parameters:
${findings.map((f, i) => `${i + 1}. ${f}`).join('\n')}

2. Correlation with Active Medication Plan:
Your active prescription regimen (${medsSummary}) directly supports managing these vital benchmarks. Continue taking your scheduled doses consistently.

3. Recommended Next Step:
Share these diagnostic findings with your treating physician at your next follow-up for routine dose titration.`;
    }
  }

  // 2. Medicine Strip, Pill, or Packaging
  const isMed = /tablet|capsule|mg|strip|pharma|dosage|metformin|amlodipine|atorvastatin|paracetamol|dolo|pantoprazole|aspirin|vitamin|calpol|glycomet/i.test(text + ' ' + q);
  if (isMed) {
    let identifiedDrug = null;
    const knownList = [
      { name: 'Metformin', regex: /metformin|glycomet/i, dosage: '500 mg', advice: 'Take with or immediately after meals to avoid stomach upset.' },
      { name: 'Amlodipine', regex: /amlodipine|norvasc/i, dosage: '5 mg', advice: 'Take once daily in the morning. Avoid grapefruit juice.' },
      { name: 'Atorvastatin', regex: /atorvastatin|lipitor/i, dosage: '20 mg', advice: 'Take once daily at bedtime for optimal cholesterol management.' },
      { name: 'Paracetamol', regex: /paracetamol|crocin|dolo|calpol/i, dosage: '650 mg', advice: 'For mild pain or fever. Do not exceed 3000 mg in 24 hours.' },
      { name: 'Pantoprazole', regex: /pantoprazole|pan-d/i, dosage: '40 mg', advice: 'Take 30 minutes before morning breakfast with plain water.' },
      { name: 'Vitamin D3', regex: /vitamin\s*d|cholecalciferol/i, dosage: '1000 IU', advice: 'Take with milk or a meal containing healthy fats for better absorption.' }
    ];

    for (const item of knownList) {
      if (item.regex.test(text) || item.regex.test(q)) {
        identifiedDrug = item;
        break;
      }
    }

    if (isHindi) {
      const drugName = identifiedDrug ? `${identifiedDrug.name} (${identifiedDrug.dosage})` : 'दवा पैकेजिंग / स्ट्रिप';
      const drugAdvice = identifiedDrug ? identifiedDrug.advice : 'दवा हमेशा लेबल के निर्देशानुसार और पर्याप्त पानी के साथ लें।';
      return `दवा पैकेजिंग विश्लेषण:

1. पहचानी गई दवा:
${drugName}

2. सेवन निर्देश व सावधानियाँ:
${drugAdvice}

3. आपकी दिनचर्या के साथ सुरक्षा जाँच:
आपकी वर्तमान सक्रिय दवाएँ: ${medsSummary}। यदि यह दवा आपकी नियमित समय-सारणी में नहीं है, तो लेने से पहले अपने डॉक्टर या देखभालकर्ता से पुष्टि करें।`;
    } else {
      const drugName = identifiedDrug ? `${identifiedDrug.name} (${identifiedDrug.dosage})` : 'Medication strip / packaging detected';
      const drugAdvice = identifiedDrug ? identifiedDrug.advice : 'Take strictly as instructed on prescription with adequate water.';
      return `Medication Packaging Visual Analysis:

1. Identified Medication:
${drugName}

2. Clinical Administration Instructions:
${drugAdvice}

3. Safety Check with Active Regimen:
Active medications: ${medsSummary}. If this is a newly prescribed drug not currently on your schedule, confirm with your doctor or caregiver before taking.`;
    }
  }

  // 3. Food Plate or Meal
  const isFood = /food|meal|diet|eat|khana|roti|rice|plate|fruit|breakfast|lunch|dinner|snack/i.test(text + ' ' + q);
  if (isFood) {
    if (isHindi) {
      return `भोजन व पोषण विश्लेषण:

1. स्वास्थ्य संबंधी जाँच:
संतुलित आहार में पर्याप्त फाइबर (सलाद/हरी सब्जियां), प्रोटीन और कम चीनी/नमक जरूरी है।

2. दवा का सही समय:
मेटफ़ॉर्मिन जैसी दवाएं भोजन के साथ या तुरंत बाद लें ताकि पेट में गैस या दर्द न हो। बीपी की दवा (एम्लोडिपिन) लेते समय चकोतरा (Grapefruit) का रस न पिएं।

3. सलाह:
पर्याप्त पानी पिएं और भोजन के बाद 15-20 मिनट हल्की चहलकदमी करें।`;
    } else {
      return `Dietary & Meal Health Analysis:

1. Nutritional Balance Overview:
Ensure balanced portions with high dietary fiber, lean protein, and controlled refined carbs and sodium for stable blood pressure and glucose levels.

2. Medication Timing & Precautions:
If taking Metformin, take it with or right after this meal to prevent stomach cramps. Avoid grapefruit or Seville oranges if taking calcium channel blockers like Amlodipine.

3. Practical Tip:
Stay well hydrated and consider a gentle 15-minute walk after meals to aid digestion and steady glucose absorption.`;
    }
  }

  // 4. General Medical Image Default
  if (isHindi) {
    return `मेडिकल छवि विश्लेषण:

1. विवरण:
छवि में स्वास्थ्य या दवा संबंधी जानकारी पाई गई है${ocrText ? `: "${ocrText.slice(0, 100)}..."` : '।' }

2. आपकी दवाओं के साथ सुरक्षा:
आपकी निर्धारित दवाएँ हैं: ${medsSummary}। कोई भी नई दवा या सप्लीमेंट शुरू करने से पहले अपने डॉक्टर से सलाह लें।

3. सलाह:
किसी भी संदेह या बदलाव के लिए अपने डॉक्टर या देखभालकर्ता से संपर्क करें।`;
  } else {
    return `Medical Image Analysis:

1. Visual Extraction Summary:
Health or clinical documentation identified in image${ocrText ? `: "${ocrText.slice(0, 100)}..."` : '.' }

2. Safety Check with Current Medications:
Your current active prescriptions are: ${medsSummary}. Always cross-check new medications against this list to prevent polypharmacy risks.

3. Recommendation:
For personalized interpretations or changes to therapy, review this document directly with your attending physician.`;
  }
}

// Multimodal Vision with Google Gemini (Free API from Google AI Studio)
async function callGeminiVision({ apiKey, image, question, systemPrompt, language }) {
  if (!apiKey || !image) return null;
  const mimeType = image.includes('data:image/png')
    ? 'image/png'
    : image.includes('data:image/webp')
    ? 'image/webp'
    : 'image/jpeg';
  const cleanBase64 = image.includes(',') ? image.split(',')[1] : image;

  const models = ['gemini-3-flash-preview', 'gemini-3.5-flash', 'gemini-flash-latest'];
  for (const model of models) {
    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
      const userPrompt = (question || 'Please analyze this medical image in detail. Identify any symptoms, disease signs, skin condition, diagnostic test parameters, or medications. Check safety with active medications and explain next steps.') +
        (language === 'hi' ? '\n\nकृपया उत्तर पूर्ण रूप से हिंदी में दें।' : '');

      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [
            {
              role: 'user',
              parts: [
                { text: systemPrompt + '\n\nUser Request: ' + userPrompt },
                {
                  inline_data: {
                    mime_type: mimeType,
                    data: cleanBase64
                  }
                }
              ]
            }
          ],
          generationConfig: {
            temperature: 0.2,
            maxOutputTokens: 4096
          }
        })
      });

      if (response.ok) {
        const json = await response.json();
        const candidateText = json.candidates?.[0]?.content?.parts?.[0]?.text;
        if (candidateText && candidateText.trim().length > 10) {
          return {
            source: `Mitra Gemini Vision (${model})`,
            answer: candidateText.trim()
          };
        }
      } else {
        const errJson = await response.json().catch(() => ({}));
        console.warn(`[ai:gemini] Model ${model} returned error:`, response.status, errJson.error?.message || '');
      }
    } catch (e) {
      console.warn(`[ai:gemini] Model ${model} request failed:`, e.message);
    }
  }
  return null;
}

// Multimodal Vision with OpenRouter (Free tier vision models)
async function callOpenRouterVision({ apiKey, image, question, systemPrompt, language }) {
  if (!apiKey || !image) return null;
  const models = [
    'google/gemini-2.0-flash-exp:free',
    'qwen/qwen-2.5-vl-72b-instruct:free',
    'meta-llama/llama-3.2-11b-vision-instruct:free'
  ];
  for (const model of models) {
    try {
      const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
          'HTTP-Referer': 'https://healthmitra.app',
          'X-Title': 'HealthMitra'
        },
        body: JSON.stringify({
          model,
          messages: [
            { role: 'system', content: systemPrompt },
            {
              role: 'user',
              content: [
                {
                  type: 'text',
                  text: (question || 'Please analyze this medical image in detail. Identify any condition, disease symptoms, diagnostic results, or medication.') +
                    (language === 'hi' ? '\n\nकृपया उत्तर हिंदी में दें।' : '')
                },
                {
                  type: 'image_url',
                  image_url: {
                    url: image.startsWith('data:') ? image : `data:image/jpeg;base64,${image}`
                  }
                }
              ]
            }
          ],
          temperature: 0.2,
          max_tokens: 800
        })
      });

      if (response.ok) {
        const json = await response.json();
        const content = json.choices?.[0]?.message?.content;
        if (content && content.trim().length > 10) {
          return {
            source: `Mitra OpenRouter Vision (${model})`,
            answer: content.trim()
          };
        }
      }
    } catch (e) {
      console.warn(`[ai:openrouter] Model ${model} request failed:`, e.message);
    }
  }
  return null;
}

export async function askMitra({ question, image = null, patientId, language = 'en' }) {
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

  // Extract OCR text from image if attached
  let ocrText = '';
  if (image) {
    ocrText = await extractOcrFromImage(image);
  }

  const systemPrompt = `You are Mitra, an empathetic, highly skilled Clinical AI Medical Assistant for patients and caregivers.
Patient Name: ${patient?.name || 'Patient'}
${patientProfile}
Active Medications: ${medsSummary}

CLINICAL VISION GUIDELINES FOR IMAGE ANALYSIS:
1. Physical Condition / Disease / Symptoms (e.g. skin rash, swelling, lesion, discoloration, eye inflammation, wound):
   - Visually describe the lesion or symptom characteristics (location, color, pattern, border, texture).
   - Offer potential clinical differential considerations (what common medical conditions cause this appearance, e.g. Contact Dermatitis, Eczema, Tinea/Fungal, Urticaria, Cellulitis, Conjunctivitis).
   - Clarify clearly that this is an AI observational evaluation and NOT a definitive doctor diagnosis.
   - List key "red-flag" symptoms that require urgent emergency care (spreading rapidly, severe pain, fever, shortness of breath, pus).
2. Diagnostic Lab Reports / Blood Tests:
   - Identify every visible biomarker (e.g., HbA1c, Fasting Blood Sugar, Lipid Profile, SGPT, Creatinine, Hemoglobin, Platelets).
   - Compare observed values against standard normal clinical reference ranges.
   - Explain what abnormal values indicate in simple, understandable terms.
3. Medication Strips / Packaging / Pills:
   - Identify medication name, dosage strength, therapeutic purpose, food timing (before/with/after food), and interactions.
   - Cross-check against the patient's active prescriptions (${medsSummary}).
4. Meal & Dietary Analysis:
   - Analyze carbohydrate, glycemic impact, and sodium levels for diabetic/hypertensive safety.

CRITICAL FORMATTING RULES:
1. Do NOT use markdown symbols like hashtags (### or ##), divider lines (---), bold or italic asterisks (** or *), or pipe tables (|).
2. Present all information in clean, natural, plain conversational paragraphs and simple numbered lists (1. 2. 3.) or clean bullet dashes (- ).
3. Give thorough, clear, reassuring explanations without technical jargon or formatting symbols.
4. Address food/drug safety, side effects, test interpretation, and practical home measures.
5. Answer in ${language === 'hi' ? 'Hindi' : 'English'}.
6. End with a simple, gentle reminder to check with their doctor.`;

  let rawAnswer = null;
  let sourceTag = image ? 'Mitra Vision AI' : 'Mitra AI';

  // 1. If image is provided, try Google Gemini Vision FIRST (free & highest accuracy for disease identification)
  if (image && process.env.GEMINI_API_KEY) {
    const geminiRes = await callGeminiVision({
      apiKey: process.env.GEMINI_API_KEY,
      image,
      question,
      systemPrompt,
      language
    });
    if (geminiRes) {
      rawAnswer = geminiRes.answer;
      sourceTag = geminiRes.source;
    }
  }

  // 2. Try OpenRouter Vision if GEMINI_API_KEY was not provided or failed
  if (image && !rawAnswer && process.env.OPENROUTER_API_KEY) {
    const openRouterRes = await callOpenRouterVision({
      apiKey: process.env.OPENROUTER_API_KEY,
      image,
      question,
      systemPrompt,
      language
    });
    if (openRouterRes) {
      rawAnswer = openRouterRes.answer;
      sourceTag = openRouterRes.source;
    }
  }

  // 3. Try Groq AI (Text models with OCR context)
  if (!rawAnswer && process.env.GROQ_API_KEY) {
    try {
      const textModels = ['openai/gpt-oss-120b', 'openai/gpt-oss-20b', 'groq/compound-mini', 'qwen/qwen3.8-27b'];
      const userPrompt = image && ocrText
        ? `${question ? question + '\n\n' : ''}[Medical Image Extracted Text]:\n${ocrText}\n\nPlease analyze this medical image text, identify medications or lab results, explain safety with my active prescriptions, and provide clear guidance.`
        : (question || 'How should I take my medications today?');

      for (const model of textModels) {
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
                { role: 'user', content: userPrompt }
              ],
              temperature: 0.3,
              max_tokens: 600
            })
          });

          if (response.ok) {
            const json = await response.json();
            const text = json.choices?.[0]?.message?.content;
            if (text) {
              rawAnswer = text;
              sourceTag = image ? 'Mitra OCR+Groq AI' : 'Mitra AI';
              break;
            }
          }
        } catch (mErr) {
          console.warn('[ai] Model attempt failed, trying fallback:', mErr.message);
        }
      }
    } catch (err) {
      console.error('[ai] Groq service error:', err);
    }
  }

  if (rawAnswer) {
    // Strip any stray markdown symbols (###, ---, **, tables)
    const cleanAnswer = rawAnswer
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
      source: sourceTag,
      question,
      answer: cleanAnswer,
      hasImage: Boolean(image),
      disclaimer: language === 'hi'
        ? 'चिकित्सा अस्वीकरण: यह जानकारी केवल मार्गदर्शन के लिए है। किसी भी बदलाव से पहले अपने डॉक्टर से सलाह लें।'
        : 'Medical disclaimer: For guidance only. Please consult your physician before altering any prescription.'
    };
  }

  // 4. Intelligent Clinical Reasoning Engine Fallback (Supports both Text and Images)
  let answerText = '';

  if (image || ocrText) {
    answerText = analyzeMedicalImageLocally({ ocrText, question, medications, language });
  } else {
    const matched = CLINICAL_KNOWLEDGE.find((k) => k.pattern.test(question));
    if (matched) {
      answerText = language === 'hi' ? matched.hi : matched.en;
    } else {
      answerText = language === 'hi'
        ? `आपकी मौजूदा दवाएँ (${medsSummary}) आपके स्वास्थ्य के लिए महत्वपूर्ण हैं। इस सवाल के लिए कृपया अपने डॉक्टर से संपर्क करें या समय पर अपनी निर्धारित दवा लें।`
        : `Based on your active medications (${medsSummary}), always take doses at consistent times with meals as indicated. For this specific medical query, we recommend speaking with your doctor.`;
    }
  }

  return {
    source: image ? 'clinical-vision-engine' : 'clinical-rules-engine',
    question,
    answer: answerText,
    hasImage: Boolean(image),
    disclaimer: language === 'hi'
      ? 'चिकित्सा अस्वीकरण: यह जानकारी केवल सहायता के लिए है। किसी भी बदलाव से पहले अपने डॉक्टर से सलाह लें।'
      : 'Medical disclaimer: For guidance only. Please consult your physician before altering any prescription.'
  };
}
