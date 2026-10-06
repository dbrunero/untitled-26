import { useCallback, useEffect, useRef, useState } from 'preact/hooks';
import {
  CONSENT_EVENT,
  CONSENT_OPEN_EVENT,
  acceptAll,
  getConsent,
  rejectOptional,
  saveConsent,
  type ConsentRecord,
} from '../../lib/consent';
import CookiePreferences from './CookiePreferences';
import '../../styles/consent.css';

/**
 * Consent UI: first-visit banner + preferences dialog.
 * Accept and reject have the same visual weight (no dark patterns); nothing optional
 * is pre-selected; scripts are loaded by src/lib/third-party.ts only after consent.
 */
export default function CookieBanner() {
  const [ready, setReady] = useState(false);
  const [record, setRecord] = useState<ConsentRecord | null>(null);
  const [bannerVisible, setBannerVisible] = useState(false);
  const [prefsOpen, setPrefsOpen] = useState(false);
  const opener = useRef<HTMLElement | null>(null);

  useEffect(() => {
    const stored = getConsent();
    setRecord(stored);
    setBannerVisible(stored === null);
    setReady(true);

    const onOpen = (e: Event) => {
      opener.current = ((e as CustomEvent<{ trigger: HTMLElement | null }>).detail?.trigger as HTMLElement | null) ?? (document.activeElement as HTMLElement | null);
      setPrefsOpen(true);
    };
    const onChange = (e: Event) => setRecord((e as CustomEvent<{ record: ConsentRecord }>).detail.record);
    window.addEventListener(CONSENT_OPEN_EVENT, onOpen);
    window.addEventListener(CONSENT_EVENT, onChange);
    return () => {
      window.removeEventListener(CONSENT_OPEN_EVENT, onOpen);
      window.removeEventListener(CONSENT_EVENT, onChange);
    };
  }, []);

  // Let other UI (sticky CTA) know when the banner is on screen.
  useEffect(() => {
    document.documentElement.classList.toggle('consent-open', bannerVisible);
    window.dispatchEvent(new Event('consent:banner'));
  }, [bannerVisible]);

  const closePrefs = useCallback(() => {
    setPrefsOpen(false);
    const el = opener.current;
    // The native dialog restores focus itself; this covers triggers re-rendered by view transitions.
    requestAnimationFrame(() => {
      if (el?.isConnected) el.focus();
      else document.querySelector<HTMLElement>('[data-consent-open]')?.focus();
    });
  }, []);

  const finish = (fn: () => ConsentRecord) => {
    const saved = fn();
    setRecord(saved);
    setBannerVisible(false);
    setPrefsOpen(false);
  };

  if (!ready) return null;

  return (
    <>
      {bannerVisible && !prefsOpen && (
        <section class="cookie-banner" aria-labelledby="cookie-banner-title" aria-describedby="cookie-banner-desc" data-testid="cookie-banner">
          <div class="cookie-banner__text">
            <h2 id="cookie-banner-title" class="cookie-banner__title">
              Cookie, senza giri di parole.
            </h2>
            <p id="cookie-banner-desc">
              Usiamo solo ciò che serve al funzionamento del sito. Con il tuo consenso attiviamo anche strumenti di analytics e marketing.
              Puoi rifiutarli o scegliere categoria per categoria. Maggiori dettagli in <a href="/cookie-policy">Cookie Policy</a> e{' '}
              <a href="/privacy-policy">Privacy Policy</a>.
            </p>
          </div>
          <div class="cookie-banner__actions">
            <button type="button" class="btn btn--ghost" onClick={() => finish(rejectOptional)} data-testid="consent-reject">
              Rifiuta non necessari
            </button>
            <button
              type="button"
              class="btn btn--ghost"
              onClick={(e) => {
                opener.current = e.currentTarget;
                setPrefsOpen(true);
              }}
              data-testid="consent-customize"
            >
              Personalizza
            </button>
            <button type="button" class="btn btn--ghost" onClick={() => finish(acceptAll)} data-testid="consent-accept">
              Accetta tutti
            </button>
          </div>
        </section>
      )}
      <CookiePreferences
        open={prefsOpen}
        current={record}
        onClose={closePrefs}
        onSave={(choice) => finish(() => saveConsent(choice))}
        onAcceptAll={() => finish(acceptAll)}
        onRejectAll={() => finish(rejectOptional)}
      />
    </>
  );
}
