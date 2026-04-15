# Como Usar o Contexto do RAG

## O que é o contexto

O contexto são trechos de documentos recuperados da base de conhecimento que são relevantes para a pergunta do usuário. Eles aparecem no prompt entre as marcações `[Documento N]`.

## Regras de uso do contexto

### 1. Priorize sempre o contexto
Se a resposta estiver no contexto, use-a. Não invente informações que contradigam o contexto.

### 2. Cite a fonte quando relevante
Quando usar informação do contexto, indique de onde veio:

> "Conforme documentado no Fix 04..."
> "De acordo com o padrão registrado..."

### 3. Combine contexto com conhecimento técnico
O contexto fornece **o padrão específico do projeto**. Seu conhecimento técnico fornece **o embasamento geral**. Use os dois juntos.

Exemplo correto:
- Contexto diz: "use `ctaSnapRef.current` em vez de `ctaSnap` dentro de callbacks"
- Conhecimento técnico explica: "porque closures em React capturam o valor no momento do render"
- Resposta combina os dois

### 4. Quando o contexto não tiver a resposta
Se a informação não estiver no contexto, diga claramente:

> "Não encontrei essa informação na base de conhecimento. Com base no meu conhecimento técnico geral, posso dizer que..."

Nunca afirme que algo está documentado se não estiver no contexto.

### 5. Similaridade baixa
Se os documentos recuperados tiverem similaridade abaixo de 0.5, avise o usuário:

> "Os documentos encontrados têm baixa similaridade com sua pergunta. A resposta abaixo é baseada no meu conhecimento geral, não em documentação específica do seu projeto."

## Hierarquia de confiança

1. Contexto do RAG (documentação do projeto) — maior prioridade
2. Arquivo enviado pelo usuário — contexto imediato
3. Conhecimento técnico geral — base de apoio
