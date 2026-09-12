export const navigationFor = (role, t) => (role === 'patient'
  ? [
    { id: 'today', iconKey: 'calendar', label: t('today') },
    { id: 'medications', iconKey: 'pill', label: t('medications') },
    { id: 'symptoms', iconKey: 'heart', label: t('symptoms') },
    { id: 'contacts', iconKey: 'phone', label: t('contacts') },
    { id: 'profile', iconKey: 'user', label: t('profile') || 'Profile' }
  ]
  : [
    { id: 'dashboard', iconKey: 'activity', label: t('dashboard') },
    { id: 'history', iconKey: 'clock', label: t('history') },
    { id: 'medications', iconKey: 'pill', label: t('medications') },
    { id: 'alerts', iconKey: 'bell', label: t('alerts') },
    { id: 'contacts', iconKey: 'phone', label: t('contacts') },
    { id: 'profile', iconKey: 'user', label: t('profile') || 'Profile' }
  ]);

export const defaultTabFor = (role) => (role === 'caregiver' ? 'dashboard' : 'today');
