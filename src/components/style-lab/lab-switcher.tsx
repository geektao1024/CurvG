import { Link } from '@tanstack/react-router';

const directions = [
  { to: '/style-lab/planetarium', label: 'A · 天文馆' },
  { to: '/style-lab/chalkboard', label: 'B · 黑板宇宙' },
  { to: '/style-lab/instrument', label: 'C · 精密仪器' },
  { to: '/style-lab/warm', label: 'D · 温暖天文馆' },
] as const;

export function LabSwitcher({ current }: { current: string }) {
  return (
    <nav
      aria-label="样式方向切换"
      className="fixed bottom-4 left-1/2 z-50 flex -translate-x-1/2 items-center gap-1 rounded-full border border-white/15 bg-black/70 px-2 py-1.5 backdrop-blur-md"
    >
      <Link
        to="/style-lab"
        className="rounded-full px-3 py-1.5 text-xs text-white/60 transition-colors hover:text-white"
      >
        ← 实验室
      </Link>
      <span className="h-4 w-px bg-white/15" aria-hidden />
      {directions.map((d) => (
        <Link
          key={d.to}
          to={d.to}
          className={
            current === d.to
              ? 'rounded-full bg-white/15 px-3 py-1.5 text-xs font-medium text-white'
              : 'rounded-full px-3 py-1.5 text-xs text-white/60 transition-colors hover:text-white'
          }
        >
          {d.label}
        </Link>
      ))}
    </nav>
  );
}
