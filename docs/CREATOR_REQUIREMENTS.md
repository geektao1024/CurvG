# CurvG 创作页需求规格

制定时间：2026-07-29
状态核对：2026-08-04

本文档记录创作页（Creator）功能与业务流的需求决策，重点是数学公式生成环节的用户体验与交互。**本期需求已基本交付**，文档保留为决策记录——它解释了「为什么模型只出 IR、编译器出代码」这一中枢决策的由来，这个理由在代码里读不出来。

已实现架构见 `CURVG_CREATOR_ARCHITECTURE.md` 与 `ANIMATION_ORCHESTRATION.md`。

## 一、交付状态

原定的创作路径改造已完成。当前路径：三入口（模板 / 公式 / 描述）→ 六阶段规划 → 三层 IR → 可编辑 spec + 可拖拽时间轴 → 确定性编译 → 沙箱渲染 → 多出口。

2026-08-01 逐项核对结果：

| 原缺口             | 状态     | 落地位置                                                                                   |
| ------------------ | -------- | ------------------------------------------------------------------------------------------ |
| 没有数学排版       | 已交付   | katex 进依赖，`src/components/math-formula-preview.tsx`                                    |
| 没有公式级输入入口 | 已交付   | `creationMode` 三入口，`creator-workspace.tsx:1658/1766/1862`                              |
| 渲染前无法验证数学 | 部分交付 | 浏览器端即时预览 `src/lib/math-preview.ts`；SymPy 层仍未做（本就不在本期范围）             |
| spec 与代码只读    | 已交付   | `V2SpecificationEditor`，`creator-workspace.tsx:2836`                                      |
| 时间轴不可拖拽     | 已交付   | 手写 pointer 事件，`creator-workspace.tsx:2924-2970`（超出「先只读条形图」的建议实施顺序） |
| 版本无 UI          | 已交付   | `selectedVersion` + `versions/$version/restore` 路由                                       |
| 渲染链路未接积分   | 已交付   | `creditTaskId` 贯穿 service；生产 `animation_render_credits=20`                            |
| 无取消、无阶段进度 | 已交付   | `canceled` 状态机 + `$id/cancel` 路由                                                      |
| 完成后出口单一     | 已交付   | 下载 MP4 / 导出 `.py` / 发布画廊                                                           |

未交付项：

- 画廊只有 API 路由（`src/routes/api/gallery/animations.ts`），**没有画廊页面路由**，生产 0 条已发布记录。
- SymPy 符号校验（本期明确排除，见 4.3）。

## 二、本期之后暴露的新问题

历史上，确定性编译器解决了「模型写错 Python」，但旧实现仍把模型写 Python 放在初次出片主路径；模型失败时还可能用预置场景替代并标记为成功。

2026-07-31 生产数据：21 条 completed 阶段里 15 条由 `provider=curvg` 的确定性兜底产出（71%），前一天是 32%。用户看到「生成完成」，拿到的是与 prompt 无关的通用场景。

当前实现已修正这两个边界：初次出片直接由已审核 spec 确定性编译；仅当 scene 阶段失败且前五个阶段均已通过校验时，才从这些已批准 artifacts 组装保守 scene，并持久化 `deterministic_scene_fallback` 诊断。前置阶段缺失时仍排队重试或可见失败，不再用无关模板冒充成功。

## 三、原始目标业务流

```
[ 从模板 ] [ 从公式 ] [ 从描述 ]      ← 默认停在模板
      │         │          │
      │    公式输入（ASCII 手输 + ∫Σ√ 符号面板插 LaTeX）
      │         │ 自动识别数学对象类型（可手动推翻）
      │         └─→ 即时曲线预览（零成本，按类型分）
      │                   │
      │              [ 形状对了，继续 ]
      │                   ↓
      │            模型生成 spec（对象 + 时间轴 + 布局 IR）
      │                   ↓
      │        ┌── 可拖拽时间轴 + 字段编辑 ──────────┐
      │        │  手改 → 不过模型，直接重新编译        │
      │        │  发意见 → 过模型，以当前 spec 为底稿   │
      │        └──────────────┬───────────────────┘
      │                       ↓ 确定性 spec→Manim 编译器
      │              Python（编译产物，可看可导出，不可编辑）
      │                       ↓
   独立路径          阶段进度：排队 ✓ 校验 ✓ 编译 ● 转码 ○ 上传
（自己的 template     可取消 → 回到 code_ready 可重试
  表 + 参数 schema）   后台记 canceled 记录（阶段 + 耗时 → 成本数据）
   参数改到头了                ↓
   → 请新建创作      [ 下载 MP4 ] [ 导出 .py ] [ 发布到画廊 ] [ 再改一版 ]
```

