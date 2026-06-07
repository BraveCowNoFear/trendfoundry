const cards = [...document.querySelectorAll(".card")];
const buttons = [...document.querySelectorAll("[data-source-filter]")];
const search = document.querySelector("#opportunity-search");
const resultCount = document.querySelector("#result-count");
const languageButtons = [...document.querySelectorAll("[data-language-toggle]")];
const translatable = [...document.querySelectorAll("[data-i18n-en][data-i18n-zh]")];
const placeholderTargets = [...document.querySelectorAll("[data-i18n-placeholder-en][data-i18n-placeholder-zh]")];
let activeSource = "all";
const requestedLanguage = new URLSearchParams(window.location.search).get("lang");
const forcedLanguage = document.body.dataset.forceLang;
let currentLanguage = forcedLanguage || (requestedLanguage === "en" || requestedLanguage === "zh" ? requestedLanguage : localStorage.getItem("trendfoundry-language")) || document.body.dataset.defaultLang || "en";

function countLabel(count) {
  if (currentLanguage === "zh") return "正在显示 " + count + " 条机会";
  return count === 1 ? "Showing 1 opportunity" : "Showing " + count + " opportunities";
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
  resultCount.classList.remove("bump");
  window.requestAnimationFrame(() => resultCount.classList.add("bump"));
  window.setTimeout(() => resultCount.classList.remove("bump"), 220);
}

for (const button of buttons) {
  button.addEventListener("click", () => {
    activeSource = button.dataset.sourceFilter;
    for (const other of buttons) {
      const active = other === button;
      other.classList.toggle("active", active);
      other.setAttribute("aria-pressed", active ? "true" : "false");
    }
    applyFilters();
  });
}

for (const button of languageButtons) {
  button.addEventListener("click", () => setLanguage(button.dataset.languageToggle));
}

search.addEventListener("input", applyFilters);
setLanguage(currentLanguage);
const revealTargets = [...document.querySelectorAll("main > section, .topbar > div, .topbar aside")];
for (const target of revealTargets) target.classList.add("reveal-item");
if ("IntersectionObserver" in window) {
  const revealObserver = new IntersectionObserver((entries) => {
    for (const entry of entries) {
      if (entry.isIntersecting) {
        entry.target.classList.add("is-visible");
        revealObserver.unobserve(entry.target);
      }
    }
  }, { threshold: 0.14 });
  for (const target of revealTargets) revealObserver.observe(target);
} else {
  for (const target of revealTargets) target.classList.add("is-visible");
}

const flowSteps = [...document.querySelectorAll("[data-flow-step]")];
function activateFlowStep(step) {
  for (const item of flowSteps) item.classList.toggle("is-current", item === step);
}
for (const step of flowSteps) {
  const button = step.querySelector("button");
  if (button) button.addEventListener("click", () => activateFlowStep(step));
}
if ("IntersectionObserver" in window && flowSteps.length) {
  const flowObserver = new IntersectionObserver((entries) => {
    const visibleEntries = entries
      .filter((entry) => entry.isIntersecting)
      .sort((a, b) => b.intersectionRatio - a.intersectionRatio);
    if (visibleEntries[0]) activateFlowStep(visibleEntries[0].target);
  }, { threshold: [0.42, 0.7] });
  for (const step of flowSteps) flowObserver.observe(step);
}

const hero = document.querySelector(".topbar");
const productVisualNode = document.querySelector(".product-visual");
const motionSafe = !window.matchMedia("(prefers-reduced-motion: reduce)").matches;
if (hero && productVisualNode && motionSafe) {
  hero.addEventListener("pointermove", (event) => {
    const rect = hero.getBoundingClientRect();
    const x = (event.clientX - rect.left) / rect.width - 0.5;
    const y = (event.clientY - rect.top) / rect.height - 0.5;
    productVisualNode.style.transform = "rotateY(" + (x * -6).toFixed(2) + "deg) rotateX(" + (y * 4).toFixed(2) + "deg) translateY(-4px)";
  });
  hero.addEventListener("pointerleave", () => {
    productVisualNode.style.transform = "";
  });
}
