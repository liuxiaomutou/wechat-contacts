import { getContact, deleteContact } from '../../utils/api';

Page({
  data: {
    contact: null,
    loading: true
  },

  onLoad(options) {
    const id = options.id;
    if (!id) {
      wx.showToast({ title: '参数错误', icon: 'none' });
      wx.navigateBack();
      return;
    }
    this.fetchContact(id);
  },

  fetchContact(id) {
    this.setData({ loading: true });
    getContact(id)
      .then(res => {
        // 兼容两种返回格式：直接返回数据 或 { data: ... }
        const contact = res.data || res;
        this.setData({ contact, loading: false });
        // 动态设置导航栏标题
        if (contact.name) {
          wx.setNavigationBarTitle({ title: contact.name });
        }
      })
      .catch(err => {
        console.error('获取联系人详情失败:', err);
        this.setData({ loading: false });
        wx.showToast({ title: err.message || '加载失败', icon: 'none' });
      });
  },

  // 打电话
  onPhoneTap(e) {
    const phone = e.currentTarget.dataset.phone;
    if (!phone) return;
    wx.makePhoneCall({
      phoneNumber: phone
    });
  },

  // 发短信
  onSMSTap(e) {
    const phone = e.currentTarget.dataset.phone;
    if (!phone) return;
    wx.showActionSheet({
      itemList: ['发送短信'],
      success() {
        wx.makePhoneCall({
          phoneNumber: phone
        });
      }
    });
  },

  // 编辑联系人
  onEditTap() {
    const { contact } = this.data;
    if (!contact) return;
    wx.navigateTo({
      url: `/pages/contact-edit/index?id=${contact.id}`
    });
  },

  // 删除联系人
  onDeleteTap() {
    const { contact } = this.data;
    if (!contact) return;
    wx.showModal({
      title: '确认删除',
      content: `确定要删除联系人「${contact.name}」吗？此操作不可恢复。`,
      success: (res) => {
        if (res.confirm) {
          this.deleteContact(contact.id);
        }
      }
    });
  },

  deleteContact(id) {
    wx.showLoading({ title: '删除中...' });
    deleteContact(id)
      .then(() => {
        wx.hideLoading();
        wx.showToast({ title: '删除成功', icon: 'success' });
        // 回退到列表页
        setTimeout(() => {
          wx.navigateBack();
        }, 1500);
      })
      .catch(err => {
        wx.hideLoading();
        console.error('删除联系人失败:', err);
        wx.showToast({ title: err.message || '删除失败', icon: 'none' });
      });
  },

  // 收藏/取消收藏
  onFavoriteTap() {
    const { contact } = this.data;
    if (!contact) return;
    const { updateContact } = require('../../utils/api');
    const newFavorite = !contact.favorite;
    wx.showLoading({ title: newFavorite ? '收藏中...' : '取消收藏...' });
    updateContact(contact.id, { favorite: newFavorite })
      .then(() => {
        wx.hideLoading();
        this.setData({
          'contact.favorite': newFavorite
        });
        wx.showToast({
          title: newFavorite ? '已收藏' : '已取消收藏',
          icon: 'success'
        });
      })
      .catch(err => {
        wx.hideLoading();
        console.error('操作失败:', err);
        wx.showToast({ title: err.message || '操作失败', icon: 'none' });
      });
  },

  // 预览头像大图
  onAvatarTap() {
    // 如果有头像 URL 可预览大图，目前只显示首字圆圈
  },

  onShareAppMessage() {
    const { contact } = this.data;
    if (!contact) return {};
    return {
      title: `${contact.name} - 联系人信息`,
      path: `/pages/contact-detail/index?id=${contact.id}`
    };
  }
});
