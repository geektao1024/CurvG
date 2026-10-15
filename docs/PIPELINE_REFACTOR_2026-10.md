# 生成管线重构（2026-10-16）

> 起因：2026-08-01 之后线上没有交付过一个视频。本文记录证据、改动和仍未解决的问题。
> 早先的优化记录见 `PIPELINE_OPTIMIZATION_2026-08.md`；本文中的结论优先。

## 1. 证据

线上 D1（截至 2026-10-15）：

- 约 300 个动画会话，**245 个失败为 `spec / UNKNOWN`，且不可重试**；最后一个交付的视频是 2026-08-01。
- 根因一（已于 2026-10-15 部署修复）：`b53c386`（2026-08-04）把上游错误包进 `AnimationPlanningStageError`，
  失败分类只看包装层，所有"上游繁忙/超时"都变成了不可重试的 UNKNOWN，Workflow 的排队重试从未生效。
  修复：`animationFailure` 沿 `cause` 链找到真正的错误。
- 根因二：KIE 上的 `claude-haiku-5-5` 线路本身不可用。2026-10-15 探测 10 种请求形态共 46 次，全部返回 HTTP 429
  "Internal error"；同一账号下 KIE 的其他模型都正常（`scripts/probe-kie-claude.mjs`）。
- 根因三（编译器，自 2026-07-30 `4ef9b5d` 起）：`curve` 画在已定位的坐标轴上之后又被缩放、移动一次，
  所有函数曲线都偏离坐标轴（y=x² 的顶点落在原点下方，按坐标声明的点和切线碰不到曲线）。
- 根因四（IR 表达力）：线段只能用固定坐标，点沿路径移动时连线不跟随；数学审核据此正确地驳回了
  "割线逼近切线""投影"这类核心讲解，规划在修订中无法收敛。`move_along` 也只能从路径起点走到终点。
- 渲染：最近一次渲染失败是成片已出、语义审核器（KIE `gemini-3.1-pro`，单次、25 秒）超时，按"失败即关闭"整条判失败。

## 2. 模型：KIE GPT-6 Luna

- 仍走 KIE（产品决定）。`gpt-6-luna`，`codex/v1/responses`。探测 30/30 成功，每次调用约 0.01–0.15 Kie credits，
  一个视频的完整规划（含修订）通常不到 1 credit（`scripts/probe-kie-gpt.mjs`）。
- 支持严格结构化输出 `text.format: json_schema, strict: true`，并且**会执行** `minItems`/`maxItems`、
  `minimum`/`maximum`、`pattern`（实测：要求至少 3 项时，模型返回了 5 项）。
- 延迟是长尾分布，偶尔整体变慢：同类调用 33–70 秒为常态，个别达到 269 秒、362 秒或超过 300 秒。

## 3. 管线改动

| 环节       | 之前                                                                                                 | 现在                                                                                                                                    |
| ---------- | ---------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| 规划       | 6 个串行调用（intent → knowledge → curriculum → mathematics → storyboard → scene），每段都是单点故障 | **2 个调用**：一次产出前五段（`runPlanCall`），一次产出场景；仍写同样的 5+1 行阶段记录，进度界面和复用逻辑不变                          |
| 输出格式   | 自由 JSON + 解析修复轮                                                                               | 严格 JSON Schema（`src/lib/strict-json-schema.ts`）；场景按 `kind`/`op` 拆成变体，各类型必填字段由 schema 保证（`sceneResponseSchema`） |
| 数学审核   | 自由 JSON                                                                                            | 严格 schema；对象投影带上 `startRef`/`endRef`/`projection`/`reverse`                                                                    |
| 时间线     | 重叠即驳回                                                                                           | 机械修正：后一组顺延到前一组结束，放不下则截短前一组（≥0.5 秒），全部写入诊断（`resolveTimelineOverlaps`）                              |
| 长尾延迟   | 单请求最长等 290 秒                                                                                  | **对冲请求**：规划 100 秒、场景 120 秒、审核 90 秒仍未返回就并发一个相同请求，先回者胜，另一个取消（`hedgeAfterMs`）                    |
| 生成侧标准 | 审核标准只写在审核提示词里                                                                           | 规划与场景提示词提前写明"变化的量必须真正运动、覆盖结论涉及的每一侧、连线要跟随点"                                                      |
| 可观测性   | 校验失败不记录                                                                                       | 每次校验失败打 `console.warn`，并写入阶段诊断 `validationErrors`                                                                        |
| 卡死任务   | 永远停在"生成中"，渲染任务占着积分                                                                   | 用户打开创作台时，6 小时无进展的会话标为可重试失败，卡住的渲染任务失败并退还积分（条件更新，不会误退已成功的）                          |
| 语义审核器 | gemini 单次 25 秒                                                                                    | 最多 2 次，每次 50 秒，总计 100 秒（渲染端等待上限 120 秒）；失败即关闭的规则不变                                                       |

