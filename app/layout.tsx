import type { Metadata, Viewport } from 'next'
import localFont from 'next/font/local'
import { JetBrains_Mono } from 'next/font/google'
import './globals.css'

const aeonik = localFont({
  src: [
    { path: './fonts/Aeonik-Air.ttf',        weight: '100', style: 'normal' },
    { path: './fonts/Aeonik-AirItalic.ttf',  weight: '100', style: 'italic' },
    { path: './fonts/Aeonik-Thin.ttf',       weight: '200', style: 'normal' },
    { path: './fonts/Aeonik-ThinItalic.ttf', weight: '200', style: 'italic' },
    { path: './fonts/Aeonik-Regular.ttf',    weight: '400', style: 'normal' },
    { path: './fonts/Aeonik-RegularItalic.ttf', weight: '400', style: 'italic' },
    { path: './fonts/Aeonik Pro Medium.ttf', weight: '500', style: 'normal' },
    { path: './fonts/Aeonik-MediumItalic.ttf', weight: '500', style: 'italic' },
    { path: './fonts/Aeonik-Black.ttf',      weight: '900', style: 'normal' },
    { path: './fonts/Aeonik-BlackItalic.ttf', weight: '900', style: 'italic' },
  ],
  variable: '--font-aeonik',
  display: 'swap',
})

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-jetbrains-mono',
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'UNTOLD.ink — Views from the Global South',
  description: 'A multilingual editorial platform by SurGlobal.',
}

export const viewport: Viewport = {
  themeColor: '#000000',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html suppressHydrationWarning className={`${aeonik.variable} ${jetbrainsMono.variable}`}>
      <body className="min-h-screen">{children}</body>
    </html>
  )
}
