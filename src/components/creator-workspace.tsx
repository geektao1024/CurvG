import { useEffect, useRef, useState, type ReactNode } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  AlertCircle,
  ArrowUp,
  Check,
  ChevronRight,
  Clock3,
  Code2,
  Copy,
  Download,
  Film,
  History,
  LayoutGrid,
  Lightbulb,
  ListTree,
  LoaderCircle,
  Menu,
  MessageSquareText,
  MonitorPlay,
  PanelLeftClose,
  PanelLeftOpen,
  Play,
  Plus,
  Sparkles,
  Trash2,
  X,
} from 'lucide-react';
import { toast } from 'sonner';

import { useSession } from '@/core/auth/client';
import { Link, useRouter } from '@/core/i18n/navigation';
import { envConfigs } from '@/config';
import {
  animationModelValue,
  isAnimationBusy,
  parseAnimationModelValue,
  type AnimationDetail,
  type AnimationGenerationEvent,
  type AnimationModelCatalog,
  type AnimationModelProvider,
  type AnimationStatus,
  type AnimationSubject,
  type AnimationSummary,
} from '@/lib/animation';
import {
  apiDelete,
  apiGet,
  apiGetBlob,
  apiPost,
  apiPostEventStream,
} from '@/lib/api-client';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';

interface CreatorOption<T extends string> {
  value: T;
  label: string;
}

interface CreatorModelOption {
  value: string;
  label: string;
  description: string;
  presetKey?: CreatorCuratedModelKey;
  badge?: string;
  disabled?: boolean;
}

interface CreatorGenerationRequest {
  prompt: string;
  subject: AnimationSubject;
  modelChoice: ReturnType<typeof parseAnimationModelValue>['modelChoice'];
  model?: string;
}

export type CreatorCuratedModelKey =
  | 'deepseekV4Flash'
  | 'qwen3Coder'
  | 'minimaxM3'
  | 'deepseekV4Pro'
  | 'gemini31Pro'
  | 'gpt5'
  | 'gpt55'
  | 'claudeSonnet46'
  | 'claudeOpus47';

interface CreatorCuratedModelPreset {
  key: CreatorCuratedModelKey;
  models: string[];
  pro?: boolean;
}

const CURATED_MODEL_PRESETS: CreatorCuratedModelPreset[] = [
  {
    key: 'deepseekV4Flash',
    models: ['deepseek-v4-flash'],
  },
  {
    key: 'qwen3Coder',
    models: ['qwen3-coder', 'qwen3-coder-plus'],
  },
  {
    key: 'minimaxM3',
    models: ['MiniMax-M3'],
  },
  {
    key: 'deepseekV4Pro',
    models: ['deepseek-v4-pro'],
  },
  {
    key: 'gemini31Pro',
    models: [
      'gemini-3.1-pro',
      'gemini-3.1-pro-preview',
      'gemini-3.1-pro-latest',
    ],
    pro: true,
  },
  {
    key: 'gpt5',
    models: ['gpt-5'],
    pro: true,
  },
  {
    key: 'gpt55',
    models: ['gpt-5.5'],
    pro: true,
  },
  {
    key: 'claudeSonnet46',
    models: ['claude-sonnet-4-6'],
    pro: true,
  },
  {
    key: 'claudeOpus47',
    models: ['claude-opus-4-7'],
    pro: true,
  },
];

interface CreatorSuggestionGroup {
  value: string;
  label: string;
  prompts: string[];
}

export interface CreatorWorkspaceCopy {
  title: string;
  subtitle: string;
  newAnimation: string;
  gallery: string;
  workflow: string;
  history: string;
  historyEmpty: string;
  openHistory: string;
  closeSidebar: string;
  collapseSidebar: string;
  expandSidebar: string;
  deleteAnimation: string;
  deleteConfirm: string;
  promptPlaceholder: string;
  promptLabel: string;
  create: string;
  revise: string;
  signInToCreate: string;
  subject: string;
  model: string;
  characters: string;
  welcomeEyebrow: string;
  welcomeTitle: string;
  welcomeDescription: string;
  tipsTitle: string;
  tips: string[];
  processing: string;
  suggestionGroups: CreatorSuggestionGroup[];
  workspaceLabel: string;
  sectionLabel: string;
  conversationEyebrow: string;
  userLabel: string;
  assistantLabel: string;
  conversation: string;
  specification: string;
  code: string;
  video: string;
  preview: string;
  previewEmpty: string;
  previewPlaybackError: string;
  playPreview: string;
  retryPlayback: string;
  approve: string;
  retryRender: string;
  approvalDescription: string;
  duration: string;
  assumptions: string;
  formulas: string;
  visualStyle: string;
  scenes: string;
  purpose: string;
  math: string;
  visuals: string;
  actions: string;
  layout: string;
  areas: string;
  dependencies: string;
  notes: string;
  pipelineLabel: string;
  pipelineSpec: string;
  pipelineApprove: string;
  pipelineProcess: string;
  pipelineDone: string;
  noCode: string;
  noVideo: string;
  codeReadyTitle: string;
  codeReadyDescription: string;
  renderQueued: string;
  failed: string;
  copyCode: string;
  downloadCode: string;
  copied: string;
  versions: string;
  loading: string;
  loadFailed: string;
  modelAuto: string;
  modelAutoDescription: string;
  modelPro: string;
  modelLoading: string;
  modelUnavailable: string;
  modelUnavailableShort: string;
  curatedModels: Record<
    CreatorCuratedModelKey,
    { label: string; description: string }
  >;
  subjects: CreatorOption<AnimationSubject>[];
  statuses: Record<AnimationStatus, string>;
}

function isModelProvider(value: string): value is AnimationModelProvider {
  return ['openai', 'yunwu', 'anthropic'].includes(value);
}

const progressByStatus: Record<AnimationStatus, number> = {
  draft: 5,
  generating_spec: 22,
  awaiting_approval: 42,
  generating_code: 64,
  code_ready: 78,
  queued: 84,
  rendering: 92,
  completed: 100,
  failed: 0,
};

type ArtifactTab = 'specification' | 'code' | 'video';

function preferredArtifactTab(detail?: AnimationDetail): ArtifactTab {
  if (detail?.status === 'completed' && detail.parts.videoUrl) return 'video';
  if (detail?.parts.code) return 'code';
  if (detail?.parts.spec) return 'specification';
  return 'video';
}

function WorkspaceNavigation({
  copy,
  collapsed = false,
  onCreate,
}: {
  copy: CreatorWorkspaceCopy;
  collapsed?: boolean;
  onCreate: () => void;
}) {
  const linkClassName = cn(
    'text-muted-foreground hover:bg-accent hover:text-foreground focus-visible:ring-primary/40 flex h-11 items-center rounded-md text-sm transition-colors focus-visible:ring-2 focus-visible:outline-none motion-reduce:transition-none lg:h-9',
    collapsed ? 'w-10 justify-center px-0' : 'w-full gap-2.5 px-2.5'
  );

  return (
    <div className={cn('border-b p-2.5', collapsed && 'px-3')}>
      {!collapsed && (
        <p className="text-muted-foreground mb-2 px-2 font-mono text-[9px] tracking-[0.12em] uppercase">
          {copy.workspaceLabel}
        </p>
      )}
      <div
        className={cn('space-y-1', collapsed && 'flex flex-col items-center')}
      >
        <Button
          className={cn(
            'curvg-btn-primary h-11 lg:h-9',
            collapsed
              ? 'w-10 justify-center px-0'
              : 'w-full justify-start px-2.5'
          )}
          onClick={onCreate}
          aria-label={copy.newAnimation}
          title={collapsed ? copy.newAnimation : undefined}
        >
          <Plus />
          {!collapsed && copy.newAnimation}
        </Button>
        <nav
          aria-label={copy.workspaceLabel}
          className={cn('space-y-1', collapsed && 'flex flex-col items-center')}
        >
          <Link
            href="/#gallery"
            className={linkClassName}
            aria-label={copy.gallery}
            title={collapsed ? copy.gallery : undefined}
          >
            <LayoutGrid className="size-4 shrink-0" />
            {!collapsed && <span>{copy.gallery}</span>}
          </Link>
          <Link
            href="/#workflow"
            className={linkClassName}
            aria-label={copy.workflow}
            title={collapsed ? copy.workflow : undefined}
          >
            <ListTree className="size-4 shrink-0" />
            {!collapsed && <span>{copy.workflow}</span>}
          </Link>
        </nav>
      </div>
    </div>
  );
}

