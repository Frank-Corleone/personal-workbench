/* =========================================================
   个人计划执行工作台 · 主逻辑
   数据全部保存在浏览器 localStorage，可在「工具箱」导入/导出
   ========================================================= */
'use strict';

const STORE_KEY = 'pwb_data_v1';
const REMEMBER_KEY = 'pwb_remember';
const SESSION_KEY = 'pwb_session';

const NAV = [
  { id: 'dashboard', icon: '📊', label: '总览' },
  { id: 'analysis',  icon: '🧭', label: '形势分析' },
  { id: 'goals',     icon: '🎯', label: '目标与问题' },
  { id: 'todos',     icon: '✅', label: '事项安排' },
  { id: 'daily',     icon: '📅', label: '每日计划' },
  { id: 'notes',     icon: '📝', label: '随记总结' },
  { id: 'tools',     icon: '🧰', label: '工具箱' }
];
const BLOCKS_WD = [
  { id: 'work',    label: '工作', icon: '💼' },
  { id: 'noon',    label: '中午', icon: '🌤️' },
  { id: 'evening', label: '晚上', icon: '🌙' }
];
const BLOCKS_WE = [{ id: 'day', label: '全天', icon: '☀️' }];
const FREQ_LBL = { daily: '每日', weekly: '每周', monthly: '每月' };
const BLOCK_LBL = { work: '工作', noon: '中午', evening: '晚上', day: '全天' };

/* ---------- 状态 ---------- */
let S = null;
const U = {
  route: 'dashboard', todoTab: 'work', dailyDate: '',
  noteFilter: '', noteSearch: '', searchResults: [],
  openSummaries: new Set(), reportStart: ''
};

/* ---------- 持久化 ---------- */
function save() { S.updatedAt = nowIso(); localStorage.setItem(STORE_KEY, JSON.stringify(S)); }
function saveSoon() { clearTimeout(save._t); save._t = setTimeout(save, 400); }

function load() {
  try {
    const raw = localStorage.getItem(STORE_KEY);
    if (raw) return migrate(JSON.parse(raw));
  } catch (e) {}
  return firstRunData();
}
function firstRunData() {
  const d = deepClone(SEED);
  d.plans[todayKey()] = {
    items: [
      { id: uid(), block: 'day', text: '熟悉工作台：逛一逛各个页面，把内容改成自己的', done: true, summary: '' },
      { id: uid(), block: 'day', text: '把本周要办的事过一遍，更新事项安排里的截止时间', done: false, summary: '' },
      { id: uid(), block: 'day', text: '阅读《宏观经济学二十五讲》一讲，写一条随记', done: false, summary: '' }
    ],
    summary: ''
  };
  return migrate(d);
}
function migrate(d) {
  if (!d.plans) d.plans = {};
  if (!d.notes) d.notes = [];
  if (!d.settings) d.settings = { theme: 'light', auth: { u: 'Frank', p: 'Stzj123', o: 0 } };
  if (d.settings.auth && !d.settings.auth.o) d.settings.auth = { u: obf(d.settings.auth.u), p: obf(d.settings.auth.p), o: 1 };
  return d;
}

