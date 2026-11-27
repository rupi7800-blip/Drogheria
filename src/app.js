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
  meccanismo: /meccanism|farmacodinam|azione|modalit.. d'azione|farmacologia|mechanism|pharmacodynamics|pharmacology/i,
  uso: /indicazion|usi|impiego|uso terapeutico|utilizz|applicazion|terapia|medical uses|^uses|indications|therapeutic use/i,
  dose: /posologia|dosagg|somministrazion|modalit.. d'uso|dosi|dosage|administration|dosing/i,
  effetti: /effetti (collaterali|indesiderati|avversi)|reazioni avverse|tossicit|controindicazion|avvertenz|effetti sulla salute|side effects|adverse effects|adverse reactions|contraindications|toxicity/i,
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

function frasiUtili(testo, max = 4) {
  return (testo || '').replace(/\s+/g, ' ').split(/(?<=[.;])\s+(?=[A-Z(])/).filter(f => f.length > 30 && f.length < 260).slice(0, max);
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

const PERSONA = /\b(tennist[ae]|calciator[ei]|cestist[ae]|attrice|attore (cinematografico|teatrale|statunitense|italiano)|cantante|pilota|ciclista|atleta|nuotator[ei]|scrittor[ei]|giocator[ei]|nat[oa] (a|il|nel|in) )|\([^)]*\b\d{1,2} \w+ \d{4}[^)]*\)/i;

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
    if (PERSONA.test(h.snippet) && punti < 90) punti -= 100;
    return { ...h, punti };
  }).filter(h => h.punti > -50).sort((a, b) => b.punti - a.punti);
}

async function cercaWikipedia(q) {
  let riserva = null, errore = null;
  for (const lang of ['it', 'en']) {
    try {
      const j = await getJSON(wikiURL(lang, { action: 'query', list: 'search', srsearch: q, srlimit: '8', srprop: 'snippet' }));
      const hits = ((j.query && j.query.search) || []).map(h => ({ titolo: h.title, snippet: (h.snippet || '').replace(/<[^>]+>/g, '') }));
      const ordinati = ordinaCandidati(q, hits);   // già senza pagine di persone
      if (ordinati.length && ordinati[0].punti >= 10) return { lang, candidati: ordinati };
      // nessun segnale chiaro: tengo come riserva solo risultati già filtrati
      if (!riserva && ordinati.length) riserva = { lang, candidati: ordinati };
    } catch (e) { errore = errore || e; }
  }
  if (!riserva && errore) throw errore;   // nessuna lingua ha risposto: la fonte risulta non raggiungibile
  return riserva;
}

async function caricaPagina(lang, titolo) {
  const j = await getJSON(wikiURL(lang, {
    action: 'query', titles: titolo, redirects: '1', prop: 'extracts|langlinks|info', explaintext: '1',
    lllang: lang === 'it' ? 'en' : 'it', inprop: 'url', exsectionformat: 'wiki',
  }));
  const pagine = Object.values((j.query && j.query.pages) || {});
  const p = pagine[0];
  if (!p || p.missing !== undefined) return null;
  const testo = p.extract || '';
  const sezioni = dividiSezioni(testo);
  const altro = (p.langlinks && p.langlinks[0] && (p.langlinks[0]['*'] || p.langlinks[0].title)) || '';
  return {
    lang, titolo: lang === 'en' ? (altro || italianizza(p.title.toLowerCase())) : p.title, url: p.fullurl,
    titoloEn: lang === 'en' ? p.title : altro,
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
   try {
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
   } catch (e) { if (e.status !== 404) throw e; }
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
    articoli: ids.map(id => d.result[id]).filter(a => a && a.title).map(a => ({
      id: a.uid, titolo: a.title, rivista: a.source, anno: (a.pubdate || '').slice(0, 4),
    })),
  };
}

/* ---------- Cosa abbinare per ridurre gli effetti collaterali ---------- */

