"""
ollama_client.py — Integração com Ollama para embeddings e geração de texto.
Tudo roda localmente, sem APIs externas.

Modelos usados:
  - nomic-embed-text → embeddings locais (usado apenas se indexar via Python)
  - deepseek-coder   → geração de resposta
"""

import requests

OLLAMA_BASE_URL = "http://localhost:11434"


def generate_embedding(text: str) -> list[float]:
    """
    Gera embedding usando nomic-embed-text via Ollama.
    ⚠️  Usado apenas para indexação via Python (script local).
    A indexação via GitHub Actions usa o gte-small do Supabase AI (384 dims).
    Certifique-se de usar o mesmo modelo em toda a pipeline.
    """
    response = requests.post(
        f"{OLLAMA_BASE_URL}/api/embeddings",
        json={"model": "nomic-embed-text", "prompt": text},
        timeout=120,
    )
    response.raise_for_status()
    return response.json()["embedding"]


def generate_response(prompt: str) -> str:
    """
    Gera uma resposta usando deepseek-coder via Ollama (modo não-streaming).
    """
    response = requests.post(
        f"{OLLAMA_BASE_URL}/api/generate",
        json={
            "model": "deepseek-coder",
            "prompt": prompt,
            "stream": False,
        },
        timeout=300,
    )
    response.raise_for_status()
    return response.json()["response"]
