import { getCard, getCardVisibility, updateCardVisibility } from '../../utils/api';

Page({
  data: {
    cardId: '',
    card: {},
    canEdit: false,
    canDelete: false,
    canSetVisibility: false
  },

  onLoad(options) {
    const { cardId } = options;
    this.setData({ cardId });
    this.loadCard();
  },

  async loadCard() {
    try {
      const card = await getCard(this.data.cardId);
      this.setData({ card });
      
      // Check permissions
      // In a real app, this would come from user role
      // For now, assume admin/manager can edit/delete
      this.setData({
        canEdit: true,
        canDelete: true,
        canSetVisibility: true
      });
      
      // Load visibility settings
      const visibility = await getCardVisibility(this.data.cardId);
      this.setData({ visibility });
    } catch (error) {
      console.error('Failed to load card:', error);
      wx.showToast({
        title: '加载失败',
        icon: 'none'
      });
    }
  },

  callPhone() {
    wx.makePhoneCall({
      phoneNumber: this.data.card.phone
    });
  },

  copyWechat() {
    wx.setClipboardData({
      data: this.data.card.wechat,
      success: () => {
        wx.showToast({
          title: '已复制'
        });
      }
    });
  },

  onEditCard() {
    wx.navigateTo({
      url: `/pages/card-edit/index?cardId=${this.data.cardId}`
    });
  },

  onSetVisibility() {
    wx.navigateTo({
      url: `/pages/visibility/index?cardId=${this.data.cardId}`
    });
  },

  onDeleteCard() {
    wx.showModal({
      title: '确认删除',
      content: '确定要删除这张名片吗？',
      confirmColor: '#ff0000',
      success: async (res) => {
        if (res.confirm) {
          try {
            await deleteCard(this.data.cardId);
            wx.navigateBack();
          } catch (error) {
            wx.showToast({
              title: '删除失败',
              icon: 'none'
            });
          }
        }
      }
    });
  }
});