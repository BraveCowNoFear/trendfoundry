const cards = [...document.querySelectorAll(".card")];
const buttons = [...document.querySelectorAll("[data-source-filter]")];
const search = document.querySelector("#opportunity-search");
const resultCount = document.querySelector("#result-count");
const languageButtons = [...document.querySelectorAll("[data-language-toggle]")];
const translatable = [...document.querySelectorAll("[data-i18n-en][data-i18n-zh]")];
const placeholderTargets = [...document.querySelectorAll("[data-i18n-placeholder-en][data-i18n-placeholder-zh]")];
const closeHrefTargets = [...document.querySelectorAll("[data-close-href-en][data-close-href-zh]")];
const videoCountInput = document.querySelector("#video-count");
const researchHoursInput = document.querySelector("#research-hours");
const videoCountOutput = document.querySelector("#video-count-output");
const researchHoursOutput = document.querySelector("#research-hours-output");
const savedHoursOutput = document.querySelector("#saved-hours");
const savedHoursCopy = document.querySelector("#saved-hours-copy");
const tierSuggestion = document.querySelector("#tier-suggestion");
const deliverableButtons = [...document.querySelectorAll("[data-deliverable-tab]")];
const deliverablePanels = [...document.querySelectorAll("[data-deliverable-panel]")];
const deliverableViewer = document.querySelector(".deliverable-viewer");
const deliverableStatus = document.querySelector("[data-deliverable-status]");
const proofButtons = [...document.querySelectorAll("[data-proof-tab]")];
const proofPanels = [...document.querySelectorAll("[data-proof-panel]")];
const trustDockButtons = [...document.querySelectorAll("[data-trust-dock]")];
const trustDockPanels = [...document.querySelectorAll("[data-trust-dock-panel]")];
const trustDockSurface = document.querySelector(".trust-dock-surface");
const finalActionButtons = [...document.querySelectorAll("[data-final-action]")];
const finalActionPanels = [...document.querySelectorAll("[data-final-panel]")];
const finalActionNode = document.querySelector(".closing-console");
const sampleSpotlightButtons = [...document.querySelectorAll("[data-sample-spotlight]")];
const sampleSpotlightPanels = [...document.querySelectorAll("[data-sample-spotlight-panel]")];
const fitPersonaButtons = [...document.querySelectorAll("[data-fit-persona]")];
const fitDeviceNode = document.querySelector(".fit-device");
const fitTitleNode = document.querySelector("#fit-title");
const fitKitNode = document.querySelector("#fit-kit");
const fitCadenceNode = document.querySelector("#fit-cadence");
const fitSourceNode = document.querySelector("#fit-source");
const fitSignalNode = document.querySelector("#fit-signal");
const fitStrengthNode = document.querySelector("#fit-strength");
const fitVelocityNode = document.querySelector("#fit-velocity");
const fitProgressLabel = document.querySelector("#fit-progress-label");
const fitSignalLink = document.querySelector("#fit-signal-link");
const fitPreviewCopyNode = document.querySelector("#fit-preview-copy");
const fitMatrixColumns = [...document.querySelectorAll("[data-matrix-column]")];
const heroTierButtons = [...document.querySelectorAll("[data-hero-tier]")];
const tierCards = [...document.querySelectorAll("[data-tier-card]")];
const tierSelectButtons = [...document.querySelectorAll("[data-tier-select]")];
const tierRailButtons = [...document.querySelectorAll("[data-tier-jump]")];
const selectedTierName = document.querySelector("#selected-tier-name");
const selectedTierCopy = document.querySelector("#selected-tier-copy");
const selectedTierPrice = document.querySelector("#selected-tier-price");
const selectedTierCadence = document.querySelector("#selected-tier-cadence");
const selectedTierCommitment = document.querySelector("#selected-tier-commitment");
const selectedTierCta = document.querySelector("#selected-tier-cta");
const selectedTierPack = document.querySelector("#selected-tier-pack");
const selectedTierDelivery = document.querySelector("#selected-tier-delivery");
const selectedTierRoute = document.querySelector("#selected-tier-route");
const pricingChooserNode = document.querySelector(".pricing-chooser");
const pricingStudioNode = document.querySelector(".pricing-studio");
const tierDirectActions = [...document.querySelectorAll("[data-tier-direct]")];
const localNavNode = document.querySelector(".local-nav");
const opportunityGalleryNode = document.querySelector(".opportunity-gallery");
const galleryPositionNode = document.querySelector("#gallery-position");
const galleryActiveScoreNode = document.querySelector("#gallery-active-score");
const galleryStepButtons = [...document.querySelectorAll("[data-gallery-step]")];
const opportunityFocusTitle = document.querySelector("#opportunity-focus-title");
const opportunityFocusSummary = document.querySelector("#opportunity-focus-summary");
const opportunityFocusRank = document.querySelector("#opportunity-focus-rank");
const opportunityFocusSource = document.querySelector("#opportunity-focus-source");
const opportunityFocusScore = document.querySelector("#opportunity-focus-score");
const opportunityFocusLink = document.querySelector("#opportunity-focus-link");
let selectedTierCard = tierCards.find((card) => card.classList.contains("selected")) || tierCards[0] || null;
let activeFitPersonaButton = fitPersonaButtons.find((button) => button.classList.contains("active")) || fitPersonaButtons[0] || null;
let activeOpportunityCard = cards[0] || null;
let activeSource = "all";
const requestedLanguage = new URLSearchParams(window.location.search).get("lang");
const forcedLanguage = document.body.dataset.forceLang;
let currentLanguage = forcedLanguage || (requestedLanguage === "en" || requestedLanguage === "zh" ? requestedLanguage : localStorage.getItem("trendfoundry-language")) || document.body.dataset.defaultLang || "en";
const finePointer = window.matchMedia("(hover: hover) and (pointer: fine)").matches;