## 四、需求决策

### 4.1 三层入口

创作页提供三个 tab，默认停在「从模板」。

- **从模板**：模板库为独立数据模型，有自己的 template 表与参数 schema，与 AI 的 spec 是两种东西，两条代码路径。模板是人工写好并验证过的参数化 Manim 场景，改参数不调模型。
- **从公式**：结构化公式字段 + 意图描述字段分离，公式即时排版预览。
- **从描述**：自然语言描述，走完整 AI 链路。

模板与 AI 路径不互通。用户在模板路径改到头（想加分镜、换表现手法），提示新建一个「从描述」创作。

### 4.2 公式输入语法

双模输入：

- 手输走 ASCII 数学（类 Desmos 写法，如 `sin(x)+cos(2x)`）。
- 复杂结构通过符号面板（`∫ Σ √ ᵃ⁄ᵇ π θ →`）点击插入 LaTeX。

解析器需同时兼容两种输入，因为自动识别预览类型依赖解析结果。

### 4.3 渲染前验证：浏览器端即时预览

零成本、零延迟，在前端用公式采样绘制静态 SVG/Canvas。首页 `src/blocks/formula-workspace-preview.tsx` 已有类似能力可复用。

预览形式按数学对象类型分别实现：

| 数学对象  | 预览形式       |
| --------- | -------------- |
| 函数      | 曲线图         |
| 定积分    | 面积阴影图     |
| 级数/数列 | 部分和收敛图   |
| 矩阵      | 单位方格形变图 |

类型由前端解析公式结构自动识别，并允许用户手动推翻（下拉改为其他类型）。模板路径无需识别——模板自带类型。

SymPy 符号校验不在本期范围，保留为后续增强。

### 4.4 修改粒度：两条路径完全分开

- **手改字段** → 不走模型，直接重新编译出代码。
- **发自然语言意见** → 走模型，但以当前 spec（含用户的手改）为底稿。

不需要「锁字段」概念，也不需要冲突弹窗——手改物理上不经过模型，不存在被覆盖的问题。

### 4.5 编辑界面：可拖拽时间轴

```
0s      2s      4s      6s
├───────┼───────┼───────┤
 axes ▐███▌
 curve      ▐███████▌  ← 拖动改时间，拉边改时长
 eq1               ▐████▌
```

时间轴轨道直接映射 IR 的 timeline。可编辑字段：对象时长、开始时间、缓动、颜色、标题、公式文本。

**建议实施顺序**：先做字段表单 + 时间轴只读条形图，用它验证编译器路线跑得通；拖拽在编译器稳定后再上。两者读写同一份 IR，先做表单不会白做。

### 4.6 布局：编译器完全接管

spec 只声明语义区域（公式区 / 图形区 / 标题区），具体坐标与缩放全由编译器计算。重叠与出界从结构上不可能发生。

```
┌────────┐┌──────┐
│ 公式区  ││ 图形区│  ← 永不重叠
└────────┘└──────┘
```

### 4.7 等待期：阶段进度 + 可取消

```
渲染中  ▰▰▰▰▰▱▱▱  62%
 ✓ 排队      ✓ AST 校验
 ✓ Manim 编译  ● 转码中…
 ○ 上传
 预计还需 ~40s        [ 取消 ]
```

取消语义：

- 用户侧：回到 `code_ready`，代码与 spec 保留，可直接重新渲染或先改再渲染。
- 后台：仍落一条 `canceled` 记录，含已完成阶段与已耗时长，作为成本数据。

