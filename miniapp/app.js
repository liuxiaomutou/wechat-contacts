// app.js
App({
  globalData: {
    baseUrl: 'http://localhost:3000/api', // 部署时改成实际域名
    user: null,
  },
  onLaunch() {
    const token = wx.getStorageSync('token');
    const user = wx.getStorageSync('user');
    if (token && user) {
      this.globalData.user = user;
    }
  },
});
