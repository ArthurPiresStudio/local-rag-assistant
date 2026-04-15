import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";

const Index = () => {
  const { toast } = useToast();

  // Index state
  const [docContent, setDocContent] = useState("");
  const [indexing, setIndexing] = useState(false);
  const [indexResult, setIndexResult] = useState<string | null>(null);

  // Query state
  const [query, setQuery] = useState("");
  const [querying, setQuerying] = useState(false);
  const [answer, setAnswer] = useState<string | null>(null);
  const [sources, setSources] = useState<{ id: number; content: string; similarity: number }[]>([]);

  const handleIndex = async () => {
    if (!docContent.trim()) {
      toast({ title: "Erro", description: "Insira o conteúdo do documento.", variant: "destructive" });
      return;
    }
    setIndexing(true);
    setIndexResult(null);
    try {
      const { data, error } = await supabase.functions.invoke("index-documents", {
        body: { content: docContent, metadata: { source: "manual" } },
      });
      if (error) throw error;
      setIndexResult(`✅ ${data.message}`);
      setDocContent("");
      toast({ title: "Sucesso", description: data.message });
    } catch (err: any) {
      setIndexResult(`❌ Erro: ${err.message}`);
      toast({ title: "Erro", description: err.message, variant: "destructive" });
    } finally {
      setIndexing(false);
    }
  };

  const handleQuery = async () => {
    if (!query.trim()) {
      toast({ title: "Erro", description: "Insira uma pergunta.", variant: "destructive" });
      return;
    }
    setQuerying(true);
    setAnswer(null);
    setSources([]);
    try {
      const { data, error } = await supabase.functions.invoke("rag-query", {
        body: { query, match_count: 5 },
      });
      if (error) throw error;
      setAnswer(data.answer);
      setSources(data.sources || []);
    } catch (err: any) {
      setAnswer(`❌ Erro: ${err.message}`);
      toast({ title: "Erro", description: err.message, variant: "destructive" });
    } finally {
      setQuerying(false);
    }
  };

  return (
    <div className="min-h-screen bg-background p-4 md:p-8">
      <div className="mx-auto max-w-3xl space-y-6">
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold text-foreground">🤖 RAG com DeepSeek Coder</h1>
          <p className="text-muted-foreground">
            Retrieval-Augmented Generation · Supabase + Ollama
          </p>
        </div>

        <Tabs defaultValue="query" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="query">💬 Consultar</TabsTrigger>
            <TabsTrigger value="index">📄 Indexar Documentos</TabsTrigger>
          </TabsList>

          <TabsContent value="query">
            <Card>
              <CardHeader>
                <CardTitle>Pergunte ao RAG</CardTitle>
                <CardDescription>
                  Faça uma pergunta e o sistema buscará nos documentos indexados para gerar uma resposta.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Textarea
                  placeholder="Ex: Como funciona o sistema de autenticação?"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  rows={3}
                />
                <Button onClick={handleQuery} disabled={querying} className="w-full">
                  {querying ? "Buscando..." : "Enviar Pergunta"}
                </Button>

                {answer && (
                  <Card className="bg-muted">
                    <CardContent className="pt-4">
                      <p className="font-semibold text-foreground mb-2">Resposta:</p>
                      <p className="text-foreground whitespace-pre-wrap">{answer}</p>
                    </CardContent>
                  </Card>
                )}

                {sources.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-sm font-semibold text-muted-foreground">Fontes:</p>
                    {sources.map((s, i) => (
                      <Card key={i} className="bg-muted/50">
                        <CardContent className="pt-3 pb-3">
                          <p className="text-xs text-muted-foreground">
                            ID: {s.id} · Similaridade: {(s.similarity * 100).toFixed(1)}%
                          </p>
                          <p className="text-sm text-foreground mt-1">{s.content}</p>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="index">
            <Card>
              <CardHeader>
                <CardTitle>Indexar Documento</CardTitle>
                <CardDescription>
                  Cole o texto do documento. Ele será dividido em chunks, embeddings gerados via Ollama (nomic-embed-text) e salvos no Supabase.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Textarea
                  placeholder="Cole o conteúdo do documento aqui..."
                  value={docContent}
                  onChange={(e) => setDocContent(e.target.value)}
                  rows={8}
                />
                <Button onClick={handleIndex} disabled={indexing} className="w-full">
                  {indexing ? "Indexando..." : "Indexar Documento"}
                </Button>

                {indexResult && (
                  <p className="text-sm text-foreground">{indexResult}</p>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default Index;
