/**
 * Bloom for the wonder stage and its exports: bright strokes bleed a soft
 * halo, the way light does on film. The 2D layer is shrunk in halving steps
 * (each step averages, so thin lines survive), blurred while small, and
 * added back with `lighter`. Cheap: the blur only ever touches small images.
 */
export class Bloom {
  private levels: HTMLCanvasElement[] = [];

  private level(i: number, w: number, h: number) {
    let c = this.levels[i];
    if (!c) {
      c = document.createElement('canvas');
      this.levels[i] = c;
    }
    if (c.width !== w || c.height !== h) {
      c.width = w;
      c.height = h;
    }
    return c;
  }

  /**
   * Add the glow of `source` onto `ctx` (same pixel size). `strength` 0–1.
   * Leaves the context's transform and compositing as it found them.
   */
  apply(
    ctx: CanvasRenderingContext2D,
    source: HTMLCanvasElement,
    strength: number
  ) {
    if (strength <= 0.001) return;
    const W = source.width;
    const H = source.height;
    if (W < 16 || H < 16) return;
    // 1/2 → 1/4 → 1/8 → 1/16; the last three are added back.
    let prev: HTMLCanvasElement = source;
    const out: HTMLCanvasElement[] = [];
    for (let i = 0; i < 4; i++) {
      const w = Math.max(1, Math.round(W / 2 ** (i + 1)));
      const h = Math.max(1, Math.round(H / 2 ** (i + 1)));
      const c = this.level(i, w, h);
      const lc = c.getContext('2d');
      if (!lc) return;
      lc.globalCompositeOperation = 'copy';
      lc.imageSmoothingEnabled = true;
      lc.imageSmoothingQuality = 'medium';
      lc.filter = i >= 1 ? 'blur(1.5px)' : 'none';
      lc.drawImage(prev, 0, 0, w, h);
      lc.filter = 'none';
      if (i >= 1) out.push(c);
      prev = c;
    }
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.globalCompositeOperation = 'lighter';
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    const weights = [0.55, 0.5, 0.45];
    out.forEach((c, i) => {
      ctx.globalAlpha = Math.min(1, strength * weights[i]);
      ctx.drawImage(c, 0, 0, W, H);
    });
    ctx.restore();
  }
}
