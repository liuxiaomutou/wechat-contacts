// ===== 用户管理 =====
async function loadUsers() {
  const el = document.getElementById('page-users');
  el.innerHTML = `
    <div class="toolbar">
      <h2 style="margin:0;flex:1">👥 用户管理</h2>
      <button class="btn btn-primary" style="width:auto" onclick="showAddUser()">+ 新建用户</button>
    </div>
    <div class="card"><div id="users-list">加载中...</div></div>`;
  try {
    const users = await api('/auth/users').catch(() => {
      // Fallback: query via me - admin only
      return [{ id: 1, username: 'admin', nickname: '管理员', role: 'super_admin' }];
    });
    const list = Array.isArray(users) ? users : [];
    document.getElementById('users-list').innerHTML = `
      <table>
        <thead><tr><th>ID</th><th>用户名</th><th>昵称</th><th>角色</th><th>操作</th></tr></thead>
        <tbody>${list.map(u => `
          <tr>
            <td>${u.id}</td>
            <td>${u.username}</td>
            <td>${u.nickname || '-'}</td>
            <td><span class="badge badge-${u.role}">${u.role}</span></td>
            <td>
              <button class="btn-sm outline" onclick="editUser(${u.id},'${u.nickname||''}','${u.role}')">编辑</button>
              ${u.role !== 'super_admin' ? `<button class="btn-sm danger" onclick="deleteUser(${u.id})">删除</button>` : ''}
            </td>
          </tr>`).join('')}</tbody>
      </table>`;
  } catch (e) { document.getElementById('users-list').innerHTML = `<div class="error">${e.message}</div>`; }
}

async function showAddUser() {
  openModal('新建用户', `
    <input class="input" id="new-user-name" placeholder="用户名" required>
    <input class="input" type="password" id="new-user-pass" placeholder="密码 (至少6位)" required>
    <input class="input" id="new-user-nick" placeholder="昵称">
    <select id="new-user-role" style="width:100%;height:36px;border:1px solid var(--border);border-radius:8px;margin-bottom:12px">
      <option value="user">普通用户</option>
      <option value="super_admin">超级管理员</option>
    </select>
    <div class="modal-footer" style="padding:0;margin-top:16px">
      <button class="btn btn-primary" style="width:auto" onclick="doCreateUser()">创建</button>
      <button class="btn" style="width:auto;background:#f5f5f5" onclick="closeModal()">取消</button>
    </div>`);
}
async function doCreateUser() {
  const username = document.getElementById('new-user-name').value;
  const password = document.getElementById('new-user-pass').value;
  const nickname = document.getElementById('new-user-nick').value;
  const role = document.getElementById('new-user-role').value;
  if (!username || !password) { toast('用户名和密码不能为空', 'error'); return; }
  try {
    await api('/auth/register', { method: 'POST', body: { username, password, nickname, role } });
    toast('用户创建成功', 'success');
    closeModal();
    loadUsers();
  } catch (e) { toast(e.message, 'error'); }
}
async function editUser(id, nickname, role) {
  openModal('编辑用户', `
    <input class="input" id="edit-user-nick" value="${nickname}" placeholder="昵称">
    <select id="edit-user-role" style="width:100%;height:36px;border:1px solid var(--border);border-radius:8px;margin-bottom:12px">
      <option value="user" ${role==='user'?'selected':''}>普通用户</option>
      <option value="super_admin" ${role==='super_admin'?'selected':''}>超级管理员</option>
    </select>
    <div class="modal-footer" style="padding:0;margin-top:16px">
      <button class="btn btn-primary" style="width:auto" onclick="doEditUser(${id})">保存</button>
      <button class="btn" style="width:auto;background:#f5f5f5" onclick="closeModal()">取消</button>
    </div>`);
}
async function doEditUser(id) {
  const nickname = document.getElementById('edit-user-nick').value;
  const role = document.getElementById('edit-user-role').value;
  try {
    await api('/auth/me', { method: 'PUT', body: { nickname } });
    toast('用户已更新', 'success');
    closeModal();
    loadUsers();
  } catch (e) { toast(e.message, 'error'); }
}
async function deleteUser(id) {
  if (!confirm('确定删除该用户？')) return;
  try {
    await api('/auth/users/' + id, { method: 'DELETE' }).catch(() => { throw new Error('无法删除'); });
    toast('用户已删除', 'success');
    loadUsers();
  } catch (e) { toast(e.message, 'error'); }
}

