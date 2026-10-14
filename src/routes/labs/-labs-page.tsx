import { LogIn } from 'lucide-react';

import { useSession } from '@/core/auth/client';
import { Link } from '@/core/i18n/navigation';
import { envConfigs } from '@/config';
import {
  absoluteUrl,
  breadcrumbJsonLd,
  fitTitle,
  localizedLinks,
  localizedUrl,
  serializeJsonLd,
  socialMeta,
} from '@/lib/seo';
import { m } from '@/paraglide/messages.js';
import { siteNavLinks } from '@/blocks/site-nav';
import {
  LabWorkspace,
  type WorkspaceLabels,
  type WorkspaceLink,
} from '@/components/lab-workspace';
import { SiteNavMenu } from '@/components/site-nav-menu';
import { SiteUserMenu } from '@/components/site-user-menu';
import { getCurve } from '@/content/curves';
import {
  chapterPath,
  getLab,
  getSuite,
  labBoard,
  labOgImage,
  labPath,
  labVideo,
  labVideoHref,
  subjectOf,
  suiteForLab,
  type Lab,
  type LabSuite,
} from '@/content/labs';
import {
  getCategory,
  getPrimaryTrail,
  indexableTopics,
  libraryPath,
  libraryText,
  type LibraryLocale,
} from '@/content/library';
import { wonderPath, wondersForLab } from '@/content/wonders';

import { libraryLocale } from '../library/-library-page';

export function labCardLabels(lab: Lab, locale: LibraryLocale) {
  return {
    levelLabels: levelLabels(),
    openLabel: m['labs.index.open'](),
    boardAria: m['labs.board.aria']({ title: libraryText(lab.title, locale) }),
  };
}

export function levelLabels(locale?: string) {
  const opts = locale ? { locale: locale as never } : undefined;
  return {
    middle: m['labs.level.middle']({}, opts),
    high: m['labs.level.high']({}, opts),
    university: m['labs.level.university']({}, opts),
  };
}

function workspaceLabels(boardTitle: string): WorkspaceLabels {
  return {
    home: m['labs.ws.home']({ name: envConfigs.app_name }),
    breadcrumb: m['labs.ws.breadcrumb'](),
    chapters: m['labs.ws.chapters'](),
    previous: m['labs.ws.previous'](),
    next: m['labs.ws.next'](),
    stylePaper: m['labs.ws.style_paper'](),
    styleStudio: m['labs.ws.style_studio'](),
    view: m['labs.ws.view'](),
    fullscreen: m['labs.ws.fullscreen'](),
    switchLanguage: m['common.nav.switch_language'](),
    viewSettings: m['labs.ws.view_settings'](),
    showLabels: m['labs.ws.show_labels'](),
    showGrid: m['labs.ws.show_grid'](),
    shortcutChapters: m['labs.ws.shortcut_chapters'](),
    shortcutView: m['labs.ws.shortcut_view'](),
    shortcutStyle: m['labs.ws.shortcut_style'](),
    shortcutPlay: m['labs.ws.shortcut_play'](),
    shortcutPan: m['labs.ws.shortcut_pan'](),
    play: m['labs.board.play'](),
    pause: m['labs.board.pause'](),
    resetParams: m['labs.ws.reset_params'](),
    dragHint: m['labs.ws.drag_hint'](),
    pen: m['labs.ws.pen'](),
    penUndo: m['labs.ws.pen_undo'](),
    penClear: m['labs.ws.pen_clear'](),
    penColor: m['labs.ws.pen_color'](),
    board: m['labs.board.aria']({ title: boardTitle }),
    guide: m['labs.guide.title'](),
    explanation: m['labs.sections.title'](),
    quizTitle: m['labs.quiz.title'](),
    correct: m['labs.quiz.correct'](),
    incorrect: m['labs.quiz.incorrect'](),
    related: m['labs.related.title'](),
    relatedLabs: m['labs.related.labs'](),
    relatedWonders: m['labs.related.wonders'](),
    relatedCurves: m['labs.related.curves'](),
    relatedLibrary: m['labs.related.library'](),
    video: m['labs.ws.video'](),
    captions: m['labs.ws.captions'](),
    makeVideo: m['labs.ws.make_video'](),
    ctaTitle: m['labs.cta.title'](),
    ctaBody: m['labs.cta.body'](),
    ctaButton: m['labs.cta.button'](),
  };
}

/** A suite chapter. Every public lab sits in exactly one suite. */
export type WorkspaceTarget = { suite: LabSuite; lab: Lab };

