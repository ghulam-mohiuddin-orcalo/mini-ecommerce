import { cn } from '@/lib/cn';

/**
 * Render a plain-text CMS body as readable prose. We deliberately avoid a markdown library:
 * the body is split into paragraphs on blank lines, and single newlines become line breaks.
 * This keeps seed copy legible without trusting/parsing arbitrary markup.
 */
export function Prose({ body, className }: { body: string; className?: string }) {
  const paragraphs = body
    .split(/\n\s*\n/)
    .map((block) => block.trim())
    .filter(Boolean);

  return (
    <div
      className={cn(
        'flex flex-col gap-5 text-[16px] leading-[1.75] text-ink-soft',
        '[&_strong]:font-semibold [&_strong]:text-ink',
        className,
      )}
    >
      {paragraphs.map((para, i) => (
        <p key={i}>
          {para.split('\n').map((line, j, arr) => (
            <span key={j}>
              {line}
              {j < arr.length - 1 && <br />}
            </span>
          ))}
        </p>
      ))}
    </div>
  );
}