/* ---------- 登录（纯前端门禁） ---------- */
function isAuthed() { return localStorage.getItem(REMEMBER_KEY) === '1' || sessionStorage.getItem(SESSION_KEY) === '1'; }
function showLogin() { el('login-screen').classList.remove('hidden'); el('app').classList.add('hidden'); }
function enterApp() {
  el('login-screen').classList.add('hidden');
  el('app').classList.remove('hidden');
  const r = (location.hash || '').replace(/^#\//, '');
  U.route = ROUTES[r] ? r : 'dashboard';
  U.reportStart = weekStartKey(new Date());
  if (!U.dailyDate) U.dailyDate = todayKey();
  render();
  startClock();
}
function doLogout() { sessionStorage.removeItem(SESSION_KEY); localStorage.removeItem(REMEMBER_KEY); location.reload(); }

/* ---------- 查找 ---------- */
function findGroup(gid) { for (const s of S.todos.sections) for (const g of s.groups) if (g.id === gid) return g; return null; }
function findGoal(gid) { return S.goals.find(g => g.id === gid) || null; }
function findNote(nid) { return S.notes.find(n => n.id === nid) || null; }
function findItem(id) {
  for (const sec of S.todos.sections) for (const g of sec.groups) {
    for (const it of g.items) {
      if (it.id === id) return { group: g, item: it };
      if (it.children) { const c = it.children.find(c => c.id === id); if (c) return { group: g, item: c, parent: it }; }
    }
  }
  for (const g of S.goals) { const d = (g.details || []).find(d => d.id === id); if (d) return { goal: g, item: d }; }
  return null;
}
function findPlanItem(pid) {
  for (const k in S.plans) {
    const p = S.plans[k], it = p.items.find(i => i.id === pid);
    if (it) return { date: k, plan: p, item: it };
  }
  return null;
}
function findAnaGroup(gid) { for (const s of S.analysis) for (const g of s.groups) if (g.id === gid) return g; return null; }
function findAnaItem(iid) {
  for (const s of S.analysis) for (const g of s.groups) for (const i of g.items) if (i.id === iid) return { sec: s, group: g, item: i };
  return null;
}

/* ---------- 完成状态（例行事务按周期自动重置） ---------- */
function itemDone(it) {
  if (it.freq) return !!(it.doneMap && it.doneMap[periodKey(it.freq, todayKey())]);
  return !!it.done;
}
function toggleItem(it) {
  if (it.freq) {
    const pk = periodKey(it.freq, todayKey());
    it.doneMap = it.doneMap || {};
    if (it.doneMap[pk]) delete it.doneMap[pk]; else it.doneMap[pk] = true;
  } else {
    it.done = !it.done;
    it.doneAt = it.done ? nowIso() : null;
  }
}
function groupKind(g) {
  if (/-tasks$/.test(g.id)) return 'task';
  if (/-skills$/.test(g.id)) return 'skill';
  if (/-books$/.test(g.id)) return 'book';
  return 'routine';
}
function allTodoItems() { const a = []; S.todos.sections.forEach(s => s.groups.forEach(g => g.items.forEach(i => a.push({ sec: s, group: g, item: i })))); return a; }
function taskItems() { return allTodoItems().filter(x => x.item.deadline); }
function dailyRoutineItems() { return allTodoItems().filter(x => x.item.freq === 'daily').map(x => x.item); }
function weekRoutineItems() { return allTodoItems().filter(x => x.item.freq === 'weekly').map(x => x.item); }
function getOverdueTasks() {
  return taskItems().filter(x => !itemDone(x.item) && daysUntil(x.item.deadline) < 0)
    .sort((a, b) => a.item.deadline.localeCompare(b.item.deadline));
}
function getDueSoonTasks() {
  return taskItems().filter(x => { const n = daysUntil(x.item.deadline); return !itemDone(x.item) && n >= 0 && n <= 7; })
    .sort((a, b) => a.item.deadline.localeCompare(b.item.deadline));
}
function countItems() { let n = 0; S.todos.sections.forEach(s => s.groups.forEach(g => g.items.forEach(i => n += 1 + (i.children ? i.children.length : 0)))); return n; }

/* ---------- 渲染 ---------- */
const ROUTES = {};
function render() {
  const view = el('view');
  const st = view.scrollTop;
  renderNav();
  const nav = NAV.find(n => n.id === U.route);
  el('route-title').textContent = nav ? nav.label : '';
  view.innerHTML = (ROUTES[U.route] || ROUTES.dashboard)();
  autosizeAll(view);
  view.scrollTop = st;
}
function setRoute(r) {
  U.route = r;
  if ('#/' + r !== location.hash) location.hash = '#/' + r;
  render();
  el('view').scrollTop = 0;
}
function renderNav() {
  const over = getOverdueTasks().length;
  const plan = S.plans[todayKey()];
  const pend = plan ? plan.items.filter(i => !i.done).length : 0;
  el('nav').innerHTML = NAV.map(n => {
    let badge = '';
    if (n.id === 'todos' && over) badge = `<i class="nav-badge">${over}</i>`;
    if (n.id === 'daily' && pend) badge = `<i class="nav-badge" style="background:var(--warn)">${pend}</i>`;
    return `<button class="nav-item ${U.route === n.id ? 'active' : ''}" data-act="nav" data-route="${n.id}"><span>${n.icon}</span>${n.label}${badge}</button>`;
  }).join('');
}
function applyTheme(t) {
  document.documentElement.dataset.theme = t;
  const b = el('theme-btn');
  if (b) b.textContent = t === 'dark' ? '☀️' : '🌙';
}

/* ---------- 小部件 ---------- */
function starWidget(obj) {
  const s = obj.stars || 0;
  return `<span class="stars">${[1, 2, 3, 4, 5].map(n =>
    `<span class="star ${n <= s ? 'on' : ''}" data-act="star" data-id="${obj.id}" data-val="${n}">${n <= s ? '★' : '☆'}</span>`).join('')}</span>`;
}
function deadlineBadge(dl) {
  if (!dl) return '';
  const n = daysUntil(dl);
  if (n < 0) return `<span class="badge b-over">逾期${-n}天</span>`;
  if (n === 0) return `<span class="badge b-soon">今天到期</span>`;
  if (n <= 3) return `<span class="badge b-soon">还剩${n}天</span>`;
  return `<span class="badge b-dim">${dl.slice(5)} 到期</span>`;
}
function freqSelect(it) {
  return `<select class="mini-select" data-field="itemFreq" data-id="${it.id}">${['daily', 'weekly', 'monthly'].map(f =>
    `<option value="${f}" ${it.freq === f ? 'selected' : ''}>${FREQ_LBL[f]}</option>`).join('')}</select>`;
}
function itemMeta(it, kind) {
  if (kind === 'child') return '';
  const parts = [];
  if (kind === 'task') parts.push(`<input type="date" class="mini-date" data-field="itemDeadline" data-id="${it.id}" value="${esc(it.deadline || '')}">`, deadlineBadge(it.deadline));
  if (kind === 'routine') parts.push(freqSelect(it));
  if (kind !== 'book') parts.push(starWidget(it));
  const open = U.openSummaries.has(it.id);
  parts.push(`<button class="icon-btn sm ${it.summary || open ? 'on' : ''}" data-act="toggle-summary" data-id="${it.id}" title="执行总结">📝</button>`);
  return parts.filter(Boolean).join('');
}
function itemRow(it, g, opts = {}) {
  const kind = opts.kind || groupKind(g);
  const done = itemDone(it);
  const open = U.openSummaries.has(it.id);
  const ops = opts.noDrag
    ? `<div class="item-ops"><button class="icon-btn danger" data-act="del-item" data-id="${it.id}" title="删除">✕</button></div>`
    : `<div class="item-ops">
        <button class="icon-btn" data-act="up-item" data-id="${it.id}" title="上移">↑</button>
        <button class="icon-btn" data-act="down-item" data-id="${it.id}" title="下移">↓</button>
        <button class="icon-btn danger" data-act="del-item" data-id="${it.id}" title="删除">✕</button>
      </div>`;
  return `
  <div class="item ${done ? 'is-done' : ''}">
    <input type="checkbox" class="chk" data-act="toggle-item" data-id="${it.id}" ${done ? 'checked' : ''}>
    <div class="item-main">
      <textarea class="autosize item-text" rows="1" data-field="itemText" data-id="${it.id}" placeholder="输入内容…">${esc(it.text)}</textarea>
      <div class="item-meta">${itemMeta(it, kind)}</div>
      ${open ? `<textarea class="autosize item-summary" rows="2" data-field="itemSummary" data-id="${it.id}" placeholder="执行总结：进展如何？有何经验教训？">${esc(it.summary || '')}</textarea>`
        : (it.summary ? `<div class="summary-preview">${esc(it.summary)}</div>` : '')}
      ${(kind === 'skill' && it.children && it.children.length) ? it.children.map(c => itemRow(c, g, { kind: 'child', noDrag: true })).join('') : ''}
      ${kind === 'skill' ? `<div style="padding:2px 10px 2px 30px"><input class="add-input" data-add-child="${it.id}" placeholder="＋ 添加子项，回车确认"></div>` : ''}
    </div>
    ${ops}
  </div>`;
}
function planRow(it, dk) {
  const open = U.openSummaries.has('p' + it.id);
  return `
  <div class="item ${it.done ? 'is-done' : ''}">
    <input type="checkbox" class="chk" data-act="toggle-plan" data-id="${it.id}" data-date="${dk}" ${it.done ? 'checked' : ''}>
    <div class="item-main">
      <textarea class="autosize item-text" rows="1" data-field="planText" data-id="${it.id}">${esc(it.text)}</textarea>
      ${open ? `<textarea class="autosize item-summary" rows="2" data-field="planSummary" data-id="${it.id}" placeholder="完成情况小结…">${esc(it.summary || '')}</textarea>`
        : (it.summary ? `<div class="summary-preview">${esc(it.summary)}</div>` : '')}
    </div>
    <div class="item-ops">
      <button class="icon-btn ${it.summary || open ? 'on' : ''}" data-act="toggle-summary" data-id="p${it.id}" title="小结">📝</button>
      <button class="icon-btn danger" data-act="del-plan" data-id="${it.id}" title="删除">✕</button>
    </div>
  </div>`;
}

/* =========================================================
   一、总览
   ========================================================= */
function renderDashboard() {
  const tk = todayKey();
  const h = new Date().getHours();
  const greet = h < 6 ? '夜深了，注意休息' : h < 12 ? '早上好' : h < 14 ? '中午好' : h < 18 ? '下午好' : '晚上好';
  const plan = S.plans[tk];
  const planItems = plan ? plan.items : [];
  const planDone = planItems.filter(i => i.done).length;
  const daily = dailyRoutineItems();
  const dailyDone = daily.filter(itemDone).length;
  const weekly = weekRoutineItems();
  const weeklyDone = weekly.filter(itemDone).length;
  const overdue = getOverdueTasks();
  const dueSoon = getDueSoonTasks();
  const quotes = ['身体是 1，其他都是 0。', '让领导做选择题，而不是主观题。', '完成比完美重要，复盘比完成更重要。', '管住嘴、迈开腿、睡好觉。', '先处理心情，再处理事情。', '把事情做对，更要做对的事情。', '今天最重要的三件事是什么？', '重要的事情不紧急，紧急的事情要想清楚。'];
  const quote = quotes[dateFromKey(tk).getDate() % quotes.length];
  const last7 = [...Array(7)].map((_, i) => {
    const d = addDays(new Date(), i - 6), k = dateKey(d), p = S.plans[k];
    const tot = p ? p.items.length : 0, dn = p ? p.items.filter(x => x.done).length : 0;
    return { k, wd: d.getDay(), pct: tot ? Math.round(dn / tot * 100) : 0, has: tot > 0 };
  });
  return `
  <div class="banner">
    <div><div class="hi">${greet}，${esc(deobf(S.settings.auth.u) || '朋友')} 👋</div>
    <div class="date">${fmtCNDate(tk)} · ${isWeekendKey(tk) ? '周末' : '工作日'}</div></div>
    <div class="quote">“${quote}”</div>
  </div>
  <div class="stat-grid">
    <div class="stat primary"><div class="num">${planDone}/${planItems.length}</div><div class="lbl">今日计划</div></div>
    <div class="stat ok"><div class="num">${dailyDone}/${daily.length}</div><div class="lbl">今日例行</div></div>
    <div class="stat warn"><div class="num">${weeklyDone}/${weekly.length}</div><div class="lbl">本周例行（周六起）</div></div>
    <div class="stat ${overdue.length ? 'danger' : ''}"><div class="num">${overdue.length}</div><div class="lbl">逾期任务</div></div>
  </div>
  <div class="grid cols-2">
    <div class="card">
      <div class="card-head"><h3>📋 今日计划</h3><div class="ops"><button class="btn btn-sm" data-act="nav" data-route="daily">去安排 ›</button></div></div>
      ${planItems.length ? `<div class="mini-list">${planItems.map(it => `
        <label class="mini-row ${it.done ? 'is-done' : ''}"><input type="checkbox" class="chk" data-act="toggle-plan" data-id="${it.id}" data-date="${tk}" ${it.done ? 'checked' : ''}><span class="t">${esc(it.text)}</span></label>`).join('')}</div>`
      : '<div class="empty">今天还没有安排，去「每日计划」添加 →</div>'}
    </div>
    <div class="card">
      <div class="card-head"><h3>⏰ 截止提醒</h3><div class="ops"><button class="btn btn-sm" data-act="nav" data-route="todos">全部 ›</button></div></div>
      ${(overdue.length || dueSoon.length) ? `<div class="mini-list">${[...overdue, ...dueSoon].slice(0, 8).map(x => `
        <div class="mini-row"><span class="t">${esc(x.item.text)}</span>${deadlineBadge(x.item.deadline)}</div>`).join('')}</div>`
      : '<div class="empty">✅ 暂无临近截止的任务</div>'}
    </div>
    <div class="card">
      <div class="card-head"><h3>🔁 今日例行</h3><div class="ops"><button class="btn btn-sm" data-act="nav" data-route="todos">管理 ›</button></div></div>
      ${daily.length ? `<div class="mini-list">${daily.map(it => `
        <label class="mini-row ${itemDone(it) ? 'is-done' : ''}"><input type="checkbox" class="chk" data-act="toggle-item" data-id="${it.id}" ${itemDone(it) ? 'checked' : ''}><span class="t">${esc(it.text)}</span></label>`).join('')}</div>`
      : '<div class="empty">暂无每日例行事项</div>'}
    </div>
    <div class="card">
      <div class="card-head"><h3>📈 近 7 天计划完成率</h3></div>
      <div class="bars">${last7.map(d => `
        <div class="bar-col">
          <span class="bar-val">${d.has ? d.pct + '%' : ''}</span>
          <div class="bar-track"><div class="bar-fill ${d.pct ? '' : 'zero'}" style="height:${Math.max(d.pct, 3)}%"></div></div>
          <span class="bar-lbl ${d.k === tk ? 'today' : ''}">${'周' + WD_CN[d.wd]}</span>
        </div>`).join('')}</div>
    </div>
    <div class="card">
      <div class="card-head"><h3>🎯 目标速览</h3><div class="ops"><button class="btn btn-sm" data-act="nav" data-route="goals">管理 ›</button></div></div>
      ${S.goals.map(g => {
        const dt = (g.details || []).length, dd = (g.details || []).filter(x => x.done).length;
        return `<div class="goal-line"><span class="stars" style="flex:none">${[1, 2, 3, 4, 5].map(n => `<span class="star ${n <= g.stars ? 'on' : ''}">${n <= g.stars ? '★' : '☆'}</span>`).join('')}</span><span class="gt">${esc(g.title)}</span>${dt ? `<span class="pct">${dd}/${dt}</span>` : ''}</div>`;
      }).join('')}
    </div>
    <div class="card">
      <div class="card-head"><h3>📝 最近随记</h3><div class="ops"><button class="btn btn-sm" data-act="nav" data-route="notes">全部 ›</button></div></div>
      ${recentNotesHtml() || '<div class="empty">还没有随记，顶部「✏️ 随记」随手记一条</div>'}
    </div>
  </div>`;
}
function recentNotesHtml() {
  const list = [...S.notes].sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 3);
  return list.map(n => `<div class="note-mini"><div class="nt">${esc(n.text)}</div><div class="nk">${(n.keywords || []).slice(0, 4).map(k => `<span>${esc(k)}</span>`).join('')}</div></div>`).join('');
}

