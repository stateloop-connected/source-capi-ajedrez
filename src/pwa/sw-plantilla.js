/**
 * Service worker de Capi-Ajedrez.
 * La lista de archivos y la versión las inserta el plugin de Vite al compilar.
 * - Precarga todos los archivos del juego para que funcione sin conexión.
 * - Navegación: red primero y, si falla, la copia guardada de index.html.
 * - Resto (incluida la fuente de Google Fonts): caché primero y actualización en segundo plano.
 */
const VERSION = '__VERSION__';
const CACHE = `capi-ajedrez-${VERSION}`;
const PRECARGA = __PRECARGA__;

self.addEventListener('install', (evento) => {
  evento.waitUntil(
    caches
      .open(CACHE)
      .then((cache) => cache.addAll(PRECARGA))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener('activate', (evento) => {
  evento.waitUntil(
    caches
      .keys()
      .then((claves) => Promise.all(claves.filter((c) => c.startsWith('capi-ajedrez-') && c !== CACHE).map((c) => caches.delete(c))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (evento) => {
  const peticion = evento.request;
  if (peticion.method !== 'GET') return;
  const url = new URL(peticion.url);
  const esFuente = url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com';
  if (url.origin !== self.location.origin && !esFuente) return;

  if (peticion.mode === 'navigate') {
    evento.respondWith(
      fetch(peticion)
        .then((respuesta) => {
          const copia = respuesta.clone();
          caches.open(CACHE).then((cache) => cache.put('./index.html', copia));
          return respuesta;
        })
        .catch(() => caches.match('./index.html')),
    );
    return;
  }

  evento.respondWith(
    caches.match(peticion).then((guardada) => {
      const red = fetch(peticion)
        .then((respuesta) => {
          if (respuesta.ok || respuesta.type === 'opaque') {
            const copia = respuesta.clone();
            caches.open(CACHE).then((cache) => cache.put(peticion, copia));
          }
          return respuesta;
        })
        .catch(() => guardada);
      return guardada || red;
    }),
  );
});
