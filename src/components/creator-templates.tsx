/**
 * Beta generator: plans whose mathematics the audit could not confirm wait
 * for the user, who decides whether to render anyway or switch to a verified
 * template (docs/VIDEO_TEMPLATES.md §7).
 */

import { AlertTriangle, LoaderCircle, Play, Sparkles } from 'lucide-react';

import type { AnimationMathWarning } from '@/lib/animation';
import { Button } from '@/components/ui/button';

export interface BetaWarningsCopy {
  betaBadge: string;
  warningsTitle: string;
  warningsBody: string;
  warningsApprove: string;
  warningsUseTemplate: string;
}

export function MathWarningsPanel({
  copy,
  warnings,
  busy,
  onApprove,
  onUseTemplates,
}: {
  copy: BetaWarningsCopy;
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