function countLabel(count) {
  if (currentLanguage === "zh") return "正在显示 " + count + " 条机会";
  return count === 1 ? "Showing 1 opportunity" : "Showing " + count + " opportunities";
}

function updatePlanningCalculator() {
  if (!videoCountInput || !researchHoursInput || !savedHoursOutput) return;
  const videos = Number(videoCountInput.value || 2);
  const hours = Number(researchHoursInput.value || 2);
  const monthlySaved = Math.max(1, Math.round(videos * hours * 4.3 * 0.55));
  if (videoCountOutput) videoCountOutput.textContent = String(videos);
  if (researchHoursOutput) researchHoursOutput.textContent = String(hours);
  savedHoursOutput.textContent = monthlySaved + "h";
  if (savedHoursCopy) {
    savedHoursCopy.textContent = currentLanguage === "zh" ? "预计每月释放的规划时间" : "estimated planning time reclaimed each month";
  }
  if (tierSuggestion) {
    let suggestion = currentLanguage === "zh" ? "建议：单期样品" : "Suggested: Sample issue";
    if (videos >= 2 || monthlySaved >= 8) suggestion = currentLanguage === "zh" ? "建议：周更情报" : "Suggested: Weekly pipeline";
    if (videos >= 4 || hours >= 5) suggestion = currentLanguage === "zh" ? "建议：垂直定制" : "Suggested: Custom niche";
    tierSuggestion.textContent = suggestion;
  }
}

function updateSelectedTier(card, scrollToCard = false) {
  if (!card) return;
  selectedTierCard = card;
  for (const tierCard of tierCards) tierCard.classList.toggle("selected", tierCard === card);
  for (const railButton of tierRailButtons) {
    const active = railButton.dataset.tierJump === card.dataset.tierCard;
    railButton.classList.toggle("active", active);
    railButton.setAttribute("aria-selected", active ? "true" : "false");
  }
  for (const heroButton of heroTierButtons) {
    const active = heroButton.dataset.heroTier === card.dataset.tierCard;
    heroButton.classList.toggle("is-selected", active);
    heroButton.setAttribute("aria-pressed", active ? "true" : "false");
  }
  for (const button of tierSelectButtons) {
    const active = button.dataset.tierSelect === card.dataset.tierCard;
    button.classList.toggle("primary", active);
    button.setAttribute("aria-pressed", active ? "true" : "false");
  }
  const suffix = currentLanguage === "zh" ? "Zh" : "En";
  if (selectedTierName) selectedTierName.textContent = card.dataset["tierName" + suffix] || "";
  if (selectedTierCopy) selectedTierCopy.textContent = card.dataset["tierBest" + suffix] || "";
  if (selectedTierPrice) selectedTierPrice.textContent = card.dataset.tierPrice || "";
  if (selectedTierCadence) selectedTierCadence.textContent = card.dataset["tierCadence" + suffix] || "";
  if (selectedTierCommitment) selectedTierCommitment.textContent = card.dataset["tierCommitment" + suffix] || "";
  if (selectedTierPack) selectedTierPack.textContent = card.dataset["tierPack" + suffix] || "";
  if (selectedTierDelivery) selectedTierDelivery.textContent = card.dataset["tierDelivery" + suffix] || "";
  if (selectedTierRoute) selectedTierRoute.textContent = card.dataset["tierRoute" + suffix] || "";
  if (selectedTierCta) {
    selectedTierCta.textContent = card.dataset["tierAction" + suffix] || selectedTierCta.textContent;
    selectedTierCta.setAttribute("href", card.dataset["tierHref" + suffix] || selectedTierCta.getAttribute("href") || "#");
  }
  if (pricingStudioNode) {
    const index = Number(card.dataset.tierIndex || 0);
    const progress = Math.round(((index + 1) / Math.max(1, tierCards.length)) * 100);
    pricingStudioNode.style.setProperty("--pricing-progress", progress + "%");
  }
  if (pricingChooserNode) {
    pricingChooserNode.classList.remove("is-updating");
    window.requestAnimationFrame(() => pricingChooserNode.classList.add("is-updating"));
    window.setTimeout(() => pricingChooserNode.classList.remove("is-updating"), 260);
  }
  for (const action of tierDirectActions) {
    action.setAttribute("href", action.dataset["tierHref" + suffix] || action.getAttribute("href") || "#");
  }
  if (scrollToCard && card.scrollIntoView) {
    card.scrollIntoView({ block: "nearest", inline: "center", behavior: "smooth" });
  }
}

