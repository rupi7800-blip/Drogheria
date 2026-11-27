/* Servizio di appoggio di Drogheria: permette l'installazione e l'apertura senza rete.
   - Pagina, stile e script: prima la rete (così gli aggiornamenti arrivano subito), poi la copia salvata.
   - Dati delle fonti (Wikipedia, FDA, ecc.): mai salvati; senza rete l'app lo dice. */
const VERSIONE = 'drogheria-v1';
const GUSCIO = ['./', 'index.html', 'src/style.css', 'src/app.js', 'src/installa.js', 'manifest.webmanifest',
  'icone/icona-192.png', 'icone/icona-512.png', 'icone/icona-maschera-512.png', 'icone/apple-touch-icon.png', 'icone/favicon.png'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(VERSIONE).then(c => c.addAll(GUSCIO)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(nomi => Promise.all(nomi.filter(n => n !== VERSIONE).map(n => caches.delete(n))))
    .then(() => self.clients.claim()));
});

self.addEventListener('fetch', e => {
  const r = e.request;
  if (r.method !== 'GET' || new URL(r.url).origin !== self.location.origin) return;   // fonti esterne: sempre dalla rete
  e.respondWith(fetch(r).then(ris => {
    if (ris.ok) { const copia = ris.clone(); caches.open(VERSIONE).then(c => c.put(r, copia)); }
    return ris;
  }).catch(() => caches.match(r).then(c => c || (r.mode === 'navigate' ? caches.match('index.html') : Response.error()))));
});
