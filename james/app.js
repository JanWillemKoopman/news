/* ═══════════════════════════════════════════════════════════════
   James' Wonder-App — app.js
   Vanilla JS, no dependencies.

   HOW TO ADD A NEW WONDER:
   ─────────────────────────
   Add a new object to the `wonderLibrary` array below, following
   this template:

     {
       title: "De naam van het onderwerp",
       intro: "2-3 korte zinnen die het onderwerp uitleggen.",
       philosophyQuestion: "Een diepe vraag om samen over na te denken.",
       deepDive: "3-4 zinnen met extra informatie over het onderwerp."
     },

   Dat is alles! De app kiest automatisch een willekeurig wonder.
═══════════════════════════════════════════════════════════════ */

'use strict';

/* ── Wonder Library ────────────────────────────────────────────
   Each entry is one "wonder" James will discover.
   Language: Dutch | Level: Leesniveau B
──────────────────────────────────────────────────────────────── */
const wonderLibrary = [
  {
    title: "De Maanlanding 🌕",
    intro: "Op 20 juli 1969 zette een mens voor het eerst voet op de maan. Dat was Neil Armstrong. Hij deed één kleine stap, maar het was een reuzenstap voor alle mensen op aarde.",
    philosophyQuestion: "Als jij op de maan mocht staan en naar de aarde keek — wat zou je dan denken?",
    deepDive: "De reis naar de maan duurde vier dagen. De astronauten hadden niet eens een computer zo krachtig als jouw telefoon. Toch kwamen ze veilig terug. Er liepen maar 12 mensen op de maan. Nog niemand is er daarna naartoe gegaan."
  },
  {
    title: "De Tweede Wereldoorlog 🕊️",
    intro: "Tussen 1940 en 1945 was Nederland bezet door een land dat Duitsland heette. Mensen mochten niet meer vrij zijn. Heel veel mensen zijn in die tijd gestorven.",
    philosophyQuestion: "Waarom denk jij dat het zo belangrijk is dat mensen vrijheid hebben?",
    deepDive: "In Amsterdam verstopte een meisje van 13 jaar, Anne Frank, zich met haar familie twee jaar lang in een geheim huis. Ze schreef alles op in een dagboek. Dat dagboek kun je nu nog lezen. Op 5 mei 1945 was Nederland eindelijk vrij — dat vieren we elk jaar op Bevrijdingsdag."
  },
  {
    title: "De Rijkste Persoon Ter Wereld 💰",
    intro: "Sommige mensen hebben zo veel geld dat je het bijna niet kunt tellen. De rijkste mensen ter wereld hebben meer geld dan hele landen. Elon Musk en Jeff Bezos zijn bekende namen.",
    philosophyQuestion: "Wat zou jij doen als je meer geld had dan je ooit kon uitgeven?",
    deepDive: "Elon Musk heeft zoveel geld dat hij zijn eigen raketbedrijf heeft gebouwd. Jeff Bezos begon met het verkopen van boeken vanuit zijn garage — nu koopt bijna de hele wereld bij zijn bedrijf Amazon. Geld geeft je macht, maar heel veel rijke mensen zeggen dat vrienden en familie hen gelukkiger maken dan geld."
  },
  {
    title: "De Diepste Boring op Aarde 🕳️",
    intro: "In Rusland boorden mensen een gat in de grond — zo diep als 12 kilometer. Dat is het diepste gat dat mensen ooit hebben gemaakt. Ze stopten pas toen het te heet werd.",
    philosophyQuestion: "Wat denk jij dat er helemaal in het midden van de aarde zit?",
    deepDive: "Op 12 kilometer diepte was het meer dan 180 graden Celsius — heter dan een oven! De boring heet de Kola Superdeep Borehole. Het project duurde 24 jaar. En toch hadden ze maar een klein stukje van de aardkorst bereikt. Het middelpunt van de aarde is nog 6.000 kilometer verder."
  },
  {
    title: "Wat Is Europa? 🇪🇺",
    intro: "Europa is niet alleen een werelddeel, het is ook een samenwerking van landen. Die landen zijn de Europese Unie. Ze helpen elkaar en hebben samen afspraken gemaakt.",
    philosophyQuestion: "Als landen samenwerken, denk je dat dat de wereld beter of moeilijker maakt?",
    deepDive: "Er zijn 27 landen lid van de Europese Unie. In veel landen betaal je met dezelfde munt: de euro. Mensen mogen vrij van land naar land reizen zonder paspoort. Nederland is lid en werkt mee aan de grote besluiten. Vroeger hadden al die landen vaker oorlog met elkaar — nu werken ze samen."
  },
  {
    title: "De Nederlandse Gulden 🪙",
    intro: "Voordat Nederland de euro had, betaalden mensen hier met de gulden. Dat was het Nederlandse geld. Op 1 januari 2002 verdween de gulden voor altijd.",
    philosophyQuestion: "Stel dat elk land zijn eigen geld heeft — wat zijn de voor- en nadelen daarvan, denk je?",
    deepDive: "Op een gulden stond het gezicht van koningin Beatrix. Er waren munten van 5 cent (stuiver), 10 cent (dubbeltje) en 25 cent (kwartje). Een brood kostte vroeger maar een paar gulden. Nu is het Nederlands geld de euro, die gedeeld wordt met 26 andere landen in Europa."
  },
  {
    title: "Wat Doet Een Wetenschapper? 🔬",
    intro: "Wetenschappers stellen vragen over de wereld en zoeken antwoorden. Ze doen experimenten, schrijven het op en vertellen het aan anderen. Dankzij wetenschappers weten we zo ontzettend veel!",
    philosophyQuestion: "Als jij wetenschapper was, welke vraag zou jij dan als eerste willen beantwoorden?",
    deepDive: "Er zijn heel veel soorten wetenschappers. Een bioloog bestudeert dieren en planten. Een astronoom kijkt naar sterren en planeten. Een chemicus mengt stoffen en kijkt wat er gebeurt. Albert Einstein was een beroemde wetenschapper — hij ontdekte dat tijd sneller of langzamer kan gaan, afhankelijk van hoe snel je beweegt. Dat klinkt als magie, maar het is gewoon wetenschap!"
  },
  {
    title: "Pokémon — Hoe Begon Het? ⚡",
    intro: "Pokémon begon in 1996 in Japan als een spel voor de Game Boy. De maker, Satoshi Tajiri, was als kind dol op insecten vangen. Hij wilde dat gevoel in een spel stoppen.",
    philosophyQuestion: "Wat zou jouw eigen Pokémon zijn, en welk bijzonder vermogen zou hij hebben?",
    deepDive: "De naam Pokémon komt van 'Pocket Monsters' — kleine monsters die je in je zak draagt. In het eerste spel waren er 151 Pokémon. Nu zijn er meer dan 1.000! Pikachu werd het gezicht van Pokémon, maar de eigenlijke starter-keuze was tussen Bulbasaur, Charmander en Squirtle. Elk jaar komen er nog nieuwe Pokémon bij."
  }
];

