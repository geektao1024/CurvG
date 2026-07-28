import { useEffect, useRef, useState, type FocusEvent } from 'react';
import { Pause, Play } from 'lucide-react';

import { cn } from '@/lib/utils';
import { InteractiveSurface } from '@/components/interactive-surface';

const GALLERY_PLAY_EVENT = 'curvg:gallery-play';

type GalleryVideoCardProps = {
  index: number;
  total?: number;
  tag: string;
  title: string;
  description: string;
  scene: string;
  sceneLabel: string;
  src: string;
  poster?: string;
  duration: string;
  ariaLabel: string;
  playLabel: string;
  pauseLabel: string;
  className?: string;
};

export function GalleryVideoCard({
  index,
  total = 6,
  tag,
  title,
  description,
  scene,
  sceneLabel,
  src,
  poster,
  duration,
  ariaLabel,
  playLabel,
  pauseLabel,
  className,
}: GalleryVideoCardProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const pointerFocusRef = useRef(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    const updatePreference = () => {
      setPrefersReducedMotion(mediaQuery.matches);
      if (mediaQuery.matches) videoRef.current?.pause();
    };

    updatePreference();
    mediaQuery.addEventListener('change', updatePreference);
    return () => mediaQuery.removeEventListener('change', updatePreference);
  }, []);

  useEffect(() => {
    const handleAnotherCardPlaying = (event: Event) => {
      if ((event as CustomEvent<string>).detail !== src) {
        videoRef.current?.pause();
      }
    };

    window.addEventListener(GALLERY_PLAY_EVENT, handleAnotherCardPlaying);
    return () =>
      window.removeEventListener(GALLERY_PLAY_EVENT, handleAnotherCardPlaying);
  }, [src]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) video.pause();
      },
      { threshold: 0.08 }
    );

    observer.observe(video);
    return () => observer.disconnect();
  }, []);

  const play = async (userInitiated = false) => {
    const video = videoRef.current;
    if (!video || (prefersReducedMotion && !userInitiated)) return;

    try {
      window.dispatchEvent(
        new CustomEvent(GALLERY_PLAY_EVENT, { detail: src })
      );
      await video.play();
    } catch {
      setIsPlaying(false);
    }
  };

  const pause = () => videoRef.current?.pause();

  const handleBlur = (event: FocusEvent<HTMLElement>) => {
    if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
      pause();
    }
  };

  const togglePlayback = () => {
    const video = videoRef.current;
    if (!video) return;
    if (video.paused) void play(true);
    else video.pause();
  };

  return (
    <InteractiveSurface
      data-gallery-video={index}
      className={cn(
        'border-border bg-card group hover:border-primary/20 flex h-full flex-col overflow-hidden rounded-lg border transition-[border-color,box-shadow,transform] duration-200 hover:-translate-y-0.5 hover:shadow-[0_18px_46px_-40px_rgba(38,46,242,0.48)]',
        className
      )}
      onPointerEnter={(event) => {
        if (event.pointerType === 'mouse' || event.pointerType === 'pen') {
          void play();
        }
      }}
      onPointerLeave={pause}
      onPointerDownCapture={() => {
        pointerFocusRef.current = true;
      }}
      onPointerUpCapture={() => {
        pointerFocusRef.current = false;
      }}
      onPointerCancel={() => {
        pointerFocusRef.current = false;
      }}
      onFocusCapture={() => {
        if (!pointerFocusRef.current) void play();
      }}
      onBlurCapture={handleBlur}
    >
      <div className="border-border border-b">
        <div className="bg-muted/70 text-muted-foreground flex h-9 items-center justify-between px-4 font-mono text-[10px] tracking-[0.12em] uppercase">
          <span className="flex items-center gap-2">
            <span className="bg-primary size-1.5" aria-hidden />
            {tag}
          </span>
          <span className="tabular-nums">{duration}</span>
        </div>

        <div className="bg-foreground relative aspect-video overflow-hidden">
          <video
            ref={videoRef}
            className="absolute inset-0 size-full object-cover"
            src={src}
            poster={poster}
            muted
            loop
            playsInline
            preload="none"
            aria-label={ariaLabel}
            onPlay={() => setIsPlaying(true)}
            onPause={() => setIsPlaying(false)}
          />

          <div
            className="pointer-events-none absolute inset-0 ring-1 ring-white/10 ring-inset"
            aria-hidden
          />
          <span
            className="absolute bottom-4 left-4 size-3 border-b border-l border-white/30"
            aria-hidden
          />
          <button
            type="button"
            aria-label={isPlaying ? pauseLabel : playLabel}
            aria-pressed={isPlaying}
            onClick={togglePlayback}
            className="border-border/40 bg-background/90 text-foreground hover:bg-background focus-visible:ring-primary absolute right-4 bottom-4 grid size-11 place-items-center rounded-full border shadow-sm backdrop-blur-sm transition-colors focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-black focus-visible:outline-none"
          >
            {isPlaying ? (
              <Pause className="size-4" fill="currentColor" aria-hidden />
            ) : (
              <Play className="ml-0.5 size-4" fill="currentColor" aria-hidden />
            )}
          </button>
        </div>
      </div>

      <div className="flex flex-1 flex-col p-6 sm:p-7">
        <div className="flex items-baseline justify-between gap-5">
          <h3 className="text-xl font-semibold tracking-tight">{title}</h3>
          <span className="text-muted-foreground font-mono text-[10px] tabular-nums">
            {String(index).padStart(2, '0')} / {String(total).padStart(2, '0')}
          </span>
        </div>
        <p className="text-muted-foreground mt-2 text-sm leading-6">
          {description}
        </p>
        <div className="border-border bg-muted mt-5 flex items-center gap-3 rounded-lg border px-4 py-3">
          <span className="text-primary font-mono text-[10px] tracking-[0.12em] uppercase">
            {sceneLabel}
          </span>
          <code className="text-foreground/75 min-w-0 overflow-hidden font-mono text-xs text-ellipsis whitespace-nowrap">
            {scene}
          </code>
        </div>
      </div>
    </InteractiveSurface>
  );
}