export function resolveWorkspace(
  suiteSlug: string,
  chapterSlug?: string
): WorkspaceTarget | undefined {
  const suite = getSuite(suiteSlug);
  if (!suite || suite.publication !== 'public') return undefined;
  const lab = chapterSlug
    ? suite.chapters.find((chapter) => chapter.slug === chapterSlug)
    : suite.chapters[0];
  return lab && lab.publication === 'public' ? { suite, lab } : undefined;
}

/**
 * Where a lab leads next, in the order a reader would want it: other labs,
 * the curve encyclopedia, then the library topic it is filed under.
 */
function relatedLinks(lab: Lab, lang: LibraryLocale): WorkspaceLink[] {
  const links: WorkspaceLink[] = [];
  for (const slug of lab.related ?? []) {
    const other = getLab(slug);
    if (!other || other.publication !== 'public' || !suiteForLab(slug))
      continue;
    links.push({
      kind: 'lab',
      href: labPath(other),
      label: libraryText(other.chapterTitle, lang),
      note: libraryText(other.title, lang),
    });
  }
  // Wonders that send readers here get a link back (docs/NAVIGATION.md §6).
  for (const wonder of wondersForLab(lab.slug)) {
    links.push({
      kind: 'wonder',
      href: wonderPath(wonder),
      label: libraryText(wonder.name, lang),
      note: libraryText(wonder.question, lang),
    });
  }
  for (const slug of lab.curveSlugs ?? []) {
    const curve = getCurve(slug);
    if (curve) {
      links.push({
        kind: 'curve',
        href: `/curves/${curve.slug}`,
        label: lang === 'zh' ? curve.name.zh : curve.name.en,
      });
    }
  }
  // Topic pages without curves or scenes are noindex; link their hub instead.
  const category = getCategory(lab.primaryCategoryId);
  if (category) {
    const indexable = indexableTopics().some(
      (topic) => topic.id === category.id
    );
    const target = indexable ? category : getPrimaryTrail(category.id)[0];
    if (target) {
      links.push({
        kind: 'library',
        href: libraryPath(target),
        label: libraryText(target.title, lang),
      });
    }
  }
  return links;
}

export function WorkspaceAccount() {
  const { data: session } = useSession();
  const user = session?.user;
  if (user) {
    return (
      <SiteUserMenu
        name={user.name || m['common.nav.user']()}
        email={user.email}
        image={user.image}
      />
    );
  }
  return (
    <Link href="/sign-in" className="lw-tb keep">
      <LogIn />
      <span className="lbl">{m['common.nav.sign_in']()}</span>
    </Link>
  );
}

export function WorkspacePage({
  target,
  locale,
}: {
  target: WorkspaceTarget;
  locale: string;
}) {
  const lang = libraryLocale(locale);
  const { suite, lab } = target;
  const chapters = suite.chapters.map((chapter) => ({
    slug: chapter.slug,
    href: chapterPath(suite, chapter),
    title: libraryText(chapter.chapterTitle, lang),
    // Chinese pages carry the English name in italics, as a print textbook would.
    subtitle: lang === 'zh' ? chapter.chapterTitle.en : undefined,
  }));
  const index = suite.chapters.findIndex(
    (chapter) => chapter.slug === lab.slug
  );
  const levels = levelLabels();

  return (
    <LabWorkspace
      logo={{ src: envConfigs.app_logo, name: envConfigs.app_name }}
      crumbs={[
        { label: m['labs.breadcrumb'](), href: '/labs' },
        {
          label: libraryText(subjectOf(suite).name, lang),
          href: `/labs/${suite.subject}`,
        },
        {
          label: libraryText(suite.name, lang),
          href: chapterPath(suite, suite.chapters[0]),
        },
      ]}
      chapters={chapters}
      index={index}
      lab={lab}
      board={labBoard(lab, lang)}
      locale={lang}
      labels={workspaceLabels(libraryText(lab.chapterTitle, lang))}
      tags={[
        ...lab.levels.map((level) => levels[level]),
        ...lab.keyPoints.map((point) => libraryText(point, lang)),
      ]}
      related={relatedLinks(lab, lang)}
      videoHref={labVideoHref(lab, lang)}
      film={labVideo(lab, lang)}
      account={<WorkspaceAccount />}
      siteMenu={
        <SiteNavMenu
          links={siteNavLinks()}
          label={m['common.nav.site_menu']()}
          className="lw-sitemenu"
        />
      }
    />
  );
}

/** Rich-math source as plain text for structured data. */
function plain(source: string): string {
  return source
    .replace(/\$\$?([^$]+)\$\$?/g, '$1')
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/\s+/g, ' ')
    .trim();
}

