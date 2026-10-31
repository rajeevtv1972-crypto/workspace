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
const converterToolIcon = document.getElementById("converterToolIcon");
const TOOL_ICON_IDS = {"PDF to Word":"i-pdf-word","Merge PDF":"i-merge","Split PDF":"i-split","Compress PDF":"i-compress","Word to PDF":"i-word-pdf","PDF to JPG":"i-pdf-image","JPG to PDF":"i-image-pdf","Rotate PDF":"i-rotate","OCR PDF":"i-ocr"};
const toolDescription = document.querySelector(".converter-heading p");
const uploadStrong = uploadZone.querySelector("strong");
const uploadHint = document.getElementById("uploadHint");
const chooseFileButton = document.getElementById("chooseFile");

const TOOL_CONFIG = {
  "PDF to Word": { accept: ".pdf,application/pdf", kind: "pdf", multiple: false, hint: "PDF · Up to 20 MB · 50 pages maximum", description: "Convert into editable Word text while retaining font sizes, emphasis, line breaks and detected highlights where possible.", button: "Convert to Word" },
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
  const iconId = TOOL_ICON_IDS[toolName] || "i-brand";
  converterToolIcon.innerHTML = '<svg aria-hidden="true"><use href="#' + iconId + '"></use></svg>';
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
function getPdfTextStyle(item, styles, resolvedFonts) {
  const fontMeta = resolvedFonts?.[item.fontName] || {};
  const rawName = String(fontMeta.name || item.fontName || "");
  const style = styles?.[item.fontName] || {};
  const familyValue = String(style.fontFamily || "").toLowerCase();
  let font = "Arial";
  if (familyValue.includes("serif") && !familyValue.includes("sans") || /times|cambria|georgia/i.test(rawName)) font = "Times New Roman";
  else if (familyValue.includes("mono") || /courier|consolas|monaco/i.test(rawName)) font = "Courier New";
  else if (familyValue && !familyValue.includes("sans")) {
    const candidate = style.fontFamily.replace(/[^a-z0-9 ._-]/gi, "").trim();
    if (candidate && candidate.length <= 48) font = candidate;
  }
  const isBold = /bold|black|heavy|semibold|demi|bd\b/i.test(rawName);
  const isItalic = /italic|oblique|slant|it\b/i.test(rawName);
  const matrix = item.transform || [0,0,0,0,0,0];
  const fontSize = Math.hypot(matrix[0] || 0, matrix[1] || 0) || Math.abs(matrix[3] || 0) || item.height || 11;
  return {
    font,
    size: Math.max(6, Math.min(72, fontSize)),
    bold: isBold,
    italics: isItalic,
    underline: false,
    strike: false,
    highlight: undefined
  };
}

function transformPdfPointToPage(x, y, view) {
  const [xMin, yMin, xMax, yMax] = view;
  return { x: x - xMin, y: yMax - y };
}

function getMarkupAnnotationBoxes(annotations, view) {
  const boxes = [];
  for (const annotation of annotations || []) {
    const subtype = String(annotation.subtype || "");
    if (!["Highlight", "Underline", "StrikeOut", "Squiggly"].includes(subtype)) continue;
    const points = annotation.quadPoints || [];
    const rgb = annotation.color ? Array.from(annotation.color) : [255, 255, 0];
    const hex = rgb.map(value => Math.max(0, Math.min(255, Math.round(value))).toString(16).padStart(2, "0")).join("").toUpperCase();
    const colorName = closestWordHighlight(rgb);
    for (let i = 0; i + 7 < points.length; i += 8) {
      const coords = [];
      for (let p = 0; p < 8; p += 2) coords.push(transformPdfPointToPage(points[i+p], points[i+p+1], view));
      boxes.push({
        subtype,
        left: Math.min(...coords.map(point => point.x)),
        right: Math.max(...coords.map(point => point.x)),
        top: Math.min(...coords.map(point => point.y)),
        bottom: Math.max(...coords.map(point => point.y)),
        colorName,
        colorHex: hex
      });
    }
  }
  return boxes;
}

function closestWordHighlight(rgb) {
  const palette = [
    ["yellow",[255,255,0]],["green",[0,255,0]],["cyan",[0,255,255]],
    ["magenta",[255,0,255]],["blue",[0,0,255]],["red",[255,0,0]],
    ["darkBlue",[0,0,128]],["darkCyan",[0,128,128]],["darkGreen",[0,128,0]],
    ["darkMagenta",[128,0,128]],["darkRed",[128,0,0]],["darkYellow",[128,128,0]],
    ["darkGray",[128,128,128]],["lightGray",[192,192,192]]
  ];
  let best = "yellow", bestDistance = Infinity;
  for (const [name, color] of palette) {
    const distance = Math.pow((rgb[0]||0)-color[0],2)+Math.pow((rgb[1]||0)-color[1],2)+Math.pow((rgb[2]||0)-color[2],2);
    if (distance < bestDistance) { bestDistance = distance; best = name; }
  }
  return best;
}

function rectanglesOverlap(a, b) {
  const width = Math.max(0, Math.min(a.right,b.right)-Math.max(a.left,b.left));
  const height = Math.max(0, Math.min(a.bottom,b.bottom)-Math.max(a.top,b.top));
  const area = Math.max(1,(a.right-a.left)*(a.bottom-a.top));
  return (width*height)/area > 0.08;
}

function groupPdfTextIntoLines(items, styles, resolvedFonts, pageHeight, annotations, pageView) {
  const positioned = items
    .filter(item => item && typeof item.str === "string" && item.str.length)
    .map(item => {
      const matrix = item.transform || [0,0,0,0,0,0];
      const font = getPdfTextStyle(item, styles, resolvedFonts);
      const baseline = pageHeight - matrix[5];
      const left = matrix[4] - pageView[0];
      const width = Math.max(0, item.width || font.size * item.str.length * 0.48);
      const top = Math.max(0, baseline - font.size * 0.88);
      const bottom = Math.min(pageHeight, baseline + font.size * 0.22);
      const bounds = {left, right:left+width, top, bottom};
      const applied = annotations.filter(annotation => rectanglesOverlap(bounds, annotation));
      font.highlight = applied.find(annotation => annotation.subtype === "Highlight")?.colorName;
      font.underline = applied.some(annotation => annotation.subtype === "Underline" || annotation.subtype === "Squiggly");
      font.strike = applied.some(annotation => annotation.subtype === "StrikeOut");
      return {
        text: item.str,
        x: left,
        right: left + width,
        baseline,
        top,
        bottom,
        font,
        hasEOL: !!item.hasEOL
      };
    })
    .filter(item => item.text.trim().length);

  positioned.sort((a,b) => a.baseline-b.baseline || a.x-b.x);
  const lines = [];
  for (const item of positioned) {
    let line = lines.find(candidate =>
      Math.abs(candidate.baseline-item.baseline) <= Math.max(2.2, Math.min(candidate.fontSize,item.font.size)*0.28)
    );
    if (!line) {
      line = {baseline:item.baseline, top:item.top, bottom:item.bottom, fontSize:item.font.size, items:[]};
      lines.push(line);
    }
    line.items.push(item);
    line.top = Math.min(line.top,item.top);
    line.bottom = Math.max(line.bottom,item.bottom);
    line.fontSize = Math.max(line.fontSize,item.font.size);
    line.baseline = (line.baseline*(line.items.length-1)+item.baseline)/line.items.length;
  }
  lines.sort((a,b)=>a.top-b.top);
  return lines;
}

function buildRunsForLine(line, pageWidth) {
  const ordered = [...line.items].sort((a,b)=>a.x-b.x);
  const columns = [];
  let current = [];
  let priorRight = null;
  for (const item of ordered) {
    if (current.length && priorRight !== null && item.x-priorRight > pageWidth*0.16) {
      columns.push(current);
      current = [];
    }
    current.push(item);
    priorRight = Math.max(priorRight ?? item.right,item.right);
  }
  if (current.length) columns.push(current);

  return columns.map(column => {
    const runs = [];
    let priorRight = null;
    for (const item of column) {
      const gap = priorRight === null ? 0 : item.x-priorRight;
      const textStartsWithSpace = /^\s/.test(item.text);
      const lastRun = runs[runs.length-1];
      if (lastRun && gap > Math.max(1.4,item.font.size*0.16) && !textStartsWithSpace && !/\s$/.test(lastRun.text)) {
        runs.push(new docx.TextRun({text:" ",font:"Arial",size:Math.round(item.font.size*2)}));
      }
      const options = {
        text:item.text,
        font:item.font.font,
        size:Math.round(item.font.size*2),
        bold:item.font.bold,
        italics:item.font.italics,
        underline:item.font.underline ? {type:"single"} : undefined,
        strike:item.font.strike || undefined,
        highlight:item.font.highlight
      };
      runs.push(new docx.TextRun(options));
      priorRight = Math.max(priorRight ?? item.right,item.right);
    }
    return {runs, left:column[0]?.x || 0};
  });
}

async function pdfToWordEditable(file) {
  if (!window.docx) throw new Error("The Word generator could not load. Refresh the page and try again.");
  const pdf = await loadPdfJs(file);
  if (pdf.numPages > 50) {
    await pdf.destroy();
    throw new Error("This PDF has more than 50 pages. Please use a smaller document.");
  }

  const sections = [];
  let extractedCharacters = 0;
  try {
    for (let pageNo=1; pageNo<=pdf.numPages; pageNo++) {
      setProgress(5+(pageNo-1)/pdf.numPages*82,"Reading formatting on page "+pageNo+" of "+pdf.numPages+"…");
      const page = await pdf.getPage(pageNo);
      const pageView = page.view;
      const pageWidth = pageView[2]-pageView[0];
      const pageHeight = pageView[3]-pageView[1];
      const content = await page.getTextContent();
      const resolvedFonts = {};
      // PDF.js exposes original font names through its common object store
      // after the page operator list has resolved embedded font resources.
      try {
        await page.getOperatorList();
        for (const fontKey of Object.keys(content.styles || {})) {
          try {
            const fontObject = page.commonObjs.get(fontKey);
            resolvedFonts[fontKey] = {
              name: fontObject?.name || fontKey,
              isBold: fontObject?.isBold === true,
              isItalic: fontObject?.isItalic === true
            };
          } catch (_) {
            resolvedFonts[fontKey] = { name: fontKey };
          }
        }
      } catch (_) {
        // If a PDF uses fonts PDF.js cannot resolve to their original names,
        // still build an editable document using its fallback font families.
      }
      const annotations = await page.getAnnotations({intent:"display"});
      const annotationBoxes = getMarkupAnnotationBoxes(annotations,pageView);
      const lines = groupPdfTextIntoLines(content.items,content.styles,resolvedFonts,pageHeight,annotationBoxes,pageView);
      const paragraphs = [];
      let priorBottom = 0;

      for (const line of lines) {
        const columns = buildRunsForLine(line,pageWidth);
        for (const column of columns) {
          if (!column.runs.length) continue;
          const textLength = line.items.reduce((sum,item)=>sum+item.text.length,0);
          extractedCharacters += textLength;
          const before = Math.max(0,line.top-priorBottom);
          paragraphs.push(new docx.Paragraph({
            indent:{left:Math.max(0,Math.round(column.left*20))},
            spacing:{before:Math.round(before*20),after:0},
            children:column.runs
          }));
        }
        priorBottom = Math.max(priorBottom,line.bottom);
      }

      if (!paragraphs.length) {
        paragraphs.push(new docx.Paragraph({children:[new docx.TextRun({text:""})]}));
      }

      // Each PDF page gets a section with the same physical page dimensions.
      // Paragraph indents and vertical spacing are approximated from PDF coordinates.
      sections.push({
        properties:{
          page:{
            size:{
              width:Math.round(pageWidth*20),
              height:Math.round(pageHeight*20),
              orientation:pageWidth>pageHeight?"landscape":"portrait"
            },
            margin:{top:0,right:0,bottom:0,left:0,header:0,footer:0}
          }
        },
        children:paragraphs
      });
      page.cleanup();
    }
  } finally {
    await pdf.destroy();
  }

  if (extractedCharacters < 2) {
    throw new Error("This PDF does not contain selectable text. It may be a scanned document; use OCR PDF first.");
  }

  setProgress(94,"Building an editable Word document with recovered formatting…");
  const document = new docx.Document({
    creator:"Workspace PDF",
    title:safeBaseName(file.name),
    description:"Editable text conversion with recovered font sizes, bold/italic styles, line spacing, page sizes and PDF highlight annotations where available.",
    sections
  });
  return await docx.Packer.toBlob(document);
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
    case "PDF to Word": return {blob:await pdfToWordEditable(file),name:safeBaseName(file.name)+"-editable.docx"};
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
