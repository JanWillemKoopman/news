document.addEventListener('DOMContentLoaded', async () => {
  await buildNav();
  const id = getParam('id');
  if (!id) { window.location.href = '/vinted/'; return; }

  const content = document.getElementById('profile-content');
  content.innerHTML = spinner();

  try {
    const [{ user, listings }, { reviews }, me] = await Promise.all([
      apiFetch(`/users/${id}`),
      apiFetch(`/users/${id}/reviews`),
      getMe(),
    ]);
    renderProfile(user, listings, reviews, me, content);
  } catch (err) {
    content.innerHTML = emptyState('&#9888;', err.message);
  }
});

function renderProfile(user, listings, reviews, me, container) {
  const isMe = me && me.user_id === user.id;
  const avatarEl = user.avatar
    ? `<img class="profile-avatar" src="${imgUrl(user.avatar, 'avatars')}" alt="${escHtml(user.username)}">`
    : `<div class="profile-avatar" style="background:var(--teal-light);color:var(--teal-dark);font-size:2rem;font-weight:700;">${escHtml((user.username||'?')[0].toUpperCase())}</div>`;

  const reviewsHtml = reviews.length === 0
    ? '<p class="text-muted" style="font-size:.9rem">Nog geen beoordelingen</p>'
    : reviews.map(r => `
        <div style="padding:.75rem 0;border-bottom:1px solid var(--border)">
          <div style="display:flex;align-items:center;gap:.5rem;margin-bottom:.3rem">
            <span class="stars">${'★'.repeat(r.rating)}${'☆'.repeat(5-r.rating)}</span>
            <strong style="font-size:.88rem">${escHtml(r.reviewer_username)}</strong>
            <span class="text-muted" style="font-size:.78rem;margin-left:auto">${formatDate(r.created_at)}</span>
          </div>
          ${r.comment ? `<p style="font-size:.88rem">${escHtml(r.comment)}</p>` : ''}
        </div>`).join('');

  container.innerHTML = `
    <div style="max-width:860px;margin:0 auto">
      <div class="profile-header">
        ${avatarEl}
        <div>
          <h1 style="font-size:1.3rem;font-weight:800">${escHtml(user.username)}</h1>
          <div class="profile-meta">${renderStars(user.rating_avg, user.rating_count)}</div>
          ${user.location ? `<div class="profile-meta">&#128205; ${escHtml(user.location)}</div>` : ''}
          <div class="profile-meta">Lid sinds ${formatDate(user.created_at)}</div>
        </div>
        ${isMe ? `<div style="margin-left:auto"><button class="btn btn-outline btn-sm" id="btn-edit-profile">Bewerken</button></div>` : ''}
      </div>
      ${user.bio ? `<p style="margin-bottom:1.5rem;font-size:.95rem">${escHtml(user.bio)}</p>` : ''}

      ${isMe ? `
        <div id="edit-profile-form" style="display:none" class="card" style="margin-bottom:1.5rem">
          <h3 style="margin-bottom:1rem">Profiel bewerken</h3>
          <div class="form-group"><label>Gebruikersnaam</label><input type="text" id="p-username" value="${escHtml(user.username)}"></div>
          <div class="form-group"><label>Bio</label><textarea id="p-bio">${escHtml(user.bio||'')}</textarea></div>
          <div class="form-group"><label>Locatie</label><input type="text" id="p-location" value="${escHtml(user.location||'')}"></div>
          <div class="form-group"><label>Avatar</label><input type="file" id="p-avatar" accept="image/*"></div>
          <button class="btn btn-primary btn-sm" id="btn-save-profile">Opslaan</button>
        </div>` : ''}

      <h2 class="section-title">Artikelen (${listings.length})</h2>
      ${listings.length === 0
        ? emptyState('&#128248;', 'Geen actieve artikelen')
        : `<div class="listing-grid">${listings.map(listingCardHtml).join('')}</div>`}

      <h2 class="section-title" style="margin-top:2rem">Beoordelingen</h2>
      <div>${reviewsHtml}</div>
    </div>`;

  const btnEdit = document.getElementById('btn-edit-profile');
  if (btnEdit) {
    btnEdit.addEventListener('click', () => {
      const form = document.getElementById('edit-profile-form');
      form.style.display = form.style.display === 'none' ? 'block' : 'none';
    });
  }

  const btnSave = document.getElementById('btn-save-profile');
  if (btnSave) {
    btnSave.addEventListener('click', async () => {
      btnSave.disabled = true; btnSave.textContent = 'Opslaan…';
      const fd = new FormData();
      fd.append('username', document.getElementById('p-username').value.trim());
      fd.append('bio', document.getElementById('p-bio').value.trim());
      fd.append('location', document.getElementById('p-location').value.trim());
      const avatarFile = document.getElementById('p-avatar').files[0];
      if (avatarFile) fd.append('avatar', avatarFile);
      try {
        await apiFetchForm('/users/me', fd, 'PATCH');
        toast('Profiel opgeslagen!', 'success');
        window.location.reload();
      } catch (err) {
        toast(err.message, 'error');
        btnSave.disabled = false; btnSave.textContent = 'Opslaan';
      }
    });
  }
}
