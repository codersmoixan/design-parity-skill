/**
 * Report UI locale for report.html.
 * zh → Chinese chrome; everything else → English.
 * Finding titles, evidence copy, and agent paste blocks stay as stored in the report
 * (with --locale zh the agent should author Chinese titles when writing findings.json).
 */

/** Han / CJK Unified Ideographs (and compatibility) — used to detect a Chinese user query. */
const CJK_RE = /[\u3400-\u4DBF\u4E00-\u9FFF\uF900-\uFAFF]/;

export function looksLikeChinese(text) {
  return typeof text === 'string' && CJK_RE.test(text);
}

/** Normalize CLI / pass values: only `zh` (and aliases) become Chinese; else English. */
export function normalizeLocale(raw) {
  const s = String(raw ?? '')
    .trim()
    .toLowerCase()
    .replace(/_/g, '-');
  if (!s) return 'en';
  if (s === 'zh' || s === 'zh-cn' || s === 'zh-hans' || s === 'cn' || s.startsWith('zh-')) return 'zh';
  return 'en';
}

/** Detect locale from free text (user query). Chinese → zh; otherwise en. */
export function detectLocaleFromText(text) {
  return looksLikeChinese(text) ? 'zh' : 'en';
}

export const REPORT_TITLE_PREFIX = Object.freeze({
  en: 'Design QA',
  zh: '设计质量核对',
});

/**
 * English UI string → Chinese. Keys must match exact chrome strings in templates/report.html
 * (append/t() look up by exact English). Prefer whole phrases over short ambiguous words.
 */
