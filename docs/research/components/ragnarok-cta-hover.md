# Ragnarok Hero CTA Hover Spec

更新时间：2026-07-23

目标组件：Hero 主 CTA `Build Your Agent`。

## 交互模型

- 驱动方式：`hover` 和 `pressed`，不是滚动或时间自动播放。
- Framer variant：Big `yzMJw_zKE`。
- Variant 过渡：`tween`，`600ms`，`cubic-bezier(.44, 0, .56, 1)`，无延迟。
- 没有发现独立的键盘 focus variant。

## 默认态

- 尺寸：`194.9375 × 53px`。
- 外层圆角：`5px`。
- 内容容器背景：`#201f32`。
- 内边距：`14px 16px`。
- 文案：Inter 400、`18px/25.2px`、白色。
- 文案与箭头间距：`8px`。
- 箭头窗口：`16 × 16px`、`overflow: clip`、`justify-content: flex-end`。
- 箭头窗口内横向排列两份相同的像素箭头，默认显示第二份。
- 覆盖层保留多层微弱外阴影和白色内阴影。

## Hover 动态挂载层

默认 DOM 中不存在以下两层；进入 hover/pressed variant 后才动态挂载：

### Pixel Grid Reveal Container

- 位置：按钮内部 `absolute; inset: 0`，层级位于文案下方。
- 容器底色：`#262ef2`。
- 圆角：`4px`。
- 像素颜色：`#201f32`。
- 像素圆角：`0`，因此是硬边方块。
- 原始参数 `pixelSize: 60`，组件按按钮宽度缩放后得到约 `45px` 的目标格尺寸。
- 实际按钮被划分为 `5 列 × 2 行`，单格约 `38.99 × 26.5px`。
- 方向：`right-to-left`。
- `animationRandom: false`：推进方向固定，但同一推进带内会随机选择要消失的格子。
- `animationSpeed: 2`：总揭示时长约 `450ms`。
- 共 10 格，每轮删除 1 格，间隔约 `45ms`。
- 视觉原理：深色格子起初遮住蓝底，随后从右向左逐格透明，最终露出完整蓝色按钮。

### Scramble Appear

- 原文在 hover variant 中淡出到 `opacity: 0`。
- 同位置挂载一份新的乱码文字层。
- 字符库：`A-Z`、`0-9` 和常用标点。
- 方向：`left`，即乱码带从左向右推进。
- 乱码带宽度：`6` 个字符。
- 保留空格并匹配原字符大小写。
- 正常文字：白色；乱码字符：`rgba(255,255,255,.5)`。
- 参数 `speed: 85` 对应约 `32ms` 更新一次。
- `Build Your Agent` 含空格共 16 字符，完整重排约 `704ms`。

## 箭头切换

- Hover/pressed 时箭头窗口从 `justify-content: flex-end` 改为 `flex-start`。
- 两份箭头的位置整体切换一个 `16px` 单元，视觉上是旧箭头离开、新箭头进入。
- 箭头素材是 `260 × 260px` PNG 缩放到 `16 × 16px`，由五个方块组成右尖括号。
- 按钮进入 hover 后设置 `overflow: clip`，避免像素层和箭头越界。

## 时间轴

| 时间          | 状态                                                         |
| ------------- | ------------------------------------------------------------ |
| `0ms`         | 挂载蓝底像素揭示层和乱码文字层；原文开始淡出；箭头轨道切换。 |
| `0–450ms`     | 深色方格从右向左逐格消失，露出蓝底。                         |
| `0–600ms`     | Framer variant tween 完成。                                  |
| `0–704ms`     | 6 字符乱码带从左向右扫过，恢复完整 CTA 文案。                |
| 稳定 hover    | 蓝色按钮、白色正常文案、像素箭头。                           |
| pointer leave | hover-only 层卸载，恢复深色默认按钮。                        |

## 明确排除

- CTA 本体不旋转。
- CTA 默认 DOM 里没有常驻噪点层。
- 旋转的 conic-mask 属于 Hero 右侧流程状态徽标，不属于 CTA。

## CurvG 后续实现约束

- 保留 CurvG 当前 CTA 文案和跳转目标，只复制交互机制。
- 使用本地 CSS/React 重绘 `5 × 2` 像素揭示，不复制目标站代码或图片。
- 乱码过程必须保留空格，避免按钮宽度抖动。
- `prefers-reduced-motion: reduce` 时直接切换蓝底，不播放逐格揭示和乱码动画。
