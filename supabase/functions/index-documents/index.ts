/**
 * index-documents/index.ts
 * Edge Function do Supabase para indexar documentos com embedding.
 *
 * Recebe: { content: string, metadata: object }
 * Gera embedding via modelo gte-small (nativo do Supabase AI)
 * Salva no pgvector (tabela documents)
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const CHUNK_SIZE = 500;
const OVERLAP    = 50;

// ── Chunking ────────────────────────────────────────────────────────

function chunkText(text: string): string[] {
  const chunks: string[] = [];
  let start = 0;
  while (start < text.length) {
    const end = start + CHUNK_SIZE;
    chunks.push(text.slice(start, end));
    start += CHUNK_SIZE - OVERLAP;
  }
  return chunks;
}

// ── Handler ─────────────────────────────────────────────────────────

Deno.serve(async (req: Request) => {
  try {
    // Só aceita POST
    if (req.method !== "POST") {
      return new Response("Method not allowed", { status: 405 });
    }

    const { content, metadata } = await req.json();

    if (!content || typeof content !== "string") {
      return new Response(
        JSON.stringify({ error: "Campo 'content' obrigatório e deve ser string." }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    // Cliente Supabase com service_role (necessário para inserção)
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const chunks = chunkText(content);
    const indexed: number[] = [];

    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i];

      // Gera embedding via Supabase AI (gte-small, 384 dimensões)
      const { data: embedData, error: embedError } = await supabase.functions.invoke(
        "supabase-ai-embedding",
        { body: { input: chunk } }
      );

      if (embedError) throw new Error(`Embedding error: ${embedError.message}`);

      const embedding = embedData.embedding;

      // Insere no pgvector
      const { error: insertError } = await supabase
        .from("documents")
        .insert({
          content: chunk,
          metadata: { ...(metadata ?? {}), chunk_index: i },
          embedding,
        });

      if (insertError) throw new Error(`Insert error: ${insertError.message}`);

      indexed.push(i);
    }

    return new Response(
      JSON.stringify({
        status: "ok",
        chunks_indexed: indexed.length,
        filename: metadata?.filename ?? null,
      }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );

  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Erro desconhecido";
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
});