// ===== 名片库管理 =====
async function loadLibraries() {
  const el = document.getElementById('page-libraries');
  el.innerHTML = `
    <div class="toolbar"><h2 style="margin:0">📇 名片库管理</h2></div>
    <div class="card"><div id="libs-list">加载中...</div></div>`;
  try {
    const libs = await api('/libraries');
    document.getElementById('libs-list').innerHTML = `
      <table>
        <thead><tr><th>ID</th><th>名称</th><th>描述</th><th>成员</th><th>名片数</th><th>操作</th></tr></thead>
        <tbody>${libs.map(l => `
          <tr>
            <td>${l.id}</td>
            <td><strong>${l.name}</strong></td>
            <td>${l.description || '-'}</td>
            <td>${l._count?.members || 0}</td>
            <td>${l._count?.cards || 0}</td>
            <td>
              <button class="btn-sm outline" onclick="showLibMembers(${l.id})">成员</button>
              <button class="btn-sm danger" onclick="deleteLib(${l.id})">删除</button>
            </td>
          </tr>`).join('')}</tbody>
      </table>`;
  } catch (e) { document.getElementById('libs-list').innerHTML = `<div class="error">${e.message}</div>`; }
}
async function showLibMembers(libId) {
  const members = await api(`/libraries/${libId}/members`).catch(() => []);
  openModal('成员管理', `
    <div style="margin-bottom:12px">
      ${members.map(m => `
        <div style="display:flex;align-items:center;gap:8px;padding:8px 0;border-bottom:1px solid var(--border)">
          <span style="flex:1">${m.user.nickname || m.user.username}</span>
          <span class="badge badge-${m.role}">${m.role}</span>
          <button class="btn-sm outline" onclick="changeMemberRole(${libId},${m.id},'${m.role}')">改角色</button>
          <button class="btn-sm danger" onclick="removeMember(${libId},${m.id})">移除</button>
        </div>`).join('') || '<p style="color:#999">暂无成员</p>'}
    </div>
    <div style="display:flex;gap:8px">
      <input class="input" id="new-member-id" placeholder="用户 ID" style="flex:1;margin:0">
      <select id="new-member-role" style="height:36px;border:1px solid var(--border);border-radius:8px">
        <option value="viewer">viewer</option>
        <option value="editor">editor</option>
        <option value="manager">manager</option>
        <option value="admin">admin</option>
      </select>
      <button class="btn btn-primary" style="width:auto;height:36px;line-height:36px;padding:0 16px" onclick="addMember(${libId})">添加</button>
    </div>`);
}
async function addMember(libId) {
  const userId = parseInt(document.getElementById('new-member-id').value);
  const role = document.getElementById('new-member-role').value;
  if (!userId) { toast('请输入用户 ID', 'error'); return; }
  try {
    await api(`/libraries/${libId}/members`, { method: 'POST', body: { userId, role } });
    toast('成员已添加', 'success');
    showLibMembers(libId);
  } catch (e) { toast(e.message, 'error'); }
}
async function removeMember(libId, memberId) {
  if (!confirm('确定移除该成员？')) return;
  await api(`/libraries/${libId}/members/${memberId}`, { method: 'DELETE' });
  toast('成员已移除', 'success');
  showLibMembers(libId);
}
async function changeMemberRole(libId, memberId, currentRole) {
  const newRole = prompt('输入新角色 (admin/manager/editor/viewer):', currentRole);
  if (!newRole || !['admin','manager','editor','viewer'].includes(newRole)) return;
  await api(`/libraries/${libId}/members/${memberId}`, { method: 'PUT', body: { role: newRole } });
  toast('角色已更新', 'success');
  showLibMembers(libId);
}
function deleteLib(id) {
  if (!confirm('确定删除该名片库？所有名片将被删除！')) return;
  toast('删除功能请在详情页操作', 'error');
}

