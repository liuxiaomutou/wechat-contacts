import { getCard, createCard, updateCard, uploadImage } from '../../utils/api';

function emptyCard() {
  return {
    name: '', avatar: '', gender: '', company: '', position: '', industry: '', field: '',
    phones: [''], emails: [''], wechat: '', qq: '', website: '', linkedin: '', fax: '',
    solarBirthday: '', lunarBirthday: '', ethnicity: '', birthplace: '', maritalStatus: '',
    province: '', city: '', district: '', township: '', detailAddress: '',
    residentialAddress: '', hometownAddress: '',
    educationBackground: [], workExperience: [], socialPositions: [], skills: [], tags: '', remark: '', isPublic: true
  };
}
function arr(v, fallback = ['']) {
  if (Array.isArray(v)) return v.length ? v : fallback;
  if (typeof v === 'string' && v.trim()) { try { const p = JSON.parse(v); return Array.isArray(p) ? p : [v]; } catch { return [v]; } }
  return fallback;
}
function normalize(card = {}) {
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
function cleanList(list, keys) {
  return (list || []).map(item => {
    const o = {};
    keys.forEach(k => o[k] = (item[k] || '').trim());
    return o;
  }).filter(item => keys.some(k => item[k]));
}

Page({
  data: {
    cardId: '',
    libraryId: '',
    card: emptyCard(),
    genders: [{ value: '', label: '未设置' }, { value: 'male', label: '男' }, { value: 'female', label: '女' }],
    marriages: [{ value: '', label: '未设置' }, { value: '未婚', label: '未婚' }, { value: '已婚', label: '已婚' }, { value: '其他', label: '其他' }]
  },

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
  onSolarBirthdayChange(e) { this.setData({ 'card.solarBirthday': e.detail.value }); },
  onGenderChange(e) { const item = this.data.genders[e.detail.value] || this.data.genders[0]; this.setData({ 'card.gender': item.value }); },
  onMarriageChange(e) { const item = this.data.marriages[e.detail.value] || this.data.marriages[0]; this.setData({ 'card.maritalStatus': item.value }); },

  chooseAvatar() {
    wx.chooseMedia({
      count: 1,
      mediaType: ['image'],
      sourceType: ['album', 'camera'],
      success: async (res) => {
        const filePath = res.tempFiles?.[0]?.tempFilePath;
        if (!filePath) return;
        wx.showLoading({ title: '上传中' });
        try {
          const data = await uploadImage(filePath);
          this.setData({ 'card.avatar': data.url });
          wx.showToast({ title: '已上传' });
        } catch (error) {
          wx.showToast({ title: error.message || '上传失败', icon: 'none' });
        } finally { wx.hideLoading(); }
      }
    });
  },

  addPhone() { this.setData({ 'card.phones': [...this.data.card.phones, ''] }); },
  removePhone(e) { const a = [...this.data.card.phones]; a.splice(e.currentTarget.dataset.index, 1); this.setData({ 'card.phones': a.length ? a : [''] }); },
  onPhoneInput(e) { const a = [...this.data.card.phones]; a[e.currentTarget.dataset.index] = e.detail.value; this.setData({ 'card.phones': a }); },
  addEmail() { this.setData({ 'card.emails': [...this.data.card.emails, ''] }); },
  removeEmail(e) { const a = [...this.data.card.emails]; a.splice(e.currentTarget.dataset.index, 1); this.setData({ 'card.emails': a.length ? a : [''] }); },
  onEmailInput(e) { const a = [...this.data.card.emails]; a[e.currentTarget.dataset.index] = e.detail.value; this.setData({ 'card.emails': a }); },

  addEducation() { this.setData({ 'card.educationBackground': [...this.data.card.educationBackground, { startYear: '', endYear: '', school: '', degree: '' }] }); },
  removeEducation(e) { const a = [...this.data.card.educationBackground]; a.splice(e.currentTarget.dataset.index, 1); this.setData({ 'card.educationBackground': a }); },
  setEducationField(e) { const a = [...this.data.card.educationBackground]; a[e.currentTarget.dataset.index][e.currentTarget.dataset.field] = e.detail.value; this.setData({ 'card.educationBackground': a }); },

  addWorkExperience() { this.setData({ 'card.workExperience': [...this.data.card.workExperience, { startYear: '', endYear: '', company: '', position: '' }] }); },
  removeWorkExperience(e) { const a = [...this.data.card.workExperience]; a.splice(e.currentTarget.dataset.index, 1); this.setData({ 'card.workExperience': a }); },
  setWorkField(e) { const a = [...this.data.card.workExperience]; a[e.currentTarget.dataset.index][e.currentTarget.dataset.field] = e.detail.value; this.setData({ 'card.workExperience': a }); },

  addSocialPosition() { this.setData({ 'card.socialPositions': [...this.data.card.socialPositions, { organization: '', position: '' }] }); },
  removeSocialPosition(e) { const a = [...this.data.card.socialPositions]; a.splice(e.currentTarget.dataset.index, 1); this.setData({ 'card.socialPositions': a }); },
  setSocialField(e) { const a = [...this.data.card.socialPositions]; a[e.currentTarget.dataset.index][e.currentTarget.dataset.field] = e.detail.value; this.setData({ 'card.socialPositions': a }); },

  async onSubmit() {
    const c = this.data.card;
    const phones = c.phones.map(x => x.trim()).filter(Boolean);
    const emails = c.emails.map(x => x.trim()).filter(Boolean);
    if (!c.name) return wx.showToast({ title: '姓名必填', icon: 'none' });
    const data = {
      ...c,
      phones,
      phone: phones[0] || '',
      emails,
      email: emails[0] || '',
      educationBackground: cleanList(c.educationBackground, ['startYear', 'endYear', 'school', 'degree']),
      workExperience: cleanList(c.workExperience, ['startYear', 'endYear', 'company', 'position']),
      socialPositions: cleanList(c.socialPositions, ['organization', 'position'])
    };
    if (!this.data.cardId) data.libraryId = this.data.libraryId;
    try {
      if (this.data.cardId) await updateCard(this.data.cardId, data); else await createCard(data);
      wx.showToast({ title: '已保存' });
      setTimeout(() => wx.navigateBack(), 500);
    } catch (error) { wx.showToast({ title: error.message || '保存失败', icon: 'none' }); }
  }
});
