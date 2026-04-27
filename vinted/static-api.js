// Static API mock — replaces Flask backend with localStorage for GitHub Pages deployment.
// Loaded after app.js to override apiFetch and apiFetchForm.

(function () {
  // ── Storage helpers ──────────────────────────────────────────────────────────
  const DB = {
    get(k) { try { return JSON.parse(localStorage.getItem('vinted_' + k) || 'null'); } catch { return null; } },
    set(k, v) { localStorage.setItem('vinted_' + k, JSON.stringify(v)); },
    list(k) { return this.get(k) || []; },
    push(k, item) { const a = this.list(k); a.push(item); this.set(k, a); },
  };

  // ── ID / time helpers ────────────────────────────────────────────────────────
  function uid() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 8); }
  function now() { return new Date().toISOString(); }

  // ── Session ──────────────────────────────────────────────────────────────────
  function getSession() { return DB.get('session'); }
  function setSession(user) { DB.set('session', { user_id: user.id, username: user.username, avatar: user.avatar || null }); }
  function clearSession() { DB.set('session', null); }
  function me() { return getSession(); }

  // ── Password mock (no real hashing needed for static demo) ───────────────────
  function hashPw(pw) { return 'h:' + btoa(pw); }
  function checkPw(pw, hash) { return hash === 'h:' + btoa(pw); }

  // ── Image upload helper ──────────────────────────────────────────────────────
  async function fileToDataUrl(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = reject;
      // Resize before storing to stay within localStorage limits (~5MB total)
      const img = new Image();
      img.onload = () => {
        const MAX = 400;
        const scale = Math.min(MAX / img.width, MAX / img.height, 1);
        const w = Math.round(img.width * scale);
        const h = Math.round(img.height * scale);
        const c = document.createElement('canvas');
        c.width = w; c.height = h;
        c.getContext('2d').drawImage(img, 0, 0, w, h);
        resolve(c.toDataURL('image/jpeg', 0.7));
      };
      img.onerror = () => reader.readAsDataURL(file);
      img.src = URL.createObjectURL(file);
    });
  }

  // ── Route dispatcher ─────────────────────────────────────────────────────────
  async function dispatch(method, path, body, files, params = new URLSearchParams()) {
    // Normalise path (remove leading /api/v)
    const p = path.replace(/^\/api\/v/, '');

    // Auth
    if (method === 'GET' && p === '/auth/me') return authMe();
    if (method === 'POST' && p === '/auth/register') return authRegister(body);
    if (method === 'POST' && p === '/auth/login') return authLogin(body);
    if (method === 'POST' && p === '/auth/logout') { clearSession(); return { ok: true }; }

    // Listings
    if (method === 'GET' && p.startsWith('/listings') && !p.match(/^\/listings\/.+/)) return searchListings(params);
    if (method === 'POST' && p === '/listings') return createListing(body, files);
    if (method === 'GET' && p.match(/^\/listings\/[^/]+$/)) return getListing(p.split('/')[2]);
    if ((method === 'PATCH' || method === 'PUT') && p.match(/^\/listings\/[^/]+$/)) return updateListing(p.split('/')[2], body, files);
    if (method === 'DELETE' && p.match(/^\/listings\/[^/]+$/)) return deleteListing(p.split('/')[2]);

    // Uploads — redirect to data-url stored in item
    if (method === 'GET' && p.startsWith('/uploads/')) return { _redirect: p };

    // Users
    if (method === 'GET' && p.match(/^\/users\/[^/]+\/reviews$/)) return getUserReviews(p.split('/')[2]);
    if (method === 'GET' && p.match(/^\/users\/[^/]+$/)) return getUser(p.split('/')[2]);
    if ((method === 'PATCH' || method === 'POST') && p === '/users/me') return updateMe(body, files);

    // Messages
    if (method === 'GET' && p === '/messages') return getInbox();
    if (method === 'GET' && p.match(/^\/messages\/[^/]+\/[^/]+$/) && !p.endsWith('/read')) return getThread(p.split('/')[2], p.split('/')[3]);
    if (method === 'POST' && p.match(/^\/messages\/[^/]+\/[^/]+$/) && !p.endsWith('/read')) return sendMessage(p.split('/')[2], p.split('/')[3], body);
    if (method === 'POST' && p.endsWith('/read')) return markRead(p.split('/')[2], p.split('/')[3]);

    // Transactions
    if (method === 'POST' && p === '/transactions') return createTransaction(body);
    if (method === 'GET' && p.match(/^\/transactions\/[^/]+$/)) return getTransaction(p.split('/')[2]);

    // Reviews
    if (method === 'POST' && p === '/reviews') return createReview(body);

    throw { status: 404, message: 'Niet gevonden' };
  }

  // ── Auth routes ──────────────────────────────────────────────────────────────
  function authMe() {
    const s = me();
    if (!s) throw { status: 401, message: 'Niet ingelogd' };
    return s;
  }

  function authRegister(body) {
    const { username, email, password } = body || {};
    if (!username || username.length < 3) throw { status: 422, message: 'Gebruikersnaam moet 3-30 tekens zijn' };
    if (!email || !email.includes('@')) throw { status: 422, message: 'Ongeldig e-mailadres' };
    if (!password || password.length < 8) throw { status: 422, message: 'Wachtwoord moet minimaal 8 tekens zijn' };
    const users = DB.list('users');
    if (users.some(u => u.email === email.toLowerCase())) throw { status: 409, message: 'E-mail al in gebruik' };
    if (users.some(u => u.username === username)) throw { status: 409, message: 'Gebruikersnaam al in gebruik' };
    const user = { id: uid(), username, email: email.toLowerCase(), password_hash: hashPw(password), avatar: null, bio: '', location: '', rating_avg: 0, rating_count: 0, created_at: now() };
    DB.push('users', user);
    setSession(user);
    return { user_id: user.id, username: user.username };
  }

  function authLogin(body) {
    const { email, password } = body || {};
    const users = DB.list('users');
    const user = users.find(u => u.email === (email || '').toLowerCase());
    if (!user || !checkPw(password, user.password_hash)) throw { status: 401, message: 'Onjuist e-mailadres of wachtwoord' };
    setSession(user);
    return { user_id: user.id, username: user.username };
  }

  // ── Listing routes ───────────────────────────────────────────────────────────
  function searchListings(params) {
    let listings = DB.list('listings').filter(l => l.status === 'active');
    const q = (params.get('q') || '').toLowerCase();
    if (q) listings = listings.filter(l => (l.title + l.description + l.brand).toLowerCase().includes(q));
    if (params.get('category')) listings = listings.filter(l => l.category === params.get('category'));
    if (params.get('size')) listings = listings.filter(l => l.size === params.get('size'));
    if (params.get('condition')) listings = listings.filter(l => l.condition === params.get('condition'));
    if (params.get('min_price')) listings = listings.filter(l => l.price >= parseFloat(params.get('min_price')));
    if (params.get('max_price')) listings = listings.filter(l => l.price <= parseFloat(params.get('max_price')));
    const sort = params.get('sort') || 'newest';
    if (sort === 'price_asc') listings.sort((a, b) => a.price - b.price);
    else if (sort === 'price_desc') listings.sort((a, b) => b.price - a.price);
    else listings.sort((a, b) => b.created_at.localeCompare(a.created_at));
    const offset = parseInt(params.get('offset') || '0');
    const limit = parseInt(params.get('limit') || '20');
    const users = DB.list('users');
    const enriched = listings.slice(offset, offset + limit).map(l => {
      const seller = users.find(u => u.id === l.seller_id) || {};
      return { ...l, username: seller.username, avatar: seller.avatar };
    });
    return { listings: enriched, total: listings.length, has_more: offset + limit < listings.length };
  }

  async function createListing(body, files) {
    const s = me(); if (!s) throw { status: 401, message: 'Niet ingelogd' };
    const images = [];
    for (const f of (files || []).slice(0, 5)) {
      if (f && f.name) images.push(await fileToDataUrl(f));
    }
    const listing = {
      id: uid(),
      seller_id: s.user_id,
      title: body.title || '',
      description: body.description || '',
      price: parseFloat(body.price) || 0,
      category: body.category || '',
      size: body.size || '',
      condition: body.condition || '',
      brand: body.brand || '',
      status: 'active',
      images,
      created_at: now(),
      updated_at: now(),
    };
    DB.push('listings', listing);
    return { listing };
  }

  function getListing(id) {
    const listings = DB.list('listings');
    const listing = listings.find(l => l.id === id);
    if (!listing) throw { status: 404, message: 'Niet gevonden' };
    const users = DB.list('users');
    const seller = users.find(u => u.id === listing.seller_id) || {};
    return { listing: { ...listing, username: seller.username, avatar: seller.avatar, rating_avg: seller.rating_avg, rating_count: seller.rating_count, location: seller.location } };
  }

  async function updateListing(id, body, files) {
    const s = me(); if (!s) throw { status: 401, message: 'Niet ingelogd' };
    const listings = DB.list('listings');
    const idx = listings.findIndex(l => l.id === id && l.seller_id === s.user_id);
    if (idx < 0) throw { status: 404, message: 'Niet gevonden of geen toegang' };
    const listing = listings[idx];
    const newImages = [];
    for (const f of (files || []).slice(0, 5)) {
      if (f && f.name) newImages.push(await fileToDataUrl(f));
    }
    const images = [...(listing.images || []), ...newImages].slice(0, 5);
    listings[idx] = { ...listing, ...body, images, updated_at: now() };
    DB.set('listings', listings);
    return { listing: listings[idx] };
  }

  function deleteListing(id) {
    const s = me(); if (!s) throw { status: 401, message: 'Niet ingelogd' };
    const listings = DB.list('listings');
    const idx = listings.findIndex(l => l.id === id && l.seller_id === s.user_id);
    if (idx < 0) throw { status: 404, message: 'Niet gevonden of geen toegang' };
    listings[idx].status = 'removed'; listings[idx].updated_at = now();
    DB.set('listings', listings);
    return { ok: true };
  }

  // ── User routes ──────────────────────────────────────────────────────────────
  function getUser(id) {
    const users = DB.list('users');
    const user = users.find(u => u.id === id);
    if (!user) throw { status: 404, message: 'Niet gevonden' };
    const { password_hash, ...pub } = user;
    const listings = DB.list('listings').filter(l => l.seller_id === id && l.status === 'active');
    return { user: pub, listings };
  }

  async function updateMe(body, files) {
    const s = me(); if (!s) throw { status: 401, message: 'Niet ingelogd' };
    const users = DB.list('users');
    const idx = users.findIndex(u => u.id === s.user_id);
    if (idx < 0) throw { status: 401, message: 'Niet ingelogd' };
    let avatar = users[idx].avatar;
    const avatarFile = files && files[0];
    if (avatarFile && avatarFile.name) avatar = await fileToDataUrl(avatarFile);
    users[idx] = { ...users[idx], username: body.username || users[idx].username, bio: body.bio || '', location: body.location || '', avatar };
    DB.set('users', users);
    setSession(users[idx]);
    const { password_hash, ...pub } = users[idx];
    return { user: pub };
  }

  function getUserReviews(userId) {
    const reviews = DB.list('reviews').filter(r => r.reviewee_id === userId);
    const users = DB.list('users');
    const enriched = reviews.map(r => {
      const reviewer = users.find(u => u.id === r.reviewer_id) || {};
      return { ...r, reviewer_username: reviewer.username, reviewer_avatar: reviewer.avatar };
    });
    return { reviews: enriched };
  }

  // ── Message routes ───────────────────────────────────────────────────────────
  function getInbox() {
    const s = me(); if (!s) throw { status: 401, message: 'Niet ingelogd' };
    const msgs = DB.list('messages').filter(m => m.sender_id === s.user_id || m.recipient_id === s.user_id);
    const seen = new Set();
    const threads = [];
    const listings = DB.list('listings');
    const users = DB.list('users');
    for (const m of [...msgs].reverse()) {
      const otherId = m.sender_id === s.user_id ? m.recipient_id : m.sender_id;
      const key = m.listing_id + ':' + otherId;
      if (seen.has(key)) continue;
      seen.add(key);
      const listing = listings.find(l => l.id === m.listing_id) || {};
      const other = users.find(u => u.id === otherId) || {};
      const unread = msgs.filter(x => x.listing_id === m.listing_id && x.sender_id === otherId && x.recipient_id === s.user_id && !x.read).length;
      threads.push({ listing_id: m.listing_id, other_id: otherId, other_username: other.username, other_avatar: other.avatar, listing_title: listing.title, listing_images: JSON.stringify(listing.images || []), listing_status: listing.status, last_at: m.created_at, last_body: m.body, unread_count: unread });
    }
    return { threads };
  }

  function getThread(listingId, otherId) {
    const s = me(); if (!s) throw { status: 401, message: 'Niet ingelogd' };
    const msgs = DB.list('messages').filter(m =>
      m.listing_id === listingId &&
      ((m.sender_id === s.user_id && m.recipient_id === otherId) ||
       (m.sender_id === otherId && m.recipient_id === s.user_id))
    );
    // Mark as read
    const allMsgs = DB.list('messages');
    let changed = false;
    allMsgs.forEach(m => {
      if (m.listing_id === listingId && m.sender_id === otherId && m.recipient_id === s.user_id && !m.read) { m.read = true; changed = true; }
    });
    if (changed) DB.set('messages', allMsgs);
    const users = DB.list('users');
    const listings = DB.list('listings');
    const listing = listings.find(l => l.id === listingId) || {};
    const other = users.find(u => u.id === otherId) || {};
    const enriched = msgs.map(m => {
      const sender = users.find(u => u.id === m.sender_id) || {};
      return { ...m, sender_username: sender.username, sender_avatar: sender.avatar };
    });
    return { messages: enriched, listing: { id: listing.id, title: listing.title, images: listing.images || [], status: listing.status }, other_user: { id: other.id, username: other.username, avatar: other.avatar } };
  }

  function sendMessage(listingId, otherId, body) {
    const s = me(); if (!s) throw { status: 401, message: 'Niet ingelogd' };
    const text = (body.body || '').trim();
    if (!text) throw { status: 422, message: 'Bericht mag niet leeg zijn' };
    const users = DB.list('users');
    const sender = users.find(u => u.id === s.user_id) || {};
    const msg = { id: uid(), listing_id: listingId, sender_id: s.user_id, recipient_id: otherId, body: text, created_at: now(), read: false };
    DB.push('messages', msg);
    return { message: { ...msg, sender_username: sender.username, sender_avatar: sender.avatar } };
  }

  function markRead(listingId, otherId) {
    const s = me(); if (!s) throw { status: 401, message: 'Niet ingelogd' };
    const msgs = DB.list('messages');
    msgs.forEach(m => { if (m.listing_id === listingId && m.sender_id === otherId && m.recipient_id === s.user_id) m.read = true; });
    DB.set('messages', msgs);
    return { ok: true };
  }

  // ── Transaction routes ───────────────────────────────────────────────────────
  function createTransaction(body) {
    const s = me(); if (!s) throw { status: 401, message: 'Niet ingelogd' };
    const listings = DB.list('listings');
    const idx = listings.findIndex(l => l.id === body.listing_id && l.status === 'active');
    if (idx < 0) throw { status: 409, message: 'Dit artikel is al verkocht of niet gevonden' };
    if (listings[idx].seller_id === s.user_id) throw { status: 422, message: 'Je kunt je eigen artikel niet kopen' };
    listings[idx].status = 'sold'; listings[idx].updated_at = now();
    DB.set('listings', listings);
    const users = DB.list('users');
    const seller = users.find(u => u.id === listings[idx].seller_id) || {};
    const buyer = users.find(u => u.id === s.user_id) || {};
    const tx = { id: uid(), listing_id: body.listing_id, buyer_id: s.user_id, seller_id: listings[idx].seller_id, amount: listings[idx].price, shipping_name: body.shipping_name, shipping_address: body.shipping_address, status: 'completed', created_at: now(), listing_title: listings[idx].title, listing_images: listings[idx].images, buyer_username: buyer.username, seller_username: seller.username };
    DB.push('transactions', tx);
    return { transaction: tx };
  }

  function getTransaction(id) {
    const s = me(); if (!s) throw { status: 401, message: 'Niet ingelogd' };
    const tx = DB.list('transactions').find(t => t.id === id);
    if (!tx || (tx.buyer_id !== s.user_id && tx.seller_id !== s.user_id)) throw { status: 404, message: 'Niet gevonden' };
    return { transaction: tx };
  }

  // ── Review routes ────────────────────────────────────────────────────────────
  function createReview(body) {
    const s = me(); if (!s) throw { status: 401, message: 'Niet ingelogd' };
    const rating = parseInt(body.rating);
    if (!rating || rating < 1 || rating > 5) throw { status: 422, message: 'Beoordeling moet tussen 1 en 5 zijn' };
    const tx = DB.list('transactions').find(t => t.id === body.transaction_id && (t.buyer_id === s.user_id || t.seller_id === s.user_id));
    if (!tx) throw { status: 422, message: 'Transactie niet gevonden' };
    const reviews = DB.list('reviews');
    if (reviews.some(r => r.reviewer_id === s.user_id && r.transaction_id === body.transaction_id)) throw { status: 422, message: 'Je hebt al een beoordeling gegeven' };
    const reviewee_id = tx.buyer_id === s.user_id ? tx.seller_id : tx.buyer_id;
    const users = DB.list('users');
    const reviewer = users.find(u => u.id === s.user_id) || {};
    const review = { id: uid(), reviewer_id: s.user_id, reviewee_id, transaction_id: body.transaction_id, rating, comment: body.comment || '', created_at: now() };
    DB.push('reviews', review);
    // Recalculate rating
    const allReviews = DB.list('reviews').filter(r => r.reviewee_id === reviewee_id);
    const avg = allReviews.reduce((s, r) => s + r.rating, 0) / allReviews.length;
    const uIdx = users.findIndex(u => u.id === reviewee_id);
    if (uIdx >= 0) { users[uIdx].rating_avg = avg; users[uIdx].rating_count = allReviews.length; DB.set('users', users); }
    return { review: { ...review, reviewer_username: reviewer.username, reviewer_avatar: reviewer.avatar } };
  }

  // ── Override apiFetch ────────────────────────────────────────────────────────
  const _origImgUrl = window.imgUrl;
  window.imgUrl = function (filename, folder) {
    if (!filename) return null;
    // Data URLs are stored directly (base64 images)
    if (filename.startsWith('data:')) return filename;
    return _origImgUrl ? _origImgUrl(filename, folder) : filename;
  };

  window.apiFetch = async function (path, options = {}) {
    const method = (options.method || 'GET').toUpperCase();
    let body = null;
    if (options.body) {
      try { body = JSON.parse(options.body); } catch { body = options.body; }
    }
    // Parse query string from path
    const [basePath, qs] = path.split('?');
    const params = qs ? new URLSearchParams(qs) : new URLSearchParams();
    try {
      return await dispatch(method, basePath, body, null, params);
    } catch (e) {
      if (e.status) throw e;
      throw { status: 500, message: String(e.message || e) };
    }
  };

  window.apiFetchForm = async function (path, formData, method = 'POST') {
    const body = {};
    const files = [];
    if (formData && formData.entries) {
      for (const [k, v] of formData.entries()) {
        if (v instanceof File) files.push(v);
        else body[k] = v;
      }
    }
    try {
      const [basePath] = path.split('?');
      return await dispatch(method.toUpperCase(), basePath, body, files);
    } catch (e) {
      if (e.status) throw e;
      throw { status: 500, message: String(e.message || e) };
    }
  };

  // ── Seed demo data on first visit ────────────────────────────────────────────
  function seedDemo() {
    if (DB.get('seeded')) return;
    const demoUser = { id: 'demo1', username: 'VintedDemo', email: 'demo@vinted.nl', password_hash: 'h:' + btoa('demo1234'), avatar: null, bio: 'Dit is een demo-account met voorbeeldartikelen.', location: 'Amsterdam', rating_avg: 4.5, rating_count: 8, created_at: '2026-01-01T10:00:00Z' };
    DB.set('users', [demoUser]);
    const items = [
      { id: 's1', seller_id: 'demo1', title: 'Nike Air Max 90 - maat 42', description: 'Prachtige sneakers, nauwelijks gedragen. Originele doos aanwezig.', price: 65, category: 'shoes', size: '42', condition: 'like_new', brand: 'Nike', status: 'active', images: [], created_at: '2026-04-01T09:00:00Z', updated_at: '2026-04-01T09:00:00Z' },
      { id: 's2', seller_id: 'demo1', title: 'Zara oversized blazer groen - M', description: 'Trendy blazer, één seizoen gedragen. Geen vlekken of scheuren.', price: 28, category: 'outerwear', size: 'M', condition: 'good', brand: 'Zara', status: 'active', images: [], created_at: '2026-04-02T11:00:00Z', updated_at: '2026-04-02T11:00:00Z' },
      { id: 's3', seller_id: 'demo1', title: "Levi's 501 spijkerbroek - W28 L32", description: "Klassieke Levi's jeans in donkerblauw. Goede staat.", price: 35, category: 'bottoms', size: '28', condition: 'good', brand: "Levi's", status: 'active', images: [], created_at: '2026-04-03T14:00:00Z', updated_at: '2026-04-03T14:00:00Z' },
      { id: 's4', seller_id: 'demo1', title: 'H&M jurk bloemenprint - S', description: 'Zomerse jurk, nog nooit gedragen. Label nog er in.', price: 18, category: 'dresses', size: 'S', condition: 'new_with_tags', brand: 'H&M', status: 'active', images: [], created_at: '2026-04-04T08:00:00Z', updated_at: '2026-04-04T08:00:00Z' },
      { id: 's5', seller_id: 'demo1', title: 'Adidas hoodie zwart - L', description: 'Comfortabele hoodie voor sport of casual wear.', price: 22, category: 'tops', size: 'L', condition: 'good', brand: 'Adidas', status: 'active', images: [], created_at: '2026-04-05T16:00:00Z', updated_at: '2026-04-05T16:00:00Z' },
      { id: 's6', seller_id: 'demo1', title: 'Leren tas bruin - Dames', description: 'Echte leren tas, mooi vintage uiterlijk.', price: 45, category: 'accessories', size: '', condition: 'fair', brand: '', status: 'active', images: [], created_at: '2026-04-06T12:00:00Z', updated_at: '2026-04-06T12:00:00Z' },
    ];
    DB.set('listings', items);
    DB.set('seeded', true);
  }

  seedDemo();
  console.log('[Vinted] Static API actief — gegevens worden opgeslagen in localStorage');
})();