// Abbinamenti e accorgimenti consolidati, per classe di principio attivo (informazione generale, non prescrizione).
// evidenza: alta = linee guida / revisioni solide; moderata = studi concordi ma non definitivi; limitata = dati incerti.
const ABBINAMENTI = [
  { gruppo: 'Antinfiammatori (FANS)', cerca: /ibuprofen|naproxen|diclofenac|ketoprofen|aspirin(?!-free)|acetylsalicylic|celecoxib|indomethacin|ketorolac|nimesulide|etoricoxib|flurbiprofen/,
    consigli: [
      ['Prenderli a stomaco pieno, durante o dopo i pasti, con un bicchiere d\'acqua.', 'alta'],
      ['Se l\'uso è prolungato o c\'è rischio per lo stomaco (età avanzata, ulcera, cortisonici, anticoagulanti): il medico può associare un protettore gastrico (inibitore di pompa come omeprazolo o pantoprazolo).', 'alta'],
      ['Bere a sufficienza aiuta a proteggere i reni. Con disidratazione (vomito, diarrea, febbre alta) o problemi ai reni, chiedere al medico prima di prenderli.', 'moderata'],
      ['Non associarli ad altri antinfiammatori e limitare l\'alcol. L\'aspirina a basso dosaggio prescritta per il cuore non va sospesa senza il medico, che valuterà come associare altri farmaci.', 'alta'],
    ] },
  { gruppo: 'Paracetamolo', cerca: /acetaminophen|paracetamol/,
    consigli: [
      ['Rispettare la dose massima giornaliera del foglietto: il rischio principale è per il fegato.', 'alta'],
      ['Controllare che altri prodotti (influenzali, antidolorifici) non contengano già paracetamolo.', 'alta'],
      ['Evitare l\'alcol durante la terapia.', 'alta'],
      ['In caso di sovradosaggio, anche senza sintomi, chiamare subito il 112 o un centro antiveleni: esiste un antidoto (N-acetilcisteina), ma lo somministra solo il personale sanitario.', 'alta'],
    ] },
  { gruppo: 'Antibiotici', cerca: /amoxicillin|clavulan|azithromycin|clarithromycin|ciprofloxacin|levofloxacin|doxycycline|cefuroxime|cefixime|ceftriaxone|cefalexin|cephalexin|metronidazole|penicillin/,
    consigli: [
      ['Alcuni probiotici (come Saccharomyces boulardii e certi lattobacilli) riducono il rischio di diarrea da antibiotici.', 'moderata'],
      ['L\'amoxicillina con acido clavulanico si tollera meglio a inizio pasto, contro la nausea.', 'moderata'],
      ['Doxiciclina: molta acqua, non sdraiarsi subito dopo, e distanza di circa 2 ore da latticini, calcio, ferro e antiacidi.', 'alta'],
      ['Finire il ciclo come prescritto, anche se si sta meglio.', 'alta'],
    ] },
  { gruppo: 'Metronidazolo', cerca: /metronidazole|tinidazole/,
    consigli: [
      ['Evitare l\'alcol durante la cura e per almeno 3 giorni dopo la fine (così indica la scheda FDA; alcuni foglietti europei riportano tempi più brevi, ma è meglio il valore prudente): può causare nausea, vomito e malessere forte.', 'moderata'],
    ] },
  { gruppo: 'Fluorochinoloni (ciprofloxacina, levofloxacina)', cerca: /ciprofloxacin|levofloxacin|moxifloxacin|ofloxacin/,
    consigli: [
      ['Tenere alcune ore di distanza da calcio, ferro, magnesio, zinco e antiacidi: ne riducono l\'assorbimento.', 'alta'],
      ['Dolore o gonfiore a un tendine (soprattutto tallone): smettere di forzare e avvisare subito il medico. Il rischio è maggiore sopra i 60 anni e con i cortisonici.', 'alta'],
    ] },
  { gruppo: 'Metformina', cerca: /metformin/,
    consigli: [
      ['Prenderla durante i pasti e partire da dosi basse aumentando gradualmente: riduce i disturbi di stomaco e intestino.', 'alta'],
      ['Con l\'uso lungo, far controllare periodicamente la vitamina B12.', 'alta'],
    ] },
  { gruppo: 'Statine', cerca: /(?<![a-z])statin(e|s)?\b|simvastatin|atorvastatin|rosuvastatin|pravastatin/,
    consigli: [
      ['Dolori muscolari insoliti vanno riferiti al medico, che può cambiare dose o molecola.', 'alta'],
      ['Succo di pompelmo: evitarlo con la simvastatina e limitarlo con l\'atorvastatina.', 'alta'],
      ['Con claritromicina, eritromicina o alcuni antimicotici (itraconazolo, ketoconazolo) l\'interazione è importante: chiedere al medico se sospendere temporaneamente la statina.', 'alta'],
      ['Il coenzima Q10 è spesso proposto per i dolori muscolari, ma i dati sono contrastanti.', 'limitata'],
    ] },
  { gruppo: 'Inibitori dell\'aromatasi', cerca: /letrozole|anastrozole|exemestane/,
    consigli: [
      ['Calcio e vitamina D secondo i livelli nel sangue o le indicazioni del medico, e controllo periodico della densità ossea (mineralometria, MOC): la terapia può assottigliare le ossa.', 'alta'],
      ['Attività fisica regolare con carico (camminata, esercizi con pesi leggeri) per ossa, muscoli e dolori articolari.', 'alta'],
    ] },
  { gruppo: 'Cortisonici (assunti per bocca o per iniezione, uso sistemico)', cerca: /prednisone|prednisolone|betamethasone|dexamethasone|hydrocortisone|methylprednisolone|deflazacort/,
    consigli: [
      ['Se si prendono per bocca una volta al giorno, di solito al mattino e con il cibo, salvo diversa indicazione del medico (nelle terapie sostitutive la dose può essere divisa nella giornata).', 'alta'],
      ['Se l\'uso sistemico dura settimane: calcio e vitamina D per le ossa, e controllo di glicemia e pressione.', 'alta'],
      ['Con i FANS aumenta il rischio allo stomaco: chiedere al medico se serve un protettore gastrico.', 'alta'],
      ['Non sospenderli di colpo dopo un uso prolungato: va ridotta la dose gradualmente.', 'alta'],
    ] },
  { gruppo: 'Sedativi e sonniferi (benzodiazepine e simili)', cerca: /alprazolam|lorazepam|diazepam|bromazepam|clonazepam|zolpidem/,
    consigli: [
      ['Evitare alcol e altri sedativi: si potenziano a vicenda.', 'alta'],
      ['Usarle per il tempo più breve possibile e non sospenderle di colpo.', 'alta'],
      ['Attenzione alla guida e ai lavori di precisione, soprattutto all\'inizio.', 'alta'],
    ] },
  { gruppo: 'Melatonina', cerca: /melatonin/,
    consigli: [
      ['Dosi basse, 30–60 minuti prima di coricarsi, possono ridurre sonnolenza al mattino e mal di testa.', 'moderata'],
    ] },
];

