/**
 * 分析页面功能模块
 * @namespace Business
 */

// 分析页面相关功能
Business.initAnalysisPage = () => {
  const state = StateManager._state;
  if(state.analysis.historyData.length === 0) {
    // 尝试从缓存加载
    const cache = Storage.loadHistoryCache();
    if(cache.data && cache.data.length > 0) {
      // 使用缓存数据
      const newAnalysis = { 
        ...state.analysis, 
        historyData: cache.data 
      };
      StateManager.setState({ analysis: newAnalysis }, false);
      
      // 渲染数据
      Business.renderLatest(cache.data[0]);
      Business.renderHistory();
      Business.renderFullAnalysis();
      Business.renderZodiacAnalysis();
      Business.updateHotColdStatus();
      
      // 后台静默刷新
      setTimeout(() => Business.silentRefreshHistory(), 2000);
    } else {
      // 没有缓存，正常加载
      Business.refreshHistory(true);
    }
  } else {
    // 已有数据，直接渲染
    Business.renderLatest(state.analysis.historyData[0]);
    Business.renderHistory();
    Business.renderFullAnalysis();
    Business.renderZodiacAnalysis();
    Business.updateHotColdStatus();
  }
  Business.startCountdown();
  Business.startAutoRefresh();
  Business.initSwipeGesture();
};

/**
 * 初始化滑动手势
 */
Business.initSwipeGesture = () => {
  const analysisPage = document.getElementById('analysisPage');
  if(!analysisPage) return;
  
  let startX = 0;
  let startY = 0;
  
  analysisPage.addEventListener('touchstart', (e) => {
    startX = e.touches[0].clientX;
    startY = e.touches[0].clientY;
  }, { passive: true });
  
  analysisPage.addEventListener('touchend', (e) => {
    if(!startX || !startY) return;
    
    const endX = e.changedTouches[0].clientX;
    const endY = e.changedTouches[0].clientY;
    
    const diffX = endX - startX;
    const diffY = endY - startY;
    
    // 检测水平滑动
    if(Math.abs(diffX) > Math.abs(diffY) && Math.abs(diffX) > 50) {
      // 从左边缘向右滑动
      if(startX < 50 && diffX > 0) {
        Business.handleSwipe('left');
      }
      // 从右边缘向左滑动
      else if(startX > window.innerWidth - 50 && diffX < 0) {
        Business.handleSwipe('right');
      }
    }
    
    startX = 0;
    startY = 0;
  }, { passive: true });
};

/**
 * 处理滑动事件
 * @param {string} direction - 滑动方向
 */
Business.handleSwipe = (direction) => {
  // 这里可以添加滑动后的处理逻辑
  console.log('Swipe detected:', direction);
  // 例如：切换到其他标签页
  if(direction === 'left') {
    // 从左向右滑动，切换到下一个标签
    if(typeof Business !== 'undefined' && Business.switchTab) {
      Business.switchTab('prediction');
    }
  } else if(direction === 'right') {
    // 从右向左滑动，切换到上一个标签
    if(typeof Business !== 'undefined' && Business.switchTab) {
      Business.switchTab('lottery');
    }
  }
};

/**
 * 静默刷新历史数据（不显示加载状态）
 */
Business.silentRefreshHistory = async () => {
  try {
    const year = new Date().getFullYear();
    const res = await fetch(CONFIG.API.HISTORY + year);
    const data = await res.json();
    let rawData = data.data || [];

    // 过滤无效数据
    rawData = rawData.filter(item => {
      const expect = item.expect || '';
      const openCode = item.openCode || '';
      return expect && openCode && openCode.split(',').length === 7;
    });

    // 去重并排序
    const uniqueMap = new Map();
    rawData.forEach(item => {
      const expectNum = Number(item.expect || 0);
      if(expectNum && !isNaN(expectNum)) {
        uniqueMap.set(expectNum, item);
      }
    });

    const sortedData = Array.from(uniqueMap.values()).sort((a, b) => {
      return Number(b.expect || 0) - Number(a.expect || 0);
    });

    // 更新状态
    const newAnalysis = { 
      ...StateManager._state.analysis, 
      historyData: sortedData 
    };
    StateManager.setState({ analysis: newAnalysis }, false);

    // 保存到缓存
    Storage.saveHistoryCache(sortedData);

    // 渲染
    Business.renderLatest(sortedData[0]);
    Business.renderHistory();
    Business.renderFullAnalysis();
    Business.renderZodiacAnalysis();
    Business.updateHotColdStatus();
    
    // 静默更新所有期数的预测历史
    Business.silentUpdateAllPredictionHistory();
    // 同时更新精选特码历史的开奖记录比较
    Business.updateSpecialHistoryComparison();
    // 重新渲染精选特码历史以显示最新比较结果
    Business.renderSpecialHistory();
    
    // 数据已静默刷新
  } catch(e) {
    console.error('静默刷新失败', e);
  }
};

/**
 * 刷新历史数据
 * @param {boolean} silent - 是否静默模式（不显示提示）
 */
Business.refreshHistory = async (silent = true) => {
  const historyList = document.getElementById('historyList');
  if(historyList && !silent) historyList.innerHTML = '<div style="padding:20px;text-align:center;">加载中...</div>';
  
  try {
    const year = new Date().getFullYear();
    const res = await fetch(CONFIG.API.HISTORY + year);
    const data = await res.json();
    let rawData = data.data || [];

    // 过滤无效数据
    rawData = rawData.filter(item => {
      const expect = item.expect || '';
      const openCode = item.openCode || '';
      return expect && openCode && openCode.split(',').length === 7;
    });

    // 去重并排序
    const uniqueMap = new Map();
    rawData.forEach(item => {
      const expectNum = Number(item.expect || 0);
      if(expectNum && !isNaN(expectNum)) {
        uniqueMap.set(expectNum, item);
      }
    });

    const sortedData = Array.from(uniqueMap.values()).sort((a, b) => {
      return Number(b.expect || 0) - Number(a.expect || 0);
    });

    // 更新状态
    const newAnalysis = { ...StateManager._state.analysis, historyData: sortedData };
    StateManager.setState({ analysis: newAnalysis }, false);

    // 保存到缓存
    Storage.saveHistoryCache(sortedData);

    // 渲染
    Business.renderLatest(sortedData[0]);
    Business.renderHistory();
    Business.renderFullAnalysis();
    Business.renderZodiacAnalysis();
    
    // 更新冷热号状态
    Business.updateHotColdStatus();
    
    // 静默更新所有期数的预测历史
    Business.silentUpdateAllPredictionHistory();
    // 同时更新精选特码历史的开奖记录比较
    Business.updateSpecialHistoryComparison();
    // 重新渲染精选特码历史以显示最新比较结果
    Business.renderSpecialHistory();
    
    if(!silent) Toast.show('数据加载成功');
  } catch(e) {
    console.error('加载历史数据失败', e);
    if(historyList && !silent) {
      historyList.innerHTML = '<div style="padding:20px;text-align:center;color:var(--danger);">数据加载失败，请刷新重试</div>';
    }
    if(!silent) Toast.show('数据加载失败');
  }
  
  const loadMore = document.getElementById('loadMore');
  if(loadMore) {
    loadMore.style.display = StateManager._state.analysis.historyData.length > StateManager._state.analysis.showCount ? 'block' : 'none';
  }
};

