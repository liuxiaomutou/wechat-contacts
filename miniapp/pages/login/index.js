import { login, register } from '../../utils/api';

Page({
  data: {
    showLogin: false, // false=登录模式, true=注册模式
    username: '',
    password: '',
    nickname: '',
  },

  onInput(e) {
    const { field } = e.currentTarget.dataset;
    this.setData({ [field]: e.detail.value });
  },

  switchTab() {
    this.setData({ showLogin: !this.data.showLogin });
  },

  async handleSubmit() {
    const { showLogin, username, password, nickname } = this.data;

    if (!username || !password) {
      wx.showToast({ title: '用户名和密码不能为空', icon: 'none' });
      return;
    }
    if (!showLogin && password.length < 6) {
      wx.showToast({ title: '密码至少6位', icon: 'none' });
      return;
    }

    wx.showLoading({ title: showLogin ? '注册中...' : '登录中...' });

    try {
      let res;
      if (showLogin) {
        res = await register({ username, password, nickname: nickname || username });
      } else {
        res = await login({ username, password });
      }

      wx.hideLoading();

      const app = getApp();
      app.globalData.user = res.user;
      wx.setStorageSync('token', res.token);
      wx.setStorageSync('user', res.user);

      wx.showToast({ title: showLogin ? '注册成功' : '登录成功', icon: 'success' });
      wx.switchTab({ url: '/pages/index/index' });
    } catch (err) {
      wx.hideLoading();
      wx.showToast({ title: err.message || '操作失败', icon: 'none' });
    }
  },
});
