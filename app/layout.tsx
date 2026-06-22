import type { Metadata } from 'next'
import './globals.css'
import { ThemeProvider } from '@/components/ThemeProvider'

export const metadata: Metadata = {
  title: 'LandingLens — AI-Powered Landing Page Audits',
  description: 'Get instant AI-powered conversion optimization audits for your landing pages. Improve headlines, CTAs, and trust signals in minutes.',
  keywords: 'landing page audit, conversion optimization, CRO, AI analysis, website optimization',
  openGraph: {
    title: 'LandingLens — AI-Powered Landing Page Audits',
    description: 'Get instant AI-powered conversion optimization audits for your landing pages.',
    type: 'website',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <ThemeProvider>
          {children}
        </ThemeProvider>
      </body>
    </html>
  )
}
