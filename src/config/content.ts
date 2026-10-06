/** Editorial content shared by home, services, about and contact pages. */

export interface ServiceItem {
  name: string;
  description: string;
}
export interface ServiceArea {
  id: 'create' | 'grow' | 'build';
  index: string;
  label: string;
  tagline: string;
  summary: string;
  items: ServiceItem[];
  deliverables: string[];
  kind: 'image' | 'chart' | 'ui';
}

export const serviceAreas: ServiceArea[] = [
  {
    id: 'create',
    index: '01',
    label: 'CREATE',
    tagline: 'Immagini che fermano lo scroll.',
    summary: 'Fotografia, video e direzione artistica: tutto ciò che si vede e che deve restare impresso.',
    kind: 'image',
    items: [
      { name: 'Fotografia di prodotto', description: 'Packshot e scatti d’ambiente con una luce coerente da catalogo a campagna.' },
      { name: 'Still life', description: 'Composizioni costruite in studio, dove forma, superficie e ombra raccontano il prodotto.' },
      { name: 'Fotografia eventi', description: 'Copertura rapida e curata, con consegna anche durante l’evento.' },
      { name: 'Produzione video', description: 'Dalla sceneggiatura al montaggio: spot, racconti di brand, aftermovie.' },
      { name: 'Video verticali', description: 'Reel e short pensati per il formato, non ritagliati dopo.' },
      { name: 'Contenuti social', description: 'Serie ricorrenti con una voce riconoscibile e un calendario sostenibile.' },
      { name: 'Art direction', description: 'Un linguaggio visivo scritto, condiviso e applicabile da chiunque nel team.' },
      { name: 'Post-produzione', description: 'Ritocco, color grading e preparazione di tutti i formati di uscita.' },
    ],
    deliverables: ['Shot list e moodboard', 'Archivio organizzato e rinominato', 'Formati pronti per ogni canale'],
  },
  {
    id: 'grow',
    index: '02',
    label: 'GROW',
    tagline: 'Attenzione che diventa contatto.',
    summary: 'Strategia, advertising e misurazione: portare i contenuti davanti alle persone giuste e capire cosa funziona.',
    kind: 'chart',
    items: [
      { name: 'Social media management', description: 'Pianificazione, pubblicazione, community: un presidio continuo e misurato.' },
      { name: 'Content strategy', description: 'Pilastri editoriali, tone of voice e calendario collegati agli obiettivi.' },
      { name: 'Google Ads', description: 'Search, Shopping e Performance Max con struttura pulita e budget sotto controllo.' },
      { name: 'Meta Ads', description: 'Campagne su Facebook e Instagram guidate dalla creatività, non dai trucchi.' },
      { name: 'SEO', description: 'Architettura, contenuti e aspetti tecnici per farsi trovare da chi cerca davvero.' },
      { name: 'Meta Pixel', description: 'Installazione e verifica corretta, rispettosa del consenso.' },
      { name: 'Analytics', description: 'Dashboard leggibili per decidere, non report da archiviare.' },
      { name: 'Conversion tracking', description: 'Eventi e conversioni misurati in modo affidabile, anche server-side.' },
      { name: 'Landing page', description: 'Pagine costruite attorno a un’unica azione, testate e iterate.' },
    ],
    deliverables: ['Piano e calendario editoriale', 'Struttura campagne e report mensili', 'Piano di misurazione documentato'],
  },
  {
    id: 'build',
    index: '03',
    label: 'BUILD',
    tagline: 'Strumenti che entrano nel lavoro.',
    summary: 'Siti, ecommerce e software su misura: l’infrastruttura digitale che rende la comunicazione davvero utile.',
    kind: 'ui',
    items: [
      { name: 'Web design', description: 'Interfacce editoriali, accessibili e coerenti con l’identità visiva.' },
      { name: 'Sviluppo siti', description: 'Siti veloci, solidi e semplici da aggiornare.' },
      { name: 'Ecommerce', description: 'Store pensati per vendere: catalogo, checkout e tracking progettati insieme.' },
      { name: 'Configuratori', description: 'Strumenti interattivi per personalizzare un prodotto e ottenere un prezzo.' },
      { name: 'Preventivatori', description: 'Dal brief al preventivo in pochi minuti, con regole di prezzo centralizzate.' },
      { name: 'CRM', description: 'Lead, trattative e scadenze nello stesso posto, disegnati sul vostro processo.' },
      { name: 'Gestionali', description: 'Software interni che sostituiscono fogli di calcolo e passaggi manuali.' },
      { name: 'Dashboard', description: 'Indicatori in tempo reale, dai dati che avete già.' },
      { name: 'Web app', description: 'Applicazioni custom per clienti e team, dal prototipo alla produzione.' },
      { name: 'Integrazioni API', description: 'Collegamenti tra piattaforme: gestionale, ecommerce, CRM, newsletter.' },
    ],
    deliverables: ['Prototipo navigabile', 'Codice documentato e ambiente di test', 'Formazione e supporto al rilascio'],
  },
];

