(function () {
  const FORTUNES = [
    { num: 1, en: "Today is your day to try something new.", zh: "今日宜嘗試新事物。" },
    { num: 2, en: "A small step leads to a big change.", zh: "一小步，大改變。" },
    { num: 3, en: "Luck favours the prepared mind.", zh: "機會留俾有準備嘅人。" },
    { num: 4, en: "Rest well; tomorrow will be brighter.", zh: "休息夠，聽日會更好。" },
    { num: 5, en: "Someone is thinking of you.", zh: "有人正在掛住你。" },
    { num: 6, en: "Coffee first, then conquer the world.", zh: "飲杯咖啡先，再征服世界。" },
    { num: 7, en: "Your idea will work. Trust it.", zh: "你嘅想法會得嘅，信自己。" },
    { num: 8, en: "A good laugh is the best medicine.", zh: "笑一笑，世界更美妙。" },
    { num: 9, en: "Small wins add up to big success.", zh: "小成功累積成大成功。" },
    { num: 10, en: "Be kind to yourself today.", zh: "今日對自己好啲。" },
    { num: 11, en: "The answer is closer than you think.", zh: "答案近在咫尺。" },
    { num: 12, en: "Say yes to one thing you usually avoid.", zh: "試下應承一件你平時唔會做嘅事。" },
    { num: 13, en: "Your persistence will pay off.", zh: "堅持落去會有回報。" },
    { num: 14, en: "Share a meal with someone you care about.", zh: "同你在乎嘅人食餐飯。" },
    { num: 15, en: "Tomorrow you will be glad you tried.", zh: "聽日你會慶幸今日有試。" }
  ];

  const drawBtn = document.getElementById("drawBtn");
  const fortuneNumber = document.getElementById("fortuneNumber");
  const fortuneText = document.getElementById("fortuneText");
  const placeholder = document.getElementById("fortunePlaceholder");

  fortuneNumber.style.display = "none";
  fortuneText.style.display = "none";

  drawBtn.addEventListener("click", function () {
    const f = FORTUNES[Math.floor(Math.random() * FORTUNES.length)];
    const isZh = document.documentElement.lang === "zh-HK" || document.documentElement.lang === "zh-Hant";
    fortuneNumber.textContent = "#" + f.num;
    fortuneText.textContent = isZh ? f.zh : f.en;
    placeholder.style.display = "none";
    fortuneNumber.style.display = "block";
    fortuneText.style.display = "block";
  });
})();
