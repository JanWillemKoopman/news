let selectedFiles = [];

function refreshPreviews() {
  const grid = document.getElementById('preview-grid');
  grid.innerHTML = selectedFiles.map((f, i) => `
    <div class="image-preview-item">
      <img src="${URL.createObjectURL(f)}" alt="Preview ${i+1}">
      <button class="remove-img" type="button" data-idx="${i}">&#10005;</button>
    </div>`).join('');
  grid.querySelectorAll('.remove-img').forEach(btn => {
    btn.addEventListener('click', () => {
      selectedFiles.splice(parseInt(btn.dataset.idx), 1);
      refreshPreviews();
    });
  });
}

document.addEventListener('DOMContentLoaded', async () => {
  await requireLogin();
  await buildNav();

  const dropzone = document.getElementById('dropzone');
  const imgInput = document.getElementById('img-input');

  dropzone.addEventListener('click', () => imgInput.click());
  dropzone.addEventListener('dragover', e => { e.preventDefault(); dropzone.classList.add('dragover'); });
  dropzone.addEventListener('dragleave', () => dropzone.classList.remove('dragover'));
  dropzone.addEventListener('drop', e => {
    e.preventDefault();
    dropzone.classList.remove('dragover');
    addFiles([...e.dataTransfer.files]);
  });
  imgInput.addEventListener('change', () => {
    addFiles([...imgInput.files]);
    imgInput.value = '';
  });

  function addFiles(files) {
    for (const f of files) {
      if (selectedFiles.length >= 5) break;
      if (f.type.startsWith('image/')) selectedFiles.push(f);
    }
    refreshPreviews();
  }

  document.getElementById('sell-form').addEventListener('submit', async e => {
    e.preventDefault();
    const btn = document.getElementById('btn-submit');
    btn.disabled = true;
    btn.textContent = 'Bezig…';

    const fd = new FormData();
    fd.append('title', document.getElementById('f-title').value.trim());
    fd.append('description', document.getElementById('f-desc').value.trim());
    fd.append('price', document.getElementById('f-price').value);
    fd.append('brand', document.getElementById('f-brand').value.trim());
    fd.append('category', document.getElementById('f-category').value);
    fd.append('size', document.getElementById('f-size').value);
    fd.append('condition', document.getElementById('f-condition').value);
    selectedFiles.forEach(f => fd.append('images', f));

    try {
      const { listing } = await apiFetchForm('/listings', fd);
      toast('Artikel geplaatst!', 'success');
      window.location.href = `/vinted/listing?id=${listing.id}`;
    } catch (err) {
      toast(err.message, 'error');
      btn.disabled = false;
      btn.textContent = 'Artikel plaatsen';
    }
  });
});
