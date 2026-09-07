import React from 'react';
import { useTranslation } from 'react-i18next';

// Overlay + close button + brand eyebrow. Renders a <form> when onSubmit is
// given so every dialog gets identical keyboard/escape behaviour.
export function ModalShell({ title, eyebrow = 'HEALTHMITRA', onClose, onSubmit, className = '', children }) {
  const { t } = useTranslation();
  const close = <button type="button" className="close" onClick={onClose} aria-label={t('close')}>×</button>;
  const body = <>{close}{eyebrow && <p className="eyebrow">{eyebrow}</p>}{title && <h2>{title}</h2>}{children}</>;
  return <div className="overlay">
    {onSubmit ? <form className={`modal ${className}`.trim()} onSubmit={onSubmit}>{body}</form> : <div className={`modal ${className}`.trim()}>{body}</div>}
  </div>;
}
