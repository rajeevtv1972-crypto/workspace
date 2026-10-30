# Workspace PDF

A browser-based PDF toolbox. Document files are processed locally in the visitor's browser; the conversion code does not upload documents to a Workspace server.

## Tools currently implemented

- PDF to Word: extracts selectable PDF text into an editable DOCX.
- Word to PDF: converts DOCX content to PDF in the browser.
- Merge PDF: combines multiple PDFs.
- Split PDF: extracts selected pages into a new PDF.
- Compress PDF: re-renders pages as optimized JPEG images. This can reduce size for image-heavy PDFs, but text in the compressed output is no longer selectable. If the result would be larger, the tool leaves the original untouched and reports that.
- PDF to JPG: renders pages and packages the JPGs into a ZIP.
- JPG to PDF: combines JPG and PNG files into one PDF.
- Rotate PDF: rotates all pages by 90, 180, or 270 degrees.
- OCR PDF: recognizes English text on scanned pages and adds an invisible searchable text layer over page images.

## Browser libraries

The static page loads PDF.js, docx.js, pdf-lib, JSZip, Mammoth, html2pdf.js, and Tesseract.js from versioned public CDNs. These libraries are downloaded by the browser; the selected document itself is processed on-device.

## Deployment

Deploy the repository root as a static site (no build command; output directory `.`) on Cloudflare Pages.

No backend is needed for the tools above. The old Render service configuration and backend folder are retained in the repository for reference but are not used by the frontend.

## Important limitations

- PDF-to-Word currently extracts text; it does not fully recreate complex layouts, tables, embedded images, or exact typography.
- Word-to-PDF fidelity depends on what Mammoth can interpret from DOCX and browser HTML rendering.
- OCR is English-only in this first version and may misread low-quality scans.
- Compression rasterizes text and may not reduce PDFs that are already compact.
- Large PDFs can use significant browser memory. The tool UI applies per-tool page and file-size limits.
