Page({
  data: {
    avatar: '/images/default-avatar.png',
    nickname: '',
    role: '',
    isAdmin: false
  },

  onLoad() {
    this.loadUserInfo();
  },

  loadUserInfo() {
    // In a real app, this would come from storage or API
    // For now, use mock data
    const userInfo = wx.getStorageSync('userInfo') || {};
    
    this.setData({
      avatar: userInfo.avatar || '/images/default-avatar.png',
      nickname: userInfo.nickname || '未设置昵称',
      role: userInfo.role || '普通用户',
      isAdmin: userInfo.role === 'admin'
    });
  },

  onSettings() {
    wx.navigateTo({
      url: '/pages/settings/index'
    });
  },

  onServerSettings() {
    wx.showModal({
      title: '服务器设置',
      content: '在这里可以切换服务器地址',
      showCancel: true,
      confirmText: '设置',
      success: (res) => {
        if (res.confirm) {
          wx.showInput({
            title: '请输入服务器地址',
            placeholder: 'https://api.example.com',
            success: (inputRes) => {
              if (inputRes.confirm) {
                wx.setStorageSync('apiUrl', inputRes.content);
                wx.showToast({
                  title: '设置成功'
                });
              }
            }
          });
        }
      }
    });
  },

  onLogout() {
    wx.showModal({
      title: '确认退出',
      content: '确定要退出登录吗？',
      confirmColor: '#ff0000',
      success: (res) => {
        if (res.confirm) {
          // Clear storage
          wx.clearStorageSync();
          
          // Navigate to login page
          wx.reLaunch({
            url: '/pages/login/index'
          });
        }
      }
    });
  },

  onAdminPanel() {
    // In a real app, this would open a webview
    // For now, show a message
    wx.showModal({
      title: '管理后台',
      content: '管理后台功能即将上线，敬请期待！',
      showCancel: false,
      confirmText: '知道了'
    });
  }
});