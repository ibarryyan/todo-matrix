# AGENTS.md — todo-matrix 通用协作规则

所有参与本项目的 Agent（Developer / Reviewer / WorkBuddy）在动手前必须先读本文件与
[`docs/architecture.md`](docs/architecture.md)。文档与代码冲突时，**以当前代码为准**，并在
[`lessons.md`](lessons.md) 中记录差异。

## 0. 仓库信息

- **远程**：`https://github.com/ibarryyan/todo-matrix`（GitHub Pages Demo：`https://ibarryyan.github.io/todo-matrix/`）
- **默认分支**：`master`（**不是 `main`**）
- **同步方式**：`git pull origin master` / `git push origin master`
- 远端 branches 目前只有 `master`。

---

## 1. 项目简介与技术栈

- **项目名**：日程记 · 点阵台账（内部代号 `todo-matrix`）
- **一句话**：每天写一份待办清单，完成即盖章，用点阵图看见自己的节奏。
- **技术栈**：**原生 HTML + CSS + JavaScript**。无框架、无 npm、无构建、无打包器、无 TypeScript。
- **运行方式**：直接双击 `index.html`，或 `python3 -m http.server` 后访问。**无需构建步骤**。
- **持久化**：`localStorage`，两个独立键（见 `docs/architecture.md`）。**纯本地，无后端、无账号、无同步**。
- **设计方向**：`工业实用 Industrial utilitarian × 印刷账簿 print ledger`，纸墨底色 + 印泥朱红单一强调色。
  视觉规格（配色 / 字阶 / 动效 / 响应式断点）以 **`docs/design-notes.md`** 为准
  （不是根目录 `README.md`，后者是对外发布版）。

## 2. 项目现有目录结构

```
todo-matrix/
├── index.html            页面结构（报头 / 台账 / 计分条 / 点阵图 / 页脚），全部元素带 id
├── styles/
│   ├── tokens.css        设计令牌（颜色 / 字阶 / 间距 / 圆角 / 阴影 / 动效）+ [data-theme="dark"] 覆盖
│   ├── base.css          重置、氛围层（渐变网格 / 点阵底纹 / 颗粒噪点）、排版、焦点、动效降级
│   └── components.css    外壳 / 报头 / 台账行 / 计分条 / 点阵图 / 响应式
├── scripts/
│   └── main.js           全部逻辑：日期工具、状态、渲染、事件、主题（单个 IIFE）
├── docs/
│   ├── architecture.md   架构说明（以代码为准）
│   ├── design-notes.md   内部设计与自检规格（定调 / 响应式 / 动效 / 可访问性 / 反 AI 味清单）
│   └── preview.svg       README 用的点阵图预览图
├── tasks/
│   └── TASK-001.md       任务契约
├── LICENSE               MIT
├── .gitignore            macOS / 编辑器 / node_modules / dist / *.log
├── README.md             **对外发布版**（徽章 / Demo / 快速开始 / 特性 / 贡献 / License）
├── AGENTS.md             本文件
└── lessons.md            多 Agent 协作经验记录
```

> **两份 README 的区分（重要）**
> - 根目录 `README.md` —— 面向 GitHub 访客与贡献者的**发布版**（跟随远程维护）。
>   其中**不含**视觉规格 / 动效 / 响应式 / 自检清单，改这几项请改 `docs/design-notes.md`。
> - `docs/design-notes.md` —— 面向开发者的**内部设计与自检规格**。
> 两者职责不同，**不要互相抄写或重复**（参见 `lessons.md` 2026-11-01 记录）。

**分层约定（必须保持）**：`tokens.css`（变量）→ `base.css`（基础与氛围）→ `components.css`（组件）。
暗色主题只改 `tokens.css`，组件代码一行不动。

**颜色一律走 `--*` 令牌**（含新增代码）。现状说明：`components.css` 中仍存在少量硬编码色值
—— `.btn-add` 前景色 `#FFF8F2`、`.row__box::after` 勾线 `#FFF8F2`、`.empty__grid` 的 mask `#000`。
这属于既有代码，**本次不在无授权情况下改动**；新增样式不得再引入硬编码。

## 3. 代码修改约束

1. **小步修改**：一次只做一件事，一个提交只对应一个任务的一个逻辑变更。
2. **禁止无关重构**：不重命名既有函数/变量、不调整代码格式、不"顺手优化"未涉及的模块。
   如果确实需要重构，先开独立任务并在任务描述中说明理由。
