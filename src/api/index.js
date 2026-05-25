import axios from 'axios';
import { showFailToast } from 'vant';

const api = axios.create({ baseURL: '/api', timeout: 15000 });

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (res) => res.data,
  (err) => {
    const msg = err.response?.data?.error || err.message || '请求失败';
    if (err.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      if (!location.hash.includes('/login')) {
        location.hash = '#/login';
      }
    }
    showFailToast(msg);
    return Promise.reject(new Error(msg));
  },
);

export default api;
