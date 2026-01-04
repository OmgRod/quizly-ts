import axios from 'axios';

// Use relative URLs in production, or environment variable if provided
const getApiBaseUrl = () => {
  if (import.meta.env.VITE_API_URL) {
    return import.meta.env.VITE_API_URL;
  }
  // In production, use relative URLs (same origin)
  if (import.meta.env.PROD) {
    return '/api';
  }
  // In development, use localhost
  return 'http://localhost:3001/api';
};

const API_BASE_URL = getApiBaseUrl();

// Store CSRF token
let csrfToken: string | null = null;

export const api = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Fetch CSRF token from server
export const fetchCsrfToken = async (): Promise<string> => {
  try {
    const response = await axios.get(`${API_BASE_URL}/csrf-token`, {
      withCredentials: true
    });
    csrfToken = response.data.csrfToken;
    return csrfToken;
  } catch (error) {
    console.error('Failed to fetch CSRF token:', error);
    throw error;
  }
};

// Initialize CSRF token on app load
fetchCsrfToken().catch(err => console.error('Initial CSRF token fetch failed:', err));

// Add JWT token and CSRF token to requests
api.interceptors.request.use(async (config) => {
  // Don't add JWT token - session cookie is sent automatically with withCredentials: true
  // Only add CSRF token for state-changing requests
  if (config.method && !['get', 'head', 'options'].includes(config.method.toLowerCase())) {
    if (!csrfToken) {
      // Try to fetch token if we don't have one
      try {
        await fetchCsrfToken();
      } catch (err) {
        console.error('Failed to fetch CSRF token:', err);
      }
    }
    if (csrfToken) {
      config.headers['X-CSRF-Token'] = csrfToken;
    }
  }
  
  return config;
});

// Handle CSRF token errors
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    // If we get a 403 (Forbidden) error, it might be due to invalid CSRF token
    if (error.response?.status === 403 && error.config && !error.config._retry) {
      error.config._retry = true;
      
      try {
        // Fetch a new CSRF token
        await fetchCsrfToken();
        
        // Retry the original request with new token
        if (csrfToken) {
          error.config.headers['X-CSRF-Token'] = csrfToken;
        }
        return api.request(error.config);
      } catch (err) {
        console.error('Failed to refresh CSRF token:', err);
      }
    }
    
    return Promise.reject(error);
  }
);

// Auth endpoints
export const authAPI = {
  login: (username: string, password: string) => 
    api.post('/auth/login', { username, password }),
  
  register: (username: string, password: string) => 
    api.post('/auth/register', { username, password }),
  
  logout: () => 
    api.post('/auth/logout'),
  
  getCurrentUser: () => 
    api.get('/auth/me')
};

// Quiz endpoints
export const quizAPI = {
  getAll: (params?: { genre?: string; search?: string; userId?: string }) => 
    api.get('/quiz', { params }),
  getById: (id: string) => 
    api.get(`/quiz/${id}`),
  create: (quiz: any) => 
    api.post('/quiz', quiz),
  update: (id: string, quiz: any) => 
    api.put(`/quiz/${id}`, quiz),
  delete: (id: string) => 
    api.delete(`/quiz/${id}`),
  incrementPlayCount: (id: string) => 
    api.post(`/quiz/${id}/play`),
  // AI generation endpoints
  generateFromAI: (topic: string, count: number, userId?: string) => 
    api.post('/quiz/ai/generate', { topic, count, userId }),
  modifyWithAI: (quiz: any, instruction: string, userId?: string, questionCount?: number) => 
    api.post('/quiz/ai/modify', { quiz, instruction, userId, questionCount }),
  // Reset all quizzes and quiz history for the current user
  resetAllUserQuizData: () =>
    api.post('/user/reset-quiz-data')
};

// Game endpoints
export const gameAPI = {
  create: (quizId: string, solo?: boolean) => 
    api.post('/game/create', { quizId, solo }),
  
  join: (pin: string, playerName: string, userId?: string) => 
    api.post('/game/join', { pin, playerName, userId }),
  
  getByPin: (pin: string) => 
    api.get(`/game/${pin}`),
  
  update: (pin: string, data: any) => 
    api.put(`/game/${pin}`, data),
  
  end: (pin: string, players: any[]) => 
    api.post(`/game/${pin}/end`, { players })
};

// User endpoints
export const userAPI = {
  getProfile: (id: string) => 
    api.get(`/user/${id}`),
  updateProfile: (data: any) => 
    api.put('/user/profile', data),
  deleteAccount: () => 
    api.delete('/user/account'),
  getQuizzes: (id: string) => 
    api.get(`/user/${id}/quizzes`),
  getGlobalLeaderboard: (params?: { limit?: number; offset?: number; type?: 'xp' | 'coins' | 'points' }) => 
    api.get('/user/leaderboard/global', { params }),
  acceptLegalUpdates: (tosVersion: string, privacyVersion: string) =>
    api.post('/user/accept-legal', { tosVersion, privacyVersion }),
  // Log out all sessions except current
  logoutAllSessions: () =>
    api.post('/user/logout-all')
};

export default api;
