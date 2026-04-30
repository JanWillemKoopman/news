'use strict';

const CFG = {
  STAR_COUNT:     200,
  BURST_COUNT:    90,
  BURST_DURATION: 700,
  PHASE_1_DELAY:  150,
  PHASE_2_DELAY:  2800,
  QUIZ_EVERY:     3,
};

const API = {
  me:               '/api/auth/me',
  login:            '/api/auth/login',
  register:         '/api/auth/register',
  logout:           '/api/auth/logout',
  securityQuestion: '/api/auth/security-question',
  resetPassword:    '/api/auth/reset-password',
  wonder:           '/api/progress/wonder',
  wonderReset:      '/api/progress/wonder/reset',
  quiz:             '/api/progress/quiz',
};

const WONDERS = [
  {
    category: 'space', emoji: '🌕', label: 'Ruimte',
    title: 'De Maanlanding',
    intro: 'Op 20 juli 1969 zette een mens voor het eerst voet op de maan. Dat was Neil Armstrong. Hij deed één kleine stap — maar het was een reuzenstap voor alle mensen op aarde.',
    question: 'Als jij op de maan mocht staan en naar de aarde keek — wat zou je dan denken?',
    deepdive: 'De reis naar de maan duurde vier dagen. De astronauten hadden niet eens een computer zo krachtig als jouw telefoon — en toch kwamen ze veilig terug. Er liepen maar 12 mensen op de maan. Nog niemand is er daarna naartoe gegaan. De eerste woorden op de maan waren: "De Adelaar is geland."',
    quiz: { question: 'Wie was de eerste mens op de maan?', answers: [{ text: 'Neil Armstrong', correct: true }, { text: 'Buzz Aldrin' }, { text: 'Yuri Gagarin' }] },
  },
  {
    category: 'history', emoji: '🕊️', label: 'Geschiedenis',
    title: 'De Tweede Wereldoorlog',
    intro: 'Tussen 1940 en 1945 was Nederland bezet door een land dat Duitsland heette. Mensen mochten niet meer vrij zijn. Heel veel mensen zijn in die tijd gestorven.',
    question: 'Waarom denk jij dat het zo belangrijk is dat mensen vrijheid hebben?',
    deepdive: 'In Amsterdam verstopte een meisje van 13 jaar, Anne Frank, zich met haar familie twee jaar lang in een geheim huis. Ze schreef alles op in een dagboek. Dat dagboek kun je nu nog lezen. Op 5 mei 1945 was Nederland eindelijk vrij — dat vieren we elk jaar op Bevrijdingsdag.',
    quiz: { question: 'Op welke dag viert Nederland Bevrijdingsdag?', answers: [{ text: '5 mei', correct: true }, { text: '4 mei' }, { text: '8 mei' }] },
  },
  {
    category: 'history', emoji: '💰', label: 'Economie',
    title: 'De Rijkste Persoon Ter Wereld',
    intro: 'Sommige mensen hebben zo veel geld dat je het bijna niet kunt tellen. De rijkste mensen ter wereld hebben meer geld dan hele landen.',
    question: 'Wat zou jij doen als je meer geld had dan je ooit kon uitgeven?',
    deepdive: 'Elon Musk heeft zoveel geld dat hij zijn eigen raketbedrijf heeft gebouwd. Jeff Bezos begon met het verkopen van boeken vanuit zijn garage — nu koopt bijna de hele wereld bij zijn bedrijf Amazon. Geld geeft je macht, maar heel veel rijke mensen zeggen dat vrienden en familie hen gelukkiger maken.',
    quiz: { question: 'Waarmee begon Jeff Bezos zijn bedrijf Amazon?', answers: [{ text: 'Boeken verkopen', correct: true }, { text: 'Raketten bouwen' }, { text: 'Computers repareren' }] },
  },
  {
    category: 'science', emoji: '🕳️', label: 'Wetenschap',
    title: 'De Diepste Boring op Aarde',
    intro: 'In Rusland boorden mensen een gat in de grond — zo diep als 12 kilometer. Dat is het diepste gat dat mensen ooit hebben gemaakt. Ze stopten pas toen het te heet werd.',
    question: 'Wat denk jij dat er helemaal in het midden van de aarde zit?',
    deepdive: 'Op 12 kilometer diepte was het meer dan 180 graden Celsius — heter dan een oven! De boring heet de Kola Superdeep Borehole. Het project duurde 24 jaar. En toch hadden ze maar een klein stukje van de aardkorst bereikt. Het middelpunt van de aarde is nog 6.000 kilometer verder.',
    quiz: { question: 'Hoe heet de diepste boring op aarde?', answers: [{ text: 'Kola Superdeep Borehole', correct: true }, { text: 'Mariana Deep Drill' }, { text: 'Siberia Core Project' }] },
  },
  {
    category: 'history', emoji: '🇪🇺', label: 'Europa',
    title: 'Wat Is Europa?',
    intro: 'Europa is niet alleen een werelddeel — het is ook een samenwerking van landen. Die landen zijn de Europese Unie. Ze helpen elkaar en hebben samen afspraken gemaakt.',
    question: 'Als landen samenwerken, denk je dat dat de wereld beter of moeilijker maakt?',
    deepdive: 'Er zijn 27 landen lid van de Europese Unie. In veel landen betaal je met dezelfde munt: de euro. Mensen mogen vrij van land naar land reizen. Vroeger hadden al die landen vaker oorlog met elkaar — nu werken ze samen.',
    quiz: { question: 'Hoeveel landen zijn lid van de Europese Unie?', answers: [{ text: '27', correct: true }, { text: '32' }, { text: '19' }] },
  },
  {
    category: 'history', emoji: '🪙', label: 'Geschiedenis',
    title: 'De Nederlandse Gulden',
    intro: 'Voordat Nederland de euro had, betaalden mensen hier met de gulden. Dat was het Nederlandse geld. Op 1 januari 2002 verdween de gulden voor altijd.',
    question: 'Stel dat elk land zijn eigen geld heeft — wat zijn de voor- en nadelen daarvan?',
    deepdive: 'Op een gulden stond het gezicht van koningin Beatrix. Er waren munten van 5 cent (stuiver), 10 cent (dubbeltje) en 25 cent (kwartje). Een brood kostte vroeger maar een paar gulden. Nu is het Nederlands geld de euro, gedeeld door 26 andere landen.',
    quiz: { question: 'Wanneer verdween de Nederlandse gulden?', answers: [{ text: '1 januari 2002', correct: true }, { text: '1 januari 2000' }, { text: '1 januari 1999' }] },
  },
  {
    category: 'science', emoji: '🔬', label: 'Wetenschap',
    title: 'Wat Doet Een Wetenschapper?',
    intro: 'Wetenschappers stellen vragen over de wereld en zoeken antwoorden. Ze doen experimenten, schrijven het op en vertellen het aan anderen. Dankzij wetenschappers weten we zo ontzettend veel!',
    question: 'Als jij wetenschapper was, welke vraag zou jij dan als eerste willen beantwoorden?',
    deepdive: 'Er zijn heel veel soorten wetenschappers. Een bioloog bestudeert dieren en planten. Een astronoom kijkt naar sterren en planeten. Albert Einstein ontdekte dat tijd sneller of langzamer kan gaan, afhankelijk van hoe snel je beweegt. Dat klinkt als magie — maar het is gewoon wetenschap!',
    quiz: { question: 'Wat ontdekte Albert Einstein?', answers: [{ text: 'Dat tijd sneller of langzamer kan gaan', correct: true }, { text: 'De zwaartekracht' }, { text: 'Het periodiek systeem' }] },
  },
  {
    category: 'technology', emoji: '⚡', label: 'Technologie',
    title: 'Pokémon — Hoe Begon Het?',
    intro: 'Pokémon begon in 1996 in Japan als een spel voor de Game Boy. De maker, Satoshi Tajiri, was als kind dol op insecten vangen. Hij wilde dat gevoel in een spel stoppen.',
    question: 'Wat zou jouw eigen Pokémon zijn, en welk bijzonder vermogen zou hij hebben?',
    deepdive: 'De naam Pokémon komt van "Pocket Monsters" — kleine monsters die je in je zak draagt. In het eerste spel waren er 151 Pokémon. Nu zijn er meer dan 1.000! Pikachu werd het gezicht van Pokémon, maar de echte starter-keuze was tussen Bulbasaur, Charmander en Squirtle.',
    quiz: { question: 'Hoeveel Pokémon waren er in het eerste spel?', answers: [{ text: '151', correct: true }, { text: '251' }, { text: '100' }] },
  },
  {
    category: 'animals', emoji: '🐙', label: 'Dieren',
    title: 'De Octopus: Een Geniaal Dier',
    intro: 'Een octopus heeft drie harten, blauw bloed en negen hersenen! Elke arm heeft zijn eigen mini-brein. Ze zijn zo slim dat ze potten kunnen openen en vermommingen bedenken.',
    question: 'Als jij negen hersenen had, wat zou je dan tegelijkertijd denken?',
    deepdive: 'Octopussen leven maar 1 tot 3 jaar, maar in die tijd leren ze ontzettend veel. Ze kunnen van kleur en textuur veranderen om zich te camoufleren — zelfs als ze kleurenblind zijn! Wetenschappers ontdekten dat octopussen dromen: ze veranderen van kleur terwijl ze slapen.',
    quiz: { question: 'Hoeveel harten heeft een octopus?', answers: [{ text: 'Drie', correct: true }, { text: 'Twee' }, { text: 'Één' }] },
  },
  {
    category: 'space', emoji: '🪐', label: 'Ruimte',
    title: 'Saturnus en Zijn Ringen',
    intro: 'Saturnus is de zesde planeet van de zon en heeft prachtige ringen van ijs en rotsblokken. De planeet is zo licht dat hij zou kunnen drijven op water!',
    question: 'Als er leven bestond op een maan van Saturnus — hoe zou dat er dan uitzien?',
    deepdive: 'Saturnus heeft 146 bekende manen — meer dan welke andere planeet dan ook. Zijn grootste maan, Titan, heeft meren vol vloeibaar gas. Een dag op Saturnus duurt maar 10,7 uur, maar een jaar duurt 29 aardse jaren.',
    quiz: { question: 'Hoeveel bekende manen heeft Saturnus?', answers: [{ text: '146', correct: true }, { text: '27' }, { text: '79' }] },
  },
  {
    category: 'nature', emoji: '🌳', label: 'Natuur',
    title: 'Bomen Praten Met Elkaar',
    intro: 'Bomen staan er stil bij, maar ze communiceren constant. Via een netwerk van schimmels in de grond sturen ze suikers en signalen naar elkaar — wetenschappers noemen dit het "Wood Wide Web".',
    question: 'Als bomen konden praten, wat zouden ze dan het liefst aan ons vertellen?',
    deepdive: 'Moederbomen — de oudste, grootste bomen in een bos — herkennen hun eigen kinderen en sturen hen extra voedingsstoffen. Als een boom aangevallen wordt door insecten, stuurt hij via de schimmeldraden een waarschuwing naar zijn buren. Het bos is eigenlijk één groot levend netwerk.',
    quiz: { question: 'Hoe noemen wetenschappers het communicatienetwerk van bomen?', answers: [{ text: 'Wood Wide Web', correct: true }, { text: 'Forest Network' }, { text: 'Root Internet' }] },
  },
  {
    category: 'technology', emoji: '🌐', label: 'Technologie',
    title: 'Hoe Werkt Het Internet?',
    intro: 'Het internet is een enorm netwerk van computers die met elkaar praten. Als jij een filmpje bekijkt, reist die data in milliseconden van een computer ergens in de wereld naar jouw scherm.',
    question: 'Stel je voor dat het internet één dag uitvalt — wat zou er dan op de wereld veranderen?',
    deepdive: 'Het internet werd uitgevonden door het Amerikaanse leger in de jaren \'60. De eerste boodschap ooit op het internet was "lo" — het systeem crashte voor het woord "login" compleet was! Elke dag worden er meer dan 300 miljard e-mails verstuurd.',
    quiz: { question: 'Wat was de eerste boodschap ooit op het internet?', answers: [{ text: '"lo"', correct: true }, { text: '"hello"' }, { text: '"test"' }] },
  },
  {
    category: 'animals', emoji: '🐋', label: 'Dieren',
    title: 'De Blauwe Vinvis: Het Grootste Dier Ooit',
    intro: 'De blauwe vinvis is het grootste dier dat ooit op aarde heeft geleefd — groter dan welke dinosaurus dan ook. Zijn hart is zo groot als een auto!',
    question: 'Hoe denk jij dat het voelt om zo groot te zijn dat niemand je kan negeren?',
    deepdive: 'Een blauwe vinvis kan tot 33 meter lang worden en 200.000 kilo wegen. Zijn tong weegt al meer dan een olifant. Het geluid dat ze maken is het luidst van elk dier op aarde — je kunt het op 800 kilometer afstand horen onder water. Toch zijn het stille, vredige dieren.',
    quiz: { question: 'Hoe lang kan een blauwe vinvis worden?', answers: [{ text: '33 meter', correct: true }, { text: '20 meter' }, { text: '50 meter' }] },
  },
  {
    category: 'science', emoji: '⚛️', label: 'Wetenschap',
    title: 'Wat Is Een Atoom?',
    intro: 'Alles om je heen — de lucht, jouw lichaam, dit scherm — bestaat uit ontzettend kleine deeltjes die atomen heten. Ze zijn zo klein dat je er miljarden in een stofkorreltje kunt stoppen.',
    question: 'Als jij het allerkleinste deeltje ter wereld was, waar zou je dan zijn?',
    deepdive: 'Atomen bestaan voor het grootste deel uit... leegte! De kern in het midden is klein en de elektronen die eromheen draaien zijn enorm ver weg. Als een atoom zo groot was als een voetbalstadion, zou de kern ter grootte van een erwt in het midden liggen.',
    quiz: { question: 'Waaruit bestaat het grootste deel van een atoom?', answers: [{ text: 'Leegte', correct: true }, { text: 'Elektronen' }, { text: 'Protonen' }] },
  },
  {
    category: 'nature', emoji: '🌋', label: 'Natuur',
    title: 'Vulkanen en Het Vuur van de Aarde',
    intro: 'Vulkanen zijn openingen in de aardkorst waardoor gesmolten steen — magma — naar buiten komt. Ze zijn gevaarlijk, maar ze hebben ook nieuw land en vruchtbare grond gecreëerd.',
    question: 'Als de aarde een levend wezen was, zouden vulkanen dan zijn ademhaling zijn?',
    deepdive: 'Hawaii is volledig door vulkanen gemaakt! Het eiland bestaat uit gestolde lava die miljoenen jaren geleden uitstroomde. De grootste vulkaan op aarde is de Mauna Loa — gemeten vanaf de zeebodem is hij groter dan de Mount Everest. Op dit moment zijn er zo\'n 1.500 actieve vulkanen op aarde.',
    quiz: { question: 'Welk eiland is volledig door vulkanen gemaakt?', answers: [{ text: 'Hawaii', correct: true }, { text: 'IJsland' }, { text: 'Sicilië' }] },
  },
];

