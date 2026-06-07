const cards = [...document.querySelectorAll(".card")];
const buttons = [...document.querySelectorAll("[data-source-filter]")];
const search = document.querySelector("#opportunity-search");
const resultCount = document.querySelector("#result-count");
const languageButtons = [...document.querySelectorAll("[data-language-toggle]")];
const translatable = [...document.querySelectorAll("[data-i18n-en][data-i18n-zh]")];
const placeholderTargets = [...document.querySelectorAll("[data-i18n-placeholder-en][data-i18n-placeholder-zh]")];
let activeSource = "all";
let currentLanguage = localStorage.getItem("trendfoundry-language") || "en";

function countLabel(count) {
  if (currentLanguage === "zh") return count + " 个可见机会";
  return count === 1 ? "1 visible opportunity" : count + " visible opportunities";
}

function setLanguage(language) {
  currentLanguage = language === "zh" ? "zh" : "en";
  document.body.dataset.lang = currentLanguage;
  document.documentElement.lang = currentLanguage === "zh" ? "zh-CN" : "en";
  localStorage.setItem("trendfoundry-language", currentLanguage);
  for (const node of translatable) {
    node.textContent = node.dataset[currentLanguage === "zh" ? "i18nZh" : "i18nEn"];
  }
  for (const node of placeholderTargets) {
    node.setAttribute("placeholder", node.dataset[currentLanguage === "zh" ? "i18nPlaceholderZh" : "i18nPlaceholderEn"]);
  }
  for (const button of languageButtons) {
    button.classList.toggle("active", button.dataset.languageToggle === currentLanguage);
  }
  const visible = [...cards].filter((card) => !card.classList.contains("hidden")).length;
  resultCount.textContent = countLabel(visible);
}

function applyFilters() {
  const query = (search.value || "").trim().toLowerCase();
  let visible = 0;
  for (const card of cards) {
    const sourceMatch = activeSource === "all" || card.dataset.source === activeSource;
    const textMatch = !query || card.dataset.search.includes(query);
    const show = sourceMatch && textMatch;
    card.classList.toggle("hidden", !show);
    if (show) visible += 1;
  }
  resultCount.textContent = countLabel(visible);
}

for (const button of buttons) {
  button.addEventListener("click", () => {
    activeSource = button.dataset.sourceFilter;
    for (const other of buttons) other.classList.toggle("active", other === button);
    applyFilters();
  });
}

for (const button of languageButtons) {
  button.addEventListener("click", () => setLanguage(button.dataset.languageToggle));
}

search.addEventListener("input", applyFilters);
setLanguage(currentLanguage);
