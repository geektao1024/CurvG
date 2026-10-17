import { useEffect, useMemo, useRef } from 'react';

import { GALLERY, step } from '@/lib/wonders/attractors';
import { crosses, needleAt } from '@/lib/wonders/buffon';
import { buildTree, depthColor } from '@/lib/wonders/collatz';
import {
  fourierPosterCircles,
  fourierPosterPath,
} from '@/lib/wonders/fourier-scene';
import { binomial } from '@/lib/wonders/galton';
import { lorenzStep, START, type Vec3 } from '@/lib/wonders/lorenz';
import { mandelColor, smoothEscape } from '@/lib/wonders/mandelbrot';
import { basinOf, POLYS, ROOT_COLORS } from '@/lib/wonders/newton';
import {
  COUNT,
  pendulumAt,
  phaseColor,
  relativePhases,
  view,
} from '@/lib/wonders/pendulum-wave';
import { GOLDEN_ANGLE, seedAt } from '@/lib/wonders/phyllotaxis';
import { armColor, sieve } from '@/lib/wonders/prime-spiral';

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
    case 'pendulum-wave':
      return <PendulumPoster />;
    case 'prime-spirals':
      return <PrimePoster />;
    case 'newton-fractal':
      return <NewtonPoster />;
    case 'galton-board':
      return <GaltonPoster />;
    case 'buffon-needle':
      return <BuffonPoster />;
    case 'collatz-tree':
      return <CollatzPoster />;
    case 'strange-attractors':
      return <AttractorPoster />;
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

function PendulumPoster() {
  const { strings, bobs } = useMemo(() => {
    // The swimming snake, eight seconds after the release.
    const tau = 8.4;
    const cam = { yaw: -0.5, pitch: 0.62 };
    const phases = relativePhases(tau, COUNT);
    const at = (p: readonly [number, number, number]) => {
      const v = view(p, cam);
      return { x: v.x, y: -v.y };
    };
    const rows = Array.from({ length: COUNT }, (_, k) => {
      const { pivot, bob } = pendulumAt(k, COUNT, tau);
      const [r, g, b] = phaseColor(phases[k]);
      return {
        a: at(pivot),
        b: at(bob),
        color: `rgb(${r | 0},${g | 0},${b | 0})`,
      };
    });
    return {
      strings: rows.map((r) => `M${r.a.x},${r.a.y}L${r.b.x},${r.b.y}`).join(''),
      bobs: rows,
    };
  }, []);
  return (
    <svg viewBox="-0.56 -0.3 1.12 0.7">
      <Glow id="glow-pendulum" blur={0.008} />
      <path
        d={strings}
        fill="none"
        stroke="rgba(220,228,255,0.35)"
        strokeWidth={0.0025}
      />
      <g filter="url(#glow-pendulum)">
        {bobs.map((bob, i) => (
          <circle
            key={i}
            cx={bob.b.x}
            cy={bob.b.y}
            r={0.014}
            fill={bob.color}
          />
        ))}
      </g>
    </svg>
  );
}

function PrimePoster() {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = ref.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;
    const w = 640;
    const h = 400;
    canvas.width = w;
    canvas.height = h;
    // The 20 prime arms of the 44 spirals, coloured by remainder.
    const R = 5200;
    const k = ((h / 2) * 0.95) / R;
    const isPrime = sieve();
    for (let n = 2; n <= R * 1.3; n++) {
      if (!isPrime[n]) continue;
      const [r, g, b] = armColor(n % 44, 44);
      ctx.fillStyle = `rgb(${r | 0},${g | 0},${b | 0})`;
      const x = w / 2 + n * k * Math.cos(n);
      const y = h / 2 - n * k * Math.sin(n);
      ctx.beginPath();
      ctx.arc(x, y, 1.3, 0, Math.PI * 2);
      ctx.fill();
    }
  }, []);
  return <canvas ref={ref} className="h-full w-full object-cover" />;
}

function NewtonPoster() {
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
    // The three territories of z³ − 1 around the origin.
    const roots = POLYS.z3.roots;
    const span = 2.6 / w;
    for (let j = 0; j < h; j++) {
      for (let i = 0; i < w; i++) {
        const z = { re: (i - w / 2) * span, im: (h / 2 - j) * span };
        const { root, steps } = basinOf(z, roots, 60);
        const k = (j * w + i) * 4;
        const c = root < 0 ? [3, 3, 8] : ROOT_COLORS[root];
        const light = root < 0 ? 1 : 0.1 + 0.55 * (1 - Math.exp(-0.13 * steps));
        img.data[k] = Math.min(255, c[0] * light);
        img.data[k + 1] = Math.min(255, c[1] * light);
        img.data[k + 2] = Math.min(255, c[2] * light);
        img.data[k + 3] = 255;
      }
    }
    ctx.putImageData(img, 0, 0);
  }, []);
  return <canvas ref={ref} className="h-full w-full object-cover" />;
}

