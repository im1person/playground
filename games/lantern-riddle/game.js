// Lantern Riddle Quiz — show riddle, input answer, check, show explanation, next

const startScreen = document.getElementById("startScreen");
const riddleCard = document.getElementById("riddleCard");
const riddleQuestion = document.getElementById("riddleQuestion");
const answerSection = document.getElementById("answerSection");
const answerInput = document.getElementById("answerInput");
const submitBtn = document.getElementById("submitBtn");
const revealBtn = document.getElementById("revealBtn");
const resultSection = document.getElementById("resultSection");
const resultMessage = document.getElementById("resultMessage");
const explanationEl = document.getElementById("explanation");
const nextBtn = document.getElementById("nextBtn");
const startBtn = document.getElementById("startBtn");
const progressText = document.getElementById("progressText");
const scoreText = document.getElementById("scoreText");

let currentIndex = 0;
let score = 0;
let order = [];
let revealed = false;

function getLocale() {
  return localStorage.getItem("playground-locale") || "en";
}

function isZh() {
  const loc = getLocale();
  return loc === "zh-HK" || loc === "zh-Hant";
}

function getRiddleQuestion(r) {
  return isZh() ? r.questionZh : r.questionEn;
}

function getExplanation(r) {
  return isZh() ? (r.explanationZh || r.explanationEn) : (r.explanationEn || r.explanationZh);
}

function getCanonicalAnswer(r) {
  const a = r.answer;
  return Array.isArray(a) ? a[0] : a;
}

function normalizeAnswer(s) {
  return String(s).trim().toLowerCase().replace(/\s+/g, " ");
}

function checkAnswer(riddle, userAnswer) {
  const normalized = normalizeAnswer(userAnswer);
  const answers = Array.isArray(riddle.answer) ? riddle.answer : [riddle.answer];
  return answers.some((a) => normalizeAnswer(a) === normalized);
}

function shuffleOrder() {
  order = RIDDLES.map((_, i) => i);
  for (let i = order.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [order[i], order[j]] = [order[j], order[i]];
  }
}

function updatePlaceholder() {
  answerInput.placeholder = isZh() ? "輸入答案" : "Type your answer";
}

function updateProgress() {
  const total = RIDDLES.length;
  const n = currentIndex + 1;
  if (isZh()) {
    progressText.textContent = `第 ${n} 題，共 ${total} 題`;
    scoreText.textContent = `答對：${score}`;
  } else {
    progressText.textContent = `Question ${n} of ${total}`;
    scoreText.textContent = `Correct: ${score}`;
  }
}

function showRiddle() {
  const r = RIDDLES[order[currentIndex]];
  riddleQuestion.textContent = getRiddleQuestion(r);
  answerInput.value = "";
  answerInput.focus();
  answerSection.classList.remove("hidden");
  resultSection.classList.add("hidden");
  revealed = false;
  updateProgress();
  updatePlaceholder();
}

function showResult(correct, riddle) {
  answerSection.classList.add("hidden");
  resultSection.classList.remove("hidden");
  const canonical = getCanonicalAnswer(riddle);
  if (correct) {
    resultMessage.textContent = isZh() ? `答對！答案：${canonical}` : `Correct! Answer: ${canonical}`;
    resultMessage.className = "result-message correct";
  } else {
    resultMessage.textContent = isZh() ? `答案：${canonical}` : `Answer: ${canonical}`;
    resultMessage.className = "result-message wrong";
  }
  explanationEl.textContent = getExplanation(riddle);
  updateProgress();
}

function submitAnswer() {
  const userAnswer = answerInput.value.trim();
  if (!userAnswer) return;
  const r = RIDDLES[order[currentIndex]];
  const correct = checkAnswer(r, userAnswer);
  if (correct) score++;
  showResult(correct, r);
}

function revealAnswer() {
  if (revealed) return;
  revealed = true;
  const r = RIDDLES[order[currentIndex]];
  showResult(false, r);
}

function nextQuestion() {
  currentIndex++;
  if (currentIndex >= order.length) {
    startScreen.classList.remove("hidden");
    riddleCard.classList.add("hidden");
    const total = RIDDLES.length;
    startScreen.querySelector(".intro").textContent = isZh()
      ? `完成！共 ${total} 題，答對 ${score} 題。再玩一次？`
      : `Done! ${score} out of ${total} correct. Play again?`;
    startBtn.textContent = isZh() ? "再玩" : "Play again";
    return;
  }
  showRiddle();
}

function startGame() {
  shuffleOrder();
  currentIndex = 0;
  score = 0;
  startScreen.classList.add("hidden");
  riddleCard.classList.remove("hidden");
  showRiddle();
}

submitBtn.addEventListener("click", submitAnswer);
revealBtn.addEventListener("click", revealAnswer);
nextBtn.addEventListener("click", nextQuestion);
startBtn.addEventListener("click", startGame);

answerInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter") {
    if (!resultSection.classList.contains("hidden")) nextQuestion();
    else submitAnswer();
  }
});

updatePlaceholder();
