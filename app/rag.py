"""
rag.py — Lógica de Retrieval-Augmented Generation.

Fluxo:
  1. Chama a Edge Function rag-query (Supabase) para busca vetorial
  2. Monta o prompt com os chunks recuperados
  3. Envia para deepseek-coder via Ollama local
  4. Retorna resposta + fontes
"""

import os
import requests
from dotenv import load_dotenv
from app.ollama_client import generate_response

load_dotenv()

SUPABASE_URL      = os.getenv("SUPABASE_URL")
SUPABASE_ANON_KEY = os.getenv("SUPABASE_ANON_KEY")


def fetch_documents(question: str, top_k: int = 5) -> list[dict]:
    """Busca documentos similares via Edge Function rag-query."""
    response = requests.post(
        f"{SUPABASE_URL}/functions/v1/rag-query",
        headers={
            "Authorization": f"Bearer {SUPABASE_ANON_KEY}",
            "Content-Type": "application/json",
        },
        json={"question": question, "top_k": top_k},
        timeout=30,
    )
    response.raise_for_status()
    return response.json().get("documents", [])


def build_context(documents: list[dict]) -> str:
    """Monta o contexto a partir dos documentos recuperados."""
    parts = []
    for i, doc in enumerate(documents, 1):
        source = doc.get("metadata", {}).get("filename", "desconhecido")
        parts.append(f"[Trecho {i} — {source}]\n{doc['content']}")
    return "\n\n".join(parts)


def ask(question: str, top_k: int = 5) -> dict:
    """
    Pipeline RAG completo:
    1. Busca vetorial via Supabase Edge Function
    2. Monta prompt com contexto
    3. Gera resposta com deepseek-coder (Ollama local)
    4. Retorna resposta + fontes
    """
    docs = fetch_documents(question, top_k=top_k)

    if not docs:
        return {
            "answer": "Nenhum documento relevante encontrado na base de conhecimento.",
            "sources": [],
        }

    context = build_context(docs)
    prompt = (
        "Você é um assistente técnico especializado em desenvolvimento de software. "
        "Use APENAS o contexto abaixo para responder.\n"
        "Se a resposta não estiver no contexto, diga que não sabe.\n\n"
        f"### Contexto:\n{context}\n\n"
        f"### Pergunta:\n{question}\n\n"
        "### Resposta:"
    )

    answer = generate_response(prompt)

    return {
        "answer": answer.strip(),
        "sources": [
            {
                "content": d["content"][:200],
                "similarity": d.get("similarity"),
                "filename": d.get("metadata", {}).get("filename"),
            }
            for d in docs
        ],
    }
