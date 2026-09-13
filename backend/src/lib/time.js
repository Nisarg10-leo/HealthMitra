import { config } from '../config.js';

export function localDateKey(value = new Date(), offsetDays = 0) {
  const date = new Date(value);
  date.setDate(date.getDate() + offsetDays);
  return new Intl.DateTimeFormat('en-CA', { timeZone: config.timezone }).format(date);
}

export const today = () => localDateKey();
export const isoAt = (time, date = today()) => `${date}T${time}:00`;
export const nowIso = () => new Date().toISOString();
export const isValidClockTime = (time) => /^([01]\d|2[0-3]):[0-5]\d$/.test(time);
