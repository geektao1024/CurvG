# AnimG 竞品拆解与实现评估

- 审计日期：2026-07-22
- 目标页面：https://animg.app/en/playground
- 延伸页面：`/en/creator`、`/en/how-it-works`、`/en/library`、`/en/subscription`
- 目标：判断“自然语言/数学公式 → Manim 动画网站”能否基于当前 ShipAny Next 项目实现

## 结论

**可行，但核心不是复制网页，而是新增一套独立的 Python/Manim 安全渲染系统。**

当前项目已经具备认证、订阅、积分、AI 任务、对象存储、后台配置和 Cloudflare 部署基础，能够承载产品层。缺失的是：

1. 文本模型编排：提示词转动画规格、规格转 Manim 代码、失败修复。
2. Manim 运行环境：Python、FFmpeg、Cairo/Pango、LaTeX、ManimCE。
3. 异步任务系统：排队、状态更新、超时、重试、取消。
4. 不可信代码沙箱：限制网络、文件系统、CPU、内存、进程和执行时间。
5. 数学与视觉校验：避免“代码成功运行，但数学逻辑或画面是错的”。

**不建议把 Manim 渲染直接放进 TanStack/Nitro Web 进程，也不建议直接在普通 Cloudflare Worker 中执行。** 推荐保持当前 Web 项目不变，把渲染放到 Cloudflare Sandbox/Containers 或独立 Cloud Run/ECS 容器服务。

## 已验证的竞品实现

### 1. 产品流程不是“一步生成”

AnimG 官方页面明确展示四步流程：

1. Describe：用户描述动画。
2. Review Spec：系统先产出详细动画规格，用户审核或要求修改。
3. Render：用户批准后才生成 Manim Python，并在云端渲染。
4. Review & Iterate：观看成品，继续提出修改，重复生成。

这一步“先规格、后代码”是它提高可控性的核心，而不是让模型直接从一句话输出任意 Python。

### 2. Playground 是代码编辑器 + 云端 MP4 渲染

公开页面和前端资源显示：

- 编辑器：Monaco Editor `0.52.2`，Python 语言模式。
- 渲染请求：`POST /api/playground/render`。
- 请求体：`{ code, quality }`。
- 超时：前端允许最多 600 秒等待。
- 返回值：`video_url`、`scene_name`。
- 成品：MP4，示例文件托管在 Google Cloud Storage/Firebase Storage。
- 失败修复：`POST /api/playground/fix-code`，提交 `code`、`error_message`、`error_history`。
- 用量：`GET /api/playground/usage`。
- 认证：Firebase ID Token，通过 `Authorization: Bearer ...` 发送。

因此，动画不是在浏览器 Canvas 中即时绘制，而是服务器运行 Manim 后返回视频。

### 3. AI Creator 使用“规格审批”状态机

公开前端包可观察到以下 API：

- `POST /api/create-animation-spec`
- `POST /api/approve-animation-spec`
- `POST /api/animations/{id}/update`
- `POST /api/animations/{id}/publish`
- `POST /api/animations/{id}/unpublish`

可观察到的处理状态包括：

- `creatingSpec`
- `updatingSpec`
- `generatingMetadata`
- `queued`
- `pending`
- `processing`
- `renderingUpdate`
- `completed`
- `failed`

创建流程中，前端先写入 Firestore `animations` 集合，字段包括：

- `userId`
- `status: draft`
- `messages`
- `subject`
- `createdAt`
- `updatedAt`

随后调用规格 API。前端通过 Firestore 实时监听动画文档变化，获取 `specContent`、`code`、`videoUrl`、错误和版本信息。

### 4. 规格内容高度结构化

公开成品“Linear Functions: Slope & Y-Intercept”的规格包含：

- Description
- Phases：阶段名、持续时间、说明
- Layout：ASCII 布局草图
- Area Descriptions：区域、内容、实现说明
- Assets & Dependencies：LaTeX、颜色、Manim 版本
- Notes：`ValueTracker`、`always_redraw`、坐标范围等实现提示

公开代码使用：

- `MathTex` 渲染公式
- `Axes.plot` 绘制函数
- `ValueTracker` 控制参数
- `always_redraw` 保持图形与参数同步
- `self.play(..., run_time=...)` 控制动画阶段
- `set_color_by_tex` 对公式变量着色

