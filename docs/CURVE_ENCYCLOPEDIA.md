# 曲线百科(/curves)架构与维护指南

创建时间:2026-08-04
状态:已实施,60 条条目、7 个分类。2026-10-15 按第 8 节完成"看、玩、导出"改版(计划内 0–6 步全部完成)。

## 1. 定位

曲线百科是对象层:承接 "{curve} equation / graph / perimeter / area" 长尾搜索(2026-10 GSC:全站展示量最大的
非品牌入口),一级导航项(2026-10-15 起)。实验章节与奇观专题通过 `curveSlugs` 链到这里,详情页反链回去。
编辑场景库 `/library` 已于 2026-10-15 下线(见 `POSITIONING.md` 第 8 节),其几何子类页 301 到本页分类锚点
`/curves#{category}`。UGC 画廊(`/gallery`)未实施。

流量闭环:搜索进详情页 → 首屏公式卡回答"方程 / 周长 / 面积"(查)→ 调参数、点预设(玩)→
「看它怎么画出来」(看)→ 免费下载 SVG / PNG / CSV(导出,免费)→ 播完出现「做成讲解视频」,进 Creator(付费点)。

## 2. 架构决策:静态内容模块,而非数据库

路线图 Phase 1 原计划"曲线数据表 + 管理后台发布"。实际实现改为**仓库内静态
TS 数据模块**,理由:

1. **SEO 可靠性**:SSR 不依赖 D1 可用性,曲线页永远可渲染、可抓取;
2. **内容即代码**:采样函数(可执行的数学)与文案(双语)必须同步演进,
   放在同一个对象里由类型系统约束,比"公式存库、代码另写"更不易腐坏;
3. **审校流程**:数学事实(弧长、面积、历史)走 PR review,比后台富文本可靠。

数据库仍然是 **UGC 画廊层**的正确选择——该决策只针对编辑精选层。
若未来条目数量超过 ~100 或需要非工程师维护,再评估迁库。

## 3. 模块布局

```
src/content/
├── text.ts                 # 共享双语类型 LocaleText / ContentLocale / localeText()
└── curves/
    ├── types.ts            # CurveDef、CurveFact 等类型;sweep / gcd / gamma / polarPieces / defaultValues
    ├── index.ts            # 注册表:CURVES、CURVE_CATEGORY_ORDER、getCurve、getCurvesByCategory、
    │                       #   getRelatedCurves、featuredCurves、getCurveFacts、factLines
    ├── facts.ts            # 公式卡:每条曲线的方程形式、关键数值、字母含义(CURVE_FACTS)
    ├── presets.ts          # 参数预设(CURVE_PRESETS)
    ├── traces.ts           # 「看它怎么画出来」的构造(CURVE_TRACES)与纯函数 traceFrame
    └── data/
        ├── parametric.ts   # 利萨如、超椭圆、蝴蝶、爱心、贝塞尔、Gerono 双纽线(6)
        ├── polar.ts        # 玫瑰线、心脏线、蚶线、伯努利双纽线、蔓叶线、卡西尼卵形线、蚌线、
        │                   #   环索线、麦克劳林三等分角线、蜗牛线、超级公式、Maurer 玫瑰(12)
        ├── roulettes.ts    # 摆线、内/外摆线、内/外旋轮线、星形线、三尖瓣线、肾形线、次摆线(9)
        ├── spirals.ts      # 阿基米德、对数、费马、黄金、渐开线、双曲、连锁(lituus)、欧拉、
        │                   #   西奥多罗斯、斐波那契(10)
        ├── conics.ts       # 抛物线、椭圆、双曲线(3)
        ├── cartesian.ts    # 正弦、悬链线、曳物线、箕舌线、叶形线、魔鬼曲线、双角曲线、欧多克索斯曲线、
        │                   #   梨形线、蛇形线、契恩豪斯三次曲线、半立方抛物线、割圆曲线、S 形函数(14)
        └── fractals.ts     # 科赫雪花、希尔伯特、龙形、莱维 C、谢尔宾斯基箭头、皮亚诺(6)

src/blocks/
├── curve-categories.ts     # 分类名与 /curves#{category} 锚点(导航、页脚、列表页共用)
└── curve-facts.ts          # 公式卡行、FAQ(纯文本,与 FAQPage 一致)、复制用 LaTeX、实时数值格式

src/components/
├── curve-preview.tsx       # CurveThumb(缩略图)/ CurveExplorer(受控:滑杆、预设、作画、导出栏)/
│                           #   CurveDrawingLoop(列表页首屏纯 CSS 描线)
├── curve-formula-card.tsx  # 公式卡
├── curve-index.tsx         # 列表页:分类跳转条、名称筛选、卡片网格
└── math-tex.tsx            # KaTeX SSR 组件

src/lib/
├── curve-export.ts         # SVG / PNG / CSV 导出(浏览器端)
└── plain-math.ts           # TeX → 纯文本(分式、根号、函数名空格),用于 FAQ、描述、结构化数据

src/routes/curves/
├── index.tsx               # /curves 列表页 + ItemList JSON-LD
└── $slug.tsx               # 详情页:参数状态在这里,同时驱动图像、公式卡和导出

scripts/curve-images.ts     # pnpm og:curves:静态图 public/curves/{slug}.svg 与分享图
```

