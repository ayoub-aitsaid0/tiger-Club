import axios from 'axios';

const API_URL = '/api/proxy';

const api = axios.create({
  baseURL: API_URL,
  headers: { 'Content-Type': 'application/json' },
});

// Strip trailing slashes to prevent Flask 308 redirects (which expose the raw backend IP)
api.interceptors.request.use((config) => {
  if (config.url) {
    // Split URL and query string, strip trailing slash from path only
    const [path, query] = config.url.split('?');
    const cleanPath = path.replace(/\/+$/, '');
    config.url = query ? `${cleanPath}?${query}` : cleanPath;
  }
  // Attach JWT token
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('token');
    if (token) config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle 401
api.interceptors.response.use(
  (res) => res,
  (error) => {
    if (error.response?.status === 401 && typeof window !== 'undefined') {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default api;
