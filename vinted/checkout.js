document.addEventListener('DOMContentLoaded', async () => {
  const me = await requireLogin();
  await buildNav();

  const listingId = getParam('id');
  if (!listingId) { window.location.href = '/vinted/'; return; }

  const content = document.getElementById('checkout-content');
  content.innerHTML = spinner();

  try {
    const { listing } = await apiFetch(`/listings/${listingId}`);
    if (listing.status !== 'active') {
      content.innerHTML = `<div class="sold-banner" style="margin-top:2rem">Dit artikel is niet meer beschikbaar</div>
        <div style="text-align:center;margin-top:1rem"><a href="/vinted/" class="btn btn-outline">Terug naar zoeken</a></div>`;
      return;
    }
    if (listing.seller_id === me.user_id) {
      content.innerHTML = emptyState('&#9888;', 'Je kunt je eigen artikel niet kopen');
      return;
    }
    renderCheckout(listing, content);
  } catch (err) {
    content.innerHTML = emptyState('&#9888;', err.message);
  }
});

function renderCheckout(l, container) {
  const img = (l.images || [])[0];
  container.innerHTML = `
    <h1 style="font-size:1.4rem;font-weight:800;margin-bottom:1.25rem">Afrekenen</h1>
    <div class="card">
      <div class="checkout-summary">
        ${img ? `<img src="${imgUrl(img)}" alt="${escHtml(l.title)}">` : `<div style="width:80px;height:80px;background:var(--border);border-radius:6px;flex-shrink:0"></div>`}
        <div>
          <div class="checkout-item-title">${escHtml(l.title)}</div>
          <div style="font-size:.85rem;color:var(--text-muted)">${conditionLabel(l.condition)}${l.size ? ' · ' + escHtml(l.size) : ''}</div>
          <div class="checkout-price">${formatPrice(l.price)}</div>
        </div>
      </div>

      <h3 style="font-size:1rem;font-weight:700;margin-bottom:1rem">Bezorgadres</h3>
      <div class="form-group">
        <label>Naam</label>
        <input type="text" id="f-name" placeholder="Voor- en achternaam" required>
      </div>
      <div class="form-group">
        <label>Adres</label>
        <textarea id="f-address" placeholder="Straatnaam en huisnummer, postcode, stad" rows="3" required></textarea>
      </div>

      <div class="checkout-total">
        <span>Totaal</span>
        <span>${formatPrice(l.price)}</span>
      </div>
      <div id="checkout-error" class="form-error" style="margin-bottom:.75rem"></div>
      <button class="btn btn-primary btn-full" id="btn-confirm">Bestelling bevestigen</button>
      <div style="text-align:center;margin-top:.75rem;font-size:.8rem;color:var(--text-muted)">Dit is een demo — er wordt geen echte betaling verwerkt</div>
    </div>`;

  document.getElementById('btn-confirm').addEventListener('click', async () => {
    const name = document.getElementById('f-name').value.trim();
    const address = document.getElementById('f-address').value.trim();
    const errEl = document.getElementById('checkout-error');
    if (!name || !address) { errEl.textContent = 'Vul alle velden in'; return; }

    const btn = document.getElementById('btn-confirm');
    btn.disabled = true; btn.textContent = 'Verwerken…'; errEl.textContent = '';

    try {
      const { transaction } = await apiFetch('/transactions', {
        method: 'POST',
        body: JSON.stringify({ listing_id: l.id, shipping_name: name, shipping_address: address }),
      });
      showSuccess(transaction, l, container);
    } catch (err) {
      errEl.textContent = err.message;
      btn.disabled = false; btn.textContent = 'Bestelling bevestigen';
    }
  });
}

function showSuccess(tx, l, container) {
  container.innerHTML = `
    <div class="card success-box">
      <div class="success-icon">&#127881;</div>
      <h2 class="success-title">Bestelling geplaatst!</h2>
      <p class="success-sub">Je hebt "${escHtml(l.title)}" gekocht voor ${formatPrice(tx.amount)}.</p>
      <p style="font-size:.85rem;color:var(--text-muted);margin-bottom:1.5rem">Bestelnummer: <strong>${tx.id}</strong></p>
      <div style="display:flex;flex-direction:column;gap:.75rem;max-width:280px;margin:0 auto">
        <button class="btn btn-primary" id="btn-review">Laat een beoordeling achter</button>
        <a href="/vinted/" class="btn btn-ghost">Verder winkelen</a>
      </div>
    </div>`;

  document.getElementById('btn-review').addEventListener('click', () => showReviewForm(tx, l, container));
}

function showReviewForm(tx, l, container) {
  container.innerHTML = `
    <div class="card">
      <h2 style="font-size:1.2rem;font-weight:800;margin-bottom:.5rem">Beoordeel de verkoper</h2>
      <p style="color:var(--text-muted);font-size:.9rem;margin-bottom:1.25rem">${escHtml(tx.seller_username)}</p>
      <div class="form-group">
        <label>Beoordeling</label>
        <div id="star-picker" style="font-size:2rem;cursor:pointer;letter-spacing:4px">
          ${[1,2,3,4,5].map(n => `<span data-star="${n}" style="color:var(--border)">★</span>`).join('')}
        </div>
      </div>
      <div class="form-group">
        <label>Commentaar (optioneel)</label>
        <textarea id="f-comment" placeholder="Hoe was de ervaring?"></textarea>
      </div>
      <div id="rev-error" class="form-error" style="margin-bottom:.75rem"></div>
      <button class="btn btn-primary" id="btn-submit-review">Versturen</button>
    </div>`;

  let selectedRating = 0;
  document.querySelectorAll('#star-picker span').forEach(star => {
    star.addEventListener('click', () => {
      selectedRating = parseInt(star.dataset.star);
      document.querySelectorAll('#star-picker span').forEach((s, i) => {
        s.style.color = i < selectedRating ? '#f59e0b' : 'var(--border)';
      });
    });
  });

  document.getElementById('btn-submit-review').addEventListener('click', async () => {
    const errEl = document.getElementById('rev-error');
    if (!selectedRating) { errEl.textContent = 'Kies een beoordeling'; return; }
    const btn = document.getElementById('btn-submit-review');
    btn.disabled = true; btn.textContent = 'Versturen…';
    try {
      await apiFetch('/reviews', {
        method: 'POST',
        body: JSON.stringify({
          transaction_id: tx.id,
          rating: selectedRating,
          comment: document.getElementById('f-comment').value.trim(),
        }),
      });
      toast('Beoordeling verstuurd!', 'success');
      window.location.href = '/vinted/';
    } catch (err) {
      errEl.textContent = err.message;
      btn.disabled = false; btn.textContent = 'Versturen';
    }
  });
}