/* ─── State ─────────────────────────────────────────────── */
let currentUser    = null;
let seenTitles     = [];
let wonderCount    = 0;
let quizCount      = 0;
let currentWonder  = null;
let lastWonder     = null;
let activeCategory = null;
let pendingSinceQuiz = 0;
let quizQueue      = [];
let quizIndex      = 0;
let quizScore      = 0;

/* ─── DOM References ────────────────────────────────────── */
const screenAuth       = document.getElementById('screen-auth');
const screenHero       = document.getElementById('screen-hero');
const screenTransition = document.getElementById('screen-transition');
const screenWonder     = document.getElementById('screen-wonder');
const screenQuiz       = document.getElementById('screen-quiz');

const authUsernameEl        = document.getElementById('auth-username');
const authPasswordEl        = document.getElementById('auth-password');
const authSubmitBtn         = document.getElementById('auth-submit-btn');
const authToggleBtn         = document.getElementById('auth-toggle-btn');
const authForgotBtn         = document.getElementById('auth-forgot-btn');
const authErrorEl           = document.getElementById('auth-error');
const authSubEl             = document.getElementById('auth-sub');
const authRegisterFields    = document.getElementById('auth-register-fields');
const authSecurityQuestion  = document.getElementById('auth-security-question');
const authSecurityAnswer    = document.getElementById('auth-security-answer');

