/**
 * 事件绑定模块
 * @namespace EventBinder
 */
const EventBinder = {
  /**
   * 初始化所有事件绑定
   */
  init() {
    this.bindGlobalEvents();
    this.bindNavigationEvents();
    this.bindFilterEvents();
    this.bindPredictionEvents();
    this.bindSpecialHistoryEvents();
    this.bindAnalysisEvents();
    this.bindLotteryEvents();
    this.bindNumberTagEvents();
  },

  /**
   * 绑定全局事件
   */
  bindGlobalEvents() {
    // 页面加载完成事件
    window.addEventListener('DOMContentLoaded', () => {
      // 初始化应用
      if(typeof App !== 'undefined' && App.init) {
        App.init();
      }
    });

    // 页面可见性变化事件
    document.addEventListener('visibilitychange', () => {
      if(!document.hidden) {
        // 页面重新可见时刷新数据
        if(typeof Business !== 'undefined' && Business.silentRefreshHistory) {
          Business.silentRefreshHistory();
        }
      }
    });

    // 键盘事件
    document.addEventListener('keydown', (e) => {
      // ESC键关闭所有弹窗
      if(e.key === 'Escape') {
        this.closeAllModals();
      }
    });

    // 数据-action事件委托
    document.addEventListener('click', (e) => {
      const target = e.target.closest('[data-action]');
      if(target) {
        const action = target.dataset.action;
        this.handleAction(action, target, e);
      }
    });
  },

  /**
   * 绑定导航事件
   */
  bindNavigationEvents() {
    // 导航标签切换
    const navTabs = document.querySelectorAll('.nav-tab');
    navTabs.forEach(tab => {
      tab.addEventListener('click', (e) => {
        const target = e.target.closest('[data-tab]');
        if(target) {
          const tabName = target.dataset.tab;
          if(typeof Business !== 'undefined' && Business.switchTab) {
            Business.switchTab(tabName);
          }
        }
      });
    });
  },

  /**
   * 绑定筛选事件
   */
  bindFilterEvents() {
    // 期数筛选
    const periodFilters = document.querySelectorAll('[data-period]');
    periodFilters.forEach(filter => {
      filter.addEventListener('click', (e) => {
        const period = e.target.dataset.period;
        if(typeof Filter !== 'undefined' && Filter.selectPeriod) {
          Filter.selectPeriod(period);
        }
      });
    });

    // 号码数量筛选
    const numFilters = document.querySelectorAll('[data-number]');
    numFilters.forEach(filter => {
      filter.addEventListener('click', (e) => {
        const number = e.target.dataset.number;
        if(typeof Filter !== 'undefined' && Filter.selectNumber) {
          Filter.selectNumber(number);
        }
      });
    });

    // 清空筛选
    const clearBtn = document.querySelector('[data-action="clearFilters"]');
    if(clearBtn) {
      clearBtn.addEventListener('click', () => {
        if(typeof Filter !== 'undefined' && Filter.clearAll) {
          Filter.clearAll();
        }
      });
    }

    // 选择按钮
    const selectBtn = document.querySelector('[data-action="toggleFilters"]');
    if(selectBtn) {
      selectBtn.addEventListener('click', () => {
        if(typeof Filter !== 'undefined' && Filter.toggleFilters) {
          Filter.toggleFilters();
        }
      });
    }
  },

  /**
   * 绑定预测历史事件
   */
  bindPredictionEvents() {
    // 预测历史相关事件
    const predictionContainer = document.getElementById('predictionHistory');
    if(predictionContainer) {
      // 点击历史记录项
      predictionContainer.addEventListener('click', (e) => {
        const item = e.target.closest('.history-item');
        if(item) {
          // 可以添加点击历史记录的处理逻辑
        }
      });
    }
  },

  /**
   * 绑定精选特码历史事件
   */
  bindSpecialHistoryEvents() {
    // 精选特码历史相关事件
    const specialContainer = document.getElementById('specialHistory');
    if(specialContainer) {
      // 点击历史记录项
      specialContainer.addEventListener('click', (e) => {
        const item = e.target.closest('.history-item');
        if(item) {
          // 可以添加点击历史记录的处理逻辑
        }
      });
    }
  },

  /**
   * 绑定分析页面事件
   */
  bindAnalysisEvents() {
    // 分析页面相关事件
    const analysisContainer = document.getElementById('analysisPage');
    if(analysisContainer) {
      // 加载更多按钮
      const loadMoreBtn = document.getElementById('loadMore');
      if(loadMoreBtn) {
        loadMoreBtn.addEventListener('click', () => {
          if(typeof Business !== 'undefined' && Business.loadMoreHistory) {
            Business.loadMoreHistory();
          }
        });
      }

      // 刷新按钮
      const refreshBtn = document.querySelector('[data-action="refreshHistory"]');
      if(refreshBtn) {
        refreshBtn.addEventListener('click', () => {
          if(typeof Business !== 'undefined' && Business.refreshHistory) {
            Business.refreshHistory();
          }
        });
      }

      // 分析维度切换
      const analyzeBtns = document.querySelectorAll('[data-action="syncAnalyze"]');
      analyzeBtns.forEach(btn => {
        btn.addEventListener('click', (e) => {
          const days = e.target.dataset.days;
          if(typeof Business !== 'undefined' && Business.syncAnalyze) {
            Business.syncAnalyze(days);
          }
        });
      });

      // 生肖分析切换
      const zodiacBtns = document.querySelectorAll('[data-action="syncZodiacAnalyze"]');
      zodiacBtns.forEach(btn => {
        btn.addEventListener('click', (e) => {
          const days = e.target.dataset.days;
          if(typeof Business !== 'undefined' && Business.syncZodiacAnalyze) {
            Business.syncZodiacAnalyze(days);
          }
        });
      });

      // 详情切换
      const detailToggles = document.querySelectorAll('[data-action="toggleDetail"]');
      detailToggles.forEach(toggle => {
        toggle.addEventListener('click', (e) => {
          const type = e.target.dataset.type;
          if(typeof Business !== 'undefined' && Business.toggleDetail) {
            Business.toggleDetail(type);
          }
        });
      });
    }
  },

  /**
   * 绑定机选模块事件
   */
  bindLotteryEvents() {
    // 机选相关事件
    const lotteryContainer = document.getElementById('lotteryPage');
    if(lotteryContainer) {
      // 机选按钮
      const randomBtn = document.querySelector('[data-action="generateRandom"]');
      if(randomBtn) {
        randomBtn.addEventListener('click', () => {
          if(typeof Business !== 'undefined' && Business.generateRandom) {
            Business.generateRandom();
          }
        });
      }

      // 排除按钮
      const excludeBtn = document.querySelector('[data-action="toggleExclude"]');
      if(excludeBtn) {
        excludeBtn.addEventListener('click', () => {
          if(typeof Business !== 'undefined' && Business.toggleExclude) {
            Business.toggleExclude();
          }
        });
      }

      // 重置按钮
      const resetBtn = document.querySelector('[data-action="resetExclude"]');
      if(resetBtn) {
        resetBtn.addEventListener('click', () => {
          if(typeof Business !== 'undefined' && Business.resetExclude) {
            Business.resetExclude();
          }
        });
      }

      // 号码点击事件
      const numberContainer = document.querySelector('.number-container');
      if(numberContainer) {
        numberContainer.addEventListener('click', (e) => {
          const numberItem = e.target.closest('.number-item');
          if(numberItem) {
            const number = numberItem.dataset.number;
            if(typeof Business !== 'undefined' && Business.toggleExcludeNumber) {
              Business.toggleExcludeNumber(number);
            }
          }
        });
      }
    }
  },

  /**
   * 绑定数字标签点击事件
   */
  bindNumberTagEvents() {
    // 为所有数字标签添加点击事件
    document.addEventListener('click', (e) => {
      console.log('点击事件触发，目标:', e.target);
      const numberTag = e.target.closest('.number-tag');
      console.log('找到的number-tag:', numberTag);
      if(numberTag) {
        const number = numberTag.innerText.trim();
        console.log('号码:', number);
        if(number && !isNaN(number)) {
          try {
            // 获取号码信息
            const num = parseInt(number);
            console.log('解析后的号码:', num);
            const attrs = DataQuery.getNumAttrs(num);
            console.log('号码属性:', attrs);
            
            // 获取颜色
            const color = attrs.color;
            console.log('颜色:', color);
            
            // 显示提示
            Toast.show(`${number} - ${attrs.zodiac} - ${attrs.element}`, 2000);
            console.log('显示提示:', `${number} - ${attrs.zodiac} - ${attrs.element}`);
            
            // 设置提示颜色
            const toast = document.getElementById('toast');
            if(toast) {
              toast.style.color = color === '红' ? '#ff0000' : color === '蓝' ? '#0000ff' : '#00ff00';
              setTimeout(() => {
                toast.style.color = '';
              }, 2000);
            }
          } catch (error) {
            console.error('处理数字标签点击时出错:', error);
            Toast.show('处理点击时出错', 2000);
          }
        }
      }
    });
  },

  /**
   * 处理数据-action事件
   * @param {string} action - 动作名称
   * @param {Element} target - 目标元素
   * @param {Event} e - 事件对象
   */
  handleAction(action, target, e) {
    switch(action) {
      case 'clearFilters':
        if(typeof Filter !== 'undefined' && Filter.clearAll) {
          Filter.clearAll();
        }
        break;
      case 'toggleFilters':
        if(typeof Filter !== 'undefined' && Filter.toggleFilters) {
          Filter.toggleFilters();
        }
        break;
      case 'refreshHistory':
        if(typeof Business !== 'undefined' && Business.refreshHistory) {
          Business.refreshHistory();
        }
        break;
      case 'loadMore':
        if(typeof Business !== 'undefined' && Business.loadMoreHistory) {
          Business.loadMoreHistory();
        }
        break;
      case 'syncAnalyze':
        const days = target.dataset.days;
        if(typeof Business !== 'undefined' && Business.syncAnalyze) {
          Business.syncAnalyze(days);
        }
        break;
      case 'syncZodiacAnalyze':
        const zodiacDays = target.dataset.days;
        if(typeof Business !== 'undefined' && Business.syncZodiacAnalyze) {
          Business.syncZodiacAnalyze(zodiacDays);
        }
        break;
      case 'toggleDetail':
        const type = target.dataset.type;
        if(typeof Business !== 'undefined' && Business.toggleDetail) {
          Business.toggleDetail(type);
        }
        break;
      case 'generateRandom':
        if(typeof Business !== 'undefined' && Business.generateRandom) {
          Business.generateRandom();
        }
        break;
      case 'toggleExclude':
        if(typeof Business !== 'undefined' && Business.toggleExclude) {
          Business.toggleExclude();
        }
        break;
      case 'resetExclude':
        if(typeof Business !== 'undefined' && Business.resetExclude) {
          Business.resetExclude();
        }
        break;
      case 'showStatDetail':
        const statType = target.dataset.statType;
        if(typeof Business !== 'undefined' && Business.showStatDetail) {
          Business.showStatDetail(statType);
        }
        break;
      default:
        console.log('Unknown action:', action);
    }
  },

  /**
   * 关闭所有弹窗
   */
  closeAllModals() {
    // 关闭所有可能的弹窗
    const modals = document.querySelectorAll('.modal');
    modals.forEach(modal => {
      modal.style.display = 'none';
    });
  },

  /**
   * 绑定自定义事件
   * @param {Element} element - 元素
   * @param {string} event - 事件名称
   * @param {Function} callback - 回调函数
   */
  on(element, event, callback) {
    if(element && typeof element.addEventListener === 'function') {
      element.addEventListener(event, callback);
    }
  },

  /**
   * 解绑事件
   * @param {Element} element - 元素
   * @param {string} event - 事件名称
   * @param {Function} callback - 回调函数
   */
  off(element, event, callback) {
    if(element && typeof element.removeEventListener === 'function') {
      element.removeEventListener(event, callback);
    }
  },

  /**
   * 绑定一次性事件
   * @param {Element} element - 元素
   * @param {string} event - 事件名称
   * @param {Function} callback - 回调函数
   */
  once(element, event, callback) {
    const onceCallback = (e) => {
      callback(e);
      this.off(element, event, onceCallback);
    };
    this.on(element, event, onceCallback);
  }
};

// 导出模块
if(typeof window !== 'undefined') {
  window.EventBinder = EventBinder;
}
