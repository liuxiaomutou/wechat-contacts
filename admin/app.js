// ===== API 请求封装 =====
const defaultApiBase = `${location.protocol}//${location.hostname}:3000/api`;
const API_BASE = localStorage.getItem('apiBase') || defaultApiBase;

async function api(path, options = {}) {
  const headers = { 'Content-Type': 'application/json', ...options.headers };
  const token = localStorage.getItem('token');
  if (token) headers['Authorization'] = 'Bearer ' + token;

  const res = await fetch(API_BASE + path, {
    method: options.method || 'GET',
    headers,
    body: options.body ? JSON.stringify(options.body) : undefined,
  });

  if (res.status === 401) {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    showLogin();
    throw new Error('未登录');
  }
  if (res.status === 204) return null;
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || '请求失败');
  return data;
}

// ===== Toast =====
function toast(msg, type = 'info') {
  const el = document.getElementById('toast');
  el.textContent = msg;
  el.style.background = type === 'error' ? '#e74c3c' : type === 'success' ? '#07c160' : '#333';
  el.classList.add('show');
  setTimeout(() => el.classList.remove('show'), 2500);
}

// ===== Modal =====
function openModal(title, bodyHtml) {
  document.getElementById('modal-title').textContent = title;
  document.getElementById('modal-body').innerHTML = bodyHtml;
  document.getElementById('modal-overlay').style.display = 'block';
  document.getElementById('modal').style.display = 'block';
}
function closeModal() {
  document.getElementById('modal-overlay').style.display = 'none';
  document.getElementById('modal').style.display = 'none';
}

// ===== 登录/登出 =====
function showLogin() {
  document.getElementById('login-page').style.display = 'flex';
  document.getElementById('main-page').style.display = 'none';
}
function showMain() {
  document.getElementById('login-page').style.display = 'none';
  document.getElementById('main-page').style.display = 'flex';
}

async function doLogin() {
  const username = document.getElementById('login-user').value;
  const password = document.getElementById('login-pass').value;
  const errEl = document.getElementById('login-error');
  if (!username || !password) { errEl.textContent = '请输入用户名和密码'; errEl.style.display = 'block'; return; }
  try {
    const res = await api('/auth/login', { method: 'POST', body: { username, password } });
    localStorage.setItem('token', res.token);
    localStorage.setItem('user', JSON.stringify(res.user));
    errEl.style.display = 'none';
    showMain();
    document.getElementById('user-info').textContent = res.user.nickname || res.user.username;
    switchPage('dashboard');
  } catch (e) {
    errEl.textContent = e.message;
    errEl.style.display = 'block';
  }
}

function doLogout() {
  localStorage.removeItem('token');
  localStorage.removeItem('user');
  showLogin();
}

// ===== 路由 =====
function switchPage(name) {
  document.querySelectorAll('.nav-item').forEach(el => el.classList.remove('active'));
  document.querySelector(`.nav-item[data-page="${name}"]`).classList.add('active');
  document.querySelectorAll('.page-content').forEach(el => el.classList.remove('active'));
  document.getElementById('page-' + name).classList.add('active');
  const fns = { dashboard: loadDashboard, users: loadUsers, libraries: loadLibraries, cards: loadCards, duplicates: loadDuplicates, import: loadImport };
  if (fns[name]) fns[name]();
}

// ===== 概览 =====
async function loadDashboard() {
  const el = document.getElementById('page-dashboard');
  el.innerHTML = '<div class="loading">加载中...</div>';
  try {
    const [users, libs, cards, dupStats] = await Promise.all([
      api('/auth/me').then(() => api('/users?limit=1').catch(() => ({ total: 0 }))),
      api('/libraries'),
      api('/cards?pageSize=1'),
      api('/duplicates/1/stats').catch(() => ({ open: 0, merged: 0, dismissed: 0 })),
    ]);
    const userCount = Array.isArray(users) ? users.length : 0;
    const libCount = Array.isArray(libs) ? libs.length : 0;
    const cardCount = cards?.total || 0;

    el.innerHTML = `
      <h2>📊 系统概览</h2>
      <div class="stats-grid">
        <div class="stat-card"><div class="stat-num">${userCount}</div><div class="stat-label">注册用户</div></div>
        <div class="stat-card"><div class="stat-num">${libCount}</div><div class="stat-label">名片库</div></div>
        <div class="stat-card"><div class="stat-num">${cardCount}</div><div class="stat-label">名片总数</div></div>
        <div class="stat-card"><div class="stat-num">${dupStats.open || 0}</div><div class="stat-label">待处理重复组</div></div>
      </div>
      <div class="card" style="margin-top:20px">
        <div class="card-title">快速操作</div>
        <div style="display:flex;gap:12px;flex-wrap:wrap">
          <button class="btn btn-primary" style="width:auto" onclick="switchPage('users')">👥 管理用户</button>
          <button class="btn btn-primary" style="width:auto;background:#1976d2" onclick="switchPage('libraries')">📇 管理名片库</button>
          <button class="btn btn-primary" style="width:auto;background:#f57c00" onclick="switchPage('duplicates')">🔄 查重合并</button>
          <button class="btn btn-primary" style="width:auto;background:#7b1fa2" onclick="switchPage('import')">📤 导入导出</button>
        </div>
      </div>`;
  } catch (e) { el.innerHTML = `<div class="error">加载失败: ${e.message}</div>`; }
}

// ===== 用户管理 =====
async function loadUsers() {
  // ... 由子任务完成
  document.getElementById('page-users').innerHTML = '<p>用户管理模块加载中...</p>';
}

// ===== 名片库管理 =====
async function loadLibraries() {
  document.getElementById('page-libraries').innerHTML = '<p>名片库管理模块加载中...</p>';
}

// ===== 名片管理 =====
async function loadCards() {
  document.getElementById('page-cards').innerHTML = '<p>名片管理模块加载中...</p>';
}

// ===== 查重 =====
async function loadDuplicates() {
  document.getElementById('page-duplicates').innerHTML = '<p>查重合并模块加载中...</p>';
}

// ===== 导入导出 =====
async function loadImport() {
  document.getElementById('page-import').innerHTML = '<p>导入导出模块加载中...</p>';
}

// ===== 初始化 =====
document.addEventListener('DOMContentLoaded', () => {
  const token = localStorage.getItem('token');
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  if (token && user.role === 'super_admin') {
    showMain();
    document.getElementById('user-info').textContent = user.nickname || user.username;
    switchPage('dashboard');
  } else {
    showLogin();
  }
});
