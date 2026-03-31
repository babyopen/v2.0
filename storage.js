// ====================== 4. 存储模块（统一管理本地存储，加校验和兜底）======================
/**
 * 本地存储管理器
 * @namespace Storage
 */
const Storage = {
  /**
   * 存储key常量
   * @readonly
   * @enum {string}
   */
  KEYS: Object.freeze({
    SAVED_FILTERS: 'savedFilters',
    DATA_VERSION: 'dataVersion',
    HISTORY_CACHE: 'historyCache',
    HISTORY_CACHE_TIME: 'historyCacheTime',
    LOTTERY_HISTORY: 'lotteryHistory',
    SPECIAL_HISTORY: 'specialHistory'
  }),

  /**
   * 缓存有效期（毫秒）- 1小时
   * @readonly
   */
  CACHE_DURATION: 60 * 60 * 1000,

  /**
   * 机选历史缓存有效期（毫秒）- 3天
   * @readonly
   */
  LOTTERY_HISTORY_DURATION: 3 * 24 * 60 * 60 * 1000,

  /**
   * 精选特码历史缓存有效期（毫秒）- 30天
   * @readonly
   */
  SPECIAL_HISTORY_DURATION: 30 * 24 * 60 * 60 * 1000,

  /**
   * 精选特码历史最大记录数
   * @readonly
   */
  SPECIAL_HISTORY_MAX_COUNT: 50,

  /**
   * 内存兜底存储（隐私模式下localStorage不可用时使用）
   * @private
   */
  _memoryStorage: {},

  /**
   * 检测localStorage是否可用
   * @returns {boolean} 是否可用
   */
  isLocalStorageAvailable: () => {
    try {
      const testKey = '__test__';
      localStorage.setItem(testKey, testKey);
      localStorage.removeItem(testKey);
      return true;
    } catch(e) {
      return false;
    }
  },

  /**
   * 获取存储数据
   * @param {string} key - 存储key
   * @param {any} defaultValue - 默认值
   * @returns {any} 存储的值
   */
  get: (key, defaultValue = null) => {
    try {
      if(Storage.isLocalStorageAvailable()){
        const value = localStorage.getItem(key);
        return value ? JSON.parse(value) : defaultValue;
      } else {
        return Storage._memoryStorage[key] || defaultValue;
      }
    } catch(e) {
      console.error('存储读取失败', e);
      return defaultValue;
    }
  },

  /**
   * 写入存储数据
   * @param {string} key - 存储key
   * @param {any} value - 要存储的值
   * @returns {boolean} 是否成功
   */
  set: (key, value) => {
    try {
      const serialized = JSON.stringify(value);
      if(Storage.isLocalStorageAvailable()){
        localStorage.setItem(key, serialized);
      } else {
        Storage._memoryStorage[key] = value;
      }
      return true;
    } catch(e) {
      console.error('存储写入失败', e);
      Toast.show('保存失败，存储空间可能已满');
      return false;
    }
  },

  /**
   * 移除存储数据
   * @param {string} key - 存储key
   * @returns {boolean} 是否成功
   */
  remove: (key) => {
    try {
      if(Storage.isLocalStorageAvailable()){
        localStorage.removeItem(key);
      } else {
        delete Storage._memoryStorage[key];
      }
      return true;
    } catch(e) {
      console.error('存储移除失败', e);
      return false;
    }
  },

  /**
   * 加载并校验保存的方案
   * @returns {Array} 合法的方案列表
   */
  loadSavedFilters: () => {
    // 数据版本校验
    const savedVersion = Storage.get(Storage.KEYS.DATA_VERSION, 0);
    if(savedVersion < CONFIG.DATA_VERSION){
      // 后续可添加数据迁移逻辑
      Storage.set(Storage.KEYS.DATA_VERSION, CONFIG.DATA_VERSION);
    }

    const rawList = Storage.get(Storage.KEYS.SAVED_FILTERS, []);
    const validList = Array.isArray(rawList) ? rawList.filter(Utils.validateFilterItem) : [];
    StateManager.setState({ savedFilters: validList }, false);
    return validList;
  },

  /**
   * 保存方案到本地
   * @param {Object} filterItem - 方案对象
   * @returns {boolean} 是否成功
   */
  saveFilter: (filterItem) => {
    const state = StateManager._state;
    const newList = [filterItem, ...state.savedFilters];
    const success = Storage.set(Storage.KEYS.SAVED_FILTERS, newList);
    if(success) StateManager.setState({ savedFilters: newList });
    return success;
  },

  /**
   * 加载收藏的方案
   * @returns {Array} 收藏的方案列表
   */
  loadFavorites: () => {
    const rawList = Storage.get('favorites', []);
    const validList = Array.isArray(rawList) ? rawList.filter(Utils.validateFilterItem) : [];
    StateManager.setState({ favorites: validList }, false);
    return validList;
  },

  /**
   * 保存历史数据到缓存
   * @param {Array} historyData - 历史数据
   */
  saveHistoryCache: (historyData) => {
    Storage.set(Storage.KEYS.HISTORY_CACHE, historyData);
    Storage.set(Storage.KEYS.HISTORY_CACHE_TIME, Date.now());
  },

  /**
   * 加载缓存的历史数据
   * @returns {Object|null} 缓存的数据和是否过期
   */
  loadHistoryCache: () => {
    const cacheTime = Storage.get(Storage.KEYS.HISTORY_CACHE_TIME, 0);
    const now = Date.now();
    
    // 检查缓存是否过期
    if(now - cacheTime > Storage.CACHE_DURATION) {
      return { data: null, expired: true };
    }
    
    const historyData = Storage.get(Storage.KEYS.HISTORY_CACHE, []);
    return { data: historyData, expired: false };
  },

  /**
   * 清除历史数据缓存
   */
  clearHistoryCache: () => {
    Storage.remove(Storage.KEYS.HISTORY_CACHE);
    Storage.remove(Storage.KEYS.HISTORY_CACHE_TIME);
  },

  /**
   * 保存机选历史到本地存储
   * @param {Array} history - 机选历史记录
   */
  saveLotteryHistory: (history) => {
    const data = {
      history: history,
      timestamp: Date.now()
    };
    Storage.set(Storage.KEYS.LOTTERY_HISTORY, data);
  },

  /**
   * 加载机选历史缓存
   * @returns {Array} 过滤后的历史记录（只保留3天内的）
   */
  loadLotteryHistory: () => {
    const data = Storage.get(Storage.KEYS.LOTTERY_HISTORY, null);
    if(!data || !data.history || !Array.isArray(data.history)) {
      return [];
    }

    const now = Date.now();
    const threeDaysAgo = now - Storage.LOTTERY_HISTORY_DURATION;

    // 过滤掉超过3天的记录
    const filteredHistory = data.history.filter(item => {
      // 如果记录有时间戳，使用记录的时间戳；否则使用缓存保存时间
      const itemTime = item.timestamp || data.timestamp || now;
      return itemTime >= threeDaysAgo;
    });

    // 如果有过期的记录被过滤掉，更新缓存
    if(filteredHistory.length < data.history.length) {
      Storage.saveLotteryHistory(filteredHistory);
      // 已清理过期记录
    }

    return filteredHistory;
  },

  /**
   * 清除机选历史缓存
   */
  clearLotteryHistory: () => {
    Storage.remove(Storage.KEYS.LOTTERY_HISTORY);
  },

  /**
   * 保存精选特码历史
   * @param {Array} history - 精选特码历史记录
   */
  saveSpecialHistory: (history) => {
    Storage.set(Storage.KEYS.SPECIAL_HISTORY, history);
  },

  /**
   * 加载精选特码历史缓存
   * @returns {Array} 过滤后的历史记录（只保留30天内的）
   */
  loadSpecialHistory: () => {
    const data = Storage.get(Storage.KEYS.SPECIAL_HISTORY, null);
    if(!data || !Array.isArray(data)) {
      return [];
    }

    const now = Date.now();
    const thirtyDaysAgo = now - Storage.SPECIAL_HISTORY_DURATION;

    // 过滤掉超过30天的记录
    const filteredHistory = data.filter(item => {
      const itemTime = item.timestamp || now;
      return itemTime >= thirtyDaysAgo;
    });

    // 如果有过期的记录被过滤掉，更新缓存
    if(filteredHistory.length < data.length) {
      Storage.saveSpecialHistory(filteredHistory);
    }

    return filteredHistory;
  },

  /**
   * 清除精选特码历史缓存
   */
  clearSpecialHistory: () => {
    Storage.remove(Storage.KEYS.SPECIAL_HISTORY);
  }
};
