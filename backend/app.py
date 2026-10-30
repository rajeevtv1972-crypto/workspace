import os
import tempfile
from pathlib import Path
from fastapi import FastAPI, File, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import Response
from pdf2docx import Converter

app = FastAPI(
    title="Workspace PDF API",
    version="1.0.0",
    description="Document conversion API for Workspace PDF."
)

# Set CORS_ORIGINS in the hosting dashboard to your website's origin
# after deployment. During initial setup, '*' allows the frontend preview.
allowed_origins = [
    origin.strip()
    for origin in os.getenv("CORS_ORIGINS", "*").split(",")
    if origin.strip()
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=False,
    allow_methods=["GET", "POST"],
    allow_headers=["Content-Type"],
)

MAX_FILE_BYTES = 15 * 1024 * 1024
MAX_PAGES = 50


@app.get("/")
async def root():
    return {
        "service": "Workspace PDF API",
        "status": "online",
        "endpoints": ["/health", "/api/convert/pdf-to-word"]
    }


@app.get("/health")
async def health():
    return {"status": "healthy"}


@app.post("/api/convert/pdf-to-word")
async def pdf_to_word(file: UploadFile = File(...)):
    filename = file.filename or "document.pdf"

    if not filename.lower().endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Please upload a PDF file.")

    content_type = (file.content_type or "").lower()
    if content_type not in ("application/pdf", "application/octet-stream", ""):
        raise HTTPException(status_code=400, detail="The uploaded file must be a PDF.")

    data = await file.read(MAX_FILE_BYTES + 1)
    if not data:
        raise HTTPException(status_code=400, detail="The uploaded PDF is empty.")
    if len(data) > MAX_FILE_BYTES:
        raise HTTPException(
            status_code=413,
            detail="File is too large. The current limit is 15 MB."
        )
    if not data.startswith(b"%PDF-"):
        raise HTTPException(status_code=400, detail="This file does not appear to be a valid PDF.")

    safe_stem = Path(filename).stem
    safe_stem = "".join(
        char for char in safe_stem
        if char.isalnum() or char in ("-", "_", " ")
    ).strip()[:80] or "converted-document"

    # Temporary per-request directory; it is removed after the response is sent.
    with tempfile.TemporaryDirectory(prefix="workspace-pdf-") as temp_dir:
        input_path = os.path.join(temp_dir, "source.pdf")
        output_path = os.path.join(temp_dir, "converted.docx")

        with open(input_path, "wb") as pdf_file:
            pdf_file.write(data)

        converter = None
        try:
            converter = Converter(input_path)
            info = converter._fitz_doc
            page_count = info.page_count

            if page_count < 1:
                raise HTTPException(status_code=400, detail="The PDF has no pages.")
            if page_count > MAX_PAGES:
                raise HTTPException(
                    status_code=413,
                    detail=f"Please use a PDF with {MAX_PAGES} pages or fewer."
                )

            converter.convert(output_path, start=0, end=None)
        except HTTPException:
            raise
        except Exception:
            raise HTTPException(
                status_code=422,
                detail="We couldn't convert this PDF. It may be damaged, encrypted, or contain unsupported content."
            )
        finally:
            if converter is not None:
                converter.close()

        if not os.path.exists(output_path) or os.path.getsize(output_path) == 0:
            raise HTTPException(status_code=422, detail="Conversion did not produce a Word document.")

        # Read the result before the temporary directory is cleaned up.
        with open(output_path, "rb") as docx_file:
            docx_data = docx_file.read()

        return Response(
            content=docx_data,
            media_type="application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            headers={
                "Content-Disposition": f'attachment; filename="{safe_stem}.docx"',
                "Cache-Control": "no-store"
            }
        )
