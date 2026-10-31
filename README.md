# Workspace PDF

A browser-based PDF toolbox. Selected files are processed locally in the visitor's browser; the conversion code does not upload documents to a Workspace conversion server.

## Tools

- PDF to Word: rebuilds the PDF page artwork as a high-resolution background layer, then places extracted text back as separately editable, absolutely positioned Word text frames. This preserves logos, images, vector rules, tables, page graphics and page geometry while keeping extracted text editable. Font names/weights and run sizes are recovered where PDF.js exposes them; glyph colors are sampled from the rendered page.
- Word to PDF: converts DOCX content to PDF in the browser, preserving semantic headings, lists, basic tables, bold/italic text, links, line breaks and embedded images where Mammoth supports them.
- Merge PDF: combines multiple PDFs.
- Split PDF: extracts selected pages into a new PDF.
- Compress PDF: re-renders pages as optimized JPEG images. This can reduce size for image-heavy PDFs, but text in the compressed output is no longer selectable. If the result would be larger, the tool leaves the original untouched and reports that.
- PDF to JPG: renders pages and packages the JPGs into a ZIP.
- JPG to PDF: combines JPG and PNG files into one PDF.
- Rotate PDF: rotates all pages by 90, 180, or 270 degrees.
- OCR PDF: recognizes English text on scanned pages and adds an invisible searchable text layer over page images.

## PDF-to-Word layout model and limitations

The original PDF is used as a page artwork layer. Text boxes are cleared from that layer and recreated as positioned, editable Word text frames. This retains non-text items such as logos, signatures/lines, table borders and other drawings that text extraction alone cannot reproduce.

The text remains editable, but this is not a fully semantic reconstruction: table borders and vector artwork are preserved as page graphics, not native Word table cells or drawing objects. Editing text is supported; changing the structure of a table requires rebuilding that table in Word. If text is moved or substantially lengthened, the preserved page artwork will not automatically reflow. Exact font reproduction depends on the font being available in the PDF and on the viewer's installed fonts. Scanned text that is only part of an image is not editable unless OCR is performed first.

## Browser libraries

The static page loads PDF.js, docx.js, pdf-lib, JSZip, html2pdf.js and Tesseract.js from versioned public CDNs. Word-to-PDF loads docx-preview on demand as an ESM module. These libraries are downloaded by the browser; the selected document itself is processed on-device.

## Deployment

Deploy the repository root as a static site (no build command; output directory `.`) on Cloudflare Pages.

No backend is required for these browser tools. The old Render service configuration and backend folder are retained in the repository for reference but are not used by the frontend.

## Other limitations

- Word-to-PDF fidelity depends on the DOCX renderer's supported WordprocessingML/DrawingML features and browser canvas rendering. The exported PDF is page-image based, so its text is not selectable/searchable.
- OCR is English-only in this first version and may misread low-quality scans.
- Compression rasterizes text and may not reduce PDFs that are already compact.
- Large PDFs can use significant browser memory. The tool UI applies per-tool page and file-size limits.