### 4.8 完成后出口

`[ 下载 MP4 ] [ 导出 .py ] [ 发布到画廊 ] [ 再改一版 ]`

## 五、核心架构变更：确定性 spec→Manim 编译器

这是本次需求的中枢决策，其他决策都依赖它。

> **实现状态（2026-08-04）：决策已切换为初次出片主路径。**
>
> `approveAnimation` 在没有渲染修复证据时直接调用
> `compileAnimationSpec(params.spec)`。`composeAnimationCode` 与
> `parseManimCode` 仍保留，但只用于有明确 render/quality evidence 的定向
> Python 修复，不再是首次渲染的硬依赖。
>
> 三层 IR 已按决策落地（`animation-schema.ts` 的 `objects` / `layout` /
> `timeline`），现在由编译器拥有初次 Python 产出；相同 spec 可以复现相同
> 源码。

**模型不再写 Python。** 模型只输出 spec（JSON），编译器负责全部 Python。spec 表达不了的动画就是做不了，明确告知用户。

spec schema 采用**对象 + 时间轴 + 布局三层 IR**：

```
objects:  [{ id: 'c1', kind: 'curve', expr: 'sin(x)', domain: [-3, 3] }]
timeline: [{ at: 0, op: 'draw', ref: 'c1', runTime: 3.5, ease: 'inOut' }]
layout:   { regions: 'left|right' }
```

这套 IR 的表达力就是 CurvG 的产品上限，是整个改造中最该慢慢定的一件事。

代码面板保留，定位从「模型产出、需人工审阅」变为「编译产物、可复现」——相同 spec 必得相同代码，可看、可复制、可导出 `.py`，平台内不可编辑。

## 六、对现有代码的影响

### 6.1 需要重写

**`src/lib/animation-schema.ts` 的 `sceneSchema` 整体重建。** 现在 `visuals: string[]`、`actions: string[]` 存的是散文（如 `"让曲线从左往右生长"`），确定性编译器无法编译散文。换成 `objects` / `timeline` / `layout` 三层 IR。

> 已落地。`animation-schema.ts:99-110` 是三层 IR，散文字段已移除。

**`approveAnimation`（`src/modules/animations/service.ts`）初次出片不再调 `parseManimCode`。**

> 已落地。`parseManimCode` 仍保留给定向模型修复与旧代码边界；初次渲染的
> Python 来自 `compileAnimationSpec`，renderer 的 AST 检查继续作为纵深防御。

**状态机新增 `canceled` 过渡**，且渲染链路需先接上积分（Roadmap Phase 2 列的「积分预扣/撤销」尚未实现）。Cloudflare Queue 无法杀掉已入队消息，取消需由 app 写标志、consumer 在阶段之间检查。

> 已落地。`canceled` 状态与 `creditTaskId` 均在 service 中；生产
> `animation_render_credits=20`。

### 6.2 可以简化

架构文档中记录的一串已修补模型失误，在编译器接管布局与时序后从「prompt 防御」变为「结构上不可能」：`self.camera.frame`、猜测的 Axes helper、`get_scale_factor`、hidden FadeIn targets、Transform-source reassignment、unpositioned formula targets、text outside safe frame、non-positive `run_time`、non-positive `wait`。

这是「编译器完全接管布局」最大的收益。

> 已兑现于初次出片路径。模型代码修复仍保留必要的输入校验，但不会影响
> 没有修复证据的首次编译。

`renderer/validate_scene.py` 的 AST 门建议保留作纵深防御，但它不再是主要正确性来源。

> 仍保留。它是 Sandbox 内的纵深防御，以及模型定向修复路径的最后边界。

### 6.3 旧数据

已有 animation 记录（含已验证渲染成功的几条）保留为只读归档：可看规格、代码、视频，不能再修改。新创作全走编译器路径。不写迁移脚本。

## 七、两处已记录的成本提醒