function activateFitPersona(button, scrollToButton = false) {
  if (!button) return;
  activeFitPersonaButton = button;
  for (const item of fitPersonaButtons) {
    const active = item === button;
    item.classList.toggle("active", active);
    item.setAttribute("aria-pressed", active ? "true" : "false");
    if (active && scrollToButton && item.scrollIntoView) item.scrollIntoView({ block: "nearest", inline: "center", behavior: "smooth" });
  }
  const suffix = currentLanguage === "zh" ? "Zh" : "En";
  if (fitDeviceNode) {
    fitDeviceNode.dataset.fitDevice = button.dataset.fitPersona || "";
    fitDeviceNode.style.setProperty("--fit-progress", (button.dataset.fitProgress || "72") + "%");
    fitDeviceNode.classList.remove("is-switching");
    window.requestAnimationFrame(() => fitDeviceNode.classList.add("is-switching"));
    window.setTimeout(() => fitDeviceNode.classList.remove("is-switching"), 300);
  }
  for (const column of fitMatrixColumns) {
    column.classList.toggle("active", column.dataset.matrixColumn === (button.dataset.fitPersona || ""));
  }
  if (fitTitleNode) fitTitleNode.textContent = button.dataset["fitPack" + suffix] || "";
  if (fitKitNode) fitKitNode.textContent = button.dataset["fitKit" + suffix] || "";
  if (fitCadenceNode) fitCadenceNode.textContent = button.dataset["fitCadence" + suffix] || "";
  if (fitSourceNode) fitSourceNode.textContent = button.dataset.fitSource || "";
  if (fitSignalNode) fitSignalNode.textContent = button.dataset["fitSignal" + suffix] || "";
  if (fitPreviewCopyNode) fitPreviewCopyNode.textContent = button.dataset["fitCopy" + suffix] || "";
  if (fitStrengthNode) fitStrengthNode.textContent = button.dataset["fitRule" + suffix] || "";
  if (fitVelocityNode) fitVelocityNode.textContent = button.dataset["fitVelocity" + suffix] || "";
  if (fitProgressLabel) fitProgressLabel.textContent = (button.dataset.fitProgress || "72") + "%";
  if (fitSignalLink) fitSignalLink.setAttribute("href", button.dataset.fitUrl || "#");
}

function visibleOpportunityCards() {
  return cards.filter((card) => !card.classList.contains("hidden"));
}

function updateGalleryState(card) {
  if (!opportunityGalleryNode || !card) return;
  const visibleCards = visibleOpportunityCards();
  const activeIndex = Math.max(0, visibleCards.indexOf(card));
  const total = Math.max(1, visibleCards.length);
  for (const item of cards) {
    if (item.classList.contains("hidden")) {
      item.style.removeProperty("--gallery-order");
      continue;
    }
    const visibleIndex = visibleCards.indexOf(item);
    const offset = visibleIndex < activeIndex ? visibleIndex + total - activeIndex : visibleIndex - activeIndex;
    item.style.setProperty("--gallery-order", String(offset + 1));
    const score = Math.max(0, Math.min(100, Math.round(Number(item.dataset.focusScore || 0) / 2)));
    item.style.setProperty("--score-fill", score + "%");
  }
  opportunityGalleryNode.style.setProperty("--gallery-progress", Math.round(((activeIndex + 1) / total) * 100) + "%");
  if (galleryPositionNode) {
    galleryPositionNode.textContent = currentLanguage === "zh" ? "已选择 " + (activeIndex + 1) + " / " + total : (activeIndex + 1) + " of " + total + " selected";
  }
  if (galleryActiveScoreNode) {
    galleryActiveScoreNode.textContent = currentLanguage === "zh" ? "评分 " + (card.dataset.focusScore || "") : "Score " + (card.dataset.focusScore || "");
  }
}

function stepOpportunityGallery(direction) {
  const visibleCards = visibleOpportunityCards();
  if (!visibleCards.length) return;
  const currentIndex = Math.max(0, visibleCards.indexOf(activeOpportunityCard));
  const nextIndex = (currentIndex + direction + visibleCards.length) % visibleCards.length;
  const nextCard = visibleCards[nextIndex];
  updateOpportunityFocus(nextCard);
  if (nextCard.focus) nextCard.focus({ preventScroll: true });
  if (nextCard.scrollIntoView) nextCard.scrollIntoView({ block: "nearest", inline: "nearest", behavior: "smooth" });
}

