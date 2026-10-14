import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { labBoard, LABS, labVideo } from '../src/content/labs';
import { PUBLISHED_LAB_FILMS } from '../src/content/labs/videos.generated';
import { defaultParamValues } from '../src/lib/board/evaluate';
import { captionText, speakTex, spokenText } from '../src/lib/lab-video/speech';
import {
  buildLabFilm,
  cueAt,
  labFilmCaptions,
  paramsAt,
} from '../src/lib/lab-video/timeline';

const LANGS = ['en', 'zh'] as const;

describe('lab film speech', () => {
  it('reads common TeX aloud', () => {
    assert.equal(speakTex('x_0=1', 'en'), 'x naught equals 1');
    assert.equal(speakTex('\\frac{\\pi}{6}', 'zh'), '6 分之派');
    assert.equal(
      speakTex('f(x)=x^3-3x', 'en'),
      'f of x equals x cubed minus 3 x'
    );
    assert.equal(speakTex('\\log_2 8', 'zh'), '以 2 为底 8 的对数');
    assert.equal(speakTex('2.55\\,\\text{m/s}^2', 'zh'), '2.55 米每二次方秒');
    assert.equal(speakTex('-2', 'en'), 'negative 2');
    assert.equal(
      captionText('$x_0=\\frac12$，$\\theta=60^\\circ$'),
      'x₀=1/2，θ=60°'
    );
  });

  it('leaves no TeX in any narration or caption', () => {
    for (const lab of LABS)
      for (const lang of LANGS)
        for (const cue of buildLabFilm(lab, lang, {}).cues) {
          assert.doesNotMatch(
            cue.script,
            /[\\$^_{}]/,
            `${lab.slug} ${lang}: ${cue.script}`
          );
          assert.doesNotMatch(
            cue.caption,
            /[\\${}]/,
            `${lab.slug} ${lang}: ${cue.caption}`
          );
        }
  });

  it('keeps bold markers out of speech', () => {
    assert.equal(spokenText('the **average** rate', 'en'), 'the average rate');
  });
});

describe('lab film timeline', () => {
  it('lays cues end to end and lands every step on its params', () => {
    for (const lab of LABS)
      for (const lang of LANGS) {
        const defaults = defaultParamValues(labBoard(lab, lang).spec);
        const film = buildLabFilm(lab, lang, defaults, []);
        assert.equal(film.cues.length, lab.guide.length + 2);
        let clock = 0;
        for (const cue of film.cues) {
          assert.equal(cue.start, clock);
          assert.ok(
            cue.start < cue.voiceStart && cue.voiceStart < cue.voiceEnd
          );
          assert.ok(cue.voiceEnd < cue.end);
          clock = cue.end;
          const settled = paramsAt(film, cue.voiceEnd);
          for (const [key, value] of Object.entries(cue.target))
            assert.ok(
              Math.abs(settled[key] - value) < 1e-9,
              `${lab.slug} ${lang} ${key}`
            );
          assert.equal(cueAt(film, cue.voiceStart), cue);
        }
        assert.equal(film.duration, clock);
      }
  });

  it('uses measured voice lengths when given', () => {
    const lab = LABS[0];
    const voices = new Array(lab.guide.length + 2).fill(3);
    const film = buildLabFilm(lab, 'en', {}, voices);
    for (const cue of film.cues)
      assert.ok(Math.abs(cue.voiceEnd - cue.voiceStart - 3) < 1e-9);
  });

  it('writes WebVTT captions inside the film', () => {
    const film = buildLabFilm(LABS[0], 'zh', {});
    const vtt = labFilmCaptions(film);
    assert.ok(vtt.startsWith('WEBVTT\n'));
    assert.ok(!vtt.includes('$'));
    const last = [...vtt.matchAll(/--> (\d\d):(\d\d):(\d\d)\.(\d{3})/g)].at(
      -1
    )!;
    const end =
      Number(last[1]) * 3600 +
      Number(last[2]) * 60 +
      Number(last[3]) +
      Number(last[4]) / 1000;
    assert.ok(end <= film.duration);
  });
});

describe('published lab films', () => {
  it('only lists real labs, with media URLs under /media/labs', () => {
    for (const [slug, langs] of Object.entries(PUBLISHED_LAB_FILMS)) {
      const lab = LABS.find((item) => item.slug === slug);
      assert.ok(lab, slug);
      for (const lang of LANGS) {
        if (!langs[lang]) continue;
        const video = labVideo(lab, lang)!;
        assert.match(
          video.src,
          new RegExp(`^/media/labs/${slug}/${lang}-landscape\\.mp4\\?v=`)
        );
        assert.match(video.duration, /^PT(\d+M)?\d+S$/);
      }
    }
  });
});
