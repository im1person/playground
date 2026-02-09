// Lunar New Year Countdown
// Lunar New Year (初一) Gregorian dates: first day of lunar year 1
const LUNAR_NEW_YEAR_DATES = [
  { year: 2025, date: new Date(2025, 0, 29, 0, 0, 0), zodiac: "Snake", zodiacZh: "蛇" },
  { year: 2026, date: new Date(2026, 1, 17, 0, 0, 0), zodiac: "Horse", zodiacZh: "馬" },
  { year: 2027, date: new Date(2027, 1, 6, 0, 0, 0), zodiac: "Sheep", zodiacZh: "羊" },
  { year: 2028, date: new Date(2028, 0, 26, 0, 0, 0), zodiac: "Monkey", zodiacZh: "猴" },
  { year: 2029, date: new Date(2029, 1, 13, 0, 0, 0), zodiac: "Rooster", zodiacZh: "雞" },
  { year: 2030, date: new Date(2030, 1, 3, 0, 0, 0), zodiac: "Dog", zodiacZh: "狗" },
  { year: 2031, date: new Date(2031, 0, 23, 0, 0, 0), zodiac: "Pig", zodiacZh: "豬" },
  { year: 2032, date: new Date(2032, 1, 11, 0, 0, 0), zodiac: "Rat", zodiacZh: "鼠" },
  { year: 2033, date: new Date(2033, 0, 31, 0, 0, 0), zodiac: "Ox", zodiacZh: "牛" },
  { year: 2034, date: new Date(2034, 1, 19, 0, 0, 0), zodiac: "Tiger", zodiacZh: "虎" },
  { year: 2035, date: new Date(2035, 1, 8, 0, 0, 0), zodiac: "Rabbit", zodiacZh: "兔" },
  { year: 2036, date: new Date(2036, 0, 28, 0, 0, 0), zodiac: "Dragon", zodiacZh: "龍" },
];

let targetDateTime = null;
let countdownInterval = null;

const daysEl = document.getElementById("days");
const hoursEl = document.getElementById("hours");
const minutesEl = document.getElementById("minutes");
const secondsEl = document.getElementById("seconds");
const timezoneSelect = document.getElementById("timezone");
const updateBtn = document.getElementById("updateBtn");
const messageSection = document.getElementById("messageSection");
const zodiacBanner = document.getElementById("zodiacBanner");
const zodiacLabel = document.getElementById("zodiacLabel");

function getLocale() {
  return localStorage.getItem("playground-locale") || "en";
}

function getNextLunarNewYear() {
  const now = new Date();
  for (const entry of LUNAR_NEW_YEAR_DATES) {
    if (entry.date > now) return entry;
  }
  return LUNAR_NEW_YEAR_DATES[LUNAR_NEW_YEAR_DATES.length - 1];
}

function getNextNewYearsEve() {
  const next = getNextLunarNewYear();
  const eve = new Date(next.date);
  eve.setDate(eve.getDate() - 1);
  eve.setHours(0, 0, 0, 0);
  return { date: eve, zodiac: next.zodiac, zodiacZh: next.zodiacZh };
}

function initTimezones() {
  const timezones = [
    { value: "Asia/Hong_Kong", label: "Hong Kong" },
    { value: "Asia/Shanghai", label: "Shanghai" },
    { value: "Asia/Taipei", label: "Taipei" },
    { value: "Asia/Tokyo", label: "Tokyo" },
    { value: "UTC", label: "UTC" },
    { value: "America/New_York", label: "Eastern Time (US)" },
    { value: "America/Los_Angeles", label: "Pacific Time (US)" },
    { value: "Europe/London", label: "London" },
  ];
  timezones.forEach((tz) => {
    const option = document.createElement("option");
    option.value = tz.value;
    option.textContent = tz.label;
    timezoneSelect.appendChild(option);
  });
  const savedTz = localStorage.getItem("lny-countdown-timezone");
  timezoneSelect.value = savedTz || "Asia/Hong_Kong";
}

