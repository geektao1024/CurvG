# CurvG SEO 与内容策略

更新时间：2026-07-23

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

## 3. 页面关键词映射

| 页面       | 主搜索意图                                             | 辅助语义                                                               | 转化目标                   |
| ---------- | ------------------------------------------------------ | ---------------------------------------------------------------------- | -------------------------- |
| `/`        | math curve animation gallery、math animation generator | equation animation、parametric curve animation、formula-first workflow | 浏览公式预览或进入 Creator |
| `/creator` | AI Manim animation generator、online Manim generator   | scene plan、Manim code generation、isolated rendering                  | 创建并审查动画方案         |
| `/pricing` | CurvG pricing                                          | early access、render cost、Manim rendering                             | 注册早期访问               |
| `/blog`    | Manim math animation guides                            | equation visualization、teaching with animation                        | 建立主题权威并导向 Creator |
| 法律页面   | 品牌导航查询                                           | privacy、terms、project content                                        | 建立信任，不承担获客任务   |

## 4. 文案框架

首页使用 `用户问题 → 目标结果 → 实现方式 → 适用场景 → 差异价值 → 行动`：

1. **问题**：一次性提示词到视频会隐藏公式误读、场景逻辑和代码错误。
2. **结果**：帮助用户把抽象公式转成更容易理解、讲解和分享的动态画面。
3. **方式**：CurvG 将公式、场景方案、Manim 代码和预览拆成可检查、可修改的阶段。
4. **场景**：教师、学习者、课程作者和数学视频创作者分别能完成什么任务。
5. **差异**：同时强调数学关系的可见性与创作过程的可控性，不用工程部署状态充当产品价值。
6. **行动**：优先进入 `/creator`，早期访问注册作为次级路径。

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

- 使用“Manim 数学动画生成器”“公式动画”“数学可视化”“场景方案”“隔离渲染”。
- “审查”用于审批动作，“检查”用于用户理解文案；不滥用“精准”“专业级”“一键生成”。
- 每段先给结论，再解释实现方式或边界。

## 7. 页面元数据基线

| 页面    | 英文 Title 方向                                             | 中文 Title 方向                                |
| ------- | ----------------------------------------------------------- | ---------------------------------------------- |
| 首页    | `CurvG — Math Curve Animation Gallery & Generator`          | 保持同一品牌 Title                             |
| Creator | `Reviewable AI Manim Animation Generator \| CurvG`          | `可审查的 AI Manim 数学动画生成器 \| CurvG`    |
| Pricing | `CurvG Pricing & Early Access \| Manim Animation Generator` | `CurvG 定价与早期访问 \| Manim 数学动画生成器` |
| Blog    | `Manim Math Animation Guides \| CurvG`                      | `Manim 数学动画指南 \| CurvG`                  |

Meta description 必须说明页面能解决的任务，同时保留当前产品阶段；不能只写品牌口号。

## 8. 发布前检查

- 页面只有一个 H1，H1 与 Title 搜索意图一致。
- 主关键词自然出现在 Title、H1、首段和至少一个 H2 中。
- CTA 指向当前最相关的下一步，不把高意图用户统一送到注册页。
- 所有状态文案与 `CURVG_CREATOR_ARCHITECTURE.md` 的验证记录一致。
- 空博客、登录页、后台和账户页不进入索引或 sitemap。
- 英文、中文 canonical 与 hreflang 自引用且互相对应。
- `llms.txt` 不使用“Landing page”“Pricing plans”等模板描述。
