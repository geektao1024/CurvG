# CurvG：GPT / AI 推荐流量检查清单

来源：`~/aitools/Site-Analysis/docs/project/GPT推荐流量-打法.zh.md`（v1）§3 清单；首次来源归因按
`~/aitools/Site-Analysis/docs/specs/通用/2026-10-23-traffic-source-attribution.zh.md`（下称"归因规格"）。
2026-11-03 逐项核对并补站内缺口。`[x]` 已做，`[~]` 部分，`[ ]` 没做。"本次"指 2026-11-03 这一轮改动，已于 2026-11-03 14:56 UTC 上线（提交 `766cda1`，Worker 版本 `82a3c365`，记录见"发布记录"）。

线上复测：`scripts/ai-crawler-check.sh https://curvg.com [路径…]`（5 种 AI 爬虫 UA，打印状态码、H1 数、FAQPage、`<details>` 数）。

## 本站的 AI 流量（2026-11-03 盘点）

- 10 月 ChatGPT 访问 65 次（GA4 从 10-16 才有）。10-05 至 11-01 的 ChatGPT 落地页（Site-Analysis 本地库 `referral_daily`，GA4）：
  `/` 25、`/labs/geometry` 17、`(not set)` 5、`/math-animation-tool` 4、`/labs/conics`、`/curves/heart-curve`、
  `/curves/golden-spiral`、`/blog/best-math-video-apps` 各 2，其余 10 个页面各 1（实验、曲线、奇观、定价、`/zh/creator`）。
- 所以本轮重点是首页和全部实验章节页（共用一个模板），其次是 `/math-animation-tool` 和曲线页。

## 技术

- [x] HTML 源码里直接有 H1、正文和 FAQ（服务端渲染）。首页、实验页、曲线页、对比页都是 SSR；本次新增的实验页 FAQ 用 `<details>`，
      折叠时答案也在 HTML 里（本地 `curl` 核对：首页 12 个、`/labs/geometry` 11 个 `<details>`）。
- [x] 5 种 AI 爬虫 UA（OAI-SearchBot、GPTBot、ChatGPT-User、PerplexityBot、ClaudeBot）请求 9 个核心页面
      （`/`、`/labs`、`/labs/geometry`、`/curves`、`/wonders`、`/pricing`、`/creator`、`/manim-alternative`、
      `/blog/best-math-video-apps`）全部 200，各 1 个 H1（2026-11-03 线上）。`/curves` 有一次 OAI-SearchBot 请求连接失败，
      重试 3 次都是 200，但耗时 4–6 秒；从本机测各页首字节 2–4 秒（含网络），AI 爬虫超时较短，值得以后看一眼。
- [~] 没被拦截：robots.txt `Allow: /`，只屏蔽 `/admin`、`/settings`、`/render/`、`/api/`（及 `/zh` 对应路径）。
  Cloudflare 后台的 Bot Fight Mode、"Block AI bots" 开关没有核对（本会话不碰 Cloudflare 设置），**待负责人看一眼**。
- [~] sitemap：有首页、34 个实验地址、61 个曲线地址、12 个奇观地址、博客 3 个、3 个关键词页、定价、法律页，加 118 个 `/zh` 地址。
  GSC：Site-Analysis 有 curvg 的 `gsc_page_daily`（07-30 起），资源已验证；sitemap 是否提交、**Bing Webmaster 是否提交未核实**。
- [x] JSON-LD（本次后）：
  - 首页：`Organization` + `WebSite` + `WebApplication`（本次加了 5 个 `Offer`：Free、Starter 月/年、Pro 月/年，读自
    `src/config/pricing.ts`，和定价页共用 `pricingOffers()`）+ `FAQPage`（9 → 12 条）。
  - 定价页：`WebApplication` + 同样 5 个 `Offer`。
  - 实验章节页：`LearningResource` + `Quiz` + `FAQPage`（本次新增，11–12 条）+ `BreadcrumbList`（有成片的加 `VideoObject`）。
  - 博客：`BlogPosting` + `BreadcrumbList`；曲线页：`LearningResource` + `FAQPage`（2 条）+ `BreadcrumbList`；
    `/manim-alternative`、`/math-animation-tool`、`/free-math-video-creator`：`FAQPage`（各 3 条）。
