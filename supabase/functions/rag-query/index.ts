"""
rag.py — Consulta RAG via Supabase Edge Function.

A Edge Function rag-query já faz tudo:
  1. Embedding da pergunta (nomic-embed-text via Ollama/ngrok)
  2. Busca vetorial no pgvector
  3. Geração de resposta (deepseek-coder via Ollama/ngrok)

O FastAPI local só repassa a pergunta e devolve o resultado.
"""

import os
import requests
from dotenv import load_dotenv

load_dotenv()

SUPABASE_URL      = os.getenv("SUPABASE_URL")
SUPABASE_ANON_KEY = os.getenv("SUPABASE_ANON_KEY")


def ask(question: str, top_k: int = 5) -> dict:
    """Envia a pergunta para a Edge Function rag-query e retorna o resultado."""
    response = requests.post(
        f"{SUPABASE_URL}/functions/v1/rag-query",
        headers={
            "Authorization": f"Bearer {SUPABASE_ANON_KEY}",
            "Content-Type": "application/json",
        },
        json={"query": question, "match_count": top_k},
        timeout=120,  # deepseek-coder pode ser lento dependendo do hardware
    )
    response.raise_for_status()
    return response.json()
