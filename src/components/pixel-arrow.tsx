import { cn } from '@/lib/utils';

export function PixelArrow({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 5 5"
      className={cn('curvg-pixel-arrow', className)}
      aria-hidden="true"
      shapeRendering="crispEdges"
    >
      <rect x="1" y="0" width="1" height="1" fill="currentColor" />
      <rect x="2" y="1" width="1" height="1" fill="currentColor" />
      <rect x="3" y="2" width="1" height="1" fill="currentColor" />
      <rect x="2" y="3" width="1" height="1" fill="currentColor" />
      <rect x="1" y="4" width="1" height="1" fill="currentColor" />
    </svg>
  );
}

export function PixelArrowRail({ className }: { className?: string }) {
  return (
    <span
      className={cn('curvg-pixel-arrow-rail', className)}
      aria-hidden="true"
    >
      <span className="curvg-pixel-arrow-track">
        <PixelArrow />
        <PixelArrow />
      </span>
    </span>
  );
}
