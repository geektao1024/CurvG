# CurvG 收费与转化

更新时间：2026-10-15。定价、套餐文案、付费墙和转化入口以本文为准；定位见 `POSITIONING.md`。

## 1. 第一性原理

用户付钱买的是**一个做好的数学视频**。其余都是手段：

| 东西                          | 对用户的价值     | 我们的成本                | 收不收费   |
| ----------------------------- | ---------------- | ------------------------- | ---------- |
| 实验 `/labs`、奇观 `/wonders` | 看懂、玩懂       | 几乎为零（静态 + 浏览器） | 永远免费   |
| 曲线百科 `/curves`            | 查、看           | 几乎为零                  | 永远免费   |
| 场景方案 + Manim 代码         | 半成品，要自己跑 | 大模型调用（主要成本）    | 免费       |
| 云端渲染出的 MP4              | 成品，直接能用   | 渲染算力                  | **付费点** |

所以：

1. **免费的部分负责让人来、让人信**；**视频是唯一付费点**，与定位"看、玩、导出"一致。
2. **先让用户看到自己的视频，再要钱**。没见过成品就付费的人极少；每个验证过邮箱的账号，第一次渲染免费。
3. **档位只差在量和单价**。所有档位走同一套生成流程（现在只有 KIE Claude Haiku 5.5），不按模型分档：
   模型分档在只剩一个模型后已经不成立，写在页面上就是虚假承诺。
4. **在用户想要视频的那一刻给出付费入口**，而且付完回到原来的对话，点"重试"就能渲染。

## 2. 套餐

价格与积分的唯一出处是 `src/config/pricing.ts`；一次标准渲染的积分数由后台配置 `animation_render_credits`
（当前 20）决定，页面上的"约 N 个视频""每个视频约 $X"都按它实时计算。

| 档位   | 月付   | 年付（折合每月） | 每周期积分 | 约多少视频（月付） | 每个视频约 |
| ------ | ------ | ---------------- | ---------- | ------------------ | ---------- |
| 免费   | $0     | —                | —          | 第一个免费         | —          |
| 入门版 | $9.90  | $95（$7.92）     | 300        | 15                 | $0.66      |
| Pro    | $18.90 | $181（$15.08）   | 1,000      | 50                 | $0.38      |

- 年付一次性发放全年积分（3,600 / 12,000），有效期 366 天；月付每期发放、31 天有效。
- 渲染失败或取消自动退还积分；规划永远不扣积分。
- 不对外售卖：Enterprise、Lifetime（目录里保留，`PUBLIC_SUBSCRIPTION_PRODUCT_IDS` 之外不能下单）。

## 3. 单位成本与毛利

成本几乎全在大模型（规划 6 个阶段 + 修复重试），渲染（Cloudflare Containers basic，平均 208 秒）每次约 $0.01。
模型 KIE Claude Haiku 5.5：输入 $0.06、输出 $0.30 每百万 token（GPT-6.1 Sol 为 $0.60 / $3.00）。
2026-10-15 按 GPT-6.1 Sol 的线上耗时反推，一个视频约 $0.40；换 Haiku 后估计 $0.03–0.06。
**真实成本以 `animation_planning_attempt.provider_millicredits` 为准**（Kie 实际扣费 × 1000，1 积分 ≈ $0.005）：

```sql
select date(created_at/1000,'unixepoch') d, count(distinct run_id) runs,
       sum(provider_millicredits)/1000.0 kie_credits,
       sum(provider_millicredits)/1000.0*0.005 usd
from animation_planning_attempt where provider_millicredits is not null group by 1 order by 1 desc;
```

到手收入（月付，含税价扣全球平均约 10% 的税，Stripe 标准费 + 海外卡 + Managed Payments 约 7.9% + $0.30）：
入门版约 $7.90，Pro 约 $15.40。按每个视频 $0.05 算，即使额度全部用满，入门版毛利约 90%，Pro 约 84%；
年付 Pro 一次发 12,000 积分（约 600 个视频），全部用光成本约 $30，低于 $181 售价，所以年付积分仍一次性发放。
固定成本（Cloudflare 付费版、ElevenLabs 等）每月约 $15–20，约 3 个入门版订阅即可覆盖。

如果以后换回昂贵模型（单个视频成本超过约 $0.30），Pro 用满会亏，先改本节再改价格或额度。

## 4. 收款：Stripe Managed Payments

Stripe 账户默认开启 Managed Payments：Stripe 作为记录商户（merchant of record），在 80 多个国家代收代缴增值税和销售税、
处理欺诈和争议。对独立开发者这是最省事的合规方式，代价是在标准手续费之外多收一笔 Managed Payments 费用。

