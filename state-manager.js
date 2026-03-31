// ====================== 3. 状态管理模块（统一管理所有状态，避免状态与视图不同步）======================
/**
 * 状态管理器
 * @namespace StateManager
 */
const StateManager = {
  /**
   * 私有状态对象
   * @private
   */
  _state: {
    selected: {
      zodiac:[], color:[], colorsx:[], type:[], element:[
        ],
      head:[], tail:[], sum:[], bs:[], hot:[],
      sumOdd:[], sumBig:[], tailBig:[]
    },
    excluded: [],
    excludeHistory: [],
    lockExclude: false,
    savedFilters: [],
    favorites: [],
    showAllFilters: false,
    numList: [],
    currentZodiac: '',
    zodiacCycle: [],
    scrollTimer: null,
    // 机选模块状态
    lottery: {
      smartHistory: [],
      currentResult: [],
      maxHistory: 30
    },
    // 分析模块状态
    analysis: {
      historyData: [],
      analyzeLimit: 10,
      selectedNumCount: 5,
      showCount: 20,
      currentTab: 'history',
      autoRefreshTimer: null
    },
    // 精选特码历史状态
    specialHistory: [],
    specialHistoryExpanded: false
  },

  /**
   * 获取只读状态快照
   * @returns {Object} 状态快照
   */
  getState: () => Utils.deepClone(StateManager._state),

  /**
   * 统一更新状态入口
   * @param {Object} partialState - 要更新的部分状态
   * @param {boolean} needRender - 是否自动触发渲染
   */
  setState: (partialState, needRender = true) => {
    try {
      StateManager._state = {
        ...StateManager._state,
        ...partialState
      };
      if(needRender) Render.renderAll();
    } catch(e) {
      console.error('状态更新失败', e);
      Toast.show('操作失败，请刷新重试');
    }
  },

  /**
   * 更新选中的筛选条件
   * @param {string} group - 分组名
   * @param {string|number} value - 选中的值
   */
  updateSelected: (group, value) => {
    const state = StateManager._state;
    const index = state.selected[group].indexOf(value);
    const newSelected = { ...state.selected };
    
    index > -1 
      ? newSelected[group] = newSelected[group].filter(item => item !== value)
      : newSelected[group] = [...newSelected[group], value];

    StateManager.setState({ selected: newSelected });
  },

  /**
   * 重置分组选中状态
   * @param {string} group - 分组名
   */
  resetGroup: (group) => {
    const newSelected = { ...StateManager._state.selected };
    newSelected[group] = [];
    StateManager.setState({ selected: newSelected });
  },

  /**
   * 获取初始空的selected对象
   * @returns {Object} 空的selected对象
   */
  getEmptySelected: () => ({
    zodiac:[], color:[], colorsx:[], type:[], element:[
      ],
    head:[], tail:[], sum:[], bs:[], hot:[],
    sumOdd:[], sumBig:[], tailBig:[]
  }),

  /**
   * 全选分组
   * @param {string} group - 分组名
   */
  selectGroup: (group) => {
    const allTags = [...document.querySelectorAll(`.tag[data-group="${group}"]`)];
    const allValues = allTags.map(tag => Utils.formatTagValue(tag.dataset.value, group));
    const newSelected = { ...StateManager._state.selected };
    newSelected[group] = allValues;
    StateManager.setState({ selected: newSelected });
  },

  /**
   * 反选分组
   * @param {string} group - 分组名
   */
  invertGroup: (group) => {
    const state = StateManager._state;
    const allTags = [...document.querySelectorAll(`.tag[data-group="${group}"]`)];
    const allValues = allTags.map(tag => Utils.formatTagValue(tag.dataset.value, group));
    const newSelected = { ...state.selected };
    newSelected[group] = allValues.filter(v => !state.selected[group].includes(v));
    StateManager.setState({ selected: newSelected });
  },

  /**
   * 清理所有定时器，避免内存泄漏
   */
  clearAllTimers: () => {
    const state = StateManager._state;
    if(state.scrollTimer) clearTimeout(state.scrollTimer);
    Toast.clearTimer();
  }
};
