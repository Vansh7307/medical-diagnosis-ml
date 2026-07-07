import axios from 'axios';

// Use environment variable or fallback to relative path
const API_BASE = import.meta.env.VITE_API_URL || '/api';

const api = axios.create({
  baseURL: API_BASE,
  headers: { 'Content-Type': 'application/json' },
});

// Add JWT token to requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle 401 responses
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// Auth
export interface CaptchaChallenge {
  question: string;
  captcha_token: string;
}

export const authAPI = {
  getCaptcha: () => api.get<CaptchaChallenge>('/auth/captcha'),
  login: (username: string, password: string, captcha_token: string, captcha_answer: string) =>
    api.post('/auth/login', { username, password, captcha_token, captcha_answer }),
  register: (data: {
    username: string;
    email: string;
    password: string;
    full_name?: string;
    captcha_token: string;
    captcha_answer: string;
  }) => api.post('/auth/register', data),
  verifyOtp: (username: string, otp_code: string) =>
    api.post('/auth/verify-otp', { username, otp_code }),
  resendOtp: (username: string) =>
    api.post('/auth/resend-otp', { username }),
  forgotPassword: (email: string, captcha_token: string, captcha_answer: string) =>
    api.post('/auth/forgot-password', { email, captcha_token, captcha_answer }),
  resetPassword: (email: string, otp_code: string, new_password: string) =>
    api.post('/auth/reset-password', { email, otp_code, new_password }),
  getProfile: () => api.get('/auth/profile'),
};

// Admin
export const adminAPI = {
  listUsers: (page = 1, search = '', role = '') =>
    api.get(`/admin/users?page=${page}&search=${encodeURIComponent(search)}&role=${encodeURIComponent(role)}`),
  getUser: (id: number) => api.get(`/admin/users/${id}`),
  updateRole: (id: number, role: string) => api.put(`/admin/users/${id}/role`, { role }),
  updateStatus: (id: number, is_active: boolean) => api.put(`/admin/users/${id}/status`, { is_active }),
  loginHistory: (page = 1) => api.get(`/admin/login-history?page=${page}`),
  stats: () => api.get('/admin/stats'),
};

// Patients
export const patientsAPI = {
  list: (page = 1, search = '') =>
    api.get(`/patients?page=${page}&search=${search}`),
  get: (id: number) => api.get(`/patients/${id}`),
  create: (data: Record<string, unknown>) => api.post('/patients', data),
  update: (id: number, data: Record<string, unknown>) => api.put(`/patients/${id}`, data),
  delete: (id: number) => api.delete(`/patients/${id}`),
};

// Diagnosis
export const diagnosisAPI = {
  heart: (features: Record<string, number>, patientId?: number) =>
    api.post('/diagnosis/heart', { features, patient_id: patientId }),
  diabetes: (features: Record<string, number>, patientId?: number) =>
    api.post('/diagnosis/diabetes', { features, patient_id: patientId }),
  cancer: (features: Record<string, number>, patientId?: number) =>
    api.post('/diagnosis/cancer', { features, patient_id: patientId }),
  multi: (data: Record<string, unknown>) =>
    api.post('/diagnosis/multi', data),
  history: (patientId: number) =>
    api.get(`/diagnosis/history/${patientId}`),
  models: () => api.get('/diagnosis/models'),
};

// Analytics
export const analyticsAPI = {
  dashboard: () => api.get('/analytics/dashboard'),
  models: () => api.get('/analytics/models'),
  evaluation: (type: string) => api.get(`/analytics/evaluation/${type}`),
  drift: () => api.get('/analytics/drift'),
};

export default api;
