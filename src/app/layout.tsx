import type { Metadata } from 'next'
import { Inter } from 'next/font/google'

import './globals.css'
import { Providers } from '@/components/providers'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXTAUTH_URL || 'http://localhost:3001'),
  title: 'Fini AI - Analytics WhatsApp para Tienda Nube',
  description: 'Conecta tu tienda de Tienda Nube con WhatsApp y obtén analytics en tiempo real con IA. Sistema multi-agente con RAG para tu ecommerce.',
  keywords: 'WhatsApp, Tienda Nube, Analytics, IA, Ecommerce, Chatbot, RAG, Multi-agente',
  authors: [{ name: 'Fini AI' }],
  openGraph: {
    title: 'Fini AI - Analytics WhatsApp para Tienda Nube',
    description: 'Conecta tu tienda con WhatsApp y obtén analytics en tiempo real con IA.',
    type: 'website',
    locale: 'es_AR',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Fini AI - Analytics WhatsApp para Tienda Nube',
    description: 'Conecta tu tienda con WhatsApp y obtén analytics en tiempo real con IA.',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="es">
      <body className={inter.className}>
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  )
} 