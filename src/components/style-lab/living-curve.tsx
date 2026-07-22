'use client';

import { useEffect, useRef } from 'react';

export type CurveRenderStyle = 'glow' | 'chalk' | 'hairline';

interface LivingCurveProps {
  /** 主色（CSS 颜色字符串） */
  color: string;
  /** 次级色，用于第二条曲线或标注 */
  secondaryColor?: string;
  /** 渲染风格：glow=发光 / chalk=粉笔 / hairline=细线仪器 */
  renderStyle: CurveRenderStyle;
  className?: string;
}

type ShapeFn = (t: number, time: number) => [number, number];

const TAU = Math.PI * 2;

/** 形态族：曲线在这些形态之间循环演化 */
const shapes: ShapeFn[] = [
  // Lissajous 3:2
  (t, time) => [Math.sin(3 * t + time * 0.3), Math.sin(2 * t)],
  // 玫瑰线 k=5
  (t) => {
    const r = Math.cos(5 * t);
    return [r * Math.cos(t), r * Math.sin(t)];
  },
  // 蝶形曲线（简化）
  (t) => {
    const e = Math.exp(Math.cos(t)) - 2 * Math.cos(4 * t);
    return [(Math.sin(t) * e) / 3.5, (Math.cos(t) * e) / 3.5 - 0.15];
  },
  // 内摆线
  (t, time) => {
    const R = 1;
    const r = 0.31 + 0.02 * Math.sin(time * 0.2);
    const d = 0.6;
    return [
      ((R - r) * Math.cos(t) + d * Math.cos(((R - r) / r) * t)) / 1.3,
      ((R - r) * Math.sin(t) - d * Math.sin(((R - r) / r) * t)) / 1.3,
    ];
  },
];

function smoothstep(x: number) {
  const c = Math.min(1, Math.max(0, x));
  return c * c * (3 - 2 * c);
}

