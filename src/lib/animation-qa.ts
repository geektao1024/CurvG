import { z } from 'zod';

import type {
  AnimationQualityGateAction,
  AnimationVisualQaCode,
  AnimationVisualQaReport,
  AnimationVisualReview,
  AnimationVisualReviewIssue,
} from '@/lib/animation';
import { parseStructuredJsonObject } from '@/lib/structured-json';

const frameNumberSchema = z.number().int().min(1).max(12);
const timeSegmentSchema = z.tuple([
  z.number().min(0).max(300),
  z.number().min(0).max(300),
]);

const hardVisualQaCodes = new Set<AnimationVisualQaCode>([
  'empty_frame',
  'edge_risk',
  'static_sequence',
  'black_segment',
  'flash_frame',
]);

const MAX_TERMINAL_READING_HOLD_SECONDS = 3.5;
const OPENING_EMPTY_FRAME_SCORE_PENALTY = 18;

function isOpeningOnlyEmptyFrame(
  issue: AnimationVisualQaReport['issues'][number]
): boolean {
  return (
    issue.code === 'empty_frame' &&
    issue.frames.length === 1 &&
    issue.frames[0] === 1
  );
}

function reviewableVisualQaScore(qa: AnimationVisualQaReport): number {
  const openingSampleWasDoublePenalized =
    qa.blackSegments.length === 0 && qa.issues.some(isOpeningOnlyEmptyFrame);
  return Math.min(
    100,
    qa.score +
      (openingSampleWasDoublePenalized ? OPENING_EMPTY_FRAME_SCORE_PENALTY : 0)
  );
}

function hasHardFrozenSegment(qa: AnimationVisualQaReport): boolean {
  const endTolerance = Math.max(0.15, 2 / qa.temporalSampleRate);
  return qa.frozenSegments.some(([start, end]) => {
    const reachesVideoEnd = end >= qa.durationSeconds - endTolerance;
    const duration = Math.max(0, end - start);
    return !reachesVideoEnd || duration > MAX_TERMINAL_READING_HOLD_SECONDS;
  });
}

/**
 * The frame analyzer is deliberately conservative. A render with only
 * aesthetic warnings still deserves semantic review; hard temporal or
 * safe-zone defects do not. This keeps a weak first second from becoming a
 * terminal render failure while preserving strict rejection for broken video.
 */
export function isAnimationVisualQaReviewable(
  qa: AnimationVisualQaReport
): boolean {
  const reviewableScore = reviewableVisualQaScore(qa);
  if (reviewableScore < 65) return false;
  if (
    qa.blackSegments.length > 0 ||
    hasHardFrozenSegment(qa) ||
    qa.flashTimestamps.length > 0 ||
    qa.frames.some((frame) => frame.edgeRisk)
  ) {
    return false;
  }
  const hasHardIssue = qa.issues.some(
    (issue) =>
      hardVisualQaCodes.has(issue.code) && !isOpeningOnlyEmptyFrame(issue)
  );
  return !hasHardIssue;
}

/**
 * Delivery fallback after at least one autonomous repair. A short, low-motion
 * teaching hold is acceptable when the rendered video is otherwise healthy;
 * retrying another large model repair is more likely to hit the Worker runtime
 * ceiling than to improve this already-rendered candidate.
 */
export function isAnimationVisualQaSafeAfterRepair(
  qa: AnimationVisualQaReport
): boolean {
  return (
    qa.score >= 65 &&
    qa.blackSegments.length === 0 &&
    qa.flashTimestamps.length === 0 &&
    qa.frames.every((frame) => !frame.edgeRisk) &&
    qa.issues.every((issue) => issue.severity === 'info') &&
    qa.frozenSegments.every(([start, end]) => end - start <= 3)
  );
}

export const animationVisualQaReportSchema = z.object({
  analyzerVersion: z.literal(1),
  status: z.enum(['pass', 'review']),
  score: z.number().int().min(0).max(100),
  sampleCount: z.literal(12),
  frames: z
    .array(
      z.object({
        index: frameNumberSchema,
        occupancy: z.number().min(0).max(1),
        edgeContent: z.number().min(0).max(1),
        edgeRisk: z.boolean(),
        centerOffset: z.number().min(0).max(2),
        contrast: z.number().min(0).max(1),
        contentBounds: z.tuple([
          z.number().min(0).max(1),
          z.number().min(0).max(1),
          z.number().min(0).max(1),
          z.number().min(0).max(1),
        ]),
      })
    )
    .length(12),
  transitionDeltas: z.array(z.number().min(0).max(1)).length(11),
  durationSeconds: z.number().positive().max(300),
  temporalSampleRate: z.number().positive().max(120),
  temporalSampleCount: z.number().int().positive(),
  blackSegments: z.array(timeSegmentSchema).max(50),
  frozenSegments: z.array(timeSegmentSchema).max(50),
  flashTimestamps: z.array(z.number().min(0).max(300)).max(100),
  issues: z
    .array(
      z.object({
        code: z.enum([
          'weak_opening',
          'empty_frame',
          'sparse_frame',
          'edge_risk',
          'off_center',
          'low_contrast',
          'static_sequence',
          'black_segment',
          'flash_frame',
          'frozen_segment',
        ]),
        severity: z.enum(['info', 'warning']),
        frames: z.array(frameNumberSchema).max(12),
        message: z.string().min(1).max(500),
      })
    )
    .max(20),
});

