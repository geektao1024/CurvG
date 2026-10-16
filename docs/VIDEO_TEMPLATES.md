# 模板出片（付费主线）

更新时间：2026-10-16。本文是"做成视频"这条付费主线的唯一出处：为什么改、怎么组织、怎么加模板、怎么计费。
收费规则以 `MONETIZATION.md` 为准，生成管线（测试版）以 `PIPELINE_REFACTOR_2026-10.md` 为准。

## 1. 为什么改（第一性原理）

用户付钱买的是**一个数学上对的、做好的视频**。2026-08-01 到 2026-10-16，自由输入 → 大模型从零写整部动画 →
数学审核 → 渲染这条路一个用户视频都没交付出来（近 7 天 34 个会话 30 个失败）。失败不是某个模型的问题，
而是这条路的形状：每一部片都是一次开放式编程，任何一个对象、坐标、时间点出错都会被校验或审核拦下。

竞品对照（2026-10-16）：

- AnimG：同样是 AI 写 Manim，但把"方案确认 + 看片后修改 + 代码可编辑"做成流程本身，错误交给用户；
  免费 2 个带水印的动画，Pro 去水印、1080p。
- Mathos：解题工具，视频只是一种输出，约 30 秒出片，页面直接写"可能出错"。

所以：

1. **付费主线是模板**：每个模板是一段我们写好、测过的代码，参数进、成片出，画面上的每个数都在渲染前用 TypeScript 算好。
   同样的参数，每次得到同样的片。没有模型参与出片，成功率由模板本身决定。
2. **AI 只做小事**：从用户的话里挑模板、填参数（一次小调用，几秒，几乎不花钱），结果经过和表单同一道参数校验。
3. **自由生成降为测试版**：保留原管线，数学审核从"拦下"改成"带警告交给用户决定"。
4. **免费给到能感受到价值**：每个验证过邮箱的账号 3 个免费预览（720p，带水印），付费得到 1080p 无水印。

## 2. 代码位置

| 内容                                | 位置                                                                                                                                               |
| ----------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| 模板注册表、参数校验、构建          | `src/lib/video-templates/index.ts`                                                                                                                 |
| 单个模板                            | `src/lib/video-templates/templates/*.ts`                                                                                                           |
| 表达式：NumPy / LaTeX / 纯文本      | `src/lib/video-templates/expr.ts`（解析器复用 `src/lib/board/expr.ts`）                                                                            |
| Manim 工具：版式、主题、字幕、时钟  | `src/lib/video-templates/manim.ts`                                                                                                                 |
| 数值：积分、零点、极值、分数/π 显示 | `src/lib/video-templates/numeric.ts`                                                                                                               |
| 公开目录（创作台用）                | `src/lib/video-templates/public.ts`，`GET /api/video-templates`                                                                                    |
| AI 匹配                             | `src/modules/animations/template-match.ts`，`POST /api/video-templates/match`                                                                      |
| 创建/改参数/渲染                    | `POST /api/animations`（`mode: 'template'`）、`POST /api/animations/:id/template`、`POST /api/animations/:id/approve`（`delivery: 'hd'` 导出高清） |
| 创作台界面                          | `src/components/creator-templates.tsx`                                                                                                             |
| 站内入口映射                        | 曲线 `src/content/curves/video.ts`，实验 `src/content/labs/video.ts`                                                                               |
| 本地渲染检查                        | `scripts/render-video-templates.ts`                                                                                                                |
| 测试                                | `tests/video-templates.test.ts`                                                                                                                    |

## 3. 现有模板（12 个）

| id                      | 讲什么                                     | 参数                   |
| ----------------------- | ------------------------------------------ | ---------------------- |
| `function-graph`        | 函数图像：截距、零点、极值点               | f(x)、x 范围           |
| `quadratic-function`    | 二次函数：开口、配方、对称轴、判别式与根   | a、b、c                |
| `function-transform`    | a·f(b(x−h))+k 一步一步变换                 | f(x)、a、b、h、k       |
| `derivative-tangent`    | 割线两侧逼近切线，斜率读数落到 f′(a)       | f(x)、a                |
| `riemann-sum`           | 矩形从 1 到 n，和收敛到定积分              | f(x)、a、b、n、取样点  |
| `integral-accumulation` | 面积函数 A(x) 与微积分基本定理             | f(x)、a、b             |
| `unit-circle-trig`      | 单位圆上的点画出 sin/cos 波                | sin/cos、圈数          |
| `taylor-series`         | 泰勒多项式逼近与收敛半径                   | 六个函数之一、最高次数 |
| `fourier-series`        | 正弦谐波拼出方波/锯齿波/三角波，吉布斯现象 | 波形、谐波数           |
| `parametric-curve`      | 动点描出参数曲线                           | x(t)、y(t)、t 范围     |
| `polar-curve`           | 射线扫出极坐标曲线（含 r < 0）             | r(θ)、θ 范围           |
| `linear-transformation` | 2×2 矩阵变换网格、î ĵ 与单位正方形，行列式 | a、b、c、d             |

