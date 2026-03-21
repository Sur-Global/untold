'use client'

import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts'

interface Props {
  data: Array<{ role: string; count: number }>
}

const ROLE_COLORS: Record<string, string> = {
  user: '#94a3b8',
  author: '#b45309',
  admin: '#1d4ed8',
}

export function UsersByRoleChart({ data }: Props) {
  if (data.length === 0) {
    return <p className="text-sm text-muted-foreground">No users yet.</p>
  }
  return (
    <ResponsiveContainer width="100%" height={200}>
      <PieChart>
        <Pie
          data={data}
          dataKey="count"
          nameKey="role"
          cx="50%"
          cy="50%"
          innerRadius={50}
          outerRadius={80}
        >
          {data.map((entry) => (
            <Cell
              key={entry.role}
              fill={ROLE_COLORS[entry.role] ?? '#888'}
            />
          ))}
        </Pie>
        <Tooltip />
        <Legend />
      </PieChart>
    </ResponsiveContainer>
  )
}
