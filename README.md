# Workspace PDF

A browser-based PDF toolbox. After a valid file is selected, processing starts automatically and progress is shown. When processing completes, the user gets a Download button; the file downloads only after that button is clicked, and the same button remains available as Download again. Selected files are processed locally in the visitor's browser; the conversion code does not upload documents to a Workspace conversion server.

## Tools

- PDF to Word: recreates selectable PDF text as editable Word text frames and detects ruled table grids from PDF vector paths. Detected grids are rebuilt as native Word tables with editable rows/cells and text, and the PDF's vector rules are replaced by editable Word table borders. Non-text artwork such as logos may remain as images. Font names/weights and run sizes are recovered where PDF.js exposes them; glyph colours are sampled from the rendered page.
- Word to PDF: converts DOCX to PDF with LibreOffice compiled to WebAssembly, running in a browser worker. This uses an office document layout engine rather than HTML reconstruction, so page geometry, fonts, floating objects, images, tables, headers/footers and section breaks are handled much more faithfully. The first use downloads the roughly 240 MB engine from a CORS-enabled static runtime host; the browser caches it for later conversions. The DOCX file itself is processed locally and is not uploaded. Older binary .doc files are not supported.
- Merge PDF: combines multiple PDFs.
- Split PDF: extracts selected pages into a new PDF.
- Compress PDF: re-renders pages as optimized JPEG images. This can reduce size for image-heavy PDFs, but text in the compressed output is no longer selectable. If the result would be larger, the tool leaves the original untouched and reports that.
- PDF to JPG: renders pages and packages the JPGs into a ZIP.
- JPG to PDF: combines JPG and PNG files into one PDF.
- Rotate PDF: rotates all pages by 90, 180, or 270 degrees.
- OCR PDF: recognizes English text on scanned pages and adds an invisible searchable text layer over page images.

## PDF-to-Word layout model and limitations

The original PDF is used as a page artwork layer. Text boxes are cleared from that layer and recreated as positioned, editable Word text frames. This retains non-text items such as logos, signatures/lines, table borders and other drawings.

The extracted text is Word text, not part of a page screenshot. Detected ruled grids are native Word tables, so users can select cells, edit values, add/remove rows and columns, and change table formatting in Word. Table detection relies on visible vector rules; borderless tables and scanned/image-only tables may not be detected automatically and should be checked after conversion. Original embedded images (for example a logo) remain separate, movable image objects. Other decorative vector artwork may not be reproduced in this fully editable mode. Exact font reproduction depends on the original fonts being available in the PDF and in the Word viewer. Scanned text that is only part of an image is not editable unless OCR is performed first.

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
