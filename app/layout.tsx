import type React from "react"
import type { Metadata, Viewport } from "next"
import { Suspense } from "react"
import { Inter } from "next/font/google"
import { Analytics } from "@vercel/analytics/next"
import { PwaRegister } from "@/components/pwa-register"
import "./globals.css"

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-vo",
  display: "swap",
})

export const metadata: Metadata = {
  title: "Mosselweekend Kassa 2026",
  description: "Kassasysteem voor Mosselweekend 2026 — werkt online en offline.",
  generator: "v0.app",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Mossel Kassa",
  },
  icons: {
    icon: "/icon-512.png",
    apple: "/icon-512.png",
  },
}

export const viewport: Viewport = {
  themeColor: "#b91c1c",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="nl" className="bg-background">
      <body className={`font-sans ${inter.variable}`}>
        <Suspense fallback={<div>Loading...</div>}>{children}</Suspense>
        <PwaRegister />
        <Analytics />
      </body>
    </html>
  )
}
