import { createFileRoute } from '@tanstack/react-router';

import { LabSwitcher } from '@/components/style-lab/lab-switcher';
import { LivingCurve } from '@/components/style-lab/living-curve';

export const Route = createFileRoute('/style-lab/instrument')({
  head: () => ({
    meta: [
      { title: '方向 C · 精密仪器 — CurvG 样式实验室' },
      {
        name: 'description',
        content:
          '石墨黑底、蓝图网格、发丝线曲线与实时坐标读数。冷静、精密、高效。',
      },
    ],
  }),
  component: InstrumentPage,
});

const vars = {
  '--lab-bg': '#0a0a0c',
  '--lab-surface': '#101014',
  '--lab-fg': '#ececf1',
  '--lab-muted': '#71717d',
  '--lab-accent': '#67e8f9',
  '--lab-border': 'rgba(236, 236, 241, 0.09)',
  '--lab-grid': 'rgba(103, 232, 249, 0.05)',
} as React.CSSProperties;

function InstrumentPage() {
  return (
    <div
      style={vars}
      className="min-h-screen bg-[var(--lab-bg)] font-sans text-[var(--lab-fg)] antialiased"
    >
      {/* 蓝图网格 */}
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0"
        style={{
          backgroundImage:
            'linear-gradient(var(--lab-grid) 1px, transparent 1px), linear-gradient(90deg, var(--lab-grid) 1px, transparent 1px)',
          backgroundSize: '48px 48px',
        }}
      />

      {/* 导航：紧凑工具栏 */}
      <header className="relative z-40 border-b border-[var(--lab-border)] bg-[var(--lab-bg)]/85 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-3">
          <div className="flex items-center gap-3">
            <span className="font-mono text-sm font-semibold tracking-tight">
              CurvG
            </span>
            <span className="rounded border border-[var(--lab-border)] px-1.5 py-0.5 font-mono text-[10px] text-[var(--lab-muted)]">
              v0.1
            </span>
          </div>
          <nav className="hidden items-center gap-6 font-mono text-xs text-[var(--lab-muted)] sm:flex">
            <span className="cursor-default transition-colors hover:text-[var(--lab-fg)]">
              /curves
            </span>
            <span className="cursor-default transition-colors hover:text-[var(--lab-fg)]">
              /gallery
            </span>
            <span className="cursor-default transition-colors hover:text-[var(--lab-fg)]">
              /pricing
            </span>
            <span className="cursor-default rounded bg-[var(--lab-accent)] px-3 py-1.5 font-medium text-[#06181c] transition-opacity hover:opacity-90">
              new_animation()
            </span>
          </nav>
        </div>
      </header>

      {/* 首屏：仪表盘式，左文右图 */}
      <section className="relative z-10 mx-auto grid max-w-7xl gap-8 px-6 py-16 lg:grid-cols-[5fr_7fr] lg:items-center lg:py-24">
        <div>
          <div className="flex items-center gap-2 font-mono text-xs text-[var(--lab-accent)]">
            <span className="inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-[var(--lab-accent)]" />
            RENDERER: ONLINE
          </div>
          <h1 className="mt-5 text-4xl leading-tight font-semibold tracking-tight text-balance sm:text-5xl">
            数学动画的
            <br />
            精密制造车间
          </h1>
          <p className="mt-5 max-w-sm text-sm leading-relaxed text-pretty text-[var(--lab-muted)]">
            自然语言输入 → 符号验证 → 确定性 Manim 渲染。
            每一帧都可追溯，每一条公式都经过检验。
          </p>
          <div className="mt-8 flex items-center gap-3">
            <span className="cursor-default rounded bg-[var(--lab-accent)] px-5 py-2.5 font-mono text-sm font-medium text-[#06181c] transition-opacity hover:opacity-90">
              开始 →
            </span>
            <span className="cursor-default rounded border border-[var(--lab-border)] px-5 py-2.5 font-mono text-sm text-[var(--lab-muted)] transition-colors hover:border-[var(--lab-accent)]/40 hover:text-[var(--lab-fg)]">
              查看文档
            </span>
          </div>
          {/* 规格读数 */}
          <dl className="mt-10 grid grid-cols-3 gap-px overflow-hidden rounded border border-[var(--lab-border)] bg-[var(--lab-border)]">
            {[
              { k: '渲染精度', v: '1080p60' },
              { k: '验证引擎', v: 'SymPy' },
              { k: '平均耗时', v: '~40s' },
            ].map((s) => (
              <div key={s.k} className="bg-[var(--lab-surface)] p-4">
                <dt className="font-mono text-[10px] tracking-wider text-[var(--lab-muted)] uppercase">
                  {s.k}
                </dt>
                <dd className="mt-1 font-mono text-sm text-[var(--lab-accent)]">
                  {s.v}
                </dd>
              </div>
            ))}
          </dl>
        </div>

        {/* 示波器视窗 */}
        <div className="overflow-hidden rounded-lg border border-[var(--lab-border)] bg-[var(--lab-surface)]">
          <div className="flex items-center justify-between border-b border-[var(--lab-border)] px-4 py-2">
            <span className="font-mono text-[11px] text-[var(--lab-muted)]">
              scope_01 — parametric.live
            </span>
            <div className="flex gap-1.5" aria-hidden>
              <span className="h-2 w-2 rounded-full bg-[var(--lab-border)]" />
              <span className="h-2 w-2 rounded-full bg-[var(--lab-border)]" />
              <span className="h-2 w-2 rounded-full bg-[var(--lab-accent)]/60" />
            </div>
          </div>
          <LivingCurve
            color="#67e8f9"
            secondaryColor="#ececf1"
            renderStyle="hairline"
            className="aspect-[4/3] w-full"
          />
          <div className="flex items-center justify-between border-t border-[var(--lab-border)] px-4 py-2 font-mono text-[11px] text-[var(--lab-muted)]">
            <span>t ∈ [0, 2π] · n=480</span>
            <span className="text-[var(--lab-accent)]">● LIVE</span>
          </div>
        </div>
      </section>

      {/* 流程：管线视图 */}
      <section className="relative z-10 mx-auto max-w-7xl px-6 py-20">
        <h2 className="font-mono text-xs tracking-[0.25em] text-[var(--lab-muted)] uppercase">
          Pipeline
        </h2>
        <div className="mt-8 grid gap-px overflow-hidden rounded-lg border border-[var(--lab-border)] bg-[var(--lab-border)] sm:grid-cols-4">
          {[
            { n: '01', t: '输入', d: '自然语言描述你的数学想法' },
            { n: '02', t: '规格', d: '结构化分镜，逐条审批' },
            { n: '03', t: '验证', d: 'SymPy 符号验证每条声明' },
            { n: '04', t: '渲染', d: '沙箱化 Manim 确定性输出' },
          ].map((s) => (
            <div
              key={s.n}
              className="group bg-[var(--lab-surface)] p-6 transition-colors hover:bg-[var(--lab-bg)]"
            >
              <span className="font-mono text-[11px] text-[var(--lab-accent)]">
                {s.n} /
              </span>
              <h3 className="mt-3 text-base font-semibold">{s.t}</h3>
              <p className="mt-2 text-xs leading-relaxed text-[var(--lab-muted)]">
                {s.d}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* 曲线索引表 */}
      <section className="relative z-10 mx-auto max-w-7xl px-6 pb-32">
        <h2 className="font-mono text-xs tracking-[0.25em] text-[var(--lab-muted)] uppercase">
          Curve Index
        </h2>
        <div className="mt-8 overflow-hidden rounded-lg border border-[var(--lab-border)]">
          {[
            {
              id: 'CRV-001',
              name: '心脏线',
              eq: 'r = 1 − sin θ',
              tag: '极坐标',
            },
            { id: 'CRV-002', name: '玫瑰线', eq: 'r = cos 5θ', tag: '极坐标' },
            {
              id: 'CRV-003',
              name: '利萨茹曲线',
              eq: 'x = sin 3t, y = sin 2t',
              tag: '参数',
            },
            {
              id: 'CRV-004',
              name: '蝶形曲线',
              eq: 'e^cos t − 2cos 4t',
              tag: '参数',
            },
          ].map((c, i) => (
            <div
              key={c.id}
              className={`flex cursor-default items-center gap-4 bg-[var(--lab-surface)] px-5 py-4 transition-colors hover:bg-[var(--lab-bg)] sm:gap-8 ${i > 0 ? 'border-t border-[var(--lab-border)]' : ''}`}
            >
              <span className="w-20 shrink-0 font-mono text-xs text-[var(--lab-muted)]">
                {c.id}
              </span>
              <span className="w-28 shrink-0 text-sm font-medium">
                {c.name}
              </span>
              <span className="hidden flex-1 font-mono text-xs text-[var(--lab-accent)]/80 sm:block">
                {c.eq}
              </span>
              <span className="rounded border border-[var(--lab-border)] px-2 py-0.5 font-mono text-[10px] text-[var(--lab-muted)]">
                {c.tag}
              </span>
              <span className="font-mono text-xs text-[var(--lab-muted)]">
                →
              </span>
            </div>
          ))}
        </div>
      </section>

      <footer className="relative z-10 border-t border-[var(--lab-border)] py-8 text-center font-mono text-[11px] text-[var(--lab-muted)]">
        CurvG — 方向 C · 精密仪器 · 冷静与精确
      </footer>

      <LabSwitcher current="/style-lab/instrument" />
    </div>
  );
}