export function workspaceHead(target: WorkspaceTarget, locale: string) {
  const lang = libraryLocale(locale);
  const { suite, lab } = target;
  const opts = { locale: locale as never };
  const chapterName = libraryText(lab.chapterTitle, lang);
  const suiteName = libraryText(suite.name, lang);
  const labTitle = libraryText(lab.title, lang);
  // Chinese lab titles often open with the chapter name ("向量加法与数量积：
  // …"); drop it after "{chapter}交互实验 —" so the title does not repeat.
  const titleRest = labTitle.startsWith(chapterName)
    ? labTitle.slice(chapterName.length).replace(/^[：:\s]+/, '')
    : labTitle;
  const title = fitTitle([
    m['labs.ws.meta_title'](
      { chapter: chapterName, title: titleRest || labTitle },
      opts
    ),
    `${labTitle} | ${envConfigs.app_name}`,
    m['labs.ws.meta_title_short']({ chapter: chapterName }, opts),
  ]);
  const description = libraryText(lab.summary, lang);
  const path = chapterPath(suite, lab);
  const suitePath = chapterPath(suite, suite.chapters[0]);
  const seoLinks = localizedLinks({ path, locale });
  const image = labOgImage(lab, lang);
  const levels = levelLabels(locale);
  const inLanguage = lang === 'zh' ? 'zh-CN' : 'en';
  const isOpening = path === suitePath;

  const resource = {
    '@context': 'https://schema.org',
    '@type': 'LearningResource',
    name: labTitle,
    alternateName: chapterName,
    headline: libraryText(lab.question, lang),
    description,
    url: seoLinks.canonical,
    image: absoluteUrl(image),
    inLanguage,
    dateModified: lab.updated,
    learningResourceType: ['Interactive simulation', 'Lesson'],
    interactivityType: 'active',
    isAccessibleForFree: true,
    educationalLevel: lab.levels.map((level) => levels[level]),
    teaches: lab.keyPoints.map((point) => libraryText(point, lang)),
    provider: {
      '@type': 'Organization',
      name: envConfigs.app_name,
      url: absoluteUrl('/'),
    },
    isPartOf: {
      '@type': 'Collection',
      name: suiteName,
      url: localizedUrl(suitePath, locale),
      hasPart: suite.chapters.map((chapter) => ({
        '@type': 'LearningResource',
        name: libraryText(chapter.title, lang),
        url: localizedUrl(chapterPath(suite, chapter), locale),
      })),
    },
  };

  // Google's practice-problems format: one Quiz per page.
  const quiz = {
    '@context': 'https://schema.org',
    '@type': 'Quiz',
    name: `${chapterName} · ${m['labs.quiz.title']({}, opts)}`,
    about: { '@type': 'Thing', name: chapterName },
    educationalLevel: lab.levels.map((level) => levels[level]),
    inLanguage,
    hasPart: lab.quiz.map((item) => ({
      '@type': 'Question',
      eduQuestionType: 'Multiple choice',
      learningResourceType: 'Practice problem',
      text: plain(libraryText(item.question, lang)),
      encodingFormat: 'text/markdown',
      suggestedAnswer: item.choices
        .filter((_, i) => i !== item.answer)
        .map((choice) => ({
          '@type': 'Answer',
          text: plain(libraryText(choice, lang)),
        })),
      acceptedAnswer: {
        '@type': 'Answer',
        text: plain(libraryText(item.choices[item.answer], lang)),
        answerExplanation: {
          '@type': 'Comment',
          text: plain(libraryText(item.explanation, lang)),
        },
      },
    })),
  };

  const breadcrumb = breadcrumbJsonLd(
    [
      { name: m['common.nav.home']({}, opts), path: '/' },
      { name: m['labs.breadcrumb']({}, opts), path: '/labs' },
      {
        name: libraryText(subjectOf(suite).name, lang),
        path: `/labs/${suite.subject}`,
      },
      // The opening chapter shares the suite URL, so the trail stops there.
      { name: suiteName, path: suitePath },
      ...(isOpening ? [] : [{ name: chapterName, path }]),
    ],
    locale
  );

  const film = labVideo(lab, lang);
  const video = film
    ? {
        '@context': 'https://schema.org',
        '@type': 'VideoObject',
        name: labTitle,
        description,
        thumbnailUrl: absoluteUrl(film.poster),
        contentUrl: absoluteUrl(film.src),
        uploadDate: film.uploaded,
        duration: film.duration,
        inLanguage,
      }
    : null;

  return {
    meta: [
      { title },
      { name: 'description', content: description },
      ...socialMeta({
        title,
        description,
        url: seoLinks.canonical,
        image,
        imageAlt: labTitle,
      }),
    ],
    links: seoLinks.links,
    scripts: [
      {
        type: 'application/ld+json',
        children: serializeJsonLd([
          resource,
          quiz,
          breadcrumb,
          ...(video ? [video] : []),
        ]),
      },
    ],
  };
}