function GaltonPoster() {
  // A 10-row board over its binomial bars.
  const n = 10;
  const pegs = useMemo(() => {
    const out: { x: number; y: number }[] = [];
    for (let r = 0; r < n; r++)
      for (let j = 0; j <= r; j++) out.push({ x: j - r / 2, y: r * 0.87 });
    return out;
  }, []);
  const top = Math.max(
    ...Array.from({ length: n + 1 }, (_, k) => binomial(n, k))
  );
  return (
    <svg viewBox="-9 -1.6 18 17">
      <Glow id="glow-galton" blur={0.18} />
      {pegs.map((p, i) => (
        <circle
          key={i}
          cx={p.x}
          cy={p.y}
          r={0.09}
          fill="rgba(210,220,255,0.6)"
        />
      ))}
      <g filter="url(#glow-galton)">
        {Array.from({ length: n + 1 }, (_, k) => {
          const h = (binomial(n, k) / top) * 6;
          return (
            <rect
              key={k}
              x={k - n / 2 - 0.4}
              y={15 - h}
              width={0.8}
              height={h}
              fill="#ffc46e"
              fillOpacity={0.85}
            />
          );
        })}
      </g>
    </svg>
  );
}

function BuffonPoster() {
  const needles = useMemo(
    () =>
      Array.from({ length: 160 }, (_, i) => {
        const n = needleAt(5, i, 10, 5.4);
        const dx = 0.5 * Math.cos(n.angle);
        const dy = 0.5 * Math.sin(n.angle);
        return { ...n, dx, dy, hit: crosses(n, 1) };
      }),
    []
  );
  return (
    <svg viewBox="-5.6 -3.5 11.2 7">
      <Glow id="glow-buffon" blur={0.05} />
      {[-3, -2, -1, 0, 1, 2, 3].map((k) => (
        <line
          key={k}
          x1={-5.6}
          x2={5.6}
          y1={k}
          y2={k}
          stroke="rgba(200,210,255,0.25)"
          strokeWidth={0.02}
        />
      ))}
      <g filter="url(#glow-buffon)">
        {needles.map((n, i) => (
          <line
            key={i}
            x1={n.x - n.dx}
            y1={-(n.y - n.dy)}
            x2={n.x + n.dx}
            y2={-(n.y + n.dy)}
            stroke={n.hit ? '#ffc46e' : 'rgba(150,170,230,0.55)'}
            strokeWidth={0.045}
            strokeLinecap="round"
          />
        ))}
      </g>
    </svg>
  );
}

function CollatzPoster() {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = ref.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;
    const w = 640;
    const h = 400;
    canvas.width = w;
    canvas.height = h;
    // The coral of 1 … 3000, framed to fit.
    const tree = buildTree(3000, 0.16, 0.29);
    const b = tree.bounds;
    const k = Math.min(w / (b.maxX - b.minX), h / (b.maxY - b.minY)) * 0.9;
    const X = (x: number) => w / 2 + (x - (b.minX + b.maxX) / 2) * k;
    const Y = (y: number) => h / 2 - (y - (b.minY + b.maxY) / 2) * k;
    ctx.lineCap = 'round';
    for (let i = 1; i < tree.nodes.length; i++) {
      const p = tree.parent[i];
      const [r, g, bl] = depthColor(tree.depth[i] / tree.maxDepth);
      ctx.strokeStyle = `rgba(${r | 0},${g | 0},${bl | 0},0.75)`;
      ctx.lineWidth =
        tree.traffic[i] >= 100 ? 2.4 : tree.traffic[i] >= 8 ? 1.4 : 0.8;
      ctx.beginPath();
      ctx.moveTo(X(tree.x[p]), Y(tree.y[p]));
      ctx.lineTo(X(tree.x[i]), Y(tree.y[i]));
      ctx.stroke();
    }
  }, []);
  return <canvas ref={ref} className="h-full w-full object-contain" />;
}

function AttractorPoster() {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = ref.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;
    const w = 640;
    const h = 400;
    canvas.width = w;
    canvas.height = h;
    // Gallery picture 2, 400 000 points, log density.
    const p = GALLERY[1].p;
    const grid = new Uint32Array(w * h);
    const k =
      Math.min(w / (2 * (1 + Math.abs(p[2]))), h / (2 * (1 + Math.abs(p[3])))) *
      0.94;
    let x = 0.1;
    let y = 0.1;
    let max = 1;
    for (let i = 0; i < 400_000; i++) {
      [x, y] = step(p, x, y);
      const px = (w / 2 + x * k) | 0;
      const py = (h / 2 - y * k) | 0;
      if (px < 0 || py < 0 || px >= w || py >= h) continue;
      max = Math.max(max, ++grid[py * w + px]);
    }
    const img = ctx.createImageData(w, h);
    const top = Math.log1p(max * 0.6);
    for (let i = 0; i < grid.length; i++) {
      if (!grid[i]) continue;
      const u = Math.min(1, Math.log1p(grid[i]) / top);
      img.data[i * 4] = 150 + 105 * u;
      img.data[i * 4 + 1] = 70 + 150 * u * u;
      img.data[i * 4 + 2] = 200 - 60 * u;
      img.data[i * 4 + 3] = 255 * Math.min(1, 0.25 + u);
    }
    ctx.putImageData(img, 0, 0);
  }, []);
  return <canvas ref={ref} className="h-full w-full object-contain" />;
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
