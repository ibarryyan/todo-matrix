# lessons.md — 多 Agent 协作经验记录

## 本文件的用途

用于记录 `todo-matrix` 项目在 **WorkBuddy + OpenCode 多 Agent 协作**过程中**实际发生**的问题、
原因、解决方案与后续改进建议。

## 记录原则

1. **只记录实际发生的问题**，不提前编造经验、不写"可能存在"的推测性条目。
2. 每条记录必须包含四部分：**问题 / 原因 / 解决方案 / 后续改进建议**。
3. 语言简洁、可检索；涉及代码时写明**文件路径与行号**。
4. 按时间倒序追加（新记录写在最上面），不删除历史记录。
5. 文档与代码冲突、任务契约与实际不符等情况也在此登记。

## 记录格式

```markdown
## YYYY-MM-DD · <一句话标题>

- **问题**：<具体现象，含文件路径/行号>
- **原因**：<根因>
- **解决方案**：<实际采取的动作>
- **后续改进建议**：<如何避免再次发生>
```

---

## 记录

## 2026-11-03 · 给台账行加按钮时，栅格列位必须显式固定

- **问题**：TASK-002 给 `.row` 增加链接按钮后，行栅格从 `34px 1fr 44px` 变成 `34px 1fr 44px 44px`。
  若只靠「先 append 链接、再 append 删除键」的顺序，没有链接的行会把删除键顶到第 3 列，
  与有链接的行**左右错位**（`styles/components.css:256` / `.row__del`）。
- **原因**：`display: grid` 下子项按 DOM 顺序自动排布，DOM 结构不同（有没有链接）就会占据不同列。
- **解决方案**：给两个按钮显式写死列位 —— `.row__link { grid-column: 3 }`、`.row__del { grid-column: 4 }`；
  ≤720px 断点同步改为 `1fr 44px 44px` 并把列位调成 2 / 3。删链接时列位也不会乱。
- **后续改进建议**：以后往 `.row` / 任何 grid 行里增删子元素，**先给它显式 `grid-column`**，
  不要依赖 DOM 顺序；改完在同一天里混合「有 / 无该元素」的行，目测一次对齐。

## 2026-11-03 · 无头浏览器自测必须走本地 HTTP，不能用 file://

- **问题**：用 `Chrome --headless=new --dump-dom` 加载 `file:///...index.html` 时，
  外挂的测试脚本（`driver.html`）完全没有执行，`document.title` / 属性标记都拿不到；
  改成本地 `python3 -m http.server` 后立刻正常。
- **原因**：`file://` 下 origin 是 opaque，`localStorage` 访问受限，且以 `.html` 作 `<script src>` 的
  加载行为不可靠；本项目首屏就依赖 `localStorage`，自测结论会失真。
- **解决方案**：`cp -r` 一份到 `/tmp`，`python3 -m http.server` 起服务后用
  `--headless=new --virtual-time-budget=4000 --dump-dom http://127.0.0.1:PORT/` 取结果，
  测试脚本**内联**进 HTML；大段输出改用 `document.title` 回传（属性值里的 JSON 引号会被转义，grep 难取）。
- **后续改进建议**：本项目没有测试框架，任何需要「真实 DOM + localStorage」的验证都按这个套路来；
  纯函数（如 `safeLink`）单独用 `node -e` 做输入表驱动测试，两者互补。

## 2026-11-01 · 接入 GitHub 远程时本地 README 与远程版内容冲突

- **问题**：本地 `README.md`（116 行，内部设计版：定调说明 / 构成与响应式 / 动效规格 /
  反 AI 味清单自检）与远程 `README.md`（187 行，对外发布版：徽章 / Demo 链接 / 快速开始 /
  已知限制 / 贡献 / License）**不是同一份文档的修改关系，而是两份定位完全不同的文档**。
  直接 `git checkout` 拉远程会静默覆盖本地版，丢失「构成与响应式」「反 AI 味清单」等远程版没有的章节。
- **原因**：项目先在 GitHub 上发布了打磨过的对外 README，本地又另行维护了一份面向开发者的内部设计
  规格，两者同名（`README.md`）却未区分职责，接远程时必然冲突。
- **解决方案**：
  1. 先把本地版备份到 `/tmp/local-README-backup.md`，再让 `README.md` 采用远程发布版；
  2. 把本地版**整体**迁移为 `docs/design-notes.md`（正文一字未改，仅加来源说明头），零信息丢失；
  3. 在 `AGENTS.md` 第 2 节写明两份文档的分工，并把冲突解决优先级里的设计规范指向 `design-notes.md`；
  4. 用 `git init -b master` + `fetch` + `checkout origin/master -- .` + `reset origin/master`
     让本地 `master` **直接接续**远程提交 `ded4606`，而不是造一个无关根提交再用
     `--allow-unrelated-histories` 合并 —— 后者会污染历史且让 push 变非快进。
- **后续改进建议**：
  - 对外（`README.md`）与对内（`docs/design-notes.md`）文档**不要互相抄写**，维护前先判断归属，
    新增内容只写进其中一份，避免再次出现内容漂移。
  - 任何人首次接入远程时，都要先 `diff` 同名文件确认「是同一份文档的不同版本」还是「两份不同文档」，
    不要默认按前者的思路覆盖。
  - 远程默认分支是 **`master`** 而非 `main`；脚本、CI、PR 目标分支一律以远程实际为准。
  - **遗留待确认**：本地协作文档（`AGENTS.md` / `docs/` / `tasks/` / `lessons.md`）目前未纳入 Git，
    是否提交或加进 `.gitignore` 尚未决定，操作前务必确认，不要顺手 `git add -A`。

## 2026-11-01 · 远程 README 与 CSS 实现的真实差异（登记备查）

- **问题**：远程 `README.md:107` 写「组件层没有一个硬编码色值」，但 `styles/components.css` 实际有
  三处硬编码 —— `.btn-add` 前景色 `#FFF8F2`、`.row__box::after` 勾线 `#FFF8F2`、
  `.empty__grid` 的 mask `#000`。
- **原因**：文案为了强调「改配色只需动 `tokens.css`」而做了过度概括，漏算了三处功能性色值
  （它们不受明暗主题覆盖，恰好不需要进令牌）。
- **解决方案**：不修改 README（超出授权），在 `docs/architecture.md` 限制 15 与新第 11 节记录，
  列为待确认项。
- **后续改进建议**：涉及「绝对化」表述（`没有一个` / `全部` / `零` 等）的文档断言，
  写入前先用 grep 在代码里核验一次；这类断言最容易在后续开发中失真。

---

