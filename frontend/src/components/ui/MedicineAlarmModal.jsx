import React, { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ALARM_TONES,
  getSelectedAlarmTone,
  setSelectedAlarmTone,
  startAlarm,
  stopAlarm
} from '../../utils/audio.js';
import { formatTime } from '../../utils/format.js';
import { AlertTriangleIcon, BellIcon, CheckIcon, ClockIcon, ToneIcon, Volume2Icon, VolumeXIcon } from './Icons.jsx';

export function MedicineAlarmModal({ dose, medication, patientName, isCaregiver = false, onConfirm, onSnooze, onClose }) {
  const { t, i18n } = useTranslation();
  const [muted, setMuted] = useState(false);
  const [currentTone, setCurrentTone] = useState(() => getSelectedAlarmTone());
  const [showTonePicker, setShowTonePicker] = useState(false);
  const voiceTimeoutRef = useRef(null);

  // Spoken voice announcement with authoritative emergency cadence
  const announceAlarm = () => {
    if (!window.speechSynthesis || muted) return;
    const medName = medication?.name || t('medication');
    const dosage = medication?.dosage || '';
    const name = patientName || 'Friend';

    const text = i18n.language === 'hi'
      ? (isCaregiver
          ? `सावधान! ${name} जी की दवा का समय हो गया है। कृपया सुनिश्चित करें कि उन्होंने ${medName} ${dosage} ले ली है।`
          : `सावधान! ${name} जी, दवा का आवश्यक समय हो गया है। तुरंत ${medName} ${dosage} लें!`)
      : (isCaregiver
          ? `URGENT CAREGIVER ALARM! Attention, scheduled dose for ${name} is due now: ${medName} ${dosage}!`
          : `URGENT MEDICATION ALARM! Attention ${name}, please take your scheduled dose of ${medName} ${dosage} immediately!`);

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = i18n.language === 'hi' ? 'hi-IN' : 'en-IN';
    utterance.rate = 1.05;
    utterance.pitch = 1.1;
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(utterance);
  };

  useEffect(() => {
    // Start continuous synthesized alarm loop with the selected tone
    if (!muted) {
      startAlarm(currentTone);
    }
    voiceTimeoutRef.current = setTimeout(announceAlarm, 800);

    return () => {
      stopAlarm();
      if (voiceTimeoutRef.current) clearTimeout(voiceTimeoutRef.current);
      if (window.speechSynthesis) window.speechSynthesis.cancel();
    };
  }, [dose?.id, medication?.name, i18n.language, currentTone, muted]);

  const toggleMute = () => {
    if (muted) {
      setMuted(false);
      startAlarm(currentTone);
    } else {
      setMuted(true);
      stopAlarm();
      if (window.speechSynthesis) window.speechSynthesis.cancel();
    }
  };

  const currentToneObj = ALARM_TONES.find((t) => t.id === currentTone) || ALARM_TONES[0];

  const handleToneChange = (toneId) => {
    setCurrentTone(toneId);
    setSelectedAlarmTone(toneId);
    setShowTonePicker(false);
  };

  const handleTake = () => {
    stopAlarm();
    if (window.speechSynthesis) window.speechSynthesis.cancel();
    onConfirm(dose, 'taken');
  };

  const handleSnooze = () => {
    stopAlarm();
    if (window.speechSynthesis) window.speechSynthesis.cancel();
    onSnooze(dose);
  };

  const handleSkip = () => {
    stopAlarm();
    if (window.speechSynthesis) window.speechSynthesis.cancel();
    onConfirm(dose, 'skipped');
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="alarm-overlay-backdrop"
    >
      <div className="alarm-modal-container">
        {/* Pulsing Sonar Warning Rings */}
        <div className="alarm-bell-stage">
          <span className="alarm-sonar-ring ring-1" />
          <span className="alarm-sonar-ring ring-2" />
          <span className="alarm-sonar-ring ring-3" />
          <div className="alarm-bell-core">
            <BellIcon size={36} />
          </div>
        </div>

        {/* Urgency Badge & Silence Button */}
        <div className="alarm-badge-row">
          <span className="alarm-urgent-chip font-mono">
            <AlertTriangleIcon size={14} />
            <span>{isCaregiver ? `CAREGIVER ALARM • ${patientName ? patientName.toUpperCase() : 'PATIENT'}` : 'URGENT MEDICATION ALARM'}</span>
          </span>

          <button
            type="button"
            className="alarm-mute-btn font-mono"
            onClick={toggleMute}
            title={muted ? 'Unmute alarm' : 'Silence siren'}
          >
            {muted ? (
              <>
                <Volume2Icon size={13} />
                <span>{i18n.language === 'hi' ? 'ध्वनि चालू करें' : 'Unmute Alarm'}</span>
              </>
            ) : (
              <>
                <VolumeXIcon size={13} />
                <span>{i18n.language === 'hi' ? 'शांत करें' : 'Silence Siren'}</span>
              </>
            )}
          </button>
        </div>

        {/* Quick Alarm Tone Switcher */}
        <div className="alarm-tone-picker-box">
          <button
            type="button"
            className="alarm-tone-trigger-btn font-mono"
            onClick={() => setShowTonePicker((prev) => !prev)}
            title="Click to switch alarm sound"
          >
            <ToneIcon toneId={currentToneObj.id} size={14} />
            <span>{i18n.language === 'hi' ? 'धुन: ' + currentToneObj.nameHi : 'Tone: ' + currentToneObj.name}</span>
            <span className="tone-picker-caret">{showTonePicker ? '▲' : '▼'}</span>
          </button>

          {showTonePicker && (
            <div className="alarm-tone-popover">
              <div className="alarm-popover-title font-mono">
                {i18n.language === 'hi' ? 'अलार्म ध्वनि बदलें' : 'SWITCH ALARM SOUND'}
              </div>
              <div className="alarm-popover-items">
                {ALARM_TONES.map((t) => {
                  const isActive = currentTone === t.id;
                  return (
                    <button
                      key={t.id}
                      type="button"
                      className={`alarm-popover-item ${isActive ? 'popover-item-active' : ''}`}
                      onClick={() => handleToneChange(t.id)}
                    >
                      <span className="popover-item-icon">
                        <ToneIcon toneId={t.id} size={16} />
                      </span>
                      <div className="popover-item-text">
                        <span className="popover-item-name font-sans">
                          {i18n.language === 'hi' ? t.nameHi : t.name}
                        </span>
                        <span className="popover-item-badge font-mono">
                          {i18n.language === 'hi' ? t.badgeHi : t.badge}
                        </span>
                      </div>
                      {isActive && <CheckIcon size={13} className="popover-check" />}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Medicine Name & Dosage */}
        <h2 className="alarm-med-title font-display">
          {medication?.name || t('medication')}
        </h2>

        <div className="alarm-meta-row">
          <span className="alarm-dosage-chip font-mono">
            {medication?.dosage}
          </span>
          <span className="alarm-time-chip font-mono">
            <ClockIcon size={13} />
            <span>Scheduled: {formatTime(dose?.scheduledTime, i18n.language)}</span>
          </span>
        </div>

        {/* Dietary / Clinical Safety Notice */}
        {medication?.safety && (
          <div className="alarm-safety-card">
            <span className="alarm-safety-label font-mono">
              {t('dietaryAdvice')}:
            </span>
            <span className="alarm-safety-text">
              {medication.safety.instruction}
            </span>
          </div>
        )}

        {/* High-Impact Actions */}
        <div className="alarm-actions-stack">
          <button
            type="button"
            className="alarm-btn-confirm"
            onClick={handleTake}
          >
            <CheckIcon size={20} />
            <span>
              {isCaregiver
                ? (i18n.language === 'hi' ? `${patientName} की खुराक दर्ज करें (ले ली)` : `Record Dose as Taken for ${patientName}`)
                : `${t('taken')} — I Have Taken This Dose`}
            </span>
          </button>

          <div className="alarm-actions-secondary">
            <button
              type="button"
              className="alarm-btn-snooze"
              onClick={handleSnooze}
            >
              <ClockIcon size={15} />
              <span>Snooze for 5 mins</span>
            </button>

            <button
              type="button"
              className="alarm-btn-skip"
              onClick={handleSkip}
            >
              <span>
                {isCaregiver
                  ? (i18n.language === 'hi' ? 'खुराक छोड़ दी दर्ज करें' : 'Record as Skipped')
                  : t('skipped')}
              </span>
            </button>
          </div>
        </div>
      </div>

      <style>{`
        .alarm-overlay-backdrop {
          position: fixed !important;
          inset: 0 !important;
          background: rgba(18, 12, 10, 0.78) !important;
          backdrop-filter: blur(12px) !important;
          display: flex !important;
          align-items: center !important;
          justify-content: center !important;
          z-index: 10000 !important;
          padding: 20px !important;
          animation: alarmStrobe 1.5s ease-in-out infinite alternate !important;
        }

        @keyframes alarmStrobe {
          0% { background: rgba(18, 12, 10, 0.82); }
          100% { background: rgba(45, 16, 12, 0.88); }
        }

        .alarm-modal-container {
          background: var(--paper) !important;
          border: 2px solid var(--apricot) !important;
          border-radius: 28px !important;
          max-width: 480px !important;
          width: 100% !important;
          padding: 36px 32px 30px !important;
          text-align: center !important;
          position: relative !important;
          box-shadow: 0 0 60px rgba(217, 119, 70, 0.45), 0 20px 40px rgba(0, 0, 0, 0.25) !important;
          animation: modalRattle 0.6s cubic-bezier(0.36, 0.07, 0.19, 0.97) infinite !important;
        }

        @keyframes modalRattle {
          0%, 100% { transform: translate(0, 0); }
          20% { transform: translate(-2px, 1px); }
          40% { transform: translate(2px, -1px); }
          60% { transform: translate(-1px, -1px); }
          80% { transform: translate(1px, 2px); }
        }

        .alarm-bell-stage {
          position: relative !important;
          width: 90px !important;
          height: 90px !important;
          margin: 0 auto 16px !important;
          display: flex !important;
          align-items: center !important;
          justify-content: center !important;
        }

        .alarm-sonar-ring {
          position: absolute !important;
          border-radius: 50% !important;
          border: 2px solid var(--apricot) !important;
          pointer-events: none !important;
          animation: sonarRingPulse 1.8s cubic-bezier(0.215, 0.61, 0.355, 1) infinite !important;
        }

        .alarm-sonar-ring.ring-1 { width: 76px; height: 76px; animation-delay: 0s !important; }
        .alarm-sonar-ring.ring-2 { width: 76px; height: 76px; animation-delay: 0.6s !important; }
        .alarm-sonar-ring.ring-3 { width: 76px; height: 76px; animation-delay: 1.2s !important; }

        @keyframes sonarRingPulse {
          0% { transform: scale(0.9); opacity: 0.9; }
          100% { transform: scale(2.2); opacity: 0; }
        }

        .alarm-bell-core {
          position: relative !important;
          z-index: 2 !important;
          width: 76px !important;
          height: 76px !important;
          border-radius: 50% !important;
          background: rgba(217, 119, 70, 0.14) !important;
          border: 2px solid var(--apricot) !important;
          color: var(--apricot) !important;
          display: grid !important;
          place-items: center !important;
          box-shadow: 0 0 24px rgba(217, 119, 70, 0.4) !important;
          animation: bellRattle 0.35s ease-in-out infinite !important;
        }

        @keyframes bellRattle {
          0%, 100% { transform: rotate(0deg) scale(1); }
          25% { transform: rotate(-14deg) scale(1.08); }
          75% { transform: rotate(14deg) scale(1.08); }
        }

        .alarm-badge-row {
          display: flex !important;
          align-items: center !important;
          justify-content: center !important;
          gap: 10px !important;
          margin-bottom: 12px !important;
          flex-wrap: wrap !important;
        }

        .alarm-mute-btn {
          display: inline-flex !important;
          align-items: center !important;
          gap: 6px !important;
          padding: 4px 12px !important;
          border-radius: 9999px !important;
          background: var(--cream) !important;
          border: 1px solid var(--border-medium) !important;
          color: var(--text-secondary) !important;
          font-size: 11px !important;
          font-weight: 600 !important;
          cursor: pointer !important;
          transition: all 140ms ease !important;
        }

        .alarm-mute-btn:hover {
          background: #ffffff !important;
          color: var(--ink) !important;
          border-color: var(--ink) !important;
        }

        .alarm-urgent-chip {
          display: inline-flex !important;
          align-items: center !important;
          gap: 6px !important;
          padding: 4px 14px !important;
          border-radius: 9999px !important;
          background: rgba(217, 119, 70, 0.14) !important;
          color: var(--apricot) !important;
          border: 1px solid rgba(217, 119, 70, 0.3) !important;
          font-size: 11px !important;
          font-weight: 700 !important;
          letter-spacing: 0.08em !important;
        }

        .alarm-tone-picker-box {
          position: relative !important;
          display: inline-block !important;
          margin-bottom: 14px !important;
        }

        .alarm-tone-trigger-btn {
          display: inline-flex !important;
          align-items: center !important;
          gap: 6px !important;
          padding: 5px 14px !important;
          border-radius: 9999px !important;
          background: rgba(45, 122, 88, 0.08) !important;
          border: 1px solid rgba(45, 122, 88, 0.28) !important;
          color: var(--leaf) !important;
          font-size: 12px !important;
          font-weight: 600 !important;
          cursor: pointer !important;
          transition: all 140ms ease !important;
        }

        .alarm-tone-trigger-btn:hover {
          background: rgba(45, 122, 88, 0.16) !important;
          transform: translateY(-1px) !important;
        }

        .tone-picker-caret {
          font-size: 9px !important;
          opacity: 0.7 !important;
        }

        .alarm-tone-popover {
          position: absolute !important;
          top: calc(100% + 6px) !important;
          left: 50% !important;
          transform: translateX(-50%) !important;
          width: 320px !important;
          background: var(--paper) !important;
          border: 1.5px solid var(--border-medium) !important;
          border-radius: 16px !important;
          box-shadow: 0 12px 36px rgba(28, 40, 38, 0.18) !important;
          padding: 10px !important;
          z-index: 100 !important;
          text-align: left !important;
          animation: fadeIn 150ms ease !important;
        }

        .alarm-popover-title {
          font-size: 10px !important;
          letter-spacing: 0.08em !important;
          text-transform: uppercase !important;
          color: var(--text-muted) !important;
          font-weight: 700 !important;
          padding: 6px 10px 8px !important;
          border-bottom: 1px solid var(--border-subtle) !important;
          margin-bottom: 6px !important;
        }

        .alarm-popover-items {
          display: flex !important;
          flex-direction: column !important;
          gap: 4px !important;
          max-height: 240px !important;
          overflow-y: auto !important;
        }

        .alarm-popover-item {
          display: flex !important;
          align-items: center !important;
          gap: 10px !important;
          padding: 8px 10px !important;
          border-radius: 10px !important;
          border: 1px solid transparent !important;
          background: transparent !important;
          cursor: pointer !important;
          transition: all 120ms ease !important;
          width: 100% !important;
          text-align: left !important;
        }

        .alarm-popover-item:hover {
          background: var(--cream) !important;
          border-color: var(--border-subtle) !important;
        }

        .alarm-popover-item.popover-item-active {
          background: rgba(45, 122, 88, 0.1) !important;
          border-color: rgba(45, 122, 88, 0.3) !important;
        }

        .popover-item-icon {
          font-size: 18px !important;
          line-height: 1 !important;
        }

        .popover-item-text {
          flex: 1 !important;
          display: flex !important;
          flex-direction: column !important;
          min-width: 0 !important;
        }

        .popover-item-name {
          font-size: 13px !important;
          font-weight: 600 !important;
          color: var(--ink) !important;
        }

        .popover-item-badge {
          font-size: 10px !important;
          color: var(--text-muted) !important;
        }

        .popover-check {
          color: var(--leaf) !important;
        }

        .alarm-med-title {
          font-size: 1.85rem !important;
          font-weight: 700 !important;
          color: var(--ink) !important;
          margin: 0 0 10px 0 !important;
          line-height: 1.15 !important;
        }

        .alarm-meta-row {
          display: flex !important;
          align-items: center !important;
          justify-content: center !important;
          gap: 10px !important;
          margin-bottom: 18px !important;
          flex-wrap: wrap !important;
        }

        .alarm-dosage-chip {
          display: inline-flex !important;
          align-items: center !important;
          padding: 4px 12px !important;
          background: var(--mist) !important;
          color: var(--leaf) !important;
          font-size: 13px !important;
          font-weight: 700 !important;
          border-radius: 8px !important;
          border: 1px solid rgba(45, 122, 88, 0.2) !important;
        }

        .alarm-time-chip {
          display: inline-flex !important;
          align-items: center !important;
          gap: 6px !important;
          padding: 4px 12px !important;
          background: var(--cream) !important;
          color: var(--text-secondary) !important;
          font-size: 12.5px !important;
          font-weight: 500 !important;
          border-radius: 8px !important;
          border: 1px solid var(--border-medium) !important;
        }

        .alarm-safety-card {
          background: rgba(217, 119, 70, 0.08) !important;
          border-left: 3px solid var(--apricot) !important;
          padding: 10px 14px !important;
          border-radius: 0 10px 10px 0 !important;
          font-size: 13px !important;
          line-height: 1.45 !important;
          margin-bottom: 22px !important;
          text-align: left !important;
        }

        .alarm-safety-label {
          font-weight: 700 !important;
          color: var(--apricot) !important;
          font-size: 11px !important;
          text-transform: uppercase !important;
          letter-spacing: 0.05em !important;
          margin-right: 6px !important;
        }

        .alarm-safety-text {
          color: var(--ink) !important;
          font-weight: 500 !important;
        }

        .alarm-actions-stack {
          display: flex !important;
          flex-direction: column !important;
          gap: 12px !important;
          margin-top: 8px !important;
        }

        .alarm-btn-confirm {
          display: flex !important;
          align-items: center !important;
          justify-content: center !important;
          gap: 10px !important;
          width: 100% !important;
          padding: 15px 24px !important;
          border-radius: 14px !important;
          background: var(--leaf) !important;
          color: #ffffff !important;
          font-family: var(--font-sans) !important;
          font-size: 15px !important;
          font-weight: 700 !important;
          border: none !important;
          cursor: pointer !important;
          box-shadow: 0 4px 16px rgba(45, 122, 88, 0.35) !important;
          transition: all 140ms ease !important;
        }

        .alarm-btn-confirm:hover {
          background: #246347 !important;
          transform: translateY(-1px) !important;
          box-shadow: 0 6px 20px rgba(45, 122, 88, 0.45) !important;
        }

        .alarm-actions-secondary {
          display: grid !important;
          grid-template-columns: 1.2fr 1fr !important;
          gap: 10px !important;
        }

        .alarm-btn-snooze {
          display: flex !important;
          align-items: center !important;
          justify-content: center !important;
          gap: 8px !important;
          padding: 12px 16px !important;
          border-radius: 12px !important;
          background: var(--cream) !important;
          border: 1px solid var(--border-medium) !important;
          color: var(--ink) !important;
          font-family: var(--font-sans) !important;
          font-size: 13.5px !important;
          font-weight: 600 !important;
          cursor: pointer !important;
          transition: all 140ms ease !important;
        }

        .alarm-btn-snooze:hover {
          background: #ffffff !important;
          border-color: var(--ink) !important;
        }

        .alarm-btn-skip {
          padding: 12px 16px !important;
          border-radius: 12px !important;
          background: transparent !important;
          border: 1px solid var(--border-subtle) !important;
          color: var(--text-muted) !important;
          font-family: var(--font-sans) !important;
          font-size: 13px !important;
          font-weight: 500 !important;
          cursor: pointer !important;
          transition: all 140ms ease !important;
        }

        .alarm-btn-skip:hover {
          color: var(--ink) !important;
          border-color: var(--border-medium) !important;
        }
      `}</style>
    </div>
  );
}
