import type { Metadata, Viewport } from 'next'
import './globals.css'
import { ThemeProvider } from '@/components/ThemeProvider'
import { Analytics } from '@vercel/analytics/react'

export const metadata: Metadata = {
  title: 'SizeEasy - Compare Anything, Visualize Everything',
  description: 'The internet\'s most addictive size comparison tool. Compare objects, animals, buildings, and more with stunning AI-generated visualizations.',
  keywords: 'size comparison, scale comparison, object size, visual comparison, AI comparison',
  authors: [{ name: 'SizeEasy' }],
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: 'https://sizeeasy.com',
    title: 'SizeEasy - Compare Anything, Visualize Everything',
    description: 'The internet\'s most addictive size comparison tool',
    siteName: 'SizeEasy',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'SizeEasy - Compare Anything, Visualize Everything',
    description: 'The internet\'s most addictive size comparison tool',
  },
  manifest: '/manifest.json',
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="font-sans antialiased">
        <ThemeProvider>
          {children}
        </ThemeProvider>
        <Analytics />
      </body>
    </html>
  )
}
