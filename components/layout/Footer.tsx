import Link from 'next/link'

export function Footer() {
  return (
    <footer className="border-t py-16 mt-20" style={{ backgroundColor: '#0D0D0D', borderColor: 'rgba(160,82,45,0.15)' }}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="grid md:grid-cols-4 gap-12 mb-12">
          <div>
            <h4 className="mb-4" style={{ color: '#E8E6E3', fontFamily: 'Audiowide, sans-serif' }}>UNTOLD</h4>
            <p className="text-sm" style={{ color: '#78716C' }}>Exploring ideas that transform the future.</p>
          </div>
          <div>
            <p className="mb-4 text-sm font-mono uppercase tracking-wider" style={{ color: '#A8A29E' }}>Content</p>
            <ul className="space-y-3 text-sm" style={{ color: '#78716C' }}>
              {[['articles','Articles'],['videos','Videos'],['podcasts','Podcasts'],['pills','Pills'],['courses','Courses']].map(([href, label]) => (
                <li key={href}><Link href={`/${href}`} className="hover:text-[#A0522D] transition-colors">{label}</Link></li>
              ))}
            </ul>
          </div>
          <div>
            <p className="mb-4 text-sm font-mono uppercase tracking-wider" style={{ color: '#A8A29E' }}>Topics</p>
            <ul className="space-y-3 text-sm" style={{ color: '#78716C' }}>
              {['Decoloniality','Sustainability','Technology','Education','Responsible AI'].map((topic) => (
                <li key={topic}><Link href={`/tag/${topic.toLowerCase().replace(' ','-')}`} className="hover:text-[#A0522D] transition-colors">{topic}</Link></li>
              ))}
            </ul>
          </div>
          <div>
            <p className="mb-4 text-sm font-mono uppercase tracking-wider" style={{ color: '#A8A29E' }}>Connect</p>
            <ul className="space-y-3 text-sm" style={{ color: '#78716C' }}>
              {[['about','About'],['contact','Contact'],['newsletter','Newsletter'],['become-creator','Become a Creator']].map(([href, label]) => (
                <li key={href}><Link href={`/${href}`} className="hover:text-[#A0522D] transition-colors">{label}</Link></li>
              ))}
            </ul>
          </div>
        </div>
        <div className="pt-8 text-center text-sm border-t" style={{ color: '#78716C', borderColor: 'rgba(160,82,45,0.15)' }}>
          © {new Date().getFullYear()} UNTOLD. All rights reserved. A Sur Global publication.
        </div>
      </div>
    </footer>
  )
}
