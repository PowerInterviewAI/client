import { defaultSchema, type Schema } from 'hast-util-sanitize';
import type { Components } from 'react-markdown';
import ReactMarkdown from 'react-markdown';
import rehypeHighlight from 'rehype-highlight';
import rehypeSanitize from 'rehype-sanitize';
import remarkGfm from 'remark-gfm';

import { cn } from '@/lib/utils';

const sanitizeSchema: Schema = {
  ...defaultSchema,
  attributes: {
    ...defaultSchema.attributes,
    code: [...(defaultSchema.attributes?.code || []), ['className']],
    pre: [...(defaultSchema.attributes?.pre || []), ['className']],
    span: [...(defaultSchema.attributes?.span || []), ['className']],
  },
};

const components = {
  a: ({ children, href, ...props }: any) => (
    <a
      href={href}
      target="_blank"
      rel="noreferrer noopener"
      className="underline underline-offset-2"
      {...props}
    >
      {children}
    </a>
  ),
  pre: ({ children, className, ...props }: any) => (
    <pre
      className={cn(
        'rounded-md bg-muted/60 p-3 text-xs leading-relaxed font-mono whitespace-pre-wrap',
        className,
      )}
      {...props}
    >
      {children}
    </pre>
  ),
  code: ({ children, className, ...props }: any) => {
    const { inline, ...rest } = props;
    const isInline = inline === true;
    const codeClass = isInline
      ? cn('font-mono rounded bg-muted/60 px-1 py-0.5 text-[0.85em]', className)
      : cn('font-mono whitespace-pre-wrap break-words', className);

    return (
      <code className={codeClass} {...rest}>
        {children}
      </code>
    );
  },
  ul: ({ children, ...props }: any) => (
    <ul className="list-disc pl-5" {...props}>
      {children}
    </ul>
  ),
  ol: ({ children, ...props }: any) => (
    <ol className="list-decimal pl-5" {...props}>
      {children}
    </ol>
  ),
  li: ({ children, ...props }: any) => (
    <li className="my-1" {...props}>
      {children}
    </li>
  ),
  p: ({ children, ...props }: any) => (
    <p className="my-2" {...props}>
      {children}
    </p>
  ),
} satisfies Components;

export function SafeMarkdown({ content }: { content?: string }) {
  if (!content) return null;

  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      rehypePlugins={[rehypeHighlight as any, [rehypeSanitize, sanitizeSchema]]}
      components={components}
    >
      {content}
    </ReactMarkdown>
  );
}