export const ZH_UI = Object.freeze({
  // Tabs
  Overview: '概览',
  Findings: '问题',
  'Design system': '设计系统',
  States: '状态',
  Decisions: '决定',
  Evidence: '证据',
  'Design backfill': '设计回填',

  // Header / chrome
  'Review and send': '复核并发送',
  'Review and send your decisions': '复核并发送你的决定',
  Review: '复核',
  Send: '发送',
  Close: '关闭',
  Cancel: '取消',
  Undo: '撤销',
  Copy: '复制',
  Details: '详情',
  Print: '打印',
  Search: '搜索',
  Filter: '筛选',
  Filters: '筛选',
  Clear: '清除',
  Reset: '重置',
  Apply: '应用',
  Save: '保存',
  Delete: '删除',
  Dismiss: '忽略',
  Open: '打开',
  Show: '显示',
  Hide: '隐藏',
  Back: '返回',
  Next: '下一步',
  Previous: '上一步',
  Done: '完成',
  Loading: '加载中',
  Empty: '空',
  Error: '错误',
  Hover: '悬停',
  Focus: '聚焦',

  // Lanes / triage
  'Fix now': '立即修复',
  Debt: '技术债',
  'Your agents get these': '这些会交给你的代理处理',
  'Not an issue': '不是问题',
  'Show on capture': '在截图上显示',
  'Show in capture': '在截图中显示',
  'Toggle columns': '切换列',
  'Run details': '运行详情',
  'Not needed': '不需要',
  'Not sent yet': '尚未发送',
  'not recorded': '未记录',
  'Not recorded yet': '尚未记录',

  // Page head / summary fragments
  'Verdict:': '判定：',
  Verdict: '判定',
  Match: '匹配',
  Figma: 'Figma',
  Prototype: '原型',
  'Figma prototype': 'Figma 原型',
  App: '应用',
  Ticket: '工单',
  screen: '屏',
  screens: '屏',
  finding: '条问题',
  findings: '条问题',
  'findings settled': '条问题已处理',
  'finding settled': '条问题已处理',
  'findings without a pin': '条问题未钉点',
  'finding without a pin': '条问题未钉点',
  dismissed: '已忽略',
  unexplained: '未解释',
  'worst pixel diff': '最大像素差',
  'not audited': '未审计',
  'no mismatches': '无不一致',
  'token not checked': 'token 未检查',
  'component not checked': '组件未检查',
  'motion not checked': '动效未检查',
  token: '个 token',
  tokens: '个 token',
  component: '个组件',
  components: '个组件',
  motion: '个动效',
  'rejected by the agent': '被代理拒绝',
  partial: '部分覆盖',
  'nothing compared': '未对照',
  'Loop closed · ': '闭环完成 · ',
  ' fixed · ': ' 已修复 · ',
  ' tracked as debt': ' 记为技术债',
  ' of ': ' / ',

  // Alerts
  'Incomplete: this is not a result': '未完成：这不是有效结果',
  'Partial coverage:': '部分覆盖：',
  'Not built by build-report.mjs': '并非由 build-report.mjs 构建',
  'Large regions were rejected by the agent': '大片区域被代理拒绝',
  'Show what was rejected': '显示被拒绝的区域',
  'See the States tab.': '见「状态」页签。',

  // Findings / states tables
  State: '状态',
  Designed: '设计稿',
  Specified: '已指定',
  Implemented: '已实现',
  Captured: '已截取',
  Result: '结果',
  Action: '操作',
  Tests: '测试',
  'Pixel diff after': '修复后像素差',
  Severity: '严重程度',
  Resolution: '处理',
  Rank: '排序',
  Title: '标题',
  Note: '备注',
  Reason: '原因',
  When: '何时',
  Where: '何处',
  Who: '谁',
  Source: '来源',
  Target: '目标',
  Triage: '分流',
  Annotations: '批注',
  Annotation: '批注',
  Pin: '钉点',
  Pins: '钉点',
  Crop: '裁剪',
  Diff: '差异',
  Design: '设计',
  Capture: '截图',
  Compare: '对照',
  Audit: '审计',
  Worklist: '工作清单',
  Tokens: 'Tokens',
  Components: '组件',
  Motion: '动效',
  'Token mismatches': 'Token 不一致',
  'Component mismatches': '组件不一致',
  'not checked': '未检查',
  'No fix-loop iterations (audit mode).': '无修复循环迭代（审计模式）。',
  'Every state the design defines, checked against the build. Select one to show it in the capture.':
    '设计稿定义的每个状态，均已与实现对照。选中一项可在截图中查看。',
  'Every check that produced a result. Select a row for details and evidence; dismiss what is not an issue.':
    '每项有结果的检查。选中一行查看详情与证据；不是问题的可忽略。',
  'Choose Fix now or Debt on each card; the rest of the app follows. Dismiss what is not an issue.':
    '在每张卡片上选择「立即修复」或「技术债」；其余界面会随之更新。不是问题的可忽略。',
  'Changed in this browser: use Review and send to pass it to your agent.':
    '已在本浏览器中更改：用「复核并发送」交给你的代理。',
  'Recommended from the ranking. ': '按排序推荐。',
  ' to fix now · ': ' 立即修复 · ',
  ' to debt': ' 记为技术债',
  'row(s)': '行',
  'No severities selected. Turn a chip on to show annotations.': '未选择严重程度。打开一个标签以显示批注。',
  'No annotations match the selected severities.': '没有与所选严重程度匹配的批注。',
  'a blocker is always fixed now.': '阻断项一律立即修复。',
  'Dismissed in this browser; Review and send passes it to your agent':
    '已在本浏览器中忽略；「复核并发送」会交给你的代理',
  'Decided in this browser; Review and send passes it to your agent':
    '已在本浏览器中决定；「复核并发送」会交给你的代理',
  'Open the design (source of truth)': '打开设计稿（唯一标准）',
  ' saved': ' 已保存',
  ' added: Review and send passes it to your agent': ' 已添加：「复核并发送」会交给你的代理',
  ' (this session only: browser storage is unavailable)': '（仅本会话：浏览器存储不可用）',
  'Decided by ': '决定人 ',
  ' on ': ' 于 ',

  // Severity / resolution labels commonly shown as chrome
  BLOCKER: '阻断',
  WARNING: '警告',
  INFO: '信息',
  PASS: '通过',
  FAIL: '失败',
  REVIEW: '待复核',
  INCOMPLETE: '未完成',
  FIX_CODE: '改代码',
  INTENTIONAL: '有意保留',
  DATA: '数据差异',
  DISMISSED: '已忽略',
  UNCLASSIFIED: '待决定',
  CANNOT_VERIFY: '无法核实',
  MISSING_IN_CODE: '代码缺失',
  NOT_SPECIFIED: '未指定',

  // Theme / misc
  Light: '浅色',
  Dark: '深色',
  System: '跟随系统',
  'Live review': '实时复核',
  'Copy for agent': '复制给代理',
  'Paste for a coding agent': '粘贴给编码代理',
  'Paste for a design agent': '粘贴给设计代理',
});

/** Strings map for the given locale (empty object for English — template defaults are EN). */
export function reportI18n(locale) {
  return normalizeLocale(locale) === 'zh' ? { ...ZH_UI } : {};
}

/** Context fields injected into design-qa-context for the HTML template. */
export function reportLocaleContext(locale) {
  const loc = normalizeLocale(locale);
  return {
    locale: loc,
    i18n: reportI18n(loc),
  };
}

/** Set <html lang> for the filled report. */
export function applyHtmlLang(html, locale) {
  const loc = normalizeLocale(locale);
  const lang = loc === 'zh' ? 'zh-CN' : 'en';
  return String(html).replace(/<html\b([^>]*)\blang="[^"]*"/i, `<html$1lang="${lang}"`);
}

export function reportDocumentTitle(feature, locale) {
  const prefix = REPORT_TITLE_PREFIX[normalizeLocale(locale)] || REPORT_TITLE_PREFIX.en;
  const name = feature == null || feature === '' ? 'report' : String(feature);
  return `${prefix} — ${name}`;
}