/* =========================================================
   二、形势分析
   ========================================================= */
function renderAnalysis() {
  return `
  <div class="page-head"><h2>🧭 形势分析</h2><p>定期审视工作、生活、人际的现状 —— 点击文字直接编辑，➕ 增加条目</p>
    <div class="head-ops"><button class="btn btn-sm" data-act="add-ana-sec">➕ 新增板块</button></div></div>
  ${S.analysis.map(sec => `
    <div class="card">
      <div class="sec-head">
        <span style="font-size:19px">${sec.icon || ''}</span>
        <input class="sec-title" data-field="anaSecTitle" data-id="${sec.id}" value="${esc(sec.title)}">
        <button class="icon-btn" data-act="add-ana-group" data-id="${sec.id}" title="新增分组">➕</button>
        <button class="icon-btn danger" data-act="del-ana-sec" data-id="${sec.id}" title="删除板块">🗑</button>
      </div>
      ${sec.groups.map(g => `
        <div class="group">
          <div class="group-head">
            <input class="group-title" data-field="anaGroupTitle" data-id="${g.id}" value="${esc(g.title || '')}" placeholder="分组标题">
            <button class="icon-btn" data-act="add-ana-item" data-id="${g.id}" title="新增条目">➕</button>
            <button class="icon-btn danger" data-act="del-ana-group" data-id="${g.id}" title="删除分组">🗑</button>
          </div>
          ${g.items.map(it => `
            <div class="ana-item">
              <textarea class="autosize ana-text" rows="1" data-field="anaText" data-id="${it.id}" placeholder="写下你的分析…">${esc(it.text)}</textarea>
              <button class="icon-btn danger" data-act="del-ana-item" data-id="${it.id}">✕</button>
            </div>`).join('')}
        </div>`).join('')}
    </div>`).join('')}`;
}

/* =========================================================
   三、目标与问题清单
   ========================================================= */
