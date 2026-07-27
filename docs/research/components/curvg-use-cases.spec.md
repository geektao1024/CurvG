# UseCases Specification

## Overview

- **Target file:** `src/blocks/use-cases.tsx`
- **Interaction model:** card hover with existing `InteractiveSurface`; links go to early access
- **Purpose:** 用三类实际数学动画需求建立受众认知，不伪造客户、用户量或成功案例。

## Content structure

- 居中章节标记、标题、描述。
- 三张卡片：教育者、学习者、内容创作者。
- 每张卡片有图标、序号、标题、说明、两个任务标签与一个链接。

## Style rules

- 区块遵循 `curvg-section-field`。
- 卡片使用白色、`1px` 边框、`8px` 圆角，`p-7 sm:p-8`。
- 桌面 `lg` 三列；hover 复用指针光晕与最大 `2px` 上移，避免额外动画。
- 标签使用 `font-mono`、浅色表面、低对比边线。

## Content boundary

- 使用“为…准备 / 用于…”描述目标任务。
- 不使用“已经帮助了… / 客户包括… / 数千用户…”等无法证明的社会证据。
