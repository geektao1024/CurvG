# CurvG 资源库规划

记录时间：2026-09-22
状态：**P0 已在代码里**。详情页样板是 `/library/scenes/permutations-vs-combinations`：16:9 成片在前，右侧 KaTeX，阶段表可跳到成片时间。源片在 `scripts/library-scenes/permutations_vs_combinations.py`。`parabola-rise` 仍是旧的 5 秒样片。

相关文档：

- 战略层仍以 `SITE_ARCHITECTURE_PLAN.md` 为准；2026-09-22 起，其中「animg library = 用户作品堆 / 双层结构」被本文的三层结构取代。见该文档文首修订说明。
- 曲线对象层的实现契约仍是 `CURVE_ENCYCLOPEDIA.md`。`/curves` 不并入 `/library`，也不重定向。
- 路线图入口见 `ROADMAP.md`「资源库」节。
- 2026-07 的竞品笔记 `docs/research/animg.app/COMPETITOR_ANALYSIS.md` 只覆盖 Creator / Playground / 规格状态机。Library 的页面结构以本文第 2 节为准。

参考材料（只借鉴结构，不复制内容）：

- 竞品页面架构：2026-09-21 复核的公开站 [animg.app/en/library](https://animg.app/en/library)。
- 分类呈现：本地参考工程 `/Users/mac/Downloads/shapeof.world-main`（内容图 `src/data/content-graph/`，条目模型 `src/data/worlds/types.ts`，分类页 `src/routes/category.$categoryId.tsx`）。该工程有独立内容许可，CurvG 不搬运其世界、海报、文案或交互。

---

## 1. 结论

CurvG 资源库是**编辑精选的可检查动画场景**。浏览骨架借 AnimG Library（Hub → 主题 → 场景详情），分类与文案借 shapeof.world（主父节点 + 兼挂、question / hook / payoff、有序路线）。

三层并存，不互相替代：

| 层         | 路由              | 回答的问题                 | 状态                         |
| ---------- | ----------------- | -------------------------- | ---------------------------- |
| 对象百科   | `/curves/{slug}`  | 这条曲线是什么、方程是什么 | 已实施，30 条                |
| 编辑场景库 | `/library/...`    | 这个概念怎样被演出来       | 本文，未实施                 |
| 用户作品   | `/gallery/{slug}` | 某人发布了什么             | 只有 API，后期挂到同一套分类 |

`/curves` 回答「心脏线是什么」。资源库回答「斜率怎样改变直线」。把百科扩成资源库会把对象页和场景页揉在一起。

差异化落在四件事上：

1. 场景挂在知识图上。一条傅里叶主挂「谐波」，同时出现在参数曲线和函数图像。
2. 卡片文案是 question / hook / payoff，不是课表标题。
3. 详情页是已有的三产物检查器：规格、只读代码、视频，外加「用此规格生成」进 `/creator?prompt=`。
4. 几何对象继续活在 `/curves`。场景用 `curveSlugs` 链过去，百科流量能落到可播放作品。

## 2. AnimG Library 复核（2026-09-21）

公开站把编辑库和社区拆开了。2026-07 文档里「animg 的 library 是用户作品堆」已过时：Library 是编辑层，Explore 才是 UGC。

| 层                   | URL                                   | 性质                       |
| -------------------- | ------------------------------------- | -------------------------- |
| Library              | `/en/library`                         | 编辑精选场景               |
| Community            | `/en/explore`、`/en/animation/{slug}` | 用户发布作品，带作者与标签 |
| Creator / Playground | `/en/creator`、`/en/playground`       | 生产工具                   |

Library 浏览链：

```text
/en/library
  → /en/library/hub/{discipline}
    → /en/library/hub/{discipline}/{topic}
      → /en/library/{slug}
```

2026-09-21 可见的学科 Hub：Math、Computer Science、Physics、Biology、Chemistry、Economics。Math Hub 下的主题包括 Algebra、Geometry、Functions、Number Theory、Linear Algebra、Probability、Calculus。同一场景可以同时出现在多个 Hub 的主题里（例如神经网络前向传播同时出现在 CS 与 Linear Algebra）。主题是横切标签，Hub 是浏览入口。

场景 slug 编码三维元数据：`{学科}_{学段}_{课题}_{标题}`。实例：

`math_high_school_linear_functions_linear_functions_slope_y_intercept`

学段取值包括 primary、middle、high_school、university、software_engineer。这使整库读起来像课件目录，适合「Algebra animations」这类 SEO，弱在跨学科现象。

详情页（以 Linear Functions 公开页为准）的可检查结构：

- Description
- Phases 表：阶段名、时长、说明
- Layout：ASCII 画面草图
- Area Descriptions：区域、内容、实现说明
- Assets & Dependencies：字体、颜色、Manim 版本
- Notes：ValueTracker、always_redraw、坐标范围等
- Code 标签：只读 Manim Python

这和 CurvG Creator 已有的「规格 / 代码 / 视频」同构。资源库要公开的是这个检查器，不是竞品的分镜、源码或缩略图。

首页把 Library（精选例子）和 Explore（社区最新）分成两块。CurvG 对应关系：`/library` 对 Library，以后的 `/gallery` 对 Explore。

## 3. shapeof.world 分类模型（只借机制）

本地参考工程不按课表切，按知识图切。

### Category

- 字段：`id`、双语 title / description、`accent`、`order`、`publication`（缺省为 draft）
- 边：`primaryParentId`（面包屑与主浏览位置）+ `additionalParentIds`（跨学科挂载）
- 构建期断言：id 唯一、无环、无自引用、公开节点的父节点必须公开

根类在参考工程里有 9 个（宇宙、数学与信号、物理、地球气候、生命、化学材料、AI、计算工程、经济社会）。子类例子：

- `waves` 主挂 `math-signals`，兼挂 `physics`
- `chaos-boundary` 主挂 `physics`，兼挂 `math-signals`
- `emergence` 主挂 `computing-engineering`，兼挂 `life-body` 与 `economy-society`

CurvG **不采用这九大根类**。数学动画楔子会被宇宙、气候、化学冲淡。借的是图结构。

### World 文案与证据

条目用现象句，不用对象名当卡片标题：

- `question`：为什么值得看
- `hook`：进去会碰到什么
- `payoff`：看完带走的一句事实
- `posterTitle` / `posterHook`：卡片上的洞察句
- `evidence`：参考工程用 `live | verified | compiled | modeled`。CurvG v1 只用 `modeled | verified`（verified = 人审过公式与分镜）
- `difficulty`：`intro | standard | advanced`。这取代 AnimG 的学段主轴
- `related[]`、`sources[]`

### Path 与分类页

Path 是有序条目序列，是浏览路线，不是第三套分类法。参考工程首页用路线手风琴，而不是无限网格。

分类页呈现：主路径面包屑、大标题、一句描述、accent 渗进分隔、子类卡片、条目网格。CurvG 保留这个层次，字号和表面收到现有 `curvg-heading` 与画框体系里，不搬参考工程的纸色全幅视觉。视觉规范仍是 `DESIGN_SYSTEM.md`。

## 4. 信息架构

```text
/library                         根 Hub 索引
/library/{hub}                   该 Hub 的子类分组
/library/{hub}/{topic}           子类全量列表
/library/scenes/{slug}           场景详情
```

约定：

- slug 用概念名：`unit-circle`、`geometric-series`。学段不进 URL。
- Hub / topic 的 id 稳定后只改 title，不改 id。
- 未知 slug → 404。
- 每个 Hub、Topic、Scene 各有 en / zh 的 title、description、canonical、hreflang，进入 sitemap 与 `llms.txt`，沿用 `localizedLinks`。
- Header 现有 Gallery 指向 `/#gallery`。资源库上线后，主导航改为 `/library`（en: Library，zh: 资源库）。首页样片区改为「从资源库精选」，链到对应 scene。
- `/curves` 保持对象百科。Topic 页可以并列「场景卡」和「对象卡」；对象卡链到 `/curves/{slug}`，不伪造视频。

### v1 分类图

只公开数学侧。`motion-systems` 作为兼挂父节点存在，v1 不单独做 Hub 页。物理、计算、生物、化学、经济不建 Hub。

```text
geometry-curves          几何与曲线
  ├── parametric         参数曲线          ← 现有 /curves parametric
  ├── polar              极坐标曲线
  ├── roulette           旋轮线
  ├── spiral             螺线
  ├── conic              圆锥曲线
  ├── cartesian          直角坐标曲线
  └── visual-proofs      几何直观证明

algebra-functions        代数与函数
  ├── series-limits      级数与极限
  ├── maps-graphs        函数与图像
  └── numbers-structure  数与结构

calculus                 微积分
  ├── rates              变化率
  └── accumulation       累积与面积

waves-signals            波与信号          兼挂 geometry-curves
  └── harmonic           谐波与分解

motion-systems           运动与动力系统    v1 仅 additional parent，无 Hub 页
```

跨挂例子：

- 傅里叶主挂 `harmonic`，兼挂 `parametric` 与 `maps-graphs`
- 摆线主挂 `roulette`，兼挂 `motion-systems`

三条 Path，不单独占 URL：

1. 从单位圆到傅里叶
2. 旋轮线家族：摆线 → 内摆线 → 星形线
3. 二次函数的三种看法：图像、配方、面积

## 5. 数据模型

编辑层用仓库内静态 TS，理由与 `CURVE_ENCYCLOPEDIA.md` §2 相同：SSR 不依赖 D1，数学与文案在同一对象里，审校走 PR。D1 仍只留给以后的 UGC。

```text
src/content/library/
  types.ts
  graph/
    categories/*.ts
    paths/*.ts
    index.ts          图断言：无环、公开父节点、slug 唯一
  scenes/
    unit-circle.ts
    ...
  index.ts
```

`LibraryScene` 契约：

| 字段                    | 约束                                                                           |
| ----------------------- | ------------------------------------------------------------------------------ |
| `slug`                  | URL 概念名，不含学段                                                           |
| `publication`           | `draft` \| `public`。缺省按 draft，公开必须显式                                |
| `primaryCategoryId`     | 面包屑与主 Hub                                                                 |
| `additionalCategoryIds` | 兼挂。顺序无编辑含义                                                           |
| `difficulty`            | `intro` \| `standard` \| `advanced`                                            |
| `evidence`              | `modeled` \| `verified`                                                        |
| `durationSeconds`       | 有视频时与成片一致；无视频时可省略                                             |
| `copy.en` / `copy.zh`   | `title`、`short`、`question`、`hook`、`payoff`。zh 写母语，不做直译            |
| `equations`             | display-mode LaTeX，与语言无关                                                 |
| `curveSlugs`            | 可选，必须存在于 `CURVES`                                                      |
| `templateSlug`          | 可选，指向 `animationTemplate`                                                 |
| `prompt`                | 双语，预填 `/creator?prompt=`，≤600 字符（与 `routes/creator.tsx` 的校验一致） |
| `related`               | 2–4 个 scene slug                                                              |
| `sources`               | `{ label, labelEn, url }[]`，可公开的依据                                      |
| `video`                 | 可选 `{ src, poster }`。编辑精选样片放 `public/`，与 UGC 的私有 R2 分开        |
| `specPreview`           | 可选。人写的阶段表、布局草图、备注。不是模型实时产物，也不是竞品分镜的改写     |

现有 `CurveCategory` 六值与上表几何子节点 id 对齐。实现时给 `CurveDef` 增加可选 `primaryCategoryId`，默认等于今天的 `category`，避免一次改 30 条采样函数。

UGC 后期（不在 P0–P2）：`chat.parts` 增加 `libraryCategoryIds`，发布时可选分类。`/gallery` 复用同一套分类组件，但编辑精选与用户作品分区展示。

## 6. 页面规格

视觉继续 `DESIGN_SYSTEM.md`：冰白画框、坐标网格、靛蓝重点。卡片沿用现有 `GalleryVideoCard` 的「默认海报、同一时刻只播一条」规则。

### `/library` 索引

- 一句定位：可检查的数学动画场景
- 每个公开根类一块：计数、accent 细线、最多 4 张精选卡、「进入该库」
- 下方 3 条 Path 手风琴
- JSON-LD：`ItemList`

卡片：海报或曲线 SVG + payoff 短句 + 主类名。标题用洞察句（`payoff` 或 `question`），不用课表式标题。

### `/library/{hub}` 与 `/library/{hub}/{topic}`

- 主路径面包屑
- 标题 + 分类描述
- 有子类时显示子类卡片
- 场景网格。兼挂条目在 Topic 页正常出现；Hub 页用「也收录」标记，不重复占精选位
- Topic 页筛选项：`difficulty`、是否有视频、是否链到 `/curves`
- title 形态：`{Topic} animations | CurvG` / `{主题}动画 | CurvG`

### `/library/scenes/{slug}`

上半：视频（有则播放，无则 `CurveExplorer` 或海报）+ question / hook / payoff + 方程 + CTA「用此规格生成」。

下半三个可检查层，缺数据的层不渲染空壳：

1. 规格：阶段表、布局草图、备注（来自 `specPreview`）
2. 代码：只读 Python。仅当模板或已编译 spec 能提供源码时展示
3. 关联：相关场景、相关曲线、来源

## 7. 首批 12 条种子

不改编 AnimG 的 Linear Functions 或其他公开分镜。优先用仓库里已有的样片、模板和曲线。几何类其余 `/curves` 条目在 Topic 页以对象卡出现。

| slug                | 主类                                                | 来源                                                                                                                                                                                                                   | evidence |
| ------------------- | --------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------- |
| `parabola-rise`     | `maps-graphs`                                       | 模板 `parabola-rise` + `public/videos/gallery/parabola-plot.mp4`。**2026-09-22 已做成详情页，待确认。** 成片是 5 秒：坐标轴，然后绿色 y = x²。画面没有方程、数字刻度、焦点或准线。页内滑杆只改 a，a = 1 才与成片一致。 | verified |
| `sine-wave`         | `harmonic`                                          | 模板 `sine-wave`                                                                                                                                                                                                       | modeled  |
| `integral-area`     | `accumulation`                                      | 模板 `integral-area`                                                                                                                                                                                                   | modeled  |
| `lissajous`         | `parametric`                                        | `/curves/lissajous-curve`                                                                                                                                                                                              | verified |
| `cardioid`          | `polar`                                             | `/curves/cardioid`                                                                                                                                                                                                     | verified |
| `cycloid`           | `roulette`                                          | `/curves/cycloid`                                                                                                                                                                                                      | verified |
| `unit-circle`       | `visual-proofs`                                     | 新写规格 + SVG，渲染后补视频                                                                                                                                                                                           | modeled  |
| `geometric-series`  | `series-limits`                                     | 新写规格（单位正方形剖分，自有分镜）                                                                                                                                                                                   | modeled  |
| `pythagorean-areas` | `visual-proofs`                                     | 新写规格（面积拼图，自有分镜）                                                                                                                                                                                         | modeled  |
| `natural-numbers`   | `numbers-structure`                                 | `public/videos/gallery/natural-numbers.mp4`                                                                                                                                                                            | modeled  |
| `solar-orbit`       | `motion-systems`（兼挂，无 Hub 页，从索引精选进入） | `public/videos/gallery/solar-system.mp4`                                                                                                                                                                               | modeled  |
| `ring-escape`       | `motion-systems`                                    | 本地 `simulation_short` 的 `ring_escape`。未部署则保持 `draft`                                                                                                                                                         | verified |

`hello-world`、`gdp-bars`、`rotating-cube` 三支首页样片不进 v1 数学图。它们不是这条知识图的节点。

## 8. 落地顺序

### P0 — 图与路由骨架

状态：2026-09-22 已落地。代码在 `src/content/library/` 与 `src/routes/library/`。首页 `#gallery` 先放四架分类和 6 张曲线对象卡，原有样片视频留在同一节下方。

- `src/content/library/` 类型、分类、图断言、Path
- 路由：`/library`、`/library/$hub`、`/library/$hub/$topic`、`/library/scenes/$slug`
- 30 条曲线登记进几何子类，索引与 Topic 页先能列出对象卡
- Header、Footer、sitemap、`llms.txt` 接入
- 首页 `#gallery` 精选改为读 library 精选（尚无场景视频时，对象卡可暂代）

验收：未登录可浏览 Hub / Topic；未知 slug 404；en/zh metadata 正确；`pnpm build` 通过。

### P1 — 场景详情与 12 条种子

- 场景详情三产物布局
- 上表种子；`ring-escape` 在仿真链路未部署时保持 draft
- Creator 预填沿用 `?prompt=`
- `/curves/{slug}` 增加「相关场景」（无场景则不渲染该块）

验收：至少 8 条 public 场景有视频或可交互预览；每条有独立 title / description。

### P2 — Path 与兼挂

- Hub 页 Path 手风琴
- Topic 页 difficulty 筛选
- 「也收录」兼挂标记

### P3 — UGC 画廊挂图

- `/gallery` 页面复用分类组件
- 发布时可选 category
- 编辑场景与用户作品分区，不混称为同一批精选

P0 不依赖新渲染，是第一刀。

## 9. 明确不做

- 不复制 AnimG 的标题、描述、分镜表、ASCII 布局、Manim 源码、缩略图、Firebase / GCS 视频
- 不把学段写进 URL，也不把学段作为主导航轴
- 不建 shapeof.world 的宇宙、气候、化学、经济社会根类，不使用其海报与世界文案
- 不把 `/curves` 重定向进 `/library`
- 不把编辑精选放进 `chat` 表或 D1
- 不在公开页展示空的代码标签或空的阶段表
- 视觉不改成 AnimG 白底课件风，也不改成参考工程的纸色全幅分类页

## 10. 文档关系

| 文档                        | 本文之后怎么读                                                                      |
| --------------------------- | ----------------------------------------------------------------------------------- |
| `SITE_ARCHITECTURE_PLAN.md` | 四层事实、渲染边界、成本门槛仍有效。信息架构以本文第 4 节为准                       |
| `CURVE_ENCYCLOPEDIA.md`     | `/curves` 契约不变。资源库通过 `curveSlugs` 消费它                                  |
| `ROADMAP.md`                | Phase 1 的「画廊未开始」仍指 UGC `/gallery`。编辑场景库是单独一项，见该文档资源库节 |
| `SEO_CONTENT_STRATEGY.md`   | `/curves` 长尾不变。`/library` 词簇在页面真正上线前不要写进已发布 sitemap 声明      |
| `DESIGN_SYSTEM.md`          | 公开页视觉仍以它为准                                                                |
| `docs/research/animg.app/*` | Creator / Playground 结论仍可用。Library 结构以本文第 2 节为准                      |
