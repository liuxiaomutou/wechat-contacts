const LIB_FIELD_LABELS = {
  avatar: '照片', company: '工作单位', position: '职位', phone: '主电话', phones: '多个电话', email: '主邮箱', emails: '多个邮箱',
  wechat: '微信', educationBackground: '教育经历', workExperience: '工作经历', socialPositions: '社会职务', skills: '技能',
  addresses: '地址',
  industry: '行业', field: '领域', gender: '性别', solarBirthday: '阳历生日', lunarBirthday: '农历生日', ethnicity: '民族', maritalStatus: '婚姻',
  province: '省', city: '市', district: '区/县', township: '街道/乡镇', detailAddress: '详细地址',
  residentialAddress: '住宅地址', hometownAddress: '老家地址', birthplace: '籍贯', qq: 'QQ', website: '网站', linkedin: 'LinkedIn', fax: '传真', tags: '标签', remark: '备注'
};
const DEFAULT_FIELD_SETTINGS = Object.fromEntries(Object.keys(LIB_FIELD_LABELS).map(k => [k, !['residentialAddress','hometownAddress','qq','website','linkedin','fax'].includes(k)]));
function normalizePhoneEntries(v, single) {
  if (Array.isArray(v)) {
    if (!v.length && single) return [{ label: '', value: single }];
    if (typeof v[0] === 'string') return v.filter(Boolean).map(x => ({ label: '', value: x }));
    return v.filter(x => x.value || x.label);
  }
  return single ? [{ label: '', value: single }] : [];
}
function normalizeEmailEntries(v, single) {
  if (Array.isArray(v)) {
    if (!v.length && single) return [{ label: '', value: single }];
    if (typeof v[0] === 'string') return v.filter(Boolean).map(x => ({ label: '', value: x }));
    return v.filter(x => x.value || x.label);
  }
  return single ? [{ label: '', value: single }] : [];
}
function renderLabeledList(items) {
  if (!items || !items.length) return '';
  return items.map(item => {
    const label = item.label ? '<span class="mini-label">' + escapeHtml(item.label) + '</span> ' : '';
    const val = escapeHtml(item.value || '');
    return '<div class="info-row">' + label + '<span>' + val + '</span></div>';
  }).join('');
}
function parseMaybeJson(v, fallback = []) { if (!v) return fallback; if (Array.isArray(v)) return v; try { return JSON.parse(v); } catch { return fallback; } }
function fieldSettingsOf(lib) { return { ...DEFAULT_FIELD_SETTINGS, ...(parseMaybeJson(lib.fieldSettings, {}) || {}) }; }
function roleCan(role, min) { const n = { admin:4, manager:3, editor:2, viewer:1 }; return (n[role] || 0) >= (n[min] || 0); }
function renderField(label, value) { if (value === undefined || value === null || value === '' || (Array.isArray(value) && !value.length)) return ''; return '<div class="info-label">' + label + '</div><div>' + (Array.isArray(value) ? value.map(escapeHtml).join('<br>') : escapeHtml(value)) + '</div>'; }
function renderArraySection(title, arr, fmt) { arr = parseMaybeJson(arr, []); if (!arr.length) return ''; return '<div class="card-title" style="margin-top:18px">' + title + '</div>' + arr.map(fmt).join(''); }

