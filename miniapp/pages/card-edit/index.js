import { getCard, createCard, updateCard } from '../../utils/api';

function emptyCard() {
  return {
    name: '', avatar: '', gender: '', company: '', position: '', jobLevel: '', industry: '', field: '',
    phones: [''], emails: [''], wechat: '', qq: '', website: '', linkedin: '', fax: '',
    residentialAddress: '', hometownAddress: '', birthplace: '',
    educationBackground: [], workExperience: [], socialPositions: [], skills: [], tags: '', remark: '', isPublic: true
  };
}
function arr(v, fallback = ['']) {
  if (Array.isArray(v)) return v.length ? v : fallback;
  if (typeof v === 'string' && v.trim()) { try { const p = JSON.parse(v); return Array.isArray(p) ? p : [v]; } catch { return [v]; } }
  return fallback;
}
function normalize(card) {
  return {
    ...emptyCard(), ...card,
    phones: arr(card.phones, card.phone ? [card.phone] : ['']),
    emails: arr(card.emails, card.email ? [card.email] : ['']),
    educationBackground: arr(card.educationBackground, []),
    workExperience: arr(card.workExperience, []),
    socialPositions: arr(card.socialPositions, []),
    skills: arr(card.skills, [])
  };
}

Page({
  data: { cardId: '', libraryId: '', card: emptyCard(), genders: [{ value: '', label: '未设置' }, { value: 'male', label: '男' }, { value: 'female', label: '女' }] },

  onLoad(options) {
    this.setData({ cardId: options.cardId || '', libraryId: options.libraryId || '' });
    if (options.cardId) this.loadCard();
  },

  async loadCard() {
    try { this.setData({ card: normalize(await getCard(this.data.cardId)) }); }
    catch (error) { wx.showToast({ title: error.message || '加载失败', icon: 'none' }); }
  },

  setField(e) { this.setData({ [`card.${e.currentTarget.dataset.field}`]: e.detail.value }); },
  onPublicChange(e) { this.setData({ 'card.isPublic': e.detail.value }); },
  onGenderChange(e) {
    const item = this.data.genders[e.detail.value] || this.data.genders[0];
    this.setData({ 'card.gender': item.value });
  },

  addPhone() { this.setData({ 'card.phones': [...this.data.card.phones, ''] }); },
  removePhone(e) { const a = [...this.data.card.phones]; a.splice(e.currentTarget.dataset.index, 1); this.setData({ 'card.phones': a.length ? a : [''] }); },
  onPhoneInput(e) { const a = [...this.data.card.phones]; a[e.currentTarget.dataset.index] = e.detail.value; this.setData({ 'card.phones': a }); },
  addEmail() { this.setData({ 'card.emails': [...this.data.card.emails, ''] }); },
  removeEmail(e) { const a = [...this.data.card.emails]; a.splice(e.currentTarget.dataset.index, 1); this.setData({ 'card.emails': a.length ? a : [''] }); },
  onEmailInput(e) { const a = [...this.data.card.emails]; a[e.currentTarget.dataset.index] = e.detail.value; this.setData({ 'card.emails': a }); },

  addEducation() { this.setData({ 'card.educationBackground': [...this.data.card.educationBackground, { school: '', major: '', degree: '', startDate: '', endDate: '' }] }); },
  removeEducation(e) { const a = [...this.data.card.educationBackground]; a.splice(e.currentTarget.dataset.index, 1); this.setData({ 'card.educationBackground': a }); },
  setEducationField(e) { const a = [...this.data.card.educationBackground]; a[e.currentTarget.dataset.index][e.currentTarget.dataset.field] = e.detail.value; this.setData({ 'card.educationBackground': a }); },

  addWorkExperience() { this.setData({ 'card.workExperience': [...this.data.card.workExperience, { company: '', position: '', department: '', startDate: '', endDate: '', description: '' }] }); },
  removeWorkExperience(e) { const a = [...this.data.card.workExperience]; a.splice(e.currentTarget.dataset.index, 1); this.setData({ 'card.workExperience': a }); },
  setWorkField(e) { const a = [...this.data.card.workExperience]; a[e.currentTarget.dataset.index][e.currentTarget.dataset.field] = e.detail.value; this.setData({ 'card.workExperience': a }); },

  addSocialPosition() { this.setData({ 'card.socialPositions': [...this.data.card.socialPositions, { organization: '', position: '', startDate: '', endDate: '' }] }); },
  removeSocialPosition(e) { const a = [...this.data.card.socialPositions]; a.splice(e.currentTarget.dataset.index, 1); this.setData({ 'card.socialPositions': a }); },
  setSocialField(e) { const a = [...this.data.card.socialPositions]; a[e.currentTarget.dataset.index][e.currentTarget.dataset.field] = e.detail.value; this.setData({ 'card.socialPositions': a }); },

  async onSubmit() {
    const c = this.data.card;
    const phones = c.phones.map(x => x.trim()).filter(Boolean);
    const emails = c.emails.map(x => x.trim()).filter(Boolean);
    if (!c.name) return wx.showToast({ title: '姓名必填', icon: 'none' });
    const data = { ...c, phones, phone: phones[0] || '', emails, email: emails[0] || '' };
    if (!this.data.cardId) data.libraryId = this.data.libraryId;
    try {
      if (this.data.cardId) await updateCard(this.data.cardId, data); else await createCard(data);
      wx.showToast({ title: '已保存' });
      setTimeout(() => wx.navigateBack(), 500);
    } catch (error) { wx.showToast({ title: error.message || '保存失败', icon: 'none' }); }
  }
});
