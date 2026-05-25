import { defineStore } from 'pinia';
import api from '../api';

export const useUserStore = defineStore('user', {
  state: () => ({
    user: null,
    token: null,
    depositStatus: null,
    unreadCount: 0,
  }),
  getters: {
    isAuthed: (s) => !!s.token,
    role: (s) => s.user?.role,
    isFarm: (s) => s.user?.role === 'farm',
    isBuyer: (s) => s.user?.role === 'buyer',
    isAdmin: (s) => s.user?.role === 'admin',
  },
  actions: {
    restore() {
      const t = localStorage.getItem('token');
      const u = localStorage.getItem('user');
      if (t && u) {
        this.token = t;
        try { this.user = JSON.parse(u); } catch (e) {}
      }
    },
    async login(phone, otp, role, name) {
      const { token, user } = await api.post('/auth/login', { phone, otp, role, name });
      this.token = token;
      this.user = user;
      localStorage.setItem('token', token);
      localStorage.setItem('user', JSON.stringify(user));
      return user;
    },
    logout() {
      this.user = null;
      this.token = null;
      localStorage.removeItem('token');
      localStorage.removeItem('user');
    },
    async refresh() {
      const { user } = await api.get('/auth/me');
      this.user = user;
      localStorage.setItem('user', JSON.stringify(user));
    },
    async loadDepositStatus() {
      if (!this.token) return;
      this.depositStatus = await api.get('/deposits/status');
    },
    async loadUnread() {
      if (!this.token) return;
      try {
        const { count } = await api.get('/messages/unread-count');
        this.unreadCount = count;
      } catch (e) {}
    },
  },
});