async function loadLibraries() {
  const el = document.getElementById('page-libraries');
  el.innerHTML = '<div class="toolbar"><h2 style="margin:0;flex:1">\uD83D\uDCC7 名片库</h2><button class="btn btn-primary" onclick="showCreateLibrary()">+ 新建名片库</button></div><div class="card"><div id="libs-list">加载中...</div></div>';
  try {
    const libs = await api('/libraries');
    document.getElementById('libs-list').innerHTML = libs.length ? '<table><thead><tr><th>名称</th><th>说明</th><th>角色</th><th>成员</th><th>名片</th><th>操作</th></tr></thead><tbody>' + libs.map(l => '\n      <tr><td><strong>' + escapeHtml(l.name) + '</strong></td><td>' + escapeHtml(l.description || '-') + '</td><td><span class="badge badge-' + l.role + '">' + roleLabel(l.role) + '</span></td><td>' + (l._count?.members || 0) + '</td><td>' + (l._count?.cards || 0) + '</td><td>\n        ' + (roleCan(l.role,'admin') ? '<button class="btn-sm outline" onclick="editLibrary(' + l.id + ')">编辑</button><button class="btn-sm blue" onclick="showLibFields(' + l.id + ')">字段设置</button><button class="btn-sm outline" onclick="showLibMembers(' + l.id + ')">成员</button><button class="btn-sm danger" onclick="deleteLib(' + l.id + ",'" + escapeHtml(l.name) + "')" + '">删除</button>' : '<span style="color:#999">只读访问</span>') + '\n      </td></tr>').join('') + '</tbody></table>' : '<p style="color:#999">暂无名片库</p>';
  } catch (e) { document.getElementById('libs-list').innerHTML = '<div class="error">' + e.message + '</div>'; }
}
function showCreateLibrary() {
  openModal('新建名片库', '<input class="input" id="lib-name" placeholder="名片库名称"><textarea id="lib-desc" placeholder="说明"></textarea><div class="modal-footer"><button class="btn btn-muted" onclick="closeModal()">取消</button><button class="btn btn-primary" onclick="createLibrary()">创建</button></div>');
}
async function createLibrary() { try { await api('/libraries', { method:'POST', body:{ name:document.getElementById('lib-name').value, description:document.getElementById('lib-desc').value } }); toast('已创建','success'); closeModal(); loadLibraries(); } catch(e){ toast(e.message,'error'); } }
async function editLibrary(id) { const lib = await api('/libraries/' + id); openModal('编辑名片库', '<input class="input" id="lib-name" value="' + escapeHtml(lib.name) + '"><textarea id="lib-desc">' + escapeHtml(lib.description || '') + '</textarea><div class="modal-footer"><button class="btn btn-muted" onclick="closeModal()">取消</button><button class="btn btn-primary" onclick="saveLibrary(' + id + ')">保存</button></div>'); }
async function saveLibrary(id) { try { await api('/libraries/' + id, { method:'PUT', body:{ name:document.getElementById('lib-name').value, description:document.getElementById('lib-desc').value } }); toast('已保存','success'); closeModal(); loadLibraries(); } catch(e){ toast(e.message,'error'); } }
async function deleteLib(id, name) { confirmLayer({ title:'删除名片库', tone:'soft', message:'确定删除「' + name + '」？名片和成员关系会一起删除。', okText:'确认删除', onOk: async()=>{ await api('/libraries/' + id, { method:'DELETE' }); toast('已删除','success'); loadLibraries(); }}); }
async function showLibFields(id) {
  const lib = await api('/libraries/' + id); const settings = fieldSettingsOf(lib);
  openModal('名片库字段显示设置', '<p style="color:#666;margin-bottom:12px">关闭后，普通查看者看不到该字段；库管理员、经理和名片本人仍可见。</p><div class="field-grid">' + Object.entries(LIB_FIELD_LABELS).map(([k,v]) => '<label class="field-check"><input type="checkbox" data-field="' + k + '" ' + (settings[k] ? 'checked' : '') + '> ' + v + '</label>').join('') + '</div><div class="modal-footer"><button class="btn btn-muted" onclick="closeModal()">取消</button><button class="btn btn-primary" onclick="saveLibFields(' + id + ')">保存</button></div>', 'large');
}
async function saveLibFields(id) { const obj = {}; document.querySelectorAll('#modal-body input[data-field]').forEach(i => obj[i.dataset.field] = i.checked); try { await api('/libraries/' + id, { method:'PUT', body:{ fieldSettings: obj } }); toast('字段设置已保存','success'); closeModal(); loadLibraries(); } catch(e){ toast(e.message,'error'); } }
async function showLibMembers(libId) {
  const members = await api('/libraries/' + libId + '/members').catch(e => { toast(e.message,'error'); return []; });
  openModal('成员管理', '<div style="margin-bottom:12px">' + (members.map(m => '<div style="display:flex;align-items:center;gap:8px;padding:8px 0;border-bottom:1px solid var(--border)"><span style="flex:1">' + escapeHtml(m.user.nickname || m.user.username) + ' <small style="color:#999">#' + m.user.id + '</small></span><span class="badge badge-' + m.role + '">' + roleLabel(m.role) + '</span><button class="btn-sm outline" onclick="showChangeMemberRole(' + libId + ',' + m.id + ",'" + m.role + "')" + '">改角色</button><button class="btn-sm danger" onclick="removeMember(' + libId + ',' + m.id + ')">移除</button></div>').join('') || '<p style="color:#999">暂无成员</p>') + '</div><div style="display:flex;gap:8px"><input class="input" id="new-member-id" placeholder="用户 ID" style="flex:1;margin:0"><select id="new-member-role"><option value="viewer">只读</option><option value="editor">编辑</option><option value="manager">经理</option><option value="admin">库管理员</option></select><button class="btn btn-primary" onclick="addMember(' + libId + ')">添加</button></div>');
}
async function addMember(libId) { const userId = parseInt(document.getElementById('new-member-id').value); const role = document.getElementById('new-member-role').value; if (!userId) return toast('请输入用户 ID','error'); try { await api('/libraries/' + libId + '/members', { method:'POST', body:{ userId, role } }); toast('已添加','success'); showLibMembers(libId); } catch(e){ toast(e.message,'error'); } }
function showChangeMemberRole(libId, memberId, role) { openModal('修改成员角色', '<select id="member-role" style="width:100%"><option value="viewer" ' + (role==='viewer'?'selected':'') + '>只读</option><option value="editor" ' + (role==='editor'?'selected':'') + '>编辑</option><option value="manager" ' + (role==='manager'?'selected':'') + '>经理</option><option value="admin" ' + (role==='admin'?'selected':'') + '>库管理员</option></select><div class="modal-footer"><button class="btn btn-muted" onclick="closeModal()">取消</button><button class="btn btn-primary" onclick="changeMemberRole(' + libId + ',' + memberId + ')">保存</button></div>'); }
async function changeMemberRole(libId, memberId) { try { await api('/libraries/' + libId + '/members/' + memberId, { method:'PUT', body:{ role:document.getElementById('member-role').value } }); toast('已更新','success'); showLibMembers(libId); } catch(e){ toast(e.message,'error'); } }
async function removeMember(libId, memberId) { confirmLayer({ title:'移除成员', message:'确定移除该成员？', okText:'确认移除', onOk: async()=>{ await api('/libraries/' + libId + '/members/' + memberId, { method:'DELETE' }); toast('已移除','success'); showLibMembers(libId); }}); }