消费方:`sitemap[.]xml.ts`(每条曲线 en/zh 各一条 URL)、`llms[.]txt.ts` 与 `llms-full[.]txt.ts`
(条目数取 `CURVES.length`)、页头导航(7 个分类)、页脚、首页"曲线"列(`featuredCurves()`)。

## 4. CurveDef 契约(加一条曲线 = 加一个对象)

关键字段与约束:

| 字段                                        | 约束                                                                                                                                                         |
| ------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `slug`                                      | URL 即关键词:用曲线标准英文名(`cardioid`、`witch-of-agnesi`)                                                                                                 |
| `name/short/intro/properties/seenIn/prompt` | 全部 `{en, zh}` 双语;zh 写母语表达,不做直译                                                                                                                  |
| `equations`                                 | LaTeX(display 模式),与语言无关                                                                                                                               |
| `params`                                    | 每条曲线**至少 1 个**交互参数;label 双语                                                                                                                     |
| `sample(values)`                            | 纯函数,返回 `[number,number][][]`(多条折线,双曲线/费马双臂各占一条)                                                                                          |
| `guideLines`                                | 前几条折线是构造线(定圆、控制多边形、西奥多罗斯的辐条),画得细而淡;默认 0,所有折线都是曲线本身                                                                |
| `fitMode`                                   | `'fixed'`:画框按参数区间**角点组合的并集** bbox 固定,尺寸类参数可见且永不裁切;`'refit'`:每次重绘重新取景,用于形状/范围剧变的参数(螺线圈数、频率比)           |
| `yStretch`                                  | 可选,y 轴放大倍数(只影响显示,刻度如实标出)。只给"细长条"的函数图像用(S 形函数为 5);构造里有圆或定长线段的曲线(旋轮线、箕舌线、曳物线)一律不用,否则圆会被压扁 |
| `related`                                   | 2–4 个 slug,构成横向内链网;引用不存在的 slug 会被 `getRelatedCurves` 静默过滤                                                                                |
| `prompt`                                    | 预填 `/creator?prompt=` 的动画需求,写成完整可执行的 brief                                                                                                    |

**数学事实红线**:`properties`、`intro` 与公式卡只写可查证的标准结论(弧长、面积、命名史),
不确定的宁可不写或写成"传统上认为"。能算的数都先用数值核对再写入:第二批 30 条中,环索线、三等分角线、
契恩豪斯三次曲线的环面积,梨形线面积 πab,Gerono 双纽线面积,双角曲线参数式与隐式方程的一致性,
都在写入前数值验证;科赫雪花面积、各分形长度、斐波那契螺线弧长由测试从画出的折线重新算。
2026-10-15 复核时改正了一处旧错误:爱心曲线"缩放前高 22"实为凹口到底尖,整体高约 28.9。

### 新增条目步骤