const FRASE_ACCORGIMENTO = /(take|taken|given|administered?)\s+(with|after|before)\s+(food|meals?|milk|water)|\bto (reduce|minimi[sz]e|prevent|avoid|lessen)\b|\bshould (be taken|not be taken|be administered)|\bmay be (reduced|minimi[sz]ed)|\bcan be (reduced|minimi[sz]ed)/i;

function abbinamenti(nomi, titolo) {
  const chiavi = [...nomi, titolo || ''].map(normalizza).join(' | ');
  return ABBINAMENTI.filter(g => g.cerca.test(chiavi))
    .map(g => ({ gruppo: g.gruppo, consigli: g.consigli.map(([testo, evidenza]) => ({ testo, evidenza })) }));
}

function accorgimentiDaScheda(testo, max = 5) {
  return (testo || '').replace(/\s+/g, ' ').split(/(?<=[.;])\s+(?=[A-Z(])/)
    .filter(f => FRASE_ACCORGIMENTO.test(f) && f.length > 30 && f.length < 300).slice(0, max);
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
    accorgimenti: [e.dosage_and_administration, e.warnings, e.precautions, e.information_for_patients, e.adverse_reactions].map(x => (x || []).join(' ')).join(' '),
    interazioni: (e.drug_interactions || []).join(' '),
  };
}

/* ---------- Traduzione in italiano (tutto ciò che arriva in inglese) ---------- */

const MEMORIA_TR = new Map();
let attiviTR = 0; const codaTR = [];
async function limitaTR(fn) {
  if (attiviTR >= 4) await new Promise(ok => codaTR.push(ok));
  attiviTR++;
  try { return await fn(); } finally { attiviTR--; const n = codaTR.shift(); if (n) n(); }
}

