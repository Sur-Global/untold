import type { Metadata } from 'next'
import { Audiowide, Inter, JetBrains_Mono } from 'next/font/google'
import './globals.css'

const audiowide = Audiowide({
  weight: '400',
  subsets: ['latin'],
  variable: '--font-audiowide',
  display: 'swap',
})

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
})

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-jetbrains-mono',
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'UNTOLD — Views from the Global South',
  description: 'A multilingual editorial platform by Sur Global',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html suppressHydrationWarning className={`${audiowide.variable} ${inter.variable} ${jetbrainsMono.variable}`}>
      <body className="noise-texture min-h-screen">{children}</body>
    </html>
  )
}
