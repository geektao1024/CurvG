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
  2026-11-12：每个地址都有 `<lastmod>`（实验、奇观、博客读自己的日期，总览页取子页最新，其余在 `src/content/page-dates.ts`，改文案时手动改日期）；新增 `/about`。
- [x] IndexNow（2026-11-12）：key 文件 `public/6485bfde1f61740eaebca5315ff6f3d6.txt`，推送 `pnpm indexnow <路径…>`（中英文一起推，路径必须在线上 sitemap 里；`--all` 推全部，`--dry-run` 只打印）。**以后改了页面，部署后推一次。**
- [x] JSON-LD（本次后）：
  - 首页：`Organization` + `WebSite` + `WebApplication`（本次加了 5 个 `Offer`：Free、Starter 月/年、Pro 月/年，读自
    `src/config/pricing.ts`，和定价页共用 `pricingOffers()`）+ `FAQPage`（9 → 12 条）。
  - 定价页：`WebApplication` + 同样 5 个 `Offer`。
  - 实验章节页：`LearningResource` + `Quiz` + `FAQPage`（本次新增，11–12 条）+ `BreadcrumbList`（有成片的加 `VideoObject`）。
  - 博客：`BlogPosting` + `BreadcrumbList`；曲线页：`LearningResource` + `FAQPage`（2 条）+ `BreadcrumbList`；
    `/manim-alternative`：`FAQPage`（10 条）；`/math-animation-tool`：`FAQPage`（3 → 5 条，2026-11-12）；`/free-math-video-creator`：`FAQPage`（3 条）。这三个关键词页都还没有 `BreadcrumbList`（2026-11-05 用 `seo-check` 查出，老问题）。
  - `/about`（2026-11-12）：`BreadcrumbList` + `AboutPage`（`mainEntity` 是带 `email`、`contactPoint` 的 `Organization`）；首页 `Organization` 也加了这两项。
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
  - `/manim-alternative` 3 → 10 条（2026-11-05）。
  - `/math-animation-tool` 3 → 5 条（2026-11-12，模板出片口径）。
  - 没做：`/math-animation-tool` 5 条、`/free-math-video-creator` 3 条，曲线页 2 条，`/creator` 没有 FAQ。
- [x] 免费和付费对比表：`/pricing` 的"Plan comparison"表；首页价格条"Labs are free. Pay when you make videos."。
      定价页和 JSON-LD 的价格一致（同一个 `pricing.ts`）。
- [x] "best X" 对比页：`/blog/best-math-video-apps`（8 个工具、开头声明利益相关、并列表）。11-03 把 CurvG 一节改成现在的模板出片，
      并加了"局限（2026 年 11 月）"一段：只有 12 个模板、自由生成是测试版、不能在浏览器改代码、模板都是二维的。
      2026-11-12：每个工具的价格写明"2026 年 11 月"（官网核实：Microsoft 365 Personal $9.99/月、Canva Pro US$144/年、After Effects US$22.99/月等；Canva 月付价没核实到，没写）；
      "The quick answer"加一行把写代码的人引到 `/manim-alternative`（Motion Canvas / Revideo / Remotion）；新增一节"How do I make 3Blue1Brown-style math videos without code?"（Manim / Motion Canvas / CurvG 各适合谁，ChatGPT 11-12 的 Q8 两次因"no-code"推荐了 CurvG）；
      "Python + FFmpeg + LaTeX"改成"LaTeX 可选、0.19 起不用单装 FFmpeg"（Manim 官方安装页和 0.19 更新日志）；页头显示"更新于"日期。
- [x] 最大竞品的替代页：`/manim-alternative`。2026-11-05 改成多家对比（Motion Canvas、Remotion、Blender、GeoGebra、Tracé、LemmaReel、fastanim、CurvG，FAQ 10 条，官网核实日期 11-05），保留与原生 Manim CE 的对比。依据：ChatGPT 诊断里原页 3 次都没被检索到，见 `Site-Analysis/docs/project/GPT诊断记录/CurvG-2026-11-05.zh.md`。
      2026-11-12 补到 9 家：Revideo 并进 Motion Canvas 一条（Motion Canvas 的分支，仓库已搬到 `midrender/revideo`，团队主要在做 Midrender），新增 Synfig（GPL 桌面 2D 动画软件，没有公式支持，最新正式版 1.4.5 是 2024-05）。依据：11-12 诊断 Q2 三次里 Revideo 出现 3 次、Synfig 2 次。第二个按钮从旧流程的 `ai-manim-animation-workflow` 改链到对比文章。
- [~] 3–5 篇 how-to：只有 `/blog/ai-manim-animation-workflow` 1 篇。31 个实验章节本身是"怎么理解 X"的承接页，
  但"how to make a math video / how to animate a function"这类任务问题还没有指南。
- [ ] 原创数据页：没有。候选：用 60 条曲线已算好的弧长、面积等关键值做一张总表页；或奇观页里已经钉在测试里的数字。
- [x] About / 方法说明页：`/about`（2026-11-12）：CurvG 是什么、实验 / 曲线 / 奇观 / 模板视频 / 自由生成测试版 / 对比页各自怎么核对、怎么报错、联系邮箱 `hello@curvg.com`（agentic-inbox 里 11-12 新建的邮箱）。没写具名的人（负责人另定）。页脚"法律"栏改成"关于"，加关于页和联系邮箱。
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
- [x] `/math-animation-tool` 整页改成模板出片（2026-11-12）：标题"Templates to MP4, No Code"，步骤是选模板 / 调参数 / 云端渲染，"几何与证明"卡换成模板真有的"三角函数与曲线"，FAQ 改掉"直接改场景方案"并加两条（模板没覆盖怎么办、数字怎么保证对）。
      `/pricing` 对比表"AI workflow"一行改成"模板出片：全部验证过的视频模板、可下载的 Manim 源码"（删掉重复的"复制与下载 Python"行）；首页 meta description 和 llms-full 的首页描述改成模板出片。