1. 在对应类别的 `data/*.ts` 追加一个 `CurveDef`(新分类要同时改 `CurveCategory`、`CURVE_CATEGORY_ORDER`、
   `blocks/curve-categories.ts`、列表页的分类简介和 `curves.category*` 消息键);
2. 在 `facts.ts` 加同名条目:至少一个方程形式或构造规则(`kind: 'rule'`,可用 `text` 写文字),能算的数值写
   `value`,画出的折线正好是它所量的东西时再加 `measure`(`length` / `area` / `enclosed`);
3. 可选:`presets.ts` 预设(必须设全部参数、落在滑杆步长上)、`traces.ts` 构造(`point` 必须与 `sample` 同参数
   逐点相等;参数取到 0 会 0/0 的,用极限值);
4. 如相关曲线互链,更新对方的 `related`;
5. `pnpm og:curves <slug>` 生成静态图与分享图;
6. `pnpm test`(`tests/curves-seo.test.ts` 会检查上面所有约束)、`pnpm build`。sitemap、llms、导航条目数自动更新。

## 5. SEO 约定

- 详情页 Title:`{Name}: Equation, Graph & Animation | CurvG` /
  `{Name}:方程、图像与动画 | CurvG`(消息键 `curves.detail.meta_title`);
- H1 = 曲线名;第一个 H2 = `What is the {name}?`(关键词承载);
- description = `short[locale]` + `curves.detail.meta_suffix`;
- JSON-LD:列表页 ItemList(全部条目),详情页 BreadcrumbList + LearningResource + FAQPage
  (FAQ 由公式卡生成:方程、构造规则、周长、弧长、面积,页面上可见的问答与结构化数据逐字一致);
- canonical/hreflang 走全站统一的 `localizedLinks`;
- SVG 预览与 KaTeX 公式均 SSR 直出(缩略图按屏幕空间 RDP 简化,容差 0.6 视图单位);
- 列表页每个分类有一句简介(`curves.category_desc.*`),筛选框只隐藏卡片,无 JavaScript 时仍是完整分组列表。

## 6. Creator 预填链路

`/creator?prompt=<url-encoded brief>`:

- `routes/creator.tsx` `validateSearch` 校验(string,≤600 字符);
- 经 `blocks/creator-workspace.tsx` 透传至
  `components/creator-workspace.tsx` 的 `useState(initialPrompt ?? '')`;
- 仅影响新建动画的初始输入,不触发自动提交。

## 7. 验证记录

2026-10-15(改版后):60 条 × 中英 = 120 个详情页全部 200,均有公式卡与可解析的 FAQPage,正文无原始 TeX;
sitemap 曲线 URL 120 条;`seo-check` 通过;浏览器实测预设、实时数值、作画、导出、列表页筛选与分类跳转、手机宽度无横向溢出。

2026-08-04(首批):

- 30 个详情页:HTTP 200、单 H1、SVG 路径存在(脚本逐页断言);
- 未知 slug → 404;
- en/zh Title 逐页正确;KaTeX 输出含 MathML annotation;
- sitemap 84 条 URL(新增 4 静态页 + 30 曲线页 × 2 语言);
- `pnpm build` 通过;`tsc --noEmit` 报错数与改动前一致(194,全部为既有模板遗留)。

## 8. 改版计划(2026-10-15,按"看、玩、导出")

背景:GSC 近 3 个月曲线页合计约 1,600 次展示、排名 7–13、点击接近 0;查询是 "epicycloid / astroid graph /
cycloid equation / perimeter of astroid / heart curve" 这类。用户是查公式、要图的学生和老师,
详情页目前只有"玩"(滑杆),唯一出口是 AI Creator,门槛太高。

