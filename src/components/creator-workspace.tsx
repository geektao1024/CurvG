import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  AlertCircle,
  ArrowUp,
  Box,
  Check,
  ChevronRight,
  Clock3,
  Code2,
  Coins,
  Copy,
  Download,
  Ellipsis,
  Film,
  FunctionSquare,
  History,
  LayoutGrid,
  Lightbulb,
  ListTree,
  LoaderCircle,
  Menu,
  MessageSquareText,
  PanelLeftClose,
  PanelLeftOpen,
  PencilLine,
  Play,
  Plus,
  Sparkles,
  SquareSigma,
  Trash2,
  X,
} from 'lucide-react';
import { toast } from 'sonner';

import { useSession } from '@/core/auth/client';
import { Link, useRouter } from '@/core/i18n/navigation';
import { envConfigs } from '@/config';
import {
  animationFailureCodeFromHttpStatus,
  animationModelValue,
  isAnimationBusy,
  isAnimationSpecDirected,
  isAnimationSpecRenderable,
  isAnimationSpecV4,
  parseAnimationModelValue,
  type AnimationCreationMode,
  type AnimationDetail,
  type AnimationFailure,
  type AnimationFailureCode,
  type AnimationGenerationEvent,
  type AnimationMathObjectType,
  type AnimationMessage,
  type AnimationModelCatalog,
  type AnimationModelProvider,
  type AnimationPlanningPhase,
  type AnimationPlanningPipeline,
  type AnimationPlanningStageName,
  type AnimationStatus,
  type AnimationSubject,
  type AnimationSummary,
} from '@/lib/animation';
import type { AnimationTemplateSummary } from '@/lib/animation-template';
import {
  apiDelete,
  ApiError,
  apiGet,
  apiGetBlob,
  apiPatch,
  apiPost,
  apiPostEventStream,
} from '@/lib/api-client';
import { detectMathObjectType } from '@/lib/math-preview';
import { cn } from '@/lib/utils';
import { MathFormulaPreview } from '@/components/math-formula-preview';
import { PixelRevealLink } from '@/components/pixel-reveal-link';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
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
  requiredTier?: 'free' | 'starter' | 'pro';
  disabled?: boolean;
  locked?: boolean;
}

interface CreatorGenerationRequest {
  prompt: string;
  subject: AnimationSubject;
  mode: AnimationCreationMode;
  formula?: string;
  intent?: string;
  mathObjectType?: AnimationMathObjectType;
  templateId?: string;
  values?: Record<string, string>;
  modelChoice: ReturnType<typeof parseAnimationModelValue>['modelChoice'];
  model?: string;
}

export type CreatorCuratedModelKey = 'kuaipaoGpt56Sol';

interface CreatorCuratedModelPreset {
  key: CreatorCuratedModelKey;
  provider: AnimationModelProvider;
  models: string[];
  tier: 'free' | 'starter' | 'pro';
}

const CURATED_MODEL_PRESETS: CreatorCuratedModelPreset[] = [
  {
    key: 'kuaipaoGpt56Sol',
    provider: 'kuaipao',
    models: ['gpt-5.6-sol'],
    tier: 'free',
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
  userCenter: string;
  credits: string;
  guestNavigation: string;
  viewPricing: string;
  signIn: string;
  moreActions: string;
  renameAnimation: string;
  renamePlaceholder: string;
  renameSave: string;
  renameCancel: string;
  renameEmpty: string;
  renameTooLong: string;
  deleteAnimation: string;
  deleteConfirm: (title: string) => string;
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
  retryPlan: string;
  retryCode: string;
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
  planningEyebrow: string;
  planningTitle: string;
  planningDescription: string;
  planningSemanticMap: string;
  planningLiveSummary: string;
  planningPhases: Record<AnimationPlanningPhase, string>;
  planningStages: Record<AnimationPlanningStageName, string>;
  resizePanels: string;
  noCode: string;
  noVideo: string;
  codeReadyTitle: string;
  codeReadyDescription: string;
  renderQueued: string;
  codeReadyMessage: string;
  renderCompletedMessage: string;
  failed: string;
  failureDescription: string;
  requestFailed: string;
  renameFailed: string;
  deleteFailed: string;
  copyCode: string;
  downloadCode: string;
  copied: string;
  versions: string;
  loading: string;
  loadFailed: string;
  modelAuto: string;
  modelAutoDescription: string;
  modelFree: string;
  modelStarter: string;
  modelPro: string;
  modelStarterRequired: string;
  modelProRequired: string;
  modelUpgrade: string;
  modelLoading: string;
  modelLoadFailed: string;
  modelRetryLoad: string;
  modelUnavailable: string;
  modelUnavailableShort: string;
  curatedModels: Record<
    CreatorCuratedModelKey,
    { label: string; description: string }
  >;
  failureMessages: Record<AnimationFailureCode, string>;
  subjects: CreatorOption<AnimationSubject>[];
  statuses: Record<AnimationStatus, string>;
  entryTemplate: string;
  entryFormula: string;
  entryDescription: string;
  templateEyebrow: string;
  templateTitle: string;
  templateDescription: string;
  templateUse: string;
  templateEmpty: string;
  formulaEyebrow: string;
  formulaTitle: string;
  formulaDescription: string;
  formulaInput: string;
  formulaPlaceholder: string;
  formulaIntent: string;
  formulaIntentPlaceholder: string;
  formulaSymbols: string;
  formulaPreview: string;
  formulaContinue: string;
  mathObjectType: string;
  mathTypes: Record<AnimationMathObjectType, string>;
  legacyArchive: string;
  saveSpec: string;
  savingSpec: string;
  objectsLabel: string;
  timelineLabel: string;
  directorIntent: string;
  learningGoal: string;
  hook: string;
  takeaway: string;
  shotPlan: string;
  acceptance: string;
  cinematography: string;
  formulaParts: string;
  mathDossier: string;
  coreClaim: string;
  invariants: string;
  commonMisreading: string;
  visualProof: string;
  startTime: string;
  runTime: string;
  ease: string;
  restoreVersion: string;
  renderStages: Record<
    | 'queued'
    | 'validating'
    | 'compiling'
    | 'transcoding'
    | 'reviewing'
    | 'uploading',
    string
  >;
  cancelRender: string;
  canceledRender: string;
  downloadVideo: string;
  publishGallery: string;
  publishedGallery: string;
  editAgain: string;
  specSaved: string;
  restoreSucceeded: string;
  actionFailed: string;
}

function isModelProvider(value: string): value is AnimationModelProvider {
  return value === 'kuaipao';
}

const progressByStatus: Record<AnimationStatus, number> = {
  draft: 5,
  generating_spec: 22,
  awaiting_approval: 42,
  generating_code: 64,
  code_ready: 78,
  queued: 84,
  rendering: 92,
  canceled: 78,
  completed: 100,
  failed: 0,
};

const PLANNING_PHASES: AnimationPlanningPhase[] = [
  'understanding',
  'structuring',
  'auditing',
  'finalizing',
];

function localizedFailure(
  copy: CreatorWorkspaceCopy,
  failure?: AnimationFailure
): string {
  return failure ? copy.failureMessages[failure.code] : copy.failureDescription;
}

function localizedMessage(
  copy: CreatorWorkspaceCopy,
  message: AnimationMessage
) {
  if (message.metadata?.kind === 'code_ready') return copy.codeReadyMessage;
  if (message.metadata?.kind === 'render_completed') {
    return copy.renderCompletedMessage;
  }
  return message.content;
}

function thrownAnimationFailure(error: unknown): AnimationFailure | undefined {
  if (!error || typeof error !== 'object') return undefined;
  return (error as { failure?: AnimationFailure }).failure;
}

function requestFailureMessage(copy: CreatorWorkspaceCopy, error: unknown) {
  const failure = thrownAnimationFailure(error);
  if (failure) return localizedFailure(copy, failure);
  if (error instanceof ApiError) {
    const code = animationFailureCodeFromHttpStatus(error.status);
    if (code) return copy.failureMessages[code];
  }
  if (
    error instanceof Error &&
    /current plan|not include this model|required for this model/i.test(
      error.message
    )
  ) {
    return copy.failureMessages.PRO_REQUIRED;
  }
  return copy.requestFailed;
}

function isAbortError(error: unknown) {
  return error instanceof Error && error.name === 'AbortError';
}

type ArtifactTab = 'specification' | 'code' | 'video';

const SPLIT_RATIO_STORAGE_KEY = 'creator-split-ratio';
const GUEST_DRAFT_STORAGE_KEY = 'curvg-creator-guest-draft-v1';
const GUEST_DRAFT_TTL_MS = 2 * 60 * 60 * 1000;
const DEFAULT_SPLIT_RATIO = 0.4;
const MIN_SPLIT_RATIO = 0.28;
const MAX_SPLIT_RATIO = 0.62;

interface GuestCreatorDraft {
  savedAt: number;
  creationMode: AnimationCreationMode;
  prompt: string;
  formula: string;
  formulaIntent: string;
  mathObjectType: AnimationMathObjectType;
  selectedTemplateId?: string;
  templateValues: Record<string, string>;
  subject: AnimationSubject;
}

function readGuestCreatorDraft(): GuestCreatorDraft | undefined {
  try {
    const raw = window.sessionStorage.getItem(GUEST_DRAFT_STORAGE_KEY);
    if (!raw) return undefined;
    const value = JSON.parse(raw) as Partial<GuestCreatorDraft>;
    if (
      typeof value.savedAt !== 'number' ||
      Date.now() - value.savedAt > GUEST_DRAFT_TTL_MS ||
      !['description', 'template', 'formula'].includes(
        value.creationMode || ''
      ) ||
      typeof value.prompt !== 'string' ||
      typeof value.formula !== 'string' ||
      typeof value.formulaIntent !== 'string' ||
      !['function', 'integral', 'series', 'matrix'].includes(
        value.mathObjectType || ''
      ) ||
      ![
        'general',
        'math',
        'physics',
        'computer_science',
        'biology',
        'chemistry',
        'economics',
      ].includes(value.subject || '') ||
      !value.templateValues ||
      typeof value.templateValues !== 'object' ||
      Array.isArray(value.templateValues)
    ) {
      window.sessionStorage.removeItem(GUEST_DRAFT_STORAGE_KEY);
      return undefined;
    }
    return value as GuestCreatorDraft;
  } catch {
    window.sessionStorage.removeItem(GUEST_DRAFT_STORAGE_KEY);
    return undefined;
  }
}

function preferredArtifactTab(detail?: AnimationDetail): ArtifactTab {
  if (!detail) return 'video';
  switch (detail.status) {
    case 'generating_spec':
    case 'awaiting_approval':
      return 'specification';
    case 'generating_code':
    case 'code_ready':
    case 'canceled':
      return 'code';
    case 'queued':
    case 'rendering':
      return 'video';
    case 'completed':
      return detail.parts.videoUrl
        ? 'video'
        : detail.parts.code
          ? 'code'
          : 'specification';
    case 'failed':
      if (detail.parts.failure?.stage === 'spec') return 'specification';
      return detail.parts.code
        ? 'code'
        : detail.parts.spec
          ? 'specification'
          : 'video';
    default:
      return 'video';
  }
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
            'curvg-btn-primary bg-foreground text-background h-11 lg:h-9',
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

function GuestWorkspaceHeader({ copy }: { copy: CreatorWorkspaceCopy }) {
  return (
    <header className="bg-background relative z-40 shrink-0 border-b">
      <div className="flex h-14 items-center justify-between gap-3 px-4 sm:px-5">
        <Link
          href="/"
          aria-label={envConfigs.app_name}
          className="focus-visible:ring-primary/40 group flex min-w-0 items-center gap-1.5 rounded-md focus-visible:ring-2 focus-visible:outline-none"
        >
          <img
            src={envConfigs.app_logo}
            alt=""
            className="size-8 shrink-0 rounded-lg"
          />
          <span className="truncate text-lg font-bold tracking-[-0.03em] sm:text-xl">
            {envConfigs.app_name}
          </span>
        </Link>

        <nav
          aria-label={copy.guestNavigation}
          className="flex shrink-0 items-center gap-2"
        >
          <PixelRevealLink
            href="/pricing"
            label={copy.viewPricing}
            variant="nav-item"
          />
          <PixelRevealLink
            href="/sign-in?callbackUrl=/creator"
            label={copy.signIn}
            variant="navigation"
          />
        </nav>
      </div>
    </header>
  );
}

function HistoryList({
  items,
  selectedId,
  copy,
  locale,
  onSelect,
  onRename,
  onDelete,
  collapsed = false,
}: {
  items: AnimationSummary[];
  selectedId?: string;
  copy: CreatorWorkspaceCopy;
  locale: string;
  onSelect: (id: string) => void;
  onRename: (id: string, title: string) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  collapsed?: boolean;
}) {
  const [editingId, setEditingId] = useState<string>();
  const [draftTitle, setDraftTitle] = useState('');
  const [renameError, setRenameError] = useState<string>();
  const [renamingId, setRenamingId] = useState<string>();
  const [deleteTarget, setDeleteTarget] = useState<AnimationSummary>();
  const [deleting, setDeleting] = useState(false);
  const renameInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!editingId) return;
    const frame = requestAnimationFrame(() => {
      renameInputRef.current?.focus();
      renameInputRef.current?.select();
    });
    return () => cancelAnimationFrame(frame);
  }, [editingId]);

  function beginRename(item: AnimationSummary) {
    setEditingId(item.id);
    setDraftTitle(item.title);
    setRenameError(undefined);
  }

  function cancelRename() {
    if (renamingId) return;
    setEditingId(undefined);
    setDraftTitle('');
    setRenameError(undefined);
  }

  async function submitRename(item: AnimationSummary) {
    const title = draftTitle.replace(/\s+/g, ' ').trim();
    if (!title) {
      setRenameError(copy.renameEmpty);
      return;
    }
    if (Array.from(title).length > 160) {
      setRenameError(copy.renameTooLong);
      return;
    }
    if (title === item.title) {
      cancelRename();
      return;
    }

    setRenamingId(item.id);
    setRenameError(undefined);
    try {
      await onRename(item.id, title);
      setEditingId(undefined);
      setDraftTitle('');
    } catch {
      // The mutation surfaces the localized error toast and keeps the input open.
    } finally {
      setRenamingId(undefined);
    }
  }

  async function confirmDelete() {
    if (!deleteTarget || deleting) return;
    setDeleting(true);
    try {
      await onDelete(deleteTarget.id);
      setDeleteTarget(undefined);
    } catch {
      // The mutation surfaces the localized error toast and keeps the dialog open.
    } finally {
      setDeleting(false);
    }
  }

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
    <>
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
                  'group hover:border-primary/15 hover:bg-accent flex w-full items-start gap-1 rounded-md border border-transparent px-2.5 py-2.5 text-left transition-colors motion-reduce:transition-none lg:py-3',
                  selectedId === item.id &&
                    'border-primary/25 bg-primary/5 hover:border-primary/25 hover:bg-primary/5',
                  editingId === item.id &&
                    'border-primary/30 bg-background hover:bg-background'
                )}
              >
                {editingId === item.id ? (
                  <form
                    className="min-w-0 flex-1"
                    onSubmit={(event) => {
                      event.preventDefault();
                      void submitRename(item);
                    }}
                  >
                    <div className="flex items-center gap-1">
                      <label className="sr-only" htmlFor={`rename-${item.id}`}>
                        {copy.renameAnimation}
                      </label>
                      <Input
                        ref={renameInputRef}
                        id={`rename-${item.id}`}
                        value={draftTitle}
                        maxLength={160}
                        disabled={renamingId === item.id}
                        aria-invalid={!!renameError}
                        placeholder={copy.renamePlaceholder}
                        className="h-8 rounded-md px-2 text-sm"
                        onChange={(event) => {
                          setDraftTitle(event.target.value);
                          if (renameError) setRenameError(undefined);
                        }}
                        onKeyDown={(event) => {
                          if (event.key === 'Escape') {
                            event.preventDefault();
                            cancelRename();
                          }
                        }}
                      />
                      <Button
                        type="submit"
                        variant="ghost"
                        size="icon-xs"
                        className="text-primary size-8"
                        disabled={renamingId === item.id}
                        aria-label={copy.renameSave}
                        title={copy.renameSave}
                      >
                        {renamingId === item.id ? (
                          <LoaderCircle className="animate-spin motion-reduce:animate-none" />
                        ) : (
                          <Check />
                        )}
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-xs"
                        className="text-muted-foreground size-8"
                        disabled={renamingId === item.id}
                        onClick={cancelRename}
                        aria-label={copy.renameCancel}
                        title={copy.renameCancel}
                      >
                        <X />
                      </Button>
                    </div>
                    {renameError && (
                      <p
                        role="alert"
                        className="text-destructive mt-1 px-2 text-[11px]"
                      >
                        {renameError}
                      </p>
                    )}
                  </form>
                ) : (
                  <>
                    <button
                      type="button"
                      onClick={() => onSelect(item.id)}
                      aria-current={selectedId === item.id ? 'page' : undefined}
                      className="focus-visible:ring-primary/40 min-h-11 min-w-0 flex-1 rounded-sm px-0.5 text-left focus-visible:ring-2 focus-visible:outline-none lg:min-h-0"
                    >
                      <div className="truncate text-sm font-medium">
                        {item.title}
                      </div>
                      <div className="text-muted-foreground mt-1 grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2 text-xs">
                        <span
                          className="truncate"
                          title={copy.statuses[item.status]}
                        >
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
                    <DropdownMenu>
                      <DropdownMenuTrigger
                        render={
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon-xs"
                            className="text-muted-foreground hover:text-foreground size-11 shrink-0 opacity-70 transition-opacity group-focus-within:opacity-100 focus-visible:opacity-100 data-popup-open:opacity-100 motion-reduce:transition-none lg:size-8 lg:opacity-0 lg:group-hover:opacity-100"
                            aria-label={`${copy.moreActions}: ${item.title}`}
                          >
                            <Ellipsis />
                          </Button>
                        }
                      />
                      <DropdownMenuContent
                        side="right"
                        align="start"
                        sideOffset={6}
                        className="min-w-36"
                      >
                        <DropdownMenuItem onClick={() => beginRename(item)}>
                          <PencilLine />
                          {copy.renameAnimation}
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          variant="destructive"
                          onClick={() => setDeleteTarget(item)}
                        >
                          <Trash2 />
                          {copy.deleteAnimation}
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </>
                )}
              </div>
            ))
          )}
        </div>
      </div>

      <Dialog
        open={!!deleteTarget}
        onOpenChange={(open) => {
          if (!open && !deleting) setDeleteTarget(undefined);
        }}
      >
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>{copy.deleteAnimation}</DialogTitle>
            <DialogDescription>
              {copy.deleteConfirm(deleteTarget?.title || '')}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              disabled={deleting}
              onClick={() => setDeleteTarget(undefined)}
            >
              {copy.renameCancel}
            </Button>
            <Button
              type="button"
              variant="destructive"
              disabled={deleting}
              onClick={() => void confirmDelete()}
            >
              {deleting && (
                <LoaderCircle className="animate-spin motion-reduce:animate-none" />
              )}
              {copy.deleteAnimation}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

