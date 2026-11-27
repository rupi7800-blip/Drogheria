/* Drogheria – ricerca di farmaci, integratori, erbe e rimedi.
   Tutto gira nel browser: interroga fonti aperte (Wikipedia, openFDA, RxNav, PubMed)
   e offre i collegamenti diretti ai principali motori di ricerca. */
'use strict';

/* ---------- Dati di appoggio ---------- */

// Nomi commerciali italiani comuni -> principio attivo (denominazione USA, usata da openFDA)
const MARCHI = {
  tachipirina: 'acetaminophen', efferalgan: 'acetaminophen', paracetamolo: 'acetaminophen', paracetamol: 'acetaminophen',
  moment: 'ibuprofen', nurofen: 'ibuprofen', brufen: 'ibuprofen', ibuprofene: 'ibuprofen',
  aspirina: 'aspirin', cardioaspirin: 'aspirin', 'acido acetilsalicilico': 'aspirin',
  voltaren: 'diclofenac', diclofenac: 'diclofenac', oki: 'ketoprofen', ketoprofene: 'ketoprofen',
  augmentin: 'amoxicillin', amoxicillina: 'amoxicillin', zitromax: 'azithromycin', azitromicina: 'azithromycin',
  bentelan: 'betamethasone', buscopan: 'scopolamine', imodium: 'loperamide', loperamide: 'loperamide',
  lasix: 'furosemide', furosemide: 'furosemide', xanax: 'alprazolam', tavor: 'lorazepam', lorazepam: 'lorazepam',
  ventolin: 'albuterol', salbutamolo: 'albuterol', salbutamol: 'albuterol', adrenalina: 'epinephrine',
  noradrenalina: 'norepinephrine', ciclosporina: 'cyclosporine', metformina: 'metformin', omeprazolo: 'omeprazole',
  pantoprazolo: 'pantoprazole', cetirizina: 'cetirizine', loratadina: 'loratadine', melatonina: 'melatonin',
  simvastatina: 'simvastatin', atorvastatina: 'atorvastatin', amlodipina: 'amlodipine', ramipril: 'ramipril',
};

// Sinonimi INN (Europa) -> USAN (USA)
const INN_USAN = {
  paracetamol: 'acetaminophen', salbutamol: 'albuterol', adrenaline: 'epinephrine', noradrenaline: 'norepinephrine',
  ciclosporin: 'cyclosporine', 'acetylsalicylic acid': 'aspirin', rifampicin: 'rifampin', glibenclamide: 'glyburide',
  lidocaine: 'lidocaine', hyoscine: 'scopolamine',
};

// Reazioni avverse: termine MedDRA -> italiano (le più frequenti)
const REAZIONI = {
  nausea: 'Nausea', vomiting: 'Vomito', diarrhoea: 'Diarrea', headache: 'Mal di testa', dizziness: 'Capogiro',
  fatigue: 'Stanchezza', asthenia: 'Debolezza', malaise: 'Malessere', pain: 'Dolore', pyrexia: 'Febbre',
  rash: 'Eruzione cutanea', pruritus: 'Prurito', urticaria: 'Orticaria', dyspnoea: 'Difficoltà respiratoria',
  cough: 'Tosse', somnolence: 'Sonnolenza', insomnia: 'Insonnia', anxiety: 'Ansia', depression: 'Depressione',
  constipation: 'Stitichezza', 'abdominal pain': 'Dolore addominale', 'abdominal pain upper': 'Dolore addominale alto',
  arthralgia: 'Dolori articolari', myalgia: 'Dolori muscolari', 'back pain': 'Mal di schiena', hypertension: 'Pressione alta',
  hypotension: 'Pressione bassa', tachycardia: 'Battito accelerato', palpitations: 'Palpitazioni', oedema: 'Gonfiore (edema)',
  'oedema peripheral': 'Gonfiore periferico', anaemia: 'Anemia', 'weight decreased': 'Calo di peso', 'weight increased': 'Aumento di peso',
  'decreased appetite': 'Appetito ridotto', dyspepsia: 'Cattiva digestione', 'gastrooesophageal reflux disease': 'Reflusso gastroesofageo',
  'hepatic enzyme increased': 'Enzimi epatici aumentati', 'renal failure': 'Insufficienza renale', 'acute kidney injury': 'Danno renale acuto',
  death: 'Decesso', 'completed suicide': 'Suicidio', 'drug interaction': 'Interazione tra farmaci', overdose: 'Sovradosaggio',
  'anaphylactic reaction': 'Reazione anafilattica', 'hypersensitivity': 'Ipersensibilità', 'loss of consciousness': 'Perdita di coscienza',
  tremor: 'Tremore', 'muscle spasms': 'Spasmi muscolari', 'fall': 'Caduta', 'chest pain': 'Dolore al petto', 'alopecia': 'Perdita di capelli',
  lethargy: 'Letargia', anorexia: 'Inappetenza', 'drooling': 'Scialorrea', ataxia: 'Perdita di coordinazione', seizure: 'Convulsioni',
  'application site erythema': 'Arrossamento nel punto di applicazione', 'application site pruritus': 'Prurito nel punto di applicazione',
  polydipsia: 'Sete eccessiva', 'polyuria': 'Urine abbondanti', 'dehydration': 'Disidratazione', 'blood glucose increased': 'Glicemia aumentata',
};

