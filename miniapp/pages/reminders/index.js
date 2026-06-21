import { bindWechatForReminders, getBirthdayReminderLogs, getBirthdayReminderSettings, updateBirthdayReminderSettings } from '../../utils/api';

const DAY_OPTIONS = [7, 3, 1, 0];
const DAY_LABELS = { 7: '提前一周', 3: '提前三天', 1: '提前一天', 0: '生日当天' };

Page({
  data: {
    enabled: true,
    reminderTime: '09:00',
    dayOptions: DAY_OPTIONS.map(value => ({ value, label: DAY_LABELS[value], checked: true })),
    templateId: '',
    logs: [],
  },

  onLoad() { this.loadSettings(); },

  async loadSettings() {
    try {
      const setting = await getBirthdayReminderSettings();
      const selected = setting.daysBefore || DAY_OPTIONS;
      this.setData({
        enabled: setting.enabled,
        reminderTime: setting.reminderTime || '09:00',
        templateId: setting.subscribeTemplateId || '',
        dayOptions: DAY_OPTIONS.map(value => ({ value, label: DAY_LABELS[value], checked: selected.includes(value) })),
      });
      this.loadLogs();
    } catch (error) {
      wx.showToast({ title: error.message || '加载失败', icon: 'none' });
    }
  },

  async loadLogs() {
    try {
      const logs = await getBirthdayReminderLogs();
      this.setData({ logs: logs.slice(0, 10) });
    } catch (_) {}
  },

  onEnabledChange(e) { this.setData({ enabled: e.detail.value }); this.saveSettings(); },
  onTimeChange(e) { this.setData({ reminderTime: e.detail.value }); this.saveSettings(); },
  onTemplateInput(e) { this.setData({ templateId: e.detail.value }); },
  onTemplateBlur() { this.saveSettings(); },
  onDayChange(e) {
    const selected = e.detail.value.map(Number);
    this.setData({ dayOptions: DAY_OPTIONS.map(value => ({ value, label: DAY_LABELS[value], checked: selected.includes(value) })) });
    this.saveSettings();
  },

  selectedDays() { return this.data.dayOptions.filter(x => x.checked).map(x => x.value); },

  async saveSettings() {
    try {
      await updateBirthdayReminderSettings({
        enabled: this.data.enabled,
        reminderTime: this.data.reminderTime,
        daysBefore: this.selectedDays(),
        subscribeTemplateId: this.data.templateId,
      });
    } catch (error) {
      wx.showToast({ title: error.message || '保存失败', icon: 'none' });
    }
  },

  requestSubscribe() {
    const tmplId = this.data.templateId;
    if (!tmplId) return wx.showToast({ title: '先填写订阅模板ID', icon: 'none' });
    wx.requestSubscribeMessage({
      tmplIds: [tmplId],
      success: () => wx.showToast({ title: '授权完成' }),
      fail: () => wx.showToast({ title: '授权失败', icon: 'none' }),
    });
  },

  bindWechat() {
    wx.login({
      success: async (res) => {
        if (!res.code) return wx.showToast({ title: '微信登录失败', icon: 'none' });
        try {
          await bindWechatForReminders(res.code);
          wx.showToast({ title: '微信已绑定' });
        } catch (error) {
          wx.showToast({ title: error.message || '绑定失败', icon: 'none' });
        }
      },
      fail: () => wx.showToast({ title: '微信登录失败', icon: 'none' }),
    });
  },
});