/* ── State ─────────────────────────────────────────────────────
   Simple state machine to track where James is in the flow.
──────────────────────────────────────────────────────────────── */
let currentWonder = null;
let lastWonderIndex = -1; // Prevents showing the same wonder twice in a row

/* ── DOM References ────────────────────────────────────────────
   Grabbed once at startup for performance.
──────────────────────────────────────────────────────────────── */
const screenHome       = document.getElementById('screen-home');
const screenTransition = document.getElementById('screen-transition');
const screenContent    = document.getElementById('screen-content');
const btnWonder        = document.getElementById('btn-wonder');
const canvas           = document.getElementById('canvas-particles');
const zoomOverlay      = document.getElementById('zoom-overlay');
const phase1El         = document.getElementById('phase-1');
const phase2El         = document.getElementById('phase-2');
const phase3El         = document.getElementById('phase-3');
const contentTitle     = document.getElementById('content-title');
const contentIntro     = document.getElementById('content-intro');
const contentPhilosophy= document.getElementById('content-philosophy');
const contentDeepdive  = document.getElementById('content-deepdive');
const btnLeesveder     = document.getElementById('btn-lees-verder');
const btnOpnieuw       = document.getElementById('btn-opnieuw');

/* ── Utility: show / hide screens ──────────────────────────── */
function showScreen(el) {
  [screenHome, screenTransition, screenContent].forEach(s => {
    s.classList.remove('active');
  });
  el.classList.add('active');
}

/* ── Utility: animate a phase in ──────────────────────────── */
function enterPhase(el) {
  el.classList.remove('hidden');
  el.classList.add('entering');
  el.addEventListener('animationend', () => el.classList.remove('entering'), { once: true });
}

/* ── Utility: button tactile shake ────────────────────────── */
function shakeButton(btn) {
  btn.classList.remove('btn-shake');
  // Force reflow so the class removal is applied before re-adding
  void btn.offsetWidth;
  btn.classList.add('btn-shake');
  btn.addEventListener('animationend', () => btn.classList.remove('btn-shake'), { once: true });
}

