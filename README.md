# Drogheria

App web leggera per cercare **farmaci, integratori, erbe, fitoterapici e rimedi omeopatici**, per persone e animali, per nome commerciale, principio attivo o nome comune.

Per ogni ricerca mostra: principio attivo, meccanismo d'azione, modo d'uso, a cosa serve (con percentuali dagli studi, se disponibili), effetti collaterali in percentuale e farmaci simili.

## Uso
Nessuna installazione: apri `index.html` nel browser, oppure pubblica la cartella con GitHub Pages.

## Installazione su Android
L'app è installabile come app web: non serve nessun negozio di applicazioni.
1. Apri l'indirizzo dell'app con **Chrome** su Android (con GitHub Pages: `https://rupi7800-blip.github.io/Drogheria/`).
2. Tocca **«📲 Installa l'app sul telefono»** in fondo alla pagina, oppure il menu ⋮ → **Installa app** / **Aggiungi a schermata Home**.
3. L'icona «Drogheria» compare tra le app e si apre a schermo intero. La parte grafica funziona anche senza rete; le ricerche richiedono la connessione.

Per un file **APK** vero e proprio (per distribuirlo fuori dal browser) si può generare dall'indirizzo pubblico con [PWABuilder](https://www.pwabuilder.com): richiede solo l'indirizzo dell'app e produce un pacchetto Android firmato.

## Fonti (aperte, interrogate dal browser)
- Wikipedia (it/en): descrizione, meccanismo, uso, effetti
- openFDA: schede ufficiali, segnalazioni di reazioni avverse (anche veterinarie)
- RxNav / ATC: farmaci della stessa classe
- PubMed: studi e revisioni principali
- Collegamenti diretti a Google, Bing, DuckDuckGo, AIFA, EMA, DailyMed

## Traduzione
Tutto è mostrato in italiano. I testi inglesi (schede FDA, Wikipedia inglese, titoli PubMed, reazioni) sono tradotti dal browser nell'ordine: traduttore integrato di Chrome (sul dispositivo) → Google Traduttore (servizio non ufficiale, senza chiave) → MyMemory. Se nessuno risponde, il testo resta in inglese con un avviso. **Riservatezza:** al traduttore vengono inviati solo i testi delle fonti, mai il termine digitato; i testi però contengono il nome del farmaco, quindi i servizi esterni possono dedurre l'argomento. Con il traduttore integrato di Chrome nulla lascia il dispositivo. I nomi dei farmaci simili passano dai collegamenti tra lingue di Wikipedia.

## Limiti onesti
- Le traduzioni sono automatiche e possono contenere imprecisioni; per la cura fa fede il foglietto illustrativo.
- Google e Bing non offrono API aperte dal browser: si usano collegamenti diretti.
- Le percentuali di effetti collaterali sono *percentuali di segnalazione* (FDA), non incidenza reale.
- La percentuale di efficacia appare solo se citata negli studi clinici della scheda.
- Prodotti omeopatici, erbe e integratori sono coperti soprattutto da Wikipedia e PubMed.
- Solo informativo: non sostituisce medico, farmacista o veterinario.
