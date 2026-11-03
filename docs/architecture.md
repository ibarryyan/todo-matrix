# todo-matrix 架构说明

> **编写原则**：本文以 `scripts/main.js`、`index.html`、`styles/*.css` 当前实际代码为准。
> 未从源码确认的内容一律标注 `[待确认]`，不做推测性设计。
> 发现文档与代码冲突时，以代码为准，并在 `lessons.md` 记录。

**代码基线**：`index.html` 177 行 / `scripts/main.js` 523 行 / `styles/tokens.css` 120 行 /
`styles/base.css` 109 行 / `styles/components.css` 724 行。（TASK-002 附链接之后）

---

## 1. 项目整体结构

一个**单页、零依赖、无构建**的静态应用。三层清晰分离：

```
结构层  index.html        —— 语义化骨架，所有可交互元素带 id，供 JS 直接 querySelector/getElementById
表现层  styles/*.css      —— 令牌 → 基础 → 组件，三层单向依赖
逻辑层  scripts/main.js   —— 单个 IIFE，内部按「日期工具 / 状态 / DOM / 渲染 / 行为 / 事件 / 主题 / 启动」分节
存储层  localStorage      —— 两个独立键，无后端、无同步、无多标签页通信
```

**无模块系统**：`main.js` 以 `<script src="scripts/main.js"></script>`（非 `type="module"`）
引入，整个逻辑包在一个 IIFE 内，除 `window` 外不向全局暴露任何符号。

## 2. 各目录和文件的职责

| 路径 | 职责 |
|---|---|
| `index.html` | 页面结构：报头（巨大日期 + 日期切换 + 主题切换）、今日台账（输入框 + 清单 + 空态）、计分条（统计）、点阵图（18 周网格 + 图例）、页脚（存储说明 + 清空全部记录）。末尾有 `<p class="sr-only" id="live" role="status" aria-live="polite">` 用于无障碍播报。 |
| `styles/tokens.css` | 定义 `:root` 全部设计令牌：纸面色阶（`--paper` / `--paper-deep` / `--surface` / `--surface-2` / `--surface-sunk`）、墨色（`--ink` / `--ink-2` / `--ink-muted`）、线（`--rule` / `--rule-strong` / `--ledger`）、强调色（`--accent` / `--accent-deep` / `--accent-wash`）、点阵墨阶（`--dot-empty` / `--dot-1..4` / `--dot-done`，其中 `--dot-done: var(--accent)`）、焦点色、四组字体、字阶 `--fs-00..08` 与 `--fs-mega`、间距 `--sp-1..9`、圆角、三级阴影、动效时长与缓动、构成（`--gutter` / `--shell` / `--cell`）。**并包含 `[data-theme="dark"]` 的全部覆盖值。** |
| `styles/base.css` | 盒模型重置、页面底色与字体、两个氛围层（`body::before` 渐变网格、`body::after` 点阵底纹 + mask 渐隐）、`.grain` 噪点层（内联 SVG turbulence，`mix-blend-mode` 在暗色下切 `screen`）、标题/段落/列表重置、`.num` 等宽数字、`:focus-visible` 全局焦点样式、`.sr-only`、`.reveal` 入场序列（含 `data-delay` 1/2/3 → 90/180/270ms）、`prefers-reduced-motion` 全局降级。 |
| `styles/components.css` | `.shell` 外壳、`.masthead` 报头（含 `::after` 账本双红线，右侧留 14% 破格）、`.board` 主栅格（`1.62fr : 0.9fr`，`matrix` 跨列）、`.panel` 面板（含四角订线括号）、`.composer` 输入区、`.btn-add`、`.row` 台账行（等宽序号 + 戳印方框 + 朱红删线扫过 + `just-done` 盖章回弹 `stamp 620ms`）、`.empty` 空态、`.ticker` 计分条、`.meter` 进度条、`.stats` 统计格、`.matrix` 点阵图（`dotPop 520ms`，延迟 `var(--i) * 5ms`）、`.legend-*` 图例、`.btn-ghost`、`.footline` 页脚、`@media` 响应式（1080 / 720 / 380 / hover:none）。 |
| `scripts/main.js` | 全部逻辑，单 IIFE。内含：常量、日期工具、链接工具（`safeLink`）、状态与持久化、DOM 引用表 `els`、四个渲染函数、行为函数、事件绑定、主题、入场、启动。详见下文各节。 |
| `README.md` | **对外发布版**（187 行）：徽章 + GitHub Pages Demo 链接、「它解决什么问题」、「点阵图怎么读」、「特性」、「快速开始」（含 Python http.server 与 Nginx 部署片段）、「目录结构」、「设计说明」、「可访问性」、「数据存在哪儿」（**含控制台手工备份方案**）、「已知限制」、「贡献」、「License」。**面向 GitHub 访客与贡献者，非开发规格文档。** |
| `docs/design-notes.md` | **内部设计与自检规格**（原为 2026-11-01 之前的根目录 `README.md`，116 行）。含：定调说明（Design Direction 决策表）、功能表、构成与响应式（三档断点）、动效规格表、可访问性自检、**反 AI 味清单自检**。视觉开发以此为准。 |
| `docs/preview.svg` | README 中引用的点阵图预览插图（159 行 SVG），非运行时资源。 |
| `LICENSE` | MIT 许可证（21 行）。 |
| `.gitignore` | macOS（`.DS_Store` 等）、编辑器（`.vscode/` `.idea/` `*.swp`）、`node_modules/` `dist/` `build/`、`*.log`。 |

