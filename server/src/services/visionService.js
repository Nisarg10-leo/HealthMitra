import { createWorker } from 'tesseract.js';

// Common medicine names for regex fallback if LLM is unreachable
const KNOWN_DRUGS = [
  'metformin', 'amlodipine', 'atorvastatin', 'paracetamol', 'crocin', 'dolo',
  'pantoprazole', 'omeprazole', 'aspirin', 'losartan', 'lisinopril', 'azithromycin',
  'telmisartan', 'glycomet', 'pan-d', 'rosuvastatin', 'clopidogrel', 'ciprofloxacin',
  'amoxicillin', 'augmentin', 'montelukast', 'levocetirizine', 'vitamin d3', 'shelcal'
];

export async function scanPrescriptionImage(base64Image, optionalText = '') {
  let extractedText = optionalText || '';

  // 1. Run OCR if image provided
  if (base64Image) {
    try {
      const cleanBase64 = base64Image.includes(',') ? base64Image.split(',')[1] : base64Image;
      const buffer = Buffer.from(cleanBase64, 'base64');

      const worker = await createWorker('eng');
      const ret = await worker.recognize(buffer);
      extractedText = ret.data.text || '';
      await worker.terminate();
    } catch (ocrErr) {
      console.warn('[vision] Tesseract OCR failed:', ocrErr.message);
    }
  }

  // 2. If we have extracted text and GROQ_API_KEY, use Groq LLM for clinical extraction
  if (process.env.GROQ_API_KEY && extractedText && extractedText.trim().length > 5) {
    const prompt = `You are an expert clinical pharmacist and prescription OCR parsing AI.
Analyze this prescription / medical receipt text and extract all prescribed medicines.

Prescription text:
"""
${extractedText}
"""

Return ONLY a valid JSON object matching this exact schema, with NO markdown backticks or commentary:
{
  "medicines": [
    {
      "name": "Exact medicine name (e.g., Metformin 500mg)",
      "dosage": "Dosage string (e.g., 500 mg, 1 tablet)",
      "frequencyPerDay": 2,
      "times": ["08:00", "20:00"],
      "instructions": "Dietary or consumption instructions (e.g., Take after meals)"
    }
  ],
  "doctorName": "Doctor name or clinic name if detected, otherwise empty",
  "dietaryAdvice": "Any dietary, lifestyle, or precaution advice found, otherwise empty"
}`;

    const modelsToTry = ['openai/gpt-oss-120b', 'qwen/qwen3.8-27b'];

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
              { role: 'system', content: 'You are a clinical parser. You output strictly valid raw JSON only.' },
              { role: 'user', content: prompt }
            ],
            temperature: 0.1
          })
        });

        if (response.ok) {
          const json = await response.json();
          let content = json.choices?.[0]?.message?.content || '';
          // Clean possible markdown code fence
          content = content.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim();

          const parsed = JSON.parse(content);
          if (parsed && Array.isArray(parsed.medicines)) {
            return {
              ...parsed,
              raw: extractedText,
              source: `groq-${model}+tesseract-ocr`
            };
          }
        }
      } catch (llmErr) {
        console.warn(`[vision] LLM ${model} parsing failed:`, llmErr.message);
      }
    }
  }

  // 3. Fallback heuristic extraction if LLM unavailable or failed
  const fallbackMedicines = [];
  const lines = extractedText.split('\n');

  for (const line of lines) {
    const lower = line.toLowerCase();
    for (const drug of KNOWN_DRUGS) {
      if (lower.includes(drug)) {
        const doseMatch = line.match(/(\d+\s*(?:mg|mcg|iu|ml|g))/i);
        const nameCapitalized = drug.charAt(0).toUpperCase() + drug.slice(1);
        fallbackMedicines.push({
          name: nameCapitalized,
          dosage: doseMatch ? doseMatch[0] : 'Standard dose',
          frequencyPerDay: lower.includes('twice') || lower.includes('bd') || lower.includes('b.i.d') ? 2 : 1,
          times: lower.includes('twice') || lower.includes('bd') ? ['08:00', '20:00'] : ['08:00'],
          instructions: lower.includes('after') ? 'Take after meals' : 'Take with water'
        });
        break;
      }
    }
  }

  return {
    medicines: fallbackMedicines,
    doctorName: '',
    dietaryAdvice: '',
    raw: extractedText,
    source: fallbackMedicines.length > 0 ? 'heuristic-ocr-fallback' : 'no-medicines-detected'
  };
}
