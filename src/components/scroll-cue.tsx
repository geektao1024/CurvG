'use client';

import { useEffect, useState } from 'react';
import { ChevronDown } from 'lucide-react';

/** 首屏底部的向下滚动提示：用户一旦滚动即淡出 */
export function ScrollCue() {
  const [hidden, setHidden] = useState(false);

  useEffect(() => {
    const onScroll = () => {
      if (window.scrollY > 40) setHidden(true);
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <div
      aria-hidden
      className={`pointer-events-none absolute inset-x-0 bottom-6 flex justify-center transition-opacity duration-500 ${
        hidden ? 'opacity-0' : 'opacity-100'
      }`}
    >
      <div className="text-muted-foreground flex flex-col items-center gap-1.5">
        <span className="font-mono text-[10px] tracking-[0.2em] uppercase opacity-70">
          scroll
        </span>
        <span className="border-border flex size-8 animate-bounce items-center justify-center rounded-full border border-dashed [animation-duration:2s]">
          <ChevronDown className="size-4" />
        </span>
      </div>
    </div>
  );
}
