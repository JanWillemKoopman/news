/* ═══════════════════════════════════════════════════════════════
   James' Wonder-App — Immersive Experience
   Vanilla JS · Canvas 2D starfield · GSAP animations
   No external JS dependencies beyond GSAP (loaded via CDN).
═══════════════════════════════════════════════════════════════ */
'use strict';

/* ─── Config ────────────────────────────────────────────── */
const CFG = {
  STAR_COUNT:      200,   // ambient starfield particles
  BURST_COUNT:     90,    // transition burst particles
  BURST_DURATION:  700,   // ms
  PHASE_1_DELAY:   150,   // ms after screen show
  PHASE_2_DELAY:   2800,  // ms after phase 1 (reading time)
};

/* ─── Wonder Library ────────────────────────────────────── */
const WONDERS = [
  {
    category: 'space',
    emoji: '🌕',
    label: 'Ruimte',
    title: 'De Maanlanding',
    intro: 'Op 20 juli 1969 zette een mens voor het eerst voet op de maan. Dat was Neil Armstrong. Hij deed één kleine stap — maar het was een reuzenstap voor alle mensen op aarde.',
    question: 'Als jij op de maan mocht staan en naar de aarde keek — wat zou je dan denken?',
    deepdive: 'De reis naar de maan duurde vier dagen. De astronauten hadden niet eens een computer zo krachtig als jouw telefoon — en toch kwamen ze veilig terug. Er liepen maar 12 mensen op de maan. Nog niemand is er daarna naartoe gegaan. De eerste woorden op de maan waren: "De Adelaar is geland."',
    quiz: { question: 'Hoeveel mensen liepen er ooit op de maan?', answers: [{ text: '12 mensen', correct: true }, { text: '3 mensen' }, { text: '50 mensen' }] },
  },
  {
    category: 'history',
    emoji: '🕊️',
    label: 'Geschiedenis',
    title: 'De Tweede Wereldoorlog',
    intro: 'Tussen 1940 en 1945 was Nederland bezet door een land dat Duitsland heette. Mensen mochten niet meer vrij zijn. Heel veel mensen zijn in die tijd gestorven.',
    question: 'Waarom denk jij dat het zo belangrijk is dat mensen vrijheid hebben?',
    deepdive: 'In Amsterdam verstopte een meisje van 13 jaar, Anne Frank, zich met haar familie twee jaar lang in een geheim huis. Ze schreef alles op in een dagboek. Dat dagboek kun je nu nog lezen. Op 5 mei 1945 was Nederland eindelijk vrij — dat vieren we elk jaar op Bevrijdingsdag.',
    quiz: { question: 'Op welke dag werd Nederland bevrijd van de bezetting?', answers: [{ text: '5 mei 1945', correct: true }, { text: '8 mei 1940' }, { text: '1 september 1939' }] },
  },
  {
    category: 'history',
    emoji: '💰',
    label: 'Economie',
    title: 'De Rijkste Persoon Ter Wereld',
    intro: 'Sommige mensen hebben zo veel geld dat je het bijna niet kunt tellen. De rijkste mensen ter wereld hebben meer geld dan hele landen.',
    question: 'Wat zou jij doen als je meer geld had dan je ooit kon uitgeven?',
    deepdive: 'Elon Musk heeft zoveel geld dat hij zijn eigen raketbedrijf heeft gebouwd. Jeff Bezos begon met het verkopen van boeken vanuit zijn garage — nu koopt bijna de hele wereld bij zijn bedrijf Amazon. Geld geeft je macht, maar heel veel rijke mensen zeggen dat vrienden en familie hen gelukkiger maken.',
    quiz: { question: 'Waarmee begon Jeff Bezos zijn bedrijf Amazon?', answers: [{ text: 'Boeken verkopen', correct: true }, { text: 'Kleding verkopen' }, { text: "Auto's verkopen" }] },
  },
  {
    category: 'science',
    emoji: '🕳️',
    label: 'Wetenschap',
    title: 'De Diepste Boring op Aarde',
    intro: 'In Rusland boorden mensen een gat in de grond — zo diep als 12 kilometer. Dat is het diepste gat dat mensen ooit hebben gemaakt. Ze stopten pas toen het te heet werd.',
    question: 'Wat denk jij dat er helemaal in het midden van de aarde zit?',
    deepdive: 'Op 12 kilometer diepte was het meer dan 180 graden Celsius — heter dan een oven! De boring heet de Kola Superdeep Borehole. Het project duurde 24 jaar. En toch hadden ze maar een klein stukje van de aardkorst bereikt. Het middelpunt van de aarde is nog 6.000 kilometer verder.',
    quiz: { question: 'Hoe diep is het diepste gat dat mensen ooit hebben geboord?', answers: [{ text: '12 kilometer', correct: true }, { text: '5 kilometer' }, { text: '100 kilometer' }] },
  },
  {
    category: 'history',
    emoji: '🇪🇺',
    label: 'Europa',
    title: 'Wat Is Europa?',
    intro: 'Europa is niet alleen een werelddeel — het is ook een samenwerking van landen. Die landen zijn de Europese Unie. Ze helpen elkaar en hebben samen afspraken gemaakt.',
    question: 'Als landen samenwerken, denk je dat dat de wereld beter of moeilijker maakt?',
    deepdive: 'Er zijn 27 landen lid van de Europese Unie. In veel landen betaal je met dezelfde munt: de euro. Mensen mogen vrij van land naar land reizen. Vroeger hadden al die landen vaker oorlog met elkaar — nu werken ze samen.',
    quiz: { question: 'Hoeveel landen zijn er lid van de Europese Unie?', answers: [{ text: '27 landen', correct: true }, { text: '15 landen' }, { text: '50 landen' }] },
  },
  {
    category: 'history',
    emoji: '🪙',
    label: 'Geschiedenis',
    title: 'De Nederlandse Gulden',
    intro: 'Voordat Nederland de euro had, betaalden mensen hier met de gulden. Dat was het Nederlandse geld. Op 1 januari 2002 verdween de gulden voor altijd.',
    question: 'Stel dat elk land zijn eigen geld heeft — wat zijn de voor- en nadelen daarvan?',
    deepdive: 'Op een gulden stond het gezicht van koningin Beatrix. Er waren munten van 5 cent (stuiver), 10 cent (dubbeltje) en 25 cent (kwartje). Een brood kostte vroeger maar een paar gulden. Nu is het Nederlands geld de euro, gedeeld door 26 andere landen.',
    quiz: { question: 'Wanneer verdween de gulden en kregen we de euro?', answers: [{ text: '1 januari 2002', correct: true }, { text: '1 januari 2000' }, { text: '1 januari 2010' }] },
  },
  {
    category: 'science',
    emoji: '🔬',
    label: 'Wetenschap',
    title: 'Wat Doet Een Wetenschapper?',
    intro: 'Wetenschappers stellen vragen over de wereld en zoeken antwoorden. Ze doen experimenten, schrijven het op en vertellen het aan anderen. Dankzij wetenschappers weten we zo ontzettend veel!',
    question: 'Als jij wetenschapper was, welke vraag zou jij dan als eerste willen beantwoorden?',
    deepdive: 'Er zijn heel veel soorten wetenschappers. Een bioloog bestudeert dieren en planten. Een astronoom kijkt naar sterren en planeten. Albert Einstein ontdekte dat tijd sneller of langzamer kan gaan, afhankelijk van hoe snel je beweegt. Dat klinkt als magie — maar het is gewoon wetenschap!',
    quiz: { question: 'Wat ontdekte Albert Einstein?', answers: [{ text: 'Dat tijd sneller of langzamer kan gaan', correct: true }, { text: 'Dat de aarde rond de zon draait' }, { text: 'Dat water uit H2O bestaat' }] },
  },
  {
    category: 'technology',
    emoji: '⚡',
    label: 'Technologie',
    title: 'Pokémon — Hoe Begon Het?',
    intro: 'Pokémon begon in 1996 in Japan als een spel voor de Game Boy. De maker, Satoshi Tajiri, was als kind dol op insecten vangen. Hij wilde dat gevoel in een spel stoppen.',
    question: 'Wat zou jouw eigen Pokémon zijn, en welk bijzonder vermogen zou hij hebben?',
    deepdive: 'De naam Pokémon komt van "Pocket Monsters" — kleine monsters die je in je zak draagt. In het eerste spel waren er 151 Pokémon. Nu zijn er meer dan 1.000! Pikachu werd het gezicht van Pokémon, maar de echte starter-keuze was tussen Bulbasaur, Charmander en Squirtle.',
    quiz: { question: 'Hoeveel Pokémon waren er in het allereerste Pokémon-spel?', answers: [{ text: '151', correct: true }, { text: '250' }, { text: '1000' }] },
  },
  {
    category: 'animals',
    emoji: '🐙',
    label: 'Dieren',
    title: 'De Octopus: Een Geniaal Dier',
    intro: 'Een octopus heeft drie harten, blauw bloed en negen hersenen! Elke arm heeft zijn eigen mini-brein. Ze zijn zo slim dat ze potten kunnen openen en vermommingen bedenken.',
    question: 'Als jij negen hersenen had, wat zou je dan tegelijkertijd denken?',
    deepdive: 'Octopussen leven maar 1 tot 3 jaar, maar in die tijd leren ze ontzettend veel. Ze kunnen van kleur en textuur veranderen om zich te camoufleren — zelfs als ze kleurenblind zijn! Wetenschappers ontdekten dat octopussen dromen: ze veranderen van kleur terwijl ze slapen.',
    quiz: { question: 'Hoeveel harten heeft een octopus?', answers: [{ text: 'Drie harten', correct: true }, { text: 'Twee harten' }, { text: 'Één hart' }] },
  },
  {
    category: 'space',
    emoji: '🪐',
    label: 'Ruimte',
    title: 'Saturnus en Zijn Ringen',
    intro: 'Saturnus is de zesde planeet van de zon en heeft prachtige ringen van ijs en rotsblokken. De planeet is zo licht dat hij zou kunnen drijven op water!',
    question: 'Als er leven bestond op een maan van Saturnus — hoe zou dat er dan uitzien?',
    deepdive: 'Saturnus heeft 146 bekende manen — meer dan welke andere planeet dan ook. Zijn grootste maan, Titan, heeft meren vol vloeibaar gas. Een dag op Saturnus duurt maar 10,7 uur, maar een jaar duurt 29 aardse jaren.',
    quiz: { question: 'Hoeveel bekende manen heeft Saturnus?', answers: [{ text: '146 manen', correct: true }, { text: '12 manen' }, { text: '27 manen' }] },
  },
  {
    category: 'nature',
    emoji: '🌳',
    label: 'Natuur',
    title: 'Bomen Praten Met Elkaar',
    intro: 'Bomen staan er stil bij, maar ze communiceren constant. Via een netwerk van schimmels in de grond sturen ze suikers en signalen naar elkaar — wetenschappers noemen dit het "Wood Wide Web".',
    question: 'Als bomen konden praten, wat zouden ze dan het liefst aan ons vertellen?',
    deepdive: 'Moederbomen — de oudste, grootste bomen in een bos — herkennen hun eigen kinderen en sturen hen extra voedingsstoffen. Als een boom aangevallen wordt door insecten, stuurt hij via de schimmeldraden een waarschuwing naar zijn buren. Het bos is eigenlijk één groot levend netwerk.',
    quiz: { question: 'Hoe noemen wetenschappers het netwerk waarmee bomen communiceren?', answers: [{ text: 'Wood Wide Web', correct: true }, { text: 'Boom Internet' }, { text: 'Groene Weg' }] },
  },
  {
    category: 'technology',
    emoji: '🌐',
    label: 'Technologie',
    title: 'Hoe Werkt Het Internet?',
    intro: 'Het internet is een enorm netwerk van computers die met elkaar praten. Als jij een filmpje bekijkt, reist die data in milliseconden van een computer ergens in de wereld naar jouw scherm.',
    question: 'Stel je voor dat het internet één dag uitvalt — wat zou er dan op de wereld veranderen?',
    deepdive: 'Het internet werd uitgevonden door het Amerikaanse leger in de jaren \'60. De eerste boodschap ooit op het internet was "lo" — het systeem crashte voor het woord "login" compleet was! Elke dag worden er meer dan 300 miljard e-mails verstuurd.',
    quiz: { question: 'Wat was de eerste boodschap ooit verstuurd op het internet?', answers: [{ text: '"lo"', correct: true }, { text: '"hello"' }, { text: '"start"' }] },
  },
  {
    category: 'animals',
    emoji: '🐋',
    label: 'Dieren',
    title: 'De Blauwe Vinvis: Het Grootste Dier Ooit',
    intro: 'De blauwe vinvis is het grootste dier dat ooit op aarde heeft geleefd — groter dan welke dinosaurus dan ook. Zijn hart is zo groot als een auto!',
    question: 'Hoe denk jij dat het voelt om zo groot te zijn dat niemand je kan negeren?',
    deepdive: 'Een blauwe vinvis kan tot 33 meter lang worden en 200.000 kilo wegen. Zijn tong weegt al meer dan een olifant. Het geluid dat ze maken is het luidst van elk dier op aarde — je kunt het op 800 kilometer afstand horen onder water. Toch zijn het stille, vredige dieren.',
    quiz: { question: 'Hoe lang kan een blauwe vinvis worden?', answers: [{ text: '33 meter', correct: true }, { text: '15 meter' }, { text: '50 meter' }] },
  },
  {
    category: 'science',
    emoji: '⚛️',
    label: 'Wetenschap',
    title: 'Wat Is Een Atoom?',
    intro: 'Alles om je heen — de lucht, jouw lichaam, dit scherm — bestaat uit ontzettend kleine deeltjes die atomen heten. Ze zijn zo klein dat je er miljarden in een stofkorreltje kunt stoppen.',
    question: 'Als jij het allerkleinste deeltje ter wereld was, waar zou je dan zijn?',
    deepdive: 'Atomen bestaan voor het grootste deel uit... leegte! De kern in het midden is klein en de elektronen die eromheen draaien zijn enorm ver weg. Als een atoom zo groot was als een voetbalstadion, zou de kern ter grootte van een erwt in het midden liggen.',
    quiz: { question: 'Waaruit bestaat een atoom voor het grootste deel?', answers: [{ text: 'Leegte', correct: true }, { text: 'Water' }, { text: 'Energie' }] },
  },
  {
    category: 'nature',
    emoji: '🌋',
    label: 'Natuur',
    title: 'Vulkanen en Het Vuur van de Aarde',
    intro: 'Vulkanen zijn openingen in de aardkorst waardoor gesmolten steen — magma — naar buiten komt. Ze zijn gevaarlijk, maar ze hebben ook nieuw land en vruchtbare grond gecreëerd.',
    question: 'Als de aarde een levend wezen was, zouden vulkanen dan zijn ademhaling zijn?',
    deepdive: 'Hawaii is volledig door vulkanen gemaakt! Het eiland bestaat uit gestolde lava die miljoenen jaren geleden uitstroomde. De grootste vulkaan op aarde is de Mauna Loa — gemeten vanaf de zeebodem is hij groter dan de Mount Everest. Op dit moment zijn er zo\'n 1.500 actieve vulkanen op aarde.',
    quiz: { question: 'Hoeveel actieve vulkanen zijn er op dit moment op aarde?', answers: [{ text: 'Ongeveer 1.500', correct: true }, { text: 'Ongeveer 100' }, { text: 'Ongeveer 10.000' }] },
  },
];