function updateOpportunityFocus(card) {
  if (!opportunityFocusTitle) return;
  activeOpportunityCard = card || null;
  for (const item of cards) item.classList.toggle("is-focused", item === activeOpportunityCard);
  const suffix = currentLanguage === "zh" ? "Zh" : "En";
  if (!activeOpportunityCard) {
    opportunityFocusTitle.textContent = currentLanguage === "zh" ? "没有匹配机会" : "No matching opportunity";
    opportunityFocusSummary.textContent = currentLanguage === "zh" ? "换一个来源或缩短搜索词，焦点机会会立刻回到这里。" : "Switch lanes or shorten the search query and the focused opportunity will return here.";
    if (opportunityFocusRank) opportunityFocusRank.textContent = "#0";
    if (opportunityFocusSource) opportunityFocusSource.textContent = currentLanguage === "zh" ? "空结果" : "Empty";
    if (opportunityFocusScore) opportunityFocusScore.textContent = currentLanguage === "zh" ? "评分 -" : "Score -";
    if (opportunityFocusLink) {
      opportunityFocusLink.setAttribute("href", "#opportunities");
      opportunityFocusLink.textContent = currentLanguage === "zh" ? "调整筛选" : "Adjust filters";
    }
    if (opportunityGalleryNode) opportunityGalleryNode.style.setProperty("--gallery-progress", "0%");
    return;
  }
  updateGalleryState(activeOpportunityCard);
  opportunityFocusTitle.textContent = activeOpportunityCard.dataset["focusTitle" + suffix] || "";
  opportunityFocusSummary.textContent = activeOpportunityCard.dataset["focusSummary" + suffix] || "";
  if (opportunityFocusRank) opportunityFocusRank.textContent = "#" + (activeOpportunityCard.dataset.rank || "");
  if (opportunityFocusSource) opportunityFocusSource.textContent = activeOpportunityCard.dataset.focusSource || "";
  if (opportunityFocusScore) opportunityFocusScore.textContent = (currentLanguage === "zh" ? "评分 " : "Score ") + (activeOpportunityCard.dataset.focusScore || "");
  if (opportunityFocusLink) {
    opportunityFocusLink.setAttribute("href", activeOpportunityCard.dataset.focusUrl || "#");
    opportunityFocusLink.textContent = currentLanguage === "zh" ? "打开来源" : "Open proof source";
  }
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
  for (const node of closeHrefTargets) {
    node.setAttribute("href", node.dataset[currentLanguage === "zh" ? "closeHrefZh" : "closeHrefEn"]);
  }
  for (const button of languageButtons) {
    button.classList.toggle("active", button.dataset.languageToggle === currentLanguage);
  }
  const visible = [...cards].filter((card) => !card.classList.contains("hidden")).length;
  if (resultCount) resultCount.textContent = countLabel(visible);
  updatePlanningCalculator();
  updateSelectedTier(selectedTierCard);
  activateFitPersona(activeFitPersonaButton);
  updateOpportunityFocus(activeOpportunityCard);
  const activeDeliverable = deliverableButtons.find((button) => button.classList.contains("active")) || deliverableButtons[0];
  if (activeDeliverable) activateDeliverableTab(activeDeliverable.dataset.deliverableTab);
  const activeTrustDock = trustDockButtons.find((button) => button.classList.contains("active")) || trustDockButtons[0];
  if (activeTrustDock) activateTrustDock(activeTrustDock.dataset.trustDock);
}

function applyFilters() {
  const query = (search?.value || "").trim().toLowerCase();
  let visible = 0;
  for (const card of cards) {
    const sourceMatch = activeSource === "all" || card.dataset.source === activeSource;
    const textMatch = !query || card.dataset.search.includes(query);
    const show = sourceMatch && textMatch;
    card.classList.toggle("hidden", !show);
    if (show) visible += 1;
  }
  const firstVisible = cards.find((card) => !card.classList.contains("hidden"));
  if (!activeOpportunityCard || activeOpportunityCard.classList.contains("hidden")) {
    updateOpportunityFocus(firstVisible || null);
  } else {
    updateGalleryState(activeOpportunityCard);
  }
  if (resultCount) {
    resultCount.textContent = countLabel(visible);
    resultCount.classList.remove("bump");
    window.requestAnimationFrame(() => resultCount.classList.add("bump"));
    window.setTimeout(() => resultCount.classList.remove("bump"), 220);
  }
}

