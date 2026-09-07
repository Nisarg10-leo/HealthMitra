import { del, get, post, put } from './client.js';

// One function per backend capability. Components never build URLs.
const patientQuery = (patientId) => `?patient_id=${encodeURIComponent(patientId)}`;

export const authApi = {
  login: (email, password) => post('/auth/login', { email, password }),
  register: (form, role) => post('/auth/register', { ...form, role })
};

export const patientsApi = {
  list: () => get('/patients'),
  dashboard: (patientId) => get(`/dashboard${patientQuery(patientId)}`),
  linkCaregiver: (patientId, email, permissionLevel) => post(`/patients/${patientId}/link-caregiver`, { email, permissionLevel }),
  joinWithCode: (code) => post('/links/join', { code }),
  reassure: (patientId) => post(`/patients/${patientId}/reassure`)
};

export const medicationsApi = {
  create: (payload) => post('/medications', payload),
  update: (id, payload) => put(`/medications/${id}`, payload),
  remove: (id) => del(`/medications/${id}`)
};

export const dosesApi = {
  confirm: (doseLogId, status, method = 'tap') => post(`/dose-logs/${doseLogId}/confirm`, { status, method })
};

export const alertsApi = {
  list: () => get('/alerts'),
  markRead: (id) => post(`/alerts/${id}/read`),
  notifications: () => get('/notifications'),
  markNotificationRead: (id) => post(`/notifications/${id}/read`)
};

export const sosApi = {
  trigger: (patientId, coords) => post('/sos', { patientId, latitude: coords?.latitude, longitude: coords?.longitude }),
  list: (patientId) => get(`/sos${patientQuery(patientId)}`),
  updateStatus: (id, status) => put(`/sos/${id}`, { status })
};

export const contactsApi = {
  list: (type, patientId) => get(`/${type}${patientQuery(patientId)}`),
  create: (type, payload) => post(`/${type}`, payload)
};

export const safetyApi = {
  advisory: (patientId, language = 'en') => get(`/safety/advisory?language=${encodeURIComponent(language)}${patientId ? `&patient_id=${encodeURIComponent(patientId)}` : ''}`)
};

export const guidanceApi = {
  symptom: (symptom, severe, language) => get(`/symptom-suggestions?symptom=${encodeURIComponent(symptom)}&severe=${severe}&language=${language}`),
  voiceIntent: (transcript) => post('/voice/intent', { transcript })
};
