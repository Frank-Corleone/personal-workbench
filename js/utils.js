/* =========================================================
   工具函数：日期 / 安全 / 关键词提取 / 通用
   ========================================================= */
'use strict';

/* ---------- 凭据混淆（纯前端门禁，防直接明文查看，非加密） ---------- */
const OBF_KEY = 'Pwb2026!Workbench';
function obf(str) {
  const s = unescape(encodeURIComponent(String(str)));
  let o = '';
  for (let i = 0; i < s.length; i++) o += String.fromCharCode(s.charCodeAt(i) ^ OBF_KEY.charCodeAt(i % OBF_KEY.length));
  return btoa(o);
}
function deobf(b64) {
  try {
    const s = atob(b64);
    let o = '';
    for (let i = 0; i < s.length; i++) o += String.fromCharCode(s.charCodeAt(i) ^ OBF_KEY.charCodeAt(i % OBF_KEY.length));
    return decodeURIComponent(escape(o));
  } catch (e) { return ''; }
}

/* ---------- 基础 ---------- */
function el(id) { return document.getElementById(id); }
function uid() { return 'i' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7); }
function esc(s) {
  return String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}
function nowIso() {
  const d = new Date(), p = n => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`;
}
function deepClone(o) { return JSON.parse(JSON.stringify(o)); }

/* ---------- 日期 ---------- */
function dateKey(d) {
  const p = n => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}
function dateFromKey(k) { const [y, m, d] = k.split('-').map(Number); return new Date(y, m - 1, d); }
function todayKey() { return dateKey(new Date()); }
function addDays(d, n) { const x = new Date(d); x.setDate(x.getDate() + n); return x; }
function isWeekendDate(d) { const w = d.getDay(); return w === 0 || w === 6; }
function isWeekendKey(k) { return isWeekendDate(dateFromKey(k)); }
/* 一周定义为 周六 → 周五（与"每周末梳理上周六至周五"的习惯一致） */
function weekStartKey(d) {
  const diff = (d.getDay() - 6 + 7) % 7;
  return dateKey(addDays(d, -diff));
}
function monthKey(d) {
  const p = n => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}`;
}
function periodKey(freq, dateKeyStr) {
  const d = dateFromKey(dateKeyStr);
  if (freq === 'daily') return dateKeyStr;
  if (freq === 'weekly') return weekStartKey(d);
  if (freq === 'monthly') return monthKey(d);
  return dateKeyStr;
}
const WD_CN = ['日', '一', '二', '三', '四', '五', '六'];
function fmtCNDate(k) {
  const d = dateFromKey(k);
  return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日 星期${WD_CN[d.getDay()]}`;
}
function fmtShort(k) { const d = dateFromKey(k); return `${d.getMonth() + 1}/${d.getDate()}`; }
function daysUntil(key) { // 正=还剩天数，0=今天，负=已过
  if (!key) return null;
  const t = new Date(); t.setHours(0, 0, 0, 0);
  return Math.round((dateFromKey(key) - t) / 86400000);
}

/* ---------- 中文关键词提取（内置词库 + 高频二字组合，轻量方案） ---------- */
const KW_STOPCHAR = new Set('的一是了在不有我你他她它这那就都也很更最又再才只还把被让给从向于对与及或但和以及个们中上下来去出到时要会能可将已没天地大小多少好 ()（）|｜、，。：；！？《》【】0-9０-９'.split('').filter(c => c.trim()));
const KW_VOCAB = [
  '健康', '体检', '尿酸', '痛风', '体重', '减肥', '运动', '锻炼', '有氧', '无氧', '爬坡', '拉伸', '松解', '睡眠', '午休', '熬夜', '颈椎', '腰椎',
  '情绪', '焦虑', '内耗', '执着', '复盘', '反思', '随记', '总结', '计划', '目标', '待办', '截止', '逾期', '优先', '轻重缓急',
  '写材料', '材料', '公文', '信息', '汇报', '沟通', '协调', '领导', '审核', '复核', '金句', '仿写', '拆解', '词汇', '句式', '论证', '立意',
  '招商', '走访', '企业', '报表', '台账', '督查', '住建', '房地产', '行政许可', '政务服务', '入库', '统报',
  'AI', '3D打印', 'Blender', '建模', '切片', '耗材', '打印', '编程', 'API', 'DeepSeek', '豆包', 'workbuddy', '爬虫', '自动化',
  '宏观', '经济', 'GDP', 'CPI', '利率', '汇率', '投资', '股票', '行情', '仓位', '基金', '统计',
  '矛盾论', '实践论', '金刚经', '哲学', '辩证', '系统', '逻辑', '思维', '决策', '批判', '演绎', '知识迁移', '记忆',
  '阅读', '读书', '论文', '模型', '英语', '学习', '培训', '考试', '入党', '作息', '喝水', '饮食', '零食', '戒酒', '手机', '多巴胺', '番茄钟', '周报'
];
const KW_LATIN_STOP = new Set(['the', 'a', 'an', 'and', 'of', 'to', 'is', 'are', 'it', 'in', 'on', 'for', 'at', 'pm', 'am']);
function extractKeywords(text, max = 6) {
  const t = String(text || '');
  if (!t.trim()) return [];
  const out = [];
  const push = w => { if (w && !out.includes(w)) out.push(w); };

  /* 1. 内置词库命中（长词优先） */
  const vocab = [...KW_VOCAB].sort((a, b) => b.length - a.length);
  const hitLow = t.toLowerCase();
  for (const w of vocab) {
    if (out.length >= 3) break;
    if (/^[A-Za-z0-9]/.test(w) ? hitLow.includes(w.toLowerCase()) : t.includes(w)) push(w);
  }

  /* 2. 高频二字组合 */
  const runs = t.match(/[\u4e00-\u9fa5]{2,}/g) || [];
  const freq = {};
  for (const run of runs) {
    for (let i = 0; i < run.length - 1; i++) {
      const bg = run.slice(i, i + 2);
      if (KW_STOPCHAR.has(bg[0]) || KW_STOPCHAR.has(bg[1])) continue;
      freq[bg] = (freq[bg] || 0) + 1;
    }
  }
  Object.keys(freq).sort((a, b) => freq[b] - freq[a]).forEach(bg => {
    if (out.length >= max) return;
    if (freq[bg] >= 2) push(bg);
  });

  /* 3. 拉丁词 */
  (t.match(/[A-Za-z][A-Za-z0-9+#.\-]{1,15}/g) || []).forEach(w => {
    if (out.length >= max) return;
    if (!KW_LATIN_STOP.has(w.toLowerCase())) push(w);
  });

  /* 4. 兜底：取前几处实义二字组合 */
  Object.keys(freq).sort((a, b) => freq[b] - freq[a]).forEach(bg => { if (out.length < Math.min(3, max)) push(bg); });
  return out.slice(0, max);
}

/* ---------- textarea 自动增高 ---------- */
function autosizeEl(t) {
  if (!t || !t.classList || !t.classList.contains('autosize')) return;
  t.style.height = 'auto';
  t.style.height = Math.min(t.scrollHeight, 400) + 'px';
}
function autosizeAll(root) {
  (root || document).querySelectorAll('textarea.autosize').forEach(autosizeEl);
}

/* ---------- 导出 / 复制 ---------- */
function download(filename, text) {
  const blob = new Blob([text], { type: 'application/json;charset=utf-8' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 500);
}
function copyText(text, tip) {
  const done = () => toast(tip || '已复制到剪贴板');
  if (navigator.clipboard && window.isSecureContext) {
    navigator.clipboard.writeText(text).then(done).catch(() => fallbackCopy(text, done));
  } else fallbackCopy(text, done);
}
function fallbackCopy(text, done) {
  const ta = document.createElement('textarea');
  ta.value = text; ta.style.position = 'fixed'; ta.style.opacity = '0';
  document.body.appendChild(ta); ta.select();
  try { document.execCommand('copy'); done(); } catch (e) { toast('复制失败，请手动选择复制'); }
  ta.remove();
}