function renderGoals() {
  const colors = ['#ef4444', '#f59e0b', '#4f6ef2', '#0ea5a4', '#7c5cf0'];
  return `
  <div class="page-head"><h2>🎯 目标与问题清单</h2><p>点击星星赋予重要性（★ 越多越重要），子项可勾选推进</p>
    <div class="head-ops"><button class="btn btn-primary btn-sm" data-act="add-goal">➕ 新增目标</button></div></div>
  ${S.goals.map(g => {
    const dt = (g.details || []).length, dd = (g.details || []).filter(x => x.done).length;
    const pct = dt ? Math.round(dd / dt * 100) : null;
    return `
    <div class="card goal-card" style="border-left-color:${colors[Math.max(Math.min(g.stars, 5) - 1, 0)] || 'var(--line)'}">
      <div class="goal-head">
        <div class="goal-stars"><span class="slbl">重要度</span>${starWidget(g)}</div>
        <textarea class="autosize goal-title" rows="1" data-field="goalTitle" data-id="${g.id}">${esc(g.title)}</textarea>
        <div class="item-ops" style="opacity:1">
          <button class="icon-btn" data-act="up-goal" data-id="${g.id}" title="上移">↑</button>
          <button class="icon-btn" data-act="down-goal" data-id="${g.id}" title="下移">↓</button>
          <button class="icon-btn danger" data-act="del-goal" data-id="${g.id}" title="删除">✕</button>
        </div>
      </div>
      ${(g.details || []).map(d => `
        <div class="detail-row ${d.done ? 'is-done' : ''}">
          <input type="checkbox" class="chk" data-act="toggle-detail" data-id="${d.id}" ${d.done ? 'checked' : ''}>
          <textarea class="autosize item-text" rows="1" data-field="detailText" data-id="${d.id}">${esc(d.text)}</textarea>
          <button class="icon-btn danger" data-act="del-detail" data-id="${d.id}">✕</button>
        </div>`).join('')}
      <div style="padding:2px 4px 0 30px"><input class="add-input" data-add-detail="${g.id}" placeholder="＋ 添加子目标，回车确认"></div>
      ${dt ? `<div class="progress-wrap"><div class="progress-bar"><div class="fill" style="width:${pct}%"></div></div><span class="pt">${dd}/${dt} · ${pct}%</span></div>` : ''}
    </div>`;
  }).join('')}`;
}

/* =========================================================
   四、事项安排
   ========================================================= */
function renderTodos() {
  const sec = S.todos.sections.find(s => s.id === U.todoTab) || S.todos.sections[0];
  return `
  <div class="page-head"><h2>✅ 事项安排</h2><p>例行事务按 每日 / 每周（周六起算）/ 每月 自动重置勾选；任务可设截止日；📝 可写执行总结</p></div>
  <div class="tabs">${S.todos.sections.map(s =>
    `<button class="tab-btn ${s.id === sec.id ? 'active' : ''}" data-act="todo-tab" data-tab="${s.id}">${esc(s.title)}</button>`).join('')}</div>
  ${sec.groups.map(g => {
    const kind = groupKind(g);
    let body = '';
    if (kind === 'routine') {
      body = g.items.map(i => itemRow(i, g, { kind })).join('') || '<div class="empty">暂无事项</div>';
    } else {
      const act = g.items.filter(i => !itemDone(i)), dn = g.items.filter(i => itemDone(i));
      body = (act.map(i => itemRow(i, g, { kind })).join('') || '<div class="empty">空空如也 🎉</div>')
        + (dn.length ? `<details class="done-fold"><summary>▸ 已完成（${dn.length}）</summary>${dn.map(i => itemRow(i, g, { kind })).join('')}</details>` : '');
    }
    return `
    <div class="card">
      <div class="card-head"><h3>${esc(g.title)}</h3><div class="ops"><span class="plan-count">${g.items.filter(i => itemDone(i)).length}/${g.items.length} 完成</span></div></div>
      ${body}
      <div style="padding:2px 10px"><input class="add-input" data-add="${g.id}" placeholder="＋ 添加新事项，回车确认"></div>
    </div>`;
  }).join('')}`;
}

/* =========================================================
   五、每日计划
   ========================================================= */
function renderDaily() {
  const dk = U.dailyDate || todayKey();
  const we = isWeekendKey(dk);
  const blocks = we ? BLOCKS_WE : BLOCKS_WD;
  const plan = S.plans[dk] || { items: [], summary: '' };
  return `
  <div class="page-head"><h2>📅 每日计划</h2><p>工作日按「工作 / 中午 / 晚上」三个板块安排，周末不分板块；可勾选完成并写小结</p></div>
  <div class="day-nav">
    <button class="btn btn-sm" data-act="day-prev">‹ 前一天</button>
    <input type="date" data-field="dailyDate" value="${dk}">
    <button class="btn btn-sm" data-act="day-next">后一天 ›</button>
    <button class="btn btn-sm" data-act="day-today">今天</button>
    <span class="day-show">${fmtCNDate(dk)}${we ? '（周末）' : ''}</span>
    <span class="spacer"></span>
    <button class="btn btn-sm" data-act="carry-yesterday">⤴ 带入昨日未完成</button>
  </div>
  <div class="grid ${we ? '' : 'cols-3'}">
    ${blocks.map(b => {
      const items = plan.items.filter(i => i.block === b.id);
      const dn = items.filter(i => i.done).length;
      return `
      <div class="card block-card">
        <div class="card-head"><h3><span class="blk-ic">${b.icon}</span> ${b.label}</h3>
          <div class="ops">${items.length ? `<span class="plan-count">${dn}/${items.length} 完成</span>` : ''}</div></div>
        ${items.map(it => planRow(it, dk)).join('') || '<div class="empty">还没有安排</div>'}
        <div style="padding:2px 6px"><input class="add-input" data-add-plan="${b.id}" data-date="${dk}" placeholder="＋ 添加安排，回车确认"></div>
      </div>`;
    }).join('')}
  </div>
  <div class="card" style="margin-top:16px">
    <h3>🌙 每日小结 <span class="hint">睡前回顾：今天做得好的、不足的、明天最重要的三件事</span></h3>
    <textarea class="autosize" rows="4" data-field="dailySummary" data-id="${dk}" placeholder="今天…">${esc(plan.summary || '')}</textarea>
  </div>`;
}
function ensurePlan(k) { if (!S.plans[k]) S.plans[k] = { items: [], summary: '' }; return S.plans[k]; }
function carryYesterday() {
  const dk = U.dailyDate || todayKey();
  const prevKey = dateKey(addDays(dateFromKey(dk), -1));
  const prev = S.plans[prevKey];
  const pending = prev ? prev.items.filter(i => !i.done) : [];
  if (!pending.length) { toast('昨天没有未完成事项'); return; }
  const plan = ensurePlan(dk);
  const we = isWeekendKey(dk);
  pending.forEach(i => {
    const block = we ? 'day' : (BLOCKS_WD.some(b => b.id === i.block) ? i.block : 'evening');
    plan.items.push({ id: uid(), block, text: i.text, done: false, summary: '' });
  });
  save(); render();
  toast(`已带入 ${pending.length} 项未完成事项`);
}

/* =========================================================
   六、随记总结
   ========================================================= */
