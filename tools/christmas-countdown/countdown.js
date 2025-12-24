// Christmas Countdown Timer

let targetDateTime = null;
let countdownInterval = null;

const daysEl = document.getElementById("days");
const hoursEl = document.getElementById("hours");
const minutesEl = document.getElementById("minutes");
const secondsEl = document.getElementById("seconds");
const targetDateInput = document.getElementById("targetDate");
const targetTimeInput = document.getElementById("targetTime");
const timezoneSelect = document.getElementById("timezone");
const updateBtn = document.getElementById("updateBtn");
const messageSection = document.getElementById("messageSection");
const messageTitle = document.getElementById("messageTitle");
const messageText = document.getElementById("messageText");

// Get locale helper
function getLocale() {
  return localStorage.getItem("playground-locale") || "en";
}

// Initialize timezone options
function initTimezones() {
  // Add common timezones
  const timezones = [
    { value: "UTC", label: "UTC" },
    { value: "America/New_York", label: "Eastern Time (US)" },
    { value: "America/Chicago", label: "Central Time (US)" },
    { value: "America/Denver", label: "Mountain Time (US)" },
    { value: "America/Los_Angeles", label: "Pacific Time (US)" },
    { value: "Europe/London", label: "London" },
    { value: "Europe/Paris", label: "Paris" },
    { value: "Asia/Tokyo", label: "Tokyo" },
    { value: "Asia/Shanghai", label: "Shanghai" },
    { value: "Asia/Hong_Kong", label: "Hong Kong" },
    { value: "Australia/Sydney", label: "Sydney" },
  ];

  timezones.forEach((tz) => {
    const option = document.createElement("option");
    option.value = tz.value;
    option.textContent = tz.label;
    timezoneSelect.appendChild(option);
  });

  // Load saved preference
  const savedTz = localStorage.getItem("countdown-timezone");
  if (savedTz) {
    timezoneSelect.value = savedTz;
  }
}

// Get current date/time as a Date object
// For timezone comparison, we'll compare the formatted times, not the Date objects directly
function getCurrentDateTime() {
  // Always return current UTC time - we'll format it for display/comparison
  return new Date();
}

// Get current time formatted in selected timezone (for comparison)
function getCurrentTimeInTimezone(timezone) {
  if (timezone === "auto") {
    const now = new Date();
    return {
      year: now.getFullYear(),
      month: now.getMonth() + 1,
      day: now.getDate(),
      hour: now.getHours(),
      minute: now.getMinutes(),
      second: now.getSeconds(),
    };
  }

  const now = new Date();
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });

  const parts = formatter.formatToParts(now);
  return {
    year: parseInt(parts.find((p) => p.type === "year").value),
    month: parseInt(parts.find((p) => p.type === "month").value),
    day: parseInt(parts.find((p) => p.type === "day").value),
    hour: parseInt(parts.find((p) => p.type === "hour").value),
    minute: parseInt(parts.find((p) => p.type === "minute").value),
    second: parseInt(parts.find((p) => p.type === "second").value),
  };
}

