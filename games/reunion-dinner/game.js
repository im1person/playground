// Reunion Dinner Platter — drag dishes onto round table

const tableSvg = document.getElementById("tableSvg");
const dishLayer = document.getElementById("dishLayer");
const dishButtons = document.getElementById("dishButtons");
const clearBtn = document.getElementById("clearBtn");
const randomBtn = document.getElementById("randomBtn");
const dishCountEl = document.getElementById("dishCount");

const TABLE_CX = 200;
const TABLE_CY = 200;
const TABLE_R = 160;
const LAYER_SIZE = 400;

let selectedDishType = null;
let dishes = [];

// Dish types: id, name (en), name (zh-HK), emoji, meaning (en), meaning (zh-HK)
const dishTypes = [
  { id: "fish", nameEn: "Fish", nameZh: "魚", emoji: "🐟", meaningEn: "Surplus every year", meaningZh: "年年有餘" },
  { id: "chicken", nameEn: "Chicken", nameZh: "雞", emoji: "🐔", meaningEn: "Good fortune", meaningZh: "吉祥如意" },
  { id: "niangao", nameEn: "Nian gao", nameZh: "年糕", emoji: "🍚", meaningEn: "Rise higher every year", meaningZh: "步步高升" },
  { id: "dumpling", nameEn: "Dumplings", nameZh: "餃子", emoji: "🥟", meaningEn: "Wealth", meaningZh: "招財進寶" },
  { id: "turnip", nameEn: "Turnip cake", nameZh: "蘿蔔糕", emoji: "🥕", meaningEn: "Good omen", meaningZh: "好彩頭" },
  { id: "hair", nameEn: "Hair seaweed", nameZh: "髮菜", emoji: "🥬", meaningEn: "Get rich", meaningZh: "發財" },
  { id: "lettuce", nameEn: "Lettuce", nameZh: "生菜", emoji: "🥗", meaningEn: "Make money", meaningZh: "生財" },
  { id: "tangyuan", nameEn: "Tang yuan", nameZh: "湯圓", emoji: "⚪", meaningEn: "Reunion", meaningZh: "團圓" },
  { id: "oyster", nameEn: "Dried oyster", nameZh: "蠔豉", emoji: "🦪", meaningEn: "Good things", meaningZh: "好事" },
  { id: "lotus", nameEn: "Lotus root", nameZh: "蓮藕", emoji: "🌿", meaningEn: "Surplus year after year", meaningZh: "連年有餘" },
];

function getLocale() {
  return localStorage.getItem("playground-locale") || "en";
}

function getDishName(d) {
  const loc = getLocale();
  return loc === "zh-HK" || loc === "zh-Hant" ? d.nameZh : d.nameEn;
}

function getDishMeaning(d) {
  const loc = getLocale();
  return loc === "zh-HK" || loc === "zh-Hant" ? d.meaningZh : d.meaningEn;
}

function drawTable() {
  const svgNS = "http://www.w3.org/2000/svg";
  tableSvg.innerHTML = "";

  // Tablecloth (circle)
  const cloth = document.createElementNS(svgNS, "circle");
  cloth.setAttribute("cx", TABLE_CX);
  cloth.setAttribute("cy", TABLE_CY);
  cloth.setAttribute("r", TABLE_R);
  cloth.setAttribute("fill", "#c62828");
  cloth.setAttribute("stroke", "#8b0000");
  cloth.setAttribute("stroke-width", "4");
  tableSvg.appendChild(cloth);

  // Inner circle (table surface)
  const surface = document.createElementNS(svgNS, "circle");
  surface.setAttribute("cx", TABLE_CX);
  surface.setAttribute("cy", TABLE_CY);
  surface.setAttribute("r", TABLE_R - 20);
  surface.setAttribute("fill", "#e8d5b5");
  surface.setAttribute("stroke", "#c4a574");
  surface.setAttribute("stroke-width", "2");
  tableSvg.appendChild(surface);
}

function isPointOnTable(x, y) {
  const dx = x - TABLE_CX;
  const dy = y - TABLE_CY;
  return dx * dx + dy * dy <= (TABLE_R - 24) * (TABLE_R - 24);
}

function getRandomPointOnTable() {
  for (let i = 0; i < 100; i++) {
    const angle = Math.random() * Math.PI * 2;
    const r = (TABLE_R - 50) * Math.sqrt(Math.random());
    const x = TABLE_CX + r * Math.cos(angle);
    const y = TABLE_CY + r * Math.sin(angle);
    if (isPointOnTable(x, y)) return { x, y };
  }
  return { x: TABLE_CX, y: TABLE_CY };
}

