/* Installazione su Android (e altri browser): registra il servizio di appoggio e mostra il pulsante «Installa l'app». */
'use strict';

if ('serviceWorker' in navigator && (location.protocol === 'https:' || location.hostname === 'localhost')) {
  window.addEventListener('load', () => navigator.serviceWorker.register('sw.js').catch(() => { /* senza servizio l'app funziona lo stesso */ }));
}

let richiesta = null;
const riquadro = document.getElementById('installa');
const bottone = document.getElementById('installa-bottone');
const aiuto = document.getElementById('installa-aiuto');
const giaApp = window.matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;

if (riquadro && !giaApp) {
  riquadro.hidden = false;
  // Chrome su Android: il browser offre l'installazione diretta
  window.addEventListener('beforeinstallprompt', e => {
    e.preventDefault();
    richiesta = e;
    bottone.hidden = false;
    aiuto.hidden = true;
  });
  bottone.addEventListener('click', async () => {
    if (!richiesta) return;
    richiesta.prompt();
    await richiesta.userChoice.catch(() => null);
    richiesta = null;
    bottone.hidden = true;
  });
  window.addEventListener('appinstalled', () => { riquadro.hidden = true; });
}