// Termini che nelle segnalazioni FDA non sono vere reazioni: li escludiamo dalla classifica
const RUMORE = ['drug ineffective', 'off label use', 'product use in unapproved indication', 'product dose omission issue',
  'drug ineffective for unapproved indication', 'product use issue', 'incorrect dose administered', 'no adverse event',
  'therapeutic response decreased', 'treatment failure', 'condition aggravated', 'intentional product use issue', 'product quality issue',
  'wrong technique in product usage process', 'expired product administered', 'drug dose omission', 'inappropriate schedule of product administration'];

const PAROLE_FARMACO = /farmac|principio attivo|integratore|pianta|erba|medicinale|omeopat|veterinari|composto|vitamina|sostanza|analgesic|antinfiammator|antibiotic|ormone|alcaloide|fitoter|rimedio|supplement/i;

const SEZIONI_WIKI = {
  meccanismo: /meccanism|farmacodinam|azione|modalit.. d'azione|farmacologia/i,
  uso: /indicazion|usi|impiego|uso terapeutico|utilizz|applicazion|terapia/i,
  dose: /posologia|dosagg|somministrazion|modalit.. d'uso|dosi/i,
  effetti: /effetti (collaterali|indesiderati|avversi)|reazioni avverse|tossicit|controindicazion|avvertenz|effetti sulla salute/i,
};

/* ---------- Utilità ---------- */

const normalizza = s => (s || '').toLowerCase().trim().replace(/\s+/g, ' ');
const senzaParentesi = s => (s || '').replace(/\s*\([^)]*\)\s*/g, ' ').trim();
const unici = a => [...new Set(a.filter(Boolean))];
const pct = n => n.toLocaleString('it-IT', { maximumFractionDigits: n < 10 ? 1 : 0 }) + '%';

async function getJSON(url, ms = 12000) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), ms);
  try {
    const r = await fetch(url, { signal: ctrl.signal });
    if (!r.ok) { const e = new Error('HTTP ' + r.status); e.status = r.status; throw e; }
    return await r.json();
  } finally { clearTimeout(t); }
}

function pulisciTesto(t) {
  return (t || '').replace(/\s+/g, ' ')
    .replace(/^(\d+(\.\d+)*\s+)?[A-Z &,/-]{6,}\s+(?=[A-Z0-9])/, '')   // titolo di sezione in maiuscolo
    .replace(/\s+([.,;:])/g, '$1').trim();
}

