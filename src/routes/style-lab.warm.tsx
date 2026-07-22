import { createFileRoute } from '@tanstack/react-router';

import { LabSwitcher } from '@/components/style-lab/lab-switcher';
import { LivingCurve } from '@/components/style-lab/living-curve';

export const Route = createFileRoute('/style-lab/warm')({
  head: () => ({
    meta: [
      { title: '方向 D · 温暖天文馆 — CurvG 样式实验室' },
      {
        name: 'description',
        content:
          '暖炭底色 + 电磁蓝青发光曲线。黑板的色温、天文馆的魂、仪器的工作语言。',
      },
    ],
  }),
  component: WarmPlanetariumPage,
});

/**
 * 方向 D = B 的色温 + A 的签名曲线 + C 的信息语言
 * 底色：暖炭（非蓝黑、非墨绿）
 * 文字：粉笔白（暖白，无纹理）
 * 主色：电磁蓝青（暖底冷光）
 */
const vars = {
  '--lab-bg': '#171412',
  '--lab-surface': '#1f1b18',
  '--lab-fg': '#efe9e1',
  '--lab-muted': '#8f867b',
  '--lab-accent': '#3fc9dd',
  '--lab-warm': '#e0b97e',
  '--lab-border': 'rgba(239, 233, 225, 0.09)',
} as React.CSSProperties;