/**
 * 获取特码信息
 * @param {Object} item - 历史数据项
 * @returns {Object} 特码信息
 */
Business.getSpecial = (item) => {
  const codeArr = (item.openCode || '0,0,0,0,0,0,0').split(',');
  const zodArrRaw = (item.zodiac || ',,,,,,,,,,,,').split(',');
  const zodArr = zodArrRaw.map(z => CONFIG.ANALYSIS.ZODIAC_TRAD_TO_SIMP[z] || z);
  const te = Math.max(0, Number(codeArr[6]));
  
  return {
    te,
    tail: te % 10,
    head: Math.floor(te / 10),
    wave: Business.getColor(te),
    colorName: Business.getColorName(te),
    zod: zodArr[6] || '-',
    odd: te % 2 === 1,
    big: te >= 25,
    animal: CONFIG.ANALYSIS.HOME_ZODIAC.includes(zodArr[6]) ? '家禽' : '野兽',
    wuxing: Business.getWuxing(te),
    fullZodArr: zodArr
  };
};

/**
 * 获取五行
 * @param {number} n - 号码
 * @returns {string} 五行
 */
Business.getColor = (n) => {
  const color = Object.keys(CONFIG.COLOR_MAP).find(c => CONFIG.COLOR_MAP[c].includes(n));
  const colorMap = { '红': 'red', '蓝': 'blue', '绿': 'green' };
  return colorMap[color] || 'red';
};

Business.getColorName = (n) => {
  const color = Object.keys(CONFIG.COLOR_MAP).find(c => CONFIG.COLOR_MAP[c].includes(n));
  return color || '红';
};

Business.getWuxing = (n) => {
  const element = Object.keys(CONFIG.ELEMENT_MAP).find(e => CONFIG.ELEMENT_MAP[e].includes(n));
  return element || '金';
};

/**
 * 获取生肖等级
 * @param {number} count - 出现次数
 * @param {number} miss - 遗漏期数
 * @param {number} total - 总期数
 * @returns {Object} 等级信息
 */
Business.getZodiacLevel = (count, miss, total) => {
  const avgCount = total / 12;
  if(count >= avgCount * 1.5 && miss <= 3) return { cls: 'hot', text: '热' };
  if(count <= avgCount * 0.5 || miss >= 8) return { cls: 'cold', text: '冷' };
  return { cls: 'warm', text: '温' };
};

/**
 * 渲染最新开奖
 * @param {Object} item - 最新数据项
 */
Business.renderLatest = (item) => {
  if(!item) return;
  const codeArr = (item.openCode || '0,0,0,0,0,0,0').split(',');
  const s = Business.getSpecial(item);
  const zodArr = s.fullZodArr;
  
  let html = '';
  for(let i = 0; i < 6; i++) {
    const num = Number(codeArr[i]);
    html += Business.buildBall(codeArr[i], Business.getColor(num), zodArr[i]);
  }
  html += '<div class="ball-sep">+</div>' + Business.buildBall(codeArr[6], s.wave, zodArr[6]);
  
  const latestBalls = document.getElementById('latestBalls');
  const curExpect = document.getElementById('curExpect');
  if(latestBalls) latestBalls.innerHTML = html;
  if(curExpect) curExpect.innerText = item.expect || '--';
};

/**
 * 构建球元素
 * @param {string} num - 号码
 * @param {string} color - 颜色
 * @param {string} zodiac - 生肖
 * @returns {string} HTML字符串
 */
Business.buildBall = (num, color, zodiac) => {
  return `
  <div class="ball-item">
    <div class="ball ${color}">${num}</div>
    <div class="ball-zodiac">${zodiac}</div>
  </div>`;
};

/**
 * 渲染历史记录
 */
Business.renderHistory = () => {
  const state = StateManager._state;
  const list = state.analysis.historyData.slice(0, state.analysis.showCount);
  const historyList = document.getElementById('historyList');
  
  if(!list.length) {
    if(historyList) historyList.innerHTML = '<div style="padding:20px;text-align:center;">暂无历史数据</div>';
    return;
  }
  
  if(historyList) {
    historyList.innerHTML = list.map(item => {
      const codeArr = (item.openCode || '0,0,0,0,0,0,0').split(',');
      const waveArr = (item.wave || 'red,red,red,red,red,red,red').split(',');
      const s = Business.getSpecial(item);
      const zodArr = s.fullZodArr;
      let balls = '';
      for(let i = 0; i < 6; i++) balls += Business.buildBall(codeArr[i], waveArr[i], zodArr[i]);
      balls += '<div class="ball-sep">+</div>' + Business.buildBall(codeArr[6], waveArr[6], zodArr[6]);
      return `
      <div class="history-item">
        <div class="history-expect">第${item.expect || ''}期</div>
        <div class="ball-group">${balls}</div>
      </div>`;
    }).join('');
  }
};

/**
 * 计算全维度分析
 * @returns {Object} 分析数据
 */