3. **不修改未授权文件**：只改任务「涉及文件」清单里列出的文件。
4. **不动业务语义**：现有统计口径（连续完成、本周完成率、累计盖章）、动效时长、响应式断点，
   未经明确要求不得变更。
5. **不改 UI 交互模式**：新增功能沿用现有模式（原生事件 + 事件委托 + `announce()` 播报），
   不引入新的交互范式。
6. **保持零依赖**：不引入任何第三方库、CDN 资源或 npm 包。
7. **不新增构建/CI 配置**、不新增 `package.json`。

## 4. 技术选型约束

- **必须**：原生 HTML / CSS / JavaScript（ES2019+ 浏览器原生支持的语法即可）。
- **禁止**：React / Vue / Svelte / jQuery 等任何框架与运行时库。
- **禁止**：npm / yarn / pnpm、打包器（Vite / Webpack / Rollup / esbuild）、转译器（Babel / TS）。
- **禁止**：新的 CDN 依赖、网络请求、后端接口、第三方 SDK 或统计脚本。
- **禁止**：CSS 预处理器（Sass / Less）、CSS-in-JS、CSS 框架（Tailwind / Bootstrap）。
- **可选（无需申请）**：浏览器原生 API —— `Blob` / `URL.createObjectURL` / `FileReader` /
  `<input type="file">` / `localStorage` / `matchMedia` / `requestAnimationFrame` 等。
- **如需突破以上任何一条**：必须停下来向用户确认，不得自行决定。

> 注意：`index.html` 已存在 **Google Fonts CDN** 引用，属于「已有依赖」，不新增、不删除；
> 新功能不得再引入类似外部资源。

## 5. 数据兼容性要求

- 存储键 **不可更改**：
  - `dotledger.v1` —— 业务数据
  - `dotledger.theme` —— 主题偏好（值为字符串 `light` / `dark`）
- 数据结构以 `scripts/main.js` 顶部注释为准：
  ```
  { version, days: { 'YYYY-MM-DD': { tasks: [{id, text, done, at}] } } }
  ```
  `version` 当前固定为 `1`；日期键为**本地时区**的 `YYYY-MM-DD` 字符串。
- **向后兼容**：必须能读取旧版本数据；不得在读取时静默丢弃用户已有记录。
- **向前谨慎**：遇到 `version` 大于当前支持值的存储数据，**拒绝加载并提示**，不得覆盖或清空。
- **主题与数据隔离**：任何数据操作（含导入 / 导出 / 清空）都**不得读写** `dotledger.theme`。
- **写入优先**：任何会导致数据变化的流程，必须**先成功写入 localStorage，再更新内存状态**；
  写入失败则保持内存状态不变并提示用户。
- **不可逆操作需二次确认**：清空全部记录、整体替换导入等，必须先经用户确认。

## 6. 代码质量要求

- **风格**：延续现有 `main.js` 风格 —— 2 空格缩进、分号结尾、`'use strict'`、`const` 优先、
  箭头函数、语义化中文注释分节（`/* ---------- 小节 ---------- */`）。
- **命名**：沿用现有 `camelCase` 与 `$ / els / keyOf / dayOf` 等既有命名习惯。
- **安全**：用户输入一律用 `textContent` 写入 DOM，**禁止 `innerHTML` 拼接任何用户数据**
  （现有 `innerHTML` 仅用于常量 SVG 与纯数值，保持该边界）。
- **健壮性**：所有 `JSON.parse` / `localStorage` 访问必须包 `try...catch`，失败路径给出明确提示。
- **可访问性**：新增交互元素需满足 —— 可聚焦（原生 `<button>` / `<input>`）、≥ 44×44px 触控区、
  完整 `aria-label`、状态变更通过 `announce()` 播报（`#live`，`role="status" aria-live="polite"`）。
- **动效**：复用 `--dur-*` / `--ease-*` 令牌；不得破坏 `prefers-reduced-motion: reduce` 降级。
- **无控制台报错**：交付前确认浏览器控制台无 error / warning。
- 代码量控制在最小实现，不写"以防万一"的抽象层。

## 7. Git 分支与 Worktree 协作规范

> **当前状态**：仓库已初始化，本地 `master` 已与远程 `origin/master`（`ded4606`）对齐。
> 以下规范即时生效。

### 7.1 分支

