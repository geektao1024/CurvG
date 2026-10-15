# CurvG SEO 与内容策略

更新时间：2026-10-14（文首新增 GSC 基线与词簇调整；§0 起为 2026-08 原文，与文首冲突时以文首为准）

## 2026-10-14 GSC 基线与词簇调整

**数据**（GSC 近 3 个月，网页搜索）：约 100 次点击、3,000 次展示；10 月日展示从约 30 涨到 150–200，平均排名约 9。

| 发现                               | 数据                                                                                                                                           | 结论                                                             |
| ---------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------- |
| 点击几乎全是品牌词                 | "curvg" 55 次点击，排名 1.4；首页 58 次点击                                                                                                    | 首页标题不必再抢通用词                                           |
| "AI 数学动画生成器"词簇需求很小    | "math animation maker" 9 展示/排名 14.9；"manim ai" 30 展示/排名 12.5                                                                          | 8 月首页定位没有带来真实流量                                     |
| **曲线百科是真正的自然流量入口**   | 曲线页合计约 1,600 展示，排名 7–13，点击接近 0；查询是 "epicycloid / astroid graph / cycloid equation / perimeter of astroid / heart curve" 等 | 这是展示量最大、离第一页顶部最近的一组词；要提升摘要吸引力和排名 |
| 指南文章是唯一稳定的非品牌点击来源 | "8 款数学视频工具" 743 展示、23 点击、排名 6.5                                                                                                 | 用它给新栏目传链接权重                                           |
| 英文、全球流量为主                 | 印度点击最多，美国展示最多；中文页展示很少                                                                                                     | 英文页优先；中文页保证质量                                       |

**词簇调整**（替代 §0 中首页与实验室的分配，其余页面不变）：

| 页面               | 主词簇                                                                       |
| ------------------ | ---------------------------------------------------------------------------- |
| 首页               | 品牌 + 定位：CurvG、interactive math labs、math animations、explainer videos |
| `/labs` 与学科页   | interactive math / physics labs、数学与物理交互实验（H1 与首页拉开差异）     |
| `/curves/{slug}`   | {曲线名} + equation / formula / graph / perimeter / area；英文为主           |
| `/wonders/{slug}`  | {现象名} + animation / zoom / explained（每个专题手写 `metaTitle`）          |
| `/creator`、落地页 | 保持 manim ai generator / math video 词簇（排名 4–8，暂不动）                |

**已做的调整**：首页标题与描述改为定位口径；实验室 H1 改为"数学与物理交互实验"；曲线页描述改为"可读公式 + 一条具体性质（弧长、面积）+ 交互图像"，
每条曲线有静态图像文件（供图片搜索收录）、专属分享图和 LearningResource 结构化数据；曲线与奇观双向链接（外摆线/内旋轮线 ↔ 傅里叶，
心脏线 ↔ 曼德博，费马螺线/黄金螺线 ↔ 向日葵）；指南文章链到实验室与奇观；中文曲线文案统一全角标点。

**2026-10-15 追加**：曲线页加了公式卡（方程 + 周长 / 面积等数值）与 FAQ（FAQPage），条目从 30 扩到 60（含分形分类，选题依据见 `CURVE_ENCYCLOPEDIA.md` 第 8 节）。
复查时单独看新 30 条的收录与展示，以及老 30 条在加了公式卡后的点击率变化。

**复查**：部署后 4–6 周对比本节数据，重点看曲线页的点击率与平均排名、首页非品牌展示、`/labs` 与 `/wonders` 的收录。

## 0. 词簇分配（2026-08-04 定版）

竞争验证结论：Manim 词簇（manim web editor 等）由 manim.community 与多家专业竞品重兵把守；
"math animation" 外圈词簇（math animation maker / ai math animations / math animation maker
online free）无任何专业玩家的专门页面经营（animg.app 首页自身定位是 "Manim AI Generator"，
排名属被动获得）。因此：

