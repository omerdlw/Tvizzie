export default function manifest() {
  return {
    name: 'Tvizzie',
    short_name: 'Tvizzie',
    description: 'Discover, track, and review your favorite movies',
    start_url: '/',
    display: 'standalone',
    background_color: '#ffffff',
    theme_color: '#ffffff',
    icons: [
      {
        src: '/tvizzie.png',
        sizes: '1024x1024',
        type: 'image/png',
        purpose: 'any',
      },
    ],
  };
}