const heroGreeting    = document.getElementById('hero-greeting');
const statWonders     = document.getElementById('stat-wonders');
const statQuizzes     = document.getElementById('stat-quizzes');
const btnWonder       = document.getElementById('btn-wonder');
const btnBack         = document.getElementById('btn-back');
const btnContinue     = document.getElementById('btn-lees-verder');
const btnNew          = document.getElementById('btn-opnieuw');
const btnLogout       = document.getElementById('btn-logout');
const canvasBurst     = document.getElementById('canvas-burst');
const portalFlash     = document.getElementById('portal-flash');
const bgCanvas        = document.getElementById('bg-canvas');
const phase1          = document.getElementById('phase-1');
const phase2          = document.getElementById('phase-2');
const phase3          = document.getElementById('phase-3');
const elTitle         = document.getElementById('content-title');
const elIntro         = document.getElementById('content-intro');
const elQuestion      = document.getElementById('content-philosophy');
const elDeepdive      = document.getElementById('content-deepdive');
const elEmoji         = document.getElementById('wonder-emoji');
const elCategoryTag   = document.getElementById('wonder-category-tag');
const wonderScroll    = document.getElementById('wonder-scroll');

const quizProgressFill = document.getElementById('quiz-progress-fill');
const quizQNum         = document.getElementById('quiz-q-num');
const quizQuestionEl   = document.getElementById('quiz-question');
const quizAnswersEl    = document.getElementById('quiz-answers');

