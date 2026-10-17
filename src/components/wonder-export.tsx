import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  ArrowRight,
  Camera,
  Clapperboard,
  Download,
  Link2,
  Loader2,
  Lock,
  Sparkles,
  X,
} from 'lucide-react';
import { toast } from 'sonner';

import { Link, useRouter } from '@/core/i18n/navigation';
import { ApiError, apiGet, apiPost } from '@/lib/api-client';
import { cn } from '@/lib/utils';
import type { WonderEngine, WonderMode } from '@/lib/wonders/engine';
import {
  canExportVideo,
  downloadBlob,
  EXPORT_FPS,
  EXPORT_SIZE,
  ExportUnsupportedError,
  renderWonderVideo,
  shareCardPng,
  type CardFocus,
  type ExportAspect,
  type ExportKind,
  type ExportQuality,
  type ExportText,
} from '@/lib/wonders/export';
import { shareUrl, type ShareState } from '@/lib/wonders/share';

export type WonderExportLabels = {
  snapshot: string;
  snapshotSaved: string;
  copyLink: string;
  linkCopied: string;
  next: string;
  video: string;
  dialogTitle: string;
  dialogLead: string;
  content: string;
  story: (seconds: number) => string;
  storyNote: string;
  mine: string;
  mineNote: string;
  aspect: string;
  landscape: string;
  portrait: string;
  quality: string;
  free: string;
  freeNote: string;
  hd: string;
  hdNote: string;
  credits: (cost: number) => string;
  balance: (balance: number) => string;
  endCard: string;
  start: string;
  signIn: string;
  rendering: (percent: number) => string;
  renderingNote: string;
  cancel: string;
  downloadFree: string;
  downloadHd: (cost: number) => string;
  upsell: string;
  upgrade: string;
  noCredits: string;
  unsupported: string;
  failed: string;
  again: string;
  close: string;
  endTitle: string;
  endBody: string;
  endPlay: string;
};

/** What the page knows about the wonder that the stage does not. */
export type WonderExportInfo = {
  slug: string;
  /** Page path for return links, e.g. /wonders/lorenz-attractor. */
  path: string;
  text: ExportText;
  labels: WonderExportLabels;
  /** The wonder to suggest when this story ends. */
  next?: { href: string; name: string };
};

export const WonderExportContext = createContext<WonderExportInfo | null>(null);

type ExportStatus = { signedIn: boolean; balance: number; cost: number };

type Phase =
  | { step: 'choose' }
  | { step: 'rendering'; progress: number }
  | { step: 'done'; blob: Blob; url: string; quality: ExportQuality }
  | { step: 'error'; message: string };

/**
 * Snapshot and video export for a wonder stage. Renders the stage's bottom
 * bar through `children(tools)` so the buttons sit beside play/pause, plus
 * the export dialog and the "take it with you" card when a story ends.
 * Without a `WonderExportContext` (e.g. film pages) it renders the bar only.
 */
