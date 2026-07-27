# FormulaWorkspacePreview Specification

## Overview

- **Target file:** `src/blocks/formula-workspace-preview.tsx`
- **Interaction model:** static product preview; only CTA link is interactive
- **Purpose:** 将竞品的 Creator 工作台结构转化为 CurvG 的“公式 → 场景规格 → 可检查预览”叙事。

## Content structure

1. 居中等宽章节标记、标题和描述。
2. 一张横向工作台面板，桌面三列，移动端纵向堆叠。
3. 左列：公式输入与“结构化输入”标签。
4. 中列：场景规格的三条可检查项目。
5. 右列：真实 SVG 参数曲线、代码片段和“render target”标签。
6. 底部：当前状态提示和 `/creator` 的行动链接。

## Style rules

- 区块外层：`curvg-stage curvg-frame curvg-section-field`，`px-6 py-20 sm:px-10 sm:py-28`。
- 工作台：白色，`1px var(--border)`，`8px` 圆角；不使用厚投影。
- 列分隔：桌面使用 `lg:border-l`；每列最少 `220px`，内边距 `24px`。
- 预览网格：`32px` 坐标网格，曲线为 `--primary`。
- 状态标签：10–11px 等宽小字。
- 不放真实模型、API Key、任务 ID、假进度或可提交输入控件。

## Responsive behavior

- `<1024px`：三列改为单列，使用水平边线分隔。
- 所有静态公式与代码可以换行或横向滚动，不能截断为不可读内容。

## Accessibility

- SVG 使用 `role=img` 与本地化 `aria-label`。
- 模拟工作台元素使用语义文本，不能伪装为可编辑的 input。
- 只有底部行动链接可获得焦点。
