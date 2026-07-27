# CurvG Artifact Inspector

## Purpose

把一次数学动画生成拆成可审查的规格、代码和视频，而不是只展示一个黑色视频框。

## Anatomy

1. Pipeline rail：`Spec / Approve / Process / Done`。
2. Artifact tabs：`Specification / Code / Video`。
3. Specification panel：标题、摘要、公式、假设、风格、布局、区域、依赖、备注和分镜。
4. Code panel：文件名、复制、下载、行号和 Python 语法着色。
5. Video panel：状态、时长、播放器、加载态、空态和错误重试。

## State Mapping

| Animation status                | Active pipeline step    | Preferred tab                 |
| ------------------------------- | ----------------------- | ----------------------------- |
| `draft`, `generating_spec`      | Spec                    | Video loading state           |
| `awaiting_approval`             | Approve                 | Specification                 |
| `generating_code`, `code_ready` | Process                 | Code when available           |
| `queued`, `rendering`           | Process                 | Code until video completes    |
| `completed`                     | Done                    | Video                         |
| `failed`                        | Last available artifact | Code, specification, or video |

手动切换标签后，不应因普通轮询重复抢回标签；只有动画 ID 或持久状态发生变化时才自动选择。

## Code Panel

- 只读，不伪装成编辑器。
- 使用等宽字体、水平滚动和独立行号列。
- 复制操作写入完整源码。
- 下载文件名由动画标题规范化，后缀固定为 `.py`。
- 不使用 `dangerouslySetInnerHTML`；语法着色通过 React 文本节点完成。

## Video Panel

- 默认使用同源、需要登录的 artifact URL。
- `<video>` 必须保留 `controls`、`playsInline` 和 `preload="metadata"`。
- 服务端必须支持 `Range` 和 `206 Partial Content`。
- 原生加载失败后才请求完整 Blob，不能每次点击播放都先下载完整 MP4。
- Blob URL 在动画切换和组件卸载时必须释放。

## Responsive Rules

- `xl` 及以上：检查器固定在右侧工作区，并保持视口内滚动。
- `xl` 以下：检查器插入对话流，固定约 560px 高度。
- 标签文字在可用宽度不足时由图标和截断保持可操作性。
- 规格和代码各自滚动，不能推动底部输入框离开视口。

## Accessibility

- Pipeline 使用有序列表与 `aria-current="step"`。
- Tabs 使用真实 tablist/tab/panel 语义。
- 播放按钮、重试按钮、复制和下载按钮必须有可读文本。
- 加载状态通过现有 `aria-live` 对话区域和可见状态文本反馈。
- 动画遵守 `prefers-reduced-motion`，进度旋转在 reduced motion 下停止。

## Non-goals

- 此组件不是 Monaco Playground。
- 此组件不负责执行 Python。
- 此组件不公开 R2 对象地址。
- 此组件不替代数学正确性验证。