- [x] llms.txt（111 行）和 llms-full.txt。本次改了 3 处和全站不一致的说法，见"一致性"。

## 内容

- [x] 首屏一句话：
  - 首页（本次）：副标题改为"Free interactive math and physics labs for students and teachers, from middle school to
    first-year university … no sign-in needed. When it clicks, turn it into a narrated lesson video."（中文同步），
    加上原有的眉标"Free interactive labs · AI lesson videos"和"31 labs · Mathematics & Physics · Free, no sign-in"。
  - 实验页（本次）：问题和简介下面加一行"Free · no sign-in · runs in your browser"（`labs.ws.free_note`），
    年级标签原来就在。
- [~] FAQ ≥ 10 条、答案第一句给结论：
  - 首页 9 → 12 条（新增"适合谁"、"做一个视频多少钱"（价格读自 `pricing.ts`）、"哪些能免费导出"）。
  - 实验章节页 0 → 11–12 条（`labFaq()`，`src/routes/labs/-labs-page.tsx`）：前半用本章自己的数据（本章的问题和简介、要点、
    年级、引导步骤、小测题数、有无成片），后半是所有实验通用的问答（免费/注册、做成视频和价格、课堂、手机、中英文、数字从哪来）。
    "做成视频"这条按本章有没有对应模板给两种说法（`LAB_VIDEO_TEMPLATES`）。
  - 没做：`/math-animation-tool`、`/manim-alternative`、`/free-math-video-creator` 各 3 条，曲线页 2 条，`/creator` 没有 FAQ。
- [x] 免费和付费对比表：`/pricing` 的"Plan comparison"表；首页价格条"Labs are free. Pay when you make videos."。
      定价页和 JSON-LD 的价格一致（同一个 `pricing.ts`）。
- [~] "best X" 对比页：`/blog/best-math-video-apps`（8 个工具、开头声明利益相关、并列表）。本次把 CurvG 一节改成现在的模板出片，
  并加了"局限（2026 年 11 月）"一段：只有 12 个模板、自由生成是测试版、不能在浏览器改代码、模板都是二维的。
  **还缺**：其他 7 个工具的价格和事实没有逐条附"As listed in <月份>"的核实日期（打法 §6 第 3 条）。
- [x] 最大竞品的替代页：`/manim-alternative`（与原生 Manim CE 的诚实对比，写了什么时候原生 Manim 更合适）。
- [~] 3–5 篇 how-to：只有 `/blog/ai-manim-animation-workflow` 1 篇。31 个实验章节本身是"怎么理解 X"的承接页，
  但"how to make a math video / how to animate a function"这类任务问题还没有指南。
- [ ] 原创数据页：没有。候选：用 60 条曲线已算好的弧长、面积等关键值做一张总表页；或奇观页里已经钉在测试里的数字。
- [ ] About / 方法说明页：没有 `/about`。"数字怎么算""视频怎么做（模板、渲染前算好每个数）""多久核对"散在 FAQ 和 llms.txt。
- [~] 程序化页面：曲线页 H1 下有一句话 + 公式和关键值，FAQ 只有 2 条；实验页本次有了数据驱动的 FAQ。

## 一致性（2026-11-03 已修）

- [x] 没有"永久免费"和付费并存的说法：全站口径"实验、奇观、曲线免费；视频按数量付费；每个验证邮箱的账号 3 个 720p 带水印预览"。
- [x] 宣传了没有的功能 / 过时说法，本次改掉：
  - `/blog/best-math-video-apps`（中英）："Planning is free; new accounts include starter render credits / 新账号附带起步渲染额度"。
    注册送积分线上没开（`MONETIZATION.md` 2026-10-15 已记录），改成 3 个免费预览。
  - `llms.txt` / `llms-full.txt`：定价写"curated AI models"（套餐不按模型分档）；Creator 描述成"审场景方案再渲染"的旧流程；
    llms-full 的产品描述还是"AI math animation maker"。都改成模板出片 + 自由生成测试版。
  - 首页 FAQ："what is / difference / accuracy / labs → video"四条还在讲旧的自由生成流程（"审方案和代码"），改成模板出片，
    并写明自由生成是测试版、可能出错。
