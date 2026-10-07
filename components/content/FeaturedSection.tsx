// Featured picks (★ in admin/content) shown above a content type's listing page.
export function FeaturedSection({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <section className="mb-14 border-b border-primary/10 pb-12">
      <h2 className="mb-6 font-mono text-sm font-semibold uppercase tracking-wider text-[#6B5F58]">★ {label}</h2>
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">{children}</div>
    </section>
  )
}
