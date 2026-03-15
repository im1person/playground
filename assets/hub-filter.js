/**
 * Hub filter: search + section (All / Games / Tools) + festival for index.html
 *
 * Festival filter values (data-filter / data-festival):
 *   christmas, lunar-new-year, halloween, mid-autumn (active)
 * Planned for future: easter, valentines, dragon-boat, chung-yeung
 */
function getSearchableText(entry) {
  const content = entry.querySelector(".game-content");
  if (!content) return "";
  const parts = [content.textContent || ""];
  content.querySelectorAll("[data-en],[data-zh-HK]").forEach((el) => {
    if (el.dataset.en) parts.push(el.dataset.en);
    if (el.dataset.zhHK) parts.push(el.dataset.zhHK);
  });
  const img = entry.querySelector("img[alt]");
  if (img && img.alt) parts.push(img.alt);
  return parts.join(" ").toLowerCase();
}

const FESTIVAL_FILTERS = ["christmas", "lunar-new-year", "halloween", "mid-autumn"];

function applyFilter() {
  const searchRaw = (document.getElementById("hubSearch") || {}).value || "";
  const search = searchRaw.trim().toLowerCase();
  const activeChip = document.querySelector(".hub-chip.active");
  const sectionFilter = (activeChip && activeChip.dataset.filter) || "all";
  const isFestivalFilter = FESTIVAL_FILTERS.includes(sectionFilter);

  document.querySelectorAll(".game-entry").forEach((entry) => {
    const section = entry.dataset.section || "";
    const festival = entry.dataset.festival || "";
    const sectionMatch = isFestivalFilter
      ? festival === sectionFilter
      : sectionFilter === "all" || section === sectionFilter;
    const text = getSearchableText(entry);
    const searchMatch = !search || text.includes(search);
    const show = sectionMatch && searchMatch;
    entry.classList.toggle("hub-hidden", !show);
  });

  document.querySelectorAll(".game-list[data-section]").forEach((list) => {
    const hasVisible = list.querySelectorAll(".game-entry:not(.hub-hidden)").length > 0;
    list.classList.toggle("hub-section-empty", !hasVisible);
  });

  document.querySelectorAll(".section-title[data-section]").forEach((title) => {
    const next = title.nextElementSibling;
    const isEmpty =
      !next ||
      !next.classList.contains("game-list") ||
      next.classList.contains("hub-section-empty");
    title.classList.toggle("hub-section-empty", isEmpty);
  });
}

function initHubFilter() {
  const searchEl = document.getElementById("hubSearch");
  const chips = document.querySelectorAll(".hub-chip[data-filter]");

  if (searchEl) {
    searchEl.addEventListener("input", applyFilter);
    searchEl.addEventListener("keydown", (e) => {
      if (e.key === "Escape") {
        searchEl.value = "";
        searchEl.blur();
        applyFilter();
      }
    });
  }

  chips.forEach((chip) => {
    chip.addEventListener("click", () => {
      chips.forEach((c) => c.classList.remove("active"));
      chip.classList.add("active");
      applyFilter();
    });
  });

  applyFilter();
}

export { initHubFilter, applyFilter };
