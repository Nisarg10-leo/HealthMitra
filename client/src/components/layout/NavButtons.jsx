import React from 'react';

export function NavButtons({ items, activeTab, onSelect, unreadAlerts }) {
  return items.map(({ id, icon, label }) => <button key={id} className={activeTab === id ? 'selected' : ''} onClick={() => onSelect(id)}>
    <span aria-hidden="true">{icon}</span>{label}{id === 'alerts' && unreadAlerts > 0 && <i aria-label={`${unreadAlerts} unread`} />}
  </button>);
}
