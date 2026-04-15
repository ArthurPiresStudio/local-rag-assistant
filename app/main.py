"""
main.py — API FastAPI local.
Endpoints de consulta RAG e indexação manual (opcional).

Para rodar:
  uvicorn app.main:app --reload
"""

from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from app.rag import ask

app = FastAPI(
    title="RAG Local — Supabase + Ollama",
    description="Retrieval-Augmented Generation local com pgvector e deepseek-coder",
    version="2.0.0",
)


# ── Modelos ──────────────────────────────────────────────────────────

class QueryRequest(BaseModel):
    question: str
    top_k: int = 5


# ── Endpoints ────────────────────────────────────────────────────────

@app.post("/query", summary="Consulta RAG")
def query(req: QueryRequest):
    """
    Busca contexto no Supabase via Edge Function e gera
    resposta com deepseek-coder (Ollama local).
    """
    try:
        result = ask(req.question, top_k=req.top_k)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/health")
def health():
    return {"status": "ok"}