for (const card of cards) {
  card.addEventListener("pointerenter", () => updateOpportunityFocus(card));
  card.addEventListener("focusin", () => updateOpportunityFocus(card));
  card.addEventListener("click", (event) => {
    if (event.target.closest("a, summary, details")) return;
    updateOpportunityFocus(card);
  });
}
for (const button of galleryStepButtons) {
  button.addEventListener("click", () => stepOpportunityGallery(button.dataset.galleryStep === "prev" ? -1 : 1));
}
if (opportunityGalleryNode) {
  opportunityGalleryNode.addEventListener("keydown", (event) => {
    if (event.key !== "ArrowRight" && event.key !== "ArrowLeft") return;
    event.preventDefault();
    stepOpportunityGallery(event.key === "ArrowRight" ? 1 : -1);
  });
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

for (const button of tierSelectButtons) {
  button.addEventListener("click", () => {
    const card = tierCards.find((item) => item.dataset.tierCard === button.dataset.tierSelect);
    updateSelectedTier(card, true);
  });
}
for (const button of tierRailButtons) {
  button.addEventListener("click", () => {
    const card = tierCards.find((item) => item.dataset.tierCard === button.dataset.tierJump);
    updateSelectedTier(card, true);
  });
  if (finePointer) button.addEventListener("pointerenter", () => {
    const card = tierCards.find((item) => item.dataset.tierCard === button.dataset.tierJump);
    updateSelectedTier(card);
  });
}
for (const button of heroTierButtons) {
  button.addEventListener("click", () => {
    const card = tierCards.find((item) => item.dataset.tierCard === button.dataset.heroTier);
    updateSelectedTier(card, false);
    const pricingNode = document.querySelector("#pricing");
    if (pricingNode?.scrollIntoView) pricingNode.scrollIntoView({ block: "start", behavior: "smooth" });
  });
  if (finePointer) button.addEventListener("pointerenter", () => {
    const card = tierCards.find((item) => item.dataset.tierCard === button.dataset.heroTier);
    updateSelectedTier(card);
  });
}
if (pricingStudioNode) {
  pricingStudioNode.addEventListener("keydown", (event) => {
    if (event.key !== "ArrowRight" && event.key !== "ArrowLeft") return;
    const currentIndex = Math.max(0, tierCards.indexOf(selectedTierCard));
    const delta = event.key === "ArrowRight" ? 1 : -1;
    const nextIndex = (currentIndex + delta + tierCards.length) % tierCards.length;
    event.preventDefault();
    updateSelectedTier(tierCards[nextIndex], true);
  });
}

for (const button of fitPersonaButtons) {
  button.addEventListener("click", () => activateFitPersona(button, true));
  if (finePointer) button.addEventListener("pointerenter", () => activateFitPersona(button));
  button.addEventListener("focusin", () => activateFitPersona(button));
}

if (search) search.addEventListener("input", applyFilters);
if (videoCountInput) videoCountInput.addEventListener("input", updatePlanningCalculator);
if (researchHoursInput) researchHoursInput.addEventListener("input", updatePlanningCalculator);
setLanguage(currentLanguage);
if (selectedTierCard && window.location.hash === "#pricing") {
  window.requestAnimationFrame(() => updateSelectedTier(selectedTierCard, true));
}
const revealTargets = [...document.querySelectorAll("main > section, .topbar > div, .topbar aside")];
for (const [index, target] of revealTargets.entries()) {
  target.classList.add("reveal-item");
  target.style.setProperty("--reveal-delay", Math.min(index % 5, 4) * 42 + "ms");
}
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
  for (const item of flowSteps) {
    const isCurrent = item === step;
    item.classList.toggle("is-current", isCurrent);
    const button = item.querySelector("button");
    if (button) button.setAttribute("aria-pressed", String(isCurrent));
  }
}
for (const step of flowSteps) {
  const button = step.querySelector("button");
  if (button) {
    button.setAttribute("aria-pressed", String(step.classList.contains("is-current")));
    button.addEventListener("click", () => activateFlowStep(step));
  }
}

const contrastButtons = [...document.querySelectorAll("[data-contrast-set]")];
for (const button of contrastButtons) {
  button.addEventListener("click", () => {
    const panel = button.closest(".contrast-panel");
    if (!panel) return;
    const mode = button.dataset.contrastSet === "before" ? "before" : "after";
    panel.dataset.contrastMode = mode;
    for (const other of panel.querySelectorAll("[data-contrast-set]")) {
      other.classList.toggle("active", other === button);
    }
  });
}

