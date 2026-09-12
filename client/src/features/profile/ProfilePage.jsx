import React, { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { guidanceApi, medicationsApi, profileApi } from '../../api/index.js';
import { useSession } from '../../hooks/useSession.js';
import { useWorkspace } from '../../workspace/WorkspaceContext.jsx';
import { CheckIcon, FileTextIcon, PlusIcon, SparklesIcon } from '../../components/ui/Icons.jsx';

const COMMON_CONDITIONS = [
  'Type 2 Diabetes', 'Hypertension (High BP)', 'Cardiovascular Disease',
  'Thyroid Disorder', 'Asthma', 'COPD', 'Arthritis / Joint Pain',
  'Chronic Kidney Disease', 'High Cholesterol', 'Acid Reflux / GERD',
  'Osteoporosis', 'Anxiety / Depression'
];

const COMMON_ALLERGIES = [
  'Penicillin', 'Sulfa Drugs', 'Aspirin', 'Ibuprofen', 'Latex', 'Peanuts', 'Dairy', 'Seafood'
];

export function ProfilePage() {
  const { t } = useTranslation();
  const session = useSession();
  const { dashboard, refresh, notify, setTab } = useWorkspace();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toastMessage, setToastMessage] = useState(null);

  // Form State
  const [formData, setFormData] = useState({
    dob: '',
    age: '',
    gender: '',
    bloodGroup: '',
    height: '',
    weight: '',
    conditions: [],
    allergies: [],
    emergencyContactName: '',
    emergencyContactPhone: '',
    emergencyContactRelation: '',
    dietaryPreference: 'Vegetarian',
    mobilityStatus: 'Independent',
    medicalFiles: []
  });

  const [newCondition, setNewCondition] = useState('');
  const [newAllergy, setNewAllergy] = useState('');

  // Prescription & Receipt Scanner State
  const [scannerImage, setScannerImage] = useState(null);
  const [scanning, setScanning] = useState(false);
  const [scanStatusText, setScanStatusText] = useState('');
  const [scannedMedicines, setScannedMedicines] = useState([]);
  const [scannedAdvice, setScannedAdvice] = useState('');
  const [scannedDoctor, setScannedDoctor] = useState('');
  const [addingMeds, setAddingMeds] = useState(false);
  const prescriptionInputRef = useRef(null);
  const fileInputRef = useRef(null);

  useEffect(() => {
    async function loadProfile() {
      try {
        const data = await profileApi.get();
        if (data) {
          setFormData({
            dob: data.dob || '',
            age: data.age || '',
            gender: data.gender || '',
            bloodGroup: data.bloodGroup || '',
            height: data.height || '',
            weight: data.weight || '',
            conditions: Array.isArray(data.conditions) ? data.conditions : [],
            allergies: Array.isArray(data.allergies) ? data.allergies : [],
            emergencyContactName: data.emergencyContactName || '',
            emergencyContactPhone: data.emergencyContactPhone || '',
            emergencyContactRelation: data.emergencyContactRelation || '',
            dietaryPreference: data.dietaryPreference || 'Vegetarian',
            mobilityStatus: data.mobilityStatus || 'Independent',
            medicalFiles: Array.isArray(data.medicalFiles) ? data.medicalFiles : []
          });
        }
      } catch (err) {
        console.error('Failed to load profile:', err);
      } finally {
        setLoading(false);
      }
    }
    loadProfile();
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const toggleCondition = (condition) => {
    setFormData((prev) => {
      const exists = prev.conditions.includes(condition);
      return {
        ...prev,
        conditions: exists ? prev.conditions.filter((c) => c !== condition) : [...prev.conditions, condition]
      };
    });
  };

  const addCustomCondition = (e) => {
    if (e) e.preventDefault();
    const trimmed = newCondition.trim();
    if (trimmed && !formData.conditions.includes(trimmed)) {
      setFormData((prev) => ({
        ...prev,
        conditions: [...prev.conditions, trimmed]
      }));
      setNewCondition('');
    }
  };

  const removeCondition = (condition) => {
    setFormData((prev) => ({
      ...prev,
      conditions: prev.conditions.filter((c) => c !== condition)
    }));
  };

  const addAllergy = (allergy) => {
    const trimmed = allergy.trim();
    if (trimmed && !formData.allergies.includes(trimmed)) {
      setFormData((prev) => ({
        ...prev,
        allergies: [...prev.allergies, trimmed]
      }));
    }
  };

  const removeAllergy = (allergy) => {
    setFormData((prev) => ({
      ...prev,
      allergies: prev.allergies.filter((a) => a !== allergy)
    }));
  };

  // Upload Medical Report / File
  const handleFileUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      const newFileObj = {
        id: 'file-' + Date.now(),
        name: file.name,
        size: `${(file.size / 1024).toFixed(1)} KB`,
        type: file.type || 'document',
        uploadedAt: new Date().toLocaleDateString(),
        data: reader.result
      };

      setFormData((prev) => ({
        ...prev,
        medicalFiles: [...prev.medicalFiles, newFileObj]
      }));
      notify(`Medical file "${file.name}" uploaded successfully.`);
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const removeFile = (id) => {
    setFormData((prev) => ({
      ...prev,
      medicalFiles: prev.medicalFiles.filter((f) => f.id !== id)
    }));
  };

  // Prescription / Receipt Scanning via AI Vision & OCR
  const handleScanPrescription = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async () => {
      const base64Data = reader.result;
      setScannerImage(base64Data);
      setScanning(true);
      setScanStatusText('Analyzing medical receipt / prescription…');
      setScannedMedicines([]);
      setScannedAdvice('');

      try {
        setScanStatusText('Running Optical Character Recognition…');
        const result = await guidanceApi.scanPrescription({ image: base64Data });

        if (result?.medicines && result.medicines.length > 0) {
          setScannedMedicines(result.medicines);
          setScannedAdvice(result.dietaryAdvice || '');
          setScannedDoctor(result.doctorName || '');
          notify(`Detected ${result.medicines.length} medicine(s) from receipt!`);
        } else {
          notify('Receipt scanned, but no clear medicine names could be detected. Please verify or enter manually.');
        }
      } catch (err) {
        console.error('Scan error:', err);
        notify('Scan error: ' + (err.message || 'Could not process receipt'));
      } finally {
        setScanning(false);
        setScanStatusText('');
      }
    };
    reader.readAsDataURL(file);
  };

  // Auto-Add Extracted Medicines to Patient's Medication Schedule
  const handleAddScannedMedicines = async () => {
    if (!scannedMedicines.length) return;
    setAddingMeds(true);
    const patientId = dashboard?.patient?.id || session?.id;

    try {
      let addedCount = 0;
      for (const med of scannedMedicines) {
        const timesArray = Array.isArray(med.times) && med.times.length > 0
          ? med.times
          : (med.frequencyPerDay === 2 ? ['08:00', '20:00'] : ['08:00']);

        await medicationsApi.create({
          patientId,
          name: med.name,
          dosage: med.dosage || 'Standard dose',
          frequencyPerDay: Number(med.frequencyPerDay || timesArray.length || 1),
          times: timesArray,
          startDate: new Date().toISOString().split('T')[0],
          color: 'var(--cyan)'
        });
        addedCount++;
      }

      notify(`Added ${addedCount} medicine(s) directly to your daily schedule!`);
      setScannedMedicines([]);
      refresh();
      if (setTab) {
        setTimeout(() => setTab('medications'), 1200);
      }
    } catch (err) {
      console.error('Failed to add medications:', err);
      notify('Failed to add some medicines: ' + err.message);
    } finally {
      setAddingMeds(false);
    }
  };

  // Save Full Profile
  const handleSave = async () => {
    setSaving(true);
    try {
      await profileApi.update(formData);
      setToastMessage('Health profile saved successfully!');
      notify('Health profile saved successfully!');
      refresh();
      setTimeout(() => setToastMessage(null), 3500);
    } catch (err) {
      console.error('Failed to save profile:', err);
      setToastMessage('Failed to save profile: ' + err.message);
      setTimeout(() => setToastMessage(null), 3500);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div style={{ padding: '40px 20px', textAlign: 'center', color: 'var(--text-muted)' }}>
        <p>Loading your clinical health profile…</p>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: '860px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '22px', paddingBottom: '80px' }}>
      {/* Header Banner */}
      <div
        className="hm-card"
        style={{
          padding: '24px 26px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '16px'
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
            <span className="chip-telemetry chip-cyan" style={{ fontSize: '0.68rem', padding: '2px 8px' }}>
              Patient Health Record
            </span>
            <span style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>
              {formData.conditions.length} conditions • {formData.allergies.length} allergies logged
            </span>
          </div>
          <h1 style={{ fontSize: '1.75rem', margin: '2px 0 4px', color: '#ffffff', fontWeight: '700' }}>
            Health Profile & Records
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.88rem', margin: 0 }}>
            Enter your medical history, diagnostic reports, and scan prescriptions to calibrate clinical alerts.
          </p>
        </div>

        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className="btn-cyber"
          style={{ padding: '10px 20px', fontSize: '0.9rem' }}
        >
          {saving ? 'Saving…' : (
            <>
              <CheckIcon size={15} />
              <span>Save Profile</span>
            </>
          )}
        </button>
      </div>

      {/* Section 1: Diagnosed Conditions */}
      <section className="hm-card" style={{ padding: '22px 24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--surface-border)', pb: '12px', paddingBottom: '12px' }}>
          <div>
            <h2 style={{ fontSize: '1.15rem', margin: 0, fontWeight: '600' }}>Medical Conditions & Diagnoses</h2>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: '2px 0 0' }}>
              Selected conditions enable automated drug-disease interaction checks.
            </p>
          </div>
          <span className="chip-telemetry chip-cyan" style={{ fontSize: '0.72rem' }}>
            {formData.conditions.length} Selected
          </span>
        </div>

        {/* Condition Chips Grid */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
          {COMMON_CONDITIONS.map((c) => {
            const isSelected = formData.conditions.includes(c);
            return (
              <button
                key={c}
                type="button"
                onClick={() => toggleCondition(c)}
                style={{
                  padding: '7px 12px',
                  borderRadius: 'var(--radius-item)',
                  fontSize: '0.82rem',
                  fontWeight: '500',
                  border: isSelected ? '1px solid var(--cyan)' : '1px solid rgba(255, 255, 255, 0.1)',
                  background: isSelected ? 'var(--cyan-subtle)' : 'rgba(255, 255, 255, 0.03)',
                  color: isSelected ? 'var(--cyan)' : 'var(--text-secondary)',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease'
                }}
              >
                {isSelected ? 'Selected • ' : '+ '} {c}
              </button>
            );
          })}
        </div>

        {/* Custom conditions tags */}
        {formData.conditions.filter((c) => !COMMON_CONDITIONS.includes(c)).length > 0 && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', paddingTop: '4px' }}>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', alignSelf: 'center' }}>Custom:</span>
            {formData.conditions
              .filter((c) => !COMMON_CONDITIONS.includes(c))
              .map((c) => (
                <span
                  key={c}
                  style={{
                    padding: '4px 10px',
                    borderRadius: '8px',
                    fontSize: '0.8rem',
                    background: 'var(--indigo-subtle)',
                    border: '1px solid var(--indigo-border)',
                    color: '#c7d2fe',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px'
                  }}
                >
                  {c}
                  <button
                    type="button"
                    onClick={() => removeCondition(c)}
                    style={{ background: 'none', border: 'none', color: '#a5b4fc', cursor: 'pointer', fontWeight: '700', padding: 0 }}
                  >
                    ×
                  </button>
                </span>
              ))}
          </div>
        )}

        {/* Custom condition input */}
        <div style={{ display: 'flex', gap: '8px', paddingTop: '4px' }}>
          <input
            type="text"
            value={newCondition}
            onChange={(e) => setNewCondition(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && addCustomCondition(e)}
            placeholder="Type other medical condition and press Enter…"
            style={{ flex: 1, padding: '9px 12px', fontSize: '0.86rem' }}
          />
          <button
            type="button"
            onClick={addCustomCondition}
            className="btn-glass"
            style={{ padding: '9px 16px', fontSize: '0.84rem' }}
          >
            + Add
          </button>
        </div>
      </section>

      {/* Section 2: Prescription & Medical Receipt Scanner */}
      <section className="hm-card" style={{ padding: '22px 24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--surface-border)', paddingBottom: '12px' }}>
          <div>
            <h2 style={{ fontSize: '1.15rem', margin: 0, fontWeight: '600' }}>Prescription & Receipt Scanner</h2>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: '2px 0 0' }}>
              Upload a prescription or receipt to transcribe and ingest medicines into your schedule.
            </p>
          </div>
          <span className="chip-telemetry chip-cyan" style={{ fontSize: '0.72rem' }}>
            OCR Scanner
          </span>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px' }}>
          {/* Upload Dropzone */}
          <div
            style={{
              padding: '24px 18px',
              border: '1px dashed var(--cyan-border)',
              borderRadius: 'var(--radius-card)',
              background: 'rgba(0, 210, 211, 0.03)',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              textAlign: 'center',
              gap: '10px'
            }}
          >
            {scannerImage ? (
              <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <img
                  src={scannerImage}
                  alt="Scanned Prescription"
                  style={{ width: '100%', maxHeight: '160px', objectFit: 'cover', borderRadius: '10px', border: '1px solid rgba(255, 255, 255, 0.1)' }}
                />
                <button
                  type="button"
                  onClick={() => prescriptionInputRef.current?.click()}
                  className="btn-glass"
                  style={{ width: '100%', padding: '6px', fontSize: '0.78rem' }}
                >
                  Upload Different Photo
                </button>
              </div>
            ) : (
              <>
                <FileTextIcon size={36} className="color-cyan" />
                <div>
                  <strong style={{ display: 'block', fontSize: '0.9rem', color: '#ffffff' }}>Upload Prescription or Receipt</strong>
                  <span style={{ fontSize: '0.76rem', color: 'var(--text-muted)' }}>PNG, JPG, or camera photo</span>
                </div>
                <button
                  type="button"
                  onClick={() => prescriptionInputRef.current?.click()}
                  className="btn-cyber"
                  style={{ padding: '8px 16px', fontSize: '0.82rem' }}
                >
                  Choose Document
                </button>
              </>
            )}
            <input
              ref={prescriptionInputRef}
              type="file"
              accept="image/*"
              style={{ display: 'none' }}
              onChange={handleScanPrescription}
            />
          </div>

          {/* Results Area */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', justifyContent: 'center' }}>
            {scanning && (
              <div style={{ padding: '24px', background: 'rgba(255, 255, 255, 0.02)', borderRadius: 'var(--radius-card)', border: '1px solid var(--surface-border)', textAlign: 'center' }}>
                <p style={{ margin: 0, color: 'var(--cyan)', fontWeight: '600', fontSize: '0.9rem' }}>{scanStatusText}</p>
                <p style={{ margin: '4px 0 0', color: 'var(--text-muted)', fontSize: '0.78rem' }}>Transcribing medicine names, dosages, and schedules…</p>
              </div>
            )}

            {!scanning && scannedMedicines.length > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span className="chip-telemetry chip-mint" style={{ fontSize: '0.72rem' }}>
                    ✓ Detected {scannedMedicines.length} Medicine(s)
                  </span>
                  {scannedDoctor && (
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Doctor: {scannedDoctor}</span>
                  )}
                </div>

                <div style={{ maxHeight: '180px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  {scannedMedicines.map((med, idx) => (
                    <div
                      key={idx}
                      style={{
                        padding: '8px 12px',
                        borderRadius: '8px',
                        background: 'rgba(255, 255, 255, 0.03)',
                        border: '1px solid rgba(255, 255, 255, 0.08)',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center'
                      }}
                    >
                      <div>
                        <strong style={{ display: 'block', fontSize: '0.85rem', color: '#ffffff' }}>{med.name}</strong>
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                          {med.dosage} • {med.frequencyPerDay || 1}x daily
                        </span>
                      </div>
                      <span className="font-mono" style={{ fontSize: '0.76rem', color: 'var(--cyan)', background: 'var(--cyan-subtle)', padding: '2px 6px', borderRadius: '4px' }}>
                        {Array.isArray(med.times) ? med.times.join(', ') : '08:00'}
                      </span>
                    </div>
                  ))}
                </div>

                {scannedAdvice && (
                  <div style={{ padding: '8px 10px', borderRadius: '6px', background: 'var(--indigo-subtle)', border: '1px solid var(--indigo-border)', fontSize: '0.78rem', color: '#c7d2fe' }}>
                    <strong>Advice:</strong> {scannedAdvice}
                  </div>
                )}

                <button
                  type="button"
                  onClick={handleAddScannedMedicines}
                  disabled={addingMeds}
                  className="btn-cyber"
                  style={{ padding: '10px', fontSize: '0.88rem' }}
                >
                  {addingMeds ? 'Adding…' : 'Add Extracted Medicines to Daily Schedule'}
                </button>
              </div>
            )}

            {!scanning && scannedMedicines.length === 0 && !scannerImage && (
              <div style={{ padding: '24px 16px', textAlign: 'center', color: 'var(--text-muted)', border: '1px solid var(--surface-border-subtle)', borderRadius: 'var(--radius-card)' }}>
                <p style={{ margin: 0, fontSize: '0.85rem' }}>No prescription scanned yet.</p>
                <span style={{ fontSize: '0.75rem' }}>Uploaded receipts automatically extract medicine names and timings.</span>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Section 3: Medical Reports & Health Records */}
      <section className="hm-card" style={{ padding: '22px 24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--surface-border)', paddingBottom: '12px' }}>
          <div>
            <h2 style={{ fontSize: '1.15rem', margin: 0, fontWeight: '600' }}>Medical Reports & Records</h2>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: '2px 0 0' }}>
              Upload lab results, blood work, or clinical summaries for caregiver access.
            </p>
          </div>
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="btn-glass"
            style={{ padding: '6px 12px', fontSize: '0.78rem' }}
          >
            + Upload Document
          </button>
          <input
            ref={fileInputRef}
            type="file"
            style={{ display: 'none' }}
            onChange={handleFileUpload}
          />
        </div>

        {formData.medicalFiles.length === 0 ? (
          <div style={{ padding: '20px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.85rem', border: '1px dashed var(--surface-border)', borderRadius: 'var(--radius-item)' }}>
            No health records uploaded yet.
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '10px' }}>
            {formData.medicalFiles.map((file) => (
              <div
                key={file.id}
                style={{
                  padding: '10px 12px',
                  borderRadius: 'var(--radius-item)',
                  background: 'rgba(255, 255, 255, 0.03)',
                  border: '1px solid rgba(255, 255, 255, 0.08)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '10px'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0 }}>
                  <FileTextIcon size={18} style={{ color: 'var(--cyan)' }} />
                  <div style={{ minWidth: 0 }}>
                    <strong style={{ display: 'block', fontSize: '0.84rem', color: '#ffffff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {file.name}
                    </strong>
                    <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                      {file.size} • {file.uploadedAt}
                    </span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => removeFile(file.id)}
                  style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '1rem', padding: '2px 6px' }}
                  title="Remove file"
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Section 4: Allergies */}
      <section className="hm-card" style={{ padding: '22px 24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--surface-border)', paddingBottom: '12px' }}>
          <div>
            <h2 style={{ fontSize: '1.15rem', margin: 0, fontWeight: '600' }}>Drug & Food Allergies</h2>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: '2px 0 0' }}>
              Mitra checks every newly added prescription against these allergy records.
            </p>
          </div>
          <span className="chip-telemetry chip-error" style={{ fontSize: '0.72rem' }}>
            {formData.allergies.length} Logged
          </span>
        </div>

        {/* Quick add */}
        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '6px' }}>
          <span style={{ fontSize: '0.76rem', color: 'var(--text-muted)', marginRight: '4px' }}>Quick add:</span>
          {COMMON_ALLERGIES.map((a) => (
            <button
              key={a}
              type="button"
              onClick={() => addAllergy(a)}
              style={{
                fontSize: '0.78rem',
                background: 'rgba(255, 255, 255, 0.03)',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                padding: '4px 10px',
                borderRadius: '8px',
                color: 'var(--text-secondary)',
                cursor: 'pointer'
              }}
            >
              + {a}
            </button>
          ))}
        </div>

        {/* Active Allergies Pill Box */}
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: '8px',
            minHeight: '44px',
            padding: '10px 12px',
            background: '#0b0f19',
            border: '1px solid rgba(255, 255, 255, 0.12)',
            borderRadius: 'var(--radius-item)',
            alignItems: 'center'
          }}
        >
          {formData.allergies.map((a) => (
            <span
              key={a}
              style={{
                padding: '3px 10px',
                borderRadius: '8px',
                fontSize: '0.8rem',
                background: 'var(--coral-subtle)',
                border: '1px solid var(--coral-border)',
                color: '#fca5a5',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px'
              }}
            >
              {a}
              <button
                type="button"
                onClick={() => removeAllergy(a)}
                style={{ background: 'none', border: 'none', color: '#fca5a5', cursor: 'pointer', fontWeight: '700', padding: 0 }}
              >
                ×
              </button>
            </span>
          ))}
          <input
            type="text"
            value={newAllergy}
            onChange={(e) => setNewAllergy(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                addAllergy(newAllergy);
                setNewAllergy('');
              }
            }}
            placeholder="Type allergy and press Enter…"
            style={{
              flex: 1,
              background: 'transparent',
              border: 'none',
              color: '#ffffff',
              fontSize: '0.86rem',
              minWidth: '180px',
              padding: '2px 6px',
              boxShadow: 'none'
            }}
          />
        </div>
      </section>

      {/* Section 5: Biometrics & Emergency Contact */}
      <section className="hm-card" style={{ padding: '22px 24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <div style={{ borderBottom: '1px solid var(--surface-border)', paddingBottom: '12px' }}>
          <h2 style={{ fontSize: '1.15rem', margin: 0, fontWeight: '600' }}>Biometrics & Emergency Contact</h2>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: '2px 0 0' }}>
            Essential patient vitals and contact details for emergency responders and caregivers.
          </p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '14px' }}>
          <label style={{ display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
            Date of Birth
            <input
              type="date"
              name="dob"
              value={formData.dob}
              onChange={handleChange}
            />
          </label>

          <label style={{ display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
            Gender
            <select
              name="gender"
              value={formData.gender}
              onChange={handleChange}
            >
              <option value="">Select Gender</option>
              <option value="Male">Male</option>
              <option value="Female">Female</option>
              <option value="Other">Other</option>
            </select>
          </label>

          <label style={{ display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
            Blood Group
            <select
              name="bloodGroup"
              value={formData.bloodGroup}
              onChange={handleChange}
            >
              <option value="">Select Blood Group</option>
              {['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'].map((bg) => (
                <option key={bg} value={bg}>{bg}</option>
              ))}
            </select>
          </label>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
            <label style={{ display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
              Height (cm)
              <input
                type="number"
                name="height"
                value={formData.height}
                onChange={handleChange}
                placeholder="170"
              />
            </label>
            <label style={{ display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
              Weight (kg)
              <input
                type="number"
                name="weight"
                value={formData.weight}
                onChange={handleChange}
                placeholder="68"
              />
            </label>
          </div>
        </div>

        {/* Emergency Contact */}
        <div style={{ paddingTop: '8px', borderTop: '1px solid var(--surface-border)', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '14px' }}>
          <label style={{ display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
            Emergency Contact Name
            <input
              type="text"
              name="emergencyContactName"
              value={formData.emergencyContactName}
              onChange={handleChange}
              placeholder="e.g. Dr. Nair / Son Arjun"
            />
          </label>

          <label style={{ display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
            Emergency Phone
            <input
              type="tel"
              name="emergencyContactPhone"
              value={formData.emergencyContactPhone}
              onChange={handleChange}
              placeholder="+91 98100 00000"
            />
          </label>

          <label style={{ display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
            Relationship
            <select
              name="emergencyContactRelation"
              value={formData.emergencyContactRelation}
              onChange={handleChange}
            >
              <option value="">Select Relation</option>
              {['Spouse', 'Son', 'Daughter', 'Sibling', 'Parent', 'Doctor', 'Neighbor', 'Friend', 'Other'].map((r) => (
                <option key={r} value={r}>{r}</option>
              ))}
            </select>
          </label>
        </div>
      </section>

      {/* Save Button */}
      <button
        type="button"
        onClick={handleSave}
        disabled={saving}
        className="btn-cyber"
        style={{ padding: '14px', fontSize: '1rem', width: '100%' }}
      >
        {saving ? 'Saving Health Profile…' : '✓ Save Health Profile'}
      </button>

      {toastMessage && (
        <div className="toast" role="status">
          ✓ {toastMessage}
        </div>
      )}
    </div>
  );
}