// Spezza il testo in pezzi brevi, a fine frase quando possibile
function spezza(testo, max = 450) {
  const frasi = (testo || '').replace(/\s+/g, ' ').trim().split(/(?<=[.;:])\s+/);
  const pezzi = []; let cur = '';
  for (const f of frasi) {
    if (cur && (cur + ' ' + f).length > max) { pezzi.push(cur); cur = f; } else cur = cur ? cur + ' ' + f : f;
  }
  if (cur) pezzi.push(cur);
  return pezzi.flatMap(c => c.length > max ? c.match(new RegExp('.{1,' + max + '}', 'g')) : [c]);
}

const attesa = (pr, ms) => Promise.race([pr, new Promise((_, no) => setTimeout(() => no(new Error('tempo scaduto')), ms))]);
let traduttoreLocale = null;
let localeKO = false;
async function traduciLocale(pezzo) {            // traduttore del browser (Chrome), sul dispositivo
  if (typeof Translator === 'undefined' || localeKO) throw new Error('assente');
  if (!traduttoreLocale) {
    const o = { sourceLanguage: 'en', targetLanguage: 'it' };
    if ((await attesa(Translator.availability(o), 1500)) !== 'available') throw new Error('non pronto');
    traduttoreLocale = await attesa(Translator.create(o), 3000);
  }
  // (se un passaggio sopra fallisce, l'eccezione esce e il motore viene escluso qui sotto)
  return attesa(traduttoreLocale.translate(pezzo), 8000);
}
async function traduciGoogle(pezzo) {
  const j = await getJSON('https://translate.googleapis.com/translate_a/single?client=gtx&sl=en&tl=it&dt=t&q=' + encodeURIComponent(pezzo));
  const t = (j[0] || []).map(x => x[0]).join('');
  if (!t) throw new Error('vuoto');
  return t;
}
async function traduciMyMemory(pezzo) {
  const j = await getJSON('https://api.mymemory.translated.net/get?langpair=en|it&q=' + encodeURIComponent(pezzo));
  const t = j.responseData && j.responseData.translatedText;
  if (!t || /MYMEMORY WARNING|QUERY LENGTH LIMIT/i.test(t) || Number(j.responseStatus) !== 200) throw new Error('quota');
  return t;
}

// Traduce dall'inglese all'italiano; prova i motori in ordine e ricorda i risultati
async function traduci(testo) {
  testo = (testo || '').replace(/\s+/g, ' ').trim();
  if (!testo) return '';
  if (MEMORIA_TR.has(testo)) return MEMORIA_TR.get(testo);
  const pezzi = spezza(testo);
  let esito = null;
  for (const motore of [traduciLocale, traduciGoogle, traduciMyMemory]) {
    try { esito = (await Promise.all(pezzi.map(x => limitaTR(() => motore(x))))).join(' '); break; } catch (e) { if (motore === traduciLocale) localeKO = true; /* provo il prossimo */ }
  }
  if (!esito) throw new Error('traduzione non disponibile');
  MEMORIA_TR.set(testo, esito);
  return esito;
}

// Ripiego per i nomi inglesi senza pagina italiana: desinenze tipiche delle denominazioni comuni
function italianizza(n) {
  return n.replace(/ph/g, 'f').replace(/ine$/, 'ina').replace(/ole$/, 'olo').replace(/ol$/, 'olo');
}

