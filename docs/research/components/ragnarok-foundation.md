# Foundation Spec — Framed Canvas

- 页面背景：`#f3f3f9`。
- 桌面主体宽度：`calc(100vw - 80px)`，最大 `1360px`。
- 桌面侧轨：左右各 `40px`，使用 1px 斜线、4px 周期的低对比纹理。
- 主体边界：`1px solid #e3e2e5`。
- 区块之间不靠大阴影分隔，使用水平边线、垂直分栏线、角落定位点。
- 装饰层必须 `pointer-events: none`，不能阻塞首页真实交互。
- 低于 `768px` 隐藏侧轨，主体占满宽度。
