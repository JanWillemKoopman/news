async function init() {
  await buildNav();
  const id = getParam('id');
  if (!id) { window.location.href = '/vinted/'; return; }

  const content = document.getElementById('listing-content');
  content.innerHTML = spinner();

  try {
    const { listing } = await apiFetch(`/listings/${id}`);
    const me = await getMe();
    renderListing(listing, me, content);
  } catch (err) {
    content.innerHTML = emptyState('&#9888;', err.message || 'Artikel niet gevonden');
  }
}

function renderListing(l, me, container) {
  const isMine = me && me.user_id === l.seller_id;
  const isSold = l.status === 'sold' || l.status === 'removed';

  const imgs = l.images || [];
  const mainImgSrc = imgs[0] ? imgUrl(imgs[0]) : null;

  const thumbsHtml = imgs.map((f, i) =>
    `<img class="gallery-thumb${i === 0 ? ' active' : ''}" src="${imgUrl(f)}" alt="Foto ${i+1}" data-idx="${i}">`
  ).join('');

  const sellerAvatar = l.avatar
    ? `<img class="seller-avatar" src="${imgUrl(l.avatar, 'avatars')}" alt="${escHtml(l.username)}">`
    : `<div class="seller-avatar" style="background:var(--teal-light);color:var(--teal-dark);font-weight:700;">${escHtml((l.username||'?')[0].toUpperCase())}</div>`;

  const actionHtml = isSold
    ? '<div class="sold-banner">Dit artikel is verkocht</div>'
    : isMine
      ? `<a href="/vinted/edit-listing?id=${l.id}" class="btn btn-outline btn-full">Bewerken</a>`
      : me
        ? `<a href="/vinted/checkout?id=${l.id}" class="btn btn-primary btn-full">Koop nu — ${formatPrice(l.price)}</a>`
        : `<a href="/vinted/login" class="btn btn-primary btn-full">Inloggen om te kopen</a>`;

  const msgHtml = (!isMine && !isSold && me)
    ? `<div class="message-box" style="margin-top:.75rem">
        <textarea id="msg-body" placeholder="Stel een vraag over dit artikel…"></textarea>
        <div class="message-box-footer">
          <button class="btn btn-outline btn-sm" id="btn-send-msg">Stuur bericht</button>
        </div>
       </div>`
    : (!isMine && !isSold && !me)
      ? `<a href="/vinted/login" class="btn btn-ghost btn-full" style="margin-top:.75rem">Inloggen om te vragen</a>`
      : '';

  container.innerHTML = `
    <div style="margin-bottom:1rem">
      <a href="/vinted/" style="color:var(--text-muted);font-size:.85rem">&#8592; Terug naar zoeken</a>
    </div>
    <div class="listing-detail-layout">
      <div>
        ${mainImgSrc
          ? `<img class="gallery-main" id="gallery-main" src="${mainImgSrc}" alt="${escHtml(l.title)}">`
          : `<div class="gallery-main" style="display:flex;align-items:center;justify-content:center;font-size:4rem">&#128248;</div>`}
        ${imgs.length > 1 ? `<div class="gallery-thumbs">${thumbsHtml}</div>` : ''}
      </div>
      <div class="listing-info-panel">
        <div>
          <div class="listing-price-big">${formatPrice(l.price)}</div>
          <div class="listing-title-big" style="margin-top:.25rem">${escHtml(l.title)}</div>
        </div>
        <div class="listing-attrs">
          ${l.brand ? `<div class="listing-attr"><span>Merk:</span><strong>${escHtml(l.brand)}</strong></div>` : ''}
          ${l.size ? `<div class="listing-attr"><span>Maat:</span><strong>${escHtml(l.size)}</strong></div>` : ''}
          <div class="listing-attr"><span>Staat:</span><strong>${conditionLabel(l.condition)}</strong></div>
          <div class="listing-attr"><span>Categorie:</span><strong>${categoryLabel(l.category)}</strong></div>
        </div>
        ${l.description ? `<div class="listing-desc">${escHtml(l.description)}</div>` : ''}
        <a class="seller-card" href="/vinted/profile?id=${l.seller_id}">
          ${sellerAvatar}
          <div>
            <div class="seller-name">${escHtml(l.username)}</div>
            <div>${renderStars(l.rating_avg, l.rating_count)}</div>
            ${l.location ? `<div style="font-size:.8rem;color:var(--text-muted)">&#128205; ${escHtml(l.location)}</div>` : ''}
          </div>
        </a>
        ${actionHtml}
        ${msgHtml}
        <div style="font-size:.8rem;color:var(--text-muted)">Geplaatst op ${formatDate(l.created_at)}</div>
      </div>
    </div>`;

  // Gallery switching
  container.querySelectorAll('.gallery-thumb').forEach(thumb => {
    thumb.addEventListener('click', () => {
      const idx = parseInt(thumb.dataset.idx);
      document.getElementById('gallery-main').src = imgUrl((l.images || [])[idx]);
      container.querySelectorAll('.gallery-thumb').forEach(t => t.classList.remove('active'));
      thumb.classList.add('active');
    });
  });

  // Send message
  const btnMsg = document.getElementById('btn-send-msg');
  if (btnMsg) {
    btnMsg.addEventListener('click', async () => {
      const body = document.getElementById('msg-body').value.trim();
      if (!body) return;
      try {
        await apiFetch(`/messages/${l.id}/${l.seller_id}`, {
          method: 'POST',
          body: JSON.stringify({ body }),
        });
        toast('Bericht verstuurd!', 'success');
        document.getElementById('msg-body').value = '';
      } catch (err) {
        toast(err.message, 'error');
      }
    });
  }
}

document.addEventListener('DOMContentLoaded', init);
