"""
db.py — Cliente Supabase para operações com documentos e embeddings.
Usado pelo FastAPI local para consultar o pgvector.
"""

import os
from supabase import create_client, Client
from dotenv import load_dotenv

load_dotenv()

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY")

if not SUPABASE_URL or not SUPABASE_KEY:
    raise ValueError("SUPABASE_URL e SUPABASE_KEY devem estar definidos no .env")

supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)


def insert_document(content: str, metadata: dict, embedding: list[float]) -> dict:
    """Insere um documento com seu embedding no Supabase."""
    result = supabase.table("documents").insert({
        "content": content,
        "metadata": metadata,
        "embedding": embedding,
    }).execute()
    return result.data


def match_documents(query_embedding: list[float], top_k: int = 5) -> list[dict]:
    """Busca os documentos mais similares usando pgvector."""
    result = supabase.rpc("match_documents", {
        "query_embedding": query_embedding,
        "match_count": top_k,
    }).execute()
    return result.data
