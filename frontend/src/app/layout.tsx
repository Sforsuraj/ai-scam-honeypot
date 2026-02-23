import type { Metadata } from 'next'
import { Outfit } from 'next/font/google'
import './globals.css'

const outfit = Outfit({ subsets: ['latin'], variable: '--font-outfit' })

export const metadata: Metadata = {
  title: 'AI Scam Honeypot',
  description: 'Interactive honeypot to trap scammers and extract intel',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className={`${outfit.variable} font-sans`}>
      <body className="bg-slate-950 text-slate-100 min-h-screen selection:bg-brand-500/30">
        <div className="fixed inset-0 bg-[radial-gradient(circle_at_top_right,_var(--tw-gradient-stops))] from-indigo-900/20 via-slate-950/80 to-slate-950 -z-10" />
        {children}
      </body>
    </html>
  )
}
