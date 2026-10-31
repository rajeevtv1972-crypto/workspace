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
  "PDF to Word": { accept: ".pdf,application/pdf", kind: "pdf", multiple: false, hint: "PDF · Up to 20 MB · 50 pages maximum", description: "Preserve page artwork, logos and table rules while making the PDF text editable in Word.", button: "Convert to Word" },
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
function getResolvedPdfFonts(page, content) {
  const resolved = {};
  try {
    for (const key of Object.keys(content.styles || {})) {
      try {
        const font = page.commonObjs.get(key);
        resolved[key] = {
          name: font?.name || key,
          isBold: font?.isBold === true,
          isItalic: font?.isItalic === true
        };
      } catch (_) {
        resolved[key] = { name: key, isBold: false, isItalic: false };
      }
    }
  } catch (_) {}
  return resolved;
}

function inferPdfFont(item, style, fontMeta) {
  const name = String(fontMeta?.name || item.fontName || "");
  const family = String(style?.fontFamily || "").toLowerCase();
  let font = "Arial";
  if (/times|cambria|georgia/i.test(name) || (family.includes("serif") && !family.includes("sans"))) {
    font = "Times New Roman";
  } else if (/courier|consolas|monaco/i.test(name) || family.includes("mono")) {
    font = "Courier New";
  } else if (/symbol/i.test(name)) {
    font = "Symbol";
  } else if (family && !family.includes("sans")) {
    const candidate = family.replace(/[^a-z0-9 ._-]/gi, "").trim();
    if (candidate && candidate.length <= 48) font = candidate;
  }

  const bold = fontMeta?.isBold === true || /bold|black|heavy|semibold|demi|bd\b/i.test(name);
  const italics = fontMeta?.isItalic === true || /italic|oblique|slant|it\b/i.test(name);
  const matrix = item.transform || [0,0,0,0,0,0];
  const size = Math.hypot(matrix[0] || 0, matrix[1] || 0) || Math.abs(matrix[3] || 0) || item.height || 10;
  return { font, bold, italics, size: Math.max(4, Math.min(72, size)) };
}

function medianChannel(values) {
  if (!values.length) return 255;
  values.sort((a,b)=>a-b);
  return values[Math.floor(values.length/2)];
}

function sampleCanvasPixel(data, width, height, x, y) {
  x = Math.max(0,Math.min(width-1,Math.round(x)));
  y = Math.max(0,Math.min(height-1,Math.round(y)));
  const offset = (y*width+x)*4;
  return [data[offset],data[offset+1],data[offset+2],data[offset+3]];
}

function sampleLocalBackground(imageData, rect) {
  const {data,width,height} = imageData;
  const cx = (rect.left+rect.right)/2;
  const cy = (rect.top+rect.bottom)/2;
  const gap = Math.max(2,Math.min(6,Math.round(Math.min(rect.width,rect.height)*0.25)));
  const points = [
    [cx,rect.top-gap],[cx,rect.bottom+gap],
    [rect.left-gap,cy],[rect.right+gap,cy],
    [rect.left-gap,rect.top-gap],[rect.right+gap,rect.top-gap],
    [rect.left-gap,rect.bottom+gap],[rect.right+gap,rect.bottom+gap]
  ];
  const samples = points.map(([x,y])=>sampleCanvasPixel(data,width,height,x,y)).filter(p=>p[3]>180);
  return [
    medianChannel(samples.map(p=>p[0])),
    medianChannel(samples.map(p=>p[1])),
    medianChannel(samples.map(p=>p[2]))
  ];
}

