/**
 * Bilingual copy shared by the content modules (labs, wonders, curves).
 * Copy lives in the content objects, not in messages, so an entry can be
 * added without a translation-key rename.
 */

export type ContentLocale = 'en' | 'zh';

export type LocaleText = { en: string; zh: string };

export type Publication = 'draft' | 'public';

export function contentLocale(locale: string): ContentLocale {
  return locale === 'zh' ? 'zh' : 'en';
}

export function localeText(text: LocaleText, locale: string): string {
  return locale === 'zh' ? text.zh : text.en;
}
