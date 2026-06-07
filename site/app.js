const cards = [...document.querySelectorAll(".card")];
const buttons = [...document.querySelectorAll("[data-source-filter]")];
const search = document.querySelector("#opportunity-search");
const resultCount = document.querySelector("#result-count");
let activeSource = "all";

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
  resultCount.textContent = visible === 1 ? "1 visible opportunity" : visible + " visible opportunities";
}

for (const button of buttons) {
  button.addEventListener("click", () => {
    activeSource = button.dataset.sourceFilter;
    for (const other of buttons) other.classList.toggle("active", other === button);
    applyFilters();
  });
}

search.addEventListener("input", applyFilters);
