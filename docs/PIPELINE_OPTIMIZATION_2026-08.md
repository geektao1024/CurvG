# 创作管线优化方案 — 上游模型合规性与出片率(2026-08-03)

> **实施状态(2026-08-04 更新)**:路径 A 已落地并通过全量测试(当前 193 项),主模型与预算矩阵按当时产品配置生效；**D 的观测项与 B5 的修复轮次已落地**(见文末"2026-08-04 增量"),B 其余条目与 C 未动工。注意：stage 行只保存最终产出方，不能据此认定 KIE 或 DeepSeek 请求失败；provider 健康以 `animation_planning_attempt` 和第三方日志核对。初次 IR→Manim 编译主路径与 scene-only 恢复属于本次增量，待生产部署验证。

结论先行:旧生产快照明确暴露了两类需要继续验证的问题——**(1) scene 阶段是失败重灾区**,包括上游超时/502/524/饱和/空响应和结构化契约错误;**(2) Workflow 规划时间预算曾经耗尽**。旧 stage 行中 Kuaipao 占比高只能说明它更常成为最终产出方，不能证明 KIE 请求没有发出或没有响应；当前 provider 健康判断必须结合按次 attempt 记录。当前可靠性修复还包括：已审核 spec 初次直接确定性编译，scene 阶段在前五个 artifacts 通过后允许谱系保持的 deterministic recovery。

既定立场(2026-08-03 与产品确认):**质量红线优先,门槛不降**;延续 2026-08-02「排队重试或可见失败、绝不偷换内容」决策;程序化修正只修**格式与引用**,不造内容。四条路径全部采纳,时长容忍按宽松档(规划总预算 ~20 分钟)。

## 生产证据(D1 `animation_planning_stage`,341 行,截至 2026-08-03)

失败分布(status=failed):

| 阶段        | 错误码                                               | 次数 | 样本                                                                                                                                        |
| ----------- | ---------------------------------------------------- | ---- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| scene       | upstream_unavailable                                 | 3    | `Server exception` / `Kuaipao request failed (524)`                                                                                         |
| scene       | schema_validation                                    | 2    | `parametric requires xExpr, yExpr and domain`、`curve requires expr`、`line requires start and end`、`Transform requires a valid targetRef` |
| scene       | workflow_internal                                    | 2    | `Workflow stopped after its planning time budget was exhausted`                                                                             |
| scene       | upstream_saturated / upstream_timeout                | 2    | —                                                                                                                                           |
| mathematics | upstream_timeout ×2, stage_failed ×1                 | 3    | `Kuaipao request timed out`、容量锁 busy                                                                                                    |
| storyboard  | empty_response / stage_failed / upstream_unavailable | 3    | `Kie returned an empty response`、502                                                                                                       |

交付方分布:kuaipao/gpt-5.6-sol 占绝对多数;deterministic-scene-v1 / deterministic-fallback-v1 承担了可观流量;kie/gemini-3.6-flash 完成行寥寥。曾有 kie/gpt-5.5 实验痕迹。

## 当前时间预算(现状参数)

| 层                    | 位置                                                                        | 现值                              |
| --------------------- | --------------------------------------------------------------------------- | --------------------------------- |
| 单 failover 目标      | `-shared.ts:312` `ANIMATION_PROVIDER_TIMEOUT_MS`                            | 60s                               |
| 单规划阶段(两目标)    | `planning.ts:54` `STAGE_PROVIDER_TIMEOUT_MS`                                | 120s                              |
| 整次规划绝对 deadline | `service.ts:77` `ANIMATION_STAGE_TIMEOUT_MS`(经 `animationStageDeadlineAt`) | 300s                              |
| KIE provider          | `-shared.ts:223-224`                                                        | request 105s / overall 210s       |
| Kuaipao provider      | `-shared.ts:206-207`                                                        | request 240s / overall 300s       |
| Workflow 排队梯子     | `workflows/animation.ts:41`                                                 | 5s/30s/1m/2m/4m/5m/5m,共 8 次尝试 |
| 每阶段格式修复        | `planning.ts:49` `MAX_STAGE_FORMAT_REPAIRS`                                 | 1                                 |

