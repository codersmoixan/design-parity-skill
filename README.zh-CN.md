# ui-quality-testing

[English](README.md)

把已经实现的网页和设计稿逐屏、逐状态对照。设计稿是标准。商品名、价格、日期、数量这类数据可以不同。组件、设计 token、字体、颜色、间距、尺寸、圆角、边框、阴影、图标、图层顺序、文案、设计稿里的每个状态，以及动效必须一致。

核对流程使用内置的 [design-qa](design-qa/SKILL.md)，基于上游 0.2.3（MIT，Copyright (c) 2026 Dimitris Niavis），并在本 skill 内做了本地分叉/优化（单帧默认、多屏可选等）。截图、像素对比、设计系统审计、报告和修复清单都由它的脚本完成，不另写一套。本地改动不升级上游版本号。

## 功能

- 整页对照，不只看第一屏。状态包括有数据、空、加载中、错误、悬停、聚焦。
- 记录差异并给出处理：改代码、有意保留、数据差异、人工忽略、待人决定，或已经一致。
- 生成 `report.json`、可交互的 `report.html` 和修复清单。
- 人工复核后可以改代码，再重新截图确认。
- 记住已经忽略的差异。可以在 CI 里跑。
- 页面已经和设计稿对齐之后，可以把只存在于代码里的状态补回 Figma。

判定只有四种：`PASS`、`REVIEW`、`FAIL`、`INCOMPLETE`。`INCOMPLETE` 表示没有完成对照，不能当成结果。匹配率高仍可能失败，因为严重程度单独计算。

## 不覆盖的范围

- 本地 `.fig` 文件。请改用 Figma 链接或原型地址。
- 核对过程中不改设计稿。代码向设计稿靠拢。

## 怎么调用

在对话里直接说明要核对的设计和页面。下面几种说法都会用到这个 skill：

```text
用 ui-quality-testing 对照这个页面和设计稿。
设计：https://www.figma.com/design/...
页面：https://preview.example.com/home
```

```text
让这个页面和 Figma 一致。
```

```text
检查预览环境和原型是否一致。
原型：https://...
页面：http://127.0.0.1:3000
```

```text
核对工单 ABC-123。
```

复核结果发回来时，消息以 `Apply my design QA review` 开头，会进入“应用复核决定”，而不是重新开一轮对照。

一次调用至少要有设计来源和被测页面：

| 设计来源 | 例子 |
|---|---|
| Figma 文件、画板、页面或分区链接 | `figma.com/design/...` |
| Figma 原型链接 | `figma.com/proto/...` |
| 已实现的原型 | Figma Make、Framer、v0、Lovable、HTML、localhost |
| 工单号 | `ABC-123`，工单里能找到设计和页面 |

被测页面可以是本地、预览或测试环境地址。

## 单页 vs 多屏（很重要）

**默认：只测某一个页面。** 给一个带 `node-id` 的 Figma 帧链接 + 一个页面 URL 时，只拉取**链接里的那一帧**，不会拉取 Figma 同页旁的其它页面帧（PLP、Cart 等）。

```text
/ui-quality-testing 对照这个页面和设计稿。
设计：https://www.figma.com/design/...?node-id=373-79410
页面：https://www.clibee.global/pl_en
```

**需要拉同页其它帧做多路由对照时**，在提示词里写明「多屏 / 整站 / multi-screen」，并尽量给出每个屏对应的页面 URL：

```text
/ui-quality-testing 对照整站设计（多屏）。
设计：https://www.figma.com/design/...?node-id=...（页面或 section 节点）
请用 --multi-screen 拉取同页各帧。

页面对应关系：
- homepage → https://example.com/
- plp → https://example.com/plp
- cart → https://example.com/cart
（没有 URL 的帧先跳过或标 CANNOT_VERIFY）
```

也可以只选几屏：

```text
/ui-quality-testing 除 Homepage 外，还要测 PLP 和 Cart。请 multi-screen。
设计：https://www.figma.com/design/...?node-id=...
- Homepage → https://.../home
- PLP → https://.../plp
- Cart → https://.../cart
其它帧 ignore。
```

没有写「多屏 / multi-screen」时，一律按单页处理。

## 报告语言（report.html）

