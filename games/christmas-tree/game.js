// Christmas Tree Decorator Game

const treeSvg = document.getElementById("treeSvg");
const ornamentLayer = document.getElementById("ornamentLayer");
const ornamentButtons = document.getElementById("ornamentButtons");
const clearBtn = document.getElementById("clearBtn");
const randomBtn = document.getElementById("randomBtn");
const ornamentCountEl = document.getElementById("ornamentCount");
const scoreEl = document.getElementById("score");

let selectedOrnamentType = null;
let ornaments = [];
let score = 0;
let ornamentCount = 0;

// Ornament types with colors and points
const ornamentTypes = [
  { id: "red", name: "Red Ball", color: "#d32f2f", points: 10, emoji: "🔴" },
  { id: "blue", name: "Blue Ball", color: "#1976d2", points: 10, emoji: "🔵" },
  { id: "gold", name: "Gold Star", color: "#ffd700", points: 20, emoji: "⭐" },
  { id: "green", name: "Green Ball", color: "#388e3c", points: 10, emoji: "🟢" },
  { id: "purple", name: "Purple Ball", color: "#7b1fa2", points: 15, emoji: "🟣" },
  { id: "silver", name: "Silver Bell", color: "#9e9e9e", points: 15, emoji: "🔔" },
];

// Get locale helper
function getLocale() {
  return localStorage.getItem("playground-locale") || "en";
}

// Draw tree
function drawTree() {
  const svgNS = "http://www.w3.org/2000/svg";
  
  // Clear existing tree
  treeSvg.innerHTML = "";

  // Tree trunk
  const trunk = document.createElementNS(svgNS, "rect");
  trunk.setAttribute("x", "180");
  trunk.setAttribute("y", "420");
  trunk.setAttribute("width", "40");
  trunk.setAttribute("height", "80");
  trunk.setAttribute("fill", "#8b4513");
  trunk.setAttribute("stroke", "#654321");
  trunk.setAttribute("stroke-width", "2");
  treeSvg.appendChild(trunk);

  // Tree layers (triangles)
  const layers = [
    { x: 50, y: 350, width: 300, height: 80 },
    { x: 80, y: 280, width: 240, height: 80 },
    { x: 110, y: 210, width: 180, height: 80 },
    { x: 140, y: 140, width: 120, height: 80 },
    { x: 170, y: 70, width: 60, height: 80 },
  ];

  layers.forEach((layer) => {
    const triangle = document.createElementNS(svgNS, "polygon");
    const points = [
      `${layer.x + layer.width / 2},${layer.y}`,
      `${layer.x},${layer.y + layer.height}`,
      `${layer.x + layer.width},${layer.y + layer.height}`,
    ].join(" ");
    triangle.setAttribute("points", points);
    triangle.setAttribute("fill", "#2e7d32");
    triangle.setAttribute("stroke", "#1b5e20");
    triangle.setAttribute("stroke-width", "3");
    treeSvg.appendChild(triangle);
  });

  // Star on top
  const star = document.createElementNS(svgNS, "polygon");
  const starPoints = [
    "200,20",
    "210,40",
    "230,40",
    "215,55",
    "220,75",
    "200,65",
    "180,75",
    "185,55",
    "170,40",
    "190,40",
  ].join(" ");
  star.setAttribute("points", starPoints);
  star.setAttribute("fill", "#ffd700");
  star.setAttribute("stroke", "#f57f17");
  star.setAttribute("stroke-width", "2");
  treeSvg.appendChild(star);
}

// Create ornament button
function createOrnamentButton(type) {
  const btn = document.createElement("button");
  btn.className = "ornament-btn";
  btn.setAttribute("data-type", type.id);
  btn.innerHTML = `<span class="ornament-emoji">${type.emoji}</span>`;
  btn.style.backgroundColor = type.color;
  btn.title = type.name;
  btn.addEventListener("click", () => {
    selectedOrnamentType = type;
    document.querySelectorAll(".ornament-btn").forEach((b) => {
      b.classList.remove("selected");
    });
    btn.classList.add("selected");
  });
  return btn;
}

// Initialize ornament buttons
function initOrnamentButtons() {
  ornamentTypes.forEach((type) => {
    const btn = createOrnamentButton(type);
    ornamentButtons.appendChild(btn);
  });
}

