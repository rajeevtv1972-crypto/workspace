const cards = [...document.querySelectorAll(".tool-card")];
const filters = [...document.querySelectorAll(".filter-btn")];
const search = document.getElementById("toolSearch");
const emptyState = document.getElementById("emptyState");
const toast = document.getElementById("toast");
let activeFilter = "all";
let toastTimer;

function updateTools() {
  const query = search.value.trim().toLowerCase();
  let visible = 0;
  cards.forEach(card => {
    const matchesCategory = activeFilter === "all" || card.dataset.category === activeFilter;
    const matchesSearch = !query || card.dataset.name.includes(query) || card.innerText.toLowerCase().includes(query);
    const show = matchesCategory && matchesSearch;
    card.hidden = !show;
    if (show) visible++;
  });
  emptyState.hidden = visible !== 0;
}

filters.forEach(button => button.addEventListener("click", () => {
  activeFilter = button.dataset.filter;
  filters.forEach(item => item.classList.toggle("selected", item === button));
  updateTools();
}));

document.querySelectorAll("[data-filter-link]").forEach(link => link.addEventListener("click", () => {
  activeFilter = link.dataset.filterLink;
  filters.forEach(item => item.classList.toggle("selected", item.dataset.filter === activeFilter));
  updateTools();
}));

search.addEventListener("input", updateTools);
document.getElementById("year").textContent = new Date().getFullYear();

function showToast(message) {
  toast.textContent = message;
  toast.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove("show"), 2600);
}

cards.forEach(card => card.addEventListener("click", () => {
  const tool = card.querySelector(".tool-copy strong").textContent;
  showToast(tool + " is coming soon — we're building the tools one by one.");
}));

document.getElementById("menuToggle").addEventListener("click", () => {
  showToast("Choose a tool category below to get started.");
});

document.addEventListener("keydown", event => {
  if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
    event.preventDefault();
    search.focus();
  }
});