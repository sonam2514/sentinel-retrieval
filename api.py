"""FastAPI Backend Server for Sentinel Retrieval.

Exposes the sentinel(question, top_k) pipeline as an HTTP REST API
for the Vite + React frontend.

Usage:
    python api.py
    # or
    uvicorn api:app --host 0.0.0.0 --port 8000 --reload
"""

import uvicorn
from fastapi import FastAPI, HTTPException, Request, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

app = FastAPI(
    title="Sentinel Retrieval API",
    description="Medical RAG pipeline with hybrid retrieval, patient document ingestion, & faithfulness guardrail classifier.",
    version="1.1.0",
)

# Enable CORS for Vite frontend running on http://localhost:5173
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class QueryRequest(BaseModel):
    question: str = Field(default="", description="The clinical query")
    top_k: int = Field(default=3, ge=1, le=10, description="Number of evidence chunks to retrieve")


@app.get("/api/health")
def health_check():
    """Health check endpoint to verify backend connectivity."""
    return {"status": "ok", "service": "Sentinel Retrieval API", "version": "1.1.0"}


@app.post("/api/parse-document")
async def parse_document(file: UploadFile = File(...)):
    """Inspects text and biomarker extraction from a PDF report or medical scan image."""
    try:
        from src.document_processor import extract_text_from_file, chunk_document_text

        content = await file.read()
        filename = file.filename or "uploaded_report.pdf"
        text = extract_text_from_file(content, filename)
        chunks = chunk_document_text(text, filename)
        return {
            "filename": filename,
            "extracted_text_length": len(text),
            "preview": text[:500],
            "chunks_count": len(chunks),
            "chunks": chunks,
        }
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Document parsing error: {exc}") from exc


@app.post("/api/sentinel")
async def query_sentinel(request: Request):
    """Executes the Sentinel Clinical RAG pipeline:

    1. Ingestion of patient clinical document / lab image (if attached)
    2. Hybrid retrieval over 18 MedRAG textbooks (ChromaDB dense + BM25 sparse)
    3. Dual-grounded clinical synthesis via local Ollama LLM
    4. Sentinel Faithfulness Classifier guardrail (>= 70% threshold)
    """
    try:
        content_type = request.headers.get("content-type", "")

        question = ""
        top_k = 3
        file_bytes = None
        filename = None

        if "multipart/form-data" in content_type:
            form = await request.form()
            question = str(form.get("question", "")).strip()
            try:
                top_k = int(form.get("top_k", 3))
            except (ValueError, TypeError):
                top_k = 3

            upload_file = form.get("file")
            if upload_file and hasattr(upload_file, "read"):
                file_bytes = await upload_file.read()
                filename = getattr(upload_file, "filename", "attached_report.pdf")
        else:
            # Standard JSON payload
            try:
                body = await request.json()
            except Exception:
                body = {}
            question = str(body.get("question", "")).strip()
            top_k = int(body.get("top_k", 3))

        from src.sentinel import sentinel

        result = sentinel(
            question=question,
            top_k=top_k,
            file_bytes=file_bytes,
            filename=filename,
        )
        return result
    except Exception as exc:
        raise HTTPException(
            status_code=500,
            detail=f"Sentinel pipeline error: {exc}",
        ) from exc


if __name__ == "__main__":
    uvicorn.run("api:app", host="127.0.0.1", port=8000, reload=True)
