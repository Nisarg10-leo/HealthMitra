import React from 'react';
import {
  ActivityIcon,
  BellIcon,
  CalendarIcon,
  ClockIcon,
  GridIcon,
  HeartIcon,
  PhoneIcon,
  PillIcon,
  UserIcon
} from '../ui/Icons.jsx';

const ICONS = {
  calendar: CalendarIcon,
  pill: PillIcon,
  heart: HeartIcon,
  phone: PhoneIcon,
  user: UserIcon,
  activity: ActivityIcon,
  clock: ClockIcon,
  bell: BellIcon,
  grid: GridIcon
};

export function NavButtons({ items, activeTab, onSelect, unreadAlerts }) {
  return items.map(({ id, iconKey, label }) => {
    const IconComponent = (iconKey && ICONS[iconKey]) || GridIcon;
    const isSelected = activeTab === id;

    return (
      <button
        key={id}
        type="button"
        className={isSelected ? 'selected' : ''}
        onClick={() => onSelect(id)}
      >
        <span className="nav-icon-wrap" aria-hidden="true">
          <IconComponent size={17} strokeWidth={isSelected ? 2 : 1.75} />
        </span>
        <span className="nav-label">{label}</span>
        {id === 'alerts' && unreadAlerts > 0 && (
          <span className="nav-badge" aria-label={`${unreadAlerts} unread`}>
            {unreadAlerts}
          </span>
        )}
      </button>
    );
  });
}