function activateDeliverableTab(id, scrollToButton = false) {
  const activeIndex = Math.max(0, deliverableButtons.findIndex((button) => button.dataset.deliverableTab === id));
  const total = Math.max(1, deliverableButtons.length);
  const compactStack = window.innerWidth < 640;
  const xStep = compactStack ? 18 : 34;
  const yStep = compactStack ? 9 : 15;
  if (deliverableViewer) {
    deliverableViewer.dataset.activeDeliverable = id;
    deliverableViewer.style.setProperty("--delivery-progress", Math.round(((activeIndex + 1) / total) * 100) + "%");
  }
  for (const [index, button] of deliverableButtons.entries()) {
    const active = button.dataset.deliverableTab === id;
    button.classList.toggle("active", active);
    button.setAttribute("aria-pressed", active ? "true" : "false");
    if (active) {
      if (deliverableStatus) {
        const suffix = currentLanguage === "zh" ? "Zh" : "En";
        deliverableStatus.textContent = button.dataset["deliverableStatus" + suffix] || button.textContent.trim();
      }
      if (scrollToButton && button.scrollIntoView) button.scrollIntoView({ block: "nearest", inline: "center", behavior: "smooth" });
    }
  }
  for (const panel of deliverablePanels) {
    const panelIndex = Number(panel.dataset.deliverableIndex || 0);
    let offset = panelIndex - activeIndex;
    if (offset < 0) offset += total;
    panel.classList.toggle("active", panel.dataset.deliverablePanel === id);
    panel.style.setProperty("--stack-x", offset * xStep + "px");
    panel.style.setProperty("--stack-y", offset * yStep + "px");
    panel.style.setProperty("--stack-rotate", offset * -1.2 + "deg");
    panel.style.setProperty("--stack-scale", String(Math.max(0.88, 1 - offset * 0.035)));
    panel.style.setProperty("--stack-order", String(total - offset));
  }
}
for (const button of deliverableButtons) {
  button.addEventListener("click", () => activateDeliverableTab(button.dataset.deliverableTab, true));
}
if (deliverableViewer && deliverableButtons.length) {
  deliverableViewer.addEventListener("keydown", (event) => {
    if (event.key !== "ArrowRight" && event.key !== "ArrowLeft") return;
    event.preventDefault();
    const currentIndex = Math.max(0, deliverableButtons.findIndex((button) => button.classList.contains("active")));
    const delta = event.key === "ArrowRight" ? 1 : -1;
    const nextIndex = (currentIndex + delta + deliverableButtons.length) % deliverableButtons.length;
    const nextButton = deliverableButtons[nextIndex];
    activateDeliverableTab(nextButton.dataset.deliverableTab, true);
    nextButton.focus({ preventScroll: true });
  });
  window.addEventListener("resize", () => {
    const activeButton = deliverableButtons.find((button) => button.classList.contains("active")) || deliverableButtons[0];
    activateDeliverableTab(activeButton.dataset.deliverableTab);
  });
  activateDeliverableTab((deliverableButtons[0] || {}).dataset?.deliverableTab || "brief");
}

function activateProofTab(id) {
  for (const button of proofButtons) {
    const active = button.dataset.proofTab === id;
    button.classList.toggle("active", active);
    button.setAttribute("aria-pressed", active ? "true" : "false");
  }
  for (const panel of proofPanels) {
    panel.classList.toggle("active", panel.dataset.proofPanel === id);
  }
}
for (const button of proofButtons) {
  button.addEventListener("click", () => activateProofTab(button.dataset.proofTab));
}

function activateTrustDock(id, scrollToButton = false) {
  const activeIndex = Math.max(0, trustDockButtons.findIndex((button) => button.dataset.trustDock === id));
  if (trustDockSurface) {
    trustDockSurface.dataset.activeTrustDock = id;
    trustDockSurface.style.setProperty("--trust-indicator-x", (activeIndex - 1) * 100 + "%");
  }
  for (const button of trustDockButtons) {
    const active = button.dataset.trustDock === id;
    button.classList.toggle("active", active);
    button.setAttribute("aria-pressed", active ? "true" : "false");
    if (active && scrollToButton && button.scrollIntoView) button.scrollIntoView({ block: "nearest", inline: "center", behavior: "smooth" });
  }
  for (const panel of trustDockPanels) {
    panel.classList.toggle("active", panel.dataset.trustDockPanel === id);
  }
}
for (const button of trustDockButtons) {
  button.addEventListener("click", () => activateTrustDock(button.dataset.trustDock, true));
}
if (trustDockSurface && trustDockButtons.length) {
  trustDockSurface.addEventListener("keydown", (event) => {
    if (event.key !== "ArrowRight" && event.key !== "ArrowLeft") return;
    event.preventDefault();
    const currentIndex = Math.max(0, trustDockButtons.findIndex((button) => button.classList.contains("active")));
    const delta = event.key === "ArrowRight" ? 1 : -1;
    const nextIndex = (currentIndex + delta + trustDockButtons.length) % trustDockButtons.length;
    const nextButton = trustDockButtons[nextIndex];
    activateTrustDock(nextButton.dataset.trustDock, true);
    nextButton.focus({ preventScroll: true });
  });
  activateTrustDock((trustDockButtons.find((button) => button.classList.contains("active")) || trustDockButtons[0]).dataset.trustDock);
}

function activateFinalAction(id) {
  const activeButton = finalActionButtons.find((button) => button.dataset.finalAction === id);
  for (const button of finalActionButtons) {
    const active = button.dataset.finalAction === id;
    button.classList.toggle("active", active);
    button.setAttribute("aria-pressed", active ? "true" : "false");
    if (active && button.scrollIntoView) button.scrollIntoView({ block: "nearest", inline: "center", behavior: "smooth" });
  }
  for (const panel of finalActionPanels) {
    panel.classList.toggle("active", panel.dataset.finalPanel === id);
  }
  if (finalActionNode && activeButton) {
    const index = Number(activeButton.dataset.finalIndex || 0);
    const progress = Math.round(((index + 1) / Math.max(1, finalActionButtons.length)) * 100);
    finalActionNode.style.setProperty("--final-progress", progress + "%");
  }
}
for (const button of finalActionButtons) {
  button.addEventListener("click", () => activateFinalAction(button.dataset.finalAction));
}
if (finalActionNode) {
  finalActionNode.addEventListener("keydown", (event) => {
    if (event.key !== "ArrowRight" && event.key !== "ArrowLeft") return;
    const currentIndex = Math.max(0, finalActionButtons.findIndex((button) => button.classList.contains("active")));
    const delta = event.key === "ArrowRight" ? 1 : -1;
    const nextIndex = (currentIndex + delta + finalActionButtons.length) % finalActionButtons.length;
    event.preventDefault();
    activateFinalAction(finalActionButtons[nextIndex].dataset.finalAction);
  });
}

