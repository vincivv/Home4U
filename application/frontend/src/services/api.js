import axios from 'axios';

// Use a reverse-proxy-relative base in production and the Vite proxy in development.
const API_BASE = import.meta.env.VITE_API_BASE || '/api';

// Create axios instance - relative path goes through Vite proxy in dev
const api = axios.create({
  baseURL: API_BASE,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add token to requests if available
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('access_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Auth API
export const authAPI = {
  signup: (email, password) => 
    api.post('/auth/signup', { email, password }),
  
  login: (email, password) => {
    const formData = new URLSearchParams();
    formData.append('username', email);
    formData.append('password', password);
    return api.post('/auth/login', formData, {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    });
  },
};

// Projects API
export const projectsAPI = {
  getAll: () => api.get('/projects/'),
  getById: (id) => api.get(`/projects/${id}`),
  getAnalysis: (id) => api.get(`/projects/${id}/analysis`),
  create: (room_type, name = null) => api.post('/projects/', { room_type, name }),
  update: (id, data) => api.put(`/projects/${id}`, data),
  delete: (id) => api.delete(`/projects/${id}`),
  uploadPhoto: (id, file) => {
    const formData = new FormData();
    formData.append('file', file);
    return api.post(`/projects/${id}/photo`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
  analyze: (id, data) => api.post(`/projects/${id}/analysis`, data),
};

// Styles API
export const stylesAPI = {
  getAll: () => api.get('/styles/'),
  getById: (id) => api.get(`/styles/${id}`),
  getTags: (styleId) => api.get(`/styles/${styleId}/tags`),
  getAllTags: () => api.get('/styles/tags/'),
};

// Search API
export const searchAPI = {
  searchStyles: (query, limit = 20, page = 1) =>
    api.get('/search/', { params: { q: query, limit, page } }),
};

// Recommendations API
export const recommendationsAPI = {
  getByProject: (projectId) => api.get(`/recommendations/project/${projectId}`),
  create: (projectId, data) => api.post(`/recommendations/?project_id=${projectId}`, data),
  markComplete: (id) => api.put(`/recommendations/${id}/complete`),
  generate: (projectId) => api.post(`/recommendations/generate/${projectId}`),
};

/** Lightweight health probe — backend exposes GET /health (proxied as /api/health in dev). */
export const healthAPI = {
  check: () => api.get('/health'),
};

export default api;
