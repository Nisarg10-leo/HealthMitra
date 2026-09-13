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

      extractedText = await Promise.race([
        (async () => {
          let worker = null;
          try {
            worker = await createWorker('eng', 1, {
              errorHandler: (err) => console.warn('[vision] OCR worker warning:', err?.message || err)
            });
            const ret = await worker.recognize(buffer);
            const text = ret?.data?.text || '';
            await worker.terminate();
            return text;
          } catch (wErr) {
            if (worker) {
              try { await worker.terminate(); } catch (_) {}
            }
            throw wErr;
          }
        })(),
        new Promise((resolve) => setTimeout(() => resolve(''), 3000))
      ]);
    } catch (ocrErr) {
      console.warn('[vision] Tesseract OCR failed:', ocrErr.message);
    }
  }

  // 1.5. If GEMINI_API_KEY is available, use Gemini's direct visual understanding (superior for handwritten prescriptions)
  if (process.env.GEMINI_API_KEY && base64Image) {
    try {
      const mimeType = base64Image.includes('data:image/png')
        ? 'image/png'
        : base64Image.includes('data:image/webp')
        ? 'image/webp'
        : 'image/jpeg';
      const cleanBase64 = base64Image.includes(',') ? base64Image.split(',')[1] : base64Image;

      const prompt = `You are an expert clinical pharmacist and prescription recognition AI.
Examine this medical prescription image and extract all prescribed medicines, dosages, frequencies, consumption instructions, and doctor name.
Return ONLY valid JSON matching this schema:
{
  "medicines": [
    {
      "name": "Exact medicine name (e.g. Metformin 500mg)",
      "dosage": "Dosage string (e.g. 500 mg, 1 tablet)",
      "frequencyPerDay": 2,
      "times": ["08:00", "20:00"],
      "instructions": "Dietary/consumption instructions (e.g. Take after meals)"
    }
  ],
  "doctorName": "Doctor name or clinic name if detected, otherwise empty",
  "dietaryAdvice": "Any dietary or lifestyle advice found, otherwise empty"
}`;

      for (const model of ['gemini-3-flash-preview', 'gemini-3.5-flash', 'gemini-flash-latest']) {
        try {
          const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${process.env.GEMINI_API_KEY}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              contents: [
                {
                  parts: [
                    { text: prompt },
                    { inline_data: { mime_type: mimeType, data: cleanBase64 } }
                  ]
                }
              ],
              generationConfig: {
                temperature: 0.1,
                response_mime_type: 'application/json'
              }
            })
          });

          if (res.ok) {
            const data = await res.json();
            let text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
            text = text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim();
            const parsed = JSON.parse(text);
            if (parsed && Array.isArray(parsed.medicines) && parsed.medicines.length > 0) {
              return {
                ...parsed,
                raw: extractedText || 'Extracted via Clinical Vision AI',
                source: 'Mitra Vision AI'
              };
            }
          }
        } catch (gErr) {
          console.warn(`[vision] Gemini ${model} failed:`, gErr.message);
        }
      }
    } catch (err) {
      console.warn('[vision] Gemini vision parsing error:', err.message);
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
              source: 'Mitra Clinical AI'
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
