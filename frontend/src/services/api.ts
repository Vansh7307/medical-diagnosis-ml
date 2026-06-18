import axios from 'axios';

const API_BASE = '/api';

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
export const authAPI = {
  login: (username: string, password: string) =>
    api.post('/auth/login', { username, password }),
  register: (data: { username: string; email: string; password: string; full_name?: string }) =>
    api.post('/auth/register', data),
  getProfile: () => api.get('/auth/profile'),
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
