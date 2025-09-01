// Service Worker for Registro de Calificaciones by LPaz
// Version 1.0.0

const CACHE_NAME = 'calificaciones-v1.0.0';
const APP_PREFIX = 'calificaciones-';

// Files to cache for offline functionality
const CACHE_FILES = [
  './',
  './index.html',
  './manifest.json',
  // Icons (add when available)
  './icons/icon-72x72.png',
  './icons/icon-96x96.png',
  './icons/icon-128x128.png',
  './icons/icon-144x144.png',
  './icons/icon-152x152.png',
  './icons/icon-192x192.png',
  './icons/icon-384x384.png',
  './icons/icon-512x512.png',
  // Shortcuts icons (add when available)
  './icons/shortcut-add.png',
  './icons/shortcut-export.png'
];

// Essential files that must be cached
const ESSENTIAL_FILES = [
  './',
  './index.html',
  './manifest.json'
];

// Install Event - Cache essential files
self.addEventListener('install', (event) => {
  console.log('Service Worker: Instalando...');
  
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('Service Worker: Cachéando archivos esenciales...');
        // Cache essential files first
        return cache.addAll(ESSENTIAL_FILES);
      })
      .then(() => {
        console.log('Service Worker: Archivos esenciales cachéados');
        // Try to cache additional files (non-blocking)
        return caches.open(CACHE_NAME);
      })
      .then((cache) => {
        // Cache additional files without failing if some don't exist
        const promises = CACHE_FILES.map(url => {
          return cache.add(url).catch(err => {
            console.warn(`Service Worker: No se pudo cachear ${url}:`, err);
            return Promise.resolve();
          });
        });
        return Promise.all(promises);
      })
      .then(() => {
        console.log('Service Worker: Instalación completada');
        return self.skipWaiting(); // Force activation
      })
      .catch((error) => {
        console.error('Service Worker: Error durante la instalación:', error);
      })
  );
});

// Activate Event - Clean up old caches
self.addEventListener('activate', (event) => {
  console.log('Service Worker: Activando...');
  
  event.waitUntil(
    caches.keys()
      .then((cacheNames) => {
        const deletePromises = cacheNames.map((cacheName) => {
          if (cacheName.startsWith(APP_PREFIX) && cacheName !== CACHE_NAME) {
            console.log('Service Worker: Eliminando caché antigua:', cacheName);
            return caches.delete(cacheName);
          }
        });
        return Promise.all(deletePromises);
      })
      .then(() => {
        console.log('Service Worker: Activado y limpieza completada');
        return self.clients.claim(); // Take control of all pages
      })
      .catch((error) => {
        console.error('Service Worker: Error durante la activación:', error);
      })
  );
});

