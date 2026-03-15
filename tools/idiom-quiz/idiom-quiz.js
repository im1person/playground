(function () {
  const QUIZ = [
    { q: "小蔥拌豆腐", qEn: "Spring onion with tofu —", a: "一清二白", aEn: "Clear (honest)", opts: ["一清二白", "一窮二白", "一知半解", "一石二鳥"] },
    { q: "外甥打燈籠", qEn: "Nephew carrying a lantern —", a: "照舅（照舊）", aEn: "Same as before", opts: ["照舅（照舊）", "照樣", "照做", "照辦"] },
    { q: "孔夫子搬家", qEn: "Confucius moving house —", a: "淨是書（輸）", aEn: "All books / all losses", opts: ["淨是書（輸）", "淨是禮", "淨是道", "淨是學"] },
    { q: "十五個吊桶打水", qEn: "Fifteen buckets fetching water —", a: "七上八下", aEn: "Seven up eight down (anxious)", opts: ["七上八下", "七手八腳", "亂七八糟", "五花八門"] },
    { q: "畫蛇添足", qEn: "Draw a snake and add feet —", a: "多此一舉", aEn: "Unnecessary addition", opts: ["多此一舉", "畫龍點睛", "弄巧成拙", "適可而止"] },
    { q: "守株待兔", qEn: "Waiting by the tree stump for a rabbit —", a: "不勞而獲", aEn: "Reap without sowing", opts: ["不勞而獲", "坐享其成", "緣木求魚", "刻舟求劍"] },
    { q: "對牛彈琴", qEn: "Playing the lute to a cow —", a: "白費唇舌", aEn: "Waste one's breath", opts: ["白費唇舌", "牛頭不對馬嘴", "雞同鴨講", "對症下藥"] },
    { q: "半斤八兩", qEn: "Half a catty, eight taels —", a: "不相上下", aEn: "Six of one, half dozen of the other", opts: ["不相上下", "一模一樣", "旗鼓相當", "勢均力敵"] },
    { q: "塞翁失馬", qEn: "Old man lost his horse —", a: "焉知非福", aEn: "Blessing in disguise", opts: ["焉知非福", "因禍得福", "樂極生悲", "否極泰來"] },
    { q: "井底之蛙", qEn: "Frog at the bottom of a well —", a: "見識淺窄", aEn: "Limited view", opts: ["見識淺窄", "坐井觀天", "孤陋寡聞", "目光短淺"] }
  ];

  const questionEl = document.getElementById("question");
  const optionsEl = document.getElementById("options");
  const feedbackEl = document.getElementById("feedback");
  const nextBtn = document.getElementById("nextBtn");
  const restartBtn = document.getElementById("restartBtn");
  const scoreEl = document.getElementById("score");

  let index = 0;
  let score = 0;
  let answered = false;
  let order = [];

  function isZh() {
    return document.documentElement.lang === "zh-HK" || document.documentElement.lang === "zh-Hant";
  }

  function shuffle(arr) {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  function setScore() {
    const totalAnswered = index + (answered ? 1 : 0);
    const denom = totalAnswered || 0;
    const txt = isZh() ? "得分：" + score + " / " + denom : "Score: " + score + " / " + denom;
    scoreEl.textContent = txt;
  }

  function showQuestion() {
    if (index >= QUIZ.length) {
      questionEl.textContent = isZh() ? "做晒！" : "Done!";
      optionsEl.innerHTML = "";
      feedbackEl.textContent = (isZh() ? "總分：" : "Total: ") + score + " / " + QUIZ.length;
      feedbackEl.className = "explain";
      nextBtn.style.display = "none";
      restartBtn.style.display = "inline-block";
      return;
    }
    answered = false;
    const item = QUIZ[order[index]];
    questionEl.textContent = isZh() ? item.q : item.qEn;
    const opts = shuffle(item.opts.slice());
    optionsEl.innerHTML = "";
    opts.forEach(function (opt) {
      const btn = document.createElement("button");
      btn.className = "option";
      btn.textContent = opt;
      btn.addEventListener("click", function () {
        if (answered) return;
        answered = true;
        const correct = opt === item.a;
        if (correct) score++;
        setScore();
        optionsEl.querySelectorAll(".option").forEach(function (b) {
          b.disabled = true;
          if (b.textContent === item.a) b.classList.add("correct");
          else if (b === btn && !correct) b.classList.add("wrong");
        });
        feedbackEl.textContent = (correct ? (isZh() ? "啱！" : "Correct! ") : (isZh() ? "唔啱。答案：" : "Wrong. Answer: ") + item.a) + (item.aEn ? " — " + item.aEn : "");
        feedbackEl.className = "explain";
        nextBtn.style.display = "inline-block";
      });
      optionsEl.appendChild(btn);
    });
    feedbackEl.textContent = "";
    feedbackEl.className = "";
    nextBtn.style.display = "none";
    restartBtn.style.display = "none";
  }

  nextBtn.addEventListener("click", function () {
    index++;
    showQuestion();
  });
  restartBtn.addEventListener("click", function () {
    index = 0;
    score = 0;
    order = shuffle(QUIZ.map(function (_, i) { return i; }));
    setScore();
    showQuestion();
  });

  order = shuffle(QUIZ.map(function (_, i) { return i; }));
  setScore();
  showQuestion();
})();
