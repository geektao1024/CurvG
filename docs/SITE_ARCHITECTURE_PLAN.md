# CurvG 网站架构规划（第一性原理版）

更新时间：2026-08-04（在 07-22 评审基线上标注实施进展）
状态：已评审的规划基线（本文档为战略层，实施细节见 `ANIMATION_ORCHESTRATION.md` 与 `CURVG_CREATOR_ARCHITECTURE.md`；曲线百科实施细节见 `CURVE_ENCYCLOPEDIA.md`）

> **实施进展（2026-08-04）**：`/curves` 百科（30 条）与 SEO 内页矩阵
> （`/math-animation-tool`、`/free-math-video-creator`、`/manim-alternative`、
> `/blog/best-math-video-apps`）已建成并通过验证，待部署。百科采用静态内容模块
> 而非数据表（决策记录见 `CURVE_ENCYCLOPEDIA.md` §2）；`gallery_entry` 数据表
> 仍是 UGC 画廊层的待办。`/gallery`、`/playground`、`/learn` 未实施。

---

## 1. 第一性原理：产品本质拆解

把"数学动画制作工具站"拆到不可再分的原子，只有四个事实层：

| 层          | 内容                   | 谁关心                  |
| ----------- | ---------------------- | ----------------------- |
| 1. 数学真相 | 公式、数学结构、正确性 | 用户唯一在意的对错来源  |
| 2. 意图真相 | 规格 / 分镜（Spec）    | AI 与人之间可审查的契约 |
| 3. 执行真相 | Manim 代码             | 确定性渲染的输入        |
| 4. 产物真相 | 视频 / 缩略图 / 分享页 | 可分发、可复用的资产    |

**核心推论：**

- 竞品 animg.app 的护城河不是"AI 生成视频"，而是"规格审批"这个中间层（第 2 层）。CurvG 已在 Creator 工作流中复制了该机制。
- 因此差异化必须建立在其他原子上。判断：**第 4 层（产物的公开复用网络）是 animg 做得最弱、SEO 价值最高的一层**，这正是 "Curve Gallery" 定位的正确性所在。
- 第 1 层（数学验证）是唯一能宣称"比 animg 更准"的技术依据，需要补强。

## 2. 一句话战略

> animg 卖的是"不用装 Python 就能跑 Manim"；CurvG 卖的是 **"数学被验证过的动画 + 可复用的曲线知识库"**——用百科做流量，用验证做信任，用模板做成本优势。

## 3. 网站信息架构（面向国际化 SEO）

```
curvg.com
├── /                    首页：价值主张 + 实时曲线预览（已有，差异化资产）
├── /creator             AI 创作工作台（已实现：对话 → 规格 → 代码 → 渲染）
├── /playground          Manim 在线编辑器（后期：Monaco + 任意代码渲染）
├── /gallery             公开画廊 ← SEO 增长引擎（UGC 层）
│   ├── /gallery/[slug]          动画详情：视频 + 公式 + 规格 + 代码 + "Create similar"
│   └── /gallery/tag/[tag]       主题聚合页（fourier-series、pythagorean-theorem…）
├── /curves              曲线百科 ← CurvG 独有内容资产（编辑精选层）
│   └── /curves/[slug]           每条曲线：交互式参数 + LaTeX 公式 + 一键生成动画
├── /learn（或 /docs）    教程与用例页（for-educators / for-students / for-creators）
├── /pricing             定价（保持"未发布套餐"的诚实策略，直到有成本数据）
└── /blog                内容营销（已有基础设施）
```

### 与 animg 的关键区别：双层内容结构

animg 的 library 是"用户作品堆"。CurvG 做成 **"曲线百科 + 作品画廊"双层结构**：

- `/curves/*`：编辑精选、数学上验证过的权威页面。承接长尾搜索（如 "cardioid equation animation"）。
- `/gallery/*`：UGC 作品，每条挂靠到对应曲线/主题标签。

