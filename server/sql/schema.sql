CREATE TYPE user_role AS ENUM ('patient', 'caregiver');
CREATE TYPE dose_status AS ENUM ('pending', 'taken', 'skipped', 'missed');
CREATE TYPE sos_status AS ENUM ('active', 'acknowledged', 'resolved');

CREATE TABLE users (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name            TEXT NOT NULL,
  role            user_role NOT NULL,
  phone           TEXT,
  email           TEXT UNIQUE NOT NULL,
  password_hash   TEXT NOT NULL,
  preferred_language VARCHAR(8) DEFAULT 'en',
  dob             DATE,
  gender          TEXT,
  blood_group     TEXT,
  height          NUMERIC,
  weight          NUMERIC,
  conditions      TEXT[] DEFAULT '{}',
  allergies       TEXT[] DEFAULT '{}',
  emergency_contact_name TEXT,
  emergency_contact_phone TEXT,
  emergency_contact_relation TEXT,
  medical_files   JSONB DEFAULT '[]'::jsonb,
  profile_complete BOOLEAN DEFAULT false,
  created_at      TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE patient_caregiver_links (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id       UUID REFERENCES users(id) ON DELETE CASCADE,
  caregiver_id     UUID REFERENCES users(id) ON DELETE CASCADE,
  permission_level TEXT DEFAULT 'view',
  invite_code      TEXT,
  UNIQUE(patient_id, caregiver_id)
);

CREATE TABLE medications (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id        UUID REFERENCES users(id) ON DELETE CASCADE,
  name              TEXT NOT NULL,
  dosage            TEXT NOT NULL,
  frequency_per_day INTEGER NOT NULL,
  times             TIME[] NOT NULL,
  start_date        DATE NOT NULL,
  end_date          DATE,
  color             TEXT
);

CREATE TABLE dose_logs (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  medication_id       UUID REFERENCES medications(id) ON DELETE CASCADE,
  scheduled_time      TIMESTAMPTZ NOT NULL,
  status              dose_status NOT NULL DEFAULT 'pending',
  responded_at        TIMESTAMPTZ,
  response_method     TEXT,
  reminder_sent_at    TIMESTAMPTZ,
  missed_alert_sent_at TIMESTAMPTZ
);

CREATE TABLE alerts (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id  UUID REFERENCES users(id) ON DELETE CASCADE,
  type        TEXT NOT NULL,
  message     TEXT NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  read_by     TEXT[] DEFAULT '{}',
  dose_log_id UUID,
  sos_id      UUID,
  location_url TEXT
);

CREATE TABLE sos_events (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id   UUID REFERENCES users(id) ON DELETE CASCADE,
  triggered_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  latitude     DECIMAL,
  longitude    DECIMAL,
  location_url TEXT,
  status       sos_status NOT NULL DEFAULT 'active',
  updated_at   TIMESTAMPTZ
);

CREATE TABLE doctors (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID REFERENCES users(id) ON DELETE CASCADE,
  name       TEXT NOT NULL,
  specialty  TEXT,
  phone      TEXT,
  notes      TEXT
);

CREATE TABLE chemists (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID REFERENCES users(id) ON DELETE CASCADE,
  name       TEXT NOT NULL,
  phone      TEXT,
  address    TEXT
);

CREATE TABLE symptom_suggestions (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  symptom_tag     TEXT UNIQUE NOT NULL,
  suggestion_text TEXT NOT NULL,
  disclaimer_text TEXT NOT NULL
);

CREATE TABLE notifications (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID REFERENCES users(id) ON DELETE CASCADE,
  patient_id  UUID REFERENCES users(id) ON DELETE CASCADE,
  type        TEXT NOT NULL,
  title       TEXT NOT NULL,
  body        TEXT NOT NULL,
  channel     TEXT NOT NULL DEFAULT 'in-app',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  read_at     TIMESTAMPTZ,
  alert_id    UUID,
  dose_log_id UUID
);

CREATE INDEX dose_logs_medication_scheduled_idx ON dose_logs (medication_id, scheduled_time);
CREATE INDEX notifications_user_created_idx ON notifications (user_id, created_at DESC);
CREATE INDEX alerts_patient_created_idx ON alerts (patient_id, created_at DESC);
CREATE INDEX sos_events_patient_idx ON sos_events (patient_id, triggered_at DESC);
