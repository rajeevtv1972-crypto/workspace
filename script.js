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


const API_BASE = "https://workspace-pdf-api.onrender.com";
const overlay = document.getElementById("converterOverlay");
const dialog = overlay.querySelector(".converter-dialog");
const pdfInput = document.getElementById("pdfInput");
const uploadZone = document.getElementById("uploadZone");
const convertButton = document.getElementById("convertButton");
const selectedFile = document.getElementById("selectedFile");
const converterError = document.getElementById("converterError");
const conversionStatus = document.getElementById("conversionStatus");
let chosenPdf = null;
let converting = false;

function openConverter() {
  overlay.classList.add("open");
  overlay.setAttribute("aria-hidden", "false");
  document.body.style.overflow = "hidden";
  resetConverter();
}
function closeConverter() {
  if (converting) return;
  overlay.classList.remove("open");
  overlay.setAttribute("aria-hidden", "true");
  document.body.style.overflow = "";
}
function resetConverter() {
  chosenPdf = null;
  pdfInput.value = "";
  selectedFile.hidden = true;
  converterError.hidden = true;
  conversionStatus.hidden = true;
  convertButton.disabled = true;
  convertButton.innerHTML = 'Convert to Word <span>→</span>';
  dialog.classList.remove("busy");
}
function formatBytes(bytes) {
  return bytes < 1024 * 1024 ? (bytes / 1024).toFixed(0) + " KB" : (bytes / (1024 * 1024)).toFixed(2) + " MB";
}
function showFile(file) {
  converterError.hidden = true;
  if (!file) return;
  if (!file.name.toLowerCase().endsWith(".pdf") || (file.type && file.type !== "application/pdf")) {
    converterError.textContent = "Please choose a PDF file.";
    converterError.hidden = false;
    return;
  }
  if (file.size > 15 * 1024 * 1024) {
    converterError.textContent = "This file is larger than 15 MB. Please choose a smaller PDF.";
    converterError.hidden = false;
    return;
  }
  if (!file.size) {
    converterError.textContent = "This PDF is empty. Please choose another file.";
    converterError.hidden = false;
    return;
  }
  chosenPdf = file;
  document.getElementById("selectedFileName").textContent = file.name;
  document.getElementById("selectedFileSize").textContent = formatBytes(file.size);
  selectedFile.hidden = false;
  convertButton.disabled = false;
}
cards.forEach(card => card.addEventListener("click", () => {
  const tool = card.querySelector(".tool-copy strong").textContent;
  if (tool === "PDF to Word") openConverter();
  else showToast(tool + " is coming soon — we're building the tools one by one.");
}));
document.getElementById("closeConverter").addEventListener("click", closeConverter);
overlay.addEventListener("click", event => { if (event.target === overlay) closeConverter(); });
document.addEventListener("keydown", event => { if (event.key === "Escape" && overlay.classList.contains("open")) closeConverter(); });
document.getElementById("chooseFile").addEventListener("click", event => { event.stopPropagation(); pdfInput.click(); });
uploadZone.addEventListener("click", () => pdfInput.click());
uploadZone.addEventListener("keydown", event => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); pdfInput.click(); } });
pdfInput.addEventListener("change", () => showFile(pdfInput.files[0]));
document.getElementById("removeFile").addEventListener("click", () => resetConverter());
["dragenter","dragover"].forEach(type => uploadZone.addEventListener(type, event => { event.preventDefault(); uploadZone.classList.add("dragover"); }));
["dragleave","drop"].forEach(type => uploadZone.addEventListener(type, event => { event.preventDefault(); uploadZone.classList.remove("dragover"); }));
uploadZone.addEventListener("drop", event => showFile(event.dataTransfer.files[0]));

convertButton.addEventListener("click", async () => {
  if (!chosenPdf || converting) return;
  converting = true;
  converterError.hidden = true;
  conversionStatus.hidden = false;
  document.getElementById("statusMessage").textContent = "Uploading and converting your PDF…";
  document.getElementById("progressBar").classList.add("indeterminate");
  convertButton.disabled = true;
  convertButton.textContent = "Converting…";
  dialog.classList.add("busy");
  try {
    const formData = new FormData();
    formData.append("file", chosenPdf, chosenPdf.name);
    const response = await fetch(API_BASE + "/api/convert/pdf-to-word", { method: "POST", body: formData });
    if (!response.ok) {
      let message = "Conversion failed. Please try another PDF.";
      try { const payload = await response.json(); if (payload.detail) message = payload.detail; } catch (_) {}
      throw new Error(message);
    }
    const blob = await response.blob();
    if (!blob.size) throw new Error("The server returned an empty Word document. Please try again.");
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = chosenPdf.name.replace(/\.pdf$/i, "") + ".docx";
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 60000);
    document.getElementById("progressBar").classList.remove("indeterminate");
    document.getElementById("progressBar").style.width = "100%";
    document.getElementById("statusMessage").textContent = "Done! Your Word document has been downloaded.";
    convertButton.textContent = "Convert another PDF";
    convertButton.disabled = false;
    convertButton.onclick = () => resetConverter();
  } catch (error) {
    converterError.textContent = error.message || "Something went wrong. Please try again.";
    converterError.hidden = false;
    conversionStatus.hidden = true;
    convertButton.textContent = "Try again";
    convertButton.disabled = false;
  } finally {
    converting = false;
    dialog.classList.remove("busy");
  }
});


document.getElementById("menuToggle").addEventListener("click", () => {
  showToast("Choose a tool category below to get started.");
});

document.addEventListener("keydown", event => {
  if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
    event.preventDefault();
    search.focus();
  }
});