import { getCardVisibility, updateCardVisibility } from '../../utils/api';

Page({
  data: {
    cardId: '',
    visibilityFields: []
  },

  onLoad(options) {
    const { cardId } = options;
    this.setData({ cardId });
    this.loadVisibility();
  },

  async loadVisibility() {
    try {
      const visibility = await getCardVisibility(this.data.cardId);
      
      // Define all possible fields and their visibility options
      const allFields = [
        { name: '姓名', key: 'name', options: ['公开', '隐藏', '仅管理员'], value: visibility.name || 0 },
        { name: '手机号', key: 'phone', options: ['公开', '隐藏', '仅管理员'], value: visibility.phone || 0 },
        { name: '微信', key: 'wechat', options: ['公开', '隐藏', '仅管理员'], value: visibility.wechat || 0 },
        { name: '邮箱', key: 'email', options: ['公开', '隐藏', '仅管理员'], value: visibility.email || 0 },
        { name: '公司', key: 'company', options: ['公开', '隐藏', '仅管理员'], value: visibility.company || 0 },
        { name: '职位', key: 'title', options: ['公开', '隐藏', '仅管理员'], value: visibility.title || 0 },
        { name: '行业', key: 'industry', options: ['公开', '隐藏', '仅管理员'], value: visibility.industry || 0 },
        { name: '领域', key: 'field', options: ['公开', '隐藏', '仅管理员'], value: visibility.field || 0 },
        { name: '级别', key: 'level', options: ['公开', '隐藏', '仅管理员'], value: visibility.level || 0 },
        { name: '籍贯', key: 'hometown', options: ['公开', '隐藏', '仅管理员'], value: visibility.hometown || 0 },
        { name: '住宅地址', key: 'residence', options: ['公开', '隐藏', '仅管理员'], value: visibility.residence || 0 },
        { name: '老家地址', key: 'originalResidence', options: ['公开', '隐藏', '仅管理员'], value: visibility.originalResidence || 0 },
        { name: 'QQ', key: 'qq', options: ['公开', '隐藏', '仅管理员'], value: visibility.qq || 0 },
        { name: '网站', key: 'website', options: ['公开', '隐藏', '仅管理员'], value: visibility.website || 0 },
        { name: 'LinkedIn', key: 'linkedin', options: ['公开', '隐藏', '仅管理员'], value: visibility.linkedin || 0 },
        { name: '传真', key: 'fax', options: ['公开', '隐藏', '仅管理员'], value: visibility.fax || 0 },
        { name: '教育经历', key: 'education', options: ['公开', '隐藏', '仅管理员'], value: visibility.education || 0 },
        { name: '工作经历', key: 'workExperience', options: ['公开', '隐藏', '仅管理员'], value: visibility.workExperience || 0 },
        { name: '社会职务', key: 'socialRoles', options: ['公开', '隐藏', '仅管理员'], value: visibility.socialRoles || 0 },
        { name: '技能标签', key: 'skills', options: ['公开', '隐藏', '仅管理员'], value: visibility.skills || 0 },
        { name: '备注', key: 'note', options: ['公开', '隐藏', '仅管理员'], value: visibility.note || 0 }
      ];
      
      // In a real app, we would check user role to determine if '仅管理员' option is available
      // For now, we'll assume admin/manager can see all options
      const isAdmin = true; // This would come from user role
      
      // Filter out '仅管理员' option for non-admin users
      const fields = allFields.map(field => {
        if (!isAdmin && field.options.length > 2) {
          return {
            ...field,
            options: field.options.slice(0, 2),
            value: field.value < 2 ? field.value : 0
          };
        }
        return field;
      });
      
      this.setData({ visibilityFields: fields });
    } catch (error) {
      console.error('Failed to load visibility:', error);
      wx.showToast({
        title: '加载失败',
        icon: 'none'
      });
    }
  },

  onVisibilityChange(e) {
    const index = e.currentTarget.dataset.index;
    const value = e.detail.value;
    
    const visibilityFields = [...this.data.visibilityFields];
    visibilityFields[index].value = value;
    
    this.setData({ visibilityFields });
  },

  async onSubmit() {
    // Prepare visibility data
    const visibility = {};
    this.data.visibilityFields.forEach(field => {
      visibility[field.key] = field.value;
    });
    
    try {
      await updateCardVisibility(this.data.cardId, visibility);
      wx.showToast({
        title: '保存成功'
      });
      wx.navigateBack();
    } catch (error) {
      console.error('Failed to save visibility:', error);
      wx.showToast({
        title: '保存失败',
        icon: 'none'
      });
    }
  }
});