// Fetch Event - Serve cached files when offline
self.addEventListener('fetch', (event) => {
  // Only handle GET requests
  if (event.request.method !== 'GET') {
    return;
  }
  
  // Skip cross-origin requests
  if (!event.request.url.startsWith(self.location.origin)) {
    return;
  }
  
  event.respondWith(
    caches.match(event.request)
      .then((cachedResponse) => {
        // Return cached version if available
        if (cachedResponse) {
          console.log('Service Worker: Sirviendo desde caché:', event.request.url);
          return cachedResponse;
        }
        
        // Fetch from network
        return fetch(event.request)
          .then((networkResponse) => {
            // Don't cache if not a valid response
            if (!networkResponse || networkResponse.status !== 200 || networkResponse.type !== 'basic') {
              return networkResponse;
            }
            
            // Clone the response
            const responseToCache = networkResponse.clone();
            
            // Add to cache for future use
            caches.open(CACHE_NAME)
              .then((cache) => {
                console.log('Service Worker: Cachéando nueva respuesta:', event.request.url);
                cache.put(event.request, responseToCache);
              })
              .catch((error) => {
                console.warn('Service Worker: Error al cachear:', error);
              });
            
            return networkResponse;
          })
          .catch((error) => {
            console.log('Service Worker: Falló la red, intentando caché:', event.request.url);
            
            // If it's a navigation request and we can't fetch, return the main page
            if (event.request.mode === 'navigate') {
              return caches.match('./index.html')
                .then((response) => {
                  return response || new Response('Aplicación no disponible offline', {
                    status: 503,
                    statusText: 'Service Unavailable',
                    headers: { 'Content-Type': 'text/plain' }
                  });
                });
            }
            
            // For other requests, throw the error
            throw error;
          });
      })
      .catch((error) => {
        console.error('Service Worker: Error en fetch:', error);
        
        // Return a basic offline response
        if (event.request.mode === 'navigate') {
          return new Response(`
            <!DOCTYPE html>
            <html>
            <head>
              <title>Offline - Registro de Calificaciones</title>
              <meta charset="UTF-8">
              <meta name="viewport" content="width=device-width, initial-scale=1.0">
              <style>
                body { 
                  font-family: Arial, sans-serif; 
                  text-align: center; 
                  padding: 50px; 
                  background: #0f172a; 
                  color: #f8fafc; 
                }
                h1 { color: #3b82f6; }
                .retry-btn { 
                  background: #3b82f6; 
                  color: white; 
                  border: none; 
                  padding: 10px 20px; 
                  border-radius: 5px; 
                  cursor: pointer; 
                  margin-top: 20px; 
                }
                .retry-btn:hover { background: #2563eb; }
              </style>
            </head>
            <body>
              <h1>📊 Registro de Calificaciones</h1>
              <h2>Sin conexión</h2>
              <p>La aplicación no está disponible en este momento.</p>
              <p>Por favor, verifica tu conexión a internet.</p>
              <button class="retry-btn" onclick="window.location.reload()">
                🔄 Intentar de nuevo
              </button>
            </body>
            </html>
          `, {
            headers: { 'Content-Type': 'text/html' }
          });
        }
        
        return new Response('Offline', { status: 503 });
      })
  );
});

// Handle background sync for data persistence
self.addEventListener('sync', (event) => {
  if (event.tag === 'grades-backup') {
    console.log('Service Worker: Sincronizando datos de calificaciones...');
    event.waitUntil(
      // Here you could implement background sync logic
      // For now, we'll just log the event
      Promise.resolve().then(() => {
        console.log('Service Worker: Sincronización completada');
      })
    );
  }
});

// Handle push notifications (for future features)
self.addEventListener('push', (event) => {
  console.log('Service Worker: Push recibido');
  
  const options = {
    body: event.data ? event.data.text() : 'Nueva notificación de Registro de Calificaciones',
    icon: './icons/icon-192x192.png',
    badge: './icons/icon-72x72.png',
    tag: 'calificaciones-notification',
    requireInteraction: false,
    actions: [
      {
        action: 'open',
        title: 'Abrir aplicación',
        icon: './icons/shortcut-add.png'
      },
      {
        action: 'dismiss',
        title: 'Descartar',
        icon: './icons/shortcut-export.png'
      }
    ]
  };
  
  event.waitUntil(
    self.registration.showNotification('Registro de Calificaciones', options)
  );
});

// Handle notification clicks
self.addEventListener('notificationclick', (event) => {
  console.log('Service Worker: Notificación clickeada:', event.notification.tag);
  
  event.notification.close();
  
  if (event.action === 'open' || !event.action) {
    event.waitUntil(
      clients.openWindow('./')
    );
  }
});

// Handle messages from the main app
self.addEventListener('message', (event) => {
  console.log('Service Worker: Mensaje recibido:', event.data);
  
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
  
  if (event.data && event.data.type === 'GET_VERSION') {
    event.ports[0].postMessage({
      version: CACHE_NAME,
      cached_files: CACHE_FILES.length
    });
  }
});

// Handle errors
self.addEventListener('error', (event) => {
  console.error('Service Worker: Error global:', event.error);
});

self.addEventListener('unhandledrejection', (event) => {
  console.error('Service Worker: Promise rechazada:', event.reason);
  event.preventDefault();
});

console.log('Service Worker: Script cargado correctamente');