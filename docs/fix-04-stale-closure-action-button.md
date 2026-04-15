# Fix 04 — CTA: Animação do botão só funciona após interações com o handle (Stale Closure)

## Contexto

O `ActionButton` era uma função declarada dentro de um IIFE no JSX do componente `StudentHome`. Ela capturava `ctaSnap` e `ctaNavigating` via closure para decidir a sequência de animação ao clicar.

## Comportamento com bug

A animação expand → full-screen → navigate só funcionava após o usuário ter interagido algumas vezes com o handle de drag. Na primeira tentativa (logo após carregar a página), a animação não ocorria corretamente.

## Causa raiz

Dois problemas combinados:

**1. Stale closure:** O `ActionButton` capturava os valores de `ctaSnap` e `ctaNavigating` no momento do render. Como estava dentro de um IIFE recriado a cada render, os valores nem sempre eram os mais atuais no momento do clique — especialmente se houvesse renders intermediários entre o clique e a execução do `onClick`.

**2. IIFE recria o motion.div:** O container externo era um `motion.div` dentro do IIFE, fazendo o Framer Motion perder o histórico de animação a cada render. Isso fazia as transições de altura não funcionarem na primeira interação.

## Solução

### 1. Refs sincronizados com o estado

```tsx
// Declaração dos refs
const ctaSnapRef = useRef<'collapsed' | 'default' | 'expanded'>('default');
const ctaNavigatingRef = useRef(false);

// Sincronização a cada render (fora de useEffect, no corpo do componente)
ctaSnapRef.current = ctaSnap;
ctaNavigatingRef.current = ctaNavigating;
```

### 2. ActionButton usa refs em vez de valores do closure

```tsx
onClick={() => {
  if (isSelectedLocked) return;
  if (ctaNavigatingRef.current) return;          // ref, não closure
  if (ctaSnapRef.current !== 'expanded') {        // ref, não closure
    setCtaSnap('expanded');
    setTimeout(() => {
      setCtaNavigating(true);
      ctaNavigatingRef.current = true;            // atualiza ref imediatamente
      setTimeout(() => {
        handleToggleTask(activeTask);
        setTimeout(() => {
          setCtaNavigating(false);
          ctaNavigatingRef.current = false;
        }, 600);
      }, 420);
    }, 450);
  } else {
    // ...
  }
}}
```

**Por que atualizar o ref manualmente além do estado?**
O `setCtaNavigating(true)` só reflete no ref na próxima renderização. Dentro dos `setTimeout`s encadeados, o ref precisa ser atualizado imediatamente para evitar cliques duplicados enquanto a animação está em curso.

### 3. Substituição do motion.div por div com CSS transition

Para resolver o problema do IIFE recriar o Framer Motion:

```tsx
// Antes: motion.div com animate={{ height, bottom }}
// Depois: div comum com CSS transition

<div
  style={{
    height: snapHeight,
    bottom: snapBottom,
    paddingLeft: snapPaddingH,
    paddingRight: snapPaddingH,
    transition: 'height 0.42s cubic-bezier(0.32, 0.72, 0, 1), bottom 0.42s cubic-bezier(0.32, 0.72, 0, 1), padding 0.42s cubic-bezier(0.32, 0.72, 0, 1)',
  }}
>
```

`cubic-bezier(0.32, 0.72, 0, 1)` é uma curva que imita bem o comportamento de spring do Framer Motion (entrada rápida, desaceleração suave).

## Padrão geral

> Sempre que um `onClick` precisar ler estado React dentro de `setTimeout`s encadeados, use um `ref` sincronizado com o estado no corpo do componente (`ref.current = state`). Nunca confie em closure para ler estado dentro de callbacks assíncronos — o valor pode estar stale. Atualize o ref manualmente após cada `setState` que precise ser refletido imediatamente.
