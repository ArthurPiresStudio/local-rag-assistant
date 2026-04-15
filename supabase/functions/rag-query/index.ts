/**
 * rag-query/index.ts
 * Edge Function do Supabase para busca vetorial.
 *
 * Recebe: { question: string, top_k?: number }
 * Gera embedding da pergunta e retorna os chunks mais similares.
 * A geração da resposta final fica no FastAPI local (Ollama).
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

Deno.serve(async (req: Request) => {
  try {
    if (req.method !== "POST") {
      return new Response("Method not allowed", { status: 405 });
    }

    const { question, top_k = 5 } = await req.json();

    if (!question || typeof question !== "string") {
      return new Response(
        JSON.stringify({ error: "Campo 'question' obrigatório e deve ser string." }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Gera embedding da pergunta
    const { data: embedData, error: embedError } = await supabase.functions.invoke(
      "supabase-ai-embedding",
      { body: { input: question } }
    );

    if (embedError) throw new Error(`Embedding error: ${embedError.message}`);

    // Busca vetorial via match_documents (pgvector)
    const { data: docs, error: matchError } = await supabase.rpc("match_documents", {
      query_embedding: embedData.embedding,
      match_count: top_k,
    });

    if (matchError) throw new Error(`Match error: ${matchError.message}`);

    return new Response(
      JSON.stringify({
        documents: docs ?? [],
        question,
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