let selectedLibId = null, searchTimer;
async function loadCards() {
  const el = document.getElementById('page-cards');
  el.innerHTML = '<div class="toolbar"><h2 style="margin:0;flex:1">\uD83C\uDCCF 名片管理</h2><select id="card-lib-select" onchange="selectedLibId=this.value;loadCardList()"><option value="">选择名片库...</option></select><input class="search-input" id="card-search" placeholder="搜索姓名/电话/公司..." oninput="debounceSearch()"><button class="btn btn-primary" onclick="showCardEditor()">+ 新建名片</button></div><div class="card"><div id="cards-list">请选择名片库</div></div>';
  const libs = await api('/libraries'); const sel = document.getElementById('card-lib-select'); libs.forEach(l => sel.innerHTML += '<option value="' + l.id + '">' + escapeHtml(l.name) + '（' + roleLabel(l.role) + '）</option>');
  if (currentUser.defaultLibraryId && !selectedLibId) {
    const opt = Array.from(sel.options).find(o => parseInt(o.value) === currentUser.defaultLibraryId);
    if (opt) { sel.value = currentUser.defaultLibraryId; selectedLibId = currentUser.defaultLibraryId; loadCardList(); }
  }
}
function debounceSearch(){ clearTimeout(searchTimer); searchTimer=setTimeout(loadCardList,300); }
async function loadCardList() {
  const el = document.getElementById('cards-list'); if (!selectedLibId) return el.innerHTML='<p style="color:#999">请选择名片库</p>';
  try { const search = document.getElementById('card-search').value; const res = await api('/cards?' + new URLSearchParams({ libraryId:selectedLibId, pageSize:100, ...(search ? { search } : {}) })); const cards=res.data||[]; el.innerHTML = cards.length ? '<table><thead><tr><th>姓名</th><th>电话</th><th>邮箱</th><th>工作单位</th><th>职位</th><th>权限</th><th>操作</th></tr></thead><tbody>' + cards.map(c => '<tr><td><strong>' + escapeHtml(c.name) + '</strong></td><td>' + escapeHtml((c.phones||[c.phone]).filter(Boolean).join(' / ') || '-') + '</td><td>' + escapeHtml((c.emails||[c.email]).filter(Boolean).join(' / ') || '-') + '</td><td>' + escapeHtml(c.company||'-') + '</td><td>' + escapeHtml(c.position||'-') + '</td><td><span class="badge badge-' + c.role + '">' + roleLabel(c.role) + '</span></td><td><button class="btn-sm outline" onclick="viewCard(' + c.id + ')">详情</button>' + (c.actions?.canEdit?'<button class="btn-sm blue" onclick="showCardEditor(' + c.id + ')">编辑</button>':'') + (c.actions?.canManageVisibility?'<button class="btn-sm outline" onclick="showCardVisibility(' + c.id + ')">可见性</button>':'') + (c.actions?.canDelete?'<button class="btn-sm danger" onclick="deleteCard(' + c.id + ')">删除</button>':'') + '</td></tr>').join('') + '</tbody></table>' : '<p style="color:#999">暂无名片</p>'; } catch(e){ el.innerHTML='<div class="error">' + e.message + '</div>'; }
}
async function viewCard(id) {
  const c = await api('/cards/'+id);
  const phones = normalizePhoneEntries(c.phones, c.phone);
  const emails = normalizeEmailEntries(c.emails, c.email);
  const addresses = Array.isArray(c.addresses) ? c.addresses.filter(a => a.province || a.detail) : [];
  function formatAddr(a) { return [a.province, a.city, a.district, a.detail].filter(Boolean).join(' '); }
  openModal('名片详情', '<div class="detail-head"><div class="avatar-lg">' + (c.avatar ? '<img src="' + escapeHtml(c.avatar) + '">' : escapeHtml((c.name||'?').slice(0,1))) + '</div><div><div class="detail-name">' + escapeHtml(c.name) + '</div><div class="detail-sub">' + escapeHtml(c.position||'') + ' ' + (c.company ? '@ '+escapeHtml(c.company) : '') + '</div><div style="margin-top:6px"><span class="badge badge-' + c.role + '">' + roleLabel(c.role) + '</span></div></div></div><div class="info-list">' + (phones.length ? '<div class="info-label">\uD83D\uDCDE 电话</div>' + renderLabeledList(phones) : '') + (emails.length ? '<div class="info-label">\uD83D\uDCE7 邮箱</div>' + renderLabeledList(emails) : '') + renderField('微信', c.wechat) + renderField('工作单位', c.company) + renderField('职位', c.position) + renderField('行业', c.industry) + renderField('领域', c.field) + renderField('性别', c.gender) + renderField('标签', c.tags) + renderField('备注', c.remark) + (addresses.length ? '<div class="info-label">\uD83D\uDCCD 地址</div>' + addresses.map(a => '<div class="info-row"><span>' + (a.label ? '<span class="mini-label">' + escapeHtml(a.label) + '</span> ' : '') + escapeHtml(formatAddr(a)) + '</span></div>').join('') : '') + '</div>' + renderArraySection('\uD83C\uDF93 教育经历', c.educationBackground, e=>'<div class="exp-item"><strong>' + escapeHtml(e.school||'') + '</strong> ' + escapeHtml(e.major||'') + ' ' + escapeHtml(e.degree||'') + '<br><small>' + escapeHtml(e.startDate||'') + ' - ' + escapeHtml(e.endDate||'') + '</small></div>') + renderArraySection('\uD83D\uDCBC 工作经历', c.workExperience, e=>'<div class="exp-item"><strong>' + escapeHtml(e.company||'') + '</strong> ' + escapeHtml(e.position||'') + ' ' + escapeHtml(e.department||'') + '<br><small>' + escapeHtml(e.startDate||'') + ' - ' + escapeHtml(e.endDate||'') + '</small><br>' + escapeHtml(e.description||'') + '</div>') + '<div class="modal-footer"><button class="btn btn-muted" onclick="closeModal()">关闭</button>' + (c.actions?.canEdit?'<button class="btn btn-primary" onclick="showCardEditor('+id+')">编辑</button>':'') + '</div>', 'large');
}
// ===== 交互式名片编辑器（Google Contacts 风格）=====
const ADMIN_LABELS = { phone: ['手机','工作','家庭','公司','学校','快递','传真','其他','自定义'], email: ['工作','个人','学校','其他','自定义'], address: ['家庭','公司','学校','其他','自定义'] };
const ADMIN_PROVINCES = ['北京市','天津市','河北省','山西省','内蒙古自治区','辽宁省','吉林省','黑龙江省','上海市','江苏省','浙江省','安徽省','福建省','江西省','山东省','河南省','湖北省','湖南省','广东省','广西壮族自治区','海南省','重庆市','四川省','贵州省','云南省','西藏自治区','陕西省','甘肃省','青海省','宁夏回族自治区','新疆维吾尔自治区','台湾省','香港特别行政区','澳门特别行政区'];
function renderPhoneRows(entries) {
  if (!entries || !entries.length) entries = [{label:'手机',value:''}];
  return entries.map(function(e,i){
    var opts = ADMIN_LABELS.phone.map(function(l){ return '<option value="'+l+'"'+(l===e.label?' selected':'')+'>'+l+'</option>'; }).join('');
    return '<div class="g-entry-row"><select class="g-label-select">'+opts+'</select><input class="g-entry-input" value="'+escapeHtml(e.value||'')+'" placeholder="电话号码"><button class="g-entry-del">✕</button></div>';
  }).join('');
}
function renderEmailRows(entries) {
  if (!entries || !entries.length) entries = [{label:'工作',value:''}];
  return entries.map(function(e,i){
    var opts = ADMIN_LABELS.email.map(function(l){ return '<option value="'+l+'"'+(l===e.label?' selected':'')+'>'+l+'</option>'; }).join('');
    return '<div class="g-entry-row"><select class="g-label-select">'+opts+'</select><input class="g-entry-input" value="'+escapeHtml(e.value||'')+'" placeholder="邮箱地址"><button class="g-entry-del">✕</button></div>';
  }).join('');
}
function renderAddressRows(entries) {
  if (!entries || !entries.length) return '';
  return entries.map(function(e,i){
    var lopts = ADMIN_LABELS.address.map(function(l){ return '<option value="'+l+'"'+(l===e.label?' selected':'')+'>'+l+'</option>'; }).join('');
    var popts = ADMIN_PROVINCES.map(function(p){ return '<option value="'+p+'"'+(p===e.province?' selected':'')+'>'+p+'</option>'; }).join('');
    return '<div class="g-addr-card"><div class="g-addr-top"><select class="g-label-select">'+lopts+'</select><button class="g-entry-del">✕</button></div><div class="g-addr-line"><select class="g-addr-select"><option value="">选择省/市</option>'+popts+'</select><input class="g-addr-city" value="'+escapeHtml(e.city||'')+'" placeholder="城市"><input class="g-addr-district" value="'+escapeHtml(e.district||'')+'" placeholder="区/县"></div><input class="g-addr-detail" value="'+escapeHtml(e.detail||'')+'" placeholder="详细地址 (街道/门牌号)"></div>';
  }).join('');
}
function cardForm(c) {
  var phones = normalizePhoneEntries(c.phones, c.phone);
  var emails = normalizeEmailEntries(c.emails, c.email);
  var addresses = Array.isArray(c.addresses) ? c.addresses.filter(function(a){return a.province||a.detail}) : [];
  if (!phones.length) phones = [{label:'手机',value:''}];
  if (!emails.length) emails = [{label:'工作',value:''}];
  return '<div class="g-form"><div class="g-form-row-2"><input id="card-name" class="g-input-lg" placeholder="姓名 *" value="'+escapeHtml(c.name||'')+'"><input id="card-company" class="g-input-lg" placeholder="工作单位" value="'+escapeHtml(c.company||'')+'"></div><div class="g-form-row-2"><input id="card-position" class="g-input-lg" placeholder="职位" value="'+escapeHtml(c.position||'')+'"><input id="card-wechat" class="g-input-lg" placeholder="微信" value="'+escapeHtml(c.wechat||'')+'"></div><div class="g-section-label">📞 电话</div><div id="phone-container">'+renderPhoneRows(phones)+'</div><button class="g-add-btn" id="add-phone-btn">+ 添加电话</button><div class="g-section-label">📧 邮箱</div><div id="email-container">'+renderEmailRows(emails)+'</div><button class="g-add-btn" id="add-email-btn">+ 添加邮箱</button><div class="g-section-label">📍 地址</div><div id="address-container">'+renderAddressRows(addresses)+'</div><button class="g-add-btn" id="add-address-btn">+ 添加地址</button><div class="g-section-label">🎓 教育经历</div><textarea class="g-textarea-json" id="card-edu" placeholder=\'[{"school":"北京大学","degree":"本科","startYear":"2010","endYear":"2014"}]\'>'+escapeHtml(JSON.stringify(c.educationBackground||[]))+'</textarea><div class="g-section-label">💼 工作经历</div><textarea class="g-textarea-json" id="card-work" placeholder=\'[{"company":"腾讯","position":"工程师","startYear":"2014","endYear":"2020"}]\'>'+escapeHtml(JSON.stringify(c.workExperience||[]))+'</textarea><div class="g-section-label">备注</div><textarea class="g-textarea-json" id="card-remark" style="min-height:80px" placeholder="备注">'+escapeHtml(c.remark||'')+'</textarea></div>';
}
function collectPhoneFromDom() {
  return Array.from(document.querySelectorAll('#phone-container .g-entry-row')).map(function(row){
    var sel = row.querySelector('select'), inp = row.querySelector('input');
    return {label: sel?sel.value:'手机', value: (inp?inp.value:'').trim()};
  }).filter(function(p){return p.value;});
}
function collectEmailFromDom() {
  return Array.from(document.querySelectorAll('#email-container .g-entry-row')).map(function(row){
    var sel = row.querySelector('select'), inp = row.querySelector('input');
    return {label: sel?sel.value:'工作', value: (inp?inp.value:'').trim()};
  }).filter(function(e){return e.value;});
}
function collectAddressFromDom() {
  return Array.from(document.querySelectorAll('#address-container .g-addr-card')).map(function(card){
    var selects = card.querySelectorAll('select');
    var inputs = card.querySelectorAll('input');
    return {label: selects[0]?selects[0].value:'家庭', province: selects[1]?selects[1].value:'', city: inputs[0]?inputs[0].value.trim():'', district: inputs[1]?inputs[1].value.trim():'', detail: inputs[2]?inputs[2].value.trim():''};
  }).filter(function(a){return a.province||a.detail;});
}
async function showCardEditor(id) {
  if (!selectedLibId && !id) return toast('请先选择名片库','error');
  const c = id ? await api('/cards/'+id) : {};
  openModal(id?'编辑名片':'新建名片', cardForm(c) + '<div class="modal-footer"><button class="btn btn-muted" onclick="closeModal()">取消</button><button class="btn btn-primary" onclick="saveCard(' + (id||0) + ')" style="background:#1a73e8;padding:0 28px;border-radius:20px;height:40px">保存</button></div>', 'large');
  var body = document.getElementById('modal-body');
  body.addEventListener('click', function(e){
    if (e.target.id === 'add-phone-btn') { e.preventDefault(); var a = collectPhoneFromDom(); a.push({label:'手机',value:''}); document.getElementById('phone-container').innerHTML = renderPhoneRows(a); }
    if (e.target.id === 'add-email-btn') { e.preventDefault(); var a = collectEmailFromDom(); a.push({label:'工作',value:''}); document.getElementById('email-container').innerHTML = renderEmailRows(a); }
    if (e.target.id === 'add-address-btn') { e.preventDefault(); var a = collectAddressFromDom(); a.push({label:'家庭',province:'',city:'',district:'',detail:''}); document.getElementById('address-container').innerHTML = renderAddressRows(a); }
    if (e.target.matches('#phone-container .g-entry-del')) { e.preventDefault(); var a = collectPhoneFromDom(); var idx = Array.from(e.target.parentNode.parentNode.children).indexOf(e.target.parentNode); a.splice(idx,1); if(!a.length) a=[{label:'手机',value:''}]; document.getElementById('phone-container').innerHTML = renderPhoneRows(a); }
    if (e.target.matches('#email-container .g-entry-del')) { e.preventDefault(); var a = collectEmailFromDom(); var idx = Array.from(e.target.parentNode.parentNode.children).indexOf(e.target.parentNode); a.splice(idx,1); if(!a.length) a=[{label:'工作',value:''}]; document.getElementById('email-container').innerHTML = renderEmailRows(a); }
    if (e.target.matches('#address-container .g-entry-del')) { e.preventDefault(); var a = collectAddressFromDom(); var cards = document.querySelectorAll('#address-container .g-addr-card'); var idx = Array.from(cards).indexOf(e.target.parentNode.closest('.g-addr-card')); a.splice(idx,1); document.getElementById('address-container').innerHTML = renderAddressRows(a); }
  });
}
async function saveCard(id) {
  var name = document.getElementById('card-name').value.trim();
  if (!name) return toast('姓名必填','error');
  var phones = collectPhoneFromDom(), emails = collectEmailFromDom(), addresses = collectAddressFromDom();
  var edu=[], work=[];
  try{edu=JSON.parse(document.getElementById('card-edu').value||'[]')}catch(e){return toast('教育经历 JSON 格式不对','error')}
  try{work=JSON.parse(document.getElementById('card-work').value||'[]')}catch(e){return toast('工作经历 JSON 格式不对','error')}
  var body = {libraryId:selectedLibId, name:name, avatar:'', phone:phones[0]?.value||'', phones:phones, email:emails[0]?.value||'', emails:emails, company:document.getElementById('card-company').value.trim(), position:document.getElementById('card-position').value.trim(), wechat:document.getElementById('card-wechat').value.trim(), addresses:addresses, educationBackground:edu, workExperience:work, remark:document.getElementById('card-remark').value.trim()};
  try{ await api(id?'/cards/'+id:'/cards',{method:id?'PUT':'POST',body}); toast('已保存','success'); closeModal(); loadCardList(); }catch(e){toast(e.message,'error')}
}
async function deleteCard(id) { confirmLayer({ title:'删除名片', tone:'soft', message:'删除是低频操作。确定删除这张名片？', okText:'确认删除', onOk: async()=>{ await api('/cards/'+id,{method:'DELETE'}); toast('已删除','success'); loadCardList(); }}); }
async function showCardVisibility(id) { const vis = await api('/cards/'+id+'/visibility').catch(()=>[]); const map={}; vis.forEach(v=>map[v.fieldName]=v.visibility); openModal('字段可见性', '<div class="field-grid">' + Object.entries(LIB_FIELD_LABELS).map(([k,v])=>'<label class="field-check">' + v + '<select data-field="' + k + '" style="width:100%;margin-top:6px"><option value="public" ' + (map[k]==='public'?'selected':'') + '>公开</option><option value="admin_only" ' + (map[k]==='admin_only'?'selected':'') + '>仅管理员</option><option value="hidden" ' + (map[k]==='hidden'?'selected':'') + '>隐藏</option></select></label>').join('') + '</div><div class="modal-footer"><button class="btn btn-muted" onclick="closeModal()">取消</button><button class="btn btn-primary" onclick="saveCardVisibility('+id+')">保存</button></div>', 'large'); }
async function saveCardVisibility(id){ const fields=Array.from(document.querySelectorAll('#modal-body select[data-field]')).map(s=>({fieldName:s.dataset.field,visibility:s.value})); try{await api('/cards/'+id+'/visibility',{method:'PUT',body:{fields}});toast('已保存','success');closeModal();}catch(e){toast(e.message,'error')} }