这说明其“精准”主要来自：**结构化规格 + Manim 确定性渲染 + 可人工审批 + 失败重试**。

### 5. 精准不是绝对精准

同一公开示例中：

- 规格阶段总时长为 40 秒。
- 实际视频时长约 45.93 秒。
- 代码中的显式 `run_time`、`wait` 和默认动画时长累计接近实际视频，但并不严格等于规格值。

因此 AnimG 的时间规格仍是指导值，不是严格时间轴编译器。

更重要的是：

- Manim/LaTeX 能保证“代码给出的公式如何显示”是确定的。
- 它不能保证 LLM 对用户数学意图的理解一定正确。
- 逻辑错误、公式错误、错误的图像关系，可能仍然成功渲染成 MP4。

### 6. 前端与基础设施线索

已验证：

- Next.js App Router/RSC，响应头显示 `x-powered-by: Next.js`。
- Firebase Auth、Firestore、Storage。
- Google App Hosting/Google 基础设施，响应头包含 `x-fah-adapter`。
- Monaco Editor。
- MP4 云存储。
- 公开前端引用 OpenRouter，并列出多个代码/推理模型。

无法从公开页面确认：

- 实际 Manim 容器供应商。
- 是否使用 Kubernetes、Cloud Run、Functions 或自建队列。
- 服务端系统提示词、模板库和自动修复提示词。
- 是否使用 SymPy 或其他数学验证工具。
- 是否执行 AST 白名单、网络隔离或系统调用隔离。

## 页面视觉结构

### Playground

- 顶部导航约 54px，白色半透明背景、底部细边框。
- 主区桌面端左右分栏，左侧编辑器约占 60%，右侧预览约占 40%。
- 编辑器工具栏为深青色。
- 主按钮亮绿色，圆角胶囊形。
- 视频为 16:9、12px 圆角、深色背景。
- 页面字体：DM Sans；代码区域：Source Code Pro/Monaco 系统字体。
- 桌面端主工作区基本固定为视口高度，不走普通长页面布局。

### Creator

- 左侧动画历史折叠栏。
- 中间为对话与成品工作区。
- 首屏底部固定大输入框。
- 支持 Subject 和 Model 选择。
- 生成后显示 Specification、Code、Video 三类信息。

设计参考：

- `docs/design-references/animg.app/playground-desktop.png`
- `docs/design-references/animg.app/creator-desktop.png`
- `docs/design-references/animg.app/how-it-works.png`
- `docs/design-references/animg.app/library-detail-code.png`

## 当前项目可复用能力

### 可以直接复用

1. better-auth：用户认证和会话。
2. 支付、订阅、积分：对生成和渲染计费。
3. `ai_task`：记录 LLM/渲染任务状态、消耗积分、失败退款。
4. `chat`、`chat_message`：承载 Creator 的对话历史。
5. R2 Storage：保存 MP4、缩略图、规格 JSON、Python 源码和日志。
6. TanStack Query：轮询任务状态或消费 SSE。
7. Admin Settings：配置 OpenAI/Anthropic 等模型 API。
8. Cloudflare Workers/D1/R2 部署基础。

### 不能直接复用

1. 当前 `GeminiProvider` 只实现图片生成，不提供通用文本/代码模型调用。
2. 当前 AI Provider 接口偏向第三方异步媒体任务，不适合多轮“规格 → 代码 → 修复”工作流。
3. 当前项目没有 Monaco Editor。
4. 当前项目没有队列/Workflow/Sandbox 绑定。
5. 当前项目没有 Manim/Python/LaTeX 容器。
6. 当前 `ai_task` 只有通用 JSON 字段，不足以承载动画版本、规格审批和渲染日志。

## 推荐架构

