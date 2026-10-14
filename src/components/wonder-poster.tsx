import { useEffect, useMemo, useRef } from 'react';

import {
  fourierPosterCircles,
  fourierPosterPath,
} from '@/lib/wonders/fourier-scene';
import { lorenzStep, START, type Vec3 } from '@/lib/wonders/lorenz';
import { mandelColor, smoothEscape } from '@/lib/wonders/mandelbrot';
import { GOLDEN_ANGLE, seedAt } from '@/lib/wonders/phyllotaxis';

/**
 * Card posters, drawn from each wonder's own math rather than screenshots:
 * SVG where it can be rendered on the server, a small canvas for the
 * Mandelbrot set (computed once in the browser).
 */
export function WonderPoster({ slug }: { slug: string }) {
  switch (slug) {
    case 'fourier-epicycles':
      return <FourierPoster />;
    case 'mandelbrot-set':
      return <MandelbrotPoster />;
    case 'lorenz-attractor':
      return <LorenzPoster />;
    case 'sunflower-golden-angle':
      return <SunflowerPoster />;
    default:
      return null;
  }
}

function Glow({ id, blur }: { id: string; blur: number }) {
  return (
    <defs>
      <filter id={id} x="-20%" y="-20%" width="140%" height="140%">
        <feGaussianBlur stdDeviation={blur} result="b" />
        <feMerge>
          <feMergeNode in="b" />
          <feMergeNode in="SourceGraphic" />
        </feMerge>
      </filter>
    </defs>
  );
}

function FourierPoster() {
  const { path, circles } = useMemo(
    () => ({
      path: fourierPosterPath(40),
      circles: fourierPosterCircles(7, 0.32),
    }),
    []
  );
  return (
    <svg viewBox="-2.8 -1.75 5.6 3.5">
      <Glow id="glow-fourier" blur={0.05} />
      {circles.map((c, i) => (
        <circle
          key={i}
          cx={c.cx}
          cy={c.cy}
          r={c.r}
          fill="none"
          stroke="rgba(178,160,255,0.35)"
          strokeWidth={0.012}
        />
      ))}
      <path
        d={path}
        fill="none"
        stroke="#6ee7ff"
        strokeWidth={0.03}
        strokeLinejoin="round"
        filter="url(#glow-fourier)"
      />
    </svg>
  );
}

function LorenzPoster() {
  const d = useMemo(() => {
    let p: Vec3 = START;
    const pts: string[] = [];
    for (let i = 0; i < 4000; i++) {
      p = lorenzStep(p, 0.006);
      // Classic view: x across, z up.
      pts.push(`${p[0].toFixed(2)},${(-(p[2] - 25)).toFixed(2)}`);
    }
    return `M${pts.join('L')}`;
  }, []);
  return (
    <svg viewBox="-40 -30 80 50">
      <Glow id="glow-lorenz" blur={0.6} />
      <path
        d={d}
        fill="none"
        stroke="#6ee7ff"
        strokeOpacity={0.75}
        strokeWidth={0.22}
        filter="url(#glow-lorenz)"
      />
    </svg>
  );
}

function SunflowerPoster() {
  const dots = useMemo(
    () =>
      Array.from({ length: 520 }, (_, n) => {
        const p = seedAt(n, GOLDEN_ANGLE);
        return { x: p.x, y: p.y, inner: n < 200 };
      }),
    []
  );
  return (
    <svg viewBox="-36 -22.5 72 45">
      <Glow id="glow-sun" blur={0.5} />
      <g filter="url(#glow-sun)">
        {dots.map((d, i) => (
          <circle
            key={i}
            cx={d.x}
            cy={d.y}
            r={0.42}
            fill={d.inner ? '#ffd678' : '#ffb84d'}
            fillOpacity={d.inner ? 0.95 : 0.75}
          />
        ))}
      </g>
    </svg>
  );
}

function MandelbrotPoster() {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = ref.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;
    const w = 320;
    const h = 200;
    canvas.width = w;
    canvas.height = h;
    const img = ctx.createImageData(w, h);
    // The whole set, a little left of centre.
    const span = 3.0 / w;
    for (let j = 0; j < h; j++) {
      for (let i = 0; i < w; i++) {
        const mu = smoothEscape(
          { re: -0.65 + (i - w / 2) * span, im: (j - h / 2) * span },
          160
        );
        const [r, g, b] = mu < 0 ? [0.012, 0.012, 0.03] : mandelColor(mu);
        const k = (j * w + i) * 4;
        img.data[k] = r * 255;
        img.data[k + 1] = g * 255;
        img.data[k + 2] = b * 255;
        img.data[k + 3] = 255;
      }
    }
    ctx.putImageData(img, 0, 0);
  }, []);
  return <canvas ref={ref} className="h-full w-full" />;
}
