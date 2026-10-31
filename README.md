# Workspace PDF

A browser-based PDF toolbox. Document files are processed locally in the visitor's browser; the selected document is not uploaded to a Workspace conversion server.

## Tools

- PDF to Word: creates an editable DOCX with recovered font sizes, original font names where PDF.js exposes them, bold/italic style inference, line breaks, approximate line positioning, and Word highlight/underline/strike formatting for detected PDF markup annotations.
- Word to PDF: converts DOCX content to PDF in the browser.
- Merge PDF: combines multiple PDFs.
- Split PDF: extracts selected pages into a new PDF.
- Compress PDF: re-renders pages as optimized JPEG images. This can reduce size for image-heavy PDFs, but text in the compressed output is no longer selectable. If the result would be larger, the tool leaves the original untouched and reports that.
- PDF to JPG: renders pages and packages the JPGs into a ZIP.
- JPG to PDF: combines JPG and PNG files into one PDF.
- Rotate PDF: rotates all pages by 90, 180, or 270 degrees.
- OCR PDF: recognizes English text on scanned pages and adds an invisible searchable text layer over page images.

## Browser libraries

The static page loads PDF.js, docx.js, pdf-lib, JSZip, Mammoth, html2pdf.js, and Tesseract.js from public CDNs. These libraries are downloaded by the browser; the selected document itself is processed on-device.

## Deployment

Deploy the repository root as a static site (no build command; output directory `.`) on Cloudflare Pages.

No backend is required for these browser tools. The old Render service configuration and backend folder are retained in the repository for reference but are not used by the frontend.

## PDF-to-Word fidelity notes

The single PDF-to-Word action now always creates editable text; there is no image-only mode selector. The converter retains extracted characters (including brackets and punctuation), text run sizes, original font names where available, line grouping, and detected PDF highlight/underline/strike annotations.

PDFs are a fixed-position drawing format, whereas Word reflows text. Some PDF fonts are subsetted or embedded and cannot be recreated as editable fonts in DOCX without font files and licensing. Exact colors, custom typography, tables, positioned images, columns, and pixel-identical page layout may therefore still differ. This is a best-effort editable conversion rather than a guaranteed exact replica. Scanned/image-only PDFs need OCR before text can be reconstructed.

## Other limitations

- Word-to-PDF fidelity depends on what Mammoth can interpret from DOCX and browser HTML rendering.
- OCR is English-only in this first version and may misread low-quality scans.
- Compression rasterizes text and may not reduce PDFs that are already compact.
- Large PDFs can use significant browser memory. The tool UI applies per-tool page and file-size limits.
