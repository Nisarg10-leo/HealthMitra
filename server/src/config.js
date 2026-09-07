import 'dotenv/config';

const csv = (value) => (value || '').split(',').map((item) => item.trim()).filter(Boolean);

export const config = Object.freeze({
  port: Number(process.env.PORT || 4000),
  timezone: process.env.APP_TIMEZONE || 'Asia/Kolkata',
  reminderWindowMinutes: Number(process.env.REMINDER_WINDOW_MINUTES || 15),
  allowedOrigins: csv(process.env.CLIENT_ORIGIN),
  voiceProvider: process.env.GROQ_API_KEY ? 'groq-whisper-ready' : 'browser-speech-fallback',
  databaseUrl: process.env.DATABASE_URL || null
});