// Place ornament on tree
function placeOrnament(x, y) {
  if (!selectedOrnamentType) {
    // Auto-select first ornament if none selected
    selectedOrnamentType = ornamentTypes[0];
    document.querySelector(".ornament-btn").classList.add("selected");
  }

  const ornament = document.createElement("div");
  ornament.className = "ornament";
  ornament.setAttribute("data-type", selectedOrnamentType.id);
  
  // Center the ornament on the click point (ornament is 40x40px)
  const ornamentSize = 40;
  ornament.style.left = `${x - ornamentSize / 2}px`;
  ornament.style.top = `${y - ornamentSize / 2}px`;
  ornament.style.backgroundColor = selectedOrnamentType.color;
  ornament.textContent = selectedOrnamentType.emoji;
  ornament.setAttribute("data-points", selectedOrnamentType.points);

  // Make draggable
  makeDraggable(ornament);

  // Add click to remove
  ornament.addEventListener("dblclick", () => {
    removeOrnament(ornament);
  });

  ornamentLayer.appendChild(ornament);
  ornaments.push(ornament);
  updateScore(selectedOrnamentType.points);
  updateOrnamentCount(1);
}

// Make element draggable
function makeDraggable(element) {
  let isDragging = false;
  let currentX;
  let currentY;
  let initialX;
  let initialY;
  const ornamentSize = 40;

  element.addEventListener("mousedown", (e) => {
    if (e.button !== 0) return; // Only left mouse button
    // Calculate offset from center of ornament
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
    if (isDragging) {
      e.preventDefault();
      // Calculate center position
      const centerX = e.clientX - initialX;
      const centerY = e.clientY - initialY;

      // Constrain to tree area (accounting for centering)
      const treeRect = ornamentLayer.getBoundingClientRect();
      const minX = ornamentSize / 2;
      const maxX = treeRect.width - ornamentSize / 2;
      const minY = ornamentSize / 2;
      const maxY = treeRect.height - ornamentSize / 2;
      
      const constrainedX = Math.max(minX, Math.min(centerX, maxX));
      const constrainedY = Math.max(minY, Math.min(centerY, maxY));

      // Set position (top-left corner = center - half size)
      element.style.left = `${constrainedX - ornamentSize / 2}px`;
      element.style.top = `${constrainedY - ornamentSize / 2}px`;
    }
  });

  document.addEventListener("mouseup", () => {
    if (isDragging) {
      isDragging = false;
      element.style.cursor = "grab";
    }
  });
}

// Remove ornament
function removeOrnament(ornament) {
  const points = parseInt(ornament.getAttribute("data-points") || "0");
  ornament.remove();
  ornaments = ornaments.filter((o) => o !== ornament);
  updateScore(-points);
  updateOrnamentCount(-1);
}

// Update score
function updateScore(points) {
  score += points;
  scoreEl.textContent = score;
}

// Update ornament count
function updateOrnamentCount(count) {
  ornamentCount += count;
  ornamentCountEl.textContent = ornamentCount;
}

// Clear all ornaments
function clearAll() {
  ornaments.forEach((ornament) => ornament.remove());
  ornaments = [];
  score = 0;
  ornamentCount = 0;
  updateScore(0);
  updateOrnamentCount(0);
}

