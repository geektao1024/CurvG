import type { HTMLAttributes, PointerEvent } from 'react';

import { cn } from '@/lib/utils';

export function InteractiveSurface({
  className,
  onPointerMove,
  onPointerLeave,
  ...props
}: HTMLAttributes<HTMLElement>) {
  const handlePointerMove = (event: PointerEvent<HTMLElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    event.currentTarget.style.setProperty(
      '--pointer-x',
      `${event.clientX - rect.left}px`
    );
    event.currentTarget.style.setProperty(
      '--pointer-y',
      `${event.clientY - rect.top}px`
    );
    event.currentTarget.dataset.pointerActive = 'true';
    onPointerMove?.(event);
  };

  const handlePointerLeave = (event: PointerEvent<HTMLElement>) => {
    delete event.currentTarget.dataset.pointerActive;
    onPointerLeave?.(event);
  };

  return (
    <article
      className={cn('curvg-interactive-surface', className)}
      onPointerMove={handlePointerMove}
      onPointerLeave={handlePointerLeave}
      {...props}
    />
  );
}