- 主干：**`master`**（远程默认分支，始终保持可运行）。

  > 注意：本项目主干是 `master` 而**不是 `main`**。所有 pull / push / PR 一律指向 `master`。
- 功能分支：`feature/<TASK-ID>-<短横线小写英文简述>`
  例：`feature/TASK-001-json-import-export`
- 修复分支：`fix/<TASK-ID>-<简述>`
- **禁止直接在 `master` 上开发**。
- 开工前先 `git fetch origin` 并从最新的 `origin/master` 切分支。

### 7.2 Worktree

- 每个任务一个独立 worktree，路径与仓库同级：
  ```
  git worktree add ../todo-matrix-TASK-001 feature/TASK-001-json-import-export
  ```
- 一个 worktree 同一时间只服务一个任务，任务完成并合并后移除：
  ```
  git worktree remove ../todo-matrix-TASK-001
  ```
- 不同任务的 worktree **互不干扰、互不修改**对方文件。

### 7.3 提交与合并

- 提交信息格式：`<type>(<TASK-ID>): <中文简述>`
  例：`feat(TASK-001): 增加 JSON 导入导出与校验`
- **任何 Agent 都不得擅自合并分支**（含 `merge` / `rebase` / 直接 push 到 `master`）。
- 合并只能由**用户**在 Reviewer 出具「通过」结论后执行。
- 任务产出为：分支上的提交 + 任务文件内填写的「实现说明 / 自测结果」。

## 8. 角色职责划分

| 角色 | 职责 | **禁止事项** |
|---|---|---|
| **Developer Agent** | 按任务契约实现功能；小步提交；自测并填写任务文件的「实现说明 / 自测结果」 | 修改任务范围外的文件；自行判定需求；合并分支；修改 Review 结论 |
| **Reviewer Agent** | 对照任务契约逐条验收；检查代码风格、约束、可访问性、异常路径；输出「通过 / 需修改 + 具体行号与理由」 | **直接修改 Developer 的业务代码**（只能提意见）；放宽验收标准；代写实现 |
| **WorkBuddy** | 定义与拆分任务；维护 `AGENTS.md` / `docs/architecture.md` / `lessons.md`；在开发与评审之间传递上下文；汇总结论并**交由用户决策** | 代替用户批准合并；在文档与代码冲突时偏向文档 |

**冲突处理顺序**：当前代码 > 任务契约 > `docs/architecture.md` >
`docs/design-notes.md`（设计规范）> `README.md`（对外发布版）。
发现冲突一律记录到 `lessons.md`，不自行"修正"代码。

## 9. Agent 执行任务时必须遵循的流程

1. **读上下文**：先读 `AGENTS.md` → `docs/architecture.md` → 指定的 `tasks/TASK-xxx.md`。
2. **确认环境**：检查是否处于 Git 仓库与正确的分支 / worktree；若不在，按第 7 节报备后再动。
3. **列变更清单**：动手前用一句话说明「要改哪些文件、改什么」，范围外的一律不动。
4. **小步实现**：按数据结构与约束编码，一次一个逻辑点。
5. **自测**：按任务文件的「测试用例」逐条执行，记录实际结果（通过 / 不通过 + 现象）。
6. **自查约束**：对照本文件第 3–6 节逐条自检（零依赖、样式令牌、无障碍、`try...catch`、控制台无报错）。
7. **回填任务文件**：填写「实现说明」「自测结果」「涉及文件的实际变更」。
8. **提交**：按 7.3 的规范提交到功能分支，**不合并**。
9. **交接评审**：把任务文件与提交信息交给 Reviewer Agent，等待结论。
10. **记录经验**：把协作中真实发生的问题、原因、解决方式、改进建议写进 `lessons.md`。

---

## 附：当前已知待确认事项

- **是否把本地协作文档纳入版本管理**：`AGENTS.md` / `docs/architecture.md` /
  `docs/design-notes.md` / `tasks/` / `lessons.md` 目前为**未跟踪**（未 `git add`、未 push）。
  若要长期只留在本地，建议加入 `.gitignore`；若要随仓库分发给协作者，需显式提交。
  **此项待用户确认，Agent 不得自行决定。**
- `README.md`（远程发布版）第 107 行称「组件层没有一个硬编码色值」，与 `components.css` 实际不符
  （见第 2 节）。修正与否待确认。
- 其余待确认项见 `docs/architecture.md` 末尾与 `tasks/TASK-001.md` 的「待确认」小节。
