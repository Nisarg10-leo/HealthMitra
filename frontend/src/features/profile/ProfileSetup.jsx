import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { profileApi } from '../../api/index.js';
import {
  ActivityIcon,
  AlertTriangleIcon,
  CheckIcon,
  CrossMedicalIcon,
  HeartIcon,
  LogoutIcon,
  PlusIcon,
  ShieldIcon,
  SparklesIcon,
  UserIcon
} from '../../components/ui/Icons.jsx';

const COMMON_ALLERGIES = [
  'Penicillin',
  'Sulfa Drugs',
  'Aspirin',
  'Ibuprofen',
  'Latex',
  'Peanuts',
  'Dairy',
  'Seafood',
  'Codeine',
  'ACE Inhibitors'
];

const COMMON_CONDITIONS = [
  'Type 2 Diabetes',
  'Hypertension (High BP)',
  'Cardiovascular Disease',
  'Thyroid Disorder',
  'Asthma / Respiratory',
  'Arthritis / Joint Pain',
  'Chronic Kidney Disease',
  'High Cholesterol',
  'Acid Reflux / GERD',
  'Osteoporosis'
];

const BLOOD_GROUPS = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];

const RELATIONS = ['Spouse', 'Son', 'Daughter', 'Sibling', 'Caregiver', 'Doctor', 'Friend', 'Other'];

const DIETS = [
  { id: 'Vegetarian', label: 'Vegetarian' },
  { id: 'Diabetic-Friendly', label: 'Diabetic-Friendly (Low Sugar)' },
  { id: 'Low Sodium', label: 'Low Sodium (Heart Safe)' },
  { id: 'Non-Vegetarian', label: 'Non-Vegetarian' },
  { id: 'Standard', label: 'No Dietary Restriction' }
];

const MOBILITY_OPTIONS = [
  { id: 'Independent', label: 'Fully Independent' },
  { id: 'Walking Aid', label: 'Uses Cane / Walking Stick' },
  { id: 'Wheelchair', label: 'Wheelchair Assisted' },
  { id: 'Assisted', label: 'Bed Rest / Assisted' }
];