function noteCloud() {
  const cnt = {};
  S.notes.forEach(n => (n.keywords || []).forEach(k => cnt[k] = (cnt[k] || 0) + 1));
  return Object.keys(cnt).map(k => ({ k, n: cnt[k] })).sort((a, b) => b.n - a.n).slice(0, 20);
}
function notesListHtml() {
  let list = [...S.notes].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  if (U.noteFilter) list = list.filter(n => (n.keywords || []).includes(U.noteFilter));
  if (U.noteSearch) list = list.filter(n => n.text.toLowerCase().includes(U.noteSearch.toLowerCase()));
  if (!list.length) return '<div class="empty">没有匹配的随记</div>';
  return list.map(n => `
    <div class="note-card">
      <div class="note-time">🕒 ${esc(n.createdAt)}<button class="icon-btn danger" data-act="del-note" data-id="${n.id}" title="删除">✕</button></div>
      <textarea class="autosize note-text" rows="2" data-field="noteText" data-id="${n.id}">${esc(n.text)}</textarea>
      <div class="chips">${(n.keywords || []).map(k => `<button class="chip" data-act="note-filter" data-kw="${esc(k)}">${esc(k)}</button>`).join('')}</div>
    </div>`).join('');
}
function renderNotes() {
  return `
  <div class="page-head"><h2>📝 随记总结</h2><p>像便笺一样随时随地记录，自动提取关键词，点关键词可筛选同类</p></div>
  <div class="card">
    <h3>✏️ 记一条</h3>
    <textarea id="note-input" class="autosize" rows="3" placeholder="写下小结、灵感、反思…（Ctrl+Enter 保存）"></textarea>
    <div class="kw-preview" id="note-kw-preview"><span class="klbl">关键词预览：</span></div>
    <div style="display:flex;justify-content:flex-end;margin-top:8px"><button class="btn btn-primary" data-act="save-note">保存随记</button></div>
  </div>
  <div class="card">
    <div class="note-search-row">
      <input id="note-search" placeholder="🔍 搜索随记…" value="${esc(U.noteSearch)}">
      <div class="chips">
        ${noteCloud().map(c => `<button class="chip ${U.noteFilter === c.k ? 'on' : ''}" data-act="note-filter" data-kw="${esc(c.k)}">${esc(c.k)} <b>${c.n}</b></button>`).join('')}
        ${U.noteFilter ? `<button class="chip" data-act="note-filter" data-kw="">✕ 清除筛选</button>` : ''}
      </div>
    </div>
    <div id="note-list">${notesListHtml()}</div>
  </div>`;
}
function commitNote(text) {
  text = (text || '').trim();
  if (!text) { toast('先写点什么吧'); return false; }
  S.notes.push({ id: uid(), text, keywords: extractKeywords(text), createdAt: nowIso() });
  save();
  return true;
}
function kwPreview(v, cid) {
  const box = el(cid);
  if (!box) return;
  const ks = extractKeywords(v);
  box.innerHTML = '<span class="klbl">关键词预览：</span>' + (ks.length ? ks.map(k => `<span class="k">${esc(k)}</span>`).join('') : '<span class="klbl">（输入后自动提取）</span>');
}

/* =========================================================
   工具箱：备份 / 密码 / 周报
   ========================================================= */
function reportLabel() {
  const s = U.reportStart || weekStartKey(new Date());
  return `${s} ~ ${dateKey(addDays(dateFromKey(s), 6))}（周六至周五）`;
}
function buildReport() {
  const start = U.reportStart || weekStartKey(new Date());
  const days = [...Array(7)].map((_, i) => dateKey(addDays(dateFromKey(start), i)));
  const L = [];
  L.push(`【周报】${start} 至 ${days[6]}（周六至周五）`);
  L.push('');
  L.push('一、每日计划完成情况');
  let anyPlan = false;
  days.forEach(k => {
    const p = S.plans[k];
    if (!p || !p.items.length) return;
    anyPlan = true;
    const dn = p.items.filter(i => i.done).length;
    L.push(`  ${k} 周${WD_CN[dateFromKey(k).getDay()]}：${dn}/${p.items.length}`);
    p.items.filter(i => i.done).forEach(i => L.push(`    ✓［${BLOCK_LBL[i.block] || ''}］${i.text}`));
  });
  if (!anyPlan) L.push('  （本周没有每日计划记录）');
  L.push('');
  L.push('二、事项与例行完成');
  let anyTask = false;
  S.todos.sections.forEach(sec => sec.groups.forEach(g => g.items.forEach(it => {
    if (it.freq) {
      const daysDone = days.filter(k => it.doneMap && it.doneMap[k]).length;
      if (it.freq === 'weekly') {
        if (it.doneMap && it.doneMap[start]) { L.push(`  ✓［${sec.title}·${g.title}］${it.text}`); anyTask = true; }
      } else if (it.freq === 'monthly') {
        if (daysDone > 0) { L.push(`  ✓［${sec.title}·${g.title}］${it.text}`); anyTask = true; }
      } else if (daysDone > 0) {
        L.push(`  ✓［${sec.title}·${g.title}］${it.text}（本周 ${daysDone} 天）`); anyTask = true;
      }
    } else if (it.done && it.doneAt && days.includes(it.doneAt.slice(0, 10))) {
      L.push(`  ✓［${sec.title}·${g.title}］${it.text}（${it.doneAt.slice(0, 10)} 完成）`); anyTask = true;
    }
    (it.children || []).forEach(c => { if (c.done) L.push(`    · 子项完成：${c.text}`); });
  })));
  if (!anyTask) L.push('  （本周暂无完成记录）');
  L.push('');
  L.push('三、随记回顾');
  const wn = S.notes.filter(n => days.includes(n.createdAt.slice(0, 10)));
  if (!wn.length) L.push('  （本周暂无随记）');
  wn.forEach(n => L.push(`  [${n.createdAt.slice(5, 10)}] ${n.text.length > 60 ? n.text.slice(0, 60) + '…' : n.text}`));
  return L.join('\n');
}
function renderTools() {
  const kb = (new Blob([JSON.stringify(S)]).size / 1024).toFixed(1);
  return `
  <div class="page-head"><h2>🧰 工具箱</h2><p>数据备份、周报生成、密码管理等实用功能</p></div>
  <div class="tool-grid">
    <div class="card">
      <h3>💾 数据管理 <span class="hint">本地占用 ${kb} KB</span></h3>
      <p style="font-size:12.5px;color:var(--muted)">当前 ${countItems()} 条事项 · ${Object.keys(S.plans).length} 天计划 · ${S.notes.length} 条随记。数据仅保存在本机浏览器（localStorage），换设备或清理浏览器前请先导出备份。</p>
      <div class="tool-row">
        <button class="btn btn-primary btn-sm" data-act="export-data">⬇ 导出备份</button>
        <button class="btn btn-sm" data-act="import-data">⬆ 导入备份</button>
        <input type="file" id="import-file" accept=".json,application/json" style="display:none">
      </div>
      <div class="danger-zone">
        <button class="btn btn-danger btn-sm" data-act="reset-data">↺ 恢复初始数据（清空当前全部内容）</button>
      </div>
    </div>
    <div class="card">
      <h3>🔑 修改密码</h3>
      <div class="pass-row">
        <input type="password" id="pass-cur" placeholder="当前密码">
        <input type="password" id="pass-new" placeholder="新密码（至少 6 位）">
        <input type="password" id="pass-new2" placeholder="再输一遍新密码">
        <button class="btn btn-primary btn-sm" data-act="change-pass">确认修改</button>
      </div>
    </div>
    <div class="card">
      <h3>📄 一键周报 <span class="hint">周期：周六 → 周五</span></h3>
      <div class="day-nav" style="margin-bottom:10px">
        <button class="btn btn-sm" data-act="report-prev">‹</button>
        <b style="font-size:13px">${reportLabel()}</b>
        <button class="btn btn-sm" data-act="report-next">›</button>
      </div>
      <textarea id="report-text" rows="14" readonly>${esc(buildReport())}</textarea>
      <div class="tool-row">
        <button class="btn btn-primary btn-sm" data-act="copy-report">📋 复制周报</button>
        <button class="btn btn-sm" data-act="dl-report">⬇ 下载 .txt</button>
      </div>
    </div>
    <div class="card">
      <h3>💡 功能与技巧</h3>
      <div class="feature-list">
        <b>总览</b>：今日计划、今日例行、本周例行、逾期提醒、近 7 天完成率、目标速览、最近随记，一屏掌握<br>
        <b>事项安排</b>：例行事务按 每日 / 每周（周六起算）/ 每月 自动重置；任务可设截止日，自动算逾期与倒计时<br>
        <b>每日计划</b>：工作日分 工作 / 中午 / 晚上 三板块，周末合并为全天；一键把昨天未完成事项带入今天<br>
        <b>随记总结</b>：像便笺一样随手记，自动提取关键词；顶栏「✏️ 随记」任何页面都能快速记一条<br>
        <b>番茄钟</b>：顶栏 ⏱ 打开，专注 25 / 深度 45 / 休息 5 三种模式，结束有提示音<br>
        <b>周报</b>：按 周六→周五 汇总一周完成情况，一键复制或下载<br>
        <b>外观</b>：侧栏底部 🌙 可切换深色模式；手机浏览器访问自动切换为窄屏布局<br>
        <b>快捷键</b>：<span class="kbd">Ctrl</span>+<span class="kbd">Enter</span> 保存随记 · <span class="kbd">Esc</span> 关闭弹窗 · 输入框中 <span class="kbd">Enter</span> 快速添加
      </div>
    </div>
  </div>`;
}
function doExport() {
  download(`工作台备份_${todayKey()}.json`, JSON.stringify(S, null, 2));
  toast('备份已下载');
}
function doImportFile(file) {
  if (!file) return;
  const rd = new FileReader();
  rd.onload = () => {
    try {
      const data = JSON.parse(rd.result);
      if (!data || !data.todos || !data.analysis) throw new Error('格式不对');
      S = migrate(data);
      save(); applyTheme(S.settings.theme || 'light'); render();
      toast('导入成功');
    } catch (err) { toast('导入失败：文件格式不正确'); }
  };
  rd.readAsText(file, 'utf-8');
}
function changePass() {
  const cur = el('pass-cur').value, n1 = el('pass-new').value, n2 = el('pass-new2').value;
  const a = S.settings.auth;
  if (obf(cur) !== a.p) { toast('当前密码不正确'); return; }
  if (n1.length < 6) { toast('新密码至少 6 位'); return; }
  if (n1 !== n2) { toast('两次输入的新密码不一致'); return; }
  S.settings.auth = { u: a.u, p: obf(n1), o: 1 };
  save();
  el('pass-cur').value = el('pass-new').value = el('pass-new2').value = '';
  toast('密码已修改，下次登录生效');
}

