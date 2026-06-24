import { getCard, deleteCard } from '../../utils/api';

function arr(v, fallback = []) {
  if (Array.isArray(v)) return v;
  if (typeof v === 'string' && v.trim()) {
    try { const p = JSON.parse(v); return Array.isArray(p) ? p : [v]; }
    catch { return [v]; }
  }
  if (fallback && typeof fallback === 'string' && fallback.trim()) return [{ label: '', value: fallback }];
  return fallback || [];
}
function visible(v) {
  return v !== undefined && v !== null && v !== '' && !(Array.isArray(v) && v.length === 0);
}
function normalizeEntries(entries, singleFallback) {
  if (!Array.isArray(entries)) {
    if (singleFallback) return [{ label: '', value: singleFallback }];
    return [];
  }
  if (entries.length === 0) return singleFallback ? [{ label: '', value: singleFallback }] : [];
  if (typeof entries[0] === 'string') return entries.filter(Boolean).map(v => ({ label: '', value: v }));
  return entries.filter(e => e.value || e.label);
}
function formatAddress(a) {
  if (!a) return '';
  const parts = [a.province, a.city, a.district, a.detail].filter(Boolean);
  return parts.join(' ');
}
function getInitial(name) {
  return (name || '?').slice(0, 1);
}

Page({
  data: {
    cardId: '',
    card: {},
    phones: [],
    emails: [],
    addresses: [],
    education: [],
    workExperience: [],
    socialPositions: [],
    canEdit: false,
    canDelete: false,
    canSetVisibility: false,
    showConfirm: false
  },

  onLoad(options) {
    this.setData({ cardId: options.cardId || options.id || '' });
    this.loadCard();
  },

  onShow() {
    if (this.data.cardId) this.loadCard();
  },

  async loadCard() {
    try {
      const card = await getCard(this.data.cardId);
      const phones = normalizeEntries(card.phones, card.phone);
      const emails = normalizeEntries(card.emails, card.email);
      const addresses = Array.isArray(card.addresses) ? card.addresses.filter(a => a.province || a.detail) : [];
      this.setData({
        card: { ...card, initial: getInitial(card.name) },
        phones,
        emails,
        addresses: addresses.map(a => ({ ...a, addressText: formatAddress(a) })),
        education: arr(card.educationBackground),
        workExperience: arr(card.workExperience),
        socialPositions: arr(card.socialPositions),
        canEdit: !!card.actions?.canEdit,
        canDelete: !!card.actions?.canDelete,
        canSetVisibility: !!card.actions?.canManageVisibility
      });
    } catch (error) {
      wx.showToast({ title: error.message || '加载失败', icon: 'none' });
    }
  },

  isVisible(e) { return visible(e); },
  isEmptyArray(e) { return Array.isArray(e) && e.length === 0; },

  callPhone(e) {
    const phone = e.currentTarget.dataset.phone;
    if (!phone) return;
    wx.makePhoneCall({ phoneNumber: phone });
  },

  copyValue(e) {
    const value = e.currentTarget.dataset.value;
    if (!value) return;
    wx.setClipboardData({ data: value, success: () => wx.showToast({ title: '已复制' }) });
  },

  onEditCard() {
    if (!this.data.canEdit) return;
    wx.navigateTo({ url: `/pages/card-edit/index?cardId=${this.data.cardId}` });
  },

  onSetVisibility() {
    if (!this.data.canSetVisibility) return;
    wx.navigateTo({ url: `/pages/visibility/index?cardId=${this.data.cardId}` });
  },

  onDeleteCard() {
    if (!this.data.canDelete) return;
    this.setData({ showConfirm: true });
  },

  closeConfirm() { this.setData({ showConfirm: false }); },

  async confirmDelete() {
    try {
      await deleteCard(this.data.cardId);
      wx.showToast({ title: '已删除' });
      setTimeout(() => wx.navigateBack(), 500);
    } catch (error) {
      wx.showToast({ title: error.message || '删除失败', icon: 'none' });
    }
  }
});