- [x] 数字口径：llms.txt 写"a 30-curve encyclopedia"，同一文件列表写 60 条；改为 `${CURVES.length}`（现 60）。
- [x] 界面上没有发现误导性展示。
- [~] **还没改**：`/math-animation-tool`（ChatGPT 落地第三多）整页仍把"描述 → 审场景方案和代码 → 渲染"写成主流程，
  `pages.tool.faq2_a` 说可以直接改场景方案。现在这是测试版流程，主线是模板。要整页改写，牵涉关键词页的定位，留给下一轮。

## 归因（本次，2026-11-03 14:56 UTC 上线）

按归因规格整套实施（CurvG 之前只有 `user.utm_source` 一列，没有地方写它）：

- [x] 来源判定：`src/lib/attribution.ts`（纯函数，移植自 CartoVoxel `deriveTouch`）。规格 §4 全表，含 `utm_source=chatgpt.com → chatgpt`；
      另加两点：`utm_source` 是表里的名字（如 `perplexity`）时也用表里的 medium；从 Stripe / PayPal / Creem 付款页和
      `accounts.google.com` 回来算站内流程，不算新来源。
- [x] cookie：`cg_ft`（180 天，只写一次）、`cg_lt`（30 天，非 direct 才覆盖），`path=/; SameSite=Lax`，https 下 `Secure`。
      采集组件 `src/components/analytics/attribution-capture.tsx` 挂在 `__root.tsx`，每次整页加载跑一次。
      和规格的一处不同：客户端路由切换时不再跑。SPA 跳转时 `document.referrer` 不变，再跑会把同一个外部来源记到后面的页面上。
- [x] D1：`drizzle/0006_traffic_attribution.sql`，`user` 加 6 列、`order` 加 9 列（文本列 `DEFAULT '' NOT NULL`，`*_at` 毫秒整数可空），
      加 `idx_user_ft_source`、`idx_order_ft_source`。只有 `ALTER TABLE … ADD` 和 `CREATE INDEX`。三个方言的 schema 模板同步。
- [x] 写入点：注册 `databaseHooks.user.create.before`（`src/core/auth/index.ts`，邮箱注册、Google OAuth、One Tap 都经过这里；
      出错不挡注册）；下单 `createCheckout` 插入 pending 订单时写 9 列（优先用户行，用户行为空且 cookie 早于注册时间 10 分钟内才用 cookie；
      读用户失败就留空）；续费 `handleSubscriptionRenewal` 从用户行复制 `ft_*`、`lt_*` 留空；付款成功的更新不碰这些列。
- [x] 不外泄：6 个用户字段在 better-auth 里 `input: false, returned: false`；用户侧订单接口本来就只选固定列。
- [x] 隐私政策（中英）新增"访客从哪里来"一节，写明 `cg_ft` / `cg_lt` 存什么、存多久、会复制到账号和订单、会记进 Google Analytics（2026-11-03，归因规格 §6）。
- [x] 单测：`tests/attribution.test.ts` 覆盖规格 §7 全部 11 条 + 站内流程来源（已加进 `pnpm test`）。
- [x] 本地端到端（2026-11-03，本地 D1 + headless Chromium，测完已删除测试账号）：
      打开 `/labs/geometry?utm_source=chatgpt.com` → `cg_ft = chatgpt/ai//labs/geometry`（Lax、非 HttpOnly、180 天）；
      之后直接访问 `/pricing`，`cg_ft` 不变；邮箱注册 → 用户行 `ft_source=chatgpt`、`ft_landing_path=/labs/geometry`；
      注册返回和 `/api/auth/get-session` 都不含 `ft_*`；发起结账 → 订单行 `ft_source=chatgpt`、`lt_source=chatgpt`
      （本地用假 Stripe key，订单停在 failed，只为验证插入）。只带 referrer 的三种情况：chatgpt.com → chatgpt/ai，
      google.com → google/organic，本站 → direct。
