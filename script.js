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


const overlay = document.getElementById("converterOverlay");
const dialog = overlay.querySelector(".converter-dialog");
const pdfInput = document.getElementById("pdfInput");
const uploadZone = document.getElementById("uploadZone");
const convertButton = document.getElementById("convertButton");
const selectedFile = document.getElementById("selectedFile");
const converterError = document.getElementById("converterError");
const conversionStatus = document.getElementById("conversionStatus");
const progressBar = document.getElementById("progressBar");
let chosenPdf = null;
let converting = false;
let conversionComplete = false;

if (window.pdfjsLib) {
  pdfjsLib.GlobalWorkerOptions.workerSrc = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";
}

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
  conversionComplete = false;
  pdfInput.value = "";
  selectedFile.hidden = true;
  converterError.hidden = true;
  conversionStatus.hidden = true;
  progressBar.classList.remove("indeterminate");
  progressBar.style.width = "12%";
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
function setProgress(percent, message) {
  progressBar.classList.remove("indeterminate");
  progressBar.style.width = Math.max(4, Math.min(100, percent)) + "%";
  document.getElementById("statusMessage").textContent = message;
}
function groupPdfTextIntoLines(items) {
  const lines = new Map();
  for (const item of items) {
    if (!item.str || !item.str.trim()) continue;
    const x = item.transform ? item.transform[4] : 0;
    const y = item.transform ? item.transform[5] : 0;
    const fontSize = item.height || (item.transform ? Math.abs(item.transform[3]) : 11) || 11;
    const key = Math.round(y / 3) * 3;
    if (!lines.has(key)) lines.set(key, []);
    lines.get(key).push({ text: item.str, x, fontSize });
  }
  return [...lines.entries()].sort((a,b) => b[0]-a[0]).map(([,parts]) => {
    parts.sort((a,b) => a.x-b.x);
    let line = "";
    let previousEnd = null;
    for (const part of parts) {
      const gap = previousEnd === null ? 0 : part.x-previousEnd;
      if (line && gap > Math.max(2,part.fontSize*0.18) && !line.endsWith(" ")) line += " ";
      line += part.text;
      previousEnd = part.x + part.text.length*part.fontSize*0.48;
    }
    return line.trim();
  }).filter(Boolean);
}
async function convertPdfLocally(file) {
  if (!window.pdfjsLib) throw new Error("The PDF reader could not load. Check your internet connection and refresh.");
  if (!window.docx) throw new Error("The Word document library could not load. Check your internet connection and refresh.");
  const data = new Uint8Array(await file.arrayBuffer());
  const pdf = await pdfjsLib.getDocument({data}).promise;
  if (pdf.numPages > 50) {
    await pdf.destroy();
    throw new Error("This PDF has more than 50 pages. Please choose a smaller document.");
  }
  const paragraphs = [];
  let extracted = 0;
  for (let pageNo=1; pageNo<=pdf.numPages; pageNo++) {
    setProgress(8 + (pageNo-1)/pdf.numPages*78, "Reading page " + pageNo + " of " + pdf.numPages + " on your device…");
    const page = await pdf.getPage(pageNo);
    const content = await page.getTextContent();
    const lines = groupPdfTextIntoLines(content.items);
    if (pageNo > 1) paragraphs.push(new docx.Paragraph({text:"",pageBreakBefore:true}));
    if (lines.length) {
      for (const line of lines) {
        extracted += line.length;
        paragraphs.push(new docx.Paragraph({
          children:[new docx.TextRun({text:line,size:22})],
          spacing:{after:90,line:276}
        }));
      }
    } else {
      paragraphs.push(new docx.Paragraph({
        children:[new docx.TextRun({text:"[No selectable text found on this page. It may be a scanned image; OCR support is not included yet.]",italics:true,color:"777777"})]
      }));
    }
    page.cleanup();
  }
  await pdf.destroy();
  if (extracted < 5) throw new Error("This PDF contains no selectable text. It may be scanned or image-only. OCR support is a future addition.");
  setProgress(92,"Creating your editable Word document…");
  const document = new docx.Document({
    creator:"Workspace PDF",
    title:file.name.replace(/\.pdf$/i,""),
    sections:[{properties:{},children:paragraphs}]
  });
  const blob = await docx.Packer.toBlob(document);
  setProgress(100,"Done! Your Word document is ready.");
  return blob;
}

cards.forEach(card => card.addEventListener("click", () => {
  const tool = card.querySelector(".tool-copy strong").textContent;
  if (tool === "PDF to Word") openConverter();
  else showToast(tool + " is coming soon — we're building the tools one by one.");
}));
document.getElementById("closeConverter").addEventListener("click",closeConverter);
overlay.addEventListener("click",event=>{if(event.target===overlay)closeConverter();});
document.addEventListener("keydown",event=>{if(event.key==="Escape"&&overlay.classList.contains("open"))closeConverter();});
document.getElementById("chooseFile").addEventListener("click",event=>{event.stopPropagation();pdfInput.click();});
uploadZone.addEventListener("click",()=>pdfInput.click());
uploadZone.addEventListener("keydown",event=>{if(event.key==="Enter"||event.key===" "){event.preventDefault();pdfInput.click();}});
pdfInput.addEventListener("change",()=>showFile(pdfInput.files[0]));
document.getElementById("removeFile").addEventListener("click",resetConverter);
["dragenter","dragover"].forEach(type=>uploadZone.addEventListener(type,event=>{event.preventDefault();uploadZone.classList.add("dragover");}));
["dragleave","drop"].forEach(type=>uploadZone.addEventListener(type,event=>{event.preventDefault();uploadZone.classList.remove("dragover");}));
uploadZone.addEventListener("drop",event=>showFile(event.dataTransfer.files[0]));

convertButton.addEventListener("click",async()=>{
  if(conversionComplete){resetConverter();return;}
  if(!chosenPdf||converting)return;
  converting=true;
  converterError.hidden=true;
  conversionStatus.hidden=false;
  setProgress(5,"Preparing local conversion…");
  convertButton.disabled=true;
  convertButton.textContent="Converting on your device…";
  dialog.classList.add("busy");
  try{
    const blob=await convertPdfLocally(chosenPdf);
    const url=URL.createObjectURL(blob);
    const link=document.createElement("a");
    link.href=url;
    link.download=chosenPdf.name.replace(/\.pdf$/i,"")+".docx";
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(()=>URL.revokeObjectURL(url),60000);
    conversionComplete=true;
    convertButton.textContent="Convert another PDF";
    convertButton.disabled=false;
  }catch(error){
    converterError.textContent=error.message||"Something went wrong while converting this PDF.";
    converterError.hidden=false;
    conversionStatus.hidden=true;
    convertButton.textContent="Try again";
    convertButton.disabled=false;
  }finally{
    converting=false;
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