import { useEffect, useId, useRef, useState } from 'preact/hooks';
import type { Option } from '../../lib/form-options';

export interface CustomSelectProps {
  name: string;
  label: string;
  options: Option[];
  value: string;
  onChange: (value: string) => void;
  onBlur?: () => void;
  placeholder?: string;
  hint?: string;
  error?: string | undefined;
  required?: boolean;
  disabled?: boolean;
  /** Extra class on the wrapper (used for theming light/dark). */
  class?: string;
  /** Adds an "all" entry with an empty value (filters). */
  allLabel?: string;
}

/**
 * Accessible select-only combobox (WAI-ARIA APG "Select-Only Combobox" pattern).
 * Before hydration (or without JS) it renders a styled native <select>, so the form
 * is always usable. After hydration it upgrades to a custom listbox.
 *
 * Keyboard: ↑ ↓ Home End PageUp PageDown Enter Space Escape Tab + typeahead.
 */
export default function CustomSelect(props: CustomSelectProps) {
  const { name, label, options, value, onChange, onBlur, placeholder = 'Seleziona…', hint, error, required, disabled, allLabel } = props;
  const uid = useId();
  const ids = { label: `${uid}-label`, button: `${uid}-button`, list: `${uid}-list`, hint: `${uid}-hint`, error: `${uid}-error` };
  const [enhanced, setEnhanced] = useState(false);
  const [open, setOpen] = useState(false);
  const all: Option[] = allLabel !== undefined ? [{ value: '', label: allLabel }, ...options] : options;
  const selectedIndex = all.findIndex((o) => o.value === value);
  const [active, setActive] = useState(Math.max(0, selectedIndex));
  const buttonRef = useRef<HTMLButtonElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const typeahead = useRef({ buffer: '', timer: 0 });

  useEffect(() => setEnhanced(true), []);

  // Keep the active option in view and in sync when opening.
  useEffect(() => {
    if (!open) return;
    const el = listRef.current?.children[active] as HTMLElement | undefined;
    el?.scrollIntoView({ block: 'nearest' });
  }, [open, active]);

  // Click / tap outside closes the list.
  useEffect(() => {
    if (!open) return;
    const onPointerDown = (e: PointerEvent) => {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('pointerdown', onPointerDown);
    return () => document.removeEventListener('pointerdown', onPointerDown);
  }, [open]);

  useEffect(() => () => window.clearTimeout(typeahead.current.timer), []);

  const describedBy = [hint ? ids.hint : '', error ? ids.error : ''].filter(Boolean).join(' ') || undefined;

  const openList = (index = Math.max(0, selectedIndex)) => {
    if (disabled) return;
    setActive(index);
    setOpen(true);
  };
  const commit = (index: number) => {
    const option = all[index];
    if (!option) return;
    onChange(option.value);
    setOpen(false);
    buttonRef.current?.focus();
  };
  const move = (delta: number) => setActive((i) => Math.min(all.length - 1, Math.max(0, i + delta)));

  const search = (char: string) => {
    const t = typeahead.current;
    window.clearTimeout(t.timer);
    t.buffer += char.toLowerCase();
    t.timer = window.setTimeout(() => (t.buffer = ''), 600);
    // Repeating the same letter cycles through options that start with it.
    const same = t.buffer.split('').every((c) => c === t.buffer[0]);
    const needle = same ? t.buffer[0]! : t.buffer;
    const start = same ? active + 1 : 0;
    const ordered = [...all.slice(start), ...all.slice(0, start)];
    const hit = ordered.find((o) => o.label.toLowerCase().startsWith(needle));
    if (!hit) return;
    const index = all.indexOf(hit);
    if (open) setActive(index);
    else onChange(hit.value);
  };

  const onKeyDown = (e: KeyboardEvent) => {
    if (disabled) return;
    const k = e.key;
    if (!open) {
      if (['ArrowDown', 'ArrowUp', 'Enter', ' '].includes(k)) {
        e.preventDefault();
        openList();
      } else if (k === 'Home') {
        e.preventDefault();
        openList(0);
      } else if (k === 'End') {
        e.preventDefault();
        openList(all.length - 1);
      } else if (k.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
        search(k);
      }
      return;
    }
    switch (k) {
      case 'ArrowDown':
        e.preventDefault();
        move(1);
        break;
      case 'ArrowUp':
        e.preventDefault();
        if (e.altKey) commit(active);
        else move(-1);
        break;
      case 'Home':
        e.preventDefault();
        setActive(0);
        break;
      case 'End':
        e.preventDefault();
        setActive(all.length - 1);
        break;
      case 'PageDown':
        e.preventDefault();
        move(8);
        break;
      case 'PageUp':
        e.preventDefault();
        move(-8);
        break;
      case 'Enter':
      case ' ':
        e.preventDefault();
        commit(active);
        break;
      case 'Escape':
        e.preventDefault();
        e.stopPropagation();
        setOpen(false);
        break;
      case 'Tab':
        // APG: Tab selects the active option and lets focus move on.
        onChange(all[active]?.value ?? value);
        setOpen(false);
        break;
      default:
        if (k.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
          e.preventDefault();
          search(k);
        }
    }
  };

  const selected = all[selectedIndex];
  const fieldClass = `field ${props.class ?? ''} ${error ? 'is-invalid' : ''} ${disabled ? 'is-disabled' : ''}`.trim();

  return (
    <div class={fieldClass} ref={wrapRef} data-field={name}>
      <label class="field__label" id={ids.label} for={enhanced ? ids.button : `${uid}-native`}>
        {label}
        {required && (
          <span class="field__req" aria-hidden="true">
            {' '}*
          </span>
        )}
      </label>
      {hint && (
        <p class="field__hint" id={ids.hint}>
          {hint}
        </p>
      )}

      {!enhanced ? (
        <div class="select-native">
          <select
            id={`${uid}-native`}
            name={name}
            required={required}
            disabled={disabled}
            aria-invalid={error ? true : undefined}
            aria-describedby={describedBy}
            value={value}
            onChange={(e) => onChange((e.currentTarget as HTMLSelectElement).value)}
          >
            {allLabel === undefined && <option value="">{placeholder}</option>}
            {all.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </div>
      ) : (
        <div class="select" data-open={open ? 'true' : 'false'}>
          <button
            type="button"
            id={ids.button}
            ref={buttonRef}
            class="select__button"
            role="combobox"
            aria-haspopup="listbox"
            aria-expanded={open}
            aria-controls={ids.list}
            aria-labelledby={`${ids.label} ${ids.button}`}
            aria-activedescendant={open ? `${ids.list}-opt-${active}` : undefined}
            aria-describedby={describedBy}
            aria-invalid={error ? true : undefined}
            aria-required={required ? true : undefined}
            disabled={disabled}
            onClick={() => (open ? setOpen(false) : openList())}
            onKeyDown={onKeyDown}
            onBlur={() => {
              if (!open) onBlur?.();
            }}
          >
            <span class={`select__value ${selected && selected.value !== '' ? '' : 'is-placeholder'}`}>
              {selected && selected.value !== '' ? selected.label : (selected?.label ?? placeholder)}
            </span>
            <svg class="select__chevron" width="14" height="14" viewBox="0 0 14 14" aria-hidden="true" focusable="false">
              <path d="M2 5l5 5 5-5" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" />
            </svg>
          </button>
          <input type="hidden" name={name} value={value} />
          <ul
            id={ids.list}
            ref={listRef}
            class="select__list"
            role="listbox"
            aria-labelledby={ids.label}
            tabIndex={-1}
            hidden={!open}
          >
            {all.map((o, i) => (
              <li
                key={o.value || '__all'}
                id={`${ids.list}-opt-${i}`}
                role="option"
                aria-selected={o.value === value}
                class={`select__option ${i === active ? 'is-active' : ''} ${o.value === value ? 'is-selected' : ''}`}
                // keep focus on the combobox while interacting with the pointer
                onPointerDown={(e) => e.preventDefault()}
                onMouseMove={() => i !== active && setActive(i)}
                onClick={() => commit(i)}
              >
                <span>{o.label}</span>
                <svg class="select__check" width="14" height="14" viewBox="0 0 14 14" aria-hidden="true" focusable="false">
                  <path d="M2 7.5l3.2 3.2L12 3.8" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" />
                </svg>
              </li>
            ))}
          </ul>
        </div>
      )}

      {error && (
        <p class="field__error" id={ids.error}>
          <span class="field__error-icon" aria-hidden="true">!</span> {error}
        </p>
      )}
    </div>
  );
}