// Check if a point is within the tree shape
// Tree SVG viewBox is 0 0 400 500, ornament layer is 400x500px
// Tree layers (triangles) - each triangle has:
//   Top point: (centerX, layer.y)
//   Bottom left: (layer.x, layer.y + layer.height)
//   Bottom right: (layer.x + layer.width, layer.y + layer.height)
function isPointOnTree(x, y) {
  // Coordinates are already in the same space (400x500)
  // Just need to check if point is within tree boundaries

  // Check trunk (rectangle) first - easier check
  if (x >= 180 && x <= 220 && y >= 420 && y <= 500) {
    return true;
  }

  // Helper function to check if point is in triangle using barycentric coordinates
  function pointInTriangle(px, py, x1, y1, x2, y2, x3, y3) {
    const denom = (y2 - y3) * (x1 - x3) + (x3 - x2) * (y1 - y3);
    if (Math.abs(denom) < 0.001) return false; // Degenerate triangle
    
    const a = ((y2 - y3) * (px - x3) + (x3 - x2) * (py - y3)) / denom;
    const b = ((y3 - y1) * (px - x3) + (x1 - x3) * (py - y3)) / denom;
    const c = 1 - a - b;
    
    return a >= 0 && b >= 0 && c >= 0;
  }

  // Check each triangle layer (from drawTree function)
  // Layer 1: x=50, y=350, width=300, height=80
  const layer1 = { x: 50, y: 350, width: 300, height: 80 };
  if (pointInTriangle(x, y, 
    layer1.x + layer1.width / 2, layer1.y,  // top center
    layer1.x, layer1.y + layer1.height,     // bottom left
    layer1.x + layer1.width, layer1.y + layer1.height)) { // bottom right
    return true;
  }

  // Layer 2: x=80, y=280, width=240, height=80
  const layer2 = { x: 80, y: 280, width: 240, height: 80 };
  if (pointInTriangle(x, y,
    layer2.x + layer2.width / 2, layer2.y,
    layer2.x, layer2.y + layer2.height,
    layer2.x + layer2.width, layer2.y + layer2.height)) {
    return true;
  }

  // Layer 3: x=110, y=210, width=180, height=80
  const layer3 = { x: 110, y: 210, width: 180, height: 80 };
  if (pointInTriangle(x, y,
    layer3.x + layer3.width / 2, layer3.y,
    layer3.x, layer3.y + layer3.height,
    layer3.x + layer3.width, layer3.y + layer3.height)) {
    return true;
  }

  // Layer 4: x=140, y=140, width=120, height=80
  const layer4 = { x: 140, y: 140, width: 120, height: 80 };
  if (pointInTriangle(x, y,
    layer4.x + layer4.width / 2, layer4.y,
    layer4.x, layer4.y + layer4.height,
    layer4.x + layer4.width, layer4.y + layer4.height)) {
    return true;
  }

  // Layer 5: x=170, y=70, width=60, height=80
  const layer5 = { x: 170, y: 70, width: 60, height: 80 };
  if (pointInTriangle(x, y,
    layer5.x + layer5.width / 2, layer5.y,
    layer5.x, layer5.y + layer5.height,
    layer5.x + layer5.width, layer5.y + layer5.height)) {
    return true;
  }

  return false;
}

// Generate random point on tree
function getRandomPointOnTree() {
  const maxAttempts = 200;
  for (let i = 0; i < maxAttempts; i++) {
    // Generate random point in the general tree area
    // Tree spans roughly x: 50-350, y: 70-430
    const x = 50 + Math.random() * 300;
    const y = 70 + Math.random() * 360;
    
    if (isPointOnTree(x, y)) {
      return { x, y };
    }
  }
  // Fallback: return points that are definitely on the tree
  const fallbackPoints = [
    { x: 200, y: 250 }, // Middle of tree
    { x: 200, y: 300 }, // Lower middle
    { x: 200, y: 200 }, // Upper middle
    { x: 150, y: 350 }, // Left side
    { x: 250, y: 350 }, // Right side
  ];
  return fallbackPoints[Math.floor(Math.random() * fallbackPoints.length)];
}

// Random decorate
function randomDecorate() {
  clearAll();
  const numOrnaments = 15 + Math.floor(Math.random() * 20); // 15-35 ornaments

  for (let i = 0; i < numOrnaments; i++) {
    const type = ornamentTypes[Math.floor(Math.random() * ornamentTypes.length)];
    selectedOrnamentType = type;
    
    // Get a random point that's actually on the tree (center point)
    const { x, y } = getRandomPointOnTree();

    const ornament = document.createElement("div");
    ornament.className = "ornament";
    ornament.setAttribute("data-type", type.id);
    
    // Center the ornament on the point (ornament is 40x40px)
    const ornamentSize = 40;
    ornament.style.left = `${x - ornamentSize / 2}px`;
    ornament.style.top = `${y - ornamentSize / 2}px`;
    ornament.style.backgroundColor = type.color;
    ornament.textContent = type.emoji;
    ornament.setAttribute("data-points", type.points);

    makeDraggable(ornament);
    ornament.addEventListener("dblclick", () => {
      removeOrnament(ornament);
    });

    ornamentLayer.appendChild(ornament);
    ornaments.push(ornament);
    updateScore(type.points);
    updateOrnamentCount(1);
  }
}

// Click on tree to place ornament
ornamentLayer.addEventListener("click", (e) => {
  // Only place if clicking directly on the layer (not on an existing ornament)
  if (e.target === ornamentLayer || e.target.classList.contains("ornament-layer")) {
    const rect = ornamentLayer.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    placeOrnament(x, y);
  }
});

// Event listeners
clearBtn.addEventListener("click", clearAll);
randomBtn.addEventListener("click", randomDecorate);

// Initialize
drawTree();
initOrnamentButtons();

