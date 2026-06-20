// ===== API 请求封装 =====
const defaultApiBase = `${location.protocol}//${location.hostname}:3000/api`;
const API_BASE = localStorage.getItem('apiBase') || defaultApiBase;
let currentUser = JSON.parse(localStorage.getItem('user') || '{}');

async function api(path, options = {}) {
  const headers = { 'Content-Type': 'application/json', ...options.headers };
  const token = localStorage.getItem('token');
  if (token) headers.Authorization = 'Bearer ' + token;
  const res = await fetch(API_BASE + path, { method: options.method || 'GET', headers, body: options.body ? JSON.stringify(options.body) : undefined });
  if (res.status === 401) { localStorage.removeItem('token'); localStorage.removeItem('user'); showLogin(); throw new Error('未登录'); }
  if (res.status === 204) return null;
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || '请求失败');
  return data;
}
function roleLabel(role) {
  return { super_admin: '超级管理员', user: '普通用户', admin: '库管理员', manager: '经理', editor: '编辑', viewer: '只读' }[role] || role || '-';
}
function escapeHtml(s = '') {
  return String(s).replace(/[&<>'"]/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[ch]));
}
function toast(msg, type = 'info') {
  const el = document.getElementById('toast');
  el.textContent = msg;
  el.className = 'toast show ' + type;
  setTimeout(() => el.classList.remove('show'), 2500);
}
function openModal(title, bodyHtml, size = '') {
  const modal = document.getElementById('modal');
  modal.className = 'modal ' + size;
  document.getElementById('modal-title').textContent = title;
  document.getElementById('modal-body').innerHTML = bodyHtml;
  document.getElementById('modal-overlay').style.display = 'block';
  modal.style.display = 'block';
}
function closeModal() {
  document.getElementById('modal-overlay').style.display = 'none';
  document.getElementById('modal').style.display = 'none';
}
function confirmLayer({ title = '确认操作', message = '', okText = '确认', cancelText = '取消', tone = 'neutral', onOk }) {
  openModal(title, `
    <div class="confirm-box ${tone}">
      <div class="confirm-icon">${tone === 'soft' ? '🧹' : '💡'}</div>
      <div class="confirm-message">${message}</div>
    </div>
    <div class="modal-footer compact">
      <button class="btn btn-muted" onclick="closeModal()">${cancelText}</button>
      <button class="btn btn-primary" id="confirm-ok-btn">${okText}</button>
    </div>`);
  document.getElementById('confirm-ok-btn').onclick = async () => {
    try { await onOk?.(); closeModal(); } catch (e) { toast(e.message, 'error'); }
  };
}
function showLogin() { document.getElementById('login-page').style.display = 'flex'; document.getElementById('main-page').style.display = 'none'; }
function showMain() { document.getElementById('login-page').style.display = 'none'; document.getElementById('main-page').style.display = 'flex'; }
async function doLogin() {
  const username = document.getElementById('login-user').value.trim();
  const password = document.getElementById('login-pass').value;
  const errEl = document.getElementById('login-error');
  if (!username || !password) { errEl.textContent = '请输入用户名和密码'; errEl.style.display = 'block'; return; }
  try {
    const res = await api('/auth/login', { method: 'POST', body: { username, password } });
    currentUser = res.user;
    localStorage.setItem('token', res.token);
    localStorage.setItem('user', JSON.stringify(res.user));
    errEl.style.display = 'none';
    showMain();
    document.getElementById('user-info').textContent = res.user.nickname || res.user.username;
    switchPage('dashboard');
  } catch (e) { errEl.textContent = e.message; errEl.style.display = 'block'; }
}
function doLogout() { localStorage.removeItem('token'); localStorage.removeItem('user'); currentUser = {}; showLogin(); }
function switchPage(name) {
  document.querySelectorAll('.nav-item').forEach(el => el.classList.toggle('active', el.dataset.page === name));
  document.querySelectorAll('.page-content').forEach(el => el.classList.remove('active'));
  document.getElementById('page-' + name).classList.add('active');
  const fns = { dashboard: loadDashboard, libraries: loadLibraries, cards: loadCards, duplicates: loadDuplicates, import: loadImport, settings: loadSettings };
  fns[name]?.();
}
async function loadDashboard() {
  const el = document.getElementById('page-dashboard');
  el.innerHTML = '<div class="loading">加载中...</div>';
  try {
    const [me, libs, cards] = await Promise.all([api('/auth/me'), api('/libraries'), api('/cards?pageSize=1')]);
    currentUser = me; localStorage.setItem('user', JSON.stringify(me));
    el.innerHTML = `
      <h2>📊 系统概览</h2>
      <div class="stats-grid">
        <div class="stat-card"><div class="stat-num">${libs.length}</div><div class="stat-label">可访问名片库</div></div>
        <div class="stat-card"><div class="stat-num">${cards.total || 0}</div><div class="stat-label">可见名片</div></div>
        <div class="stat-card"><div class="stat-num">${roleLabel(me.role)}</div><div class="stat-label">当前系统角色</div></div>
      </div>
      <div class="card" style="margin-top:20px">
        <div class="card-title">快速操作</div>
        <div class="quick-actions">
          <button class="btn btn-primary" onclick="switchPage('cards')">🃏 管理名片</button>
          <button class="btn btn-blue" onclick="switchPage('libraries')">📇 名片库</button>
          <button class="btn btn-orange" onclick="switchPage('duplicates')">🔄 查重合并</button>
          <button class="btn btn-muted" onclick="switchPage('settings')">⚙️ 设置</button>
        </div>
      </div>`;
  } catch (e) { el.innerHTML = `<div class="error">加载失败: ${e.message}</div>`; }
}

document.addEventListener('DOMContentLoaded', () => {
  const token = localStorage.getItem('token');
  currentUser = JSON.parse(localStorage.getItem('user') || '{}');
  if (token) {
    showMain();
    document.getElementById('user-info').textContent = currentUser.nickname || currentUser.username || '';
    switchPage('dashboard');
  } else showLogin();
});
