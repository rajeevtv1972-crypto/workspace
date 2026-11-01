# Workspace PDF

A browser-based PDF toolbox. After a valid file is selected, processing starts automatically and progress is shown. When processing completes, the user gets a Download button; the file downloads only after that button is clicked, and the same button remains available as Download again. Selected files are processed locally in the visitor's browser; the conversion code does not upload documents to a Workspace conversion server.

## Tools

- PDF to Word: for digital PDFs with a selectable text layer, extracts text spans, fonts and coordinates without OCR; converts horizontal placements to real Word tab elements (not visible `\\t` text); groups text into editable Word paragraphs; detects ruled vector grids; and rebuilds Parts, Labour and Totals grids as native Word tables with editable cells. Genuine embedded images such as logos remain separate image objects. The flow layout uses slightly compacted vertical gaps to prevent the original tables from spilling onto extra pages, and ignores static PDF page labels so they cannot force blank pages. It does not put full-page screenshots behind the Word document.
- Word to PDF: converts DOCX to PDF with LibreOffice compiled to WebAssembly, running in a browser worker. This uses an office document layout engine rather than HTML reconstruction, so page geometry, fonts, floating objects, images, tables, headers/footers and section breaks are handled much more faithfully. The first use downloads the roughly 240 MB engine from a CORS-enabled static runtime host; the browser caches it for later conversions. The DOCX file itself is processed locally and is not uploaded. Older binary .doc files are not supported.
- Merge PDF: combines multiple PDFs.
- Split PDF: extracts selected pages into a new PDF.
- Compress PDF: re-renders pages as optimized JPEG images. This can reduce size for image-heavy PDFs, but text in the compressed output is no longer selectable. If the result would be larger, the tool leaves the original untouched and reports that.
- PDF to JPG: renders pages and packages the JPGs into a ZIP.
- JPG to PDF: combines JPG and PNG files into one PDF.
- Rotate PDF: rotates all pages by 90, 180, or 270 degrees.
- OCR PDF: recognizes English text on scanned pages and adds an invisible searchable text layer over page images.

## PDF-to-Word layout model and limitations

The converter does not place a full-page screenshot behind the Word document. Text is rebuilt as normal Word paragraphs so it can be selected, edited, copied and reflowed naturally. Detected ruled grids become native Word tables with editable cells. Original embedded images (such as a logo) remain separate picture objects.

Text and table cells are real Word content. Users can select and edit paragraphs, change table values, insert or remove rows and columns, and apply Word table formatting. Table reconstruction currently depends on visible vector rules; borderless tables may need manual reconstruction. This non-OCR mode stops with an error for scanned/image-only PDFs instead of creating an empty or misleading document. Decorative vector artwork that is not a text/table object may not be reproduced. Exact font reproduction depends on the original fonts being available in the PDF and in the Word viewer. Scanned text that is only part of an image is not editable unless OCR is performed first.

## Browser libraries and Word-to-PDF runtime

The static page loads PDF.js, docx.js, pdf-lib, JSZip and Tesseract.js from versioned public CDNs. Word-to-PDF pins `@matbee/libreoffice-converter` v2.7.2 and its worker bundle from jsDelivr/esm.sh. The small Emscripten loader and pthread worker are hosted same-origin in `/wasm/`; the larger WebAssembly and filesystem binaries are fetched from the matching v2.7.2 GitHub Pages runtime at `https://matbeedotcom.github.io/libreoffice-document-converter/wasm/`.

The document being converted remains in the browser. The LibreOffice engine is cached by the browser after its first download.

## Deployment

Deploy the repository root as a static site (no build command; output directory `.`) on Cloudflare Pages.

No backend is required for these browser tools. The old Render service configuration and backend folder are retained in the repository for reference but are not used by the frontend.

## Word-to-PDF isolation headers

Cloudflare Pages must serve the site with `Cross-Origin-Opener-Policy: same-origin` and `Cross-Origin-Embedder-Policy: require-corp` so the browser can use `SharedArrayBuffer` for the LibreOffice WebAssembly worker. These headers are configured in the repository's `_headers` file. External script and font references use CORS mode.

## Other limitations

- Word-to-PDF layout fidelity depends on the fonts available in the LibreOffice WebAssembly build. Fonts not included in that runtime may be substituted, which can alter line wrapping.
- OCR is English-only in this first version and may misread low-quality scans.
- Compression rasterizes text and may not reduce PDFs that are already compact.
- Large PDFs can use significant browser memory. The tool UI applies per-tool page and file-size limits.