const quizOverlay      = document.getElementById('quiz-complete-overlay');
const quizCompleteSub  = document.getElementById('quiz-complete-sub');
const quizCompleteStats= document.getElementById('quiz-complete-stats');
const btnQuizDone      = document.getElementById('btn-quiz-done');

/* ─── Starfield ─────────────────────────────────────────── */
function initStarfield() {
  const ctx = bgCanvas.getContext('2d');
  let W, H, stars, raf;
  const COLORS = [null,null,null,'hsl(260,60%,90%)','hsl(190,70%,90%)','hsl(30,80%,90%)'];
  function resize() {
    W = bgCanvas.width  = window.innerWidth;
    H = bgCanvas.height = window.innerHeight;
    stars = Array.from({ length: CFG.STAR_COUNT }, () => ({
      x: Math.random()*W, y: Math.random()*H,
      r: 0.25+Math.random()*1.6, speed: 0.04+Math.random()*0.1,
      phase: Math.random()*Math.PI*2,
      color: COLORS[Math.floor(Math.random()*COLORS.length)] || '#ffffff',
    }));
  }
  let tick = 0;
  function draw() {
    raf = requestAnimationFrame(draw); tick++;
    ctx.clearRect(0,0,W,H);
    for (let i=0; i<stars.length; i++) {
      const s = stars[i];
      ctx.globalAlpha = 0.2+0.7*(0.5+0.5*Math.sin(tick*s.speed+s.phase));
      ctx.fillStyle = s.color;
      ctx.beginPath(); ctx.arc(s.x,s.y,s.r,0,Math.PI*2); ctx.fill();
    }
    ctx.globalAlpha = 1;
  }
  resize(); draw();
  window.addEventListener('resize', resize, { passive: true });
}

