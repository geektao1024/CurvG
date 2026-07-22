import { createFileRoute, Link } from '@tanstack/react-router';

export const Route = createFileRoute('/style-lab/')({
  head: () => ({
    meta: [
      { title: 'CurvG 样式实验室 — 三个方向' },
      {
        name: 'description',
        content: '三套基于"敬畏 + 曲线即界面 + 因果动效"哲学的完整样式方向。',
      },
    ],
  }),
  component: StyleLabIndex,
});

const directions = [
  {
    to: '/style-lab/planetarium',
    tag: '方向 A',
    name: '天文馆',
    desc: '深空底色，一条发光曲线是唯一主角。骨架完全常规，个性全部压在曲线上。最接近 3Blue1Brown 气质，风险最低、上限最高。',
    mood: '敬畏 · 克制 · 深邃',
    bg: '#050810',
    accent: '#38cfe0',
    preview: 'glow',
  },
  {
    to: '/style-lab/chalkboard',
    tag: '方向 B',
    name: '黑板宇宙',
    desc: '整站是一块无限延伸的黑板，曲线是粉笔笔迹，卡片带轻微手写倾斜与虚线边框。记忆度最高、最有温度，但最考验分寸感。',
    mood: '温度 · 手迹 · 课堂感',
    bg: '#101815',
    accent: '#7dd8c0',
    preview: 'chalk',
  },
  {
    to: '/style-lab/instrument',
    tag: '方向 C',
    name: '精密仪器',
    desc: '石墨黑 + 蓝图网格 + 发丝线曲线与实时坐标读数。Linear 式的冷静高效，等宽字体贯穿。最专业，但敬畏感偏理性。',
    mood: '精密 · 冷静 · 工程感',
    bg: '#0a0a0c',
    accent: '#67e8f9',
    preview: 'hairline',
  },
] as const;

function StyleLabIndex() {
  return (
    <div className="min-h-screen bg-[#08080a] px-6 py-16 font-sans text-[#ececf1] antialiased">
      <div className="mx-auto max-w-5xl">
        <p className="font-mono text-xs tracking-[0.3em] text-[#67e8f9] uppercase">
          Style Lab
        </p>
        <h1 className="mt-4 text-4xl font-semibold tracking-tight text-balance sm:text-5xl">
          三个方向，一套哲学
        </h1>
        <p className="mt-4 max-w-xl text-sm leading-relaxed text-pretty text-[#8a8a95]">
          共同基因：敬畏感、曲线活在界面里、动效只解释因果、深色默认。
          差异在于「个性的表达方式」。每个方向都是完整的首页原型，
          曲线均可用鼠标扰动。点击进入体验后，用底部悬浮条快速切换对比。
        </p>

        <div className="mt-12 grid gap-6 lg:grid-cols-3">
          {directions.map((d) => (
            <Link
              key={d.to}
              to={d.to}
              className="group flex flex-col overflow-hidden rounded-2xl border border-white/10 transition-all hover:-translate-y-1 hover:border-white/25"
              style={{ backgroundColor: d.bg }}
            >
              {/* 迷你预览区 */}
              <div className="relative flex h-40 items-center justify-center overflow-hidden">
                <svg
                  viewBox="0 0 200 100"
                  className="h-full w-full"
                  aria-hidden
                >
                  {d.preview === 'glow' && (
                    <path
                      d="M10,50 C40,10 60,90 100,50 C140,10 160,90 190,50"
                      fill="none"
                      stroke={d.accent}
                      strokeWidth="1.5"
                      style={{ filter: `drop-shadow(0 0 6px ${d.accent})` }}
                    />
                  )}
                  {d.preview === 'chalk' && (
                    <>
                      <path
                        d="M10,50 C40,10 60,90 100,50 C140,10 160,90 190,50"
                        fill="none"
                        stroke="#f2f0e6"
                        strokeWidth="2"
                        strokeDasharray="1 0"
                        opacity="0.5"
                        transform="translate(0.6, 0.8)"
                      />
                      <path
                        d="M10,50 C40,10 60,90 100,50 C140,10 160,90 190,50"
                        fill="none"
                        stroke="#f2f0e6"
                        strokeWidth="1.2"
                        opacity="0.85"
                      />
                      <circle cx="100" cy="50" r="2.5" fill="#e8c477" />
                    </>
                  )}
                  {d.preview === 'hairline' && (
                    <>
                      <path
                        d="M0,25 H200 M0,50 H200 M0,75 H200 M50,0 V100 M100,0 V100 M150,0 V100"
                        stroke={d.accent}
                        strokeWidth="0.3"
                        opacity="0.2"
                      />
                      <path
                        d="M10,50 C40,10 60,90 100,50 C140,10 160,90 190,50"
                        fill="none"
                        stroke={d.accent}
                        strokeWidth="0.8"
                      />
                      <path
                        d="M100,0 V100 M0,50 H200"
                        stroke="#ececf1"
                        strokeWidth="0.4"
                        strokeDasharray="2 3"
                        opacity="0.5"
                      />
                      <circle
                        cx="100"
                        cy="50"
                        r="2"
                        fill="none"
                        stroke="#ececf1"
                        strokeWidth="0.6"
                      />
                    </>
                  )}
                </svg>
              </div>
              <div className="flex flex-1 flex-col border-t border-white/10 p-6">
                <div className="flex items-center justify-between">
                  <span
                    className="font-mono text-[11px]"
                    style={{ color: d.accent }}
                  >
                    {d.tag}
                  </span>
                  <span className="font-mono text-[10px] text-white/40">
                    {d.mood}
                  </span>
                </div>
                <h2 className="mt-2 text-xl font-semibold">{d.name}</h2>
                <p className="mt-3 flex-1 text-xs leading-relaxed text-white/55">
                  {d.desc}
                </p>
                <span
                  className="mt-5 text-xs font-medium transition-transform group-hover:translate-x-1"
                  style={{ color: d.accent }}
                >
                  进入体验 →
                </span>
              </div>
            </Link>
          ))}
        </div>

        <p className="mt-12 text-center font-mono text-[11px] text-white/30">
          本页面为临时对比原型，选定方向后将删除并落地为正式设计系统
        </p>
      </div>
    </div>
  );
}
