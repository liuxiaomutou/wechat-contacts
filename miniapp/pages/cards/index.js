import { getCards } from '../../utils/api';

Page({
  data: {
    libraryId: '',
    libraryName: '',
    cards: [],
    searchKeyword: '',
    debounceTimer: null
  },

  onLoad(options) {
    const { libraryId } = options;
    this.setData({ libraryId });
    this.loadCards();
  },

  async loadCards() {
    try {
      const cards = await getCards({ libraryId: this.data.libraryId });
      this.setData({ cards });
      
      // Get library name
      const library = await getLibrary(this.data.libraryId);
      this.setData({ libraryName: library.name });
    } catch (error) {
      console.error('Failed to load cards:', error);
    }
  },

  onSearchInput(e) {
    const keyword = e.detail.value;
    this.setData({ searchKeyword: keyword });
    
    clearTimeout(this.data.debounceTimer);
    this.setData({
      debounceTimer: setTimeout(() => {
        this.filterCards(keyword);
      }, 500)
    });
  },

  filterCards(keyword) {
    if (!keyword) {
      this.loadCards();
      return;
    }
    
    const filtered = this.data.cards.filter(card => 
      card.name.includes(keyword) || 
      card.company.includes(keyword) || 
      card.title.includes(keyword) || 
      card.phone.includes(keyword)
    );
    this.setData({ cards: filtered });
  },

  onCardTap(e) {
    const cardId = e.currentTarget.dataset.id;
    wx.navigateTo({
      url: `/pages/card-detail/index?cardId=${cardId}&libraryId=${this.data.libraryId}`
    });
  },

  onAddCard() {
    wx.navigateTo({
      url: `/pages/card-edit/index?libraryId=${this.data.libraryId}`
    });
  },

  onLongPressCard(e) {
    const cardId = e.currentTarget.dataset.id;
    wx.showActionSheet({
      itemList: ['删除名片'],
      itemColor: '#ff0000',
      success: (res) => {
        if (res.tapIndex === 0) {
          wx.showModal({
            title: '确认删除',
            content: '确定要删除这张名片吗？',
            confirmColor: '#ff0000',
            success: async (modalRes) => {
              if (modalRes.confirm) {
                try {
                  await deleteCard(cardId);
                  this.loadCards();
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