export function ProfileSetup({ session, onComplete, onSkip, onLogout }) {
  const { t } = useTranslation();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  // Form State
  const [age, setAge] = useState(session?.age || '');
  const [dob, setDob] = useState(session?.dob || '');
  const [gender, setGender] = useState(session?.gender || 'female');
  const [bloodGroup, setBloodGroup] = useState(session?.bloodGroup || 'O+');
  const [height, setHeight] = useState(session?.height || '');
  const [weight, setWeight] = useState(session?.weight || '');

  const [allergies, setAllergies] = useState(session?.allergies || []);
  const [customAllergy, setCustomAllergy] = useState('');
  const [noAllergies, setNoAllergies] = useState(false);

  const [conditions, setConditions] = useState(session?.conditions || []);
  const [customCondition, setCustomCondition] = useState('');

  const [emergencyName, setEmergencyName] = useState(session?.emergencyContactName || '');
  const [emergencyRelation, setEmergencyRelation] = useState(session?.emergencyContactRelation || 'Son');
  const [emergencyPhone, setEmergencyPhone] = useState(session?.emergencyContactPhone || '');

  const [diet, setDiet] = useState(session?.dietaryPreference || 'Vegetarian');
  const [mobility, setMobility] = useState(session?.mobilityStatus || 'Independent');

  // Toggle allergies
  const toggleAllergy = (item) => {
    setNoAllergies(false);
    setAllergies((prev) =>
      prev.includes(item) ? prev.filter((a) => a !== item) : [...prev, item]
    );
  };

  const handleAddCustomAllergy = (e) => {
    if (e) e.preventDefault();
    const clean = customAllergy.trim();
    if (clean && !allergies.includes(clean)) {
      setNoAllergies(false);
      setAllergies((prev) => [...prev, clean]);
      setCustomAllergy('');
    }
  };

  const removeAllergy = (item) => {
    setAllergies((prev) => prev.filter((a) => a !== item));
  };

  const handleToggleNoAllergies = () => {
    if (!noAllergies) {
      setAllergies([]);
      setNoAllergies(true);
    } else {
      setNoAllergies(false);
    }
  };

  // Toggle conditions
  const toggleCondition = (item) => {
    setConditions((prev) =>
      prev.includes(item) ? prev.filter((c) => c !== item) : [...prev, item]
    );
  };

  const handleAddCustomCondition = (e) => {
    if (e) e.preventDefault();
    const clean = customCondition.trim();
    if (clean && !conditions.includes(clean)) {
      setConditions((prev) => [...prev, clean]);
      setCustomCondition('');
    }
  };

  const removeCondition = (item) => {
    setConditions((prev) => prev.filter((c) => c !== item));
  };

  const handleSubmit = async (e) => {
    if (e) e.preventDefault();
    setError('');
    setSubmitting(true);

    try {
      const payload = {
        age: age ? Number(age) : null,
        dob: dob || null,
        gender,
        bloodGroup,
        height: height ? Number(height) : null,
        weight: weight ? Number(weight) : null,
        allergies: noAllergies ? ['None'] : allergies,
        conditions,
        emergencyContactName: emergencyName.trim() || null,
        emergencyContactRelation: emergencyRelation,
        emergencyContactPhone: emergencyPhone.trim() || null,
        dietaryPreference: diet,
        mobilityStatus: mobility,
        profileComplete: true
      };

      const updated = await profileApi.update(payload);
      onComplete(updated || payload);
    } catch (err) {
      setError(err.message || 'Failed to save profile. Please try again.');
      setSubmitting(false);
    }
  };

  const firstName = session?.name ? session.name.split(' ')[0] : 'there';

  return (
    <div className="setup-container">
      {/* Header bar */}
      <header className="setup-header">
        <div className="setup-brand">
          <div className="setup-brand-mark">
            <CrossMedicalIcon size={16} strokeWidth={2.4} />
          </div>
          <div>
            <span className="setup-brand-title">HealthMitra</span>
            <span className="setup-brand-subtitle">Clinical Onboarding</span>
          </div>
        </div>

        {onLogout && (
          <button type="button" className="btn-subtle" onClick={onLogout} title="Log out">
            <LogoutIcon size={14} />
            <span>{t('logout') || 'Sign out'}</span>
          </button>
        )}
      </header>

      <main className="setup-main">
        {/* Hero Title */}
        <div className="setup-hero">
          <span className="chip-telemetry chip-mint">
            <SparklesIcon size={13} />
            <span>{t('setupProfile') || 'First-Time Setup'}</span>
          </span>
          <h1 className="setup-title">
            {t('setupProfileTitle') || 'Welcome to HealthMitra'}, {firstName}
          </h1>
          <p className="setup-subtitle">
            {t('setupProfileSubtitle') ||
              "Let's personalize your clinical health profile. Your age, allergies, and vitals calibrate safety checks and food-drug interaction warnings."}
          </p>
        </div>

        {error && (
          <div className="setup-error-banner" role="alert">
            <AlertTriangleIcon size={16} />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="setup-form">
          {/* Section 1: Basic Vitals & Info */}
          <section className="setup-card">
            <div className="setup-card-header">
              <div className="setup-icon-bubble">
                <UserIcon size={18} />
              </div>
              <div>
                <h2 className="setup-card-title">{t('vitalsAndInfo') || 'Basic Vitals & Information'}</h2>
                <p className="setup-card-desc">Calibrates dosage weight ratios and senior voice pacing.</p>
              </div>
            </div>

            <div className="setup-grid-3">
              <div className="setup-field">
                <label htmlFor="setup-age">{t('age') || 'Age'} ({t('years') || 'years'})</label>
                <input
                  id="setup-age"
                  type="number"
                  min="1"
                  max="125"
                  placeholder="e.g. 68"
                  value={age}
                  onChange={(e) => setAge(e.target.value)}
                  className="setup-input font-mono"
                  required
                />
              </div>

              <div className="setup-field">
                <label htmlFor="setup-weight">{t('weightKg') || 'Weight (kg)'}</label>
                <input
                  id="setup-weight"
                  type="number"
                  min="20"
                  max="300"
                  placeholder="e.g. 64"
                  value={weight}
                  onChange={(e) => setWeight(e.target.value)}
                  className="setup-input font-mono"
                  required
                />
              </div>

              <div className="setup-field">
                <label htmlFor="setup-height">{t('heightCm') || 'Height (cm)'}</label>
                <input
                  id="setup-height"
                  type="number"
                  min="60"
                  max="250"
                  placeholder="e.g. 162"
                  value={height}
                  onChange={(e) => setHeight(e.target.value)}
                  className="setup-input font-mono"
                />
              </div>
            </div>

            <div className="setup-grid-2" style={{ marginTop: '16px' }}>
              <div className="setup-field">
                <label>{t('gender') || 'Gender'}</label>
                <div className="pill-group">
                  {['female', 'male', 'other'].map((g) => (
                    <button
                      key={g}
                      type="button"
                      className={`pill-option ${gender === g ? 'active' : ''}`}
                      onClick={() => setGender(g)}
                    >
                      {g === 'female' ? t('female') || 'Female' : g === 'male' ? t('male') || 'Male' : t('other') || 'Other'}
                    </button>
                  ))}
                </div>
              </div>

              <div className="setup-field">
                <label>{t('bloodGroup') || 'Blood Group'}</label>
                <div className="pill-group pill-group-blood">
                  {BLOOD_GROUPS.map((bg) => (
                    <button
                      key={bg}
                      type="button"
                      className={`pill-option pill-mono ${bloodGroup === bg ? 'active' : ''}`}
                      onClick={() => setBloodGroup(bg)}
                    >
                      {bg}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </section>

          {/* Section 2: Allergies & Contraindications */}
          <section className="setup-card">
            <div className="setup-card-header">
              <div className="setup-icon-bubble bubble-warning">
                <AlertTriangleIcon size={18} />
              </div>
              <div>
                <h2 className="setup-card-title">{t('allergiesSection') || 'Allergies & Contraindications'}</h2>
                <p className="setup-card-desc">
                  {t('allergiesHelp') || 'Crucial for preventing severe drug interactions and allergic reactions.'}
                </p>
              </div>
            </div>

            <div className="setup-no-allergies-row">
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={noAllergies}
                  onChange={handleToggleNoAllergies}
                />
                <span>{t('noAllergies') || 'No known drug allergies (NKDA)'}</span>
              </label>
            </div>

            {!noAllergies && (
              <>
                <div className="chips-picker">
                  {COMMON_ALLERGIES.map((item) => {
                    const isSelected = allergies.includes(item);
                    return (
                      <button
                        key={item}
                        type="button"
                        className={`chip-pill ${isSelected ? 'selected' : ''}`}
                        onClick={() => toggleAllergy(item)}
                      >
                        {isSelected && <CheckIcon size={12} />}
                        <span>{item}</span>
                      </button>
                    );
                  })}
                </div>

                <div className="custom-tag-row">
                  <input
                    type="text"
                    placeholder={t('addAllergyPlaceholder') || 'Add custom allergy (e.g. Sulfa, Peanuts)...'}
                    value={customAllergy}
                    onChange={(e) => setCustomAllergy(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddCustomAllergy();
                      }
                    }}
                    className="setup-input"
                  />
                  <button
                    type="button"
                    onClick={handleAddCustomAllergy}
                    className="btn-subtle"
                    disabled={!customAllergy.trim()}
                  >
                    <PlusIcon size={14} />
                    <span>Add</span>
                  </button>
                </div>

                {allergies.length > 0 && (
                  <div className="selected-tags-display">
                    <span className="selected-tags-label">Recorded Allergies:</span>
                    <div className="tags-wrap">
                      {allergies.map((item) => (
                        <span key={item} className="tag-pill tag-apricot">
                          <span>{item}</span>
                          <button
                            type="button"
                            onClick={() => removeAllergy(item)}
                            className="tag-remove"
                            aria-label={`Remove ${item}`}
                          >
                            ×
                          </button>
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}
          </section>

          {/* Section 3: Existing Medical Conditions */}
          <section className="setup-card">
            <div className="setup-card-header">
              <div className="setup-icon-bubble bubble-mint">
                <HeartIcon size={18} />
              </div>
              <div>
                <h2 className="setup-card-title">{t('conditionsSection') || 'Existing Medical Conditions'}</h2>
                <p className="setup-card-desc">
                  {t('conditionsHelp') || 'Informs Mitra AI to provide tailored medication precautions.'}
                </p>
              </div>
            </div>

            <div className="chips-picker">
              {COMMON_CONDITIONS.map((item) => {
                const isSelected = conditions.includes(item);
                return (
                  <button
                    key={item}
                    type="button"
                    className={`chip-pill ${isSelected ? 'selected' : ''}`}
                    onClick={() => toggleCondition(item)}
                  >
                    {isSelected && <CheckIcon size={12} />}
                    <span>{item}</span>
                  </button>
                );
              })}
            </div>

            <div className="custom-tag-row">
              <input
                type="text"
                placeholder={t('addConditionPlaceholder') || 'Add custom condition (e.g. Thyroid, Asthma)...'}
                value={customCondition}
                onChange={(e) => setCustomCondition(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddCustomCondition();
                  }
                }}
                className="setup-input"
              />
              <button
                type="button"
                onClick={handleAddCustomCondition}
                className="btn-subtle"
                disabled={!customCondition.trim()}
              >
                <PlusIcon size={14} />
                <span>Add</span>
              </button>
            </div>

            {conditions.length > 0 && (
              <div className="selected-tags-display">
                <span className="selected-tags-label">Recorded Conditions:</span>
                <div className="tags-wrap">
                  {conditions.map((item) => (
                    <span key={item} className="tag-pill tag-leaf">
                      <span>{item}</span>
                      <button
                        type="button"
                        onClick={() => removeCondition(item)}
                        className="tag-remove"
                        aria-label={`Remove ${item}`}
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>
              </div>
            )}
          </section>

          {/* Section 4: Emergency Contact */}
          <section className="setup-card">
            <div className="setup-card-header">
              <div className="setup-icon-bubble bubble-leaf">
                <ShieldIcon size={18} />
              </div>
              <div>
                <h2 className="setup-card-title">{t('emergencySection') || 'Emergency Safety Contact'}</h2>
                <p className="setup-card-desc">
                  {t('emergencyHelp') || 'Primary loved one notified immediately during missed doses or SOS emergencies.'}
                </p>
              </div>
            </div>

            <div className="setup-grid-3">
              <div className="setup-field">
                <label htmlFor="setup-em-name">{t('contactName') || 'Contact Full Name'}</label>
                <input
                  id="setup-em-name"
                  type="text"
                  placeholder="e.g. Arjun Shah"
                  value={emergencyName}
                  onChange={(e) => setEmergencyName(e.target.value)}
                  className="setup-input"
                />
              </div>

              <div className="setup-field">
                <label htmlFor="setup-em-rel">{t('relationship') || 'Relationship'}</label>
                <select
                  id="setup-em-rel"
                  value={emergencyRelation}
                  onChange={(e) => setEmergencyRelation(e.target.value)}
                  className="setup-input"
                >
                  {RELATIONS.map((r) => (
                    <option key={r} value={r}>{r}</option>
                  ))}
                </select>
              </div>

              <div className="setup-field">
                <label htmlFor="setup-em-phone">{t('contactPhone') || 'Contact Phone'}</label>
                <input
                  id="setup-em-phone"
                  type="tel"
                  placeholder="+91 98100 00002"
                  value={emergencyPhone}
                  onChange={(e) => setEmergencyPhone(e.target.value)}
                  className="setup-input font-mono"
                />
              </div>
            </div>
          </section>

          {/* Section 5: Dietary & Daily Mobility */}
          <section className="setup-card">
            <div className="setup-card-header">
              <div className="setup-icon-bubble">
                <ActivityIcon size={18} />
              </div>
              <div>
                <h2 className="setup-card-title">{t('lifestyleSection') || 'Dietary & Daily Mobility'}</h2>
                <p className="setup-card-desc">
                  {t('lifestyleHelp') || 'Assists with meal timing and fall-risk detection settings.'}
                </p>
              </div>
            </div>

            <div className="setup-grid-2">
              <div className="setup-field">
                <label>{t('dietaryPreference') || 'Dietary Preference'}</label>
                <div className="pill-group pill-group-vertical">
                  {DIETS.map((d) => (
                    <button
                      key={d.id}
                      type="button"
                      className={`pill-option ${diet === d.id ? 'active' : ''}`}
                      onClick={() => setDiet(d.id)}
                    >
                      {d.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="setup-field">
                <label>{t('mobilityLevel') || 'Mobility / Activity Level'}</label>
                <div className="pill-group pill-group-vertical">
                  {MOBILITY_OPTIONS.map((m) => (
                    <button
                      key={m.id}
                      type="button"
                      className={`pill-option ${mobility === m.id ? 'active' : ''}`}
                      onClick={() => setMobility(m.id)}
                    >
                      {m.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </section>

          {/* Submission Row */}
          <div className="setup-actions">
            <button
              type="submit"
              disabled={submitting}
              className="setup-submit-btn"
            >
              {submitting ? (
                <span>{t('pleaseWait') || 'Saving profile...'}</span>
              ) : (
                <>
                  <CheckIcon size={16} />
                  <span>{t('completeProfileBtn') || 'Save & Complete Health Profile'}</span>
                </>
              )}
            </button>

            {onSkip && (
              <button
                type="button"
                onClick={onSkip}
                className="setup-skip-btn"
              >
                {t('skipSetupBtn') || 'Skip for now (I will complete later in Profile)'}
              </button>
            )}
          </div>
        </form>
      </main>
    </div>
  );
}
