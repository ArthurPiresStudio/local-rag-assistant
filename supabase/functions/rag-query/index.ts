import { corsHeaders } from "@supabase/supabase-js/cors";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

/** Gera embedding via Ollama (nomic-embed-text) */
async function getEmbedding(text: string, ollamaUrl: string): Promise<number[]> {
  const res = await fetch(`${ollamaUrl}/api/embeddings`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ model: "nomic-embed-text", prompt: text }),
  });
  if (!res.ok) throw new Error(`Ollama embedding error: ${await res.text()}`);
  const data = await res.json();
  return data.embedding;
}

/** Gera resposta via Ollama (deepseek-coder) */
async function generateResponse(prompt: string, ollamaUrl: string): Promise<string> {
  const res = await fetch(`${ollamaUrl}/api/generate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "deepseek-coder",
      prompt,
      stream: false,
    }),
  });
  if (!res.ok) throw new Error(`Ollama generate error: ${await res.text()}`);
  const data = await res.json();
  return data.response;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const ollamaUrl = Deno.env.get("OLLAMA_URL");
    if (!ollamaUrl) {
      return new Response(JSON.stringify({ error: "OLLAMA_URL not configured" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { query, match_count = 5 } = await req.json();
    if (!query || typeof query !== "string") {
      return new Response(JSON.stringify({ error: "query (string) is required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 1. Gera embedding da query
    console.log("Generating query embedding...");
    const queryEmbedding = await getEmbedding(query, ollamaUrl);

    // 2. Busca documentos similares via match_documents
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { data: documents, error } = await supabase.rpc("match_documents", {
      query_embedding: JSON.stringify(queryEmbedding),
      match_count,
    });

    if (error) throw error;

    // 3. Monta o contexto com os documentos recuperados
    const context = (documents || [])
      .map((doc: { content: string; similarity: number }, i: number) =>
        `[Documento ${i + 1} (similaridade: ${doc.similarity.toFixed(3)})]:\n${doc.content}`
      )
      .join("\n\n");

    // 4. Monta o prompt para o LLM
    const prompt = `Você é um assistente inteligente. Use APENAS o contexto abaixo para responder à pergunta. Se a resposta não estiver no contexto, diga que não tem informação suficiente.

CONTEXTO:
${context}

PERGUNTA: ${query}

RESPOSTA:`;

    // 5. Gera a resposta com deepseek-coder
    console.log("Generating LLM response...");
    const answer = await generateResponse(prompt, ollamaUrl);

    return new Response(JSON.stringify({
      answer,
      sources: (documents || []).map((d: { id: number; content: string; similarity: number }) => ({
        id: d.id,
        content: d.content.substring(0, 200) + "...",
        similarity: d.similarity,
      })),
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("RAG query error:", err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