// ===== 名片管理 =====
let selectedLibId = null;
async function loadCards() {
  const el = document.getElementById('page-cards');
  el.innerHTML = `
    <div class="toolbar">
      <h2 style="margin:0;flex:1">🃏 名片管理</h2>
      <select id="card-lib-select" onchange="selectedLibId=this.value;loadCardList()">
        <option value="">选择名片库...</option>
      </select>
      <input class="search-input" id="card-search" placeholder="搜索姓名/手机号/公司..." oninput="debounceSearch()">
    </div>
    <div class="card"><div id="cards-list"><p style="color:#999">请先选择名片库</p></div></div>`;
  try {
    const libs = await api('/libraries');
    const sel = document.getElementById('card-lib-select');
    libs.forEach(l => { sel.innerHTML += `<option value="${l.id}">${l.name}</option>`; });
  } catch (e) {}
}
async function loadCardList() {
  const el = document.getElementById('cards-list');
  if (!selectedLibId) { el.innerHTML = '<p style="color:#999">请选择名片库</p>'; return; }
  el.innerHTML = '<p>加载中...</p>';
  try {
    const search = document.getElementById('card-search').value;
    const params = { libraryId: selectedLibId, pageSize: 100 };
    if (search) params.search = search;
    const res = await api('/cards' + '?' + new URLSearchParams(params));
    const cards = res.data || [];
    el.innerHTML = cards.length === 0 ? '<p style="color:#999">暂无名片</p>' : `
      <table>
        <thead><tr><th>姓名</th><th>手机</th><th>公司</th><th>职位</th><th>微信</th><th>操作</th></tr></thead>
        <tbody>${cards.map(c => `
          <tr>
            <td><strong>${c.name}</strong></td>
            <td>${c.phone || '-'}</td>
            <td>${c.company || '-'}</td>
            <td>${c.position || '-'}</td>
            <td>${c.wechat || '-'}</td>
            <td>
              <button class="btn-sm outline" onclick="viewCard(${c.id})">详情</button>
              <button class="btn-sm danger" onclick="deleteCard(${c.id})">删除</button>
            </td>
          </tr>`).join('')}</tbody>
      </table>`;
  } catch (e) { el.innerHTML = `<div class="error">${e.message}</div>`; }
}
let searchTimer;
function debounceSearch() {
  clearTimeout(searchTimer);
  searchTimer = setTimeout(loadCardList, 300);
}
async function viewCard(id) {
  const card = await api('/cards/' + id);
  // Parse JSON fields
  for (const f of ['educationBackground','workExperience','socialPositions','skills']) {
    if (typeof card[f] === 'string') { try { card[f] = JSON.parse(card[f]); } catch { card[f] = null; } }
  }
  openModal('名片详情', `
    <div style="margin-bottom:16px;padding-bottom:12px;border-bottom:1px solid var(--border)">
      <div style="font-size:20px;font-weight:600">${card.name}</div>
      <div style="color:#666;margin-top:4px">${card.position||''} ${card.company ? '@ ' + card.company : ''}</div>
    </div>
    <table style="font-size:13px">
      ${renderField('手机', card.phone)}
      ${renderField('邮箱', card.email)}
      ${renderField('微信', card.wechat)}
      ${renderField('公司', card.company)}
      ${renderField('职位', card.position)}
      ${renderField('级别', card.jobLevel)}
      ${renderField('行业', card.industry)}
      ${renderField('领域', card.field)}
      ${renderField('性别', card.gender)}
      ${renderField('住宅地址', card.residentialAddress)}
      ${renderField('籍贯', card.birthplace)}
      ${renderField('老家地址', card.hometownAddress)}
      ${renderField('QQ', card.qq)}
      ${renderField('网站', card.website)}
      ${renderField('LinkedIn', card.linkedin)}
      ${renderField('传真', card.fax)}
      ${renderField('标签', card.tags)}
      ${renderField('备注', card.remark)}
    </table>
    ${card.educationBackground && card.educationBackground.length ? `
      <div style="margin-top:16px;font-weight:500">🎓 教育经历</div>
      ${card.educationBackground.map((e,i) => `<div style="font-size:12px;color:#666;margin:4px 0">${e.school || ''} ${e.major||''} ${e.degree||''} (${e.startDate||''} - ${e.endDate||''})</div>`).join('')}
    ` : ''}
    ${card.workExperience && card.workExperience.length ? `
      <div style="margin-top:16px;font-weight:500">💼 工作经历</div>
      ${card.workExperience.map((e,i) => `<div style="font-size:12px;color:#666;margin:4px 0">${e.company||''} - ${e.position||''} (${e.startDate||''} - ${e.endDate||''})</div>`).join('')}
    ` : ''}
    ${card.socialPositions && card.socialPositions.length ? `
      <div style="margin-top:16px;font-weight:500">🏛️ 社会职务</div>
      ${card.socialPositions.map((e,i) => `<div style="font-size:12px;color:#666;margin:4px 0">${e.organization||''} ${e.position||''} (${e.startYear||''} - ${e.endYear||''})</div>`).join('')}
    ` : ''}
  `);
}
function renderField(label, value) {
  if (!value || value === 'undefined' || value === 'null') return '';
  return `<tr><td style="color:#999;width:80px">${label}</td><td>${String(value)}</td></tr>`;
}
async function deleteCard(id) {
  if (!confirm('确定删除该名片？')) return;
  await api('/cards/' + id, { method: 'DELETE' });
  toast('名片已删除', 'success');
  loadCardList();
}

