/**
 * The template-first creator (docs/VIDEO_TEMPLATES.md): describe a topic, a
 * model picks a verified template and fills its parameters, the user checks
 * them and renders. Everything here takes its content through props; the
 * workspace owns the requests.
 */

import {
  useEffect,
  useMemo,
  useState,
  type FormEvent,
  type ReactNode,
} from 'react';
import {
  AlertTriangle,
  ArrowLeft,
  ChevronRight,
  Film,
  FlaskConical,
  LoaderCircle,
  Monitor,
  Play,
  Search,
  Smartphone,
  Sparkles,
  Wand2,
} from 'lucide-react';

import { Link } from '@/core/i18n/navigation';
import type { AnimationDetail, AnimationMathWarning } from '@/lib/animation';
import { cn } from '@/lib/utils';
import type { PublicVideoTemplate } from '@/lib/video-templates/public';
import type {
  TemplateCategory,
  TemplateFrame,
  TemplateParamValues,
  TemplateTheme,
} from '@/lib/video-templates/types';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';

export interface TemplateStudioCopy {
  eyebrow: string;
  title: string;
  description: string;
  composerLabel: string;
  composerPlaceholder: string;
  matchButton: string;
  matching: string;
  matchedEyebrow: string;
  confidence: Record<'high' | 'medium' | 'low', string>;
  noMatchTitle: string;
  noMatchBody: string;
  betaButton: string;
  betaHint: string;
  alternativesLabel: string;
  examplesLabel: string;
  galleryTitle: string;
  galleryDescription: string;
  categories: Record<TemplateCategory, string>;
  useTemplate: string;
  back: string;
  paramsTitle: string;
  frameLabel: string;
  frames: Record<TemplateFrame, string>;
  themeLabel: string;
  themes: Record<TemplateTheme, string>;
  createButton: string;
  creating: string;
  signInToCreate: string;
  costHd: (credits: number) => string;
  costPreview: (left: number) => string;
  costNone: string;
  upgrade: string;
  templateLabel: string;
  factsTitle: string;
  beatsTitle: string;
  editParams: string;
  applyParams: string;
  renderNow: string;
  deliveryPreview: string;
  deliveryHd: string;
  exportHd: (credits: number) => string;
  exportHdHint: string;
  betaBadge: string;
  warningsTitle: string;
  warningsBody: string;
  warningsApprove: string;
  warningsUseTemplate: string;
}

export interface TemplateMatchView {
  match: {
    templateId: string;
    params: TemplateParamValues;
    confidence: 'high' | 'medium' | 'low';
    reason: string;
  } | null;
  alternatives: string[];
  reason?: string;
}

export interface TemplatePricing {
  /** Free previews left (720p, watermark); undefined while loading. */
  freePreviews?: number;
  renderCredits: number;
  balance?: number;
}

export interface TemplateRenderInput {
  templateId: string;
  params: TemplateParamValues;
  frame: TemplateFrame;
  theme: TemplateTheme;
  prompt?: string;
}

const CATEGORY_ORDER: TemplateCategory[] = [
  'functions',
  'calculus',
  'trigonometry',
  'series',
  'curves',
  'linear-algebra',
];

type FormValues = Record<string, string>;

function toFormValues(params: TemplateParamValues): FormValues {
  return Object.fromEntries(
    Object.entries(params).map(([key, value]) => [key, String(value)])
  );
}

function fromFormValues(
  template: PublicVideoTemplate,
  values: FormValues
): TemplateParamValues {
  return Object.fromEntries(
    template.params.map((param) => {
      const raw = values[param.key] ?? String(param.default);
      return [param.key, param.type === 'number' ? Number(raw) : raw];
    })
  );
}

/** What the next render costs this user, in one line. */
export function renderCostLine(
  copy: TemplateStudioCopy,
  pricing: TemplatePricing
): { text: string; payable: boolean } {
  const canPay =
    pricing.renderCredits === 0 ||
    (pricing.balance ?? 0) >= pricing.renderCredits;
  if (canPay)
    return { text: copy.costHd(pricing.renderCredits), payable: true };
  if ((pricing.freePreviews ?? 0) > 0)
    return { text: copy.costPreview(pricing.freePreviews ?? 0), payable: true };
  return { text: copy.costNone, payable: false };
}