/* ─── State ─────────────────────────────────────────────── */
let currentWonder    = null;
let lastWonder       = null;
let activeCategory   = null;
let completedWonders = []; // runtime: last 3 finished wonders (for quiz questions)
let quizQuestions    = [];
let currentQuizQ     = 0;

const LS_WONDER_COUNT = 'jw_wonder_count';
const LS_QUIZ_COUNT   = 'jw_quiz_count';

function getWonderCount() { return parseInt(localStorage.getItem(LS_WONDER_COUNT) || '0', 10); }
function getQuizCount()   { return parseInt(localStorage.getItem(LS_QUIZ_COUNT)   || '0', 10); }
function setWonderCount(n){ localStorage.setItem(LS_WONDER_COUNT, String(n)); }
function setQuizCount(n)  { localStorage.setItem(LS_QUIZ_COUNT,   String(n)); }

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/* ─── DOM References ────────────────────────────────────── */
const screenHero       = document.getElementById('screen-hero');
const screenTransition = document.getElementById('screen-transition');
const screenWonder     = document.getElementById('screen-wonder');
const screenQuiz       = document.getElementById('screen-quiz');
const btnWonder        = document.getElementById('btn-wonder');
const btnBack          = document.getElementById('btn-back');
const btnContinue      = document.getElementById('btn-lees-verder');
const btnNew           = document.getElementById('btn-opnieuw');
const canvasBurst      = document.getElementById('canvas-burst');
const portalFlash      = document.getElementById('portal-flash');
const bgCanvas         = document.getElementById('bg-canvas');
const phase1           = document.getElementById('phase-1');
const phase2           = document.getElementById('phase-2');
const phase3           = document.getElementById('phase-3');
const elTitle          = document.getElementById('content-title');
const elIntro          = document.getElementById('content-intro');
const elQuestion       = document.getElementById('content-philosophy');
const elDeepdive       = document.getElementById('content-deepdive');
const elEmoji          = document.getElementById('wonder-emoji');
const elCategoryTag    = document.getElementById('wonder-category-tag');
const wonderScroll     = document.getElementById('wonder-scroll');
const elQuizNum        = document.getElementById('quiz-q-num');
const elQuizQuestion   = document.getElementById('quiz-question');
const elQuizAnswers    = document.getElementById('quiz-answers');
const elQuizCard       = document.getElementById('quiz-card');
const quizDoneOverlay  = document.getElementById('quiz-done');
const btnQuizDone      = document.getElementById('btn-quiz-done');
const quizScoreWrap    = document.getElementById('quiz-score-wrap');
const elQuizScoreNum   = document.getElementById('quiz-score-num');