// Interpret (year, month, day, 0, 0) in the given timezone as a UTC Date for comparison
function convertToTimezoneDate(year, month1Based, day, hours, minutes, timezone) {
  if (timezone === "auto") {
    return new Date(year, month1Based - 1, day, hours || 0, minutes || 0, 0);
  }
  const str = `${year}-${String(month1Based).padStart(2, "0")}-${String(day).padStart(2, "0")}T${String(hours || 0).padStart(2, "0")}:${String(minutes || 0).padStart(2, "0")}:00`;
  const utc = new Date(str + "Z");
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
  const parts = formatter.formatToParts(utc);
  const tzY = parseInt(parts.find((p) => p.type === "year").value);
  const tzM = parseInt(parts.find((p) => p.type === "month").value);
  const tzD = parseInt(parts.find((p) => p.type === "day").value);
  const tzH = parseInt(parts.find((p) => p.type === "hour").value);
  const tzMin = parseInt(parts.find((p) => p.type === "minute").value);
  const diff = (year - tzY) * 365 * 24 * 60 * 60 * 1000 +
    (month1Based - tzM) * 31 * 24 * 60 * 60 * 1000 +
    (day - tzD) * 24 * 60 * 60 * 1000 +
    ((hours || 0) - tzH) * 60 * 60 * 1000 +
    ((minutes || 0) - tzMin) * 60 * 1000;
  return new Date(utc.getTime() + diff);
}

function setPreset(preset) {
  const timezone = timezoneSelect.value;
  if (preset === "custom") return;

  if (preset === "lny") {
    const next = getNextLunarNewYear();
    const d = next.date;
    targetDateTime = convertToTimezoneDate(d.getFullYear(), d.getMonth() + 1, d.getDate(), 0, 0, timezone);
    const locale = getLocale();
    zodiacLabel.textContent = (locale === "zh-HK" || locale === "zh-Hant") ? `${next.zodiacZh}年` : `Year of the ${next.zodiac}`;
  } else if (preset === "eve") {
    const { date } = getNextNewYearsEve();
    const d = date;
    targetDateTime = convertToTimezoneDate(d.getFullYear(), d.getMonth() + 1, d.getDate(), 0, 0, timezone);
    const next = getNextLunarNewYear();
    const locale = getLocale();
    zodiacLabel.textContent = (locale === "zh-HK" || locale === "zh-Hant") ? `除夕 → ${next.zodiacZh}年` : `New Year's Eve → ${next.zodiac}`;
  }
  updateCountdown();
}

function updateCountdown() {
  const timezone = timezoneSelect.value;
  const next = getNextLunarNewYear();
  const d = next.date;
  targetDateTime = convertToTimezoneDate(d.getFullYear(), d.getMonth() + 1, d.getDate(), 0, 0, timezone);
  const locale = getLocale();
  zodiacLabel.textContent = (locale === "zh-HK" || locale === "zh-Hant") ? `${next.zodiacZh}年` : `Year of the ${next.zodiac}`;

  if (countdownInterval) clearInterval(countdownInterval);
  updateDisplay();
  countdownInterval = setInterval(updateDisplay, 1000);
}

function updateDisplay() {
  if (!targetDateTime) return;
  const now = new Date();
  const diffMs = targetDateTime.getTime() - now.getTime();

  if (diffMs <= 0) {
    daysEl.textContent = "0";
    hoursEl.textContent = "0";
    minutesEl.textContent = "0";
    secondsEl.textContent = "0";
    messageSection.classList.remove("hidden");
    if (countdownInterval) {
      clearInterval(countdownInterval);
      countdownInterval = null;
    }
    return;
  }

  messageSection.classList.add("hidden");
  const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
  const seconds = Math.floor((diffMs % (1000 * 60)) / 1000);

  daysEl.textContent = String(days).padStart(2, "0");
  hoursEl.textContent = String(hours).padStart(2, "0");
  minutesEl.textContent = String(minutes).padStart(2, "0");
  secondsEl.textContent = String(seconds).padStart(2, "0");
}

updateBtn.addEventListener("click", updateCountdown);
timezoneSelect.addEventListener("change", () => {
  localStorage.setItem("lny-countdown-timezone", timezoneSelect.value);
  updateCountdown();
});

document.querySelectorAll(".preset-btn").forEach((btn) => {
  btn.addEventListener("click", () => setPreset(btn.getAttribute("data-preset")));
});

initTimezones();
setPreset("lny");
document.addEventListener("localeChange", () => setPreset("lny"));