async function loadSettings() { const el=document.getElementById('page-settings'); el.innerHTML='<h2>\u2699\uFE0F 设置</h2><div class="tabs"><div class="tab active" onclick="showSettingsTab(\'profile\',this)">个人设置</div>' + (currentUser.role==='super_admin'?'<div class="tab" onclick="showSettingsTab(\'users\',this)">用户管理</div>':'') + '</div><div id="settings-body"></div>'; showSettingsTab('profile'); }
function showSettingsTab(name, tabEl){ document.querySelectorAll('.tab').forEach(function(t){t.classList.remove('active')}); if(tabEl) tabEl.classList.add('active'); if(name==='users') loadUsersInSettings(); else loadProfileSettings(); }
async function loadProfileSettings(){ const me=await api('/auth/me'); const libs=await api('/libraries'); document.getElementById('settings-body').innerHTML='<div class="card"><div class="card-title">个人资料</div><input class="input" id="me-nick" value="' + escapeHtml(me.nickname||'') + '" placeholder="昵称"><input class="input" id="me-phone" value="' + escapeHtml(me.phone||'') + '" placeholder="手机"><button class="btn btn-primary" onclick="saveMe()">保存资料</button></div><div class="card"><div class="card-title">默认名片库</div><p style="color:#666;margin-bottom:8px">进入「名片管理」时自动选中该名片库，免去手动选择。</p><select id="me-default-lib" style="width:100%"><option value="">无（手动选择）</option>' + libs.map(function(l){return '<option value="' + l.id + '" ' + (me.defaultLibraryId===l.id?'selected':'') + '>' + escapeHtml(l.name) + '</option>'}).join('') + '</select><button class="btn btn-blue" onclick="saveDefaultLib()" style="margin-top:10px">保存默认名片库</button></div><div class="card"><div class="card-title">修改密码</div><input class="input" type="password" id="old-pass" placeholder="旧密码"><input class="input" type="password" id="new-pass" placeholder="新密码，至少6位"><button class="btn btn-blue" onclick="changePassword()">修改密码</button></div>'; }
async function saveMe(){ try{const me=await api('/auth/me',{method:'PUT',body:{nickname:document.getElementById('me-nick').value,phone:document.getElementById('me-phone').value}}); localStorage.setItem('user',JSON.stringify(me)); currentUser=me; document.getElementById('user-info').textContent=me.nickname||me.username; toast('已保存','success')}catch(e){toast(e.message,'error')} }
async function saveDefaultLib(){ try{const id=document.getElementById('me-default-lib').value; const me=await api('/auth/me',{method:'PUT',body:{defaultLibraryId:id||null}}); localStorage.setItem('user',JSON.stringify(me)); currentUser=me; toast('默认名片库已保存','success')}catch(e){toast(e.message,'error')} }
async function changePassword(){ try{await api('/auth/password',{method:'PUT',body:{oldPassword:document.getElementById('old-pass').value,newPassword:document.getElementById('new-pass').value}}); toast('密码已修改，请重新登录','success'); setTimeout(doLogout,800);}catch(e){toast(e.message,'error')} }
async function loadUsersInSettings(){ const users=await api('/auth/users'); document.getElementById('settings-body').innerHTML='<div class="toolbar"><button class="btn btn-primary" onclick="showAddUser()">+ 新建用户</button></div><div class="card"><table><thead><tr><th>ID</th><th>用户名</th><th>昵称</th><th>手机号</th><th>角色</th><th>操作</th></tr></thead><tbody>' + users.map(function(u){return '<tr><td>' + u.id + '</td><td>' + escapeHtml(u.username) + '</td><td>' + escapeHtml(u.nickname||'-') + '</td><td>' + escapeHtml(u.phone||'-') + '</td><td><span class="badge badge-' + u.role + '">' + roleLabel(u.role) + '</span></td><td><button class="btn-sm outline" onclick="editUser(' + u.id + ')">编辑</button>' + (u.role!=='super_admin'&&u.id!==currentUser.id?'<button class="btn-sm danger" onclick="deleteUser(' + u.id + ')">删除</button>':'') + '</td></tr>'}).join('') + '</tbody></table></div>'; }
function showAddUser(){ openModal('新建用户', '<input class="input" id="u-name" placeholder="用户名"><input class="input" id="u-nick" placeholder="昵称"><input class="input" id="u-phone" placeholder="手机号码"><input class="input" type="password" id="u-pass" placeholder="密码"><select id="u-role" style="width:100%"><option value="user">普通用户</option><option value="super_admin">超级管理员</option></select><div class="modal-footer"><button class="btn btn-muted" onclick="closeModal()">取消</button><button class="btn btn-primary" onclick="createUser()">创建</button></div>'); }
async function createUser(){ try{await api('/auth/users',{method:'POST',body:{username:document.getElementById('u-name').value,nickname:document.getElementById('u-nick').value,phone:document.getElementById('u-phone').value,password:document.getElementById('u-pass').value,role:document.getElementById('u-role').value}}); toast('已创建','success'); closeModal(); loadUsersInSettings();}catch(e){toast(e.message,'error')} }
async function editUser(id){ const users=await api('/auth/users'); const u=users.find(function(x){return x.id===id}); openModal('编辑用户', '<input class="input" id="u-nick" value="' + escapeHtml(u.nickname||'') + '" placeholder="昵称"><input class="input" id="u-phone" value="' + escapeHtml(u.phone||'') + '" placeholder="手机号码"><input class="input" type="password" id="u-pass" placeholder="重置密码，留空不改"><select id="u-role" style="width:100%"><option value="user" ' + (u.role==='user'?'selected':'') + '>普通用户</option><option value="super_admin" ' + (u.role==='super_admin'?'selected':'') + '>超级管理员</option></select><div class="modal-footer"><button class="btn btn-muted" onclick="closeModal()">取消</button><button class="btn btn-primary" onclick="saveUser('+id+')">保存</button></div>'); }
async function saveUser(id){ const body={nickname:document.getElementById('u-nick').value,phone:document.getElementById('u-phone').value,role:document.getElementById('u-role').value}; const p=document.getElementById('u-pass').value; if(p) body.password=p; try{await api('/auth/users/'+id,{method:'PUT',body}); toast('已保存','success'); closeModal(); loadUsersInSettings();}catch(e){toast(e.message,'error')} }
async function deleteUser(id){ confirmLayer({title:'删除用户',tone:'soft',message:'确定删除该用户？相关名片库和名片可能受影响。',okText:'确认删除',onOk:async()=>{await api('/auth/users/'+id,{method:'DELETE'});toast('已删除','success');loadUsersInSettings();}}); }

async function loadDuplicates(){ document.getElementById('page-duplicates').innerHTML='<div class="card"><p>查重模块保留原接口，下一步可继续细化交互。</p></div>'; }
async function loadImport(){ document.getElementById('page-import').innerHTML='<div class="card"><p>导入导出模块保留原接口，下一步可继续细化交互。</p></div>'; }
