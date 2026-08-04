# 曲线百科(/curves)架构与维护指南

创建时间:2026-08-04
状态:已实施并通过构建与本地渲染验证(30 条条目;部署后生效)

## 1. 定位

曲线百科是 `SITE_ARCHITECTURE_PLAN.md` 双层内容结构中的**编辑精选层**:
承接 "{curve} equation / graph / animation" 长尾搜索,把读者引导进 Creator
(预填该曲线的动画需求)。它与 UGC 画廊(`/gallery`,未实施)互补,不互相替代。

流量闭环:百科页(SEO 入口)→ 交互预览(停留/行为数据)→ "生成这条曲线的动画"
(预填 Creator)→ 转化。

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
src/content/curves/
├── types.ts            # CurveDef 类型 + sweep/gcd/defaultValues 助手
├── index.ts            # 注册表:CURVES、getCurve、getCurvesByCategory、getRelatedCurves
└── data/
    ├── parametric.ts   # 利萨如、超椭圆、蝴蝶、爱心(4)
    ├── polar.ts        # 玫瑰线、心脏线、蚶线、双纽线、蔓叶线(5)
    ├── roulettes.ts    # 摆线、内/外摆线、内/外旋轮线、星形线、三尖瓣线、肾形线(8)
    ├── spirals.ts      # 阿基米德、对数、费马、黄金、渐开线(5)
    ├── conics.ts       # 抛物线、椭圆、双曲线(3)
    └── cartesian.ts    # 正弦、悬链线、曳物线、箕舌线、叶形线(5)

src/components/
├── curve-preview.tsx   # CurveThumb(索引缩略图)/ CurveExplorer(滑杆交互)
└── math-tex.tsx        # KaTeX SSR 组件(renderToString,公式进抓取 HTML)

src/routes/curves/
├── index.tsx           # /curves 索引:分类分组 + ItemList JSON-LD
└── $slug.tsx           # /curves/{slug} 详情:交互预览 + 方程 + 正文 + CTA + 相关曲线
```

消费方:`sitemap[.]xml.ts`(每条曲线 en/zh 各一条 URL)、`llms-full[.]txt.ts`
(Curve Encyclopedia 小节)、`llms[.]txt.ts`(索引页条目)、页头导航与页脚。

## 4. CurveDef 契约(加一条曲线 = 加一个对象)

关键字段与约束:

| 字段                                        | 约束                                                                                                                                               |
| ------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| `slug`                                      | URL 即关键词:用曲线标准英文名(`cardioid`、`witch-of-agnesi`)                                                                                       |
| `name/short/intro/properties/seenIn/prompt` | 全部 `{en, zh}` 双语;zh 写母语表达,不做直译                                                                                                        |
| `equations`                                 | LaTeX(display 模式),与语言无关                                                                                                                     |
| `params`                                    | 每条曲线**至少 1 个**交互参数;label 双语                                                                                                           |
| `sample(values)`                            | 纯函数,返回 `[number,number][][]`(多条折线,双曲线/费马双臂各占一条)                                                                                |
| `fitMode`                                   | `'fixed'`:画框按参数区间**角点组合的并集** bbox 固定,尺寸类参数可见且永不裁切;`'refit'`:每次重绘重新取景,用于形状/范围剧变的参数(螺线圈数、频率比) |
| `related`                                   | 2–4 个 slug,构成横向内链网;引用不存在的 slug 会被 `getRelatedCurves` 静默过滤                                                                      |
| `prompt`                                    | 预填 `/creator?prompt=` 的动画需求,写成完整可执行的 brief                                                                                          |

**数学事实红线**:`properties` 只写可查证的标准结论(弧长、面积、命名史),
不确定的宁可不写。本批 30 条的公式已逐条核对(如心脏线 r=a(1+cosθ) 对应
弧长 8a/面积 3πa²/2;内摆线面积 π(R−r)(R−2r) 与星形线/三尖瓣线特例一致)。

### 新增条目步骤

1. 在对应类别的 `data/*.ts` 追加一个 `CurveDef` 对象(参照同文件条目);
2. 如相关曲线互链,更新对方的 `related`;
3. `pnpm build` — sitemap、llms-full、索引页、分类分组全部自动更新,无需改其他文件;
4. 本地验证:`/curves/{slug}` 单 H1、SVG 有路径、滑杆两端不裁切(fixed 模式)。

## 5. SEO 约定

- 详情页 Title:`{Name}: Equation, Graph & Animation | CurvG` /
  `{Name}:方程、图像与动画 | CurvG`(消息键 `curves.detail.meta_title`);
- H1 = 曲线名;第一个 H2 = `What is the {name}?`(关键词承载);
- description = `short[locale]` + `curves.detail.meta_suffix`;
- JSON-LD:索引页 ItemList(30 项),详情页 BreadcrumbList;
- canonical/hreflang 走全站统一的 `localizedLinks`;
- SVG 预览与 KaTeX 公式均 SSR 直出(索引页缩略图抽稀到 ≤170 点控制 HTML 体积,
  当前索引页约 120KB)。

## 6. Creator 预填链路

`/creator?prompt=<url-encoded brief>`:

- `routes/creator.tsx` `validateSearch` 校验(string,≤600 字符);
- 经 `blocks/creator-workspace.tsx` 透传至
  `components/creator-workspace.tsx` 的 `useState(initialPrompt ?? '')`;
- 仅影响新建动画的初始输入,不触发自动提交。

## 7. 验证记录(2026-08-04)

- 30 个详情页:HTTP 200、单 H1、SVG 路径存在(脚本逐页断言);
- 未知 slug → 404;
- en/zh Title 逐页正确;KaTeX 输出含 MathML annotation;
- sitemap 84 条 URL(新增 4 静态页 + 30 曲线页 × 2 语言);
- `pnpm build` 通过;`tsc --noEmit` 报错数与改动前一致(194,全部为既有模板遗留)。
