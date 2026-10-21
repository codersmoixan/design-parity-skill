# ui-quality-testing 工作流程

把已实现的网页和设计稿逐屏、逐状态对照。**设计稿是标准**；商品名、价格、日期等数据可以不同，组件、token、字体、颜色、间距、尺寸、圆角、边框、阴影、图标、图层顺序、文案、设计状态与动效必须一致。

机械步骤由本 skill [SKILL.md](SKILL.md) 中的脚本完成；代理只在 `findings.json` 里做判断。命令在**被测仓库**运行；工具依赖装在本 skill 目录。

每一步结束会打印 `Do:` 与 `Next:`：**先做完 `Do:`，再原样执行 `Next:`**，不跳步、不改路径。迷路时：

```bash
node <skill>/scripts/pass.mjs status --dir <dir> --run <id>
```

---

## 总览

```text
1. 开始          pass.mjs start
2. 取出设计      figma-fetch / MCP / 原型 / 工单 → <dir>/evidence
3. 截取并对比    pass.mjs evidence
4. 写下判断      代理写 findings.json
5. 生成报告      pass.mjs report
6. 人工复核      pass.mjs review
7. 结束          pass.mjs finish
```

判定只有四种：`PASS` · `REVIEW` · `FAIL` · `INCOMPLETE`（未完成对照，不能当结果）。匹配率高仍可能 `FAIL`（严重程度单独计算）。

---

## 1. 开始（`pass.mjs start`）

**在做什么**

- 记录功能名（slug）、设计链接、被测页面 URL。
- 创建本次报告目录 `<dir>` 与运行编号 `<id>`。
- 检查 Node / 技能依赖（缺则 `ensure-deps.mjs`）。
- 从被测项目 `.env` / `.env.local`（或终端）加载环境变量；有 `FIGMA_TOKEN` 时走 REST，**不启用 Figma MCP**。
- 可能一次性提问：设计系统、Cookie/聊天浮层是否隐藏、是否需要登录态等。

**产出**

- 报告目录与后续命令统一使用的 `--dir` / `--run`。
- 若需登录：打开浏览器窗口，由人完成登录（代理不输入密码）。

**中文发起时**：加 `--locale zh`，后续 `report.html` 界面与 findings 的 `title` 等用中文填写。

---

## 2. 取出设计（写入 `<dir>/evidence`）

**在做什么**：为每个要对齐的状态准备设计侧证据（1x 图 + 结构/数值）。

| 设计来源 | 做法 |
|---|---|
| Figma + `FIGMA_TOKEN` | 跑打印出的 `figma-fetch.mjs`（默认只拉链接帧；`--multi-screen` 才拉同页旁帧） |
| 无 token，Figma MCP | `get_metadata` → `figma-mcp-spec` → 按状态 `get_screenshot`（必须精确 1x） |
| 已实现原型（Framer / v0 / HTML / localhost 等） | 单屏常无需额外步骤；多屏/多状态写入 `<dir>/states.json` |
| 工单号 | 读 Jira 等，抽出设计与预览链接后再进入后续步骤 |

**原则**：只改代码、不改设计；token 不进对话、不进命令行。

---

## 3. 截取并对比（`pass.mjs evidence`）

**在做什么**

- 按设计稿中的每个状态，用 Playwright **整页截图**（有数据、空、加载、错误、悬停、聚焦等）。
- 像素差异对比（`pixelmatch`）与设计系统审计（token、组件、动效等）。
- 生成并排图、工作清单（worklist）、差异候选。

**常见阻塞（exit 3）**

- 帧与路由未映射、需要登录、缺设计 PNG、状态到达不了等 → 按 `Do:` 补全后再跑 `Next:`。
- 单 URL 却拉出大量旁帧时，可用 `frame-map-from-census.mjs --ignore-unmapped`（见 design-qa 细则）。

**注意**：必须整页对照，不能只看第一屏。某个状态截不到会标出来；页面缺少该状态或驱动写错时，报告不会放行。

---

## 4. 写下判断（代理 → `findings.json`）

**在做什么**（本流程中唯一需要大量人工判断的一步）

- 对照并排图与脚本读出的数值（可用 `inspect.mjs`）。
- 阅读 `<dir>/worklist.md`，把每条差异写成 finding，或写明拒绝原因。
- 用 worklist key / audit key / 选择器定位，**不手量像素框**。
- `--locale zh` 时，finding 的 `title`（及优先 `region` / 期望与实际 / `fix.summary`）用中文。

脚本不替你决定「该不该改」；只提供证据与候选列表。

---

## 5. 生成报告（`pass.mjs report`）

**在做什么**

- 汇总为 `report.json`、可交互的 `report.html`、修复清单（fix plan）。
- 重新套用历史上已忽略的条目。
- 校验完整性；打印判定句（headline）。

若为 `INCOMPLETE`：先回到第 3 步修好捕获，不要把未完成对照当结果交付。

---

## 6. 人工复核（`pass.mjs review`）

**在做什么**

- 打开 `report.html`，等待人操作（长运行命令）。
- 人选择：现在修 / 记成债务 / 忽略（需原因）/ 标出本次漏掉的问题。
- 点击 **Review and send** 后才会应用决定；随后可能 `evidence --recapture` 复验修复。
- 直接关掉、不 Send：**不会**应用决定。

暂不复核时，按打印行「If the person will not review now:」继续。

---

## 7. 结束（`pass.mjs finish`）

**在做什么**

- 标记本轮对照完成（`Next: nothing: the pass is finished`）。
- 对外回复应包含：判定句、现在要修的条目、设计系统偏差数量、`report.html` 路径。

---

## 对照之后

| 说法 | 作用 |
|---|---|
| 消息以 `Apply my design QA review` 开头 | 应用报告里已送出的决定 |
| 指定编号现在修 / 忽略某条 | 按编号处理修复与忽略 |
| 把未设计的状态补回设计稿 | 仅在页面已与设计对齐后，把代码独有状态 backfill 进 Figma |
| 按 CI 跑 | 不问问题；缺输入即失败；用门禁结果作 CI 结论 |

---

## 贯穿约定

- **方向**：代码向设计靠拢，不改设计稿。
- **可不同**：数据值、人名、日期、数量、行内容（标为 `DATA`）。
- **必须一致**：组件与变体、token、排版、颜色、间距、尺寸、圆角、边框、阴影、图标、图层顺序、文案、设计状态、动效。
- **密钥**：写在被测项目 `.env` / `.env.local` 或终端；脚本自动加载且不覆盖已有环境变量；关闭加载用 `DESIGN_QA_LOAD_ENV=0`。
- **Windows**：链式 `Next:` 使用 `seq.mjs`，不要改成 `&&`。

更细的命令、退出码与失败处理见 [SKILL.md](SKILL.md)；调用示例见 [README.zh-CN.md](README.zh-CN.md)。