> **README 与设计文档的分工**：`README.md` 对外，`docs/design-notes.md` 对内。
> 两者**内容不重叠**，改动时须判断归属，避免重复维护（见 `lessons.md` 2026-11-01）。

## 3. 应用启动流程

`main.js` 末尾（第 470–484 行）按以下顺序同步执行：

```
1. 常量与工具函数定义（STORE_KEY / THEME_KEY / WEEKS=18 / CN_NUM / WEEK_CN / WD_LABEL / LEDES）
2. let state = load() || { version: 1, days: {} }      ← 从 localStorage 读取，失败则用空状态
3. let selected = todayKey()                          ← 当前选中日期，默认今天
4. const els = { ... }                                ← getElementById 一次性缓存全部 DOM 引用
5. 主题初始化：
   savedTheme = localStorage.getItem('dotledger.theme')
   prefersDark = matchMedia('(prefers-color-scheme: dark)').matches
   applyTheme(savedTheme || (prefersDark ? 'dark' : 'light'))   ← 手动选择优先，其次跟随系统
6. 事件绑定（addBtn / taskInput / taskList×2 / clearDoneBtn / matrixGrid / genBtn /
            seedBtn / prevDay / nextDay / todayBtn / wipeBtn / themeBtn）
7. 首次渲染：renderHeader() → renderList() → renderTicker() → renderMatrix(true)   ← true = 播放对角扫过
8. playIntro()：给所有 .reveal 加 .is-in；requestAnimationFrame 里把点阵图横向滚到最右（最新一周）
9. 注册 setInterval(60000)：跨零点时自动把选中日期切回今天
   （跳过条件：当前已选今天 / 焦点在输入框；用 els.__lastToday 记录上一天）
10. els.__lastToday = todayKey()
```

> 注意：`index.html` 上 `<html data-theme="light">` 是硬编码初值，真正的主题由第 5 步决定。

## 4. 核心业务模块

### 4.1 日期工具（第 24–32 行）

| 函数 | 作用 |
|---|---|
| `pad(n)` | 补零到两位 |
| `keyOf(d)` | `Date` → `'YYYY-MM-DD'`（**本地时区**） |
| `parseKey(k)` | `'YYYY-MM-DD'` → `Date`（本地时区，不做合法性校验） |
| `addDays(d, n)` | 日期加减，返回新 `Date`（不改原对象） |
| `todayKey()` | 今天的 key |
| `mondayOf(d)` | 取当天所在**周一**，并归零时分秒 |
| `cnMonth(m)` | 月份 → 中文（如 `十月`），仅覆盖 1–12 |

### 4.1.1 链接工具（第 34–44 行）

`safeLink(raw)`：`trim()` → 空返回 `null` → 无 `scheme://` 前缀时补 `https://` → `new URL()` 解析
（失败返回 `null`）→ 协议必须是 `http:` / `https:`（否则 `null`）→ 返回 `u.href`。

