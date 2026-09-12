import React, { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { guidanceApi, medicationsApi, profileApi } from '../../api/index.js';
import { useSession } from '../../hooks/useSession.js';
import { useWorkspace } from '../../workspace/WorkspaceContext.jsx';

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
    gender: '',
    bloodGroup: '',
    height: '',
    weight: '',
    conditions: [],
    allergies: [],
    emergencyContactName: '',
    emergencyContactPhone: '',
    emergencyContactRelation: '',
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
            gender: data.gender || '',
            bloodGroup: data.bloodGroup || '',
            height: data.height || '',
            weight: data.weight || '',
            conditions: Array.isArray(data.conditions) ? data.conditions : [],
            allergies: Array.isArray(data.allergies) ? data.allergies : [],
            emergencyContactName: data.emergencyContactName || '',
            emergencyContactPhone: data.emergencyContactPhone || '',
            emergencyContactRelation: data.emergencyContactRelation || '',
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
      setScanStatusText('Analyzing medical receipt / prescription...');
      setScannedMedicines([]);
      setScannedAdvice('');

      try {
        setScanStatusText('Running Neural Optical Character Recognition...');
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
          color: '#00f2fe'
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
      <div className="p-8 text-center text-gray-400">
        <div className="text-2xl mb-2 animate-spin">✚</div>
        <p>Loading your clinical health profile...</p>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8 max-w-5xl mx-auto space-y-8 text-white pb-32">
      {/* Header Banner */}
      <div className="glass-matrix p-6 rounded-2xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border border-cyan-500/30">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-ping" />
            <span className="text-xs tracking-widest uppercase text-cyan-400 font-mono">Patient Clinical Onboarding</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight bg-gradient-to-r from-cyan-400 via-teal-300 to-indigo-400 bg-clip-text text-transparent">
            Health Profile & Prescription Hub
          </h1>
          <p className="text-sm text-gray-400 mt-1">
            Enter your medical conditions, upload diagnostic records, and scan prescription receipts to automatically synchronize medications.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleSave}
            disabled={saving}
            className="btn-cyber px-6 py-2.5 rounded-xl font-semibold shadow-lg shadow-cyan-500/20 disabled:opacity-50 flex items-center gap-2"
          >
            {saving ? 'Saving...' : '💾 Save Profile'}
          </button>
        </div>
      </div>

      {/* Section 1: Diagnosed Diseases & Chronic Conditions */}
      <section className="glass-matrix p-6 rounded-2xl space-y-5 border border-white/10">
        <div className="flex items-center justify-between border-b border-white/10 pb-3">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-violet-500/20 text-violet-400 flex items-center justify-center font-bold">
              ⚕
            </div>
            <div>
              <h2 className="text-lg font-semibold text-white">Medical Conditions & Diseases</h2>
              <p className="text-xs text-gray-400">Select any diagnosed conditions so Mitra AI can ensure strict clinical safety.</p>
            </div>
          </div>
          <span className="text-xs font-mono text-cyan-400 bg-cyan-400/10 px-2.5 py-1 rounded-full border border-cyan-400/20">
            {formData.conditions.length} Selected
          </span>
        </div>

        {/* Quick select condition chips */}
        <div className="flex flex-wrap gap-2.5">
          {COMMON_CONDITIONS.map((c) => {
            const isSelected = formData.conditions.includes(c);
            return (
              <button
                key={c}
                type="button"
                onClick={() => toggleCondition(c)}
                className={`px-3.5 py-2 rounded-xl text-sm font-medium transition-all duration-200 border ${
                  isSelected
                    ? 'bg-cyan-500/20 border-cyan-400 text-cyan-300 shadow-md shadow-cyan-500/20'
                    : 'bg-white/5 border-white/10 text-gray-300 hover:border-white/30 hover:bg-white/10'
                }`}
              >
                {isSelected ? '✓ ' : '+ '} {c}
              </button>
            );
          })}
        </div>

        {/* Custom conditions already added */}
        {formData.conditions.filter((c) => !COMMON_CONDITIONS.includes(c)).length > 0 && (
          <div className="flex flex-wrap gap-2 pt-2">
            <span className="text-xs text-gray-400 self-center">Other:</span>
            {formData.conditions
              .filter((c) => !COMMON_CONDITIONS.includes(c))
              .map((c) => (
                <span
                  key={c}
                  className="px-3 py-1 rounded-xl text-sm bg-violet-500/20 border border-violet-500/40 text-violet-200 flex items-center gap-2"
                >
                  {c}
                  <button
                    type="button"
                    onClick={() => removeCondition(c)}
                    className="text-violet-400 hover:text-white font-bold"
                  >
                    ×
                  </button>
                </span>
              ))}
          </div>
        )}

        {/* Input to add custom disease */}
        <div className="flex gap-2 pt-2">
          <input
            type="text"
            value={newCondition}
            onChange={(e) => setNewCondition(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && addCustomCondition(e)}
            placeholder="Type any other disease or health condition and press Enter..."
            className="flex-1 bg-[#080C15]/70 border border-white/15 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-cyan-400"
          />
          <button
            type="button"
            onClick={addCustomCondition}
            className="btn-glass px-5 py-2.5 rounded-xl text-sm font-medium text-cyan-300"
          >
            + Add Disease
          </button>
        </div>
      </section>

      {/* Section 2: Prescription & Medical Receipt Scanner (Auto-Add Medicines) */}
      <section className="glass-matrix p-6 rounded-2xl space-y-5 border border-cyan-500/30 shadow-lg shadow-cyan-500/5">
        <div className="flex items-center justify-between border-b border-white/10 pb-3">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-cyan-500/20 text-cyan-400 flex items-center justify-center font-bold">
              📷
            </div>
            <div>
              <h2 className="text-lg font-semibold text-white">Prescription & Receipt AI Scanner</h2>
              <p className="text-xs text-gray-400">Upload a pharmacy receipt or doctor's prescription. AI will transcribe and auto-add the medicines.</p>
            </div>
          </div>
          <span className="text-xs font-mono text-cyan-400 bg-cyan-400/10 px-2.5 py-1 rounded-full border border-cyan-400/20">
            Groq Vision + OCR
          </span>
        </div>

        {/* Upload Receipt Area */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="md:col-span-1 flex flex-col items-center justify-center p-6 border-2 border-dashed border-cyan-500/40 rounded-2xl bg-cyan-950/20 hover:bg-cyan-950/30 transition-all text-center">
            {scannerImage ? (
              <div className="w-full space-y-3">
                <img
                  src={scannerImage}
                  alt="Scanned Prescription"
                  className="w-full h-40 object-cover rounded-xl border border-white/20"
                />
                <button
                  type="button"
                  onClick={() => prescriptionInputRef.current?.click()}
                  className="btn-glass w-full py-2 rounded-lg text-xs text-cyan-300"
                >
                  Upload Different Photo
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="w-12 h-12 rounded-full bg-cyan-500/20 text-cyan-400 flex items-center justify-center text-2xl mx-auto">
                  🧾
                </div>
                <div>
                  <p className="text-sm font-medium text-white">Upload Receipt or Prescription</p>
                  <p className="text-xs text-gray-400 mt-1">PNG, JPG, or PDF snapshot</p>
                </div>
                <button
                  type="button"
                  onClick={() => prescriptionInputRef.current?.click()}
                  className="btn-cyber px-4 py-2 rounded-xl text-xs font-semibold text-white"
                >
                  Scan Document
                </button>
              </div>
            )}
            <input
              ref={prescriptionInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleScanPrescription}
            />
          </div>

          {/* Scanning / Results Area */}
          <div className="md:col-span-2 space-y-4">
            {scanning && (
              <div className="p-6 rounded-2xl bg-[#080C15]/80 border border-cyan-500/40 text-center space-y-3">
                <div className="w-8 h-8 rounded-full border-2 border-cyan-400 border-t-transparent animate-spin mx-auto" />
                <p className="text-sm font-medium text-cyan-300">{scanStatusText}</p>
                <p className="text-xs text-gray-500">Transcribing medicine names, dosages, and dosing frequencies...</p>
              </div>
            )}

            {!scanning && scannedMedicines.length > 0 && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-emerald-400 flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-400" />
                    Detected {scannedMedicines.length} Medicine(s)
                  </span>
                  {scannedDoctor && (
                    <span className="text-xs text-gray-400">Doctor: {scannedDoctor}</span>
                  )}
                </div>

                <div className="space-y-2.5 max-h-60 overflow-y-auto pr-1">
                  {scannedMedicines.map((med, idx) => (
                    <div
                      key={idx}
                      className="p-3.5 rounded-xl bg-white/5 border border-white/10 flex items-center justify-between gap-4"
                    >
                      <div>
                        <h4 className="text-sm font-semibold text-cyan-300">{med.name}</h4>
                        <div className="flex items-center gap-3 text-xs text-gray-400 mt-0.5">
                          <span>Dose: {med.dosage}</span>
                          <span>•</span>
                          <span>Freq: {med.frequencyPerDay || 1}x daily</span>
                          {med.instructions && (
                            <>
                              <span>•</span>
                              <span className="text-violet-300">{med.instructions}</span>
                            </>
                          )}
                        </div>
                      </div>
                      <span className="text-xs font-mono text-cyan-400 bg-cyan-400/10 px-2 py-1 rounded">
                        {Array.isArray(med.times) ? med.times.join(', ') : '08:00'}
                      </span>
                    </div>
                  ))}
                </div>

                {scannedAdvice && (
                  <div className="p-3 rounded-xl bg-violet-950/30 border border-violet-500/30 text-xs text-violet-200">
                    <strong>Dietary/Clinical Advice:</strong> {scannedAdvice}
                  </div>
                )}

                <button
                  type="button"
                  onClick={handleAddScannedMedicines}
                  disabled={addingMeds}
                  className="btn-cyber w-full py-3 rounded-xl font-semibold text-white shadow-lg shadow-cyan-500/20 flex items-center justify-center gap-2"
                >
                  {addingMeds ? 'Adding Medications...' : '⚡ Auto-Add All to Daily Medication Schedule'}
                </button>
              </div>
            )}

            {!scanning && scannedMedicines.length === 0 && !scannerImage && (
              <div className="h-full flex flex-col items-center justify-center p-6 text-center text-gray-500 border border-white/5 rounded-2xl bg-white/[0.02]">
                <p className="text-sm">No prescription scanned yet.</p>
                <p className="text-xs mt-1">Upload a photo of your receipt or prescription to automatically extract medicine names.</p>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Section 3: Medical Files & Diagnostic Reports */}
      <section className="glass-matrix p-6 rounded-2xl space-y-5 border border-white/10">
        <div className="flex items-center justify-between border-b border-white/10 pb-3">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-indigo-500/20 text-indigo-400 flex items-center justify-center font-bold">
              📁
            </div>
            <div>
              <h2 className="text-lg font-semibold text-white">Medical Reports & Health Records</h2>
              <p className="text-xs text-gray-400">Upload blood tests, MRI scans, lab reports, or hospital summaries.</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="btn-glass px-3.5 py-1.5 rounded-xl text-xs text-cyan-300"
          >
            + Upload Document
          </button>
          <input
            ref={fileInputRef}
            type="file"
            className="hidden"
            onChange={handleFileUpload}
          />
        </div>

        {formData.medicalFiles.length === 0 ? (
          <div className="p-6 text-center text-gray-500 border border-white/5 rounded-xl">
            <p className="text-sm">No health documents uploaded yet.</p>
            <p className="text-xs mt-1">Keep all your medical reports centralized and accessible for your caregivers.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {formData.medicalFiles.map((file) => (
              <div
                key={file.id}
                className="p-3.5 rounded-xl bg-white/5 border border-white/10 flex items-center justify-between gap-3"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-8 h-8 rounded-lg bg-cyan-500/10 text-cyan-400 flex items-center justify-center shrink-0">
                    📄
                  </div>
                  <div className="truncate">
                    <p className="text-sm font-medium text-white truncate">{file.name}</p>
                    <p className="text-xs text-gray-400">{file.size} • Uploaded {file.uploadedAt}</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => removeFile(file.id)}
                  className="text-gray-400 hover:text-red-400 p-1 font-bold"
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
      <section className="glass-matrix p-6 rounded-2xl space-y-5 border border-white/10">
        <div className="flex items-center justify-between border-b border-white/10 pb-3">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-rose-500/20 text-rose-400 flex items-center justify-center font-bold">
              ⚠
            </div>
            <div>
              <h2 className="text-lg font-semibold text-white">Drug & Food Allergies</h2>
              <p className="text-xs text-gray-400">Critical safety layer: Mitra warns immediately if a prescribed medication conflicts with your allergies.</p>
            </div>
          </div>
        </div>

        {/* Quick Allergy Chips */}
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs text-gray-400">Quick add:</span>
          {COMMON_ALLERGIES.map((a) => (
            <button
              key={a}
              type="button"
              onClick={() => addAllergy(a)}
              className="text-xs bg-white/5 border border-white/10 px-3 py-1.5 rounded-lg hover:bg-white/10 transition-colors text-gray-300"
            >
              + {a}
            </button>
          ))}
        </div>

        {/* Active Allergies Pill Box */}
        <div className="flex flex-wrap gap-2 min-h-[3rem] p-3 bg-[#080C15]/70 border border-white/15 rounded-xl items-center">
          {formData.allergies.map((a) => (
            <span
              key={a}
              className="px-3 py-1 rounded-xl text-sm bg-rose-500/20 border border-rose-500/50 text-rose-200 flex items-center gap-2"
            >
              {a}
              <button
                type="button"
                onClick={() => removeAllergy(a)}
                className="text-rose-300 hover:text-white font-bold"
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
            placeholder="Type allergy and press Enter..."
            className="flex-1 bg-transparent border-none outline-none text-white text-sm min-w-[200px] px-2"
          />
        </div>
      </section>

      {/* Section 5: Biometrics & Emergency Contact */}
      <section className="glass-matrix p-6 rounded-2xl space-y-5 border border-white/10">
        <div className="flex items-center gap-3 border-b border-white/10 pb-3">
          <div className="w-8 h-8 rounded-lg bg-teal-500/20 text-teal-400 flex items-center justify-center font-bold">
            👤
          </div>
          <div>
            <h2 className="text-lg font-semibold text-white">Personal Health Details & Emergency Contact</h2>
            <p className="text-xs text-gray-400">Used for dosage adjustments and SOS beacon routing.</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs text-gray-400">Date of Birth</label>
            <input
              type="date"
              name="dob"
              value={formData.dob}
              onChange={handleChange}
              className="bg-[#080C15]/70 border border-white/15 rounded-xl px-3.5 py-2 text-sm text-white focus:outline-none focus:border-cyan-400"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs text-gray-400">Gender</label>
            <select
              name="gender"
              value={formData.gender}
              onChange={handleChange}
              className="bg-[#080C15]/70 border border-white/15 rounded-xl px-3.5 py-2 text-sm text-white focus:outline-none focus:border-cyan-400"
            >
              <option value="">Select Gender</option>
              <option value="Male">Male</option>
              <option value="Female">Female</option>
              <option value="Other">Other</option>
            </select>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs text-gray-400">Blood Group</label>
            <select
              name="bloodGroup"
              value={formData.bloodGroup}
              onChange={handleChange}
              className="bg-[#080C15]/70 border border-white/15 rounded-xl px-3.5 py-2 text-sm text-white focus:outline-none focus:border-cyan-400"
            >
              <option value="">Select Blood Group</option>
              {['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'].map((bg) => (
                <option key={bg} value={bg}>{bg}</option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs text-gray-400">Height (cm)</label>
              <input
                type="number"
                name="height"
                value={formData.height}
                onChange={handleChange}
                placeholder="170"
                className="bg-[#080C15]/70 border border-white/15 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-cyan-400"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs text-gray-400">Weight (kg)</label>
              <input
                type="number"
                name="weight"
                value={formData.weight}
                onChange={handleChange}
                placeholder="68"
                className="bg-[#080C15]/70 border border-white/15 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-cyan-400"
              />
            </div>
          </div>
        </div>

        {/* Emergency Contact */}
        <div className="pt-2 border-t border-white/10 grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs text-gray-400">Emergency Contact Person</label>
            <input
              type="text"
              name="emergencyContactName"
              value={formData.emergencyContactName}
              onChange={handleChange}
              placeholder="e.g. Dr. Nair / Son Arjun"
              className="bg-[#080C15]/70 border border-white/15 rounded-xl px-3.5 py-2 text-sm text-white focus:outline-none focus:border-cyan-400"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs text-gray-400">Emergency Phone</label>
            <input
              type="tel"
              name="emergencyContactPhone"
              value={formData.emergencyContactPhone}
              onChange={handleChange}
              placeholder="+91 98100 00000"
              className="bg-[#080C15]/70 border border-white/15 rounded-xl px-3.5 py-2 text-sm text-white focus:outline-none focus:border-cyan-400"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs text-gray-400">Relationship</label>
            <select
              name="emergencyContactRelation"
              value={formData.emergencyContactRelation}
              onChange={handleChange}
              className="bg-[#080C15]/70 border border-white/15 rounded-xl px-3.5 py-2 text-sm text-white focus:outline-none focus:border-cyan-400"
            >
              <option value="">Select Relation</option>
              {['Spouse', 'Son', 'Daughter', 'Sibling', 'Parent', 'Doctor', 'Neighbor', 'Friend', 'Other'].map((r) => (
                <option key={r} value={r}>{r}</option>
              ))}
            </select>
          </div>
        </div>
      </section>

      {/* Big Save Button */}
      <button
        type="button"
        onClick={handleSave}
        disabled={saving}
        className="btn-cyber w-full py-4 rounded-2xl text-lg font-bold tracking-wide shadow-xl shadow-cyan-500/25 disabled:opacity-50"
      >
        {saving ? 'Saving Health Profile...' : '✓ Save Health Profile'}
      </button>

      {toastMessage && (
        <div className="fixed bottom-24 left-1/2 -translate-x-1/2 bg-cyan-950/90 border border-cyan-400 text-cyan-300 px-6 py-3 rounded-xl shadow-2xl backdrop-blur-md text-sm font-medium z-50">
          {toastMessage}
        </div>
      )}
    </div>
  );
}