function activateSampleSpotlight(index, scrollToButton = true) {
  for (const button of sampleSpotlightButtons) {
    const active = button.dataset.sampleSpotlight === String(index);
    button.classList.toggle("active", active);
    button.setAttribute("aria-pressed", active ? "true" : "false");
    if (active && scrollToButton && button.scrollIntoView) button.scrollIntoView({ block: "nearest", inline: "center", behavior: "smooth" });
  }
  for (const panel of sampleSpotlightPanels) {
    panel.classList.toggle("active", panel.dataset.sampleSpotlightPanel === String(index));
  }
}
for (const button of sampleSpotlightButtons) {
  button.addEventListener("click", () => activateSampleSpotlight(button.dataset.sampleSpotlight));
}

const localLinks = [...document.querySelectorAll("[data-local-link]")];
const localSections = localLinks
  .map((link) => ({ link, section: document.getElementById(link.dataset.localLink) }))
  .filter((item) => item.section);
function setActiveLocalLink(id) {
  for (const item of localSections) {
    item.link.classList.toggle("active", item.section.id === id);
  }
}
if ("IntersectionObserver" in window && localSections.length) {
  const localObserver = new IntersectionObserver((entries) => {
    const visible = entries
      .filter((entry) => entry.isIntersecting)
      .sort((a, b) => b.intersectionRatio - a.intersectionRatio);
    if (visible[0]) setActiveLocalLink(visible[0].target.id);
  }, { rootMargin: "-20% 0px -58% 0px", threshold: [0.02, 0.2, 0.45] });
  for (const item of localSections) localObserver.observe(item.section);
  setActiveLocalLink(localSections[0].section.id);
}

function updateLocalProgress() {
  if (!localNavNode) return;
  const scrollable = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
  const progress = Math.min(1, Math.max(0, window.scrollY / scrollable));
  localNavNode.style.setProperty("--scroll-progress", (progress * 100).toFixed(2) + "%");
}
updateLocalProgress();
window.addEventListener("scroll", updateLocalProgress, { passive: true });
window.addEventListener("resize", updateLocalProgress);

const sampleDrawerNode = document.querySelector("#sample-drawer");
const sampleOpenButtons = [...document.querySelectorAll("[data-sample-open]")];
const sampleCloseButtons = [...document.querySelectorAll("[data-sample-close]")];
function setSampleDrawer(open) {
  if (!sampleDrawerNode) return;
  sampleDrawerNode.setAttribute("aria-hidden", open ? "false" : "true");
  document.body.classList.toggle("drawer-open", open);
  if (open) {
    const closeButton = sampleDrawerNode.querySelector(".drawer-close");
    if (closeButton) closeButton.focus();
  }
}
for (const button of sampleOpenButtons) {
  button.addEventListener("click", () => setSampleDrawer(true));
}
for (const button of sampleCloseButtons) {
  button.addEventListener("click", () => setSampleDrawer(false));
}
document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") setSampleDrawer(false);
});

const hero = document.querySelector(".topbar");
const productVisualNode = document.querySelector(".product-visual");
const motionSafe = !window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const heroMetricValues = [...document.querySelectorAll("[data-hero-count]")];
const sourceLensButtons = [...document.querySelectorAll("[data-source-lens]")];
const sourceLensWrap = document.querySelector(".source-legend");
const boardSummaryItems = [...document.querySelectorAll("[data-board-source]")];
const runwayNode = document.querySelector(".signal-runway");
const runwayConsole = document.querySelector(".runway-console");
const runwayButtons = [...document.querySelectorAll("[data-runway-stage]")];
const runwayPanels = [...document.querySelectorAll("[data-runway-panel]")];
let runwayAutoTimer = 0;
let runwayUserPaused = false;

let selectedSourceLens = "all";
function renderSourceLens(source) {
  const activeSource = source || "all";
  const hasMatch = activeSource === "all" || boardSummaryItems.some((item) => item.dataset.boardSource === activeSource);
  for (const button of sourceLensButtons) {
    const active = button.dataset.sourceLens === activeSource;
    button.classList.toggle("active", active);
    button.setAttribute("aria-pressed", active ? "true" : "false");
  }
  for (const item of boardSummaryItems) {
    const focused = hasMatch && activeSource !== "all" && item.dataset.boardSource === activeSource;
    item.classList.toggle("is-source-focused", focused);
    item.classList.toggle("is-source-dimmed", hasMatch && activeSource !== "all" && !focused);
  }
  if (productVisualNode) {
    productVisualNode.dataset.sourceFocus = hasMatch ? activeSource : "all";
  }
}

