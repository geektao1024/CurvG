# Ragnarok Corner Marker Spec

更新时间：2026-07-23

目标组件：各画框边缘的 `Top Left`、`Top Right`、`Bottom Left`、`Bottom Right` 小型旋转标记。

## 已验证实现

- 组件名：`Nut Bolt`。
- 尺寸：`15 × 15px`。
- 外层：直径 `13px` 的圆形，颜色 `#d6e3eb`，在 `15 × 15` 画布内偏移 `1px`。
- 内层：两个白色半椭圆瓣，中间保留 `1px` 间隔。
- 动画：`rotate(0deg → 360deg)`。
- 时长：`5s`。
- 缓动：linear，Framer 参数 `[0, 0, 1, 1]`。
- 循环：无限，无重复延迟；离屏不暂停。

## CurvG 映射

- 所有 `.curvg-corner` 使用同一个本地 SVG 资产，统一尺寸与旋转参数。
- `prefers-reduced-motion: reduce` 时停止旋转，保留静态标记。
