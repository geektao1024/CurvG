import type { AnchorHTMLAttributes, HTMLAttributes } from 'react';
import type { MDXComponents } from 'mdx/types';

import { Link } from '@/core/i18n/navigation';
import { cn } from '@/lib/utils';

export const mdxComponents: MDXComponents = {
  h1: ({ className, ...props }: HTMLAttributes<HTMLHeadingElement>) => (
    <h1
      className={cn(
        'text-foreground mt-6 mb-2 text-xl font-semibold tracking-tight md:text-2xl',
        className
      )}
      {...props}
    />
  ),
  h2: ({ className, ...props }: HTMLAttributes<HTMLHeadingElement>) => (
    <h2
      className={cn(
        'text-foreground mt-6 mb-2 text-lg font-semibold tracking-tight md:text-xl',
        className
      )}
      {...props}
    />
  ),
  h3: ({ className, ...props }: HTMLAttributes<HTMLHeadingElement>) => (
    <h3
      className={cn(
        'text-foreground mt-4 mb-1.5 text-base font-semibold tracking-tight',
        className
      )}
      {...props}
    />
  ),
  p: ({ className, ...props }: HTMLAttributes<HTMLParagraphElement>) => (
    <p
      className={cn('text-foreground/90 mt-2 leading-7', className)}
      {...props}
    />
  ),
  a: ({
    className,
    href = '',
    rel,
    target,
    ...props
  }: AnchorHTMLAttributes<HTMLAnchorElement>) => {
    const external = /^https?:\/\//i.test(href);
    return (
      <Link
        href={href}
        className={cn(
          'text-primary font-medium underline-offset-4 hover:underline',
          className
        )}
        target={external ? (target ?? '_blank') : target}
        rel={external ? (rel ?? 'noopener noreferrer') : rel}
        {...props}
      />
    );
  },
  ul: ({ className, ...props }: HTMLAttributes<HTMLUListElement>) => (
    <ul
      className={cn(
        'marker:text-muted-foreground mt-2 ml-6 list-disc space-y-1',
        className
      )}
      {...props}
    />
  ),
  ol: ({ className, ...props }: HTMLAttributes<HTMLOListElement>) => (
    <ol
      className={cn(
        'marker:text-muted-foreground mt-2 ml-6 list-decimal space-y-1',
        className
      )}
      {...props}
    />
  ),
  li: ({ className, ...props }: HTMLAttributes<HTMLLIElement>) => (
    <li className={cn('text-foreground/90 leading-7', className)} {...props} />
  ),
  strong: ({ className, ...props }: HTMLAttributes<HTMLElement>) => (
    <strong
      className={cn('text-foreground font-semibold', className)}
      {...props}
    />
  ),
  blockquote: ({ className, ...props }: HTMLAttributes<HTMLQuoteElement>) => (
    <blockquote
      className={cn(
        'border-border text-muted-foreground my-4 border-l-2 pl-4 italic',
        className
      )}
      {...props}
    />
  ),
  code: ({ className, ...props }: HTMLAttributes<HTMLElement>) => (
    <code
      className={cn(
        'bg-muted text-foreground rounded px-[0.4rem] py-[0.2rem] font-mono text-sm',
        className
      )}
      {...props}
    />
  ),
  pre: ({ className, ...props }: HTMLAttributes<HTMLPreElement>) => (
    <pre
      className={cn(
        'border-border bg-muted my-4 overflow-x-auto rounded-xl border p-4 [&_code]:bg-transparent [&_code]:p-0',
        className
      )}
      {...props}
    />
  ),
  table: ({ className, ...props }: HTMLAttributes<HTMLTableElement>) => (
    <div className="my-5 overflow-x-auto">
      <table
        className={cn(
          'border-border w-full min-w-[42rem] border-collapse',
          className
        )}
        {...props}
      />
    </div>
  ),
  th: ({ className, ...props }: HTMLAttributes<HTMLTableCellElement>) => (
    <th
      className={cn(
        'border-border bg-muted/60 border px-3 py-2 text-left font-semibold',
        className
      )}
      {...props}
    />
  ),
  td: ({ className, ...props }: HTMLAttributes<HTMLTableCellElement>) => (
    <td
      className={cn('border-border border px-3 py-2 align-top', className)}
      {...props}
    />
  ),
  hr: ({ className, ...props }: HTMLAttributes<HTMLHRElement>) => (
    <hr className={cn('border-border my-8', className)} {...props} />
  ),
};
