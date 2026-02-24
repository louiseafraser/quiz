const results = {
  hero: { 
    title: "The Everyday Hero", 
    gif: "gifs/everyday-hero.gif",
    color: "#E63946"
  },
  care: { 
    title: "The Care Champion", 
    gif: "gifs/care-champion.gif",
    color: "#D64573"
  },
  life: { 
    title: "The Life Guide", 
    gif: "gifs/life-guide.gif",
    color: "#1D3557"
  },
  fixer: { 
    title: "The Skilled Fixer", 
    gif: "gifs/skilled-fixer.gif",
    color: "#F4A261"
  },
  outdoor: { 
    title: "The Outdoor Optimiser", 
    gif: "gifs/outdoor-optimiser.gif",
    color: "#2A9D8F"
  },
  inspector: { 
    title: "The Sharp Inspector", 
    gif: "gifs/sharp-inspector.gif",
    color: "#4A4A4A"
  },
  connector: { 
    title: "The Community Connector", 
    gif: "gifs/community-connector.gif",
    color: "#00B4D8"
  },
  strategist: { 
    title: "The Service Strategist", 
    gif: "gifs/service-strategist.gif",
    color: "#6A4C93"
  }
};

let scores;
let currentQuestion = 0;

const questions = [
  {
    text: "What sounds most enjoyable?",
    answers: [
      { text: "Responding when something urgent happens", main:"hero" },
      { text: "Supporting someone day to day", main:"care", secondary:"life" },
      { text: "Fixing or building something", main:"fixer" },
      { text: "Working outdoors", main:"outdoor" },
      { text: "Solving a complex problem", main:"inspector", secondary:"life" },
      { text: "Running or organising an activity", main:"strategist", secondary:"connector" }
    ]
  },
  {
    text: "What do people usually notice about you?",
    answers: [
      { text: "I stay calm in stressful situations", main:"hero" },
      { text: "I’m patient and kind", main:"care", secondary:"life" },
      { text: "I’m practical", main:"fixer" },
      { text: "I’m energetic", main:"outdoor" },
      { text: "I notice details others miss", main:"inspector", secondary:"life" },
      { text: "I’m organised", main:"strategist", secondary:"connector" }
    ]
  },
  {
    text: "Which task would you pick first?",
    answers: [
      { text: "A team challenge with pressure", main:"hero" },
      { text: "Helping someone who is struggling", main:"care", secondary:"life" },
      { text: "Repairing or assembling equipment", main:"fixer" },
      { text: "Improving an outdoor space", main:"outdoor" },
      { text: "Investigating why something went wrong", main:"inspector", secondary:"life" },
      { text: "Planning an event or project", main:"strategist", secondary:"connector" }
    ]
  },
  {
    text: "What motivates you most?",
    answers: [
      { text: "Keeping people safe", main:"hero" },
      { text: "Making people feel supported", main:"care", secondary:"life" },
      { text: "Seeing practical results", main:"fixer" },
      { text: "Improving the environment", main:"outdoor" },
      { text: "Making things fair or correct", main:"inspector", secondary:"life" },
      { text: "Helping a group succeed", main:"strategist", secondary:"connector" }
    ]
  },
  {
    text: "What kind of pace do you like?",
    answers: [
      { text: "Fast and unpredictable", main:"hero" },
      { text: "Steady and supportive", main:"care", secondary:"life" },
      { text: "Hands-on and task-focused", main:"fixer" },
      { text: "Active and physical", main:"outdoor" },
      { text: "Thoughtful and problem-solving", main:"inspector", secondary:"life" },
      { text: "Planned and organised", main:"strategist", secondary:"connector" }
    ]
  },
  {
    text: "Which sounds most like you?",
    answers: [
      { text: "I like action and teamwork", main:"hero" },
      { text: "I like caring for people", main:"care", secondary:"life" },
      { text: "I like working with tools or equipment", main:"fixer" },
      { text: "I like being outside", main:"outdoor" },
      { text: "I like understanding problems deeply", main:"inspector", secondary:"life" },
      { text: "I like making plans and coordinating", main:"strategist", secondary:"connector" }
    ]
  },
  {
    text: "What would frustrate you most?",
    answers: [
      { text: "Not being able to act quickly", main:"hero" },
      { text: "Seeing someone not get the help they need", main:"care", secondary:"life" },
      { text: "Equipment that isn’t working", main:"fixer" },
      { text: "Being stuck indoors all day", main:"outdoor" },
      { text: "Decisions being made without evidence", main:"inspector", secondary:"life" },
      { text: "Poor organisation", main:"strategist", secondary:"connector" }
    ]
  },
  {
    text: "Which skill would you like to learn?",
    answers: [
      { text: "Emergency response skills", main:"hero" },
      { text: "Supporting people through challenges", main:"care", secondary:"life" },
      { text: "Trade or technical skills", main:"fixer" },
      { text: "Environmental or land-based skills", main:"outdoor" },
      { text: "Investigation or analysis", main:"inspector", secondary:"life" },
      { text: "Leadership or project planning", main:"strategist", secondary:"connector" }
    ]
  },
  {
    text: "Which result would make you proud at the end of a day?",
    answers: [
      { text: "A crisis handled well", main:"hero" },
      { text: "Someone feeling better because of you", main:"care", secondary:"life" },
      { text: "Something repaired or built", main:"fixer" },
      { text: "A place looking better than before", main:"outdoor" },
      { text: "A problem fully understood or solved", main:"inspector", secondary:"life" },
      { text: "A plan successfully delivered", main:"strategist", secondary:"connector" }
    ]
  },
  {
    text: "Which statement sounds most like you?",
    answers: [
      { text: "I’m ready to step in when things go wrong", main:"hero" },
      { text: "I want to support people who need help", main:"care", secondary:"life" },
      { text: "I enjoy practical work", main:"fixer" },
      { text: "I like being active and outdoors", main:"outdoor" },
      { text: "I like analysing and understanding situations", main:"inspector", secondary:"life" },
      { text: "I like helping teams work better", main:"strategist", secondary:"connector" }
    ]
  }
];