for (const button of sourceLensButtons) {
  button.addEventListener("pointerenter", () => renderSourceLens(button.dataset.sourceLens));
  button.addEventListener("focusin", () => renderSourceLens(button.dataset.sourceLens));
  button.addEventListener("click", () => {
    selectedSourceLens = button.dataset.sourceLens || "all";
    renderSourceLens(selectedSourceLens);
  });
}
if (sourceLensWrap) {
  sourceLensWrap.addEventListener("pointerleave", () => renderSourceLens(selectedSourceLens));
}
renderSourceLens(selectedSourceLens);

function activateRunwayStage(index) {
  if (!runwayButtons.length || !runwayConsole) return;
  const activeIndex = Math.max(0, Math.min(index, runwayButtons.length - 1));
  for (const button of runwayButtons) {
    const isActive = Number(button.dataset.runwayStage) === activeIndex;
    button.classList.toggle("active", isActive);
    button.setAttribute("aria-pressed", isActive ? "true" : "false");
  }
  for (const panel of runwayPanels) {
    panel.classList.toggle("active", Number(panel.dataset.runwayPanel) === activeIndex);
  }
  runwayConsole.style.setProperty("--runway-progress", ((activeIndex + 1) / runwayButtons.length * 100).toFixed(0) + "%");
}
for (const button of runwayButtons) {
  button.addEventListener("click", () => {
    runwayUserPaused = true;
    if (runwayAutoTimer) window.clearInterval(runwayAutoTimer);
    activateRunwayStage(Number(button.dataset.runwayStage));
  });
}
if (runwayNode && runwayButtons.length && motionSafe) {
  const startRunway = () => {
    if (runwayAutoTimer || runwayUserPaused) return;
    runwayAutoTimer = window.setInterval(() => {
      const current = runwayButtons.findIndex((button) => button.classList.contains("active"));
      activateRunwayStage((current + 1) % runwayButtons.length);
    }, 2600);
  };
  const stopRunway = () => {
    if (runwayAutoTimer) window.clearInterval(runwayAutoTimer);
    runwayAutoTimer = 0;
  };
  if ("IntersectionObserver" in window) {
    const runwayObserver = new IntersectionObserver((entries) => {
      if (entries.some((entry) => entry.isIntersecting)) startRunway();
      else stopRunway();
    }, { threshold: 0.34 });
    runwayObserver.observe(runwayNode);
  } else {
    startRunway();
  }
}
if (hero && productVisualNode && motionSafe) {
  hero.addEventListener("pointermove", (event) => {
    const rect = hero.getBoundingClientRect();
    const x = (event.clientX - rect.left) / rect.width - 0.5;
    const y = (event.clientY - rect.top) / rect.height - 0.5;
    hero.style.setProperty("--spotlight-x", ((x + 0.5) * 100).toFixed(1) + "%");
    hero.style.setProperty("--spotlight-y", ((y + 0.5) * 100).toFixed(1) + "%");
    productVisualNode.style.transform = "rotateY(" + (x * -6).toFixed(2) + "deg) rotateX(" + (y * 4).toFixed(2) + "deg) translateY(-4px)";
  });
  hero.addEventListener("pointerleave", () => {
    hero.style.setProperty("--spotlight-x", "68%");
    hero.style.setProperty("--spotlight-y", "24%");
    productVisualNode.style.transform = "";
  });
}

function updateScrolledState() {
  document.body.classList.toggle("is-scrolled", window.scrollY > 18);
}
updateScrolledState();
window.addEventListener("scroll", updateScrolledState, { passive: true });

function animateHeroMetrics() {
  if (!motionSafe || !heroMetricValues.length) return;
  const metricWrap = document.querySelector(".hero-metrics");
  metricWrap?.classList.add("is-counting");
  const duration = 920;
  const start = performance.now();
  for (const node of heroMetricValues) node.textContent = "0";
  function step(now) {
    const progress = Math.min(1, (now - start) / duration);
    const eased = 1 - Math.pow(1 - progress, 3);
    for (const node of heroMetricValues) {
      const target = Number(node.dataset.heroCount || node.textContent || 0);
      node.textContent = String(Math.round(target * eased));
    }
    if (progress < 1) {
      window.requestAnimationFrame(step);
    } else {
      for (const node of heroMetricValues) node.textContent = String(Number(node.dataset.heroCount || node.textContent || 0));
      metricWrap?.classList.remove("is-counting");
    }
  }
  window.requestAnimationFrame(step);
}

if (heroMetricValues.length && motionSafe) {
  if ("IntersectionObserver" in window) {
    const metricObserver = new IntersectionObserver((entries) => {
      if (entries.some((entry) => entry.isIntersecting)) {
        animateHeroMetrics();
        metricObserver.disconnect();
      }
    }, { threshold: 0.48 });
    metricObserver.observe(heroMetricValues[0].closest(".hero-metrics"));
  } else {
    animateHeroMetrics();
  }
}
