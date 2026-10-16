/**
 * The video studio (/creator): pick or describe a topic → adjust the
 * template's parameters against an instant sketch → render → watch,
 * download, export in HD. One page, three states, no chat. The beta
 * free-form generator lives behind /creator?mode=beta.
 *
 * Conversion is part of the flow, not a wall: the plan pill says what the
 * next render costs, the CTA names it, a finished preview offers HD in one
 * click, and running out of free previews turns the CTA into an upgrade
 * that returns here.
 */

import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type FormEvent,
  type ReactNode,
} from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  AlertTriangle,
  ArrowLeft,
  Check,
  ChevronRight,
  Clapperboard,
  Code2,
  Copy,
  Download,
  Film,
  FlaskConical,
  LoaderCircle,
  Monitor,
  PencilLine,
  Play,
  Plus,
  RotateCcw,
  Search,
  Smartphone,
  Sparkles,
  Trash2,
  Wand2,
} from 'lucide-react';
import { toast } from 'sonner';

import { useSession } from '@/core/auth/client';
import { Link, useRouter } from '@/core/i18n/navigation';
import { pricingCatalog } from '@/config/pricing';
import {
  isAnimationBusy,
  type AnimationDetail,
  type AnimationModelCatalog,
  type AnimationSummary,
} from '@/lib/animation';
import { apiDelete, ApiError, apiGet, apiPost } from '@/lib/api-client';
import { cn } from '@/lib/utils';
import {
  buildVideoTemplate,
  getVideoTemplate,
  TemplateParamError,
  VIDEO_TEMPLATES,
  type BuiltVideoTemplate,
} from '@/lib/video-templates';
import type {
  TemplateCategory,
  TemplateFrame,
  TemplateLocale,
  TemplateParam,
  TemplateParamValues,
  TemplatePreview,
  TemplateTheme,
  VideoTemplate,
} from '@/lib/video-templates/types';
import { Button } from '@/components/ui/button';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Textarea } from '@/components/ui/textarea';

import { PreviewCanvas } from './preview-canvas';

export interface VideoStudioCopy {
  eyebrow: string;
  title: string;
  description: string;
  composerLabel: string;
  composerPlaceholder: string;
  matchButton: string;
  matching: string;
  betaLink: string;
  valueProps: [string, string, string];
  galleryTitle: string;
  galleryAll: string;
  categories: Record<TemplateCategory, string>;
  seconds: (value: number) => string;
  useTemplate: string;
  back: string;
  matchedEyebrow: string;
  confidence: Record<'high' | 'medium' | 'low', string>;
  noMatchTitle: string;
  noMatchBody: string;
  betaButton: string;
  betaHint: string;
  alternativesLabel: string;
  templateLabel: string;
  paramsTitle: string;
  frameLabel: string;
  frames: Record<TemplateFrame, string>;
  themeLabel: string;
  themes: Record<TemplateTheme, string>;
  sketchCaption: string;
  sampleButton: string;
  sketchButton: string;
  storyboardTitle: string;
  factsTitle: string;
  duration: (value: number) => string;
  invalidNumber: (min: number, max: number) => string;
  invalidExpression: string;
  ctaFree: (left: number) => string;
  ctaHd: (credits: number) => string;
  ctaSignIn: string;
  ctaUpgrade: string;
  creating: string;
  costFree: string;
  costHd: string;
  costNone: string;
  freeLeft: (left: number, total: number) => string;
  credits: (value: number) => string;
  upgrade: string;
  myVideos: string;
  myVideosDescription: string;
  myVideosEmpty: string;
  steps: [string, string, string, string];
  renderingHint: string;
  deliveryPreview: string;
  deliveryHd: string;
  download: string;
  exportHd: (credits: number) => string;
  failedTitle: string;
  failedBody: string;
  retry: string;
  remake: string;
  newVideo: string;
  upsellTitle: string;
  upsellBody: (starter: string, pro: string) => string;
  upsellCta: string;
  outOfFreeTitle: string;
  outOfFreeBody: string;
  code: string;
  copyCode: string;
  copied: string;
  downloadCode: string;
  deleteVideo: string;
  deleteConfirm: string;
  requestFailed: string;
  loading: string;
  statusLabels: Record<string, string>;
}

type TemplateMatchView = {
  match: {
    templateId: string;
    params: TemplateParamValues;
    confidence: 'high' | 'medium' | 'low';
    reason: string;
  } | null;
  alternatives: string[];
  reason?: string;
};

type Draft = {
  templateId: string;
  values: Record<string, string>;
  frame: TemplateFrame;
  theme: TemplateTheme;
  eyebrow?: string;
  reason?: string;
  prompt?: string;
  alternatives?: string[];
};

const CATEGORY_ORDER: TemplateCategory[] = [
  'functions',
  'calculus',
  'trigonometry',
  'series',
  'curves',
  'linear-algebra',
];
const FREE_PREVIEWS = 3;

const toFormValues = (params: TemplateParamValues) =>
  Object.fromEntries(
    Object.entries(params).map(([key, value]) => [key, String(value)])
  );

function defaults(template: VideoTemplate): TemplateParamValues {
  return Object.fromEntries(
    template.params.map((param) => [param.key, param.default])
  );
}

function perVideoPrice(productId: string, renderCredits: number): string {
  const product = pricingCatalog[productId];
  if (!product || renderCredits <= 0) return '';
  const videos = Math.max(1, Math.floor(product.credits / renderCredits));
  return `$${(product.priceInCents / 100 / videos).toFixed(2)}`;
}

function failureMessage(copy: VideoStudioCopy, error: unknown): string {
  return error instanceof ApiError && error.message
    ? error.message
    : copy.requestFailed;
}

const upgradeHref = (back: string) =>
  `/pricing?return=${encodeURIComponent(back)}`;

/* ─────────────────────────── small pieces ─────────────────────────── */

