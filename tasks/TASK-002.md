# TASK-002 · 待办可附带一条链接

- **状态**：已实现（待 Review）
- **优先级**：P1
- **关联文档**：[`../AGENTS.md`](../AGENTS.md)、[`../docs/architecture.md`](../docs/architecture.md)
- **数据结构基线**：`scripts/main.js` 顶部注释与 `load()` / `save()` 实现（**不得擅自设计新格式**）

---

## 1. 需求背景

任务是纯文本，遇到「这条待办的上下文在别处」的场景只能把 URL 粘进标题里：既不好读，也点不了。
本任务给每条待办增加一个**可选的链接字段**，让台账既能记事，也能直接跳到那件事的现场
（需求单、文档、PR、会议链接等）。

**不做的事**：不做链接预览 / 标题抓取、不做链接去重、不做历史任务的链接补录与编辑、不做协议白名单以外的协议。

## 2. 功能范围

### 2.1 包含

| # | 功能 | 说明 |
|---|---|---|
| F1 | **新增时附链接** | 输入区第二行可填链接（可选），与任务文本一起提交 |
| F2 | **协议规范化** | 缺协议自动补 `https://`；只放行 `http` / `https`，其余判非法 |
| F3 | **非法链接不落盘** | 填了但校验不通过时忽略链接、照常记录任务，并在 `announce()` 里说明 |
| F4 | **行内链接入口** | 有链接的行显示一个箭头按钮，新标签打开，带 `rel="noopener noreferrer"` |
| F5 | **渲染期二次校验** | 渲染时也用同一函数校验，脏数据（含 `javascript:`）不会被拼进 `href` |
| F6 | **老数据兼容** | 无 `link` 字段的历史记录按「无链接」渲染，不报错、不丢数据 |

### 2.2 不包含（明确排除）

- ❌ 编辑 / 删除已有任务的链接（本次只做新增）
- ❌ 链接标题抓取、缩略图、预览卡片
- ❌ 非 http(s) 协议（`mailto:` / `ftp:` / 站内跳转等）
- ❌ 任务文本内 URL 的自动识别与高亮

## 3. 非功能约束

| 类别 | 约束 |
|---|---|
| **技术栈** | 原生 HTML / CSS / JavaScript，零依赖、无构建（`AGENTS.md` 第 4 节） |
| **数据兼容** | `link` 为**可选新增字段**，存储键与既有字段不变；旧数据必须可读可渲染 |
| **安全** | 用户输入一律 `textContent`；`href` 只允许规范化后的 http(s)；外链加 `noopener noreferrer` |
| **样式** | 新增样式只走 `--*` 令牌，不新增硬编码色值；沿用纸墨 + 朱红 |
| **可访问性** | 原生元素、≥44×44px、完整 `aria-label`、结果经 `announce()` 播报 |
| **动效** | 复用 `--dur-*` / `--ease-*`；不破坏 `prefers-reduced-motion` 降级 |
| **代码风格** | 2 空格缩进、分号结尾、`const` 优先，注释风格与 `main.js` 一致；最小实现，不做抽象层 |

## 4. 数据格式变更

```json
{ "id": "tm9x2ka1b", "text": "修复 WebSocket 断连", "link": "https://example.com/issue/42", "done": false, "at": 1761475200000 }
```

| 字段 | 类型 | 必填 | 规则 |
|---|---|---|---|
| `link` | `string` | ❌ 可选 | 只存 `safeLink()` 规范化后的 http(s) 完整地址；无链接时**不写该字段**（保持旧数据形状） |

`safeLink(raw)`：`trim()` → 空则 `null` → 无 `scheme://` 前缀补 `https://` → `new URL()` 解析失败则 `null`
→ 协议非 `http:` / `https:` 则 `null` → 返回 `u.href`。

## 5. 涉及文件

