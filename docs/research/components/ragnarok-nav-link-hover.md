# Ragnarok Navigation Link Hover Spec

更新时间：2026-07-23

目标组件：顶部导航栏 `About`、`Pricing`、`Blog`、`Login` 文本入口。

## 已验证实现

- 默认尺寸随文字变化；`About` 实测为 `65.125 × 38px`。
- 内边距：`11px 10px`；圆角：`4px`。
- 默认背景：透明；hover 背景：`rgba(31, 31, 50, 0.05)`。
- 默认文字：Inter 400、`16px/16px`、`#201f32`。
- hover 时默认文字淡出，并挂载与 CTA 相同的 Scramble Appear 文字层。
- 扰码方向：从左向右；扰码带宽度：`6`；保留空格并匹配大小写。
- 正常文字：`#201f32`；扰码字符：`#a1a1a1`。
- `speed: 85`，约每 `32ms` 更新一次。
- 组件 transition：spring，`400ms`，bounce `0.2`。

## 与导航 CTA 的区别

- 普通导航文字没有 Pixel Grid Reveal。
- `Sign Up` / `Contact` 小按钮才使用 `2 × 1` 像素块揭示。
- 两者共用文字扰码机制，但背景、边框和像素层不同。

## CurvG 映射

- `Create`、`Gallery`、`Workflow`、`FAQ` 使用普通导航文字模式。
- 顶部右侧 `Create` 按钮继续使用导航 CTA 模式。
- 键盘 `focus-visible` 和触屏 pressed 同步触发扰码，以补足可访问性。