/* ─── Starfield ─────────────────────────────────────────── */
function initStarfield() {
  const ctx = bgCanvas.getContext('2d');
  let W, H, stars, raf;

  const COLORS = [
    null, null, null,           // mostly white
    'hsl(260,60%,90%)',         // purple tint
    'hsl(190,70%,90%)',         // teal tint
    'hsl(30,80%,90%)',          // gold tint
  ];

  function resize() {
    W = bgCanvas.width  = window.innerWidth;
    H = bgCanvas.height = window.innerHeight;
    stars = Array.from({ length: CFG.STAR_COUNT }, () => ({
      x:      Math.random() * W,
      y:      Math.random() * H,
      r:      0.25 + Math.random() * 1.6,
      speed:  0.04 + Math.random() * 0.1,
      phase:  Math.random() * Math.PI * 2,
      color:  COLORS[Math.floor(Math.random() * COLORS.length)] || '#ffffff',
    }));
  }

  let tick = 0;
  function draw() {
    raf = requestAnimationFrame(draw);
    tick++;
    ctx.clearRect(0, 0, W, H);
    for (let i = 0; i < stars.length; i++) {
      const s = stars[i];
      const alpha = 0.2 + 0.7 * (0.5 + 0.5 * Math.sin(tick * s.speed + s.phase));
      ctx.globalAlpha = alpha;
      ctx.fillStyle   = s.color;
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  resize();
  draw();
  window.addEventListener('resize', resize, { passive: true });
}

/* ─── Burst Particle Effect ─────────────────────────────── */
function runBurst(onComplete) {
  const ctx = canvasBurst.getContext('2d');
  canvasBurst.width  = window.innerWidth;
  canvasBurst.height = window.innerHeight;
  const cx = canvasBurst.width  / 2;
  const cy = canvasBurst.height / 2;

  const PALETTE = [
    '#7c3aed','#a78bfa','#06b6d4','#67e8f9',
    '#f59e0b','#fcd34d','#ec4899','#fff',
  ];

  const particles = Array.from({ length: CFG.BURST_COUNT }, () => {
    const angle = Math.random() * Math.PI * 2;
    const speed = 2.5 + Math.random() * 10;
    return {
      x: cx, y: cy,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      r: 1.5 + Math.random() * 4,
      color: PALETTE[Math.floor(Math.random() * PALETTE.length)],
      alpha: 1,
      decay: 0.012 + Math.random() * 0.018,
      tail: [],
    };
  });

  const start = performance.now();

  function frame(now) {
    const progress = (now - start) / CFG.BURST_DURATION;
    ctx.clearRect(0, 0, canvasBurst.width, canvasBurst.height);

    for (let i = 0; i < particles.length; i++) {
      const p = particles[i];
      p.tail.push({ x: p.x, y: p.y });
      if (p.tail.length > 5) p.tail.shift();

      p.x  += p.vx;
      p.y  += p.vy;
      p.vy += 0.18;
      p.vx *= 0.985;
      p.alpha = Math.max(0, p.alpha - p.decay);

      for (let t = 0; t < p.tail.length; t++) {
        const ratio = t / p.tail.length;
        ctx.beginPath();
        ctx.arc(p.tail[t].x, p.tail[t].y, p.r * ratio * 0.5, 0, Math.PI * 2);
        ctx.fillStyle   = p.color;
        ctx.globalAlpha = p.alpha * ratio * 0.25;
        ctx.fill();
      }

      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fillStyle   = p.color;
      ctx.globalAlpha = p.alpha;
      ctx.fill();
    }

    ctx.globalAlpha = 1;

    if (progress < 1) {
      requestAnimationFrame(frame);
    } else {
      ctx.clearRect(0, 0, canvasBurst.width, canvasBurst.height);
      onComplete();
    }
  }

  requestAnimationFrame(frame);
}

/* ─── Screen Management ─────────────────────────────────── */
function showScreen(el) {
  [screenHero, screenTransition, screenWonder, screenQuiz].forEach(s => s.classList.remove('active'));
  el.classList.add('active');
}

/* ─── Quiz ──────────────────────────────────────────────── */
function updateQuizScoreDisplay() {
  const count = getQuizCount();
  elQuizScoreNum.textContent = count;
  quizScoreWrap.style.display = count > 0 ? 'flex' : 'none';
}

function startQuiz() {
  const sources = completedWonders.length >= 3
    ? completedWonders.slice(-3)
    : [...completedWonders, ...shuffle(WONDERS.filter(w => !completedWonders.includes(w)))].slice(0, 3);
  quizQuestions = sources.map(w => w.quiz);
  currentQuizQ  = 0;
  quizDoneOverlay.hidden = true;
  showScreen(screenQuiz);
  renderQuestion(0);
}

function renderQuestion(index) {
  elQuizNum.textContent = index + 1;
  const q = quizQuestions[index];
  elQuizQuestion.textContent = q.question;
  elQuizAnswers.innerHTML = '';
  shuffle(q.answers).forEach(ans => {
    const btn = document.createElement('button');
    btn.className    = 'quiz-answer-btn';
    btn.textContent  = ans.text;
    btn.addEventListener('click', () => handleAnswer(btn, !!ans.correct));
    elQuizAnswers.appendChild(btn);
  });
}

function handleAnswer(btn, isCorrect) {
  if (btn.disabled) return;
  if (isCorrect) {
    btn.classList.add('correct');
    elQuizAnswers.querySelectorAll('.quiz-answer-btn').forEach(b => { b.disabled = true; });
    setTimeout(advanceQuiz, 900);
  } else {
    btn.classList.add('wrong');
    setTimeout(() => btn.classList.remove('wrong'), 650);
  }
}

function advanceQuiz() {
  currentQuizQ++;
  if (currentQuizQ < 3) {
    elQuizCard.classList.add('quiz-slide-out');
    elQuizCard.addEventListener('animationend', () => {
      elQuizCard.classList.remove('quiz-slide-out');
      renderQuestion(currentQuizQ);
      elQuizCard.classList.add('quiz-slide-in');
      elQuizCard.addEventListener('animationend', () => elQuizCard.classList.remove('quiz-slide-in'), { once: true });
    }, { once: true });
  } else {
    completeQuiz();
  }
}

function completeQuiz() {
  setQuizCount(getQuizCount() + 1);
  updateQuizScoreDisplay();
  quizDoneOverlay.hidden = false;
  if (typeof gsap !== 'undefined') {
    gsap.fromTo('.quiz-done-card',
      { scale: 0.55, opacity: 0, y: 40 },
      { scale: 1, opacity: 1, y: 0, duration: 0.65, ease: 'elastic.out(1, 0.6)' }
    );
  }
}

/* ─── Phase Reveal ──────────────────────────────────────── */
function enterPhase(el) {
  el.classList.remove('hidden', 'entering');
  // Force reflow so animation replays
  void el.offsetWidth;
  el.classList.add('entering');
  el.addEventListener('animationend', () => el.classList.remove('entering'), { once: true });
}

/* ─── Wonder Selection ──────────────────────────────────── */
function pickWonder(category) {
  const pool = category
    ? WONDERS.filter(w => w.category === category)
    : WONDERS;

  const active = pool.length > 0 ? pool : WONDERS;
  let pick, attempts = 0;
  do {
    pick = active[Math.floor(Math.random() * active.length)];
    attempts++;
  } while (pick === lastWonder && active.length > 1 && attempts < 15);

  lastWonder    = pick;
  currentWonder = pick;
}

/* ─── Main Flow ─────────────────────────────────────────── */
function startDiscovery(category) {
  pickWonder(category);

  // Button press tactile feedback via GSAP
  const core = btnWonder.querySelector('.cosmos-core');
  if (typeof gsap !== 'undefined' && core) {
    gsap.to(core, {
      scale: 0.86,
      duration: 0.1,
      ease: 'power2.in',
      onComplete() {
        gsap.to(core, { scale: 1, duration: 0.5, ease: 'elastic.out(1.3,0.5)' });
      },
    });
  }

  showScreen(screenTransition);

  runBurst(() => {
    portalFlash.classList.remove('flash-go');
    void portalFlash.offsetWidth;
    portalFlash.classList.add('flash-go');
    portalFlash.addEventListener('animationend', () => {
      portalFlash.classList.remove('flash-go');
      revealWonder();
    }, { once: true });
  });
}

function revealWonder() {
  // Set category theme
  screenWonder.className = `screen cat-${currentWonder.category}`;

  // Populate content
  elTitle.textContent      = currentWonder.title;
  elIntro.textContent      = currentWonder.intro;
  elQuestion.textContent   = currentWonder.question;
  elDeepdive.textContent   = currentWonder.deepdive;
  elEmoji.textContent      = currentWonder.emoji;
  elCategoryTag.textContent = currentWonder.label;

  // Reset phases
  [phase1, phase2, phase3].forEach(p => {
    p.classList.remove('entering');
    p.classList.add('hidden');
  });
  wonderScroll.scrollTop = 0;

  showScreen(screenWonder);

  setTimeout(() => enterPhase(phase1),                            CFG.PHASE_1_DELAY);
  setTimeout(() => enterPhase(phase2), CFG.PHASE_1_DELAY + CFG.PHASE_2_DELAY);
}

function showPhase3() {
  enterPhase(phase3);
  setTimeout(() => phase3.scrollIntoView({ behavior: 'smooth', block: 'start' }), 120);
}

function goHome() {
  if (typeof gsap !== 'undefined') {
    gsap.to(screenWonder, {
      opacity: 0,
      y: 16,
      duration: 0.3,
      ease: 'power2.in',
      onComplete() {
        gsap.set(screenWonder, { clearProps: 'all' });
        showScreen(screenHero);
      },
    });
  } else {
    showScreen(screenHero);
  }
}

/* ─── Touch Ripple Easter Egg ───────────────────────────── */
function spawnRipple(x, y) {
  const el = document.createElement('div');
  el.style.cssText = [
    'position:fixed',
    `left:${x}px`,
    `top:${y}px`,
    'width:2px',
    'height:2px',
    'border-radius:50%',
    'background:radial-gradient(circle,rgba(124,58,237,0.55),transparent 70%)',
    'pointer-events:none',
    'z-index:999',
    'transform:translate(-50%,-50%)',
    'animation:ripple-expand 0.7s ease-out forwards',
  ].join(';');
  document.body.appendChild(el);
  setTimeout(() => el.remove(), 750);
}

/* ─── Events ────────────────────────────────────────────── */
btnWonder.addEventListener('click', () => startDiscovery(activeCategory));
btnBack.addEventListener('click', goHome);
btnContinue.addEventListener('click', showPhase3);
btnNew.addEventListener('click', () => {
  completedWonders.push(currentWonder);
  if (completedWonders.length > 3) completedWonders.shift();
  const newCount = getWonderCount() + 1;
  if (newCount >= 3) {
    setWonderCount(0);
    startQuiz();
  } else {
    setWonderCount(newCount);
    startDiscovery(activeCategory);
  }
});
btnQuizDone.addEventListener('click', () => {
  quizDoneOverlay.hidden = true;
  startDiscovery(activeCategory);
});

// Prevent navigating away from quiz with hardware back button
history.pushState(null, '', location.href);
window.addEventListener('popstate', () => {
  if (screenQuiz.classList.contains('active')) {
    history.pushState(null, '', location.href);
  }
});

// Category pills
document.querySelectorAll('.world-pill').forEach(pill => {
  pill.addEventListener('click', () => {
    const cat = pill.dataset.category;
    if (activeCategory === cat) {
      activeCategory = null;
      pill.classList.remove('pill-active');
    } else {
      document.querySelectorAll('.world-pill').forEach(p => p.classList.remove('pill-active'));
      activeCategory = cat;
      pill.classList.add('pill-active');
    }
  });

  // Long-press (600ms) → immediately launch that category
  let pressTimer;
  pill.addEventListener('pointerdown', () => {
    pressTimer = setTimeout(() => startDiscovery(pill.dataset.category), 600);
  });
  ['pointerup', 'pointerleave', 'pointercancel'].forEach(ev =>
    pill.addEventListener(ev, () => clearTimeout(pressTimer))
  );
});

// Tap ripple on wonder screen (anywhere not a button)
screenWonder.addEventListener('pointerdown', e => {
  if (!e.target.closest('button')) spawnRipple(e.clientX, e.clientY);
}, { passive: true });

/* ─── Hero Entry Animation ──────────────────────────────── */
function animateHeroIn() {
  if (typeof gsap === 'undefined') return;
  gsap.timeline({ defaults: { ease: 'expo.out' } })
    .from('.hero-badge',      { y: 22, opacity: 0, duration: 0.7, delay: 0.15 })
    .from('.hero-title',      { y: 32, opacity: 0, duration: 0.8              }, '-=0.45')
    .from('.hero-sub',        { y: 22, opacity: 0, duration: 0.7              }, '-=0.55')
    .from('.btn-cosmos-wrap', { scale: 0.78, opacity: 0, duration: 1.0, ease: 'elastic.out(1,0.6)' }, '-=0.5')
    .from('.worlds-label',    { y: 16, opacity: 0, duration: 0.6              }, '-=0.4')
    .from('.worlds-scroll',   { y: 16, opacity: 0, duration: 0.6              }, '-=0.55')
    .from('.hero-scroll-hint',{ opacity: 0, duration: 0.5                     }, '-=0.3');
}

/* ─── Init ──────────────────────────────────────────────── */
initStarfield();
updateQuizScoreDisplay();
showScreen(screenHero);

if (document.readyState === 'complete') {
  animateHeroIn();
} else {
  window.addEventListener('load', animateHeroIn);
}
