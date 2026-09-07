export const navigationFor = (role, t) => (role === 'patient'
  ? [
    { id: 'today', icon: '◷', label: t('today') },
    { id: 'medications', icon: '▣', label: t('medications') },
    { id: 'symptoms', icon: '♡', label: t('symptoms') },
    { id: 'contacts', icon: '☎', label: t('contacts') }
  ]
  : [
    { id: 'dashboard', icon: '▦', label: t('dashboard') },
    { id: 'history', icon: '◷', label: t('history') },
    { id: 'medications', icon: '▣', label: t('medications') },
    { id: 'alerts', icon: '●', label: t('alerts') },
    { id: 'contacts', icon: '☎', label: t('contacts') }
  ]);

export const defaultTabFor = (role) => (role === 'caregiver' ? 'dashboard' : 'today');