function sampleTextInk(imageData, rect, background) {
  const {data,width,height} = imageData;
  const values = [[],[],[]];
  const left = Math.max(0,Math.floor(rect.left));
  const right = Math.min(width-1,Math.ceil(rect.right));
  const top = Math.max(0,Math.floor(rect.top));
  const bottom = Math.min(height-1,Math.ceil(rect.bottom));
  const step = Math.max(1,Math.floor(Math.min(rect.width,rect.height)/30));

  for (let y=top;y<=bottom;y+=step) {
    for (let x=left;x<=right;x+=step) {
      const pixel = sampleCanvasPixel(data,width,height,x,y);
      const contrast = Math.max(
        Math.abs(pixel[0]-background[0]),
        Math.abs(pixel[1]-background[1]),
        Math.abs(pixel[2]-background[2])
      );
      if (contrast > 75 && pixel[3] > 180) {
        values[0].push(pixel[0]);
        values[1].push(pixel[1]);
        values[2].push(pixel[2]);
      }
    }
  }

  if (!values[0].length) return "111111";
  return values.map(channel=>medianChannel(channel).toString(16).padStart(2,"0")).join("").toUpperCase();
}

function buildEditableTextItems(content, resolvedFonts, pageHeight, renderScale, imageData, context) {
  const output = [];
  const {width:canvasWidth,height:canvasHeight} = context.canvas;
  let maskedCount = 0;

  for (const item of content.items || []) {
    if (!item || typeof item.str !== "string" || !item.str.trim()) continue;
    const matrix = item.transform || [0,0,0,0,0,0];
    const style = content.styles?.[item.fontName] || {};
    const font = inferPdfFont(item,style,resolvedFonts[item.fontName]);
    const baselineX = matrix[4] || 0;
    const baselineY = pageHeight - (matrix[5] || 0);
    const ascent = Math.max(0.55,Math.min(1.1,Math.abs(style.ascent ?? 0.82)));
    const descent = Math.max(0.08,Math.min(0.45,Math.abs(style.descent ?? 0.22)));
    const textHeight = Math.max(item.height || 0,font.size*(ascent+descent));
    const textWidth = Math.max(item.width || 0,font.size*item.str.length*0.28);

    // PDF coordinates are converted into page-relative top-left points.
    const box = {
      left: Math.max(0,baselineX),
      top: Math.max(0,baselineY-font.size*ascent),
      right: Math.min(canvasWidth/renderScale,baselineX+textWidth),
      bottom: Math.min(canvasHeight/renderScale,baselineY+font.size*descent)
    };
    box.width = Math.max(1,box.right-box.left);
    box.height = Math.max(1,box.bottom-box.top);

    const canvasBox = {
      left: box.left*renderScale-0.55,
      top: box.top*renderScale-0.5,
      right: box.right*renderScale+0.55,
      bottom: box.bottom*renderScale+0.5
    };
    canvasBox.width = canvasBox.right-canvasBox.left;
    canvasBox.height = canvasBox.bottom-canvasBox.top;

    // Sample background and glyph color before any masking takes place.
    const background = sampleLocalBackground(imageData,canvasBox);
    const ink = sampleTextInk(imageData,canvasBox,background);

    // Remove only the original glyph area. Page lines, table borders, logos,
    // stamps and other non-text artwork remain in the rendered page layer.
    const maskLeft = Math.max(0,Math.floor(canvasBox.left));
    const maskTop = Math.max(0,Math.floor(canvasBox.top));
    const maskRight = Math.min(canvasWidth,Math.ceil(canvasBox.right));
    const maskBottom = Math.min(canvasHeight,Math.ceil(canvasBox.bottom));
    if (maskRight > maskLeft && maskBottom > maskTop) {
      context.fillStyle = "rgb("+background.join(",")+")";
      context.fillRect(maskLeft,maskTop,maskRight-maskLeft,maskBottom-maskTop);
      maskedCount++;
    }

    output.push({
      text:item.str,
      x:box.left,
      y:box.top,
      width:box.width,
      height:box.height,
      font,
      color:ink
    });
  }
  return {items:output,maskedCount};
}

