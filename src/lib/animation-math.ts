import { z } from 'zod';

import { parseStructuredJsonObject } from '@/lib/structured-json';

const mathIssueSchema = z.object({
  severity: z.enum(['major', 'blocking']),
  /**
   * visual: the dossier is right but the scene does not show it (motion,
   * attachments, timing), so only the scene is redone. Absent = mathematics.
   */
  scope: z.enum(['mathematics', 'visual']).optional(),
  claim: z.string().min(1).max(500),
  problem: z.string().min(1).max(800),
  correction: z.string().min(1).max(800),
});

export const animationMathReviewSchema = z
  .object({
    status: z.enum(['approved', 'needs_revision']),
    summary: z.string().min(1).max(800),
    checkedClaims: z.array(z.string().min(1).max(500)).min(1).max(20),
    issues: z.array(mathIssueSchema).max(12),
  })
  .superRefine((review, context) => {
    if (review.status === 'approved' && review.issues.length > 0) {
      context.addIssue({
        code: 'custom',
        message: 'An approved mathematics review cannot contain issues',
        path: ['issues'],
      });
    }
    if (review.status === 'needs_revision' && review.issues.length === 0) {
      context.addIssue({
        code: 'custom',
        message: 'A rejected mathematics review must identify an issue',
        path: ['issues'],
      });
    }
  });

export type AnimationMathReview = z.infer<typeof animationMathReviewSchema>;

function extractJson(value: string): unknown {
  try {
    return parseStructuredJsonObject(value);
  } catch (error) {
    throw new Error('Mathematics reviewer returned invalid JSON', {
      cause: error,
    });
  }
}

export function parseAnimationMathReview(value: string): AnimationMathReview {
  return animationMathReviewSchema.parse(extractJson(value));
}

export function isAnimationMathReviewApproved(
  review: AnimationMathReview
): boolean {
  return review.status === 'approved' && review.issues.length === 0;
}

/** Only the scene needs rework when every issue is about the visuals. */
export function mathReviewNeedsOnlyScene(review: AnimationMathReview): boolean {
  return (
    review.issues.length > 0 &&
    review.issues.every((issue) => issue.scope === 'visual')
  );
}