| 页面                         | 主词簇                                                           | 说明                                                                           |
| ---------------------------- | ---------------------------------------------------------------- | ------------------------------------------------------------------------------ |
| `/`                          | math animation maker、ai math animations、online free 变体       | 首页承接外圈大词；Manim 降级到副标题                                           |
| `/creator`                   | manim ai generator、Manim AI 生成器                              | 功能页承接 Manim 词簇，与首页不再互相蚕食                                      |
| `/math-animation-tool`       | online math animation tool                                       | 功能展示内页（2026-08-04 上线）                                                |
| `/free-math-video-creator`   | create animated math videos free                                 | 免费入口内页（2026-08-04 上线）                                                |
| `/manim-alternative`         | manim alternative no coding                                      | 诚实对比页（2026-08-04 上线）                                                  |
| `/blog/best-math-video-apps` | best app for making math videos                                  | Listicle 博文，自我收录含利益声明                                              |
| `/labs` + 实验集 / 章节页    | {知识点} 交互演示、{concept} interactive、{知识点} 几何意义 长尾 | 免费交互实验，每章一页；规则见 `LABS_PLAN.md`，转化到 `/creator`               |
| `/curves` + 60 详情页        | {curve name} equation / graph / animation 长尾                   | 曲线百科：公式卡 + FAQ + 作画动画 + 免费导出 + 预填 Creator                    |
| ~~`/library`~~               | —                                                                | 2026-10-15 下线，全部 301 到 `/curves#{category}` 或对应实验；sitemap 不再列出 |

生产环境已上线云端渲染与免费注册额度（2026-08 确认），"free"、"render online" 可以如实使用。
文案角度红线：不使用内部运维口吻（"已配置""生产环境""故障切换""早期访问"等）；
中文渲染术语统一用"云端渲染"，不用"托管渲染"。

## 1. 唯一产品定义

CurvG 是一个**公式优先、分阶段审查的 Manim 数学动画生成器与曲线内容库**。

公开文案必须围绕以下路径展开：

`公式 / 教学意图 → 场景规格 → Manim 代码 → 隔离渲染 → 可复用产物`

CurvG 的差异不是“输入一句话立即得到视频”，而是让公式、假设、场景规格、代码和渲染结果分别可见、可检查、可重试。

## 2. 目标用户与搜索意图

| 用户                 | 主要任务                             | 应承接的搜索表达                                                                  |
| -------------------- | ------------------------------------ | --------------------------------------------------------------------------------- |
| 数学教师             | 制作函数、证明、几何与微积分讲解动画 | math animation generator、visual math explanation、数学动画生成器、数学可视化动画 |
| 数学内容创作者       | 制作课程、短视频和讲解视频           | AI math video generator、Manim video generator、Manim 数学动画生成器              |
| Manim 使用者与开发者 | 减少场景规划、代码编写和渲染环境成本 | AI Manim generator、Manim online、online Manim animation generator                |
| 学习者               | 观察参数、曲线与变换如何变化         | equation animation、curve animation、公式动画、参数曲线动画                       |

当前没有接入关键词搜索量服务。以上表达来自产品定位、竞品页面和实际搜索结果中的用词，只用于信息架构与语义覆盖，不宣称具体搜索量或排名难度。

## 3. 页面关键词映射（2026-08-04 与 §0 词簇分配对齐）

| 页面                       | 主搜索意图                                                   | 辅助语义                                  | 转化目标                 |
| -------------------------- | ------------------------------------------------------------ | ----------------------------------------- | ------------------------ |
| `/`                        | math animation maker、ai math animations                     | 3Blue1Brown-style、online free、no coding | 进入 Creator             |
| `/creator`                 | manim ai generator                                           | scene plan、review、cloud render          | 创建并检查动画方案       |
| `/math-animation-tool`     | online math animation tool                                   | functions、geometry、calculus、no install | 进入 Creator             |
| `/free-math-video-creator` | create animated math videos free                             | starter credits、免费边界、退款规则       | 注册并首次渲染           |
| `/manim-alternative`       | manim alternative no coding                                  | comparison、code export、no lock-in       | 进入 Creator             |
| `/curves` 及 60 详情页     | {curve} equation / graph / area 长尾                         | LaTeX、interactive、parameter             | 预填进入 Creator         |
| `/pricing`                 | CurvG pricing                                                | 套餐、渲染积分、账单                      | 升级付费                 |
| `/blog`                    | manim math animation guides、best app for making math videos | listicle、教学工作流                      | 导流内页与 Creator       |
| 法律页面                   | 品牌导航查询                                                 | privacy、terms                            | 建立信任，不承担获客任务 |

## 4. 文案框架

首页使用 `用户问题 → 目标结果 → 实现方式 → 适用场景 → 差异价值 → 行动`：

1. **问题**：一次性提示词到视频会隐藏公式误读、场景逻辑和代码错误。
2. **结果**：帮助用户把抽象公式转成更容易理解、讲解和分享的动态画面。
3. **方式**：CurvG 将公式、场景方案、Manim 代码和预览拆成可检查、可修改的阶段。
4. **场景**：教师、学习者、课程作者和数学视频创作者分别能完成什么任务。
5. **差异**：同时强调数学关系的可见性与创作过程的可控性，不用工程部署状态充当产品价值。
6. **行动**：优先进入 `/creator`，免费注册（含起步额度）作为次级路径。