**模板两套数据模型的成本比看起来高。** 既然确定性编译器会存在，模板天然就是「一份预写好且已验证的 spec」——同一结构、同一编译器。另建 template 表与参数 schema 是在有了统一底座之后手动劈成两半，多写的是隔离代码而非省下的代码。此项已按「真正两套，彻底隔离」决策执行，但成本认知记录在此。

**模板「秒级出图」通过 renderer 达不到。** Manim 编译加容器启动就是几十秒。模板要真的秒级，只能是客户端预览。

## 八、与 Roadmap 的关系

本文档对应 Roadmap Phase 2 的修订与深化。原 Phase 2 假设模型直接产出候选 Manim 代码；本次决策改为模型只产出 IR、编译器产出代码。

Phase 3 的「预览质量与最终质量两档渲染」在本期被浏览器端即时预览部分替代——即时预览解决的是「形状对不对」，低清快渲解决的是「构图和时序对不对」，两者不互斥，低清档保留在 Phase 3。

Roadmap P1 的「SymPy 数学验证」不在本期范围。

## 九、可靠性与体验决策（2026-08-02 苏格拉底问答定案，08-03 实施）

背景：生产同时存在三类「生成不了」——A. 上游全忙秒失败（π 请求，KIE 满载 + Kuaipao 同挂）；B. scene 阶段静默模板替换（"成功"但内容可能不贴题）；C. 走完全部规划后才发现积分不足。四项决策：

### 9.1 成功底线 = 分层交付

「每次都能生成」由零成本层兑现：过程产物随阶段流式可见（9.3），AI 视频是异步升级。预览 ≠ 成片，界面如实区分。

### 9.2 全挂兜底 = 排队自动重试 + 第三模型路 + scene-only 恢复

- Workflow 重试从 2 次 × 5 秒改为退避阶梯 5s/30s/1m/2m/4m/5m/5m（8 次，约 17 分钟），每次失败持久化 `parts.queue`（attempt/nextRetryAt/since/reason），UI 显示排队横幅 + 倒计时；阶梯耗尽才落可见失败。排队期间可取消。
- 初次代码生成不再等待模型写 Python，直接由 `compileAnimationSpec` 编译。
- scene 阶段在前五个 artifacts 均已通过校验时允许 deterministic scene-only 恢复：已知 profile 使用验证过的几何；未知主题使用数学 dossier 自有公式与分镜顺序生成保守场景，并记录 `diagnostic.kind=deterministic_scene_fallback`。缺少前置 artifacts 时仍排队，不做无关模板替换。
- 第三模型路：`animation_backup_base_url/api_key/model` 三项齐备时启用，OpenAI 兼容 `/chat/completions`（复用 `OpenAICompatibleChatProvider`，name='backup'），排在 KIE、Kuaipao 之后，不进公开模型目录。

### 9.3 等待体验 = 三项全选

- 阶段进度 + 可取消：规划期 `PlanningStatusPanel` 已接 `parts.pipeline.stages` 六阶段实时状态，新增取消按钮（复用既有 cancel 路由与 mutation）。
- 过程产物边等边看：`planningStageSummary` 携带非 scene 阶段的 artifact，面板按阶段渲染紧凑摘要——intent 标题/hook、knowledge 沿 spine 的概念链、curriculum 教学节拍、mathematics coreClaim 与公式（等宽）、storyboard 分镜。
- 提交即走 + 完成通知：busy→终态的实时转变触发 toast（打开旧记录不触发）；Workflow 本就 durable，关页不中断。

### 9.4 积分 = 只为成功付费

经济上已成立并经核实：规划阶段从不预扣；渲染预留（`creditTaskId`）在 dispatch 失败、渲染回调 failed、取消三条路径均 revoke。本期补可见性：models 接口暴露 `renderCredits`，余额不足在提交前显示预警（不阻断规划——方案与代码仍有价值）；所有失败卡片显示「本次失败未消耗积分」。

### 尚未实施（记录为后续项）

- 描述模式的 0 秒即时预览层（公式采样搬进创作页首屏）；formula 模式已有。
- 站内红点/邮件通知（当前为前台 toast）。
- 排队横幅中的预计总等待时间估算。
