import assert from 'node:assert/strict';
import test from 'node:test';

import {
  decideAnimationQualityGate,
  deterministicReviewFromQa,
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