- [x] GA4（本次）：`gtag('set','user_properties',{first_source, first_medium, first_ai})`；AI 来源的会话发一次 `ai_referral`
      （`ai_source`、`landing_page`，sessionStorage 防重复）。本地用桩 `gtag` 验证过。
- [~] 转化事件：站内还没有发任何 GA4 事件（注册、结账、出片都没有）。转化以 D1 为准，工作台读 D1 就够；GA4 里要看漏斗再加。
- [ ] GA4 后台（负责人手动）：用户范围自定义维度 `first_source`、`first_medium`、`first_ai`，事件范围 `ai_source`、`landing_page`；
      复制默认渠道组，在 Referral 之前加"AI Assistants"渠道（正则见打法 §2 第 6 步）。

### 上线步骤（每步都要负责人授权）

**注意，生产 D1 的迁移记录和实际结构不一致**（2026-11-03 只读查询）：`d1_migrations` 只记到 `0004`，
但 `0005` 加的三列（`animation_planning_attempt.input_tokens` 等）生产上已经有了，应该是当时手动执行的。
直接跑 `wrangler d1 migrations apply --remote` 会在 0005 报 duplicate column 后停住，0006 不会执行。按下面的顺序做：

1. 补记 0005：
   `npx wrangler d1 execute curvg-db --remote --command "INSERT INTO d1_migrations (name) VALUES ('0005_clean_frightful_four.sql')"`
2. 跑迁移（只会执行 0006）：`npx wrangler d1 migrations list curvg-db --remote` 确认只剩 0006，再
   `npx wrangler d1 migrations apply curvg-db --remote`。
3. 核对：`select name from pragma_table_info('user') where name like 'ft_%'` 应有 6 行，`order` 的 `ft_%`/`lt_%` 应有 9 行。
4. 部署 Worker（必须在第 2 步之后：新代码注册时会写新列）。
5. 冒烟（只读查询）：用 `https://curvg.com/?utm_source=gpt-smoke-test` 进站注册一个测试账号，查它的 `ft_source`；
   发起一次结账（打开 Stripe 页即可），查这笔订单的 `ft_source`、`lt_source`。
6. 把上线时间（UTC）告诉 Site-Analysis，工作台按归因规格 §9 核对后打开 `has_attribution`。

回滚：Worker 回到上一版本即可，新列留着无影响。

### 发布记录（2026-11-03，负责人授权）

- 提交 `766cda1`，已推送 `origin/main`。发布前 security-scan 通过（脚本无发现；人工审查补了隐私政策里的 cookie 说明）。
  从 `766cda1` 的干净 git 工作树构建部署（只拷入 gitignored 的 `wrangler.jsonc`、`.env.production`），`pnpm run cf:deploy`。
- D1：先只读确认迁移记录到 0004、0005 的三列已在、0006 的列和索引都不存在（用户 265、订单 12）。
  Time Travel 书签 `00004b67-00000000-00005118-3ff7700eb6f6407c08d05932a9d4b629`（14:54 UTC）。
  补记 0005（1 行）→ `migrations list` 只剩 0006 → `migrations apply --remote` 只执行了 0006（18 条语句）。
  之后：`user` 6 个 `ft_*` 列、`order` 9 列、2 个索引都在，用户和订单行数不变。
- Worker：`82a3c365-26ec-4c3a-a352-0be566523b30`，2026-11-03 14:56:21 UTC 起 100%。上一版本 `67aa848f-4df8-41fe-9089-1b7d4d0af451`。
- 冒烟（headless Chromium，线上）：`/?utm_source=smoke-1103` → `cg_ft` = `smoke-1103/referral//`（Secure、Lax）；邮箱注册
  → 用户行 `ft_source=smoke-1103`、`ft_landing_path=/`；注册返回和 `get-session` 不含 `ft_*`；发起结账，打开 Stripe 结账页
  （没付款）→ 订单行 `ft_source`、`lt_source` 都是 `smoke-1103`，状态 `created`。首页 12 条 FAQ + Offer、`/labs/geometry`
  中英文 11 条 FAQ + "免费"一行、llms.txt 新口径都已在线上。
