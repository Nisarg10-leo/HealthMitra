import { config } from '../config.js';

// Keyword intent matcher in English and Hindi. This is the integration seam
// for Groq Whisper: a transcription step can be added before `detectIntent`
// without changing the endpoint contract.
// `\b` is ASCII-only in JavaScript, so Devanagari keywords need explicit
// Unicode letter boundaries.
const keyword = (words) => new RegExp(`(?<!\\p{L})(?:${words.join('|')})(?!\\p{L})`, 'u');
const PATTERNS = [
  ['taken', keyword(['yes', 'taken', 'took', 'done', 'हाँ', 'हां', 'ले ली', 'ली'])],
  ['skipped', keyword(['no', 'skip', 'skipped', 'not yet', 'नहीं', 'छोड़'])],
  ['sos', keyword(['sos', 'help', 'मदद', 'बचाओ'])]
];

export function detectIntent(rawTranscript) {
  const transcript = String(rawTranscript || '').trim();
  const text = transcript.toLowerCase();
  const match = PATTERNS.find(([, pattern]) => pattern.test(text));
  return { transcript, intent: match ? match[0] : 'unknown', provider: config.voiceProvider };
}