function Segmented<T extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: T;
  options: Array<{ value: T; label: string; icon?: ReactNode }>;
  onChange: (value: T) => void;
}) {
  return (
    <div className="grid gap-1.5">
      <span className="text-muted-foreground font-mono text-[9px] font-semibold tracking-[0.13em] uppercase">
        {label}
      </span>
      <div className="bg-muted/60 inline-flex w-fit gap-1 rounded-xl border p-1">
        {options.map((option) => (
          <button
            key={option.value}
            type="button"
            aria-pressed={value === option.value}
            onClick={() => onChange(option.value)}
            className={cn(
              'focus-visible:ring-primary/45 inline-flex h-8 items-center gap-1.5 rounded-lg px-2.5 text-xs font-semibold transition-colors focus-visible:ring-2 focus-visible:outline-none',
              value === option.value
                ? 'bg-background text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            )}
          >
            {option.icon}
            {option.label}
          </button>
        ))}
      </div>
    </div>
  );
}

function ParamField({
  param,
  locale,
  value,
  error,
  onChange,
}: {
  param: TemplateParam;
  locale: TemplateLocale;
  value: string;
  error?: string;
  onChange: (value: string) => void;
}) {
  const id = `studio-param-${param.key}`;
  const base =
    'border-input bg-background focus:ring-primary/35 h-10 w-full rounded-lg border px-3 text-sm outline-none focus:ring-2 aria-[invalid=true]:border-destructive';
  return (
    <label
      htmlFor={id}
      className={cn(
        'grid content-start gap-1 text-sm font-medium',
        param.type === 'expression' && 'col-span-2'
      )}
    >
      {param.label[locale]}
      {param.type === 'choice' ? (
        <select
          id={id}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className={base}
        >
          {param.options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label[locale]}
            </option>
          ))}
        </select>
      ) : (
        <input
          id={id}
          type={param.type === 'number' ? 'number' : 'text'}
          inputMode={param.type === 'number' ? 'decimal' : undefined}
          min={param.type === 'number' ? param.min : undefined}
          max={param.type === 'number' ? param.max : undefined}
          step={
            param.type === 'number'
              ? (param.step ?? (param.integer ? 1 : 'any'))
              : undefined
          }
          value={value}
          spellCheck={false}
          autoComplete="off"
          aria-invalid={!!error}
          onChange={(event) => onChange(event.target.value)}
          className={cn(base, param.type === 'expression' && 'font-mono')}
        />
      )}
      {error ? (
        <span className="text-destructive text-xs font-normal">{error}</span>
      ) : param.help ? (
        <span className="text-muted-foreground text-xs font-normal">
          {param.help[locale]}
        </span>
      ) : null}
    </label>
  );
}

function PlanPill({
  copy,
  signedIn,
  catalog,
  balance,
  onOpenVideos,
}: {
  copy: VideoStudioCopy;
  signedIn: boolean;
  catalog?: AnimationModelCatalog;
  balance?: number;
  onOpenVideos: () => void;
}) {
  if (!signedIn) return null;
  const free = catalog?.freePreviews ?? 0;
  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="bg-card inline-flex h-8 items-center gap-2 rounded-full border px-3 text-xs">
        <span
          className={cn(
            'size-1.5 rounded-full',
            free > 0 ? 'bg-emerald-500' : 'bg-amber-500'
          )}
        />
        {copy.freeLeft(free, FREE_PREVIEWS)}
        <span className="text-muted-foreground">·</span>
        {copy.credits(balance ?? 0)}
      </span>
      <Link
        href={upgradeHref('/creator')}
        className="text-primary text-xs font-semibold hover:underline"
      >
        {copy.upgrade}
      </Link>
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="h-8"
        onClick={onOpenVideos}
      >
        <Clapperboard /> {copy.myVideos}
      </Button>
    </div>
  );
}

/* ─────────────────────────── gallery ─────────────────────────── */

function TemplateCard({
  copy,
  template,
  locale,
  onSelect,
}: {
  copy: VideoStudioCopy;
  template: VideoTemplate;
  locale: TemplateLocale;
  onSelect: () => void;
}) {
  const [hover, setHover] = useState(false);
  const [sampleFailed, setSampleFailed] = useState(false);
  const duration = useMemo(() => {
    try {
      return buildVideoTemplate({
        id: template.id,
        context: { locale, frame: '16:9', theme: 'paper' },
      }).durationSeconds;
    } catch {
      return undefined;
    }
  }, [template.id, locale]);
  return (
    <button
      type="button"
      onClick={onSelect}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      onFocus={() => setHover(true)}
      onBlur={() => setHover(false)}
      className="bg-card hover:border-primary/35 focus-visible:ring-primary/45 group flex h-full flex-col overflow-hidden rounded-2xl border text-left transition-[border-color,transform,box-shadow] hover:-translate-y-0.5 hover:shadow-md focus-visible:ring-2 focus-visible:outline-none motion-reduce:transition-none"
    >
      <div className="relative aspect-video overflow-hidden bg-[#f6f4ef]">
        <img
          src={`/video-templates/${template.id}-${locale}.webp`}
          alt=""
          loading="lazy"
          decoding="async"
          className="absolute inset-0 size-full object-cover"
          onError={(event) => {
            (event.target as HTMLImageElement).style.display = 'none';
          }}
        />
        {hover && !sampleFailed && (
          <video
            src={`/media/video-templates/${template.id}-${locale}.mp4`}
            muted
            autoPlay
            loop
            playsInline
            preload="none"
            onError={() => setSampleFailed(true)}
            className="absolute inset-0 size-full object-cover"
          />
        )}
        {duration && (
          <span className="absolute right-2 bottom-2 rounded-md bg-black/60 px-1.5 py-0.5 font-mono text-[10px] text-white">
            {copy.seconds(Math.round(duration))}
          </span>
        )}
      </div>
      <div className="flex flex-1 flex-col p-4">
        <span className="text-primary font-mono text-[9px] font-semibold tracking-[0.14em] uppercase">
          {copy.categories[template.category]}
        </span>
        <h3 className="mt-1.5 leading-snug font-semibold">
          {template.title[locale]}
        </h3>
        <p className="text-muted-foreground mt-1 line-clamp-2 flex-1 text-sm leading-6">
          {template.summary[locale]}
        </p>
        <span className="mt-3 inline-flex items-center gap-1 text-xs font-semibold">
          {copy.useTemplate}
          <ChevronRight className="size-3.5 transition-transform group-hover:translate-x-0.5" />
        </span>
      </div>
    </button>
  );
}

/* ─────────────────────────── render progress ─────────────────────────── */

