import assert from 'node:assert/strict';
import test from 'node:test';

import {
  decideAnimationQualityGate,
  deterministicReviewFromQa,
  isAnimationVisualQaReviewable,
  parseAnimationVisualReview,
  validateAnimationVisualQaReport,
} from '../src/lib/animation-qa';
import {
  signAnimationReviewArtifact,
  verifyAnimationReviewArtifact,
} from '../src/lib/signed-animation-artifact';

const qaReport = {
  analyzerVersion: 1,
  status: 'review',
  score: 82,
  sampleCount: 12,
  frames: Array.from({ length: 12 }, (_, index) => ({
    index: index + 1,
    occupancy: 0.2,
    edgeContent: 0.01,
    edgeRisk: false,
    centerOffset: 0.1,
    contrast: 0.7,
    contentBounds: [0.1, 0.1, 0.9, 0.9],
  })),
  transitionDeltas: [0.1, 0.2, 0.3, 0.2, 0.1, 0.2, 0.3, 0.2, 0.1, 0.2, 0.3],
  durationSeconds: 12,
  temporalSampleRate: 8,
  temporalSampleCount: 96,
  blackSegments: [],
  frozenSegments: [],
  flashTimestamps: [],
  issues: [
    {
      code: 'weak_opening',
      severity: 'warning',
      frames: [1],
      message: 'Opening frame is visually sparse.',
    },
  ],
};

test('visual QA report validation preserves bounded metrics', () => {
  assert.deepEqual(validateAnimationVisualQaReport(qaReport), qaReport);
  assert.throws(() =>
    validateAnimationVisualQaReport({ ...qaReport, score: 101 })
  );
});

test('semantic visual review extracts one strict JSON object', () => {
  const review = parseAnimationVisualReview({
    content:
      '```json\n{"status":"needs_revision","summary":"Formula is clipped.","strengths":[],"issues":[{"category":"clipping","severity":"major","frames":[6],"problem":"Right edge is clipped.","suggestion":"Reduce formula scale."}]}\n```',
    model: 'gemini-3.1-pro',
    jobId: 'job-1',
    reviewedAt: '2026-07-29T00:00:00.000Z',
  });
  assert.equal(review.status, 'needs_revision');
  assert.equal(review.issues[0]?.frames[0], 6);
  assert.equal(review.jobId, 'job-1');
});

test('deterministic evidence becomes an actionable hidden repair review', () => {
  const review = deterministicReviewFromQa({
    qa: validateAnimationVisualQaReport(qaReport),
    jobId: 'job-1',
    reviewedAt: '2026-07-29T00:00:00.000Z',
  });

  assert.equal(review.status, 'needs_revision');
  assert.equal(review.model, 'curvg-frame-analyzer-v1');
  assert.equal(review.issues[0]?.category, 'pacing');
  assert.equal(review.issues[0]?.severity, 'major');
});

test('quality gate approves only when deterministic and semantic checks agree', () => {
  const cleanQa = validateAnimationVisualQaReport({
    ...qaReport,
    status: 'pass',
    score: 91,
    issues: [],
  });
  const approvedReview = parseAnimationVisualReview({
    content: JSON.stringify({
      status: 'approved',
      summary: 'The visual proof is accurate, legible, and complete.',
      strengths: ['The construction remains visually continuous.'],
      issues: [],
    }),
    model: 'gemini-3.1-pro',
    jobId: 'job-1',
  });

  assert.equal(
    decideAnimationQualityGate({
      qa: cleanQa,
      review: approvedReview,
      attempt: 0,
      maxRepairs: 2,
    }),
    'approve'
  );
});

test('soft deterministic warnings proceed to semantic review without admitting hard defects', () => {
  const softQa = validateAnimationVisualQaReport({
    ...qaReport,
    score: 69,
    issues: [
      {
        code: 'weak_opening',
        severity: 'warning',
        frames: [1],
        message: 'The opening subject is small.',
      },
      {
        code: 'low_contrast',
        severity: 'warning',
        frames: [1],
        message: 'The first frame has low contrast.',
      },
    ],
  });
  const approvedReview = parseAnimationVisualReview({
    content: JSON.stringify({
      status: 'approved',
      summary: 'The construction is readable and mathematically complete.',
      strengths: ['The projection remains visually explicit.'],
      issues: [],
    }),
    model: 'gemini-3.1-pro',
    jobId: 'job-soft',
  });

  assert.equal(isAnimationVisualQaReviewable(softQa), true);
  assert.equal(
    decideAnimationQualityGate({
      qa: softQa,
      review: approvedReview,
      attempt: 0,
      maxRepairs: 2,
    }),
    'approve'
  );

  const terminalReadingHold = validateAnimationVisualQaReport({
    ...softQa,
    frozenSegments: [[9.5, 12]],
    issues: [
      ...softQa.issues,
      {
        code: 'frozen_segment',
        severity: 'info',
        frames: [11],
        message: 'The final formula remains still for reading.',
      },
    ],
  });
  assert.equal(isAnimationVisualQaReviewable(terminalReadingHold), true);

  for (const hardQa of [
    { ...softQa, score: 64 },
    {
      ...softQa,
      frames: softQa.frames.map((frame, index) =>
        index === 0 ? { ...frame, edgeRisk: true } : frame
      ),
    },
    { ...softQa, blackSegments: [[2, 2.25]] },
    {
      ...softQa,
      status: 'pass' as const,
      score: 95,
      blackSegments: [[2, 2.25]],
    },
    { ...softQa, frozenSegments: [[4, 6.5]] },
    { ...softQa, frozenSegments: [[7, 12]] },
  ]) {
    assert.equal(
      isAnimationVisualQaReviewable(validateAnimationVisualQaReport(hardQa)),
      false
    );
  }
});

