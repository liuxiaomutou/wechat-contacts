/**
 * API 请求封装
 * 统一处理请求/响应格式、错误处理
 */

const app = getApp();

/**
 * 基础请求方法
 */
function request(url, options = {}) {
  const baseUrl = app.globalData.baseUrl;
  
  return new Promise((resolve, reject) => {
    wx.request({
      url: `${baseUrl}${url}`,
      method: options.method || 'GET',
      data: options.data,
      header: {
        'Content-Type': 'application/json',
        ...options.header
      },
      success(res) {
        // 2xx 成功
        if (res.statusCode >= 200 && res.statusCode < 300) {
          resolve(res.data);
        } else if (res.statusCode === 404) {
          reject({ code: 404, message: '请求的资源不存在' });
        } else if (res.statusCode === 409) {
          reject({ code: 409, message: res.data?.error || '数据冲突' });
        } else {
          reject({ code: res.statusCode, message: res.data?.error || '请求失败' });
        }
      },
      fail(err) {
        // 网络错误
        console.error('网络请求失败:', err);
        wx.showToast({ title: '网络异常，请检查服务器', icon: 'none' });
        reject({ code: -1, message: '网络连接失败' });
      }
    });
  });
}

/**
 * 构建查询字符串
 */
function buildQuery(params) {
  const parts = [];
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== '') {
      parts.push(`${encodeURIComponent(key)}=${encodeURIComponent(value)}`);
    }
  }
  return parts.length ? `?${parts.join('&')}` : '';
}

/**
 * ============ 联系人 API ============
 */

// 获取联系人列表
export function getContacts(params = {}) {
  return request(`/contacts${buildQuery(params)}`);
}

// 获取联系人详情
export function getContact(id) {
  return request(`/contacts/${id}`);
}

// 新建联系人
export function createContact(data) {
  return request('/contacts', {
    method: 'POST',
    data
  });
}

// 更新联系人
export function updateContact(id, data) {
  return request(`/contacts/${id}`, {
    method: 'PUT',
    data
  });
}

// 删除联系人
export function deleteContact(id) {
  return request(`/contacts/${id}`, {
    method: 'DELETE'
  });
}

/**
 * ============ 分组 API ============
 */

// 获取全部分组
export function getGroups() {
  return request('/groups');
}

// 创建分组
export function createGroup(data) {
  return request('/groups', {
    method: 'POST',
    data
  });
}

// 更新分组
export function updateGroup(id, data) {
  return request(`/groups/${id}`, {
    method: 'PUT',
    data
  });
}

// 删除分组
export function deleteGroup(id) {
  return request(`/groups/${id}`, {
    method: 'DELETE'
  });
}

// 获取分组下的联系人
export function getGroupContacts(id) {
  return request(`/groups/${id}/contacts`);
}
