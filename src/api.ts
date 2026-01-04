import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

export const api = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Add JWT token to requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('authToken');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

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
    api.post('/quiz/ai/modify', { quiz, instruction, userId, questionCount })
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
    api.get('/user/leaderboard/global', { params })
};
