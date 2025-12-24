// Advent Calendar

const calendarGrid = document.getElementById("calendarGrid");
const surpriseModal = document.getElementById("surpriseModal");
const modalTitle = document.getElementById("modalTitle");
const modalContent = document.getElementById("modalContent");
const todayDateEl = document.getElementById("todayDate");
const modalClose = document.querySelector(".modal-close");

// Get locale helper
function getLocale() {
  return localStorage.getItem("playground-locale") || "en";
}

// Get current date
function getCurrentDate() {
  return new Date();
}

// Get December 1st of current year
function getDecemberFirst() {
  const now = new Date();
  return new Date(now.getFullYear(), 11, 1); // Month 11 = December
}

// Check if a day can be opened
function canOpenDay(day) {
  const now = getCurrentDate();
  const decFirst = getDecemberFirst();
  const targetDate = new Date(decFirst.getFullYear(), 11, day);
  
  // Can open if it's December and the day has passed or is today
  if (now.getMonth() === 11 && now.getDate() >= day) {
    return true;
  }
  // Can also open if we're past December (for testing/demo)
  if (now.getMonth() > 11 || (now.getMonth() === 11 && now.getFullYear() > decFirst.getFullYear())) {
    return true;
  }
  return false;
}

// Get opened days from localStorage
function getOpenedDays() {
  const saved = localStorage.getItem("advent-opened-days");
  return saved ? JSON.parse(saved) : [];
}

// Save opened day
function saveOpenedDay(day) {
  const opened = getOpenedDays();
  if (!opened.includes(day)) {
    opened.push(day);
    localStorage.setItem("advent-opened-days", JSON.stringify(opened));
  }
}

// Check if day is opened
function isDayOpened(day) {
  return getOpenedDays().includes(day);
}

// Surprises for each day
const surprises = {
  1: { emoji: "🎁", message: "The first gift of Christmas!", fact: "The tradition of Advent calendars began in Germany in the 19th century." },
  2: { emoji: "❄️", message: "Snow is falling!", fact: "The first artificial Christmas tree was made in Germany in the 1800s." },
  3: { emoji: "🎄", message: "A beautiful tree!", fact: "Christmas trees can take 7-10 years to grow to a typical height." },
  4: { emoji: "🦌", message: "Rudolph is here!", fact: "Reindeer are the only mammals that can see ultraviolet light." },
  5: { emoji: "🎅", message: "Santa says hello!", fact: "Santa Claus is based on Saint Nicholas, a 4th-century bishop." },
  6: { emoji: "🌟", message: "A shining star!", fact: "The Star of Bethlehem might have been a conjunction of planets." },
  7: { emoji: "🔔", message: "Jingle bells!", fact: "Jingle Bells was originally written for Thanksgiving, not Christmas." },
  8: { emoji: "🕯️", message: "Candlelight!", fact: "The tradition of lighting candles dates back to ancient winter solstice celebrations." },
  9: { emoji: "🍪", message: "Cookies for Santa!", fact: "The tradition of leaving cookies for Santa started in the 1930s." },
  10: { emoji: "🎄", message: "More decorations!", fact: "Tinsel was originally made from real silver in 17th century Germany." },
  11: { emoji: "🎁", message: "Another gift!", fact: "The first Christmas card was sent in 1843 in England." },
  12: { emoji: "❄️", message: "Winter wonderland!", fact: "Snowflakes always have six sides due to the molecular structure of water." },
  13: { emoji: "🦌", message: "The reindeer are ready!", fact: "Santa's reindeer were first mentioned in 'Twas the Night Before Christmas' in 1823." },
  14: { emoji: "🎅", message: "Santa is preparing!", fact: "There are approximately 2 billion children in the world that Santa visits." },
  15: { emoji: "🌟", message: "Halfway there!", fact: "The word 'Christmas' comes from 'Cristes Maesse', meaning 'Christ's Mass'." },
  16: { emoji: "🔔", message: "The bells are ringing!", fact: "The largest bell in the world is the Tsar Bell in Moscow, weighing over 200 tons." },
  17: { emoji: "🕯️", message: "Candles glowing!", fact: "The Advent wreath tradition started in 19th century Germany." },
  18: { emoji: "🍪", message: "Baking time!", fact: "Gingerbread houses became popular after the Brothers Grimm published Hansel and Gretel." },
  19: { emoji: "🎄", message: "Almost ready!", fact: "The Rockefeller Center Christmas tree tradition started in 1931." },
  20: { emoji: "🎁", message: "Wrapping presents!", fact: "Americans spend about $3.2 billion on wrapping paper each year." },
  21: { emoji: "❄️", message: "Winter is here!", fact: "The North Pole is actually warmer than the South Pole." },
  22: { emoji: "🦌", message: "Final preparations!", fact: "Reindeer can run up to 50 miles per hour." },
  23: { emoji: "🎅", message: "Santa is on his way!", fact: "Santa would need to visit 822 homes per second to deliver all presents." },
  24: { emoji: "🎄", message: "Merry Christmas Eve!", fact: "Christmas Eve is celebrated on December 24th, the day before Christmas Day." },
  25: { emoji: "🎉", message: "Merry Christmas!", fact: "Christmas is celebrated by over 2 billion people worldwide!" },
};

