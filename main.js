/**
 * 主入口文件
 * @namespace App
 */
const App = {
  /**
   * 初始化应用
   */
  init() {
    try {
      console.log('=== 摇美味应用初始化 ===');
      
      // 初始化存储
      this.initStorage();
      
      // 初始化状态管理
      this.initStateManager();
      
      // 初始化DOM缓存
      this.initDomCache();
      
      // 初始化事件绑定
      this.initEventBinder();
      
      // 初始化业务逻辑
      this.initBusiness();
      
      // 初始化筛选功能
      this.initFilter();
      
      // 初始化分析页面
      this.initAnalysis();
      
      // 初始化预测历史
      this.initPrediction();
      
      // 初始化精选特码历史
      this.initSpecialHistory();
      
      // 初始化记录模块
      this.initRecord();
      
      // 启动应用
      this.start();
      
      console.log('=== 摇美味应用初始化完成 ===');
    } catch (error) {
      console.error('应用初始化失败:', error);
      Toast.show('应用初始化失败，请刷新重试');
    }
  },

  /**
   * 初始化存储
   */
  initStorage() {
    if(typeof Storage !== 'undefined') {
      Storage.init();
      console.log('存储模块初始化完成');
    } else {
      console.warn('本地存储不可用，使用内存存储');
    }
  },

  /**
   * 初始化状态管理
   */
  initStateManager() {
    if(typeof StateManager !== 'undefined') {
      StateManager.init();
      console.log('状态管理模块初始化完成');
    } else {
      console.error('状态管理模块未加载');
    }
  },

  /**
   * 初始化DOM缓存
   */
  initDomCache() {
    if(typeof Dom !== 'undefined') {
      Dom.init();
      console.log('DOM缓存模块初始化完成');
    } else {
      console.warn('DOM缓存模块未加载');
    }
  },

  /**
   * 初始化事件绑定
   */
  initEventBinder() {
    if(typeof EventBinder !== 'undefined') {
      EventBinder.init();
      console.log('事件绑定模块初始化完成');
    } else {
      console.error('事件绑定模块未加载');
    }
  },

  /**
   * 初始化业务逻辑
   */
  initBusiness() {
    if(typeof Business !== 'undefined') {
      Business.init();
      console.log('业务逻辑模块初始化完成');
    } else {
      console.error('业务逻辑模块未加载');
    }
  },

  /**
   * 初始化筛选功能
   */
  initFilter() {
    if(typeof Filter !== 'undefined') {
      Filter.init();
      console.log('筛选功能模块初始化完成');
    } else {
      console.warn('筛选功能模块未加载');
    }
  },

  /**
   * 初始化分析页面
   */
  initAnalysis() {
    if(typeof Business !== 'undefined' && Business.initAnalysisPage) {
      // 分析页面会在切换到该标签时初始化
      console.log('分析页面模块初始化完成');
    } else {
      console.warn('分析页面模块未加载');
    }
  },

  /**
   * 初始化预测历史
   */
  initPrediction() {
    if(typeof Business !== 'undefined' && Business.renderPredictionHistory) {
      // 预测历史会在切换到该标签时初始化
      console.log('预测历史模块初始化完成');
    } else {
      console.warn('预测历史模块未加载');
    }
  },

  /**
   * 初始化精选特码历史
   */
  initSpecialHistory() {
    if(typeof Business !== 'undefined' && Business.renderSpecialHistory) {
      // 精选特码历史会在切换到该标签时初始化
      console.log('精选特码历史模块初始化完成');
    } else {
      console.warn('精选特码历史模块未加载');
    }
  },

  /**
   * 初始化记录模块
   */
  initRecord() {
    if(typeof Record !== 'undefined' && Record.init) {
      // 记录模块初始化
      console.log('记录模块初始化完成');
    } else {
      console.warn('记录模块未加载');
    }
  },

  /**
   * 启动应用
   */
  start() {
    try {
      // 设置版本号
      this.setVersion();
      
      // 初始化默认标签
      if(typeof Business !== 'undefined' && Business.switchTab) {
        Business.switchTab('prediction');
      }
      
      // 后台静默刷新数据
      if(typeof Business !== 'undefined' && Business.silentRefreshHistory) {
        setTimeout(() => {
          Business.silentRefreshHistory();
        }, 1000);
      }
      
      console.log('应用启动成功');
    } catch (error) {
      console.error('应用启动失败:', error);
    }
  },

  /**
   * 设置版本号
   */
  setVersion() {
    const versionEl = document.getElementById('version');
    if(versionEl) {
      versionEl.innerText = 'V26.03.6';
    }
  },

  /**
   * 重新初始化应用
   */
  reinit() {
    console.log('=== 重新初始化应用 ===');
    this.init();
  },

  /**
   * 清理应用
   */
  cleanup() {
    console.log('=== 清理应用 ===');
    // 清理定时器
    if(typeof Business !== 'undefined' && Business.clearTimers) {
      Business.clearTimers();
    }
    // 清理事件监听
    // 这里可以添加更多清理逻辑
  }
};

// 导出模块
if(typeof window !== 'undefined') {
  window.App = App;
}

// 确保DOM加载完成后初始化
if(typeof window !== 'undefined' && document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    App.init();
  });
} else if(typeof window !== 'undefined' && document.readyState === 'interactive') {
  App.init();
}
