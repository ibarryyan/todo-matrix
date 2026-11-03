/* ============================================================
   点阵台账 · 逻辑层
   数据模型：{ version, modules: [{id, name}], days: { 'YYYY-MM-DD': { tasks: [{id, text, mod, link?, done, at}] } } }
   link 为可选字段（http/https 规范化后的完整地址），老数据没有该字段，读取时按「无链接」处理
   老数据没有 modules / task.mod：modules 回落预设三家，无 mod 的任务归入内置模块「其他」
   持久化：localStorage
   ============================================================ */
(() => {
  'use strict';

  const STORE_KEY = 'dotledger.v1';
  const THEME_KEY = 'dotledger.theme';
  const WEEKS = 18;                                    // 点阵图回溯周数
  const CN_NUM = ['零','一','二','三','四','五','六','七','八','九','十'];
  const WEEK_CN = ['日','一','二','三','四','五','六'];
  const WD_LABEL = ['一','二','三','四','五','六','日'];

  const MOD_PRESET = [                                 // 预设模块：老数据没有 modules 时用这套
    { id: 'work',  name: '工作' },
    { id: 'life',  name: '生活' },
    { id: 'write', name: '写作' }
  ];
  const OTHER = { id: 'other', name: '其他' };         // 内置兜底模块：不可删除，任务被删模块后归入此处
  const MOD_MAX = 8;                                   // 自定义模块上限
  const ALL = 'all';                                   // 模块视图：全部

  const LEDES = [
    '今天打算做完哪几件事？先写下来，写完再开始。',
    '把脑子里的清单倒出来，脑子就腾出地方了。',
    '三件重要的事，胜过三十件琐碎的事。',
    '写下来的是承诺，做完的才算数。',
    '别追求清空，先追求开始。'
  ];

  /* ---------- 日期工具 ---------- */
  const pad = n => String(n).padStart(2, '0');
  const keyOf = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  const parseKey = k => { const [y, m, d] = k.split('-').map(Number); return new Date(y, m - 1, d); };
  const addDays = (d, n) => { const x = new Date(d); x.setDate(x.getDate() + n); return x; };
  const todayKey = () => keyOf(new Date());
  /** 取当天所在周的周一 */
  const mondayOf = d => { const x = new Date(d); x.setDate(x.getDate() - ((x.getDay() + 6) % 7)); x.setHours(0, 0, 0, 0); return x; };
  const cnMonth = m => (m <= 10 ? CN_NUM[m] : '十' + CN_NUM[m - 10]) + '月';

  /* ---------- 链接工具 ---------- */
  /**
   * 规范链接：缺协议时补 https://，只放行 http/https，其余一律判非法。
   * 返回 null 表示不记录链接（非法或为空）。用于写入与渲染两处，避免脏数据拼出 javascript: 等危险协议。
   */
  function safeLink(raw) {
    const v = (raw || '').trim();
    if (!v) return null;
    const withScheme = /^[a-z][a-z0-9+.-]*:\/\//i.test(v) ? v : 'https://' + v;
    let u;
    try { u = new URL(withScheme); } catch { return null; }
    if (u.protocol !== 'http:' && u.protocol !== 'https:') return null;
    return u.href;
  }

  /* ---------- 状态 ---------- */
  let state = load() || { version: 1, days: {} };
  let selected = todayKey();
  let activeMod = ALL;                                 // 当前模块视图

  function load() {
    try {
      const raw = localStorage.getItem(STORE_KEY);
      if (!raw) return null;
      const data = JSON.parse(raw);
      return (data && typeof data.days === 'object') ? data : null;
    } catch { return null; }
  }
  function save() {
    try { localStorage.setItem(STORE_KEY, JSON.stringify(state)); }
    catch { announce('本地存储不可用，本次记录不会被保存'); }
  }
  /** 取（但不创建）某天的数据 */
  const peek = k => state.days[k] || null;
  /** 取并按需创建某天的数据 */
  function dayOf(k) {
    if (!state.days[k]) state.days[k] = { tasks: [] };
    if (!Array.isArray(state.days[k].tasks)) state.days[k].tasks = [];
    return state.days[k];
  }
  const countOf = k => { const d = peek(k); return d ? d.tasks.length : 0; };
  const doneOf = k => { const d = peek(k); return d ? d.tasks.filter(t => t.done).length : 0; };

  /* ---------- 模块 ---------- */
  /** 模块列表：老数据没有 modules 时补上预设三家（只在启动与写入前调用，不在渲染中改状态） */
  function ensureModules() {
    if (!Array.isArray(state.modules) || !state.modules.length) {
      state.modules = MOD_PRESET.map(m => ({ id: m.id, name: m.name }));
    }
    return state.modules;
  }
  const modList = () => ensureModules().concat([OTHER]);
  const modName = id => (ensureModules().find(m => m.id === id) || OTHER).name;
  /** 任务所属模块：老数据没有 mod、或模块已被删除时，一律归入「其他」 */
  const modOf = t => (t && ensureModules().some(m => m.id === t.mod)) ? t.mod : OTHER.id;
  /** 当前视图（选中日期 + 选中模块）下可见的任务 */
  function visibleTasks() {
    const day = peek(selected);
    const all = day ? day.tasks : [];
    return activeMod === ALL ? all : all.filter(t => modOf(t) === activeMod);
  }

  /* ---------- DOM ---------- */
  const $ = id => document.getElementById(id);
  const els = {
    bigDay: $('bigDay'), bigYM: $('bigYM'), bigWd: $('bigWd'), lede: $('lede'),
    prevDay: $('prevDay'), nextDay: $('nextDay'), todayBtn: $('todayBtn'), themeBtn: $('themeBtn'),
    ledgerDayLabel: $('ledgerDayLabel'), ledgerDayKey: $('ledgerDayKey'), clearDoneBtn: $('clearDoneBtn'),
    taskInput: $('taskInput'), linkInput: $('linkInput'), addBtn: $('addBtn'), counter: $('counter'),
    modBar: $('modBar'), modSelect: $('modSelect'),
    taskList: $('taskList'), emptyState: $('emptyState'), emptyTitle: $('emptyTitle'), seedBtn: $('seedBtn'),
    tDone: $('tDone'), tTotal: $('tTotal'), tCap: $('tCap'),
    meterFill: $('meterFill'), meterWrap: $('meterWrap'),
    sStreak: $('sStreak'), sWeek: $('sWeek'), sAll: $('sAll'),
    matrixGrid: $('matrixGrid'), matrixScroll: $('matrixScroll'), genBtn: $('genBtn'),
    wipeBtn: $('wipeBtn'), live: $('live')
  };

  function announce(msg) { els.live.textContent = msg; }

  /* ---------- 渲染：报头 ---------- */
  function renderHeader() {
    const d = parseKey(selected);
    const isToday = selected === todayKey();
    els.bigDay.textContent = pad(d.getDate());
    els.bigYM.textContent = `${cnMonth(d.getMonth() + 1)} · ${d.getFullYear()}`;
    els.bigWd.textContent = '星期' + WEEK_CN[d.getDay()];

    els.ledgerDayLabel.textContent = isToday ? '今日台账'
      : (selected > todayKey() ? '预先安排 · ' : '补记 · ') + `${d.getMonth() + 1}月${d.getDate()}日`;
    els.ledgerDayKey.textContent = selected;
    els.todayBtn.disabled = isToday;

    // 每天换一句提示语（按日期稳定hash，不会每次刷新乱跳）
    let h = 0;
    for (const ch of selected) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
    els.lede.textContent = LEDES[h % LEDES.length];
  }

  /* ---------- 渲染：模块栏 ---------- */
  /** 模块下拉（新任务归属）：保留当前选择，切了模块时由 renderModBar 同步 */
  function renderModOptions() {
    const list = modList();
    const keep = els.modSelect.value;
    els.modSelect.replaceChildren();
    list.forEach(m => {
      const o = document.createElement('option');
      o.value = m.id;
      o.textContent = m.name;
      els.modSelect.appendChild(o);
    });
    els.modSelect.value = list.some(m => m.id === keep) ? keep : ensureModules()[0].id;
  }

  function renderModBar() {
    const day = peek(selected);
    const all = day ? day.tasks : [];
    const tabs = [{ id: ALL, name: '全部' }].concat(modList());
    els.modBar.replaceChildren();

    tabs.forEach(t => {
      const list = t.id === ALL ? all : all.filter(x => modOf(x) === t.id);
      const done = list.filter(x => x.done).length;
      const wrap = document.createElement('span');
      wrap.className = 'mod-wrap';

      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'mod' + (activeMod === t.id ? ' is-active' : '');
      btn.dataset.mod = t.id;
      btn.setAttribute('aria-pressed', String(activeMod === t.id));

      const nm = document.createElement('span');
      nm.className = 'mod__name';
      nm.textContent = t.name;
      const n = document.createElement('span');
      n.className = 'mod__n num';
      n.textContent = `${done}/${list.length}`;
      btn.append(nm, n);
      btn.setAttribute('aria-label', `${t.name}：${list.length} 项，完成 ${done} 项`);
      wrap.appendChild(btn);

      // 只有自定义模块、且正停在该模块上时才给删除键（「全部」「其他」不可删）
      if (activeMod === t.id && t.id !== ALL && t.id !== OTHER.id) {
        const del = document.createElement('button');
        del.type = 'button';
        del.className = 'mod__del';
        del.dataset.del = t.id;
        del.setAttribute('aria-label', `删除模块：${t.name}`);
        del.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" stroke-linecap="round"/></svg>';
        wrap.appendChild(del);
      }
      els.modBar.appendChild(wrap);
    });

    const add = document.createElement('button');
    add.type = 'button';
    add.className = 'mod mod--add';
    add.id = 'addModBtn';
    add.setAttribute('aria-label', '新增模块');
    add.textContent = '＋';
    els.modBar.appendChild(add);

    // 停在某个模块上时，新任务默认归入该模块
    if (activeMod !== ALL) els.modSelect.value = activeMod;
  }

  /* ---------- 渲染：任务行 ---------- */
  function rowEl(task, idx, withMod) {
    const li = document.createElement('li');
    li.className = 'row' + (task.done ? ' is-done' : '');
    li.dataset.id = task.id;

    const idxEl = document.createElement('span');
    idxEl.className = 'row__idx';
    idxEl.textContent = pad(idx + 1);
    idxEl.setAttribute('aria-hidden', 'true');

    const label = document.createElement('label');
    label.className = 'row__label';

    const input = document.createElement('input');
    input.type = 'checkbox';
    input.className = 'row__check';
    input.checked = !!task.done;
    input.dataset.id = task.id;
    input.setAttribute('aria-label', `${task.done ? '取消完成' : '标记完成'}：${task.text}`);

    const box = document.createElement('span');
    box.className = 'row__box';
    box.setAttribute('aria-hidden', 'true');

    const text = document.createElement('span');
    text.className = 'row__text';
    text.textContent = task.text;

    label.append(input, box, text);

    // 「全部」视图下给任务打上模块小签，否则分不清属于哪一块
    if (withMod) {
      const tag = document.createElement('span');
      tag.className = 'row__mod';
      tag.textContent = modName(modOf(task));
      label.classList.add('has-mod');
      label.appendChild(tag);
    }

    // 附链接：只在校验通过后才渲染，href 一律用规范化后的地址
    const href = safeLink(task.link);
    if (href) {
      const link = document.createElement('a');
      link.className = 'row__link';
      link.href = href;
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
      link.title = href;
      link.setAttribute('aria-label', `在新标签打开链接：${href}`);
      link.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8.5 15.5L15.5 8.5M9.5 8.5H15.5V14.5" stroke-linecap="round" stroke-linejoin="round"/></svg>';
      li.append(link);
    }

    const del = document.createElement('button');
    del.type = 'button';
    del.className = 'row__del';
    del.dataset.id = task.id;
    del.setAttribute('aria-label', `删除任务：${task.text}`);
    del.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" stroke-linecap="round"/></svg>';

    li.append(idxEl, label, del);
    return li;
  }

  function renderList() {
    const tasks = visibleTasks();
    els.taskList.replaceChildren();

    if (!tasks.length) {
      els.taskList.hidden = true;
      els.emptyState.hidden = false;
      els.emptyTitle.textContent = activeMod === ALL ? '这一天还没有落笔' : `${modName(activeMod)} · 这一天还没有落笔`;
      els.seedBtn.hidden = Object.keys(state.days).length > 0;   // 全新用户才给示例
    } else {
      els.emptyState.hidden = true;
      els.taskList.hidden = false;
      const frag = document.createDocumentFragment();
      tasks.forEach((t, i) => frag.appendChild(rowEl(t, i, activeMod === ALL)));
      els.taskList.appendChild(frag);
    }

    const done = tasks.filter(t => t.done).length;
    els.counter.textContent = `${done} / ${tasks.length}`;
    els.clearDoneBtn.hidden = done === 0;
    renderModBar();                                              // 模块计数跟着变
  }

  /* ---------- 渲染：计分条 ---------- */
  function renderTicker() {
    const total = countOf(selected);
    const done = doneOf(selected);
    const pct = total ? Math.round(done / total * 100) : 0;

    els.tDone.textContent = done;
    els.tTotal.textContent = '/ ' + total;
    els.tCap.textContent = selected === todayKey() ? '今日完成' : '当日完成';
    els.meterFill.style.width = pct + '%';
    els.meterWrap.setAttribute('aria-label', `完成度 ${pct}%`);

    // 连续完成：从今天（或昨天）往前，每天至少有 1 项已完成
    let streak = 0;
    let cursor = selected === todayKey() ? new Date() : parseKey(selected);
    if (doneOf(keyOf(cursor)) === 0) cursor = addDays(cursor, -1);
    while (doneOf(keyOf(cursor)) > 0) { streak++; cursor = addDays(cursor, -1); }

    // 本周（周一至今）完成率
    const mon = mondayOf(new Date());
    let wTotal = 0, wDone = 0;
    for (let i = 0; i < 7; i++) {
      const k = keyOf(addDays(mon, i));
      if (k > todayKey()) break;
      wTotal += countOf(k); wDone += doneOf(k);
    }
    const wPct = wTotal ? Math.round(wDone / wTotal * 100) : 0;

    let all = 0;
    for (const k in state.days) all += doneOf(k);

    els.sStreak.innerHTML = streak + '<span class="stat__u">天</span>';
    els.sStreak.classList.toggle('is-hot', streak >= 3);
    els.sWeek.innerHTML = (wTotal ? wPct : 0) + '<span class="stat__u">%</span>';
    els.sAll.textContent = all;
  }

  /* ---------- 渲染：点阵图 ---------- */
  function levelOf(total) {
    if (!total) return 0;
    if (total <= 2) return 1;
    if (total <= 4) return 2;
    if (total <= 7) return 3;
    return 4;
  }
  function ratioClass(total, done) {
    if (!total) return 'r-none';
    if (done === 0) return 'r-0';
    if (done >= total) return 'r-done';
    const r = done / total;
    return r < 0.34 ? 'r-1' : r < 0.67 ? 'r-2' : 'r-3';
  }

  function renderMatrix(withSweep) {
    const grid = els.matrixGrid;
    grid.replaceChildren();

    const today = todayKey();
    const startMon = addDays(mondayOf(new Date()), -(WEEKS - 1) * 7);
    const frag = document.createDocumentFragment();

    // 第 1 列：星期标签（只标 一 / 三 / 五 / 日，降低噪声）
    for (let r = 0; r < 7; r++) {
      const wd = document.createElement('span');
      wd.className = 'mx-wd';
      wd.style.gridColumn = '1';
      wd.style.gridRow = String(r + 2);
      wd.setAttribute('aria-hidden', 'true');
      wd.textContent = (r === 0 || r === 2 || r === 4 || r === 6) ? WD_LABEL[r] : '';
      frag.appendChild(wd);
    }

    // 月份标签 + 每一天的点
    let lastMonth = -1;
    let visibleIdx = 0;
    for (let c = 0; c < WEEKS; c++) {
      const colStart = addDays(startMon, c * 7);

      if (colStart.getMonth() !== lastMonth) {
        lastMonth = colStart.getMonth();
        const lab = document.createElement('span');
        lab.className = 'mx-month';
        lab.style.gridColumn = String(c + 2);
        lab.style.gridRow = '1';
        lab.setAttribute('aria-hidden', 'true');
        lab.textContent = (lastMonth + 1) + '月';
        frag.appendChild(lab);
      }

      for (let r = 0; r < 7; r++) {
        const date = addDays(colStart, r);
        const key = keyOf(date);
        const total = countOf(key);
        const done = doneOf(key);

        const cell = document.createElement('button');
        cell.type = 'button';
        cell.className = `cell lvl-${levelOf(total)} ${ratioClass(total, done)}`;
        cell.style.gridColumn = String(c + 2);
        cell.style.gridRow = String(r + 2);
        cell.dataset.key = key;
        if (key === today) cell.classList.add('is-today');
        if (key === selected) cell.classList.add('is-selected');
        if (key > today) cell.classList.add('is-future');
        // 对角扫过的序号：列 + 行
        cell.style.setProperty('--i', String(c * 3 + r));

        const d = date.getDate(), m = date.getMonth() + 1;
        cell.setAttribute('aria-label',
          total ? `${m}月${d}日 · ${total} 项，完成 ${done} 项` : `${m}月${d}日 · 无记录`);
        cell.title = total ? `${m}月${d}日 · ${total} 项 / 完成 ${done}` : `${m}月${d}日 · 无记录`;

        const dot = document.createElement('span');
        dot.className = 'cell__dot';
        cell.appendChild(dot);
        frag.appendChild(cell);
        visibleIdx++;
      }
    }

    grid.appendChild(frag);

    // 只有显式"生成"时才播放对角扫过动画；日常勾选不应整片闪动
    grid.classList.remove('reveal-run');
    if (withSweep) {
      void grid.offsetWidth;                 // 强制重排以重启动画
      grid.classList.add('reveal-run');
    }
  }

  /* ---------- 行为 ---------- */
  function addTask(text, linkRaw, modRaw) {
    const v = text.trim();
    if (!v) return;
    const link = safeLink(linkRaw);
    const badLink = !!(linkRaw && linkRaw.trim()) && !link;   // 填了但没通过校验
    const mod = ensureModules().some(m => m.id === modRaw) ? modRaw : OTHER.id;
    const day = dayOf(selected);
    const task = { id: 't' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6), text: v, mod, done: false, at: Date.now() };
    if (link) task.link = link;
    day.tasks.push(task);
    save();
    renderList();
    renderTicker();
    renderMatrix(false);
    announce(`已记录到「${modName(mod)}」：${v}` + (badLink ? '（链接无效已忽略，需以 http 或 https 开头）' : link ? '（已附链接）' : ''));
  }

  /** 提交一条新任务：取两个输入框与模块下拉的值，成功后清空并回到任务输入 */
  function submitComposer() {
    addTask(els.taskInput.value, els.linkInput.value, els.modSelect.value);
    els.taskInput.value = '';
    els.linkInput.value = '';
    els.taskInput.focus();
  }

  /* ---------- 模块：新增 / 删除 ---------- */
  function addModule() {
    if (ensureModules().length >= MOD_MAX) { announce(`模块最多 ${MOD_MAX} 个`); return; }
    const name = (prompt('新模块名称（最多 6 个字）') || '').trim();
    if (!name) return;
    if (name.length > 6) { announce('模块名称最多 6 个字'); return; }
    if (name === OTHER.name || modList().some(m => m.name === name)) { announce('已有同名模块'); return; }
    const id = 'm' + Date.now().toString(36) + Math.random().toString(36).slice(2, 4);
    state.modules.push({ id, name });
    save();
    activeMod = id;
    renderModOptions();
    renderList();
    announce(`已新增模块：${name}`);
  }

  function removeModule(id) {
    const list = ensureModules();
    const idx = list.findIndex(m => m.id === id);
    if (idx < 0) return;
    // 先数、再确认、确认后才改数据：取消时一个字都不动
    let n = 0;
    const each = fn => {
      for (const k in state.days) {
        const tasks = state.days[k] && Array.isArray(state.days[k].tasks) ? state.days[k].tasks : [];
        tasks.forEach(fn);
      }
    };
    each(t => { if (t.mod === id) n++; });
    const ok = confirm(n
      ? `模块「${list[idx].name}」下有 ${n} 条任务，删除后它们会归入「${OTHER.name}」。确定删除？`
      : `确定删除模块「${list[idx].name}」？`);
    if (!ok) return;
    each(t => { if (t.mod === id) t.mod = OTHER.id; });
    list.splice(idx, 1);
    save();
    activeMod = ALL;
    renderModOptions();
    renderList(); renderTicker(); renderMatrix(false);
    announce(n ? `已删除模块，${n} 条任务归入「${OTHER.name}」` : '已删除模块');
  }

  function toggleTask(id) {
    const day = peek(selected);
    if (!day) return;
    const t = day.tasks.find(x => x.id === id);
    if (!t) return;
    t.done = !t.done;
    save();

    // 就地更新，避免整表重绘打断"盖章"动画
    const li = els.taskList.querySelector(`li[data-id="${id}"]`);
    if (li) {
      li.classList.toggle('is-done', t.done);
      const input = li.querySelector('.row__check');
      input.setAttribute('aria-label', `${t.done ? '取消完成' : '标记完成'}：${t.text}`);
      if (t.done) {
        li.classList.add('just-done');
        setTimeout(() => li.classList.remove('just-done'), 700);
      }
    }
    renderListCounterOnly();
    renderTicker();
    renderMatrix(false);
    announce(t.done ? `完成：${t.text}` : `撤销完成：${t.text}`);
  }

  function renderListCounterOnly() {
    const tasks = visibleTasks();
    const done = tasks.filter(t => t.done).length;
    els.counter.textContent = `${done} / ${tasks.length}`;
    els.clearDoneBtn.hidden = done === 0;
    renderModBar();                                              // 模块计数跟着变
  }

  function deleteTask(id) {
    const day = peek(selected);
    if (!day) return;
    const t = day.tasks.find(x => x.id === id);
    day.tasks = day.tasks.filter(x => x.id !== id);
    if (!day.tasks.length) delete state.days[selected];
    save();
    renderList(); renderTicker(); renderMatrix(false);
    announce(t ? `已删除：${t.text}` : '已删除');
  }

  function selectDay(key) {
    selected = key;
    renderHeader(); renderList(); renderTicker(); renderMatrix(false);
    // 仅在宽屏自动聚焦输入框；触屏聚焦会弹出键盘、打断浏览
    if (window.matchMedia('(min-width: 721px)').matches) els.taskInput.focus({ preventScroll: true });
  }

  function seedDemo() {
    const pool = [
      '整理会议纪要','修复 WebSocket 断连','写周报','代码评审','跑通 CI 流水线',
      '读一篇论文','回复客户邮件','优化 SQL 慢查询','设计评审','补充单元测试',
      '复盘线上故障','更新接口文档','1v1 沟通','需求拆解','压测报告',
      '清理技术债','参加站会','画一版交互稿','体检预约','读书 30 页',
      '跑步 5 公里','给家里打个电话','买菜做饭','整理桌面'
    ];
    const today = new Date();
    for (let back = 63; back >= 0; back--) {
      const date = addDays(today, -back);
      const key = keyOf(date);
      const skip = date.getDay() === 0 ? 0.55 : 0.12;      // 周日多半休息
      if (Math.random() < skip) continue;
      const n = 1 + Math.floor(Math.random() * 7);
      const day = dayOf(key);
      for (let i = 0; i < n; i++) {
        const text = pool[Math.floor(Math.random() * pool.length)];
        if (day.tasks.some(t => t.text === text)) continue;
        // 越接近今天完成度越高，历史偶有"空白的一天"
        const p = 0.28 + (1 - back / 64) * 0.5;
        day.tasks.push({
          id: 'd' + key.replace(/-/g, '') + i,
          text,
          mod: ensureModules()[Math.floor(Math.random() * ensureModules().length)].id,
          done: Math.random() < p,
          at: Date.now()
        });
      }
    }
    save();
    renderList(); renderTicker(); renderMatrix(true);
    announce('已填入一段示例记录，点阵图已生成');
  }

  /* ---------- 事件 ---------- */
  els.addBtn.addEventListener('click', submitComposer);
  els.taskInput.addEventListener('keydown', e => {
    if (e.key === 'Enter') { e.preventDefault(); submitComposer(); }
  });
  els.linkInput.addEventListener('keydown', e => {
    if (e.key === 'Enter') { e.preventDefault(); submitComposer(); }
    if (e.key === 'Escape') { els.linkInput.value = ''; els.taskInput.focus(); }
  });

  els.taskList.addEventListener('change', e => {
    const input = e.target.closest('.row__check');
    if (input) toggleTask(input.dataset.id);
  });
  els.taskList.addEventListener('click', e => {
    const del = e.target.closest('.row__del');
    if (del) deleteTask(del.dataset.id);
  });

  els.clearDoneBtn.addEventListener('click', () => {
    const day = peek(selected);
    if (!day) return;
    // 只清当前模块视图里的已完成项；「全部」视图下行为与过去一致
    const hit = t => t.done && (activeMod === ALL || modOf(t) === activeMod);
    const n = day.tasks.filter(hit).length;
    day.tasks = day.tasks.filter(t => !hit(t));
    if (!day.tasks.length) delete state.days[selected];
    save(); renderList(); renderTicker(); renderMatrix(false);
    announce(activeMod === ALL ? `已清除 ${n} 条已完成任务` : `已清除「${modName(activeMod)}」下 ${n} 条已完成任务`);
  });

  els.modBar.addEventListener('click', e => {
    if (e.target.closest('#addModBtn')) { addModule(); return; }
    const del = e.target.closest('[data-del]');
    if (del) { removeModule(del.dataset.del); return; }
    const tab = e.target.closest('[data-mod]');
    if (!tab) return;
    const id = tab.dataset.mod;
    if (id === activeMod) return;
    activeMod = id;
    renderList();
    if (window.matchMedia('(min-width: 721px)').matches) els.taskInput.focus({ preventScroll: true });
    announce(id === ALL ? '已切换到全部任务' : `已切换到模块：${modName(id)}`);
  });

  els.matrixGrid.addEventListener('click', e => {
    const cell = e.target.closest('.cell');
    if (cell) selectDay(cell.dataset.key);
  });

  els.genBtn.addEventListener('click', () => {
    renderMatrix(true);
    announce('点阵图已重新生成');
  });

  els.seedBtn.addEventListener('click', seedDemo);

  els.prevDay.addEventListener('click', () => selectDay(keyOf(addDays(parseKey(selected), -1))));
  els.nextDay.addEventListener('click', () => selectDay(keyOf(addDays(parseKey(selected), 1))));
  els.todayBtn.addEventListener('click', () => selectDay(todayKey()));

  els.wipeBtn.addEventListener('click', () => {
    if (!confirm('确定清空全部记录？此操作不可撤销。')) return;
    state = { version: 1, days: {}, modules: ensureModules() };   // 模块是配置不是记录，清空时保留
    selected = todayKey();
    save(); renderHeader(); renderList(); renderTicker(); renderMatrix(true);
    announce('已清空全部记录');
  });

  /* ---------- 主题 ---------- */
  function applyTheme(t) {
    document.documentElement.dataset.theme = t;
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.content = t === 'dark' ? '#14120F' : '#F2ECE1';
  }
  const savedTheme = localStorage.getItem(THEME_KEY);
  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  applyTheme(savedTheme || (prefersDark ? 'dark' : 'light'));
  els.themeBtn.addEventListener('click', () => {
    const next = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark';
    applyTheme(next);
    localStorage.setItem(THEME_KEY, next);
  });

  /* ---------- 入场序列 ---------- */
  function playIntro() {
    document.querySelectorAll('.reveal').forEach(el => el.classList.add('is-in'));
    // 点阵图默认横向滚到最新一周
    const sc = els.matrixScroll;
    requestAnimationFrame(() => { sc.scrollLeft = sc.scrollWidth; });
  }

  /* ---------- 启动 ---------- */
  ensureModules();
  renderModOptions();
  renderHeader();
  renderList();
  renderTicker();
  renderMatrix(true);
  playIntro();

  // 跨零点自动回到"今天"
  setInterval(() => {
    const t = todayKey();
    if (selected === t || document.activeElement === els.taskInput) return;
    if (!els.__lastToday) { els.__lastToday = t; return; }
    if (els.__lastToday !== t) { els.__lastToday = t; selectDay(t); }
  }, 60000);
  els.__lastToday = todayKey();
})();
