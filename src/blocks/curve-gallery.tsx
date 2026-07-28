import { useQuery } from '@tanstack/react-query';
import { Film } from 'lucide-react';

import type { AnimationSummary } from '@/lib/animation';
import { apiGet } from '@/lib/api-client';
import { m } from '@/paraglide/messages.js';
import { GalleryVideoCard } from '@/components/gallery-video-card';

export function CurveGallery() {
  const publishedQuery = useQuery({
    queryKey: ['published-animations'],
    queryFn: () => apiGet<AnimationSummary[]>('/api/gallery/animations'),
    staleTime: 60_000,
    retry: 1,
  });
  const examples = [
    {
      key: 'hello',
      src: '/videos/gallery/hello-world.mp4',
      poster: '/videos/gallery/hello-world-poster.webp',
      duration: '00:03',
      scene: 'Write("Hello World!")',
      title: m['landing.gallery.hello.title'](),
      description: m['landing.gallery.hello.description'](),
      tag: m['landing.gallery.hello.tag'](),
      ariaLabel: m['landing.gallery.hello.aria'](),
    },
    {
      key: 'parabola',
      src: '/videos/gallery/parabola-plot.mp4',
      poster: '/videos/gallery/parabola-plot-poster.webp',
      duration: '00:05',
      scene: 'y = x²',
      title: m['landing.gallery.parabola.title'](),
      description: m['landing.gallery.parabola.description'](),
      tag: m['landing.gallery.parabola.tag'](),
      ariaLabel: m['landing.gallery.parabola.aria'](),
    },
    {
      key: 'numbers',
      src: '/videos/gallery/natural-numbers.mp4',
      poster: '/videos/gallery/natural-numbers-poster.webp',
      duration: '00:05',
      scene: 'ℕ = {1, 2, 3, 4, 5, …}',
      title: m['landing.gallery.numbers.title'](),
      description: m['landing.gallery.numbers.description'](),
      tag: m['landing.gallery.numbers.tag'](),
      ariaLabel: m['landing.gallery.numbers.aria'](),
    },
    {
      key: 'gdp',
      src: '/videos/gallery/gdp-bars.mp4',
      poster: '/videos/gallery/gdp-bars-poster.webp',
      duration: '00:12.4',
      scene: 'GDP per capita (USD)',
      title: m['landing.gallery.gdp.title'](),
      description: m['landing.gallery.gdp.description'](),
      tag: m['landing.gallery.gdp.tag'](),
      ariaLabel: m['landing.gallery.gdp.aria'](),
    },
    {
      key: 'cube',
      src: '/videos/gallery/rotating-cube.mp4',
      poster: '/videos/gallery/rotating-cube-poster.webp',
      duration: '00:07',
      scene: 'Rₓ(α) · Rᵧ(β) · R_z(γ)',
      title: m['landing.gallery.cube.title'](),
      description: m['landing.gallery.cube.description'](),
      tag: m['landing.gallery.cube.tag'](),
      ariaLabel: m['landing.gallery.cube.aria'](),
    },
    {
      key: 'orbit',
      src: '/videos/gallery/solar-system.mp4',
      poster: '/videos/gallery/solar-system-poster.webp',
      duration: '00:19',
      scene: 'θᵢ(t) = ωᵢt + φᵢ',
      title: m['landing.gallery.orbit.title'](),
      description: m['landing.gallery.orbit.description'](),
      tag: m['landing.gallery.orbit.tag'](),
      ariaLabel: m['landing.gallery.orbit.aria'](),
    },
  ] as const;
  const published = (publishedQuery.data || [])
    .filter((item) => item.videoUrl)
    .slice(0, 6)
    .map((item) => ({
      key: `published-${item.id}`,
      src: item.videoUrl!,
      poster: item.thumbnailUrl,
      duration: '--:--',
      scene: item.prompt,
      title: item.title,
      description: item.prompt,
      tag: m['landing.gallery.community.tag'](),
      ariaLabel: item.title,
    }));
  const videos = [...published, ...examples].slice(0, 6);

  return (
    <section id="gallery">
      <div className="curvg-stage curvg-frame curvg-section-field curvg-section-spacing relative">
        <span className="curvg-corner top-5 left-5" aria-hidden />
        <span className="curvg-corner top-5 right-5" aria-hidden />
        <div className="curvg-dotted-divider absolute inset-x-0 top-0" />

        {/* 居中章节徽章 */}
        <div className="flex justify-center">
          <p className="text-muted-foreground flex items-center gap-2.5 font-mono text-sm">
            <span className="text-border select-none" aria-hidden>
              ‹‹
            </span>
            <Film className="text-primary size-4" aria-hidden />
            <span className="text-foreground font-medium">
              {m['landing.gallery.eyebrow']()}
            </span>
            <span className="text-border select-none" aria-hidden>
              ››
            </span>
          </p>
        </div>

        <h2 className="curvg-heading mx-auto mt-5 max-w-2xl text-center text-4xl text-balance sm:text-5xl">
          {m['landing.gallery.title']()}
        </h2>
        <p className="text-muted-foreground mx-auto mt-5 max-w-xl text-center text-base leading-relaxed sm:text-lg">
          {m['landing.gallery.description']()}
        </p>

        <div className="mt-10 grid gap-5 sm:mt-12 md:grid-cols-2">
          {videos.map(({ key, ...video }, index) => (
            <GalleryVideoCard
              key={key}
              index={index + 1}
              total={videos.length}
              {...video}
              sceneLabel={m['landing.gallery.scene_label']()}
              playLabel={m['landing.gallery.play']({ title: video.title })}
              pauseLabel={m['landing.gallery.pause']({ title: video.title })}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
