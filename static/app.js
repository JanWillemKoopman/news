(function () {
  "use strict";

  const PAGE_SIZE = 5;
  let currentOffset = 0;
  let isLoading = false;

  const summariesList = document.getElementById("summaries-list");
  const loadingState = document.getElementById("loading-state");
  const emptyState = document.getElementById("empty-state");
  const pagination = document.getElementById("pagination");
  const loadMoreBtn = document.getElementById("load-more-btn");
  const headerDate = document.getElementById("header-date");

  // Dutch date helpers
  const NL_MONTHS = [
    "januari", "februari", "maart", "april", "mei", "juni",
    "juli", "augustus", "september", "oktober", "november", "december",
  ];

  function formatDate(isoString) {
    const d = new Date(isoString);
    return `${d.getDate()} ${NL_MONTHS[d.getMonth()]} ${d.getFullYear()}`;
  }

  function formatWeekRange(startIso, endIso) {
    const s = new Date(startIso);
    const e = new Date(endIso);
    const sDay = s.getDate();
    const eDay = e.getDate();
    const eMonth = NL_MONTHS[e.getMonth()];
    const eYear = e.getFullYear();
    if (s.getMonth() === e.getMonth()) {
      return `${sDay} – ${eDay} ${eMonth} ${eYear}`;
    }
    return `${sDay} ${NL_MONTHS[s.getMonth()]} – ${eDay} ${eMonth} ${eYear}`;
  }

  // Set header date
  const today = new Date();
  headerDate.textContent = `${today.getDate()} ${NL_MONTHS[today.getMonth()]} ${today.getFullYear()}`;

  // Configure marked
  if (window.marked) {
    marked.setOptions({ breaks: true, gfm: true });
  }

  function renderMarkdown(text) {
    if (window.marked) return marked.parse(text);
    return "<p>" + text.replace(/\n\n/g, "</p><p>") + "</p>";
  }

  function createSummaryCard(item) {
    const card = document.createElement("article");
    card.className = "summary-card";

    const weekLabel = formatWeekRange(item.week_start, item.week_end);
    const pubDate = formatDate(item.published_at);

    const previewLength = 400;
    const fullHtml = renderMarkdown(item.summary);
    const previewText = item.summary.slice(0, previewLength);
    const previewHtml = renderMarkdown(previewText + (item.summary.length > previewLength ? "…" : ""));
    const needsToggle = item.summary.length > previewLength;

    card.innerHTML = `
      <p class="summary-week">Week van ${weekLabel}</p>
      <h2 class="summary-title">${escapeHtml(item.title)}</h2>
      <div class="summary-body" data-expanded="false">${previewHtml}</div>
      ${needsToggle ? `<button class="read-more-btn" aria-expanded="false">Lees verder ↓</button>` : ""}
      <div class="summary-meta">
        <span>Gepubliceerd ${pubDate}</span>
      </div>
    `;

    if (needsToggle) {
      const btn = card.querySelector(".read-more-btn");
      const body = card.querySelector(".summary-body");
      btn.addEventListener("click", function () {
        const expanded = body.dataset.expanded === "true";
        if (expanded) {
          body.innerHTML = previewHtml;
          body.dataset.expanded = "false";
          btn.textContent = "Lees verder ↓";
          btn.setAttribute("aria-expanded", "false");
        } else {
          body.innerHTML = fullHtml;
          body.dataset.expanded = "true";
          btn.textContent = "Inklappen ↑";
          btn.setAttribute("aria-expanded", "true");
        }
      });
    }

    return card;
  }

  function escapeHtml(str) {
    const d = document.createElement("div");
    d.textContent = str;
    return d.innerHTML;
  }

  async function loadSummaries(offset) {
    if (isLoading) return;
    isLoading = true;

    if (offset === 0) {
      loadingState.style.display = "flex";
    } else {
      loadMoreBtn.textContent = "Laden…";
      loadMoreBtn.disabled = true;
    }

    try {
      const res = await fetch(`/api/summaries?offset=${offset}&limit=${PAGE_SIZE}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();

      if (offset === 0) {
        loadingState.style.display = "none";
        if (data.total === 0) {
          emptyState.style.display = "block";
          return;
        }
      }

      data.summaries.forEach((item) => {
        summariesList.appendChild(createSummaryCard(item));
      });

      currentOffset = offset + data.summaries.length;

      if (data.has_more) {
        pagination.style.display = "block";
        loadMoreBtn.textContent = "Ouder nieuws →";
        loadMoreBtn.disabled = false;
      } else {
        pagination.style.display = "none";
      }
    } catch (err) {
      console.error("Fout bij laden:", err);
      if (offset === 0) {
        loadingState.style.display = "none";
        emptyState.style.display = "block";
        emptyState.querySelector("p").textContent =
          "Het nieuws kon niet worden geladen. Probeer de pagina te vernieuwen.";
      } else {
        loadMoreBtn.textContent = "Ouder nieuws →";
        loadMoreBtn.disabled = false;
      }
    } finally {
      isLoading = false;
    }
  }

  loadMoreBtn.addEventListener("click", function () {
    loadSummaries(currentOffset);
  });

  loadSummaries(0);
})();
