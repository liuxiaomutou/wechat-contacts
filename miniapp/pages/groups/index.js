const { getGroups, createGroup, updateGroup, deleteGroup } = require('../../utils/api');

Page({
  data: {
    groups: [],
    showModal: false,
    editGroup: null,
    modalName: ''
  },

  onLoad() {
    this.loadGroups();
  },

  onShow() {
    this.loadGroups();
  },

  loadGroups() {
    getGroups().then(groups => {
      this.setData({ groups });
    }).catch(err => {
      wx.showToast({
        title: '加载分组失败',
        icon: 'none'
      });
      console.error('加载分组失败:', err);
    });
  },

  onAddTap() {
    this.setData({
      showModal: true,
      editGroup: null,
      modalName: ''
    });
  },

  onEditTap(e) {
    const groupId = e.currentTarget.dataset.id;
    const group = this.data.groups.find(g => g.id === groupId);
    this.setData({
      showModal: true,
      editGroup: group,
      modalName: group.name
    });
  },

  onDeleteTap(e) {
    const groupId = e.currentTarget.dataset.id;
    const groupName = this.data.groups.find(g => g.id === groupId)?.name || '未知分组';
    
    wx.showModal({
      title: '确认删除',
      content: `确定要删除分组「${groupName}」吗？此操作不可逆。`,
      confirmColor: '#ff4757',
      success: (res) => {
        if (res.confirm) {
          deleteGroup(groupId).then(() => {
            wx.showToast({
              title: '删除成功',
              icon: 'success'
            });
            this.loadGroups();
          }).catch(err => {
            wx.showToast({
              title: '删除失败',
              icon: 'none'
            });
            console.error('删除分组失败:', err);
          });
        }
      }
    });
  },

  onModalConfirm() {
    const { modalName, editGroup } = this.data;
    
    if (!modalName.trim()) {
      wx.showToast({
        title: '分组名称不能为空',
        icon: 'none'
      });
      return;
    }
    
    const data = { name: modalName.trim() };
    
    if (editGroup) {
      // 更新分组
      updateGroup(editGroup.id, data).then(() => {
        wx.showToast({
          title: '更新成功',
          icon: 'success'
        });
        this.loadGroups();
        this.setData({ showModal: false });
      }).catch(err => {
        wx.showToast({
          title: '更新失败',
          icon: 'none'
        });
        console.error('更新分组失败:', err);
      });
    } else {
      // 创建分组
      createGroup(data).then(() => {
        wx.showToast({
          title: '创建成功',
          icon: 'success'
        });
        this.loadGroups();
        this.setData({ showModal: false });
      }).catch(err => {
        wx.showToast({
          title: '创建失败',
          icon: 'none'
        });
        console.error('创建分组失败:', err);
      });
    }
  }
});