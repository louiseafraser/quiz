let currentQuestion = 0;
let selectedAnswers = [];
let completionId = null;
let resultTimer = null;
let celebratedCompletion = null;

function calculateResult(answers) {
  const scores = Object.fromEntries(Object.keys(results).map(id => [id, 0]));
  answers.forEach(id => { scores[id] += 1; });
  const highest = Math.max(...Object.values(scores));
  // Latest question answered among the tied types wins; independent of display order.
  return [...answers].reverse().find(id => scores[id] === highest);
}
function shuffleArray(array) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
}
function showScreen(id) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  document.getElementById(id).classList.add('active');
  window.scrollTo(0, 0);
}
function startQuiz() {
  clearTimeout(resultTimer);
  selectedAnswers = [];
  currentQuestion = 0;
  completionId = crypto.randomUUID();
  showScreen('questionScreen');
  showQuestion();
}
function showQuestion() {
  const q = questions[currentQuestion];
  const heading = document.getElementById('questionText');
  heading.textContent = q.text;
  document.getElementById('progress').textContent = `Question ${currentQuestion + 1} of ${questions.length}`;
  document.getElementById('progressBar').style.width = ((currentQuestion + 1) / questions.length * 100) + '%';
  document.getElementById('progressContainer').setAttribute('aria-valuenow', currentQuestion + 1);
  const answersDiv = document.getElementById('answers');
  answersDiv.replaceChildren();
  const questionIndex = currentQuestion;
  shuffleArray([...q.answers]).forEach(answer => {
    const btn = document.createElement('button');
    btn.className = 'answerButton';
    btn.textContent = '✨ ' + answer.text;
    btn.onclick = () => {
      if (currentQuestion !== questionIndex) return;
      answersDiv.querySelectorAll('button').forEach(b => { b.disabled = true; });
      selectedAnswers.push(answer.main);
      currentQuestion++;
      if (currentQuestion < questions.length) showQuestion();
      else showResult();
    };
    answersDiv.appendChild(btn);
  });
  heading.focus({preventScroll: true});
}
function showResult() {
  const topType = calculateResult(selectedAnswers);
  const result = results[topType];
  showScreen('loadingScreen');
  document.getElementById('resultScreen').style.setProperty('--result-colour', result.color);
  document.getElementById('resultTitle').textContent = result.title;
  document.getElementById('resultSummary').textContent = result.summary;
  // Save before showing the result; failure never blocks the delegate.
  queueCompletion(completionId, topType);
  resultTimer = setTimeout(() => {
    showScreen('resultScreen');
    document.getElementById('resultTitle').focus({preventScroll: true});
    if (celebratedCompletion !== completionId) {
      celebratedCompletion = completionId;
      launchConfetti(result.color);
    }
  }, 2000);
}
function restartQuiz() {
  clearTimeout(resultTimer);
  selectedAnswers = [];
  currentQuestion = 0;
  completionId = null;
  document.getElementById('resultTitle').textContent = '';
  document.getElementById('resultSummary').textContent = '';
  document.querySelectorAll('.confetti').forEach(c => c.remove());
  showScreen('startScreen');
}
function launchConfetti(color) {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  for (let i = 0; i < 40; i++) {
    const confetti = document.createElement('div');
    confetti.className = 'confetti';
    const palette = [color, color, `color-mix(in srgb, ${color} 55%, white)`, `color-mix(in srgb, ${color} 70%, black)`, '#F2FBFC'];
    confetti.style.backgroundColor = palette[i % palette.length];
    confetti.style.left = Math.random() * 100 + 'vw';
    confetti.style.animationDuration = 2 + Math.random() * 2 + 's';
    document.body.appendChild(confetti);
    setTimeout(() => confetti.remove(), 4000);
  }
}
if (typeof module !== 'undefined') module.exports = {calculateResult, shuffleArray};