| 文件 | 改动内容 | 是否必须 |
|---|---|---|
| `index.html` | 输入区新增第二行 `.composer__row--link`（`#linkInput`，`type="url"`、`maxlength="500"`、`aria-label`）；提示语补「只认 http(s) 链接」 | ✅ |
| `scripts/main.js` | 新增 `safeLink()`；`addTask(text, linkRaw)` 增加第二参数；新增 `submitComposer()`；`rowEl()` 渲染 `.row__link`；`els` 登记 `linkInput`；两个输入框的 Enter / Esc 事件 | ✅ |
| `styles/components.css` | 新增链接输入样式、`.row__link`（固定 `grid-column: 3`）、`.row__del` 固定 `grid-column: 4`、行栅格改为 `34px 1fr 44px 44px`（≤720px 为 `1fr 44px 44px`）、`hover: none` 下链接常驻 | ✅ |
| `README.md` | 「## 特性」表补一行；「## 已知限制」第一条改写 | ⚠️ 属 DoD 必做项 |
| `docs/design-notes.md` | 「二、功能」表补一行；反 AI 味清单第 5 项图标数 3 → 4 | ⚠️ 属 DoD 必做项 |
| `docs/architecture.md` | 数据结构 5.1 / 5.2 增 `link`；4.3 行为表更新；7 渲染流程补充 | ⚠️ 属 DoD 必做项 |
| `lessons.md` | 记录本次协作中真实发生的问题 | ⚠️ 属 DoD 必做项 |

**不改动**：`styles/tokens.css`、`styles/base.css`、`docs/preview.svg`、`AGENTS.md`、`TASK-001`。

## 6. 验收标准

1. ✅ 输入区第二行可填写链接，留空也能正常记录任务。
2. ✅ 缺协议的输入（如 `github.com/x`）自动补 `https://` 后落盘。
3. ✅ 非 http(s) / 解析失败的输入被忽略，任务照常记录且有播报提示。
4. ✅ 行内箭头按钮在新标签打开，`rel="noopener noreferrer"`，有 `aria-label` 与 `title`。
5. ✅ 老数据（无 `link` 字段）正常渲染，不报错、不丢数据。
6. ✅ 存储中 `link` 缺失时不写该字段，向前向后兼容。
7. ✅ 有 / 无链接的行，删除键位置对齐（栅格列位固定）。
8. ✅ 未引入任何新依赖；新增样式全部使用 `--*` 令牌。
9. ✅ 浏览器控制台无 error / warning。

## 7. 测试用例

| # | 用例 | 步骤 | 预期 | 结果 |
|---|---|---|---|---|
| T1 | 只填任务不填链接 | 输入「写周报」→ 回车 | 记录成功，行内无链接按钮 | ✅ 通过 |
| T2 | 填裸域名 | 任务 + `github.com/ibarryyan` → 回车 | 落盘为 `https://github.com/ibarryyan` | ✅ 通过 |
| T3 | 填完整 https | 任务 + `https://example.com/a?b=1#c` | 原样保存，箭头按钮可点开 | ✅ 通过 |
| T4 | 非法协议 | 任务 + `javascript:alert(1)` | 任务记录，链接忽略，播报「链接无效已忽略」 | ✅ 通过 |
| T5 | ftp / data 协议 | 任务 + `ftp://h/p`、`data:text/html,hi` | 均被忽略 | ✅ 通过（Node 侧 `safeLink()` 单测） |
| T6 | 老数据兼容 | 预置无 `link` 字段的 localStorage 后加载 | 2 行正常渲染，无链接按钮，无报错 | ✅ 通过（无头 Chrome 实测） |
| T7 | 脏数据渲染 | 老数据里塞 `link: 'javascript:alert(1)'` | 不渲染 `href`，不产生可执行链接 | ✅ 通过 |
| T8 | 提交后清空 | 任意提交一次 | 两个输入框均清空，焦点回到任务输入 | ✅ 通过 |
| T9 | 链接框回车 / Esc | 链接框按 Enter / Esc | Enter 提交整条；Esc 清空并回到任务输入 | ✅ 通过（代码路径一致，Enter 已实测） |
| T10 | 删除键对齐 | 同一天混合有 / 无链接的行 | 删除键列位一致（`grid-column: 4`） | ✅ 通过（实测 `delCol=4`） |
| T11 | 控制台无报错 | 无头 Chrome 加载并执行上述操作 | 无 error / warning | ✅ 通过 |
| T12 | 触屏可见性 | `@media (hover: none)` | 链接与删除键常驻可见 | ⚠️ 未经真机，仅样式声明层确认 |

