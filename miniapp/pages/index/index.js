import { getContacts, getGroups } from '../../utils/api';
import { formatPhone, getColorByIndex, debounce } from '../../utils/util';

const PAGE_SIZE = 20;

Page({
  data: {
    contacts: [],
    groups: [],
    page: 1,
    pageSize: PAGE_SIZE,
    total: 0,
    hasMore: true,
    searchKeyword: '',
    selectedGroupId: '',
    showFavoriteOnly: false,
    loading: false,
    loadingMore: false,
    firstLoad: true,
  },

  onLoad() {
    this.loadGroups();
    this.loadContacts(true);
  },

  onShow() {
    // 从编辑/详情页返回时刷新列表
    if (!this.data.firstLoad) {
      this.loadContacts(true);
    }
  },

  onPullDownRefresh() {
    this.loadContacts(true, () => {
      wx.stopPullDownRefresh();
    });
  },

  onReachBottom() {
    if (this.data.hasMore && !this.data.loadingMore) {
      this.loadContacts();
    }
  },

  /**
   * 加载联系人列表
   * @param {boolean} reset - 是否重置分页（下拉刷新/首次加载时传 true）
   * @param {Function} [callback] - 加载完成回调
   */
  loadContacts(reset = false, callback) {
    const { page, contacts, selectedGroupId, showFavoriteOnly, loading, loadingMore } = this.data;

    // 防止重复请求
    if (reset) {
      if (loading) return;
    } else {
      if (loadingMore) return;
    }

    // 请求参数
    const params = {
      page: reset ? 1 : page,
      pageSize: PAGE_SIZE,
    };

    if (selectedGroupId) {
      params.groupId = selectedGroupId;
    }

    if (showFavoriteOnly) {
      params.favorite = true;
    }

    if (reset) {
      this.setData({ loading: true, loadingMore: false });
    } else {
      this.setData({ loadingMore: true });
    }

    getContacts(params)
      .then(res => {
        // 兼容 { data, total, page, pageSize } 和直接返回数组两种格式
        const list = Array.isArray(res) ? res : (res.data || []);
        const total = res.total != null ? res.total : list.length;
        const currentPage = res.page || (reset ? 1 : page);

        const newList = reset ? list : [...contacts, ...list];

        this.setData({
          contacts: newList,
          total,
          page: currentPage + 1,
          hasMore: newList.length < total,
          loading: false,
          loadingMore: false,
          firstLoad: false,
        });

        if (callback) callback();
      })
      .catch(() => {
        this.setData({ loading: false, loadingMore: false });
        if (callback) callback();
      });
  },

  /**
   * 加载分组列表（用于筛选）
   */
  loadGroups() {
    getGroups()
      .then(res => {
        const list = Array.isArray(res) ? res : (res.data || []);
        this.setData({ groups: list });
      })
      .catch(() => {
        // 静默失败，分组筛选不可用但不影响列表
      });
  },

  /**
   * 点击搜索栏 → 跳转到搜索页
   */
  onSearchTap() {
    wx.navigateTo({ url: '/pages/search/index' });
  },

  /**
   * 点击添加按钮 → 跳转到编辑页（新建模式）
   */
  onAddTap() {
    wx.navigateTo({ url: '/pages/contact-edit/index' });
  },

  /**
   * 点击联系人卡片 → 跳转到详情页
   */
  onContactTap(e) {
    const { id } = e.currentTarget.dataset;
    wx.navigateTo({ url: `/pages/contact-detail/index?id=${id}` });
  },

  /**
   * 分组筛选点击（切换选中/取消）
   */
  onGroupFilter(e) {
    const { groupId } = e.currentTarget.dataset;
    const newGroupId = this.data.selectedGroupId === groupId ? '' : groupId;
    this.setData({
      selectedGroupId: newGroupId,
      page: 1,
      contacts: [],
      hasMore: true,
    }, () => {
      this.loadContacts(true);
    });
  },

  /**
   * 收藏筛选切换
   */
  onFavoriteFilter() {
    this.setData({
      showFavoriteOnly: !this.data.showFavoriteOnly,
      page: 1,
      contacts: [],
      hasMore: true,
    }, () => {
      this.loadContacts(true);
    });
  },

  /**
   * 获取联系人第一个有效分组名称
   */
  getFirstGroupName(contact) {
    if (!contact.groups || contact.groups.length === 0) return '';
    const g = contact.groups[0];
    return g.group?.name || g.name || '';
  },

  /**
   * 根据索引获取头像颜色（包装 util 函数，供 wxml 调用）
   */
  getColorByIndex(index) {
    return getColorByIndex(index);
  },
});
