let newFiles = [];

document.addEventListener('DOMContentLoaded', async () => {
  const me = await requireLogin();
  await buildNav();

  const id = getParam('id');
  if (!id) { window.location.href = '/vinted/my-listings'; return; }

  const content = document.getElementById('edit-content');
  content.innerHTML = spinner();

  try {
    const { listing } = await apiFetch(`/listings/${id}`);
    if (listing.seller_id !== me.user_id) {
      toast('Geen toegang', 'error');
      window.location.href = '/vinted/my-listings';
      return;
    }
    renderForm(listing, content);
  } catch (err) {
    content.innerHTML = emptyState('&#9888;', err.message);
  }
});

function renderForm(l, container) {
  const existingImgs = (l.images || []).map((f, i) =>
    `<div class="image-preview-item" data-existing="${f}">
       <img src="${imgUrl(f)}" alt="Foto ${i+1}">
       <button class="remove-img" type="button" data-existing="${f}">&#10005;</button>
     </div>`
  ).join('');

  container.innerHTML = `
    <div class="card">
      <form id="edit-form">
        <div class="form-group">
          <label>Huidige foto's</label>
          <div class="image-preview-grid" id="existing-grid">${existingImgs}</div>
        </div>
        <div class="form-group">
          <label>Nieuwe foto's toevoegen</label>
          <div class="upload-dropzone" id="dropzone">
            <input type="file" id="img-input" accept="image/*" multiple>
            <div>&#128247; Klik om foto's toe te voegen</div>
          </div>
          <div class="image-preview-grid" id="new-grid"></div>
        </div>
        <div class="form-group">
          <label>Titel</label>
          <input type="text" id="f-title" value="${escHtml(l.title)}" maxlength="100">
        </div>
        <div class="form-group">
          <label>Beschrijving</label>
          <textarea id="f-desc" maxlength="2000">${escHtml(l.description || '')}</textarea>
        </div>
        <div class="form-row">
          <div class="form-group">
            <label>Prijs (€)</label>
            <input type="number" id="f-price" value="${l.price}" min="0" step="0.01">
          </div>
          <div class="form-group">
            <label>Merk</label>
            <input type="text" id="f-brand" value="${escHtml(l.brand || '')}" maxlength="60">
          </div>
        </div>
        <div class="form-row">
          <div class="form-group">
            <label>Categorie</label>
            <select id="f-category">
              <option value="tops"${l.category==='tops'?' selected':''}>Tops</option>
              <option value="bottoms"${l.category==='bottoms'?' selected':''}>Broeken/Rokken</option>
              <option value="dresses"${l.category==='dresses'?' selected':''}>Jurken</option>
              <option value="outerwear"${l.category==='outerwear'?' selected':''}>Jassen</option>
              <option value="shoes"${l.category==='shoes'?' selected':''}>Schoenen</option>
              <option value="accessories"${l.category==='accessories'?' selected':''}>Accessoires</option>
              <option value="sportswear"${l.category==='sportswear'?' selected':''}>Sport</option>
              <option value="other"${l.category==='other'?' selected':''}>Overig</option>
            </select>
          </div>
          <div class="form-group">
            <label>Maat</label>
            <input type="text" id="f-size" value="${escHtml(l.size || '')}" maxlength="10">
          </div>
        </div>
        <div class="form-group">
          <label>Staat</label>
          <select id="f-condition">
            <option value="new_with_tags"${l.condition==='new_with_tags'?' selected':''}>Nieuw met label</option>
            <option value="like_new"${l.condition==='like_new'?' selected':''}>Zo goed als nieuw</option>
            <option value="good"${l.condition==='good'?' selected':''}>Goed</option>
            <option value="fair"${l.condition==='fair'?' selected':''}>Redelijk</option>
          </select>
        </div>
        <div style="display:flex;gap:.75rem;margin-top:.5rem">
          <button type="submit" class="btn btn-primary" id="btn-save">Opslaan</button>
          <a href="/vinted/listing?id=${l.id}" class="btn btn-ghost">Annuleren</a>
        </div>
      </form>
    </div>`;

  // Existing image removal
  container.querySelectorAll('#existing-grid .remove-img').forEach(btn => {
    btn.addEventListener('click', () => btn.closest('.image-preview-item').remove());
  });

  // New file upload
  const dropzone = document.getElementById('dropzone');
  const imgInput = document.getElementById('img-input');
  dropzone.addEventListener('click', () => imgInput.click());
  imgInput.addEventListener('change', () => {
    [...imgInput.files].forEach(f => { if (newFiles.length < 5 && f.type.startsWith('image/')) newFiles.push(f); });
    refreshNewPreviews();
    imgInput.value = '';
  });

  function refreshNewPreviews() {
    const grid = document.getElementById('new-grid');
    grid.innerHTML = newFiles.map((f, i) => `
      <div class="image-preview-item">
        <img src="${URL.createObjectURL(f)}">
        <button class="remove-img" type="button" data-idx="${i}">&#10005;</button>
      </div>`).join('');
    grid.querySelectorAll('.remove-img').forEach(btn => {
      btn.addEventListener('click', () => { newFiles.splice(parseInt(btn.dataset.idx), 1); refreshNewPreviews(); });
    });
  }

  document.getElementById('edit-form').addEventListener('submit', async e => {
    e.preventDefault();
    const btn = document.getElementById('btn-save');
    btn.disabled = true; btn.textContent = 'Opslaan…';

    const fd = new FormData();
    fd.append('title', document.getElementById('f-title').value.trim());
    fd.append('description', document.getElementById('f-desc').value.trim());
    fd.append('price', document.getElementById('f-price').value);
    fd.append('brand', document.getElementById('f-brand').value.trim());
    fd.append('category', document.getElementById('f-category').value);
    fd.append('size', document.getElementById('f-size').value.trim());
    fd.append('condition', document.getElementById('f-condition').value);
    newFiles.forEach(f => fd.append('images', f));

    try {
      await apiFetchForm(`/listings/${getParam('id')}`, fd, 'PATCH');
      toast('Opgeslagen!', 'success');
      window.location.href = `/vinted/listing?id=${getParam('id')}`;
    } catch (err) {
      toast(err.message, 'error');
      btn.disabled = false; btn.textContent = 'Opslaan';
    }
  });
}
