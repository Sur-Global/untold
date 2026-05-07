import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

export function AdminPanel({
  title,
  children,
  className,
  bodyClassName,
}: {
  title?: string
  children: ReactNode
  className?: string
  /** Use p-6 when content is not a full-width table */
  bodyClassName?: string
}) {
  return (
    <section
      className={cn(
        'overflow-hidden rounded-2xl border border-primary/15 bg-card shadow-[0px_4px_16px_0px_rgba(44,36,32,0.08),0px_2px_8px_0px_rgba(44,36,32,0.04)]',
        className,
      )}
    >
      {title ? (
        <div className="border-b border-primary/10 px-6 py-4">
          <h2 className="font-mono text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            {title}
          </h2>
        </div>
      ) : null}
      <div className={cn(bodyClassName ?? 'p-0')}>{children}</div>
    </section>
  )
}
