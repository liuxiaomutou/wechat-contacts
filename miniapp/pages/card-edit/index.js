import { getCard, createCard, updateCard, uploadImage } from '../../utils/api';
const regionData = require('../../utils/regionData');

const LABELS = { phone: regionData.PHONE_LABELS, email: regionData.EMAIL_LABELS, address: regionData.ADDRESS_LABELS };

function emptyEntry(labelList) {
  return { label: labelList[0], value: '' };
}
function emptyCard() {
  return {
    name: '', avatar: '', gender: '', company: '', position: '', industry: '', field: '',
    phoneEntries: [], emailEntries: [], addressEntries: [],
    wechat: '', qq: '', website: '', linkedin: '', fax: '',
    solarBirthday: '', lunarBirthday: '', ethnicity: '', birthplace: '', maritalStatus: '',
    educationBackground: [], workExperience: [], socialPositions: [], skills: [], tags: '', remark: '', isPublic: true
  };
}
function arr(v, fallback = []) {
  if (Array.isArray(v)) return v;
  if (typeof v === 'string' && v.trim()) { try { const p = JSON.parse(v); return Array.isArray(p) ? p : [v]; } catch { return [v]; } }
  return fallback;
}
function normalize(card = {}) {
  // 标准化 phoneEntries：从新版 {label, value} 或旧版字符串数组转来
  let phoneEntries = arr(card.phones, []);
  if (phoneEntries.length && typeof phoneEntries[0] === 'string') {
    phoneEntries = phoneEntries.filter(Boolean).map(v => ({ label: LABELS.phone[0], value: v }));
  } else if (!phoneEntries.length && card.phone) {
    phoneEntries = [{ label: LABELS.phone[0], value: card.phone }];
  }
  if (!phoneEntries.length) phoneEntries = [emptyEntry(LABELS.phone)];

  let emailEntries = arr(card.emails, []);
  if (emailEntries.length && typeof emailEntries[0] === 'string') {
    emailEntries = emailEntries.filter(Boolean).map(v => ({ label: LABELS.email[0], value: v }));
  } else if (!emailEntries.length && card.email) {
    emailEntries = [{ label: LABELS.email[0], value: card.email }];
  }
  if (!emailEntries.length) emailEntries = [emptyEntry(LABELS.email)];

  let addressEntries = arr(card.addresses, []);
  if (!addressEntries.length) addressEntries = [];

  return {
    ...emptyCard(), ...card,
    phoneEntries,
    emailEntries,
    addressEntries,
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
    marriages: [{ value: '', label: '未设置' }, { value: '未婚', label: '未婚' }, { value: '已婚', label: '已婚' }, { value: '其他', label: '其他' }],
    phoneLabels: LABELS.phone,
    emailLabels: LABELS.email,
    addressLabels: LABELS.address,
    provinces: regionData.PROVINCES.map(p => p.name),
    provinceIdx: -1, cityIdx: -1, districtIdx: -1,
  },

  onLoad(options) {
    this.setData({ cardId: options.cardId || '', libraryId: options.libraryId || '' });
    if (options.cardId) this.loadCard();
  },

  async loadCard() {
    try {
      const card = normalize(await getCard(this.data.cardId));
      this.setData({ card });
    } catch (error) { wx.showToast({ title: error.message || '加载失败', icon: 'none' }); }
  },

  setField(e) { this.setData({ [`card.${e.currentTarget.dataset.field}`]: e.detail.value }); },
  onPublicChange(e) { this.setData({ 'card.isPublic': e.detail.value }); },
  onSolarBirthdayChange(e) { this.setData({ 'card.solarBirthday': e.detail.value }); },
  onGenderChange(e) { const item = this.data.genders[e.detail.value] || this.data.genders[0]; this.setData({ 'card.gender': item.value }); },
  onMarriageChange(e) { const item = this.data.marriages[e.detail.value] || this.data.marriages[0]; this.setData({ 'card.maritalStatus': item.value }); },

  // ===== 头像 =====
  chooseAvatar() {
    wx.chooseMedia({
      count: 1, mediaType: ['image'], sourceType: ['album', 'camera'],
      success: async (res) => {
        const filePath = res.tempFiles?.[0]?.tempFilePath;
        if (!filePath) return;
        wx.showLoading({ title: '上传中' });
        try {
          const data = await uploadImage(filePath);
          this.setData({ 'card.avatar': data.url });
          wx.showToast({ title: '已上传' });
        } catch (error) { wx.showToast({ title: error.message || '上传失败', icon: 'none' }); }
        finally { wx.hideLoading(); }
      }
    });
  },

  // ===== 电话 =====
  addPhoneEntry() { this.setData({ 'card.phoneEntries': [...this.data.card.phoneEntries, emptyEntry(LABELS.phone)] }); },
  removePhoneEntry(e) { const a = [...this.data.card.phoneEntries]; a.splice(e.currentTarget.dataset.index, 1); this.setData({ 'card.phoneEntries': a.length ? a : [emptyEntry(LABELS.phone)] }); },
  onPhoneValue(e) { const a = [...this.data.card.phoneEntries]; a[e.currentTarget.dataset.index].value = e.detail.value; this.setData({ 'card.phoneEntries': a }); },
  onPhoneLabelChange(e) {
    const idx = e.currentTarget.dataset.index;
    const pickerIdx = parseInt(e.detail.value);
    const a = [...this.data.card.phoneEntries];
    a[idx].label = LABELS.phone[pickerIdx] || LABELS.phone[0];
    this.setData({ 'card.phoneEntries': a });
  },

  // ===== 邮箱 =====
  addEmailEntry() { this.setData({ 'card.emailEntries': [...this.data.card.emailEntries, emptyEntry(LABELS.email)] }); },
  removeEmailEntry(e) { const a = [...this.data.card.emailEntries]; a.splice(e.currentTarget.dataset.index, 1); this.setData({ 'card.emailEntries': a.length ? a : [emptyEntry(LABELS.email)] }); },
  onEmailValue(e) { const a = [...this.data.card.emailEntries]; a[e.currentTarget.dataset.index].value = e.detail.value; this.setData({ 'card.emailEntries': a }); },
  onEmailLabelChange(e) {
    const idx = e.currentTarget.dataset.index;
    const pickerIdx = parseInt(e.detail.value);
    const a = [...this.data.card.emailEntries];
    a[idx].label = LABELS.email[pickerIdx] || LABELS.email[0];
    this.setData({ 'card.emailEntries': a });
  },

  // ===== 地址 =====
  addAddressEntry() {
    const a = [...this.data.card.addressEntries];
    a.push({ label: LABELS.address[0], province: '', city: '', district: '', detail: '' });
    this.setData({ 'card.addressEntries': a });
  },
  removeAddressEntry(e) { const a = [...this.data.card.addressEntries]; a.splice(e.currentTarget.dataset.index, 1); this.setData({ 'card.addressEntries': a }); },
  onAddressLabelChange(e) {
    const idx = e.currentTarget.dataset.index;
    const pickerIdx = parseInt(e.detail.value);
    const a = [...this.data.card.addressEntries];
    a[idx].label = LABELS.address[pickerIdx] || LABELS.address[0];
    this.setData({ 'card.addressEntries': a });
  },
  onAddressDetail(e) { const a = [...this.data.card.addressEntries]; a[e.currentTarget.dataset.index].detail = e.detail.value; this.setData({ 'card.addressEntries': a }); },
  onAddressProvinceChange(e) {
    const idx = e.currentTarget.dataset.index;
    const pi = parseInt(e.detail.value);
    const provinceName = this.data.provinces[pi] || '';
    const a = [...this.data.card.addressEntries];
    a[idx].province = provinceName;
    a[idx].city = '';
    a[idx].district = '';
    this.setData({ [`card.addressEntries`]: a });
  },
  onAddressCityChange(e) {
    const idx = e.currentTarget.dataset.index;
    const entry = this.data.card.addressEntries[idx];
    const provinceId = regionData.PROVINCES.find(p => p.name === entry.province)?.id;
    if (!provinceId) return;
    const cities = regionData.getCityNames(provinceId);
    const ci = parseInt(e.detail.value);
    const cityName = cities[ci] || '';
    const a = [...this.data.card.addressEntries];
    a[idx].city = cityName;
    a[idx].district = '';
    this.setData({ [`card.addressEntries`]: a });
  },
  onAddressDistrictChange(e) {
    const idx = e.currentTarget.dataset.index;
    const entry = this.data.card.addressEntries[idx];
    const provinceId = regionData.PROVINCES.find(p => p.name === entry.province)?.id;
    const districts = provinceId ? regionData.getDistricts(provinceId, entry.city) : [];
    const di = parseInt(e.detail.value);
    const a = [...this.data.card.addressEntries];
    a[idx].district = districts[di] || '';
    this.setData({ [`card.addressEntries`]: a });
  },

  // ===== 教育 =====
  addEducation() { this.setData({ 'card.educationBackground': [...this.data.card.educationBackground, { startYear: '', endYear: '', school: '', degree: '' }] }); },
  removeEducation(e) { const a = [...this.data.card.educationBackground]; a.splice(e.currentTarget.dataset.index, 1); this.setData({ 'card.educationBackground': a }); },
  setEducationField(e) { const a = [...this.data.card.educationBackground]; a[e.currentTarget.dataset.index][e.currentTarget.dataset.field] = e.detail.value; this.setData({ 'card.educationBackground': a }); },

  // ===== 工作 =====
  addWorkExperience() { this.setData({ 'card.workExperience': [...this.data.card.workExperience, { startYear: '', endYear: '', company: '', position: '' }] }); },
  removeWorkExperience(e) { const a = [...this.data.card.workExperience]; a.splice(e.currentTarget.dataset.index, 1); this.setData({ 'card.workExperience': a }); },
  setWorkField(e) { const a = [...this.data.card.workExperience]; a[e.currentTarget.dataset.index][e.currentTarget.dataset.field] = e.detail.value; this.setData({ 'card.workExperience': a }); },

  // ===== 社会职务 =====
  addSocialPosition() { this.setData({ 'card.socialPositions': [...this.data.card.socialPositions, { organization: '', position: '' }] }); },
  removeSocialPosition(e) { const a = [...this.data.card.socialPositions]; a.splice(e.currentTarget.dataset.index, 1); this.setData({ 'card.socialPositions': a }); },
  setSocialField(e) { const a = [...this.data.card.socialPositions]; a[e.currentTarget.dataset.index][e.currentTarget.dataset.field] = e.detail.value; this.setData({ 'card.socialPositions': a }); },

  // ===== 提交 =====
  async onSubmit() {
    const c = this.data.card;
    if (!c.name) return wx.showToast({ title: '姓名必填', icon: 'none' });

    const phoneEntries = c.phoneEntries.filter(e => e.value.trim());
    const emailEntries = c.emailEntries.filter(e => e.value.trim());
    const addressEntries = c.addressEntries.filter(e => e.province || e.detail);

    const data = {
      ...c,
      phones: phoneEntries.map(e => ({ label: e.label || '', value: e.value.trim() })),
      phone: phoneEntries[0]?.value?.trim() || '',
      emails: emailEntries.map(e => ({ label: e.label || '', value: e.value.trim() })),
      email: emailEntries[0]?.value?.trim() || '',
      addresses: addressEntries.map(e => ({ label: e.label || '', province: e.province, city: e.city, district: e.district, detail: e.detail })),
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
