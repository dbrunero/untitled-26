# [NOME AGENZIA] — Portfolio site (Concept A · Editorial Motion)

Sito portfolio e lead generation di una creative web agency, statico (SSG), costruito con **Astro 7**, TypeScript strict, GSAP + ScrollTrigger e isole Preact solo dove servono (form, select accessibile, consenso cookie, filtri).

Direzione visiva: editoriale, cinematografica, minimale. Space Grotesk + Instrument Serif Italic, nero `#09090A`, carta `#F5F2EB`, accento acid green `#C2FF1F`.

> Il file Figma di riferimento non era leggibile senza login: l'interpretazione del Concept A parte dalla descrizione del brief (palette, tipografia, composizioni, hero con visual floating).

## Requisiti

- Node.js ≥ 20.19 (testato con 24)
- pnpm 10 (`corepack enable`)
- Google Chrome per i test Playwright (su CI: `pnpm exec playwright install chromium` e rimuovere `channel` in `playwright.config.ts`)

## Comandi

```bash
pnpm install
pnpm dev            # sviluppo → http://localhost:4321
pnpm build          # build statica (SSG) in dist/
pnpm preview        # anteprima della build
pnpm typecheck      # astro check (TypeScript 6)
pnpm lint           # ESLint
pnpm test           # Playwright sulla build statica (Formspree intercettato, mai contattato)
pnpm placeholders   # rigenera le immagini segnaposto
```

## Struttura

```
src/
  config/        site.ts (dati agenzia, placeholder) · content.ts (servizi, processo, risultati, FAQ…)
  content/projects/   case study (Content Collection, un .md per progetto)
  content.config.ts   schema Zod dei progetti
  components/
    layout/      Header, MobileMenu, Footer, SEO, PageHero, Breadcrumbs, StickyCta
    ui/          Button, ArrowLink, SectionLabel, CustomCursor, CustomSelect (Preact)
    home/        Hero, Marquee, Manifesto, Services, FeaturedWork, Results, DigitalProducts, Process, Testimonials, ContactSection
    portfolio/   ProjectCard, ProjectGrid, ProjectFilters (Preact), ProjectGallery, ProjectVideo, ProjectNavigation
    forms/       ContactForm (Preact)
    consent/     CookieBanner, CookiePreferences (Preact, <dialog> nativo)
  layouts/       BaseLayout, ProjectLayout, LegalLayout
  lib/           validation (Zod), contact (invio a Formspree), consent, third-party, seo
  scripts/       core/ (lifecycle, gsap loader, env) · site/ (header, cursor, magnetic…) · animations/ (GSAP, lazy)
  styles/        tokens, fonts, global, typography, animations, buttons, forms, consent
  pages/         index, work/, services, about, contact/, privacy-policy, cookie-policy, 404, robots.txt
tests/           Playwright (smoke, menu, consenso, form, work, motion)
```

## Route

`/` · `/work` · `/work/[slug]` · `/services` · `/about` · `/contact` · `/contact/grazie` (noindex) · `/privacy-policy` · `/cookie-policy` · `/404` · `/robots.txt` · `/sitemap-index.xml`

## Portfolio

Ogni progetto è un file in `src/content/projects/<slug>.md`. Il nome file deve coincidere con `slug`.

```md
---
title: "Titolo"
slug: nome-progetto
client: "Cliente"
year: 2025
category: content        # content | social | eventi | ecommerce | software
area: create             # create | grow | build
services: ["Fotografia di prodotto"]
excerpt: "…"             # max 220 caratteri
result: "Risultato in una riga (card)"
challenge: "…"
solution: "…"
cover: ../../assets/projects/nome-progetto/cover.jpg
coverAlt: "Descrizione dell'immagine"
gallery:                 # opzionale — size: full | half | tall
  - { image: ../../assets/projects/nome-progetto/gallery-01.jpg, alt: "…", caption: "…", size: full }
videos:                  # opzionale — src è un MP4 in /public (se manca resta il poster)
  - { title: "…", src: /media/video.mp4, poster: ../../assets/projects/nome-progetto/poster.jpg, alt: "…", vertical: false }
metrics:                 # opzionale
  - { value: "+42%", label: "Conversioni" }
featured: true           # compare in homepage (max 6)
order: 7                 # ordine in home e archivio
credits: [{ role: "Foto", name: "Nome" }]
seoTitle: "…"            # opzionali
seoDescription: "…"
demo: false              # false = nasconde la nota "dati dimostrativi"
---
Testo libero (Markdown) mostrato nel case study.
```