function createDishButton(type) {
  const btn = document.createElement("button");
  btn.className = "dish-btn";
  btn.setAttribute("data-type", type.id);
  btn.innerHTML = `<span class="dish-emoji">${type.emoji}</span><span class="dish-label">${getDishName(type)}</span>`;
  btn.title = `${getDishName(type)} — ${getDishMeaning(type)}`;
  btn.addEventListener("click", () => {
    selectedDishType = type;
    document.querySelectorAll(".dish-btn").forEach((b) => b.classList.remove("selected"));
    btn.classList.add("selected");
  });
  return btn;
}

function initDishButtons() {
  dishTypes.forEach((type) => {
    dishButtons.appendChild(createDishButton(type));
  });
}

const DISH_SIZE = 44;

// Place dish at layer pixel position (0..layerWidth, 0..layerHeight)
function placeDish(layerPixelX, layerPixelY) {
  if (!selectedDishType) {
    selectedDishType = dishTypes[0];
    document.querySelector(".dish-btn").classList.add("selected");
  }
  const rect = dishLayer.getBoundingClientRect();
  const svgX = (layerPixelX / rect.width) * LAYER_SIZE;
  const svgY = (layerPixelY / rect.height) * LAYER_SIZE;
  if (!isPointOnTable(svgX, svgY)) return;

  const el = document.createElement("div");
  el.className = "dish";
  el.setAttribute("data-type", selectedDishType.id);
  el.style.left = `${layerPixelX - DISH_SIZE / 2}px`;
  el.style.top = `${layerPixelY - DISH_SIZE / 2}px`;
  el.textContent = selectedDishType.emoji;
  el.title = `${getDishName(selectedDishType)} — ${getDishMeaning(selectedDishType)}`;

  makeDraggable(el);
  el.addEventListener("dblclick", () => removeDish(el));

  dishLayer.appendChild(el);
  dishes.push(el);
  updateDishCount(1);
}

function makeDraggable(element) {
  let isDragging = false;
  let initialX, initialY;

  element.addEventListener("mousedown", (e) => {
    if (e.button !== 0) return;
    const rect = element.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    initialX = e.clientX - centerX;
    initialY = e.clientY - centerY;
    if (element === e.target || element.contains(e.target)) {
      isDragging = true;
      element.style.cursor = "grabbing";
    }
  });

  document.addEventListener("mousemove", (e) => {
    if (!isDragging) return;
    e.preventDefault();
    const centerScreenX = e.clientX - initialX;
    const centerScreenY = e.clientY - initialY;
    const layerRect = dishLayer.getBoundingClientRect();
    let left = centerScreenX - layerRect.left - DISH_SIZE / 2;
    let top = centerScreenY - layerRect.top - DISH_SIZE / 2;
    const maxLeft = layerRect.width - DISH_SIZE;
    const maxTop = layerRect.height - DISH_SIZE;
    left = Math.max(0, Math.min(left, maxLeft));
    top = Math.max(0, Math.min(top, maxTop));
    const centerDishX = left + DISH_SIZE / 2;
    const centerDishY = top + DISH_SIZE / 2;
    const svgX = (centerDishX / layerRect.width) * LAYER_SIZE;
    const svgY = (centerDishY / layerRect.height) * LAYER_SIZE;
    if (!isPointOnTable(svgX, svgY)) return;
    element.style.left = `${left}px`;
    element.style.top = `${top}px`;
  });

  document.addEventListener("mouseup", () => {
    if (isDragging) {
      isDragging = false;
      element.style.cursor = "grab";
    }
  });
}

function removeDish(dish) {
  dish.remove();
  dishes = dishes.filter((d) => d !== dish);
  updateDishCount(-1);
}

function updateDishCount(delta) {
  const count = dishes.length;
  dishCountEl.textContent = count;
}

function clearAll() {
  dishes.forEach((d) => d.remove());
  dishes = [];
  updateDishCount(0);
}

function randomTable() {
  clearAll();
  const n = 5 + Math.floor(Math.random() * 6);
  const layerRect = dishLayer.getBoundingClientRect();
  const scaleX = layerRect.width / LAYER_SIZE;
  const scaleY = layerRect.height / LAYER_SIZE;
  for (let i = 0; i < n; i++) {
    const type = dishTypes[Math.floor(Math.random() * dishTypes.length)];
    selectedDishType = type;
    const { x, y } = getRandomPointOnTable();
    placeDish(x * scaleX, y * scaleY);
  }
}

dishLayer.addEventListener("click", (e) => {
  if (e.target !== dishLayer && !e.target.classList.contains("dish-layer")) return;
  const rect = dishLayer.getBoundingClientRect();
  const layerPx = e.clientX - rect.left;
  const layerPy = e.clientY - rect.top;
  const svgX = (layerPx / rect.width) * LAYER_SIZE;
  const svgY = (layerPy / rect.height) * LAYER_SIZE;
  if (isPointOnTable(svgX, svgY)) placeDish(layerPx, layerPy);
});

clearBtn.addEventListener("click", clearAll);
randomBtn.addEventListener("click", randomTable);

drawTable();
initDishButtons();