function renderStep(detail: AnimationDetail): number {
  if (detail.status === 'completed') return 3;
  const stage = detail.parts.render?.stage;
  if (
    !stage ||
    stage === 'queued' ||
    detail.status === 'generating_code' ||
    detail.status === 'code_ready'
  )
    return 0;
  if (stage === 'validating' || stage === 'compiling') return 1;
  return 2;
}

function RenderProgress({
  copy,
  detail,
}: {
  copy: VideoStudioCopy;
  detail: AnimationDetail;
}) {
  const step = renderStep(detail);
  const progress = Math.max(
    4,
    Math.min(100, detail.parts.render?.progress ?? 6)
  );
  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center gap-5 bg-black/55 p-6 text-white backdrop-blur-[2px]">
      <LoaderCircle className="size-8 animate-spin motion-reduce:animate-none" />
      <ol className="flex flex-wrap items-center justify-center gap-2 text-xs">
        {copy.steps.map((label, index) => (
          <li key={label} className="flex items-center gap-2">
            <span
              className={cn(
                'flex size-5 items-center justify-center rounded-full border text-[10px]',
                index < step
                  ? 'border-emerald-400 bg-emerald-400 text-black'
                  : index === step
                    ? 'border-white'
                    : 'border-white/40 text-white/50'
              )}
            >
              {index < step ? <Check className="size-3" /> : index + 1}
            </span>
            <span className={index > step ? 'text-white/50' : ''}>{label}</span>
            {index < copy.steps.length - 1 && (
              <span className="text-white/30">—</span>
            )}
          </li>
        ))}
      </ol>
      <div className="h-1.5 w-full max-w-xs overflow-hidden rounded-full bg-white/20">
        <div
          className="h-full rounded-full bg-white transition-[width] duration-700"
          style={{ width: `${progress}%` }}
        />
      </div>
      <p className="max-w-sm text-center text-xs text-white/80">
        {copy.renderingHint}
      </p>
    </div>
  );
}

/* ─────────────────────────── the studio ─────────────────────────── */

