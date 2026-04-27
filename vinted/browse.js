let offset = 0;
const LIMIT = 20;
let total = 0;
let loading = false;

function getFilters() {
  return {
    q: getParam('q'),
    category: document.getElementById('f-category').value,
    condition: document.getElementById('f-condition').value,
    size: document.getElementById('f-size').value,
    min_price: document.getElementById('f-min').value,
    max_price: document.getElementById('f-max').value,
    sort: document.getElementById('f-sort').value,
  };
}

function buildQuery(extra = {}) {
  const f = { ...getFilters(), ...extra };
  const p = new URLSearchParams();
  Object.entries(f).forEach(([k, v]) => { if (v) p.set(k, v); });
  p.set('offset', String(extra.offset ?? 0));
  p.set('limit', String(LIMIT));
  return p.toString();
}

async function loadListings(reset = true) {
  if (loading) return;
  loading = true;
  const grid = document.getElementById('listing-grid');
  const moreWrap = document.getElementById('load-more-wrap');

  if (reset) {
    offset = 0;
    grid.innerHTML = spinner();
    moreWrap.innerHTML = '';
  } else {
    moreWrap.innerHTML = spinner();
  }

  try {
    const qs = buildQuery({ offset });
    const { listings, total: tot, has_more } = await apiFetch(`/listings?${qs}`);
    total = tot;

    if (reset) grid.innerHTML = '';
    moreWrap.innerHTML = '';

    if (listings.length === 0 && reset) {
      grid.innerHTML = emptyState('&#128248;', 'Geen items gevonden. Probeer andere filters.');
    } else {
      listings.forEach(l => {
        grid.insertAdjacentHTML('beforeend', listingCardHtml(l));
      });
      offset += listings.length;
    }

    document.getElementById('result-count').textContent = `${total} items`;

    if (has_more) {
      moreWrap.innerHTML = '<button class="btn btn-outline" id="btn-more">Meer laden</button>';
      document.getElementById('btn-more').addEventListener('click', () => loadListings(false));
    }
  } catch (err) {
    grid.innerHTML = emptyState('&#9888;', err.message || 'Kon items niet laden');
  } finally {
    loading = false;
  }
}

function applyFilters() {
  const f = getFilters();
  const qs = new URLSearchParams();
  Object.entries(f).forEach(([k, v]) => { if (v) qs.set(k, v); });
  history.replaceState({}, '', '?' + qs.toString());
  loadListings(true);
}

function resetFilters() {
  ['f-category','f-condition','f-size','f-min','f-max'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.value = '';
  });
  history.replaceState({}, '', '/vinted/');
  loadListings(true);
}

// Pre-fill filters from URL
function restoreFilters() {
  const q = getParam('q');
  if (q) document.getElementById('nav-search-input') && (document.getElementById('nav-search-input').value = q);
  ['category','condition','size'].forEach(k => {
    const v = getParam(k);
    const el = document.getElementById('f-' + k);
    if (el && v) el.value = v;
  });
  if (getParam('min_price')) document.getElementById('f-min').value = getParam('min_price');
  if (getParam('max_price')) document.getElementById('f-max').value = getParam('max_price');
  if (getParam('sort')) document.getElementById('f-sort').value = getParam('sort');
}

document.addEventListener('DOMContentLoaded', async () => {
  await buildNav(getParam('q'));
  restoreFilters();
  document.getElementById('btn-apply').addEventListener('click', applyFilters);
  document.getElementById('btn-reset').addEventListener('click', resetFilters);
  document.getElementById('f-sort').addEventListener('change', applyFilters);
  loadListings(true);
});
