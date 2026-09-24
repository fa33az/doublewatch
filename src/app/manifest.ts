import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'DoubleWatch — Multi-Screen YouTube Live',
    short_name: 'DoubleWatch',
    description: 'Tonton 2 sampai 4 siaran YouTube live sekaligus, lengkap dengan crossfader audio dan live chat.',
    lang: 'id',
    start_url: '/',
    display: 'standalone',
    orientation: 'any',
    background_color: '#0f191e',
    theme_color: '#0f191e',
    icons: [
      { src: '/pwa-icon/192', sizes: '192x192', type: 'image/png' },
      { src: '/pwa-icon/512', sizes: '512x512', type: 'image/png' },
      { src: '/pwa-icon/maskable-512', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  };
}
