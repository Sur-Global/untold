import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'UNTOLD — Views from the Global South',
  description: 'A multilingual editorial platform by Sur Global',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html suppressHydrationWarning>
      <body className="noise-texture min-h-screen">{children}</body>
    </html>
  )
}