export function LivingCurve({
  color,
  secondaryColor,
  renderStyle,
  className,
}: LivingCurveProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const mouseRef = useRef({ x: 0.5, y: 0.5, active: false });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const prefersReduced = window.matchMedia(
      '(prefers-reduced-motion: reduce)'
    ).matches;

    let raf = 0;
    let width = 0;
    let height = 0;

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const rect = canvas.getBoundingClientRect();
      width = rect.width;
      height = rect.height;
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);

    const onMove = (e: PointerEvent) => {
      const rect = canvas.getBoundingClientRect();
      mouseRef.current = {
        x: (e.clientX - rect.left) / rect.width,
        y: (e.clientY - rect.top) / rect.height,
        active: true,
      };
    };
    const onLeave = () => {
      mouseRef.current.active = false;
    };
    canvas.addEventListener('pointermove', onMove);
    canvas.addEventListener('pointerleave', onLeave);

    const N = 480;
    const MORPH_PERIOD = 9; // 每个形态停留秒数

    const samplePoint = (i: number, time: number): [number, number] => {
      const t = (i / N) * TAU;
      const cycle = (time / MORPH_PERIOD) % shapes.length;
      const idx = Math.floor(cycle);
      const frac = cycle - idx;
      const blend = smoothstep(Math.min(1, Math.max(0, (frac - 0.7) / 0.3)));
      const a = shapes[idx](t, time);
      const b = shapes[(idx + 1) % shapes.length](t, time);
      let x = a[0] + (b[0] - a[0]) * blend;
      let y = a[1] + (b[1] - a[1]) * blend;

      // 鼠标引力扰动
      const m = mouseRef.current;
      if (m.active) {
        const mx = m.x * 2 - 1;
        const my = -(m.y * 2 - 1);
        const dx = x - mx;
        const dy = y - my;
        const d2 = dx * dx + dy * dy;
        const force = 0.12 / (d2 * 8 + 0.35);
        x += dx * force;
        y += dy * force;
      }
      return [x, y];
    };

    const toScreen = (p: [number, number]): [number, number] => {
      const scale = Math.min(width, height) * 0.36;
      return [width / 2 + p[0] * scale, height / 2 - p[1] * scale];
    };

    const drawPath = (time: number, jitter = 0) => {
      ctx.beginPath();
      for (let i = 0; i <= N; i++) {
        const p = samplePoint(i % N, time);
        const [sx, sy] = toScreen(p);
        const jx = jitter ? (Math.random() - 0.5) * jitter : 0;
        const jy = jitter ? (Math.random() - 0.5) * jitter : 0;
        if (i === 0) ctx.moveTo(sx + jx, sy + jy);
        else ctx.lineTo(sx + jx, sy + jy);
      }
    };

    const render = (now: number) => {
      const time = prefersReduced ? 20 : now / 1000;
      ctx.clearRect(0, 0, width, height);

      if (renderStyle === 'glow') {
        // 外层辉光
        ctx.save();
        ctx.strokeStyle = color;
        ctx.lineWidth = 6;
        ctx.globalAlpha = 0.08;
        ctx.filter = 'blur(12px)';
        drawPath(time);
        ctx.stroke();
        ctx.restore();
        // 中层
        ctx.save();
        ctx.strokeStyle = color;
        ctx.lineWidth = 2.5;
        ctx.globalAlpha = 0.35;
        ctx.filter = 'blur(3px)';
        drawPath(time);
        ctx.stroke();
        ctx.restore();
        // 核心
        ctx.save();
        ctx.strokeStyle = color;
        ctx.lineWidth = 1.6;
        ctx.globalAlpha = 0.95;
        drawPath(time);
        ctx.stroke();
        ctx.restore();
      } else if (renderStyle === 'chalk') {
        // 粉笔：两遍抖动叠加 + 低透明度
        ctx.save();
        ctx.strokeStyle = color;
        ctx.lineWidth = 2.2;
        ctx.globalAlpha = 0.5;
        ctx.lineCap = 'round';
        drawPath(time, 1.6);
        ctx.stroke();
        ctx.restore();
        ctx.save();
        ctx.strokeStyle = color;
        ctx.lineWidth = 1.2;
        ctx.globalAlpha = 0.75;
        drawPath(time, 0.9);
        ctx.stroke();
        ctx.restore();
        if (secondaryColor) {
          // 粉笔标注点
          const p = samplePoint(Math.floor((((time * 30) % N) + N) % N), time);
          const [sx, sy] = toScreen(p);
          ctx.save();
          ctx.fillStyle = secondaryColor;
          ctx.globalAlpha = 0.9;
          ctx.beginPath();
          ctx.arc(sx, sy, 3.5, 0, TAU);
          ctx.fill();
          ctx.restore();
        }
      } else {
        // hairline：极细精密线 + 十字准星读数
        ctx.save();
        ctx.strokeStyle = color;
        ctx.lineWidth = 1;
        ctx.globalAlpha = 0.9;
        drawPath(time);
        ctx.stroke();
        ctx.restore();

        const idx = Math.floor((((time * 40) % N) + N) % N);
        const p = samplePoint(idx, time);
        const [sx, sy] = toScreen(p);
        const cross = secondaryColor ?? color;
        ctx.save();
        ctx.strokeStyle = cross;
        ctx.globalAlpha = 0.55;
        ctx.lineWidth = 1;
        ctx.setLineDash([3, 4]);
        ctx.beginPath();
        ctx.moveTo(0, sy);
        ctx.lineTo(width, sy);
        ctx.moveTo(sx, 0);
        ctx.lineTo(sx, height);
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.beginPath();
        ctx.arc(sx, sy, 3, 0, TAU);
        ctx.stroke();
        // 坐标读数
        ctx.fillStyle = cross;
        ctx.globalAlpha = 0.8;
        ctx.font = '10px ui-monospace, monospace';
        ctx.fillText(
          `(${p[0].toFixed(3)}, ${p[1].toFixed(3)})`,
          sx + 10,
          sy - 8
        );
        ctx.restore();
      }

      if (!prefersReduced) raf = requestAnimationFrame(render);
    };
    raf = requestAnimationFrame(render);

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      canvas.removeEventListener('pointermove', onMove);
      canvas.removeEventListener('pointerleave', onLeave);
    };
  }, [color, secondaryColor, renderStyle]);

  return (
    <canvas
      ref={canvasRef}
      className={className}
      aria-label="实时演化的数学曲线"
      role="img"
    />
  );
}
