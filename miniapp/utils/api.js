/**
 * API 请求封装
 */
const app = getApp();

function request(url, options = {}) {
  const baseUrl = app.globalData.baseUrl;

  return new Promise((resolve, reject) => {
    const header = {
      'Content-Type': 'application/json',
      ...options.header,
    };

    // 自动添加 token
    const token = wx.getStorageSync('token');
    if (token) {
      header['Authorization'] = 'Bearer ' + token;
    }

    wx.request({
      url: `${baseUrl}${url}`,
      method: options.method || 'GET',
      data: options.data,
      header,
      success(res) {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          resolve(res.data);
        } else if (res.statusCode === 401) {
          wx.removeStorageSync('token');
          wx.removeStorageSync('user');
          wx.reLaunch({ url: '/pages/login/index' });
          reject({ code: 401, message: '未登录' });
        } else {
          reject({ code: res.statusCode, message: res.data?.error || '请求失败' });
        }
      },
      fail(err) {
        console.error('网络请求失败:', err);
        wx.showToast({ title: '网络异常', icon: 'none' });
        reject({ code: -1, message: '网络连接失败' });
      },
    });
  });
}

function buildQuery(params) {
  const parts = [];
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== '') {
      parts.push(`${encodeURIComponent(key)}=${encodeURIComponent(value)}`);
    }
  }
  return parts.length ? `?${parts.join('&')}` : '';
}

// ======== 认证 ========
export function login(data) {
  return request('/auth/login', { method: 'POST', data });
}
export function register(data) {
  return request('/auth/register', { method: 'POST', data });
}
export function getMe() {
  return request('/auth/me');
}
export function updateMe(data) {
  return request('/auth/me', { method: 'PUT', data });
}

// ======== 名片库 ========
export function getLibraries() {
  return request('/libraries');
}
export function createLibrary(data) {
  return request('/libraries', { method: 'POST', data });
}
export function getLibrary(id) {
  return request(`/libraries/${id}`);
}
export function updateLibrary(id, data) {
  return request(`/libraries/${id}`, { method: 'PUT', data });
}
export function deleteLibrary(id) {
  return request(`/libraries/${id}`, { method: 'DELETE' });
}
export function getMembers(libraryId) {
  return request(`/libraries/${libraryId}/members`);
}
export function addMember(libraryId, data) {
  return request(`/libraries/${libraryId}/members`, { method: 'POST', data });
}
export function updateMember(libraryId, memberId, data) {
  return request(`/libraries/${libraryId}/members/${memberId}`, { method: 'PUT', data });
}
export function deleteMember(libraryId, memberId) {
  return request(`/libraries/${libraryId}/members/${memberId}`, { method: 'DELETE' });
}

// ======== 名片 ========
export function getCards(params = {}) {
  return request(`/cards${buildQuery(params)}`);
}
export function getCard(id) {
  return request(`/cards/${id}`);
}
export function createCard(data) {
  return request('/cards', { method: 'POST', data });
}
export function updateCard(id, data) {
  return request(`/cards/${id}`, { method: 'PUT', data });
}
export function deleteCard(id) {
  return request(`/cards/${id}`, { method: 'DELETE' });
}
export function getCardVisibility(id) {
  return request(`/cards/${id}/visibility`);
}
export function updateCardVisibility(id, data) {
  return request(`/cards/${id}/visibility`, { method: 'PUT', data });
}

// ======== 查重 ========
export function detectDuplicates(libraryId) {
  return request(`/duplicates/${libraryId}/detect`, { method: 'POST' });
}
export function getDuplicates(libraryId, params = {}) {
  return request(`/duplicates/${libraryId}${buildQuery(params)}`);
}
export function getDuplicateGroup(libraryId, groupId) {
  return request(`/duplicates/${libraryId}/groups/${groupId}`);
}
export function mergeDuplicates(data) {
  return request('/duplicates/merge', { method: 'POST', data });
}
export function dismissDuplicates(libraryId, groupId) {
  return request(`/duplicates/${libraryId}/dismiss/${groupId}`, { method: 'POST' });
}
export function getDuplicateStats(libraryId) {
  return request(`/duplicates/${libraryId}/stats`);
}
