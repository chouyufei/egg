import { createApp } from 'vue';
import { createPinia } from 'pinia';
import Vant, { Lazyload, Toast, ConfigProvider } from 'vant';
import 'vant/lib/index.css';
import App from './App.vue';
import router from './router';
import { useUserStore } from './stores/user';
import './styles.css';

const app = createApp(App);
app.use(createPinia());
app.use(router);
app.use(Vant);
app.use(Lazyload);
app.component('VanConfigProvider', ConfigProvider);

const userStore = useUserStore();
userStore.restore();

app.mount('#app');