Business.calcFullAnalysis = () => {
  const state = StateManager._state;
  const { historyData, analyzeLimit } = state.analysis;
  if(!historyData.length) return null;

  const list = historyData.slice(0, Math.min(analyzeLimit, historyData.length));
  const total = list.length;

  // 初始化统计对象
  const singleDouble = { '单': 0, '双': 0 };
  const bigSmall = { '大': 0, '小': 0 };
  const range = { '1-9': 0, '10-19': 0, '20-29': 0, '30-39': 0, '40-49': 0 };
  const head = { 0: 0, 1: 0, 2: 0, 3: 0, 4: 0 };
  const tail = { 0: 0, 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0, 7: 0, 8: 0, 9: 0 };
  const color = { '红': 0, '蓝': 0, '绿': 0 };
  const wuxing = { '金': 0, '木': 0, '水': 0, '火': 0, '土': 0 };
  const animal = { '家禽': 0, '野兽': 0 };
  const zodiac = {};
  CONFIG.ANALYSIS.ZODIAC_ALL.forEach(z => zodiac[z] = 0);
  const numCount = {};
  for(let i = 1; i <= 49; i++) numCount[String(i).padStart(2, '0')] = 0;
  const lastAppear = {};
  for(let i = 1; i <= 49; i++) lastAppear[i] = -1;

  // 统计
  list.forEach((item, idx) => {
    const s = Business.getSpecial(item);
    s.odd ? singleDouble['单']++ : singleDouble['双']++;
    s.big ? bigSmall['大']++ : bigSmall['小']++;
    s.te <= 9 ? range['1-9']++ : s.te <= 19 ? range['10-19']++ : s.te <= 29 ? range['20-29']++ : s.te <= 39 ? range['30-39']++ : range['40-49']++;
    head[s.head]++;
    tail[s.tail]++;
    color[s.colorName]++;
    wuxing[s.wuxing]++;
    animal[s.animal]++;
    if(CONFIG.ANALYSIS.ZODIAC_ALL.includes(s.zod)) zodiac[s.zod]++;
    numCount[String(s.te).padStart(2, '0')]++;
    if(lastAppear[s.te] === -1) lastAppear[s.te] = idx;
  });

  // 遗漏计算
  let totalMissSum = 0, maxMiss = 0, hot = 0, warm = 0, cold = 0;
  const allMiss = [];
  for(let m = 1; m <= 49; m++) {
    const p = lastAppear[m];
    const currentMiss = p === -1 ? total : p;
    allMiss.push(currentMiss);
    totalMissSum += currentMiss;
    if(currentMiss > maxMiss) maxMiss = currentMiss;
    if(currentMiss <= 3) hot++;
    else if(currentMiss <= 9) warm++;
    else cold++;
  }
  const avgMiss = (totalMissSum / 49).toFixed(1);
  const curMaxMiss = Math.max(...allMiss);

  // 连出计算
  let curStreak = 1, maxStreak = 1, current = 1;
  let curStreakData = [];
  let maxStreakData = [];
  let tempStreakData = [];
  
  // 辅助函数：将布尔值转换为中文形态
  const getShapeText = (odd, big) => {
    const oddText = odd ? '单' : '双';
    const bigText = big ? '大' : '小';
    return `${oddText}_${bigText}`;
  };
  
  if(list.length >= 2) {
    const firstSpecial = Business.getSpecial(list[0]);
    const firstShape = getShapeText(firstSpecial.odd, firstSpecial.big);
    curStreakData.push({
      expect: list[0].expect,
      te: firstSpecial.te,
      shape: firstShape
    });
    for(let i = 1; i < list.length; i++) {
      const s = Business.getSpecial(list[i]);
      const shape = getShapeText(s.odd, s.big);
      if(shape === firstShape) {
        curStreak++;
        curStreakData.push({
          expect: list[i].expect,
          te: s.te,
          shape: shape
        });
      } else break;
    }
    
    let prevShape = getShapeText(firstSpecial.odd, firstSpecial.big);
    tempStreakData.push({
      expect: list[0].expect,
      te: firstSpecial.te,
      shape: prevShape
    });
    
    for(let i = 1; i < list.length; i++) {
      const s = Business.getSpecial(list[i]);
      const shape = getShapeText(s.odd, s.big);
      if(shape === prevShape) {
        current++;
        tempStreakData.push({
          expect: list[i].expect,
          te: s.te,
          shape: shape
        });
        if(current > maxStreak) {
          maxStreak = current;
          maxStreakData = [...tempStreakData];
        }
      } else {
        current = 1;
        prevShape = shape;
        tempStreakData = [{
          expect: list[i].expect,
          te: s.te,
          shape: shape
        }];
      }
    }
  }

  // 热门排序
  const hotSD = Object.entries(singleDouble).sort((a, b) => b[1] - a[1])[0];
  const hotBS = Object.entries(bigSmall).sort((a, b) => b[1] - a[1])[0];
  const hotHead = Object.entries(head).sort((a, b) => b[1] - a[1])[0];
  const hotTail = Object.entries(tail).sort((a, b) => b[1] - a[1])[0];
  const hotColor = Object.entries(color).sort((a, b) => b[1] - a[1])[0];
  const hotWx = Object.entries(wuxing).sort((a, b) => b[1] - a[1])[0];
  const hotZod = Object.entries(zodiac).sort((a, b) => b[1] - a[1]).slice(0, 3).map(i => i[0]).join('、');
  const hotAni = Object.entries(animal).sort((a, b) => b[1] - a[1])[0];
  const hotNum = Object.entries(numCount).sort((a, b) => b[1] - a[1]).slice(0, 5).map(i => i[0]).join(' ');

  return {
    total, singleDouble, bigSmall, range, head, tail, color, wuxing, animal, zodiac, numCount,
    hotSD, hotBS, hotHead, hotTail, hotColor, hotWx, hotZod, hotAni, hotNum,
    miss: { curMaxMiss, avgMiss, maxMiss, hot, warm, cold },
    streak: { curStreak, maxStreak, curStreakData, maxStreakData }
  };
};

/**
 * 热门生肖多维度筛选算法 - 先确定6个热门生肖，再结合其他维度筛选
 * @param {Array} list - 历史数据列表
 * @param {Object} numCount - 号码出现次数统计
 * @param {Object} lastAppear - 号码遗漏期数
 * @param {Object} zodiac - 生肖统计
 * @param {Object} hotData - 热门形态数据
 * @param {number} targetCount - 目标号码数量（5或10）
 * @returns {string} 排序后的热门号码字符串
 */
