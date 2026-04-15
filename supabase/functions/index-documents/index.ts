import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const CHUNK_SIZE = 500;
const CHUNK_OVERLAP = 50;

function chunkText(text: string, size = CHUNK_SIZE, overlap = CHUNK_OVERLAP): string[] {
  const chunks: string[] = [];
  let start = 0;
  while (start < text.length) {
    const end = Math.min(start + size, text.length);
    chunks.push(text.slice(start, end));
    start += size - overlap;
  }
  return chunks;
}

async function getEmbedding(text: string, ollamaUrl: string): Promise<number[]> {
  const res = await fetch(`${ollamaUrl}/api/embeddings`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "ngrok-skip-browser-warning": "true",
    },
    body: JSON.stringify({ model: "nomic-embed-text", prompt: text }),
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Ollama embedding error: ${err}`);
  }
  const data = await res.json();
  return data.embedding;
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

    const { content, metadata = {} } = await req.json();
    if (!content || typeof content !== "string") {
      return new Response(JSON.stringify({ error: "content (string) is required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const chunks = chunkText(content);
    console.log(`Splitting into ${chunks.length} chunks`);

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const results = [];
    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i];
      const embedding = await getEmbedding(chunk, ollamaUrl);
      const { data, error } = await supabase.from("documents").insert({
        content: chunk,
        metadata: { ...metadata, chunk_index: i, total_chunks: chunks.length },
        embedding: JSON.stringify(embedding),
      }).select("id");
      if (error) throw error;
      results.push({ id: data?.[0]?.id, chunk_index: i });
    }

    return new Response(JSON.stringify({
      message: `${chunks.length} chunks indexed successfully`,
      chunks: results,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("Index error:", err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