function frasiConPercentuale(testo, max = 6) {
  const frasi = (testo || '').replace(/\s+/g, ' ').split(/(?<=[.;])\s+(?=[A-Z(])/);
  return frasi.filter(f => /\d+(?:[.,]\d+)?\s?%/.test(f) && f.length < 320).slice(0, max);
}

// Divide il testo semplice di Wikipedia (== Titolo ==) in sezioni
function dividiSezioni(testo) {
  const out = []; let corrente = { titolo: '', corpo: '' };
  for (const riga of (testo || '').split('\n')) {
    const m = riga.match(/^=+\s*(.+?)\s*=+$/);
    if (m) { out.push(corrente); corrente = { titolo: m[1], corpo: '' }; }
    else corrente.corpo += riga + '\n';
  }
  out.push(corrente);
  return out.map(s => ({ titolo: s.titolo, corpo: s.corpo.trim() }));
}

function trovaSezione(sezioni, regex) {
  const s = sezioni.filter(x => x.titolo && regex.test(x.titolo) && x.corpo.length > 40);
  return s.length ? s.map(x => x.corpo).join('\n\n') : '';
}

function nomiPerFDA(domanda, titoloEn) {
  const q = normalizza(domanda);
  const en = normalizza(senzaParentesi(titoloEn));
  return unici([MARCHI[q], INN_USAN[en], en, INN_USAN[q], q].map(x => x && x.replace(/"/g, '')));
}

const eFDA = (campo, nomi) => nomi.map(n => `${campo}:"${n}"`).join(' ');

/* ---------- Wikipedia ---------- */

function wikiURL(lang, params) {
  return `https://${lang}.wikipedia.org/w/api.php?` + new URLSearchParams({ format: 'json', origin: '*', ...params });
}

const PERSONA = /\b(nata|nato|tennist|calciator|cestist|attrice|attore|cantante|politic[oa]|pilota|ciclista|atleta|nuotator|scrittor|giocator|born)\b|\(\d{4}\)|\b\d{1,2} \w+ \d{4}\b/i;

// Ordina i risultati di Wikipedia: prima il titolo uguale alla ricerca, poi quelli che parlano di farmaci;
// le pagine di persone (es. atleti citati per un caso di doping) vengono scartate.
function ordinaCandidati(q, hits) {
  const nq = normalizza(q);
  return hits.map(h => {
    const t = normalizza(h.titolo), testo = h.snippet + ' ' + h.titolo;
    let punti = 0;
    if (t === nq) punti += 100;
    else if (normalizza(senzaParentesi(h.titolo)) === nq) punti += 90;
    else if (t.includes(nq)) punti += 40;
    if (PAROLE_FARMACO.test(testo)) punti += 10;
    if (PERSONA.test(h.snippet) && punti < 40) punti -= 100;
    return { ...h, punti };
  }).filter(h => h.punti > -50).sort((a, b) => b.punti - a.punti);
}

async function cercaWikipedia(q) {
  for (const lang of ['it', 'en']) {
    const j = await getJSON(wikiURL(lang, { action: 'query', list: 'search', srsearch: q, srlimit: '8', srprop: 'snippet' }));
    const hits = ((j.query && j.query.search) || []).map(h => ({ titolo: h.title, snippet: (h.snippet || '').replace(/<[^>]+>/g, '') }));
    const ordinati = ordinaCandidati(q, hits);
    if (ordinati.length && (ordinati[0].punti >= 10 || lang === 'en')) return { lang, candidati: ordinati };
  }
  return null;
}

async function caricaPagina(lang, titolo) {
  const j = await getJSON(wikiURL(lang, {
    action: 'query', titles: titolo, redirects: '1', prop: 'extracts|langlinks|info', explaintext: '1',
    lllang: 'en', inprop: 'url', exsectionformat: 'wiki',
  }));
  const pagine = Object.values((j.query && j.query.pages) || {});
  const p = pagine[0];
  if (!p || p.missing !== undefined) return null;
  const testo = p.extract || '';
  const sezioni = dividiSezioni(testo);
  return {
    lang, titolo: p.title, url: p.fullurl,
    titoloEn: lang === 'en' ? p.title : ((p.langlinks && p.langlinks[0] && (p.langlinks[0]['*'] || p.langlinks[0].title)) || ''),
    intro: sezioni[0].corpo.split('\n\n')[0] || '',
    sezioni,
  };
}

/* ---------- openFDA ---------- */

const FDA = 'https://api.fda.gov';

async function schedaFDA(nomi) {
  for (const n of nomi) {
    const search = `(${eFDA('openfda.generic_name', [n])} ${eFDA('openfda.brand_name', [n])} ${eFDA('openfda.substance_name', [n])})`;
    try {
      const j = await getJSON(`${FDA}/drug/label.json?search=${encodeURIComponent(search)}&limit=1`);
      if (j.results && j.results[0]) return { etichetta: j.results[0], nome: n };
    } catch (e) { if (e.status !== 404) throw e; }
  }
  return null;
}

async function reazioniFDA(nomi, animale) {
  const base = animale ? `${FDA}/animalandveterinary/event.json` : `${FDA}/drug/event.json`;
  const campoRicerca = animale ? 'drug.active_ingredients.name' : 'patient.drug.openfda.generic_name';
  const campoConto = animale ? 'reaction.veddra_term_name.exact' : 'patient.reaction.reactionmeddrapt.exact';
  for (const n of nomi) {
    const search = encodeURIComponent(`${campoRicerca}:"${n}"`);
    try {
      const [tot, conto, specie] = await Promise.all([
        getJSON(`${base}?search=${search}&limit=1`),
        getJSON(`${base}?search=${search}&count=${campoConto}&limit=40`),
        animale ? getJSON(`${base}?search=${search}&count=animal.species.exact&limit=5`) : Promise.resolve(null),
      ]);
      const totale = tot.meta && tot.meta.results && tot.meta.results.total;
      if (!totale || !conto.results) continue;
      const voci = conto.results
        .filter(r => !RUMORE.includes(normalizza(r.term)))
        .slice(0, 10)
        .map(r => ({ termine: r.term, n: r.count, percentuale: (r.count / totale) * 100 }));
      return { nome: n, totale, voci, specie: specie && specie.results ? specie.results : [] };
    } catch (e) { if (e.status !== 404) throw e; }
  }
  return null;
}

/* ---------- RxNav (farmaci simili) ---------- */

async function farmaciSimili(nomi) {
  const RX = 'https://rxnav.nlm.nih.gov/REST';
  for (const n of nomi) {
    const r = await getJSON(`${RX}/rxcui.json?name=${encodeURIComponent(n)}&search=2`);
    const rxcui = r.idGroup && r.idGroup.rxnormId && r.idGroup.rxnormId[0];
    if (!rxcui) continue;
    const c = await getJSON(`${RX}/rxclass/class/byRxcui.json?rxcui=${rxcui}&relaSource=ATC`);
    const classi = ((c.rxclassDrugInfoList && c.rxclassDrugInfoList.rxclassDrugInfo) || []).map(x => x.rxclassMinConceptItem);
    // livello ATC 4 (5 caratteri): stessa sottoclasse chimico-terapeutica
    const classe = classi.find(x => x.classId.length === 5) || classi.find(x => x.classId.length === 4);
    if (!classe) continue;
    const m = await getJSON(`${RX}/rxclass/classMembers.json?classId=${classe.classId}&relaSource=ATC&ttys=IN`);
    const membri = ((m.drugMemberGroup && m.drugMemberGroup.drugMember) || []).map(x => x.minConcept.name.toLowerCase());
    const simili = unici(membri).filter(x => !nomi.includes(x) && x !== n.toLowerCase());
    return { classe: classe.className, atc: classe.classId, simili: simili.slice(0, 24) };
  }
  return null;
}

/* ---------- PubMed ---------- */

async function studiPubMed(termine) {
  const E = 'https://eutils.ncbi.nlm.nih.gov/entrez/eutils';
  const t = `${termine} AND (randomized controlled trial[pt] OR meta-analysis[pt] OR systematic review[pt])`;
  const s = await getJSON(`${E}/esearch.fcgi?db=pubmed&retmode=json&retmax=5&sort=relevance&term=${encodeURIComponent(t)}`);
  const ids = (s.esearchresult && s.esearchresult.idlist) || [];
  if (!ids.length) return null;
  const d = await getJSON(`${E}/esummary.fcgi?db=pubmed&retmode=json&id=${ids.join(',')}`);
  return {
    totale: Number(s.esearchresult.count) || ids.length,
    articoli: ids.map(id => d.result[id]).filter(Boolean).map(a => ({
      id: a.uid, titolo: a.title, rivista: a.source, anno: (a.pubdate || '').slice(0, 4),
    })),
  };
}

/* ---------- Estrazione dalla scheda FDA ---------- */

const campo = (e, nome) => (e && e[nome] ? pulisciTesto(e[nome].join(' ')) : '');

function estraiScheda(e) {
  if (!e) return null;
  return {
    principi: unici([...(e.openfda && e.openfda.substance_name || []), ...(e.active_ingredient || []).map(a => pulisciTesto(a))]).slice(0, 6),
    marchi: unici((e.openfda && e.openfda.brand_name) || []).slice(0, 8),
    via: unici((e.openfda && e.openfda.route) || []),
    meccanismo: campo(e, 'mechanism_of_action') || campo(e, 'clinical_pharmacology'),
    indicazioni: campo(e, 'indications_and_usage') || campo(e, 'purpose'),
    dose: campo(e, 'dosage_and_administration'),
    studi: (e.clinical_studies || []).join(' '),
    avverse: (e.adverse_reactions || []).join(' '),
  };
}

/* ---------- Interfaccia ---------- */

function crea(tag, attrs, ...figli) {
  const n = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs || {})) {
    if (k === 'class') n.className = v; else if (k === 'text') n.textContent = v; else n.setAttribute(k, v);
  }
  for (const f of figli.flat()) if (f != null) n.append(f.nodeType ? f : document.createTextNode(f));
  return n;
}

function blocco(testo, max = 650) {
  if (!testo) return crea('p', { class: 'vuoto', text: 'Non trovato nelle fonti aperte consultate.' });
  if (testo.length <= max) return crea('p', { text: testo });
  const taglio = testo.lastIndexOf(' ', max);
  return crea('div', {}, crea('p', { text: testo.slice(0, taglio) + '…' }),
    crea('details', {}, crea('summary', { text: 'Leggi tutto' }), crea('p', { text: testo.slice(taglio) })));
}

function scheda(icona, titolo, ...contenuto) {
  return crea('article', { class: 'scheda' }, crea('h2', {}, crea('span', { class: 'ico', text: icona }), titolo), ...contenuto);
}

const origine = t => crea('p', { class: 'origine', text: 'Fonte: ' + t });

function barre(voci, classe = '') {
  return crea('div', { class: 'barre' }, voci.map(v => crea('div', { class: 'barra ' + classe },
    crea('div', { class: 'riga' }, crea('span', { text: v.etichetta }), crea('b', { text: pct(v.percentuale) })),
    crea('div', { class: 'pista' }, crea('div', { class: 'pieno', style: `width:${Math.min(100, Math.max(2, v.percentuale))}%` })))));
}

function collegamenti(q) {
  const e = encodeURIComponent;
  return [
    ['Google', `https://www.google.com/search?q=${e(q + ' farmaco foglietto illustrativo')}`],
    ['Bing', `https://www.bing.com/search?q=${e(q + ' farmaco foglietto illustrativo')}`],
    ['DuckDuckGo', `https://duckduckgo.com/?q=${e(q + ' farmaco foglietto illustrativo')}`],
    ['AIFA (banca dati)', `https://medicinali.aifa.gov.it/it/#/it/risultati?query=${e(q)}`],
    ['EMA', `https://www.ema.europa.eu/en/search?search_api_fulltext=${e(q)}`],
    ['DailyMed (USA)', `https://dailymed.nlm.nih.gov/dailymed/search.cfm?labeltype=all&query=${e(q)}`],
    ['PubMed', `https://pubmed.ncbi.nlm.nih.gov/?term=${e(q)}`],
    ['Wikipedia', `https://it.wikipedia.org/w/index.php?search=${e(q)}`],
  ].map(([n, u]) => crea('a', { href: u, target: '_blank', rel: 'noopener noreferrer', text: n }));
}

function disegna(d) {
  const { q, animale, wiki, sc, reaz, simili, studi, stato, candidati } = d;
  const out = [];

  if (candidati && candidati.length > 1) {
    out.push(crea('div', { class: 'alternative' }, 'Forse cercavi anche:',
      candidati.filter(c => c !== wiki?.titolo).slice(0, 5).map(c => crea('button', { type: 'button', 'data-q': c, text: c }))));
  }

  // 1. Principio attivo
  const nomeTitolo = wiki ? wiki.titolo : q;
  const principi = sc && sc.principi.length ? sc.principi : [];
  out.push(scheda('🧪', 'Principio attivo',
    crea('p', { class: 'titolo', text: wiki ? wiki.titolo : (principi[0] ? principi[0].toLowerCase().replace(/^./, c => c.toUpperCase()) : nomeTitolo) }),
    principi.length ? crea('p', { class: 'sotto', text: 'Nome nelle schede USA: ' + principi.join(', ').toLowerCase() }) : null,
    sc && sc.marchi.length ? crea('div', { class: 'etichette' }, sc.marchi.map(m => crea('span', { class: 'etichetta', text: m }))) : null,
    wiki ? blocco(wiki.intro, 420) : crea('p', { class: 'vuoto', text: 'Nessuna descrizione trovata.' }),
    origine([wiki && 'Wikipedia', sc && 'FDA (schede USA)'].filter(Boolean).join(' · ') || '—')));

  // 2. Meccanismo d'azione
  const mecc = wiki ? trovaSezione(wiki.sezioni, SEZIONI_WIKI.meccanismo) : '';
  out.push(scheda('⚙️', 'Meccanismo d\'azione', blocco(mecc || (sc && sc.meccanismo)),
    origine(mecc ? 'Wikipedia (italiano)' : 'FDA – testo originale in inglese')));

  // 3. Modo d'uso
  const dose = (wiki && trovaSezione(wiki.sezioni, SEZIONI_WIKI.dose)) || (sc && sc.dose);
  out.push(scheda('💊', 'Modo d\'uso', blocco(dose),
    sc && sc.via.length ? crea('p', { class: 'sotto', text: 'Via di somministrazione: ' + sc.via.join(', ').toLowerCase() }) : null,
    crea('p', { class: 'nota', text: 'La dose giusta dipende da età, peso e condizioni: segui sempre il foglietto illustrativo e il parere di medico, farmacista o veterinario.' })));

  // 4. A cosa serve + percentuali di efficacia
  const uso = (wiki && trovaSezione(wiki.sezioni, SEZIONI_WIKI.uso)) || (sc && sc.indicazioni);
  const frasiEff = frasiConPercentuale(sc ? sc.studi : '');
  out.push(scheda('🎯', 'A cosa serve e percentuali di efficacia', blocco(uso),
    frasiEff.length
      ? crea('div', {}, crea('p', { class: 'sotto', text: 'Dati dagli studi clinici riportati nella scheda ufficiale (inglese):' }),
        crea('ul', { class: 'pulito' }, frasiEff.map(f => crea('li', { text: f }))))
      : crea('p', { class: 'nota', text: 'Una percentuale di efficacia affidabile non è disponibile come dato aperto: dipende da malattia, dose e popolazione. Qui sotto trovi gli studi principali, dove leggerla con il contesto giusto.' }),
    studi ? crea('div', {}, crea('p', { class: 'sotto', text: `Studi sperimentali e revisioni su PubMed: ${studi.totale.toLocaleString('it-IT')}. I più rilevanti:` }),
      crea('ul', { class: 'pulito' }, studi.articoli.map(a => crea('li', {},
        crea('a', { href: `https://pubmed.ncbi.nlm.nih.gov/${a.id}/`, target: '_blank', rel: 'noopener noreferrer', text: a.titolo }), ` (${a.rivista}, ${a.anno})`)))) : null));

  // 5. Effetti collaterali
  const effTesto = wiki ? trovaSezione(wiki.sezioni, SEZIONI_WIKI.effetti) : '';
  const eff = [blocco(effTesto, 500)];
  if (reaz && reaz.voci.length) {
    eff.push(crea('p', { class: 'sotto', text: `Reazioni più segnalate, in % sul totale di ${reaz.totale.toLocaleString('it-IT')} segnalazioni ${animale ? 'veterinarie' : ''} all'FDA:` }));
    eff.push(barre(reaz.voci.map(v => ({ etichetta: REAZIONI[normalizza(v.termine)] || v.termine, percentuale: v.percentuale }))));
    eff.push(crea('p', { class: 'nota', text: 'Attenzione: sono percentuali di segnalazione, non la probabilità reale di avere il disturbo. Chi riferisce un problema è più spesso chi lo ha avuto.' }));
    if (animale && reaz.specie.length) eff.push(crea('p', { class: 'sotto', text: 'Specie più coinvolte: ' + reaz.specie.map(s => s.term.toLowerCase()).join(', ') }));
  } else {
    eff.push(crea('p', { class: 'vuoto', text: 'Nessuna statistica di segnalazione trovata per questo prodotto.' }));
  }
  const frasiAvv = frasiConPercentuale(sc ? sc.avverse : '', 5);
  if (frasiAvv.length) eff.push(crea('details', {}, crea('summary', { text: 'Percentuali dagli studi clinici (scheda FDA, inglese)' }),
    crea('ul', { class: 'pulito' }, frasiAvv.map(f => crea('li', { text: f })))));
  eff.push(origine('openFDA (segnalazioni) · Wikipedia'));
  out.push(scheda('⚠️', 'Effetti collaterali', ...eff));

  // 6. Farmaci simili
  out.push(scheda('🔁', 'Farmaci simili',
    simili && simili.simili.length
      ? crea('div', {}, crea('p', { class: 'sotto', text: `Stessa classe terapeutica (ATC ${simili.atc}: ${simili.classe.toLowerCase()}):` }),
        crea('div', { class: 'etichette' }, simili.simili.map(s => crea('button', { type: 'button', class: 'etichetta', 'data-q': s, style: 'border:0;font:inherit;cursor:pointer', text: s }))))
      : crea('p', { class: 'vuoto', text: 'Nessun farmaco simile trovato (RxNav copre i medicinali; per erbe e integratori non c\'è una classificazione).' }),
    origine('RxNav / classificazione ATC')));

  // Motori di ricerca e fonti
  out.push(scheda('🔎', 'Approfondisci sui motori di ricerca', crea('div', { class: 'motori' }, collegamenti(q))));
  out.push(crea('ul', { class: 'fonti' }, stato.map(s => crea('li', { text: (s.ok ? '✓ ' : '✗ ') + s.nome }))));
  return out;
}

/* ---------- Regia ---------- */

async function cerca(q, animale) {
  const contesto = { q, animale, stato: [] };
  const prova = async (nome, fn) => {
    try { const r = await fn(); contesto.stato.push({ nome, ok: true }); return r; }
    catch (e) { contesto.stato.push({ nome: `${nome} (non raggiungibile)`, ok: false }); return null; }
  };

  const ric = await prova('Wikipedia', () => cercaWikipedia(q));
  let wiki = null;
  if (ric && ric.candidati.length) {
    wiki = await prova('Wikipedia (pagina)', () => caricaPagina(ric.lang, ric.candidati[0].titolo));
    contesto.candidati = ric.candidati.map(c => c.titolo);
  }
  const nomi = nomiPerFDA(q, wiki ? wiki.titoloEn : '');

  const [ficha, reaz, simili] = await Promise.all([
    animale ? Promise.resolve(null) : prova('openFDA – schede', () => schedaFDA(nomi)),
    prova(animale ? 'openFDA – veterinaria' : 'openFDA – segnalazioni', () => reazioniFDA(nomi, animale)),
    animale ? Promise.resolve(null) : prova('RxNav', () => farmaciSimili(nomi)),
  ]);
  const studi = await prova('PubMed', () => studiPubMed(nomi[0] || q));

  Object.assign(contesto, { wiki, sc: ficha ? estraiScheda(ficha.etichetta) : null, reaz, simili, studi });
  return contesto;
}

if (typeof document !== 'undefined') {
  const modulo = document.getElementById('modulo');
  const campoQ = document.getElementById('q');
  const stato = document.getElementById('stato');
  const risultati = document.getElementById('risultati');
  let ultimaRicerca = 0;

  async function avvia(q, aggiornaUrl = true) {
    q = q.trim();
    if (!q) return;
    campoQ.value = q;
    const animale = modulo.chi.value === 'animale';
    const id = ++ultimaRicerca;
    risultati.hidden = true; risultati.replaceChildren();
    stato.replaceChildren(crea('span', { class: 'ruota' }), `Cerco «${q}» nelle fonti…`);
    if (aggiornaUrl) history.replaceState(null, '', '?q=' + encodeURIComponent(q) + (animale ? '&chi=animale' : ''));
    const d = await cerca(q, animale);
    if (id !== ultimaRicerca) return;
    if (!d.wiki && !d.sc && !d.reaz) {
      stato.replaceChildren(crea('p', {}, `Nessun risultato per «${q}». Controlla l'ortografia o prova con il principio attivo.`),
        crea('div', { class: 'motori', style: 'justify-content:center' }, collegamenti(q)));
      return;
    }
    stato.replaceChildren();
    risultati.replaceChildren(...disegna(d));
    risultati.hidden = false;
    risultati.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  modulo.addEventListener('submit', e => { e.preventDefault(); avvia(campoQ.value); });
  document.addEventListener('click', e => {
    const b = e.target.closest('button[data-q]');
    if (b) avvia(b.dataset.q);
  });
  modulo.addEventListener('change', () => { if (campoQ.value.trim()) avvia(campoQ.value); });

  const p = new URLSearchParams(location.search);
  if (p.get('chi') === 'animale') modulo.chi.value = 'animale';
  if (p.get('q')) avvia(p.get('q'), false);
}

if (typeof module !== 'undefined') {
  module.exports = { ordinaCandidati, dividiSezioni, trovaSezione, frasiConPercentuale, nomiPerFDA, estraiScheda, pulisciTesto, SEZIONI_WIKI, cerca };
}
