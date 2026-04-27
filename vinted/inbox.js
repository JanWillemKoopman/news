document.addEventListener('DOMContentLoaded', async () => {
  const me = await requireLogin();
  await buildNav();
  loadInbox(me);
});

async function loadInbox(me) {
  const content = document.getElementById('inbox-content');
  content.innerHTML = spinner();
  try {
    const { threads } = await apiFetch('/messages');
    if (threads.length === 0) {
      content.innerHTML = emptyState('&#128172;', 'Geen berichten. Start een gesprek via een artikelpagina.');
      return;
    }
    content.innerHTML = `<div class="thread-list">${threads.map(t => renderThread(t)).join('')}</div>`;
  } catch (err) {
    content.innerHTML = emptyState('&#9888;', err.message);
  }
}

function renderThread(t) {
  const thumb = t.listing_images
    ? (() => { try { const imgs = JSON.parse(t.listing_images); return imgs[0] ? `<img class="thread-thumb" src="${imgUrl(imgs[0])}" alt="">` : thumbPlaceholder(); } catch { return thumbPlaceholder(); } })()
    : thumbPlaceholder();
  const unread = t.unread_count > 0;
  return `
    <div class="thread-item${unread ? ' unread' : ''}"
         onclick="window.location.href='/vinted/thread?listing=${t.listing_id}&other=${t.other_id}'">
      ${thumb}
      <div class="thread-info">
        <div class="thread-user">${escHtml(t.other_username)} ${unread ? `<span class="badge">${t.unread_count}</span>` : ''}</div>
        <div class="thread-listing">${escHtml(t.listing_title || '')}</div>
        <div class="thread-last">${escHtml(t.last_body || '')}</div>
      </div>
    </div>`;
}

function thumbPlaceholder() {
  return `<div class="thread-thumb" style="background:var(--border);display:flex;align-items:center;justify-content:center;color:var(--text-muted)">&#128248;</div>`;
}
