-- Seed data for HealthMitra demo. Run after schema.sql.
-- Passwords are scrypt hashes of 'demo123' (same as memoryStore.js).

-- Generate deterministic UUIDs for demo data so invite codes and links work.
INSERT INTO users (id, name, role, email, phone, password_hash, preferred_language) VALUES
  ('00000000-0000-4000-a000-000000000001', 'Meera Shah',  'patient',   'meera@demo.health', '+919810000001',
   -- hash of 'demo123' — will be overwritten at startup by the seeder
   'seed:needs-rehash', 'en'),
  ('00000000-0000-4000-a000-000000000002', 'Arjun Shah',  'caregiver', 'arjun@demo.health', '+919810000002',
   'seed:needs-rehash', 'en'),
  ('00000000-0000-4000-a000-000000000003', 'Kavya Shah',  'caregiver', 'kavya@demo.health', '+919810000003',
   'seed:needs-rehash', 'hi')
ON CONFLICT (email) DO NOTHING;

INSERT INTO patient_caregiver_links (id, patient_id, caregiver_id, permission_level, invite_code) VALUES
  ('00000000-0000-4000-b000-000000000001',
   '00000000-0000-4000-a000-000000000001', '00000000-0000-4000-a000-000000000002', 'edit', 'MITRA-4821'),
  ('00000000-0000-4000-b000-000000000002',
   '00000000-0000-4000-a000-000000000001', '00000000-0000-4000-a000-000000000003', 'view', 'MITRA-4821')
ON CONFLICT DO NOTHING;

INSERT INTO medications (id, patient_id, name, dosage, frequency_per_day, times, start_date, end_date, color) VALUES
  ('00000000-0000-4000-c000-000000000001',
   '00000000-0000-4000-a000-000000000001', 'Metformin',   '500 mg',  2, '{08:00,20:00}', CURRENT_DATE, NULL, '#4f67d8'),
  ('00000000-0000-4000-c000-000000000002',
   '00000000-0000-4000-a000-000000000001', 'Amlodipine',  '5 mg',    1, '{09:00}',       CURRENT_DATE, NULL, '#e77b47'),
  ('00000000-0000-4000-c000-000000000003',
   '00000000-0000-4000-a000-000000000001', 'Vitamin D3',  '1000 IU', 1, '{13:00}',       CURRENT_DATE, NULL, '#2a9d8f')
ON CONFLICT DO NOTHING;

INSERT INTO doctors (id, patient_id, name, specialty, phone, notes) VALUES
  ('00000000-0000-4000-d000-000000000001',
   '00000000-0000-4000-a000-000000000001', 'Dr. R. Nair', 'General Physician', '+919812345678', 'Clinic hours: 10 AM - 1 PM')
ON CONFLICT DO NOTHING;

INSERT INTO chemists (id, patient_id, name, phone, address) VALUES
  ('00000000-0000-4000-e000-000000000001',
   '00000000-0000-4000-a000-000000000001', 'CarePlus Pharmacy', '+919898765432', '14, Lake Road, Mumbai')
ON CONFLICT DO NOTHING;

INSERT INTO alerts (id, patient_id, type, message, created_at, read_by) VALUES
  ('00000000-0000-4000-f000-000000000001',
   '00000000-0000-4000-a000-000000000001', 'info', 'Welcome back. Your medication plan is ready.', now(), '{}')
ON CONFLICT DO NOTHING;