// Nomi inglesi di principi attivi -> nome italiano, tramite i collegamenti tra le lingue di Wikipedia
async function nomiItaliani(lista) {
  if (!lista.length) return lista;
  const cap = n => { n = n.toLowerCase(); return n.charAt(0).toUpperCase() + n.slice(1); };
  const j = await getJSON(wikiURL('en', { action: 'query', titles: lista.map(cap).join('|'), redirects: '1', prop: 'langlinks', lllang: 'it', lllimit: '500' }));
  const q = j.query || {}, norm = {}, red = {}, it = {};
  (q.normalized || []).forEach(x => { norm[x.from] = x.to; });
  (q.redirects || []).forEach(x => { red[x.from] = x.to; });
  Object.values(q.pages || {}).forEach(pg => { if (pg.langlinks && pg.langlinks[0]) it[pg.title] = pg.langlinks[0]['*'] || pg.langlinks[0].title; });
  return lista.map(n => { let t = cap(n); t = norm[t] || t; t = red[t] || t; return (it[t] || italianizza(n.toLowerCase())).toLowerCase(); });
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

// Riga «Fonte»: accetta testi semplici o collegamenti {t, u}; ignora i valori vuoti
function origine(...parti) {
  const voci = parti.filter(Boolean).map(x => typeof x === 'string' ? x
    : /^https:\/\//.test(x.u) ? crea('a', { href: x.u, target: '_blank', rel: 'noopener noreferrer', text: x.t }) : x.t);
  const pezzi = voci.flatMap((x, i) => i ? [' · ', x] : [x]);
  return crea('p', { class: 'origine' }, 'Fonte: ', pezzi.length ? pezzi : '—');
}

// Testi inglesi: nascono con un segnaposto e vengono sostituiti dalla traduzione italiana (vedi traduciPagina)
function riga(testoEn) {
  if (!testoEn) return crea('span', {});
  const n = crea('span', { class: 'da-tradurre', text: '…' });
  n.dataset.orig = testoEn;
  return n;
}
function bloccoEn(testoEn, max = 650) {
  if (!testoEn) return blocco('', max);
  const d = crea('div', { class: 'da-tradurre-blocco' }, crea('p', { class: 'vuoto', text: 'Traduzione in corso…' }));
  d.dataset.orig = testoEn.length > 2400 ? testoEn.slice(0, testoEn.lastIndexOf(' ', 2400)) + '…' : testoEn;
  d.dataset.max = String(max);
  return d;
}
const testoBlocco = (testo, inglese, max) => inglese ? bloccoEn(testo, max) : blocco(testo, max);

async function traduciPagina(radice) {
  await Promise.all([...radice.querySelectorAll('.da-tradurre, .da-tradurre-blocco')].map(async n => {
    const blocchi = n.classList.contains('da-tradurre-blocco');
    try {
      const t = await traduci(n.dataset.orig);
      if (blocchi) { n.replaceChildren(blocco(t, Number(n.dataset.max))); n.classList.remove('da-tradurre-blocco'); }
      else { n.textContent = t; n.classList.remove('da-tradurre'); }
    } catch (e) {
      const nota = 'traduttore non raggiungibile: testo originale in inglese';
      if (blocchi) { n.replaceChildren(blocco(n.dataset.orig, Number(n.dataset.max)), crea('p', { class: 'nota', text: 'Attenzione, ' + nota + '.' })); n.classList.remove('da-tradurre-blocco'); }
      else n.textContent = n.dataset.orig + ' (' + nota + ')';
    }
  }));
}

function barre(voci, classe = '') {
  return crea('div', { class: 'barre' }, voci.map(v => crea('div', { class: 'barra ' + classe },
    crea('div', { class: 'riga' }, crea('span', {}, v.etichetta), crea('b', { text: pct(v.percentuale) })),
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
  const { q, animale, wiki, sc, reaz, simili, studi, stato, candidati, nomi } = d;
  const out = [];

  // Collegamenti alle fonti realmente usate
  const e = encodeURIComponent;
  const nome = (d.nomeFDA || (nomi && nomi[0]) || q).replace(/"/g, '');
  const inEn = !!wiki && wiki.lang === 'en';
  const L = {
    wiki: wiki && wiki.url ? { t: inEn ? 'Wikipedia (tradotto dall\'inglese)' : 'Wikipedia (italiano)', u: wiki.url } : null,
    fda: { t: 'FDA – DailyMed, scheda ufficiale (tradotta automaticamente dall\'inglese)', u: `https://dailymed.nlm.nih.gov/dailymed/search.cfm?labeltype=all&query=${e(nome)}` },
    segn: { t: animale ? 'openFDA – segnalazioni veterinarie (dati)' : 'openFDA – segnalazioni di reazioni (dati)',
      u: animale ? `https://api.fda.gov/animalandveterinary/event.json?search=drug.active_ingredients.name:%22${e(nome)}%22&count=reaction.veddra_term_name.exact&limit=20`
        : `https://api.fda.gov/drug/event.json?search=patient.drug.openfda.generic_name:%22${e(nome)}%22&count=patient.reaction.reactionmeddrapt.exact&limit=20` },
    pubmed: { t: 'PubMed (titoli tradotti)', u: `https://pubmed.ncbi.nlm.nih.gov/?term=${e(nome)}` },
    revisioni: { t: 'PubMed – revisioni sugli effetti indesiderati', u: `https://pubmed.ncbi.nlm.nih.gov/?term=${e(nome + ' adverse effects management review')}` },
    rx: { t: 'RxNav (NIH)', u: `https://mor.nlm.nih.gov/RxNav/search?searchBy=String&searchTerm=${e(nome)}` },
    atc: simili && simili.atc ? { t: 'Classificazione ATC (OMS)', u: `https://atcddd.fhi.no/atc_ddd_index/?code=${e(simili.atc)}` } : null,
  };

  if (candidati && candidati.length > 1) {
    out.push(crea('div', { class: 'alternative' }, 'Forse cercavi anche:',
      candidati.filter(c => c !== wiki?.titolo).slice(0, 5).map(c => crea('button', { type: 'button', 'data-q': c, text: c }))));
  }

  // 1. Principio attivo
  const nomeTitolo = wiki ? wiki.titolo : q;
  const principi = sc && sc.principi.length ? sc.principi : [];
  out.push(scheda('🧪', 'Principio attivo',
    crea('p', { class: 'titolo', text: wiki ? wiki.titolo : (principi[0] ? principi[0].replace(/^./, c => c.toUpperCase()) : nomeTitolo) }),
    principi.length ? crea('p', { class: 'sotto', text: (principi.length > 1 ? 'Principi attivi: ' : 'Principio attivo: ') + principi.join(', ') }) : null,
    sc && sc.marchi.length ? crea('div', { class: 'etichette' }, sc.marchi.map(m => crea('span', { class: 'etichetta', text: m }))) : null,
    wiki ? testoBlocco(wiki.intro, wiki.lang === 'en', 420) : crea('p', { class: 'vuoto', text: 'Nessuna descrizione trovata.' }),
    origine(L.wiki, sc && L.fda)));

  // 2. Meccanismo d'azione
  const wen = !!wiki && wiki.lang === 'en';
  const mecc = wiki ? trovaSezione(wiki.sezioni, SEZIONI_WIKI.meccanismo) : '';
  out.push(scheda('⚙️', 'Meccanismo d\'azione', testoBlocco(mecc || (sc && sc.meccanismo), mecc ? wen : true, 650),
    origine(mecc ? L.wiki : (sc && L.fda))));

  // 3. Modo d'uso
  const doseWiki = wiki ? trovaSezione(wiki.sezioni, SEZIONI_WIKI.dose) : '';
  const dose = doseWiki || (sc && sc.dose);
  out.push(scheda('💊', 'Modo d\'uso', testoBlocco(dose, doseWiki ? wen : true, 650),
    sc && sc.via.length ? crea('p', { class: 'sotto' }, 'Via di somministrazione: ', riga(sc.via.join(', ').toLowerCase())) : null,
    crea('p', { class: 'nota', text: 'La dose giusta dipende da età, peso e condizioni: segui sempre il foglietto illustrativo e il parere di medico, farmacista o veterinario. Unità di misura, intervalli e divieti vanno sempre controllati sul foglietto: una traduzione automatica può sbagliare.' }),
    origine(doseWiki ? L.wiki : (sc && L.fda))));

  // 4. A cosa serve + percentuali di efficacia
  const usoWiki = wiki ? trovaSezione(wiki.sezioni, SEZIONI_WIKI.uso) : '';
  const uso = usoWiki || (sc && sc.indicazioni);
  const frasiEff = frasiConPercentuale(sc ? sc.studi : '');
  out.push(scheda('🎯', 'A cosa serve e percentuali di efficacia', testoBlocco(uso, usoWiki ? wen : true, 650),
    frasiEff.length
      ? crea('div', {}, crea('p', { class: 'sotto', text: 'Dati dagli studi clinici riportati nella scheda ufficiale (tradotti automaticamente dall\'inglese):' }),
        crea('ul', { class: 'pulito' }, frasiEff.map(f => crea('li', {}, riga(f)))))
      : crea('p', { class: 'nota', text: 'Una percentuale di efficacia affidabile non è disponibile come dato aperto: dipende da malattia, dose e popolazione. Qui sotto trovi gli studi principali, dove leggerla con il contesto giusto.' }),
    studi ? crea('div', {}, crea('p', { class: 'sotto', text: `Studi sperimentali e revisioni su PubMed: ${studi.totale.toLocaleString('it-IT')}. I più rilevanti:` }),
      crea('ul', { class: 'pulito' }, studi.articoli.map(a => crea('li', {},
        crea('a', { href: /^\d+$/.test(a.id) ? `https://pubmed.ncbi.nlm.nih.gov/${a.id}/` : `https://pubmed.ncbi.nlm.nih.gov/?term=${encodeURIComponent(a.titolo)}`, target: '_blank', rel: 'noopener noreferrer' }, riga(a.titolo)), ` (${a.rivista}, ${a.anno})`)))) : null,
    origine(usoWiki ? L.wiki : (sc && L.fda), studi && L.pubmed)));

  // 5. Effetti collaterali
  const effTesto = wiki ? trovaSezione(wiki.sezioni, SEZIONI_WIKI.effetti) : '';
  const eff = [testoBlocco(effTesto, wen, 500)];
  if (reaz && reaz.voci.length) {
    eff.push(crea('p', { class: 'sotto', text: `Reazioni più segnalate, in % sul totale di ${reaz.totale.toLocaleString('it-IT')} segnalazioni ${animale ? 'veterinarie' : ''} all'FDA:` }));
    eff.push(barre(reaz.voci.map(v => ({ etichetta: REAZIONI[normalizza(v.termine)] || riga(v.termine.toLowerCase()), percentuale: v.percentuale }))));
    eff.push(crea('p', { class: 'nota', text: 'Attenzione: sono percentuali di segnalazione, non la probabilità reale di avere il disturbo. Chi riferisce un problema è più spesso chi lo ha avuto.' }));
    if (animale && reaz.specie.length) eff.push(crea('p', { class: 'sotto' }, 'Specie più coinvolte: ', riga(reaz.specie.map(s => s.term.toLowerCase()).join(', '))));
  } else {
    eff.push(crea('p', { class: 'vuoto', text: 'Nessuna statistica di segnalazione trovata per questo prodotto.' }));
  }
  const frasiAvv = frasiConPercentuale(sc ? sc.avverse : '', 5);
  if (frasiAvv.length) eff.push(crea('details', {}, crea('summary', { text: 'Percentuali dagli studi clinici (scheda FDA, tradotta)' }),
    crea('ul', { class: 'pulito' }, frasiAvv.map(f => crea('li', {}, riga(f))))));
  eff.push(origine(reaz && L.segn, effTesto && L.wiki, frasiAvv.length && L.fda));
  out.push(scheda('⚠️', 'Effetti collaterali', ...eff));

  // 5b. Cosa abbinare per ridurre gli effetti collaterali
  const gruppi = animale ? [] : abbinamenti(nomi || [], wiki ? wiki.titolo + ' ' + wiki.titoloEn : '');
  const accorg = accorgimentiDaScheda(sc ? sc.accorgimenti : '');
  const interaz = frasiUtili(sc ? sc.interazioni : '', 4);
  const corpo = [];
  const livello = { alta: 'evidenza alta', moderata: 'evidenza moderata', limitata: 'evidenza limitata' };
  for (const g of gruppi) {
    corpo.push(crea('p', { class: 'sotto', text: g.gruppo + ':' }),
      crea('ul', { class: 'pulito' }, g.consigli.map(c => crea('li', {}, c.testo + ' ', crea('span', { class: 'evid ' + c.evidenza, text: '(' + livello[c.evidenza] + ')' })))));
  }
  if (accorg.length) corpo.push(crea('details', {}, crea('summary', { text: 'Accorgimenti dalla scheda ufficiale (FDA, tradotti)' }),
    crea('ul', { class: 'pulito' }, accorg.map(f => crea('li', {}, riga(f))))));
  if (interaz.length) corpo.push(crea('details', {}, crea('summary', { text: 'Da evitare o usare con cautela insieme (FDA, tradotto)' }),
    crea('ul', { class: 'pulito' }, interaz.map(f => crea('li', {}, riga(f))))));
  if (!corpo.length) corpo.push(crea('p', { class: 'vuoto', text: animale
    ? 'Per gli animali non propongo abbinamenti: dosi e prodotti per le persone possono essere pericolosi per cani, gatti e altre specie.'
    : 'Non ho trovato abbinamenti documentati per questo prodotto nelle fonti consultate.' }));
  out.push(scheda('🛡️', 'Cosa abbinare per ridurre gli effetti collaterali', ...corpo,
    crea('p', { class: 'nota', text: 'Informazione generale, non una prescrizione. Nessun effetto collaterale si "annulla" con certezza: non aggiungere né sospendere farmaci o integratori senza il parere di medico, farmacista o veterinario, perché anche gli abbinamenti possono interagire. Se compaiono sintomi forti (difficoltà a respirare, gonfiore di viso o gola, sangue nelle feci, ittero), cerca subito assistenza medica.' }),
    origine(gruppi.length && 'base curata dall\'app per classi di farmaci (non tratta da una singola fonte)', gruppi.length && L.revisioni, (accorg.length || interaz.length) && L.fda)));

  // 6. Farmaci simili
  out.push(scheda('🔁', 'Farmaci simili',
    simili && simili.simili.length
      ? crea('div', {}, crea('p', { class: 'sotto' }, `Stessa classe terapeutica (ATC ${simili.atc}: `, riga(simili.classe.toLowerCase()), '):'),
        crea('div', { class: 'etichette' }, simili.simili.map(s => crea('button', { type: 'button', class: 'etichetta', 'data-q': s, style: 'border:0;font:inherit;cursor:pointer', text: s }))))
      : crea('p', { class: 'vuoto', text: 'Nessun farmaco simile trovato (RxNav copre i medicinali; per erbe e integratori non c\'è una classificazione).' }),
    origine(simili && L.rx, L.atc)));

  // Motori di ricerca e fonti
  out.push(scheda('🔎', 'Approfondisci sui motori di ricerca', crea('div', { class: 'motori' }, collegamenti(q))));
  out.push(crea('p', { class: 'origine', text: 'I testi provenienti da fonti in inglese sono tradotti automaticamente in italiano e possono contenere imprecisioni: per le decisioni sulla cura fa fede il foglietto illustrativo. Se il browser non traduce da sé, questi testi delle fonti (non ciò che hai cercato) vengono inviati a Google Traduttore o a MyMemory; possono però rivelare l\'argomento, perché contengono il nome del farmaco.' }));
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
    const titoli = ric.candidati.map(c => c.titolo);
    contesto.candidati = ric.lang === 'en' ? ((await prova('Wikipedia (nomi italiani)', () => nomiItaliani(titoli))) || titoli) : titoli;
  }
  const nomi = nomiPerFDA(q, wiki ? wiki.titoloEn : '');

  const [ficha, reaz, simili] = await Promise.all([
    animale ? Promise.resolve(null) : prova('openFDA – schede', () => schedaFDA(nomi)),
    prova(animale ? 'openFDA – veterinaria' : 'openFDA – segnalazioni', () => reazioniFDA(nomi, animale)),
    animale ? Promise.resolve(null) : prova('RxNav', () => farmaciSimili(nomi)),
  ]);
  const studi = await prova('PubMed', () => studiPubMed(nomi[0] || q));

  if (simili && simili.simili.length) {
    const it = await prova('Wikipedia (nomi italiani)', () => nomiItaliani(simili.simili));
    if (it) simili.simili = unici(it);
  }
  const sc = ficha ? estraiScheda(ficha.etichetta) : null;
  if (sc && sc.principi.length) sc.principi = unici((await prova('Wikipedia (nomi italiani)', () => nomiItaliani(sc.principi))) || sc.principi);
  Object.assign(contesto, { nomi, nomeFDA: ficha ? ficha.nome : (reaz ? reaz.nome : nomi[0]), wiki, sc, reaz, simili, studi });
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
    traduciPagina(risultati);
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
  module.exports = { traduci, nomiItaliani, spezza, abbinamenti, accorgimentiDaScheda, cercaWikipedia, ordinaCandidati, dividiSezioni, trovaSezione, frasiConPercentuale, nomiPerFDA, estraiScheda, pulisciTesto, SEZIONI_WIKI, cerca };
}
