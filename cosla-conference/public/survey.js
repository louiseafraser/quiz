import {api, json, preview} from './api.js';

const screen = document.querySelector('#survey');
const pendingKey = preview ? 'cosla-conference-preview-pending' : 'cosla-conference-live-pending';
const letters = 'ABCDE';
let questions, step = -1, answers = [], pending, busy = false, resetTimer;

function show(html) {
  screen.innerHTML = html;
  screen.querySelector('h1')?.focus();
  scrollTo(0, 0);
}
function welcome() {
  clearTimeout(resetTimer);
  if (!questions) { loadQuestions(); return; }
  answers = [];
  pending = null;
  step = -1;
  show(`<img class="landscape" src="assets/homepage.png" alt="">
    <section class="intro"><h1 tabindex="-1">RECRUITMENT: WHAT WOULD YOU DO?</h1>
    <h2>Four questions. Have your say.</h2>
    <p>How should Scotland's councils recruit, retain and develop the workforce of the future?</p>
    <button id="start">Start Survey</button></section>`);
  document.querySelector('#start').onclick = () => { step = 0; question(); };
}
function question() {
  const q = questions[step];
  const last = step === questions.length - 1;
  show(`<section class="question">
    <img class="banner" src="assets/${['highlands','edinburgh','glasgow','south'][step]}.png" alt="">
    <progress value="${step + 1}" max="4" aria-label="Survey progress"></progress>
    <div class="category">QUESTION ${step + 1} OF 4 — ${q.label}</div>
    <h1 tabindex="-1" id="prompt">${q.question}</h1>
    <form><fieldset aria-labelledby="prompt">${q.answers.map((title, index) => {
      const letter = letters[index];
      return `<label><input type="radio" name="answer" value="${letter}" ${answers[step] === letter ? 'checked' : ''}>
        <span class="letter">${letter}</span><span><strong>${title}</strong><br>${q.descriptions[index]}</span></label>`;
    }).join('')}</fieldset>
    <nav><button type="button" id="back" class="secondary">Back</button>
    <button id="next" ${answers[step] ? '' : 'disabled'}>${last ? 'Submit Answers' : 'Next'}</button></nav></form></section>`);
  const form = screen.querySelector('form');
  form.onchange = (event) => {
    answers[step] = event.target.value;
    form.querySelector('#next').disabled = false;
  };
  form.querySelector('#back').onclick = () => {
    if (step === 0) {
      step = -1;
      const selections = answers;
      welcome();
      answers = selections;
    } else {
      step--;
      question();
    }
  };
  form.onsubmit = (event) => {
    event.preventDefault();
    if (!answers[step]) return;
    if (!last) { step++; question(); return; }
    pending = {id: crypto.randomUUID(), answers: [...answers]};
    try { sessionStorage.setItem(pendingKey, JSON.stringify(pending)); } catch {}
    submit();
  };
}
async function submit() {
  if (busy) return;
  busy = true;
  show('<section class="intro"><h1 tabindex="-1">Submitting your answers…</h1><p role="status">Please wait.</p></section>');
  try {
    await json(api + 'complete', {
      method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify(pending)
    });
    try { sessionStorage.removeItem(pendingKey); } catch {}
    answers = [];
    pending = null;
    show(`<section class="intro"><h1 tabindex="-1">THANK YOU FOR HAVING YOUR SAY!</h1>
      <p>See how your views compare with other delegates on our live results screen.</p>
      <button id="restart">START AGAIN / NEXT PARTICIPANT</button></section>`);
    screen.querySelector('#restart').onclick = welcome;
    resetTimer = setTimeout(welcome, 15000);
  } catch {
    show(`<section class="intro"><h1 tabindex="-1">Your submission could not be confirmed</h1>
      <p>Check the connection, then retry. Your answers will only be counted once.</p>
      <button id="retry">Retry submission</button></section>`);
    screen.querySelector('#retry').onclick = submit;
  } finally {
    busy = false;
  }
}
async function loadQuestions() {
  try {
    questions = await json('questions.json');
    welcome();
  } catch {
    show('<section class="intro"><h1 tabindex="-1">The survey could not load</h1><button id="reload">Try again</button></section>');
    screen.querySelector('#reload').onclick = loadQuestions;
  }
}
try { pending = JSON.parse(sessionStorage.getItem(pendingKey)); } catch {}
if (pending) submit();
else loadQuestions();