**写入与渲染共用这一个函数**：`addTask()` 用它决定是否写 `link` 字段，`rowEl()` 用它决定是否渲染
`<a class="row__link">` 及其 `href`。这样即使存储里被塞进 `javascript:` 之类的脏数据，也拼不出可执行的 `href`。

### 4.2 状态与持久化（第 53–78 行）

- `state`：内存中的唯一数据源，形状为 `{ version, days }`。
- `peek(k)`：取某天数据，**不存在返回 `null`，不创建**。
- `dayOf(k)`：取某天数据，**不存在则创建** `{ tasks: [] }`；若 `tasks` 不是数组则修复为 `[]`。
- `countOf(k)` / `doneOf(k)`：某天任务总数 / 已完成数（不存在的天返回 0）。

### 4.3 行为（第 291–388 行）

| 函数 | 行为 |
|---|---|
| `addTask(text, linkRaw)` | trim 后为空则忽略；`safeLink(linkRaw)` 规范化链接（非法则忽略链接、照常记任务）；用 `dayOf(selected)` 创建当天；生成 id；`push` → `save()` → `renderList()` → `renderTicker()` → `renderMatrix(false)` → `announce()` |
| `submitComposer()` | 取「任务文本 + 链接」两个输入框的值 → `addTask` → 清空两个输入框 → 焦点回到任务输入框；供按钮点击与两个输入框的 Enter 共用 |
| `toggleTask(id)` | 就地翻转 `done` → `save()`；**不整表重绘**，只切 `is-done` 类、更新 aria-label、加 `just-done` 并在 700ms 后移除；再 `renderListCounterOnly()` / `renderTicker()` / `renderMatrix(false)` |
| `deleteTask(id)` | 过滤移除；若当天无任务则 `delete state.days[selected]` → `save()` → 三个渲染 → `announce()` |
| `selectDay(key)` | 切换选中日期 → 四个渲染；`min-width: 721px` 时才 `focus()` 输入框（避免触屏弹键盘） |
| `seedDemo()` | 随机生成最近 64 天示例数据（周日大概率跳过），`save()` → 三个渲染（含 sweep）→ `announce()` |
| `clearDoneBtn` | 清除当天已完成项；空则删除该天键；`confirm()` 未参与（直接执行，由按钮可见性控制） |
| `wipeBtn` | **`confirm()` 二次确认** → 重置 `state = { version: 1, days: {} }`、`selected = todayKey()` → `save()` → 四个渲染（含 sweep） |

> 现状说明：清除已完成与清空全部记录对 `state.days` 的影响不同 —— 前者只删当前选中天，
> 后者清空全部。两者都不会触碰 `dotledger.theme`。

### 4.4 事件绑定方式

统一采用 **事件委托**：
- `els.taskList` 上监听 `change`（勾选框）与 `click`（删除按钮），用 `closest()` 定位目标。
- `els.matrixGrid` 上监听 `click`，用 `closest('.cell')` 定位日期格。
- 其余按钮直接绑定在各自元素上。

## 5. 数据结构

### 5.1 内存与存储中的完整结构

```
state = {
  version: 1,                       // 数字，当前固定为 1
  days: {                           // 对象，key 为 'YYYY-MM-DD'
    'YYYY-MM-DD': {
      tasks: [                      // 数组
        {
          id:   string,             // 非空，文件内唯一
          text: string,             // 任务文本，非空，长度受输入框 maxlength=120 限制
          link: string,             // 【TASK-002 新增】可选；规范化后的 http(s) 完整地址，无链接时不写该字段
          done: boolean,            // 完成状态
          at:   number              // 创建时间戳，Date.now()
        }
      ]
    }
  }
}
```

### 5.2 各字段的生成来源（源码确认）

| 字段 | 来源 | 生成规则 |
|---|---|---|
| `version` | `main.js:35` 兜底 `{ version: 1, days: {} }` | 固定 `1`；`load()` 不校验它，也不做迁移 |
| `days` 的键 | `keyOf(date)` | 本地时区的 `YYYY-MM-DD` |
| `id`（新增） | `main.js:296` | `'t' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6)` |
| `id`（示例） | `main.js:378` | `'d' + key.replace(/-/g, '') + i` |
| `text` | `addTask` 参数 | 经 `trim()`；输入框 `maxlength="120"` |
| `link` | `addTask` 第二参数（可选） | 经 `safeLink()`：无 `scheme://` 前缀补 `https://`，`new URL()` 解析且协议为 `http:` / `https:` 才保留；不通过时不写该字段（规范化函数 `safeLink` 在 `main.js:34-44`，写入点在 `addTask`，`main.js:325`） |
| `done` | 新增时 `false` | 由 `toggleTask` 翻转 |
| `at` | `Date.now()` | 毫秒时间戳 |