/* ─── Burst ─────────────────────────────────────────────── */
function runBurst(onComplete) {
  const ctx = canvasBurst.getContext('2d');
  canvasBurst.width  = window.innerWidth;
  canvasBurst.height = window.innerHeight;
  const cx = canvasBurst.width/2, cy = canvasBurst.height/2;
  const PAL = ['#7c3aed','#a78bfa','#06b6d4','#67e8f9','#f59e0b','#fcd34d','#ec4899','#fff'];
  const particles = Array.from({ length: CFG.BURST_COUNT }, () => {
    const angle = Math.random()*Math.PI*2, speed = 2.5+Math.random()*10;
    return { x:cx, y:cy, vx:Math.cos(angle)*speed, vy:Math.sin(angle)*speed,
             r:1.5+Math.random()*4, color:PAL[Math.floor(Math.random()*PAL.length)],
             alpha:1, decay:0.012+Math.random()*0.018, tail:[] };
  });
  const start = performance.now();
  function frame(now) {
    const progress = (now-start)/CFG.BURST_DURATION;
    ctx.clearRect(0,0,canvasBurst.width,canvasBurst.height);
    for (let i=0; i<particles.length; i++) {
      const p = particles[i];
      p.tail.push({x:p.x,y:p.y}); if (p.tail.length>5) p.tail.shift();
      p.x+=p.vx; p.y+=p.vy; p.vy+=0.18; p.vx*=0.985;
      p.alpha = Math.max(0,p.alpha-p.decay);
      for (let t=0; t<p.tail.length; t++) {
        const ratio = t/p.tail.length;
        ctx.beginPath(); ctx.arc(p.tail[t].x,p.tail[t].y,p.r*ratio*0.5,0,Math.PI*2);
        ctx.fillStyle=p.color; ctx.globalAlpha=p.alpha*ratio*0.25; ctx.fill();
      }
      ctx.beginPath(); ctx.arc(p.x,p.y,p.r,0,Math.PI*2);
      ctx.fillStyle=p.color; ctx.globalAlpha=p.alpha; ctx.fill();
    }
    ctx.globalAlpha=1;
    if (progress<1) requestAnimationFrame(frame);
    else { ctx.clearRect(0,0,canvasBurst.width,canvasBurst.height); onComplete(); }
  }
  requestAnimationFrame(frame);
}

/* ─── Screen Management ─────────────────────────────────── */
function showScreen(el) {
  [screenAuth,screenHero,screenTransition,screenWonder,screenQuiz].forEach(s=>s.classList.remove('active'));
  el.classList.add('active');
}

/* ─── Phase Reveal ──────────────────────────────────────── */
function enterPhase(el) {
  el.classList.remove('hidden','entering');
  void el.offsetWidth;
  el.classList.add('entering');
  el.addEventListener('animationend',()=>el.classList.remove('entering'),{once:true});
}

/* ─── Stats ─────────────────────────────────────────────── */
function updateStats() {
  statWonders.textContent  = `✦ ${wonderCount} wonder${wonderCount===1?'':'s'}`;
  statQuizzes.textContent  = `${quizCount} quiz${quizCount===1?'':'zen'}`;
}

/* ─── Wonder Selection ──────────────────────────────────── */
function pickWonder(category) {
  let pool = category ? WONDERS.filter(w=>w.category===category) : WONDERS;
  if (!pool.length) pool = WONDERS;

  let unseen = pool.filter(w=>!seenTitles.includes(w.title));
  if (!unseen.length) {
    seenTitles = [];
    fetch(API.wonderReset, {method:'POST'}).catch(()=>{});
    unseen = pool;
  }

  let pick, attempts = 0;
  do {
    pick = unseen[Math.floor(Math.random()*unseen.length)];
    attempts++;
  } while (pick===lastWonder && unseen.length>1 && attempts<15);

  lastWonder = pick;
  currentWonder = pick;
}

/* ─── Main Flow ─────────────────────────────────────────── */
function startDiscovery(category) {
  pickWonder(category);
  const core = btnWonder.querySelector('.cosmos-core');
  if (typeof gsap!=='undefined'&&core) {
    gsap.to(core,{scale:0.86,duration:0.1,ease:'power2.in',
      onComplete(){gsap.to(core,{scale:1,duration:0.5,ease:'elastic.out(1.3,0.5)'})}});
  }
  showScreen(screenTransition);
  runBurst(()=>{
    portalFlash.classList.remove('flash-go');
    void portalFlash.offsetWidth;
    portalFlash.classList.add('flash-go');
    portalFlash.addEventListener('animationend',()=>{
      portalFlash.classList.remove('flash-go');
      revealWonder();
    },{once:true});
  });
}

