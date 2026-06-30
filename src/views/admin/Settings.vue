<template>
  <div>
    <h2 style="margin-top: 0;">⚙️ 管理员设置</h2>

    <div class="admin-card">
      <h3 style="margin-top: 0;">修改我的密码</h3>
      <div style="max-width: 360px;">
        <div style="margin-bottom: 10px;"><label>当前密码：</label>
          <input type="password" v-model="pwd.current" style="width: 100%; padding: 6px;" />
        </div>
        <div style="margin-bottom: 10px;"><label>新密码（≥ 6 位）：</label>
          <input type="password" v-model="pwd.next" style="width: 100%; padding: 6px;" />
        </div>
        <div style="margin-bottom: 10px;"><label>确认新密码：</label>
          <input type="password" v-model="pwd.confirm" style="width: 100%; padding: 6px;" />
        </div>
        <button @click="changePwd" :disabled="changing">{{ changing ? '提交中…' : '修改密码' }}</button>
      </div>
    </div>

    <div class="admin-card">
      <h3 style="margin-top: 0;">添加新管理员</h3>
      <div style="display: flex; gap: 8px; align-items: end; max-width: 720px;">
        <div style="flex: 1;"><label>账号（3-20 位字母数字下划线）</label>
          <input v-model="newAdmin.username" style="width: 100%; padding: 6px;" placeholder="如 manager1" />
        </div>
        <div style="flex: 1;"><label>初始密码（≥ 6 位）</label>
          <input v-model="newAdmin.password" type="password" style="width: 100%; padding: 6px;" />
        </div>
        <div style="flex: 1;"><label>姓名</label>
          <input v-model="newAdmin.name" style="width: 100%; padding: 6px;" placeholder="如 张三" />
        </div>
        <button @click="addAdmin" :disabled="adding">{{ adding ? '添加中…' : '+ 添加' }}</button>
      </div>
    </div>

    <div class="admin-card">
      <h3 style="margin-top: 0;">管理员列表 ({{ list.length }})</h3>
      <table class="admin-tbl">
        <thead><tr><th>ID</th><th>账号</th><th>姓名</th><th>创建时间</th><th>状态</th><th>操作</th></tr></thead>
        <tbody>
          <tr v-for="a in list" :key="a.id">
            <td>{{ a.id }}</td>
            <td><b>{{ a.username }}</b><span v-if="a.id === me?.id" class="muted"> (我)</span></td>
            <td>{{ a.name }}</td>
            <td>{{ formatTime(a.created_at) }}</td>
            <td><span class="pill" :class="a.banned ? 'pill-r' : 'pill-g'">{{ a.banned ? '已停用' : '正常' }}</span></td>
            <td>
              <button @click="resetPwd(a)" v-if="a.id !== me?.id">重置密码</button>
              <button @click="del(a)" v-if="a.id !== me?.id && a.username !== 'admin'">删除</button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted, computed } from 'vue';
import { showSuccessToast, showFailToast, showConfirmDialog } from 'vant';
import api from '../../api';
import { useUserStore } from '../../stores/user';
import dayjs from 'dayjs';

const store = useUserStore();
const me = computed(() => store.user);

const pwd = reactive({ current: '', next: '', confirm: '' });
const changing = ref(false);
const newAdmin = reactive({ username: '', password: '', name: '' });
const adding = ref(false);
const list = ref([]);

function formatTime(t) { return dayjs(t).format('YYYY-MM-DD HH:mm'); }

async function load() {
  const { admins } = await api.get('/admin/admins');
  list.value = admins;
}

async function changePwd() {
  if (!pwd.current || !pwd.next) return showFailToast('请填写当前密码和新密码');
  if (pwd.next.length < 6) return showFailToast('新密码至少 6 位');
  if (pwd.next !== pwd.confirm) return showFailToast('两次新密码不一致');
  changing.value = true;
  try {
    await api.post('/auth/change-password', { current_password: pwd.current, new_password: pwd.next });
    showSuccessToast('密码已修改，下次登录请用新密码');
    pwd.current = ''; pwd.next = ''; pwd.confirm = '';
  } catch (e) {} finally { changing.value = false; }
}

async function addAdmin() {
  if (!newAdmin.username || !newAdmin.password) return showFailToast('请填写账号和密码');
  adding.value = true;
  try {
    await api.post('/admin/admins', { ...newAdmin });
    showSuccessToast('已添加管理员：' + newAdmin.username);
    newAdmin.username = ''; newAdmin.password = ''; newAdmin.name = '';
    await load();
  } catch (e) {} finally { adding.value = false; }
}

async function resetPwd(a) {
  const np = prompt(`为 ${a.username} 重置密码（≥ 6 位）：`);
  if (!np) return;
  await api.post(`/admin/admins/${a.id}/reset-password`, { new_password: np });
  showSuccessToast('密码已重置');
}

async function del(a) {
  try { await showConfirmDialog({ title: '删除管理员', message: `确认删除 ${a.username}？此操作不可恢复。` }); }
  catch (e) { return; }
  await api.delete(`/admin/admins/${a.id}`);
  showSuccessToast('已删除');
  await load();
}

onMounted(load);
</script>
