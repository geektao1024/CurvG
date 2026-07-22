import { useEffect, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  AlertCircle,
  ArrowUp,
  Check,
  ChevronRight,
  Clock3,
  Code2,
  Copy,
  Film,
  History,
  LoaderCircle,
  Menu,
  MessageSquareText,
  Plus,
  Sparkles,
  Trash2,
} from 'lucide-react';
import { toast } from 'sonner';

import { useSession } from '@/core/auth/client';
import { useRouter } from '@/core/i18n/navigation';
import {
  isAnimationBusy,
  type AnimationDetail,
  type AnimationModelChoice,
  type AnimationStatus,
  type AnimationSubject,
  type AnimationSummary,
} from '@/lib/animation';
import { apiDelete, apiGet, apiPost } from '@/lib/api-client';
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

export interface CreatorWorkspaceCopy {
  title: string;
  subtitle: string;
  newAnimation: string;
  history: string;
  historyEmpty: string;
  openHistory: string;
  deleteAnimation: string;
  deleteConfirm: string;
  promptPlaceholder: string;
  promptHint: string;
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
  conversation: string;
  specification: string;
  code: string;
  video: string;
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
  noCode: string;
  noVideo: string;
  codeReadyTitle: string;
  codeReadyDescription: string;
  renderQueued: string;
  failed: string;
  copyCode: string;
  copied: string;
  versions: string;
  loading: string;
  loadFailed: string;
  subjects: CreatorOption<AnimationSubject>[];
  models: CreatorOption<AnimationModelChoice>[];
  statuses: Record<AnimationStatus, string>;
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

function HistoryList({
  items,
  selectedId,
  copy,
  locale,
  onSelect,
  onDelete,
}: {
  items: AnimationSummary[];
  selectedId?: string;
  copy: CreatorWorkspaceCopy;
  locale: string;
  onSelect: (id: string) => void;
  onDelete: (id: string) => void;
}) {
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex items-center justify-between px-4 py-3">
        <div className="flex items-center gap-2 text-sm font-semibold">
          <History className="size-4" />
          {copy.history}
        </div>
      </div>
      <div className="min-h-0 flex-1 space-y-1 overflow-y-auto px-2 pb-4">
        {items.length === 0 ? (
          <p className="text-muted-foreground px-2 py-8 text-center text-sm">
            {copy.historyEmpty}
          </p>
        ) : (
          items.map((item) => (
            <div
              key={item.id}
              className={cn(
                'group hover:bg-sidebar-accent flex w-full items-start gap-2 rounded-lg px-3 py-2.5 text-left transition-colors',
                selectedId === item.id && 'bg-sidebar-accent'
              )}
            >
              <button
                type="button"
                onClick={() => onSelect(item.id)}
                className="min-w-0 flex-1 text-left"
              >
                <div className="truncate text-sm font-medium">{item.title}</div>
                <div className="text-muted-foreground mt-1 flex items-center gap-1.5 text-xs">
                  <span>{copy.statuses[item.status]}</span>
                  <span>·</span>
                  <span>
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
                className="text-muted-foreground opacity-0 group-hover:opacity-100"
                aria-label={copy.deleteAnimation}
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

function Welcome({ copy }: { copy: CreatorWorkspaceCopy }) {
  return (
    <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col items-center justify-center px-5 py-12 text-center">
      <div className="bg-primary/15 text-primary-foreground mb-5 flex size-12 items-center justify-center rounded-2xl border">
        <Sparkles className="size-5" />
      </div>
      <p className="text-muted-foreground text-xs font-semibold tracking-[0.16em] uppercase">
        {copy.welcomeEyebrow}
      </p>
      <h1 className="mt-3 max-w-2xl font-serif text-3xl leading-tight tracking-[-0.04em] sm:text-4xl">
        {copy.welcomeTitle}
      </h1>
      <p className="text-muted-foreground mt-4 max-w-xl text-sm leading-6 sm:text-base">
        {copy.welcomeDescription}
      </p>
      <div className="bg-card mt-8 w-full max-w-xl rounded-2xl border p-4 text-left shadow-sm">
        <div className="mb-3 flex items-center gap-2 text-sm font-semibold">
          <MessageSquareText className="size-4" />
          {copy.tipsTitle}
        </div>
        <div className="grid gap-2 sm:grid-cols-2">
          {copy.tips.map((tip) => (
            <div
              key={tip}
              className="bg-muted/60 text-muted-foreground rounded-xl px-3 py-2.5 text-sm"
            >
              {tip}
            </div>
          ))}
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
      className={cn(
        'rounded-2xl border p-4',
        failed ? 'border-destructive/30 bg-destructive/5' : 'bg-card'
      )}
    >
      <div className="flex items-center gap-3">
        {failed ? (
          <AlertCircle className="text-destructive size-5" />
        ) : detail.status === 'code_ready' ? (
          <Code2 className="size-5" />
        ) : (
          <LoaderCircle className="size-5 animate-spin" />
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
        <h2 className="font-serif text-2xl tracking-[-0.03em]">{spec.title}</h2>
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
        <div className="grid gap-4 md:grid-cols-2">
          {spec.formulas.length > 0 && (
            <section className="bg-muted/45 rounded-xl border p-4">
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
            <section className="bg-muted/45 rounded-xl border p-4">
              <h3 className="mb-2 text-sm font-semibold">{copy.assumptions}</h3>
              <StringList items={spec.assumptions} />
            </section>
          )}
        </div>
      )}

      <section className="rounded-xl border p-4">
        <h3 className="mb-3 text-sm font-semibold">{copy.visualStyle}</h3>
        <div className="text-muted-foreground grid gap-3 text-sm sm:grid-cols-3">
          <div>{spec.style.background}</div>
          <div>{spec.style.palette.join(', ')}</div>
          <div>{spec.style.camera}</div>
        </div>
      </section>

      <div className="space-y-3">
        {spec.scenes.map((scene, index) => (
          <section key={scene.id} className="bg-card rounded-xl border p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-muted-foreground text-xs font-semibold tracking-wide uppercase">
                  {copy.scenes} {index + 1}
                </div>
                <h3 className="mt-1 font-semibold">{scene.title}</h3>
              </div>
              <Badge variant="outline">{scene.durationSeconds}s</Badge>
            </div>
            <div className="mt-4 grid gap-4 md:grid-cols-2">
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

  async function copyCode() {
    if (!detail.parts.code) return;
    await navigator.clipboard.writeText(detail.parts.code);
    toast.success(copy.copied);
  }

  if (!detail.parts.spec && !detail.parts.code && !detail.parts.videoUrl) {
    return null;
  }

  return (
    <div className="bg-card overflow-hidden rounded-2xl border shadow-sm">
      <div className="flex flex-col gap-3 border-b px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="text-sm font-semibold">{copy.specification}</div>
          <p className="text-muted-foreground mt-0.5 text-xs">
            {copy.approvalDescription}
          </p>
        </div>
        {canApprove && (
          <Button onClick={onApprove} disabled={approving}>
            {approving ? <LoaderCircle className="animate-spin" /> : <Check />}
            {detail.status === 'code_ready' ? copy.retryRender : copy.approve}
          </Button>
        )}
      </div>
      <Tabs
        value={tab}
        onValueChange={(value) => setTab(value || 'specification')}
      >
        <div className="border-b px-4 pt-2">
          <TabsList variant="line">
            <TabsTrigger value="specification">
              <Sparkles /> {copy.specification}
            </TabsTrigger>
            <TabsTrigger value="code">
              <Code2 /> {copy.code}
            </TabsTrigger>
            <TabsTrigger value="video">
              <Film /> {copy.video}
            </TabsTrigger>
          </TabsList>
        </div>
        <TabsContent value="specification" className="p-4 sm:p-5">
          <SpecificationView detail={detail} copy={copy} />
        </TabsContent>
        <TabsContent value="code" className="p-4 sm:p-5">
          {detail.parts.code ? (
            <div className="relative">
              <Button
                variant="secondary"
                size="sm"
                className="absolute top-3 right-3 z-10"
                onClick={copyCode}
              >
                <Copy /> {copy.copyCode}
              </Button>
              <pre className="bg-muted max-h-[560px] overflow-auto rounded-xl p-4 pr-28 text-xs leading-6">
                <code>{detail.parts.code}</code>
              </pre>
            </div>
          ) : (
            <div className="text-muted-foreground py-16 text-center text-sm">
              {copy.noCode}
            </div>
          )}
        </TabsContent>
        <TabsContent value="video" className="p-4 sm:p-5">
          {detail.parts.videoUrl ? (
            <video
              className="aspect-video w-full rounded-xl bg-black"
              src={detail.parts.videoUrl}
              poster={detail.parts.thumbnailUrl}
              controls
              playsInline
            />
          ) : (
            <div className="bg-muted/50 text-muted-foreground flex aspect-video items-center justify-center rounded-xl border border-dashed text-sm">
              {detail.status === 'queued' || detail.status === 'rendering'
                ? copy.renderQueued
                : copy.noVideo}
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
  const [modelChoice, setModelChoice] = useState<AnimationModelChoice>('auto');
  const [historyOpen, setHistoryOpen] = useState(false);
  const messageEndRef = useRef<HTMLDivElement>(null);

  const listQuery = useQuery({
    queryKey: ['animations'],
    queryFn: () => apiGet<AnimationSummary[]>('/api/animations'),
    enabled: !!user,
  });

  const detailQuery = useQuery({
    queryKey: ['animation', selectedId],
    queryFn: () => apiGet<AnimationDetail>(`/api/animations/${selectedId}`),
    enabled: !!user && !!selectedId,
    refetchInterval: (query) =>
      isAnimationBusy(query.state.data?.status) ? 2500 : false,
  });
  const detail = detailQuery.data;

  useEffect(() => {
    if (detail?.subject) setSubject(detail.subject);
  }, [detail?.subject]);

  useEffect(() => {
    messageEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [detail?.messages.length, detail?.status]);

  function acceptDetail(next: AnimationDetail) {
    setSelectedId(next.id);
    setPrompt('');
    queryClient.setQueryData(['animation', next.id], next);
    queryClient.invalidateQueries({ queryKey: ['animations'] });
    router.replace(`/creator?animationId=${encodeURIComponent(next.id)}`);
  }

  const createMutation = useMutation({
    mutationFn: () =>
      apiPost<AnimationDetail>('/api/animations', {
        prompt: prompt.trim(),
        subject,
        modelChoice,
      }),
    onSuccess: acceptDetail,
    onError: (error: Error) => toast.error(error.message),
  });

  const reviseMutation = useMutation({
    mutationFn: () =>
      apiPost<AnimationDetail>(`/api/animations/${selectedId}/message`, {
        prompt: prompt.trim(),
        modelChoice,
      }),
    onSuccess: acceptDetail,
    onError: (error: Error) => toast.error(error.message),
  });

  const approveMutation = useMutation({
    mutationFn: () =>
      apiPost<AnimationDetail>(`/api/animations/${selectedId}/approve`, {
        modelChoice,
      }),
    onSuccess: acceptDetail,
    onError: (error: Error) => toast.error(error.message),
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
    setSelectedId(undefined);
    setPrompt('');
    setSubject('general');
    setHistoryOpen(false);
    router.replace('/creator');
  }

  function selectAnimation(id: string) {
    setSelectedId(id);
    setHistoryOpen(false);
    router.replace(`/creator?animationId=${encodeURIComponent(id)}`);
  }

  function remove(id: string) {
    if (window.confirm(copy.deleteConfirm)) deleteMutation.mutate(id);
  }

  function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!user) {
      router.push('/sign-in?callbackUrl=/creator');
      return;
    }
    if (!prompt.trim() || processing) return;
    if (detail) reviseMutation.mutate();
    else createMutation.mutate();
  }

  const history = listQuery.data ?? [];

  return (
    <div className="bg-background flex min-h-[calc(100svh-4rem)]">
      <aside className="bg-sidebar border-sidebar-border hidden w-72 shrink-0 flex-col border-r lg:flex">
        <div className="p-3">
          <Button className="w-full justify-start" onClick={startNew}>
            <Plus /> {copy.newAnimation}
          </Button>
        </div>
        <HistoryList
          items={history}
          selectedId={selectedId}
          copy={copy}
          locale={locale}
          onSelect={selectAnimation}
          onDelete={remove}
        />
      </aside>

      <Sheet open={historyOpen} onOpenChange={setHistoryOpen}>
        <SheetContent side="left" className="bg-sidebar w-[88%] p-0">
          <SheetHeader className="sr-only">
            <SheetTitle>{copy.history}</SheetTitle>
            <SheetDescription>{copy.history}</SheetDescription>
          </SheetHeader>
          <div className="p-3 pt-14">
            <Button className="w-full justify-start" onClick={startNew}>
              <Plus /> {copy.newAnimation}
            </Button>
          </div>
          <HistoryList
            items={history}
            selectedId={selectedId}
            copy={copy}
            locale={locale}
            onSelect={selectAnimation}
            onDelete={remove}
          />
        </SheetContent>
      </Sheet>

      <section className="flex min-w-0 flex-1 flex-col">
        <div className="bg-background/92 sticky top-16 z-30 flex h-14 items-center gap-3 border-b px-3 backdrop-blur md:px-5">
          <Button
            variant="ghost"
            size="icon"
            className="lg:hidden"
            onClick={() => setHistoryOpen(true)}
            aria-label={copy.openHistory}
          >
            <Menu />
          </Button>
          <div className="min-w-0 flex-1">
            <div className="truncate text-sm font-semibold">
              {detail?.title || copy.title}
            </div>
            <div className="text-muted-foreground truncate text-xs">
              {detail ? copy.statuses[detail.status] : copy.subtitle}
            </div>
          </div>
          {detail && (
            <Badge variant="outline" className="hidden sm:inline-flex">
              {detail.provider} · {detail.model}
            </Badge>
          )}
          <Button variant="outline" size="sm" onClick={startNew}>
            <Plus />{' '}
            <span className="hidden sm:inline">{copy.newAnimation}</span>
          </Button>
        </div>

        <div className="flex min-h-0 flex-1 flex-col">
          {!selectedId ? (
            <Welcome copy={copy} />
          ) : detailQuery.isLoading ? (
            <div className="text-muted-foreground flex flex-1 items-center justify-center gap-2 text-sm">
              <LoaderCircle className="animate-spin" /> {copy.loading}
            </div>
          ) : detailQuery.isError || !detail ? (
            <div className="text-destructive flex flex-1 items-center justify-center gap-2 text-sm">
              <AlertCircle /> {copy.loadFailed}
            </div>
          ) : (
            <div className="mx-auto w-full max-w-5xl flex-1 space-y-5 px-4 py-6 sm:px-6">
              <div className="flex items-center gap-2">
                <MessageSquareText className="size-4" />
                <h1 className="text-sm font-semibold">{copy.conversation}</h1>
              </div>
              <div className="space-y-4">
                {detail.messages.map((message) => (
                  <div
                    key={message.id}
                    className={cn(
                      'flex',
                      message.role === 'user' ? 'justify-end' : 'justify-start'
                    )}
                  >
                    <div
                      className={cn(
                        'max-w-[88%] rounded-2xl px-4 py-3 text-sm leading-6 sm:max-w-[75%]',
                        message.role === 'user'
                          ? 'bg-primary text-primary-foreground rounded-br-md'
                          : message.status === 'failed'
                            ? 'bg-destructive/10 text-destructive rounded-bl-md'
                            : 'bg-muted rounded-bl-md'
                      )}
                    >
                      {message.content}
                    </div>
                  </div>
                ))}
                <div ref={messageEndRef} />
              </div>
              <StatusPanel detail={detail} copy={copy} />
              <ResultPanel
                detail={detail}
                copy={copy}
                approving={approveMutation.isPending}
                onApprove={() => approveMutation.mutate()}
              />
            </div>
          )}

          <div className="bg-background/94 sticky bottom-0 z-20 border-t px-3 py-3 backdrop-blur sm:px-6">
            <form
              onSubmit={submit}
              className="bg-card mx-auto w-full max-w-4xl rounded-2xl border p-2 shadow-lg shadow-black/5"
            >
              <Textarea
                value={prompt}
                onChange={(event) =>
                  setPrompt(event.target.value.slice(0, 5000))
                }
                onKeyDown={(event) => {
                  if (event.key === 'Enter' && !event.shiftKey) {
                    event.preventDefault();
                    event.currentTarget.form?.requestSubmit();
                  }
                }}
                placeholder={copy.promptPlaceholder}
                disabled={processing || sessionPending}
                className="max-h-44 min-h-20 resize-none border-0 bg-transparent shadow-none focus-visible:ring-0 dark:bg-transparent"
              />
              <div className="flex flex-wrap items-center gap-2 px-1 pb-1">
                <Select
                  value={subject}
                  onValueChange={(value) =>
                    setSubject((value || 'general') as AnimationSubject)
                  }
                  disabled={!!detail}
                >
                  <SelectTrigger size="sm" aria-label={copy.subject}>
                    <SelectValue />
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
                  value={modelChoice}
                  onValueChange={(value) =>
                    setModelChoice((value || 'auto') as AnimationModelChoice)
                  }
                >
                  <SelectTrigger size="sm" aria-label={copy.model}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent align="start">
                    {copy.models.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <span className="text-muted-foreground hidden text-xs sm:inline">
                  {copy.promptHint}
                </span>
                <span className="text-muted-foreground ml-auto text-xs">
                  {prompt.length}/5000 {copy.characters}
                </span>
                <Button
                  type="submit"
                  size="icon"
                  disabled={!prompt.trim() || processing || sessionPending}
                  aria-label={
                    !user
                      ? copy.signInToCreate
                      : detail
                        ? copy.revise
                        : copy.create
                  }
                >
                  {processing ? (
                    <LoaderCircle className="animate-spin" />
                  ) : (
                    <ArrowUp />
                  )}
                </Button>
              </div>
            </form>
          </div>
        </div>
      </section>
    </div>
  );
}
