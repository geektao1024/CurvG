import assert from 'node:assert/strict';
import test from 'node:test';

import {
  isAnimationMathReviewApproved,
  parseAnimationMathReview,
} from '../src/lib/animation-math';

test('independent math review cannot approve while reporting contradictions', () => {
  assert.throws(() =>
    parseAnimationMathReview(
      JSON.stringify({
        status: 'approved',
        summary: 'Contradictory derivative.',
        checkedClaims: ["f'(x)=3x"],
        issues: [
          {
            severity: 'blocking',
            claim: "f'(x)=3x for f(x)=x^2",
            problem: 'Differentiation gives 2x, not 3x.',
            correction: "Use f'(x)=2x.",
          },
        ],
      })
    )
  );
});

test('independent math review approves only a checked issue-free verdict', () => {
  const review = parseAnimationMathReview(
    JSON.stringify({
      status: 'approved',
      summary: 'The derivative and limiting argument agree.',
      checkedClaims: ['The difference quotient tends to 2x.'],
      issues: [],
    })
  );
  assert.equal(isAnimationMathReviewApproved(review), true);
});
