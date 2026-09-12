export const navigationFor = (role, t) => (role === 'patient'
  ? [
    { id: 'today', icon: '◷', label: t('today') },
    { id: 'medications', icon: '▣', label: t('medications') },
    { id: 'symptoms', icon: '♡', label: t('symptoms') },
    { id: 'contacts', icon: '☎', label: t('contacts') },
    { id: 'profile', icon: '👤', label: t('profile') || 'Profile' }
  ]
  : [
    { id: 'dashboard', icon: '▦', label: t('dashboard') },
    { id: 'history', icon: '◷', label: t('history') },
    { id: 'medications', icon: '▣', label: t('medications') },
    { id: 'alerts', icon: '●', label: t('alerts') },
    { id: 'contacts', icon: '☎', label: t('contacts') },
    { id: 'profile', icon: '👤', label: t('profile') || 'Profile' }
  ]);

export const defaultTabFor = (role) => (role === 'caregiver' ? 'dashboard' : 'today');
