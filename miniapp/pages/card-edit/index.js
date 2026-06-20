import { getCard, createCard, updateCard } from '../../utils/api';

Page({
  data: {
    cardId: '',
    libraryId: '',
    card: {
      name: '',
      phone: '',
      gender: '',
      company: '',
      title: '',
      level: '',
      industry: '',
      field: '',
      email: '',
      wechat: '',
      qq: '',
      website: '',
      linkedin: '',
      fax: '',
      residence: '',
      hometown: '',
      originalResidence: '',
      education: [],
      workExperience: [],
      socialRoles: [],
      skills: '',
      note: '',
      isPublic: true
    },
    genders: [
      { value: 'male', label: '男' },
      { value: 'female', label: '女' }
    ]
  },

  onLoad(options) {
    const { cardId, libraryId } = options;
    this.setData({ cardId, libraryId });
    
    if (cardId) {
      this.loadCard();
    } else {
      // New card, initialize with default values
      this.setData({
        card: {
          name: '',
          phone: '',
          gender: '',
          company: '',
          title: '',
          level: '',
          industry: '',
          field: '',
          email: '',
          wechat: '',
          qq: '',
          website: '',
          linkedin: '',
          fax: '',
          residence: '',
          hometown: '',
          originalResidence: '',
          education: [],
          workExperience: [],
          socialRoles: [],
          skills: '',
          note: '',
          isPublic: true
        }
      });
    }
  },

  async loadCard() {
    try {
      const card = await getCard(this.data.cardId);
      this.setData({ card });
    } catch (error) {
      console.error('Failed to load card:', error);
      wx.showToast({
        title: '加载失败',
        icon: 'none'
      });
    }
  },

  // Basic info handlers
  onNameInput(e) {
    this.setData({
      'card.name': e.detail.value
    });
  },

  onPhoneInput(e) {
    this.setData({
      'card.phone': e.detail.value
    });
  },

  onGenderChange(e) {
    this.setData({
      'card.gender': e.detail.value
    });
  },

  // Work info handlers
  onCompanyInput(e) {
    this.setData({
      'card.company': e.detail.value
    });
  },

  onTitleInput(e) {
    this.setData({
      'card.title': e.detail.value
    });
  },

  onLevelInput(e) {
    this.setData({
      'card.level': e.detail.value
    });
  },

  onIndustryInput(e) {
    this.setData({
      'card.industry': e.detail.value
    });
  },

  onFieldInput(e) {
    this.setData({
      'card.field': e.detail.value
    });
  },

  // Contact info handlers
  onEmailInput(e) {
    this.setData({
      'card.email': e.detail.value
    });
  },

  onWechatInput(e) {
    this.setData({
      'card.wechat': e.detail.value
    });
  },

  onQqInput(e) {
    this.setData({
      'card.qq': e.detail.value
    });
  },

  onWebsiteInput(e) {
    this.setData({
      'card.website': e.detail.value
    });
  },

  onLinkedinInput(e) {
    this.setData({
      'card.linkedin': e.detail.value
    });
  },

  onFaxInput(e) {
    this.setData({
      'card.fax': e.detail.value
    });
  },

  // Personal info handlers
  onResidenceInput(e) {
    this.setData({
      'card.residence': e.detail.value
    });
  },

  onHometownInput(e) {
    this.setData({
      'card.hometown': e.detail.value
    });
  },

  onOriginalResidenceInput(e) {
    this.setData({
      'card.originalResidence': e.detail.value
    });
  },

  // Education handlers
  addEducation() {
    const education = [...this.data.card.education];
    education.push({
      school: '',
      major: '',
      degree: '',
      startDate: '',
      endDate: '',
      highlight: false
    });
    this.setData({
      'card.education': education
    });
  },

  removeEducation(e) {
    const index = e.currentTarget.dataset.index;
    const education = [...this.data.card.education];
    education.splice(index, 1);
    this.setData({
      'card.education': education
    });
  },

  onEducationSchoolInput(e) {
    const index = e.currentTarget.dataset.index;
    const education = [...this.data.card.education];
    education[index].school = e.detail.value;
    this.setData({
      'card.education': education
    });
  },

  onEducationMajorInput(e) {
    const index = e.currentTarget.dataset.index;
    const education = [...this.data.card.education];
    education[index].major = e.detail.value;
    this.setData({
      'card.education': education
    });
  },

  onEducationDegreeInput(e) {
    const index = e.currentTarget.dataset.index;
    const education = [...this.data.card.education];
    education[index].degree = e.detail.value;
    this.setData({
      'card.education': education
    });
  },

  onEducationStartDateInput(e) {
    const index = e.currentTarget.dataset.index;
    const education = [...this.data.card.education];
    education[index].startDate = e.detail.value;
    this.setData({
      'card.education': education
    });
  },

  onEducationEndDateInput(e) {
    const index = e.currentTarget.dataset.index;
    const education = [...this.data.card.education];
    education[index].endDate = e.detail.value;
    this.setData({
      'card.education': education
    });
  },

  onEducationHighlightChange(e) {
    const index = e.currentTarget.dataset.index;
    const education = [...this.data.card.education];
    education[index].highlight = e.detail.value;
    this.setData({
      'card.education': education
    });
  },

  // Work experience handlers
  addWorkExperience() {
    const workExperience = [...this.data.card.workExperience];
    workExperience.push({
      company: '',
      position: '',
      department: '',
      startDate: '',
      endDate: '',
      description: '',
      highlight: false
    });
    this.setData({
      'card.workExperience': workExperience
    });
  },

  removeWorkExperience(e) {
    const index = e.currentTarget.dataset.index;
    const workExperience = [...this.data.card.workExperience];
    workExperience.splice(index, 1);
    this.setData({
      'card.workExperience': workExperience
    });
  },

  onWorkCompanyInput(e) {
    const index = e.currentTarget.dataset.index;
    const workExperience = [...this.data.card.workExperience];
    workExperience[index].company = e.detail.value;
    this.setData({
      'card.workExperience': workExperience
    });
  },

  onWorkPositionInput(e) {
    const index = e.currentTarget.dataset.index;
    const workExperience = [...this.data.card.workExperience];
    workExperience[index].position = e.detail.value;
    this.setData({
      'card.workExperience': workExperience
    });
  },

  onWorkDepartmentInput(e) {
    const index = e.currentTarget.dataset.index;
    const workExperience = [...this.data.card.workExperience];
    workExperience[index].department = e.detail.value;
    this.setData({
      'card.workExperience': workExperience
    });
  },

  onWorkStartDateInput(e) {
    const index = e.currentTarget.dataset.index;
    const workExperience = [...this.data.card.workExperience];
    workExperience[index].startDate = e.detail.value;
    this.setData({
      'card.workExperience': workExperience
    });
  },

  onWorkEndDateInput(e) {
    const index = e.currentTarget.dataset.index;
    const workExperience = [...this.data.card.workExperience];
    workExperience[index].endDate = e.detail.value;
    this.setData({
      'card.workExperience': workExperience
    });
  },

  onWorkDescriptionInput(e) {
    const index = e.currentTarget.dataset.index;
    const workExperience = [...this.data.card.workExperience];
    workExperience[index].description = e.detail.value;
    this.setData({
      'card.workExperience': workExperience
    });
  },

  onWorkHighlightChange(e) {
    const index = e.currentTarget.dataset.index;
    const workExperience = [...this.data.card.workExperience];
    workExperience[index].highlight = e.detail.value;
    this.setData({
      'card.workExperience': workExperience
    });
  },

  // Social role handlers
  addSocialRole() {
    const socialRoles = [...this.data.card.socialRoles];
    socialRoles.push({
      organization: '',
      position: '',
      startDate: '',
      endDate: '',
      highlight: false
    });
    this.setData({
      'card.socialRoles': socialRoles
    });
  },

  removeSocialRole(e) {
    const index = e.currentTarget.dataset.index;
    const socialRoles = [...this.data.card.socialRoles];
    socialRoles.splice(index, 1);
    this.setData({
      'card.socialRoles': socialRoles
    });
  },

  onSocialOrganizationInput(e) {
    const index = e.currentTarget.dataset.index;
    const socialRoles = [...this.data.card.socialRoles];
    socialRoles[index].organization = e.detail.value;
    this.setData({
      'card.socialRoles': socialRoles
    });
  },

  onSocialPositionInput(e) {
    const index = e.currentTarget.dataset.index;
    const socialRoles = [...this.data.card.socialRoles];
    socialRoles[index].position = e.detail.value;
    this.setData({
      'card.socialRoles': socialRoles
    });
  },

  onSocialStartDateInput(e) {
    const index = e.currentTarget.dataset.index;
    const socialRoles = [...this.data.card.socialRoles];
    socialRoles[index].startDate = e.detail.value;
    this.setData({
      'card.socialRoles': socialRoles
    });
  },

  onSocialEndDateInput(e) {
    const index = e.currentTarget.dataset.index;
    const socialRoles = [...this.data.card.socialRoles];
    socialRoles[index].endDate = e.detail.value;
    this.setData({
      'card.socialRoles': socialRoles
    });
  },

  onSocialHighlightChange(e) {
    const index = e.currentTarget.dataset.index;
    const socialRoles = [...this.data.card.socialRoles];
    socialRoles[index].highlight = e.detail.value;
    this.setData({
      'card.socialRoles': socialRoles
    });
  },

  // Skills and note handlers
  onSkillsInput(e) {
    this.setData({
      'card.skills': e.detail.value
    });
  },

  onNoteInput(e) {
    this.setData({
      'card.note': e.detail.value
    });
  },

  onPublicChange(e) {
    this.setData({
      'card.isPublic': e.detail.value
    });
  },

  async onSubmit() {
    // Validate required fields
    if (!this.data.card.name || !this.data.card.phone) {
      wx.showToast({
        title: '姓名和手机号为必填项',
        icon: 'none'
      });
      return;
    }
    
    // Prepare data for submission
    const cardData = { ...this.data.card };
    
    // Serialize arrays to JSON strings
    cardData.education = JSON.stringify(cardData.education);
    cardData.workExperience = JSON.stringify(cardData.workExperience);
    cardData.socialRoles = JSON.stringify(cardData.socialRoles);
    
    try {
      if (this.data.cardId) {
        // Update existing card
        await updateCard(this.data.cardId, cardData);
        wx.showToast({
          title: '更新成功'
        });
      } else {
        // Create new card
        cardData.libraryId = this.data.libraryId;
        await createCard(cardData);
        wx.showToast({
          title: '创建成功'
        });
      }
      
      // Navigate back
      wx.navigateBack();
    } catch (error) {
      console.error('Failed to save card:', error);
      wx.showToast({
        title: '保存失败',
        icon: 'none'
      });
    }
  }
});