export const animationVisualReviewDraftSchema = z.object({
  status: z.enum(['approved', 'needs_revision']),
  summary: z.string().min(1).max(800),
  strengths: z.array(z.string().min(1).max(300)).max(5),
  issues: z
    .array(
      z.object({
        category: z.enum([
          'layout',
          'clipping',
          'legibility',
          'pacing',
          'hierarchy',
          'math_fidelity',
          'payoff',
        ]),
        severity: z.enum(['minor', 'major', 'blocking']),
        frames: z.array(frameNumberSchema).max(12),
        problem: z.string().min(1).max(500),
        suggestion: z.string().min(1).max(500),
      })
    )
    .max(12),
});

function extractJson(value: string): unknown {
  try {
    return parseStructuredJsonObject(value);
  } catch (error) {
    throw new Error('Visual reviewer returned invalid JSON', { cause: error });
  }
}

export function validateAnimationVisualQaReport(
  value: unknown
): AnimationVisualQaReport {
  return animationVisualQaReportSchema.parse(value);
}

export function parseAnimationVisualReview(params: {
  content: string;
  model: string;
  jobId: string;
  reviewedAt?: string;
}): AnimationVisualReview {
  const draft = animationVisualReviewDraftSchema.parse(
    extractJson(params.content)
  );
  return {
    ...draft,
    model: params.model,
    jobId: params.jobId,
    reviewedAt: params.reviewedAt || new Date().toISOString(),
  };
}

const deterministicIssueMap: Record<
  AnimationVisualQaReport['issues'][number]['code'],
  Pick<AnimationVisualReviewIssue, 'category' | 'problem' | 'suggestion'>
> = {
  weak_opening: {
    category: 'pacing',
    problem: 'The opening sample does not establish a strong visible subject.',
    suggestion:
      'Put the hero object on screen immediately and begin a meaningful change within the first second.',
  },
  empty_frame: {
    category: 'layout',
    problem: 'A sampled frame is effectively empty.',
    suggestion:
      'Preserve visual continuity between beats and avoid clearing the stage before the next object is ready.',
  },
  sparse_frame: {
    category: 'hierarchy',
    problem: 'A sampled frame uses too little of the available stage.',
    suggestion:
      'Scale and frame the hero object more decisively while keeping safe margins.',
  },
  edge_risk: {
    category: 'clipping',
    problem: 'Important content is too close to the frame edge.',
    suggestion:
      'Move and scale the affected mobjects inward so formulas and geometry remain fully visible.',
  },
  off_center: {
    category: 'layout',
    problem:
      'The visual mass is noticeably off center without a clear compositional reason.',
    suggestion:
      'Rebalance the stage or use a deliberate camera move that makes the offset meaningful.',
  },
  low_contrast: {
    category: 'legibility',
    problem: 'Foreground content has insufficient contrast against the stage.',
    suggestion:
      'Use the house ivory and semantic accent colors with stronger stroke or fill contrast.',
  },
  static_sequence: {
    category: 'pacing',
    problem: 'Consecutive samples show too little meaningful visual change.',
    suggestion:
      'Replace passive holds with a visible construction, transformation, camera move, or proof step.',
  },
  black_segment: {
    category: 'layout',
    problem: 'The full-timeline scan found a blank or nearly black interval.',
    suggestion:
      'Overlap outgoing and incoming objects so the teaching stage never drops to a blank frame.',
  },
  flash_frame: {
    category: 'pacing',
    problem: 'The full-timeline scan found an abrupt flash-like frame change.',
    suggestion:
      'Replace the one-frame jump with a short transform or cross-fade and keep luminance changes controlled.',
  },
  frozen_segment: {
    category: 'pacing',
    problem:
      'The full-timeline scan found a long interval with almost no visible change.',
    suggestion:
      'Shorten the hold or add a purposeful construction, trace, emphasis, or camera movement.',
  },
};

export function deterministicReviewFromQa(params: {
  qa: AnimationVisualQaReport;
  jobId: string;
  reviewedAt?: string;
}): AnimationVisualReview {
  return {
    status: params.qa.status === 'pass' ? 'approved' : 'needs_revision',
    model: 'curvg-frame-analyzer-v1',
    summary:
      params.qa.status === 'pass'
        ? 'Deterministic frame checks passed.'
        : 'Deterministic frame checks found visible composition or pacing defects.',
    strengths: [],
    issues: params.qa.issues.map((issue) => ({
      ...deterministicIssueMap[issue.code],
      severity: issue.severity === 'warning' ? 'major' : 'minor',
      frames: issue.frames,
    })),
    reviewedAt: params.reviewedAt || new Date().toISOString(),
    jobId: params.jobId,
  };
}

export function decideAnimationQualityGate(params: {
  qa?: AnimationVisualQaReport;
  review?: AnimationVisualReview;
  attempt: number;
  maxRepairs: number;
  renderError?: string;
}): AnimationQualityGateAction {
  const repairAvailable = params.attempt < params.maxRepairs;
  if (params.renderError) return repairAvailable ? 'repair' : 'reject';
  if (!params.qa || !params.review)
    return repairAvailable ? 'repair' : 'reject';

  const severe = params.review.issues.some((issue) =>
    ['major', 'blocking'].includes(issue.severity)
  );
  const blocking = params.review.issues.some(
    (issue) =>
      issue.severity === 'blocking' || issue.category === 'math_fidelity'
  );
  const deterministicPass = isAnimationVisualQaReviewable(params.qa);
  if (
    deterministicPass &&
    params.review.status === 'approved' &&
    !severe &&
    !blocking
  ) {
    return 'approve';
  }
  if (
    params.attempt > 0 &&
    isAnimationVisualQaSafeAfterRepair(params.qa) &&
    !severe &&
    !blocking
  ) {
    return 'approve';
  }
  return repairAvailable ? 'repair' : 'reject';
}
