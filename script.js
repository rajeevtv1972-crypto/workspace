const cards = [...document.querySelectorAll(".tool-card")];
const search = document.getElementById("toolSearch");
const emptyState = document.getElementById("emptyState");
const toast = document.getElementById("toast");
let toastTimer;

function updateTools() {
  const query = search.value.trim().toLowerCase();
  let visible = 0;
  cards.forEach(card => {
    const matchesSearch = !query || card.dataset.name.includes(query) || card.innerText.toLowerCase().includes(query);
    card.hidden = !matchesSearch;
    if (matchesSearch) visible++;
  });
  emptyState.hidden = visible !== 0;
}

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
  "PDF to Word": { accept: ".pdf,application/pdf", kind: "pdf", multiple: false, hint: "PDF · Up to 20 MB · 20 pages maximum", description: "Convert PDF text into editable Word text and rebuild detected table grids as real editable Word tables.", button: "Convert to Word" },
  "Merge PDF": { accept: ".pdf,application/pdf", kind: "pdf", multiple: true, hint: "Select 2–10 PDF files · Up to 20 MB each", description: "Combine multiple PDFs into one document.", button: "Merge PDFs" },
  "Split PDF": { accept: ".pdf,application/pdf", kind: "pdf", multiple: false, hint: "PDF · Up to 20 MB · 100 pages maximum", description: "Choose the pages you want in a new PDF.", button: "Split PDF" },
  "Compress PDF": { accept: ".pdf,application/pdf", kind: "pdf", multiple: false, hint: "PDF · Up to 20 MB · 50 pages maximum", description: "Reduce file size by rebuilding pages as optimized images.", button: "Compress PDF" },
  "Word to PDF": { accept: ".docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document", kind: "docx", multiple: false, hint: "DOCX · Up to 25 MB · First use downloads a ~240 MB engine, then it is cached", description: "Convert DOCX with LibreOffice for much stronger Word layout, image, shape and page fidelity.", button: "Convert to PDF" },
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
    const maxSize = activeTool === "OCR PDF" ? 20 * 1024 * 1024 : activeTool === "JPG to PDF" ? 15 * 1024 * 1024 : activeTool === "Word to PDF" ? 25 * 1024 * 1024 : 20 * 1024 * 1024;
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
  // Sample a ring outside the text rectangle so thin table borders and
  // anti-aliased glyph edges do not become the fill color of the cleared area.
  const gap = Math.max(8,Math.min(16,Math.round(Math.min(rect.width,rect.height)*0.22)));
  const samples = [];
  const fractions = [0.08,0.2,0.35,0.5,0.65,0.8,0.92];
  for (const fraction of fractions) {
    samples.push(sampleCanvasPixel(data,width,height,rect.left+(rect.width*fraction),rect.top-gap));
    samples.push(sampleCanvasPixel(data,width,height,rect.left+(rect.width*fraction),rect.bottom+gap));
    samples.push(sampleCanvasPixel(data,width,height,rect.left-gap,rect.top+(rect.height*fraction)));
    samples.push(sampleCanvasPixel(data,width,height,rect.right+gap,rect.top+(rect.height*fraction)));
  }
  const usable = samples.filter(pixel=>pixel[3]>180);
  if (!usable.length) return [255,255,255];
  return [
    medianChannel(usable.map(pixel=>pixel[0])),
    medianChannel(usable.map(pixel=>pixel[1])),
    medianChannel(usable.map(pixel=>pixel[2]))
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

function buildEditableTextItems(content, resolvedFonts, pageHeight, renderScale, imageData, context, excludedItems = new Set()) {
  const output = [];
  const {width:canvasWidth,height:canvasHeight} = context.canvas;
  let maskedCount = 0;

  for (const item of content.items || []) {
    if (!item || excludedItems.has(item) || typeof item.str !== "string" || !item.str.trim()) continue;
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

function multiplyPdfMatrices(a, b) {
  return [
    a[0]*b[0] + a[2]*b[1],
    a[1]*b[0] + a[3]*b[1],
    a[0]*b[2] + a[2]*b[3],
    a[1]*b[2] + a[3]*b[3],
    a[0]*b[4] + a[2]*b[5] + a[4],
    a[1]*b[4] + a[3]*b[5] + a[5]
  ];
}

function transformPdfPoint(matrix, x, y) {
  return [
    matrix[0]*x + matrix[2]*y + matrix[4],
    matrix[1]*x + matrix[3]*y + matrix[5]
  ];
}

function mergePdfLineSegments(segments, orientation) {
  const sorted = [...segments].sort((a,b) =>
    a.position-b.position || a.start-b.start
  );
  const merged = [];
  for (const segment of sorted) {
    const current = merged[merged.length-1];
    if (
      current &&
      Math.abs(current.position-segment.position) <= 1.35 &&
      segment.start <= current.end + 3.2
    ) {
      current.position = (current.position*current.count+segment.position)/(current.count+1);
      current.count += 1;
      current.start = Math.min(current.start,segment.start);
      current.end = Math.max(current.end,segment.end);
    } else {
      merged.push({
        orientation,
        position:segment.position,
        start:segment.start,
        end:segment.end,
        count:1
      });
    }
  }
  return merged;
}

function detectPdfTableRegions(operatorList, pageHeight) {
  const OPS = pdfjsLib.OPS;
  if (!OPS || OPS.constructPath === undefined || OPS.rectangle === undefined) return [];

  const horizontalSegments = [];
  const verticalSegments = [];
  const stateStack = [];
  let matrix = [1,0,0,1,0,0];

  for (let i=0;i<operatorList.fnArray.length;i++) {
    const fn = operatorList.fnArray[i];
    const args = operatorList.argsArray[i] || [];

    if (fn === OPS.save) {
      stateStack.push(matrix.slice());
      continue;
    }
    if (fn === OPS.restore) {
      if (stateStack.length) matrix = stateStack.pop();
      continue;
    }
    if (fn === OPS.transform && args && args.length >= 6) {
      matrix = multiplyPdfMatrices(matrix,args);
      continue;
    }
    if (fn !== OPS.constructPath || !args[0] || !args[1]) continue;

    const pathOps = args[0];
    const pathArgs = args[1];
    let cursor = 0;

    for (const pathOp of pathOps) {
      if (pathOp === OPS.rectangle) {
        const x = Number(pathArgs[cursor++]);
        const y = Number(pathArgs[cursor++]);
        const width = Number(pathArgs[cursor++]);
        const height = Number(pathArgs[cursor++]);
        if (![x,y,width,height].every(Number.isFinite)) continue;

        const points = [
          transformPdfPoint(matrix,x,y),
          transformPdfPoint(matrix,x+width,y),
          transformPdfPoint(matrix,x+width,y+height),
          transformPdfPoint(matrix,x,y+height)
        ];
        const xs = points.map(point=>point[0]);
        const ys = points.map(point=>point[1]);
        const x0 = Math.min(...xs), x1 = Math.max(...xs);
        const y0 = Math.min(...ys), y1 = Math.max(...ys);
        const rectWidth = x1-x0, rectHeight = y1-y0;

        if (rectWidth <= 2.6 && rectHeight >= 7.5) {
          verticalSegments.push({
            position:(x0+x1)/2,
            start:pageHeight-y1,
            end:pageHeight-y0
          });
        } else if (rectHeight <= 2.6 && rectWidth >= 10) {
          horizontalSegments.push({
            position:pageHeight-(y0+y1)/2,
            start:x0,
            end:x1
          });
        }
      } else if (
        pathOp === OPS.moveTo ||
        pathOp === OPS.lineTo ||
        pathOp === OPS.curveTo
      ) {
        cursor += pathOp === OPS.curveTo ? 6 : 2;
      } else if (pathOp === OPS.curveTo2 || pathOp === OPS.curveTo3) {
        cursor += 4;
      }
    }
  }

  const horizontal = mergePdfLineSegments(horizontalSegments,"h")
    .filter(line=>line.end-line.start>=65);
  const vertical = mergePdfLineSegments(verticalSegments,"v");
  if (horizontal.length < 2 || vertical.length < 3) return [];

  // A PDF may draw two adjacent tables with one shared/continuous vertical
  // rule. Connected-component detection merges those tables incorrectly.
  // Instead, compare the vertical-column signature at each horizontal rule.
  const horizontalGroups=[];
  for(const line of horizontal) {
    let group=horizontalGroups.find(candidate =>
      Math.abs(candidate.start-line.start)<=3 &&
      Math.abs(candidate.end-line.end)<=3
    );
    if(!group) {
      group={start:line.start,end:line.end,lines:[]};
      horizontalGroups.push(group);
    }
    group.lines.push(line);
  }

  const candidates=[];
  for(const group of horizontalGroups) {
    group.lines.sort((a,b)=>a.position-b.position);
    const lineData=group.lines.map(line=>{
      const xs=vertical
        .filter(v =>
          v.position>=group.start-2 &&
          v.position<=group.end+2 &&
          v.start<=line.position+1.5 &&
          v.end>=line.position-1.5
        )
        .map(v=>v.position)
        .sort((a,b)=>a-b);
      return {line,xs};
    });

    const clusters=[];
    for(const entry of lineData) {
      const current=clusters[clusters.length-1];
      let similarity=0;
      if(current) {
        const previous=current.entries[current.entries.length-1].xs;
        const a=new Set(previous.map(x=>Math.round(x*2)/2));
        const b=new Set(entry.xs.map(x=>Math.round(x*2)/2));
        let intersection=0;
        for(const value of a) if(b.has(value)) intersection++;
        similarity=intersection/Math.max(1,a.size+b.size-intersection);
      }

      if(
        !current ||
        similarity<0.58 ||
        entry.line.position-current.entries[current.entries.length-1].line.position>48
      ) {
        clusters.push({entries:[entry]});
      } else {
        current.entries.push(entry);
      }
    }

    for(const cluster of clusters) {
      if(cluster.entries.length<2) continue;
      const ys=cluster.entries.map(entry=>entry.line.position).sort((a,b)=>a-b);
      const y0=ys[0], y1=ys[ys.length-1];
      if(y1-y0<15) continue;

      const relevantVerticals=vertical.filter(v=>{
        const overlap=Math.max(0,Math.min(v.end,y1)-Math.max(v.start,y0));
        return (
          v.position>=group.start-2 &&
          v.position<=group.end+2 &&
          overlap/Math.max(1,y1-y0)>=0.62
        );
      });

      const xs=[];
      for(const v of relevantVerticals) {
        if(!xs.some(x=>Math.abs(x-v.position)<1.5)) xs.push(v.position);
      }
      xs.sort((a,b)=>a-b);
      if(xs.length<3 || xs[xs.length-1]-xs[0]<65) continue;

      candidates.push({
        x0:xs[0],
        x1:xs[xs.length-1],
        y0,
        y1,
        columns:xs,
        rows:ys
      });
    }
  }

  candidates.sort((a,b)=>(a.y0-b.y0)||(a.x0-b.x0));
  const regions=[];
  for(const candidate of candidates) {
    const duplicate=regions.some(region =>
      Math.abs(region.x0-candidate.x0)<2 &&
      Math.abs(region.x1-candidate.x1)<2 &&
      Math.abs(region.y0-candidate.y0)<2 &&
      Math.abs(region.y1-candidate.y1)<2
    );
    if(!duplicate) regions.push(candidate);
  }
  return regions;
}

function pdfItemGeometry(item, pageHeight, styles, resolvedFonts) {
  const matrix=item.transform || [0,0,0,0,0,0];
  const style=styles?.[item.fontName] || {};
  const font=inferPdfFont(item,style,resolvedFonts[item.fontName]);
  const baselineX=matrix[4]||0;
  const baselineY=pageHeight-(matrix[5]||0);
  const ascent=Math.max(0.55,Math.min(1.1,Math.abs(style.ascent??0.82)));
  const descent=Math.max(0.08,Math.min(0.45,Math.abs(style.descent??0.22)));
  const width=Math.max(item.width||0,font.size*String(item.str||"").length*0.28);
  const top=Math.max(0,baselineY-font.size*ascent);
  const height=Math.max(item.height||0,font.size*(ascent+descent));
  return {
    x:Math.max(0,baselineX),
    y:top,
    width:Math.max(1,width),
    height:Math.max(1,height),
    centerX:baselineX+Math.max(1,width)/2,
    centerY:top+Math.max(1,height)/2,
    font
  };
}

function findPdfTableCellIndex(value, boundaries) {
  for(let i=0;i<boundaries.length-1;i++) {
    if(value>=boundaries[i]-0.8 && value<boundaries[i+1]-0.2) return i;
  }
  if(value>=boundaries[boundaries.length-1]-0.2) return boundaries.length-2;
  return -1;
}

function buildPdfTableBlocks(regions, content, resolvedFonts, pageHeight, renderScale, imageData) {
  const excludedItems=new Set();
  const tables=[];

  for(const region of regions) {
    const rowCount=region.rows.length-1;
    const colCount=region.columns.length-1;
    if(rowCount<1 || colCount<2) continue;

    const cells=Array.from({length:rowCount},()=>Array.from({length:colCount},()=>[]));
    for(const item of content.items||[]) {
      if(!item || typeof item.str!=="string" || !item.str.trim()) continue;
      const geometry=pdfItemGeometry(item,pageHeight,content.styles,resolvedFonts);
      if(
        geometry.centerX<region.x0-1.5 ||
        geometry.centerX>region.x1+1.5 ||
        geometry.centerY<region.y0-1.5 ||
        geometry.centerY>region.y1+1.5
      ) continue;

      const row=findPdfTableCellIndex(geometry.centerY,region.rows);
      const col=findPdfTableCellIndex(geometry.centerX,region.columns);
      if(row<0 || col<0) continue;

      cells[row][col].push({
        item,
        geometry,
        color:sampleTextInk(imageData,{
          left:geometry.x*renderScale-0.6,
          top:geometry.y*renderScale-0.6,
          right:(geometry.x+geometry.width)*renderScale+0.6,
          bottom:(geometry.y+geometry.height)*renderScale+0.6,
          width:geometry.width*renderScale+1.2,
          height:geometry.height*renderScale+1.2
        },[255,255,255])
      });
      excludedItems.add(item);
    }

    const rows=[];
    for(let r=0;r<rowCount;r++) {
      const docxCells=[];
      for(let c=0;c<colCount;c++) {
        const entries=cells[r][c].sort((a,b)=>
          a.geometry.centerY-b.geometry.centerY || a.geometry.x-b.geometry.x
        );
        const lineGroups=[];
        for(const entry of entries) {
          let line=lineGroups[lineGroups.length-1];
          const tolerance=Math.max(1.4,Math.min(2.6,entry.geometry.font.size*0.22));
          if(!line || Math.abs(line.centerY-entry.geometry.centerY)>tolerance) {
            line={centerY:entry.geometry.centerY,entries:[]};
            lineGroups.push(line);
          }
          line.entries.push(entry);
          line.centerY=line.entries.reduce((sum,value)=>sum+value.geometry.centerY,0)/line.entries.length;
        }

        const paragraphs=[];
        for(const line of lineGroups) {
          line.entries.sort((a,b)=>a.geometry.x-b.geometry.x);
          const runs=[];
          let previousRight=null;
          let referenceSize=8;
          for(const entry of line.entries) {
            const text=String(entry.item.str||"");
            if(!text) continue;
            if(
              previousRight!==null &&
              entry.geometry.x-previousRight>Math.max(1.8,entry.geometry.font.size*0.18) &&
              !text.startsWith(" ")
            ) {
              runs.push(new docx.TextRun({text:" "}));
            }
            runs.push(new docx.TextRun({
              text,
              font:entry.geometry.font.font,
              size:Math.max(8,Math.round(entry.geometry.font.size*2)),
              bold:entry.geometry.font.bold,
              italics:entry.geometry.font.italics,
              color:entry.color
            }));
            previousRight=Math.max(previousRight??0,entry.geometry.x+entry.geometry.width);
            referenceSize=Math.max(referenceSize,entry.geometry.font.size);
          }
          if(runs.length) {
            paragraphs.push(new docx.Paragraph({
              spacing:{before:0,after:0,line:Math.max(100,Math.round(referenceSize*23)),lineRule:"exact"},
              children:runs
            }));
          }
        }
        if(!paragraphs.length) paragraphs.push(new docx.Paragraph({text:""}));

        const cellWidth=Math.max(120,Math.round((region.columns[c+1]-region.columns[c])*20));
        docxCells.push(new docx.TableCell({
          width:{size:cellWidth,type:"dxa"},
          margins:{top:18,bottom:18,left:26,right:26},
          verticalAlign:"center",
          borders:{
            top:{style:"single",size:4,color:"9A9A9A"},
            bottom:{style:"single",size:4,color:"9A9A9A"},
            left:{style:"single",size:4,color:"9A9A9A"},
            right:{style:"single",size:4,color:"9A9A9A"}
          },
          children:paragraphs
        }));
      }

      const rowHeight=Math.max(100,Math.round((region.rows[r+1]-region.rows[r])*20));
      rows.push(new docx.TableRow({
        height:{value:rowHeight,rule:"atLeast"},
        cantSplit:true,
        children:docxCells
      }));
    }

    const columnWidths=region.columns.slice(0,-1).map((x,index)=>
      Math.max(120,Math.round((region.columns[index+1]-x)*20))
    );
    const tableWidth=columnWidths.reduce((sum,value)=>sum+value,0);
    const table=new docx.Table({
      rows,
      width:{size:tableWidth,type:"dxa"},
      columnWidths,
      layout:"fixed",
      alignment:"left",
      margins:{top:18,bottom:18,left:26,right:26},
      borders:{
        top:{style:"single",size:4,color:"8C8C8C"},
        bottom:{style:"single",size:4,color:"8C8C8C"},
        left:{style:"single",size:4,color:"8C8C8C"},
        right:{style:"single",size:4,color:"8C8C8C"},
        insideHorizontal:{style:"single",size:4,color:"A6A6A6"},
        insideVertical:{style:"single",size:4,color:"A6A6A6"}
      },
      float:{
        horizontalAnchor:"page",
        verticalAnchor:"page",
        absoluteHorizontalPosition:Math.round(region.x0*20),
        absoluteVerticalPosition:Math.round(region.y0*20),
        overlap:"overlap",
        topFromText:0,
        leftFromText:0
      }
    });
    tables.push({region,table});
  }

  return {tables,excludedItems};
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

  const originalPixels = context.getImageData(0,0,canvas.width,canvas.height);
  const resolvedFonts = getResolvedPdfFonts(page,content);
  let tableRegions=[];
  try {
    const operatorList=await page.getOperatorList();
    tableRegions=detectPdfTableRegions(operatorList,pageHeight);
  } catch (error) {
    console.warn("Workspace could not detect ruled tables on this PDF page:",error);
  }

  const tableBlocks=buildPdfTableBlocks(
    tableRegions,content,resolvedFonts,pageHeight,renderScale,originalPixels
  );
  const built = buildEditableTextItems(
    content,resolvedFonts,pageHeight,renderScale,originalPixels,context,tableBlocks.excludedItems
  );

  // The page artwork keeps genuine non-text graphics (such as a logo), but
  // removes every detected table grid. Each grid is rebuilt below as a real
  // Word table, not a flattened picture.
  for(const region of tableRegions) {
    const left=Math.max(0,Math.floor(region.x0*renderScale-1));
    const top=Math.max(0,Math.floor(region.y0*renderScale-1));
    const right=Math.min(canvas.width,Math.ceil(region.x1*renderScale+1));
    const bottom=Math.min(canvas.height,Math.ceil(region.y1*renderScale+1));
    if(right>left && bottom>top) {
      context.fillStyle="#FFFFFF";
      context.fillRect(left,top,right-left,bottom-top);
    }
  }

  const png = await new Promise((resolve,reject)=>{
    canvas.toBlob(blob=>blob?resolve(blob):reject(new Error("Could not prepare the non-text page artwork.")),"image/png");
  });
  const bytes = new Uint8Array(await png.arrayBuffer());
  const imageWidthPx = (page.getViewport({scale:1}).width*4)/3;
  const imageHeightPx = (page.getViewport({scale:1}).height*4)/3;

  canvas.width=1;
  canvas.height=1;
  return {bytes,built,tables:tableBlocks.tables,imageWidthPx,imageHeightPx};
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
      const editableTables = background.tables || [];

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
              horizontal:"page",
              vertical:"page"
            },
            wrap:"none",
            rule:"exact",
            space:{horizontal:0,vertical:0}
          },
          spacing:{
            before:0,
            after:0,
            line:Math.max(40,Math.round(item.font.size*20*1.3)),
            lineRule:"exact"
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
            relative:"page",
            offset:0
          },
          verticalPosition:{
            relative:"page",
            offset:0
          },
          behindDocument:true,
          allowOverlap:true,
          wrap:{
            type:0,
            side:"bothSides"
          },
          zIndex:0
        },
        altText:{
          title:"Original PDF page "+pageNo+" artwork",
          description:"Non-text PDF artwork only; text is editable and table grids are rebuilt as native Word tables.",
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
        children:[pageAnchor,...textParagraphs,...editableTables.map(entry=>entry.table)]
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
    description:"Editable conversion. Text is recreated as Word text and detected ruled grids are rebuilt as native Word tables; only non-text page artwork remains as an image layer.",
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
let officeEngine = null;
let officeEnginePromise = null;
let officeWorkerBlobUrl = null;

const OFFICE_WASM_BASE = "https://matbeedotcom.github.io/libreoffice-document-converter/wasm/";
const OFFICE_WORKER_BUNDLE = "https://cdn.jsdelivr.net/npm/@matbee/libreoffice-converter@2.7.2/dist/browser.worker.global.js";

async function getLibreOfficeEngine() {
  if (officeEngine) return officeEngine;
  if (officeEnginePromise) return officeEnginePromise;

  if (!window.crossOriginIsolated || !window.SharedArrayBuffer) {
    throw new Error(
      "Your browser tab is not cross-origin isolated, which LibreOffice needs to run safely in a worker. " +
      "Refresh the website after the latest Cloudflare deployment. If this continues, the site's COOP/COEP headers are not active."
    );
  }

  officeEnginePromise = (async () => {
    let candidate = null;
    try {
      setProgress(8, "Loading the private LibreOffice conversion engine…");

      const [library, workerResponse] = await Promise.all([
        import("https://esm.sh/@matbee/libreoffice-converter@2.7.2/browser?bundle"),
        fetch(OFFICE_WORKER_BUNDLE, { mode: "cors", cache: "force-cache" })
      ]);

      if (!workerResponse.ok) {
        throw new Error("Could not download the LibreOffice worker (" + workerResponse.status + ").");
      }

      const workerCode = await workerResponse.text();
      if (!workerCode || workerCode.length < 10000) {
        throw new Error("The LibreOffice worker download was incomplete.");
      }

      // A Blob worker inherits this site's origin. This keeps the worker
      // same-origin while avoiding a large generated worker bundle in Git.
      officeWorkerBlobUrl = URL.createObjectURL(
        new Blob([workerCode], { type: "text/javascript" })
      );

      if (typeof library.WorkerBrowserConverter !== "function") {
        throw new Error("The LibreOffice browser converter could not be loaded.");
      }

      candidate = new library.WorkerBrowserConverter({
        sofficeJs: "/wasm/soffice.js",
        sofficeWasm: OFFICE_WASM_BASE + "soffice.wasm",
        sofficeData: OFFICE_WASM_BASE + "soffice.data",
        sofficeWorkerJs: "/wasm/soffice.worker.js",
        browserWorkerJs: officeWorkerBlobUrl,
        verbose: false,
        onProgress: info => {
          const percent = Math.max(0, Math.min(100, Number(info?.percent) || 0));
          if (officeEngine) {
            setProgress(94 + percent * 0.05, info?.message || "Converting with LibreOffice…");
          } else {
            setProgress(5 + percent * 0.82, info?.message || "Downloading and preparing LibreOffice…");
          }
        },
        onError: error => console.error("Workspace LibreOffice worker:", error)
      });

      await candidate.initialize();
      officeEngine = candidate;
      setProgress(94, "LibreOffice is ready. Converting your Word document…");
      return officeEngine;
    } catch (error) {
      try { await candidate?.destroy(); } catch (_) {}
      if (officeWorkerBlobUrl) {
        URL.revokeObjectURL(officeWorkerBlobUrl);
        officeWorkerBlobUrl = null;
      }
      throw error;
    }
  })().catch(error => {
    officeEnginePromise = null;
    throw new Error(
      "The local Word conversion engine could not start. " +
      (error?.message || "Please refresh the page and try again.")
    );
  });

  return officeEnginePromise;
}

async function wordToPDF(file) {
  if (file.size > 25 * 1024 * 1024) {
    throw new Error("Word-to-PDF currently supports DOCX files up to 25 MB.");
  }

  const extension = (file.name.split(".").pop() || "").toLowerCase();
  if (extension !== "docx") {
    throw new Error("Please choose a .docx Word document. Older .doc files are not supported in this version.");
  }

  setProgress(4, "Preparing your Word document…");
  const bytes = new Uint8Array(await file.arrayBuffer());
  if (bytes.length < 4 || bytes[0] !== 0x50 || bytes[1] !== 0x4b) {
    throw new Error("This file is not a valid DOCX document. Please open it in Word and save it again as .docx.");
  }

  const converter = await getLibreOfficeEngine();
  setProgress(95, "Converting with LibreOffice…");

  const result = await converter.convert(
    bytes,
    { outputFormat: "pdf" },
    file.name
  );

  if (!result?.data || result.data.length < 1000) {
    throw new Error("LibreOffice returned an empty PDF. Please try opening and saving the Word file again.");
  }

  const pdfBytes = new Uint8Array(result.data);
  const validPdf =
    pdfBytes.length >= 5 &&
    pdfBytes[0] === 0x25 &&
    pdfBytes[1] === 0x50 &&
    pdfBytes[2] === 0x44 &&
    pdfBytes[3] === 0x46 &&
    pdfBytes[4] === 0x2d;

  if (!validPdf) {
    throw new Error("The conversion engine returned an invalid PDF file. Your original Word document has not been changed.");
  }

  setProgress(99, "Your PDF is ready to download.");
  return new Blob([pdfBytes], { type: "application/pdf" });
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

document.addEventListener("keydown", event => {
  if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
    event.preventDefault();
    search.focus();
  }
});