export function WonderExportTools({
  engine,
  canvases,
  mode,
  ended,
  onDismissEnd,
  shareState,
  children,
}: {
  engine: WonderEngine;
  canvases: () => {
    gl: HTMLCanvasElement | null;
    ui: HTMLCanvasElement | null;
    focus?: CardFocus | null;
  };
  mode: WonderMode;
  ended: boolean;
  onDismissEnd: () => void;
  /** Free-play settings for a share link (null: the plain page). */
  shareState?: () => ShareState | null;
  children: (tools: ReactNode) => ReactNode;
}) {
  const info = useContext(WonderExportContext);
  const [open, setOpen] = useState(false);

  // Back from sign-in (or checkout) with ?export=1: reopen the dialog.
  useEffect(() => {
    if (!info) return;
    const url = new URL(window.location.href);
    if (url.searchParams.get('export') === '1') {
      url.searchParams.delete('export');
      window.history.replaceState(null, '', url.toString());
      setOpen(true);
    }
  }, [info]);

  // The end card waits a moment, then gets out of the way.
  useEffect(() => {
    if (!ended) return;
    const timer = setTimeout(onDismissEnd, 16_000);
    return () => clearTimeout(timer);
  }, [ended, onDismissEnd]);

  if (!info) return <>{children(null)}</>;
  const { labels } = info;

  // A 4:5 card (小红书 / Instagram size): the question, this frame, the URL.
  const snapshot = async () => {
    const { gl, ui, focus } = canvases();
    if (!ui) return;
    try {
      const blob = await shareCardPng({ gl, ui, focus }, info.text);
      downloadBlob(blob, `curvg-${info.slug}.png`);
      toast.success(labels.snapshotSaved);
    } catch {
      toast.error(labels.failed);
    }
  };

  // A link that reopens the stage exactly as it is now.
  const copyLink = async () => {
    const url = shareUrl(shareState?.() ?? null);
    try {
      await navigator.clipboard.writeText(url);
      toast.success(labels.linkCopied);
    } catch {
      window.prompt(labels.copyLink, url);
    }
  };

  const tools = (
    <>
      <span className="wonder-bar-sep" aria-hidden />
      <button
        type="button"
        className="wonder-ghost-btn"
        onClick={copyLink}
        aria-label={labels.copyLink}
        title={labels.copyLink}
      >
        <Link2 />
      </button>
      <button
        type="button"
        className="wonder-ghost-btn"
        onClick={snapshot}
        aria-label={labels.snapshot}
        title={labels.snapshot}
      >
        <Camera />
      </button>
      <button
        type="button"
        className={cn('wonder-export-btn', ended && 'is-calling')}
        onClick={() => {
          onDismissEnd();
          setOpen(true);
        }}
      >
        <Clapperboard />
        <span>{labels.video}</span>
      </button>
    </>
  );

  return (
    <>
      {children(tools)}
      {ended && mode === 'free' && !open ? (
        <div className="wonder-end-card" role="status">
          <button
            type="button"
            className="wonder-end-close"
            onClick={onDismissEnd}
            aria-label={labels.close}
          >
            <X />
          </button>
          <p className="wonder-end-title">
            <Sparkles />
            {labels.endTitle}
          </p>
          <p className="wonder-end-body">{labels.endBody}</p>
          <div className="wonder-end-actions">
            <button
              type="button"
              className="wonder-export-btn"
              onClick={() => {
                onDismissEnd();
                setOpen(true);
              }}
            >
              <Clapperboard />
              <span>{labels.video}</span>
            </button>
            <button
              type="button"
              className="wonder-text-btn"
              onClick={onDismissEnd}
            >
              {labels.endPlay}
            </button>
          </div>
          {info.next ? (
            <Link href={info.next.href} className="wonder-end-next">
              <span>{labels.next}</span>
              <strong>{info.next.name}</strong>
              <ArrowRight />
            </Link>
          ) : null}
        </div>
      ) : null}
      {open ? (
        <ExportDialog
          info={info}
          engine={engine}
          mode={mode}
          onClose={() => setOpen(false)}
        />
      ) : null}
    </>
  );
}

