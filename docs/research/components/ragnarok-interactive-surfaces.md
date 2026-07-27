# Interactive Surface Spec

- 适用于曲线卡片和工作流卡片。
- 指针移动时更新局部 CSS 变量 `--pointer-x` / `--pointer-y`。
- 卡片表面显示半径约 `220px` 的低透明度靛蓝光晕。
- 卡片最多上移 `2px`，边框轻微加深；不使用大面积黑色阴影。
- 指针离开后恢复中心光晕并降低透明度。
- `prefers-reduced-motion: reduce` 下不跟随指针、不位移。
