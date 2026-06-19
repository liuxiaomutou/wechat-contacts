/**
 * 工具函数
 */

/**
 * 格式化手机号：138 **** 8001
 */
export function formatPhone(phone) {
  if (!phone || phone.length !== 11) return phone || '';
  return `${phone.slice(0, 3)} ${phone.slice(3, 7)} ${phone.slice(7)}`;
}

/**
 * 格式化时间
 */
export function formatTime(dateStr) {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  const now = new Date();
  const diff = now - date;

  // 1分钟内：刚刚
  if (diff < 60 * 1000) return '刚刚';
  // 1小时内：N分钟前
  if (diff < 60 * 60 * 1000) return `${Math.floor(diff / 60000)}分钟前`;
  // 今天：HH:mm
  if (date.toDateString() === now.toDateString()) {
    return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
  }
  // 昨天：昨天 HH:mm
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  if (date.toDateString() === yesterday.toDateString()) {
    return `昨天 ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
  }
  // 今年：MM-DD
  if (date.getFullYear() === now.getFullYear()) {
    return `${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  }
  // 更早：YYYY-MM-DD
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

/**
 * 获取首字母（用于拼音索引）
 */
export function getInitial(name) {
  if (!name) return '#';
  // 简单实现：用 pinyin 库太复杂，直接用第一个字符
  const first = name.charAt(0);
  // 判断是否为英文
  if (/[a-zA-Z]/.test(first)) return first.toUpperCase();
  return first;
}

/**
 * 防抖
 */
export function debounce(fn, delay = 300) {
  let timer;
  return function (...args) {
    clearTimeout(timer);
    timer = setTimeout(() => fn.apply(this, args), delay);
  };
}

/**
 * 生成头像 URL（用名字首字作为占位）
 */
export function getAvatarUrl(name) {
  if (!name) return '';
  return name.charAt(0);
}

/**
 * 颜色数组（用于标签/头像）
 */
const COLORS = [
  '#07c160', '#ff6b6b', '#4ecdc4', '#45b7d1',
  '#96ceb4', '#ffeaa7', '#dda0dd', '#98d8c8',
  '#f7dc6f', '#bb8fce', '#85c1e9', '#f1948a'
];

export function getColorByIndex(index) {
  return COLORS[index % COLORS.length];
}
