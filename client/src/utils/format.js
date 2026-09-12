const locale = (language) => (language === 'hi' ? 'hi-IN' : 'en-IN');

export const dateKey = (value = new Date()) => {
  try {
    return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' }).format(new Date(value));
  } catch {
    return new Intl.DateTimeFormat('en-CA').format(new Date(value));
  }
};
export const formatTime = (value, language = 'en') => {
  if (!value) return '';
  return new Intl.DateTimeFormat(locale(language), { hour: 'numeric', minute: '2-digit' }).format(new Date(value));
};
export const formatDate = (value, language = 'en') => {
  if (!value) return '';
  return new Intl.DateTimeFormat(locale(language), { day: 'numeric', month: 'short' }).format(new Date(value));
};
export const formatDateTime = (value, language = 'en') => {
  if (!value) return '';
  return new Intl.DateTimeFormat(locale(language), { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' }).format(new Date(value));
};
export const formatWeekday = (value, language = 'en') => {
  if (!value) return '';
  return new Intl.DateTimeFormat(locale(language), { weekday: 'short' }).format(new Date(value));
};
export const formatLongDate = (value, language = 'en') => {
  if (!value) return '';
  return new Intl.DateTimeFormat(locale(language), { weekday: 'long', day: 'numeric', month: 'long' }).format(new Date(value));
};
export const formatClock = (hhmm, language = 'en') => formatTime(`2020-01-01T${hhmm}:00`, language);
export const isToday = (isoValue) => {
  if (!isoValue || typeof isoValue !== 'string') return false;
  const targetDate = isoValue.slice(0, 10);
  const localToday = new Intl.DateTimeFormat('en-CA').format(new Date());
  const serverToday = dateKey();
  return targetDate === localToday || targetDate === serverToday;
};
