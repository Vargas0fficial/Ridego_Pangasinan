import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'RideGo Pangasinan',
    short_name: 'RideGo Pangasinan',
    description: 'Ride Anywhere in Pangasinan. Fast, safe motorcycle rides.',
    start_url: '/',
    scope: '/',
    display: 'standalone',
    orientation: 'portrait',
    background_color: '#0B9A55',
    theme_color: '#0B9A55',
    icons: [
      { src: '/pwa/192', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: '/pwa/512', sizes: '512x512', type: 'image/png', purpose: 'any' },
      { src: '/pwa/512?m=1', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  };
}