### 5.3 派生数据（不落盘，每次渲染计算）

- 某天任务量等级 `levelOf(total)`：`0→0`、`1–2→1`、`3–4→2`、`5–7→3`、`8+→4`（对应 class `lvl-0..lvl-4`
  与圆点直径 9/11/14/17/20px）。
- 某天完成度 `ratioClass(total, done)`：无记录 `r-none`；完成 0 `r-0`；全完成 `r-done`；
  否则按 `done/total` 分 `r-1(<0.34)` / `r-2(<0.67)` / `r-3`。
- 连续完成天数：从选中日（或前一天，若选中日无完成项）往前，逐日检查 `doneOf > 0` 计数。
- 本周完成率：以**今天所在周的周一**为起点，累加到今天（跳过未来日期）的 `wDone / wTotal`。
- 累计盖章：遍历 `state.days` 累加 `doneOf`。

## 6. localStorage 持久化机制

### 6.1 两个键，互不干扰

| 键 | 内容 | 写入时机 | 读取时机 |
|---|---|---|---|
| `dotledger.v1` | `JSON.stringify(state)` | `save()`：任何数据变更后立即调用 | `load()`：IIFE 初始化时**只调一次** |
| `dotledger.theme` | `'light'` / `'dark'` 字符串 | 点击主题切换按钮时 | IIFE 初始化时**只调一次** |

> **重要**：数据操作与主题配置完全隔离。导入 / 导出 / 清空数据都不得读写 `dotledger.theme`。

### 6.2 `load()`（第 38–45 行）

```js
const raw = localStorage.getItem(STORE_KEY);
if (!raw) return null;
const data = JSON.parse(raw);
return (data && typeof data.days === 'object') ? data : null;
```

- `try...catch` 包裹，任何异常（无 `localStorage`、JSON 损坏）返回 `null` → 落到空状态兜底。
- **校验很弱，已知缺口**：
  1. 只判断 `typeof data.days === 'object'`，而 `typeof null === 'object'`，因此
     `{"days": null}` 会**通过校验**并在后续 `state.days[k]` 访问时抛错。
  2. **不校验** `version` 的值，也不做版本迁移。
  3. **不校验** `days` 的键格式（是否为合法的 `YYYY-MM-DD` 真实日期）。
  4. **不校验** `tasks` 是否为数组、`task` 各字段的类型与合法性。
  5. 不处理 `data` 为数组或基本类型的情况（`typeof [] === 'object'` 亦会通过）。
- 兜底路径：`dayOf()` 中会修复「`tasks` 不是数组」的情况，但仅在访问某天时生效。

### 6.3 `save()`（第 46–49 行）

```js
try { localStorage.setItem(STORE_KEY, JSON.stringify(state)); }
catch { announce('本地存储不可用，本次记录不会被保存'); }
```

- **当前模式是「先改内存、再落盘」**：所有行为函数都先修改 `state`，再调 `save()`。
- 因此当 `localStorage` 写入失败（隐私模式、配额超限）时，**内存已被修改，磁盘未被修改**，
  二者不一致；只做了一次 `announce` 提示，未回滚。
- 这一现状是 `tasks/TASK-001.md` 中「写入优先」要求的出发点。

## 7. 主要渲染流程

四个渲染函数各自负责一块区域，**彼此独立、可单独调用**，行为函数按需组合调用：