interface WorkspaceUser {
  name?: string | null;
  email: string;
  image?: string | null;
}

function WorkspaceUserCenter({
  copy,
  user,
  credits,
  creditsLoading,
  locale,
  collapsed = false,
}: {
  copy: CreatorWorkspaceCopy;
  user: WorkspaceUser;
  credits?: number;
  creditsLoading: boolean;
  locale: string;
  collapsed?: boolean;
}) {
  const displayName =
    user.name?.trim() || user.email.split('@')[0] || copy.userCenter;
  const fallback = Array.from(displayName)[0]?.toUpperCase() || '?';
  const creditsText =
    creditsLoading || credits === undefined
      ? '—'
      : new Intl.NumberFormat(locale).format(credits);
  const accessibleLabel = `${copy.userCenter} · ${displayName} · ${creditsText} ${copy.credits}`;

  if (collapsed) {
    return (
      <div className="shrink-0 border-t p-2">
        <Link
          href="/settings"
          aria-label={accessibleLabel}
          title={accessibleLabel}
          className="hover:bg-accent focus-visible:ring-primary/40 flex min-h-14 flex-col items-center justify-center gap-1 rounded-md transition-colors focus-visible:ring-2 focus-visible:outline-none motion-reduce:transition-none"
        >
          <Avatar className="size-7 rounded-lg after:rounded-lg">
            <AvatarImage src={user.image || undefined} alt={displayName} />
            <AvatarFallback className="rounded-lg text-[10px]">
              {fallback}
            </AvatarFallback>
          </Avatar>
          <span
            className={cn(
              'text-muted-foreground flex max-w-10 items-center gap-1 font-mono text-[9px] leading-none tabular-nums',
              creditsLoading && 'animate-pulse motion-reduce:animate-none'
            )}
          >
            <Coins className="size-2.5 shrink-0" />
            <span className="truncate">{creditsText}</span>
          </span>
        </Link>
      </div>
    );
  }

  return (
    <div className="shrink-0 border-t p-2.5">
      <Link
        href="/settings"
        aria-label={accessibleLabel}
        className="hover:bg-accent focus-visible:ring-primary/40 group grid min-h-14 grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-2.5 rounded-md px-2.5 py-2 transition-colors focus-visible:ring-2 focus-visible:outline-none motion-reduce:transition-none"
      >
        <Avatar className="size-8 rounded-lg after:rounded-lg">
          <AvatarImage src={user.image || undefined} alt={displayName} />
          <AvatarFallback className="rounded-lg text-xs">
            {fallback}
          </AvatarFallback>
        </Avatar>
        <span className="min-w-0">
          <span className="block truncate text-sm font-medium">
            {displayName}
          </span>
          <span className="text-muted-foreground mt-0.5 block truncate font-mono text-[9px] tracking-[0.1em] uppercase">
            {copy.userCenter}
          </span>
        </span>
        <span
          className={cn(
            'border-border/70 bg-background text-muted-foreground group-hover:text-foreground flex max-w-20 items-center gap-1 rounded-sm border px-1.5 py-1 font-mono text-[10px] leading-none tabular-nums transition-colors',
            creditsLoading && 'animate-pulse motion-reduce:animate-none'
          )}
          title={`${creditsText} ${copy.credits}`}
        >
          <Coins className="text-primary size-3 shrink-0" />
          <span className="truncate">{creditsText}</span>
        </span>
      </Link>
    </div>
  );
}

