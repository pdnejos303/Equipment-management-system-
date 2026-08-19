self.addEventListener('install', (event) => {
  console.log('Service Worker installed');
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  console.log('Service Worker activated');
});

self.addEventListener('fetch', (event) => {
  // A simple pass-through fetch handler is required by Chrome to trigger the PWA install prompt.
  // We don't actually need to cache anything for the install prompt to work.
});
