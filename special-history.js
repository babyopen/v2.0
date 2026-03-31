/**
 * 精选特码历史功能模块
 * @namespace SpecialHistory
 */
const SpecialHistory = {
  /**
   * 初始化精选特码历史
   */
  init() {
    console.log('精选特码历史模块初始化');
    this.renderSpecialHistory();
  },

  /**
   * 渲染精选特码历史
   */
  renderSpecialHistory() {
    const state = StateManager._state;
    const container = document.getElementById('specialHistory');
    if(!container) return;

    const { specialHistory, selectedPeriod, selectedNumber } = state;
    const filteredList = this.getFilteredSpecialHistory(selectedPeriod, selectedNumber);

    if(filteredList.length === 0) {
      container.innerHTML = '<div class="no-data">暂无精选特码历史数据</div>';
      return;
    }

    const fragment = document.createDocumentFragment();
    filteredList.forEach(item => {
      const div = document.createElement('div');
      div.className = 'history-item';
      
      // 计算命中情况
      const hitInfo = this.calculateHitInfo(item);
      
      div.innerHTML = `
        <div class="history-header">
          <div class="history-title">
            <span class="history-period">第${item.period}期</span>
            <span class="history-desc">${item.days}期数据·${item.numbers.split(' ').length}个号</span>
          </div>
          ${hitInfo.te ? `<div class="history-result ${hitInfo.isHit ? 'hit' : 'miss'}">开奖特码: ${hitInfo.te}</div>` : ''}
        </div>
        <div class="history-numbers">
          ${item.numbers.split(' ').map(num => {
            const isHit = hitInfo.te && num === hitInfo.te.toString().padStart(2, '0');
            return `<span class="number-tag ${isHit ? 'hit' : ''}">${num}</span>`;
          }).join(' ')}
        </div>
        ${hitInfo.isHit ? `<div class="hit-info">✅ 命中特码</div>` : ''}
      `;
      
      fragment.appendChild(div);
    });

    container.innerHTML = '';
    container.appendChild(fragment);
  },

  /**
   * 获取筛选后的精选特码历史
   * @param {number} period - 期数
   * @param {number} number - 号码数量
   * @returns {Array} 筛选后的精选特码历史
   */
  getFilteredSpecialHistory(period, number) {
    const state = StateManager._state;
    return state.specialHistory.filter(item => {
      return item.days === period && item.numbers.split(' ').length === number;
    }).sort((a, b) => Number(b.period) - Number(a.period));
  },

  /**
   * 计算命中情况
   * @param {Object} item - 精选特码历史项
   * @returns {Object} 命中信息
   */
  calculateHitInfo(item) {
    const state = StateManager._state;
    const historyData = state.analysis.historyData;
    const currentPeriod = item.period;
    
    // 查找对应期数的开奖记录
    const开奖Record = historyData.find(record => record.expect === currentPeriod);
    if(!开奖Record) {
      return { te: null, isHit: false };
    }
    
    const codeArr = (开奖Record.openCode || '0,0,0,0,0,0,0').split(',');
    const te = Number(codeArr[6]);
    const teStr = te.toString().padStart(2, '0');
    const isHit = item.numbers.includes(teStr);
    
    return { te, isHit };
  },

  /**
   * 保存精选特码历史
   * @param {Object} data - 精选特码数据
   */
  saveSpecialHistory(data) {
    const state = StateManager._state;
    const { period, days, numbers } = data;
    
    // 检查是否已存在相同期数和参数的记录
    const existingIndex = state.specialHistory.findIndex(item => 
      item.period === period && item.days === days && item.numbers === numbers
    );
    
    if(existingIndex === -1) {
      // 添加新记录
      const newRecord = {
        period,
        days,
        numbers,
        timestamp: Date.now()
      };
      
      const newHistory = [...state.specialHistory, newRecord];
      StateManager.setState({ specialHistory: newHistory }, true);
      
      // 保存到本地存储
      Storage.saveSpecialHistory(newHistory);
    }
  },

  /**
   * 静默更新所有精选特码历史
   */
  silentUpdateAllSpecialHistory() {
    const state = StateManager._state;
    const { specialHistory } = state;
    
    // 这里可以添加更新逻辑，例如检查是否有新的开奖记录
    // 然后重新计算命中情况
    
    // 重新渲染精选特码历史
    this.renderSpecialHistory();
  },

  /**
   * 清理过期的精选特码历史
   */
  cleanupOldSpecialHistory() {
    const state = StateManager._state;
    const now = Date.now();
    const oneMonthAgo = now - (30 * 24 * 60 * 60 * 1000);
    
    // 保留一个月内的记录
    const filteredHistory = state.specialHistory.filter(item => 
      item.timestamp >= oneMonthAgo
    );
    
    if(filteredHistory.length !== state.specialHistory.length) {
      StateManager.setState({ specialHistory: filteredHistory }, true);
      Storage.saveSpecialHistory(filteredHistory);
    }
  },

  /**
   * 计算精选特码历史统计信息
   * @returns {Object} 统计信息
   */
  calculateSpecialHistoryStats() {
    const state = StateManager._state;
    const { specialHistory, analysis: { historyData } } = state;
    
    let totalPredictions = 0;
    let totalHits = 0;
    let hitRate = 0;
    
    specialHistory.forEach(item => {
      const hitInfo = this.calculateHitInfo(item);
      if(hitInfo.te !== null) {
        totalPredictions++;
        if(hitInfo.isHit) {
          totalHits++;
        }
      }
    });
    
    if(totalPredictions > 0) {
      hitRate = (totalHits / totalPredictions * 100).toFixed(2);
    }
    
    return {
      totalPredictions,
      totalHits,
      hitRate
    };
  },

  /**
   * 导出精选特码历史
   * @returns {string} 导出的CSV字符串
   */
  exportSpecialHistory() {
    const state = StateManager._state;
    const { specialHistory } = state;
    
    let csv = '期数,分析期数,号码数量,精选号码,开奖特码,命中状态,时间戳\n';
    
    specialHistory.forEach(item => {
      const hitInfo = this.calculateHitInfo(item);
      const hitStatus = hitInfo.isHit ? '命中' : '未命中';
      const te = hitInfo.te || '';
      const numbers = item.numbers.replace(/ /g, ',');
      
      csv += `${item.period},${item.days},${item.numbers.split(' ').length},${numbers},${te},${hitStatus},${new Date(item.timestamp).toISOString()}\n`;
    });
    
    return csv;
  },

  /**
   * 导入精选特码历史
   * @param {string} csv - CSV字符串
   * @returns {boolean} 是否导入成功
   */
  importSpecialHistory(csv) {
    try {
      const lines = csv.split('\n');
      const newHistory = [];
      
      // 跳过标题行
      for(let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if(!line) continue;
        
        const [period, days, numberCount, numbers, te, hitStatus, timestamp] = line.split(',');
        if(period && days && numbers) {
          newHistory.push({
            period: period.trim(),
            days: parseInt(days),
            numbers: numbers.trim().replace(/,/g, ' '),
            timestamp: new Date(timestamp).getTime() || Date.now()
          });
        }
      }
      
      if(newHistory.length > 0) {
        const state = StateManager._state;
        const mergedHistory = [...state.specialHistory, ...newHistory];
        // 去重
        const uniqueHistory = this.removeDuplicateSpecialHistory(mergedHistory);
        
        StateManager.setState({ specialHistory: uniqueHistory }, true);
        Storage.saveSpecialHistory(uniqueHistory);
        this.renderSpecialHistory();
        
        return true;
      }
      
      return false;
    } catch (error) {
      console.error('导入精选特码历史失败:', error);
      return false;
    }
  },

  /**
   * 移除重复的精选特码记录
   * @param {Array} history - 精选特码历史数组
   * @returns {Array} 去重后的精选特码历史
   */
  removeDuplicateSpecialHistory(history) {
    const uniqueMap = new Map();
    
    history.forEach(item => {
      const key = `${item.period}_${item.days}_${item.numbers}`;
      if(!uniqueMap.has(key)) {
        uniqueMap.set(key, item);
      }
    });
    
    return Array.from(uniqueMap.values());
  },

  /**
   * 更新精选特码历史与开奖记录的比较
   */
  updateSpecialHistoryComparison() {
    // 重新渲染精选特码历史以显示最新的开奖结果
    this.renderSpecialHistory();
  }
};

// 导出模块
if(typeof window !== 'undefined') {
  window.SpecialHistory = SpecialHistory;
}
