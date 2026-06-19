// pages/search/index.js
import { getContacts } from '../../utils/api.js'

Page({
  data: {
    keyword: '',
    results: [],
    hasSearched: false,
    searchTimer: null
  },

  onLoad() {
    // 自动聚焦搜索框
    this.setData({ focus: true })
  },

  onUnload() {
    // 清理定时器
    const { searchTimer } = this.data
    if (searchTimer) {
      clearTimeout(searchTimer)
    }
  },

  onInput(e) {
    const keyword = e.detail.value
    this.setData({ keyword })

    // 清空结果
    if (!keyword) {
      const { searchTimer } = this.data
      if (searchTimer) {
        clearTimeout(searchTimer)
      }
      this.setData({ results: [], hasSearched: false, searchTimer: null })
      return
    }

    // 防抖搜索 300ms
    const { searchTimer } = this.data
    if (searchTimer) {
      clearTimeout(searchTimer)
    }

    const timer = setTimeout(() => {
      this.doSearch(keyword)
    }, 300)

    this.setData({ searchTimer: timer })
  },

  doSearch(keyword) {
    wx.showLoading({ title: '搜索中...' })
    getContacts({ search: keyword, pageSize: 50 })
      .then(res => {
        wx.hideLoading()
        this.setData({
          results: res.data || [],
          hasSearched: true
        })
      })
      .catch(() => {
        wx.hideLoading()
        wx.showToast({ title: '搜索失败', icon: 'none' })
      })
  },

  onContactTap(e) {
    const { id } = e.currentTarget.dataset
    wx.navigateTo({
      url: `/pages/contact-detail/index?id=${id}`
    })
  },

  onClear() {
    this.setData({
      keyword: '',
      results: [],
      hasSearched: false,
      searchTimer: null
    })
  }
})