async function makePdfPageBackground(page, content, pageHeight, renderScale) {
  const viewport = page.getViewport({scale:renderScale});
  const canvas = document.createElement("canvas");
  canvas.width = Math.ceil(viewport.width);
  canvas.height = Math.ceil(viewport.height);
  const context = canvas.getContext("2d",{alpha:false,willReadFrequently:true});
  if (!context) throw new Error("Your browser could not create a canvas for the PDF page.");

  context.fillStyle = "#FFFFFF";
  context.fillRect(0,0,canvas.width,canvas.height);
  await page.render({canvasContext:context,viewport}).promise;

  // Capture the untouched pixels once so background/text-color sampling is
  // unaffected by rectangles already masked on the canvas.
  const originalPixels = context.getImageData(0,0,canvas.width,canvas.height);
  const resolvedFonts = getResolvedPdfFonts(page,content);
  const built = buildEditableTextItems(
    content,resolvedFonts,pageHeight,renderScale,originalPixels,context
  );

  const png = await new Promise((resolve,reject)=>{
    canvas.toBlob(blob=>blob?resolve(blob):reject(new Error("Could not prepare the page artwork image.")),"image/png");
  });
  const bytes = new Uint8Array(await png.arrayBuffer());
  const imageWidthPx = (page.getViewport({scale:1}).width*4)/3;
  const imageHeightPx = (page.getViewport({scale:1}).height*4)/3;

  canvas.width=1;
  canvas.height=1;
  return {bytes,built,imageWidthPx,imageHeightPx};
}