Business.calcMultiDimensionalHotNums = (list, numCount, lastAppear, zodiac, hotData, targetCount = 5) => {
  const total = list.length;
  
  // 步骤1: 确定前6个热门生肖
  const top6Zodiacs = Object.entries(zodiac)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6)
    .map(item => item[0]);
  
  // 步骤2: 建立所有号码的完整属性映射
  const numFullAttrs = new Map();
  for(let num = 1; num <= 49; num++) {
    const attrs = DataQuery.getNumAttrs(num);
    numFullAttrs.set(num, attrs);
  }
  
  // 步骤3: 建立历史号码出现频率映射
  const historyNumMap = new Map();
  list.forEach(item => {
    const s = Business.getSpecial(item);
    if(s.te >= 1 && s.te <= 49) {
      historyNumMap.set(s.te, (historyNumMap.get(s.te) || 0) + 1);
    }
  });
  
  // 步骤4: 筛选属于前6个热门生肖的号码
  const candidateNums = [];
  for(let num = 1; num <= 49; num++) {
    const attrs = numFullAttrs.get(num);
    if(top6Zodiacs.includes(attrs.zodiac)) {
      const numStr = String(num).padStart(2, '0');
      const count = numCount[numStr] || 0;
      const miss = lastAppear[num] === -1 ? total : lastAppear[num];
      
      // 对每个候选号码进行多维度评分
      let score = 0;
      
      // 维度1: 历史出现频率 (权重25%)
      const maxCount = Math.max(...Object.values(numCount));
      const freqScore = maxCount > 0 ? (count / maxCount) * 100 : 0;
      score += freqScore * 0.25;
      
      // 维度2: 近期热度 - 最近10期内出现次数 (权重20%)
      let recentCount = 0;
      const recentList = list.slice(0, Math.min(10, list.length));
      recentList.forEach(item => {
        const s = Business.getSpecial(item);
        if(s.te === num) recentCount++;
      });
      const recentScore = recentList.length > 0 ? (recentCount / recentList.length) * 100 : 0;
      score += recentScore * 0.20;
      
      // 维度3: 遗漏期数 (权重15%)
      let missScore = 0;
      if(miss >= 1 && miss <= 3) {
        missScore = 80;
      } else if(miss >= 4 && miss <= 8) {
        missScore = 100;
      } else if(miss >= 9 && miss <= 15) {
        missScore = 60;
      } else {
        missScore = 30;
      }
      score += missScore * 0.15;
      
      // 维度4: 热门形态匹配 - 单双 (权重10%)
      if(attrs.odd === hotData.hotSD) score += 100 * 0.10;
      
      // 维度5: 热门形态匹配 - 大小 (权重10%)
      if(attrs.big === hotData.hotBS) score += 100 * 0.10;
      
      // 维度6: 热门波色匹配 (权重5%)
      if(attrs.color === hotData.hotColor) score += 100 * 0.05;
      
      // 维度7: 热门五行匹配 (权重5%)
      if(attrs.element === hotData.hotWx) score += 100 * 0.05;
      
      // 维度8: 热门头数匹配 (权重5%)
      if(String(attrs.head) === String(hotData.hotHead)) score += 100 * 0.05;
      
      // 维度9: 热门尾数匹配 (权重5%)
      if(String(attrs.tail) === String(hotData.hotTail)) score += 100 * 0.05;
      
      candidateNums.push({
        num: num,
        numStr: numStr,
        score: score,
        zodiac: attrs.zodiac,
        zodiacRank: top6Zodiacs.indexOf(attrs.zodiac)
      });
    }
  }
  
  // 步骤5: 平衡热号/温号/冷号
  const hotNums = [];
  const warmNums = [];
  const coldNums = [];
  
  candidateNums.forEach(item => {
    const miss = lastAppear[item.num] === -1 ? total : lastAppear[item.num];
    if(miss <= 3) {
      hotNums.push(item);
    } else if(miss <= 9) {
      warmNums.push(item);
    } else {
      coldNums.push(item);
    }
  });
  
  // 按得分排序各类号码
  hotNums.sort((a, b) => b.score - a.score);
  warmNums.sort((a, b) => b.score - a.score);
  coldNums.sort((a, b) => b.score - a.score);
  
  // 平衡分配：如果目标是5个，取2热+2温+1冷；如果是10个，取4热+4温+2冷
  const finalNums = [];
  const hotRatio = targetCount === 5 ? 2 : 4;
  const warmRatio = targetCount === 5 ? 2 : 4;
  const coldRatio = targetCount === 5 ? 1 : 2;
  
  finalNums.push(...hotNums.slice(0, hotRatio));
  finalNums.push(...warmNums.slice(0, warmRatio));
  finalNums.push(...coldNums.slice(0, coldRatio));
  
  // 如果数量不够，从候选池中补充
  if(finalNums.length < targetCount) {
    const remaining = candidateNums
      .filter(n => !finalNums.find(f => f.num === n.num))
      .slice(0, targetCount - finalNums.length);
    finalNums.push(...remaining);
  }
  
  // 按得分重新排序并格式化
  finalNums.sort((a, b) => b.score - a.score);
  const result = finalNums.slice(0, targetCount).map(item => item.numStr);
  
  return result.join(' ');
};

/**
 * 渲染全维度分析
 */
Business.renderFullAnalysis = () => {
  const data = Business.calcFullAnalysis();
  if(!data) {
    const hotWrap = document.getElementById('hotWrap');
    const emptyTip = document.getElementById('emptyTip');
    if(hotWrap) hotWrap.style.display = 'none';
    if(emptyTip) emptyTip.style.display = 'block';
    return;
  }
  
  const hotWrap = document.getElementById('hotWrap');
  const emptyTip = document.getElementById('emptyTip');
  if(hotWrap) hotWrap.style.display = 'block';
  if(emptyTip) emptyTip.style.display = 'none';

  // 构建热门特码的球号显示
  const buildHotNumberBalls = (hotNumStr) => {
    const nums = hotNumStr.split(' ').map(num => Number(num));
    let ballHtml = '<div class="ball-group">';
    nums.forEach(num => {
      const color = Business.getColor(num);
      const zodiac = DataQuery._getZodiacByNum(num);
      const element = Business.getWuxing(num);
      const numStr = String(num).padStart(2, '0');
      const zodiacText = element ? `${zodiac}/${element}` : zodiac;
      ballHtml += `
        <div class="ball-item">
          <div class="ball ${color}">${numStr}</div>
          <div class="ball-zodiac">${zodiacText}</div>
        </div>
      `;
    });
    ballHtml += '</div>';
    return ballHtml;
  };

  // 更新DOM元素
  const elements = {
    'hotShape': `${data.hotSD[0]} / ${data.hotBS[0]}`,
    'hotZodiac': data.hotZod,
    'hotHeadTail': `${data.hotHead[0]}头 / ${data.hotTail[0]}尾`,
    'hotColorWx': `${data.hotColor[0]} / ${data.hotWx[0]}`,
    'hotMiss': `热:${data.miss.hot} 温:${data.miss.warm} 冷:${data.miss.cold} | 最大遗漏:${data.miss.maxMiss}期`,
    'odd': data.singleDouble['单'],
    'even': data.singleDouble['双'],
    'big': data.bigSmall['大'],
    'small': data.bigSmall['小'],
    'r1': data.range['1-9'],
    'r2': data.range['10-19'],
    'r3': data.range['20-29'],
    'r4': data.range['30-39'],
    'r5': data.range['40-49'],
    'h0': data.head[0],
    'h1': data.head[1],
    'h2': data.head[2],
    'h3': data.head[3],
    'h4': data.head[4],
    'cRed': data.color['红'],
    'cBlue': data.color['蓝'],
    'cGreen': data.color['绿'],
    'wJin': data.wuxing['金'],
    'wMu': data.wuxing['木'],
    'wShui': data.wuxing['水'],
    'wHuo': data.wuxing['火'],
    'wTu': data.wuxing['土'],
    'aniHome': data.animal['家禽'],
    'aniWild': data.animal['野兽'],
    'hotShape2': Business.getTopHot(Object.entries(data.singleDouble).concat(Object.entries(data.bigSmall))),
    'hotRange2': Business.getTopHot(Object.entries(data.range)),
    'hotHead2': Business.getTopHot(Object.entries(data.head)),
    'hotTail2': Business.getTopHot(Object.entries(data.tail)),
    'hotColor2': Business.getTopHot(Object.entries(data.color)),
    'hotWuxing2': Business.getTopHot(Object.entries(data.wuxing)),
    'hotAnimal': Business.getTopHot(Object.entries(data.animal)),
    'hotZodiac2': Object.entries(data.zodiac).sort((a, b) => b[1] - a[1]).slice(0, 5).map(i => `${i[0]}(${i[1]})`).join(' '),
    'missCur': data.miss.curMaxMiss,
    'missAvg': data.miss.avgMiss,
    'missMax': data.miss.maxMiss,
    'missHot': data.miss.hot,
    'missWarm': data.miss.warm,
    'missCold': data.miss.cold,
    'hotColdTip': `热:${data.miss.hot} 温:${data.miss.warm} 冷:${data.miss.cold}`,
    'streakCur': data.streak.curStreak,
    'streakMax': data.streak.maxStreak,
    'streakTip': `当前:${data.streak.curStreak}期 最长:${data.streak.maxStreak}期`
  };

  Object.entries(elements).forEach(([id, value]) => {
    const el = document.getElementById(id);
    if(el) el.innerText = value;
  });

  // 特殊处理热门特码的显示
  const hotNumberEl = document.getElementById('hotNumber');
  if(hotNumberEl) {
    hotNumberEl.innerHTML = buildHotNumberBalls(data.hotNum);
    hotNumberEl.style.color = 'inherit';
  }

  // 尾数行渲染
  const tailRow = document.getElementById('tailRow');
  if(tailRow) {
    let tailHtml = '';
    for(let t = 0; t <= 9; t++) {
      tailHtml += `<div class="analysis-item" data-action="showStatDetail" data-stat-type="tail${t}" style="cursor:pointer;"><div class="label">尾${t}</div><div class="value">${data.tail[t]}</div></div>`;
    }
    tailRow.innerHTML = tailHtml;
  }

  // 完整排行渲染
  Business.renderFullRank('singleDoubleRank', data.singleDouble, data.total);
  Business.renderFullRank('bigSmallRank', data.bigSmall, data.total);
  Business.renderFullRank('rangeRank', data.range, data.total);
  Business.renderFullRank('headRank', data.head, data.total);
  Business.renderFullRank('tailRank', data.tail, data.total);
  Business.renderFullRank('colorRank', data.color, data.total);
  Business.renderFullRank('wuxingRank', data.wuxing, data.total);
  Business.renderFullRank('animalRank', data.animal, data.total);
  Business.renderFullRank('zodiacRank', data.zodiac, data.total);
};

