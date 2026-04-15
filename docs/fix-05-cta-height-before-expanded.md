# Fix 05 — CTA: Alturas do collapsed/default incorretas antes de ir ao expanded

## Contexto

Container CTA com snaps `collapsed` (`145px`), `default` (`245px`) e `expanded`. As alturas dos snaps eram animadas via `motion.div` com a prop `animate={{ height }}`.

## Comportamento com bug

Ao iniciar a página, as alturas do `collapsed` e do `default` ficavam menores do que o esperado. O problema se normalizava após o usuário ir até o `expanded` e retornar — como se a primeira visita ao `expanded` "calibrasse" as alturas dos outros snaps.

## Causa raiz

O `motion.div` estava dentro de um IIFE no JSX (`{(() => { return <motion.div>...</motion.div> })()} `). Isso faz com que o React crie uma **nova instância** do `motion.div` a cada render, pois o componente não tem identidade estável (sem `key`, sem ser um componente nomeado).

Sem identidade estável, o Framer Motion não consegue manter o histórico de animações entre renders. Na prática, ele não sabe de qual valor interpolar — e usa um valor inicial incorreto (geralmente próximo de `0`). A primeira visita ao `expanded` fornece um valor de referência concreto (`90vh`), a partir do qual as interpolações subsequentes para `collapsed`/`default` passam a funcionar corretamente.

## Soluções tentadas

### Tentativa 1: `initial={false}`
```tsx
<motion.div initial={false} animate={{ height: SNAP_HEIGHTS[ctaSnap] }}>
```
Suprime a animação de montagem, mas não resolve o problema de identidade instável — o Framer ainda perde o estado entre renders.

### Tentativa 2: `initial` com valores concretos
```tsx
<motion.div initial={{ height: '245px', bottom: 0 }} animate={{ height: ... }}>
```
Mesma limitação — o `initial` é aplicado apenas na montagem, mas como o componente é remontado a cada render (por estar no IIFE), o `initial` é reaplicado constantemente, interferindo com as animações.

## Solução definitiva

Substituir o `motion.div` externo por um `div` comum com **CSS transition nativo**:

```tsx
// Valores computados fora do JSX
const snapHeight = ctaNavigating
  ? '100vh'
  : isExpanded
  ? `calc(100vh - ${headerHeight + 48}px - max(calc(env(safe-area-inset-bottom) + 44px), 56px))`
  : SNAP_HEIGHTS[ctaSnap];

const snapBottom = ctaNavigating
  ? '0px'
  : isExpanded ? 'max(calc(env(safe-area-inset-bottom) + 44px), 56px)' : '0px';

const snapPaddingH = ctaNavigating ? '0px' : '8px';

// JSX
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

**Por que CSS transition resolve?**
O CSS transition opera diretamente sobre o valor atual do atributo no DOM, interpolando para o novo valor sempre que ele muda. Não depende de histórico, identidade de componente ou estado interno de uma biblioteca. Funciona corretamente desde o primeiro render, independente de estar dentro de um IIFE.

**Curva de easing usada:**
`cubic-bezier(0.32, 0.72, 0, 1)` — imita o comportamento de spring (entrada rápida, desaceleração suave no final), mantendo a sensação original das animações do Framer Motion.

## SNAP_HEIGHTS ajustados

```tsx
const SNAP_HEIGHTS: Record<string, string> = {
  collapsed: '145px',
  default:   '245px',
  expanded:  '90vh',
};
```

Os valores de `collapsed` e `default` foram aumentados em ~25px em relação aos originais para compensar o espaço do safe area e do padding interno.

## Padrão geral

> Nunca use `motion.div` para animar propriedades de layout (`height`, `bottom`, `top`, `width`) em elementos sem identidade estável (dentro de IIFEs, funções inline, ou sem `key` definida). Use CSS transition nativo nesses casos — ele é stateless por natureza e funciona corretamente em qualquer contexto de renderização.