function startQuiz() {
  scores = {
    hero:0, care:0, life:0, fixer:0,
    outdoor:0, inspector:0, connector:0, strategist:0
  };
  currentQuestion = 0;
  showScreen("questionScreen"); // <-- corrected ID
  showQuestion();
}

function showScreen(id) {
  document.querySelectorAll(".screen").forEach(s => s.classList.remove("active"));
  document.getElementById(id).classList.add("active");
}

function shuffleArray(array) {
  return array.sort(() => Math.random() - 0.5);
}

function showQuestion() {
  const q = questions[currentQuestion];

  document.getElementById("questionText").textContent = q.text;
  document.getElementById("progress").textContent =
    `Question ${currentQuestion + 1} of ${questions.length}`;

  const progressPercent = ((currentQuestion + 1) / questions.length) * 100;
  document.getElementById("progressBar").style.width = progressPercent + "%";

  const answersDiv = document.getElementById("answers");
  answersDiv.innerHTML = "";

  shuffleArray([...q.answers]).forEach(answer => {
    const btn = document.createElement("button");
    btn.className = "answerButton";
    btn.innerHTML = "✨ " + answer.text;
    btn.onclick = () => {
      scores[answer.main] += 2;
      if (answer.secondary) scores[answer.secondary] += 1;
      nextQuestion();
    };
    answersDiv.appendChild(btn);
  });
}

function nextQuestion() {
  currentQuestion++;
  if (currentQuestion < questions.length) {
    showQuestion();
  } else {
    showScreen("loadingScreen");
    setTimeout(() => {
      showResult();
    }, 2000);
  }
}

function showResult() {
  let topType = Object.keys(scores).reduce((a, b) =>
    scores[a] > scores[b] ? a : b
  );

  const result = results[topType];

  document.getElementById("resultTitle").textContent = result.title;
  document.getElementById("resultGif").src = result.gif;

  // Apply theme colour
  document.querySelector(".resultCard").style.borderTop = 
    "8px solid " + result.color;

  document.querySelector(".restartButton").style.background = 
    result.color;

  launchConfetti(result.color);

  showScreen("resultScreen");
}

function restartQuiz() {
  showScreen("startScreen");
}

function launchConfetti(color) {
  for (let i = 0; i < 40; i++) {
    const confetti = document.createElement("div");
    confetti.className = "confetti";
    confetti.style.backgroundColor = color;
    confetti.style.left = Math.random() * 100 + "vw";
    confetti.style.animationDuration = 2 + Math.random() * 2 + "s";
    document.body.appendChild(confetti);

    setTimeout(() => confetti.remove(), 4000);
  }
}
