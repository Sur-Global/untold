/**
 * The magnifying glass: a ring and a handle that starts at the ring's edge and goes outward (a handle that goes
 * inward makes the glass look like a "Q"). Takes its colour from the text around it.
 */
export const SEARCH_RING = { cx: 8.5, cy: 8.5, r: 5.5 }
export const SEARCH_HANDLE = 'M12.6 12.6L17 17'

export function SearchIcon({ size = 20, className, style }: { size?: number; className?: string; style?: React.CSSProperties }) {
  return (
    <svg width={size} height={size} viewBox="0 0 20 20" fill="none" aria-hidden className={className} style={style}>
      <circle cx={SEARCH_RING.cx} cy={SEARCH_RING.cy} r={SEARCH_RING.r} stroke="currentColor" strokeWidth="1.6" />
      <path d={SEARCH_HANDLE} stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  )
}