/**
 * 获取热门值
 * @param {Array} arr - 数组
 * @param {number} limit - 限制数量
 * @returns {string} 热门值字符串
 */
Business.getTopHot = (arr, limit = 2) => {
  return arr.sort((a, b) => b[1] - a[1]).slice(0, limit).map(i => i[0]).join(' / ');
};

/**
 * 渲染完整排行
 * @param {string} containerId - 容器ID
 * @param {Object} dataObj - 数据对象
 * @param {number} total - 总数
 */
Business.renderFullRank = (containerId, dataObj, total) => {
  const container = document.getElementById(containerId);
  if(!container) return;
  if(total === 0) { container.innerHTML = ''; return; }
  
  const sorted = Object.entries(dataObj).sort((a, b) => b[1] - a[1]);
  let html = `
  <div class="rank-header">
    <div class="rank-no">名次</div>
    <div class="rank-name">分类</div>
    <div class="rank-count">次数</div>
    <div class="rank-rate">占比</div>
    <div class="rank-miss">遗漏</div>
  </div>`;
  
  sorted.forEach(([name, count], idx) => {
    const rate = ((count / total) * 100).toFixed(0) + '%';
    const miss = count > 0 ? Math.floor((total - count) / count) : total;
    html += `
    <div class="rank-row">
      <div class="rank-no">${idx + 1}</div>
      <div class="rank-name">${name}</div>
      <div class="rank-count">${count}</div>
      <div class="rank-rate">${rate}</div>
      <div class="rank-miss">${miss}</div>
    </div>`;
  });
  
  container.innerHTML = html;
};

/**
 * 计算生肖关联分析
 * @returns {Object} 分析数据
 */