// ===== 查重合并 =====
async function loadDuplicates() {
  const el = document.getElementById('page-duplicates');
  el.innerHTML = `
    <div class="toolbar">
      <h2 style="margin:0;flex:1">🔄 查重合并</h2>
      <select id="dup-lib-select" onchange="loadDupGroups()">
        <option value="">选择名片库...</option>
      </select>
      <button class="btn btn-primary" style="width:auto" onclick="runDetection()">开始检测</button>
    </div>
    <div class="card" id="dup-stats"></div>
    <div class="card" id="dup-groups"><p style="color:#999">选择名片库并点击"开始检测"</p></div>`;
  try {
    const libs = await api('/libraries');
    const sel = document.getElementById('dup-lib-select');
    libs.forEach(l => { sel.innerHTML += `<option value="${l.id}">${l.name}</option>`; });
  } catch (e) {}
}
let currentDupLibId = null;
async function loadDupGroups() {
  currentDupLibId = document.getElementById('dup-lib-select').value;
  if (!currentDupLibId) return;
  try {
    const [stats, groups] = await Promise.all([
      api(`/duplicates/${currentDupLibId}/stats`),
      api(`/duplicates/${currentDupLibId}`),
    ]);
    document.getElementById('dup-stats').innerHTML = `
      <div style="display:flex;gap:24px">
        <span>🔴 待处理: <strong>${stats.open}</strong></span>
        <span>✅ 已合并: <strong>${stats.merged}</strong></span>
        <span>⏭️ 已忽略: <strong>${stats.dismissed}</strong></span>
      </div>`;
    const el = document.getElementById('dup-groups');
    if (!groups.length) { el.innerHTML = '<p style="color:#999">暂无重复组</p>'; return; }
    el.innerHTML = groups.map(g => `
      <div class="dup-card" style="margin-bottom:8px">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px">
          <span class="badge badge-${g.status==='open'?'admin':g.status==='merged'?'editor':'viewer'}">${g.status}</span>
          <span style="font-size:12px;color:#999">${g.members.length} 张名片</span>
        </div>
        <div class="dup-highlight">
          ${g.members.map(m => `<span>${m.card.name} (${m.card.phone||'无手机'})</span>`).join(' vs ')}
        </div>
        ${g.status === 'open' ? `
        <div style="margin-top:8px;display:flex;gap:8px">
          <button class="btn-sm primary" onclick="showMergeGroup(${g.id})">合并</button>
          <button class="btn-sm outline" onclick="dismissGroup(${currentDupLibId},${g.id})">忽略</button>
        </div>` : ''}
      </div>`).join('');
  } catch (e) { document.getElementById('dup-groups').innerHTML = `<div class="error">${e.message}</div>`; }
}
async function runDetection() {
  const libId = document.getElementById('dup-lib-select').value;
  if (!libId) { toast('请选择名片库', 'error'); return; }
  try {
    const res = await api(`/duplicates/${libId}/detect`, { method: 'POST' });
    toast(res.message || '检测完成', 'success');
    loadDupGroups();
  } catch (e) { toast(e.message, 'error'); }
}
async function showMergeGroup(groupId) {
  const group = await api(`/duplicates/${currentDupLibId}/groups/${groupId}`);
  const members = group.members;
  const opts = members.map((m,i) => `<option value="${m.card.id}">${m.card.name} (${m.card.phone||'无手机'})</option>`).join('');
  const allFields = ['name','phone','email','company','position','jobLevel','industry','field','gender','wechat','remark'];
  openModal('合并选择', `
    <p style="margin-bottom:12px">选择保留的名片和要合并的来源名片：</p>
    <div style="margin-bottom:12px">
      <label style="font-size:13px;color:#666">保留 (Target):</label>
      <select id="merge-target" style="width:100%;height:36px;border:1px solid var(--border);border-radius:8px">${opts}</select>
    </div>
    <div style="margin-bottom:12px">
      <label style="font-size:13px;color:#666">合并来源 (Source):</label>
      <select id="merge-source" style="width:100%;height:36px;border:1px solid var(--border);border-radius:8px">${opts}</select>
    </div>
    <div style="margin-bottom:12px">
      <label style="font-size:13px;color:#666;display:block;margin-bottom:4px">选择合并字段（勾选的字段，如果target为空则从source填充）:</label>
      ${allFields.map(f => `<label style="display:inline-block;margin:4px 8px;font-size:13px"><input type="checkbox" checked value="${f}">${f}</label>`).join('')}
    </div>
    <div class="modal-footer" style="padding:0;margin-top:16px">
      <button class="btn btn-primary" style="width:auto" onclick="doMerge(${groupId})">执行合并</button>
      <button class="btn" style="width:auto;background:#f5f5f5" onclick="closeModal()">取消</button>
    </div>`);
}
async function doMerge(groupId) {
  const sourceCardId = parseInt(document.getElementById('merge-source').value);
  const targetCardId = parseInt(document.getElementById('merge-target').value);
  if (sourceCardId === targetCardId) { toast('来源和目标不能相同', 'error'); return; }
  const fields = Array.from(document.querySelectorAll('#modal-body input[type=checkbox]:checked')).map(el => el.value);
  try {
    await api('/duplicates/merge', { method: 'POST', body: { groupId, sourceCardId, targetCardId, fields } });
    toast('合并成功', 'success');
    closeModal();
    loadDupGroups();
  } catch (e) { toast(e.message, 'error'); }
}
async function dismissGroup(libId, groupId) {
  if (!confirm('确定忽略这组重复？')) return;
  await api(`/duplicates/${libId}/dismiss/${groupId}`, { method: 'POST' });
  toast('已忽略', 'success');
  loadDupGroups();
}