**Sostituire le immagini**: sovrascrivi i file in `src/assets/projects/<slug>/` mantenendo i nomi (`cover.jpg`, `gallery-0X.jpg`, `poster.jpg`) oppure aggiorna i percorsi nel frontmatter. `astro:assets` genera automaticamente AVIF/WebP responsive. I 6 case study inclusi sono **demo** con clienti fittizi e numeri `[XX]`: vanno sostituiti.

Il filtro di `/work` usa categoria e anno e salva lo stato in `?categoria=…&anno=…`. Funziona anche con progetti senza video, metriche o gallery.

## Form di contatto (Formspree)

Il sito è **statico puro (SSG)**: non c'è codice server. Il form invia direttamente a [Formspree](https://formspree.io).

1. Crea un form su Formspree e copia l'ID (la parte finale di `https://formspree.io/f/XXXXXXXX`).
2. Imposta `PUBLIC_FORMSPREE_ID=XXXXXXXX` (in `.env` in locale, nelle variabili d'ambiente di Netlify in produzione) e ribuilda.
3. Nel pannello Formspree imposta email di destinazione, dominio consentito e, se vuoi, reCAPTCHA/filtro spam.

Come funziona:

- Validazione Zod lato client (`src/lib/validation.ts`): progressiva, riepilogo errori, focus sul primo errore. Dati non validi non partono.
- `src/lib/contact.ts` è l'unico punto che parla con il provider: invia JSON con etichette leggibili, mappa gli errori di campo di Formspree, gestisce rete assente e 429. Per cambiare servizio sostituisci `submitContact`.
- Honeypot (`_gotcha`, riconosciuto anche da Formspree) e blocco del doppio invio.
- Senza `PUBLIC_FORMSPREE_ID`: in `pnpm dev` l'invio è simulato e dichiarato in UI; **in produzione mostra un errore chiaro e non finge mai un invio riuscito**.
- Senza JavaScript il form resta utilizzabile: select nativi e POST diretto a Formspree, con redirect a `/contact/grazie` tramite `_next` (verifica che il tuo piano Formspree lo consenta, altrimenti compare la pagina di conferma di Formspree).
- Non essendoci un server, validazione server-side, rate limiting e antispam sono demandati a Formspree.

## Variabili d'ambiente

Vedi `.env.example`.

| Variabile | Dove | Note |
| --- | --- | --- |
| `PUBLIC_SITE_URL` | build | URL di produzione. Usato per canonical, sitemap, OG e redirect post-invio |
| `PUBLIC_FORMSPREE_ID` | build | ID del form Formspree. Pubblico per natura |
| `PUBLIC_GA_MEASUREMENT_ID` | build | opzionale, caricato solo con consenso Analytics |
| `PUBLIC_META_PIXEL_ID` | build | opzionale, caricato solo con consenso Marketing |

## Cookie e consenso

- Stato in `localStorage` sotto `site_consent_v1`: `{ version, timestamp, categories: { necessary, analytics, marketing } }`. Scade dopo 12 mesi o al cambio di `version` (`src/config/site.ts`).
- `src/lib/consent.ts` legge/salva/emette l'evento `consent:change`; `src/lib/third-party.ts` è l'unico loader di script opzionali (GA4 e Meta Pixel) e parte **solo** dopo il consenso. Alla revoca ferma la raccolta e cancella i cookie noti (`_ga*`, `_fbp`, `_fbc`).
- Banner con «Rifiuta non necessari», «Personalizza», «Accetta tutti» (stesso peso visivo), nessuna casella preselezionata. Pannello preferenze su `<dialog>` nativo (focus trap, Escape, ritorno del focus). Riapribile dal footer e dalla Cookie Policy (`data-consent-open`).
- **Analytics**: imposta `PUBLIC_GA_MEASUREMENT_ID` e ribuilda. Per rimuoverlo basta non impostarlo (o eliminare `loadAnalytics`).
- **Pixel marketing**: imposta `PUBLIC_META_PIXEL_ID`. Nessun ID reale è incluso.
- Aggiorna `cookieInventory` in `src/config/site.ts` quando aggiungi strumenti: alimenta la tabella della Cookie Policy.

## Personalizzazione

- **Colori / spaziature / motion**: `src/styles/tokens.css`.
- **Font**: `@fontsource` (locali, subset latin + latin-ext) dichiarati in `src/styles/fonts.css`, con fallback a metriche corrette e preload in `BaseLayout.astro`. Per usare file forniti, sostituisci gli `src` in `fonts.css` e i due `?url` di preload.
- **Dati agenzia**: `src/config/site.ts`. **Testi di servizi/processo/risultati/testimonianze/FAQ/team**: `src/config/content.ts`.

## Animazioni

- Hero: intro in puro CSS (visibile subito, nessun blocco su JS), floating con prospettiva (variabili CSS `--px/--py` da `site/pointer-vars.ts`) e parallax di scroll (GSAP).
- GSAP e ScrollTrigger sono caricati **dinamicamente** e solo nelle pagine che hanno i relativi hook (`data-reveal`, `data-mask`, `data-lines`, `data-hero-float`, `data-process`…). Tutto vive in `gsap.context` / `gsap.matchMedia` e viene ripristinato in `astro:before-swap`: nessun listener duplicato con le View Transitions (`core/lifecycle.ts`).
- Reveal, mask clip-path, righe di testo, marquee scrubbed, processo con progress, accordion servizi, hover card con pan, stage UI 3D, footer reveal, filtro `/work` con GSAP Flip, transizioni di pagina con shared element sulle cover dei progetti.
- Cursore custom (`site/cursor.ts`): solo mouse preciso e senza reduced motion; il cursore nativo si nasconde dopo il primo movimento reale.
- **`prefers-reduced-motion: reduce`**: niente scroll smooth, parallax, tilt, cursore, view transitions animate; contenuti subito visibili, funzionalità invariate. In assenza di `html.motion` nessun contenuto è nascosto. Un watchdog (6 s) scopre i contenuti se il layer di animazione non carica.

## Deploy su Netlify

`pnpm build` produce una cartella `dist/` interamente statica: nessuna funzione, nessun adapter. `netlify.toml` contiene comando di build, cartella da pubblicare, cache e header di sicurezza.

1. Collega il repository a Netlify.
2. In *Site configuration → Environment variables* imposta `PUBLIC_SITE_URL` (URL definitivo), `PUBLIC_FORMSPREE_ID` e, se servono, `PUBLIC_GA_MEASUREMENT_ID` / `PUBLIC_META_PIXEL_ID`. Sono valori di build: dopo averli cambiati rilancia il deploy.
3. Deploy. La pagina 404 personalizzata (`dist/404.html`) viene servita automaticamente.

La stessa `dist/` funziona su qualunque hosting statico.

## Accessibilità

Skip link, landmark, heading gerarchici, focus visibile, menu mobile `dialog` con trap/Escape/`inert`, select ARIA select-only combobox (frecce, Home/End, PageUp/Down, typeahead, `aria-activedescendant`), accordion con `aria-expanded` veritiero, errori form associati (`aria-describedby`, riepilogo `role=alert`), video muted/playsinline con pulsante pausa, hover sempre con equivalente focus.

## Test

`pnpm test` esegue la build statica, la serve con `tests/static-server.mjs` e verifica: tutte le route senza errori console, assenza di overflow/testi tagliati a 1440–360 px, menu mobile, consenso (nulla prima della scelta, accetta/rifiuta/granulare, focus trap, riapertura dal footer), form (errori, invio a Formspree intercettato, doppio invio, errori del provider, honeypot, fallback senza JS, build senza ID che non finge l'invio), select da tastiera, filtri, navigazione verso i case study, **cursore custom su ogni pagina** (caricamento diretto e dopo navigazione client-side), reduced motion, View Transitions.

## Da sostituire / revisione legale

Placeholder (cerca `[` nei file elencati):

| Dove | Cosa |
| --- | --- |
| `src/config/site.ts` | `[NOME AGENZIA]`, `[RAGIONE SOCIALE]`, `[PARTITA IVA]`, `[INDIRIZZO]`, `[CITTÀ]`, `[EMAIL]`, `[TELEFONO]`, `[PEC]`, `[RESPONSABILE PRIVACY]`, `[LINK INSTAGRAM]`, `[LINK LINKEDIN]`, `[URL PRODUZIONE]`, `calendarUrl` |
| `src/config/content.ts` | numeri `[+XX%]`…, testimonianze `[TESTIMONIANZA CLIENTE DA INSERIRE]`, team `[NOME COGNOME]` (imposta `placeholder: false` quando sono veri) |
| `src/content/projects/*.md` | clienti demo, metriche `[XX]`, credits `[NOME]`, `demo: true` |
| `src/assets/projects/**`, `public/og-default.jpg`, `public/favicon.svg`, icone | immagini/loghi definitivi |
| `src/pages/privacy-policy.astro`, `cookie-policy.astro` | `[DATA ULTIMO AGGIORNAMENTO]`, periodi di conservazione, fornitori (incluso Formspree, USA), trasferimenti extra UE |
| `public/site.webmanifest` | nome agenzia |

⚠️ **Privacy Policy, Cookie Policy e banner sono strutture tecniche di partenza**: i testi legali, le basi giuridiche, i tempi di conservazione e l'elenco dei cookie devono essere verificati e approvati da un professionista. La presenza del banner non rende il sito, da sola, conforme alla normativa.