function WarmPlanetariumPage() {
  return (
    <div
      style={vars}
      className="min-h-screen bg-[var(--lab-bg)] font-sans text-[var(--lab-fg)] antialiased"
    >
      {/* 导航 */}
      <header className="fixed inset-x-0 top-0 z-40">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
          <span
            className="text-lg tracking-tight"
            style={{ fontFamily: 'var(--font-serif-display)' }}
          >
            CurvG
          </span>
          <nav className="hidden items-center gap-8 text-sm text-[var(--lab-muted)] sm:flex">
            <span className="cursor-default transition-colors hover:text-[var(--lab-fg)]">
              曲线百科
            </span>
            <span className="cursor-default transition-colors hover:text-[var(--lab-fg)]">
              画廊
            </span>
            <span className="cursor-default transition-colors hover:text-[var(--lab-fg)]">
              定价
            </span>
            <span className="cursor-default rounded-full border border-[var(--lab-accent)]/25 px-4 py-1.5 text-[var(--lab-accent)] transition-colors hover:bg-[var(--lab-accent)]/10">
              开始创作
            </span>
          </nav>
        </div>
      </header>

      {/* 首屏：暖底冷光，曲线仍是唯一主角 */}
      <section className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden px-6">
        <LivingCurve
          color="#3fc9dd"
          renderStyle="glow"
          className="absolute inset-0 h-full w-full"
        />
        <div className="pointer-events-none relative z-10 flex flex-col items-center text-center">
          <p className="text-xs font-medium tracking-[0.35em] text-[var(--lab-warm)] uppercase">
            Mathematics, rendered
          </p>
          <h1
            className="mt-6 max-w-3xl text-5xl leading-tight text-balance sm:text-7xl"
            style={{ fontFamily: 'var(--font-serif-display)' }}
          >
            让每一条曲线
            <br />
            被看见
          </h1>
          <p className="mt-6 max-w-md text-base leading-relaxed text-pretty text-[var(--lab-muted)]">
            用一句话描述你的数学想法，CurvG 将它变成经过验证的 Manim 动画。
          </p>
          <div className="pointer-events-auto mt-10 flex items-center gap-4">
            <span className="cursor-default rounded-full bg-[var(--lab-accent)] px-7 py-3 text-sm font-medium text-[#0d2226] transition-transform hover:scale-[1.03]">
              免费开始
            </span>
            <span className="cursor-default text-sm text-[var(--lab-muted)] transition-colors hover:text-[var(--lab-fg)]">
              浏览画廊 →
            </span>
          </div>
        </div>
        <p className="absolute bottom-8 left-1/2 -translate-x-1/2 font-mono text-[11px] tracking-widest text-[var(--lab-muted)]/70">
          r = cos(5θ) · 移动鼠标扰动曲线
        </p>
      </section>

      {/* 公式带：暖金作次要点缀 */}
      <section className="border-y border-[var(--lab-border)] bg-[var(--lab-surface)]/60">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-center gap-x-14 gap-y-4 px-6 py-8 font-mono text-sm text-[var(--lab-muted)]">
          <span>{'f(x) = Σ aₙ·sin(nωx)'}</span>
          <span className="text-[var(--lab-accent)]">{'e^{iπ} + 1 = 0'}</span>
          <span>{'x² + y² = r²'}</span>
          <span className="text-[var(--lab-warm)]">{'∇ × E = -∂B/∂t'}</span>
          <span className="text-[var(--lab-accent)]">{'ζ(s) = Σ 1/nˢ'}</span>
        </div>
      </section>

      {/* 三步流程 */}
      <section className="mx-auto max-w-6xl px-6 py-28">
        <h2
          className="max-w-xl text-3xl leading-snug text-balance sm:text-4xl"
          style={{ fontFamily: 'var(--font-serif-display)' }}
        >
          从想法到动画，
          <br />
          <span className="text-[var(--lab-accent)]">三步之内</span>
        </h2>
        <div className="mt-16 grid gap-10 sm:grid-cols-3">
          {[
            {
              n: '01',
              t: '描述',
              d: '用自然语言写下你的数学想法，就像和同事讨论一样。',
            },
            {
              n: '02',
              t: '审阅',
              d: 'AI 生成结构化分镜规格，每一条数学声明都经过符号验证。',
            },
            {
              n: '03',
              t: '渲染',
              d: '确定性的 Manim 渲染管线输出可分享的高清视频。',
            },
          ].map((s) => (
            <div
              key={s.n}
              className="rounded-2xl border border-[var(--lab-border)] bg-[var(--lab-surface)]/80 p-8 transition-colors hover:border-[var(--lab-accent)]/30"
            >
              <span className="font-mono text-xs text-[var(--lab-warm)]">
                {s.n}
              </span>
              <h3 className="mt-4 text-xl font-medium">{s.t}</h3>
              <p className="mt-3 text-sm leading-relaxed text-[var(--lab-muted)]">
                {s.d}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* 工作台切片：引入 C 的精密信息语言 */}
      <section className="mx-auto max-w-6xl px-6 pb-28">
        <div className="overflow-hidden rounded-2xl border border-[var(--lab-border)] bg-[var(--lab-surface)]/80">
          <div className="flex items-center justify-between border-b border-[var(--lab-border)] px-6 py-4">
            <span className="text-sm font-medium">渲染队列</span>
            <span className="rounded-full border border-[var(--lab-accent)]/30 px-3 py-1 font-mono text-[11px] text-[var(--lab-accent)]">
              RENDERING · 02:14
            </span>
          </div>
          <div className="grid gap-px sm:grid-cols-3">
            {[
              { k: '场景', v: 'fourier_series_intro', s: '已验证' },
              { k: '数学声明', v: '3 / 3 通过 SymPy 校验', s: '通过' },
              { k: '预计成本', v: '$0.042 · 1080p · 24s', s: '估算' },
            ].map((row) => (
              <div key={row.k} className="bg-[var(--lab-bg)]/60 px-6 py-5">
                <p className="text-[11px] tracking-widest text-[var(--lab-muted)] uppercase">
                  {row.k}
                </p>
                <p className="mt-2 font-mono text-sm text-[var(--lab-fg)]">
                  {row.v}
                </p>
                <p className="mt-1 font-mono text-[11px] text-[var(--lab-accent)]">
                  {row.s}
                </p>
              </div>
            ))}
          </div>
        </div>
        <p className="mt-4 text-center text-xs text-[var(--lab-muted)]">
          工作台区域采用精密仪器的信息语言：等宽数据 · 状态徽标 · 可信度优先
        </p>
      </section>

      {/* 画廊预览 */}
      <section className="mx-auto max-w-6xl px-6 pb-32">
        <div className="flex items-end justify-between">
          <h2
            className="text-3xl text-balance"
            style={{ fontFamily: 'var(--font-serif-display)' }}
          >
            曲线百科
          </h2>
          <span className="cursor-default text-sm text-[var(--lab-muted)] transition-colors hover:text-[var(--lab-fg)]">
            查看全部 →
          </span>
        </div>
        <div className="mt-10 grid gap-6 sm:grid-cols-3">
          {[
            { name: '心脏线', eq: 'r = 1 − sin θ' },
            { name: '玫瑰线', eq: 'r = cos 5θ' },
            { name: '利萨茹曲线', eq: 'x = sin 3t, y = sin 2t' },
          ].map((c) => (
            <div
              key={c.name}
              className="group cursor-default overflow-hidden rounded-2xl border border-[var(--lab-border)] bg-[var(--lab-surface)]/80"
            >
              <div className="flex h-44 items-center justify-center border-b border-[var(--lab-border)]">
                <span className="font-mono text-sm text-[var(--lab-accent)]/70 transition-colors group-hover:text-[var(--lab-accent)]">
                  {c.eq}
                </span>
              </div>
              <div className="flex items-center justify-between p-5">
                <span className="text-sm font-medium">{c.name}</span>
                <span className="text-xs text-[var(--lab-warm)]">
                  生成动画 →
                </span>
              </div>
            </div>
          ))}
        </div>
      </section>

      <footer className="border-t border-[var(--lab-border)] py-10 text-center text-xs text-[var(--lab-muted)]">
        CurvG — 方向 D · 温暖天文馆 · 黑板的色温，天文馆的魂
      </footer>

      <LabSwitcher current="/style-lab/warm" />
    </div>
  );
}