/* =========================================================
   全局搜索
   ========================================================= */
function globalSearch(q) {
  q = q.trim().toLowerCase();
  if (!q) return [];
  const res = [];
  const add = (route, title, sub) => { if (res.length < 14 && title) res.push({ route, title, sub }); };
  S.todos.sections.forEach(s => s.groups.forEach(g => g.items.forEach(i => {
    if (i.text.toLowerCase().includes(q)) add('todos', i.text.slice(0, 42), `事项安排 · ${s.title} ${g.title}`);
    (i.children || []).forEach(c => { if (c.text.toLowerCase().includes(q)) add('todos', c.text.slice(0, 42), '事项安排 · 子项'); });
  })));
  S.goals.forEach(g => { if ((g.title + ' ' + (g.details || []).map(d => d.text).join(' ')).toLowerCase().includes(q)) add('goals', g.title.slice(0, 42), '目标与问题'); });
  S.analysis.forEach(sec => sec.groups.forEach(g => g.items.forEach(i => { if (i.text.toLowerCase().includes(q)) add('analysis', i.text.slice(0, 42), `形势分析 · ${sec.title}`); })));
  S.notes.forEach(n => { if (n.text.toLowerCase().includes(q)) add('notes', n.text.slice(0, 42), `随记 ${n.createdAt.slice(5, 10)}`); });
  Object.keys(S.plans).forEach(k => {
    const p = S.plans[k];
    p.items.forEach(i => { if (i.text.toLowerCase().includes(q)) add('daily', i.text.slice(0, 42), `每日计划 ${k}`); });
    if ((p.summary || '').toLowerCase().includes(q)) add('daily', p.summary.slice(0, 42), `每日小结 ${k}`);
  });
  return res;
}
function onSearchInput(v) {
  const box = el('search-result');
  if (!v.trim()) { box.classList.add('hidden'); return; }
  U.searchResults = globalSearch(v);
  box.innerHTML = U.searchResults.length
    ? U.searchResults.map((r, i) => `<button class="sr-item" data-act="sr-go" data-idx="${i}"><b>${esc(r.title)}</b><span>${esc(r.sub)}</span></button>`).join('')
    : '<div class="sr-empty">没有找到相关内容</div>';
  box.classList.remove('hidden');
}

/* =========================================================
   番茄钟
   ========================================================= */