### IR 与编译器（`src/lib/animation-schema.ts`、`src/lib/manim-compiler.ts`）

- `line`/`arrow` 新增 `startRef`/`endRef`（必须指向 point）：编译为 `always_redraw`，每帧从点重画，
  点沿路径移动时连线跟随；`projection: 'x_axis' | 'y_axis'` 生成从点到坐标轴的垂线。出场用 FadeIn，
  变换用 ReplacementTransform（避免与逐帧重画冲突、变换后弹回）。
- `move_along` 新增 `reverse`：沿路径从终点走回起点。配合只覆盖一侧区间、不画出来的路径曲线，可以表达"从右侧/左侧逼近"。
- `curve` 不再二次缩放和移动。
- 没有使用新字段的规格编译结果与之前完全相同（原有测试全部通过）。
- 已用本地 Manim 渲染验证：点沿抛物线向切点逼近、割线与垂线全程跟随，最后的切线正好切在 (1,1)。

## 3.1 第二轮（2026-10-16）：OpenCode、参数绑定、审核

### 模型路线

- 新增 OpenCode 推理网关（`src/core/ai/opencode-chat.ts`，Anthropic Messages，`https://opencode.ai/inference/v1`）上的
  **Claude Haiku 5.5**（$0.10 / $0.50 每百万 token）。探测：每次 1–5 秒、零失败；同一天 KIE 经历了吞吐减半和维护停服。
- 配了 `opencode_api_key`（后台 AI → OpenCode，或 Worker secret `OPENCODE_API_KEY`）时，规划链路是
  **OpenCode Haiku 5.5 → KIE gpt-6-luna**，两家供应商互为兜底；没配则只用 KIE。生产已于 2026-10-16 配置。
- Anthropic 的结构化输出对可选参数和联合类型有数量上限，规划 schema 过不去，所以这条线不用 schema 约束，
  靠提示词里的字段合同 + zod 校验 + 修复轮。按类型的字段表（`SCENE_OBJECT_KINDS` / `SCENE_TIMELINE_OPS`）
  同时生成 KIE 的严格 schema 和提示词里的合同文字，两边不会对不上。
- Haiku 5.5 用 `medium`：`high` 时一次规划要 1.7–2.4 万输出 token，场景撞上限。
- 不用 Sonnet 5.5（产品决定：成本）。

### 审核

- **投影 bug**：数学审核拿到的规格投影缺 `label`、`xExpr`/`yExpr`/`domain`、弧角、矩阵值和全部时间信息，
  审核据此判"路径未定义""文字为空""没有时间"。已改为传入全部证据字段（只去掉颜色、重要度这类样式）。
- **只有数学问题阻断**（产品决定）：审核问题带 `scope`（`mathematics` / `visual`）。只涉及画面的问题先只重做一次场景，
  仍有则带警告放行并记日志；任何数学问题或未标范围的问题仍然阻断（`mathReviewBlocks`）。

### IR：参数绑定

| 能力     | IR                                                            | 编译                                      |
| -------- | ------------------------------------------------------------- | ----------------------------------------- |
| 参数     | `kind: tracker`，`initial`                                    | `ValueTracker`                            |
| 参数动画 | `op: set_value`，`value`                                      | `tracker.animate.set_value(v)`            |
| 绑定点   | point + `trackerRef` + `xExpr`/`yExpr`（t 的函数）            | `always_redraw` 的 Dot                    |
| 实时读数 | `kind: readout`，`trackerRef`、`expr`、`position`、`decimals` | `always_redraw` 的 Text + `DecimalNumber` |
| 黎曼和   | `kind: riemann`，`trackerRef`、`expr`、`domain`、`sample`     | `get_riemann_rectangles`，n = round(t)    |
| 轨迹     | `kind: trace`，`traceRef`（点）                               | `TracedPath`，构建时加入场景              |

