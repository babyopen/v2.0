/**
 * 业务逻辑管理器
 * @namespace Business
 */
const Business = {
  // ====================== 排除号码相关 ======================
  /**
   * 切换号码排除状态
   * @param {number} num - 号码
   */
  toggleExclude: (num) => {
    const state = StateManager._state;
    if(state.lockExclude) return;

    const newExcluded = [...state.excluded];
    const newHistory = [...state.excludeHistory];

    if(newExcluded.includes(num)){
      newHistory.push([num, 'out']);
      const index = newExcluded.indexOf(num);
      newExcluded.splice(index, 1);
    } else {
      newHistory.push([num, 'in']);
      newExcluded.push(num);
    }

    StateManager.setState({ excluded: newExcluded, excludeHistory: newHistory });
  },

  /**
   * 反选排除号码（已排除的恢复，未排除的排除）
   */
  invertExclude: () => {
    const state = StateManager._state;
    if(state.lockExclude) return;

    const allNums = Array.from({length: 49}, (_, i) => i + 1);
    const newExcluded = [];
    const newHistory = [...state.excludeHistory];

    allNums.forEach(num => {
      const isCurrentlyExcluded = state.excluded.includes(num);
      if(!isCurrentlyExcluded){
        // 当前未排除的，现在排除
        newExcluded.push(num);
        newHistory.push([num, 'in']);
      } else {
        // 当前已排除的，现在恢复
        newHistory.push([num, 'out']);
      }
    });

    StateManager.setState({ excluded: newExcluded, excludeHistory: newHistory });
    Toast.show(`已反选，当前排除 ${newExcluded.length} 个号码`);
  },

  /**
   * 撤销上一次排除操作
   */
  undoExclude: () => {
    const state = StateManager._state;
    if(state.lockExclude || !state.excludeHistory.length) return;

    const newHistory = [...state.excludeHistory];
    const [num, act] = newHistory.pop();
    const newExcluded = [...state.excluded];

    act === 'in' 
      ? newExcluded.splice(newExcluded.indexOf(num), 1)
      : newExcluded.push(num);

    StateManager.setState({ excluded: newExcluded, excludeHistory: newHistory });
  },

  /**
   * 清空所有排除号码
   */
  clearExclude: () => {
    const state = StateManager._state;
    if(state.lockExclude) return;
    StateManager.setState({ excluded: [], excludeHistory: [] });
    Toast.show('已清空所有排除号码');
  },

  /**
   * 批量排除号码弹窗
   */
  batchExcludePrompt: () => {
    const state = StateManager._state;
    if(state.lockExclude) return;

    const input = prompt("输入要排除的号码，空格/逗号分隔");
    if(!input) return;

    const nums = input.split(/[\s,，]+/).map(Number).filter(num => num >=1 && num <=49);
    if(nums.length === 0) {
      Toast.show('请输入有效的号码');
      return;
    }

    const newExcluded = [...state.excluded];
    const newHistory = [...state.excludeHistory];
    let addCount = 0;

    nums.forEach(num => {
      if(!newExcluded.includes(num)){
        newExcluded.push(num);
        newHistory.push([num, 'in']);
        addCount++;
      }
    });

    StateManager.setState({ excluded: newExcluded, excludeHistory: newHistory });
    Toast.show(addCount > 0 ? `已添加${addCount}个排除号码` : '号码已在排除列表中');
  },

  /**
   * 切换排除锁定状态
   */
  toggleExcludeLock: () => {
    const isLocked = DOM.lockExclude.checked;
    StateManager.setState({ lockExclude: isLocked }, false);
    Toast.show(isLocked ? '已锁定排除号码' : '已解锁排除号码');
  },

  // ====================== 方案管理相关 ======================
  /**
   * 保存方案弹窗
   */
  saveFilterPrompt: () => {
    const state = StateManager._state;
    if(state.savedFilters.length >= CONFIG.MAX_SAVE_COUNT){
      Toast.show(`最多只能保存${CONFIG.MAX_SAVE_COUNT}个方案`);
      return;
    }

    const defaultName = `方案${state.savedFilters.length + 1}`;
    const name = prompt("请输入方案名称", defaultName);
    if(name === null) return;

    const filterName = name.trim() || defaultName;
    const filterItem = {
      name: filterName,
      selected: Utils.deepClone(state.selected),
      excluded: Utils.deepClone(state.excluded)
    };

    const success = Storage.saveFilter(filterItem);
    if(success){
      Render.renderFilterList();
      Toast.show('保存成功');
    }
  },

  /**
   * 加载保存的方案
   * @param {number} index - 方案索引
   */
  loadFilter: (index) => {
    const state = StateManager._state;
    const item = state.savedFilters[index];
    if(!item) return;

    StateManager.setState({
      selected: Utils.deepClone(item.selected),
      excluded: Utils.deepClone(item.excluded)
    });
    Toast.show('加载成功');
  },

  /**
   * 复制方案号码
   * @param {number} index - 方案索引
   */
  copyFilterNums: (index) => {
    const state = StateManager._state;
    const item = state.savedFilters[index];
    if(!item) return;

    const list = Filter.getFilteredList(item.selected, item.excluded);
    if(list.length === 0){
      Toast.show('该方案无符合条件的号码');
      return;
    }

    const numStr = list.map(n => n.s).join(' ');
    // 剪贴板API兼容
    if(navigator.clipboard && navigator.clipboard.writeText){
      navigator.clipboard.writeText(numStr).then(() => {
        Toast.show('复制成功');
      }).catch(() => {
        prompt('请手动复制以下号码：', numStr);
      });
    } else {
      prompt('请手动复制以下号码：', numStr);
    }
  },

  /**
   * 重命名方案
   * @param {number} index - 方案索引
   */
  renameFilter: (index) => {
    const state = StateManager._state;
    const item = state.savedFilters[index];
    if(!item) return;

    const newName = prompt("修改方案名称", item.name);
    if(newName === null || newName.trim() === "") return;

    const newList = [...state.savedFilters];
    newList[index].name = newName.trim();
    const success = Storage.set(Storage.KEYS.SAVED_FILTERS, newList);
    
    if(success){
      StateManager.setState({ savedFilters: newList }, false);
      Render.renderFilterList();
      Toast.show('重命名成功');
    }
  },

  /**
   * 置顶方案
   * @param {number} index - 方案索引
   */
  topFilter: (index) => {
    const state = StateManager._state;
    const item = state.savedFilters[index];
    if(!item) return;

    const newList = [...state.savedFilters];
    newList.splice(index, 1);
    newList.unshift(item);
    const success = Storage.set(Storage.KEYS.SAVED_FILTERS, newList);
    
    if(success){
      StateManager.setState({ savedFilters: newList }, false);
      Render.renderFilterList();
      Toast.show('置顶成功');
    }
  },

  /**
   * 删除方案
   * @param {number} index - 方案索引
   */
  deleteFilter: (index) => {
    if(!confirm("确定删除该方案？")) return;
    const state = StateManager._state;
    const newList = [...state.savedFilters];
    newList.splice(index, 1);
    const success = Storage.set(Storage.KEYS.SAVED_FILTERS, newList);
    
    if(success){
      StateManager.setState({ savedFilters: newList }, false);
      Render.renderFilterList();
      Toast.show('删除成功');
    }
  },

  /**
   * 清空所有方案
   */
  clearAllSavedFilters: () => {
    if(!confirm("确定清空所有方案？")) return;
    Storage.remove(Storage.KEYS.SAVED_FILTERS);
    StateManager.setState({ savedFilters: [] }, false);
    Render.renderFilterList();
    Toast.show('已清空所有方案');
  },

  /**
   * 收藏方案
   * @param {number} index - 方案索引
   */
  favoriteFilter: (index) => {
    const state = StateManager._state;
    const item = state.savedFilters[index];
    if(!item) return;

    // 检查是否已收藏
    const isFavorited = state.favorites.some(fav => fav.name === item.name);
    if(isFavorited) {
      // 取消收藏，添加二次确认
      if(!confirm('确定要取消收藏该方案吗？')) return;
      const newFavorites = state.favorites.filter(fav => fav.name !== item.name);
      StateManager.setState({ favorites: newFavorites }, false);
      Storage.set('favorites', newFavorites);
      Toast.show('已取消收藏');
    } else {
      // 添加收藏
      const newFavorites = [...state.favorites, item];
      StateManager.setState({ favorites: newFavorites }, false);
      Storage.set('favorites', newFavorites);
      Toast.show('收藏成功');
    }
  },

  /**
   * 渲染收藏列表
   */
  renderFavoriteList: () => {
    const state = StateManager._state;
    const favoriteList = document.getElementById('favoriteList');
    const favorites = state.favorites;

    if(!favorites.length){
      favoriteList.innerHTML = "<div style='text-align:center;color:var(--sub-text)'>暂无收藏的方案</div>";
      return;
    }

    const fragment = document.createDocumentFragment();

    favorites.forEach((item, index) => {
      let previewList;
      // 如果是精选特码收藏，优先使用 item.numbers
      if(item.numbers && Array.isArray(item.numbers)) {
        previewList = item.numbers.map(num => DataQuery.getNumAttrs(num));
      } else {
        previewList = Filter.getFilteredList(item.selected, item.excluded);
      }
      const previewFragment = Utils.createFragment(previewList, (num) => {
        const wrapper = document.createElement('div');
        wrapper.className = 'num-item';
        wrapper.innerHTML = `<div class="num-ball ${num.color}色">${num.s}</div><div class="tag-zodiac">${num.zodiac}</div>`;
        return wrapper;
      });

      const itemWrapper = document.createElement('div');
      itemWrapper.className = 'filter-item';
      itemWrapper.setAttribute('role', 'listitem');
      itemWrapper.innerHTML = `
        <div class="filter-row">
          <div class="filter-item-name">${item.name}</div>
          <div class="filter-preview" style="flex: 1; min-width: 0;"></div>
        </div>
        <div class="filter-item-btns">
          <button data-action="loadFavorite" data-index="${index}">加载</button>
          <button data-action="renameFavorite" data-index="${index}">重命名</button>
          <button data-action="copyFavorite" data-index="${index}">复制</button>
          <button data-action="removeFavorite" data-index="${index}">移除</button>
        </div>
      `;
      itemWrapper.querySelector('.filter-preview').appendChild(previewFragment);
      fragment.appendChild(itemWrapper);
    });

    favoriteList.innerHTML = '';
    favoriteList.appendChild(fragment);
  },

  /**
   * 从收藏列表中移除方案
   * @param {number} index - 收藏索引
   */
  removeFavorite: (index) => {
    if(!confirm('确定移除该收藏？')) return;
    const state = StateManager._state;
    const newFavorites = [...state.favorites];
    newFavorites.splice(index, 1);
    StateManager.setState({ favorites: newFavorites }, false);
    Storage.set('favorites', newFavorites);
    Business.renderFavoriteList();
    Toast.show('已移除收藏');
  },

  /**
   * 切换方案列表展开/收起
   */
  toggleShowAllFilters: () => {
    const state = StateManager._state;
    StateManager.setState({ showAllFilters: !state.showAllFilters }, false);
    Render.renderFilterList();
  },

  // ====================== 导航相关 ======================
  /**
   * 切换底部导航
   * @param {number} index - 导航索引
   */
  switchBottomNav: (index) => {
    document.querySelectorAll('.bottom-nav-item').forEach((el,i)=>{
      el.classList.toggle('active', i===index);
    });
    
    // 切换页面显示
    const pages = ['filterPage', 'analysisPage', 'recordPage', 'profilePage'];
    pages.forEach((pageId, i) => {
      const pageEl = document.getElementById(pageId);
      if(pageEl) {
        pageEl.style.display = i === index ? 'block' : 'none';
        pageEl.classList.toggle('active', i === index);
      }
    });
    
    // 控制顶部展示区的显示/隐藏：仅在筛选页面(index=0)显示
    const topBox = document.getElementById('topBox');
    if(topBox) {
      topBox.style.display = index === 0 ? 'block' : 'none';
    }
    
    // 控制主体内容区的顶部间距：筛选页面有顶部展示区，其他页面没有
    const bodyBox = document.querySelector('.body-box');
    if(bodyBox) {
      if(index === 0) {
        bodyBox.style.marginTop = 'calc(var(--top-offset) + var(--safe-top))';
      } else {
        bodyBox.style.marginTop = 'calc(12px + var(--safe-top))';
      }
    }
    
    // 控制快捷导航按钮的显示/隐藏：在筛选页面(index=0)和分析页面(index=1)显示
    const quickNavBtn = document.getElementById('quickNavBtn');
    const quickNavMenu = document.getElementById('quickNavMenu');
    const bottomNav = document.querySelector('.bottom-nav');
    if(quickNavBtn) {
      quickNavBtn.style.display = (index === 0 || index === 1) ? 'flex' : 'none';
    }
    if(quickNavMenu) {
      quickNavMenu.classList.remove('show');
    }
    if(bottomNav) {
      bottomNav.classList.toggle('needs-space', index === 0 || index === 1);
    }
    
    // 根据页面切换快捷导航菜单内容
    const navTabs = document.getElementById('navTabs');
    if(navTabs) {
      if(index === 0) {
        // 筛选页面导航
        navTabs.innerHTML = `
          <button class="nav-tab" data-target="mod-saved" role="tab">我的方案</button>
          <button class="nav-tab" data-target="mod-zodiac" role="tab">生肖</button>
          <button class="nav-tab" data-target="mod-color" role="tab">波色</button>
          <button class="nav-tab" data-target="mod-colorsx" role="tab">波色单双</button>
          <button class="nav-tab" data-target="mod-type" role="tab">家禽野兽</button>
          <button class="nav-tab" data-target="mod-element" role="tab">五行</button>
          <button class="nav-tab" data-target="mod-head" role="tab">头数</button>
          <button class="nav-tab" data-target="mod-tail" role="tab">尾数</button>
          <button class="nav-tab" data-target="mod-sum" role="tab">尾合</button>
          <button class="nav-tab" data-target="mod-bs" role="tab">大小单双</button>
          <button class="nav-tab" data-target="mod-hot" role="tab">冷热号</button>
        `;
      } else if(index === 1) {
        // 分析页面导航
        navTabs.innerHTML = `
          <button class="nav-tab" data-target="historyPanel" role="tab">历史记录</button>
          <button class="nav-tab" data-target="analysisPanelContent" role="tab">维度分析</button>
          <button class="nav-tab" data-target="zodiacAnalysisPanel" role="tab">生肖关联</button>
        `;
      }
      // 重新绑定导航标签点击事件
      navTabs.querySelectorAll('.nav-tab').forEach(tab => {
        tab.addEventListener('click', function() {
          const targetId = this.getAttribute('data-target');
          const targetEl = document.getElementById(targetId);
          if(targetEl) {
            // 分析页面标签切换逻辑
            if(index === 1) {
              // 移除所有标签和面板的active类
              document.querySelectorAll('.analysis-tab-btn').forEach(btn => {
                btn.classList.remove('active');
              });
              document.querySelectorAll('.analysis-tab-panel').forEach(panel => {
                panel.classList.remove('active');
              });
              
              // 根据目标ID激活对应的标签和面板
              if(targetId === 'historyPanel') {
                document.getElementById('tabHistory').classList.add('active');
                document.getElementById('historyPanel').classList.add('active');
              } else if(targetId === 'analysisPanelContent') {
                document.getElementById('tabAnalysis').classList.add('active');
                document.getElementById('analysisPanelContent').classList.add('active');
              } else if(targetId === 'zodiacAnalysisPanel') {
                document.getElementById('tabZodiac').classList.add('active');
                document.getElementById('zodiacAnalysisPanel').classList.add('active');
              }
            }
            
            // 滚动到目标位置
            const offset = 80; // 偏移量
            window.scrollTo({top: targetEl.offsetTop - offset, behavior: 'smooth'});
          }
          Business.toggleQuickNav(false);
        });
      });
    }
    
    // 页面特定处理
    if(index === 1) {
      // 分析页面
      Business.initAnalysisPage();
    } else if(index === 3) {
      // 我的页面
      Business.renderFavoriteList();
    }
  },

  /**
   * 滚动到指定模块
   * @param {string} targetId - 模块ID
   */
  scrollToModule: (targetId) => {
    const targetEl = document.getElementById(targetId);
    if(targetEl){
      const offset = CONFIG.TOP_OFFSET + Utils.getSafeTop();
      window.scrollTo({top: targetEl.offsetTop - offset, behavior: 'smooth'});
    }
    Business.toggleQuickNav(false);
  },

  /**
   * 切换快捷导航展开/收起
   * @param {boolean|null} isOpen - 强制指定展开/收起
   */
  toggleQuickNav: (isOpen = null) => {
    const isMenuVisible = DOM.quickNavMenu.classList.contains('show');
    const shouldOpen = isOpen === null ? !isMenuVisible : isOpen;

    if(shouldOpen){
      DOM.quickNavMenu.classList.add('show');
      DOM.quickNavBtn.classList.add('active');
    } else {
      DOM.quickNavMenu.classList.remove('show');
      DOM.quickNavBtn.classList.remove('active');
    }
  },

  /**
   * 返回顶部
   */
  backToTop: () => {
    window.scrollTo({top: 0, behavior: 'smooth'});
  },

  /**
   * 滚动事件处理（已节流优化）
   */
  handleScroll: Utils.throttle(() => {
    const state = StateManager._state;
    const scrollTop = document.documentElement.scrollTop || document.body.scrollTop;
    clearTimeout(state.scrollTimer);

    // 显示/隐藏返回顶部按钮
    if(scrollTop > CONFIG.BACK_TOP_THRESHOLD){
      DOM.backTopBtn.classList.add('show');
      // 滚动停止后延迟隐藏
      state.scrollTimer = setTimeout(() => {
        DOM.backTopBtn.classList.remove('show');
      }, CONFIG.SCROLL_HIDE_DELAY);
    } else {
      DOM.backTopBtn.classList.remove('show');
    }
  }, CONFIG.SCROLL_THROTTLE_DELAY),

  /**
   * 页面卸载清理，避免内存泄漏
   */
  handlePageUnload: () => {
    StateManager.clearAllTimers();
    window.removeEventListener('scroll', Business.handleScroll);
    window.removeEventListener('beforeunload', Business.handlePageUnload);
  },

  /**
   * 通用复制文本到剪贴板
   * @param {string} text - 要复制的文本
   */
  copyToClipboard: (text) => {
    if(navigator.clipboard && navigator.clipboard.writeText){
      navigator.clipboard.writeText(text).then(() => {
        Toast.show('复制成功');
      }).catch(() => {
        Toast.show('复制失败，请手动复制');
      });
    } else {
      // 降级方案
      const textarea = document.createElement('textarea');
      textarea.value = text;
      textarea.style.position = 'fixed';
      textarea.style.opacity = '0';
      document.body.appendChild(textarea);
      textarea.select();
      try {
        document.execCommand('copy');
        Toast.show('复制成功');
      } catch(e) {
        Toast.show('复制失败，请手动复制');
      }
      document.body.removeChild(textarea);
    }
  },

  /**
   * 从ball-group中提取号码
   * @param {string} containerId - 容器元素ID
   * @param {string} emptyMsg - 空数据提示
   * @returns {string|null} 号码字符串，失败返回null
   */
  extractNumbersFromBalls: (containerId, emptyMsg) => {
    const container = document.getElementById(containerId);
    if(!container) {
      Toast.show(emptyMsg);
      return null;
    }
    
    const ballItems = container.querySelectorAll('.ball-item .ball');
    if(ballItems.length === 0) {
      Toast.show(emptyMsg);
      return null;
    }
    
    return Array.from(ballItems).map(ball => ball.innerText.trim()).join(' ');
  },

  /**
   * 复制热门号码到剪贴板
   */
  copyHotNumbers: () => {
    const numbers = Business.extractNumbersFromBalls('hotNumber', '暂无热门号码可复制');
    if(numbers) Business.copyToClipboard(numbers);
  },

  /**
   * 复制精选特码到剪贴板
   */
  copyZodiacNumbers: () => {
    const numbers = Business.extractNumbersFromBalls('zodiacFinalNumContent', '暂无精选特码可复制');
    if(numbers) Business.copyToClipboard(numbers);
  },

  /**
   * 切换标签页
   * @param {string} tabName - 标签名
   */
  switchTab: (tabName) => {
    // 根据标签名切换到对应的页面
    switch(tabName) {
      case 'prediction':
        // 切换到预测历史页面
        Business.switchBottomNav(3);
        break;
      case 'record':
        // 切换到记录页面
        Business.switchBottomNav(2);
        break;
      case 'filter':
        // 切换到筛选页面
        Business.switchBottomNav(0);
        break;
      case 'analysis':
        // 切换到分析页面
        Business.switchBottomNav(1);
        break;
      default:
        break;
    }
  }
};
