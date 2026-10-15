/**
 * Named slider settings: one click shows a curve turning into a famous
 * relative (hypocycloid k = 4 → astroid). Every preset sets every
 * parameter, inside its range and on its step (tests/curves-seo.test.ts).
 */

import type { LocaleText } from '../text';

export type CurvePreset = {
  label: LocaleText;
  values: Record<string, number>;
};

export const CURVE_PRESETS: Record<string, readonly CurvePreset[]> = {
  'lissajous-curve': [
    {
      label: { en: 'Line (a = b, δ = 0)', zh: '直线（a = b，δ = 0）' },
      values: { a: 1, b: 1, delta: 0 },
    },
    {
      label: { en: 'Circle (a = b, δ = π/2)', zh: '圆（a = b，δ = π/2）' },
      values: { a: 1, b: 1, delta: 1.57 },
    },
    {
      label: { en: 'Figure eight (1 : 2)', zh: '8 字形（1 : 2）' },
      values: { a: 1, b: 2, delta: 1.57 },
    },
    {
      label: { en: '3 : 2', zh: '3 : 2' },
      values: { a: 3, b: 2, delta: 1.57 },
    },
  ],
  superellipse: [
    {
      label: { en: 'Rhombus (n = 1)', zh: '菱形（n = 1）' },
      values: { n: 1, a: 1 },
    },
    {
      label: { en: 'Circle (n = 2)', zh: '圆（n = 2）' },
      values: { n: 2, a: 1 },
    },
    {
      label: { en: 'Squircle (n = 4)', zh: '方圆（n = 4）' },
      values: { n: 4, a: 1 },
    },
    {
      label: { en: 'Concave star (n < 1)', zh: '内凹星形（n < 1）' },
      values: { n: 0.6, a: 1 },
    },
  ],
  'rose-curve': [
    {
      label: { en: '3 petals (k = 3)', zh: '3 瓣（k = 3）' },
      values: { k: 3 },
    },
    {
      label: { en: '4 petals (k = 2)', zh: '4 瓣（k = 2）' },
      values: { k: 2 },
    },
    {
      label: { en: '8 petals (k = 4)', zh: '8 瓣（k = 4）' },
      values: { k: 4 },
    },
  ],
  limacon: [
    {
      label: { en: 'Inner loop (b < a)', zh: '带内环（b < a）' },
      values: { b: 0.5 },
    },
    {
      label: { en: 'Cardioid (b = a)', zh: '心脏线（b = a）' },
      values: { b: 1 },
    },
    {
      label: { en: 'Dimpled (a < b < 2a)', zh: '凹陷（a < b < 2a）' },
      values: { b: 1.5 },
    },
    {
      label: { en: 'Convex (b ≥ 2a)', zh: '凸形（b ≥ 2a）' },
      values: { b: 2 },
    },
  ],
  epicycloid: [
    {
      label: { en: 'Cardioid (k = 1)', zh: '心脏线（k = 1）' },
      values: { k: 1 },
    },
    {
      label: { en: 'Nephroid (k = 2)', zh: '肾形线（k = 2）' },
      values: { k: 2 },
    },
  ],
  hypocycloid: [
    {
      label: { en: 'Deltoid (k = 3)', zh: '三尖瓣线（k = 3）' },
      values: { k: 3 },
    },
    {
      label: { en: 'Astroid (k = 4)', zh: '星形线（k = 4）' },
      values: { k: 4 },
    },
  ],
  hypotrochoid: [
    {
      label: { en: 'Hypocycloid star (d = r)', zh: '内摆线星形（d = r）' },
      values: { R: 5, r: 3, d: 3 },
    },
    {
      label: { en: 'Ellipse (R = 2r)', zh: '椭圆（R = 2r）' },
      values: { R: 6, r: 3, d: 1 },
    },
  ],
  epitrochoid: [
    {
      label: { en: 'Epicycloid (d = r)', zh: '外摆线（d = r）' },
      values: { R: 3, r: 1, d: 1 },
    },
    {
      label: { en: 'Wankel housing (R = 2r)', zh: '转子发动机缸体（R = 2r）' },
      values: { R: 2, r: 1, d: 0.4 },
    },
  ],
  ellipse: [
    {
      label: { en: 'Circle (a = b)', zh: '圆（a = b）' },
      values: { a: 1, b: 1 },
    },
  ],
  hyperbola: [
    {
      label: { en: 'Rectangular (a = b)', zh: '等轴双曲线（a = b）' },
      values: { a: 1, b: 1 },
    },
  ],
  trochoid: [
    {
      label: { en: 'Curtate (d < r)', zh: '短幅（d < r）' },
      values: { d: 0.5, arches: 2 },
    },
    {
      label: { en: 'Cycloid (d = r)', zh: '摆线（d = r）' },
      values: { d: 1, arches: 2 },
    },
    {
      label: { en: 'Prolate (d > r)', zh: '长幅（d > r）' },
      values: { d: 1.6, arches: 2 },
    },
  ],
  'cassini-oval': [
    {
      label: { en: 'Two loops (b < c)', zh: '两个环（b < c）' },
      values: { b: 0.9 },
    },
    {
      label: { en: 'Lemniscate (b = c)', zh: '双纽线（b = c）' },
      values: { b: 1 },
    },
    {
      label: { en: 'Peanut', zh: '花生形' },
      values: { b: 1.2 },
    },
    {
      label: { en: 'Convex (b ≥ √2·c)', zh: '凸卵形（b ≥ √2·c）' },
      values: { b: 1.5 },
    },
  ],
  'conchoid-of-nicomedes': [
    {
      label: { en: 'Smooth (b < a)', zh: '光滑（b < a）' },
      values: { b: 0.5 },
    },
    {
      label: { en: 'Cusp (b = a)', zh: '尖点（b = a）' },
      values: { b: 1 },
    },
    {
      label: { en: 'Loop (b > a)', zh: '带环（b > a）' },
      values: { b: 1.5 },
    },
  ],
  superformula: [
    {
      label: { en: 'Circle', zh: '圆' },
      values: { m: 4, n1: 2, n2: 2, n3: 2 },
    },
    {
      label: { en: 'Rounded square', zh: '圆角方形' },
      values: { m: 4, n1: 8, n2: 8, n3: 8 },
    },
    {
      label: { en: 'Starfish', zh: '海星' },
      values: { m: 5, n1: 2, n2: 7, n3: 7 },
    },
  ],
  'maurer-rose': [
    {
      label: { en: 'n = 2, d = 29°', zh: 'n = 2，d = 29°' },
      values: { n: 2, d: 29 },
    },
    {
      label: { en: 'n = 6, d = 71°', zh: 'n = 6，d = 71°' },
      values: { n: 6, d: 71 },
    },
    {
      label: { en: 'Sparse star (d = 120°)', zh: '稀疏星形（d = 120°）' },
      values: { n: 4, d: 120 },
    },
  ],
  'devils-curve': [
    {
      label: { en: 'a < b', zh: 'a < b' },
      values: { a: 0.8 },
    },
    {
      label: {
        en: 'Circle and two lines (a = b)',
        zh: '圆加两条直线（a = b）',
      },
      values: { a: 1 },
    },
    {
      label: { en: 'a > b', zh: 'a > b' },
      values: { a: 1.2 },
    },
  ],
  'sigmoid-function': [
    {
      label: { en: 'Gentle (k = 0.5)', zh: '平缓（k = 0.5）' },
      values: { k: 0.5 },
    },
    {
      label: { en: 'Standard σ (k = 1)', zh: '标准 σ（k = 1）' },
      values: { k: 1 },
    },
    {
      label: { en: 'Almost a step (k = 4)', zh: '接近台阶（k = 4）' },
      values: { k: 4 },
    },
  ],
  'koch-snowflake': [
    {
      label: { en: 'Triangle (n = 0)', zh: '三角形（n = 0）' },
      values: { level: 0 },
    },
    {
      label: { en: 'Star (n = 1)', zh: '六角星（n = 1）' },
      values: { level: 1 },
    },
    {
      label: { en: 'Snowflake (n = 5)', zh: '雪花（n = 5）' },
      values: { level: 5 },
    },
  ],
};