function SegmentedChoice<T extends string>({
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
      <div className="bg-muted/50 inline-flex w-fit gap-1 rounded-xl border p-1">
        {options.map((option) => (
          <button
            key={option.value}
            type="button"
            aria-pressed={value === option.value}
            onClick={() => onChange(option.value)}
            className={cn(
              'focus-visible:ring-primary/45 inline-flex h-9 items-center gap-1.5 rounded-lg px-3 text-xs font-semibold transition-colors focus-visible:ring-2 focus-visible:outline-none',
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

/** The parameter fields of one template. */
export function TemplateParamFields({
  template,
  values,
  onChange,
  disabled,
}: {
  template: PublicVideoTemplate;
  values: FormValues;
  onChange: (values: FormValues) => void;
  disabled?: boolean;
}) {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {template.params.map((param) => {
        const value = values[param.key] ?? String(param.default);
        const id = `template-param-${template.id}-${param.key}`;
        return (
          <label
            key={param.key}
            htmlFor={id}
            className={cn(
              'grid content-start gap-1.5 text-sm font-medium',
              param.type === 'expression' && 'sm:col-span-2'
            )}
          >
            {param.label}
            {param.type === 'choice' ? (
              <select
                id={id}
                value={value}
                disabled={disabled}
                onChange={(event) =>
                  onChange({ ...values, [param.key]: event.target.value })
                }
                className="border-input bg-background focus:ring-primary/35 h-11 rounded-xl border px-3 text-sm outline-none focus:ring-2"
              >
                {param.options.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
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
                disabled={disabled}
                spellCheck={false}
                autoComplete="off"
                onChange={(event) =>
                  onChange({ ...values, [param.key]: event.target.value })
                }
                className="border-input bg-background focus:ring-primary/35 h-11 rounded-xl border px-3 font-mono text-sm outline-none focus:ring-2"
              />
            )}
            {(param.help || param.type === 'number') && (
              <span className="text-muted-foreground text-xs font-normal">
                {param.help}
                {param.type === 'number' &&
                  `${param.help ? ' · ' : ''}${param.min} … ${param.max}`}
              </span>
            )}
          </label>
        );
      })}
    </div>
  );
}

/** A chosen template with its parameters, frame, theme and the render button. */
function TemplateEditor({
  copy,
  template,
  initialParams,
  eyebrow,
  reason,
  prompt,
  pricing,
  upgradeHref,
  signedIn,
  creating,
  onBack,
  onCreate,
  footer,
}: {
  copy: TemplateStudioCopy;
  template: PublicVideoTemplate;
  initialParams: TemplateParamValues;
  eyebrow: string;
  reason?: string;
  prompt?: string;
  pricing: TemplatePricing;
  upgradeHref: string;
  signedIn: boolean;
  creating: boolean;
  onBack: () => void;
  onCreate: (input: TemplateRenderInput) => void;
  footer?: ReactNode;
}) {
  const [values, setValues] = useState<FormValues>(() =>
    toFormValues({ ...template.defaults, ...initialParams })
  );
  const [frame, setFrame] = useState<TemplateFrame>('16:9');
  const [theme, setTheme] = useState<TemplateTheme>('paper');
  useEffect(() => {
    setValues(toFormValues({ ...template.defaults, ...initialParams }));
  }, [template, initialParams]);
  const cost = renderCostLine(copy, pricing);
  function submit(event: FormEvent) {
    event.preventDefault();
    onCreate({
      templateId: template.id,
      params: fromFormValues(template, values),
      frame,
      theme,
      prompt,
    });
  }
  return (
    <form
      onSubmit={submit}
      className="bg-card/90 w-full rounded-2xl border p-4 text-left shadow-sm sm:p-6"
    >
      <div className="flex items-start gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-primary font-mono text-[10px] font-semibold tracking-[0.14em] uppercase">
            {eyebrow}
          </p>
          <h2 className="curvg-heading mt-1.5 text-xl sm:text-2xl">
            {template.title}
          </h2>
          <p className="text-muted-foreground mt-2 text-sm leading-6">
            {reason || template.summary}
          </p>
        </div>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={onBack}
          className="shrink-0"
        >
          <ArrowLeft /> {copy.back}
        </Button>
      </div>
      <div className="mt-5 border-t pt-5">
        <p className="text-muted-foreground mb-3 font-mono text-[9px] font-semibold tracking-[0.13em] uppercase">
          {copy.paramsTitle}
        </p>
        <TemplateParamFields
          template={template}
          values={values}
          onChange={setValues}
          disabled={creating}
        />
      </div>
      <div className="mt-5 flex flex-wrap gap-5">
        <SegmentedChoice
          label={copy.frameLabel}
          value={frame}
          onChange={setFrame}
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
        <SegmentedChoice
          label={copy.themeLabel}
          value={theme}
          onChange={setTheme}
          options={[
            { value: 'paper', label: copy.themes.paper },
            { value: 'studio', label: copy.themes.studio },
          ]}
        />
      </div>
      <div className="mt-6 flex flex-wrap items-center gap-3 border-t pt-5">
        <Button
          type="submit"
          className="bg-foreground text-background hover:bg-primary h-11 px-5"
          disabled={creating || (signedIn && !cost.payable)}
        >
          {creating ? <LoaderCircle className="animate-spin" /> : <Play />}
          {!signedIn
            ? copy.signInToCreate
            : creating
              ? copy.creating
              : copy.createButton}
        </Button>
        {signedIn && (
          <span
            className={cn(
              'text-xs leading-5',
              cost.payable
                ? 'text-muted-foreground'
                : 'text-amber-700 dark:text-amber-400'
            )}
          >
            {cost.text}{' '}
            {!cost.payable || (pricing.balance ?? 0) < pricing.renderCredits ? (
              <Link
                href={upgradeHref}
                className="text-primary font-semibold whitespace-nowrap hover:underline"
              >
                {copy.upgrade}
              </Link>
            ) : null}
          </span>
        )}
      </div>
      {footer}
    </form>
  );
}

function TemplateCard({
  copy,
  template,
  onSelect,
}: {
  copy: TemplateStudioCopy;
  template: PublicVideoTemplate;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className="bg-card hover:border-primary/30 focus-visible:ring-primary/45 group flex h-full flex-col rounded-2xl border p-4 text-left transition-[border-color,transform] hover:-translate-y-0.5 focus-visible:ring-2 focus-visible:outline-none motion-reduce:transition-none"
    >
      <span className="text-primary font-mono text-[9px] font-semibold tracking-[0.14em] uppercase">
        {copy.categories[template.category]}
      </span>
      <h3 className="mt-2 leading-snug font-semibold">{template.title}</h3>
      <p className="text-muted-foreground mt-1.5 line-clamp-3 flex-1 text-sm leading-6">
        {template.summary}
      </p>
      <span className="text-foreground mt-3 inline-flex items-center gap-1 text-xs font-semibold">
        {copy.useTemplate}
        <ChevronRight className="size-3.5 transition-transform group-hover:translate-x-0.5" />
      </span>
    </button>
  );
}

type StudioView =
  | { kind: 'browse' }
  | {
      kind: 'template';
      templateId: string;
      params: TemplateParamValues;
      eyebrow: string;
      reason?: string;
      prompt?: string;
      alternatives: string[];
    }
  | {
      kind: 'no-match';
      prompt: string;
      reason?: string;
      alternatives: string[];
    };

export function TemplateStudio({
  copy,
  templates,
  loading,
  signedIn,
  initialPrompt,
  initialTemplate,
  pricing,
  upgradeHref,
  creating,
  onMatch,
  onCreate,
  onBeta,
}: {
  copy: TemplateStudioCopy;
  templates: PublicVideoTemplate[];
  loading: boolean;
  signedIn: boolean;
  initialPrompt?: string;
  /** Opened from a lab, curve or wonder page: no model needed. */
  initialTemplate?: { templateId: string; params: TemplateParamValues };
  pricing: TemplatePricing;
  upgradeHref: string;
  creating: boolean;
  onMatch: (prompt: string) => Promise<TemplateMatchView>;
  onCreate: (input: TemplateRenderInput) => void;
  onBeta: (prompt: string) => void;
}) {
  const [prompt, setPrompt] = useState(initialPrompt ?? '');
  const [matching, setMatching] = useState(false);
  const [view, setView] = useState<StudioView>({ kind: 'browse' });
  const byId = useMemo(
    () => new Map(templates.map((template) => [template.id, template])),
    [templates]
  );

  const initialKey = initialTemplate
    ? `${initialTemplate.templateId}:${JSON.stringify(initialTemplate.params)}`
    : '';
  useEffect(() => {
    if (!initialTemplate || !byId.has(initialTemplate.templateId)) return;
    setView({
      kind: 'template',
      templateId: initialTemplate.templateId,
      params: initialTemplate.params,
      eyebrow: copy.templateLabel,
      alternatives: [],
    });
    // Keyed on the content: the route rebuilds the object on every render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialKey, byId, copy.templateLabel]);

  async function match(event?: FormEvent) {
    event?.preventDefault();
    const text = prompt.trim();
    if (!text || matching) return;
    if (!signedIn) {
      onBeta(text);
      return;
    }
    setMatching(true);
    try {
      const result = await onMatch(text);
      if (result.match && byId.has(result.match.templateId)) {
        setView({
          kind: 'template',
          templateId: result.match.templateId,
          params: result.match.params,
          eyebrow: `${copy.matchedEyebrow} · ${copy.confidence[result.match.confidence]}`,
          reason: result.match.reason,
          prompt: text,
          alternatives: result.alternatives,
        });
      } else {
        setView({
          kind: 'no-match',
          prompt: text,
          reason: result.reason,
          alternatives: result.alternatives,
        });
      }
    } catch {
      // The workspace already toasted; keep the user's text.
    } finally {
      setMatching(false);
    }
  }

  const alternativesRow = (ids: string[]) =>
    ids.filter((id) => byId.has(id)).length > 0 ? (
      <div className="mt-4 flex flex-wrap items-center gap-2 border-t pt-4">
        <span className="text-muted-foreground text-xs">
          {copy.alternativesLabel}
        </span>
        {ids
          .filter((id) => byId.has(id))
          .map((id) => (
            <button
              key={id}
              type="button"
              onClick={() =>
                setView({
                  kind: 'template',
                  templateId: id,
                  params: byId.get(id)!.defaults,
                  eyebrow: copy.templateLabel,
                  prompt: prompt.trim() || undefined,
                  alternatives: [],
                })
              }
              className="border-border hover:border-primary/40 hover:text-foreground text-muted-foreground rounded-full border px-3 py-1 text-xs transition-colors"
            >
              {byId.get(id)!.title}
            </button>
          ))}
      </div>
    ) : null;

  const selected =
    view.kind === 'template' ? byId.get(view.templateId) : undefined;
  // Suggestions in the reader's language where a template has one.
  const examples = useMemo(() => {
    const zh = /[\u4e00-\u9fff]/.test(copy.composerLabel);
    return templates
      .map(
        (template) =>
          template.examples.find(
            (example) => /[\u4e00-\u9fff]/.test(example.prompt) === zh
          )?.prompt
      )
      .filter(Boolean) as string[];
  }, [templates, copy.composerLabel]);

  return (
    <div className="mt-8 w-full">
      <div className="mx-auto w-full max-w-3xl">
        {view.kind === 'template' && selected ? (
          <TemplateEditor
            copy={copy}
            template={selected}
            initialParams={view.params}
            eyebrow={view.eyebrow}
            reason={view.reason}
            prompt={view.prompt}
            pricing={pricing}
            upgradeHref={upgradeHref}
            signedIn={signedIn}
            creating={creating}
            onBack={() => setView({ kind: 'browse' })}
            onCreate={onCreate}
            footer={alternativesRow(view.alternatives)}
          />
        ) : view.kind === 'no-match' ? (
          <div className="bg-card/90 rounded-2xl border p-5 text-left shadow-sm sm:p-6">
            <div className="flex items-start gap-3">
              <span className="bg-muted text-muted-foreground flex size-9 shrink-0 items-center justify-center rounded-full">
                <Search className="size-4" />
              </span>
              <div className="min-w-0 flex-1">
                <h2 className="font-semibold">{copy.noMatchTitle}</h2>
                <p className="text-muted-foreground mt-1.5 text-sm leading-6">
                  {view.reason || copy.noMatchBody}
                </p>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setView({ kind: 'browse' })}
              >
                <ArrowLeft /> {copy.back}
              </Button>
            </div>
            <div className="mt-5 flex flex-wrap items-center gap-3">
              <Button
                type="button"
                variant="outline"
                className="h-11"
                onClick={() => onBeta(view.prompt)}
              >
                <FlaskConical /> {copy.betaButton}
              </Button>
              <span className="text-muted-foreground text-xs leading-5">
                {copy.betaHint}
              </span>
            </div>
            {alternativesRow(view.alternatives)}
          </div>
        ) : (
          <form
            onSubmit={match}
            className="bg-card/90 rounded-2xl border p-3 shadow-sm sm:p-4"
          >
            <label
              htmlFor="template-studio-prompt"
              className="text-muted-foreground px-1 font-mono text-[9px] font-semibold tracking-[0.13em] uppercase"
            >
              {copy.composerLabel}
            </label>
            <Textarea
              id="template-studio-prompt"
              value={prompt}
              onChange={(event) => setPrompt(event.target.value.slice(0, 2000))}
              onKeyDown={(event) => {
                if (
                  event.key === 'Enter' &&
                  !event.shiftKey &&
                  !event.nativeEvent.isComposing
                ) {
                  event.preventDefault();
                  void match();
                }
              }}
              placeholder={copy.composerPlaceholder}
              className="mt-2 min-h-24 resize-none border-0 bg-transparent px-1 text-base shadow-none focus-visible:ring-0"
              disabled={matching}
            />
            <div className="mt-2 flex flex-wrap items-center gap-2">
              {examples.slice(0, 3).map((example) => (
                <button
                  key={example}
                  type="button"
                  onClick={() => setPrompt(example)}
                  className="border-border text-muted-foreground hover:text-foreground hover:border-primary/30 max-w-full truncate rounded-full border px-3 py-1 text-xs transition-colors"
                >
                  {example}
                </button>
              ))}
              <Button
                type="submit"
                className="bg-foreground text-background hover:bg-primary ml-auto h-10"
                disabled={matching || !prompt.trim()}
              >
                {matching ? (
                  <LoaderCircle className="animate-spin" />
                ) : (
                  <Wand2 />
                )}
                {matching ? copy.matching : copy.matchButton}
              </Button>
            </div>
          </form>
        )}
      </div>

      <section
        className="mx-auto mt-12 w-full max-w-6xl"
        aria-labelledby="template-gallery-title"
      >
        <div className="mx-auto max-w-2xl text-center">
          <p className="curvg-meta">{copy.eyebrow}</p>
          <h2
            id="template-gallery-title"
            className="curvg-heading mt-2 text-2xl sm:text-3xl"
          >
            {copy.galleryTitle}
          </h2>
          <p className="text-muted-foreground mt-3 text-sm leading-6">
            {copy.galleryDescription}
          </p>
        </div>
        {loading ? (
          <div className="text-muted-foreground mt-8 flex items-center justify-center gap-2 text-sm">
            <LoaderCircle className="size-4 animate-spin" />
          </div>
        ) : (
          <div className="mt-8 space-y-8">
            {CATEGORY_ORDER.map((category) => {
              const items = templates.filter(
                (template) => template.category === category
              );
              if (!items.length) return null;
              return (
                <div key={category}>
                  <h3 className="text-muted-foreground mb-3 font-mono text-[10px] font-semibold tracking-[0.14em] uppercase">
                    {copy.categories[category]}
                  </h3>
                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    {items.map((template) => (
                      <TemplateCard
                        key={template.id}
                        copy={copy}
                        template={template}
                        onSelect={() => {
                          setView({
                            kind: 'template',
                            templateId: template.id,
                            params: template.defaults,
                            eyebrow: copy.templateLabel,
                            alternatives: [],
                          });
                          if (typeof window !== 'undefined')
                            window.scrollTo({ top: 0, behavior: 'smooth' });
                        }}
                      />
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}

/** The template video in a conversation: what it shows, its parameters, HD export. */
export function TemplateVideoPanel({
  copy,
  detail,
  template,
  pricing,
  upgradeHref,
  busy,
  onUpdate,
  onRender,
}: {
  copy: TemplateStudioCopy;
  detail: AnimationDetail;
  template?: PublicVideoTemplate;
  pricing: TemplatePricing;
  upgradeHref: string;
  busy: boolean;
  onUpdate: (params: TemplateParamValues) => void;
  onRender: (delivery?: 'hd') => void;
}) {
  const state = detail.parts.template!;
  const [editing, setEditing] = useState(false);
  const [values, setValues] = useState<FormValues>(() =>
    toFormValues(state.params)
  );
  useEffect(() => setValues(toFormValues(state.params)), [state.params]);
  const delivery = detail.parts.render?.delivery;
  const completed = detail.status === 'completed';
  const canPayHd =
    pricing.renderCredits === 0 ||
    (pricing.balance ?? 0) >= pricing.renderCredits;
  const cost = renderCostLine(copy, pricing);
  const idle = ['code_ready', 'failed', 'canceled'].includes(detail.status);
  return (
    <div className="bg-card space-y-4 rounded-xl border p-4">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-primary inline-flex items-center gap-1.5 font-mono text-[9px] font-semibold tracking-[0.13em] uppercase">
          <Film className="size-3.5" /> {copy.templateLabel}
        </span>
        <span className="text-sm font-semibold">
          {template?.title || state.title}
        </span>
        {completed && delivery && (
          <span
            className={cn(
              'ml-auto rounded-full border px-2.5 py-0.5 text-[11px] font-semibold',
              delivery === 'preview'
                ? 'border-amber-500/40 bg-amber-500/10 text-amber-800 dark:text-amber-300'
                : 'border-emerald-600/30 bg-emerald-600/10 text-emerald-800 dark:text-emerald-300'
            )}
          >
            {delivery === 'preview' ? copy.deliveryPreview : copy.deliveryHd}
          </span>
        )}
      </div>
      {state.facts.length > 0 && (
        <div>
          <p className="text-muted-foreground mb-2 font-mono text-[9px] font-semibold tracking-[0.13em] uppercase">
            {copy.factsTitle}
          </p>
          <dl className="grid gap-x-4 gap-y-1.5 text-sm sm:grid-cols-[auto_1fr]">
            {state.facts.map((fact) => (
              <div key={fact.label} className="contents">
                <dt className="text-muted-foreground">{fact.label}</dt>
                <dd className="font-mono break-words">{fact.value}</dd>
              </div>
            ))}
          </dl>
        </div>
      )}
      {state.beats.length > 0 && (
        <div>
          <p className="text-muted-foreground mb-2 font-mono text-[9px] font-semibold tracking-[0.13em] uppercase">
            {copy.beatsTitle}
          </p>
          <ol className="flex flex-wrap gap-1.5">
            {state.beats.map((beat, index) => (
              <li
                key={beat}
                className="bg-muted/60 rounded-full px-2.5 py-1 text-xs"
              >
                <span className="text-muted-foreground mr-1 font-mono">
                  {index + 1}
                </span>
                {beat}
              </li>
            ))}
          </ol>
        </div>
      )}
      {completed && delivery === 'preview' && (
        <div className="flex flex-wrap items-center gap-3 rounded-lg border border-amber-500/30 bg-amber-500/[0.06] p-3">
          <Sparkles className="text-primary size-4 shrink-0" />
          <p className="min-w-0 flex-1 text-xs leading-5">
            {copy.exportHdHint}
          </p>
          {canPayHd ? (
            <Button
              type="button"
              size="sm"
              disabled={busy}
              onClick={() => onRender('hd')}
            >
              {busy ? <LoaderCircle className="animate-spin" /> : <Film />}{' '}
              {copy.exportHd(pricing.renderCredits)}
            </Button>
          ) : (
            <Link
              href={upgradeHref}
              className="text-primary text-sm font-semibold hover:underline"
            >
              {copy.upgrade}
            </Link>
          )}
        </div>
      )}
      {idle && !editing && (
        <div className="flex flex-wrap items-center gap-3">
          <Button
            type="button"
            disabled={busy || !cost.payable}
            onClick={() => onRender()}
          >
            {busy ? <LoaderCircle className="animate-spin" /> : <Play />}{' '}
            {copy.renderNow}
          </Button>
          <span className="text-muted-foreground text-xs">{cost.text}</span>
          {!cost.payable && (
            <Link
              href={upgradeHref}
              className="text-primary text-xs font-semibold hover:underline"
            >
              {copy.upgrade}
            </Link>
          )}
        </div>
      )}
      {template && (completed || idle) && (
        <div className="border-t pt-3">
          {editing ? (
            <form
              onSubmit={(event) => {
                event.preventDefault();
                onUpdate(fromFormValues(template, values));
                setEditing(false);
              }}
              className="space-y-4"
            >
              <TemplateParamFields
                template={template}
                values={values}
                onChange={setValues}
                disabled={busy}
              />
              <div className="flex gap-2">
                <Button type="submit" size="sm" disabled={busy}>
                  {copy.applyParams}
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  onClick={() => setEditing(false)}
                >
                  {copy.back}
                </Button>
              </div>
            </form>
          ) : (
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={busy}
              onClick={() => setEditing(true)}
            >
              {copy.editParams}
            </Button>
          )}
        </div>
      )}
    </div>
  );
}

/** Beta plans whose mathematics the audit could not confirm: the user decides. */
export function MathWarningsPanel({
  copy,
  warnings,
  busy,
  onApprove,
  onUseTemplates,
}: {
  copy: TemplateStudioCopy;
  warnings: AnimationMathWarning[];
  busy: boolean;
  onApprove: () => void;
  onUseTemplates: () => void;
}) {
  return (
    <div
      role="alert"
      className="space-y-3 rounded-xl border border-amber-500/40 bg-amber-500/[0.07] p-4"
    >
      <div className="flex items-center gap-2">
        <AlertTriangle className="size-4 text-amber-600" />
        <p className="text-sm font-semibold">{copy.warningsTitle}</p>
        <span className="ml-auto rounded-full border px-2 py-0.5 font-mono text-[9px] tracking-[0.12em] uppercase">
          {copy.betaBadge}
        </span>
      </div>
      <p className="text-muted-foreground text-xs leading-5">
        {copy.warningsBody}
      </p>
      <ul className="space-y-2">
        {warnings.slice(0, 6).map((warning, index) => (
          <li
            key={index}
            className="bg-background/70 rounded-lg border p-3 text-xs leading-5"
          >
            <p className="font-semibold">{warning.claim}</p>
            <p className="text-muted-foreground mt-1">{warning.problem}</p>
          </li>
        ))}
      </ul>
      <div className="flex flex-wrap gap-2">
        <Button type="button" size="sm" disabled={busy} onClick={onApprove}>
          {busy ? <LoaderCircle className="animate-spin" /> : <Play />}{' '}
          {copy.warningsApprove}
        </Button>
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={onUseTemplates}
        >
          <Sparkles /> {copy.warningsUseTemplate}
        </Button>
      </div>
    </div>
  );
}