六阶段 × 强推理慢模型塞不进 300s 总预算——生产里 `budget exhausted` 即由此而来。

---

## 路径 A:主模型切 `kie/gpt-5-6-luna` + 推理拉满 + 预算矩阵加宽

前置:先跑 `scripts/probe-kie-luna.mjs`(需 `KIE_API_KEY`)确认 (a) luna 在 codex 路由下的模型标识,(b) `reasoning.effort` 接受 high/xhigh/max 中的哪些,(c) 实测 P95 延迟用于校准下表。

改动清单:

1. `src/core/ai/kie-chat.ts` — `kieChatModelRoutes` 增加 `'gpt-5-6-luna': { protocol: 'responses', path: 'codex/v1/responses', supportsStreaming: false }`(以探活为准)。
2. `src/core/ai/chat.ts:12` — `reasoningEffort` 联合类型扩展为探活确认的取值(如 `'low'|'medium'|'high'|'xhigh'|'max'`);各 provider 序列化处透传即可(responses 协议 `reasoning.effort`,chat-completions `reasoning_effort`)。KIE 若只收 high,则在 KieChatProvider 内 clamp,不在调用方分叉。
3. `src/config/animation-models.ts` — 白名单增 `{ provider:'kie', model:'gpt-5-6-luna', presetKey:'kieGpt56Luna', requiredTier:'free' }`;`DEFAULT_ANIMATION_MODEL`、`FREE/PRO_AUTO_MODEL_TARGETS` 切到 luna;`getAnimationReasoningEffort` 对 luna 返回最高档,`getAnimationCompositionReasoningEffort`(scene/代码合成)返回次高档(scene 响应体大,拉满推理易撞 max_output 与时限,先次高档观察)。
4. `-shared.ts` — `KIE_PRIMARY_MODEL` 改 luna;保留 kuaipao gpt-5.6-sol 为二级、admin backup 第三级(独立供应商防共病,不动)。
5. 预算矩阵(宽松档,探活后校准):

| 参数                                   | 现值 → 建议值             | 理由                                                                 |
| -------------------------------------- | ------------------------- | -------------------------------------------------------------------- |
| `ANIMATION_PROVIDER_TIMEOUT_MS`        | 60s → **150s**            | 两目标串行 ≤300s,不越 CF 单调用红线;KIE 吃不满时剩余自动让给 kuaipao |
| `STAGE_PROVIDER_TIMEOUT_MS`            | 120s → **300s**           | 单阶段贴 CF 5 分钟上限                                               |
| `ANIMATION_STAGE_TIMEOUT_MS`           | 300s → **1200s**          | 六阶段 × 强推理 + 修复轮次,总预算 20 分钟                            |
| KIE request/overall                    | 105s/210s → **150s/300s** | 与单目标 cap 对齐                                                    |
| Kuaipao request/overall                | 240s/300s(保持)           | 已宽                                                                 |
| Workflow step `plan-animation` timeout | 25min(保持)               | 已容纳 20min 预算                                                    |
| 排队梯子                               | 保持                      | 语义不变                                                             |

风险:端到端等待显著变长(前端已有排队横幅承接);token 成本上升;`ANIMATION_STAGE_TIMEOUT_MS` 同时被代码生成/审计路径引用(`service.ts:720,1667,2481`),需同步核对这些调用所在 Workflow step 的 timeout 兼容。

## 路径 B:程序化自动修正层 + 修复回路增强(消灭 schema_validation 大头)

原则:**可机械派生/归一的自动修,缺内容的仍 reject 但改为增量定点修复**。所有机械修正写入 diagnostics(info 级)保持可审计。

