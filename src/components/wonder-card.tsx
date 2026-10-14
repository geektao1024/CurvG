import { Link } from '@/core/i18n/navigation';
import { WonderPoster } from '@/components/wonder-poster';

/**
 * A Chinese heading breaks only after its comma: each clause is kept whole
 * so the line never splits a word like 为什么. Other languages wrap freely.
 */
export function Clauses({ text }: { text: string }) {
  const parts = text.split(/(?<=，)/);
  if (parts.length < 2) return <>{text}</>;
  return (
    <>
      {parts.map((part, i) => (
        <span key={i} className="inline-block">
          {part}
        </span>
      ))}
    </>
  );
}

/** A dark poster card linking to one wonder. All copy arrives via props. */
export function WonderCard({
  slug,
  href,
  meta,
  title,
  body,
  heading: Heading = 'h3',
}: {
  slug: string;
  href: string;
  meta: string;
  title: string;
  body: string;
  /** h2 when the cards sit directly under the page H1. */
  heading?: 'h2' | 'h3';
}) {
  return (
    <Link href={href} className="wonder-card">
      <div className="wonder-poster" aria-hidden>
        <WonderPoster slug={slug} />
      </div>
      <div className="wonder-card-body">
        <p className="meta">{meta}</p>
        <Heading>
          <Clauses text={title} />
        </Heading>
        <p>{body}</p>
      </div>
    </Link>
  );
}
