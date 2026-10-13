import type { AnimationSpec } from './animation';

export function ringEscapePresentationSpec(params: {
  title: string;
  durationSeconds?: number;
  seed: number;
  solverDigest: string;
  eventCount: number;
}): AnimationSpec {
  const durationSeconds = params.durationSeconds ?? 8;
  return {
    schemaVersion: 3,
    title: params.title,
    summary:
      'A seeded fixed-step particle simulation reflects from a closed ring segment, releases the de-duplicated contact, and exits only through the verified outer gap.',
    durationSeconds,
    assumptions: [
      'Particle state and event timing come only from ring_escape/v1.',
      'The same scenario and seed must reproduce the same run digest.',
    ],
    intent: {
      learningGoal:
        'See a deterministic contact, reflection, release, and terminal escape driven by one canonical event log.',
      hook: 'Can the particle find the only open route out?',
      takeaway: 'The rendered escape is a replay of verified solver state.',
    },
    direction: {
      preset: 'cinematic-math',
      frame: '9:16',
      pacing: 'energetic',
      textPolicy: { maxWordsPerObject: 6, maxSimultaneousText: 2 },
    },
    style: {
      background: '#05070D',
      palette: ['#34D399', '#38BDF8', '#A78BFA', '#F59E0B', '#F8FAFC'],
      camera: 'Fixed vertical Shorts frame with audited safe margins.',
    },
    objects: [
      {
        id: 'escape-boundary',
        kind: 'circle',
        region: 'graph',
        importance: 'hero',
        center: [0, 0],
        radius: 3.6,
        color: '#F59E0B',
      },
      {
        id: 'particle',
        kind: 'point',
        region: 'graph',
        importance: 'hero',
        position: [0, 0],
        color: '#F8FAFC',
      },
      {
        id: 'event-status',
        kind: 'text',
        region: 'title',
        importance: 'supporting',
        label: 'CANONICAL EVENT REPLAY',
        color: '#34D399',
      },
    ],
    layout: { regions: 'top|bottom', title: params.title },
    shots: [
      {
        id: 'hook',
        beat: 'hook',
        purpose: 'Reveal the seeded arena and the only terminal escape gap.',
        startAt: 0,
        endAt: 1.5,
        focusRef: 'escape-boundary',
        transition: 'build',
        acceptance: [
          'The vertical arena and particle are immediately legible.',
        ],
      },
      {
        id: 'event-replay',
        beat: 'mechanism',
        purpose:
          'Replay checkpoint positions while contact and release labels subscribe to canonical events.',
        startAt: 1.5,
        endAt: 6.8,
        focusRef: 'particle',
        transition: 'morph',
        acceptance: [
          'The particle path, event counter, and contact transition share one event log.',
        ],
      },
      {
        id: 'terminal',
        beat: 'payoff',
        purpose: 'Hold the mechanically verified escaped terminal state.',
        startAt: 6.8,
        endAt: durationSeconds,
        focusRef: 'event-status',
        transition: 'hold',
        acceptance: ['The final frame visibly states ESCAPED.'],
      },
    ],
    timeline: [
      {
        id: 'arena-in',
        shotId: 'hook',
        at: 0,
        op: 'draw',
        ref: 'escape-boundary',
        runTime: 0.8,
        ease: 'smooth',
      },
      {
        id: 'particle-in',
        shotId: 'hook',
        at: 0.8,
        op: 'fade_in',
        ref: 'particle',
        runTime: 0.7,
        ease: 'smooth',
      },
      {
        id: 'canonical-replay',
        shotId: 'event-replay',
        at: 1.5,
        op: 'hold',
        ref: 'particle',
        runTime: 5.3,
        ease: 'linear',
      },
      {
        id: 'terminal-in',
        shotId: 'terminal',
        at: 6.8,
        op: 'fade_in',
        ref: 'event-status',
        runTime: 0.6,
        ease: 'smooth',
      },
      {
        id: 'terminal-hold',
        shotId: 'terminal',
        at: 7.4,
        op: 'hold',
        ref: 'event-status',
        runTime: Math.max(0.1, durationSeconds - 7.4),
        ease: 'linear',
      },
    ],
    dependencies: ['Manim Community', 'ring_escape/v1'],
    notes: [
      `seed=${params.seed}`,
      `solverDigest=${params.solverDigest}`,
      `eventCount=${params.eventCount}`,
      'The presentation spec describes the film; it does not author physics.',
    ],
  };
}
