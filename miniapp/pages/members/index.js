import { getMembers, updateMemberRole, deleteMember } from '../../utils/api';

Page({
  data: {
    libraryId: '',
    libraryName: '',
    members: []
  },

  onLoad(options) {
    const { libraryId } = options;
    this.setData({ libraryId });
    this.loadMembers();
  },

  async loadMembers() {
    try {
      const members = await getMembers(this.data.libraryId);
      this.setData({ members });
      
      // Get library name
      const library = await getLibrary(this.data.libraryId);
      this.setData({ libraryName: library.name });
    } catch (error) {
      console.error('Failed to load members:', error);
    }
  },

  onMemberTap(e) {
    const memberId = e.currentTarget.dataset.id;
    // In a real app, this would navigate to member detail
    // For now, show a toast
    wx.showToast({
      title: '成员详情功能即将上线',
      icon: 'none'
    });
  },

  onAddMember() {
    wx.showModal({
      title: '添加成员',
      content: '请输入用户名',
      prompt: '用户名',
      success: async (res) => {
        if (res.confirm) {
          const username = res.content;
          if (!username) return;
          
          try {
            // In a real app, this would call an API
            // For now, just add to local data
            const newMember = {
              id: Date.now().toString(),
              username: username,
              nickname: username,
              role: 'viewer'
            };
            
            const members = [...this.data.members, newMember];
            this.setData({ members });
            
            wx.showToast({
              title: '添加成功'
            });
          } catch (error) {
            wx.showToast({
              title: '添加失败',
              icon: 'none'
            });
          }
        }
      }
    });
  },

  onLongPressMember(e) {
    const memberId = e.currentTarget.dataset.id;
    
    // Show role picker
    wx.showActionSheet({
      itemList: ['修改角色', '删除成员'],
      itemColor: '#ff0000',
      success: async (res) => {
        if (res.tapIndex === 0) {
          // Show role picker
          const roles = ['admin', 'manager', 'editor', 'viewer'];
          const roleNames = ['管理员', '经理', '编辑', '查看者'];
          
          wx.showActionSheet({
            itemList: roleNames,
            itemColor: '#07c160',
            success: async (roleRes) => {
              if (roleRes.tapIndex !== -1) {
                const selectedRole = roles[roleRes.tapIndex];
                
                try {
                  await updateMemberRole(memberId, selectedRole);
                  
                  // Update local data
                  const members = this.data.members.map(member => 
                    member.id === memberId 
                      ? { ...member, role: selectedRole } 
                      : member
                  );
                  this.setData({ members });
                  
                  wx.showToast({
                    title: '角色更新成功'
                  });
                } catch (error) {
                  wx.showToast({
                    title: '更新失败',
                    icon: 'none'
                  });
                }
              }
            }
          });
        } else if (res.tapIndex === 1) {
          // Delete member
          wx.showModal({
            title: '确认删除',
            content: '确定要删除这个成员吗？',
            confirmColor: '#ff0000',
            success: async (modalRes) => {
              if (modalRes.confirm) {
                try {
                  await deleteMember(memberId);
                  
                  // Update local data
                  const members = this.data.members.filter(member => member.id !== memberId);
                  this.setData({ members });
                  
                  wx.showToast({
                    title: '删除成功'
                  });
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
      }
    });
  }
});