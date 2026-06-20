import { getLibraries, createLibrary } from '../../utils/api';

const app = getApp();

Page({
  data: {
    libraries: [],
    user: null,
    loading: true,
    showDialog: false,
    newLibName: '',
    newLibDesc: '',
  },

  async onShow() {
    const user = app.globalData.user;
    if (!user) {
      wx.reLaunch({ url: '/pages/login/index' });
      return;
    }
    this.setData({ user });
    await this.loadLibraries();
  },

  onPullDownRefresh() {
    this.loadLibraries().then(() => wx.stopPullDownRefresh());
  },

  async loadLibraries() {
    try {
      this.setData({ loading: true });
      const libraries = await getLibraries();
      this.setData({ libraries, loading: false });
    } catch (err) {
      this.setData({ loading: false });
    }
  },

  goToLib(e) {
    const id = e.currentTarget.dataset.id;
    wx.navigateTo({ url: `/pages/cards/index?libraryId=${id}` });
  },

  goToSearch() {
    wx.navigateTo({ url: `/pages/cards/index?search=1` });
  },

  goToMerge() {
    wx.navigateTo({ url: `/pages/merge/index` });
  },

  goToImport() {
    wx.navigateTo({ url: `/pages/import/index` });
  },

  showCreateDialog() {
    this.setData({ showDialog: true, newLibName: '', newLibDesc: '' });
  },

  hideDialog() {
    this.setData({ showDialog: false });
  },

  onLibNameInput(e) {
    this.setData({ newLibName: e.detail.value });
  },

  onLibDescInput(e) {
    this.setData({ newLibDesc: e.detail.value });
  },

  async createLibrary() {
    const { newLibName } = this.data;
    if (!newLibName.trim()) {
      wx.showToast({ title: '请输入名称', icon: 'none' });
      return;
    }
    try {
      wx.showLoading({ title: '创建中...' });
      await createLibrary({ name: newLibName.trim(), description: this.data.newLibDesc.trim() });
      wx.hideLoading();
      this.setData({ showDialog: false });
      wx.showToast({ title: '创建成功', icon: 'success' });
      await this.loadLibraries();
    } catch (err) {
      wx.hideLoading();
      wx.showToast({ title: err.message || '创建失败', icon: 'none' });
    }
  },
});