| 步骤 | 内容                                                                                                                                         | 状态                                                                                                                |
| ---- | -------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| 0    | 导航:曲线百科升为一级项,下拉为六个分类(`/curves#{category}`);资源库下线并 301;缩略图改为屏幕空间 RDP 简化(0.6 视图单位),修复蝴蝶曲线折线化   | 2026-10-15 完成                                                                                                     |
| 1    | **公式卡**:首屏列出参数式 / 直角坐标式 / 极坐标式,以及弧长、面积等可查证的数值,写成摘要友好的定义表;FAQ 结构化数据回答"周长/面积/方程是什么" | 2026-10-15 完成：`src/content/curves/facts.ts`，见下文                                                              |
| 2    | **看**:描点作画动画(琥珀笔尖点)。旋轮线画出滚动的圆,螺线一圈圈长出。作画是时间的纯函数,与奇观同一机制,可直接出片                             | 2026-10-15 完成：「看它怎么画出来」，34 条曲线画出构造（`src/content/curves/traces.ts`）；视频走 Creator,见下文     |
| 3    | **玩**:参数预设(内摆线 k=3 → 三尖瓣线,k=4 → 星形线);周长、面积随参数实时显示                                                                 | 2026-10-15 完成：公式卡数值随滑杆实时更新（"图中 = …"）；18 条曲线有预设（`src/content/curves/presets.ts`）         |
| 4    | **导出**:当前参数免费下载 SVG / PNG,一键复制 LaTeX 与 Desmos/GeoGebra 可粘贴表达式;描点动画导出 MP4 作为付费点(复用奇观出片流程)             | 2026-10-15 完成：SVG / PNG / CSV 下载与复制 LaTeX（`src/lib/curve-export.ts`）；Desmos/GeoGebra 未做;视频走 Creator |
| 5    | 列表页:分类跳转条、紧凑卡片、首屏放一条正在被画出的曲线                                                                                      | 2026-10-15 完成:分类跳转条(吸顶)、名称筛选、四列紧凑卡片、分类简介、首屏纯 CSS 描线(`CurveDrawingLoop`)             |
| 6    | 扩充条目(30 → 60–80):先查关键词数据再定。候选 Cassini 卵形线、欧拉螺线、蚌线,以及 sigmoid、钟形曲线等函数图像(可链实验)                      | 2026-10-15 完成:30 → 60 条,新增分形分类;选题依据见下文"第二批选题"                                                  |

### 公式卡与 FAQ(步骤 1 的实现)

- 数据:`src/content/curves/facts.ts` 的 `CURVE_FACTS[slug]` = `where`(字母含义)+ `facts[]`。每条 `kind`
  决定行标签(方程三种形式、弧长、周长、面积、焦点、离心率、渐近线、周期、尖点数;`other` 自带 `label`),
  `note` 是限定语("一拱""k 为整数"),`value` 给出当前参数下的数值(步骤 3 实时显示用)。
- **数值钉住**:带 `measure: 'length' | 'area'` 的条目,测试按默认参数对 `sample()` 画出的最后一条折线求长度
  或绕原点扫过的面积,与 `value` 比对(误差 < 0.2%)。目前 21 条这样核对。画出的范围和条目不一致时(摆线画了两拱)
  不设 `measure`,数值须与 `properties` 一致。
- 页面:首屏右侧 `CurveFormulaCard` 取代原"方程"卡;正文后加"常见问题"(方程、周长、弧长、面积),
  答案由同一份 facts 生成,纯文本(`plainMath`),与 FAQPage 结构化数据逐字一致。
- `plainMath` 已能处理 `\frac`、`\sqrt`、`\left…\right`、`\mathbb`,函数名前后自动留空格(`a\cos t` → `a cos t`)。
  页面上的简介、正文、性质也经过它,不再出现 `x^{2/3}` 这样的原始 TeX。
- 新增曲线时必须同时加 `CURVE_FACTS` 条目(测试会检查)。

### 描点作画(步骤 2 的实现)

- 出发点:搜"astroid graph"的人先要的是图和公式,首屏已经给了;动画回答的是"为什么长这样"。所以它
  **不自动播放**、不挡静态图、不增加首屏负担,由图像左上角的「看它怎么画出来」按钮触发,播完回到静态图,按钮变「再画一遍」。