// Create calendar
function createCalendar() {
  calendarGrid.innerHTML = "";
  const locale = getLocale();
  const openedDays = getOpenedDays();
  
  for (let day = 1; day <= 25; day++) {
    const door = document.createElement("div");
    door.className = "calendar-door";
    door.setAttribute("data-day", day);
    
    const canOpen = canOpenDay(day);
    const isOpened = isDayOpened(day);
    
    if (isOpened) {
      door.classList.add("opened");
      const surprise = surprises[day];
      door.innerHTML = `
        <div class="door-number">${day}</div>
        <div class="door-content opened-content">
          <div class="surprise-emoji">${surprise.emoji}</div>
        </div>
      `;
    } else if (canOpen) {
      door.classList.add("can-open");
      door.innerHTML = `
        <div class="door-number">${day}</div>
        <div class="door-content">
          <span class="door-icon">🚪</span>
        </div>
      `;
    } else {
      door.classList.add("locked");
      door.innerHTML = `
        <div class="door-number">${day}</div>
        <div class="door-content">
          <span class="lock-icon">🔒</span>
        </div>
      `;
    }
    
    door.addEventListener("click", () => {
      if (canOpen && !isOpened) {
        openDay(day);
      } else if (isOpened) {
        showSurprise(day);
      }
    });
    
    calendarGrid.appendChild(door);
  }
}

// Open a day
function openDay(day) {
  saveOpenedDay(day);
  createCalendar(); // Refresh to show opened state
  showSurprise(day);
}

// Show surprise
function showSurprise(day) {
  const surprise = surprises[day];
  const locale = getLocale();
  
  modalTitle.textContent = locale === "zh-Hant" ? `第 ${day} 天` : `Day ${day}`;
  modalContent.innerHTML = `
    <div class="surprise-display">
      <div class="surprise-emoji-large">${surprise.emoji}</div>
      <p class="surprise-message">${surprise.message}</p>
      <p class="surprise-fact">${surprise.fact}</p>
    </div>
  `;
  surpriseModal.classList.remove("hidden");
}

// Close modal
modalClose.addEventListener("click", () => {
  surpriseModal.classList.add("hidden");
});

surpriseModal.addEventListener("click", (e) => {
  if (e.target === surpriseModal) {
    surpriseModal.classList.add("hidden");
  }
});

// Update today's date
function updateTodayDate() {
  const now = getCurrentDate();
  const locale = getLocale();
  const options = { 
    year: "numeric", 
    month: "long", 
    day: "numeric" 
  };
  todayDateEl.textContent = now.toLocaleDateString(locale === "zh-Hant" ? "zh-TW" : "en-US", options);
}

// Initialize
createCalendar();
updateTodayDate();

// Listen for locale changes
document.addEventListener("localeChange", () => {
  createCalendar();
  updateTodayDate();
});