function revealWonder() {
  screenWonder.className = `screen cat-${currentWonder.category}`;
  elTitle.textContent     = currentWonder.title;
  elIntro.textContent     = currentWonder.intro;
  elQuestion.textContent  = currentWonder.question;
  elDeepdive.textContent  = currentWonder.deepdive;
  elEmoji.textContent     = currentWonder.emoji;
  elCategoryTag.textContent = currentWonder.label;
  [phase1,phase2,phase3].forEach(p=>{p.classList.remove('entering');p.classList.add('hidden');});
  wonderScroll.scrollTop = 0;
  showScreen(screenWonder);
  setTimeout(()=>enterPhase(phase1), CFG.PHASE_1_DELAY);
  setTimeout(()=>enterPhase(phase2), CFG.PHASE_1_DELAY+CFG.PHASE_2_DELAY);
}

function showPhase3() {
  enterPhase(phase3);
  setTimeout(()=>phase3.scrollIntoView({behavior:'smooth',block:'start'}),120);
}

function goHome() {
  if (typeof gsap!=='undefined') {
    gsap.to(screenWonder,{opacity:0,y:16,duration:0.3,ease:'power2.in',
      onComplete(){gsap.set(screenWonder,{clearProps:'all'});showScreen(screenHero);}});
  } else { showScreen(screenHero); }
}

/* ─── Mark wonder done, maybe trigger quiz ──────────────── */
async function onWonderCompleted() {
  if (!currentWonder) return;
  seenTitles.push(currentWonder.title);
  pendingSinceQuiz++;

  try {
    const res = await fetch(API.wonder,{method:'POST',headers:{'Content-Type':'application/json'},
      body:JSON.stringify({title:currentWonder.title})});
    if (res.ok) {
      const data = await res.json();
      wonderCount = data.wonder_count;
      quizCount   = data.quiz_count;
      seenTitles  = data.seen_titles;
      updateStats();
    }
  } catch(_) {}

  if (pendingSinceQuiz>=CFG.QUIZ_EVERY) {
    pendingSinceQuiz = 0;
    startQuiz();
  } else {
    startDiscovery(activeCategory);
  }
}

/* ─── Quiz Logic ────────────────────────────────────────── */
function startQuiz() {
  const last3 = seenTitles.slice(-3).map(t=>WONDERS.find(w=>w.title===t)).filter(Boolean);
  quizQueue = last3.map(w=>w.quiz).filter(Boolean);
  if (!quizQueue.length) { startDiscovery(activeCategory); return; }
  quizIndex = 0; quizScore = 0;
  showScreen(screenQuiz);
  renderQuizQuestion();
}

function renderQuizQuestion() {
  const q = quizQueue[quizIndex];
  quizQNum.textContent = quizIndex+1;
  quizProgressFill.style.width = `${((quizIndex)/quizQueue.length)*100}%`;
  quizQuestionEl.textContent = q.question;

  quizAnswersEl.innerHTML = '';
  const shuffled = [...q.answers].sort(()=>Math.random()-0.5);
  shuffled.forEach(ans=>{
    const btn = document.createElement('button');
    btn.className = 'quiz-answer-btn';
    btn.textContent = ans.text;
    btn.addEventListener('click',()=>handleAnswer(btn,ans.correct,shuffled));
    quizAnswersEl.appendChild(btn);
  });
}

function handleAnswer(btn, correct, allAnswers) {
  const btns = quizAnswersEl.querySelectorAll('.quiz-answer-btn');
  btns.forEach(b=>{ b.disabled=true; });
  if (correct) {
    btn.classList.add('correct');
    quizScore++;
    setTimeout(()=>nextQuizStep(), 800);
  } else {
    btn.classList.add('wrong');
    setTimeout(()=>{
      btn.classList.remove('wrong');
      btns.forEach(b=>{ b.disabled=false; });
    }, 600);
  }
}

function nextQuizStep() {
  quizIndex++;
  if (quizIndex<quizQueue.length) {
    renderQuizQuestion();
  } else {
    quizProgressFill.style.width='100%';
    finishQuiz();
  }
}

async function finishQuiz() {
  try {
    const res = await fetch(API.quiz,{method:'POST',headers:{'Content-Type':'application/json'},
      body:JSON.stringify({score:quizScore})});
    if (res.ok) {
      const data = await res.json();
      quizCount   = data.quiz_count;
      wonderCount = data.wonder_count;
      updateStats();
    }
  } catch(_) {}

  quizCompleteSub.textContent = `Je beantwoordde ${quizScore} van de ${quizQueue.length} vragen goed!`;
  quizCompleteStats.innerHTML =
    `<strong>${wonderCount}</strong> wonders ontdekt &nbsp;·&nbsp; <strong>${quizCount}</strong> quiz${quizCount===1?'':'zen'} afgerond`;
  quizOverlay.style.display='flex';
}

/* ─── Auth ──────────────────────────────────────────────── */
// authMode: 'login' | 'register' | 'forgot-username' | 'forgot-answer'
let authMode = 'login';
let forgotUsername = '';

function setAuthError(msg) {
  authErrorEl.textContent = msg;
  authErrorEl.style.display = msg ? 'block' : 'none';
}

