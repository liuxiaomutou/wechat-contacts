import { getCard, deleteCard } from '../../utils/api';

function arr(v, fallback) {
  if (Array.isArray(v)) return v;
  if (typeof v === 'string' && v.trim()) {
    try { const p = JSON.parse(v); return Array.isArray(p) ? p : [v]; } catch { return [v]; }
  }
  return fallback ? [fallback] : [];
}
function visible(v) {
  return v !== undefined && v !== null && v !== '' && !(Array.isArray(v) && v.length === 0);
}

Page({
  data: {
    cardId: '',
    card: {},
    phones: [],
    emails: [],
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
      this.setData({
        card: { ...card, initial: (card.name || '?').slice(0, 1) },
        phones: arr(card.phones, card.phone),
        emails: arr(card.emails, card.email),
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

  isVisible(e) {
    return visible(e);
  },

  callPhone(e) {
    const phone = e.currentTarget.dataset.phone || this.data.phones[0];
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

  closeConfirm() {
    this.setData({ showConfirm: false });
  },

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
