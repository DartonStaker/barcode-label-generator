import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Barcode Label Generator',
  description: 'Generate barcode labels from Excel price list data',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}