function HistoryList({
  items,
  selectedId,
  copy,
  locale,
  onSelect,
  onDelete,
  collapsed = false,
}: {
  items: AnimationSummary[];
  selectedId?: string;
  copy: CreatorWorkspaceCopy;
  locale: string;
  onSelect: (id: string) => void;
  onDelete: (id: string) => void;
  collapsed?: boolean;
}) {
  if (collapsed) {
    return (
      <div className="flex min-h-0 flex-1 flex-col items-center">
        <div className="border-b py-3">
          <span className="text-muted-foreground flex size-9 items-center justify-center rounded-xl">
            <History className="size-4" />
          </span>
        </div>
        <div className="flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto px-2 py-3">
          {items.map((item, index) => (
            <button
              key={item.id}
              type="button"
              onClick={() => onSelect(item.id)}
              aria-label={item.title}
              aria-current={selectedId === item.id ? 'page' : undefined}
              title={item.title}
              className={cn(
                'text-muted-foreground focus-visible:ring-primary/40 relative flex size-10 shrink-0 items-center justify-center rounded-xl border border-transparent font-mono text-[10px] transition-colors focus-visible:ring-2 focus-visible:outline-none motion-reduce:transition-none',
                selectedId === item.id
                  ? 'border-primary/25 bg-primary/8 text-primary'
                  : 'hover:bg-accent hover:text-foreground'
              )}
            >
              {String(index + 1).padStart(2, '0')}
              <span
                className={cn(
                  'absolute top-1.5 right-1.5 size-1.5 rounded-full',
                  item.status === 'completed'
                    ? 'bg-emerald-500'
                    : isAnimationBusy(item.status)
                      ? 'bg-primary animate-pulse motion-reduce:animate-none'
                      : item.status === 'failed'
                        ? 'bg-destructive'
                        : 'bg-muted-foreground/40'
                )}
              />
            </button>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="border-b px-4 py-4">
        <div className="flex items-center gap-2 text-sm font-semibold">
          <span className="text-primary border-primary/20 bg-primary/5 flex size-7 items-center justify-center rounded-full border">
            <History className="size-3.5" />
          </span>
          <span>{copy.history}</span>
        </div>
        <p className="text-muted-foreground mt-2 pl-9 font-mono text-[10px] tracking-[0.08em] uppercase">
          {items.length.toString().padStart(2, '0')} / {copy.workspaceLabel}
        </p>
      </div>
      <div className="min-h-0 flex-1 space-y-1 overflow-y-auto px-3 py-3">
        {items.length === 0 ? (
          <p className="text-muted-foreground px-2 py-10 text-center text-sm leading-6">
            {copy.historyEmpty}
          </p>
        ) : (
          items.map((item) => (
            <div
              key={item.id}
              className={cn(
                'group hover:border-primary/15 hover:bg-accent flex w-full items-start gap-2 rounded-md border border-transparent px-3 py-2.5 text-left transition-colors motion-reduce:transition-none lg:py-3',
                selectedId === item.id &&
                  'border-primary/25 bg-primary/5 hover:border-primary/25 hover:bg-primary/5'
              )}
            >
              <button
                type="button"
                onClick={() => onSelect(item.id)}
                aria-current={selectedId === item.id ? 'page' : undefined}
                className="focus-visible:ring-primary/40 min-h-11 min-w-0 flex-1 rounded-sm text-left focus-visible:ring-2 focus-visible:outline-none lg:min-h-0"
              >
                <div className="truncate text-sm font-medium">{item.title}</div>
                <div className="text-muted-foreground mt-1 grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2 text-xs">
                  <span className="truncate" title={copy.statuses[item.status]}>
                    {copy.statuses[item.status]}
                  </span>
                  <span className="shrink-0">
                    {new Intl.DateTimeFormat(locale, {
                      month: 'short',
                      day: 'numeric',
                    }).format(new Date(item.updatedAt))}
                  </span>
                </div>
              </button>
              <Button
                type="button"
                variant="ghost"
                size="icon-xs"
                className="text-muted-foreground size-11 opacity-60 transition-opacity group-hover:opacity-100 focus-visible:opacity-100 motion-reduce:transition-none lg:size-8"
                aria-label={`${copy.deleteAnimation}: ${item.title}`}
                onClick={(event) => {
                  event.stopPropagation();
                  onDelete(item.id);
                }}
              >
                <Trash2 />
              </Button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

function WorkspaceSidebarChrome({
  copy,
  history,
  selectedId,
  locale,
  collapsed,
  historyOpen,
  onToggleCollapsed,
  onHistoryOpenChange,
  onCreate,
  onSelect,
  onDelete,
}: {
  copy: CreatorWorkspaceCopy;
  history: AnimationSummary[];
  selectedId?: string;
  locale: string;
  collapsed: boolean;
  historyOpen: boolean;
  onToggleCollapsed: () => void;
  onHistoryOpenChange: (open: boolean) => void;
  onCreate: () => void;
  onSelect: (id: string) => void;
  onDelete: (id: string) => void;
}) {
  return (
    <>
      <aside
        aria-label={copy.workspaceLabel}
        className={cn(
          'bg-muted/20 hidden shrink-0 flex-col border-r transition-[width] duration-200 motion-reduce:transition-none lg:flex',
          collapsed ? 'w-16' : 'w-[clamp(240px,15.5vw,272px)]'
        )}
      >
        <div
          className={cn(
            'flex h-14 shrink-0 items-center border-b px-3',
            collapsed ? 'justify-center' : 'gap-2'
          )}
        >
          {!collapsed && (
            <Link
              href="/"
              className="group flex min-w-0 flex-1 items-center gap-1.5"
            >
              <img
                src={envConfigs.app_logo}
                alt=""
                className="size-8 shrink-0 rounded-lg"
              />
              <span className="truncate text-xl font-bold tracking-[-0.03em]">
                {envConfigs.app_name}
              </span>
            </Link>
          )}
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={onToggleCollapsed}
            aria-label={collapsed ? copy.expandSidebar : copy.collapseSidebar}
            title={collapsed ? copy.expandSidebar : copy.collapseSidebar}
          >
            {collapsed ? <PanelLeftOpen /> : <PanelLeftClose />}
          </Button>
        </div>

        <WorkspaceNavigation
          copy={copy}
          collapsed={collapsed}
          onCreate={onCreate}
        />
        <HistoryList
          items={history}
          selectedId={selectedId}
          copy={copy}
          locale={locale}
          onSelect={onSelect}
          onDelete={onDelete}
          collapsed={collapsed}
        />
      </aside>

      <Sheet open={historyOpen} onOpenChange={onHistoryOpenChange}>
        <SheetContent
          side="left"
          showCloseButton={false}
          className="bg-background p-0 data-[side=left]:w-[min(88vw,360px)]! motion-reduce:transition-none"
        >
          <SheetHeader className="sr-only">
            <SheetTitle>{copy.history}</SheetTitle>
            <SheetDescription>{copy.history}</SheetDescription>
          </SheetHeader>
          <SheetClose
            render={
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="absolute top-1.5 right-1.5 z-10 size-11"
                aria-label={copy.closeSidebar}
              />
            }
          >
            <X className="size-4" />
          </SheetClose>
          <div className="pt-14">
            <WorkspaceNavigation copy={copy} onCreate={onCreate} />
          </div>
          <HistoryList
            items={history}
            selectedId={selectedId}
            copy={copy}
            locale={locale}
            onSelect={onSelect}
            onDelete={onDelete}
          />
        </SheetContent>
      </Sheet>
    </>
  );
}

function PromptComposer({
  copy,
  prompt,
  onPromptChange,
  onSubmit,
  subject,
  onSubjectChange,
  modelValue,
  modelOptions,
  modelsLoading,
  onModelChange,
  processing,
  hasDetail,
  user,
  autoFocus = false,
  hasAssistantAvatar = false,
  className,
}: {
  copy: CreatorWorkspaceCopy;
  prompt: string;
  onPromptChange: (value: string) => void;
  onSubmit: (event: React.FormEvent<HTMLFormElement>) => void;
  subject: AnimationSubject;
  onSubjectChange: (value: AnimationSubject) => void;
  modelValue: string;
  modelOptions: CreatorModelOption[];
  modelsLoading: boolean;
  onModelChange: (value: string) => void;
  processing: boolean;
  hasDetail: boolean;
  user: boolean;
  autoFocus?: boolean;
  hasAssistantAvatar?: boolean;
  className?: string;
}) {
  const submitLabel = !user
    ? copy.signInToCreate
    : hasDetail
      ? copy.revise
      : copy.create;

  return (
    <form
      onSubmit={onSubmit}
      aria-busy={processing}
      className={cn(
        'bg-card border-border/90 focus-within:border-primary/45 @container/composer w-full border transition-[border-color,box-shadow] focus-within:shadow-[0_20px_56px_-36px_color-mix(in_oklab,var(--primary)_72%,transparent)] motion-reduce:transition-none',
        hasDetail
          ? 'rounded-xl p-2.5 sm:p-3'
          : 'rounded-[28px] p-3 shadow-[0_24px_70px_-52px_color-mix(in_oklab,var(--foreground)_42%,transparent)] sm:p-4',
        className
      )}
    >
      {!hasDetail && (
        <div className="text-muted-foreground px-2 pt-0.5 pb-1 font-mono text-[9px] font-medium tracking-[0.14em] uppercase sm:px-3">
          {copy.promptLabel}
        </div>
      )}
      <div className="relative">
        <Textarea
          autoFocus={autoFocus}
          value={prompt}
          maxLength={5000}
          onChange={(event) =>
            onPromptChange(event.target.value.slice(0, 5000))
          }
          onKeyDown={(event) => {
            if (event.nativeEvent.isComposing) return;
            if (event.key === 'Enter' && !event.shiftKey) {
              event.preventDefault();
              event.currentTarget.form?.requestSubmit();
            }
          }}
          placeholder={copy.promptPlaceholder}
          aria-label={copy.promptLabel}
          disabled={processing}
          className={cn(
            'placeholder:text-muted-foreground/62 resize-none border-0 bg-transparent px-2 py-2 leading-6 shadow-none focus-visible:ring-0 sm:px-3 dark:bg-transparent',
            hasDetail
              ? 'max-h-40 min-h-20 text-sm'
              : 'max-h-56 min-h-20 text-[15px] sm:min-h-24 sm:text-base',
            hasAssistantAvatar && 'pr-28 sm:pr-48'
          )}
        />
        {processing && (
          <div className="text-muted-foreground absolute right-3 bottom-2 flex items-center gap-1.5 font-mono text-[10px] tracking-[0.08em] uppercase">
            <LoaderCircle className="text-primary size-3 animate-spin motion-reduce:animate-none" />
            {copy.processing}
          </div>
        )}
      </div>
      <div className="border-border/70 mt-1 flex min-w-0 items-center gap-2 border-t px-1 pt-2.5 @max-[460px]/composer:gap-1.5">
        <Select
          value={subject}
          onValueChange={(value) =>
            onSubjectChange((value || 'general') as AnimationSubject)
          }
          disabled={hasDetail || processing}
        >
          <SelectTrigger
            size="sm"
            aria-label={copy.subject}
            title={
              copy.subjects.find((option) => option.value === subject)?.label
            }
            className="curvg-pill h-11! gap-1.5 px-3 text-xs lg:h-8! @max-[460px]/composer:w-11 @max-[460px]/composer:min-w-0 @max-[460px]/composer:px-2"
          >
            <ListTree className="text-muted-foreground hidden size-3.5 @max-[460px]/composer:block" />
            <SelectValue className="@max-[460px]/composer:hidden">
              {(value) =>
                copy.subjects.find((option) => option.value === value)?.label ||
                value
              }
            </SelectValue>
          </SelectTrigger>
          <SelectContent align="start">
            {copy.subjects.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select
          value={modelValue}
          onValueChange={(value) => onModelChange(value || 'auto')}
          disabled={processing}
        >
          <SelectTrigger
            size="sm"
            aria-label={copy.model}
            title={
              modelOptions.find((option) => option.value === modelValue)?.label
            }
            className="curvg-pill hover:border-primary/35 hover:bg-primary/[0.035] data-[popup-open]:border-primary/45 h-11! max-w-56 min-w-32 gap-2 px-3 text-xs transition-[border-color,background-color,box-shadow] data-[popup-open]:shadow-[0_0_0_3px_color-mix(in_oklab,var(--primary)_10%,transparent)] lg:h-8! @max-[460px]/composer:w-11 @max-[460px]/composer:min-w-0 @max-[460px]/composer:gap-1 @max-[460px]/composer:px-2"
          >
            <Sparkles className="text-primary size-3.5" />
            <SelectValue className="@max-[460px]/composer:hidden">
              {(value) =>
                modelOptions.find((option) => option.value === value)?.label ||
                value
              }
            </SelectValue>
          </SelectTrigger>
          <SelectContent
            align="end"
            alignItemWithTrigger={false}
            sideOffset={8}
            className="border-border/80 bg-popover/98 max-h-[min(38rem,var(--available-height))] w-[min(25rem,calc(100vw-1.5rem))] overscroll-contain rounded-2xl border p-1.5 shadow-[0_26px_80px_-34px_color-mix(in_oklab,var(--foreground)_40%,transparent)] ring-0 backdrop-blur-xl"
          >
            <div className="border-border/70 mb-1 border-b px-3.5 py-3">
              <span className="text-muted-foreground block font-mono text-[9px] font-medium tracking-[0.14em] uppercase">
                {copy.model}
              </span>
              <span className="mt-1 block text-sm font-medium">
                {modelOptions.find((option) => option.value === modelValue)
                  ?.label || copy.modelAuto}
              </span>
            </div>
            {modelOptions.map((option) => (
              <SelectItem
                key={option.value}
                value={option.value}
                disabled={option.disabled}
                className={cn(
                  'my-0.5 min-h-[4.5rem] items-start rounded-[14px] border px-3.5 py-3 pr-11 whitespace-normal transition-[background-color,border-color,box-shadow,transform] duration-150 motion-reduce:transition-none [&>span:first-child]:min-w-0 [&>span:first-child]:shrink [&>span:first-child]:whitespace-normal',
                  option.value === modelValue
                    ? 'border-emerald-300/70 bg-[linear-gradient(105deg,color-mix(in_oklab,var(--color-emerald-100)_82%,transparent),color-mix(in_oklab,var(--color-emerald-50)_32%,transparent))] text-emerald-950 shadow-[inset_0_1px_0_rgb(255_255_255/0.55)] focus:bg-emerald-100/75 focus:text-emerald-950 focus:**:text-emerald-800 dark:text-emerald-100 dark:focus:text-emerald-100 dark:focus:**:text-emerald-200'
                    : 'focus:border-border/70 focus:bg-muted/65 border-transparent',
                  option.disabled && 'grayscale-[0.2]'
                )}
              >
                <span className="flex min-w-0 items-start gap-3">
                  <span
                    className={cn(
                      'mt-1.5 size-2.5 shrink-0 rounded-full border transition-[background-color,box-shadow] duration-150',
                      option.value === modelValue
                        ? 'border-emerald-500 bg-emerald-500 shadow-[0_0_0_4px_rgb(16_185_129/0.11)]'
                        : option.disabled
                          ? 'border-muted-foreground/25 bg-transparent'
                          : 'border-slate-300 bg-slate-300 dark:border-slate-600 dark:bg-slate-600'
                    )}
                  />
                  <span className="min-w-0">
                    <span className="flex flex-wrap items-center gap-2 text-sm font-medium">
                      <span>{option.label}</span>
                      {option.badge && (
                        <span className="rounded-full border border-emerald-300/70 bg-emerald-100/85 px-1.5 py-0.5 font-mono text-[9px] font-semibold tracking-[0.04em] text-emerald-700 uppercase dark:border-emerald-700/70 dark:bg-emerald-950/70 dark:text-emerald-300">
                          {option.badge}
                        </span>
                      )}
                    </span>
                    <span className="text-muted-foreground mt-1 block text-xs leading-5 break-words whitespace-normal">
                      {option.description}
                      {option.disabled && !modelsLoading && (
                        <span className="mt-0.5 block text-[11px] font-medium text-amber-600 dark:text-amber-400">
                          {copy.modelUnavailableShort}
                        </span>
                      )}
                    </span>
                  </span>
                </span>
              </SelectItem>
            ))}
            {modelsLoading && (
              <div className="text-muted-foreground flex items-center gap-2 px-3 py-3 text-xs">
                <LoaderCircle className="size-3.5 animate-spin motion-reduce:animate-none" />
                {copy.modelLoading}
              </div>
            )}
            {!modelsLoading &&
              modelOptions.every((option) => option.disabled) && (
                <div className="text-muted-foreground border-t px-3 py-3 text-xs leading-5">
                  {copy.modelUnavailable}
                </div>
              )}
          </SelectContent>
        </Select>
        <div className="ml-auto flex items-center gap-2">
          <span className="text-muted-foreground font-mono text-[10px] tracking-[0.03em]">
            <span className="@max-[460px]/composer:hidden">
              {prompt.length}/5000
            </span>
            <span className="hidden @max-[460px]/composer:inline">
              {prompt.length}/5k
            </span>
          </span>
          <Button
            type="submit"
            size="icon-lg"
            disabled={!prompt.trim() || processing}
            aria-label={submitLabel}
            className="bg-foreground text-background hover:bg-primary size-11 rounded-full shadow-none"
          >
            {processing ? (
              <LoaderCircle className="animate-spin motion-reduce:animate-none" />
            ) : (
              <ArrowUp />
            )}
          </Button>
        </div>
      </div>
    </form>
  );
}

function Welcome({
  copy,
  prompt,
  onPromptChange,
  onSubmit,
  subject,
  onSubjectChange,
  modelValue,
  modelOptions,
  modelsLoading,
  onModelChange,
  processing,
  user,
}: {
  copy: CreatorWorkspaceCopy;
  prompt: string;
  onPromptChange: (value: string) => void;
  onSubmit: (event: React.FormEvent<HTMLFormElement>) => void;
  subject: AnimationSubject;
  onSubjectChange: (value: AnimationSubject) => void;
  modelValue: string;
  modelOptions: CreatorModelOption[];
  modelsLoading: boolean;
  onModelChange: (value: string) => void;
  processing: boolean;
  user: boolean;
}) {
  const [activeGroup, setActiveGroup] = useState(
    copy.suggestionGroups[0]?.value || ''
  );
  const activeSuggestions =
    copy.suggestionGroups.find((group) => group.value === activeGroup) ||
    copy.suggestionGroups[0];

  return (
    <div className="relative flex min-h-0 flex-1 overflow-x-hidden overflow-y-auto">
      <div className="curvg-coordinate-grid pointer-events-none absolute inset-0 [mask-image:linear-gradient(to_bottom,transparent_0%,black_12%,black_88%,transparent_100%)] opacity-55" />
      <div className="curvg-dotmatrix pointer-events-none absolute top-8 right-0 h-72 w-72 opacity-25" />
      <span className="curvg-corner top-8 left-6" />
      <span className="curvg-corner top-8 right-6" />
      <div className="relative mx-auto flex w-full max-w-5xl flex-1 flex-col items-center px-4 py-14 sm:px-8 sm:py-20 lg:py-24">
        <div className="curvg-pill text-muted-foreground inline-flex items-center gap-2 px-3 py-1.5 font-mono text-[10px] font-medium tracking-[0.16em] uppercase">
          <Sparkles className="text-primary size-3.5" />
          {copy.welcomeEyebrow}
        </div>
        <h1 className="curvg-heading mt-5 max-w-4xl text-center text-[2.15rem] leading-[1.05] sm:text-[3.75rem]">
          {copy.welcomeTitle}
        </h1>
        <p className="text-muted-foreground mt-5 max-w-2xl text-center text-sm leading-6 sm:text-[1.05rem] sm:leading-7">
          {copy.welcomeDescription}
        </p>

        <div className="mt-28 w-full max-w-4xl sm:mt-44">
          <div className="relative">
            <img
              src="/imgs/generated/creator-assistant-sitting.png"
              alt=""
              aria-hidden="true"
              draggable={false}
              className="pointer-events-none absolute top-0 right-4 z-20 h-40 w-auto -translate-y-[67%] object-contain drop-shadow-[0_20px_24px_rgba(26,28,48,0.14)] select-none sm:right-10 sm:h-72 dark:brightness-[0.92]"
            />
            <PromptComposer
              copy={copy}
              prompt={prompt}
              onPromptChange={onPromptChange}
              onSubmit={onSubmit}
              subject={subject}
              onSubjectChange={onSubjectChange}
              modelValue={modelValue}
              modelOptions={modelOptions}
              modelsLoading={modelsLoading}
              onModelChange={onModelChange}
              processing={processing}
              hasDetail={false}
              user={user}
              hasAssistantAvatar
              className="relative z-10"
            />
          </div>
          <div className="bg-card/82 border-border/80 mt-4 rounded-[26px] border p-3 shadow-[0_24px_70px_-58px_color-mix(in_oklab,var(--foreground)_42%,transparent)] sm:p-4">
            <div className="flex gap-1 overflow-x-auto">
              {copy.suggestionGroups.map((group) => (
                <button
                  key={group.value}
                  type="button"
                  onClick={() => setActiveGroup(group.value)}
                  aria-pressed={activeGroup === group.value}
                  className={cn(
                    'focus-visible:ring-primary/50 inline-flex h-11 shrink-0 items-center gap-1.5 rounded-full border px-3 text-xs transition-colors focus-visible:ring-2 focus-visible:outline-none motion-reduce:transition-none sm:h-9',
                    activeGroup === group.value
                      ? 'border-foreground bg-foreground text-background'
                      : 'border-border bg-background text-muted-foreground hover:border-primary/30 hover:text-foreground'
                  )}
                >
                  {group.value === 'suggested' ? (
                    <Lightbulb className="size-3.5" />
                  ) : (
                    <MessageSquareText className="size-3.5" />
                  )}
                  {group.label}
                </button>
              ))}
            </div>
            {activeSuggestions && (
              <div className="border-border/70 mt-2 border-t pt-1">
                {activeSuggestions.prompts.map((suggestion, index) => (
                  <button
                    key={suggestion}
                    type="button"
                    onClick={() => onPromptChange(suggestion)}
                    className={cn(
                      'group focus-visible:ring-primary/40 flex min-h-11 w-full items-center gap-3 rounded-xl border px-3 py-3 text-left text-sm transition-[background-color,border-color] focus-visible:ring-2 focus-visible:outline-none motion-reduce:transition-none sm:py-3.5',
                      prompt === suggestion
                        ? 'border-primary/18 bg-primary/[0.045]'
                        : 'hover:bg-accent hover:border-border/80 border-transparent'
                    )}
                  >
                    <span className="text-muted-foreground font-mono text-[10px]">
                      {String(index + 1).padStart(2, '0')}
                    </span>
                    <span className="min-w-0 flex-1 leading-5">
                      {suggestion}
                    </span>
                    <ChevronRight
                      className={cn(
                        'text-muted-foreground size-4 shrink-0 transition-opacity motion-reduce:transition-none',
                        prompt === suggestion
                          ? 'opacity-100'
                          : 'opacity-30 group-hover:opacity-100 group-focus-visible:opacity-100'
                      )}
                    />
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function StatusPanel({
  detail,
  copy,
}: {
  detail: AnimationDetail;
  copy: CreatorWorkspaceCopy;
}) {
  if (
    !isAnimationBusy(detail.status) &&
    detail.status !== 'failed' &&
    detail.status !== 'code_ready'
  ) {
    return null;
  }
  const failed = detail.status === 'failed';
  return (
    <div
      role={failed ? 'alert' : 'status'}
      aria-live={failed ? 'assertive' : 'polite'}
      className={cn(
        'rounded-xl border p-4',
        failed ? 'border-destructive/30 bg-destructive/5' : 'bg-card'
      )}
    >
      <div className="flex items-center gap-3">
        {failed ? (
          <AlertCircle className="text-destructive size-5" />
        ) : detail.status === 'code_ready' ? (
          <Code2 className="size-5" />
        ) : (
          <LoaderCircle className="size-5 animate-spin motion-reduce:animate-none" />
        )}
        <div className="min-w-0 flex-1">
          <div className="text-sm font-semibold">
            {detail.status === 'code_ready'
              ? copy.codeReadyTitle
              : copy.statuses[detail.status]}
          </div>
          {detail.status === 'code_ready' && (
            <p className="text-muted-foreground mt-1 text-sm">
              {copy.codeReadyDescription}
            </p>
          )}
          {failed && detail.parts.error && (
            <p className="text-destructive mt-1 text-sm">
              {detail.parts.error}
            </p>
          )}
        </div>
      </div>
      {!failed && (
        <Progress className="mt-4" value={progressByStatus[detail.status]} />
      )}
    </div>
  );
}

function StringList({ items }: { items: string[] }) {
  if (items.length === 0) return null;
  return (
    <ul className="text-muted-foreground space-y-1.5 text-sm leading-6">
      {items.map((item, index) => (
        <li key={`${item}-${index}`} className="flex gap-2">
          <ChevronRight className="mt-1.5 size-3 shrink-0" />
          <span>{item}</span>
        </li>
      ))}
    </ul>
  );
}

const pythonKeywords = new Set([
  'and',
  'as',
  'assert',
  'async',
  'await',
  'break',
  'class',
  'continue',
  'def',
  'del',
  'elif',
  'else',
  'except',
  'False',
  'finally',
  'for',
  'from',
  'global',
  'if',
  'import',
  'in',
  'is',
  'lambda',
  'None',
  'nonlocal',
  'not',
  'or',
  'pass',
  'raise',
  'return',
  'True',
  'try',
  'while',
  'with',
  'yield',
]);

function pythonTokenClass(token: string): string {
  if (token.startsWith('#')) return 'text-slate-500 italic';
  if (token.startsWith("'") || token.startsWith('"')) {
    return 'text-emerald-700 dark:text-emerald-300';
  }
  if (pythonKeywords.has(token)) {
    return 'text-rose-700 dark:text-rose-300';
  }
  return 'text-violet-700 dark:text-violet-300';
}

function highlightPythonLine(line: string, lineIndex: number): ReactNode[] {
  const pattern =
    /("(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'|#.*$|\b(?:and|as|assert|async|await|break|class|continue|def|del|elif|else|except|False|finally|for|from|global|if|import|in|is|lambda|None|nonlocal|not|or|pass|raise|return|True|try|while|with|yield)\b|\b\d+(?:\.\d+)?\b)/g;
  const output: ReactNode[] = [];
  let cursor = 0;
  for (const match of line.matchAll(pattern)) {
    const index = match.index ?? 0;
    if (index > cursor) output.push(line.slice(cursor, index));
    output.push(
      <span
        key={`${lineIndex}-${index}`}
        className={pythonTokenClass(match[0])}
      >
        {match[0]}
      </span>
    );
    cursor = index + match[0].length;
  }
  if (cursor < line.length) output.push(line.slice(cursor));
  return output.length > 0 ? output : [' '];
}

function codeFilename(title: string): string {
  const normalized = title
    .normalize('NFKD')
    .replace(/[^A-Za-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .toLowerCase();
  return `${normalized || 'curvg-animation'}.py`;
}

function PythonCodeView({
  code,
  title,
  copy,
  maxHeightClass = 'max-h-[560px]',
}: {
  code: string;
  title: string;
  copy: CreatorWorkspaceCopy;
  maxHeightClass?: string;
}) {
  async function copyCode() {
    await navigator.clipboard.writeText(code);
    toast.success(copy.copied);
  }

  function downloadCode() {
    const url = URL.createObjectURL(
      new Blob([code], { type: 'text/x-python;charset=utf-8' })
    );
    const link = document.createElement('a');
    link.href = url;
    link.download = codeFilename(title);
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="bg-muted/35 overflow-hidden rounded-xl border">
      <div className="bg-background/90 flex items-center justify-between gap-3 border-b px-3 py-2">
        <div className="text-muted-foreground min-w-0 truncate font-mono text-[10px] tracking-[0.08em]">
          {codeFilename(title)}
        </div>
        <div className="flex shrink-0 gap-1.5">
          <Button variant="ghost" size="sm" onClick={copyCode}>
            <Copy /> {copy.copyCode}
          </Button>
          <Button variant="ghost" size="sm" onClick={downloadCode}>
            <Download /> {copy.downloadCode}
          </Button>
        </div>
      </div>
      <pre
        className={cn('overflow-auto py-3 text-xs leading-6', maxHeightClass)}
      >
        <code className="block min-w-max font-mono">
          {code.split('\n').map((line, lineIndex) => (
            <span key={lineIndex} className="flex min-h-6">
              <span className="text-muted-foreground/65 sticky left-0 w-12 shrink-0 border-r bg-[color-mix(in_oklab,var(--muted)_92%,var(--background))] pr-3 text-right select-none">
                {lineIndex + 1}
              </span>
              <span className="px-4 whitespace-pre">
                {highlightPythonLine(line, lineIndex)}
              </span>
            </span>
          ))}
        </code>
      </pre>
    </div>
  );
}

function ArtifactPipeline({
  detail,
  copy,
}: {
  detail?: AnimationDetail;
  copy: CreatorWorkspaceCopy;
}) {
  const stages = [
    copy.pipelineSpec,
    copy.pipelineApprove,
    copy.pipelineProcess,
    copy.pipelineDone,
  ];
  const status = detail?.status;
  const activeIndex =
    status === 'completed'
      ? 3
      : status === 'generating_code' ||
          status === 'code_ready' ||
          status === 'queued' ||
          status === 'rendering'
        ? 2
        : status === 'awaiting_approval'
          ? 1
          : status === 'failed'
            ? detail?.parts.code
              ? 2
              : detail?.parts.spec
                ? 1
                : 0
            : 0;

  return (
    <ol
      aria-label={copy.pipelineLabel}
      className="bg-background/85 grid grid-cols-4 border-b px-3 py-3"
    >
      {stages.map((stage, index) => {
        const completed = status === 'completed' || index < activeIndex;
        const active = index === activeIndex;
        const failed = status === 'failed' && active;
        return (
          <li
            key={stage}
            aria-current={active ? 'step' : undefined}
            className="relative flex min-w-0 flex-col items-center gap-1.5 text-center"
          >
            {index > 0 && (
              <span
                className={cn(
                  'absolute top-3 right-1/2 h-px w-full -translate-y-1/2',
                  completed || active ? 'bg-primary/55' : 'bg-border'
                )}
              />
            )}
            <span
              className={cn(
                'bg-background relative z-10 flex size-6 items-center justify-center rounded-full border font-mono text-[9px]',
                completed &&
                  'border-primary bg-primary text-primary-foreground',
                active &&
                  !failed &&
                  !completed &&
                  'border-primary text-primary',
                failed && 'border-destructive text-destructive'
              )}
            >
              {completed ? <Check className="size-3.5" /> : index + 1}
            </span>
            <span
              className={cn(
                'max-w-full truncate text-[10px] font-medium',
                active || completed
                  ? failed
                    ? 'text-destructive'
                    : 'text-foreground'
                  : 'text-muted-foreground'
              )}
            >
              {stage}
            </span>
          </li>
        );
      })}
    </ol>
  );
}

function SpecificationView({
  detail,
  copy,
}: {
  detail: AnimationDetail;
  copy: CreatorWorkspaceCopy;
}) {
  const spec = detail.parts.spec;
  if (!spec) return null;
  return (
    <div className="space-y-5">
      <div>
        <h2 className="curvg-heading text-2xl">{spec.title}</h2>
        <p className="text-muted-foreground mt-2 leading-7">{spec.summary}</p>
        <div className="mt-3 flex flex-wrap gap-2">
          <Badge variant="secondary">
            <Clock3 /> {copy.duration}: {spec.durationSeconds}s
          </Badge>
          <Badge variant="outline">
            {copy.scenes}: {spec.scenes.length}
          </Badge>
          {detail.parts.versions.length > 0 && (
            <Badge variant="outline">
              {copy.versions}: {detail.parts.versions.length}
            </Badge>
          )}
        </div>
      </div>

      {(spec.formulas.length > 0 || spec.assumptions.length > 0) && (
        <div className="grid gap-4">
          {spec.formulas.length > 0 && (
            <section className="bg-muted/45 rounded-lg border p-4">
              <h3 className="mb-2 text-sm font-semibold">{copy.formulas}</h3>
              <div className="space-y-2">
                {spec.formulas.map((formula) => (
                  <div
                    key={formula}
                    className="bg-background overflow-x-auto rounded-lg border px-3 py-2 font-mono text-sm"
                  >
                    {formula}
                  </div>
                ))}
              </div>
            </section>
          )}
          {spec.assumptions.length > 0 && (
            <section className="bg-muted/45 rounded-lg border p-4">
              <h3 className="mb-2 text-sm font-semibold">{copy.assumptions}</h3>
              <StringList items={spec.assumptions} />
            </section>
          )}
        </div>
      )}

      <section className="rounded-lg border p-4">
        <h3 className="mb-3 text-sm font-semibold">{copy.visualStyle}</h3>
        <div className="text-muted-foreground grid gap-3 text-sm sm:grid-cols-3">
          <div>{spec.style.background}</div>
          <div>{spec.style.palette.join(', ')}</div>
          <div>{spec.style.camera}</div>
        </div>
      </section>

      {spec.layout && (
        <section className="rounded-lg border p-4">
          <h3 className="mb-3 text-sm font-semibold">{copy.layout}</h3>
          <pre className="bg-muted/45 overflow-x-auto rounded-lg border p-4 font-mono text-xs leading-6 whitespace-pre">
            {spec.layout}
          </pre>
        </section>
      )}

      {spec.areas && spec.areas.length > 0 && (
        <section className="overflow-hidden rounded-lg border">
          <h3 className="border-b px-4 py-3 text-sm font-semibold">
            {copy.areas}
          </h3>
          <div className="divide-y">
            {spec.areas.map((area) => (
              <div
                key={`${area.name}-${area.content}`}
                className="grid gap-2 px-4 py-3 text-sm sm:grid-cols-[9rem_1fr_1fr]"
              >
                <div className="font-semibold">{area.name}</div>
                <div className="text-muted-foreground leading-6">
                  {area.content}
                </div>
                <div className="text-muted-foreground leading-6">
                  {area.implementation}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {((spec.dependencies?.length || 0) > 0 ||
        (spec.notes?.length || 0) > 0) && (
        <div className="grid gap-4 sm:grid-cols-2">
          {(spec.dependencies?.length || 0) > 0 && (
            <section className="bg-muted/45 rounded-lg border p-4">
              <h3 className="mb-2 text-sm font-semibold">
                {copy.dependencies}
              </h3>
              <StringList items={spec.dependencies || []} />
            </section>
          )}
          {(spec.notes?.length || 0) > 0 && (
            <section className="bg-muted/45 rounded-lg border p-4">
              <h3 className="mb-2 text-sm font-semibold">{copy.notes}</h3>
              <StringList items={spec.notes || []} />
            </section>
          )}
        </div>
      )}

      <div className="space-y-3">
        {spec.scenes.map((scene, index) => (
          <section key={scene.id} className="bg-card rounded-lg border p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-muted-foreground text-xs font-semibold tracking-wide uppercase">
                  {copy.scenes} {index + 1}
                </div>
                <h3 className="mt-1 font-semibold">{scene.title}</h3>
              </div>
              <Badge variant="outline">{scene.durationSeconds}s</Badge>
            </div>
            <div className="mt-4 grid gap-4">
              <div>
                <h4 className="mb-1 text-xs font-semibold uppercase">
                  {copy.purpose}
                </h4>
                <p className="text-muted-foreground text-sm leading-6">
                  {scene.purpose}
                </p>
              </div>
              {scene.math.length > 0 && (
                <div>
                  <h4 className="mb-1 text-xs font-semibold uppercase">
                    {copy.math}
                  </h4>
                  <StringList items={scene.math} />
                </div>
              )}
              <div>
                <h4 className="mb-1 text-xs font-semibold uppercase">
                  {copy.visuals}
                </h4>
                <StringList items={scene.visuals} />
              </div>
              <div>
                <h4 className="mb-1 text-xs font-semibold uppercase">
                  {copy.actions}
                </h4>
                <StringList items={scene.actions} />
              </div>
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}

function AnimationPreview({
  detail,
  copy,
  loading = false,
  error = false,
  compact = false,
}: {
  detail?: AnimationDetail;
  copy: CreatorWorkspaceCopy;
  loading?: boolean;
  error?: boolean;
  compact?: boolean;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const fallbackObjectUrlRef = useRef<string | undefined>(undefined);
  const [mediaError, setMediaError] = useState(false);
  const [fallbackLoading, setFallbackLoading] = useState(false);
  const [fallbackVideoUrl, setFallbackVideoUrl] = useState<string>();
  const [playing, setPlaying] = useState(false);
  useEffect(() => {
    if (fallbackObjectUrlRef.current) {
      URL.revokeObjectURL(fallbackObjectUrlRef.current);
      fallbackObjectUrlRef.current = undefined;
    }
    setMediaError(false);
    setFallbackLoading(false);
    setFallbackVideoUrl(undefined);
    setPlaying(false);
  }, [detail?.parts.videoUrl]);
  useEffect(
    () => () => {
      if (fallbackObjectUrlRef.current) {
        URL.revokeObjectURL(fallbackObjectUrlRef.current);
      }
    },
    []
  );
  async function loadFallbackVideo() {
    const video = videoRef.current;
    const sourceUrl = detail?.parts.videoUrl;
    if (!video || !sourceUrl || fallbackLoading) return;
    video.pause();
    setFallbackLoading(true);
    try {
      const blob = await apiGetBlob(sourceUrl);
      if (!blob.type.startsWith('video/')) {
        throw new Error('Artifact is not a video');
      }
      if (fallbackObjectUrlRef.current) {
        URL.revokeObjectURL(fallbackObjectUrlRef.current);
      }
      const objectUrl = URL.createObjectURL(blob);
      fallbackObjectUrlRef.current = objectUrl;
      setFallbackVideoUrl(objectUrl);
      video.src = objectUrl;
      setMediaError(false);
      video.load();
      await video.play();
      setPlaying(!video.paused);
    } catch {
      setMediaError(true);
      setPlaying(false);
    } finally {
      setFallbackLoading(false);
    }
  }
  async function startPlayback() {
    const video = videoRef.current;
    if (!video || fallbackLoading) return;
    setMediaError(false);
    try {
      await video.play();
      setPlaying(!video.paused);
    } catch (error) {
      if (error instanceof DOMException && error.name === 'NotAllowedError') {
        return;
      }
      await loadFallbackVideo();
    }
  }
  const busy = isAnimationBusy(detail?.status);
  const statusLabel = detail ? copy.statuses[detail.status] : copy.video;
  const previewError = error || mediaError;
  const emptyLabel = mediaError
    ? copy.previewPlaybackError
    : error
      ? copy.loadFailed
      : loading
        ? copy.loading
        : busy
          ? copy.statuses[detail!.status]
          : copy.previewEmpty;

  return (
    <section
      aria-label={copy.preview}
      className={cn(
        'bg-muted/25 flex min-h-0 flex-col',
        compact ? 'h-[420px] rounded-2xl border sm:h-[520px]' : 'size-full'
      )}
    >
      <div className="bg-background/92 flex h-14 shrink-0 items-center gap-3 border-b px-4">
        <span className="text-primary border-primary/20 bg-primary/5 flex size-8 items-center justify-center rounded-xl border">
          <MonitorPlay className="size-4" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="truncate text-sm font-semibold">{copy.preview}</div>
          <div className="text-muted-foreground mt-0.5 truncate font-mono text-[9px] tracking-[0.1em] uppercase">
            {statusLabel}
          </div>
        </div>
        {detail && (
          <Badge variant="outline" className="shrink-0">
            {detail.parts.spec?.durationSeconds
              ? `${detail.parts.spec.durationSeconds}s`
              : detail.subject}
          </Badge>
        )}
      </div>

      <div className="min-h-0 flex-1 p-3 sm:p-4">
        <div className="relative flex size-full min-h-64 items-center justify-center overflow-hidden rounded-2xl border border-white/10 bg-[#0b0d14] shadow-[0_24px_80px_-48px_rgba(0,0,0,0.9)]">
          <div className="curvg-coordinate-grid pointer-events-none absolute inset-0 opacity-[0.12]" />
          <div className="from-primary/10 pointer-events-none absolute inset-x-0 top-0 h-28 bg-gradient-to-b to-transparent" />

          {detail?.parts.videoUrl ? (
            <>
              <video
                ref={videoRef}
                className="relative z-10 max-h-full w-full bg-black object-contain"
                src={fallbackVideoUrl || detail.parts.videoUrl}
                poster={detail.parts.thumbnailUrl}
                controls
                muted
                playsInline
                preload="metadata"
                onLoadedMetadata={() => setMediaError(false)}
                onPlay={() => setPlaying(true)}
                onPause={() => setPlaying(false)}
                onEnded={() => setPlaying(false)}
                onError={(event) => {
                  if (event.currentTarget.error && !fallbackLoading) {
                    setMediaError(true);
                    setPlaying(false);
                  }
                }}
              />
              {!playing && !mediaError && (
                <button
                  type="button"
                  aria-label={copy.playPreview}
                  onClick={() => void startPlayback()}
                  disabled={fallbackLoading}
                  className="focus-visible:ring-primary absolute z-20 flex size-16 items-center justify-center rounded-full border border-white/20 bg-black/65 text-white shadow-2xl backdrop-blur-sm transition hover:scale-105 hover:bg-black/80 focus-visible:ring-2 focus-visible:outline-none"
                >
                  {fallbackLoading ? (
                    <LoaderCircle className="size-7 animate-spin" />
                  ) : (
                    <Play className="ml-1 size-7 fill-current" />
                  )}
                </button>
              )}
              {mediaError && (
                <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-black/75 px-6 text-center text-white backdrop-blur-sm">
                  <AlertCircle className="text-destructive size-8" />
                  <p className="mt-3 max-w-sm text-sm font-medium">
                    {copy.previewPlaybackError}
                  </p>
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    className="mt-4"
                    onClick={() => void startPlayback()}
                  >
                    {copy.retryPlayback}
                  </Button>
                </div>
              )}
            </>
          ) : detail?.parts.thumbnailUrl && !mediaError ? (
            <img
              src={detail.parts.thumbnailUrl}
              alt={detail.title}
              className="relative z-10 max-h-full w-full object-contain"
            />
          ) : (
            <div className="relative z-10 mx-auto flex max-w-sm flex-col items-center px-6 text-center text-white">
              {busy || loading ? (
                <span className="relative flex size-24 items-center justify-center">
                  <span className="border-primary/20 border-t-primary absolute inset-0 animate-spin rounded-full border [animation-duration:2.4s] motion-reduce:animate-none" />
                  <span className="absolute inset-3 animate-spin rounded-full border border-white/10 border-b-white/55 [animation-direction:reverse] [animation-duration:1.7s] motion-reduce:animate-none" />
                  <span className="bg-primary/12 border-primary/25 text-primary flex size-12 items-center justify-center rounded-2xl border shadow-[0_0_42px_-12px_color-mix(in_oklab,var(--primary)_80%,transparent)]">
                    <Film className="size-5" />
                  </span>
                  <span className="bg-primary absolute top-1/2 -right-0.5 size-2 -translate-y-1/2 rounded-full shadow-[0_0_16px_var(--primary)]" />
                </span>
              ) : (
                <span className="flex size-14 items-center justify-center rounded-2xl border border-white/12 bg-white/[0.06]">
                  {previewError ? (
                    <AlertCircle className="text-destructive size-6" />
                  ) : (
                    <Film className="size-6" />
                  )}
                </span>
              )}
              <p className="mt-4 text-sm font-medium">{emptyLabel}</p>
              {detail?.parts.spec?.formulas[0] && (
                <code className="mt-4 max-w-full overflow-hidden rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2 font-mono text-xs text-white/65">
                  {detail.parts.spec.formulas[0]}
                </code>
              )}
              {(busy || loading) && (
                <Progress
                  className="mt-5 w-56 bg-white/10"
                  value={detail ? progressByStatus[detail.status] : 12}
                />
              )}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

function ArtifactInspector({
  detail,
  copy,
  loading = false,
  error = false,
  compact = false,
}: {
  detail?: AnimationDetail;
  copy: CreatorWorkspaceCopy;
  loading?: boolean;
  error?: boolean;
  compact?: boolean;
}) {
  const [tab, setTab] = useState<ArtifactTab>(() =>
    preferredArtifactTab(detail)
  );
  const previousStateRef = useRef('');

  useEffect(() => {
    const stateKey = `${detail?.id || 'empty'}:${detail?.status || 'idle'}`;
    if (stateKey === previousStateRef.current) return;
    previousStateRef.current = stateKey;
    setTab(preferredArtifactTab(detail));
  }, [detail?.id, detail?.status]);

  return (
    <section
      aria-label={copy.preview}
      className={cn(
        'bg-muted/20 flex min-h-0 flex-col overflow-hidden',
        compact ? 'h-[560px] rounded-2xl border' : 'size-full'
      )}
    >
      <ArtifactPipeline detail={detail} copy={copy} />
      <Tabs
        value={tab}
        onValueChange={(value) =>
          setTab((value || preferredArtifactTab(detail)) as ArtifactTab)
        }
        className="min-h-0 flex-1 gap-0"
      >
        <div className="bg-background/92 border-b px-3 pt-2">
          <TabsList
            variant="line"
            aria-label={copy.preview}
            className="grid h-9 w-full grid-cols-3"
          >
            <TabsTrigger value="specification" disabled={!detail?.parts.spec}>
              <Sparkles /> {copy.specification}
            </TabsTrigger>
            <TabsTrigger value="code" disabled={!detail?.parts.code}>
              <Code2 /> {copy.code}
            </TabsTrigger>
            <TabsTrigger value="video">
              <Film /> {copy.video}
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent
          value="specification"
          className="min-h-0 overflow-y-auto p-4 sm:p-5"
        >
          {detail?.parts.spec ? (
            <SpecificationView detail={detail} copy={copy} />
          ) : (
            <div className="text-muted-foreground flex min-h-48 items-center justify-center text-sm">
              {copy.statuses.generating_spec}
            </div>
          )}
        </TabsContent>

        <TabsContent
          value="code"
          className="min-h-0 overflow-hidden p-3 sm:p-4"
        >
          {detail?.parts.code ? (
            <PythonCodeView
              code={detail.parts.code}
              title={detail.title}
              copy={copy}
              maxHeightClass="max-h-full"
            />
          ) : (
            <div className="text-muted-foreground flex min-h-48 items-center justify-center text-sm">
              {copy.noCode}
            </div>
          )}
        </TabsContent>

        <TabsContent value="video" className="min-h-0 overflow-hidden">
          <AnimationPreview
            detail={detail}
            copy={copy}
            loading={loading}
            error={error}
          />
        </TabsContent>
      </Tabs>
    </section>
  );
}

function ResultPanel({
  detail,
  copy,
  approving,
  onApprove,
}: {
  detail: AnimationDetail;
  copy: CreatorWorkspaceCopy;
  approving: boolean;
  onApprove: () => void;
}) {
  const [tab, setTab] = useState('specification');
  const canApprove =
    !!detail.parts.spec &&
    ['awaiting_approval', 'code_ready', 'failed'].includes(detail.status);

  if (!detail.parts.spec && !detail.parts.code) {
    return null;
  }

  return (
    <div className="bg-card overflow-hidden rounded-xl border">
      <div className="flex flex-col gap-3 border-b px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="text-sm font-semibold">{copy.specification}</div>
          <p className="text-muted-foreground mt-0.5 text-xs">
            {copy.approvalDescription}
          </p>
        </div>
        {canApprove && (
          <Button onClick={onApprove} disabled={approving}>
            {approving ? (
              <LoaderCircle className="animate-spin motion-reduce:animate-none" />
            ) : (
              <Check />
            )}
            {detail.status === 'code_ready' ? copy.retryRender : copy.approve}
          </Button>
        )}
      </div>
      <Tabs
        value={tab}
        onValueChange={(value) => setTab(value || 'specification')}
        className="flex-col"
      >
        <div className="border-b px-4 pt-2">
          <TabsList variant="line">
            <TabsTrigger value="specification">
              <Sparkles /> {copy.specification}
            </TabsTrigger>
            <TabsTrigger value="code">
              <Code2 /> {copy.code}
            </TabsTrigger>
          </TabsList>
        </div>
        <TabsContent value="specification" className="p-4 sm:p-5">
          <SpecificationView detail={detail} copy={copy} />
        </TabsContent>
        <TabsContent value="code" className="p-4 sm:p-5">
          {detail.parts.code ? (
            <PythonCodeView
              code={detail.parts.code}
              title={detail.title}
              copy={copy}
            />
          ) : (
            <div className="text-muted-foreground py-16 text-center text-sm">
              {copy.noCode}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

export function CreatorWorkspace({
  copy,
  locale,
  initialAnimationId,
}: {
  copy: CreatorWorkspaceCopy;
  locale: string;
  initialAnimationId?: string;
}) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { data: session, isPending: sessionPending } = useSession();
  const user = session?.user;
  const [selectedId, setSelectedId] = useState(initialAnimationId);
  const [prompt, setPrompt] = useState('');
  const [subject, setSubject] = useState<AnimationSubject>('general');
  const [modelValue, setModelValue] = useState('auto');
  const [historyOpen, setHistoryOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [hydrated, setHydrated] = useState(false);
  const [streamingAnimationId, setStreamingAnimationId] = useState<string>();
  const [streamingText, setStreamingText] = useState('');
  const [pendingAnimation, setPendingAnimation] = useState<AnimationDetail>();
  const hasHydratedUser = hydrated && !!user;
  const messageEndRef = useRef<HTMLDivElement>(null);
  const previousMessageCountRef = useRef<number | undefined>(undefined);
  const generationStartedRef = useRef(false);

  const listQuery = useQuery({
    queryKey: ['animations'],
    queryFn: () => apiGet<AnimationSummary[]>('/api/animations'),
    enabled: !!user,
  });

  const modelsQuery = useQuery({
    queryKey: ['animation-models'],
    queryFn: () => apiGet<AnimationModelCatalog>('/api/animations/models'),
    enabled: !!user,
    staleTime: 60_000,
  });

  const detailQuery = useQuery({
    queryKey: ['animation', selectedId],
    queryFn: () => apiGet<AnimationDetail>(`/api/animations/${selectedId}`),
    enabled: !!user && !!selectedId && !pendingAnimation,
    refetchInterval: (query) =>
      isAnimationBusy(query.state.data?.status) ? 2500 : false,
  });
  const detail = pendingAnimation || detailQuery.data;
  const detailLoading =
    !hydrated || sessionPending || (!pendingAnimation && detailQuery.isLoading);
  const catalog = modelsQuery.data;
  const curatedModelOptions: CreatorModelOption[] = CURATED_MODEL_PRESETS.map(
    (preset) => {
      const match = catalog?.options.find(
        (option) =>
          option.provider === 'yunwu' && preset.models.includes(option.model)
      );
      const content = copy.curatedModels[preset.key];
      return {
        value: match
          ? animationModelValue(match.provider, match.model)
          : `unavailable:${preset.key}`,
        label: content.label,
        description: content.description,
        presetKey: preset.key,
        badge: preset.pro ? copy.modelPro : undefined,
        disabled: !match,
      };
    }
  );
  const autoModelValue =
    curatedModelOptions.find(
      (option) => option.presetKey === 'qwen3Coder' && !option.disabled
    )?.value || curatedModelOptions.find((option) => !option.disabled)?.value;
  const modelOptions: CreatorModelOption[] = [
    {
      value: 'auto',
      label: copy.modelAuto,
      description: copy.modelAutoDescription,
      disabled: !modelsQuery.isLoading && !autoModelValue,
    },
    ...curatedModelOptions,
  ];
  const detailModelValue =
    detail && isModelProvider(detail.provider)
      ? animationModelValue(detail.provider, detail.model)
      : undefined;
  const resolvedDetailModelValue = modelOptions.some(
    (option) => option.value === detailModelValue && !option.disabled
  )
    ? detailModelValue
    : undefined;
  const detailModelPresetKey = detail
    ? CURATED_MODEL_PRESETS.find((preset) =>
        preset.models.includes(detail.model)
      )?.key
    : undefined;
  const displayedDetailModel = detailModelPresetKey
    ? copy.curatedModels[detailModelPresetKey].label
    : detail?.model;

  useEffect(() => {
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (detail?.subject) setSubject(detail.subject);
  }, [detail?.subject]);

  useEffect(() => {
    if (detail) setModelValue(resolvedDetailModelValue || 'auto');
  }, [detail?.id, resolvedDetailModelValue]);

  useEffect(() => {
    const count = detail?.messages.length;
    if (count === undefined) return;
    if (
      previousMessageCountRef.current !== undefined &&
      count > previousMessageCountRef.current
    ) {
      messageEndRef.current?.scrollIntoView({
        behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches
          ? 'auto'
          : 'smooth',
        block: 'center',
      });
    }
    previousMessageCountRef.current = count;
  }, [detail?.messages.length]);

  useEffect(() => {
    if (!streamingAnimationId) return;
    messageEndRef.current?.scrollIntoView({ block: 'nearest' });
  }, [streamingAnimationId, streamingText]);

  useEffect(() => {
    setSidebarCollapsed(
      window.localStorage.getItem('creator-sidebar-collapsed') === 'true'
    );
  }, []);

  function toggleSidebar() {
    setSidebarCollapsed((current) => {
      const next = !current;
      window.localStorage.setItem('creator-sidebar-collapsed', String(next));
      return next;
    });
  }

  function acceptDetail(next: AnimationDetail) {
    setPendingAnimation(undefined);
    setSelectedId(next.id);
    setPrompt('');
    queryClient.setQueryData(['animation', next.id], next);
    queryClient.invalidateQueries({ queryKey: ['animations'] });
    router.replace(`/creator?animationId=${encodeURIComponent(next.id)}`);
  }

  function selectedModelRequest() {
    return parseAnimationModelValue(
      modelValue === 'auto' ? autoModelValue || 'auto' : modelValue
    );
  }

  async function streamGeneration(url: string, body: unknown) {
    generationStartedRef.current = false;
    let completed: AnimationDetail | undefined;
    let streamError: Error | undefined;
    await apiPostEventStream<AnimationGenerationEvent>(url, body, (event) => {
      if (event.type === 'started') {
        generationStartedRef.current = true;
        setStreamingAnimationId(event.animation.id);
        setStreamingText('');
        acceptDetail(event.animation);
      } else if (event.type === 'delta') {
        setStreamingText((current) => current + event.delta);
      } else if (event.type === 'completed') {
        completed = event.animation;
        acceptDetail(event.animation);
        setStreamingAnimationId(undefined);
        setStreamingText('');
      } else {
        streamError = new Error(event.message);
        setStreamingAnimationId(undefined);
        setStreamingText('');
      }
    });
    if (streamError) throw streamError;
    if (!completed) throw new Error(copy.loadFailed);
    return completed;
  }

  function beginOptimisticCreation(request: CreatorGenerationRequest) {
    const now = new Date().toISOString();
    const id = `pending-${Date.now()}`;
    const animation: AnimationDetail = {
      id,
      title: request.prompt.slice(0, 80),
      status: 'generating_spec',
      model: request.model || copy.modelAuto,
      provider: request.modelChoice,
      subject: request.subject,
      prompt: request.prompt,
      createdAt: now,
      updatedAt: now,
      parts: {
        subject: request.subject,
        prompt: request.prompt,
        versions: [],
      },
      messages: [
        {
          id: `${id}-user`,
          role: 'user',
          content: request.prompt,
          status: 'completed',
          createdAt: now,
        },
      ],
    };
    setPendingAnimation(animation);
    setSelectedId(id);
    setPrompt('');
    setStreamingAnimationId(id);
    setStreamingText('');
  }

  function beginOptimisticRevision(request: CreatorGenerationRequest) {
    if (!detail) return;
    const now = new Date().toISOString();
    queryClient.setQueryData<AnimationDetail>(['animation', detail.id], {
      ...detail,
      status: 'generating_spec',
      prompt: request.prompt,
      updatedAt: now,
      parts: {
        ...detail.parts,
        prompt: request.prompt,
        error: undefined,
      },
      messages: [
        ...detail.messages,
        {
          id: `pending-message-${Date.now()}`,
          role: 'user',
          content: request.prompt,
          status: 'completed',
          createdAt: now,
        },
      ],
    });
    setPrompt('');
    setStreamingAnimationId(detail.id);
    setStreamingText('');
  }

  const createMutation = useMutation({
    mutationFn: (request: CreatorGenerationRequest) => {
      return streamGeneration('/api/animations', {
        ...request,
      });
    },
    onSuccess: acceptDetail,
    onError: (error: Error, request) => {
      if (!generationStartedRef.current) {
        setSelectedId(undefined);
        router.replace('/creator');
      }
      setPendingAnimation(undefined);
      setPrompt(request.prompt);
      setStreamingAnimationId(undefined);
      setStreamingText('');
      generationStartedRef.current = false;
      queryClient.invalidateQueries({ queryKey: ['animations'] });
      toast.error(error.message);
    },
  });

  const reviseMutation = useMutation({
    mutationFn: (request: CreatorGenerationRequest) => {
      return streamGeneration(`/api/animations/${selectedId}/message`, {
        prompt: request.prompt,
        modelChoice: request.modelChoice,
        model: request.model,
      });
    },
    onSuccess: acceptDetail,
    onError: (error: Error, request) => {
      setPrompt(request.prompt);
      setStreamingAnimationId(undefined);
      setStreamingText('');
      generationStartedRef.current = false;
      queryClient.invalidateQueries({ queryKey: ['animation', selectedId] });
      queryClient.invalidateQueries({ queryKey: ['animations'] });
      toast.error(error.message);
    },
  });

  const approveMutation = useMutation({
    mutationFn: () => {
      const model = selectedModelRequest();
      return apiPost<AnimationDetail>(
        `/api/animations/${selectedId}/approve`,
        model
      );
    },
    onSuccess: acceptDetail,
    onError: (error: Error) => {
      queryClient.invalidateQueries({ queryKey: ['animation', selectedId] });
      queryClient.invalidateQueries({ queryKey: ['animations'] });
      toast.error(error.message);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiDelete(`/api/animations/${id}`),
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: ['animations'] });
      queryClient.removeQueries({ queryKey: ['animation', id] });
      if (selectedId === id) startNew();
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const processing =
    createMutation.isPending ||
    reviseMutation.isPending ||
    approveMutation.isPending ||
    isAnimationBusy(detail?.status);

  function startNew() {
    setPendingAnimation(undefined);
    setSelectedId(undefined);
    setPrompt('');
    setSubject('general');
    setModelValue('auto');
    setStreamingAnimationId(undefined);
    setStreamingText('');
    generationStartedRef.current = false;
    setHistoryOpen(false);
    router.replace('/creator');
  }

  function selectAnimation(id: string) {
    setPendingAnimation(undefined);
    setSelectedId(id);
    setStreamingAnimationId(undefined);
    setStreamingText('');
    generationStartedRef.current = false;
    setHistoryOpen(false);
    router.replace(`/creator?animationId=${encodeURIComponent(id)}`);
  }

  function remove(id: string) {
    if (window.confirm(copy.deleteConfirm)) deleteMutation.mutate(id);
  }

  function submit(event: React.FormEvent) {
    event.preventDefault();
    if (sessionPending) return;
    if (!user) {
      router.push('/sign-in?callbackUrl=/creator');
      return;
    }
    if (!prompt.trim() || processing) return;
    const request: CreatorGenerationRequest = {
      prompt: prompt.trim(),
      subject,
      ...selectedModelRequest(),
    };
    if (detail) {
      beginOptimisticRevision(request);
      reviseMutation.mutate(request);
    } else {
      beginOptimisticCreation(request);
      createMutation.mutate(request);
    }
  }

  const history = listQuery.data ?? [];
  const workspaceStatus = detail
    ? copy.statuses[detail.status]
    : detailLoading
      ? copy.loading
      : copy.loadFailed;

  if (!hydrated || sessionPending) {
    return (
      <div className="bg-background text-muted-foreground flex min-h-svh items-center justify-center gap-2 text-sm">
        <LoaderCircle className="text-primary size-4 animate-spin motion-reduce:animate-none" />
        {copy.loading}
      </div>
    );
  }

  if (!user) {
    return (
      <div className="curvg-stage curvg-frame bg-background flex min-h-svh">
        <Welcome
          copy={copy}
          prompt={prompt}
          onPromptChange={setPrompt}
          onSubmit={submit}
          subject={subject}
          onSubjectChange={setSubject}
          modelValue={modelValue}
          modelOptions={modelOptions}
          modelsLoading={modelsQuery.isLoading}
          onModelChange={setModelValue}
          processing={processing}
          user={false}
        />
      </div>
    );
  }

  if (!selectedId) {
    return (
      <div className="bg-background flex h-svh min-h-0 w-full overflow-hidden">
        <WorkspaceSidebarChrome
          copy={copy}
          history={history}
          selectedId={selectedId}
          locale={locale}
          collapsed={sidebarCollapsed}
          historyOpen={historyOpen}
          onToggleCollapsed={toggleSidebar}
          onHistoryOpenChange={setHistoryOpen}
          onCreate={startNew}
          onSelect={selectAnimation}
          onDelete={remove}
        />
        <section className="flex min-w-0 flex-1 flex-col">
          <div className="bg-background/95 z-30 flex h-14 shrink-0 items-center gap-3 border-b px-3 lg:hidden">
            <Button
              variant="ghost"
              size="icon"
              className="size-11"
              onClick={() => setHistoryOpen(true)}
              aria-label={copy.openHistory}
            >
              <Menu />
            </Button>
            <div className="min-w-0 flex-1">
              <div className="truncate text-sm font-semibold">{copy.title}</div>
              <div className="text-muted-foreground mt-0.5 truncate font-mono text-[9px] tracking-[0.12em] uppercase">
                {copy.workspaceLabel}
              </div>
            </div>
          </div>
          <Welcome
            copy={copy}
            prompt={prompt}
            onPromptChange={setPrompt}
            onSubmit={submit}
            subject={subject}
            onSubjectChange={setSubject}
            modelValue={modelValue}
            modelOptions={modelOptions}
            modelsLoading={modelsQuery.isLoading}
            onModelChange={setModelValue}
            processing={processing}
            user
          />
        </section>
      </div>
    );
  }

  return (
    <div className="bg-background flex h-svh min-h-0 w-full overflow-hidden">
      <WorkspaceSidebarChrome
        copy={copy}
        history={history}
        selectedId={selectedId}
        locale={locale}
        collapsed={sidebarCollapsed}
        historyOpen={historyOpen}
        onToggleCollapsed={toggleSidebar}
        onHistoryOpenChange={setHistoryOpen}
        onCreate={startNew}
        onSelect={selectAnimation}
        onDelete={remove}
      />

      <section className="flex min-w-0 flex-1 flex-col">
        <div className="bg-background/95 z-30 flex h-14 shrink-0 items-center gap-3 border-b px-3 md:px-5">
          <Button
            variant="ghost"
            size="icon"
            className="size-11 lg:hidden"
            onClick={() => setHistoryOpen(true)}
            aria-label={copy.openHistory}
          >
            <Menu />
          </Button>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <span className="text-primary font-mono text-[9px] tracking-[0.12em] uppercase">
                {copy.sectionLabel}
              </span>
              <span className="text-muted-foreground">·</span>
              <div className="truncate text-sm font-semibold">
                {detail?.title || copy.title}
              </div>
            </div>
            <div className="text-muted-foreground mt-0.5 truncate text-xs">
              {workspaceStatus}
            </div>
          </div>
          {detail && (
            <Badge variant="outline" className="hidden sm:inline-flex">
              {displayedDetailModel}
            </Badge>
          )}
          <Button
            variant="outline"
            size="sm"
            className="h-11 lg:hidden"
            onClick={startNew}
            aria-label={copy.newAnimation}
          >
            <Plus />{' '}
            <span className="hidden sm:inline">{copy.newAnimation}</span>
          </Button>
        </div>

        <div className="flex min-h-0 flex-1 overflow-hidden">
          <section
            aria-label={copy.conversation}
            className="bg-muted/10 flex min-w-0 flex-1 flex-col xl:w-[38%] xl:flex-none"
          >
            <div className="min-h-0 flex-1 overflow-y-auto">
              {detailLoading ? (
                <div className="text-muted-foreground flex min-h-full items-center justify-center gap-2 text-sm">
                  <LoaderCircle className="animate-spin motion-reduce:animate-none" />{' '}
                  {copy.loading}
                </div>
              ) : detailQuery.isError || !detail ? (
                <div className="text-destructive flex min-h-full items-center justify-center gap-2 text-sm">
                  <AlertCircle /> {copy.loadFailed}
                </div>
              ) : (
                <div className="mx-auto w-full max-w-3xl space-y-5 px-4 py-6 sm:px-6 sm:py-8">
                  <div className="flex items-center gap-3 border-b pb-4">
                    <span className="text-primary border-primary/20 bg-primary/5 flex size-8 items-center justify-center rounded-full border">
                      <MessageSquareText className="size-4" />
                    </span>
                    <div>
                      <p className="text-muted-foreground font-mono text-[9px] tracking-[0.12em] uppercase">
                        {copy.conversationEyebrow}
                      </p>
                      <h1 className="mt-0.5 text-sm font-semibold">
                        {copy.conversation}
                      </h1>
                    </div>
                  </div>
                  <div
                    className="space-y-5"
                    aria-live="polite"
                    aria-relevant="additions text"
                  >
                    {detail.messages.map((message) => (
                      <div
                        key={message.id}
                        className={cn(
                          'flex items-start gap-2.5',
                          message.role === 'user'
                            ? 'justify-end'
                            : 'justify-start'
                        )}
                      >
                        <div
                          className={cn(
                            'max-w-[90%] rounded-xl border px-4 py-3 text-sm leading-6 sm:max-w-[84%]',
                            message.role === 'user'
                              ? 'border-primary/25 bg-primary/5'
                              : message.status === 'failed'
                                ? 'border-destructive/25 bg-destructive/5 text-destructive'
                                : 'bg-card'
                          )}
                        >
                          <div
                            className={cn(
                              'mb-1.5 font-mono text-[9px] tracking-[0.12em] uppercase',
                              message.role === 'user'
                                ? 'text-primary'
                                : message.status === 'failed'
                                  ? 'text-destructive'
                                  : 'text-muted-foreground'
                            )}
                          >
                            {message.role === 'user'
                              ? copy.userLabel
                              : copy.assistantLabel}
                          </div>
                          {message.content}
                        </div>
                      </div>
                    ))}
                    {streamingAnimationId === detail.id && (
                      <div className="flex items-start justify-start gap-2.5">
                        <div className="bg-card max-w-[90%] rounded-xl border px-4 py-3 text-sm leading-6 sm:max-w-[84%]">
                          <div className="text-muted-foreground mb-1.5 font-mono text-[9px] tracking-[0.12em] uppercase">
                            {copy.assistantLabel}
                          </div>
                          {streamingText ? (
                            <p className="whitespace-pre-wrap">
                              {streamingText}
                              <span className="bg-primary ml-1 inline-block h-4 w-0.5 translate-y-0.5 animate-pulse motion-reduce:animate-none" />
                            </p>
                          ) : (
                            <span className="text-muted-foreground inline-flex items-center gap-2">
                              <LoaderCircle className="text-primary size-3.5 animate-spin motion-reduce:animate-none" />
                              {copy.statuses.generating_spec}
                            </span>
                          )}
                        </div>
                      </div>
                    )}
                    <div ref={messageEndRef} />
                  </div>
                  <StatusPanel detail={detail} copy={copy} />
                  <ResultPanel
                    detail={detail}
                    copy={copy}
                    approving={approveMutation.isPending}
                    onApprove={() => approveMutation.mutate()}
                  />
                  <div className="xl:hidden">
                    <ArtifactInspector detail={detail} copy={copy} compact />
                  </div>
                </div>
              )}
            </div>

            <div className="bg-background/96 shrink-0 border-t px-3 py-3 sm:px-5">
              <PromptComposer
                copy={copy}
                prompt={prompt}
                onPromptChange={setPrompt}
                onSubmit={submit}
                subject={subject}
                onSubjectChange={setSubject}
                modelValue={modelValue}
                modelOptions={modelOptions}
                modelsLoading={modelsQuery.isLoading}
                onModelChange={setModelValue}
                processing={processing}
                hasDetail={!!detail}
                user={hasHydratedUser}
                className="mx-auto max-w-3xl"
              />
            </div>
          </section>

          <aside
            aria-label={copy.preview}
            className="hidden min-w-0 flex-1 border-l xl:flex"
          >
            <ArtifactInspector
              detail={detail}
              copy={copy}
              loading={detailLoading}
              error={detailQuery.isError}
            />
          </aside>
        </div>
      </section>
    </div>
  );
}