## 8. 完成定义（DoD）

- [x] `index.html` / `scripts/main.js` / `styles/components.css` 三处改动完成且最小化。
- [x] 第 6 节 9 条验收标准满足。
- [x] 第 7 节 T1–T11 已执行并通过；T12 为样式声明层确认（无真机环境）。
- [x] 未引入新依赖；新增样式全部走 `--*` 令牌。
- [x] 文档同步（README / design-notes / architecture / lessons）。
- [x] 按 `AGENTS.md` 第 7.3 节提交到功能分支。

---

### 实现说明

- `index.html`：输入区在原有「任务文本 + 记上一笔」一行之下新增一行链接输入
  （`#linkInput`，`type="url"`、`maxlength="500"`、`spellcheck="false"`），提示语补一句
  「只认 http(s) 链接」，把约束写在能被看见的地方而不是只写在代码里。
- `scripts/main.js`：
  - 新增 `safeLink(raw)`（放在「日期工具」之后，单列一小节），写入与渲染**共用同一函数**，
    这是防 `javascript:` 之类脏链接的关键：任何来源的 `link` 都要过这一道。
  - `addTask(text, linkRaw)` 增加第二参数；`link` 通过校验才写进 task 对象（不写空字段，
    保持旧数据形状）；填了但非法时**照常记录任务**并播报「（链接无效已忽略…）」，
    避免用户因为链接格式问题丢失刚写下的内容。
  - 新增 `submitComposer()` 统一「取值 → 提交 → 清空 → 回焦」，按钮点击与两个输入框的 Enter 共用，
    Esc 只清空链接框。
  - `rowEl()` 在 `label` 之后、`del` 之前插入 `<a class="row__link">`，`href` 用 `safeLink(task.link)`
    的返回值，带 `target="_blank"` / `rel="noopener noreferrer"` / `aria-label` / `title`。
- `styles/components.css`：链接输入框比主栏矮一档（`height: 40px`、等宽字、更浅底色）以体现层级；
  `.row__link` 与 `.row__del` 各自**固定栅格列位**（3 / 4），这样有没有链接，删除键都不会左右跳动；
  桌面默认 `opacity: .5`（可发现但不抢眼），hover / focus 变清晰，`hover: none` 与 ≤720px 下常驻。

### 自测结果

- `node --check scripts/main.js` 通过。
- `safeLink()` 14 组输入单测（Node）：空串 / 空白 → `null`；`github.com/x` → `https://github.com/x`；
  `javascript:alert(1)`、`ftp://h/p`、`data:text/html,hi`、`https://` → `null`；大小写混写的
  `JaVaScRiPt://x` → `null`。
- 无头 Chrome（本地 HTTP 服务）端到端：新增带链接任务 → `href=https://github.com/ibarryyan`、
  `rel=noopener noreferrer`、`aria-label=在新标签打开链接：…`；非法链接 → 任务入库、链接忽略、
  播报文案正确；两次提交后 `counter=0 / 2`、输入框已清空。
- 老数据兼容：预置无 `link` 字段的 `dotledger.v1` → 2 行正常渲染、无链接按钮；其中一条
  `link: 'javascript:alert(1)'` 的脏数据**未渲染出 href**；删除键 `grid-column=4`，列位未错位。
- 未做真机触屏验证（T12），仅确认 `@media (hover: none)` 与 ≤720px 的样式声明已覆盖。

### Review 结论

（待 Reviewer Agent 填写：通过 / 需修改，并给出具体行号与理由）
