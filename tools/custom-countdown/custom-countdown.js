(function () {
  const TIMEZONES = [
    "Asia/Hong_Kong", "Asia/Shanghai", "Asia/Tokyo", "UTC",
    "America/New_York", "America/Los_Angeles", "Europe/London", "Australia/Sydney"
  ];
  const daysEl = document.getElementById("days");
  const hoursEl = document.getElementById("hours");
  const minutesEl = document.getElementById("minutes");
  const secondsEl = document.getElementById("seconds");
  const targetDateInput = document.getElementById("targetDate");
  const targetTimeInput = document.getElementById("targetTime");
  const timezoneSelect = document.getElementById("timezone");
  const pastMsg = document.getElementById("pastMsg");
  const copyLinkBtn = document.getElementById("copyLinkBtn");

  TIMEZONES.forEach(function (tz) {
    const opt = document.createElement("option");
    opt.value = tz;
    opt.textContent = tz.replace(/_/g, " ");
    timezoneSelect.appendChild(opt);
  });

  function getTarget() {
    const dateStr = targetDateInput.value;
    const timeStr = targetTimeInput.value || "00:00";
    if (!dateStr) return null;
    const [y, m, d] = dateStr.split("-").map(Number);
    const [hr, min] = (timeStr + ":00").split(":").map(Number);
    return new Date(y, m - 1, d, hr || 0, min || 0, 0, 0);
  }

  function updateDisplay() {
    const target = getTarget();
    if (!target) {
      pastMsg.style.display = "none";
      return;
    }
    const now = new Date();
    const diff = target.getTime() - now.getTime();
    if (diff <= 0) {
      daysEl.textContent = "0";
      hoursEl.textContent = "0";
      minutesEl.textContent = "0";
      secondsEl.textContent = "0";
      pastMsg.style.display = "block";
      const isZh = document.documentElement.lang === "zh-HK" || document.documentElement.lang === "zh-Hant";
      const daysAgo = Math.floor(-diff / (24 * 60 * 60 * 1000));
      pastMsg.textContent = isZh ? "已過。約 " + daysAgo + " 天前。" : "Passed. About " + daysAgo + " days ago.";
      return;
    }
    pastMsg.style.display = "none";
    const d = Math.floor(diff / (24 * 60 * 60 * 1000));
    const h = Math.floor((diff % (24 * 60 * 60 * 1000)) / (60 * 60 * 1000));
    const m = Math.floor((diff % (60 * 60 * 1000)) / (60 * 1000));
    const s = Math.floor((diff % (60 * 1000)) / 1000);
    daysEl.textContent = d;
    hoursEl.textContent = h;
    minutesEl.textContent = m;
    secondsEl.textContent = s;
  }

  function readUrlParams() {
    const params = new URLSearchParams(window.location.search);
    const date = params.get("date");
    const time = params.get("time");
    const tz = params.get("tz");
    if (date) targetDateInput.value = date;
    if (time) targetTimeInput.value = time;
    if (tz && TIMEZONES.indexOf(tz) !== -1) timezoneSelect.value = tz;
  }

  targetDateInput.addEventListener("change", updateDisplay);
  targetTimeInput.addEventListener("change", updateDisplay);
  timezoneSelect.addEventListener("change", updateDisplay);

  if (!targetDateInput.value) {
    const t = new Date();
    targetDateInput.value = t.getFullYear() + "-" + String(t.getMonth() + 1).padStart(2, "0") + "-" + String(t.getDate()).padStart(2, "0");
  }
  readUrlParams();
  setInterval(updateDisplay, 1000);
  updateDisplay();

  copyLinkBtn.addEventListener("click", function () {
    const date = targetDateInput.value;
    const time = targetTimeInput.value || "00:00";
    const tz = timezoneSelect.value;
    const url = window.location.origin + window.location.pathname + "?date=" + encodeURIComponent(date) + "&time=" + encodeURIComponent(time) + "&tz=" + encodeURIComponent(tz);
    navigator.clipboard.writeText(url).then(function () {
      copyLinkBtn.textContent = document.documentElement.lang === "zh-HK" ? "已複製" : "Copied!";
      setTimeout(function () {
        copyLinkBtn.textContent = document.documentElement.lang === "zh-HK" ? "複製分享連結" : "Copy share link";
      }, 1500);
    });
  });
})();
