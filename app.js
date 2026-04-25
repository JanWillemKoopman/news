(function () {
  "use strict";

  const PAGE_SIZE = 5;
  let allSummaries = [];
  let rendered = 0;

  const summariesList = document.getElementById("summaries-list");
  const loadingState  = document.getElementById("loading-state");
  const emptyState    = document.getElementById("empty-state");
  const pagination    = document.getElementById("pagination");
  const loadMoreBtn   = document.getElementById("load-more-btn");
  const headerDate    = document.getElementById("header-date");

  const NL_MONTHS = [
    "januari","februari","maart","april","mei","juni",
    "juli","augustus","september","oktober","november","december",
  ];

  function formatDate(iso) {
    const d = new Date(iso);
    return `${d.getDate()} ${NL_MONTHS[d.getMonth()]} ${d.getFullYear()}`;
  }

  function formatWeekRange(startIso, endIso) {
    const s = new Date(startIso);
    const e = new Date(endIso);
    if (s.getMonth() === e.getMonth()) {
      return `${s.getDate()} – ${e.getDate()} ${NL_MONTHS[e.getMonth()]} ${e.getFullYear()}`;
    }
    return `${s.getDate()} ${NL_MONTHS[s.getMonth()]} – ${e.getDate()} ${NL_MONTHS[e.getMonth()]} ${e.getFullYear()}`;
  }

  const today = new Date();
  if (headerDate) headerDate.textContent = `${today.getDate()} ${NL_MONTHS[today.getMonth()]} ${today.getFullYear()}`;

  if (window.marked) marked.setOptions({ breaks: true, gfm: true });

  function renderMarkdown(text) {
    // Split op :::intro, :::kader en :::image blokken
    const parts = text.split(/(:::(?:intro|kader|image)[\s\S]*?:::)/g);
    return parts.map(function(part) {
      if (part.startsWith(":::intro")) {
        const inner = part.replace(/^:::intro\n?/, "").replace(/\n?:::$/, "").trim();
        const html = window.marked ? marked.parse(inner) : "<p>" + inner + "</p>";
        return '<div class="summary-intro">' + html + "</div>";
      }
      if (part.startsWith(":::kader")) {
        const inner = part.replace(/^:::kader\n?/, "").replace(/\n?:::$/, "").trim();
        const html = window.marked ? marked.parse(inner) : "<p>" + inner + "</p>";
        return '<div class="kader">' + html + "</div>";
      }
      if (part.startsWith(":::image")) {
        const url = part.replace(/^:::image\n?/, "").replace(/\n?:::$/, "").trim();
        if (!url.startsWith("http")) return "";
        return '<div class="section-image-wrap"><img src="' + url + '" alt="" loading="lazy" onerror="this.parentElement.style.display=\'none\'"></div>';
      }
      return window.marked ? marked.parse(part) : "<p>" + part.replace(/\n\n/g, "</p><p>") + "</p>";
    }).join("");
  }

  function escapeHtml(str) {
    const d = document.createElement("div");
    d.textContent = str;
    return d.innerHTML;
  }

  function createCard(item, isFirst = false) {
    const card = document.createElement("article");
    card.className = "summary-card";

    const weekLabel = formatWeekRange(item.week_start, item.week_end);
    const pubDate   = formatDate(item.published_at);
    const fullHtml  = renderMarkdown(item.summary);

    const previewText = item.summary.slice(0, 400);
    const previewHtml = renderMarkdown(previewText + (item.summary.length > 400 ? "…" : ""));
    const needsToggle = !isFirst && item.summary.length > 400;

    card.innerHTML = `
      <p class="summary-week">Editie ${weekLabel}</p>
      <h2 class="summary-title">${escapeHtml(item.title)}</h2>
      <div class="summary-body" data-expanded="${isFirst ? "true" : "false"}">${isFirst ? fullHtml : previewHtml}</div>
      ${needsToggle ? `<button class="read-more-btn" aria-expanded="false">Lees verder ↓</button>` : ""}
      <div class="summary-meta">
        <span>Gepubliceerd ${pubDate}</span>
      </div>
    `;

    if (needsToggle) {
      const btn  = card.querySelector(".read-more-btn");
      const body = card.querySelector(".summary-body");
      btn.addEventListener("click", function () {
        const expanded = body.dataset.expanded === "true";
        body.innerHTML        = expanded ? previewHtml : fullHtml;
        body.dataset.expanded = expanded ? "false" : "true";
        btn.textContent       = expanded ? "Lees verder ↓" : "Inklappen ↑";
        btn.setAttribute("aria-expanded", String(!expanded));
      });
    }

    return card;
  }

  function showMore() {
    const batch = allSummaries.slice(rendered, rendered + PAGE_SIZE);
    batch.forEach((item, i) => summariesList.appendChild(createCard(item, rendered === 0 && i === 0)));
    rendered += batch.length;

    if (rendered < allSummaries.length) {
      pagination.style.display = "block";
      loadMoreBtn.disabled = false;
      loadMoreBtn.innerHTML = `Ouder nieuws <span class="btn-arrow">&#8594;</span>`;
    } else {
      pagination.style.display = "none";
    }
  }

  async function init() {
    try {
      const res = await fetch("data/summaries.json");
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      allSummaries = data.summaries || [];
    } catch (err) {
      console.error("Kon summaries.json niet laden:", err);
      loadingState.style.display = "none";
      emptyState.style.display = "block";
      emptyState.querySelector("p").textContent =
        "Het nieuws kon niet worden geladen. Probeer de pagina te vernieuwen.";
      return;
    }

    loadingState.style.display = "none";

    if (allSummaries.length === 0) {
      emptyState.style.display = "block";
      return;
    }

    showMore();
  }

  loadMoreBtn.addEventListener("click", showMore);
  init();

  // ── Thema Toggle ──────────────────────────────────────────

  const THEME_KEY      = "weekoverzicht-theme";
  const themeToggleBtn = document.getElementById("theme-toggle-btn");

  function applyTheme(theme) {
    if (theme === "dark") {
      document.documentElement.setAttribute("data-theme", "dark");
    } else {
      document.documentElement.removeAttribute("data-theme");
    }
    themeToggleBtn.setAttribute(
      "aria-label",
      theme === "dark" ? "Schakel naar licht thema" : "Schakel naar donker thema"
    );
  }

  applyTheme(localStorage.getItem(THEME_KEY) || "light");

  themeToggleBtn.addEventListener("click", function () {
    const next = document.documentElement.hasAttribute("data-theme") ? "light" : "dark";
    applyTheme(next);
    localStorage.setItem(THEME_KEY, next);
  });

  // ── Hamburger Menu ────────────────────────────────────────

  const hamburgerBtn  = document.getElementById("hamburger-btn");
  const hamburgerMenu = document.getElementById("hamburger-menu");

  hamburgerBtn.addEventListener("click", function () {
    const isOpen = hamburgerMenu.classList.contains("is-open");
    hamburgerMenu.classList.toggle("is-open", !isOpen);
    hamburgerBtn.setAttribute("aria-expanded", String(!isOpen));
    hamburgerMenu.setAttribute("aria-hidden", String(isOpen));
  });

  document.addEventListener("click", function (e) {
    if (
      hamburgerMenu.classList.contains("is-open") &&
      !hamburgerBtn.contains(e.target) &&
      !hamburgerMenu.contains(e.target)
    ) {
      hamburgerMenu.classList.remove("is-open");
      hamburgerBtn.setAttribute("aria-expanded", "false");
      hamburgerMenu.setAttribute("aria-hidden", "true");
    }
  });
})();
