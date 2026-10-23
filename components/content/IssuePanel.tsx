import { Link } from '@/i18n/navigation'

export type IssuePanelLabels = {
  title: string
  /** shown when the article already belongs to an issue; {month} is filled in by the page */
  inIssue: string
  isEditorial: string
  editIssue: string
  notInIssue: string
  createIssue: string
  addToIssue: string
  publishFirst: string
}

interface Props {
  articleId: string
  published: boolean
  /** the issue the article belongs to now, if any */
  issue: { id: string; monthLabel: string } | null
  isEditorial: boolean
  labels: IssuePanelLabels
}

const aeonik = (weight: 300 | 400 | 500): React.CSSProperties => ({
  fontFamily: 'var(--font-aeonik), Aeonik, sans-serif',
  fontWeight: weight,
})

const buttonClass = 'inline-flex h-10 items-center rounded-full px-5 text-sm no-underline transition-opacity hover:opacity-90'

/**
 * Only shown to editors and administrators on an article's edit page: link the article to a numbered issue
 * (as its editorial, with the articles that belong to it) from the issue form.
 */
export function IssuePanel({ articleId, published, issue, isEditorial, labels }: Props) {
  return (
    <aside className="rounded-2xl border border-black/10 bg-white p-5" aria-label={labels.title}>
      <p className="mb-2 text-[11px] uppercase tracking-[0.08em]" style={{ ...aeonik(300), color: '#6b6ad0' }}>
        {labels.title}
      </p>
      {issue ? (
        <>
          <p className="mb-4 text-sm" style={{ ...aeonik(300), color: '#333' }}>
            {labels.inIssue.replace('{month}', issue.monthLabel)}
            {isEditorial ? ` ${labels.isEditorial}` : ''}
          </p>
          <Link href={`/admin/issues/${issue.id}`} className={buttonClass} style={{ ...aeonik(400), background: '#000', color: '#fff' }}>
            {labels.editIssue}
          </Link>
        </>
      ) : !published ? (
        <p className="text-sm" style={{ ...aeonik(300), color: '#555' }}>
          {labels.publishFirst}
        </p>
      ) : (
        <>
          <p className="mb-4 text-sm" style={{ ...aeonik(300), color: '#333' }}>
            {labels.notInIssue}
          </p>
          <div className="flex flex-wrap items-center gap-3">
            <Link href={`/admin/issues/new?editorial=${articleId}`} className={buttonClass} style={{ ...aeonik(400), background: '#D2FE73', color: '#000' }}>
              {labels.createIssue}
            </Link>
            <Link href="/admin/issues" className="text-sm underline" style={{ ...aeonik(400), color: '#6b6ad0' }}>
              {labels.addToIssue}
            </Link>
          </div>
        </>
      )}
    </aside>
  )
}
