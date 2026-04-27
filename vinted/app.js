// Shared Vinted JS: auth state, API helpers, nav, toast
const API = '/api/v';

// ─── API fetch wrapper ────────────────────────────────────────────────────────
async function apiFetch(path, options = {}) {
  const res = await fetch(API + path, {
    credentials: 'include',
    headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
    ...options,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw { status: res.status, message: data.error || 'Er is een fout opgetreden' };
  return data;
}

async function apiFetchForm(path, formData, method = 'POST') {
  const res = await fetch(API + path, {
    method,
    credentials: 'include',
    body: formData,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw { status: res.status, message: data.error || 'Er is een fout opgetreden' };
  return data;
}

// ─── Auth state ───────────────────────────────────────────────────────────────
let _me = null;

async function getMe(force = false) {
  if (_me && !force) return _me;
  try {
    _me = await apiFetch('/auth/me');
    return _me;
  } catch {
    _me = null;
    return null;
  }
}

async function requireLogin() {
  const me = await getMe();
  if (!me) window.location.href = '/vinted/login';
  return me;
}

// ─── Toast ────────────────────────────────────────────────────────────────────
function toast(msg, type = 'info') {
  let container = document.getElementById('toast-container');
  if (!container) {
    container = document.createElement('div');
    container.id = 'toast-container';
    document.body.appendChild(container);
  }
  const el = document.createElement('div');
  el.className = `toast toast-${type}`;
  el.textContent = msg;
  container.appendChild(el);
  setTimeout(() => el.remove(), 3500);
}

// ─── Nav ──────────────────────────────────────────────────────────────────────
async function buildNav(searchValue = '') {
  const me = await getMe();

  let unread = 0;
  if (me) {
    try {
      const { threads } = await apiFetch('/messages');
      unread = threads.reduce((s, t) => s + (t.unread_count || 0), 0);
    } catch {}
  }

  const nav = document.createElement('nav');
  nav.id = 'vinted-nav';
  nav.innerHTML = `
    <a class="nav-logo" href="/vinted/">vinted</a>
    <div class="nav-search">
      <span class="search-icon">&#128269;</span>
      <input type="search" placeholder="Zoeken op Vinted" id="nav-search-input" value="${escHtml(searchValue)}">
    </div>
    <div class="nav-links">
      ${me
        ? `<a href="/vinted/sell" class="nav-sell">+ Verkopen</a>
           <a href="/vinted/inbox">&#128172;${unread > 0 ? `<span class="badge">${unread}</span>` : ''}</a>
           <a href="/vinted/profile?id=${me.user_id}">&#128100; ${escHtml(me.username)}</a>
           <a href="/vinted/my-listings">Mijn items</a>
           <button id="nav-logout">Uitloggen</button>`
        : `<a href="/vinted/login">Inloggen</a>
           <a href="/vinted/register" class="nav-sell">Registreren</a>`
      }
    </div>`;

  const firstChild = document.body.firstChild;
  document.body.insertBefore(nav, firstChild);

  document.getElementById('nav-search-input')?.addEventListener('keydown', e => {
    if (e.key === 'Enter') {
      const q = e.target.value.trim();
      window.location.href = `/vinted/?q=${encodeURIComponent(q)}`;
    }
  });

  document.getElementById('nav-logout')?.addEventListener('click', async () => {
    await apiFetch('/auth/logout', { method: 'POST' });
    _me = null;
    window.location.href = '/vinted/';
  });
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function escHtml(s) {
  return String(s ?? '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

function formatPrice(p) {
  return '€ ' + Number(p).toFixed(2).replace('.', ',');
}

function formatDate(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  return d.toLocaleDateString('nl-NL', { day: 'numeric', month: 'long', year: 'numeric' });
}

function imgUrl(filename, folder = 'listings') {
  return filename ? `/api/v/uploads/${folder}/${filename}` : null;
}

function renderStars(avg, count) {
  const n = Math.round(avg || 0);
  const stars = '★'.repeat(n) + '☆'.repeat(5 - n);
  return `<span class="stars">${stars}</span> <span class="text-muted">(${count || 0})</span>`;
}

function conditionLabel(c) {
  return { new_with_tags: 'Nieuw met label', like_new: 'Zo goed als nieuw', good: 'Goed', fair: 'Redelijk' }[c] || c;
}

function categoryLabel(c) {
  return { tops: 'Tops', bottoms: 'Broeken/Rokken', shoes: 'Schoenen', accessories: 'Accessoires', outerwear: 'Jassen', dresses: 'Jurken', sportswear: 'Sport', other: 'Overig' }[c] || c;
}

function getParam(name) {
  return new URLSearchParams(window.location.search).get(name) || '';
}

function spinner() {
  return '<div class="loading-center"><div class="spinner"></div></div>';
}

function emptyState(icon, text) {
  return `<div class="empty-state"><div class="empty-state-icon">${icon}</div><p>${escHtml(text)}</p></div>`;
}

function listingCardHtml(l) {
  const img = l.images?.[0] ? `<img class="listing-card-img" src="${imgUrl(l.images[0])}" alt="${escHtml(l.title)}" loading="lazy">` : `<div class="listing-card-img-placeholder">&#128248;</div>`;
  const condTag = `<span class="tag">${conditionLabel(l.condition)}</span>`;
  const soldTag = l.status === 'sold' ? '<span class="tag tag-sold">Verkocht</span>' : '';
  return `
    <div class="listing-card" onclick="window.location.href='/vinted/listing?id=${l.id}'">
      ${img}
      <div class="listing-card-body">
        <div class="listing-card-price">${formatPrice(l.price)}</div>
        <div class="listing-card-title">${escHtml(l.title)}</div>
        <div class="listing-card-meta">${condTag}${soldTag}${l.size ? `<span class="tag">${escHtml(l.size)}</span>` : ''}</div>
      </div>
    </div>`;
}
