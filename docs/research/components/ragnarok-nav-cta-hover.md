# Ragnarok Navigation CTA Hover Spec

更新时间：2026-07-23

目标组件：顶部导航栏 `Sign Up` / `Contact` 小号 Secondary Button。CurvG 对应入口为导航栏 `Create`。

## 交互模型

- 驱动方式：`hover` 和 `pressed`。
- Framer variant 过渡：`tween`，`600ms`，`cubic-bezier(.44, 0, .56, 1)`。
- 与 Hero 主 CTA 共用 Pixel Grid Reveal 和 Scramble Appear，但使用小号参数且不显示箭头。

## 默认态

- `Sign Up` 实测尺寸：`78.4921875 × 38px`。
- 圆角：`5px`。
- 背景：`#f3f3f9`。
- 边框：`1px solid #e3e2e5`。
- 内边距：`8px 10px`。
- 文案：Inter 400、`16px/22.4px`、`#201f32`。
- 没有像素箭头。

## Hover Pixel Grid Reveal

- 容器：按钮内部 `absolute; inset: 0`，圆角 `4px`，底色为白色 `#fff`。
- 像素颜色：默认背景色 `#f3f3f9`，方块圆角为 `0`。
- 原始 `pixelSize: 60`，响应式缩放后目标格尺寸约为 `45px`。
- 实际划分为 `2 列 × 1 行`，单格约 `39.25 × 38px`。
- 方向：`right-to-left`。
- 总揭示时长约 `450ms`；先移除右格，再移除左格，每格间隔约 `225ms`。
- 最终稳定 hover 是白色背景，不是蓝色背景。

## Hover Scramble Appear

- 原文在 hover variant 中淡出到 `opacity: 0`，同位置挂载扰码文字层。
- 扰码方向从左向右，扰码带宽度 `6` 个字符。
- 字符库：`A-Z`、`0-9` 和常用标点；保留空格并匹配大小写。
- 正常文字：`#201f32`；扰码字符：`#a1a1a1`。
- `speed: 85` 对应约 `32ms` 更新一次。
- `Sign Up` 共 7 字符，完整重排约 `416ms`；CurvG 的 `Create` 共 6 字符，约 `384ms`。

## 时间轴

| 时间          | 状态                                         |
| ------------- | -------------------------------------------- |
| `0ms`         | 挂载白底像素层与扰码文字层；原文开始淡出。   |
| `0–450ms`     | 两个浅灰方格从右向左消失，逐步露出白底。     |
| `0–600ms`     | Framer variant tween 完成。                  |
| `0–约384ms`   | CurvG `Create` 的 6 字符扰码带从左向右完成。 |
| 稳定 hover    | 白底、深色正常文案、浅灰边框，无箭头。       |
| pointer leave | hover-only 层卸载，恢复 `#f3f3f9` 默认背景。 |

## CurvG 实现约束

- 导航入口保留 CurvG 当前文案、鉴权状态和跳转地址。
- 桌面端复制 hover，键盘 focus 同步触发以补足可访问性。
- 触屏端使用 pressed 反馈；移动菜单按钮不依赖 hover。
- 复用 Hero CTA 的扰码状态机，但分别配置像素网格、颜色、箭头和节奏。
- `prefers-reduced-motion: reduce` 时不播放逐格揭示与文字扰码，直接显示稳定态。