```
renderHeader()   ← selected
  └ 大日期数字 / 中文年月 / 星期 / 台账标题（今日台账 | 补记·X月X日 | 预先安排·X月X日）
    / 日期 key / 今天按钮禁用态 / 按日期 hash 稳定选取提示语（LEDES 5 条）

renderList()     ← state.days[selected]
  └ 无任务：隐藏 <ol>，显示空态；空态里的示例按钮仅在「全新用户」(Object.keys(state.days).length === 0) 时显示
    有任务：隐藏空态，DocumentFragment 批量构建 <li class="row">（序号 / 戳印方框 / 文本 / 链接键（有链接时） / 删除键）
  └ 更新计数 "done / total" 与「清除已完成」按钮可见性

renderTicker()   ← state.days（全量）
  └ 今日完成 done / total、进度条宽度、aria-label；连续完成天数（≥3 加 is-hot）；本周完成率；累计盖章

renderMatrix(withSweep) ← state.days（全量）
  └ 起点 = 本周一 - (18-1)*7 天；网格 = 1 列星期标签 + 18 列日期，每格一个 <button class="cell">
    每格带 lvl-* / r-* / is-today / is-selected / is-future 类、--i（= 列*3 + 行）、aria-label、title
  └ withSweep 为 true 时：移除再添加 .reveal-run（中间强制 offsetWidth 重排）以重放 dotPop 对角扫过
```

**调用约定**：
- 新增 / 删除 / 清除 → `renderList() + renderTicker() + renderMatrix(false)`
- 勾选 → `renderListCounterOnly() + renderTicker() + renderMatrix(false)`（**避免整表重绘打断盖章动画**）
- 切换日期 / 启动 / 清空 / 示例 → 四个全渲染（`renderMatrix(true)`）
- DOM 更新一律走 `textContent`（任务文本）或常量 `innerHTML`（统计数值、SVG 图标）。

## 8. 主题管理机制

- **载体**：`<html data-theme="light|dark">`。
- **样式**：所有颜色均为 `--*` 令牌；`tokens.css` 中 `[data-theme="dark"]` 覆盖同一组令牌，
  因此**组件样式无需任何主题分支**（`base.css` 里 `.grain` 与 `body::after` 是仅有的两处显式暗色覆盖）。
- **`applyTheme(t)`**：
  1. 设置 `document.documentElement.dataset.theme = t`
  2. 同步 `<meta name="theme-color">`：`dark` → `#14120F`，否则 `#F2ECE1`
- **初始化优先级（第 453–455 行）**：`localStorage['dotledger.theme']` > `prefers-color-scheme` 系统偏好 > `light`。
- **切换（第 456–460 行）**：点击按钮取反当前 `data-theme` → `applyTheme` → 写入 `localStorage`。
- **不监听**系统主题的实时变化（仅首次加载读取一次）。

## 9. 当前系统的技术限制

以下均从现有代码推导，非推测：

1. **无构建与无模块系统**：单个非 module `<script>` + 一个 IIFE，无法跨文件 `import`。
   新增逻辑要么塞进 `main.js`，要么新增 `<script>`（会引入全局变量，需谨慎）。
2. **无测试框架、无 lint、无 CI**：验收只能靠人工按任务用例执行。
3. **无数据版本迁移**：`version` 字段存在但**从未被校验或使用**。
4. **`load()` 校验极弱**：见 6.2 —— 这是导入功能必须自行补齐严格校验的直接原因。
5. **存储失败不回滚**：`save()` 失败只 `announce`，内存与磁盘可能长期不一致（见 6.3）。
6. **未检测存储配额**：未对 `days` 规模或 `localStorage` 剩余容量做任何上限判断。
7. **单设备、单浏览器**：无账号、无同步；**未监听 `storage` 事件**，多标签页同时打开会互相覆盖。
8. **依赖本地时区**：所有日期键基于 `new Date()` 的本地时区；跨时区或系统时间变更会导致记录错位。
9. **外部资源依赖**：`index.html` 从 `fonts.googleapis.com` / `fonts.gstatic.com` 加载
   Archivo Black、IBM Plex Sans / Mono、Noto Sans SC、Noto Serif SC。
   离线或字体加载失败时回退到 `Songti SC` / `PingFang SC` 等系统字体。
   —— **与 `README.md`「纯本地，不联网」的表述存在冲突**。