Business.calcZodiacAnalysis = (customAnalyzeLimit) => {
  const state = StateManager._state;
  const { historyData } = state.analysis;
  const analyzeLimit = customAnalyzeLimit !== undefined ? customAnalyzeLimit : state.analysis.analyzeLimit;
  
  let list = [];
  let total = 0;
  let avgExpect = 12;
  let zodCount = {};
  let lastAppear = {};
  let tailZodMap = {};
  let followMap = {};
  let topZod = [];
  let topTail = [];
  
  // 初始化统计对象
  CONFIG.ANALYSIS.ZODIAC_ALL.forEach(z => { zodCount[z] = 0; lastAppear[z] = -1; });
  for(let t = 0; t <= 9; t++) tailZodMap[t] = {};
  
  // 如果有历史数据，进行统计
  if(historyData.length >= 2) {
    list = historyData.slice(0, Math.min(analyzeLimit, historyData.length));
    total = list.length;
    avgExpect = total / 12;

    // 循环统计
    list.forEach((item, idx) => {
      const s = Business.getSpecial(item);
      if(CONFIG.ANALYSIS.ZODIAC_ALL.includes(s.zod)) {
        zodCount[s.zod]++;
        if(lastAppear[s.zod] === -1) lastAppear[s.zod] = idx;
      }
      if(CONFIG.ANALYSIS.ZODIAC_ALL.includes(s.zod)) {
        tailZodMap[s.tail][s.zod] = (tailZodMap[s.tail][s.zod] || 0) + 1;
      }
    });

    // 跟随统计
    for(let i = 1; i < list.length; i++) {
      const preZod = Business.getSpecial(list[i-1]).zod;
      const curZod = Business.getSpecial(list[i]).zod;
      if(CONFIG.ANALYSIS.ZODIAC_ALL.includes(preZod) && CONFIG.ANALYSIS.ZODIAC_ALL.includes(curZod)) {
        if(!followMap[preZod]) followMap[preZod] = {};
        followMap[preZod][curZod] = (followMap[preZod][curZod] || 0) + 1;
      }
    }

    // 热门排序
    topZod = Object.entries(zodCount).sort((a, b) => b[1] - a[1]);
    topTail = Array.from({ length: 10 }, (_, t) => ({
      t, sum: Object.values(tailZodMap[t]).reduce((a, b) => a + b, 0)
    })).sort((a, b) => b.sum - a.sum);
  }

  // 遗漏期数计算
  const zodMiss = {};
  const zodAvgMiss = {};
  CONFIG.ANALYSIS.ZODIAC_ALL.forEach(z => {
    zodMiss[z] = lastAppear[z] === -1 ? total : lastAppear[z];
    zodAvgMiss[z] = zodCount[z] > 0 ? (total / zodCount[z]).toFixed(1) : total;
  });

  // ========== 生肖预测算法 ==========
  const zodiacScores = {};
  const zodiacDetails = {};

  // 1. 热号状态分析 (0-20分)
  const hotZodiacs = topZod.slice(0, 3).map(z => z[0]);
  
  // 2. 冷号状态分析 (0-30分) - 需要更长历史数据
  let maxMiss = 0;
  Object.values(zodMiss).forEach(m => { if(m > maxMiss) maxMiss = m; });

  // 3. 间隔规律分析
  const zodiacOrder = ['鼠','牛','虎','兔','龙','蛇','马','羊','猴','鸡','狗','猪'];
  const intervalStats = {};
  for(let i = 0; i < 12; i++) intervalStats[i] = 0;
  
  for(let i = 1; i < list.length && i < 30; i++) {
    const preZod = Business.getSpecial(list[i-1]).zod;
    const curZod = Business.getSpecial(list[i]).zod;
    const preIdx = zodiacOrder.indexOf(preZod);
    const curIdx = zodiacOrder.indexOf(curZod);
    if(preIdx !== -1 && curIdx !== -1) {
      let diff = curIdx - preIdx;
      if(diff > 6) diff -= 12;
      if(diff < -6) diff += 12;
      intervalStats[diff + 6]++;
    }
  }
  const commonIntervals = Object.entries(intervalStats).sort((a, b) => b[1] - a[1]).slice(0, 3).map(x => parseInt(x[0]) - 6);

  // 4. 上期生肖用于形态匹配
  const lastZod = list.length > 0 ? Business.getSpecial(list[0]).zod : '';
  
  // 五行相生关系
  const elementGenerate = {
    '金': ['水'],
    '水': ['木'],
    '木': ['火'],
    '火': ['土'],
    '土': ['金']
  };

  // 生肖五行映射
  const zodiacElement = {
    '鼠': '水', '牛': '土', '虎': '木', '兔': '木',
    '龙': '土', '蛇': '火', '马': '火', '羊': '土',
    '猴': '金', '鸡': '金', '狗': '土', '猪': '水'
  };

  // 计算每个生肖的综合分数
  CONFIG.ANALYSIS.ZODIAC_ALL.forEach(zod => {
    let score = 0;
    const details = { cold: 0, hot: 0, shape: 0, interval: 0 };

    // 冷号状态 (0-30分)
    const missValue = zodMiss[zod] || 0;
    if(maxMiss > 0 && missValue >= maxMiss * 0.8) {
      details.cold = 30;
      score += 30;
    } else if(missValue >= 24) {
      details.cold = 20;
      score += 20;
    } else if(missValue >= 12) {
      details.cold = 10;
      score += 10;
    }

    // 热号状态 (0-20分)
    if(hotZodiacs.includes(zod)) {
      details.hot = 20;
      score += 20;
    }

    // 形态匹配 (0-30分) - 五行相生
    if(lastZod && zodiacElement[lastZod] && zodiacElement[zod]) {
      const lastElement = zodiacElement[lastZod];
      const currentElement = zodiacElement[zod];
      if(elementGenerate[lastElement] && elementGenerate[lastElement].includes(currentElement)) {
        details.shape = 15;
        score += 15;
      }
    }

    // 间隔匹配 (0-20分)
    if(lastZod) {
      const lastIdx = zodiacOrder.indexOf(lastZod);
      const currentIdx = zodiacOrder.indexOf(zod);
      if(lastIdx !== -1 && currentIdx !== -1) {
        let diff = currentIdx - lastIdx;
        if(diff > 6) diff -= 12;
        if(diff < -6) diff += 12;
        if(commonIntervals.includes(diff)) {
          details.interval = 20;
          score += 20;
        }
      }
    }

    zodiacScores[zod] = score;
    zodiacDetails[zod] = details;
  });

  // 按分数排序
  const sortedZodiacs = Object.entries(zodiacScores).sort((a, b) => b[1] - a[1]);

  return { list, total, avgExpect, zodCount, zodMiss, zodAvgMiss, tailZodMap, followMap, topZod, topTail, zodiacScores, zodiacDetails, sortedZodiacs };
};

/**
 * 渲染生肖关联分析
 */
Business.renderZodiacAnalysis = () => {
  const data = Business.calcZodiacAnalysis();
  const zodiacEmptyTip = document.getElementById('zodiacEmptyTip');
  const zodiacContent = document.getElementById('zodiacContent');
  
  if(!data) {
    if(zodiacEmptyTip) zodiacEmptyTip.style.display = 'block';
    if(zodiacContent) zodiacContent.style.display = 'none';
    return;
  }
  
  if(zodiacEmptyTip) zodiacEmptyTip.style.display = 'none';
  if(zodiacContent) zodiacContent.style.display = 'block';

  // 生肖预测
  const zodiacPredictionGrid = document.getElementById('zodiacPredictionGrid');
  if(zodiacPredictionGrid) {
    if(data.sortedZodiacs && data.sortedZodiacs.length > 0) {
      let predictionHtml = '';
      data.sortedZodiacs.forEach(([zod, score], idx) => {
        const details = data.zodiacDetails[zod];
        let topClass = '';
        if(idx === 0) topClass = 'top-1';
        else if(idx === 1) topClass = 'top-2';
        else if(idx === 2) topClass = 'top-3';

        const tags = [];
        if(details.cold > 0) tags.push(`冷${details.cold}`);
        if(details.hot > 0) tags.push(`热${details.hot}`);
        if(details.shape > 0) tags.push(`形${details.shape}`);
        if(details.interval > 0) tags.push(`间${details.interval}`);

        predictionHtml += `
          <div class="zodiac-prediction-item ${topClass}" data-zodiac="${zod}">
            <div class="zodiac-prediction-zodiac">${zod}</div>
            <div class="zodiac-prediction-score">${score}分</div>
            <div class="zodiac-prediction-details">
              ${tags.map(t => `<span class="zodiac-prediction-tag">${t}</span>`).join('')}
            </div>
          </div>
        `;
      });
      zodiacPredictionGrid.innerHTML = predictionHtml;
      
      // 保存预测历史
      Business.saveZodiacPredictionHistory(data.sortedZodiacs, data.zodiacDetails);
      // 渲染预测历史
      Business.renderZodiacPredictionHistory();
    } else {
      zodiacPredictionGrid.innerHTML = '<div style="grid-column: 1 / -1; text-align: center; padding: 20px; color: var(--sub-text);">暂无预测数据</div>';
    }
  }

  // 共振组合
  const combo1 = document.getElementById('combo1');
  const combo2 = document.getElementById('combo2');
  const combo3 = document.getElementById('combo3');
  if(combo1) combo1.innerText = `1. 首选：尾${data.topTail[0]?.t ?? '-'} + ${data.topZod[0]?.[0] ?? '-'}（出现${data.topZod[0]?.[1] ?? 0}次）`;
  if(combo2) combo2.innerText = `2. 次选：尾${data.topTail[1]?.t ?? '-'} + ${data.topZod[1]?.[0] ?? '-'}（出现${data.topZod[1]?.[1] ?? 0}次）`;
  if(combo3) combo3.innerText = `3. 备选：尾${data.topTail[2]?.t ?? '-'} + ${data.topZod[2]?.[0] ?? '-'}（出现${data.topZod[2]?.[1] ?? 0}次）`;

  // 尾数→生肖网格
  const tailZodiacGrid = document.getElementById('tailZodiacGrid');
  if(tailZodiacGrid) {
    let tailHtml = '';
    for(let t = 0; t <= 9; t++) {
      const arr = Object.entries(data.tailZodMap[t]).sort((a, b) => b[1] - a[1]);
      const topZ = arr.length ? arr[0][0] : '-';
      const cnt = arr.length ? arr[0][1] : 0;
      const level = Business.getZodiacLevel(cnt, data.zodMiss[topZ] || 0, data.total);
      tailHtml += `<div class="data-item-z ${level.cls}">尾${t}<br>${topZ}<br>${cnt}次</div>`;
    }
    tailZodiacGrid.innerHTML = tailHtml;
  }

  // 跟随表格
  const zodiacFollowTable = document.getElementById('zodiacFollowTable');
  if(zodiacFollowTable) {
    let followHtml = `<tr><th>上期生肖</th><th>首选(次数)</th><th>次选(次数)</th><th>排除生肖</th></tr>`;
    const followKeys = Object.keys(data.followMap).slice(0, 4);
    followKeys.forEach(k => {
      const arr = Object.entries(data.followMap[k]).sort((a, b) => b[1] - a[1]);
      const first = arr[0] ? `${arr[0][0]}(${arr[0][1]})` : '-';
      const second = arr[1] ? `${arr[1][0]}(${arr[1][1]})` : '-';
      const exclude = CONFIG.ANALYSIS.ZODIAC_ALL.filter(z => !arr.some(x => x[0] === z)).slice(0, 2).join('、');
      followHtml += `<tr><td>${k}</td><td>${first}</td><td>${second}</td><td>${exclude || '-'}</td></tr>`;
    });
    zodiacFollowTable.innerHTML = followHtml;
  }

  // 12生肖统计
  const zodiacTotalGrid = document.getElementById('zodiacTotalGrid');
  if(zodiacTotalGrid) {
    let zodHtml = '';
    CONFIG.ANALYSIS.ZODIAC_ALL.forEach(z => {
      const cnt = data.zodCount[z];
      const miss = data.zodMiss[z];
      const rate = ((cnt / data.total) * 100).toFixed(0) + '%';
      const level = Business.getZodiacLevel(cnt, miss, data.total);
      zodHtml += `<div class="data-item-z ${level.cls}">${z}<br>${cnt}次/${rate}<br>遗${miss}</div>`;
    });
    zodiacTotalGrid.innerHTML = zodHtml;
  }

  // 高遗漏生肖
  const zodiacMissGrid = document.getElementById('zodiacMissGrid');
  if(zodiacMissGrid) {
    const missSort = Object.entries(data.zodMiss).sort((a, b) => b[1] - a[1]).slice(0, 3);
    let missHtml = '';
    missSort.forEach(([z, m]) => {
      const avgMiss = data.zodAvgMiss[z];
      const tag = m > avgMiss ? '超平均' : '';
      missHtml += `<div class="data-item-z cold">${z}<br>遗${m}期<br>${tag}</div>`;
    });
    zodiacMissGrid.innerHTML = missHtml;
  }

  // 精选特码
  Business.renderZodiacFinalNums(data);
};