1. **LaTeX 派生取代逐字拷贝**:scene 的 formula 对象只声明 `formulaId`,`composeAnimationSpecFromArtifacts` 组装时从 `mathDossier.formulas[].latexParts` 注入 parts/expr;删除"逐字符拷贝"这一最反 LLM 的合同条款。同步修订 `STAGE_CONTRACTS.scene` 与 `STAGE_ROLES.scene`(`planning.ts:125-160`)。
2. **时间戳吸附**:timeline 事件越出 shot 窗口 ≤0.5s → 夹紧;storyboard 末镜 `endAt` 与 `durationSeconds` 偏差 ≤1s → 吸附。越差更大仍 reject(那是内容错)。
3. **id 引用归一**:大小写/`-`↔`_` 归一后能唯一匹配的 focusRef/shotId/ref → 自动改写;不唯一 → reject。
4. **transform targetRef 推断**:上下文唯一可推断时填入;否则进入定点修复。
5. **增量定点修复合同**:`curve requires expr` 这类缺内容字段,不再把整包 zod 错误 + 全量重发丢回模型,而是"只重发 `objects[i]`/`timeline[j]` 补齐字段"的窄合同,程序侧合并。`MAX_STAGE_FORMAT_REPAIRS`:scene 1→**3**,其余阶段 1→**2**(配合 A 的总预算)。
6. 落点:归一化层放 `parseAnimationPlanningArtifact` 之后、`validateAnimationPlanningStageSemantics` 之前(`animation-pipeline.ts` / `planning.ts:678-687`);全部有单测(`tests/animation-ir.test.ts` 系)。

## 路径 C:结构化输出硬约束(从源头消灭缺字段)

1. zod v4 自带 `z.toJSONSchema` — 为六阶段 artifact schema 生成 JSON Schema。
2. Kuaipao(OpenAI 兼容 chat-completions):请求加 `response_format: { type:'json_schema', json_schema:{...} }`。
3. KIE codex responses 路由:`text: { format: { type:'json_schema', ... } }`;gemini chat-completions 路由先试 `response_format: { type:'json_object' }`。是否透传以探活脚本扩展验证为准。
4. 挂接方式:`ChatCompletionInput` 增加可选 `responseSchema`,provider 能力不支持时静默忽略(无损降级),失败路径仍走既有 `rejectInvalidResult`/failover 机制。

## 路径 D:确定性模板库扩展 + per-attempt 观测

1. **观测先行**(文档 ANIMATION_ORCHESTRATION.md 已自我警告"provider 计数只测交付不测尝试"):新表 `animation_planning_attempt`(runId/stage/provider/model/errorCode/latencyMs/attemptNo),由 `ProviderFailoverChatProvider` 每次尝试落一行;附 `scripts/stage-health.sql` 聚合脚本。KIE 真实健康度、luna 切换效果都靠它验收。
2. **模板库**:沿 heart/cycloid/quadratic-tangent 机制(`buildDeterministicAnimationPlanningProfile`),从生产 `chat` 表聚类高频题材扩 3-5 个参数化 profile(候选:单位圆与正弦、导数极限定义、黎曼和逼近、泰勒展开、欧拉公式),每个配 `deterministicMathReviewForScene` 式白名单审计,LLM 只做意图匹配+参数填充。

## 实施顺序与验收

顺序:**探活 → A(小 diff 先上)→ B(核心工程)→ C(按探活结果)→ D(观测小改先行,模板库持续)**。

验收指标(全部以生产 D1 为准,上线一周对比):

- scene `schema_validation` 失败 → 0(B1/B5 + A 模型智力)
- `workflow_internal` budget exhausted → 0(A 预算)
- KIE 实际交付占比可测且显著回升(D 观测 + A)
- 规划端到端 P50/P95 时长有记录,P95 ≤ 20 分钟
- 质量门(720p 终审、数学审计)通过标准零改动 — 红线不动的证明

## 探活脚本

```bash
KIE_API_KEY=<你的key> node scripts/probe-kie-luna.mjs
```