- 画的是构造,不只是走点:旋轮线族画滚动圆与辐条(星形线、三尖瓣线、肾形线按 k = 4 / 3 / 2 的内外摆线构造),
  极坐标曲线与螺线画极点到笔尖的半径,椭圆 / 双曲线画到两焦点的线,抛物线画焦点与准线的等距线,
  渐开线画展开的绳子,曳物线画牵引绳,利萨如画两个方向各自的振动,正弦画到 x 轴的竖线。第二批又加了次摆线(滚轮)、蚌线(尼科梅德斯的直尺)、割圆曲线(希庇亚斯的下降直线与转动半径)、
  贝塞尔曲线(de Casteljau 三层插值)、S 形函数(切线斜率)和几条极坐标曲线,共 34 条;其余 26 条(爱心、分形等)
  笔尖沿曲线走,不画构造。
- `CURVE_TRACES[slug]` 的 `point(values, t)` 必须与 `sample()` 在同一参数 t 上逐点相等,测试对默认参数和每个预设逐点核对
  (误差 < 1e-9),所以构造线不会和曲线对不上。画出的部分直接用 `sample()` 的折线前缀。
- `traceFrame(slug, values, polylines, progress)` 是纯函数,同样输入得到同一帧,和奇观同一原则,后续可直接逐帧渲染出片。
- 画框会把构造线的范围算进去(`traceExtent`),滚动圆、焦点、准线不会被裁掉;因此个别曲线的交互图取景比以前略大。
- 时长按曲线在屏幕上的长度定,3–9 秒,笔速大致一致。拖动滑杆时动画继续,按新参数画。
- 还没做:把动画导出成 MP4(要接渲染管线与积分,属于"导出"付费点)。

### 实时数值与预设(步骤 3 的实现)

- 详情页持有参数状态,`CurveExplorer` 改为受控组件,同一份参数同时驱动图像、公式卡和导出。
  公式卡里带 `value` 的行在右侧显示"图中 = 6 / ≈ 1.178"(四位有效数字),服务端首屏按默认参数直出。
- 页面内组件按 slug 加 `key`:从相关曲线跳过去时参数回到新曲线的默认值。
- 预设:`CURVE_PRESETS[slug]` 每条给出全部参数,必须落在滑杆范围和步长上(测试检查)。目前 18 条曲线有预设,
  如内摆线 k = 3 / 4 → 三尖瓣线 / 星形线、外摆线 k = 1 / 2 → 心脏线 / 肾形线、蚶线四种形态、超椭圆 n = 1 / 2 / 4、
  利萨如直线 / 圆 / 8 字形、内外旋轮线的特例(椭圆、转子发动机缸体)。

### 免费导出(步骤 4 的实现)

- 交互预览下方的"导出"栏:SVG(透明底)、PNG(白底,1440×1080)、CSV(`path,x,y`,每个采样点一行)、复制 LaTeX
  (方程的各种形式,每行一个)。导出的是读者当前调好的参数,画框与页面一致。
- 颜色与静态图(`pnpm og:curves`)相同:曲线 `#c9800f`、坐标轴 `#bdb6a8`;右下角印站点域名(取自 `VITE_APP_URL`)。
  SVG 不含 CSS 变量和外部字体,离开站点也能正常打开。
- 纯浏览器端生成,不经过服务器、不扣积分。`tests/curves-seo.test.ts` 检查 SVG 自包含与 CSV 格式。
- 还没做:Desmos / GeoGebra 可粘贴表达式(每条曲线要单独写,且需要逐条在对方软件里验证)。

### 视频:不单独做曲线 MP4 导出(2026-10-15 决定)

`docs/MONETIZATION.md` 定了"曲线百科永远免费,云端渲染出的 MP4 是唯一付费点",而 Creator 已经是这条付费流程
(首个视频免费,之后按套餐)。另做一条曲线 MP4 渲染管线会与它重叠、绕开积分规则,所以不做。改为:作画播完后,
图上出现「做成讲解视频」,带着该曲线的 `prompt` 进 Creator;每条 `prompt` 都写明了构造(滚动圆、焦点、准线等),
与页面动画一致。`traceFrame` 仍是纯函数,将来若要把作画本身做成素材,可按奇观的逐帧渲染方式接入。

### 列表页(步骤 5 的实现)