## 5. 事实边界

### 首页可以表述

- 公式驱动的 SVG 曲线预览已经存在。
- Creator 已实现对话、结构化规格、审批、Manim 代码和视频审查界面。
- AI 结果不能自动等同于数学正确，用户需要检查公式、假设、规格、代码和预览。

### 仅作为内部工程事实

- 本地 Queue → Sandbox → Manim → R2 流程已经通过代表性场景验证。
- 产品采用 Cloudflare Workers、Queue、Sandbox、D1 与 R2 的目标架构。
- 这些内容只有在转化为用户可用、可验证的线上能力后，才能进入首页销售文案。

### 不得表述

- 不使用“99.9% 精度”“绝对正确”“已验证数学正确”等没有验证体系支撑的说法。
- 不把 GIF、WebM 或任何未验证导出格式写成现有能力。
- 不把远程 Cloudflare Sandbox、Queue、R2 或真实模型全链路写成已上线。
- 不虚构用户数量、客户、学校、社区规模、价格、节省比例或渲染速度。
- 在 SymPy 或同等级数学验证层上线前，只能说“可检查”，不能说“数学已验证”。
- Queue、Sandbox、R2、联调结果和生产验收清单属于项目文档或可用性 FAQ，不在首页中段作为主要销售内容展示。
- 首页如需说明早期阶段，只回答用户当前可以体验什么，不使用“本地验证”“生产证据”“当前构建”等内部研发口吻。

## 6. 中英文表达规则

### 英文

- 优先使用 `reviewable`、`inspectable`、`formula-first`、`staged workflow`、`Manim animation generator`。
- 避免空泛的 `stunning`、`effortless`、`professional in seconds`、`perfect accuracy`。
- 标题先写任务和品类，再写品牌；首页 Title 例外，保持既定品牌格式。

### 中文

- 使用“Manim 数学动画生成器”“公式动画”“数学可视化”“场景方案”“云端渲染”（面向用户；“隔离渲染/沙箱”仅用于工程文档）。
- “审查”用于审批动作，“检查”用于用户理解文案；不滥用“精准”“专业级”“一键生成”。
- 每段先给结论，再解释实现方式或边界。

## 7. 页面元数据基线

| 页面     | 英文 Title（2026-08-04 已上线）                                         | 中文 Title                                                |
| -------- | ----------------------------------------------------------------------- | --------------------------------------------------------- |
| 首页     | `AI Math Animation Maker — Create Math Animations Online Free \| CurvG` | `AI 数学动画制作工具 — 在线免费生成数学动画视频 \| CurvG` |
| Creator  | `Manim AI Generator — Plan, Review & Render \| CurvG`                   | `Manim AI 生成器 — 规划、检查、渲染 \| CurvG`             |
| Pricing  | `CurvG Pricing \| Free, Starter, and Pro Manim Plans`                   | `CurvG 定价 \| 免费版、入门版与 Pro 套餐`                 |
| Blog     | `Manim Math Animation Guides \| CurvG`                                  | `Manim 数学动画指南 \| CurvG`                             |
| Tool 页  | `Online Math Animation Tool — Plan, Review & Render \| CurvG`           | `在线数学动画工具 — 规划、检查、云端渲染 \| CurvG`        |
| Free 页  | `Create Animated Math Videos Online Free \| CurvG`                      | `在线免费制作数学动画视频 \| CurvG`                       |
| Alt 页   | `Manim Alternative With No Coding Required \| CurvG`                    | `无需写代码的 Manim 替代方案 \| CurvG`                    |
| Curves   | `Math Curve Encyclopedia — Equations, Graphs & Animations \| CurvG`     | `数学曲线百科 — 方程、图像与动画 \| CurvG`                |
| 曲线详情 | `{Name}: Equation, Graph & Animation \| CurvG`                          | `{Name}：方程、图像与动画 \| CurvG`                       |

Meta description 必须说明页面能解决的任务，同时保留当前产品阶段；不能只写品牌口号。

## 8. 发布前检查

- 页面只有一个 H1，H1 与 Title 搜索意图一致。
- 主关键词自然出现在 Title、H1、首段和至少一个 H2 中。
- CTA 指向当前最相关的下一步，不把高意图用户统一送到注册页。
- 所有状态文案与 `CURVG_CREATOR_ARCHITECTURE.md` 的验证记录一致。
- 空博客、登录页、后台和账户页不进入索引或 sitemap。
- 英文、中文 canonical 与 hreflang 自引用且互相对应。
- `llms.txt` 不使用“Landing page”“Pricing plans”等模板描述。
