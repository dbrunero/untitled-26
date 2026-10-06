import { useEffect, useState } from 'preact/hooks';
import CustomSelect from '../ui/CustomSelect';
import type { Option } from '../../lib/form-options';
import '../../styles/forms.css';

interface Props {
  categories: Option[];
  years: Option[];
  total: number;
}

const readUrl = () => {
  const p = new URLSearchParams(location.search);
  return { category: p.get('categoria') ?? '', year: p.get('anno') ?? '' };
};

/** Filter controls for /work. Keeps the URL in sync and tells the page script (work-filter.ts) what to show. */
export default function ProjectFilters({ categories, years, total }: Props) {
  const [category, setCategory] = useState('');
  const [year, setYear] = useState('');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const initial = readUrl();
    const validCat = categories.some((c) => c.value === initial.category) ? initial.category : '';
    const validYear = years.some((y) => y.value === initial.year) ? initial.year : '';
    setCategory(validCat);
    setYear(validYear);
    setMounted(true);
    const onPop = () => {
      const u = readUrl();
      setCategory(u.category);
      setYear(u.year);
    };
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);

  useEffect(() => {
    if (!mounted) return;
    const params = new URLSearchParams(location.search);
    if (category) params.set('categoria', category);
    else params.delete('categoria');
    if (year) params.set('anno', year);
    else params.delete('anno');
    const qs = params.toString();
    history.replaceState(history.state, '', `${location.pathname}${qs ? `?${qs}` : ''}${location.hash}`);
    window.dispatchEvent(new CustomEvent('work:filter', { detail: { category, year } }));
  }, [category, year, mounted]);

  const active = !!category || !!year;

  return (
    <div class="work-filters" role="group" aria-label="Filtra i progetti" data-testid="work-filters">
      <CustomSelect
        class="field--dark field--inline"
        name="categoria"
        label="Categoria"
        options={categories}
        allLabel="Tutte le categorie"
        value={category}
        onChange={setCategory}
      />
      <CustomSelect
        class="field--dark field--inline"
        name="anno"
        label="Anno"
        options={years}
        allLabel="Tutti gli anni"
        value={year}
        onChange={setYear}
      />
      <div class="work-filters__meta">
        <p class="label label--muted" role="status" aria-live="polite">
          <span data-work-count>{total === 1 ? '1 progetto' : `${total} progetti`}</span>
        </p>
        <button
          type="button"
          class="btn btn--text"
          disabled={!active}
          onClick={() => {
            setCategory('');
            setYear('');
          }}
        >
          Azzera filtri
        </button>
      </div>
    </div>
  );
}
