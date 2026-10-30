import { CourseCard, type CourseCardProps } from '@/components/content/CourseCard'

/**
 * A row of courses that always looks complete, whether there are one, two or three: a single course takes the whole row as a wide
 * card (banner beside the text), two share it, three or more fill three columns. On a phone they stack.
 */
export function CourseShowcase({ items }: { items: CourseCardProps[] }) {
  if (items.length === 0) return null
  if (items.length === 1) return <CourseCard {...items[0]} variant="wide" />
  const columns = items.length === 2 ? 'sm:grid-cols-2' : 'sm:grid-cols-2 lg:grid-cols-3'
  return (
    <div className={`grid gap-5 ${columns}`}>
      {items.map((item) => (
        <CourseCard key={item.slug} {...item} />
      ))}
    </div>
  )
}
