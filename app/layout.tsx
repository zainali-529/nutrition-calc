import type { Metadata, Viewport } from 'next'
import { Geist, Geist_Mono } from 'next/font/google'
import { Analytics } from '@vercel/analytics/next'
import { Toaster } from '@/components/ui/sonner'
import { NutritionBackground } from '@/components/NutritionBackground'
import './globals.css'

const _geist = Geist({ subsets: ["latin"] });
const _geistMono = Geist_Mono({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: 'RumiCalc | Livestock Ration & TMR Calculator | رومی کیلک',
  description: 'RumiCalc - Professional livestock feed and Total Mixed Ration (TMR) formula calculator for dairy cows, buffaloes, bulls, and goats.',
  generator: 'v0.app',
  applicationName: 'RumiCalc',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'RumiCalc',
  },
  formatDetection: {
    telephone: false,
  },
  icons: {
    icon: [
      {
        url: '/rumicalc-logo.png',
        type: 'image/png',
      },
      {
        url: '/icon.svg',
        type: 'image/svg+xml',
      },
    ],
    apple: '/rumicalc-logo.png',
  },
}

// Mobile-first viewport: prevent unwanted zoom on input focus, allow notch
// safe-area insets to be honoured via env(safe-area-inset-*) in CSS, and let
// the body scroll naturally without horizontal overflow.
export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  themeColor: '#0e3b5e',
  viewportFit: 'cover',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body suppressHydrationWarning className="font-sans antialiased min-h-screen bg-[#f8fafc] relative selection:bg-[#558b2f]/20 selection:text-[#0e3b5e]">
        {/* Animated Nutrition Calculator Background with Floating Keycaps */}
        <NutritionBackground />

        {/* Main Content Layer */}
        <div className="relative z-10 min-h-screen flex flex-col justify-between">
          {children}
        </div>

        <Toaster
          position="top-center"
          richColors
          closeButton
          offset="env(safe-area-inset-top, 16px)"
        />
        <Analytics />
      </body>
    </html>
  )
}
