import { requireAdmin } from '@/lib/require-admin'

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  await requireAdmin()
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b px-6 py-4">
        <span className="font-mono text-sm uppercase tracking-widest text-muted-foreground">
          Admin
        </span>
      </header>
      <main className="p-6">{children}</main>
    </div>
  )
}