/* ── Pick a Wonder ─────────────────────────────────────────── */
function selectWonder() {
  let index;
  do {
    index = Math.floor(Math.random() * wonderLibrary.length);
  } while (index === lastWonderIndex && wonderLibrary.length > 1);
  lastWonderIndex = index;
  currentWonder = wonderLibrary[index];
}

/* ── Canvas Particle Explosion ─────────────────────────────── */
function runParticleExplosion(durationMs, onComplete) {
  const ctx = canvas.getContext('2d');

  // Match canvas to actual pixel size
  canvas.width  = canvas.offsetWidth;
  canvas.height = canvas.offsetHeight;

  const cx = canvas.width / 2;
  const cy = canvas.height / 2;
  const start = performance.now();
  const colors = ['#ff4444', '#ff8800', '#ffcc00', '#ffffff', '#ff2222', '#ffaaaa'];

  // Create 90 particles bursting from center
  const particles = Array.from({ length: 90 }, () => {
    const angle = Math.random() * Math.PI * 2;
    const speed = 3 + Math.random() * 9;
    return {
      x: cx,
      y: cy,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      radius: 2 + Math.random() * 5,
      color: colors[Math.floor(Math.random() * colors.length)],
      alpha: 1,
      decay: 0.012 + Math.random() * 0.018
    };
  });

  function frame(now) {
    const elapsed = now - start;
    const progress = Math.min(elapsed / durationMs, 1);

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    particles.forEach(p => {
      p.x  += p.vx;
      p.y  += p.vy;
      p.vy += 0.18; // subtle gravity
      p.alpha = Math.max(0, p.alpha - p.decay);

      ctx.beginPath();
      ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
      ctx.fillStyle = p.color;
      ctx.globalAlpha = p.alpha;
      ctx.fill();
    });

    ctx.globalAlpha = 1;

    if (progress < 1) {
      requestAnimationFrame(frame);
    } else {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      onComplete();
    }
  }

  requestAnimationFrame(frame);
}

/* ── Main Flow: Button Click → Transition ──────────────────── */
function startTransition() {
  // Haptic-style press feedback
  btnWonder.classList.add('pressed');
  setTimeout(() => btnWonder.classList.remove('pressed'), 180);

  selectWonder();
  showScreen(screenTransition);

  // Run particles for 700ms, then trigger zoom
  runParticleExplosion(700, () => {
    zoomOverlay.classList.add('zooming');
    zoomOverlay.addEventListener('animationend', () => {
      zoomOverlay.classList.remove('zooming');
      showPhase1();
    }, { once: true });
  });
}

/* ── Phase 1: Title + Intro ────────────────────────────────── */
function showPhase1() {
  // Populate content
  contentTitle.textContent      = currentWonder.title;
  contentIntro.textContent      = currentWonder.intro;
  contentPhilosophy.textContent = currentWonder.philosophyQuestion;
  contentDeepdive.textContent   = currentWonder.deepDive;

  // Reset phases to hidden
  phase1El.classList.add('hidden');
  phase2El.classList.add('hidden');
  phase3El.classList.add('hidden');

  showScreen(screenContent);

  // Small delay before entering so the screen fade-in settles
  setTimeout(() => {
    enterPhase(phase1El);
    // Phase 2 auto-advances after James has time to read
    setTimeout(showPhase2, 2800);
  }, 200);
}

/* ── Phase 2: Philosophy Question ──────────────────────────── */
function showPhase2() {
  enterPhase(phase2El);
  shakeButton(btnLeesveder);
}

/* ── Phase 3: Deep Dive ────────────────────────────────────── */
function showPhase3() {
  shakeButton(btnLeesveder);
  // Brief delay for the shake to complete before hiding the button
  setTimeout(() => {
    enterPhase(phase3El);
    // Scroll smoothly to the new content
    phase3El.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, 200);
}

/* ── Reset to Home ─────────────────────────────────────────── */
function resetToHome() {
  shakeButton(btnOpnieuw);
  setTimeout(() => {
    showScreen(screenHome);
    // Scroll content back to top for next round
    document.querySelector('.content-scroll').scrollTop = 0;
  }, 200);
}

/* ── Event Listeners ───────────────────────────────────────── */
btnWonder.addEventListener('click', startTransition);
btnLeesveder.addEventListener('click', showPhase3);
btnOpnieuw.addEventListener('click', resetToHome);

/* ── Initial State ─────────────────────────────────────────── */
// Show the home screen when the page loads
showScreen(screenHome);
