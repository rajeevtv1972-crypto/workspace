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
const toolOptions = document.getElementById("toolOptions");
const toolTitle = document.getElementById("converterTitle");
const toolDescription = document.querySelector(".converter-heading p");
const uploadStrong = uploadZone.querySelector("strong");
const uploadHint = document.getElementById("uploadHint");
const chooseFileButton = document.getElementById("chooseFile");

const TOOL_CONFIG = {
  "PDF to Word": { accept: ".pdf,application/pdf", kind: "pdf", multiple: false, hint: "PDF · Up to 20 MB · 50 pages maximum", description: "Extract selectable PDF text into an editable Word document.", button: "Convert to Word" },
  "Merge PDF": { accept: ".pdf,application/pdf", kind: "pdf", multiple: true, hint: "Select 2–10 PDF files · Up to 20 MB each", description: "Combine multiple PDFs into one document.", button: "Merge PDFs" },
  "Split PDF": { accept: ".pdf,application/pdf", kind: "pdf", multiple: false, hint: "PDF · Up to 20 MB · 100 pages maximum", description: "Choose the pages you want in a new PDF.", button: "Split PDF" },
  "Compress PDF": { accept: ".pdf,application/pdf", kind: "pdf", multiple: false, hint: "PDF · Up to 20 MB · 50 pages maximum", description: "Reduce file size by rebuilding pages as optimized images.", button: "Compress PDF" },
  "Word to PDF": { accept: ".docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document", kind: "docx", multiple: false, hint: "DOCX · Up to 15 MB", description: "Convert a Word document into a PDF in your browser.", button: "Convert to PDF" },
  "PDF to JPG": { accept: ".pdf,application/pdf", kind: "pdf", multiple: false, hint: "PDF · Up to 20 MB · 50 pages maximum", description: "Turn each PDF page into a high-quality JPG image.", button: "Convert to JPG" },
  "JPG to PDF": { accept: ".jpg,.jpeg,.png,image/jpeg,image/png", kind: "image", multiple: true, hint: "JPG or PNG · Select up to 25 images", description: "Combine images into a single PDF document.", button: "Create PDF" },
  "Rotate PDF": { accept: ".pdf,application/pdf", kind: "pdf", multiple: false, hint: "PDF · Up to 20 MB · 100 pages maximum", description: "Rotate every page in your PDF.", button: "Rotate PDF" },
  "OCR PDF": { accept: ".pdf,application/pdf", kind: "pdf", multiple: false, hint: "Scanned PDF · Up to 15 pages · 20 MB", description: "Recognize scanned text and create a searchable PDF. English OCR is enabled in this version.", button: "Make searchable PDF" }
};
let activeTool = "PDF to Word";
let chosenFiles = [];
let converting = false;
let conversionComplete = false;

if (window.pdfjsLib) {
  pdfjsLib.GlobalWorkerOptions.workerSrc = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";
}

