import { z } from 'zod';

const mathIssueSchema = z.object({
  severity: z.enum(['major', 'blocking']),
  claim: z.string().min(1).max(500),
  problem: z.string().min(1).max(800),
  correction: z.string().min(1).max(800),
});

const animationMathReviewSchema = z
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
  const unfenced = value
    .trim()
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```$/, '')
    .trim();
  try {
    return JSON.parse(unfenced);
  } catch {
    const start = unfenced.indexOf('{');
    const end = unfenced.lastIndexOf('}');
    if (start < 0 || end <= start) {
      throw new Error('Mathematics reviewer returned invalid JSON');
    }
    return JSON.parse(unfenced.slice(start, end + 1));
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
