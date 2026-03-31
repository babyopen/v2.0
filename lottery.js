/**
 * 机选模块功能
 * @namespace Lottery
 */
const Lottery = {
  /**
   * 初始化机选模块
   */
  init() {
    console.log('机选模块初始化');
    this.initLotteryPage();
  },

  /**
   * 初始化机选页面
   */
  initLotteryPage() {
    const excludePanel = document.getElementById('excludePanel');
    if(excludePanel) {
      excludePanel.style.display = 'none';
    }
    this.renderNumberPanel();
  },

  /**
   * 渲染号码面板
   */
  renderNumberPanel() {
    const state = StateManager._state;
    const numberContainer = document.querySelector('.number-container');
    if(!numberContainer) return;

    const fragment = document.createDocumentFragment();
    for(let i = 1; i <= 49; i++) {
      const numStr = String(i).padStart(2, '0');
      const isExcluded = state.excludeNumbers.includes(numStr);
      const div = document.createElement('div');
      div.className = `number-item ${isExcluded ? 'excluded' : ''}`;
      div.dataset.number = numStr;
      div.innerHTML = `
        <div class="number-circle ${this.getNumberColor(i)}">
          ${numStr}
        </div>
      `;
      fragment.appendChild(div);
    }

    numberContainer.innerHTML = '';
    numberContainer.appendChild(fragment);
  },

  /**
   * 获取号码颜色
   * @param {number} num - 号码
   * @returns {string} 颜色类名
   */
  getNumberColor(num) {
    const color = Object.keys(CONFIG.COLOR_MAP).find(c => CONFIG.COLOR_MAP[c].includes(num));
    const colorMap = { '红': 'red', '蓝': 'blue', '绿': 'green' };
    return colorMap[color] || 'red';
  },

  /**
   * 生成随机号码
   */
  generateRandom() {
    const state = StateManager._state;
    const excludeNumbers = state.excludeNumbers;
    const resultContainer = document.getElementById('randomResult');
    
    if(!resultContainer) return;

    // 生成6个不重复的号码
    const numbers = this.getRandomNumbers(6, excludeNumbers);
    
    // 显示结果
    let html = '<div class="random-result">';
    numbers.forEach(num => {
      html += `<span class="number-tag ${this.getNumberColor(num)}">${String(num).padStart(2, '0')}</span>`;
    });
    html += '</div>';
    
    resultContainer.innerHTML = html;
    
    // 复制到剪贴板
    this.copyToClipboard(numbers.map(n => String(n).padStart(2, '0')).join(' '));
  },

  /**
   * 生成指定数量的随机号码
   * @param {number} count - 数量
   * @param {Array} exclude - 排除的号码
   * @returns {Array} 随机号码数组
   */
  getRandomNumbers(count, exclude = []) {
    const available = [];
    for(let i = 1; i <= 49; i++) {
      const numStr = String(i).padStart(2, '0');
      if(!exclude.includes(numStr)) {
        available.push(i);
      }
    }

    if(available.length < count) {
      Toast.show('可选号码不足');
      return [];
    }

    const result = [];
    for(let i = 0; i < count; i++) {
      const randomIndex = Math.floor(Math.random() * available.length);
      result.push(available.splice(randomIndex, 1)[0]);
    }

    return result.sort((a, b) => a - b);
  },

  /**
   * 切换排除面板
   */
  toggleExclude() {
    const excludePanel = document.getElementById('excludePanel');
    if(excludePanel) {
      excludePanel.style.display = excludePanel.style.display === 'none' ? 'block' : 'none';
    }
  },

  /**
   * 重置排除号码
   */
  resetExclude() {
    StateManager.setState({ excludeNumbers: [] }, true);
    this.renderNumberPanel();
    Toast.show('已重置排除号码');
  },

  /**
   * 切换排除号码
   * @param {string} number - 号码
   */
  toggleExcludeNumber(number) {
    const state = StateManager._state;
    let newExcludeNumbers;
    
    if(state.excludeNumbers.includes(number)) {
      newExcludeNumbers = state.excludeNumbers.filter(num => num !== number);
    } else {
      newExcludeNumbers = [...state.excludeNumbers, number];
    }
    
    StateManager.setState({ excludeNumbers: newExcludeNumbers }, true);
    this.renderNumberPanel();
  },

  /**
   * 复制到剪贴板
   * @param {string} text - 要复制的文本
   */
  copyToClipboard(text) {
    if(navigator.clipboard && window.isSecureContext) {
      navigator.clipboard.writeText(text).then(() => {
        Toast.show('已复制到剪贴板');
      }).catch(err => {
        console.error('复制失败:', err);
        Toast.show('复制失败');
      });
    } else {
      // 降级方案
      const textArea = document.createElement('textarea');
      textArea.value = text;
      textArea.style.position = 'fixed';
      textArea.style.left = '-999999px';
      textArea.style.top = '-999999px';
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();
      try {
        document.execCommand('copy');
        Toast.show('已复制到剪贴板');
      } catch (err) {
        console.error('复制失败:', err);
        Toast.show('复制失败');
      } finally {
        document.body.removeChild(textArea);
      }
    }
  },

  /**
   * 批量排除号码
   * @param {Array} numbers - 要排除的号码数组
   */
  batchExcludeNumbers(numbers) {
    const state = StateManager._state;
    const newExcludeNumbers = [...new Set([...state.excludeNumbers, ...numbers])];
    StateManager.setState({ excludeNumbers: newExcludeNumbers }, true);
    this.renderNumberPanel();
  },

  /**
   * 批量取消排除号码
   * @param {Array} numbers - 要取消排除的号码数组
   */
  batchUnexcludeNumbers(numbers) {
    const state = StateManager._state;
    const newExcludeNumbers = state.excludeNumbers.filter(num => !numbers.includes(num));
    StateManager.setState({ excludeNumbers: newExcludeNumbers }, true);
    this.renderNumberPanel();
  },

  /**
   * 排除连续号码
   * @param {number} start - 开始号码
   * @param {number} end - 结束号码
   */
  excludeRange(start, end) {
    const numbers = [];
    for(let i = start; i <= end; i++) {
      numbers.push(String(i).padStart(2, '0'));
    }
    this.batchExcludeNumbers(numbers);
  },

  /**
   * 排除同尾号码
   * @param {number} tail - 尾数
   */
  excludeSameTail(tail) {
    const numbers = [];
    for(let i = 1; i <= 49; i++) {
      if(i % 10 === tail) {
        numbers.push(String(i).padStart(2, '0'));
      }
    }
    this.batchExcludeNumbers(numbers);
  },

  /**
   * 排除同头号码
   * @param {number} head - 头数
   */
  excludeSameHead(head) {
    const numbers = [];
    for(let i = 1; i <= 49; i++) {
      if(Math.floor(i / 10) === head) {
        numbers.push(String(i).padStart(2, '0'));
      }
    }
    this.batchExcludeNumbers(numbers);
  },

  /**
   * 排除同色号码
   * @param {string} color - 颜色
   */
  excludeSameColor(color) {
    const numbers = [];
    const colorNumbers = CONFIG.COLOR_MAP[color] || [];
    colorNumbers.forEach(num => {
      numbers.push(String(num).padStart(2, '0'));
    });
    this.batchExcludeNumbers(numbers);
  }
};

// 导出模块
if(typeof window !== 'undefined') {
  window.Lottery = Lottery;
}