// Format date for input (YYYY-MM-DD)
function formatDateForInput(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

// Format time for input (HH:MM)
function formatTimeForInput(date) {
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  return `${hours}:${minutes}`;
}

// Set preset
function setPreset(preset) {
  const now = new Date();
  let targetDate = new Date();

  switch (preset) {
    case "christmas":
      targetDate = new Date(now.getFullYear(), 11, 25, 0, 0, 0); // Dec 25, midnight
      if (targetDate < now) {
        targetDate = new Date(now.getFullYear() + 1, 11, 25, 0, 0, 0); // Next year
      }
      break;
    case "newyear":
      targetDate = new Date(now.getFullYear() + 1, 0, 1, 0, 0, 0); // Jan 1, next year, midnight
      break;
    case "custom":
      // Don't change anything, just focus on date input
      targetDateInput.focus();
      return;
  }

  targetDateInput.value = formatDateForInput(targetDate);
  targetTimeInput.value = formatTimeForInput(targetDate);
  updateCountdown();
}

// Convert date/time in selected timezone to a Date object for comparison
function convertToTimezoneDate(year, month, day, hours, minutes, timezone) {
  if (timezone === "auto") {
    // Use local timezone
    return new Date(year, month - 1, day, hours, minutes, 0);
  }

  // Use a simpler approach: create a date near the target date to get accurate timezone offset
  // We'll use a date close to the target to account for DST
  const targetDateStr = `${year}-${String(month).padStart(2, "0")}-${String(
    day
  ).padStart(2, "0")}T${String(hours).padStart(2, "0")}:${String(
    minutes
  ).padStart(2, "0")}:00`;

  // Create a test UTC date at the same time
  const testUTC = new Date(`${targetDateStr}Z`);

  // Get what this UTC time represents in the target timezone
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });

  const parts = formatter.formatToParts(testUTC);
  const tzYear = parseInt(parts.find((p) => p.type === "year").value);
  const tzMonth = parseInt(parts.find((p) => p.type === "month").value);
  const tzDay = parseInt(parts.find((p) => p.type === "day").value);
  const tzHour = parseInt(parts.find((p) => p.type === "hour").value);
  const tzMinute = parseInt(parts.find((p) => p.type === "minute").value);

  // Calculate the difference between what we want and what we got
  const yearDiff = year - tzYear;
  const monthDiff = month - tzMonth;
  const dayDiff = day - tzDay;
  const hourDiff = hours - tzHour;
  const minuteDiff = minutes - tzMinute;

  // Adjust the UTC date by the difference
  const adjustedDate = new Date(testUTC);
  adjustedDate.setUTCFullYear(adjustedDate.getUTCFullYear() + yearDiff);
  adjustedDate.setUTCMonth(adjustedDate.getUTCMonth() + monthDiff);
  adjustedDate.setUTCDate(adjustedDate.getUTCDate() + dayDiff);
  adjustedDate.setUTCHours(adjustedDate.getUTCHours() + hourDiff);
  adjustedDate.setUTCMinutes(adjustedDate.getUTCMinutes() + minuteDiff);

  return adjustedDate;
}

// Update countdown
function updateCountdown() {
  const dateStr = targetDateInput.value;
  const timeStr = targetTimeInput.value;

  if (!dateStr) {
    // Default to this year's Christmas
    setPreset("christmas");
    return;
  }

  const [year, month, day] = dateStr.split("-").map(Number);
  const [hours, minutes] = timeStr ? timeStr.split(":").map(Number) : [0, 0];
  const timezone = timezoneSelect.value;

  // Convert the target date/time to a Date object, interpreting it in the selected timezone
  targetDateTime = convertToTimezoneDate(
    year,
    month,
    day,
    hours,
    minutes,
    timezone
  );

  // Clear existing interval
  if (countdownInterval) {
    clearInterval(countdownInterval);
  }

  // Start countdown
  updateDisplay();
  countdownInterval = setInterval(updateDisplay, 1000);
}

// Update display
function updateDisplay() {
  if (!targetDateTime) return;

  const timezone = timezoneSelect.value;

  // Get the target date/time components
  const dateStr = targetDateInput.value;
  const timeStr = targetTimeInput.value;
  if (!dateStr) return;

  const [targetYear, targetMonth, targetDay] = dateStr.split("-").map(Number);
  const [targetHour, targetMinute] = timeStr
    ? timeStr.split(":").map(Number)
    : [0, 0];

  // Convert target date/time to UTC Date object (interpreting input as being in selected timezone)
  const targetAsUTC = convertToTimezoneDate(
    targetYear,
    targetMonth,
    targetDay,
    targetHour,
    targetMinute,
    timezone
  );

  // Get current time (already in UTC internally)
  const now = new Date();

  // Calculate difference
  const diffMs = targetAsUTC.getTime() - now.getTime();

  if (diffMs <= 0) {
    // Countdown reached zero
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

// Update UI text based on locale
function updateUIText() {
  const locale = getLocale();
  // The HTML data attributes handle most translations
  // This function can be extended if needed
}

// Event listeners
updateBtn.addEventListener("click", updateCountdown);
targetDateInput.addEventListener("change", updateCountdown);
targetTimeInput.addEventListener("change", updateCountdown);
timezoneSelect.addEventListener("change", () => {
  localStorage.setItem("countdown-timezone", timezoneSelect.value);
  updateCountdown();
});

// Preset buttons
document.querySelectorAll(".preset-btn").forEach((btn) => {
  btn.addEventListener("click", () => {
    const preset = btn.getAttribute("data-preset");
    setPreset(preset);
  });
});

// Initialize
initTimezones();
// Set default to this year's Christmas
setPreset("christmas");

// Listen for locale changes
document.addEventListener("localeChange", updateUIText);
