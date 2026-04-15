"""
indexer.py — Indexação local via Python (opcional).

Use este script para indexar documentos diretamente via Ollama local,
sem passar pelo GitHub Actions / Edge Function.

⚠️  Atenção ao modelo de embedding:
  - Este script usa nomic-embed-text (768 dims) via Ollama
  - A indexação via GitHub Actions usa gte-small (384 dims) via Supabase AI
  Misturar os dois modelos na mesma tabela vai quebrar a busca vetorial.
  Escolha um modelo e use-o em toda a pipeline.
"""

from app.ollama_client import generate_embedding
from app.db import insert_document


def chunk_text(text: str, chunk_size: int = 500, overlap: int = 50) -> list[str]:
    """Divide o texto em chunks com sobreposição."""
    chunks = []
    start = 0
    while start < len(text):
        end = start + chunk_size
        chunks.append(text[start:end])
        start += chunk_size - overlap
    return chunks


def index_document(text: str, metadata: dict | None = None) -> int:
    """
    Pipeline de indexação local:
    1. Divide o texto em chunks
    2. Gera embedding via Ollama (nomic-embed-text)
    3. Salva no Supabase
    Retorna o número de chunks indexados.
    """
    metadata = metadata or {}
    chunks = chunk_text(text)

    for i, chunk in enumerate(chunks):
        embedding = generate_embedding(chunk)
        insert_document(
            content=chunk,
            metadata={**metadata, "chunk_index": i},
            embedding=embedding,
        )

    return len(chunks)


def index_file(path: str) -> int:
    """Indexa um arquivo .md ou .txt local."""
    with open(path, "r", encoding="utf-8") as f:
        text = f.read()
    metadata = {"source": "local", "filename": path.split("/")[-1], "path": path}
    return index_document(text, metadata)
