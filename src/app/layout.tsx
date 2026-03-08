import type { Metadata } from "next";
import AIProvider from "@/components/AIProvider";
import ConsentBanner from "@/components/ConsentBanner";
import PageViewTracker from "@/components/PageViewTracker";
import { ToastProvider } from "@/components/Toast";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL('https://uploadless.dev'),
  title: {
    default: 'Uploadless — Privacy-First Browser Tools',
    template: '%s | Uploadless',
  },
  description: 'Privacy-first browser tools that never upload your files. Convert, sign, audit, and build — everything runs locally in your browser.',
  keywords: ['privacy tools', 'browser tools', 'local-first', 'no upload', 'file converter', 'pdf signer', 'privacy audit', 'open source'],
  authors: [{ name: 'Uploadless' }],
  creator: 'Uploadless',
  publisher: 'Uploadless',
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: 'https://uploadless.dev',
    siteName: 'Uploadless',
    title: 'Uploadless — Privacy-First Browser Tools',
    description: 'Privacy-first browser tools that never upload your files. Convert, sign, audit, and build — everything runs locally in your browser.',
    images: [{ url: '/og/default.png', width: 1200, height: 630, alt: 'Uploadless — Privacy-First Browser Tools' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Uploadless — Privacy-First Browser Tools',
    description: 'Privacy-first browser tools that never upload your files.',
    images: ['/og/default.png'],
  },
  alternates: {
    canonical: 'https://uploadless.dev',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem('theme');if(t==='dark'||(!t&&window.matchMedia('(prefers-color-scheme:dark)').matches)){document.documentElement.classList.add('dark')}}catch(e){}})()`,
          }}
        />
        <link
          rel="preconnect"
          href="https://fonts.googleapis.com"
          crossOrigin="anonymous"
        />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;500;600;700;900&family=Source+Sans+3:wght@400;500;600&family=IBM+Plex+Mono:wght@400;500&family=IBM+Plex+Sans:wght@400;500;600&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="bg-bg-primary text-text-primary min-h-dvh flex flex-col">
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-[100] focus:px-4 focus:py-2 focus:bg-accent focus:text-accent-fg focus:font-medium focus:text-sm"
        >
          Skip to content
        </a>
        <AIProvider>
          <ToastProvider>
            {children}
          </ToastProvider>
          <PageViewTracker />
          <ConsentBanner />
        </AIProvider>
      </body>
    </html>
  );
}