function openTool(toolName) {
  activeTool = toolName;
  const config = TOOL_CONFIG[toolName];
  overlay.classList.add("open");
  overlay.setAttribute("aria-hidden", "false");
  document.body.style.overflow = "hidden";
  toolTitle.textContent = toolName;
  toolDescription.textContent = config.description;
  uploadStrong.textContent = config.multiple ? "Choose files or drop them here" : "Choose a file or drop it here";
  uploadHint.textContent = config.hint;
  chooseFileButton.textContent = config.multiple ? "Select files" : "Select file";
  pdfInput.accept = config.accept;
  pdfInput.multiple = config.multiple;
  resetTool();
  renderToolOptions();
}
function closeTool() {
  if (converting) return;
  overlay.classList.remove("open");
  overlay.setAttribute("aria-hidden", "true");
  document.body.style.overflow = "";
}
function resetTool() {
  chosenFiles = [];
  conversionComplete = false;
  pdfInput.value = "";
  selectedFile.hidden = true;
  converterError.hidden = true;
  conversionStatus.hidden = true;
  progressBar.classList.remove("indeterminate");
  progressBar.style.width = "12%";
  convertButton.disabled = true;
  convertButton.textContent = TOOL_CONFIG[activeTool].button;
  dialog.classList.remove("busy");
  document.getElementById("selectedFileName").textContent = "";
  document.getElementById("selectedFileSize").textContent = "";
}
function renderToolOptions() {
  toolOptions.innerHTML = "";
  toolOptions.hidden = true;
  if (activeTool === "Split PDF") {
    toolOptions.innerHTML = '<label class="option-field"><span>Pages to extract</span><input id="splitRange" type="text" value="1-" placeholder="Example: 1, 3-5"><small>Use page numbers and ranges, separated by commas. Leave as 1- for all pages.</small></label>';
    toolOptions.hidden = false;
  } else if (activeTool === "Rotate PDF") {
    toolOptions.innerHTML = '<label class="option-field"><span>Rotation</span><select id="rotateAngle"><option value="90">90° clockwise</option><option value="180">180°</option><option value="270">90° counter-clockwise</option></select></label>';
    toolOptions.hidden = false;
  } else if (activeTool === "Compress PDF") {
    toolOptions.innerHTML = '<label class="option-field"><span>Image quality</span><select id="compressQuality"><option value="0.55">Smaller file</option><option value="0.72" selected>Recommended</option><option value="0.86">Higher quality</option></select><small>Compression rasterizes pages. Text will no longer be selectable in the compressed copy.</small></label>';
    toolOptions.hidden = false;
  }
}
function formatBytes(bytes) {
  return bytes < 1024 * 1024 ? (bytes / 1024).toFixed(0) + " KB" : (bytes / (1024 * 1024)).toFixed(2) + " MB";
}
function fileExtension(name) {
  const match = (name || "").toLowerCase().match(/\.([^.]+)$/);
  return match ? match[1] : "";
}
function validateFiles(files) {
  const config = TOOL_CONFIG[activeTool];
  if (!files.length) return "Please choose a file first.";
  if (activeTool === "Merge PDF" && files.length < 2) return "Choose at least two PDFs to merge.";
  if (files.length > (config.multiple ? (activeTool === "JPG to PDF" ? 25 : 10) : 1)) {
    return activeTool === "JPG to PDF" ? "Choose no more than 25 images." : "Choose no more than 10 files.";
  }
  for (const file of files) {
    const ext = fileExtension(file.name);
    const allowed = config.kind === "pdf" ? ext === "pdf" : config.kind === "docx" ? ext === "docx" : ["jpg", "jpeg", "png"].includes(ext);
    if (!allowed) return activeTool === "Word to PDF" ? "Please choose a DOCX Word document." : config.kind === "image" ? "Please choose JPG or PNG images." : "Please choose a PDF file.";
    const maxSize = activeTool === "OCR PDF" ? 20 * 1024 * 1024 : activeTool === "JPG to PDF" ? 15 * 1024 * 1024 : 20 * 1024 * 1024;
    if (file.size > maxSize) return "One of the selected files is too large. Please choose smaller files.";
    if (!file.size) return "One of the selected files is empty.";
  }
  return "";
}
function showFiles(fileList) {
  converterError.hidden = true;
  const files = [...fileList];
  const problem = validateFiles(files);
  if (problem) {
    converterError.textContent = problem;
    converterError.hidden = false;
    return;
  }
  chosenFiles = files;
  document.getElementById("selectedFileName").textContent = files.length === 1 ? files[0].name : files.length + " files selected";
  const total = files.reduce((sum, file) => sum + file.size, 0);
  document.getElementById("selectedFileSize").textContent = files.length === 1 ? formatBytes(total) : formatBytes(total) + " total";
  selectedFile.hidden = false;
  convertButton.disabled = false;
}
function setProgress(percent, message) {
  progressBar.classList.remove("indeterminate");
  progressBar.style.width = Math.max(4, Math.min(100, percent)) + "%";
  document.getElementById("statusMessage").textContent = message;
}
function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 60000);
}
function safeBaseName(filename) {
  return (filename || "document").replace(/\.[^.]+$/, "").replace(/[^a-z0-9-_ ]/gi, "").trim().slice(0, 70) || "document";
}
function getPDFLib() {
  if (!window.PDFLib) throw new Error("The PDF editing library could not load. Refresh the page and try again.");
  return window.PDFLib;
}
async function loadPdfJs(file) {
  if (!window.pdfjsLib) throw new Error("The PDF reader could not load. Check your internet connection and refresh.");
  return await pdfjsLib.getDocument({ data: new Uint8Array(await file.arrayBuffer()) }).promise;
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
async function pdfToWord(file) {
  if (!window.docx) throw new Error("The Word generator could not load. Refresh the page and try again.");
  const pdf = await loadPdfJs(file);
  if (pdf.numPages > 50) { await pdf.destroy(); throw new Error("This PDF has more than 50 pages."); }
  const paragraphs = [];
  let extracted = 0;
  for (let pageNo=1; pageNo<=pdf.numPages; pageNo++) {
    setProgress(8+(pageNo-1)/pdf.numPages*78, "Reading page "+pageNo+" of "+pdf.numPages+" locally…");
    const page = await pdf.getPage(pageNo);
    const content = await page.getTextContent();
    const lines = groupPdfTextIntoLines(content.items);
    if (pageNo > 1) paragraphs.push(new docx.Paragraph({ text:"", pageBreakBefore:true }));
    for (const line of lines) {
      extracted += line.length;
      paragraphs.push(new docx.Paragraph({ children:[new docx.TextRun({text:line,size:22})], spacing:{after:90,line:276} }));
    }
    if (!lines.length) paragraphs.push(new docx.Paragraph({ children:[new docx.TextRun({text:"[No selectable text on this page. It may be a scanned image; use OCR PDF for scanned documents.]",italics:true,color:"777777"})] }));
    page.cleanup();
  }
  await pdf.destroy();
  if (extracted < 5) throw new Error("This PDF has no selectable text. It may be scanned or image-only. Use OCR PDF instead.");
  setProgress(92,"Creating your editable Word document…");
  const doc = new docx.Document({ creator:"Workspace PDF", title:safeBaseName(file.name), sections:[{properties:{},children:paragraphs}] });
  return await docx.Packer.toBlob(doc);
}
async function mergePDF(files) {
  const { PDFDocument } = getPDFLib();
  const output = await PDFDocument.create();
  let done = 0;
  for (const file of files) {
    const source = await PDFDocument.load(await file.arrayBuffer());
    const pages = await output.copyPages(source, source.getPageIndices());
    pages.forEach(page => output.addPage(page));
    done++;
    setProgress(10+done/files.length*80,"Adding file "+done+" of "+files.length+"…");
  }
  return new Blob([await output.save({useObjectStreams:true})],{type:"application/pdf"});
}
function parsePageRange(value, count) {
  const text = (value || "").trim() || "1-" + count;
  const output = new Set();
  for (const token of text.split(",")) {
    const part = token.trim();
    if (!part) continue;
    const match = part.match(/^(\d+)\s*(?:-\s*(\d*)\s*)?$/);
    if (!match) throw new Error("Use page numbers such as 1, 3-5, or 1-.");
    const start = Number(match[1]);
    const end = match[2] === undefined ? start : (match[2] ? Number(match[2]) : count);
    if (start < 1 || end < start || end > count) throw new Error("Page range must be between 1 and "+count+".");
    for (let p=start;p<=end;p++) output.add(p-1);
  }
  if (!output.size) throw new Error("Enter at least one page number.");
  return [...output].sort((a,b)=>a-b);
}
async function splitPDF(file) {
  const { PDFDocument } = getPDFLib();
  const source = await PDFDocument.load(await file.arrayBuffer());
  const indices = parsePageRange(document.getElementById("splitRange").value,source.getPageCount());
  const output = await PDFDocument.create();
  const pages = await output.copyPages(source,indices);
  pages.forEach(page=>output.addPage(page));
  setProgress(90,"Preparing selected pages…");
  return new Blob([await output.save({useObjectStreams:true})],{type:"application/pdf"});
}
async function rotatePDF(file) {
  const { PDFDocument, degrees } = getPDFLib();
  const pdf = await PDFDocument.load(await file.arrayBuffer());
  const angle = Number(document.getElementById("rotateAngle").value);
  pdf.getPages().forEach(page=>page.setRotation(degrees((page.getRotation().angle+angle)%360)));
  setProgress(90,"Saving rotated pages…");
  return new Blob([await pdf.save({useObjectStreams:true})],{type:"application/pdf"});
}
async function renderPdfPage(page, scale) {
  const viewport = page.getViewport({scale});
  const canvas = document.createElement("canvas");
  canvas.width = Math.ceil(viewport.width);
  canvas.height = Math.ceil(viewport.height);
  const context = canvas.getContext("2d",{alpha:false});
  await page.render({canvasContext:context,viewport}).promise;
  return {canvas,viewport};
}
async function compressPDF(file) {
  const { PDFDocument } = getPDFLib();
  const quality = Number(document.getElementById("compressQuality").value);
  const pdf = await loadPdfJs(file);
  if (pdf.numPages > 50) { await pdf.destroy(); throw new Error("Compression is limited to 50 pages per file."); }
  const output = await PDFDocument.create();
  for (let i=1;i<=pdf.numPages;i++) {
    setProgress(5+(i-1)/pdf.numPages*82,"Optimizing page "+i+" of "+pdf.numPages+"…");
    const page = await pdf.getPage(i);
    const rendered = await renderPdfPage(page,1.45);
    const jpg = rendered.canvas.toDataURL("image/jpeg",quality);
    const bytes = Uint8Array.from(atob(jpg.split(",")[1]),c=>c.charCodeAt(0));
    const image = await output.embedJpg(bytes);
    const outPage = output.addPage([rendered.viewport.width/1.45,rendered.viewport.height/1.45]);
    outPage.drawImage(image,{x:0,y:0,width:outPage.getWidth(),height:outPage.getHeight()});
    rendered.canvas.width=1; rendered.canvas.height=1; page.cleanup();
  }
  await pdf.destroy();
  const optimized = new Blob([await output.save({useObjectStreams:true})],{type:"application/pdf"});
  if (optimized.size >= file.size) {
    throw new Error("This PDF is already smaller than the compressed version we can create in your browser. Your original file has not been changed.");
  }
  return optimized;
}
async function pdfToJpg(file) {
  const pdf = await loadPdfJs(file);
  if (pdf.numPages > 50) { await pdf.destroy(); throw new Error("Image conversion is limited to 50 pages."); }
  const zip = new JSZip();
  for (let i=1;i<=pdf.numPages;i++) {
    setProgress(5+(i-1)/pdf.numPages*85,"Rendering page "+i+" of "+pdf.numPages+"…");
    const page = await pdf.getPage(i);
    const {canvas}=await renderPdfPage(page,2);
    const data=canvas.toDataURL("image/jpeg",0.92).split(",")[1];
    zip.file("page-"+String(i).padStart(3,"0")+".jpg",data,{base64:true});
    canvas.width=1;canvas.height=1;page.cleanup();
  }
  await pdf.destroy();
  setProgress(95,"Packaging JPG images…");
  return await zip.generateAsync({type:"blob"});
}
async function jpgToPDF(files) {
  const { PDFDocument } = getPDFLib();
  const output = await PDFDocument.create();
  for (let i=0;i<files.length;i++) {
    setProgress(5+i/files.length*85,"Adding image "+(i+1)+" of "+files.length+"…");
    const file=files[i], bytes=new Uint8Array(await file.arrayBuffer());
    const ext=fileExtension(file.name);
    let image;
    if (ext==="png" || file.type==="image/png") image=await output.embedPng(bytes);
    else image=await output.embedJpg(bytes);
    const page=output.addPage([image.width,image.height]);
    page.drawImage(image,{x:0,y:0,width:image.width,height:image.height});
  }
  return new Blob([await output.save({useObjectStreams:true})],{type:"application/pdf"});
}
function sanitizeMammothHtml(html) {
  const parsed=new DOMParser().parseFromString(html,"text/html");
  parsed.querySelectorAll("script,style,iframe,object,embed,form,video,audio,link,meta").forEach(el=>el.remove());
  parsed.body.querySelectorAll("*").forEach(el=>{
    [...el.attributes].forEach(attr=>{
      if (attr.name==="src" && el.tagName==="IMG" && attr.value.startsWith("data:image/")) return;
      el.removeAttribute(attr.name);
    });
    if (el.tagName==="IMG" && !el.getAttribute("src")) el.remove();
  });
  return parsed.body.innerHTML;
}
async function wordToPDF(file) {
  if (!window.mammoth || !window.html2pdf) throw new Error("The Word-to-PDF libraries could not load. Refresh the page and try again.");
  setProgress(15,"Reading the Word document locally…");
  const result=await mammoth.convertToHtml({arrayBuffer:await file.arrayBuffer()});
  if (!result.value.trim()) throw new Error("No readable document content was found in this DOCX file.");
  const container=document.createElement("div");
  container.className="word-export-sheet";
  container.innerHTML=sanitizeMammothHtml(result.value);
  document.body.appendChild(container);
  try {
    setProgress(45,"Laying out your Word document as PDF…");
    const worker=html2pdf().set({
      margin:[12,12,12,12],
      image:{type:"jpeg",quality:0.94},
      html2canvas:{scale:1.6,useCORS:false,backgroundColor:"#ffffff",logging:false},
      jsPDF:{unit:"mm",format:"a4",orientation:"portrait"},
      pagebreak:{mode:["css","legacy"]}
    }).from(container);
    const blob=await worker.outputPdf("blob");
    setProgress(95,"Finishing your PDF…");
    return blob;
  } finally {
    container.remove();
  }
}
async function ocrPDF(file) {
  if (!window.Tesseract) throw new Error("The OCR library could not load. Refresh the page and try again.");
  const { PDFDocument, StandardFonts } = getPDFLib();
  const originalBytes=await file.arrayBuffer();
  const output=await PDFDocument.load(originalBytes);
  const pdf=await loadPdfJs(file);
  if(pdf.numPages>15){await pdf.destroy();throw new Error("OCR is limited to 15 pages to protect your browser's memory.");}
  const font=await output.embedFont(StandardFonts.Helvetica);
  let worker;
  try {
    worker=await Tesseract.createWorker("eng");
    for(let i=1;i<=pdf.numPages;i++){
      setProgress(5+(i-1)/pdf.numPages*86,"Scanning page "+i+" of "+pdf.numPages+" with OCR…");
      const sourcePage=await pdf.getPage(i);
      const {canvas}=await renderPdfPage(sourcePage,1.6);
      const recognized=await worker.recognize(canvas);
      const imageData=canvas.toDataURL("image/jpeg",0.86).split(",")[1];
      const imageBytes=Uint8Array.from(atob(imageData),c=>c.charCodeAt(0));
      const image=await output.embedJpg(imageBytes);
      const target=output.getPage(i-1);
      const size=target.getSize();
      target.drawImage(image,{x:0,y:0,width:size.width,height:size.height});
      const words=(recognized.data.words||[]).filter(word=>word.text&&word.bbox);
      for(const word of words){
        const sx=size.width/canvas.width, sy=size.height/canvas.height;
        const x=Math.max(0,word.bbox.x0*sx);
        const y=Math.max(0,size.height-word.bbox.y1*sy);
        const fontSize=Math.max(3,Math.min(18,(word.bbox.y1-word.bbox.y0)*sy));
        try { target.drawText(word.text,{x,y,size:fontSize,font,opacity:0}); } catch (_) { /* skip unsupported glyphs */ }
      }
      canvas.width=1;canvas.height=1;sourcePage.cleanup();
    }
  } finally {
    if(worker) await worker.terminate();
    await pdf.destroy();
  }
  return new Blob([await output.save({useObjectStreams:true})],{type:"application/pdf"});
}

async function runActiveTool() {
  const file=chosenFiles[0];
  switch(activeTool){
    case "PDF to Word": return {blob:await pdfToWord(file),name:safeBaseName(file.name)+".docx"};
    case "Merge PDF": return {blob:await mergePDF(chosenFiles),name:"merged-document.pdf"};
    case "Split PDF": return {blob:await splitPDF(file),name:safeBaseName(file.name)+"-selected-pages.pdf"};
    case "Compress PDF": return {blob:await compressPDF(file),name:safeBaseName(file.name)+"-compressed.pdf"};
    case "Word to PDF": return {blob:await wordToPDF(file),name:safeBaseName(file.name)+".pdf"};
    case "PDF to JPG": return {blob:await pdfToJpg(file),name:safeBaseName(file.name)+"-images.zip"};
    case "JPG to PDF": return {blob:await jpgToPDF(chosenFiles),name:"images.pdf"};
    case "Rotate PDF": return {blob:await rotatePDF(file),name:safeBaseName(file.name)+"-rotated.pdf"};
    case "OCR PDF": return {blob:await ocrPDF(file),name:safeBaseName(file.name)+"-searchable.pdf"};
    default: throw new Error("This tool is not available yet.");
  }
}

cards.forEach(card=>card.addEventListener("click",()=>{
  const tool=card.querySelector(".tool-copy strong").textContent;
  if(TOOL_CONFIG[tool]) openTool(tool);
  else showToast(tool+" is coming soon — we're building the tools one by one.");
}));
document.getElementById("closeConverter").addEventListener("click",closeTool);
overlay.addEventListener("click",event=>{if(event.target===overlay)closeTool();});
document.addEventListener("keydown",event=>{if(event.key==="Escape"&&overlay.classList.contains("open"))closeTool();});
chooseFileButton.addEventListener("click",event=>{event.stopPropagation();pdfInput.click();});
uploadZone.addEventListener("click",()=>pdfInput.click());
uploadZone.addEventListener("keydown",event=>{if(event.key==="Enter"||event.key===" "){event.preventDefault();pdfInput.click();}});
pdfInput.addEventListener("change",()=>showFiles(pdfInput.files));
document.getElementById("removeFile").addEventListener("click",resetTool);
["dragenter","dragover"].forEach(type=>uploadZone.addEventListener(type,event=>{event.preventDefault();uploadZone.classList.add("dragover");}));
["dragleave","drop"].forEach(type=>uploadZone.addEventListener(type,event=>{event.preventDefault();uploadZone.classList.remove("dragover");}));
uploadZone.addEventListener("drop",event=>showFiles(event.dataTransfer.files));

convertButton.addEventListener("click",async()=>{
  if(conversionComplete){resetTool();return;}
  if(!chosenFiles.length||converting)return;
  converting=true;
  converterError.hidden=true;
  conversionStatus.hidden=false;
  setProgress(4,"Preparing local conversion…");
  convertButton.disabled=true;
  convertButton.textContent="Working on your device…";
  dialog.classList.add("busy");
  try{
    const result=await runActiveTool();
    downloadBlob(result.blob,result.name);
    setProgress(100,"Done! Your file is ready.");
    conversionComplete=true;
    convertButton.textContent="Use this tool again";
    convertButton.disabled=false;
  }catch(error){
    converterError.textContent=error.message||"Something went wrong. Please try again.";
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
