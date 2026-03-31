/**
 * 预测历史功能模块
 * @namespace Prediction
 */
const Prediction = {
  /**
   * 初始化预测历史
   */
  init() {
    console.log('预测历史模块初始化');
    this.renderPredictionHistory();
  },

  /**
   * 渲染预测历史
   */
  renderPredictionHistory() {
    const state = StateManager._state;
    const container = document.getElementById('predictionHistory');
    if(!container) return;

    const { predictionHistory, selectedPeriod, selectedNumber } = state;
    const filteredList = this.getFilteredPredictionHistory(selectedPeriod, selectedNumber);

    if(filteredList.length === 0) {
      container.innerHTML = '<div class="no-data">暂无预测历史数据</div>';
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
   * 获取筛选后的预测历史
   * @param {number} period - 期数
   * @param {number} number - 号码数量
   * @returns {Array} 筛选后的预测历史
   */
  getFilteredPredictionHistory(period, number) {
    const state = StateManager._state;
    return state.predictionHistory.filter(item => {
      return item.days === period && item.numbers.split(' ').length === number;
    }).sort((a, b) => Number(b.period) - Number(a.period));
  },

  /**
   * 计算命中情况
   * @param {Object} item - 预测历史项
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
   * 保存预测历史
   * @param {Object} data - 预测数据
   */
  savePredictionHistory(data) {
    const state = StateManager._state;
    const { period, days, numbers } = data;
    
    // 检查是否已存在相同期数和参数的记录
    const existingIndex = state.predictionHistory.findIndex(item => 
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
      
      const newHistory = [...state.predictionHistory, newRecord];
      StateManager.setState({ predictionHistory: newHistory }, true);
      
      // 保存到本地存储
      Storage.savePredictionHistory(newHistory);
    }
  },

  /**
   * 静默更新所有预测历史
   */
  silentUpdateAllPredictionHistory() {
    const state = StateManager._state;
    const { predictionHistory } = state;
    
    // 这里可以添加更新逻辑，例如检查是否有新的开奖记录
    // 然后重新计算命中情况
    
    // 重新渲染预测历史
    this.renderPredictionHistory();
  },

  /**
   * 清理过期的预测历史
   */
  cleanupOldPredictionHistory() {
    const state = StateManager._state;
    const now = Date.now();
    const oneMonthAgo = now - (30 * 24 * 60 * 60 * 1000);
    
    // 保留一个月内的记录
    const filteredHistory = state.predictionHistory.filter(item => 
      item.timestamp >= oneMonthAgo
    );
    
    if(filteredHistory.length !== state.predictionHistory.length) {
      StateManager.setState({ predictionHistory: filteredHistory }, true);
      Storage.savePredictionHistory(filteredHistory);
    }
  },

  /**
   * 计算预测历史统计信息
   * @returns {Object} 统计信息
   */
  calculatePredictionStats() {
    const state = StateManager._state;
    const { predictionHistory, analysis: { historyData } } = state;
    
    let totalPredictions = 0;
    let totalHits = 0;
    let hitRate = 0;
    
    predictionHistory.forEach(item => {
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
   * 导出预测历史
   * @returns {string} 导出的CSV字符串
   */
  exportPredictionHistory() {
    const state = StateManager._state;
    const { predictionHistory } = state;
    
    let csv = '期数,分析期数,号码数量,预测号码,开奖特码,命中状态,时间戳\n';
    
    predictionHistory.forEach(item => {
      const hitInfo = this.calculateHitInfo(item);
      const hitStatus = hitInfo.isHit ? '命中' : '未命中';
      const te = hitInfo.te || '';
      const numbers = item.numbers.replace(/ /g, ',');
      
      csv += `${item.period},${item.days},${item.numbers.split(' ').length},${numbers},${te},${hitStatus},${new Date(item.timestamp).toISOString()}\n`;
    });
    
    return csv;
  },

  /**
   * 导入预测历史
   * @param {string} csv - CSV字符串
   * @returns {boolean} 是否导入成功
   */
  importPredictionHistory(csv) {
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
        const mergedHistory = [...state.predictionHistory, ...newHistory];
        // 去重
        const uniqueHistory = this.removeDuplicatePredictions(mergedHistory);
        
        StateManager.setState({ predictionHistory: uniqueHistory }, true);
        Storage.savePredictionHistory(uniqueHistory);
        this.renderPredictionHistory();
        
        return true;
      }
      
      return false;
    } catch (error) {
      console.error('导入预测历史失败:', error);
      return false;
    }
  },

  /**
   * 移除重复的预测记录
   * @param {Array} history - 预测历史数组
   * @returns {Array} 去重后的预测历史
   */
  removeDuplicatePredictions(history) {
    const uniqueMap = new Map();
    
    history.forEach(item => {
      const key = `${item.period}_${item.days}_${item.numbers}`;
      if(!uniqueMap.has(key)) {
        uniqueMap.set(key, item);
      }
    });
    
    return Array.from(uniqueMap.values());
  }
};

// 导出模块
if(typeof window !== 'undefined') {
  window.Prediction = Prediction;
}
