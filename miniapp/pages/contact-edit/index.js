import { getContact, createContact, updateContact } from '../../utils/api';
import { getGroups } from '../../utils/api';

Page({
  data: {
    id: '',
    name: '',
    phone: '',
    email: '',
    company: '',
    position: '',
    remark: '',
    groupIds: [],
    groups: [],
    allGroups: [],
    saving: false
  },

  onLoad(options) {
    // 加载全部分组
    this.loadAllGroups();

    if (options.id) {
      // 编辑模式
      wx.setNavigationBarTitle({ title: '编辑联系人' });
      this.setData({ id: options.id });
      this.loadContact(options.id);
    } else {
      // 新增模式
      wx.setNavigationBarTitle({ title: '新建联系人' });
    }
  },

  // 加载联系人详情
  loadContact(id) {
    wx.showLoading({ title: '加载中...' });
    getContact(id)
      .then(res => {
        wx.hideLoading();
        const contact = res.data || res;
        this.setData({
          name: contact.name || '',
          phone: contact.phone || '',
          email: contact.email || '',
          company: contact.company || '',
          position: contact.position || '',
          remark: contact.remark || '',
          groupIds: contact.groupIds || contact.groups?.map(g => g.id || g) || [],
          groups: contact.groups || []
        });
      })
      .catch(err => {
        wx.hideLoading();
        wx.showToast({ title: err.message || '加载失败', icon: 'none' });
        setTimeout(() => wx.navigateBack(), 1500);
      });
  },

  // 加载全部分组
  loadAllGroups() {
    getGroups()
      .then(res => {
        const groups = res.data || res || [];
        this.setData({ allGroups: groups });
      })
      .catch(() => {
        // 分组加载失败不影响表单使用
        console.warn('加载分组失败');
      });
  },

  // 输入处理
  onInput(e) {
    const { field } = e.currentTarget.dataset;
    this.setData({ [field]: e.detail.value });
  },

  // 切换分组选择
  onGroupToggle(e) {
    const groupId = e.currentTarget.dataset.id;
    let groupIds = [...this.data.groupIds];
    const idx = groupIds.indexOf(groupId);
    if (idx > -1) {
      groupIds.splice(idx, 1);
    } else {
      groupIds.push(groupId);
    }
    this.setData({ groupIds });
  },

  // 提交表单
  submitForm() {
    if (this.data.saving) return;

    // 必填校验
    const name = this.data.name.trim();
    if (!name) {
      wx.showToast({ title: '请输入姓名', icon: 'none' });
      return;
    }

    this.setData({ saving: true });
    wx.showLoading({ title: '保存中...' });

    const payload = {
      name,
      phone: this.data.phone.trim(),
      email: this.data.email.trim(),
      company: this.data.company.trim(),
      position: this.data.position.trim(),
      remark: this.data.remark.trim(),
      groupIds: this.data.groupIds
    };

    const promise = this.data.id
      ? updateContact(this.data.id, payload)
      : createContact(payload);

    promise
      .then(() => {
        wx.hideLoading();
        wx.showToast({ title: '保存成功', icon: 'success' });
        setTimeout(() => wx.navigateBack(), 1000);
      })
      .catch(err => {
        wx.hideLoading();
        this.setData({ saving: false });
        wx.showToast({ title: err.message || '保存失败', icon: 'none' });
      });
  }
});