export function VideoStudio({
  copy,
  locale: rawLocale,
  initialAnimationId,
  initialPrompt,
  initialTemplate,
}: {
  copy: VideoStudioCopy;
  locale: string;
  initialAnimationId?: string;
  initialPrompt?: string;
  initialTemplate?: {
    templateId: string;
    params: Record<string, string | number>;
  };
}) {
  const locale: TemplateLocale = rawLocale.startsWith('zh') ? 'zh' : 'en';
  const router = useRouter();
  const queryClient = useQueryClient();
  const { data: session, isPending: sessionPending } = useSession();
  const user = session?.user;
  const [hydrated, setHydrated] = useState(false);
  const [animationId, setAnimationId] = useState(initialAnimationId);
  const [draft, setDraft] = useState<Draft | undefined>(() => {
    const template =
      initialTemplate && getVideoTemplate(initialTemplate.templateId);
    return template
      ? {
          templateId: template.id,
          values: toFormValues({
            ...defaults(template),
            ...initialTemplate.params,
          }),
          frame: '16:9',
          theme: 'paper',
        }
      : undefined;
  });
  const [noMatch, setNoMatch] = useState<{
    prompt: string;
    reason?: string;
    alternatives: string[];
  }>();
  const [prompt, setPrompt] = useState(initialPrompt ?? '');
  const [category, setCategory] = useState<TemplateCategory | 'all'>('all');
  const [videosOpen, setVideosOpen] = useState(false);
  const [showSample, setShowSample] = useState(false);
  const topRef = useRef<HTMLDivElement>(null);

  useEffect(() => setHydrated(true), []);
  // Follow the URL when it changes underneath (history, links from elsewhere).
  useEffect(() => {
    setAnimationId(initialAnimationId);
  }, [initialAnimationId]);

  const signedIn = hydrated && !!user;
  const catalogQuery = useQuery({
    queryKey: ['animation-models', user?.id],
    queryFn: () => apiGet<AnimationModelCatalog>('/api/animations/models'),
    enabled: signedIn,
    staleTime: 30_000,
  });
  const creditsQuery = useQuery({
    queryKey: ['user-credits', 'balance'],
    queryFn: () => apiGet<{ balance: number }>('/api/credits'),
    enabled: signedIn,
    staleTime: 30_000,
  });
  const listQuery = useQuery({
    queryKey: ['animations', user?.id],
    queryFn: () => apiGet<AnimationSummary[]>('/api/animations'),
    enabled: signedIn,
  });
  const detailQuery = useQuery({
    queryKey: ['animation', user?.id, animationId],
    queryFn: () => apiGet<AnimationDetail>(`/api/animations/${animationId}`),
    enabled: signedIn && !!animationId,
    refetchInterval: (query) =>
      isAnimationBusy(query.state.data?.status) ? 3000 : false,
  });
  const detail = detailQuery.data;
  const catalog = catalogQuery.data;
  const balance = creditsQuery.data?.balance;
  const renderCredits = catalog?.renderCredits ?? 20;
  const freeLeft = catalog?.freePreviews ?? 0;
  const canPayHd = renderCredits === 0 || (balance ?? 0) >= renderCredits;

  const refreshAccount = () => {
    queryClient.invalidateQueries({ queryKey: ['animation-models'] });
    queryClient.invalidateQueries({ queryKey: ['user-credits', 'balance'] });
    queryClient.invalidateQueries({ queryKey: ['animations', user?.id] });
  };

  function openAnimation(id?: string) {
    setAnimationId(id);
    setShowSample(false);
    setVideosOpen(false);
    router.replace(
      id ? `/creator?animationId=${encodeURIComponent(id)}` : '/creator'
    );
    topRef.current?.scrollIntoView({ behavior: 'smooth' });
  }

  function chooseTemplate(next: Draft) {
    setDraft(next);
    setNoMatch(undefined);
    setShowSample(false);
    openAnimation(undefined);
  }

  /* — matching — */
  const matchMutation = useMutation({
    mutationFn: (text: string) =>
      apiPost<TemplateMatchView>('/api/video-templates/match', {
        prompt: text,
        locale,
      }),
    onSuccess: (result, text) => {
      const template =
        result.match && getVideoTemplate(result.match.templateId);
      if (result.match && template) {
        chooseTemplate({
          templateId: template.id,
          values: toFormValues({
            ...defaults(template),
            ...result.match.params,
          }),
          frame: '16:9',
          theme: 'paper',
          eyebrow: `${copy.matchedEyebrow} · ${copy.confidence[result.match.confidence]}`,
          reason: result.match.reason,
          prompt: text,
          alternatives: result.alternatives,
        });
      } else {
        setDraft(undefined);
        setNoMatch({
          prompt: text,
          reason: result.reason,
          alternatives: result.alternatives,
        });
      }
    },
    onError: (error) => toast.error(failureMessage(copy, error)),
  });

  // Arriving with a topic (a lab chapter's brief): match it once, signed in.
  const autoMatched = useRef(false);
  useEffect(() => {
    if (
      autoMatched.current ||
      !signedIn ||
      !initialPrompt?.trim() ||
      draft ||
      initialAnimationId
    )
      return;
    autoMatched.current = true;
    matchMutation.mutate(initialPrompt.trim());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [signedIn]);

  function submitPrompt(event?: FormEvent) {
    event?.preventDefault();
    const text = prompt.trim();
    if (!text || matchMutation.isPending) return;
    if (!signedIn) {
      router.push(
        `/sign-in?callbackUrl=${encodeURIComponent(`/creator?prompt=${encodeURIComponent(text)}`)}`
      );
      return;
    }
    matchMutation.mutate(text);
  }

  /* — the draft: validated and built on every change, in the browser — */
  const template = draft ? getVideoTemplate(draft.templateId) : undefined;
  const evaluation = useMemo(() => {
    if (!draft || !template) return undefined;
    const fieldErrors: Record<string, string> = {};
    const params: Record<string, unknown> = {};
    for (const param of template.params) {
      const raw = draft.values[param.key] ?? String(param.default);
      params[param.key] =
        param.type === 'number'
          ? raw.trim() === ''
            ? Number.NaN
            : Number(raw)
          : raw;
    }
    let built: BuiltVideoTemplate | undefined;
    let preview: TemplatePreview | undefined;
    let error: string | undefined;
    try {
      built = buildVideoTemplate({
        id: template.id,
        params,
        context: { locale, frame: draft.frame, theme: draft.theme },
      });
      preview = template.preview(built.params);
    } catch (caught) {
      if (caught instanceof TemplateParamError && caught.key) {
        const param = template.params.find((item) => item.key === caught.key);
        fieldErrors[caught.key] =
          param?.type === 'number'
            ? copy.invalidNumber(param.min, param.max)
            : param?.type === 'expression'
              ? `${copy.invalidExpression} ${caught.message.replace(`${caught.key}: `, '')}`
              : caught.message;
      } else {
        error = caught instanceof Error ? caught.message : String(caught);
      }
    }
    return { built, preview, fieldErrors, error };
  }, [draft, template, locale, copy]);
  // Keep the last good sketch on screen while the user is mid-edit.
  const lastPreview = useRef<TemplatePreview | undefined>(undefined);
  if (evaluation?.preview) lastPreview.current = evaluation.preview;

  /* — rendering — */
  const createMutation = useMutation({
    mutationFn: (input: Draft & { params: TemplateParamValues }) =>
      apiPost<AnimationDetail>('/api/animations', {
        mode: 'template',
        templateId: input.templateId,
        params: input.params,
        frame: input.frame,
        theme: input.theme,
        prompt: input.prompt,
        locale,
      }),
    onSuccess: (next) => {
      queryClient.setQueryData(['animation', user?.id, next.id], next);
      refreshAccount();
      openAnimation(next.id);
    },
    onError: (error) => {
      refreshAccount();
      toast.error(failureMessage(copy, error));
    },
  });
  const renderMutation = useMutation({
    mutationFn: (delivery?: 'hd') =>
      apiPost<AnimationDetail>(
        `/api/animations/${animationId}/approve`,
        delivery ? { delivery } : {}
      ),
    onSuccess: (next) => {
      queryClient.setQueryData(['animation', user?.id, next.id], next);
      refreshAccount();
    },
    onError: (error) => {
      refreshAccount();
      queryClient.invalidateQueries({
        queryKey: ['animation', user?.id, animationId],
      });
      toast.error(failureMessage(copy, error));
    },
  });
  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiDelete(`/api/animations/${id}`),
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: ['animations', user?.id] });
      if (id === animationId) openAnimation(undefined);
    },
    onError: (error) => toast.error(failureMessage(copy, error)),
  });

  function render() {
    if (!draft || !evaluation?.built) return;
    if (!signedIn) {
      router.push(
        `/sign-in?callbackUrl=${encodeURIComponent(`/creator?template=${draft.templateId}&params=${encodeURIComponent(JSON.stringify(evaluation.built.params))}`)}`
      );
      return;
    }
    createMutation.mutate({ ...draft, params: evaluation.built.params });
  }

  // A non-template video opens in the beta workspace (the page block routes
  // it there from the same query); show nothing in between.
  if (animationId && detail && !detail.parts.template) return null;

  const backTo = animationId
    ? `/creator?animationId=${animationId}`
    : '/creator';
  const header = (
    <div
      ref={topRef}
      className="flex flex-wrap items-center justify-between gap-3"
    >
      <div className="text-muted-foreground flex items-center gap-2 font-mono text-[10px] tracking-[0.14em] uppercase">
        <Sparkles className="text-primary size-3.5" />
        {copy.eyebrow}
      </div>
      <PlanPill
        copy={copy}
        signedIn={signedIn}
        catalog={catalog}
        balance={balance}
        onOpenVideos={() => setVideosOpen(true)}
      />
    </div>
  );

  /* ─── state 3: a video ─── */
  const resultView = (() => {
    if (!animationId) return null;
    if (!detail) {
      return (
        <div className="text-muted-foreground flex min-h-[50vh] items-center justify-center gap-2 text-sm">
          <LoaderCircle className="size-4 animate-spin" /> {copy.loading}
        </div>
      );
    }
    const state = detail.parts.template!;
    const stateTemplate = getVideoTemplate(state.id);
    let resultPreview: TemplatePreview | undefined;
    try {
      resultPreview = stateTemplate?.preview(state.params);
    } catch {
      resultPreview = undefined;
    }
    const busy = isAnimationBusy(detail.status) || renderMutation.isPending;
    const delivery = detail.parts.render?.delivery;
    const completed = detail.status === 'completed' && !!detail.parts.videoUrl;
    const failed = detail.status === 'failed' || detail.status === 'canceled';
    const idle = detail.status === 'code_ready';
    const starter = perVideoPrice('starter_monthly', renderCredits);
    const pro = perVideoPrice('pro_monthly', renderCredits);
    return (
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
        <div className="min-w-0 space-y-4">
          {completed ? (
            <div
              className={cn(
                'overflow-hidden rounded-xl border bg-black shadow-sm',
                state.frame === '9:16'
                  ? 'mx-auto aspect-[9/16] max-h-[78vh]'
                  : 'aspect-video'
              )}
            >
              <video
                key={detail.parts.videoUrl}
                src={detail.parts.videoUrl}
                poster={detail.parts.thumbnailUrl}
                controls
                autoPlay
                playsInline
                className="size-full"
              />
            </div>
          ) : (
            <PreviewCanvas
              preview={resultPreview}
              frame={state.frame}
              theme={state.theme}
              className={state.frame === '9:16' ? 'mx-auto max-h-[78vh]' : ''}
            >
              {busy ? (
                <RenderProgress copy={copy} detail={detail} />
              ) : failed || idle ? (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-black/60 p-6 text-center text-white">
                  {failed && (
                    <AlertTriangle className="size-7 text-amber-300" />
                  )}
                  {failed && (
                    <p className="font-semibold">{copy.failedTitle}</p>
                  )}
                  {failed && (
                    <p className="max-w-sm text-xs text-white/80">
                      {copy.failedBody}
                    </p>
                  )}
                  {!canPayHd && freeLeft <= 0 ? (
                    <Link
                      href={upgradeHref(backTo)}
                      className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-white px-3 text-sm font-semibold text-black"
                    >
                      <Sparkles className="size-4" /> {copy.ctaUpgrade}
                    </Link>
                  ) : (
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      disabled={renderMutation.isPending}
                      onClick={() => renderMutation.mutate(undefined)}
                    >
                      {failed ? <RotateCcw /> : <Play />}{' '}
                      {failed
                        ? copy.retry
                        : canPayHd
                          ? copy.ctaHd(renderCredits)
                          : copy.ctaFree(freeLeft)}
                    </Button>
                  )}
                </div>
              ) : null}
            </PreviewCanvas>
          )}

          {completed && (
            <div className="flex flex-wrap items-center gap-2">
              <span
                className={cn(
                  'rounded-full border px-2.5 py-1 text-[11px] font-semibold',
                  delivery === 'preview'
                    ? 'border-amber-500/40 bg-amber-500/10 text-amber-800 dark:text-amber-300'
                    : 'border-emerald-600/30 bg-emerald-600/10 text-emerald-800 dark:text-emerald-300'
                )}
              >
                {delivery === 'preview'
                  ? copy.deliveryPreview
                  : copy.deliveryHd}
              </span>
              <a
                href={`${detail.parts.videoUrl}${detail.parts.videoUrl?.includes('?') ? '&' : '?'}download=1`}
                className="border-input bg-background hover:bg-muted inline-flex h-9 items-center gap-1.5 rounded-lg border px-3 text-sm font-medium"
              >
                <Download className="size-4" /> {copy.download}
              </a>
              {delivery === 'preview' &&
                (canPayHd ? (
                  <Button
                    type="button"
                    size="sm"
                    className="h-9"
                    disabled={renderMutation.isPending}
                    onClick={() => renderMutation.mutate('hd')}
                  >
                    {renderMutation.isPending ? (
                      <LoaderCircle className="animate-spin" />
                    ) : (
                      <Film />
                    )}{' '}
                    {copy.exportHd(renderCredits)}
                  </Button>
                ) : (
                  <Link
                    href={upgradeHref(backTo)}
                    className="bg-primary text-primary-foreground inline-flex h-9 items-center gap-1.5 rounded-lg px-3 text-sm font-semibold"
                  >
                    <Sparkles className="size-4" /> {copy.upsellCta}
                  </Link>
                ))}
            </div>
          )}

          {completed && delivery === 'preview' && (
            <div className="rounded-xl border border-amber-500/30 bg-gradient-to-br from-amber-500/[0.09] to-transparent p-4">
              <p className="font-semibold">{copy.upsellTitle}</p>
              <p className="text-muted-foreground mt-1 text-sm leading-6">
                {copy.upsellBody(starter, pro)}
              </p>
              <Link
                href={upgradeHref(backTo)}
                className="text-primary mt-2 inline-flex items-center gap-1 text-sm font-semibold hover:underline"
              >
                {copy.upsellCta} <ChevronRight className="size-4" />
              </Link>
            </div>
          )}

          {detail.parts.code && (
            <details className="bg-card group rounded-xl border">
              <summary className="text-muted-foreground flex cursor-pointer list-none items-center gap-2 px-4 py-3 text-sm font-medium">
                <Code2 className="size-4" /> {copy.code}
                <ChevronRight className="ml-auto size-4 transition-transform group-open:rotate-90" />
              </summary>
              <div className="border-t p-3">
                <div className="mb-2 flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      void navigator.clipboard
                        .writeText(detail.parts.code || '')
                        .then(() => toast.success(copy.copied));
                    }}
                  >
                    <Copy /> {copy.copyCode}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      const blob = new Blob([detail.parts.code || ''], {
                        type: 'text/x-python',
                      });
                      const link = document.createElement('a');
                      link.href = URL.createObjectURL(blob);
                      link.download = `curvg-${state.id}.py`;
                      link.click();
                      URL.revokeObjectURL(link.href);
                    }}
                  >
                    <Download /> {copy.downloadCode}
                  </Button>
                </div>
                <pre className="bg-muted/50 max-h-80 overflow-auto rounded-lg p-3 font-mono text-xs leading-5">
                  {detail.parts.code}
                </pre>
              </div>
            </details>
          )}
        </div>

        <aside className="space-y-4">
          <div className="bg-card rounded-xl border p-4">
            <p className="text-primary font-mono text-[9px] font-semibold tracking-[0.14em] uppercase">
              {copy.templateLabel}
            </p>
            <h1 className="curvg-heading mt-1 text-xl">
              {stateTemplate?.title[locale] ?? state.title}
            </h1>
            <p className="text-muted-foreground mt-1 text-xs">
              {copy.statusLabels[detail.status] ?? detail.status} ·{' '}
              {copy.duration(Math.round(state.durationSeconds))}
            </p>
            {state.facts.length > 0 && (
              <dl className="mt-4 grid grid-cols-[auto_1fr] gap-x-3 gap-y-1.5 border-t pt-3 text-sm">
                {state.facts.map((fact) => (
                  <div key={fact.label} className="contents">
                    <dt className="text-muted-foreground">{fact.label}</dt>
                    <dd className="font-mono break-words">{fact.value}</dd>
                  </div>
                ))}
              </dl>
            )}
            {stateTemplate && (
              <dl className="mt-3 grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 border-t pt-3 text-xs">
                {stateTemplate.params.map((param) => (
                  <div key={param.key} className="contents">
                    <dt className="text-muted-foreground">
                      {param.label[locale]}
                    </dt>
                    <dd className="font-mono break-words">
                      {String(state.params[param.key])}
                    </dd>
                  </div>
                ))}
              </dl>
            )}
            <div className="mt-4 flex flex-wrap gap-2">
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() =>
                  chooseTemplate({
                    templateId: state.id,
                    values: toFormValues(state.params),
                    frame: state.frame,
                    theme: state.theme,
                    eyebrow: copy.templateLabel,
                  })
                }
              >
                <PencilLine /> {copy.remake}
              </Button>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                onClick={() => {
                  setDraft(undefined);
                  openAnimation(undefined);
                }}
              >
                <Plus /> {copy.newVideo}
              </Button>
            </div>
          </div>
          {state.beats.length > 0 && (
            <div className="bg-card rounded-xl border p-4">
              <p className="text-muted-foreground mb-2 font-mono text-[9px] font-semibold tracking-[0.13em] uppercase">
                {copy.storyboardTitle}
              </p>
              <ol className="space-y-1.5 text-sm">
                {state.beats.map((beat, index) => (
                  <li key={beat} className="flex gap-2">
                    <span className="text-muted-foreground font-mono text-xs">
                      {String(index + 1).padStart(2, '0')}
                    </span>
                    {beat}
                  </li>
                ))}
              </ol>
            </div>
          )}
        </aside>
      </div>
    );
  })();

  /* ─── state 2: editing a template ─── */
  const editorView = (() => {
    if (!draft || !template || !evaluation) return null;
    const built = evaluation.built;
    const preview = evaluation.preview ?? lastPreview.current;
    const invalid = !built;
    const free = signedIn && !canPayHd && freeLeft > 0;
    const blocked = signedIn && !canPayHd && freeLeft <= 0 && !!catalog;
    const ctaLabel = !signedIn
      ? copy.ctaSignIn
      : canPayHd
        ? copy.ctaHd(renderCredits)
        : copy.ctaFree(freeLeft);
    const set = (patch: Partial<Draft>) => setDraft({ ...draft, ...patch });
    return (
      <div className="grid gap-6 lg:grid-cols-[380px_minmax(0,1fr)] lg:grid-rows-[auto_1fr]">
        <div className="order-2 space-y-4 lg:col-start-1 lg:row-span-2 lg:row-start-1">
          <div className="bg-card rounded-xl border p-4">
            <button
              type="button"
              onClick={() => setDraft(undefined)}
              className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1 text-xs"
            >
              <ArrowLeft className="size-3.5" /> {copy.back}
            </button>
            <p className="text-primary mt-3 font-mono text-[9px] font-semibold tracking-[0.14em] uppercase">
              {draft.eyebrow ?? copy.templateLabel}
            </p>
            <h1 className="curvg-heading mt-1 text-xl leading-tight">
              {template.title[locale]}
            </h1>
            <p className="text-muted-foreground mt-1.5 text-sm leading-6">
              {draft.reason || template.summary[locale]}
            </p>
            {draft.alternatives &&
              draft.alternatives.filter((id) => getVideoTemplate(id)).length >
                0 && (
                <div className="mt-3 flex flex-wrap items-center gap-1.5">
                  <span className="text-muted-foreground text-xs">
                    {copy.alternativesLabel}
                  </span>
                  {draft.alternatives
                    .map((id) => getVideoTemplate(id))
                    .filter((item): item is VideoTemplate => !!item)
                    .map((item) => (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() =>
                          chooseTemplate({
                            templateId: item.id,
                            values: toFormValues(defaults(item)),
                            frame: draft.frame,
                            theme: draft.theme,
                            prompt: draft.prompt,
                          })
                        }
                        className="hover:border-primary/40 rounded-full border px-2.5 py-0.5 text-xs"
                      >
                        {item.title[locale]}
                      </button>
                    ))}
                </div>
              )}
          </div>

          <div className="bg-card space-y-4 rounded-xl border p-4">
            <p className="text-muted-foreground font-mono text-[9px] font-semibold tracking-[0.13em] uppercase">
              {copy.paramsTitle}
            </p>
            <div className="grid grid-cols-2 gap-3">
              {template.params.map((param) => (
                <ParamField
                  key={param.key}
                  param={param}
                  locale={locale}
                  value={draft.values[param.key] ?? String(param.default)}
                  error={evaluation.fieldErrors[param.key]}
                  onChange={(value) =>
                    set({ values: { ...draft.values, [param.key]: value } })
                  }
                />
              ))}
            </div>
            {evaluation.error && (
              <p className="text-destructive text-xs">{evaluation.error}</p>
            )}
            <div className="flex flex-wrap gap-4 border-t pt-4">
              <Segmented
                label={copy.frameLabel}
                value={draft.frame}
                onChange={(frame) => set({ frame })}
                options={[
                  {
                    value: '16:9',
                    label: copy.frames['16:9'],
                    icon: <Monitor className="size-3.5" />,
                  },
                  {
                    value: '9:16',
                    label: copy.frames['9:16'],
                    icon: <Smartphone className="size-3.5" />,
                  },
                ]}
              />
              <Segmented
                label={copy.themeLabel}
                value={draft.theme}
                onChange={(theme) => set({ theme })}
                options={[
                  { value: 'paper', label: copy.themes.paper },
                  { value: 'studio', label: copy.themes.studio },
                ]}
              />
            </div>
          </div>

          <div className="bg-card sticky bottom-3 z-10 rounded-xl border p-4 shadow-lg lg:static lg:shadow-sm">
            {blocked ? (
              <div className="space-y-2">
                <p className="text-sm font-semibold">{copy.outOfFreeTitle}</p>
                <p className="text-muted-foreground text-xs leading-5">
                  {copy.outOfFreeBody}
                </p>
                <Link
                  href={upgradeHref(`/creator?template=${draft.templateId}`)}
                  className="bg-primary text-primary-foreground inline-flex h-11 w-full items-center justify-center gap-2 rounded-lg text-sm font-semibold"
                >
                  <Sparkles className="size-4" /> {copy.ctaUpgrade}
                </Link>
              </div>
            ) : (
              <>
                <Button
                  type="button"
                  className="bg-foreground text-background hover:bg-primary h-11 w-full text-sm"
                  disabled={
                    invalid ||
                    createMutation.isPending ||
                    (signedIn && catalogQuery.isLoading)
                  }
                  onClick={render}
                >
                  {createMutation.isPending ? (
                    <LoaderCircle className="animate-spin" />
                  ) : (
                    <Play />
                  )}
                  {createMutation.isPending ? copy.creating : ctaLabel}
                </Button>
                <p className="text-muted-foreground mt-2 text-center text-xs">
                  {!signedIn
                    ? copy.costFree
                    : canPayHd
                      ? copy.costHd
                      : free
                        ? copy.costFree
                        : copy.costNone}
                  {built &&
                    ` · ${copy.duration(Math.round(built.durationSeconds))}`}
                </p>
              </>
            )}
          </div>
        </div>

        <div className="order-1 min-w-0 lg:col-start-2 lg:row-start-1">
          <div
            className={cn(
              draft.frame === '9:16' && 'mx-auto max-w-[min(100%,420px)]'
            )}
          >
            {showSample ? (
              <div className="aspect-video overflow-hidden rounded-xl border bg-black shadow-sm">
                <video
                  src={`/media/video-templates/${template.id}-${locale}.mp4`}
                  controls
                  autoPlay
                  playsInline
                  className="size-full"
                />
              </div>
            ) : (
              <PreviewCanvas
                preview={preview}
                frame={draft.frame}
                theme={draft.theme}
                label={template.title[locale]}
                className={cn(invalid && 'opacity-60')}
              />
            )}
            <div className="mt-2 flex items-center justify-between gap-2">
              <p className="text-muted-foreground text-xs">
                {copy.sketchCaption}
              </p>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setShowSample((value) => !value)}
              >
                {showSample ? <PencilLine /> : <Film />}{' '}
                {showSample ? copy.sketchButton : copy.sampleButton}
              </Button>
            </div>
          </div>
        </div>
        <div className="order-3 min-w-0 lg:col-start-2 lg:row-start-2">
          {built && (
            <div className="grid gap-4 md:grid-cols-2">
              <div className="bg-card rounded-xl border p-4">
                <p className="text-muted-foreground mb-2 font-mono text-[9px] font-semibold tracking-[0.13em] uppercase">
                  {copy.storyboardTitle}
                </p>
                <ol className="space-y-1.5 text-sm">
                  {built.beats.map((beat, index) => (
                    <li key={beat} className="flex gap-2">
                      <span className="text-muted-foreground font-mono text-xs">
                        {String(index + 1).padStart(2, '0')}
                      </span>
                      {beat}
                    </li>
                  ))}
                </ol>
              </div>
              <div className="bg-card rounded-xl border p-4">
                <p className="text-muted-foreground mb-2 font-mono text-[9px] font-semibold tracking-[0.13em] uppercase">
                  {copy.factsTitle}
                </p>
                <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1.5 text-sm">
                  {built.facts.map((fact) => (
                    <div key={fact.label} className="contents">
                      <dt className="text-muted-foreground">{fact.label}</dt>
                      <dd className="font-mono break-words">{fact.value}</dd>
                    </div>
                  ))}
                </dl>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  })();

  /* ─── state 1: choose ─── */
  const visible = VIDEO_TEMPLATES.filter(
    (item) => category === 'all' || item.category === category
  );
  const examples = VIDEO_TEMPLATES.map(
    (item) =>
      item.examples.find(
        (example) => /[一-鿿]/.test(example.prompt) === (locale === 'zh')
      )?.prompt
  ).filter((item): item is string => !!item);
  const chooseView = (
    <div className="space-y-12">
      <section className="mx-auto max-w-3xl text-center">
        <h1 className="curvg-heading text-[2.1rem] leading-[1.08] sm:text-5xl">
          {copy.title}
        </h1>
        <p className="text-muted-foreground mx-auto mt-4 max-w-2xl text-sm leading-6 sm:text-base">
          {copy.description}
        </p>
        <form
          onSubmit={submitPrompt}
          className="bg-card mt-7 rounded-2xl border p-3 text-left shadow-[0_24px_70px_-50px_color-mix(in_oklab,var(--foreground)_45%,transparent)] sm:p-4"
        >
          <label
            htmlFor="studio-prompt"
            className="text-muted-foreground px-1 font-mono text-[9px] font-semibold tracking-[0.13em] uppercase"
          >
            {copy.composerLabel}
          </label>
          <Textarea
            id="studio-prompt"
            value={prompt}
            onChange={(event) => setPrompt(event.target.value.slice(0, 2000))}
            onKeyDown={(event) => {
              if (
                event.key === 'Enter' &&
                !event.shiftKey &&
                !event.nativeEvent.isComposing
              ) {
                event.preventDefault();
                submitPrompt();
              }
            }}
            placeholder={copy.composerPlaceholder}
            className="mt-1 min-h-20 resize-none border-0 bg-transparent px-1 text-base shadow-none focus-visible:ring-0"
            disabled={matchMutation.isPending}
          />
          <div className="flex flex-wrap items-center gap-2">
            {examples.slice(0, 3).map((example) => (
              <button
                key={example}
                type="button"
                onClick={() => setPrompt(example)}
                className="text-muted-foreground hover:text-foreground hover:border-primary/30 max-w-full truncate rounded-full border px-3 py-1 text-xs"
              >
                {example}
              </button>
            ))}
            <Button
              type="submit"
              className="bg-foreground text-background hover:bg-primary ml-auto h-10"
              disabled={matchMutation.isPending || !prompt.trim()}
            >
              {matchMutation.isPending ? (
                <LoaderCircle className="animate-spin" />
              ) : (
                <Wand2 />
              )}
              {matchMutation.isPending ? copy.matching : copy.matchButton}
            </Button>
          </div>
        </form>
        {noMatch && (
          <div
            role="status"
            className="bg-card mt-4 rounded-2xl border p-4 text-left"
          >
            <div className="flex items-start gap-3">
              <span className="bg-muted text-muted-foreground flex size-8 shrink-0 items-center justify-center rounded-full">
                <Search className="size-4" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="font-semibold">{copy.noMatchTitle}</p>
                <p className="text-muted-foreground mt-1 text-sm leading-6">
                  {noMatch.reason || copy.noMatchBody}
                </p>
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  {noMatch.alternatives
                    .map((id) => getVideoTemplate(id))
                    .filter((item): item is VideoTemplate => !!item)
                    .map((item) => (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() =>
                          chooseTemplate({
                            templateId: item.id,
                            values: toFormValues(defaults(item)),
                            frame: '16:9',
                            theme: 'paper',
                            prompt: noMatch.prompt,
                          })
                        }
                        className="hover:border-primary/40 rounded-full border px-3 py-1 text-xs"
                      >
                        {item.title[locale]}
                      </button>
                    ))}
                  <Link
                    href={`/creator?mode=beta&prompt=${encodeURIComponent(noMatch.prompt)}`}
                    className="text-primary inline-flex items-center gap-1 text-xs font-semibold hover:underline"
                  >
                    <FlaskConical className="size-3.5" /> {copy.betaButton}
                  </Link>
                </div>
                <p className="text-muted-foreground mt-2 text-xs">
                  {copy.betaHint}
                </p>
              </div>
            </div>
          </div>
        )}
        <ul className="text-muted-foreground mt-6 flex flex-wrap justify-center gap-x-6 gap-y-2 text-xs">
          {copy.valueProps.map((item) => (
            <li key={item} className="flex items-center gap-1.5">
              <Check className="text-primary size-3.5" /> {item}
            </li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="studio-gallery">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <h2 id="studio-gallery" className="curvg-heading text-2xl">
            {copy.galleryTitle}
          </h2>
          <div className="flex flex-wrap gap-1.5">
            {(['all', ...CATEGORY_ORDER] as const).map((value) => (
              <button
                key={value}
                type="button"
                aria-pressed={category === value}
                onClick={() => setCategory(value)}
                className={cn(
                  'h-8 rounded-full border px-3 text-xs transition-colors',
                  category === value
                    ? 'border-foreground bg-foreground text-background'
                    : 'text-muted-foreground hover:text-foreground'
                )}
              >
                {value === 'all' ? copy.galleryAll : copy.categories[value]}
              </button>
            ))}
          </div>
        </div>
        <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {visible.map((item) => (
            <TemplateCard
              key={item.id}
              copy={copy}
              template={item}
              locale={locale}
              onSelect={() =>
                chooseTemplate({
                  templateId: item.id,
                  values: toFormValues(defaults(item)),
                  frame: '16:9',
                  theme: 'paper',
                })
              }
            />
          ))}
        </div>
        <p className="mt-6 text-center text-sm">
          <Link
            href="/creator?mode=beta"
            className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1.5"
          >
            <FlaskConical className="size-4" /> {copy.betaLink}
          </Link>
        </p>
      </section>
    </div>
  );

  const videos = listQuery.data ?? [];
  return (
    <div className="mx-auto w-full max-w-7xl space-y-6 px-4 py-6 sm:px-6 sm:py-8">
      {header}
      {sessionPending && animationId ? (
        <div className="text-muted-foreground flex min-h-[40vh] items-center justify-center gap-2 text-sm">
          <LoaderCircle className="size-4 animate-spin" /> {copy.loading}
        </div>
      ) : animationId ? (
        resultView
      ) : draft ? (
        editorView
      ) : (
        chooseView
      )}

      <Sheet open={videosOpen} onOpenChange={setVideosOpen}>
        <SheetContent
          side="right"
          className="w-full overflow-y-auto sm:max-w-md"
        >
          <SheetHeader>
            <SheetTitle>{copy.myVideos}</SheetTitle>
            <SheetDescription>{copy.myVideosDescription}</SheetDescription>
          </SheetHeader>
          <div className="grid gap-3 px-4 pb-6">
            {videos.length === 0 && (
              <p className="text-muted-foreground text-sm">
                {copy.myVideosEmpty}
              </p>
            )}
            {videos.map((video) => (
              <div
                key={video.id}
                className={cn(
                  'group flex gap-3 rounded-xl border p-2',
                  video.id === animationId &&
                    'border-primary/40 bg-primary/[0.04]'
                )}
              >
                <button
                  type="button"
                  onClick={() => openAnimation(video.id)}
                  className="flex min-w-0 flex-1 gap-3 text-left"
                >
                  <span className="bg-muted relative aspect-video w-28 shrink-0 overflow-hidden rounded-lg">
                    {video.thumbnailUrl ? (
                      <img
                        src={video.thumbnailUrl}
                        alt=""
                        className="size-full object-cover"
                      />
                    ) : (
                      <Film className="text-muted-foreground absolute inset-0 m-auto size-5" />
                    )}
                  </span>
                  <span className="min-w-0">
                    <span className="line-clamp-2 text-sm font-medium">
                      {video.title}
                    </span>
                    <span className="text-muted-foreground mt-1 block text-xs">
                      {copy.statusLabels[video.status] ?? video.status}
                    </span>
                  </span>
                </button>
                <button
                  type="button"
                  aria-label={copy.deleteVideo}
                  onClick={() => {
                    if (window.confirm(copy.deleteConfirm))
                      deleteMutation.mutate(video.id);
                  }}
                  className="text-muted-foreground hover:text-destructive self-start p-1 opacity-0 group-hover:opacity-100 focus-visible:opacity-100"
                >
                  <Trash2 className="size-4" />
                </button>
              </div>
            ))}
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