/**
 * 渲染生肖精选号码
 * @param {Object} data - 分析数据
 */
Business.renderZodiacFinalNums = (data) => {
  const state = StateManager._state;
  const zodiacFinalNum = document.getElementById('zodiacFinalNum');
  
  if(!data || !data.sortedZodiacs || data.sortedZodiacs.length === 0) {
    if(zodiacFinalNum) {
      zodiacFinalNum.innerHTML = '✅ 精选特码：暂无数据';
      zodiacFinalNum.classList.remove('final-recommend-z-balls');
    }
    return;
  }
  
  // 建立完整的号码-生肖映射
  const fullNumZodiacMap = new Map();
  for(let num = 1; num <= 49; num++) {
    const zod = DataQuery._getZodiacByNum(num);
    if(zod) fullNumZodiacMap.set(num, zod);
  }

  // 锁定核心生肖池：使用生肖预测高分的前4个生肖
  const coreZodiacs = data.sortedZodiacs 
    ? data.sortedZodiacs.slice(0, 4).map(i => i[0])
    : data.topZod.slice(0, 2).map(i => i[0]);

  // 锁定热门尾数TOP3
  const hotTails = data.topTail.slice(0, 3).map(i => i.t);

  // 筛选候选号码
  const candidateNums = [];
  for(let num = 1; num <= 49; num++) {
    const zod = fullNumZodiacMap.get(num);
    const tail = num % 10;
    if(coreZodiacs.includes(zod) && hotTails.includes(tail)) {
      const miss = data.zodMiss[zod] || 0;
      const count = data.zodCount[zod] || 0;
      // 获取生肖预测分数作为额外权重
      const zodScore = data.zodiacScores && data.zodiacScores[zod] ? data.zodiacScores[zod] : 0;
      candidateNums.push({
        num, 
        weight: count * 10 + (10 - miss) + zodScore * 2
      });
    }
  }

  // 按权重排序，取目标数量
  const targetCount = state.analysis.selectedNumCount;
  candidateNums.sort((a, b) => b.weight - a.weight);
  let finalNums = candidateNums.slice(0, targetCount).map(i => i.num);

  // 兜底机制
  if(finalNums.length < targetCount) {
    const fillNums = [...new Set(data.list.map(item => Business.getSpecial(item).te))]
      .filter(num => !finalNums.includes(num))
      .slice(0, targetCount - finalNums.length);
    finalNums.push(...fillNums);
  }

  // 排序
  finalNums.sort((a, b) => a - b);

  // 获取号码的颜色
  const getNumColor = (num) => {
    if(CONFIG.COLOR_MAP['红'].includes(num)) return 'red';
    if(CONFIG.COLOR_MAP['蓝'].includes(num)) return 'blue';
    if(CONFIG.COLOR_MAP['绿'].includes(num)) return 'green';
    return 'red';
  };

  // 获取号码的五行
  const getNumElement = (num) => {
    if(CONFIG.ELEMENT_MAP['金'].includes(num)) return '金';
    if(CONFIG.ELEMENT_MAP['木'].includes(num)) return '木';
    if(CONFIG.ELEMENT_MAP['水'].includes(num)) return '水';
    if(CONFIG.ELEMENT_MAP['火'].includes(num)) return '火';
    if(CONFIG.ELEMENT_MAP['土'].includes(num)) return '土';
    return '';
  };

  // 渲染成带颜色、生肖和五行的球号
  let ballHtml = '<div class="ball-group">';
  finalNums.forEach(num => {
    const color = getNumColor(num);
    const zodiac = fullNumZodiacMap.get(num) || '';
    const element = getNumElement(num);
    const numStr = String(num).padStart(2, '0');
    const zodiacText = element ? `${zodiac}/${element}` : zodiac;
    ballHtml += `
      <div class="ball-item">
        <div class="ball ${color}">${numStr}</div>
        <div class="ball-zodiac">${zodiacText}</div>
      </div>
    `;
  });
  ballHtml += '</div>';

  const zodiacFinalNumContent = document.getElementById('zodiacFinalNumContent');
  if(zodiacFinalNumContent) {
    zodiacFinalNumContent.innerHTML = ballHtml;
    zodiacFinalNumContent.classList.add('final-recommend-z-balls');
  }
  if(zodiacFinalNum) {
    zodiacFinalNum.classList.add('final-recommend-z-balls');
  }
  
  // 静默保存所有期数和号码数量组合
  Business.silentSaveAllSpecialCombinations();
};