export interface ProcessStep {
  index: string;
  title: string;
  description: string;
  deliverables: string[];
}

export const processSteps: ProcessStep[] = [
  {
    index: '01',
    title: 'Scopriamo',
    description: 'Ascoltiamo, guardiamo come lavorate davvero e definiamo obiettivi misurabili. Si parte da ciò che serve, non da ciò che si fa di solito.',
    deliverables: ['Brief condiviso', 'Analisi di mercato e dati', 'Obiettivi e metriche'],
  },
  {
    index: '02',
    title: 'Progettiamo',
    description: 'Strategia, direzione creativa e architettura del prodotto prendono forma insieme. Prima di produrre, tutti vedono dove si va.',
    deliverables: ['Concept e moodboard', 'Wireframe e prototipo', 'Piano di produzione'],
  },
  {
    index: '03',
    title: 'Produciamo e sviluppiamo',
    description: 'Shooting, montaggio, design e sviluppo procedono in parallelo, con checkpoint regolari e materiali sempre consultabili.',
    deliverables: ['Contenuti foto e video', 'Sito, ecommerce o web app', 'Ambiente di test'],
  },
  {
    index: '04',
    title: 'Lanciamo e ottimizziamo',
    description: 'Pubblichiamo, misuriamo e miglioriamo. Il lancio è l’inizio del dato, non la fine del progetto.',
    deliverables: ['Rilascio e formazione', 'Campagne e tracking attivi', 'Report e piano di iterazione'],
  },
];

export interface ResultItem {
  value: string;
  label: string;
}
/** Set `placeholder` to false once every value below is replaced with verified data. */
export const results = {
  placeholder: true,
  items: [
    { value: '[+XX%]', label: 'crescita conversioni' },
    { value: '[XXX]', label: 'contenuti prodotti' },
    { value: '[XX]', label: 'progetti digitali' },
    { value: '[XX]', label: 'settori seguiti' },
  ] satisfies ResultItem[],
};

export const testimonials = {
  placeholder: true,
  items: [
    { quote: '[TESTIMONIANZA CLIENTE DA INSERIRE]', author: '[NOME E COGNOME]', role: '[RUOLO], [AZIENDA]' },
    { quote: '[TESTIMONIANZA CLIENTE DA INSERIRE]', author: '[NOME E COGNOME]', role: '[RUOLO], [AZIENDA]' },
    { quote: '[TESTIMONIANZA CLIENTE DA INSERIRE]', author: '[NOME E COGNOME]', role: '[RUOLO], [AZIENDA]' },
  ],
};

export const faqs = [
  {
    q: 'Quanto tempo serve per ricevere una risposta?',
    a: 'Rispondiamo entro un giorno lavorativo. Se la richiesta è chiara, nella prima risposta trovi già una proposta di passi successivi e un orientamento sui tempi.',
  },
  {
    q: 'Lavorate solo su progetti completi o anche su singoli servizi?',
    a: 'Entrambi. Molti clienti iniziano da un servizio — uno shooting, una campagna, un sito — e aggiungono il resto quando ne vedono il valore. Funziona meglio quando le parti si parlano, ma non è un obbligo.',
  },
  {
    q: 'Come funziona il preventivo?',
    a: 'Dopo una prima call definiamo obiettivi e perimetro, poi inviamo una proposta con costi chiari per ogni fase. Per progetti software proponiamo una fase di discovery a parte, così il budget successivo è realistico.',
  },
  {
    q: 'Lavorate anche fuori dalla nostra città?',
    a: 'Sì. Le produzioni foto e video si organizzano su richiesta in tutta Italia; riunioni e sviluppo funzionano bene da remoto.',
  },
  {
    q: 'Chi si occupa del sito dopo il lancio?',
    a: 'Possiamo farlo noi con un piano di manutenzione e miglioramento continuo, oppure formare il vostro team. In ogni caso il codice e i contenuti sono vostri e documentati.',
  },
];

export const values = [
  { title: 'Prima il perché', text: 'Ogni scelta creativa risponde a un obiettivo. Se non sappiamo spiegare a cosa serve, non la facciamo.' },
  { title: 'Mestiere, non effetti', text: 'La qualità sta nei dettagli che il pubblico non nota ma sente: luce, ritmo, tempi di caricamento.' },
  { title: 'Un team, un risultato', text: 'Fotografi, strategist e sviluppatori lavorano nella stessa stanza. Nessun passaggio di consegne a vuoto.' },
  { title: 'Strumenti vostri', text: 'Documentiamo, formiamo e consegniamo tutto: asset, codice, accessi. Se un giorno ci lasciate, funziona lo stesso.' },
];

export const team = [
  { name: '[NOME COGNOME]', role: 'Direzione creativa', initials: 'NC' },
  { name: '[NOME COGNOME]', role: 'Fotografia e video', initials: 'NC' },
  { name: '[NOME COGNOME]', role: 'Strategia e performance', initials: 'NC' },
  { name: '[NOME COGNOME]', role: 'Design e sviluppo', initials: 'NC' },
];