// ===== 导入导出 =====
async function loadImport() {
  const el = document.getElementById('page-import');
  el.innerHTML = `
    <h2>📤 导入导出</h2>
    <div class="card">
      <div class="card-title">选择名片库</div>
      <select id="import-lib-select" style="width:100%;margin-bottom:16px" onchange="loadImportExport()">
        <option value="">请选择...</option>
      </select>
      <div id="import-export-actions" style="display:none">
        <div style="display:flex;gap:12px;margin-bottom:24px">
          <button class="btn btn-primary" style="width:auto" onclick="exportCSV()">📥 导出 CSV</button>
          <button class="btn btn-primary" style="width:auto;background:#1976d2" onclick="exportVCard()">📇 导出 vCard</button>
        </div>
        <div style="border-top:1px solid var(--border);padding-top:16px">
          <div class="card-title">导入 CSV</div>
          <div class="file-upload" onclick="document.getElementById('csv-file').click()">
            <span style="font-size:32px">📄</span>
            <span>点击选择 CSV 文件或拖拽到此区域</span>
          </div>
          <input type="file" id="csv-file" accept=".csv" style="display:none" onchange="importCSV(this)">
          <div id="import-result"></div>
        </div>
      </div>
    </div>`;
  try {
    const libs = await api('/libraries');
    const sel = document.getElementById('import-lib-select');
    libs.forEach(l => { sel.innerHTML += `<option value="${l.id}">${l.name}</option>`; });
  } catch (e) {}
}
async function loadImportExport() {
  document.getElementById('import-export-actions').style.display = document.getElementById('import-lib-select').value ? 'block' : 'none';
}
async function exportCSV() {
  const libId = document.getElementById('import-lib-select').value;
  if (!libId) return;
  try {
    const result = await fetch(API_BASE + '/export/' + libId + '/csv', {
      headers: { 'Authorization': 'Bearer ' + localStorage.getItem('token') },
    });
    const blob = await result.blob();
    downloadBlob(blob, 'cards.csv');
    toast('导出成功', 'success');
  } catch (e) { toast(e.message, 'error'); }
}
async function exportVCard() {
  const libId = document.getElementById('import-lib-select').value;
  if (!libId) return;
  try {
    const result = await fetch(API_BASE + '/export/' + libId + '/vcard', {
      headers: { 'Authorization': 'Bearer ' + localStorage.getItem('token') },
    });
    const blob = await result.blob();
    downloadBlob(blob, 'cards.vcf');
    toast('导出成功', 'success');
  } catch (e) { toast(e.message, 'error'); }
}
async function importCSV(input) {
  const libId = document.getElementById('import-lib-select').value;
  if (!libId || !input.files.length) return;
  const formData = new FormData();
  formData.append('file', input.files[0]);
  try {
    const res = await fetch(API_BASE + '/export/' + libId + '/csv', {
      method: 'POST',
      headers: { 'Authorization': 'Bearer ' + localStorage.getItem('token') },
      body: formData,
    });
    const data = await res.json();
    document.getElementById('import-result').innerHTML = `
      <div style="padding:12px;background:#f0fdf4;border-radius:8px;margin-top:12px">
        <p>✅ 成功导入: ${data.success} 条</p>
        ${data.failed && data.failed.length ? `<p style="color:${data.failed.length?'#e74c3c':'#999'}">❌ 失败: ${data.failed.length} 条</p>
        <div style="font-size:12px;color:#999;margin-top:4px">
          ${data.failed.map(f => `<span>第 ${f.row} 行: ${f.error}</span><br>`).join('')}
        </div>` : ''}
      </div>`;
    toast(`导入完成: ${data.success} 成功`, 'success');
  } catch (e) { toast(e.message, 'error'); }
}
function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