/**
 * 同步全维度分析
 */
Business.syncAnalyze = () => {
  const customNum = document.getElementById('customNum');
  const analyzeSelect = document.getElementById('analyzeSelect');
  const zodiacAnalyzeSelect = document.getElementById('zodiacAnalyzeSelect');
  const zodiacCustomNum = document.getElementById('zodiacCustomNum');
  
  const custom = customNum ? customNum.value.trim() : '';
  const selectVal = analyzeSelect ? analyzeSelect.value : '10';
  const historyData = StateManager._state.analysis.historyData;
  
  const newLimit = custom && !isNaN(custom) && custom > 0
    ? Number(custom)
    : selectVal === 'all' ? historyData.length : Number(selectVal);
  
  // 更新状态
  const newAnalysis = { 
    ...StateManager._state.analysis, 
    analyzeLimit: newLimit 
  };
  StateManager.setState({ analysis: newAnalysis }, false);
  
  // 同步另一个选择器
  if(zodiacAnalyzeSelect) zodiacAnalyzeSelect.value = selectVal;
  if(zodiacCustomNum) zodiacCustomNum.value = custom;
  
  // 重新渲染
  Business.renderFullAnalysis();
  Business.renderZodiacAnalysis();
  
  // 更新冷热号状态
  Business.updateHotColdStatus();
};

/**
 * 同步生肖关联分析
 */
Business.syncZodiacAnalyze = () => {
  const zodiacCustomNum = document.getElementById('zodiacCustomNum');
  const zodiacAnalyzeSelect = document.getElementById('zodiacAnalyzeSelect');
  const numCountSelect = document.getElementById('numCountSelect');
  const customNumCount = document.getElementById('customNumCount');
  const analyzeSelect = document.getElementById('analyzeSelect');
  const customNum = document.getElementById('customNum');
  
  // 期数同步
  const customPeriod = zodiacCustomNum ? zodiacCustomNum.value.trim() : '';
  const selectPeriodVal = zodiacAnalyzeSelect ? zodiacAnalyzeSelect.value : '10';
  const historyData = StateManager._state.analysis.historyData;
  
  const newLimit = customPeriod && !isNaN(customPeriod) && customPeriod > 0
    ? Number(customPeriod)
    : selectPeriodVal === 'all' ? historyData.length : Number(selectPeriodVal);
  
  // 号码数量同步
  const countVal = numCountSelect ? numCountSelect.value : '5';
  const customCount = customNumCount ? customNumCount.value.trim() : '';
  let finalCount = 5;
  
  if(countVal === 'custom') {
    finalCount = customCount && !isNaN(customCount) && Number(customCount) >= 1 && Number(customCount) <= 49
      ? Number(customCount)
      : 5;
  } else {
    finalCount = Number(countVal);
  }
  
  // 更新状态
  const newAnalysis = { 
    ...StateManager._state.analysis, 
    analyzeLimit: newLimit,
    selectedNumCount: finalCount
  };
  StateManager.setState({ analysis: newAnalysis }, false);
  
  // 同步另一个选择器
  if(analyzeSelect) analyzeSelect.value = selectPeriodVal;
  if(customNum) customNum.value = customPeriod;
  
  // 重新渲染
  Business.renderFullAnalysis();
  Business.renderZodiacAnalysis();
  
  // 更新冷热号状态
  Business.updateHotColdStatus();
};

/**
 * 切换详情显示
 * @param {string} targetId - 目标元素ID
 */
Business.toggleDetail = (targetId) => {
  const el = document.getElementById(targetId);
  if(!el) return;
  
  const isVisible = el.style.display === 'block';
  el.style.display = isVisible ? 'none' : 'block';
  
  // 更新按钮文字
  const btn = el.previousElementSibling ? el.previousElementSibling.querySelector('.toggle-btn') : null;
  if(btn) btn.textContent = isVisible ? '展开详情' : '收起详情';
};

/**
 * 切换分析标签页
 * @param {string} tab - 标签名
 */
Business.switchAnalysisTab = (tab) => {
  // 更新按钮状态
  document.querySelectorAll('.analysis-tab-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.analysisTab === tab);
  });
  
  // 更新面板显示
  const panels = {
    'history': 'historyPanel',
    'analysis': 'analysisPanelContent',
    'zodiac': 'zodiacAnalysisPanel'
  };
  
  Object.entries(panels).forEach(([key, id]) => {
    const panel = document.getElementById(id);
    if(panel) panel.classList.toggle('active', key === tab);
  });
  
  // 更新状态
  const newAnalysis = { 
    ...StateManager._state.analysis, 
    currentTab: tab 
  };
  StateManager.setState({ analysis: newAnalysis }, false);
  
  // 特定标签页渲染
  if(tab === 'analysis') Business.renderFullAnalysis();
  if(tab === 'zodiac') Business.renderZodiacAnalysis();
};

/**
 * 加载更多历史
 */
Business.loadMoreHistory = () => {
  const state = StateManager._state;
  const newShowCount = state.analysis.showCount + 30;
  
  const newAnalysis = { 
    ...state.analysis, 
    showCount: newShowCount 
  };
  StateManager.setState({ analysis: newAnalysis }, false);
  
  Business.renderHistory();
  
  const loadMore = document.getElementById('loadMore');
  if(loadMore && newShowCount >= state.analysis.historyData.length) {
    loadMore.style.display = 'none';
  }
};

/**
 * 开始倒计时
 */
Business.startCountdown = () => {
  setInterval(() => {
    const now = new Date();
    const target = new Date();
    target.setHours(21, 32, 32, 0);
    if(now > target) target.setDate(target.getDate() + 1);
    const diff = target - now;
    const h = String(Math.floor(diff / 3600000)).padStart(2, '0');
    const m = String(Math.floor((diff % 3600000) / 60000)).padStart(2, '0');
    const s = String(Math.floor((diff % 60000) / 1000)).padStart(2, '0');
    
    const countdown = document.getElementById('countdown');
    if(countdown) countdown.innerText = `${h}:${m}:${s}`;
  }, 1000);
};

/**
 * 检查是否在开奖时间
 * @returns {boolean} 是否在开奖时间
 */
Business.isInDrawTime = () => {
  const now = new Date();
  const h = now.getHours();
  const m = now.getMinutes();
  return h === 21