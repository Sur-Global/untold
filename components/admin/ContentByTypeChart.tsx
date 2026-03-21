'use client'

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts'

interface Props {
  data: Array<{ type: string; count: number }>
}

const TYPE_COLORS: Record<string, string> = {
  article: '#b45309',
  video: '#0d9488',
  podcast: '#7c3aed',
  pill: '#be185d',
  course: '#1d4ed8',
}

export function ContentByTypeChart({ data }: Props) {
  if (data.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">No published content yet.</p>
    )
  }
  return (
    <ResponsiveContainer width="100%" height={200}>
      <BarChart data={data} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
        <XAxis dataKey="type" tick={{ fontSize: 12 }} />
        <YAxis tick={{ fontSize: 12 }} allowDecimals={false} />
        <Tooltip />
        <Bar dataKey="count" radius={[4, 4, 0, 0]}>
          {data.map((entry) => (
            <Cell
              key={entry.type}
              fill={TYPE_COLORS[entry.type] ?? '#888'}
            />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  )
}
