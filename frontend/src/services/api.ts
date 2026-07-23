import axios from 'axios';

// Use environment variable or fallback to relative path
const API_BASE = import.meta.env.VITE_API_URL || '/api';

const api = axios.create({
  baseURL: API_BASE,
  headers: { 'Content-Type': 'application/json' },
  timeout: 30000, // 30s -- generous enough for a genuine Render cold start,
                  // but still surfaces a clear error/retry instead of hanging forever
});

// --- Cold-start detection -------------------------------------------------
// Render's free tier spins the backend down after ~15 min idle. The first
// request after that can take 30-60s to wake it back up. Rather than let
// the UI look frozen/broken, we fire a global event once any request has
// been pending for a while, so a banner can tell the user what's happening.
const SLOW_REQUEST_THRESHOLD_MS = 2500;
let pendingSlowRequests = 0;

api.interceptors.request.use((config) => {
  const timerId = window.setTimeout(() => {
    pendingSlowRequests += 1;
    window.dispatchEvent(new CustomEvent('coldstart:show'));
  }, SLOW_REQUEST_THRESHOLD_MS);
  // Stash the timer on the config so the response interceptor can clear it
  (config as typeof config & { _coldStartTimer?: number })._coldStartTimer = timerId;
  return config;
});

function clearColdStartTimer(config: unknown) {
  const timerId = (config as { _coldStartTimer?: number })?._coldStartTimer;
  if (timerId === undefined) return;
  window.clearTimeout(timerId);
}

function maybeHideBanner() {
  if (pendingSlowRequests > 0) {
    pendingSlowRequests -= 1;
    if (pendingSlowRequests === 0) {
      window.dispatchEvent(new CustomEvent('coldstart:hide'));
    }
  }
}
// ---------------------------------------------------------------------------

// Add JWT token to requests
api.interceptors.request.use((config) => {
  const token = sessionStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle 401 responses, and automatically retry safe (GET) requests that
// fail due to a cold-starting backend. POST/PUT/DELETE are deliberately
// NOT auto-retried here -- if one of those already reached the server
// before the client saw a failure, blindly retrying could cause a
// duplicate side effect (e.g. two diagnosis records saved). GET requests
// have no such risk, and covers the vast majority of "had to hard refresh"
// situations, since those happen mostly on page load.
const MAX_RETRIES = 2;
const RETRY_DELAY_MS = 4000;

function isRetryableError(error: unknown): boolean {
  const err = error as { config?: { method?: string }; response?: { status?: number }; code?: string };
  const method = err.config?.method?.toLowerCase();
  if (method !== 'get') return false;
  // No response at all = network/connection-level failure (likely mid-wake-up)
  if (!err.response) return true;
  // Gateway-type errors are what Render's proxy returns while the app is
  // still starting up, before it can even reach your Flask code
  const status = err.response.status;
  return status === 502 || status === 503 || status === 504;
}

api.interceptors.response.use(
  (response) => {
    clearColdStartTimer(response.config);
    maybeHideBanner();
    return response;
  },
  async (error) => {
    clearColdStartTimer(error.config);

    if (isRetryableError(error)) {
      const config = error.config as typeof error.config & { _retryCount?: number };
      config._retryCount = (config._retryCount || 0) + 1;
      if (config._retryCount <= MAX_RETRIES) {
        maybeHideBanner();
        await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY_MS));
        return api(config);
      }
    }

    maybeHideBanner();
    if (error.response?.status === 401) {
      sessionStorage.removeItem('token');
      sessionStorage.removeItem('user');
      const onAdminPortal = window.location.pathname.startsWith('/admin');
      window.location.href = onAdminPortal ? '/admin/login' : '/login';
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
  login: (username: string, password: string, captcha_token: string, captcha_answer: string, portal?: string) =>
    api.post('/auth/login', { username, password, captcha_token, captcha_answer, portal }),
  adminLogin: (username: string, password: string, captcha_token: string, captcha_answer: string) =>
    api.post('/auth/admin-login', { username, password, captcha_token, captcha_answer }),
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
  linkPatient: (patient_code: string) =>
    api.post('/admin/link-patient', { patient_code }),
  unlinkPatient: (patient_code: string) =>
    api.delete('/admin/link-patient', { data: { patient_code } }),
};

// Patients
export const patientsAPI = {
  list: (page = 1, search = '') =>
    api.get(`/patients?page=${page}&search=${search}`),
  get: (id: number) => api.get(`/patients/${id}`),
  me: () => api.get('/patients/me'),
  create: (data: Record<string, unknown>) => api.post('/patients', data),
  update: (id: number, data: Record<string, unknown>) => api.put(`/patients/${id}`, data),
  delete: (id: number) => api.delete(`/patients/${id}`),
};

// Diagnosis
export const diagnosisAPI = {
  heart: (features: Record<string, number>, patientId?: string) =>
    api.post('/diagnosis/heart', { features, patient_id: patientId }),
  diabetes: (features: Record<string, number>, patientId?: string) =>
    api.post('/diagnosis/diabetes', { features, patient_id: patientId }),
  cancer: (features: Record<string, number>, patientId?: string) =>
    api.post('/diagnosis/cancer', { features, patient_id: patientId }),
  multi: (data: Record<string, unknown>) =>
    api.post('/diagnosis/multi', data),
  history: (patientId: number) =>
    api.get(`/diagnosis/history/${patientId}`),
  myHistory: () => api.get('/diagnosis/my-history'),
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