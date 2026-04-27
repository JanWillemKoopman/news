document.addEventListener('DOMContentLoaded', async () => {
  const me = await requireLogin();
  await buildNav();

  const content = document.getElementById('my-listings-content');
  content.innerHTML = spinner();

  try {
    const { user, listings } = await apiFetch(`/users/${me.user_id}`);
    // Also fetch sold listings
    const res = await apiFetch(`/listings?offset=0&limit=100`);
    // Get all own listings (active + sold) by fetching full list and filtering
    // Since API only returns active, we query the user profile which only has active
    // Show active items from profile, then link to sold ones
    renderMyListings(listings, content, me.user_id);
  } catch (err) {
    content.innerHTML = emptyState('&#9888;', err.message);
  }
});

function statusTag(status) {
  if (status === 'active') return '<span class="tag">Actief</span>';
  if (status === 'sold') return '<span class="tag tag-sold">Verkocht</span>';
  return '<span class="tag tag-removed">Verwijderd</span>';
}

async function deleteItem(id, btn) {
  if (!confirm('Weet je zeker dat je dit artikel wilt verwijderen?')) return;
  btn.disabled = true;
  try {
    await apiFetch(`/listings/${id}`, { method: 'DELETE' });
    toast('Artikel verwijderd', 'success');
    btn.closest('.my-listing-row').remove();
  } catch (err) {
    toast(err.message, 'error');
    btn.disabled = false;
  }
}

function renderMyListings(listings, container, userId) {
  if (listings.length === 0) {
    container.innerHTML = emptyState('&#128248;', 'Je hebt nog geen artikelen. Zet iets te koop!');
    return;
  }

  container.innerHTML = `<div class="my-listings-list">${listings.map(l => {
    const img = l.images?.[0]
      ? `<img src="${imgUrl(l.images[0])}" alt="${escHtml(l.title)}">`
      : `<div style="width:56px;height:56px;background:var(--border);border-radius:6px;display:flex;align-items:center;justify-content:center;color:var(--text-muted)">&#128248;</div>`;
    return `
      <div class="my-listing-row" data-id="${l.id}">
        ${img}
        <div class="my-listing-info">
          <div class="my-listing-title">${escHtml(l.title)}</div>
          <div class="my-listing-sub">${formatPrice(l.price)} &middot; ${statusTag(l.status)}</div>
        </div>
        <div class="my-listing-actions">
          <a href="/vinted/listing?id=${l.id}" class="btn btn-ghost btn-sm">Bekijken</a>
          <a href="/vinted/edit-listing?id=${l.id}" class="btn btn-outline btn-sm">Bewerken</a>
          <button class="btn btn-danger btn-sm" data-del="${l.id}">Verwijderen</button>
        </div>
      </div>`;
  }).join('')}</div>`;

  container.querySelectorAll('[data-del]').forEach(btn => {
    btn.addEventListener('click', () => deleteItem(btn.dataset.del, btn));
  });
}