用**中文**发起核对时，代理会带 `--locale zh`，生成的 `report.html` 界面（页签、按钮、标签等）为中文，并且在写 `findings.json` 时用**中文填写每条问题的 `title`**（审阅卡片上显示的就是这段文案；`region` / 期望与实际说明 / `fix.summary` 等自由文本也优先中文）。其它语言一律英文报告与英文 title（`--locale en` 或不传）。脚本不会机器翻译 title；`ref`、枚举、选择器、token、以及从页面/设计稿引用的原文保持原样。这只影响填写 findings 的文案语言，**不会**额外增加截图、diff 或审计步骤的耗时。

## 调用前

- Node.js 20 或更高。
- **工作目录** = 被测仓库（跑命令、写报告）；**技能目录** `design-qa` = 工具依赖（`pixelmatch`、`pngjs`、`playwright`），不改被测仓库的 `package.json`。
- 缺依赖时跑 `ensure-deps.mjs`：已设 `DESIGN_QA_AUTO_INSTALL=1`，或曾同意过（`~/.design-qa/auto-install.json`）则直接安装；否则只问一次，同意后用 `ensure-deps.mjs --grant`。
- 优先使用被测项目根目录 `.env` / `.env.local`（或终端）中的 `FIGMA_TOKEN`：脚本会自动加载并用 REST `figma-fetch` 拉设计，**有 token 时不要启用 Figma MCP**。仅在没有 token 时才用已登录的 Figma MCP。不要把 token 写进对话或提交进仓库；若已误发，请在 Figma 轮换作废。关闭加载：`DESIGN_QA_LOAD_ENV=0`。
- 公开/预发环境若有 Cookie 横幅或设计为登录态顶栏，开始捕获前按提示配置隐藏或 `save-session`。

脚本从被测项目的目录运行。`design-qa/SKILL.md` 里的 `node scripts/...` 实际指向本 skill 的 `design-qa/scripts/`。Windows PowerShell 下链式步骤使用 `seq.mjs`，不要改成 `&&`。

## 一次对照怎么走

脚本每一步结束都会打印下一条命令。按打印的命令继续，不跳步、不改路径。

```text
开始
  → 取出设计
  → 截取页面并对比
  → 写下判断
  → 生成报告
  → 人工复核
  → 结束
```

1. **开始。** 记下功能名、设计链接和页面地址，建立本次报告目录和运行编号。若脚本提问，一次问完再继续。需要登录时，在打开的窗口里完成。
2. **取出设计。** 有 Figma token 时由脚本拉取画板（默认仅链接帧；`--multi-screen` 才拉同页旁帧）。没有 token 时，用 Figma 连接读取结构，再按每个状态截一张 1 倍图。原型则按屏幕和状态记录，例如空购物车对应 `?empty=1`。工单则先读取工单内容。
3. **截取并对比。** 按设计稿里的每个状态截整页，做差异和设计系统审计。某个状态没截到会标出来；页面缺少该状态，或截图方式不对时，报告不会放行。
4. **写下判断。** 对照并排图和具体数值，把每一条差异写成发现或写明拒绝原因。数值以脚本读到的为准，不手量像素。
5. **生成报告。** 产出 `report.json`、`report.html` 和修复清单。之前忽略过的条目会重新套用。
6. **人工复核。** 打开报告。选择现在修或记成债务，忽略时要写原因，也可以标出这次漏掉的问题。确认送出后才会改代码并重新截图。直接关掉报告则不会应用这些决定。
7. **结束。** 脚本打印本次对照已完成。回复里包含判定句、现在要修的条目、设计系统偏差数量，以及 `report.html` 的路径。

## 对照之后的命令

| 说法 | 作用 |
|---|---|
| 粘贴以 `Apply my design QA review` 开头的消息 | 应用报告里已经送出的决定 |
| 指定编号现在修，或忽略某条 | 按编号处理修复和忽略 |
| 把未设计的状态补回设计稿 | 仅在页面已经和设计稿对齐之后，把只存在于代码里的状态补进 Figma |
| 按 CI 跑 | 缺输入就失败，不提问；用门禁结果作为 CI 结论 |

## 目录

```text
ui-quality-testing/
├── SKILL.md                 给代理的执行说明
├── README.md                英文说明
├── README.zh-CN.md          本说明
└── design-qa/               内置 design-qa（上游 0.2.3 + 本地优化）
    ├── SKILL.md             逐步命令和退出码
    ├── scripts/             截图、对比、报告、复核
    ├── references/          某一阶段失败时才需要读的细则
    ├── schemas/             报告和配置的结构
    └── templates/           HTML 报告模板
```