- 首屏:H1 + 一句"看、玩、导出"的说明;右侧(宽屏)一条内旋轮线用纯 CSS 循环描线(`.curvg-draw-loop`,
  `pathLength="1"` + `stroke-dashoffset`),系统开启"减少动态效果"时直接显示完整曲线。
- 吸顶的分类跳转条(带条数)与名称筛选(中英文名、slug);筛选时平铺结果,清空后回到分组。
- 卡片 4 / 3 / 2 列自适应,缩略图 4:3,简介两行截断。

### 第二批选题(步骤 6)

没有关键词搜索量工具可用,选题按两条判断,未做量化验证,部署后用 GSC 复查:

1. 有标准名称、教材或科普里常被单独查的曲线(名称 + equation / graph / area);
2. 有明确的用途或故事,能支撑一页内容(贝塞尔曲线之于字体与 CSS,欧拉螺线之于道路,斐波那契螺线之于构图,
   分形之于"无限周长、有限面积")。
   刻意不收:与实验章节争同一搜索意图的函数图像(指数、对数、正态曲线已有实验章节);事实无法核实的冷门曲线
   (如鱼形曲线的面积)。斐波那契螺线与黄金螺线分页:一个是四分之一圆弧拼接,一个是对数螺线,搜索意图不同,
   两页互链并在正文说明差别。

红线不变:`properties` 只写可查证的标准结论;新增数值进测试(`tests/curves-seo.test.ts`)。

## 9. 详情页视觉(2026-10-17)

60 条共用 `src/routes/curves/$slug.tsx`,改版只动模板,不动数据。

- **图像即坐标纸**:`CurveExplorer` 给 `CurveSvg` 传 `axes`,由 `AxisGrid` 画网格与刻度:间距取 1 / 2 / 5 × 10ⁿ,
  约 64 视图单位一格,轴在画外时数字贴边;手机宽度隐藏数字(太小读不清)。缩略图(`CurveThumb`)仍用旧的装饰网格。
- **读数**:`PointerReadout` 是叠在图上的独立 SVG,只接鼠标(触屏照常滚动),自己持有状态,移动鼠标不重绘曲线。
- **进入动画**:路径设 `pathLength=1`,`.curvg-draw-in` 画一次 1.6 秒,`prefers-reduced-motion` 时直接显示;SSR 输出完整路径。
  光晕默认开,分形关(细节会糊)。起笔圆环位置 = 最后一条折线的第一个点,即作画动画的起点。
- **视频卡**:`<section class="dark">` 让卡片在明暗两种主题下都是暗场;`curveVideoTemplate` 命中时文案是模板,否则是测试版自由生成。
  这张卡不写价格或免费额度,定价承诺仍只在 `MONETIZATION.md` 列出的页面。
- **区块编号**:按实际渲染顺序编号(没有实验 / 奇观的曲线不会跳号)。
- **`MathProse`**(`src/components/math-prose.tsx`):对 `plainMath` 结果把 `^(…)`、`^n` 排成上标,`^(`、`)` 以 `sr-only` 保留,
  所以页面文本与 meta description、FAQPage 逐字一致。新增文案里的指数照旧写 TeX(`x^{2/3}`)即可。
- 验证:120 个详情页 200、单 H1、有坐标刻度、正文无原始 TeX;浏览器实测悬停读数、作画与进度条、播完出现"做成讲解视频"、
  明暗主题、390px 手机宽度。

### 服务器与浏览器渲染一致(2026-10-17)

Node 与浏览器的 `Math.sin/cos/exp` 末位可能不同(实测 50 条曲线的采样有 1e-16 量级差异)。对称曲线在 `simplify`(RDP)
里会出现距离完全相等的点,末位差异就让两边保留不同的点,缩略图路径对不上,React 报 hydration 不一致。
现在 `toPaths` 先把屏幕坐标对齐到 0.01 视图单位再简化,距离用 `Math.sqrt`(严格舍入)代替 `Math.hypot`;
SVG 里其余由浮点算出的坐标(刻度文字、起笔圆环)一律 `toFixed(1)` 输出。中英文 120 个详情页、列表页、首页实测无 hydration 警告。
新增 SVG 元素时同样不要把未取整的浮点数直接写进属性。
