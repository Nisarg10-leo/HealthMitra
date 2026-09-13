import { del, get, post, put } from './client.js';

// One function per backend capability. Components never build URLs.
const patientQuery = (patientId) => `?patient_id=${encodeURIComponent(patientId)}`;

export const authApi = {
  login: (email, password) => post('/auth/login', { email, password }),
  register: (form, role) => post('/auth/register', { ...form, role }),
  forgotPassword: (email) => post('/auth/forgot-password', { email }),
  resetPassword: (email, otp, newPassword) => post('/auth/reset-password', { email, otp, newPassword })
};

export const patientsApi = {
  list: () => get('/patients'),
  dashboard: (patientId) => get(`/dashboard${patientQuery(patientId)}`),
  linkCaregiver: (patientId, email, permissionLevel) => post(`/patients/${patientId}/link-caregiver`, { email, permissionLevel }),
  joinWithCode: (code) => post('/links/join', { code }),
  reassure: (patientId) => post(`/patients/${patientId}/reassure`),
  getInviteCode: (patientId) => get(`/patients/${patientId}/invite-code`)
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
  list: (patientId) => get(`/alerts${patientId ? patientQuery(patientId) : ''}`),
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
  symptom: (symptom, severe, language, patientId) =>
    get(`/symptom-suggestions?symptom=${encodeURIComponent(symptom)}&severe=${Boolean(severe)}&language=${language || 'en'}${patientId ? `&patientId=${encodeURIComponent(patientId)}` : ''}`),
  symptomAi: (payload) => post('/support/symptom-ai', payload),
  voiceIntent: (transcript) => post('/voice/intent', { transcript }),
  askMitra: (question, language = 'en', image = null) => post('/support/ask-mitra', { question, language, image }),
  scanPrescription: (payload) => post('/support/scan-prescription', payload)
};

export const profileApi = {
  get: () => get('/profile'),
  update: (data) => put('/profile', data)
};

export const checkupApi = {
  list: (patientId) => get(`/patients/${patientId}/checkups`),
  create: (patientId, payload) => post(`/patients/${patientId}/checkup`, payload),
  request: (patientId) => post(`/patients/${patientId}/request-checkup`)
};

export const caregiversApi = {
  list: () => get('/caregivers')
};
