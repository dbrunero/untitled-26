import { useEffect, useRef, useState } from 'preact/hooks';
import { PUBLIC_GA_MEASUREMENT_ID, PUBLIC_META_PIXEL_ID } from 'astro:env/client';
import type { ConsentRecord } from '../../lib/consent';

interface Props {
  open: boolean;
  current: ConsentRecord | null;
  onClose: () => void;
  onSave: (choice: { analytics: boolean; marketing: boolean }) => void;
  onAcceptAll: () => void;
  onRejectAll: () => void;
}

const configured = (id: string | undefined) => !!id && !/^(\[|x+$)/i.test(id.trim());

/**
 * Preferences panel built on the native <dialog> element: showModal() gives us a real focus trap,
 * inert background, Escape handling and focus restoration to the opener.
 */
export default function CookiePreferences({ open, current, onClose, onSave, onAcceptAll, onRejectAll }: Props) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [analytics, setAnalytics] = useState(false);
  const [marketing, setMarketing] = useState(false);

  // Opt-in categories are never pre-selected; we only mirror a previous explicit choice.
  useEffect(() => {
    if (open) {
      setAnalytics(current?.categories.analytics ?? false);
      setMarketing(current?.categories.marketing ?? false);
    }
  }, [open, current]);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) {
      dialog.showModal();
      document.documentElement.classList.add('is-locked');
    }
    if (!open && dialog.open) {
      dialog.close();
    }
    if (!open) document.documentElement.classList.remove('is-locked');
  }, [open]);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    const handleClose = () => onClose();
    // Backdrop click closes (dialog element itself is the target only for the backdrop).
    const handleClick = (e: MouseEvent) => {
      if (e.target === dialog) onClose();
    };
    // Native modal dialogs let Tab escape to the browser UI at the edges: keep focus inside.
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return;
      const items = Array.from(
        dialog.querySelectorAll<HTMLElement>('a[href], button:not([disabled]), input:not([disabled]), [tabindex]:not([tabindex="-1"])'),
      );
      const first = items[0];
      const last = items[items.length - 1];
      if (!first || !last) return;
      const active = document.activeElement;
      if (e.shiftKey && (active === first || !dialog.contains(active))) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && (active === last || !dialog.contains(active))) {
        e.preventDefault();
        first.focus();
      }
    };
    dialog.addEventListener('close', handleClose);
    dialog.addEventListener('click', handleClick);
    dialog.addEventListener('keydown', handleKeyDown);
    return () => {
      dialog.removeEventListener('close', handleClose);
      dialog.removeEventListener('click', handleClick);
      dialog.removeEventListener('keydown', handleKeyDown);
    };
  }, [onClose]);

  return (
    <dialog ref={dialogRef} class="consent-dialog" aria-labelledby="consent-title" aria-describedby="consent-desc">
      <div class="consent-dialog__inner">
        <header class="consent-dialog__head">
          <p class="label label--muted">Privacy</p>
          <h2 id="consent-title" class="consent-dialog__title">
            Preferenze cookie
          </h2>
          <button type="button" class="consent-dialog__close" onClick={onClose} aria-label="Chiudi le preferenze cookie">
            <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
              <path d="M3 3l12 12M15 3L3 15" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" />
            </svg>
          </button>
        </header>
        <p id="consent-desc" class="consent-dialog__lead">
          Scegli quali categorie attivare. Puoi cambiare idea in qualsiasi momento dal pulsante «Gestisci preferenze cookie» in fondo al sito.
          Dettagli nella <a href="/cookie-policy">Cookie Policy</a> e nella <a href="/privacy-policy">Privacy Policy</a>.
        </p>

        <ul class="consent-cats">
          <li class="consent-cat">
            <div class="consent-cat__text">
              <h3 id="cat-necessary">Necessari</h3>
              <p id="cat-necessary-d">Servono al funzionamento del sito e a ricordare questa scelta. Non possono essere disattivati.</p>
            </div>
            <label class="switch">
              <input type="checkbox" checked disabled aria-labelledby="cat-necessary" aria-describedby="cat-necessary-d" />
              <span class="switch__track" aria-hidden="true" />
              <span class="sr-only">Sempre attivi</span>
            </label>
          </li>
          <li class="consent-cat">
            <div class="consent-cat__text">
              <h3 id="cat-analytics">Analytics</h3>
              <p id="cat-analytics-d">
                Misurano in forma aggregata come viene usato il sito, per migliorarlo.
                {!configured(PUBLIC_GA_MEASUREMENT_ID) && <em> Nessuno strumento è attualmente attivo su questo sito.</em>}
              </p>
            </div>
            <label class="switch">
              <input
                type="checkbox"
                checked={analytics}
                onChange={(e) => setAnalytics(e.currentTarget.checked)}
                aria-labelledby="cat-analytics"
                aria-describedby="cat-analytics-d"
              />
              <span class="switch__track" aria-hidden="true" />
              <span class="sr-only">{analytics ? 'Attivo' : 'Disattivato'}</span>
            </label>
          </li>
          <li class="consent-cat">
            <div class="consent-cat__text">
              <h3 id="cat-marketing">Marketing</h3>
              <p id="cat-marketing-d">
                Permettono di misurare le campagne pubblicitarie e mostrare annunci più pertinenti.
                {!configured(PUBLIC_META_PIXEL_ID) && <em> Nessuno strumento è attualmente attivo su questo sito.</em>}
              </p>
            </div>
            <label class="switch">
              <input
                type="checkbox"
                checked={marketing}
                onChange={(e) => setMarketing(e.currentTarget.checked)}
                aria-labelledby="cat-marketing"
                aria-describedby="cat-marketing-d"
              />
              <span class="switch__track" aria-hidden="true" />
              <span class="sr-only">{marketing ? 'Attivo' : 'Disattivato'}</span>
            </label>
          </li>
        </ul>

        <div class="consent-actions">
          <button type="button" class="btn btn--ghost" onClick={onRejectAll}>
            Rifiuta non necessari
          </button>
          <button type="button" class="btn btn--ghost" onClick={() => onSave({ analytics, marketing })} data-testid="consent-save">
            Salva preferenze
          </button>
          <button type="button" class="btn btn--ghost" onClick={onAcceptAll}>
            Accetta tutti
          </button>
        </div>
        {current && (
          <p class="consent-dialog__meta">
            Ultimo aggiornamento: {new Date(current.timestamp).toLocaleDateString('it-IT', { day: 'numeric', month: 'long', year: 'numeric' })}
          </p>
        )}
      </div>
    </dialog>
  );
}