输出 (model × effort) 可用矩阵与延迟;`max`/`xhigh` 4xx 而 `high` 可用 ⇒ KieChatProvider 内 clamp 到 high。

## 2026-08-04 增量(第一性原理审查后落地)

已实施并通过 182 项测试与对抗式审查:

1. **D 观测项**:新表 `animation_planning_attempt`(迁移 `drizzle/0004_giant_colleen_wing.sql`,纯新增)。`ChatCompletionInput.onAttempt` 回调由 `ProviderFailoverChatProvider` 在每次目标尝试后 fire-and-forget 上报(含被后备救回的失败),`recordPlanningAttempt`(`stages.ts`)落库,never-throw。聚合脚本 `scripts/stage-health.sql`(provider 成功率 / 阶段失败码 / 主力失败-后备救回趋势)。单 target 部署也强制走 failover 包装,避免遥测盲区。已知盲区:circuit-breaker 直接跳过的目标不产生行。
2. **B5 修复轮次**:`maxStageFormatRepairs`——scene=3,其余阶段=2(原全局 1)。同时修复对抗审查发现的高危缺陷:`deadlineAt` 原在修复循环外冻结,慢首轮会饿死后续修复轮;现每轮重算(`roundDeadlineAt`),仍受 plan 总 deadline 约束。
3. **渲染产物 sanity check**:renderer 上传后校验正式 MP4 ≥ 32KB(`MIN_VIDEO_BYTES`),不足即抛错、不得报 completed;`updateRender` 的 completed 分支要求 videoUrl 存在(路由层已有同款防线,双保险)。

仍未动工:B1-B4/B6(LaTeX 派生、时间戳吸附、id 归一、targetRef 推断、增量定点修复合同)、路径 C(json_schema 结构化输出)、D 模板库扩展。另采纳的高优先待办:**真实提示词回归测试集**(代数/几何/微积分/物理/3D/中文公式/长视频),用于每次模型/预算/合同改动后的离线验收。

## 2026-08-04 增量二:CurvG Lite/Pro 双档与 scene 时窗根治

生产遥测证实 scene 4 连败全部是**被自有 150s 单目标上限掐断**(kie/kuaipao 均整 150s `upstream_timeout`,前五阶段 13-93s 一次过),据此实施:

1. **时窗根治**:`ChatCompletionInput.perTargetTimeoutMs` 按阶段传入——scene 单目标 300s/阶段窗口 600s,其余 150s/300s;代码合成与 spec 重建(同为大输出)单目标 300s;三家 provider request 超时 290s(留平台余量)。
2. **双档产品**(用户拍板):CurvG Lite = `deepseek/deepseek-v4-flash` 官方 Responses API 直连(新 provider `src/core/ai/deepseek-chat.ts`,思考 high,max/xhigh 归一)、CurvG Pro = `kie/gpt-5-6-luna` 全阶段 max。默认 Lite;交叉兜底 Lite: DS→Kuaipao,Pro: KIE→Kuaipao→DS→backup。auto 目标 [Lite, Pro] 按凭证择先,DeepSeek 密钥未配置期 auto 自动落 Pro 不 503。
3. **对抗审查修复**:failover 层 effort 上限钳制(Pro 的 max 不再泄漏进 kuaipao/backup 兜底腿);DeepSeek in-body failed 非重试化;assistant 轮 output_text;admin 后台新增 DeepSeek 配置组+连接测试;退役 preset 不再渲染为永久禁用行。
4. **验收**:193 项测试(新增 deepseek-chat 套件 10 项)、vite/cf 双 build、191 基线类型错误零新增。

已知边界(诚实记录):Pro 链第三腿(DeepSeek)在"双慢超时"模式下单轮内拿不到时间,只在快失败(auth/4xx/5xx/饱和)时可达;慢超时场景靠排队梯子下一轮 + 断路器接管。DeepSeek 上游对 Responses 严格性(assistant 轮内容类型、'high' 档接受度)以上线后 `animation_planning_attempt` 遥测为准。