function setAuthMode(mode) {
  authMode = mode;
  setAuthError('');

  const isLogin    = mode === 'login';
  const isRegister = mode === 'register';
  const isForgotU  = mode === 'forgot-username';
  const isForgotA  = mode === 'forgot-answer';

  authUsernameEl.style.display     = isForgotA ? 'none' : '';
  authPasswordEl.style.display     = isForgotU  ? 'none' : '';
  authRegisterFields.style.display = (isRegister||isForgotA) ? 'flex' : 'none';
  authSecurityQuestion.style.display = isForgotA ? 'none' : '';
  authForgotBtn.style.display      = isLogin ? '' : 'none';
  authToggleBtn.style.display      = (isForgotU||isForgotA) ? 'none' : '';

  if (isLogin) {
    authSubEl.textContent = 'Log in om je voortgang bij te houden';
    authSubmitBtn.textContent = 'Inloggen';
    authToggleBtn.innerHTML = 'Nog geen account? <span>Registreer je hier</span>';
    authPasswordEl.autocomplete = 'current-password';
    authUsernameEl.placeholder = 'jouw naam';
  } else if (isRegister) {
    authSubEl.textContent = 'Maak een account aan';
    authSubmitBtn.textContent = 'Account aanmaken';
    authToggleBtn.innerHTML = 'Al een account? <span>Log hier in</span>';
    authPasswordEl.autocomplete = 'new-password';
    authUsernameEl.placeholder = 'jouw naam';
  } else if (isForgotU) {
    authSubEl.textContent = 'Vul je gebruikersnaam in';
    authSubmitBtn.textContent = 'Beveiligingsvraag ophalen';
    authUsernameEl.placeholder = 'jouw gebruikersnaam';
  } else if (isForgotA) {
    authSubEl.textContent = `Beantwoord de beveiligingsvraag voor "${forgotUsername}"`;
    authSubmitBtn.textContent = 'Wachtwoord opnieuw instellen';
    authPasswordEl.placeholder = 'nieuw wachtwoord';
    authPasswordEl.autocomplete = 'new-password';
    authSecurityAnswer.placeholder = 'jouw antwoord op de beveiligingsvraag';
  }
}

function toggleAuthMode() {
  setAuthMode(authMode === 'login' ? 'register' : 'login');
}

async function submitAuth() {
  authSubmitBtn.disabled = true;
  setAuthError('');
  try {
    if (authMode === 'login')          await doLogin();
    else if (authMode === 'register')  await doRegister();
    else if (authMode === 'forgot-username') await doForgotUsername();
    else if (authMode === 'forgot-answer')   await doForgotAnswer();
  } finally { authSubmitBtn.disabled = false; }
}

async function doLogin() {
  const username = authUsernameEl.value.trim();
  const password = authPasswordEl.value;
  if (!username || !password) { setAuthError('Vul alle velden in.'); return; }
  const res = await fetch(API.login,{method:'POST',headers:{'Content-Type':'application/json'},
    credentials:'include', body:JSON.stringify({username,password})});
  const data = await res.json();
  if (!res.ok) { setAuthError(data.error||'Er ging iets mis.'); return; }
  await loadUserAndEnter();
}

async function doRegister() {
  const username = authUsernameEl.value.trim();
  const password = authPasswordEl.value;
  const question = authSecurityQuestion.value;
  const answer   = authSecurityAnswer.value.trim();
  if (!username || !password || !question || !answer) { setAuthError('Vul alle velden in.'); return; }
  const res = await fetch(API.register,{method:'POST',headers:{'Content-Type':'application/json'},
    credentials:'include', body:JSON.stringify({username,password,security_question:question,security_answer:answer})});
  const data = await res.json();
  if (!res.ok) { setAuthError(data.error||'Er ging iets mis.'); return; }
  await loadUserAndEnter();
}

async function doForgotUsername() {
  const username = authUsernameEl.value.trim();
  if (!username) { setAuthError('Vul je gebruikersnaam in.'); return; }
  const res = await fetch(`${API.securityQuestion}?username=${encodeURIComponent(username)}`);
  const data = await res.json();
  if (!res.ok) { setAuthError(data.error||'Gebruiker niet gevonden.'); return; }
  forgotUsername = username;
  authSubEl.textContent = data.question;
  setAuthMode('forgot-answer');
}

async function doForgotAnswer() {
  const answer      = authPasswordEl.value.trim();
  const newPassword = authPasswordEl.value;
  // We repurpose the password field: first line is answer, but UX-wise let's use two separate prompts.
  // Actually for simplicity: password field = security answer, then new password shown after.
  // Better: use a dedicated sub-step. We'll use password field as new password and answer from a prompt.
  // Simplest: reuse authSecurityAnswer input (show it for this step).
  const secAnswer   = authSecurityAnswer.value.trim();
  const newPass     = authPasswordEl.value;
  if (!secAnswer || !newPass) { setAuthError('Vul het antwoord en een nieuw wachtwoord in.'); return; }
  const res = await fetch(API.resetPassword,{method:'POST',headers:{'Content-Type':'application/json'},
    body:JSON.stringify({username:forgotUsername, security_answer:secAnswer, new_password:newPass})});
  const data = await res.json();
  if (!res.ok) { setAuthError(data.error||'Antwoord onjuist.'); return; }
  authPasswordEl.value = '';
  authSecurityAnswer.value = '';
  setAuthError('');
  authSubEl.textContent = 'Wachtwoord opnieuw ingesteld! Je kunt nu inloggen.';
  setAuthMode('login');
}