```text
Browser
  │
  ├─ POST /api/animations              创建动画与首条消息
  ├─ POST /api/animations/:id/spec     生成/修改规格
  ├─ POST /api/animations/:id/approve  批准规格并启动渲染
  ├─ POST /api/animations/:id/update   修改已完成动画
  └─ GET  /api/animations/:id          查询状态与产物
  │
TanStack Start / Cloudflare Worker
  │
  ├─ better-auth
  ├─ Drizzle + D1/Postgres
  ├─ Credits / Subscription
  ├─ Text LLM Gateway
  ├─ Workflow / Queue
  └─ R2
        │
        ▼
Cloudflare Sandbox or isolated container worker
  ├─ Python 3.x
  ├─ ManimCE pinned version
  ├─ FFmpeg
  ├─ Cairo/Pango
  ├─ LaTeX packages
  ├─ AST/static safety scan
  ├─ low-quality draft render
  ├─ error capture + limited AI repair
  └─ final render → R2
```

### 为什么推荐 Cloudflare Sandbox

当前项目已经准备了 Workers、D1/Hyperdrive 和 R2。Cloudflare Sandbox 建立在 Containers 上，支持自定义 Dockerfile、命令执行、文件读写、隔离实例和按需启动，和现有架构最匹配。

注意：

- Sandbox 的命令超时不一定自动杀死底层进程，超时后应主动销毁 sandbox。
- 必须限制网络访问和持久化目录。
- 每个渲染任务使用独立或按用户隔离的 sandbox，不能让多个不可信用户共享同一工作目录。
- 免费/测试实例上限不适合正式增长，需要提前申请更高实例限额。

### 备选架构

如果更重视成熟度而不是 Cloudflare 一体化，使用 Cloud Run Jobs/ECS/Fly Machines 运行 Manim Docker Worker，Web 层仍保持当前项目。

## 提高数学准确率的关键设计

### 1. 强制中间规格，不允许一步生成 Python

建议 `AnimationSpec` 至少包含：

```json
{
  "title": "",
  "subject": "calculus",
  "audience": "high_school",
  "aspectRatio": "16:9",
  "durationTargetSec": 45,
  "mathClaims": [],
  "objects": [],
  "phases": [],
  "layout": {},
  "style": {},
  "validation": {}
}
```

规格必须通过 Zod/JSON Schema 校验，用户批准后才生成代码。

### 2. 模板优先，任意代码生成作为补充

建立学科模板库：

- 函数图像与参数变化
- 几何证明与变换
- 微积分极限/导数/积分
- 线性代数向量/矩阵变换
- 概率统计分布
- 物理受力、轨迹和波动

LLM 先选择模板，再填写参数。只有模板不能覆盖时才生成自由 Manim 代码。

**模板化是比换更大模型更有效的稳定性手段。**

### 3. 数学验证

建议在 Python Worker 中加入 SymPy 校验：

- 等式：化简两边差值，验证是否为 0。
- 导数/积分：重新计算并比较。
- 函数图像：对定义域采样，比较公式值与传入坐标。
- 几何：验证距离、角度、共线、垂直等数值不变量。
- 数值结论：多组随机输入进行性质测试。

验证失败时停止渲染，不让“看起来正常的错误动画”直接交付。

### 4. Python 安全扫描

生成代码在执行前解析 Python AST，默认拒绝：

- 非白名单 import
- `eval`、`exec`、`compile`
- `subprocess`、`os.system`
- socket/HTTP 网络访问
- 任意文件系统访问
- 动态模块加载
- 无限循环和超大对象构造的明显模式

只允许 `manim`、受控的 `math`、`numpy`、`sympy` 子集。

AST 扫描不能代替容器隔离，两者必须同时存在。

### 5. 两级渲染与自动修复

1. 先用低质量、低帧率渲染草稿。
2. 捕获 stderr、退出码、耗时和输出文件。
3. 失败时把代码、错误和历史修复记录交给模型。
4. 最多自动修复 2 次；超过后交给用户，避免无限烧钱。
5. 草稿成功后再执行 1080p 正式渲染。

### 6. 视觉检查

成功生成 MP4 不代表画面可用。至少检查：

- 文本和公式是否越界。
- Mobject 是否重叠到不可读。
- 关键对象是否在摄像机范围内。
- 字体/LaTeX 是否缺失。
- 帧是否全黑或静止。
- 实际时长与规格目标偏差是否过大。

可以先做确定性的边界框检查，再考虑视觉模型审核关键帧。

## 建议数据模型

### `animation`

