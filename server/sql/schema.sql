CREATE TYPE user_role AS ENUM ('patient', 'caregiver');
CREATE TYPE dose_status AS ENUM ('pending', 'taken', 'skipped', 'missed');
CREATE TYPE sos_status AS ENUM ('active', 'acknowledged', 'resolved');
CREATE TABLE users (id UUID PRIMARY KEY, name TEXT NOT NULL, role user_role NOT NULL, phone TEXT, email TEXT UNIQUE NOT NULL, password_hash TEXT NOT NULL, preferred_language VARCHAR(8) DEFAULT 'en', created_at TIMESTAMPTZ DEFAULT now());
CREATE TABLE patient_caregiver_links (id UUID PRIMARY KEY, patient_id UUID REFERENCES users(id) ON DELETE CASCADE, caregiver_id UUID REFERENCES users(id) ON DELETE CASCADE, permission_level TEXT DEFAULT 'view', invite_code TEXT, UNIQUE(patient_id, caregiver_id));
CREATE TABLE medications (id UUID PRIMARY KEY, patient_id UUID REFERENCES users(id) ON DELETE CASCADE, name TEXT NOT NULL, dosage TEXT NOT NULL, frequency_per_day INTEGER NOT NULL, times TIME[] NOT NULL, start_date DATE NOT NULL, end_date DATE, color TEXT);
CREATE TABLE dose_logs (id UUID PRIMARY KEY, medication_id UUID REFERENCES medications(id) ON DELETE CASCADE, scheduled_time TIMESTAMPTZ NOT NULL, status dose_status NOT NULL DEFAULT 'pending', responded_at TIMESTAMPTZ, response_method TEXT);
CREATE TABLE sos_events (id UUID PRIMARY KEY, patient_id UUID REFERENCES users(id) ON DELETE CASCADE, triggered_at TIMESTAMPTZ NOT NULL DEFAULT now(), latitude DECIMAL, longitude DECIMAL, status sos_status NOT NULL DEFAULT 'active');
CREATE TABLE doctors (id UUID PRIMARY KEY, patient_id UUID REFERENCES users(id) ON DELETE CASCADE, name TEXT NOT NULL, specialty TEXT, phone TEXT, notes TEXT);
CREATE TABLE chemists (id UUID PRIMARY KEY, patient_id UUID REFERENCES users(id) ON DELETE CASCADE, name TEXT NOT NULL, phone TEXT, address TEXT);
CREATE TABLE symptom_suggestions (id UUID PRIMARY KEY, symptom_tag TEXT UNIQUE NOT NULL, suggestion_text TEXT NOT NULL, disclaimer_text TEXT NOT NULL);
CREATE TABLE notifications (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  patient_id UUID REFERENCES users(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  channel TEXT NOT NULL DEFAULT 'in-app',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  read_at TIMESTAMPTZ
);
CREATE INDEX dose_logs_medication_scheduled_idx ON dose_logs (medication_id, scheduled_time);
CREATE INDEX notifications_user_created_idx ON notifications (user_id, created_at DESC);
