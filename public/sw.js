const CACHE_NAME = 'keepgoing-v4';
const ASSETS_TO_CACHE = [
  '/',
  '/index.html',
  '/manifest.json',
  '/icons/icon-512.png'
];

// Instalação - ignorar espera para pegar o controle imediatamente
self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS_TO_CACHE);
    })
  );
});

// Ativação - Limpeza agressiva e assumir controle dos clientes
self.addEventListener('activate', (event) => {
  event.waitUntil(
    Promise.all([
      self.clients.claim(),
      caches.keys().then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (cacheName !== CACHE_NAME) {
              console.log('[SW] Deletando cache antigo:', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      })
    ])
  );
});

// Fetch event - Network-First for HTML, Cache-First for others with network fallback
self.addEventListener('fetch', (event) => {
  // Ignorar requisições que não sejam GET
  if (event.request.method !== 'GET') return;

  // Não cachear requisições externas (Supabase API, cotações, etc.)
  // Apenas cachear recursos da própria origem (JS, CSS, imagens do app)
  if (!event.request.url.startsWith(self.location.origin)) return;

  const isHtml = event.request.mode === 'navigate' || 
                 (event.request.headers.get('accept')?.includes('text/html'));

  if (isHtml) {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          const copy = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
          return response;
        })
        .catch(() => caches.match('/index.html') || caches.match(event.request))
    );
  } else {
    // Para assets (JS/CSS), tentamos cache primeiro, mas se der 404 na rede, não retornar o index no fallback
    event.respondWith(
      caches.match(event.request).then((response) => {
        return response || fetch(event.request).then((netResponse) => {
          // Só cachear se for sucesso (200) e não for um fallback HTML do Vercel
          if (netResponse.status === 200) {
            const copy = netResponse.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
          }
          return netResponse;
        });
      })
    );
  }
});

// Push notification event
self.addEventListener('push', (event) => {
  const data = event.data ? event.data.json() : { title: 'KeepGoing', body: 'Nova atualização!' };
  
  const options = {
    body: data.body,
    icon: '/icons/icon-512.png',
    badge: '/icons/icon-512.png',
    data: {
      url: data.url || '/'
    }
  };

  event.waitUntil(
    self.registration.showNotification(data.title, options)
  );
});

// Notification click event
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    clients.openWindow(event.notification.data.url)
  );
});