- `id`
- `userId`
- `title`
- `subject`
- `status`
- `currentVersion`
- `model`
- `provider`
- `specJson`
- `code`
- `videoUrl`
- `thumbnailUrl`
- `durationMs`
- `quality`
- `error`
- `createdAt`
- `updatedAt`
- `deletedAt`

### `animation_version`

- `id`
- `animationId`
- `version`
- `prompt`
- `specJson`
- `code`
- `videoUrl`
- `thumbnailUrl`
- `renderMetadata`
- `createdAt`

### `render_job`

- `id`
- `animationId`
- `version`
- `status`
- `attempt`
- `sandboxId`
- `startedAt`
- `finishedAt`
- `stdout`
- `stderr`
- `exitCode`
- `cpuMs`
- `costCredits`

对话可以复用现有 `chat` / `chat_message`，但建议通过 `animationId` 放到 metadata 中关联，避免改动通用聊天表的语义。

## 推荐开发顺序

### Phase 1：技术验证，3–5 天

- 建 Manim Dockerfile。
- 固定 10 个代表性数学场景。
- 验证 480p/1080p 渲染、LaTeX、中文字体、R2 上传。
- 测量 CPU、内存、时间和失败率。
- 验证 Sandbox 超时后的强制销毁。

退出条件：10 个样例全部可重复渲染，且无共享文件/进程残留。

### Phase 2：最小 Creator，7–10 天

- Prompt → JSON Spec。
- Spec 审核与修改。
- Spec → Manim Code。
- 异步渲染状态。
- Video / Spec / Code 三个视图。
- 失败后最多两次自动修复。

### Phase 3：商业化，5–8 天

- 积分扣费和失败返还。
- 免费额度与速率限制。
- 订阅计划。
- 动画历史、版本和下载。
- 后台任务与成本查看。

### Phase 4：Playground 与 Library，5–8 天

- Monaco Python 编辑器。
- 任意代码渲染。
- 公开模板库。
- “Create similar”。
- 发布/取消发布。

单个有经验的全栈/AI 工程师，做出可收费 MVP 的合理估计为 **4–6 周**。这是假设基础 UI、认证、支付、积分和存储继续复用当前项目；不是承诺工期。

## 成本与定价判断

按 Cloudflare Containers 当前 `standard-2` 标价粗算，1 vCPU、6 GiB、12 GB 磁盘运行 1 分钟的原始容器费用约为 **$0.00215**，运行 3 分钟约 **$0.00645**。这不包含 Workers、Durable Objects、带宽、日志和 LLM 调用，但说明简单 Manim 渲染本身不一定是最大成本。

真正容易失控的是：

- 高价模型生成规格和代码。
- 失败后的多次修复。
- 用户反复生成 1080p。
- 超长场景或恶意代码占用实例。

竞品公开价格为 Pro `$9.99/月`，宣称 AI Creator 和 Playground unlimited。**不建议直接照抄“无限量”**。更稳妥的方案是：

- 套餐给月度积分。
- 规格生成、草稿渲染、1080p 渲染分别计费。
- 自动修复超过 1–2 次额外扣费。
- 对单次时长、分辨率、并发和每日任务数设置硬限制。

## 最终建议

1. **做，可以做。** 当前项目适合作为产品壳和商业系统。
2. **不要先复制整个网站。** 先验证 Manim Sandbox 和 10 个数学模板，这是成败关键。
3. **第一版不要开放任意 Python。** 先只执行系统生成、通过 AST 校验的代码，降低攻击面。
4. **先做规格审批。** 它是竞品最值得复制的产品机制。
5. **准确率靠模板、数学验证和渲染检查，不靠单纯换大模型。**
6. **视觉可以参考，品牌、文案和素材不要直接复制。**

## 官方资料

- AnimG How It Works：https://animg.app/en/how-it-works
- AnimG Playground：https://animg.app/en/playground
- AnimG Pricing：https://animg.app/en/subscription
- Manim Installation：https://docs.manim.community/en/stable/installation.html
- Manim MathTex：https://docs.manim.community/en/stable/reference/manim.mobject.text.tex_mobject.MathTex.html
- Cloudflare Sandbox：https://developers.cloudflare.com/sandbox/
- Cloudflare Containers Pricing：https://developers.cloudflare.com/containers/pricing/