规则：tracker 不可见，只能被 `set_value` 操作；绑定点不能再 `move_along`；所有逐帧重画的对象出场用无位移的 FadeIn，
变换用 ReplacementTransform。本地 Manim 验证：h→0 时割线随点逼近切线、n 从 1 到 32 的矩形细分、
单位圆上的点与正弦曲线上的点由同一个 θ 驱动并描出完整正弦波。

- 单元测试 593 项通过；`pnpm build` 通过。
- 冒烟测试（`scripts/smoke-animation-plan.ts`，真实 KIE + 本地数据库，跑完整规划 → 场景 → 数学审核 → Manim 编译）：
  结果见第 5 节。

## 5. 冒烟结果与遗留问题

2026-10-15/16 共 4 轮、13 次完整规划，**还没有一次端到端通过**。逐轮看到的问题和对应处理：

| 轮次          | 主要失败                                                                                    | 处理                                                                                                       |
| ------------- | ------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| 1（旧提示词） | 审核两次驳回（理由成立：只单侧逼近、割线不跟随点），第二次审核两次 290 秒超时，耗尽 20 分钟 | 生成提示词提前写明审核标准；对冲请求                                                                       |
| 2             | 分镜少于 3 个镜头；场景缺按类型必填字段；时间线重叠；审核仍驳回"割线不跟随"                 | 保留 minItems 等约束；场景 schema 按类型拆分；时间线机械修正；发现并补上"线跟随点"的 IR 能力和曲线错位 bug |
| 3             | KIE 输出速度降到每秒 20–37 个 token，单次场景 158–518 秒；时间线小间隔错开无法修正          | 场景每种类型只列自己的字段（输出约减半）；小间隔合并进同一组；审核驳回只涉及画面时只重做场景               |
| 4             | KIE 故障：502、"服务器维护中"、300 秒超时；剩余场景错误主要是"镜头焦点 id 不存在"           | 焦点 id 自动对齐；出场前的强调改为出场                                                                     |

第 4 轮在 KIE 出故障前的数据：规划 59–77 秒，场景 33–53 秒、输出 3.4–6.4k 字符（第 2 轮为 8–12k）。

遗留问题：

1. **KIE 的可用性是最大风险**。同一天内经历了正常（第 2 轮）、吞吐减半（第 3 轮）和维护/502（第 4 轮）。
   生产上 Workflow 会对上游错误排队重试约 17 分钟，冒烟脚本没有这一层，所以冒烟结果比生产更悲观。
   单一转售商没有冗余，可考虑同在 KIE 上的第二个模型做兜底，但对 KIE 整体故障无效。
2. 需要在 KIE 恢复后再跑一轮冒烟，拿到至少一次端到端通过，再部署。
3. 渲染端（真实 Sandbox 渲染 + 视觉质检）还没有用新规格实测过；本地 Manim 只验证了割线逼近切线的几何。
4. 黎曼和"n 逐步增大"、单位圆投影到正弦曲线这类需要参数联动的画面，IR 仍然表达不了（审核会正确驳回）。
   要么扩展 IR（例如 `ValueTracker` 驱动的 n），要么为这些高频题材做确定性模板。

## 6. 运行

```bash
# 需要 .env.development 里的 KIE_API_KEY（不会被打印）
pnpm tsx scripts/with-env.ts "npx tsx scripts/smoke-animation-plan.ts"
SMOKE_ONLY=0,2 pnpm tsx scripts/with-env.ts "npx tsx scripts/smoke-animation-plan.ts"
SMOKE_PROMPT="..." pnpm tsx scripts/with-env.ts "npx tsx scripts/smoke-animation-plan.ts"
KIE_API_KEY=... node scripts/probe-kie-gpt.mjs
```