- 清理：测试号的 `order`、`session`、`account`、`user` 各 1 行已删（按测试号 id 删，事先查过 20 张带 `user_id` 的表只有这 4 行），
  删除后用户 265、订单 12。Stripe 那边的结账会话没付款，24 小时后自动过期。
- 回滚：`npx wrangler rollback 67aa848f-4df8-41fe-9089-1b7d4d0af451`（新列留着无害）；如要连数据库一起回退，
  `npx wrangler d1 time-travel restore curvg-db --bookmark=00004b67-00000000-00005118-3ff7700eb6f6407c08d05932a9d4b629`
  （会丢掉书签之后的所有写入，只在必要时用）。

## 诊断

- [ ] 上线后问一轮 ChatGPT（打法 §4 的 6 个问题）。按负责人 11-03 的安排，由 Site-Analysis 会话在 ego 里统一排队问，结果转回本仓库，
      记进打法文档 §8。本会话没有问。

## 反推问题清单（Claude 版，2026-11-03）

打法第 2 步要 ChatGPT、Claude、Gemini 各出一版再合并，ChatGPT 和 Gemini 版待补。每个问题对应现有承接页，没有的标"缺"。

| 意图     | 用户会怎么问                                               | 承接页                                                                         |
| -------- | ---------------------------------------------------------- | ------------------------------------------------------------------------------ |
| 找工具   | interactive geometry proof tool for students               | `/labs/geometry`、`/labs`                                                      |
| 找工具   | free math simulation website for teachers                  | `/labs`、首页                                                                  |
| 找工具   | best app to make math videos / 3Blue1Brown style animation | `/blog/best-math-video-apps`、`/creator`                                       |
| 找工具   | online tool to animate a function graph without coding     | `/math-animation-tool`（文案待改）、`/creator`                                 |
| 找工具   | interactive unit circle / derivative visualizer            | `/labs/functions/unit-circle-sine`、`/labs/functions/derivative-tangent-slope` |
| 找替代   | Manim alternative without coding                           | `/manim-alternative`                                                           |
| 找替代   | GeoGebra / Desmos alternative for animated proofs          | 缺（对比页只覆盖视频工具）                                                     |
| 怎么做   | how to prove the Pythagorean theorem visually              | `/labs/geometry`                                                               |
| 怎么做   | how to make a math animation video                         | `/blog/ai-manim-animation-workflow`；缺独立指南                                |
| 怎么做   | how to draw a heart curve with equations                   | `/curves/heart-curve`                                                          |
| 怎么做   | how to explain derivatives to high school students         | `/labs/functions/derivative-tangent-slope`                                     |
| 具体事实 | equation of the golden spiral / cardioid area              | `/curves/golden-spiral`、`/curves/cardioid`                                    |
| 具体事实 | what is eccentricity of a conic section                    | `/labs/conics/conic-sections-eccentricity`                                     |
| 值不值得 | is Manim worth learning for teachers                       | `/manim-alternative`                                                           |
| 值不值得 | why does the Fourier series draw any curve                 | `/wonders/fourier-epicycles`                                                   |

## 还缺（按影响排序）

1. 生产迁移 + 部署（上面的步骤），之后工作台才能算 ChatGPT 来的注册和付费。
2. `/math-animation-tool` 整页改成模板出片口径（ChatGPT 落地第三多，现在和首页 FAQ 说法不一致）。
3. 关键词页和曲线页的 FAQ 补到 10 条；对比页给竞品信息加核实月份。
4. About / 方法说明页；原创数据页（曲线关键值总表）；1–2 篇"怎么做数学视频"的指南。
5. Cloudflare AI 爬虫开关、Bing 提交、GA4 后台配置（负责人）。