每个视频都可以选横屏 16:9 / 竖屏 9:16、纸面（浅色）/ 暗场（深色），字幕跟随界面语言（中文 / 英文）。
曲线百科 44 条曲线、10 个实验章节的"做成视频"直接打开对应模板并带好参数（不经过 AI）。

## 4. 一个模板必须满足

1. **数学在 TypeScript 里算**：画面上出现的数（导数、和、根、行列式）都由模板算好再写进场景；不能算准的（不可导点、
   发散积分、无定义区间）在 `check` 里拒绝，用户在表单上就能看到原因。
2. **参数只走一道门**：`resolveTemplateParams`：丢弃未知键、缺省取默认、范围与类型校验、模板自己的交叉检查。
   表单、AI 匹配、站内链接都走这里，服务端在创建和每次渲染时再走一遍。
3. **代码不拼用户字符**：字符串用 `py()`、数字用 `num()`、表达式用 `toNumpy()`（从语法树打印，全括号）。
4. **时长精确**：所有动画和停顿落在 0.1 秒网格上（`seconds()`），渲染器按计划时长逐帧核对 MP4。
5. **过渲染器校验**：`renderer/validate_scene.py`（测试里逐个模板、横竖两种画幅都跑）。
6. **中文不进 LaTeX**：公式用 `MathTex`，文字用 `Text`（Noto Sans/Serif CJK）；混排用 `panelMixed`。

## 5. 加一个模板

1. 在 `templates/` 新建文件，导出 `VideoTemplate`：`id`、`version`、`category`、中英文标题与简介、`matchHint`
   （写清楚适用和**不适用**的请求，AI 匹配靠它）、`examples`、`params`、`check`、`build`。
2. 在 `index.ts` 的 `VIDEO_TEMPLATES` 里注册；在 `tests/video-templates.test.ts` 钉住它的关键数值。
3. 本地渲染并看接触表：
   ```bash
   docker build -t curvg-manim-preview -f scripts/docker/manim-preview.Dockerfile scripts/docker   # 一次
   npx tsx scripts/render-video-templates.ts <id> [--frame 9:16] [--locale en] [--theme studio] [--params '{...}']
   ```
   输出在 `output/video-templates/<id>-<画幅>-<语言>/`：`scene.py`、MP4、`contact-sheet.png`。
4. 改动会改变已出片效果时，`version` 加一。

## 6. 渲染与计费

- 模板视频的源码在每次渲染时由参数重新构建；渲染器的语义审核（KIE Gemini）和模型修复**不对模板运行**：
  像素指标照常记录，渲染报错直接失败（那是模板 bug，不应让模型改写）。
- 交付档位（渲染器 `delivery`）：`preview` = 1280×720、30fps、右下角与画面中央烧入 CurvG 水印（ffmpeg drawtext，
  渲染器镜像装了 `fonts-dejavu-core` 和 `fonts-noto-cjk`）；`hd` = 1920×1080、无水印。
- 选档（`resolveRenderEntitlement`）：积分够 → 高清，扣 `animation_render_credits`（默认 20）；不够但还有免费预览 →
  预览，免费；都没有 → 402，创作台给出"查看套餐"。免费预览数由后台 `animation_free_previews` 配置（默认 3），
  按"花费 0 积分、未失败未取消的渲染任务"计数，只给验证过邮箱的账号。
- 预览视频完成后，可以一键"导出高清无水印版"（同一个视频重新渲染为 hd，扣积分）。

## 7. 测试版（AI 自由生成）

- 入口：创作台第二个标签"AI 自由生成 · 测试版"，或模板匹配不到时的按钮。
- 数学审核修订一次后仍有数学问题：不再判失败，问题写入 `parts.mathWarnings`，会话停在 `awaiting_approval`，
  创作台显示警告，用户选择"仍然生成视频"或"改用模板"。
- 每日新建上限（免费账号 3 个/天）只约束测试版（它调用大模型）；模板出片受免费预览数约束。