test('a single transitional opening sample is reviewed semantically instead of rejected as a blank video', () => {
  const openingTransitionQa = validateAnimationVisualQaReport({
    ...qaReport,
    score: 58,
    issues: [
      {
        code: 'weak_opening',
        severity: 'warning',
        frames: [1],
        message: 'The opening sample has a small visible subject.',
      },
      {
        code: 'empty_frame',
        severity: 'warning',
        frames: [1],
        message: 'The first sampled transition contains almost no content.',
      },
      {
        code: 'sparse_frame',
        severity: 'info',
        frames: [2, 3],
        message: 'The line-art construction is sparse while it is drawn.',
      },
    ],
  });

  assert.equal(isAnimationVisualQaReviewable(openingTransitionQa), true);
  assert.equal(
    isAnimationVisualQaReviewable(
      validateAnimationVisualQaReport({
        ...openingTransitionQa,
        issues: openingTransitionQa.issues.map((issue) =>
          issue.code === 'empty_frame' ? { ...issue, frames: [1, 6] } : issue
        ),
      })
    ),
    false
  );
  assert.equal(
    isAnimationVisualQaReviewable(
      validateAnimationVisualQaReport({
        ...openingTransitionQa,
        blackSegments: [[0, 0.5]],
      })
    ),
    false
  );
  assert.equal(
    isAnimationVisualQaReviewable(
      validateAnimationVisualQaReport({
        ...openingTransitionQa,
        issues: openingTransitionQa.issues.map((issue) =>
          issue.code === 'empty_frame' ? { ...issue, frames: [] } : issue
        ),
      })
    ),
    false
  );
});

test('quality gate repairs defects within budget and rejects after exhaustion', () => {
  const qa = validateAnimationVisualQaReport(qaReport);
  const review = deterministicReviewFromQa({ qa, jobId: 'job-1' });

  assert.equal(
    decideAnimationQualityGate({
      qa,
      review,
      attempt: 1,
      maxRepairs: 2,
    }),
    'repair'
  );
  assert.equal(
    decideAnimationQualityGate({
      qa,
      review,
      attempt: 2,
      maxRepairs: 2,
    }),
    'reject'
  );
  assert.equal(
    decideAnimationQualityGate({
      renderError: 'LaTeX compilation failed',
      attempt: 0,
      maxRepairs: 2,
    }),
    'repair'
  );
});

test('quality gate delivers a safe best candidate after one visual repair', () => {
  const qa = validateAnimationVisualQaReport({
    ...qaReport,
    status: 'review',
    score: 75,
    frozenSegments: [
      [4.867, 7],
      [7.867, 10],
    ],
    issues: [
      {
        code: 'static_sequence',
        severity: 'info',
        frames: [6, 7, 8, 9],
        message: 'The teaching beat contains a deliberate hold.',
      },
      {
        code: 'frozen_segment',
        severity: 'info',
        frames: [6, 9],
        message: 'Two short low-motion intervals were detected.',
      },
    ],
  });
  const review = deterministicReviewFromQa({ qa, jobId: 'job-repaired' });

  assert.equal(
    decideAnimationQualityGate({
      qa,
      review,
      attempt: 0,
      maxRepairs: 2,
    }),
    'repair'
  );
  assert.equal(
    decideAnimationQualityGate({
      qa,
      review,
      attempt: 1,
      maxRepairs: 2,
    }),
    'approve'
  );
});

test('full-timeline black intervals become a major repair issue', () => {
  const qa = validateAnimationVisualQaReport({
    ...qaReport,
    score: 64,
    blackSegments: [[3.0, 3.25]],
    issues: [
      {
        code: 'black_segment',
        severity: 'warning',
        frames: [4],
        message: 'A hidden blank interval was detected.',
      },
    ],
  });
  const review = deterministicReviewFromQa({ qa, jobId: 'job-black' });
  assert.equal(review.issues[0]?.category, 'layout');
  assert.equal(review.issues[0]?.severity, 'major');
  assert.equal(
    decideAnimationQualityGate({
      qa,
      review,
      attempt: 0,
      maxRepairs: 2,
    }),
    'repair'
  );
});

test('review artifact signatures expire and bind animation plus render job', async () => {
  const now = 1_800_000_000_000;
  const expires = now + 60_000;
  const params = {
    secret: 'test-renderer-token-long-enough',
    id: 'animation-1',
    jobId: 'job-1',
    expires,
  };
  const signature = await signAnimationReviewArtifact(params);
  assert.equal(
    await verifyAnimationReviewArtifact({ ...params, signature, now }),
    true
  );
  assert.equal(
    await verifyAnimationReviewArtifact({
      ...params,
      jobId: 'job-2',
      signature,
      now,
    }),
    false
  );
  assert.equal(
    await verifyAnimationReviewArtifact({
      ...params,
      signature,
      now: expires + 1,
    }),
    false
  );
});
