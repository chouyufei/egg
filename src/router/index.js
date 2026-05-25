import { createRouter, createWebHashHistory } from 'vue-router';
import { useUserStore } from '../stores/user';

const routes = [
  { path: '/', redirect: '/login' },
  { path: '/login', component: () => import('../views/common/Login.vue'), meta: { guest: true } },

  { path: '/farm', component: () => import('../views/farm/Home.vue'), meta: { role: 'farm' } },
  { path: '/farm/qualify', component: () => import('../views/farm/Qualify.vue'), meta: { role: 'farm' } },
  { path: '/farm/deposit', component: () => import('../views/farm/Deposit.vue'), meta: { role: 'farm' } },
  { path: '/farm/publish', component: () => import('../views/farm/Publish.vue'), meta: { role: 'farm' } },
  { path: '/farm/resources', component: () => import('../views/farm/MyResources.vue'), meta: { role: 'farm' } },
  { path: '/farm/resource/:id', component: () => import('../views/farm/ResourceDetail.vue'), meta: { role: 'farm' } },
  { path: '/farm/orders', component: () => import('../views/farm/Orders.vue'), meta: { role: 'farm' } },
  { path: '/farm/order/:id', component: () => import('../views/farm/OrderDetail.vue'), meta: { role: 'farm' } },
  { path: '/farm/messages', component: () => import('../views/common/Messages.vue'), meta: { role: 'farm' } },
  { path: '/farm/me', component: () => import('../views/farm/Me.vue'), meta: { role: 'farm' } },

  { path: '/buyer', component: () => import('../views/buyer/Home.vue'), meta: { role: 'buyer' } },
  { path: '/buyer/search', component: () => import('../views/buyer/Search.vue'), meta: { role: 'buyer' } },
  { path: '/buyer/resource/:id', component: () => import('../views/buyer/ResourceDetail.vue'), meta: { role: 'buyer' } },
  { path: '/buyer/deposit', component: () => import('../views/buyer/Deposit.vue'), meta: { role: 'buyer' } },
  { path: '/buyer/bids', component: () => import('../views/buyer/MyBids.vue'), meta: { role: 'buyer' } },
  { path: '/buyer/orders', component: () => import('../views/buyer/Orders.vue'), meta: { role: 'buyer' } },
  { path: '/buyer/order/:id', component: () => import('../views/buyer/OrderDetail.vue'), meta: { role: 'buyer' } },
  { path: '/buyer/messages', component: () => import('../views/common/Messages.vue'), meta: { role: 'buyer' } },
  { path: '/buyer/me', component: () => import('../views/buyer/Me.vue'), meta: { role: 'buyer' } },

  { path: '/admin', component: () => import('../views/admin/Shell.vue'), meta: { role: 'admin' },
    children: [
      { path: '', component: () => import('../views/admin/Dashboard.vue') },
      { path: 'users', component: () => import('../views/admin/Users.vue') },
      { path: 'resources', component: () => import('../views/admin/Resources.vue') },
      { path: 'deposits', component: () => import('../views/admin/Deposits.vue') },
      { path: 'disputes', component: () => import('../views/admin/Disputes.vue') },
    ],
  },
];

const router = createRouter({ history: createWebHashHistory(), routes });

router.beforeEach((to) => {
  const store = useUserStore();
  if (to.meta.guest) return true;
  if (!store.isAuthed) return '/login';
  if (to.meta.role && to.meta.role !== store.role) {
    if (store.role === 'farm') return '/farm';
    if (store.role === 'buyer') return '/buyer';
    if (store.role === 'admin') return '/admin';
  }
  return true;
});

export default router;