10. **点阵图窗口固定 18 周**（`WEEKS = 18` 常量）：更早的数据仍保存在 `state.days` 中，只是不展示。
11. **无撤销能力**：删除任务、清除已完成、清空全部记录均无撤销；仅清空全部记录有 `confirm()`。
12. **无错误上报**：异常仅通过 `announce()` 做无障碍播报，用户可见性弱（`.sr-only`）。
13. **无 TypeScript / JSDoc 类型约束**：数据结构仅靠文件头注释维护。
14. **未监听 `storage` 事件**：多标签页同时打开会互相覆盖写入（仓库两处均未处理）。
15. **CSS 中存在少量硬编码色值**：`components.css` 的 `.btn-add` 前景色 `#FFF8F2`、
    `.row__box::after` 勾线 `#FFF8F2`、`.empty__grid` 的 mask `#000` 未走令牌，
    不受 `tokens.css` 暗色覆盖影响（这三处颜色在明暗下均需保持，实际影响有限）。
    —— 注意这与远程 `README.md:107`「组件层没有一个硬编码色值」的表述**不符**。

## 10. 待确认事项

- `[已解决 2026-11-01]` 仓库已 `git init` 并接入远程
  `https://github.com/ibarryyan/todo-matrix`，默认分支 **`master`**（非 `main`），基线提交 `ded4606`。
- `[待确认]` 是否保留 `index.html` 的 Google Fonts CDN 依赖。
  远程 `README.md:165` 已在「已知限制」中明确承认该依赖并说明降级方案 ——
  即**远程侧已接受此现状**，除非另有决定，**维持现状不动**。
- `[待确认]` `version` 字段的演进策略：是否需要为未来版本预留迁移函数。
- `[待确认]` 多标签页并发写入是否需要处理（新增 `storage` 事件监听）。
- `[已决定 2026-11-01]` 本地协作文档（`AGENTS.md` / `docs/design-notes.md` /
  `docs/architecture.md` / `tasks/` / `lessons.md`）已纳入 Git 并推送（提交 `5c6f807`）。
  `.workbuddy/`（本地工具数据）已加入 `.gitignore`，不入库。
- 任务级待确认项见 `tasks/TASK-001.md`。

---

## 11. 与远程 `README.md`（187 行）的一致性核对

2026-11-01 接入远程后重新核对，结果如下（`README.md` 行号为远程版行号）：

| # | README 表述 | 代码实际情况 | 结论 |
|---|---|---|---|
| 1 | L165 「依赖 Google Fonts CDN；加载失败时回退到 PingFang SC / Songti SC」 | 与 `index.html:10-12` 及 `tokens.css` 字体栈一致 | ✅ 准确（远程版已修正本地旧版的「不联网」错误表述） |
| 2 | L107 「组件层没有一个硬编码色值」 | `components.css` 存在 `#FFF8F2` ×2、mask `#000` ×1 | ❌ **不符**，已记录于限制 15，修正待确认 |
| 3 | L121 「页面入场（4 组错峰 90ms）」 | 4 个 `.reveal` 元素，`data-delay` 三档 90/180/270ms；但 `base.css:86` 注释写「3 组」 | ⚠️ 注释与文档轻微不一致，行为无影响 |
| 4 | L148–155 「手动备份，在浏览器控制台执行 `copy(localStorage.getItem('dotledger.v1'))`」 | 当前确实无导出 UI | ✅ 准确，但**是 TASK-001 要消除的痛点**；实现后须同步更新此段与 L164「没有数据导出按钮」 |
| 5 | L103 「`main.js` 约 18KB」 | 实际 18,346 字节 ≈ 17.9KB | ✅ 准确 |
| 6 | L166 「点阵图回溯 18 周，更早的记录不会显示」 | `WEEKS = 18`；更早数据仍在 `state.days` 中只是不渲染 | ✅ 准确 |
| 7 | L93–109 目录结构 | 原未列出 `docs/preview.svg`；2026-11-01 已在提交 `5c6f807` 中补全 `docs/`、`tasks/`、`AGENTS.md`、`lessons.md`，并加注「对外 README vs 对内 design-notes」的分工说明 | ✅ 已修正 |
| 8 | L132–137 可访问性 | 与代码实现一致（44px、`focus-visible` 2px+2px、`role="status"`、三通道冗余） | ✅ 准确 |
| 9 | L117–126 动效规格 | 与 `components.css` 的 `--dur-*` / `stamp 620ms` / `dotPop 520ms` 完全一致 | ✅ 准确 |
