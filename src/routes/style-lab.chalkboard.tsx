import { createFileRoute } from '@tanstack/react-router';

import { LabSwitcher } from '@/components/style-lab/lab-switcher';
import { LivingCurve } from '@/components/style-lab/living-curve';

export const Route = createFileRoute('/style-lab/chalkboard')({
  head: () => ({
    meta: [
      { title: '方向 B · 黑板宇宙 — CurvG 样式实验室' },
      {
        name: 'description',
        content: '一块无限延伸的深色黑板，曲线是粉笔笔迹，带手写标注的温度。',
      },
    ],
  }),
  component: ChalkboardPage,
});

const vars = {
  '--lab-bg': '#101815',
  '--lab-surface': '#16211d',
  '--lab-fg': '#f2f0e6',
  '--lab-muted': '#8a9589',
  '--lab-chalk': '#f2f0e6',
  '--lab-accent': '#7dd8c0',
  '--lab-amber': '#e8c477',
  '--lab-border': 'rgba(242, 240, 230, 0.14)',
} as React.CSSProperties;

function ChalkboardPage() {
  return (
    <div
      style={vars}
      className="min-h-screen bg-[var(--lab-bg)] font-sans text-[var(--lab-fg)] antialiased"
    >
      {/* 黑板质感：细微噪点用径向渐变模拟 */}
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0"
        style={{
          backgroundImage:
            'radial-gradient(ellipse at 30% 20%, rgba(125,216,192,0.05), transparent 50%), radial-gradient(ellipse at 80% 80%, rgba(232,196,119,0.04), transparent 50%)',
        }}
      />

      {/* 导航：像黑板顶部的板书 */}
      <header className="relative z-40 border-b-2 border-dashed border-[var(--lab-border)]">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
          <span
            className="text-xl italic"
            style={{ fontFamily: 'var(--font-serif-display)' }}
          >
            CurvG
          </span>
          <nav className="hidden items-center gap-8 text-sm text-[var(--lab-muted)] sm:flex">
            <span className="cursor-default underline decoration-dashed underline-offset-4 transition-colors hover:text-[var(--lab-fg)]">
              曲线百科
            </span>
            <span className="cursor-default underline decoration-dashed underline-offset-4 transition-colors hover:text-[var(--lab-fg)]">
              画廊
            </span>
            <span className="cursor-default underline decoration-dashed underline-offset-4 transition-colors hover:text-[var(--lab-fg)]">
              定价
            </span>
            <span className="cursor-default rounded-lg border-2 border-[var(--lab-accent)]/60 px-4 py-1.5 text-[var(--lab-accent)] transition-colors hover:bg-[var(--lab-accent)]/10">
              开始创作 ✎
            </span>
          </nav>
        </div>
      </header>

      {/* 首屏 */}
      <section className="relative flex min-h-[92vh] flex-col justify-center overflow-hidden px-6">
        <LivingCurve
          color="#f2f0e6"
          secondaryColor="#e8c477"
          renderStyle="chalk"
          className="absolute inset-0 h-full w-full opacity-80"
        />
        <div className="pointer-events-none relative z-10 mx-auto w-full max-w-6xl">
          <div className="max-w-xl">
            <p className="inline-block -rotate-1 rounded bg-[var(--lab-amber)]/15 px-3 py-1 font-mono text-xs text-[var(--lab-amber)]">
              ✎ 今日课题：把想法画出来
            </p>
            <h1
              className="mt-6 text-5xl leading-tight text-balance italic sm:text-6xl"
              style={{ fontFamily: 'var(--font-serif-display)' }}
            >
              数学，
              <br />
              写在宇宙的黑板上
            </h1>
            <p className="mt-6 max-w-md text-base leading-relaxed text-pretty text-[var(--lab-muted)]">
              一句话描述，一段粉笔动画。CurvG 把你的数学直觉变成 Manim
              影像，像最好的老师那样讲解。
            </p>
            <div className="pointer-events-auto mt-10 flex items-center gap-5">
              <span className="cursor-default rounded-lg bg-[var(--lab-accent)] px-7 py-3 text-sm font-semibold text-[#0c1512] transition-transform hover:scale-[1.02] hover:-rotate-1">
                拿起粉笔
              </span>
              <span className="cursor-default font-mono text-sm text-[var(--lab-muted)] underline decoration-dashed underline-offset-4 transition-colors hover:text-[var(--lab-fg)]">
                看看别人画了什么
              </span>
            </div>
          </div>
        </div>
        {/* 手写风标注 */}
        <p className="absolute right-8 bottom-10 hidden -rotate-2 font-mono text-xs text-[var(--lab-amber)]/80 sm:block">
          ← 蝶形曲线：x = sin t · (e^cos t − 2cos 4t)
        </p>
      </section>

      {/* 三步流程：作业格式 */}
      <section className="relative z-10 mx-auto max-w-6xl px-6 py-24">
        <h2
          className="text-3xl text-balance italic sm:text-4xl"
          style={{ fontFamily: 'var(--font-serif-display)' }}
        >
          解题步骤
        </h2>
        <div className="mt-12 space-y-6">
          {[
            {
              n: '第一步',
              t: '写下想法',
              d: '「展示傅里叶级数如何逼近方波」——就这么简单。',
              c: 'var(--lab-accent)',
            },
            {
              n: '第二步',
              t: '检查板书',
              d: 'AI 列出分镜草稿，每条公式都经过符号验证，你批改后才继续。',
              c: 'var(--lab-amber)',
            },
            {
              n: '第三步',
              t: '放映',
              d: '渲染完成的动画像放电影一样揭幕，可下载、可分享、可再创作。',
              c: 'var(--lab-fg)',
            },
          ].map((s, i) => (
            <div
              key={s.n}
              className="flex flex-col gap-4 rounded-xl border-2 border-dashed border-[var(--lab-border)] bg-[var(--lab-surface)]/70 p-7 sm:flex-row sm:items-baseline sm:gap-10"
              style={{ transform: `rotate(${i % 2 === 0 ? -0.3 : 0.3}deg)` }}
            >
              <span
                className="shrink-0 font-mono text-sm"
                style={{ color: s.c }}
              >
                {s.n}
              </span>
              <div>
                <h3 className="text-lg font-semibold">{s.t}</h3>
                <p className="mt-2 text-sm leading-relaxed text-[var(--lab-muted)]">
                  {s.d}
                </p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* 画廊：钉在黑板上的卡片 */}
      <section className="relative z-10 mx-auto max-w-6xl px-6 pb-32">
        <h2
          className="text-3xl text-balance italic"
          style={{ fontFamily: 'var(--font-serif-display)' }}
        >
          全班作品墙
        </h2>
        <div className="mt-10 grid gap-6 sm:grid-cols-3">
          {[
            { name: '心脏线', eq: 'r = 1 − sin θ', rot: '-1deg' },
            { name: '玫瑰线', eq: 'r = cos 5θ', rot: '0.8deg' },
            { name: '利萨茹曲线', eq: 'x = sin 3t', rot: '-0.6deg' },
          ].map((c) => (
            <div
              key={c.name}
              className="cursor-default rounded-lg border-2 border-[var(--lab-border)] bg-[var(--lab-surface)] p-1 transition-transform hover:scale-[1.02] hover:rotate-0"
              style={{ transform: `rotate(${c.rot})` }}
            >
              <div className="flex h-40 items-center justify-center rounded border border-dashed border-[var(--lab-border)]">
                <span className="font-mono text-sm text-[var(--lab-accent)]">
                  {c.eq}
                </span>
              </div>
              <div className="flex items-center justify-between px-4 py-3">
                <span className="text-sm font-medium">{c.name}</span>
                <span className="text-xs text-[var(--lab-amber)]">
                  照着画 ✎
                </span>
              </div>
            </div>
          ))}
        </div>
      </section>

      <footer className="relative z-10 border-t-2 border-dashed border-[var(--lab-border)] py-10 text-center font-mono text-xs text-[var(--lab-muted)]">
        CurvG — 方向 B · 黑板宇宙 · 温度与手迹
      </footer>

      <LabSwitcher current="/style-lab/chalkboard" />
    </div>
  );
}
