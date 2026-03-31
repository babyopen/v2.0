// ====================== 6. DOM缓存模块（所有常用DOM提前缓存，避免重复查询）======================
/**
 * DOM元素缓存
 * @namespace DOM
 */
const DOM = {
  // 加载遮罩
  loadingMask: document.getElementById('loadingMask'),
  // 结果展示
  resultCount: document.getElementById('resultCount'),
  resultNums: document.getElementById('resultNums'),
  // 排除号码
  excludeCount: document.getElementById('excludeCount'),
  excludeGrid: document.getElementById('excludeGrid'),
  lockExclude: document.getElementById('lockExclude'),
  // 方案列表
  filterList: document.getElementById('filterList'),
  // 生肖标签
  zodiacTags: document.getElementById('zodiacTags'),
  // 快捷导航
  quickNavBtn: document.getElementById('quickNavBtn'),
  quickNavMenu: document.getElementById('quickNavMenu'),
  navTabs: document.getElementById('navTabs'),
  // 返回顶部
  backTopBtn: document.getElementById('backTopBtn')
};
