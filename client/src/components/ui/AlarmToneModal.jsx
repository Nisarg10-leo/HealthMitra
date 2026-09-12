import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ALARM_TONES,
  getSelectedAlarmTone,
  previewAlarmTone,
  setSelectedAlarmTone,
  stopAlarm
} from '../../utils/audio.js';
import { profileApi } from '../../api/index.js';
import { BellIcon, CheckIcon, Volume2Icon } from './Icons.jsx';
import { useWorkspace } from '../../workspace/WorkspaceContext.jsx';

export function AlarmToneModal({ onClose }) {
  const { i18n } = useTranslation();
  const { notify, triggerAlarm, dashboard } = useWorkspace();
  const [selectedTone, setSelectedTone] = useState(() => getSelectedAlarmTone());
  const [previewingTone, setPreviewingTone] = useState(null);

  useEffect(() => {
    return () => {
      stopAlarm();
    };
  }, []);

  const handlePreview = (toneId) => {
    if (previewingTone === toneId) {
      stopAlarm();
      setPreviewingTone(null);
      return;
    }

    setPreviewingTone(toneId);
    previewAlarmTone(toneId);

    setTimeout(() => {
      setPreviewingTone((curr) => (curr === toneId ? null : curr));
    }, 2200);
  };

  const handleSelect = async (toneId) => {
    setSelectedTone(toneId);
    setSelectedAlarmTone(toneId);

    try {
      await profileApi.update({ alarmTone: toneId });
    } catch {
      // Offline / non-blocking fallback
    }

    const toneObj = ALARM_TONES.find((t) => t.id === toneId);
    const name = i18n.language === 'hi' ? toneObj?.nameHi : toneObj?.name;
    notify(i18n.language === 'hi' ? `अलार्म ध्वनि "${name}" पर सेट की गई।` : `Alarm tone set to "${name}".`);
  };

  const handleTestFullAlarm = () => {
    stopAlarm();
    if (onClose) onClose();

    const testDose = {
      id: 'test-alarm-id',
      scheduledTime: new Date().toISOString(),
      status: 'pending',
      medicationId: dashboard?.medications?.[0]?.id || 'demo-med'
    };

    if (triggerAlarm) {
      triggerAlarm(testDose);
    }
  };

  const isHindi = i18n.language === 'hi';

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="overlay z-modal-top"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          stopAlarm();
          if (onClose) onClose();
        }
      }}
    >
      <div className="alarm-tone-modal-card">
        {/* Header */}
        <div className="alarm-tone-header">
          <div className="alarm-tone-header-left">
            <span className="alarm-tone-icon-badge">
              <BellIcon size={20} />
            </span>
            <div>
              <h2 className="alarm-tone-title font-display">
                {isHindi ? 'दवा अलार्म ध्वनि चुनें' : 'Choose Medication Alarm Sound'}
              </h2>
              <p className="alarm-tone-subtitle">
                {isHindi
                  ? 'अपनी पसंद की अलार्म धुन चुनें और सुनें। आप इसे कभी भी बदल सकते हैं।'
                  : 'Select your preferred alarm tone when medicine is due. You can change this anytime.'}
              </p>
            </div>
          </div>

          <button
            type="button"
            className="alarm-tone-close-btn"
            onClick={() => {
              stopAlarm();
              if (onClose) onClose();
            }}
            aria-label="Close"
          >
            ×
          </button>
        </div>

        {/* List of Tones */}
        <div className="alarm-tone-list">
          {ALARM_TONES.map((tone) => {
            const isSelected = selectedTone === tone.id;
            const isPlaying = previewingTone === tone.id;

            return (
              <div
                key={tone.id}
                className={`alarm-tone-item ${isSelected ? 'tone-item-selected' : ''}`}
                onClick={() => handleSelect(tone.id)}
              >
                <div className="tone-item-left">
                  <span className="tone-emoji-avatar">{tone.icon}</span>

                  <div className="tone-item-info">
                    <div className="tone-title-row">
                      <span className="tone-name font-sans">
                        {isHindi ? tone.nameHi : tone.name}
                      </span>
                      <span className={`tone-category-chip font-mono tone-cat-${tone.category}`}>
                        {isHindi ? tone.badgeHi : tone.badge}
                      </span>
                    </div>

                    <p className="tone-description">
                      {isHindi ? tone.descHi : tone.desc}
                    </p>
                  </div>
                </div>

                <div className="tone-item-actions" onClick={(e) => e.stopPropagation()}>
                  <button
                    type="button"
                    className={`tone-preview-btn ${isPlaying ? 'preview-playing' : ''}`}
                    onClick={() => handlePreview(tone.id)}
                    title={isPlaying ? 'Stop audio' : 'Preview tone sound'}
                  >
                    <Volume2Icon size={14} />
                    <span>{isPlaying ? (isHindi ? 'सुन रहे हैं...' : 'Playing...') : (isHindi ? 'सुनें' : 'Preview')}</span>
                  </button>

                  <button
                    type="button"
                    className={`tone-select-radio ${isSelected ? 'radio-selected' : ''}`}
                    onClick={() => handleSelect(tone.id)}
                  >
                    {isSelected ? (
                      <>
                        <CheckIcon size={13} />
                        <span>{isHindi ? 'सक्रिय' : 'Active'}</span>
                      </>
                    ) : (
                      <span>{isHindi ? 'चुनें' : 'Select'}</span>
                    )}
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer Actions */}
        <div className="alarm-tone-footer">
          <button
            type="button"
            className="btn-glass btn-sm"
            onClick={handleTestFullAlarm}
          >
            <BellIcon size={14} />
            <span>{isHindi ? 'पूर्ण अलार्म का परीक्षण करें' : 'Test Full Alarm Screen'}</span>
          </button>

          <button
            type="button"
            className="btn-cyber btn-sm"
            onClick={() => {
              stopAlarm();
              if (onClose) onClose();
            }}
          >
            <CheckIcon size={14} />
            <span>{isHindi ? 'हो गया' : 'Done'}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