async function loadUserAndEnter() {
  try {
    const res = await fetch(API.me,{credentials:'include'});
    if (!res.ok) { showScreen(screenAuth); return; }
    const data = await res.json();
    currentUser  = {id:data.id, username:data.username};
    wonderCount  = data.wonder_count;
    quizCount    = data.quiz_count;
    seenTitles   = data.seen_titles||[];
    heroGreeting.textContent = `Hé ${data.username}!`;
    updateStats();
    showScreen(screenHero);
    animateHeroIn();
  } catch(_) { showScreen(screenAuth); }
}

async function logout() {
  await fetch(API.logout,{method:'POST',credentials:'include'}).catch(()=>{});
  currentUser=null; seenTitles=[]; wonderCount=0; quizCount=0; pendingSinceQuiz=0;
  authUsernameEl.value=''; authPasswordEl.value='';
  setAuthError('');
  showScreen(screenAuth);
}

/* ─── Touch Ripple ──────────────────────────────────────── */
function spawnRipple(x,y) {
  const el = document.createElement('div');
  el.style.cssText=[
    'position:fixed',`left:${x}px`,`top:${y}px`,'width:2px','height:2px',
    'border-radius:50%','background:radial-gradient(circle,rgba(124,58,237,0.55),transparent 70%)',
    'pointer-events:none','z-index:999','transform:translate(-50%,-50%)',
    'animation:ripple-expand 0.7s ease-out forwards',
  ].join(';');
  document.body.appendChild(el);
  setTimeout(()=>el.remove(),750);
}

/* ─── Hero Animation ────────────────────────────────────── */
function animateHeroIn() {
  if (typeof gsap==='undefined') return;
  gsap.timeline({defaults:{ease:'expo.out'}})
    .from('.hero-badge',     {y:22,opacity:0,duration:0.7,delay:0.15})
    .from('.hero-title',     {y:32,opacity:0,duration:0.8},'-=0.45')
    .from('.hero-sub',       {y:22,opacity:0,duration:0.7},'-=0.55')
    .from('.hero-stats',     {y:16,opacity:0,duration:0.6},'-=0.5')
    .from('.btn-cosmos-wrap',{scale:0.78,opacity:0,duration:1.0,ease:'elastic.out(1,0.6)'},'-=0.4')
    .from('.worlds-label',   {y:16,opacity:0,duration:0.6},'-=0.4')
    .from('.worlds-scroll',  {y:16,opacity:0,duration:0.6},'-=0.55')
    .from('.btn-logout',     {opacity:0,duration:0.4},'-=0.3');
}

/* ─── Event Listeners ───────────────────────────────────── */
authSubmitBtn.addEventListener('click', submitAuth);
authToggleBtn.addEventListener('click', toggleAuthMode);
authForgotBtn.addEventListener('click', ()=>setAuthMode('forgot-username'));
[authUsernameEl, authPasswordEl, authSecurityAnswer].forEach(el=>{
  el.addEventListener('keydown', e=>{ if(e.key==='Enter') submitAuth(); });
});

btnWonder.addEventListener('click',   ()=>startDiscovery(activeCategory));
btnBack.addEventListener('click',     goHome);
btnContinue.addEventListener('click', showPhase3);
btnLogout.addEventListener('click',   logout);
btnNew.addEventListener('click',      onWonderCompleted);
btnQuizDone.addEventListener('click', ()=>{
  quizOverlay.style.display='none';
  startDiscovery(activeCategory);
});

document.querySelectorAll('.world-pill').forEach(pill=>{
  pill.addEventListener('click',()=>{
    const cat = pill.dataset.category;
    if (activeCategory===cat) { activeCategory=null; pill.classList.remove('pill-active'); }
    else {
      document.querySelectorAll('.world-pill').forEach(p=>p.classList.remove('pill-active'));
      activeCategory=cat; pill.classList.add('pill-active');
    }
  });
  let pressTimer;
  pill.addEventListener('pointerdown',()=>{ pressTimer=setTimeout(()=>startDiscovery(pill.dataset.category),600); });
  ['pointerup','pointerleave','pointercancel'].forEach(ev=>pill.addEventListener(ev,()=>clearTimeout(pressTimer)));
});

screenWonder.addEventListener('pointerdown',e=>{
  if (!e.target.closest('button')) spawnRipple(e.clientX,e.clientY);
},{passive:true});

/* ─── Init ──────────────────────────────────────────────── */
initStarfield();
loadUserAndEnter();
