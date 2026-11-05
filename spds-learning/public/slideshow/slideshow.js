/* Framework-free TV display. Only anonymous aggregate totals are read here. */
const PERSONALITIES = [
  ['EX', 'Curious Explorer'], ['PP', 'Practical Pioneer'],
  ['CC', 'Collaborative Connector'], ['RT', 'Reflective Thinker'],
  ['SA', 'Strategic Achiever'], ['CH', 'Creative Challenger']
];
const preview = location.pathname.startsWith('/learning-preview/');
const endpoint = (preview ? '/learning-test-api' : '/learning-api') + '/display-results';
const stage = document.getElementById('stage');
const layers = [...document.querySelectorAll('.slide')];
let currentLayer = 0;
let latest = null;
let lastUpdated = null;
let unavailable = false;
let playlist;
let position = -1;
let controlsTimer;
const number = new Intl.NumberFormat('en-GB');

function validateTotals(data) {
  if (!data || !Number.isSafeInteger(data.total) || data.total < 0 || !data.personalities) throw Error('Invalid totals');
  const counts = {};
  for (const [id] of PERSONALITIES) {
    const count = data.personalities[id];
    if (!Number.isSafeInteger(count) || count < 0) throw Error('Invalid counts');
    counts[id] = count;
  }
  if (Object.values(counts).reduce((a, b) => a + b, 0) !== data.total) throw Error('Totals do not match');
  return {total: data.total, personalities: counts};
}
function validatePlaylist(data) {
  if (!data || !Array.isArray(data.slides) || !data.slides.length) throw Error('Empty playlist');
  const slides = data.slides.map(slide => {
    if (!slide || !['image', 'results'].includes(slide.type)) throw Error('Unknown slide type');
    if (!Number.isFinite(slide.duration) || slide.duration < 1 || slide.duration > 3600) throw Error('Invalid duration');
    if (slide.type === 'image') {
      if (typeof slide.src !== 'string' || !slide.src) throw Error('Missing image');
      const url = new URL(slide.src, location.href);
      if (url.origin !== location.origin) throw Error('Use images on this site');
    }
    return slide;
  });
  if (slides.filter(s => s.type === 'results').length !== 1) throw Error('Include exactly one results slide');
  return {
    slides,
    pollSeconds: Number.isFinite(data.pollSeconds) ? Math.min(300, Math.max(5, data.pollSeconds)) : 10,
    transitionMs: Number.isFinite(data.transitionMs) ? Math.min(2000, Math.max(0, data.transitionMs)) : 800
  };
}
function fitStage() {
  const scale = Math.min(innerWidth / 1920, innerHeight / 1080);
  stage.style.transform = `translate(${(innerWidth - 1920 * scale) / 2}px, ${(innerHeight - 1080 * scale) / 2}px) scale(${scale})`;
}
function resultsCard() {
  const card = document.createElement('div');
  card.className = 'results';
  card.innerHTML = `<span class="brand-cloud" aria-hidden="true"></span><header><div><p class="eyebrow">SPDS CONFERENCE · LIVE RESULTS</p><h1>What's your learning superpower?</h1><p class="subtitle">See how SPDS delegates are discovering their learning strengths.</p></div><div class="total"><strong data-total>—</strong><span>completed quizzes</span></div></header><div class="chart" role="list" aria-label="Learning superpower results"></div><p class="invitation">Pick up a tablet, take the quiz and collect your result card!</p><footer><span data-status></span><img src="../images/myjobscotland-logo.svg" alt="myjobscotland"></footer>`;
  const chart = card.querySelector('.chart');
  for (const [id, name] of PERSONALITIES) {
    const row = document.createElement('div');
    row.className = 'row';
    row.dataset.personality = id;
    row.setAttribute('role', 'listitem');
    row.innerHTML = '<span class="name"></span><div class="track" aria-hidden="true"><div class="fill" style="width:0%"></div></div><span class="value"><span data-count>—</span><small data-percent>—</small></span>';
    row.querySelector('.name').textContent = name;
    row.querySelector('.fill').style.backgroundColor = `var(--colour-${id.toLowerCase()})`;
    chart.appendChild(row);
  }
  return card;
}
function paintResults() {
  for (const card of document.querySelectorAll('.results')) {
    card.querySelector('[data-total]').textContent = latest ? number.format(latest.total) : '—';
    for (const [id] of PERSONALITIES) {
      const row = card.querySelector(`[data-personality="${id}"]`);
      const count = latest ? latest.personalities[id] : 0;
      const percentage = latest && latest.total ? count / latest.total * 100 : 0;
      row.querySelector('.fill').style.width = percentage + '%';
      row.querySelector('[data-count]').textContent = latest ? number.format(count) : '—';
      row.querySelector('[data-percent]').textContent = latest ? percentage.toFixed(1) + '%' : '—';
    }
    card.querySelector('[data-status]').textContent = !latest
      ? (unavailable ? 'Results temporarily unavailable · the slideshow will continue' : 'Connecting to live results…')
      : unavailable
        ? `Showing latest available results · updated ${lastUpdated.toLocaleTimeString('en-GB')}`
        : latest.total === 0 ? 'Be the first to discover your learning superpower!' : `Updated ${lastUpdated.toLocaleTimeString('en-GB')} · percentages rounded`;
  }
}
async function pollResults() {
  try {
    const response = await fetch(endpoint, {cache: 'no-store', signal: AbortSignal.timeout(6000)});
    if (!response.ok) throw Error('Results unavailable');
    latest = validateTotals(await response.json());
    lastUpdated = new Date();
    unavailable = false;
  } catch (_) { unavailable = true; }
  paintResults();
  setTimeout(pollResults, playlist.pollSeconds * 1000);
}
function fallback(message) {
  const card = document.createElement('div');
  card.className = 'message';
  const eyebrow = document.createElement('p');
  eyebrow.className = 'eyebrow'; eyebrow.textContent = 'SPDS CONFERENCE';
  const title = document.createElement('h1'); title.textContent = 'Keep learning. Keep connecting.';
  const text = document.createElement('p'); text.textContent = message;
  card.append(eyebrow, title, text);
  return card;
}
function loadImage(slide) {
  return new Promise(resolve => {
    const img = new Image();
    let done = false;
    function finish(node) { if (done) return; done = true; clearTimeout(timeout); resolve(node); }
    const timeout = setTimeout(() => finish(fallback('Discover your learning superpower at the myjobscotland stand.')), 4000);
    img.alt = slide.alt || 'Conference slide';
    img.onload = async () => {
      try { await img.decode(); } catch (_) {}
      finish(img);
    };
    img.onerror = () => finish(fallback('Discover your learning superpower at the myjobscotland stand.'));
    img.src = slide.src;
  });
}
async function advance() {
  position = (position + 1) % playlist.slides.length;
  const slide = playlist.slides[position];
  // Load off-screen with a bounded wait; missing assets cannot stop rotation.
  const node = slide.type === 'results' ? resultsCard() : await loadImage(slide);
  const nextLayer = 1 - currentLayer;
  layers[nextLayer].replaceChildren(node);
  if (slide.type === 'results') paintResults();
  layers[nextLayer].setAttribute('aria-hidden', 'false');
  layers[currentLayer].setAttribute('aria-hidden', 'true');
  layers[nextLayer].classList.add('active');
  layers[currentLayer].classList.remove('active');
  currentLayer = nextLayer;
  setTimeout(advance, slide.duration * 1000);
}
function showControls() {
  document.body.classList.add('controls');
  clearTimeout(controlsTimer);
  controlsTimer = setTimeout(() => document.body.classList.remove('controls'), 4000);
}
document.getElementById('fullscreen').onclick = async () => {
  try {
    if (document.fullscreenElement) await document.exitFullscreen();
    else await document.documentElement.requestFullscreen();
  } catch (_) { document.getElementById('fullscreen').textContent = 'Use browser fullscreen (F11)'; }
};
document.addEventListener('fullscreenchange', () => {
  document.getElementById('fullscreen').textContent = document.fullscreenElement ? 'Exit fullscreen' : 'Enter fullscreen';
});
window.addEventListener('resize', fitStage);
window.addEventListener('pointermove', showControls);
window.addEventListener('keydown', showControls);
window.addEventListener('online', () => { /* Next scheduled poll recovers automatically. */ });
fitStage();
showControls();
async function start() {
  try {
    const response = await fetch('playlist.json', {cache: 'no-store', signal: AbortSignal.timeout(6000)});
    if (!response.ok) throw Error('Playlist unavailable');
    playlist = validatePlaylist(await response.json());
    stage.style.setProperty('--transition', playlist.transitionMs + 'ms');
    pollResults();
    advance();
  } catch (_) {
    layers[currentLayer].replaceChildren(fallback('The playlist could not be loaded. Check playlist.json; retrying automatically…'));
    setTimeout(start, 15000);
  }
}
start();
