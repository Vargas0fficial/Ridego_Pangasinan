import type { Metadata, Viewport } from 'next';
import type { ReactNode } from 'react';
import './globals.css';
import { AppProvider } from '@/context/AppContext';
import { Splash } from '@/components/Splash';
import { Toasts } from '@/components/ui';

export const metadata: Metadata = {
  title: 'RideGo Pangasinan',
  description: 'Ride Anywhere in Pangasinan. Fast, safe motorcycle rides across Dagupan, Urdaneta, Alaminos, Lingayen and more.',
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  themeColor: '#0B9A55',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Sora:wght@600;700;800&display=swap"
        />
      </head>
      <body className="font-sans">
        <AppProvider>
          {/* On desktop the whole app is shown as a phone-sized column, centred on the page. */}
          <div className="app-frame">
            {children}
            <Toasts />
            <Splash />
          </div>
        </AppProvider>
      </body>
    </html>
  );
}