function WorkspaceSidebarChrome({
  copy,
  history,
  selectedId,
  locale,
  user,
  credits,
  creditsLoading,
  collapsed,
  historyOpen,
  onToggleCollapsed,
  onHistoryOpenChange,
  onCreate,
  onSelect,
  onRename,
  onDelete,
}: {
  copy: CreatorWorkspaceCopy;
  history: AnimationSummary[];
  selectedId?: string;
  locale: string;
  user: WorkspaceUser;
  credits?: number;
  creditsLoading: boolean;
  collapsed: boolean;
  historyOpen: boolean;
  onToggleCollapsed: () => void;
  onHistoryOpenChange: (open: boolean) => void;
  onCreate: () => void;
  onSelect: (id: string) => void;
  onRename: (id: string, title: string) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
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
          onRename={onRename}
          onDelete={onDelete}
          collapsed={collapsed}
        />
        <WorkspaceUserCenter
          copy={copy}
          user={user}
          credits={credits}
          creditsLoading={creditsLoading}
          locale={locale}
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
            onRename={onRename}
            onDelete={onDelete}
          />
          <WorkspaceUserCenter
            copy={copy}
            user={user}
            credits={credits}
            creditsLoading={creditsLoading}
            locale={locale}
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
  modelsError,
  viewerTier,
  onRetryModels,
  onModelChange,
  processing,
  hasDetail,
  user,
  autoFocus = false,
  hasAssistantAvatar = false,
  className,
  placeholder,
  inputLabel,
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
  modelsError: boolean;
  viewerTier?: 'free' | 'starter' | 'pro';
  onRetryModels: () => void;
  onModelChange: (value: string) => void;
  processing: boolean;
  hasDetail: boolean;
  user: boolean;
  autoFocus?: boolean;
  hasAssistantAvatar?: boolean;
  className?: string;
  placeholder?: string;
  inputLabel?: string;
}) {
  const submitLabel = !user
    ? copy.signInToCreate
    : hasDetail
      ? copy.revise
      : copy.create;
  const selectedModel = modelOptions.find(
    (option) => option.value === modelValue
  );
  const modelUnavailable =
    user &&
    (modelsLoading || modelsError || !selectedModel || selectedModel.disabled);

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
          {inputLabel || copy.promptLabel}
        </div>
      )}
      <div className="relative">
        <Textarea
          id={hasDetail ? 'creator-revision-input' : undefined}
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
          placeholder={placeholder || copy.promptPlaceholder}
          aria-label={inputLabel || copy.promptLabel}
          disabled={processing}
          className={cn(
            'placeholder:text-muted-foreground/62 resize-none border-0 bg-transparent px-2 py-2 leading-6 shadow-none focus-visible:ring-0 sm:px-3 dark:bg-transparent',
            hasDetail
              ? 'max-h-40 min-h-10 text-sm'
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
      <div className="mt-0.5 flex min-w-0 items-center gap-1.5 px-1 pt-1.5">
        <div className="border-border/75 bg-muted/35 flex min-w-0 items-center rounded-xl border p-0.5 shadow-[inset_0_1px_0_rgb(255_255_255/0.55)] dark:shadow-none">
          <Select
            value={subject}
            onValueChange={(value) =>
              onSubjectChange((value || 'general') as AnimationSubject)
            }
            disabled={processing}
          >
            <SelectTrigger
              size="sm"
              aria-label={copy.subject}
              title={
                copy.subjects.find((option) => option.value === subject)?.label
              }
              className="text-muted-foreground hover:bg-background/75 hover:text-foreground data-[popup-open]:bg-background data-[popup-open]:text-foreground h-8 min-w-0 gap-1.5 rounded-[9px] border-0 bg-transparent px-2.5 text-xs font-medium shadow-none transition-[background-color,color,box-shadow] data-[popup-open]:shadow-sm"
            >
              <ListTree className="size-3.5" />
              <SelectValue className="max-w-20 truncate sm:max-w-24">
                {(value) =>
                  copy.subjects.find((option) => option.value === value)
                    ?.label || value
                }
              </SelectValue>
            </SelectTrigger>
            <SelectContent
              align="start"
              alignItemWithTrigger={false}
              sideOffset={7}
              className="border-border/80 bg-popover w-52 rounded-xl border p-1 shadow-[0_16px_42px_-24px_color-mix(in_oklab,var(--foreground)_35%,transparent)] ring-0"
            >
              {copy.subjects.map((option) => (
                <SelectItem
                  key={option.value}
                  value={option.value}
                  className="my-0.5 h-9 rounded-lg px-2.5 pr-9 text-xs font-medium"
                >
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <span aria-hidden className="bg-border/80 h-4 w-px shrink-0" />
          <Select
            value={modelValue}
            onValueChange={(value) => onModelChange(value || 'auto')}
            disabled={processing}
          >
            <SelectTrigger
              size="sm"
              aria-label={copy.model}
              title={
                modelOptions.find((option) => option.value === modelValue)
                  ?.label
              }
              className="text-muted-foreground hover:bg-background/75 hover:text-foreground data-[popup-open]:bg-background data-[popup-open]:text-foreground h-8 min-w-0 gap-1.5 rounded-[9px] border-0 bg-transparent px-2.5 text-xs font-medium shadow-none transition-[background-color,color,box-shadow] data-[popup-open]:shadow-sm"
            >
              <Sparkles className="text-primary size-3.5" />
              <SelectValue className="max-w-24 truncate sm:max-w-32">
                {(value) =>
                  modelOptions.find((option) => option.value === value)
                    ?.label || value
                }
              </SelectValue>
            </SelectTrigger>
            <SelectContent
              align="end"
              alignItemWithTrigger={false}
              sideOffset={7}
              className="border-border/80 bg-popover max-h-[min(25rem,var(--available-height))] w-[min(21.5rem,calc(100vw-1.5rem))] overscroll-contain rounded-xl border p-1 shadow-[0_18px_50px_-26px_color-mix(in_oklab,var(--foreground)_35%,transparent)] ring-0"
            >
              {modelOptions.map((option) => (
                <SelectItem
                  key={option.value}
                  value={option.value}
                  disabled={option.disabled}
                  className={cn(
                    'my-0.5 items-start rounded-lg border px-2.5 py-1.5 pr-9 whitespace-normal transition-[background-color,border-color,box-shadow] duration-150 motion-reduce:transition-none [&>span:first-child]:min-w-0 [&>span:first-child]:shrink [&>span:first-child]:whitespace-normal',
                    option.value === modelValue
                      ? 'border-primary/25 focus:bg-primary/8 bg-primary/[0.055]'
                      : 'focus:border-border/70 focus:bg-muted/65 border-transparent',
                    option.disabled && 'grayscale-[0.2]'
                  )}
                >
                  <span className="flex min-w-0 items-start gap-2.5">
                    <span
                      className={cn(
                        'mt-1.5 size-2 shrink-0 rounded-full border transition-[background-color,box-shadow] duration-150',
                        option.value === modelValue
                          ? 'border-primary bg-primary shadow-[0_0_0_3px_color-mix(in_oklab,var(--primary)_11%,transparent)]'
                          : option.disabled
                            ? 'border-muted-foreground/20 bg-transparent'
                            : 'border-muted-foreground/25 bg-muted-foreground/25'
                      )}
                    />
                    <span className="min-w-0 py-px">
                      <span className="flex min-w-0 items-center gap-1.5 text-[13px] leading-5 font-medium">
                        <span className="truncate">{option.label}</span>
                        {option.badge && (
                          <span className="border-primary/25 bg-primary/7 text-primary shrink-0 rounded-full border px-1.5 py-px font-mono text-[8px] font-semibold tracking-[0.04em] uppercase">
                            {option.badge}
                          </span>
                        )}
                        {option.locked && !modelsLoading && (
                          <span className="shrink-0 text-[9px] font-medium text-amber-600 dark:text-amber-400">
                            {option.requiredTier === 'starter'
                              ? copy.modelStarterRequired
                              : copy.modelProRequired}
                          </span>
                        )}
                        {option.disabled &&
                          !option.locked &&
                          !modelsLoading && (
                            <span className="shrink-0 text-[9px] font-medium text-amber-600 dark:text-amber-400">
                              {copy.modelUnavailableShort}
                            </span>
                          )}
                      </span>
                      {option.value === modelValue && (
                        <span className="text-muted-foreground line-clamp-1 block text-[11px] leading-4">
                          {option.description}
                        </span>
                      )}
                    </span>
                  </span>
                </SelectItem>
              ))}
              {modelsLoading && (
                <div className="text-muted-foreground flex items-center gap-2 px-2.5 py-2 text-xs">
                  <LoaderCircle className="size-3.5 animate-spin motion-reduce:animate-none" />
                  {copy.modelLoading}
                </div>
              )}
              {modelsError && !modelsLoading && (
                <div className="border-border mt-1 flex items-center justify-between gap-3 border-t px-2.5 py-2 text-xs">
                  <span className="text-muted-foreground">
                    {copy.modelLoadFailed}
                  </span>
                  <button
                    type="button"
                    className="text-primary shrink-0 font-semibold hover:underline"
                    onClick={onRetryModels}
                  >
                    {copy.modelRetryLoad}
                  </button>
                </div>
              )}
              {viewerTier !== 'pro' &&
                modelOptions.some((option) => option.locked) && (
                  <div className="border-border mt-1 border-t px-2.5 py-2">
                    <Link
                      href="/pricing"
                      className="text-primary text-xs font-semibold hover:underline"
                    >
                      {copy.modelUpgrade}
                    </Link>
                  </div>
                )}
              {!modelsLoading &&
                !modelsError &&
                modelOptions.every((option) => option.disabled) && (
                  <div className="text-muted-foreground border-t px-2.5 py-2 text-xs leading-5">
                    {copy.modelUnavailable}
                  </div>
                )}
            </SelectContent>
          </Select>
        </div>
        <div className="ml-auto flex items-center gap-2.5">
          {prompt.length >= 4000 && (
            <span
              aria-live="polite"
              className={cn(
                'font-mono text-[10px] tracking-[0.03em] transition-colors motion-reduce:transition-none',
                prompt.length >= 5000
                  ? 'text-destructive'
                  : prompt.length >= 4500
                    ? 'text-amber-600 dark:text-amber-400'
                    : 'text-muted-foreground'
              )}
            >
              {prompt.length}/5000
            </span>
          )}
          <Button
            type="submit"
            size="icon"
            disabled={!prompt.trim() || processing || modelUnavailable}
            aria-label={submitLabel}
            className={cn(
              'size-9 rounded-full shadow-none transition-colors motion-reduce:transition-none',
              !prompt.trim() || processing || modelUnavailable
                ? 'bg-muted text-muted-foreground'
                : 'bg-foreground text-background hover:bg-primary'
            )}
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
  locale,
  creationMode,
  onCreationModeChange,
  prompt,
  onPromptChange,
  onSubmit,
  subject,
  onSubjectChange,
  modelValue,
  modelOptions,
  modelsLoading,
  modelsError,
  viewerTier,
  onRetryModels,
  onModelChange,
  processing,
  user,
  formula,
  onFormulaChange,
  formulaIntent,
  onFormulaIntentChange,
  mathObjectType,
  onMathObjectTypeChange,
  templates,
  templatesLoading,
  selectedTemplateId,
  onSelectedTemplateIdChange,
  templateValues,
  onTemplateValuesChange,
}: {
  copy: CreatorWorkspaceCopy;
  locale: string;
  creationMode: AnimationCreationMode;
  onCreationModeChange: (value: AnimationCreationMode) => void;
  prompt: string;
  onPromptChange: (value: string) => void;
  onSubmit: (event: React.FormEvent<HTMLFormElement>) => void;
  subject: AnimationSubject;
  onSubjectChange: (value: AnimationSubject) => void;
  modelValue: string;
  modelOptions: CreatorModelOption[];
  modelsLoading: boolean;
  modelsError: boolean;
  viewerTier?: 'free' | 'starter' | 'pro';
  onRetryModels: () => void;
  onModelChange: (value: string) => void;
  processing: boolean;
  user: boolean;
  formula: string;
  onFormulaChange: (value: string) => void;
  formulaIntent: string;
  onFormulaIntentChange: (value: string) => void;
  mathObjectType: AnimationMathObjectType;
  onMathObjectTypeChange: (value: AnimationMathObjectType) => void;
  templates: AnimationTemplateSummary[];
  templatesLoading: boolean;
  selectedTemplateId?: string;
  onSelectedTemplateIdChange: (value: string) => void;
  templateValues: Record<string, string>;
  onTemplateValuesChange: (value: Record<string, string>) => void;
}) {
  const [activeGroup, setActiveGroup] = useState(
    copy.suggestionGroups[0]?.value || ''
  );
  const activeSuggestions =
    copy.suggestionGroups.find((group) => group.value === activeGroup) ||
    copy.suggestionGroups[0];
  const selectedTemplate = templates.find(
    (template) => template.id === selectedTemplateId
  );
  const entryTabs: Array<{
    value: AnimationCreationMode;
    label: string;
    icon: typeof LayoutGrid;
  }> = [
    {
      value: 'description',
      label: copy.entryDescription,
      icon: MessageSquareText,
    },
    { value: 'template', label: copy.entryTemplate, icon: LayoutGrid },
    { value: 'formula', label: copy.entryFormula, icon: SquareSigma },
  ];
  const symbols = [
    ['∫', '\\int_{0}^{1}'],
    ['Σ', '\\sum_{n=1}^{10}'],
    ['√', '\\sqrt{}'],
    ['ᵃ⁄ᵇ', '\\frac{}{}'],
    ['π', 'pi'],
    ['θ', '\\theta'],
    ['→', '\\to'],
  ] as const;

  return (
    <div className="relative flex min-h-0 flex-1 overflow-x-hidden overflow-y-auto">
      <div className="curvg-coordinate-grid pointer-events-none absolute inset-0 [mask-image:linear-gradient(to_bottom,transparent_0%,black_12%,black_88%,transparent_100%)] opacity-55" />
      <div className="curvg-dotmatrix pointer-events-none absolute top-8 right-0 h-72 w-72 opacity-25" />
      <span className="curvg-corner top-8 left-6" />
      <span className="curvg-corner top-8 right-6" />
      <div className="relative mx-auto flex w-full max-w-6xl flex-1 flex-col items-center px-4 py-10 sm:px-8 sm:py-14 lg:py-16">
        <div className="curvg-pill text-muted-foreground inline-flex max-w-full flex-wrap items-center justify-center gap-x-2 gap-y-0.5 px-3 py-1.5 text-center font-mono text-[10px] font-medium tracking-[0.14em] uppercase sm:tracking-[0.16em]">
          <Sparkles className="text-primary size-3.5 shrink-0" />
          <span>{copy.welcomeEyebrow}</span>
        </div>
        <h1 className="curvg-heading mt-5 max-w-4xl text-center text-[2.15rem] leading-[1.05] sm:text-[3.75rem]">
          {copy.welcomeTitle}
        </h1>
        <p className="text-muted-foreground mt-5 max-w-2xl text-center text-sm leading-6 sm:text-[1.05rem] sm:leading-7">
          {copy.welcomeDescription}
        </p>

        <div className="bg-card/72 border-border/80 mt-9 flex w-full max-w-3xl gap-1 rounded-2xl border p-1.5 shadow-sm backdrop-blur-sm">
          {entryTabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.value}
                type="button"
                onClick={() => onCreationModeChange(tab.value)}
                aria-pressed={creationMode === tab.value}
                className={cn(
                  'focus-visible:ring-primary/45 flex min-h-11 min-w-0 flex-1 items-center justify-center gap-2 rounded-xl px-3 text-xs font-semibold transition-colors focus-visible:ring-2 focus-visible:outline-none sm:text-sm',
                  creationMode === tab.value
                    ? 'bg-foreground text-background shadow-sm'
                    : 'text-muted-foreground hover:bg-muted/70 hover:text-foreground'
                )}
              >
                <Icon className="size-4 shrink-0" />
                <span className="truncate">{tab.label}</span>
              </button>
            );
          })}
        </div>

        {creationMode === 'template' && (
          <div className="mt-8 w-full">
            <div className="mx-auto max-w-2xl text-center">
              <p className="curvg-meta">{copy.templateEyebrow}</p>
              <h2 className="curvg-heading mt-2 text-2xl sm:text-3xl">
                {copy.templateTitle}
              </h2>
              <p className="text-muted-foreground mt-3 text-sm leading-6">
                {copy.templateDescription}
              </p>
            </div>
            {templatesLoading ? (
              <div className="text-muted-foreground mt-10 flex items-center justify-center gap-2 text-sm">
                <LoaderCircle className="size-4 animate-spin" /> {copy.loading}
              </div>
            ) : templates.length === 0 ? (
              <p className="text-muted-foreground mt-10 text-center text-sm">
                {copy.templateEmpty}
              </p>
            ) : (
              <div className="mt-7 grid gap-3 md:grid-cols-3">
                {templates.map((template, index) => (
                  <button
                    key={template.id}
                    type="button"
                    onClick={() => {
                      onSelectedTemplateIdChange(template.id);
                      onTemplateValuesChange(
                        Object.fromEntries(
                          template.parameters.map((parameter) => [
                            parameter.key,
                            parameter.defaultValue,
                          ])
                        )
                      );
                    }}
                    className={cn(
                      'bg-card focus-visible:ring-primary/45 group relative overflow-hidden rounded-2xl border p-5 text-left transition-[border-color,transform,box-shadow] focus-visible:ring-2 focus-visible:outline-none motion-reduce:transition-none',
                      selectedTemplateId === template.id
                        ? 'border-primary/45 shadow-[0_20px_55px_-40px_color-mix(in_oklab,var(--primary)_75%,transparent)]'
                        : 'hover:border-primary/25 hover:-translate-y-0.5'
                    )}
                  >
                    <span className="text-primary font-mono text-[10px] tracking-[0.14em]">
                      0{index + 1}
                    </span>
                    <div className="mt-10 font-mono text-lg tracking-tight">
                      {template.previewFormula}
                    </div>
                    <h3 className="mt-5 font-semibold">{template.title}</h3>
                    <p className="text-muted-foreground mt-2 text-sm leading-6">
                      {template.description}
                    </p>
                  </button>
                ))}
              </div>
            )}
            {selectedTemplate && (
              <form
                onSubmit={onSubmit}
                className="bg-card/85 mt-4 grid gap-4 rounded-2xl border p-4 sm:grid-cols-[1fr_auto] sm:items-end sm:p-5"
              >
                <div className="grid gap-4 sm:grid-cols-2">
                  {selectedTemplate.parameters.map((parameter) => (
                    <label
                      key={parameter.key}
                      className="grid gap-2 text-sm font-medium"
                    >
                      {locale.toLowerCase().startsWith('zh')
                        ? parameter.labelZh
                        : parameter.labelEn}
                      <input
                        type={parameter.type === 'color' ? 'color' : 'text'}
                        value={
                          templateValues[parameter.key] ||
                          parameter.defaultValue
                        }
                        onChange={(event) =>
                          onTemplateValuesChange({
                            ...templateValues,
                            [parameter.key]: event.target.value,
                          })
                        }
                        className={cn(
                          'border-input bg-background focus:ring-primary/35 h-11 rounded-xl border px-3 font-mono text-sm outline-none focus:ring-2',
                          parameter.type === 'color' && 'w-full p-1.5'
                        )}
                      />
                    </label>
                  ))}
                </div>
                <Button
                  type="submit"
                  className="bg-foreground text-background hover:bg-primary h-11"
                  disabled={processing}
                >
                  {processing ? (
                    <LoaderCircle className="animate-spin" />
                  ) : (
                    <Play />
                  )}
                  {user ? copy.templateUse : copy.signInToCreate}
                </Button>
              </form>
            )}
          </div>
        )}

        {creationMode === 'formula' && (
          <div className="mt-8 grid w-full gap-5 lg:grid-cols-[minmax(0,0.9fr)_minmax(420px,1.1fr)]">
            <div className="bg-card rounded-2xl border p-4 sm:p-6">
              <p className="curvg-meta">{copy.formulaEyebrow}</p>
              <h2 className="curvg-heading mt-2 text-2xl">
                {copy.formulaTitle}
              </h2>
              <p className="text-muted-foreground mt-3 text-sm leading-6">
                {copy.formulaDescription}
              </p>
              <label className="mt-6 grid gap-2 text-sm font-semibold">
                {copy.formulaInput}
                <Textarea
                  value={formula}
                  onChange={(event) =>
                    onFormulaChange(event.target.value.slice(0, 1000))
                  }
                  placeholder={copy.formulaPlaceholder}
                  className="min-h-24 resize-none font-mono"
                  disabled={processing}
                />
              </label>
              <div className="mt-4">
                <p className="text-muted-foreground mb-2 font-mono text-[9px] tracking-[0.12em] uppercase">
                  {copy.formulaSymbols}
                </p>
                <div className="flex flex-wrap gap-2">
                  {symbols.map(([label, value]) => (
                    <Button
                      key={label}
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => onFormulaChange(`${formula}${value}`)}
                    >
                      {label}
                    </Button>
                  ))}
                </div>
              </div>
              <label className="mt-5 grid gap-2 text-sm font-semibold">
                {copy.mathObjectType}
                <Select
                  value={mathObjectType}
                  onValueChange={(value) =>
                    onMathObjectTypeChange(
                      (value || 'function') as AnimationMathObjectType
                    )
                  }
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {(
                      Object.keys(copy.mathTypes) as AnimationMathObjectType[]
                    ).map((type) => (
                      <SelectItem key={type} value={type}>
                        {copy.mathTypes[type]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </label>
              <div className="mt-5">
                <PromptComposer
                  copy={copy}
                  prompt={formulaIntent}
                  onPromptChange={onFormulaIntentChange}
                  onSubmit={onSubmit}
                  subject={subject}
                  onSubjectChange={onSubjectChange}
                  modelValue={modelValue}
                  modelOptions={modelOptions}
                  modelsLoading={modelsLoading}
                  modelsError={modelsError}
                  viewerTier={viewerTier}
                  onRetryModels={onRetryModels}
                  onModelChange={onModelChange}
                  processing={processing}
                  hasDetail={false}
                  user={user}
                  placeholder={copy.formulaIntentPlaceholder}
                  inputLabel={copy.formulaIntent}
                />
              </div>
            </div>
            <MathFormulaPreview
              formula={formula}
              type={mathObjectType}
              previewLabel={copy.formulaPreview}
              className="self-start"
            />
          </div>
        )}

        {creationMode === 'description' && (
          <div className="mt-28 w-full max-w-4xl sm:mt-40">
            <div className="relative">
              <img
                src="/imgs/generated/creator-assistant-sitting.png"
                alt=""
                aria-hidden="true"
                draggable={false}
                width={360}
                height={360}
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
                modelsError={modelsError}
                viewerTier={viewerTier}
                onRetryModels={onRetryModels}
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
        )}
      </div>
    </div>
  );
}

function PlanningStatusPanel({
  copy,
  phase,
  pipeline,
}: {
  copy: CreatorWorkspaceCopy;
  phase: AnimationPlanningPhase;
  pipeline?: AnimationPlanningPipeline;
}) {
  const activeIndex = PLANNING_PHASES.indexOf(phase);
  return (
    <div
      role="status"
      aria-live="polite"
      className="bg-card relative overflow-hidden rounded-xl border p-4"
    >
      <span
        aria-hidden
        className="curvg-blueprint-scan via-primary/12 pointer-events-none absolute inset-x-0 top-0 h-16 bg-gradient-to-b from-transparent to-transparent"
      />
      <div className="relative flex items-start gap-3">
        <span className="border-primary/20 bg-primary/6 text-primary flex size-9 shrink-0 items-center justify-center rounded-lg border">
          <ListTree className="size-4" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-muted-foreground font-mono text-[9px] tracking-[0.12em] uppercase">
            {copy.planningEyebrow}
          </p>
          <p className="mt-1 text-sm font-semibold">{copy.planningTitle}</p>
          <p className="text-muted-foreground mt-1 text-xs leading-5">
            {copy.planningDescription}
          </p>
        </div>
      </div>
      <ol className="relative mt-4 grid gap-2 sm:grid-cols-2">
        {pipeline
          ? pipeline.stages.map((stage) => {
              const completed =
                stage.status === 'completed' || stage.status === 'cached';
              const active = stage.status === 'running';
              const failed = stage.status === 'failed';
              return (
                <li
                  key={stage.name}
                  aria-current={active ? 'step' : undefined}
                  className={cn(
                    'flex min-h-9 items-center gap-2 rounded-lg border px-2.5 py-2 text-xs transition-colors motion-reduce:transition-none',
                    completed && 'border-primary/12 bg-primary/[0.035]',
                    active &&
                      'border-primary/30 bg-primary/[0.07] text-foreground',
                    failed && 'border-destructive/30 bg-destructive/[0.06]',
                    !completed &&
                      !active &&
                      !failed &&
                      'border-border/70 text-muted-foreground'
                  )}
                >
                  <span
                    className={cn(
                      'flex size-5 shrink-0 items-center justify-center rounded-md border',
                      completed &&
                        'border-primary bg-primary text-primary-foreground',
                      active && 'border-primary/50 text-primary',
                      failed && 'border-destructive/50 text-destructive',
                      !completed && !active && !failed && 'border-border'
                    )}
                  >
                    {completed ? (
                      <Check className="size-3" />
                    ) : active ? (
                      <span className="bg-primary curvg-blueprint-node size-1.5 rounded-full" />
                    ) : failed ? (
                      <AlertCircle className="size-3" />
                    ) : (
                      <span className="size-1 rounded-full bg-current opacity-35" />
                    )}
                  </span>
                  <span className={active ? 'font-medium' : undefined}>
                    {copy.planningStages[stage.name]}
                  </span>
                  {stage.attempt > 1 && (
                    <span className="text-muted-foreground ml-auto font-mono text-[9px]">
                      ×{stage.attempt}
                    </span>
                  )}
                </li>
              );
            })
          : PLANNING_PHASES.map((item, index) => {
              const completed = index < activeIndex;
              const active = item === phase;
              return (
                <li
                  key={item}
                  aria-current={active ? 'step' : undefined}
                  className={cn(
                    'flex min-h-9 items-center gap-2 rounded-lg border px-2.5 py-2 text-xs transition-colors motion-reduce:transition-none',
                    completed && 'border-primary/12 bg-primary/[0.035]',
                    active &&
                      'border-primary/30 bg-primary/[0.07] text-foreground',
                    !completed &&
                      !active &&
                      'border-border/70 text-muted-foreground'
                  )}
                >
                  <span
                    className={cn(
                      'flex size-5 shrink-0 items-center justify-center rounded-md border',
                      completed &&
                        'border-primary bg-primary text-primary-foreground',
                      active && 'border-primary/50 text-primary',
                      !completed && !active && 'border-border'
                    )}
                  >
                    {completed ? (
                      <Check className="size-3" />
                    ) : active ? (
                      <span className="bg-primary curvg-blueprint-node size-1.5 rounded-full" />
                    ) : (
                      <span className="size-1 rounded-full bg-current opacity-35" />
                    )}
                  </span>
                  <span className={active ? 'font-medium' : undefined}>
                    {copy.planningPhases[item]}
                  </span>
                </li>
              );
            })}
      </ol>
    </div>
  );
}

function SceneBlueprintLoader({
  detail,
  copy,
  phase,
  streamingText,
}: {
  detail?: AnimationDetail;
  copy: CreatorWorkspaceCopy;
  phase: AnimationPlanningPhase;
  streamingText?: string;
}) {
  const activeIndex = PLANNING_PHASES.indexOf(phase);
  const layers = [
    { label: copy.objectsLabel, icon: Box, readyAt: 1 },
    { label: copy.timelineLabel, icon: ListTree, readyAt: 1 },
    { label: copy.layout, icon: LayoutGrid, readyAt: 2 },
  ];

  return (
    <div className="relative flex min-h-full flex-col overflow-hidden px-4 pt-3 pb-5 sm:px-6">
      <div className="curvg-coordinate-grid pointer-events-none absolute inset-0 opacity-70" />
      <div className="curvg-dotmatrix pointer-events-none absolute -top-8 -right-8 size-72 opacity-30" />
      <span
        aria-hidden
        className="curvg-blueprint-scan via-primary/10 pointer-events-none absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-transparent to-transparent"
      />

      <div className="relative mx-auto flex w-full max-w-3xl flex-1 flex-col justify-center py-10">
        <div className="text-center">
          <p className="text-primary font-mono text-[9px] tracking-[0.18em] uppercase">
            {copy.planningEyebrow} / {String(activeIndex + 1).padStart(2, '0')}
          </p>
          <h2 className="mt-2 text-lg font-semibold">{copy.planningTitle}</h2>
          <p className="text-muted-foreground mx-auto mt-1.5 max-w-lg text-xs leading-5">
            {copy.planningPhases[phase]}
          </p>
        </div>

        <div className="mt-7 grid items-stretch gap-3 md:grid-cols-[minmax(0,1.2fr)_44px_minmax(0,0.8fr)]">
          <div className="bg-card/75 relative min-h-48 overflow-hidden rounded-xl border p-4 shadow-[0_18px_48px_-40px_color-mix(in_oklab,var(--primary)_70%,transparent)] backdrop-blur-sm">
            <div className="curvg-coordinate-grid pointer-events-none absolute inset-0 opacity-75" />
            <div className="relative flex items-center justify-between gap-3">
              <span className="text-muted-foreground font-mono text-[9px] tracking-[0.12em] uppercase">
                {copy.planningSemanticMap}
              </span>
              <span className="border-primary/20 bg-primary/5 text-primary rounded-md border px-2 py-1 font-mono text-[9px]">
                {copy.planningPhases[phase]}
              </span>
            </div>
            <svg
              aria-hidden="true"
              viewBox="0 0 360 150"
              className="relative mt-2 h-32 w-full overflow-visible"
            >
              <path
                d="M16 76H344M62 18V134"
                fill="none"
                stroke="currentColor"
                strokeOpacity="0.12"
              />
              <path
                d="M24 77C48 77 48 40 72 40S96 112 120 112s24-72 48-72 24 72 48 72 24-72 48-72 24 37 72 37"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                className="text-primary"
              />
              <circle
                cx="62"
                cy="76"
                r="35"
                fill="none"
                stroke="currentColor"
                strokeOpacity="0.32"
              />
              <g className="curvg-blueprint-orbit">
                <circle
                  cx="62"
                  cy="41"
                  r="4"
                  fill="currentColor"
                  className="text-primary"
                />
                <path
                  d="M62 41V76H97"
                  fill="none"
                  stroke="currentColor"
                  strokeDasharray="4 4"
                  strokeOpacity="0.55"
                  className="text-primary"
                />
              </g>
              <circle
                cx="180"
                cy="76"
                r="4"
                fill="currentColor"
                className="text-primary curvg-blueprint-flow"
              />
            </svg>
            <p className="relative line-clamp-2 text-sm leading-6 font-medium">
              {detail?.prompt || copy.planningDescription}
            </p>
          </div>

          <div className="relative hidden items-center justify-center md:flex">
            <span className="bg-border absolute inset-x-1 h-px" />
            <ChevronRight className="bg-background text-primary relative size-5" />
          </div>

          <div className="grid gap-2">
            {layers.map(({ label, icon: Icon, readyAt }) => {
              const ready = activeIndex >= readyAt;
              const active =
                (phase === 'structuring' && readyAt === 1) ||
                (phase === 'auditing' && readyAt === 2) ||
                phase === 'finalizing';
              return (
                <div
                  key={label}
                  className={cn(
                    'bg-card/75 relative flex items-center gap-3 overflow-hidden rounded-xl border px-3.5 py-3 transition-[border-color,background-color] motion-reduce:transition-none',
                    ready ? 'border-primary/25' : 'border-border/75',
                    active && 'bg-primary/[0.045]'
                  )}
                >
                  {active && (
                    <span
                      aria-hidden
                      className="bg-primary absolute inset-y-2 left-0 w-0.5 rounded-full"
                    />
                  )}
                  <span
                    className={cn(
                      'flex size-8 shrink-0 items-center justify-center rounded-lg border',
                      ready
                        ? 'border-primary/20 bg-primary/6 text-primary'
                        : 'border-border text-muted-foreground'
                    )}
                  >
                    <Icon className="size-4" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-medium">{label}</p>
                    <div className="mt-1.5 flex gap-1">
                      {[0, 1, 2].map((index) => (
                        <span
                          key={index}
                          className={cn(
                            'h-1 rounded-full transition-colors motion-reduce:transition-none',
                            index === 0 ? 'w-10' : index === 1 ? 'w-6' : 'w-3',
                            ready ? 'bg-primary/35' : 'bg-muted'
                          )}
                        />
                      ))}
                    </div>
                  </div>
                  {ready ? (
                    <Check className="text-primary size-3.5" />
                  ) : (
                    <span className="border-muted-foreground/25 size-2 rounded-full border" />
                  )}
                </div>
              );
            })}
          </div>
        </div>

        <div className="bg-card/70 mt-3 min-h-16 rounded-xl border px-4 py-3 backdrop-blur-sm">
          <p className="text-muted-foreground font-mono text-[9px] tracking-[0.12em] uppercase">
            {copy.planningLiveSummary}
          </p>
          <p
            className="mt-1.5 line-clamp-3 text-xs leading-5"
            aria-live="polite"
          >
            {streamingText || copy.planningDescription}
            {streamingText && (
              <span className="curvg-cursor" aria-hidden="true" />
            )}
          </p>
        </div>
      </div>
    </div>
  );
}

function SceneBlueprintFailure({
  detail,
  copy,
  retrying,
  onRetry,
}: {
  detail: AnimationDetail;
  copy: CreatorWorkspaceCopy;
  retrying: boolean;
  onRetry?: () => void;
}) {
  return (
    <div className="relative flex min-h-full items-center justify-center overflow-hidden px-6 py-20">
      <div className="curvg-coordinate-grid pointer-events-none absolute inset-0 opacity-65" />
      <div className="curvg-dotmatrix pointer-events-none absolute -top-8 -right-8 size-72 opacity-25" />
      <div className="bg-card/85 border-destructive/25 relative w-full max-w-md rounded-2xl border p-6 text-center shadow-[0_24px_70px_-52px_color-mix(in_oklab,var(--destructive)_70%,transparent)] backdrop-blur-sm">
        <span className="border-destructive/25 bg-destructive/6 text-destructive mx-auto flex size-11 items-center justify-center rounded-xl border">
          <AlertCircle className="size-5" />
        </span>
        <p className="text-muted-foreground mt-4 font-mono text-[9px] tracking-[0.14em] uppercase">
          {copy.planningEyebrow}
        </p>
        <h2 className="mt-2 text-base font-semibold">{copy.failed}</h2>
        <p className="text-destructive mt-2 text-sm leading-6">
          {localizedFailure(copy, detail.parts.failure)}
        </p>
        {detail.parts.failure?.retryable && onRetry && (
          <Button
            type="button"
            className="mt-5"
            disabled={retrying}
            onClick={onRetry}
          >
            {retrying ? (
              <LoaderCircle className="animate-spin motion-reduce:animate-none" />
            ) : (
              <Sparkles />
            )}
            {copy.retryPlan}
          </Button>
        )}
      </div>
    </div>
  );
}

function StatusPanel({
  detail,
  copy,
  planningPhase,
  retryingPlan = false,
  onRetryPlan,
}: {
  detail: AnimationDetail;
  copy: CreatorWorkspaceCopy;
  planningPhase: AnimationPlanningPhase;
  retryingPlan?: boolean;
  onRetryPlan?: () => void;
}) {
  const queryClient = useQueryClient();
  const cancelMutation = useMutation({
    mutationFn: () =>
      apiPost<AnimationDetail>(`/api/animations/${detail.id}/cancel`, {}),
    onSuccess: (next) => {
      queryClient.setQueriesData<AnimationDetail>(
        { queryKey: ['animation'], exact: false },
        (current) => (current?.id === next.id ? next : current)
      );
      queryClient.invalidateQueries({ queryKey: ['animations'] });
      toast.success(copy.canceledRender);
    },
    onError: (error: Error) => toast.error(error.message || copy.actionFailed),
  });
  if (
    !isAnimationBusy(detail.status) &&
    detail.status !== 'failed' &&
    detail.status !== 'code_ready'
  ) {
    return null;
  }
  if (detail.status === 'generating_spec') {
    return (
      <PlanningStatusPanel
        copy={copy}
        phase={planningPhase}
        pipeline={detail.parts.pipeline}
      />
    );
  }
  const failed = detail.status === 'failed';
  const renderStage = detail.parts.render?.stage;
  const renderStages = [
    'queued',
    'validating',
    'compiling',
    'transcoding',
    'reviewing',
    'uploading',
  ] as const;
  const stageIndex = renderStage
    ? renderStages.findIndex((stage) => stage === renderStage)
    : -1;
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
              : detail.status === 'failed'
                ? copy.failed
                : copy.statuses[detail.status]}
          </div>
          {detail.status === 'code_ready' && (
            <p className="text-muted-foreground mt-1 text-sm">
              {copy.codeReadyDescription}
            </p>
          )}
          {failed && (
            <div className="text-destructive mt-1 text-sm">
              <p>{localizedFailure(copy, detail.parts.failure)}</p>
              {detail.parts.failure?.requestId && (
                <p className="text-muted-foreground mt-1 font-mono text-[10px]">
                  ID: {detail.parts.failure.requestId}
                </p>
              )}
            </div>
          )}
        </div>
      </div>
      {!failed && (
        <Progress
          className="mt-4"
          value={
            detail.parts.render?.progress ?? progressByStatus[detail.status]
          }
        />
      )}
      {['queued', 'rendering'].includes(detail.status) && (
        <div className="mt-4 border-t pt-4">
          <ol className="grid gap-2 sm:grid-cols-6">
            {renderStages.map((stage, index) => {
              const completed = stageIndex > index;
              const active = stageIndex === index;
              return (
                <li key={stage} className="flex items-center gap-2 text-xs">
                  <span
                    className={cn(
                      'flex size-5 shrink-0 items-center justify-center rounded-full border',
                      completed &&
                        'border-primary bg-primary text-primary-foreground',
                      active && 'border-primary text-primary',
                      !completed &&
                        !active &&
                        'border-border text-muted-foreground'
                    )}
                  >
                    {completed ? (
                      <Check className="size-3" />
                    ) : active ? (
                      <LoaderCircle className="size-3 animate-spin" />
                    ) : (
                      <span className="size-1 rounded-full bg-current" />
                    )}
                  </span>
                  <span
                    className={
                      active ? 'font-semibold' : 'text-muted-foreground'
                    }
                  >
                    {copy.renderStages[stage]}
                  </span>
                </li>
              );
            })}
          </ol>
          <div className="mt-4 flex justify-end">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={cancelMutation.isPending}
              onClick={() => cancelMutation.mutate()}
            >
              {cancelMutation.isPending ? (
                <LoaderCircle className="animate-spin" />
              ) : (
                <X />
              )}
              {copy.cancelRender}
            </Button>
          </div>
        </div>
      )}
      {failed &&
        detail.parts.failure?.stage === 'spec' &&
        detail.parts.failure.retryable &&
        onRetryPlan && (
          <div className="mt-4 flex justify-end border-t pt-3">
            <Button
              type="button"
              size="sm"
              disabled={retryingPlan}
              onClick={onRetryPlan}
            >
              {retryingPlan ? (
                <LoaderCircle className="animate-spin motion-reduce:animate-none" />
              ) : (
                <Sparkles />
              )}
              {copy.retryPlan}
            </Button>
          </div>
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

function SpecificationView({
  detail,
  copy,
}: {
  detail: AnimationDetail;
  copy: CreatorWorkspaceCopy;
}) {
  const spec = detail.parts.spec;
  if (!spec) return null;
  if (isAnimationSpecRenderable(spec)) {
    return <V2SpecificationEditor detail={detail} copy={copy} />;
  }
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
            {copy.scenes}: {spec.scenes?.length || 0}
          </Badge>
          {detail.parts.versions.length > 0 && (
            <Badge variant="outline">
              {copy.versions}: {detail.parts.versions.length}
            </Badge>
          )}
        </div>
      </div>

      {((spec.formulas?.length || 0) > 0 || spec.assumptions.length > 0) && (
        <div className="grid gap-4">
          {(spec.formulas?.length || 0) > 0 && (
            <section className="bg-muted/45 rounded-lg border p-4">
              <h3 className="mb-2 text-sm font-semibold">{copy.formulas}</h3>
              <div className="space-y-2">
                {(spec.formulas || []).map((formula) => (
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

      {typeof spec.layout === 'string' && spec.layout && (
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
        {(spec.scenes || []).map((scene, index) => (
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

function V2SpecificationEditor({
  detail,
  copy,
}: {
  detail: AnimationDetail;
  copy: CreatorWorkspaceCopy;
}) {
  const queryClient = useQueryClient();
  const source = detail.parts.spec;
  if (!source || !isAnimationSpecRenderable(source)) return null;
  const [draft, setDraft] = useState(source);
  const [selectedVersion, setSelectedVersion] = useState<string>('');
  const timelineRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<
    | {
        pointerId: number;
        eventId: string;
        mode: 'move' | 'resize';
        startX: number;
        initialAt: number;
        initialRunTime: number;
      }
    | undefined
  >(undefined);

  useEffect(() => {
    if (detail.parts.spec && isAnimationSpecRenderable(detail.parts.spec)) {
      setDraft(detail.parts.spec);
    }
  }, [detail.id, detail.parts.spec]);

  function accept(next: AnimationDetail) {
    queryClient.setQueriesData<AnimationDetail>(
      { queryKey: ['animation'], exact: false },
      (current) => (current?.id === next.id ? next : current)
    );
    queryClient.invalidateQueries({ queryKey: ['animations'] });
  }

  const saveMutation = useMutation({
    mutationFn: () =>
      apiPatch<AnimationDetail>(`/api/animations/${detail.id}/spec`, {
        spec: draft,
      }),
    onSuccess: (next) => {
      accept(next);
      toast.success(copy.specSaved);
    },
    onError: (error: Error) => toast.error(error.message || copy.actionFailed),
  });
  const restoreMutation = useMutation({
    mutationFn: () =>
      apiPost<AnimationDetail>(
        `/api/animations/${detail.id}/versions/${selectedVersion}/restore`,
        {}
      ),
    onSuccess: (next) => {
      accept(next);
      setSelectedVersion('');
      toast.success(copy.restoreSucceeded);
    },
    onError: (error: Error) => toast.error(error.message || copy.actionFailed),
  });

  function updateObject(
    id: string,
    values: Partial<(typeof draft.objects)[number]>
  ) {
    setDraft((current) => ({
      ...current,
      objects: current.objects.map((object) =>
        object.id === id ? { ...object, ...values } : object
      ),
    }));
  }

  function updateEvent(
    id: string,
    values: Partial<(typeof draft.timeline)[number]>
  ) {
    setDraft((current) => ({
      ...current,
      timeline: current.timeline.map((event) =>
        event.id === id ? { ...event, ...values } : event
      ),
    }));
  }

  function beginDrag(
    pointer: React.PointerEvent<HTMLDivElement>,
    event: (typeof draft.timeline)[number],
    mode: 'move' | 'resize'
  ) {
    pointer.preventDefault();
    pointer.stopPropagation();
    pointer.currentTarget.setPointerCapture(pointer.pointerId);
    dragRef.current = {
      pointerId: pointer.pointerId,
      eventId: event.id,
      mode,
      startX: pointer.clientX,
      initialAt: event.at,
      initialRunTime: event.runTime,
    };
  }

  function drag(pointer: React.PointerEvent<HTMLDivElement>) {
    const state = dragRef.current;
    const width = timelineRef.current?.getBoundingClientRect().width || 1;
    if (!state || state.pointerId !== pointer.pointerId) return;
    const delta =
      ((pointer.clientX - state.startX) / width) * draft.durationSeconds;
    if (state.mode === 'move') {
      const at = Math.max(
        0,
        Math.min(
          draft.durationSeconds - state.initialRunTime,
          Math.round((state.initialAt + delta) * 10) / 10
        )
      );
      updateEvent(state.eventId, { at });
    } else {
      const runTime = Math.max(
        0.1,
        Math.min(
          draft.durationSeconds - state.initialAt,
          Math.round((state.initialRunTime + delta) * 10) / 10
        )
      );
      updateEvent(state.eventId, { runTime });
    }
  }

  function endDrag(pointer: React.PointerEvent<HTMLDivElement>) {
    if (dragRef.current?.pointerId !== pointer.pointerId) return;
    dragRef.current = undefined;
    pointer.currentTarget.releasePointerCapture(pointer.pointerId);
  }

  return (
    <div className="space-y-5">
      <section className="bg-card rounded-xl border p-4 sm:p-5">
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="grid gap-2 text-xs font-semibold uppercase">
            {copy.title}
            <input
              value={draft.title}
              maxLength={160}
              onChange={(event) =>
                setDraft((current) => ({
                  ...current,
                  title: event.target.value,
                }))
              }
              className="border-input bg-background h-10 rounded-lg border px-3 text-sm font-normal normal-case"
            />
          </label>
          <label className="grid gap-2 text-xs font-semibold uppercase">
            {copy.layout}
            <Select
              value={draft.layout.regions}
              onValueChange={(value) =>
                setDraft((current) => {
                  const currentLayout = current.layout;
                  return {
                    ...current,
                    layout: {
                      title:
                        typeof currentLayout === 'object'
                          ? currentLayout.title
                          : undefined,
                      regions: (value || 'single') as
                        | 'single'
                        | 'left|right'
                        | 'top|bottom',
                    },
                  };
                })
              }
            >
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="single">single</SelectItem>
                <SelectItem value="left|right">left | right</SelectItem>
                <SelectItem value="top|bottom">top | bottom</SelectItem>
              </SelectContent>
            </Select>
          </label>
        </div>
        <label className="mt-4 grid gap-2 text-xs font-semibold uppercase">
          {copy.subtitle}
          <Textarea
            value={draft.summary}
            maxLength={2400}
            onChange={(event) =>
              setDraft((current) => ({
                ...current,
                summary: event.target.value,
              }))
            }
            className="min-h-20 resize-none text-sm font-normal normal-case"
          />
        </label>
      </section>

      {isAnimationSpecDirected(draft) && (
        <section className="bg-card rounded-xl border p-4 sm:p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h3 className="text-sm font-semibold">{copy.directorIntent}</h3>
            <div className="flex flex-wrap gap-2">
              <Badge variant="secondary">{draft.direction.preset}</Badge>
              <Badge variant="outline">{draft.direction.frame}</Badge>
              <Badge variant="outline">{draft.direction.pacing}</Badge>
              {isAnimationSpecV4(draft) && (
                <Badge variant="outline">
                  {copy.cinematography}: {draft.cinematography.scene}
                </Badge>
              )}
            </div>
          </div>
          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            {[
              [copy.learningGoal, draft.intent.learningGoal],
              [copy.hook, draft.intent.hook],
              [copy.takeaway, draft.intent.takeaway],
            ].map(([label, value]) => (
              <div key={label} className="bg-muted/35 rounded-lg border p-3">
                <p className="text-muted-foreground text-[10px] font-semibold tracking-wide uppercase">
                  {label}
                </p>
                <p className="mt-2 text-sm leading-6">{value}</p>
              </div>
            ))}
          </div>
          {isAnimationSpecV4(draft) && (
            <div className="bg-muted/25 mt-5 rounded-lg border p-3">
              <h4 className="text-sm font-semibold">{copy.mathDossier}</h4>
              <div className="mt-3 grid gap-3 sm:grid-cols-3">
                {[
                  [copy.coreClaim, draft.mathDossier.coreClaim],
                  [copy.commonMisreading, draft.mathDossier.commonMisreading],
                  [copy.visualProof, draft.mathDossier.visualProof],
                ].map(([label, value]) => (
                  <div key={label}>
                    <p className="text-muted-foreground text-[10px] font-semibold tracking-wide uppercase">
                      {label}
                    </p>
                    <p className="mt-1 text-xs leading-5">{value}</p>
                  </div>
                ))}
              </div>
              <p className="text-muted-foreground mt-3 text-[10px] font-semibold tracking-wide uppercase">
                {copy.invariants}
              </p>
              <p className="mt-1 text-xs leading-5">
                {draft.mathDossier.invariants.join(' · ')}
              </p>
            </div>
          )}
          <div className="mt-5">
            <h4 className="text-sm font-semibold">{copy.shotPlan}</h4>
            <div className="mt-3 grid gap-3">
              {draft.shots.map((shot) => (
                <div
                  key={shot.id}
                  className="grid gap-3 rounded-lg border p-3 sm:grid-cols-[7rem_1fr_8rem]"
                >
                  <div>
                    <Badge variant="outline">{shot.beat}</Badge>
                    <p className="text-muted-foreground mt-2 font-mono text-[10px]">
                      {shot.startAt}s–{shot.endAt}s
                    </p>
                  </div>
                  <div>
                    <p className="text-sm leading-6">{shot.purpose}</p>
                    <p className="text-muted-foreground mt-1 text-xs">
                      {copy.acceptance}: {shot.acceptance.join(' · ')}
                    </p>
                  </div>
                  <div className="text-muted-foreground font-mono text-[10px] sm:text-right">
                    <p>{shot.focusRef}</p>
                    <p className="mt-1">{shot.transition}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      <section className="overflow-hidden rounded-xl border">
        <div className="bg-muted/35 border-b px-4 py-3">
          <h3 className="text-sm font-semibold">{copy.objectsLabel}</h3>
        </div>
        <div className="divide-y">
          {draft.objects.map((object) => (
            <div
              key={object.id}
              className="grid gap-3 p-4 sm:grid-cols-[7rem_1fr_8rem]"
            >
              <div>
                <Badge variant="outline">{object.kind}</Badge>
                <p className="text-muted-foreground mt-2 font-mono text-[10px]">
                  {object.id}
                </p>
              </div>
              <label className="grid gap-1.5 text-xs font-medium">
                {object.kind === 'text' ? copy.title : copy.formulas}
                <input
                  value={
                    object.kind === 'text'
                      ? object.label || ''
                      : object.parts?.map((part) => part.latex).join('') ||
                        object.expr ||
                        ''
                  }
                  onChange={(event) =>
                    updateObject(
                      object.id,
                      object.kind === 'text'
                        ? { label: event.target.value }
                        : { expr: event.target.value }
                    )
                  }
                  disabled={
                    object.kind === 'axes' ||
                    object.kind === 'matrix' ||
                    !!object.parts?.length
                  }
                  className="border-input bg-background h-10 min-w-0 rounded-lg border px-3 font-mono text-sm disabled:opacity-45"
                />
              </label>
              <label className="grid gap-1.5 text-xs font-medium">
                {copy.visualStyle}
                <input
                  type="color"
                  value={
                    /^#[0-9A-Fa-f]{6}$/.test(object.color || '')
                      ? object.color
                      : '#7C8CFF'
                  }
                  onChange={(event) =>
                    updateObject(object.id, { color: event.target.value })
                  }
                  className="border-input bg-background h-10 w-full rounded-lg border p-1.5"
                />
              </label>
              {object.parts?.length ? (
                <div className="sm:col-start-2 sm:col-end-4">
                  <p className="text-muted-foreground text-[10px] font-semibold tracking-wide uppercase">
                    {copy.formulaParts}
                  </p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {object.parts.map((part) => (
                      <span
                        key={part.id}
                        className="bg-muted/45 inline-flex items-center gap-2 rounded-md border px-2 py-1 text-xs"
                        title={part.meaning}
                      >
                        <span
                          aria-hidden
                          className="size-2 rounded-full"
                          style={{
                            backgroundColor: part.color || object.color,
                          }}
                        />
                        <span className="font-mono">{part.latex}</span>
                        <span className="text-muted-foreground">
                          {part.meaning}
                        </span>
                      </span>
                    ))}
                  </div>
                </div>
              ) : null}
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-xl border p-4 sm:p-5">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-semibold">{copy.timelineLabel}</h3>
            <p className="text-muted-foreground mt-1 font-mono text-[10px]">
              0s — {draft.durationSeconds}s
            </p>
          </div>
          <Badge variant="secondary">{draft.timeline.length}</Badge>
        </div>
        <div
          ref={timelineRef}
          className="bg-muted/25 relative mt-5 space-y-2 overflow-hidden rounded-lg border p-3"
        >
          <div className="border-border pointer-events-none absolute inset-y-0 left-1/4 border-l border-dashed" />
          <div className="border-border pointer-events-none absolute inset-y-0 left-1/2 border-l border-dashed" />
          <div className="border-border pointer-events-none absolute inset-y-0 left-3/4 border-l border-dashed" />
          {draft.timeline.map((event) => (
            <div key={event.id} className="relative h-9">
              <div
                role="slider"
                tabIndex={0}
                aria-label={`${event.ref} ${event.at}s`}
                aria-valuemin={0}
                aria-valuemax={draft.durationSeconds}
                aria-valuenow={event.at}
                onPointerDown={(pointer) => beginDrag(pointer, event, 'move')}
                onPointerMove={drag}
                onPointerUp={endDrag}
                onPointerCancel={endDrag}
                className="bg-primary/16 border-primary/35 text-primary absolute top-1 flex h-7 cursor-grab touch-none items-center overflow-hidden rounded-md border px-2 font-mono text-[9px] active:cursor-grabbing"
                style={{
                  left: `${(event.at / draft.durationSeconds) * 100}%`,
                  width: `${Math.max(4, (event.runTime / draft.durationSeconds) * 100)}%`,
                }}
              >
                <span className="truncate">
                  {event.ref} · {event.op}
                </span>
                <div
                  aria-hidden
                  onPointerDown={(pointer) =>
                    beginDrag(pointer, event, 'resize')
                  }
                  className="bg-primary/45 absolute inset-y-0 right-0 w-2 cursor-ew-resize"
                />
              </div>
            </div>
          ))}
        </div>
        <div className="mt-4 space-y-2">
          {draft.timeline.map((event) => (
            <div
              key={event.id}
              className="grid gap-2 rounded-lg border p-3 text-xs sm:grid-cols-[1fr_6rem_6rem_8rem] sm:items-end"
            >
              <div className="min-w-0">
                <p className="truncate font-semibold">{event.ref}</p>
                <p className="text-muted-foreground mt-1 font-mono text-[9px]">
                  {event.op}
                </p>
              </div>
              <label className="grid gap-1">
                {copy.startTime}
                <input
                  type="number"
                  min={0}
                  max={draft.durationSeconds}
                  step={0.1}
                  value={event.at}
                  onChange={(e) =>
                    updateEvent(event.id, { at: Number(e.target.value) })
                  }
                  className="border-input bg-background h-9 rounded-md border px-2"
                />
              </label>
              <label className="grid gap-1">
                {copy.runTime}
                <input
                  type="number"
                  min={0.1}
                  max={draft.durationSeconds}
                  step={0.1}
                  value={event.runTime}
                  onChange={(e) =>
                    updateEvent(event.id, { runTime: Number(e.target.value) })
                  }
                  className="border-input bg-background h-9 rounded-md border px-2"
                />
              </label>
              <label className="grid gap-1">
                {copy.ease}
                <Select
                  value={event.ease}
                  onValueChange={(value) =>
                    updateEvent(event.id, {
                      ease: (value || 'smooth') as typeof event.ease,
                    })
                  }
                >
                  <SelectTrigger className="h-9 w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="linear">linear</SelectItem>
                    <SelectItem value="smooth">smooth</SelectItem>
                    <SelectItem value="there_and_back">there & back</SelectItem>
                  </SelectContent>
                </Select>
              </label>
            </div>
          ))}
        </div>
      </section>

      <div className="bg-card flex flex-wrap items-end gap-3 rounded-xl border p-4">
        {detail.parts.versions.length > 0 && (
          <label className="grid min-w-48 flex-1 gap-1.5 text-xs font-medium">
            {copy.versions}
            <Select
              value={selectedVersion}
              onValueChange={(value) => setSelectedVersion(value || '')}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder={copy.versions} />
              </SelectTrigger>
              <SelectContent>
                {detail.parts.versions.map((version) => (
                  <SelectItem
                    key={version.version}
                    value={String(version.version)}
                  >
                    v{version.version} ·{' '}
                    {new Date(version.createdAt).toLocaleString()}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </label>
        )}
        {detail.parts.versions.length > 0 && (
          <Button
            type="button"
            variant="outline"
            disabled={!selectedVersion || restoreMutation.isPending}
            onClick={() => restoreMutation.mutate()}
          >
            {restoreMutation.isPending ? (
              <LoaderCircle className="animate-spin" />
            ) : (
              <History />
            )}
            {copy.restoreVersion}
          </Button>
        )}
        <Button
          type="button"
          className="bg-foreground text-background hover:bg-primary ml-auto"
          disabled={saveMutation.isPending}
          onClick={() => saveMutation.mutate()}
        >
          {saveMutation.isPending ? (
            <LoaderCircle className="animate-spin" />
          ) : (
            <Check />
          )}
          {saveMutation.isPending ? copy.savingSpec : copy.saveSpec}
        </Button>
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
  const queryClient = useQueryClient();
  const videoRef = useRef<HTMLVideoElement>(null);
  const fallbackObjectUrlRef = useRef<string | undefined>(undefined);
  const [mediaError, setMediaError] = useState(false);
  const [fallbackLoading, setFallbackLoading] = useState(false);
  const [fallbackVideoUrl, setFallbackVideoUrl] = useState<string>();
  const [playing, setPlaying] = useState(false);
  const [videoLoaded, setVideoLoaded] = useState(false);
  const publishMutation = useMutation({
    mutationFn: () =>
      apiPost<AnimationDetail>(`/api/animations/${detail?.id}/publish`, {}),
    onSuccess: (next) => {
      queryClient.setQueriesData<AnimationDetail>(
        { queryKey: ['animation'], exact: false },
        (current) => (current?.id === next.id ? next : current)
      );
      queryClient.invalidateQueries({ queryKey: ['animations'] });
      toast.success(copy.publishedGallery);
    },
    onError: (error: Error) => toast.error(error.message || copy.actionFailed),
  });
  useEffect(() => {
    if (fallbackObjectUrlRef.current) {
      URL.revokeObjectURL(fallbackObjectUrlRef.current);
      fallbackObjectUrlRef.current = undefined;
    }
    setMediaError(false);
    setFallbackLoading(false);
    setFallbackVideoUrl(undefined);
    setPlaying(false);
    setVideoLoaded(false);
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
  async function downloadVideo() {
    if (!detail?.parts.videoUrl) return;
    try {
      const blob = await apiGetBlob(detail.parts.videoUrl);
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${codeFilename(detail.title).replace(/\.py$/, '')}.mp4`;
      link.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : copy.actionFailed);
    }
  }
  function downloadPython() {
    if (!detail?.parts.code) return;
    const url = URL.createObjectURL(
      new Blob([detail.parts.code], { type: 'text/x-python;charset=utf-8' })
    );
    const link = document.createElement('a');
    link.href = url;
    link.download = codeFilename(detail.title);
    link.click();
    URL.revokeObjectURL(url);
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
  const previewFormula =
    detail?.parts.sourceFormula ||
    (detail?.parts.spec && isAnimationSpecRenderable(detail.parts.spec)
      ? (() => {
          const formula = detail.parts.spec.objects.find(
            (object) => object.kind === 'formula'
          );
          return (
            formula?.expr || formula?.parts?.map((part) => part.latex).join('')
          );
        })()
      : detail?.parts.spec?.formulas?.[0]);

  return (
    <section
      aria-label={copy.preview}
      className={cn(
        'bg-muted/25 flex min-h-0 flex-col',
        compact
          ? 'h-[420px] overflow-hidden rounded-2xl border sm:h-[520px]'
          : 'size-full'
      )}
    >
      <div className="relative flex size-full min-h-64 items-center justify-center overflow-hidden bg-[#0b0d14]">
        <div className="curvg-coordinate-grid pointer-events-none absolute inset-0 opacity-[0.12]" />
        <div className="from-primary/10 pointer-events-none absolute inset-x-0 top-0 h-28 bg-gradient-to-b to-transparent" />

        {detail && (
          <div className="absolute top-3 right-3 z-20 flex items-center gap-2">
            <span
              className={cn(
                'rounded-full border px-2.5 py-1 font-mono text-[10px] tracking-[0.08em] uppercase backdrop-blur-sm',
                detail.status === 'failed'
                  ? 'border-red-400/35 bg-red-950/55 text-red-300'
                  : 'border-white/15 bg-black/55 text-white/75'
              )}
            >
              {busy
                ? statusLabel
                : detail.parts.spec?.durationSeconds
                  ? `${detail.parts.spec.durationSeconds}s`
                  : statusLabel}
            </span>
          </div>
        )}

        {detail?.parts.videoUrl ? (
          <>
            <video
              ref={videoRef}
              className={cn(
                'relative z-10 max-h-full w-full object-contain transition-opacity duration-500 motion-reduce:transition-none',
                videoLoaded ? 'opacity-100' : 'opacity-0'
              )}
              src={fallbackVideoUrl || detail.parts.videoUrl}
              poster={detail.parts.thumbnailUrl}
              controls
              muted
              playsInline
              preload="metadata"
              onLoadedData={() => setVideoLoaded(true)}
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
                className="focus-visible:ring-primary absolute z-20 flex size-16 items-center justify-center rounded-full border border-white/20 bg-black/65 text-white shadow-2xl backdrop-blur-sm transition hover:scale-105 hover:bg-black/80 focus-visible:ring-2 focus-visible:outline-none motion-reduce:transition-none motion-reduce:hover:scale-100"
              >
                {fallbackLoading ? (
                  <LoaderCircle className="size-7 animate-spin motion-reduce:animate-none" />
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
            {previewFormula && (
              <code className="mt-4 max-w-full overflow-hidden rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2 font-mono text-xs text-white/65">
                {previewFormula}
              </code>
            )}
            {(busy || loading) && detail?.status !== 'generating_spec' && (
              <Progress
                className="mt-5 w-56 bg-white/10"
                value={detail ? progressByStatus[detail.status] : 12}
              />
            )}
          </div>
        )}
      </div>
      {detail?.status === 'completed' && detail.parts.videoUrl && (
        <div className="bg-card border-t">
          <div className="flex flex-wrap gap-2 p-3">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => void downloadVideo()}
            >
              <Download /> {copy.downloadVideo}
            </Button>
            {detail.parts.code && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={downloadPython}
              >
                <Code2 /> {copy.downloadCode}
              </Button>
            )}
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={!!detail.parts.publishedAt || publishMutation.isPending}
              onClick={() => publishMutation.mutate()}
            >
              {publishMutation.isPending ? (
                <LoaderCircle className="animate-spin" />
              ) : (
                <LayoutGrid />
              )}
              {detail.parts.publishedAt
                ? copy.publishedGallery
                : copy.publishGallery}
            </Button>
            <Button
              type="button"
              size="sm"
              className="bg-foreground text-background hover:bg-primary ml-auto"
              onClick={() =>
                document.getElementById('creator-revision-input')?.focus()
              }
            >
              <Plus /> {copy.editAgain}
            </Button>
          </div>
        </div>
      )}
    </section>
  );
}

function ArtifactInspector({
  detail,
  copy,
  loading = false,
  error = false,
  compact = false,
  planningPhase = 'understanding',
  retryingPlan = false,
  onRetryPlan,
  streamingText,
}: {
  detail?: AnimationDetail;
  copy: CreatorWorkspaceCopy;
  loading?: boolean;
  error?: boolean;
  compact?: boolean;
  planningPhase?: AnimationPlanningPhase;
  retryingPlan?: boolean;
  onRetryPlan?: () => void;
  streamingText?: string;
}) {
  const [tab, setTab] = useState<ArtifactTab>(() =>
    preferredArtifactTab(detail)
  );
  const previousStateRef = useRef('');
  const specStreaming =
    streamingText !== undefined || detail?.status === 'generating_spec';
  const specFailed =
    detail?.status === 'failed' && detail.parts.failure?.stage === 'spec';

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
      <Tabs
        value={tab}
        onValueChange={(value) =>
          setTab((value || preferredArtifactTab(detail)) as ArtifactTab)
        }
        className="relative min-h-0 flex-1 gap-0"
      >
        <TabsContent
          value="specification"
          className={cn(
            'absolute inset-0 overflow-y-auto',
            specStreaming ? 'pt-14' : 'px-4 pt-16 pb-5 sm:px-5'
          )}
        >
          {detail?.parts.spec ? (
            <SpecificationView detail={detail} copy={copy} />
          ) : specStreaming ? (
            <SceneBlueprintLoader
              detail={detail}
              copy={copy}
              phase={planningPhase}
              streamingText={streamingText}
            />
          ) : specFailed ? (
            <SceneBlueprintFailure
              detail={detail}
              copy={copy}
              retrying={retryingPlan}
              onRetry={onRetryPlan}
            />
          ) : (
            <div className="text-muted-foreground flex h-full items-center justify-center text-sm">
              {copy.statuses.generating_spec}
            </div>
          )}
        </TabsContent>

        <TabsContent
          value="code"
          className="absolute inset-0 overflow-hidden px-4 pt-16 pb-4"
        >
          {detail?.parts.code ? (
            <PythonCodeView
              code={detail.parts.code}
              title={detail.title}
              copy={copy}
              maxHeightClass="max-h-full"
            />
          ) : detail?.status === 'generating_code' ? (
            <div className="flex size-full flex-col overflow-hidden rounded-xl border">
              <div className="text-muted-foreground flex items-center gap-2 border-b px-4 py-3 font-mono text-[10px] tracking-[0.12em] uppercase">
                <LoaderCircle className="text-primary size-3.5 animate-spin motion-reduce:animate-none" />
                {copy.statuses.generating_code}
              </div>
              <div
                className="animate-pulse space-y-3 p-5 motion-reduce:animate-none"
                aria-hidden
              >
                {[72, 88, 64, 92, 58, 80, 68, 84, 76, 60].map((width, i) => (
                  <div
                    key={i}
                    className="bg-muted h-3 rounded"
                    style={{
                      width: `${width}%`,
                      marginLeft: i % 3 === 1 ? '1.5rem' : 0,
                    }}
                  />
                ))}
              </div>
            </div>
          ) : (
            <div className="text-muted-foreground flex h-full items-center justify-center text-sm">
              {copy.noCode}
            </div>
          )}
        </TabsContent>

        <TabsContent value="video" className="absolute inset-0 overflow-hidden">
          <AnimationPreview
            detail={detail}
            copy={copy}
            loading={loading}
            error={error}
          />
        </TabsContent>

        <div className="absolute inset-x-0 top-3 z-30 flex justify-start overflow-x-auto px-3 sm:justify-center">
          <TabsList
            variant="line"
            aria-label={copy.preview}
            className="h-10 min-w-max items-center gap-0 rounded-xl border border-white/[0.09] bg-[#14151d]/80 px-1.5 py-1 text-white/50 shadow-[0_10px_28px_-18px_rgba(0,0,0,0.9)] backdrop-blur-xl"
          >
            <TabsTrigger
              value="specification"
              disabled={!detail?.parts.spec && !specStreaming && !specFailed}
              className="group/artifact-tab h-8 flex-none rounded-lg border-0 px-3 text-xs text-white/45 after:hidden hover:bg-white/[0.04] hover:text-white/80 focus-visible:border-white/20 focus-visible:ring-white/15 data-active:bg-transparent data-active:text-white"
            >
              <Sparkles /> {copy.specification}
              <span
                aria-hidden
                className="bg-primary absolute bottom-0 left-1/2 h-0.5 w-4 -translate-x-1/2 rounded-full opacity-0 transition-opacity group-data-active/artifact-tab:opacity-100"
              />
            </TabsTrigger>
            <TabsTrigger
              value="code"
              disabled={
                !detail?.parts.code && detail?.status !== 'generating_code'
              }
              className="group/artifact-tab h-8 flex-none rounded-lg border-0 px-3 text-xs text-white/45 after:hidden hover:bg-white/[0.04] hover:text-white/80 focus-visible:border-white/20 focus-visible:ring-white/15 data-active:bg-transparent data-active:text-white"
            >
              <Code2 /> {copy.code}
              <span
                aria-hidden
                className="bg-primary absolute bottom-0 left-1/2 h-0.5 w-4 -translate-x-1/2 rounded-full opacity-0 transition-opacity group-data-active/artifact-tab:opacity-100"
              />
            </TabsTrigger>
            <TabsTrigger
              value="video"
              className="group/artifact-tab h-8 flex-none rounded-lg border-0 px-3 text-xs text-white/45 after:hidden hover:bg-white/[0.04] hover:text-white/80 focus-visible:border-white/20 focus-visible:ring-white/15 data-active:bg-transparent data-active:text-white"
            >
              <Film /> {copy.video}
              <span
                aria-hidden
                className="bg-primary absolute bottom-0 left-1/2 h-0.5 w-4 -translate-x-1/2 rounded-full opacity-0 transition-opacity group-data-active/artifact-tab:opacity-100"
              />
            </TabsTrigger>
          </TabsList>
        </div>
      </Tabs>
    </section>
  );
}

function ArtifactNudge({
  detail,
  copy,
  retrying,
  onRetry,
}: {
  detail: AnimationDetail;
  copy: CreatorWorkspaceCopy;
  retrying: boolean;
  onRetry: () => void;
}) {
  const spec = detail.parts.spec;
  const code = detail.parts.code;
  if (!spec && !code) return null;
  const canRetry =
    detail.status === 'code_ready' ||
    (detail.status === 'failed' &&
      detail.parts.failure?.retryable === true &&
      detail.parts.failure.stage !== 'spec');

  return (
    <div className="bg-card flex flex-wrap items-center gap-3 rounded-xl border px-4 py-3">
      <span className="bg-primary/5 text-primary border-primary/20 flex size-8 shrink-0 items-center justify-center rounded-lg border">
        {code ? (
          <Code2 className="size-4" aria-hidden />
        ) : (
          <Sparkles className="size-4" aria-hidden />
        )}
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold">
          {spec?.title ?? copy.code}
        </p>
        <p className="text-muted-foreground mt-0.5 truncate text-xs">
          {spec
            ? `${isAnimationSpecRenderable(spec) ? copy.objectsLabel : copy.scenes} ${isAnimationSpecRenderable(spec) ? spec.objects.length : spec.scenes?.length || 0} · ${copy.duration} ${spec.durationSeconds}s`
            : copy.codeReadyTitle}
          {code ? ` · ${copy.code}` : ''}
        </p>
      </div>
      {canRetry && (
        <Button
          size="sm"
          onClick={onRetry}
          disabled={retrying}
          className="bg-foreground text-background hover:bg-primary"
        >
          {retrying ? (
            <LoaderCircle className="animate-spin motion-reduce:animate-none" />
          ) : (
            <Play />
          )}
          {detail.status === 'code_ready' ||
          detail.parts.failure?.stage === 'render'
            ? copy.retryRender
            : copy.retryCode}
        </Button>
      )}
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
  const [creationMode, setCreationMode] =
    useState<AnimationCreationMode>('description');
  const [prompt, setPrompt] = useState('');
  const [formula, setFormula] = useState('sin(x)');
  const [formulaIntent, setFormulaIntent] = useState('');
  const [mathObjectType, setMathObjectType] =
    useState<AnimationMathObjectType>('function');
  const [mathTypeOverridden, setMathTypeOverridden] = useState(false);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>();
  const [templateValues, setTemplateValues] = useState<Record<string, string>>(
    {}
  );
  const [subject, setSubject] = useState<AnimationSubject>('general');
  const [modelValue, setModelValue] = useState('auto');
  const [historyOpen, setHistoryOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [hydrated, setHydrated] = useState(false);
  const [guestDraftReady, setGuestDraftReady] = useState(false);
  const [streamingAnimationId, setStreamingAnimationId] = useState<string>();
  const [streamingText, setStreamingText] = useState('');
  const [planningPhase, setPlanningPhase] =
    useState<AnimationPlanningPhase>('understanding');
  const [pendingAnimation, setPendingAnimation] = useState<AnimationDetail>();
  const [splitRatio, setSplitRatio] = useState(DEFAULT_SPLIT_RATIO);
  const [isXlViewport, setIsXlViewport] = useState(false);
  const hasHydratedUser = hydrated && !!user;
  const messageEndRef = useRef<HTMLDivElement>(null);
  const splitContainerRef = useRef<HTMLDivElement>(null);
  const splitDragPointerRef = useRef<number | null>(null);
  const previousMessageCountRef = useRef<number | undefined>(undefined);
  const generationStartedRef = useRef(false);
  const streamAbortRef = useRef<AbortController | null>(null);
  const animationsQueryKey = ['animations', user?.id] as const;
  const modelsQueryKey = ['animation-models', user?.id] as const;
  const detailQueryKey = ['animation', user?.id, selectedId] as const;

  const templatesQuery = useQuery({
    queryKey: ['animation-templates', locale],
    queryFn: () =>
      apiGet<AnimationTemplateSummary[]>('/api/animation-templates'),
    enabled: hydrated,
    staleTime: 10 * 60_000,
  });

  const listQuery = useQuery({
    queryKey: animationsQueryKey,
    queryFn: () => apiGet<AnimationSummary[]>('/api/animations'),
    enabled: !!user,
  });

  const modelsQuery = useQuery({
    queryKey: modelsQueryKey,
    queryFn: () => apiGet<AnimationModelCatalog>('/api/animations/models'),
    enabled: !!user,
    staleTime: 60_000,
  });

  const creditsQuery = useQuery({
    queryKey: ['user-credits', 'balance'],
    queryFn: () => apiGet<{ balance: number }>('/api/credits'),
    enabled: !!user,
    staleTime: 30_000,
  });

  const detailQuery = useQuery({
    queryKey: detailQueryKey,
    queryFn: () => apiGet<AnimationDetail>(`/api/animations/${selectedId}`),
    enabled: !!user && !!selectedId && !pendingAnimation,
    refetchInterval: (query) =>
      isAnimationBusy(query.state.data?.status) ? 2500 : false,
  });
  const detail = pendingAnimation || detailQuery.data;
  const detailLoading =
    !hydrated || sessionPending || (!pendingAnimation && detailQuery.isLoading);

  useEffect(() => {
    if (
      !detail ||
      !['completed', 'failed', 'canceled'].includes(detail.status)
    ) {
      return;
    }
    queryClient.invalidateQueries({
      queryKey: ['user-credits', 'balance'],
    });
  }, [detail?.status, queryClient]);

  const conversationTurns = useMemo<AnimationMessage[][]>(() => {
    const messages =
      detail?.messages.filter((message) => message.status !== 'failed') ?? [];
    const turns: AnimationMessage[][] = [];
    for (const message of messages) {
      if (message.role === 'user' || turns.length === 0) {
        turns.push([message]);
      } else {
        turns[turns.length - 1].push(message);
      }
    }
    return turns;
  }, [detail?.messages]);
  const catalog = modelsQuery.data;
  const curatedModelOptions: CreatorModelOption[] = CURATED_MODEL_PRESETS.map(
    (preset) => {
      const match = catalog?.options.find(
        (option) =>
          option.provider === preset.provider &&
          preset.models.includes(option.model)
      );
      const content = copy.curatedModels[preset.key];
      return {
        value: match
          ? animationModelValue(match.provider, match.model)
          : `unavailable:${preset.key}`,
        label: content.label,
        description: content.description,
        presetKey: preset.key,
        badge:
          preset.tier === 'free'
            ? copy.modelFree
            : preset.tier === 'starter'
              ? copy.modelStarter
              : copy.modelPro,
        requiredTier: match?.requiredTier || preset.tier,
        locked: !!match && !match.entitled,
        disabled: !match,
      };
    }
  );
  const autoAvailable = catalog?.options.some(
    (option) => option.isDefault && option.entitled
  );
  const modelOptions: CreatorModelOption[] = [
    {
      value: 'auto',
      label: copy.modelAuto,
      description: copy.modelAutoDescription,
      disabled: !modelsQuery.isLoading && !autoAvailable,
    },
    ...curatedModelOptions,
  ];
  const handleModelChange = (value: string) => {
    const option = modelOptions.find((candidate) => candidate.value === value);
    if (option?.locked) {
      router.push('/pricing');
      return;
    }
    if (!option?.disabled) setModelValue(value);
  };
  const persistedSelection = detail?.parts.modelSelection;
  const detailModelValue =
    persistedSelection?.choice === 'auto'
      ? 'auto'
      : persistedSelection &&
          isModelProvider(persistedSelection.choice) &&
          persistedSelection.model
        ? animationModelValue(
            persistedSelection.choice,
            persistedSelection.model
          )
        : detail && isModelProvider(detail.provider)
          ? animationModelValue(detail.provider, detail.model)
          : undefined;
  const resolvedDetailModelValue = modelOptions.some(
    (option) => option.value === detailModelValue && !option.disabled
  )
    ? detailModelValue
    : undefined;
  const persistedSelectionUnavailable =
    !!catalog &&
    !!persistedSelection &&
    persistedSelection.choice !== 'auto' &&
    !resolvedDetailModelValue;
  const persistedUnavailableValue = 'persisted-model-unavailable';
  if (persistedSelectionUnavailable) {
    modelOptions.push({
      value: persistedUnavailableValue,
      label: copy.modelUnavailableShort,
      description: copy.modelUnavailable,
      disabled: true,
    });
  }
  const detailModelPresetKey = detail
    ? CURATED_MODEL_PRESETS.find(
        (preset) =>
          preset.provider === detail.provider &&
          preset.models.includes(detail.model)
      )?.key
    : undefined;
  const displayedDetailModel = detailModelPresetKey
    ? copy.curatedModels[detailModelPresetKey].label
    : detail?.model;

  useEffect(() => {
    setHydrated(true);
    return () => streamAbortRef.current?.abort();
  }, []);

  useEffect(() => {
    if (!hydrated || sessionPending || guestDraftReady) return;
    const draft = readGuestCreatorDraft();
    if (draft) {
      setCreationMode(draft.creationMode);
      setPrompt(draft.prompt);
      setFormula(draft.formula);
      setFormulaIntent(draft.formulaIntent);
      setMathObjectType(draft.mathObjectType);
      setMathTypeOverridden(true);
      setSelectedTemplateId(draft.selectedTemplateId);
      setTemplateValues(draft.templateValues);
      setSubject(draft.subject);
    }
    if (user) window.sessionStorage.removeItem(GUEST_DRAFT_STORAGE_KEY);
    setGuestDraftReady(true);
  }, [guestDraftReady, hydrated, sessionPending, user]);

  useEffect(() => {
    if (!guestDraftReady || user) return;
    const hasMeaningfulDraft =
      (creationMode === 'description' && !!prompt.trim()) ||
      (creationMode === 'formula' &&
        (!!formulaIntent.trim() || formula.trim() !== 'sin(x)')) ||
      creationMode === 'template';
    if (!hasMeaningfulDraft) {
      window.sessionStorage.removeItem(GUEST_DRAFT_STORAGE_KEY);
      return;
    }
    const draft: GuestCreatorDraft = {
      savedAt: Date.now(),
      creationMode,
      prompt,
      formula,
      formulaIntent,
      mathObjectType,
      selectedTemplateId,
      templateValues,
      subject,
    };
    window.sessionStorage.setItem(
      GUEST_DRAFT_STORAGE_KEY,
      JSON.stringify(draft)
    );
  }, [
    creationMode,
    formula,
    formulaIntent,
    guestDraftReady,
    mathObjectType,
    prompt,
    selectedTemplateId,
    subject,
    templateValues,
    user,
  ]);

  useEffect(() => {
    const first = templatesQuery.data?.[0];
    if (!guestDraftReady || !first || selectedTemplateId) return;
    setSelectedTemplateId(first.id);
    setTemplateValues(
      Object.fromEntries(
        first.parameters.map((parameter) => [
          parameter.key,
          parameter.defaultValue,
        ])
      )
    );
  }, [guestDraftReady, selectedTemplateId, templatesQuery.data]);

  useEffect(() => {
    const stored = Number(window.localStorage.getItem(SPLIT_RATIO_STORAGE_KEY));
    if (
      Number.isFinite(stored) &&
      stored >= MIN_SPLIT_RATIO &&
      stored <= MAX_SPLIT_RATIO
    ) {
      setSplitRatio(stored);
    }
    const media = window.matchMedia('(min-width: 1280px)');
    const updateViewport = () => setIsXlViewport(media.matches);
    updateViewport();
    media.addEventListener('change', updateViewport);
    return () => media.removeEventListener('change', updateViewport);
  }, []);

  useEffect(() => {
    if (detail?.subject) setSubject(detail.subject);
  }, [detail?.subject]);

  useEffect(() => {
    if (!detail) return;
    setModelValue(
      resolvedDetailModelValue ||
        (persistedSelectionUnavailable ? persistedUnavailableValue : 'auto')
    );
  }, [detail?.id, resolvedDetailModelValue, persistedSelectionUnavailable]);

  useEffect(() => {
    if (!catalog) return;
    if (persistedSelectionUnavailable) return;
    const selected = modelOptions.find((option) => option.value === modelValue);
    if (!selected || selected.disabled) setModelValue('auto');
  }, [catalog, modelValue, persistedSelectionUnavailable]);

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

  function persistSplitRatio(value: number) {
    window.localStorage.setItem(SPLIT_RATIO_STORAGE_KEY, String(value));
  }

  function updateSplitFromPointer(clientX: number) {
    const container = splitContainerRef.current;
    if (!container) return;
    const rect = container.getBoundingClientRect();
    const next = (clientX - rect.left) / rect.width;
    setSplitRatio(Math.min(MAX_SPLIT_RATIO, Math.max(MIN_SPLIT_RATIO, next)));
  }

  function handleSplitPointerDown(event: React.PointerEvent<HTMLDivElement>) {
    event.preventDefault();
    splitDragPointerRef.current = event.pointerId;
    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function handleSplitPointerMove(event: React.PointerEvent<HTMLDivElement>) {
    if (splitDragPointerRef.current !== event.pointerId) return;
    updateSplitFromPointer(event.clientX);
  }

  function handleSplitPointerEnd(event: React.PointerEvent<HTMLDivElement>) {
    if (splitDragPointerRef.current !== event.pointerId) return;
    splitDragPointerRef.current = null;
    event.currentTarget.releasePointerCapture(event.pointerId);
    setSplitRatio((current) => {
      persistSplitRatio(current);
      return current;
    });
  }

  function handleSplitKeyDown(event: React.KeyboardEvent<HTMLDivElement>) {
    if (!['ArrowLeft', 'ArrowRight', 'Home'].includes(event.key)) return;
    event.preventDefault();
    const next =
      event.key === 'Home'
        ? DEFAULT_SPLIT_RATIO
        : Math.min(
            MAX_SPLIT_RATIO,
            Math.max(
              MIN_SPLIT_RATIO,
              splitRatio + (event.key === 'ArrowRight' ? 0.02 : -0.02)
            )
          );
    setSplitRatio(next);
    persistSplitRatio(next);
  }

  function resetSplit() {
    setSplitRatio(DEFAULT_SPLIT_RATIO);
    persistSplitRatio(DEFAULT_SPLIT_RATIO);
  }

  function acceptDetail(next: AnimationDetail) {
    setPendingAnimation(undefined);
    setSelectedId(next.id);
    setPrompt('');
    setFormulaIntent('');
    queryClient.setQueryData(['animation', user?.id, next.id], next);
    queryClient.invalidateQueries({ queryKey: animationsQueryKey });
    queryClient.invalidateQueries({ queryKey: ['user-credits', 'balance'] });
    router.replace(`/creator?animationId=${encodeURIComponent(next.id)}`);
  }

  function selectedModelRequest() {
    if (persistedSelectionUnavailable && persistedSelection) {
      return {
        modelChoice: persistedSelection.choice,
        model: persistedSelection.model,
      };
    }
    return parseAnimationModelValue(modelValue);
  }

  async function streamGeneration(url: string, body: unknown) {
    streamAbortRef.current?.abort();
    const abortController = new AbortController();
    streamAbortRef.current = abortController;
    generationStartedRef.current = false;
    let completed: AnimationDetail | undefined;
    let streamError: Error | undefined;
    let activeAnimationId: string | undefined;
    try {
      await apiPostEventStream<AnimationGenerationEvent>(
        url,
        body,
        (event) => {
          if (event.type === 'started') {
            generationStartedRef.current = true;
            activeAnimationId = event.animation.id;
            setStreamingAnimationId(event.animation.id);
            setStreamingText('');
            setPlanningPhase('understanding');
            acceptDetail(event.animation);
          } else if (event.type === 'accepted') {
            completed = event.animation;
            acceptDetail(event.animation);
            setStreamingAnimationId(undefined);
            setStreamingText('');
            setPlanningPhase('understanding');
          } else if (event.type === 'phase') {
            setPlanningPhase(event.phase);
          } else if (event.type === 'pipeline-stage') {
            if (activeAnimationId) {
              queryClient.setQueryData<AnimationDetail>(
                ['animation', user?.id, activeAnimationId],
                (current) => {
                  const pipeline = current?.parts.pipeline;
                  if (!current || !pipeline) return current;
                  return {
                    ...current,
                    parts: {
                      ...current.parts,
                      pipeline: {
                        ...pipeline,
                        currentStage:
                          event.stage.status === 'running'
                            ? event.stage.name
                            : pipeline.currentStage === event.stage.name
                              ? undefined
                              : pipeline.currentStage,
                        stages: pipeline.stages.map((stage) =>
                          stage.name === event.stage.name ? event.stage : stage
                        ),
                      },
                    },
                  };
                }
              );
            }
          } else if (event.type === 'delta') {
            setStreamingText((current) => current + event.delta);
          } else if (event.type === 'completed') {
            completed = event.animation;
            acceptDetail(event.animation);
            setStreamingAnimationId(undefined);
            setStreamingText('');
            setPlanningPhase('understanding');
          } else if (event.type === 'error') {
            streamError = new Error(event.message);
            if (event.failure) {
              Object.assign(streamError, { failure: event.failure });
            }
            setStreamingAnimationId(undefined);
            setStreamingText('');
            setPlanningPhase('understanding');
          }
        },
        { signal: abortController.signal }
      );
    } finally {
      if (streamAbortRef.current === abortController) {
        streamAbortRef.current = null;
      }
    }
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
        modelSelection: {
          choice: request.modelChoice,
          model: request.model,
        },
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
    setPlanningPhase('understanding');
  }

  function beginOptimisticRevision(request: CreatorGenerationRequest) {
    if (!detail) return;
    const now = new Date().toISOString();
    queryClient.setQueryData<AnimationDetail>(
      ['animation', user?.id, detail.id],
      {
        ...detail,
        status: 'generating_spec',
        prompt: request.prompt,
        subject: request.subject,
        updatedAt: now,
        parts: {
          ...detail.parts,
          subject: request.subject,
          prompt: request.prompt,
          modelSelection: {
            choice: request.modelChoice,
            model: request.model,
          },
          spec: undefined,
          code: undefined,
          videoUrl: undefined,
          thumbnailUrl: undefined,
          contactSheetUrl: undefined,
          qaReportUrl: undefined,
          visualQa: undefined,
          visualReview: undefined,
          render: undefined,
          error: undefined,
          failure: undefined,
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
      }
    );
    setPrompt('');
    setStreamingAnimationId(detail.id);
    setStreamingText('');
    setPlanningPhase('understanding');
  }

  const createMutation = useMutation({
    mutationFn: (request: CreatorGenerationRequest) => {
      if (request.mode === 'template') {
        return apiPost<AnimationDetail>('/api/animations', {
          mode: request.mode,
          templateId: request.templateId,
          values: request.values,
        });
      }
      return streamGeneration('/api/animations', {
        ...request,
      });
    },
    onSuccess: acceptDetail,
    onError: (error: Error, request) => {
      if (isAbortError(error)) return;
      if (!generationStartedRef.current) {
        setSelectedId(undefined);
        router.replace('/creator');
      }
      setPendingAnimation(undefined);
      if (request.mode === 'formula') setFormulaIntent(request.intent || '');
      else if (request.mode === 'description') setPrompt(request.prompt);
      setStreamingAnimationId(undefined);
      setStreamingText('');
      setPlanningPhase('understanding');
      generationStartedRef.current = false;
      queryClient.invalidateQueries({ queryKey: animationsQueryKey });
      toast.error(requestFailureMessage(copy, error));
    },
  });

  const reviseMutation = useMutation({
    mutationFn: (request: CreatorGenerationRequest) => {
      return streamGeneration(`/api/animations/${selectedId}/message`, {
        prompt: request.prompt,
        subject: request.subject,
        modelChoice: request.modelChoice,
        model: request.model,
      });
    },
    onSuccess: acceptDetail,
    onError: (error: Error, request) => {
      if (isAbortError(error)) return;
      setPrompt(request.prompt);
      setStreamingAnimationId(undefined);
      setStreamingText('');
      setPlanningPhase('understanding');
      generationStartedRef.current = false;
      queryClient.invalidateQueries({ queryKey: detailQueryKey });
      queryClient.invalidateQueries({ queryKey: animationsQueryKey });
      toast.error(requestFailureMessage(copy, error));
    },
  });

  const retryProductionMutation = useMutation({
    mutationFn: () =>
      apiPost<AnimationDetail>(`/api/animations/${selectedId}/approve`, {}),
    onSuccess: acceptDetail,
    onError: (error: Error) => {
      queryClient.invalidateQueries({ queryKey: detailQueryKey });
      queryClient.invalidateQueries({ queryKey: animationsQueryKey });
      toast.error(requestFailureMessage(copy, error));
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiDelete(`/api/animations/${id}`),
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: animationsQueryKey });
      queryClient.removeQueries({
        queryKey: ['animation', user?.id, id],
      });
      if (selectedId === id) startNew();
    },
    onError: () => toast.error(copy.deleteFailed),
  });

  const renameMutation = useMutation({
    mutationFn: ({ id, title }: { id: string; title: string }) =>
      apiPatch<AnimationDetail>(`/api/animations/${id}`, { title }),
    onSuccess: (next) => {
      queryClient.setQueryData<AnimationSummary[]>(
        animationsQueryKey,
        (current) =>
          current?.map((item) =>
            item.id === next.id
              ? { ...item, title: next.title, updatedAt: next.updatedAt }
              : item
          )
      );
      queryClient.setQueryData(['animation', user?.id, next.id], next);
      queryClient.invalidateQueries({ queryKey: animationsQueryKey });
    },
    onError: () => toast.error(copy.renameFailed),
  });

  const processing =
    createMutation.isPending ||
    reviseMutation.isPending ||
    retryProductionMutation.isPending ||
    isAnimationBusy(detail?.status);

  function startNew() {
    streamAbortRef.current?.abort();
    setPendingAnimation(undefined);
    setSelectedId(undefined);
    setPrompt('');
    setCreationMode('description');
    setFormulaIntent('');
    setMathObjectType(detectMathObjectType(formula));
    setMathTypeOverridden(false);
    setSubject('general');
    setModelValue('auto');
    setStreamingAnimationId(undefined);
    setStreamingText('');
    setPlanningPhase('understanding');
    generationStartedRef.current = false;
    setHistoryOpen(false);
    router.replace('/creator');
  }

  function selectAnimation(id: string) {
    streamAbortRef.current?.abort();
    setPendingAnimation(undefined);
    setSelectedId(id);
    setStreamingAnimationId(undefined);
    setStreamingText('');
    setPlanningPhase('understanding');
    generationStartedRef.current = false;
    setHistoryOpen(false);
    router.replace(`/creator?animationId=${encodeURIComponent(id)}`);
  }

  async function rename(id: string, title: string) {
    await renameMutation.mutateAsync({ id, title });
  }

  async function remove(id: string) {
    await deleteMutation.mutateAsync(id);
  }

  function retryFailedPlan() {
    if (
      !detail ||
      detail.status !== 'failed' ||
      detail.parts.failure?.stage !== 'spec' ||
      !detail.parts.failure.retryable
    ) {
      return;
    }
    const request: CreatorGenerationRequest = {
      prompt: detail.parts.prompt || detail.prompt,
      subject: detail.subject,
      mode: 'description',
      ...selectedModelRequest(),
    };
    beginOptimisticRevision(request);
    reviseMutation.mutate(request);
  }

  function submit(event: React.FormEvent) {
    event.preventDefault();
    if (sessionPending) return;
    if (!user) {
      router.push('/sign-in?callbackUrl=/creator');
      return;
    }
    if (processing) return;
    const mode = detail ? 'description' : creationMode;
    if (mode === 'template') {
      if (!selectedTemplateId) return;
      createMutation.mutate({
        mode,
        templateId: selectedTemplateId,
        values: templateValues,
        prompt:
          templatesQuery.data?.find(
            (template) => template.id === selectedTemplateId
          )?.title || copy.entryTemplate,
        subject: 'math',
        modelChoice: 'auto',
      });
      return;
    }
    const requestPrompt =
      mode === 'formula' ? formulaIntent.trim() : prompt.trim();
    if (!requestPrompt) return;
    if (mode === 'formula' && !formula.trim()) return;
    const selectedModel = modelOptions.find(
      (option) => option.value === modelValue
    );
    if (
      modelsQuery.isLoading ||
      modelsQuery.isError ||
      !selectedModel ||
      selectedModel.disabled
    ) {
      toast.error(copy.modelUnavailable);
      return;
    }
    const request: CreatorGenerationRequest = {
      prompt: requestPrompt,
      subject,
      mode,
      formula: mode === 'formula' ? formula.trim() : undefined,
      intent: mode === 'formula' ? formulaIntent.trim() : undefined,
      mathObjectType: mode === 'formula' ? mathObjectType : undefined,
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
  const legacyArchive =
    !!detail?.parts.spec && !isAnimationSpecRenderable(detail.parts.spec);
  const templateArchive = detail?.parts.creationMode === 'template';

  if ((!hydrated || sessionPending) && selectedId) {
    return (
      <div className="bg-background text-muted-foreground flex min-h-svh items-center justify-center gap-2 text-sm">
        <LoaderCircle className="text-primary size-4 animate-spin motion-reduce:animate-none" />
        {copy.loading}
      </div>
    );
  }

  if (!hydrated || sessionPending || !user) {
    return (
      <div className="curvg-stage curvg-frame bg-background flex h-svh min-h-0 flex-col overflow-hidden">
        {hydrated && !sessionPending && !user && (
          <GuestWorkspaceHeader copy={copy} />
        )}
        <Welcome
          copy={copy}
          locale={locale}
          creationMode={creationMode}
          onCreationModeChange={setCreationMode}
          prompt={prompt}
          onPromptChange={setPrompt}
          onSubmit={submit}
          subject={subject}
          onSubjectChange={setSubject}
          modelValue={modelValue}
          modelOptions={modelOptions}
          modelsLoading={hasHydratedUser && modelsQuery.isLoading}
          modelsError={hasHydratedUser && modelsQuery.isError}
          viewerTier={catalog?.viewerTier}
          onRetryModels={() => void modelsQuery.refetch()}
          onModelChange={handleModelChange}
          processing={processing}
          user={false}
          formula={formula}
          onFormulaChange={(value) => {
            setFormula(value);
            if (!mathTypeOverridden)
              setMathObjectType(detectMathObjectType(value));
          }}
          formulaIntent={formulaIntent}
          onFormulaIntentChange={setFormulaIntent}
          mathObjectType={mathObjectType}
          onMathObjectTypeChange={(value) => {
            setMathObjectType(value);
            setMathTypeOverridden(true);
          }}
          templates={templatesQuery.data ?? []}
          templatesLoading={templatesQuery.isLoading}
          selectedTemplateId={selectedTemplateId}
          onSelectedTemplateIdChange={setSelectedTemplateId}
          templateValues={templateValues}
          onTemplateValuesChange={setTemplateValues}
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
          user={user}
          credits={creditsQuery.data?.balance}
          creditsLoading={creditsQuery.isPending}
          collapsed={sidebarCollapsed}
          historyOpen={historyOpen}
          onToggleCollapsed={toggleSidebar}
          onHistoryOpenChange={setHistoryOpen}
          onCreate={startNew}
          onSelect={selectAnimation}
          onRename={rename}
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
            locale={locale}
            creationMode={creationMode}
            onCreationModeChange={setCreationMode}
            prompt={prompt}
            onPromptChange={setPrompt}
            onSubmit={submit}
            subject={subject}
            onSubjectChange={setSubject}
            modelValue={modelValue}
            modelOptions={modelOptions}
            modelsLoading={modelsQuery.isLoading}
            modelsError={modelsQuery.isError}
            viewerTier={catalog?.viewerTier}
            onRetryModels={() => void modelsQuery.refetch()}
            onModelChange={handleModelChange}
            processing={processing}
            user
            formula={formula}
            onFormulaChange={(value) => {
              setFormula(value);
              if (!mathTypeOverridden)
                setMathObjectType(detectMathObjectType(value));
            }}
            formulaIntent={formulaIntent}
            onFormulaIntentChange={setFormulaIntent}
            mathObjectType={mathObjectType}
            onMathObjectTypeChange={(value) => {
              setMathObjectType(value);
              setMathTypeOverridden(true);
            }}
            templates={templatesQuery.data ?? []}
            templatesLoading={templatesQuery.isLoading}
            selectedTemplateId={selectedTemplateId}
            onSelectedTemplateIdChange={setSelectedTemplateId}
            templateValues={templateValues}
            onTemplateValuesChange={setTemplateValues}
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
        user={user}
        credits={creditsQuery.data?.balance}
        creditsLoading={creditsQuery.isPending}
        collapsed={sidebarCollapsed}
        historyOpen={historyOpen}
        onToggleCollapsed={toggleSidebar}
        onHistoryOpenChange={setHistoryOpen}
        onCreate={startNew}
        onSelect={selectAnimation}
        onRename={rename}
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

        <div
          ref={splitContainerRef}
          className="flex min-h-0 flex-1 overflow-hidden"
        >
          <section
            aria-label={copy.conversation}
            style={isXlViewport ? { width: `${splitRatio * 100}%` } : undefined}
            className="bg-muted/10 flex min-w-0 flex-1 flex-col xl:flex-none"
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
                <div className="w-full space-y-4 px-4 py-5 sm:px-6">
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
                    className="space-y-6"
                    aria-live="polite"
                    aria-relevant="additions text"
                  >
                    {conversationTurns.map((turn, turnIndex) => (
                      <div key={turn[0].id} className="space-y-2.5">
                        {turn.map((message) => (
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
                              {message.status === 'failed'
                                ? localizedFailure(
                                    copy,
                                    thrownAnimationFailure(message.metadata) ||
                                      detail.parts.failure
                                  )
                                : localizedMessage(copy, message)}
                            </div>
                          </div>
                        ))}
                        {streamingAnimationId === detail.id &&
                          streamingText &&
                          turnIndex === conversationTurns.length - 1 && (
                            <div className="flex items-start justify-start gap-2.5">
                              <div className="bg-card max-w-[90%] rounded-xl border px-4 py-3 text-sm leading-6 sm:max-w-[84%]">
                                <div className="text-muted-foreground mb-1.5 flex items-center gap-1.5 font-mono text-[9px] tracking-[0.12em] uppercase">
                                  <span className="bg-primary curvg-blueprint-node size-1.5 rounded-full" />
                                  {copy.assistantLabel} ·{' '}
                                  {copy.planningPhases[planningPhase]}
                                </div>
                                <p className="whitespace-pre-wrap">
                                  {streamingText}
                                  <span
                                    className="curvg-cursor"
                                    aria-hidden="true"
                                  />
                                </p>
                              </div>
                            </div>
                          )}
                      </div>
                    ))}
                    <div ref={messageEndRef} />
                  </div>
                  <StatusPanel
                    detail={detail}
                    copy={copy}
                    planningPhase={planningPhase}
                    retryingPlan={reviseMutation.isPending}
                    onRetryPlan={retryFailedPlan}
                  />
                  <ArtifactNudge
                    detail={detail}
                    copy={copy}
                    retrying={retryProductionMutation.isPending}
                    onRetry={() => retryProductionMutation.mutate()}
                  />
                  <div className="xl:hidden">
                    <ArtifactInspector
                      detail={detail}
                      copy={copy}
                      compact
                      planningPhase={planningPhase}
                      retryingPlan={reviseMutation.isPending}
                      onRetryPlan={retryFailedPlan}
                      streamingText={
                        streamingAnimationId === detail.id
                          ? streamingText
                          : undefined
                      }
                    />
                  </div>
                </div>
              )}
            </div>

            <div className="bg-background/96 shrink-0 border-t px-3 py-3 sm:px-5">
              {legacyArchive || templateArchive ? (
                <div className="bg-card flex flex-wrap items-center gap-3 rounded-xl border px-4 py-3">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold">
                      {legacyArchive ? copy.legacyArchive : copy.entryTemplate}
                    </p>
                    <p className="text-muted-foreground mt-1 text-xs leading-5">
                      {legacyArchive
                        ? copy.legacyArchive
                        : copy.templateDescription}
                    </p>
                  </div>
                  <Button
                    type="button"
                    onClick={() => {
                      startNew();
                      setCreationMode('description');
                    }}
                  >
                    <Plus /> {copy.entryDescription}
                  </Button>
                </div>
              ) : (
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
                  modelsError={modelsQuery.isError}
                  viewerTier={catalog?.viewerTier}
                  onRetryModels={() => void modelsQuery.refetch()}
                  onModelChange={handleModelChange}
                  processing={processing}
                  hasDetail={!!detail}
                  user={hasHydratedUser}
                  className="w-full"
                />
              )}
            </div>
          </section>

          <div
            role="separator"
            aria-orientation="vertical"
            aria-label={copy.resizePanels}
            aria-valuenow={Math.round(splitRatio * 100)}
            aria-valuemin={MIN_SPLIT_RATIO * 100}
            aria-valuemax={MAX_SPLIT_RATIO * 100}
            tabIndex={0}
            onPointerDown={handleSplitPointerDown}
            onPointerMove={handleSplitPointerMove}
            onPointerUp={handleSplitPointerEnd}
            onPointerCancel={handleSplitPointerEnd}
            onKeyDown={handleSplitKeyDown}
            onDoubleClick={resetSplit}
            className="group relative hidden w-2 shrink-0 cursor-col-resize touch-none select-none focus-visible:outline-none xl:block"
          >
            <span
              aria-hidden
              className="bg-border group-hover:bg-primary/45 group-focus-visible:bg-primary absolute inset-y-0 left-1/2 w-px -translate-x-1/2 transition-colors motion-reduce:transition-none"
            />
          </div>

          <aside
            aria-label={copy.preview}
            className="hidden min-w-0 flex-1 xl:flex"
          >
            <ArtifactInspector
              detail={detail}
              copy={copy}
              loading={detailLoading}
              error={detailQuery.isError}
              planningPhase={planningPhase}
              retryingPlan={reviseMutation.isPending}
              onRetryPlan={retryFailedPlan}
              streamingText={
                detail && streamingAnimationId === detail.id
                  ? streamingText
                  : undefined
              }
            />
          </aside>
        </div>
      </section>
    </div>
  );
}