- [x] 模板视频是无声的，旁白以画面字幕呈现（`src/lib/video-templates/manim.ts` 的 `caption()`），但首页、实验页 CTA、对比文章、llms.txt 写的是"narrated / 配音"。2026-11-12 改成"captioned / 带字幕"或去掉。实验自己的成片（`labs.faq.film`）确实有配音，没改。
- [~] **还没改**：首页"从实验到视频"一节（`home.video.*`）的标题和说明还是"每一步一个镜头、先检查分镜和代码"，这是自由生成测试版的流程；`/blog/ai-manim-animation-workflow` 整篇是旧流程。

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

## 发布记录：`/manim-alternative` 多家对比（2026-11-05，负责人授权）

- 提交 `fa38291`，推送 `origin/main`。从这个提交的干净 git 工作树构建部署（只拷入 gitignored 的 `wrangler.jsonc`、`.env.production`），`pnpm run cf:deploy`。没有数据库迁移，没有写生产 D1。
- Worker `636144c7-eccd-4237-8186-944815598f8f`，2026-11-05 06:06:59 UTC 起 100%。上一版本 `82a3c365-26ec-4c3a-a352-0be566523b30`。
- 回滚：`npx wrangler rollback 82a3c365-26ec-4c3a-a352-0be566523b30`。
- 发布前对照代码核实了页面里的本站说法：12 个模板（`VIDEO_TEMPLATES`）、全 2D、不能在浏览器改代码、31 个公开实验（`publicLabs()`）、3 个免费预览（`animation_free_previews` 线上未设，默认 3）、Starter 300 积分 ÷ 20 ≈ 15 个、Pro 1,000 ÷ 20 ≈ 50 个（线上 `animation_render_credits` = 20）、Manim 源码可查看复制下载（`video-studio/studio.tsx`）、失败退积分（`ai-tasks/service.ts`）。
- 发布前改掉的：保留下来的旧文案还在讲"审场景方案""编辑规格"（`row_skill_curvg`、`row_control_curvg`、`when_curvg_2`、`faq3_a`），改成模板出片；"大家问得最多的对比"没有依据，改掉（`table_desc`）；中文的"清晰的 1080p"改成全站口径"1080p 无水印"。页脚读的就是 `landing.footer.manim_alternative`，没有兜底列表。
- 规范：`docs/NAVIGATION.md` §7 原来写"不链竞品"，加了对比页和替代页的例外。`docs/MONETIZATION.md` §6 把这一页列进页面承诺清单，因为文案里写死了价格和视频数。
- 检测：`pnpm test` 651/651；`tsc` 205 行，和发布前基线相同，改动文件 0 条（主工作区要先构建一次重新生成 `src/paraglide`，否则新 key 会报错）；`pnpm build`、`pnpm cf:build` 通过；`seo-check` 本地和线上都过（32 个页面 + robots/sitemap/OG）；en/zh 键集一致（1904）。
- 冒烟（线上）：
  - 中英文两页 × OAI-SearchBot、ChatGPT-User、GPTBot 全部 200；1 个 H1、8 家工具、8 条短板、HTML 10 条 FAQ、JSON-LD `FAQPage` 10 条，两者顺序一致，语言正确。
  - headless Chromium 390px、1440px：中英文两页和首页、`/pricing`、`/math-animation-tool`、`/free-math-video-creator` 都没有页面级横向溢出，没有 JS 报错。手机上两张表（640px）在自己的容器里滚动。
  - 16 个不重复链接都返回 200。外链都是新窗口 + `noopener noreferrer`；中文页内链带 `/zh`；真实点击内链和外链都正常。
  - llms.txt、llms-full.txt 是新描述，旧描述 0 处；sitemap 有中英文两个地址；页脚中英文都生效。
  - 抽查：首页 12 条 FAQ + 5 个 `Offer`，`/pricing` 5 个 `Offer`，两个关键词页 FAQ 仍是 3 条，`/labs/geometry` 11 条。
  - `scripts/ai-crawler-check.sh` 50 次请求 49 次 200。1 次（`/manim-alternative` + GPTBot）5 秒连接失败，同 UA 重试 6 次都是 200。偶发，和 11-03 `/curves` 那次相同，分不清是本机网络还是边缘节点。同时修了脚本：请求失败时不再沿用上一次响应的 H1 和 FAQ 数字。
- IndexNow：**没有推**，仓库里没有脚本，`public/` 也没有 key 文件。
- 复查：2026-11-19 前后由 Site-Analysis 再问一轮 ChatGPT，诊断记录见 `Site-Analysis/docs/project/GPT诊断记录/CurvG-2026-11-05.zh.md`。

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

1. 邮箱注册的用户拿不到免费预览（2026-11-05 查出，详见 `docs/PROJECT_BRIEF.md` 第 7 节）。这一条影响转化，要负责人决定怎么改。
2. 首页"从实验到视频"一节和 `/blog/ai-manim-animation-workflow` 还是自由生成（审分镜和代码）的旧流程；llms.txt 里这篇的标题"Prompt to Reviewable Code"也是。
3. `/math-animation-tool`（5 条）、`/free-math-video-creator`（3 条）和曲线页的 FAQ 补到 10 条；三个关键词页补 `BreadcrumbList`。
4. 原创数据页（曲线关键值总表）；1–2 篇"怎么做数学视频"的指南。`/about` 写不写具名的人（负责人定）。
5. Cloudflare AI 爬虫开关、Bing 提交、GA4 后台配置（负责人）。AlternativeTo 等其他第三方榜单（负责人定）。
