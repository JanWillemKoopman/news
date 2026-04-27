let pollInterval = null;

document.addEventListener('DOMContentLoaded', async () => {
  const me = await requireLogin();
  await buildNav();

  const listingId = getParam('listing');
  const otherId = getParam('other');
  if (!listingId || !otherId) { window.location.href = '/vinted/inbox'; return; }

  await loadThread(me, listingId, otherId);

  // Poll for new messages every 10 seconds
  pollInterval = setInterval(() => loadThread(me, listingId, otherId, false), 10000);

  // Reply form
  document.getElementById('reply-box').innerHTML = `
    <div class="message-box">
      <textarea id="reply-input" placeholder="Typ je bericht…" rows="3"></textarea>
      <div class="message-box-footer">
        <button class="btn btn-primary btn-sm" id="btn-reply">Versturen</button>
      </div>
    </div>`;

  document.getElementById('btn-reply').addEventListener('click', async () => {
    const body = document.getElementById('reply-input').value.trim();
    if (!body) return;
    try {
      await apiFetch(`/messages/${listingId}/${otherId}`, {
        method: 'POST',
        body: JSON.stringify({ body }),
      });
      document.getElementById('reply-input').value = '';
      await loadThread(me, listingId, otherId, false);
    } catch (err) {
      toast(err.message, 'error');
    }
  });

  document.getElementById('reply-input').addEventListener('keydown', e => {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      document.getElementById('btn-reply').click();
    }
  });
});

async function loadThread(me, listingId, otherId, updateHeader = true) {
  try {
    const { messages, listing, other_user } = await apiFetch(`/messages/${listingId}/${otherId}`);

    if (updateHeader) {
      const header = document.getElementById('thread-header');
      const listingImg = (listing.images || [])[0];
      header.innerHTML = `
        <div style="display:flex;align-items:center;gap:.75rem">
          <a href="/vinted/inbox" style="color:var(--text-muted);font-size:.85rem">&#8592; Inbox</a>
          ${listingImg ? `<img src="${imgUrl(listingImg)}" style="width:44px;height:44px;object-fit:cover;border-radius:6px">` : ''}
          <div>
            <div style="font-weight:600">${escHtml(listing.title || '')}</div>
            <div style="font-size:.82rem;color:var(--text-muted)">Gesprek met ${escHtml(other_user.username || '')}</div>
          </div>
          ${listing.status === 'active'
            ? `<a href="/vinted/listing?id=${listingId}" class="btn btn-outline btn-sm" style="margin-left:auto">Artikel bekijken</a>`
            : '<span class="tag tag-sold" style="margin-left:auto">Verkocht</span>'}
        </div>`;
    }

    const chatArea = document.getElementById('chat-area');
    chatArea.innerHTML = `
      <div class="chat-wrap">
        ${messages.length === 0
          ? '<p class="text-muted" style="text-align:center;font-size:.9rem">Nog geen berichten</p>'
          : messages.map(m => {
              const isMine = m.sender_id === me.user_id;
              const time = new Date(m.created_at).toLocaleTimeString('nl-NL', { hour: '2-digit', minute: '2-digit' });
              return `
                <div class="chat-bubble-row${isMine ? ' mine' : ''}">
                  <div>
                    <div class="chat-bubble ${isMine ? 'mine' : 'theirs'}">${escHtml(m.body)}</div>
                    <div class="chat-time ${isMine ? '' : 'theirs'}">${time}</div>
                  </div>
                </div>`;
            }).join('')
        }
      </div>`;
    // Scroll to bottom
    chatArea.scrollTop = chatArea.scrollHeight;
  } catch (err) {
    if (updateHeader) document.getElementById('chat-area').innerHTML = emptyState('&#9888;', err.message);
  }
}

window.addEventListener('beforeunload', () => { if (pollInterval) clearInterval(pollInterval); });