const TM = { min: 25, left: 25 * 60, run: false, iv: null };
function timerFmt(s) { return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`; }
function timerPaint() {
  const d = el('timer-display'), m = el('timer-mini');
  if (d) d.textContent = timerFmt(TM.left);
  if (m) { m.textContent = `⏱️ ${timerFmt(TM.left)}`; m.classList.toggle('running', TM.run); }
}
function timerStart() {
  if (TM.run) return;
  TM.run = true;
  TM.iv = setInterval(() => { TM.left--; if (TM.left <= 0) timerFinish(); timerPaint(); }, 1000);
  timerPaint();
}
function timerPause() { TM.run = false; clearInterval(TM.iv); timerPaint(); }
function timerReset() { timerPause(); TM.left = TM.min * 60; timerPaint(); }
function timerMode(min) {
  TM.min = min; TM.left = min * 60; timerPause();
  document.querySelectorAll('.timer-modes button').forEach(b => b.classList.toggle('active', +b.dataset.min === min));
  timerPaint();
}
function timerFinish() {
  timerPause(); TM.left = TM.min * 60; timerPaint();
  beep(); toast('⏰ 时间到！起来喝口水、拉伸一下～');
}
function beep() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.connect(g); g.connect(ctx.destination);
    o.frequency.value = 880;
    g.gain.setValueAtTime(0.25, ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 1.2);
    o.start(); o.stop(ctx.currentTime + 1.2);
  } catch (e) {}
}

/* =========================================================
   弹窗 / 提示
   ========================================================= */
function openModal(html) {
  el('modal-root').innerHTML = `<div class="modal-mask" data-act="modal-mask"><div class="modal">${html}</div></div>`;
  el('modal-root').classList.remove('hidden');
}
function closeModal() { el('modal-root').classList.add('hidden'); el('modal-root').innerHTML = ''; }
function openQuickNote() {
  openModal(`<h3>✏️ 快速随记</h3>
    <textarea id="note-modal-input" class="autosize" rows="3" placeholder="随手记一条小结、灵感…（Ctrl+Enter 保存）"></textarea>
    <div class="kw-preview" id="note-modal-kw"><span class="klbl">关键词预览：</span></div>
    <div class="ops"><button class="btn" data-act="modal-close">取消</button><button class="btn btn-primary" data-act="save-note-modal">保存</button></div>`);
  setTimeout(() => { const t = el('note-modal-input'); if (t) t.focus(); }, 60);
}
let toastT = null;
function toast(msg) {
  const t = el('toast');
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(toastT);
  toastT = setTimeout(() => t.classList.remove('show'), 2200);
}

/* =========================================================
   动作分发
   ========================================================= */
function onClick(e) {
  const t = e.target.closest('[data-act]');
  if (!t) return;
  if (t.tagName === 'INPUT' && t.type === 'checkbox') return; /* 复选框走 change */
  const act = t.dataset.act, id = t.dataset.id;
  switch (act) {
    /* 导航 / 外观 */
    case 'nav': setRoute(t.dataset.route); break;
    case 'toggle-theme': S.settings.theme = S.settings.theme === 'dark' ? 'light' : 'dark'; save(); applyTheme(S.settings.theme); break;
    case 'logout': doLogout(); break;
    /* 随记 */
    case 'quick-note': openQuickNote(); break;
    case 'modal-close': closeModal(); break;
    case 'modal-mask': if (e.target === t) closeModal(); break;
    case 'save-note-modal':
      if (commitNote(el('note-modal-input').value)) { closeModal(); toast('已保存'); if (U.route === 'notes') render(); }
      break;
    case 'save-note':
      if (commitNote(el('note-input').value)) {
        el('note-input').value = '';
        el('note-kw-preview').innerHTML = '<span class="klbl">关键词预览：</span>';
        render(); toast('已保存');
      }
      break;
    case 'note-filter': U.noteFilter = t.dataset.kw || ''; render(); break;
    case 'del-note': if (confirm('确定删除该随记？')) { S.notes = S.notes.filter(n => n.id !== id); save(); render(); } break;
    /* 番茄钟 */
    case 'open-timer': el('timer-panel').classList.remove('hidden'); timerPaint(); break;
    case 'close-timer': el('timer-panel').classList.add('hidden'); break;
    case 'timer-start': timerStart(); break;
    case 'timer-pause': timerPause(); break;
    case 'timer-reset': timerReset(); break;
    case 'timer-mode': timerMode(+t.dataset.min); break;
    /* 形势分析 */
    case 'add-ana-sec': S.analysis.push({ id: uid(), icon: '📌', title: '新板块', groups: [{ id: uid(), title: '分组', items: [{ id: uid(), text: '' }] }] }); save(); render(); break;
    case 'del-ana-sec': if (confirm('确定删除该板块及全部内容？')) { S.analysis = S.analysis.filter(s => s.id !== id); save(); render(); } break;
    case 'add-ana-group': { const sec = S.analysis.find(s => s.id === id); if (sec) { sec.groups.push({ id: uid(), title: '新分组', items: [{ id: uid(), text: '' }] }); save(); render(); } break; }
    case 'del-ana-group': if (confirm('确定删除该分组？')) { S.analysis.forEach(s => s.groups = s.groups.filter(g => g.id !== id)); save(); render(); } break;
    case 'add-ana-item': { const g = findAnaGroup(id); if (g) { g.items.push({ id: uid(), text: '' }); save(); render(); } break; }
    case 'del-ana-item': S.analysis.forEach(s => s.groups.forEach(g => g.items = g.items.filter(i => i.id !== id))); save(); render(); break;
    /* 目标 */
    case 'add-goal': S.goals.push({ id: uid(), title: '新目标', stars: 3, done: false, details: [] }); save(); render(); break;
    case 'del-goal': if (confirm('确定删除该目标？')) { S.goals = S.goals.filter(g => g.id !== id); save(); render(); } break;
    case 'up-goal': moveInArr(S.goals, id, -1); save(); render(); break;
    case 'down-goal': moveInArr(S.goals, id, 1); save(); render(); break;
    case 'del-detail': { const f = findItem(id); if (f && f.goal) { f.goal.details = f.goal.details.filter(d => d.id !== id); save(); render(); } break; }
    /* 事项 */
    case 'todo-tab': U.todoTab = t.dataset.tab; render(); break;
    case 'toggle-summary': {
      if (U.openSummaries.has(id)) U.openSummaries.delete(id); else U.openSummaries.add(id);
      save(); render(); focusSummary(id);
      break;
    }
    case 'up-item': moveTodoItem(id, -1); break;
    case 'down-item': moveTodoItem(id, 1); break;
    case 'del-item': if (confirm('确定删除该事项？')) { const c = findItemContainer(id); if (c) c.arr.splice(c.idx, 1); save(); render(); } break;
    /* 每日计划 */
    case 'day-prev': U.dailyDate = dateKey(addDays(dateFromKey(U.dailyDate || todayKey()), -1)); render(); break;
    case 'day-next': U.dailyDate = dateKey(addDays(dateFromKey(U.dailyDate || todayKey()), 1)); render(); break;
    case 'day-today': U.dailyDate = todayKey(); render(); break;
    case 'carry-yesterday': carryYesterday(); break;
    case 'del-plan': if (confirm('确定删除该安排？')) { const f = findPlanItem(id); if (f) { f.plan.items = f.plan.items.filter(i => i.id !== id); save(); render(); } } break;
    /* 工具箱 */
    case 'export-data': doExport(); break;
    case 'import-data': el('import-file').click(); break;
    case 'reset-data': if (confirm('将清空当前全部数据并恢复为初始内容，确定？')) { S = firstRunData(); save(); applyTheme(S.settings.theme || 'light'); render(); toast('已恢复初始数据'); } break;
    case 'change-pass': changePass(); break;
    case 'report-prev': U.reportStart = dateKey(addDays(dateFromKey(U.reportStart), -7)); render(); break;
    case 'report-next': U.reportStart = dateKey(addDays(dateFromKey(U.reportStart), 7)); render(); break;
    case 'copy-report': copyText(el('report-text').value, '周报已复制'); break;
    case 'dl-report': download(`周报_${U.reportStart}.txt`, el('report-text').value); break;
    /* 搜索 */
    case 'sr-go': {
      const r = (U.searchResults || [])[+t.dataset.idx];
      el('search-result').classList.add('hidden');
      el('global-search').value = '';
      if (r) setRoute(r.route);
      break;
    }
    /* 星级 */
    case 'star': setStar(id, +t.dataset.val); break;
  }
}
function setStar(id, val) {
  const g = findGoal(id);
  if (g) g.stars = (g.stars === val) ? 0 : val;
  else { const f = findItem(id); if (f && f.item) f.item.stars = (f.item.stars === val) ? 0 : val; }
  save(); render();
}
function moveInArr(arr, id, dir) {
  const i = arr.findIndex(x => x.id === id);
  const j = i + dir;
  if (i < 0 || j < 0 || j >= arr.length) return;
  [arr[i], arr[j]] = [arr[j], arr[i]];
}
function findItemContainer(id) {
  for (const sec of S.todos.sections) for (const g of sec.groups) {
    let idx = g.items.findIndex(i => i.id === id);
    if (idx > -1) return { arr: g.items, idx };
    for (const it of g.items) if (it.children) {
      const ci = it.children.findIndex(c => c.id === id);
      if (ci > -1) return { arr: it.children, idx: ci };
    }
  }
  return null;
}
function moveTodoItem(id, dir) {
  const c = findItemContainer(id);
  if (!c) return;
  moveInArr(c.arr, id, dir);
  save(); render();
}
function focusSummary(key) {
  const sel = key.startsWith('p')
    ? `[data-field="planSummary"][data-id="${key.slice(1)}"]`
    : `[data-field="itemSummary"][data-id="${key}"]`;
  setTimeout(() => { const t = document.querySelector(sel); if (t) { autosizeEl(t); t.focus(); } }, 40);
}
function addTodoItem(gid, text) {
  text = (text || '').trim();
  if (!text) return;
  const g = findGroup(gid);
  if (!g) return;
  const kind = groupKind(g);
  const item = { id: uid(), text, done: false };
  if (kind === 'task') item.deadline = '';
  if (kind === 'routine') { const f = g.items.find(i => i.freq); item.freq = f ? f.freq : 'daily'; item.doneMap = {}; }
  g.items.push(item);
  save(); render();
}
function addPlanItem(block, date, text) {
  text = (text || '').trim();
  if (!text) return;
  ensurePlan(date).items.push({ id: uid(), block, text, done: false, summary: '' });
  save(); render();
}
function addTodoChild(pid, text) {
  text = (text || '').trim();
  if (!text) return;
  const f = findItem(pid);
  if (!f || !f.item) return;
  f.item.children = f.item.children || [];
  f.item.children.push({ id: uid(), text, done: false });
  save(); render();
}
function addGoalDetail(gid, text) {
  text = (text || '').trim();
  if (!text) return;
  const g = findGoal(gid);
  if (!g) return;
  g.details = g.details || [];
  g.details.push({ id: uid(), text, done: false });
  save(); render();
}

/* ---------- input / change / keydown ---------- */
function onInput(e) {
  const t = e.target;
  if (t.id === 'global-search') return onSearchInput(t.value);
  if (t.id === 'note-input') { autosizeEl(t); return kwPreview(t.value, 'note-kw-preview'); }
  if (t.id === 'note-modal-input') { autosizeEl(t); return kwPreview(t.value, 'note-modal-kw'); }
  if (t.id === 'note-search') {
    U.noteSearch = t.value;
    const nl = el('note-list');
    if (nl) nl.innerHTML = notesListHtml();
    return;
  }
  autosizeEl(t);
  const f = t.dataset.field, id = t.dataset.id;
  if (!f) return;
  const v = t.value;
  switch (f) {
    case 'anaSecTitle': { const s = S.analysis.find(x => x.id === id); if (s) s.title = v; break; }
    case 'anaGroupTitle': { const g = findAnaGroup(id); if (g) g.title = v; break; }
    case 'anaText': { const a = findAnaItem(id); if (a) a.item.text = v; break; }
    case 'goalTitle': { const g = findGoal(id); if (g) g.title = v; break; }
    case 'detailText': { const d = findItem(id); if (d && d.item) d.item.text = v; break; }
    case 'itemText': { const x = findItem(id); if (x && x.item) x.item.text = v; break; }
    case 'itemSummary': { const x = findItem(id); if (x && x.item) x.item.summary = v; break; }
    case 'planText': { const x = findPlanItem(id); if (x) x.item.text = v; break; }
    case 'planSummary': { const x = findPlanItem(id); if (x) x.item.summary = v; break; }
    case 'dailySummary': ensurePlan(id).summary = v; break;
    case 'noteText': { const n = findNote(id); if (n) { n.text = v; n.keywords = extractKeywords(v); } break; }
  }
  saveSoon();
}
function onChange(e) {
  const t = e.target;
  const act = t.dataset.act;
  if (t.type === 'checkbox') {
    if (act === 'toggle-item') { const f = findItem(t.dataset.id); if (f && f.item) { toggleItem(f.item); save(); render(); } return; }
    if (act === 'toggle-plan') { const f = findPlanItem(t.dataset.id); if (f) { f.item.done = t.checked; f.item.doneAt = t.checked ? nowIso() : null; save(); render(); } return; }
    if (act === 'toggle-detail') { const f = findItem(t.dataset.id); if (f && f.item) { f.item.done = t.checked; save(); render(); } return; }
    return;
  }
  if (t.id === 'import-file') { doImportFile(t.files && t.files[0]); return; }
  switch (t.dataset.field) {
    case 'itemFreq': { const f = findItem(t.dataset.id); if (f && f.item) { f.item.freq = t.value; f.item.doneMap = {}; save(); render(); } break; }
    case 'itemDeadline': { const f = findItem(t.dataset.id); if (f && f.item) { f.item.deadline = t.value || ''; save(); render(); } break; }
    case 'dailyDate': U.dailyDate = t.value || todayKey(); render(); break;
    case 'noteText': save(); render(); break; /* 失焦后刷新关键词 */
  }
}
function onKeydown(e) {
  const t = e.target;
  if (!t || !t.matches) return;
  if (e.key === 'Enter' && !e.shiftKey && !e.ctrlKey && !e.metaKey) {
    if (t.matches('[data-add]')) { e.preventDefault(); addTodoItem(t.dataset.add, t.value); t.value = ''; return; }
    if (t.matches('[data-add-plan]')) { e.preventDefault(); addPlanItem(t.dataset.addPlan, t.dataset.date, t.value); t.value = ''; return; }
    if (t.matches('[data-add-detail]')) { e.preventDefault(); addGoalDetail(t.dataset.addDetail, t.value); t.value = ''; return; }
    if (t.matches('[data-add-child]')) { e.preventDefault(); addTodoChild(t.dataset.addChild, t.value); t.value = ''; return; }
  }
  if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
    if (t.id === 'note-input') {
      e.preventDefault();
      if (commitNote(t.value)) { t.value = ''; el('note-kw-preview').innerHTML = '<span class="klbl">关键词预览：</span>'; render(); toast('已保存'); }
      return;
    }
    if (t.id === 'note-modal-input') {
      e.preventDefault();
      if (commitNote(t.value)) { closeModal(); toast('已保存'); if (U.route === 'notes') render(); }
      return;
    }
  }
  if (e.key === 'Escape') {
    if (!el('modal-root').classList.contains('hidden')) closeModal();
    const sr = el('search-result');
    if (sr && !sr.classList.contains('hidden')) sr.classList.add('hidden');
  }
}

/* ---------- 时钟 ---------- */
let clockIv = null, lastDay = '';
function startClock() {
  if (clockIv) clearInterval(clockIv);
  const paint = () => {
    const d = new Date(), p = n => String(n).padStart(2, '0');
    el('clock').textContent = `${d.getFullYear()}/${p(d.getMonth() + 1)}/${p(d.getDate())} 星期${WD_CN[d.getDay()]} ${p(d.getHours())}:${p(d.getMinutes())}`;
    const tk = todayKey();
    if (tk !== lastDay) {
      lastDay = tk;
      if (U.route === 'dashboard' || U.route === 'daily') render();
    }
  };
  paint();
  clockIv = setInterval(paint, 20000);
}

/* ---------- 启动 ---------- */
function bindEvents() {
  document.addEventListener('click', onClick);
  document.addEventListener('input', onInput);
  document.addEventListener('change', onChange);
  document.addEventListener('keydown', onKeydown);
  /* 点击搜索框以外时收起结果 */
  document.addEventListener('click', e => {
    if (!e.target.closest('.side-search')) {
      const sr = el('search-result');
      if (sr) sr.classList.add('hidden');
    }
  }, true);
  window.addEventListener('hashchange', () => {
    if (!isAuthed()) return;
    const r = (location.hash || '').replace(/^#\//, '');
    if (ROUTES[r] && r !== U.route) { U.route = r; render(); }
  });
  window.addEventListener('beforeunload', () => { clearTimeout(save._t); save(); });
  el('login-form').addEventListener('submit', e => {
    e.preventDefault();
    const u = el('login-user').value.trim(), p = el('login-pass').value;
    const a = S.settings.auth;
    if (obf(u) === a.u && obf(p) === a.p) {
      el('login-err').textContent = '';
      if (el('login-remember').checked) localStorage.setItem(REMEMBER_KEY, '1');
      sessionStorage.setItem(SESSION_KEY, '1');
      enterApp();
    } else {
      el('login-err').textContent = '账号或密码不正确';
      const c = document.querySelector('.login-card');
      c.classList.remove('shake'); void c.offsetWidth; c.classList.add('shake');
    }
  });
}
function boot() {
  S = load();
  applyTheme(S.settings.theme || 'light');
  bindEvents();
  if (isAuthed()) enterApp(); else showLogin();
}
document.addEventListener('DOMContentLoaded', boot);

/* 注册路由（函数声明已提升） */
Object.assign(ROUTES, {
  dashboard: renderDashboard,
  analysis: renderAnalysis,
  goals: renderGoals,
  todos: renderTodos,
  daily: renderDaily,
  notes: renderNotes,
  tools: renderTools
});