function ExportDialog({
  info,
  engine,
  mode,
  onClose,
}: {
  info: WonderExportInfo;
  engine: WonderEngine;
  mode: WonderMode;
  onClose: () => void;
}) {
  const { labels } = info;
  const router = useRouter();
  const queryClient = useQueryClient();
  const status = useQuery({
    queryKey: ['wonder-export-status'],
    queryFn: () => apiGet<ExportStatus>('/api/wonders/export'),
    staleTime: 10_000,
  });
  const canMine = !!engine.clone && !!engine.freeFilm;
  const [kind, setKind] = useState<ExportKind>(
    canMine && mode === 'free' ? 'free' : 'story'
  );
  const [aspect, setAspect] = useState<ExportAspect>('landscape');
  const [quality, setQuality] = useState<ExportQuality>('preview');
  const [endCard, setEndCard] = useState(false);
  const [phase, setPhase] = useState<Phase>({ step: 'choose' });
  const [paying, setPaying] = useState(false);
  const abort = useRef<AbortController | null>(null);
  const supported = canExportVideo();

  const cost = status.data?.cost ?? 20;
  const balance = status.data?.balance ?? 0;
  const signedIn = status.data?.signedIn ?? false;
  const affordable = balance >= cost;
  const back = `${info.path}?export=1`;
  const signInHref = `/sign-in?callbackUrl=${encodeURIComponent(back)}`;
  const upgradeHref = `/pricing?return=${encodeURIComponent(back)}`;

  const close = useCallback(() => {
    abort.current?.abort();
    onClose();
  }, [onClose]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [close]);

  // Free the preview URL when the dialog goes away or a new run starts.
  useEffect(() => {
    if (phase.step !== 'done') return;
    const url = phase.url;
    return () => URL.revokeObjectURL(url);
  }, [phase]);

  const start = async () => {
    const clone = engine.clone?.();
    if (!clone) return;
    if (kind === 'story') clone.replay?.();
    const controller = new AbortController();
    abort.current = controller;
    setPhase({ step: 'rendering', progress: 0 });
    try {
      const blob = await renderWonderVideo({
        engine: clone,
        kind,
        quality,
        aspect,
        text: info.text,
        endCard,
        signal: controller.signal,
        onProgress: (progress) => setPhase({ step: 'rendering', progress }),
      });
      setPhase({
        step: 'done',
        blob,
        url: URL.createObjectURL(blob),
        quality,
      });
    } catch (error) {
      if ((error as Error)?.name === 'AbortError') {
        setPhase({ step: 'choose' });
        return;
      }
      setPhase({
        step: 'error',
        message:
          error instanceof ExportUnsupportedError
            ? labels.unsupported
            : labels.failed,
      });
    }
  };

  const fileName = (q: ExportQuality) =>
    `curvg-${info.slug}-${kind === 'free' ? 'mine' : 'story'}-${
      aspect === 'portrait' ? '9x16' : '16x9'
    }-${q === 'hd' ? '1080p' : '720p'}.mp4`;

  const save = async () => {
    if (phase.step !== 'done') return;
    if (phase.quality === 'preview') {
      downloadBlob(phase.blob, fileName('preview'));
      return;
    }
    setPaying(true);
    try {
      await apiPost('/api/wonders/export', {
        slug: info.slug,
        kind,
        aspect,
      });
      downloadBlob(phase.blob, fileName('hd'));
      void queryClient.invalidateQueries({
        queryKey: ['wonder-export-status'],
      });
    } catch (error) {
      if (error instanceof ApiError && error.status === 402) {
        toast.error(labels.noCredits);
      } else {
        toast.error(labels.failed);
      }
    } finally {
      setPaying(false);
    }
  };

  const seconds = Math.round(engine.length);
  const sizeLabel = (q: ExportQuality) => {
    const s = EXPORT_SIZE[q][aspect];
    return `${Math.min(s.width, s.height)}p · ${EXPORT_FPS[q]}fps`;
  };

  return (
    <div
      className="wonder-dialog-backdrop"
      onClick={(e) => {
        if (e.target === e.currentTarget && phase.step !== 'rendering') close();
      }}
    >
      <div
        className="wonder-dialog"
        role="dialog"
        aria-modal="true"
        aria-label={labels.dialogTitle}
      >
        <button
          type="button"
          className="wonder-dialog-close"
          onClick={close}
          aria-label={labels.close}
        >
          <X />
        </button>
        <p className="wonder-dialog-title">
          <Clapperboard />
          {labels.dialogTitle}
        </p>
        <p className="wonder-dialog-lead">{labels.dialogLead}</p>

        {phase.step === 'choose' ? (
          <>
            <p className="wonder-panel-label">{labels.content}</p>
            <div className="wonder-options">
              <Option
                active={kind === 'story'}
                onClick={() => setKind('story')}
                title={labels.story(seconds)}
                note={labels.storyNote}
              />
              {canMine ? (
                <Option
                  active={kind === 'free'}
                  onClick={() => setKind('free')}
                  title={labels.mine}
                  note={labels.mineNote}
                />
              ) : null}
            </div>

            <p className="wonder-panel-label">{labels.aspect}</p>
            <div className="wonder-chips">
              {(['landscape', 'portrait'] as const).map((value) => (
                <button
                  key={value}
                  type="button"
                  className="wonder-chip"
                  aria-pressed={aspect === value}
                  onClick={() => setAspect(value)}
                >
                  <span
                    className={cn('wonder-aspect-icon', `is-${value}`)}
                    aria-hidden
                  />
                  {value === 'landscape' ? labels.landscape : labels.portrait}
                </button>
              ))}
            </div>

            <p className="wonder-panel-label">{labels.quality}</p>
            <div className="wonder-options">
              <Option
                active={quality === 'preview'}
                onClick={() => setQuality('preview')}
                title={labels.free}
                badge={sizeLabel('preview')}
                note={labels.freeNote}
              />
              <Option
                active={quality === 'hd'}
                onClick={() => setQuality('hd')}
                title={labels.hd}
                badge={sizeLabel('hd')}
                note={labels.hdNote}
                price={labels.credits(cost)}
              />
            </div>
            {quality === 'hd' ? (
              <label className="wonder-toggle">
                <input
                  type="checkbox"
                  checked={endCard}
                  onChange={(e) => setEndCard(e.currentTarget.checked)}
                />
                <span>{labels.endCard}</span>
              </label>
            ) : null}

            <div className="wonder-dialog-foot">
              {signedIn && quality === 'hd' ? (
                <span className={cn(!affordable && 'is-short')}>
                  {labels.balance(balance)}
                  {!affordable ? (
                    <>
                      {' · '}
                      <button
                        type="button"
                        className="wonder-link-btn"
                        onClick={() => router.push(upgradeHref)}
                      >
                        {labels.upgrade}
                      </button>
                    </>
                  ) : null}
                </span>
              ) : (
                <span />
              )}
              {!supported ? (
                <span className="is-short">{labels.unsupported}</span>
              ) : !signedIn && !status.isLoading ? (
                <button
                  type="button"
                  className="wonder-primary-btn"
                  onClick={() => router.push(signInHref)}
                >
                  <Lock />
                  {labels.signIn}
                </button>
              ) : (
                <button
                  type="button"
                  className="wonder-primary-btn"
                  disabled={status.isLoading}
                  onClick={start}
                >
                  <Clapperboard />
                  {labels.start}
                </button>
              )}
            </div>
          </>
        ) : null}

        {phase.step === 'rendering' ? (
          <div className="wonder-progress">
            <div className="wonder-progress-bar">
              <div style={{ width: `${Math.round(phase.progress * 100)}%` }} />
            </div>
            <p>
              <Loader2 className="animate-spin" />
              {labels.rendering(Math.round(phase.progress * 100))}
            </p>
            <p className="wonder-dialog-note">{labels.renderingNote}</p>
            <button
              type="button"
              className="wonder-text-btn"
              onClick={() => abort.current?.abort()}
            >
              {labels.cancel}
            </button>
          </div>
        ) : null}

        {phase.step === 'done' ? (
          <div className="wonder-done">
            <video
              src={phase.url}
              className={cn('wonder-done-video', `is-${aspect}`)}
              autoPlay
              muted
              loop
              playsInline
              controls
            />
            <div className="wonder-dialog-foot">
              <button
                type="button"
                className="wonder-text-btn"
                onClick={() => setPhase({ step: 'choose' })}
              >
                {labels.again}
              </button>
              {phase.quality === 'hd' && !affordable ? (
                <button
                  type="button"
                  className="wonder-primary-btn"
                  onClick={() => router.push(upgradeHref)}
                >
                  {labels.upgrade}
                </button>
              ) : (
                <button
                  type="button"
                  className="wonder-primary-btn"
                  onClick={save}
                  disabled={paying}
                >
                  {paying ? <Loader2 className="animate-spin" /> : <Download />}
                  {phase.quality === 'hd'
                    ? labels.downloadHd(cost)
                    : labels.downloadFree}
                </button>
              )}
            </div>
            {phase.quality === 'preview' ? (
              <button
                type="button"
                className="wonder-upsell"
                onClick={() => {
                  setQuality('hd');
                  setPhase({ step: 'choose' });
                }}
              >
                <Sparkles />
                <span>{labels.upsell}</span>
                <strong>{labels.credits(cost)}</strong>
              </button>
            ) : null}
          </div>
        ) : null}

        {phase.step === 'error' ? (
          <div className="wonder-progress">
            <p className="is-short">{phase.message}</p>
            <button
              type="button"
              className="wonder-primary-btn"
              onClick={() => setPhase({ step: 'choose' })}
            >
              {labels.again}
            </button>
          </div>
        ) : null}
      </div>
    </div>
  );
}

function Option({
  active,
  onClick,
  title,
  note,
  badge,
  price,
}: {
  active: boolean;
  onClick: () => void;
  title: string;
  note: string;
  badge?: string;
  price?: string;
}) {
  return (
    <button
      type="button"
      className="wonder-option"
      aria-pressed={active}
      onClick={onClick}
    >
      <span className="wonder-option-head">
        <strong>{title}</strong>
        {badge ? <em>{badge}</em> : null}
        {price ? <b>{price}</b> : null}
      </span>
      <span className="wonder-option-note">{note}</span>
    </button>
  );
}
