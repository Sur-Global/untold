import { render } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { SEARCH_HANDLE, SEARCH_RING, SearchIcon } from '@/components/ui/SearchIcon'

describe('SearchIcon', () => {
  it('is a ring with a handle that starts outside the ring and goes away from it (not a "Q")', () => {
    const [x1, y1, x2, y2] = SEARCH_HANDLE.match(/\d+(\.\d+)?/g)!.map(Number)
    const distance = (x: number, y: number) => Math.hypot(x - SEARCH_RING.cx, y - SEARCH_RING.cy)
    expect(distance(x1, y1)).toBeGreaterThanOrEqual(SEARCH_RING.r)
    expect(distance(x2, y2)).toBeGreaterThan(distance(x1, y1))
  })

  it('has a ring and a handle, is hidden from screen readers (the button around it has the name) and keeps the text colour', () => {
    const { container } = render(<SearchIcon size={24} />)
    const svg = container.querySelector('svg')!
    expect(svg).toHaveAttribute('aria-hidden', 'true')
    expect(svg).toHaveAttribute('width', '24')
    expect(svg.querySelectorAll('circle')).toHaveLength(1)
    expect(svg.querySelectorAll('path')).toHaveLength(1)
    expect(svg.querySelector('circle')).toHaveAttribute('stroke', 'currentColor')
  })

  it('stays inside its square so it is not cut', () => {
    const [, , x2, y2] = SEARCH_HANDLE.match(/\d+(\.\d+)?/g)!.map(Number)
    expect(x2).toBeLessThanOrEqual(20)
    expect(y2).toBeLessThanOrEqual(20)
  })
})