流量闭环：**百科页（SEO 入口）→ 画廊（案例证明）→ Creator（转化）→ 新作品回流画廊**。

## 4. 系统架构：确认与修正

### 4.1 保持不变的正确决策

- 规格审批状态机：`draft → spec → approval → code → queued → rendering → completed`。
- 渲染永不进 Web Worker，走 Queue + Sandbox + R2。
- AST 白名单只是纵深防御，容器隔离才是安全边界。
- 未验证成本前不定价。

### 4.2 需要补强的三点

1. **数学验证层缺位**
   现状：`renderer/validate_scene.py` 只做 AST 安全扫描。
   目标：渲染前对规格中的 `mathClaims` 用 SymPy 做等式 / 导数 / 采样验证，失败即阻断。
   意义：这是 "verified math" 宣称的唯一技术依据，也是信任差异化的核心。

2. **模板库优先于自由生成**
   现状：`src/modules/animations/service.ts` 走自由生成路径。
   目标：为 30–50 条画廊曲线各配一个参数化 Manim 模板，LLM 优先做"选模板 + 填参数"，自由生成仅作兜底。
   意义：命中率和成本都会好一个量级（竞品分析文档已有相同结论）。

3. **画廊数据模型尽早落库**
   现状：首页曲线是 TS 硬编码采样。
   目标：立即建 `gallery_entry` / `curve_project` 数据表并发布 `/curves` 百科页。
   意义：SEO 积累是时间函数，越早发布越早生效。

## 5. 执行优先级（基于代码实际进度修正）

代码进度已跑到原路线图的 Phase 2/3（Creator + Renderer 已实现但未在生产环境端到端验证），因此优先级修正如下：

| 优先级 | 任务                                                      | 理由                          |
| ------ | --------------------------------------------------------- | ----------------------------- |
| P0     | 端到端验证渲染链路（部署 renderer、跑通 10 个代表性场景） | 已实现但未验证 = 最大风险敞口 |
| P0     | 采集这 10–50 个场景的真实成本数据                         | 解锁定价，是商业化前提        |
| P1     | `/curves` 百科页 + 画廊数据表 + 首批 30 条内容            | SEO 是时间函数，越早越好      |
| P1     | SymPy 数学验证 + 参数化模板库                             | 差异化核心："verified math"   |
| P2     | `/gallery` UGC 发布 + "Create similar"                    | 需要先有 Creator 用户         |
| P2     | Playground（Monaco 编辑器）                               | 面向开发者的引流入口，非核心  |
| P3     | 定价与积分计费                                            | 依赖 P0 的成本数据            |

## 6. 各页面的验收标准

- **/curves/[slug]**：未登录用户可查看 LaTeX 公式、交互调参实时预览、点击"生成动画"进入 Creator（预填该曲线上下文）。每页有独立 title/description/OG 图，可被搜索引擎索引。
- **/gallery/[slug]**：展示视频、公式、规格摘要、Manim 代码（可折叠）、"Create similar" 按钮；作者可控公开/私有。
- **/creator**：同一输入可复现生成记录；渲染前用户可修改规格与代码；渲染失败有可读诊断。
- **/pricing**：在拿到 ≥50 个真实成本样本前，只展示"早期访问"而非价格表。

## 7. 与既有文档的关系

- `ROADMAP.md`：本文档第 5 节的优先级已同步至路线图"当前最优先的下一步"。
- `ANIMATION_ORCHESTRATION.md`：基础设施选型（Cloudflare、D1、R2、Sandbox）不变；该文档取代了已删除的 `TECHNICAL_ARCHITECTURE.md`，并补充了 provider 路由与确定性兜底。
- `CURVG_CREATOR_ARCHITECTURE.md`：四层事实模型与状态机不变，本文档在其上补充数学验证层与模板库。
- `docs/research/animg.app/COMPETITOR_ANALYSIS.md`：竞品结论的战略化落地即本文档第 2、3 节。