async function pdfToWordEditable(file) {
  if (!window.docx) throw new Error("The Word generator could not load. Refresh the page and try again.");
  const pdf = await loadPdfJs(file);
  if (pdf.numPages > 20) {
    await pdf.destroy();
    throw new Error("This layout-preserving conversion is limited to 20 pages. Split the PDF into smaller files and convert each part.");
  }

  const sections = [];
  let totalTextItems = 0;
  try {
    for (let pageNo=1;pageNo<=pdf.numPages;pageNo++) {
      setProgress(4+(pageNo-1)/pdf.numPages*85,"Rebuilding page "+pageNo+" of "+pdf.numPages+"…");
      const page = await pdf.getPage(pageNo);
      const viewport = page.getViewport({scale:1});
      const pageWidth = viewport.width;
      const pageHeight = viewport.height;
      const content = await page.getTextContent();
      // Resolve embedded PDF font objects before trying to recover their names/weights.
      try { await page.getOperatorList(); } catch (_) {}
      const renderScale = Math.min(2.5,2500/Math.max(pageWidth,pageHeight));
      const background = await makePdfPageBackground(page,content,pageHeight,renderScale);
      const textParagraphs = [];

      for (const item of background.built.items) {
        const frameWidth = Math.max(24,Math.round((item.width+2.2)*20));
        const frameHeight = Math.max(90,Math.round(Math.max(item.height*1.9,item.font.size*1.65)*20));
        const x = Math.max(0,Math.round(item.x*20));
        const y = Math.max(0,Math.round(item.y*20));
        const textRun = new docx.TextRun({
          text:item.text,
          font:item.font.font,
          size:Math.max(8,Math.round(item.font.size*2)),
          bold:item.font.bold,
          italics:item.font.italics,
          color:item.color
        });

        textParagraphs.push(new docx.Paragraph({
          frame:{
            type:"absolute",
            position:{x,y},
            width:frameWidth,
            height:frameHeight,
            anchor:{
              horizontal:docx.FrameAnchorType.PAGE,
              vertical:docx.FrameAnchorType.PAGE
            },
            wrap:docx.FrameWrap.NONE,
            rule:docx.HeightRule.EXACT,
            space:{horizontal:0,vertical:0}
          },
          spacing:{
            before:0,
            after:0,
            line:Math.max(40,Math.round(item.font.size*20*1.3)),
            lineRule:docx.LineRuleType.EXACT
          },
          wordWrap:false,
          children:[textRun]
        }));
      }

      totalTextItems += background.built.items.length;
      const pageImage = new docx.ImageRun({
        type:"png",
        data:background.bytes,
        transformation:{
          width:background.imageWidthPx,
          height:background.imageHeightPx
        },
        floating:{
          horizontalPosition:{
            relative:docx.HorizontalPositionRelativeFrom.PAGE,
            offset:0
          },
          verticalPosition:{
            relative:docx.VerticalPositionRelativeFrom.PAGE,
            offset:0
          },
          behindDocument:true,
          allowOverlap:true,
          wrap:{
            type:docx.TextWrappingType.NONE,
            side:docx.TextWrappingSide.BOTH_SIDES
          },
          zIndex:0
        },
        altText:{
          title:"Original PDF page "+pageNo+" artwork",
          description:"Original page graphics, tables, rules and images with editable text areas cleared.",
          name:"PDF page "+pageNo+" artwork"
        }
      });

      // A floating page image preserves non-text artwork. Each extracted text
      // span is then reinserted as a separately editable, absolutely positioned
      // Word text frame at its original PDF coordinates.
      const pageAnchor = new docx.Paragraph({
        spacing:{before:0,after:0,line:1,lineRule:docx.LineRuleType.EXACT},
        children:[pageImage]
      });

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
        children:[pageAnchor,...textParagraphs]
      });

      page.cleanup();
    }
  } finally {
    await pdf.destroy();
  }

  if (totalTextItems < 2) {
    throw new Error("This PDF does not contain enough selectable text to create an editable Word document. It may be a scanned PDF; use OCR first.");
  }

  setProgress(94,"Packaging preserved page artwork and editable text…");
  const document = new docx.Document({
    creator:"Workspace PDF",
    title:safeBaseName(file.name),
    description:"Layout-aware conversion. Page graphics and tables are preserved as artwork; text is reinserted as individually editable positioned Word text.",
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
  const parsed = new DOMParser().parseFromString(html, "text/html");
  parsed.querySelectorAll("script,style,iframe,object,embed,form,video,audio,link,meta,svg,math").forEach(el => el.remove());

  const safeStyleProperties = new Set([
    "color","background-color","font-family","font-size","font-weight","font-style",
    "text-align","text-decoration","vertical-align","white-space","line-height",
    "margin","margin-left","margin-right","margin-top","margin-bottom",
    "padding","padding-left","padding-right","padding-top","padding-bottom",
    "width","height","max-width","border","border-collapse","border-width",
    "border-style","border-color","list-style-type","direction"
  ]);

  parsed.body.querySelectorAll("*").forEach(element => {
    [...element.attributes].forEach(attribute => {
      const name = attribute.name.toLowerCase();
      const value = attribute.value || "";

      if (name.startsWith("on") || name === "srcset" || name === "formaction") {
        element.removeAttribute(attribute.name);
        return;
      }
      if (name === "src" && element.tagName === "IMG" && /^data:image\/(png|jpeg|gif|webp);base64,/i.test(value)) return;
      if (name === "href" && element.tagName === "A" && /^(https?:|mailto:|#)/i.test(value)) return;
      if (name === "style") {
        const safeRules = value.split(";").map(rule => rule.trim()).filter(Boolean).map(rule => {
          const colon = rule.indexOf(":");
          if (colon < 1) return "";
          const property = rule.slice(0, colon).trim().toLowerCase();
          const cssValue = rule.slice(colon + 1).trim();
          if (!safeStyleProperties.has(property) || /url\s*\(|expression\s*\(|javascript:|@import|behavior\s*:/i.test(cssValue)) return "";
          return property + ":" + cssValue;
        }).filter(Boolean);
        if (safeRules.length) element.setAttribute("style", safeRules.join(";"));
        else element.removeAttribute("style");
        return;
      }
      if (["colspan","rowspan","width","height","align","valign","alt","title","class"].includes(name)) {
        if (["width","height","colspan","rowspan"].includes(name) && !/^\d{1,5}(px|pt|%)?$/.test(value)) {
          element.removeAttribute(attribute.name);
        }
        return;
      }
      element.removeAttribute(attribute.name);
    });

    if (element.tagName === "IMG") {
      const src = element.getAttribute("src") || "";
      if (!src.startsWith("data:image/")) element.remove();
      else {
        element.removeAttribute("width");
        element.style.maxWidth = "100%";
        element.style.height = "auto";
      }
    }
  });
  return parsed.body.innerHTML;
}

async function waitForDocumentImages(container) {
  const images = [...container.querySelectorAll("img")];
  await Promise.all(images.map(async image => {
    if (image.complete && image.naturalWidth > 0) return;
    if (typeof image.decode === "function") {
      try { await image.decode(); return; } catch (_) {}
    }
    await new Promise(resolve => {
      const done = () => resolve();
      image.addEventListener("load", done, { once: true });
      image.addEventListener("error", done, { once: true });
      setTimeout(done, 8000);
    });
  }));
  const broken = images.filter(image => !image.naturalWidth);
  broken.forEach(image => image.remove());
}

async function wordToPDF(file) {
  if (!window.mammoth) throw new Error("The Word reader library did not load. Refresh the page and try again.");
  if (!window.html2pdf) throw new Error("The PDF generator did not load. Refresh the page and try again.");
  if (file.size > 25 * 1024 * 1024) throw new Error("Word-to-PDF currently supports DOCX files up to 25 MB.");

  setProgress(10, "Opening your Word document locally…");
  const arrayBuffer = await file.arrayBuffer();
  const bytes = new Uint8Array(arrayBuffer);
  if (bytes.length < 4 || bytes[0] !== 0x50 || bytes[1] !== 0x4b) {
    throw new Error("This file is not a valid DOCX document. Please choose a .docx file (not the older .doc format).");
  }

  let result;
  try {
    result = await mammoth.convertToHtml({ arrayBuffer }, {
      includeDefaultStyleMap: true,
      convertImage: mammoth.images.imgElement(image => image.read("base64").then(imageBuffer => ({
        src: "data:" + image.contentType + ";base64," + imageBuffer
      })))
    });
  } catch (error) {
    throw new Error("We couldn't read this Word document. It may be damaged or use unsupported content.");
  }

  if (!result || !result.value || !result.value.trim()) {
    throw new Error("No readable content was found in this Word document.");
  }

  const container = document.createElement("div");
  container.className = "word-export-sheet";
  container.innerHTML = sanitizeMammothHtml(result.value);

  if (!container.textContent.trim() && !container.querySelector("img,table")) {
    throw new Error("This Word document has no content that can be exported.");
  }

  // Keep the temporary render surface within the viewport. It sits behind
  // the converter overlay while html2pdf clones and rasterizes it.
  container.setAttribute("aria-hidden", "true");
  document.body.appendChild(container);

  try {
    await waitForDocumentImages(container);
    if (document.fonts && document.fonts.ready) await document.fonts.ready;

    setProgress(48, "Preparing the Word pages for PDF…");
    const options = {
      margin: [12, 12, 12, 12],
      image: { type: "jpeg", quality: 0.95 },
      html2canvas: {
        scale: 1.45,
        useCORS: false,
        allowTaint: false,
        backgroundColor: "#ffffff",
        logging: false,
        scrollX: 0,
        scrollY: 0,
        windowWidth: Math.max(document.documentElement.clientWidth, 1000),
        removeContainer: true
      },
      jsPDF: { unit: "mm", format: "a4", orientation: "portrait", compress: true },
      pagebreak: { mode: ["css", "legacy"], avoid: ["tr", "img", "pre", "blockquote"] }
    };

    setProgress(62, "Rendering your Word document…");
    const worker = html2pdf().set(options).from(container).toPdf();
    const pdfDocument = await worker.get("pdf");
    if (!pdfDocument || typeof pdfDocument.output !== "function") {
      throw new Error("The PDF renderer could not create a PDF document. Please try again.");
    }

    const blob = pdfDocument.output("blob");
    if (!(blob instanceof Blob) || blob.size < 100 || blob.type !== "application/pdf") {
      throw new Error("The PDF renderer returned an empty or invalid file. Please try another DOCX document.");
    }

    setProgress(96, "Finishing your PDF download…");
    return blob;
  } catch (error) {
    if (error && error.message) throw error;
    throw new Error("Word-to-PDF rendering failed in this browser. Try a smaller DOCX file or remove unusually large images.");
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
