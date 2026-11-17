import {api, json, preview} from '../api.js';

const stage = document.querySelector('#stage');
const sum = values => values.reduce((total, n) => total + n, 0);
const percent = (n, total) => total ? Math.round(n * 100 / total) : 0;
let settings, questions, statistics, counts, status, hasResults = false;
let index = 0, paused = false, timer, slides;
const surveyUrl = preview ? '../' : 'https://myjob.cosla.gov.uk/coslaconf/';
const qr = preview ? '' : '<img src="../assets/survey-qr.png" alt="QR code for the survey">';

function header(tag) {
  return `<header class="header"><div class="brandline"><img src="../assets/logo.svg" alt="myjobscotland"><span>COSLA Conference</span></div>
    <div class="tag">${tag}</div></header>`;
}
function welcome() {
  const participate = preview ? '<a href="../">Open preview survey on this device</a>' : `<a href="${surveyUrl}">${qr}<div class="scan">SCAN TO TAKE PART</div></a>`;
  return `${header('HAVE YOUR SAY')}<div class="promo-panel">
    <h1>RECRUITMENT:<br>WHAT WOULD YOU DO?</h1><div class="lead">Four decisions. Have your say.</div>
    <p class="sub">myjobscotland is a COSLA service supporting recruitment across Scotland's local government.</p>
    <div class="lead">Take part on a stand tablet${preview ? '' : ' or scan the QR code'}. Anonymous · About one minute</div></div>
    <div class="qr-panel">${participate}</div>`;
}
function value() {
  const figures = statistics.figures.map(({value, label}, i) => i === 3
    ? `<div class="stat-slim"><strong>${value}</strong><span>${label}</span></div>`
    : `<div class="stat ${i === 0 ? 'strong' : ''}"><div class="num">${value}</div><div class="desc">${label}</div></div>`);
  return `${header('A COSLA SERVICE')}<div class="stats-panel"><h1>${statistics.headline}</h1>
    <div class="stats-grid">${figures.join('')}</div><div class="stats-foot">${statistics.note}</div></div>`;
}
function summary(q, i) {
  const row = counts[i];
  const total = sum(row);
  const top = Math.max(...row);
  const tied = q.answers.filter((_, option) => row[option] === top);
  const p = percent(top, total);
  const names = !total ? 'Awaiting responses' : tied.length > 1 ? 'Tie · ' + tied.join(' / ') : tied[0];
  return `<section class="minor"><h2>${q.short}</h2><div class="minor-answer">${names}</div>
    <div class="minor-bottom">${total ? `<span class="mini-percent">${p}%</span><div class="mini-track"><div class="mini-fill" style="width:${p}%"></div></div>` : ''}</div></section>`;
}
function results(focus) {
  const q = questions[focus];
  const row = counts[focus];
  const total = sum(row);
  const ranked = q.answers.map((name, i) => ({name, n: row[i], i})).sort((a,b) => b.n - a.n || a.i - b.i);
  const chart = ranked.map(({name,n}) => {
    const p = percent(n,total);
    return `<div class="chart-row"><div class="bar-label">${name}</div><div class="track">
      <div class="bar ${n && n === ranked[0].n ? 'lead' : ''}" style="width:${total ? n * 100 / total : 0}%"></div></div>
      <div class="pct">${p}%</div><div class="votes">${n} ${n === 1 ? 'vote' : 'votes'}</div></div>`;
  });
  return `${header(status)}<div class="dashboard"><article class="hero"><h1>${q.short}</h1>
    <div class="question">${q.question}</div><div class="chart">${chart.join('')}</div>
    <div class="hero-footer"><span>${total} responses to this question</span>
    <span>${total ? '' : hasResults ? 'Be the first to have your say!' : 'Awaiting live totals'}</span></div></article>
    <aside class="small-list">${questions.map((item,i) => i === focus ? '' : summary(item,i)).join('')}</aside></div>
    <div class="statusline">${total} completed ${total === 1 ? 'survey' : 'surveys'}</div>
    ${qr ? `<a class="results-qr" href="${surveyUrl}" aria-label="Take the survey">${qr}</a>` : ''}`;
}
function renderResults() {
  slides.forEach(({element, slide}) => {
    if (slide.type === 'results') element.querySelector('.content').innerHTML = results(slide.question);
  });
}
async function refresh() {
  try {
    const data = await json(api + 'display-results');
    const matrix = data.questions?.map(q => q.counts);
    if (!Array.isArray(matrix) || matrix.length !== 4 ||
        !Number.isSafeInteger(data.total) || data.total < 0 ||
        !matrix.every(row => Array.isArray(row) && row.length === 5 &&
          row.every(n => Number.isSafeInteger(n) && n >= 0) && sum(row) === data.total)) {
      throw new Error('Unexpected results schema');
    }
    counts = matrix;
    hasResults = true;
    status = 'LIVE RESULTS';
  } catch {
    status = hasResults ? 'RESULTS TEMPORARILY NOT UPDATING' : 'LIVE RESULTS TEMPORARILY UNAVAILABLE';
  }
  renderResults();
  setTimeout(refresh, settings.pollSeconds * 1000);
}
function setSlide(next) {
  index = (next + slides.length) % slides.length;
  slides.forEach(({element}, i) => {
    element.classList.toggle('active', i === index);
    element.inert = i !== index;
  });
  document.querySelector('#counter').textContent = `${index + 1} / ${slides.length}`;
  clearTimeout(timer);
  if (!paused) timer = setTimeout(() => setSlide(index + 1), slides[index].slide.seconds * 1000);
}
function resize() {
  stage.style.transform = `scale(${Math.min(innerWidth / 1600, innerHeight / 900)})`;
}
try {
  [settings, questions, statistics] = await Promise.all([
    json('playlist.json'), json('../questions.json'), json('statistics.json')
  ]);
  counts = questions.map(q => q.answers.map(() => 0));
  status = 'CONNECTING TO LIVE RESULTS';
  stage.style.setProperty('--fade', settings.transitionSeconds + 's');
  slides = settings.slides.map(slide => {
    const element = document.createElement('section');
    element.className = 'slide ' + slide.type;
    if (slide.accent) element.style.setProperty('--teal', slide.accent);
    element.innerHTML = `<img class="landscape" src="../assets/${slide.art}" alt=""><div class="base"></div>
      <div class="content">${slide.type === 'welcome' ? welcome() : slide.type === 'value' ? value() : results(slide.question)}</div>`;
    stage.append(element);
    return {element, slide};
  });
  resize();
  addEventListener('resize', resize);
  setSlide(0);
  refresh();
  document.querySelector('#next').onclick = () => setSlide(index + 1);
  document.querySelector('#prev').onclick = () => setSlide(index - 1);
  document.querySelector('#pause').onclick = event => {
    paused = !paused;
    event.currentTarget.textContent = paused ? '▶' : 'Ⅱ';
    event.currentTarget.title = paused ? 'Resume rotation' : 'Pause rotation';
    setSlide(index);
  };
  document.querySelector('#fullscreen').onclick = async () => {
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
      else await document.documentElement.requestFullscreen();
    } catch {}
  };
  document.addEventListener('keydown', event => {
    const controls = {ArrowRight:'next', ArrowLeft:'prev', f:'fullscreen', F:'fullscreen'};
    const control = controls[event.key] || (event.key === ' ' && !event.target.closest('button,a') ? 'pause' : null);
    if (control) { event.preventDefault(); document.getElementById(control).click(); }
  });
} catch {
  stage.textContent = 'The slideshow could not load. Retrying…';
  resize();
  setTimeout(() => location.reload(), 5000);
}