- 每个商品必须带合格的税码，否则创建会话直接失败（2026-09 的 8 笔订单全部因此失败）。我们用
  `txcd_10105001`（AI 即服务，云端，个人使用），后台 `stripe_tax_code` 可改。
- 价格含税（`tax_behavior: inclusive`）：定价页写 $9.90，用户结账就付 $9.90，税从里面扣。
- 开启时不能传 `payment_method_types`、`invoice_creation` 等参数（付款方式和发票由 Stripe 决定）；后台
  `stripe_managed_payments=false` 可关闭，关闭后税务合规由我们自己负责。
- **限制**：Managed Payments 不向中国大陆等受限地区的买家收款。中文用户要付费，需要另开渠道（微信支付、支付宝已有代码，
  后台未配置商户号）。

## 5. 转化路径

```
搜索/分享 → 实验、奇观、百科（免费）
        → "做成视频" → 创作台：规划 + 代码（免费）
        → 第一次渲染（免费，验证邮箱即可）  ← aha：看到自己的视频
        （没有付费套餐的账号每天最多发起 3 个新视频，防止免费规划被刷）
        → 第二次渲染：余额不足提示 + "查看套餐 →"
        → /pricing?return=/creator?animationId=… → Stripe 结账
        → 回到原对话 → 重试渲染
```

实现位置：

- 首个视频免费：`freeFirstRenderAvailable`（`src/routes/api/animations/-shared.ts`）。判定为"账号已验证邮箱，且没有
  排队中、渲染中或成功的渲染任务"；失败或取消的不算用掉。后台配置 `animation_free_first_render=false` 可关闭。
  每个用户同时只能占一个生成槽位，所以不会并发白嫖。
- 免费每日上限：`enforceFreeDailyCreations`（同文件），滚动 24 小时内新建对话数（含已删除）达到
  `animation_free_daily_creations`（默认 3，`0` 关闭）即返回 429，创作台弹出带"查看套餐"的提示。付费套餐不限。
- 余额提示与升级入口：创作台输入框上方的提示条、"积分不足"失败卡片（`UpgradeLink`，`src/components/creator-workspace.tsx`）。
- 付款后回跳：定价页读取 `?return=`（只接受 `/creator` 开头的站内路径），未登录时登录后回到带同样参数的定价页。

## 6. 页面承诺清单

改套餐或文案时，下面这些地方要一起改，且只能写已经上线、在生产上跑得通的能力：

- 定价页 `src/blocks/pricing.tsx` + `landing.pricing.*`（含 FAQ）
- 首页价格条 `home.pricing.*`、首页 FAQ `landing.faq.free.*`
- 关键词落地页 `/free-math-video-creator`（`pages.free.*`）、工具页 `pages.tool.band_lead`
- `llms.txt` / `llms-full.txt` 的产品描述

## 7. 监控

每周看一次（D1）：

- 订单：`select status, product_id, count(*) from "order" group by 1,2` —— 出现 `failed` 且没有 `payment_session_id`，
  说明是在创建 Stripe 会话时就失败了（2026-09 两位用户连续 8 次下单全部卡在这一步）。后台"测试 Stripe"按钮能直接看到报错。
- 漏斗：注册数 → 创建过对话的用户数 → 成功渲染过的用户数 → 付费用户数。
- 生成失败：`animation_planning_attempt` 中 `status='failed'` 的 `error_code` 分布。

## 8. 决策记录

- **2026-10-15（模型与成本）**：生成模型改为 KIE Claude Haiku 5.5（效果更好，token 单价约十分之一）。
  原计划的"Pro 降额度"和"年付按月发放"不再需要（见第 3 节），保留价格与额度；加免费每日上限；每次调用记录 token 与 Kie 扣费。
- **2026-10-15（Stripe）**：线上结账失败的原因确认为 Managed Payments 要求商品税码，我们没传。补上税码
  `txcd_10105001`、价格改为含税、开启时去掉不支持的参数，后台可调。
- **2026-10-15**：审查发现收费链路没有闭环：221 个注册用户、182 人用过创作台，但 263/291 次创作失败、
  除站长外无人渲染出视频、8 笔订单全部在创建结账会话时失败、0 个订阅；页面仍承诺"注册即送积分"
  （线上未开启）和"3 个 / 7 个模型"（已只剩一个模型）。改为：首个视频免费、档位按视频数量和单价区分、
  在积分不足处给出升级入口并在付款后回到原对话；修复 KIE Responses 接口回放 AI 输出时内容类型错误
  （`input_text` → `output_text`），该错误让所有需要修复的场景生成必然失败。
