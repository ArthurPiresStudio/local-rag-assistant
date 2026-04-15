# Fix 02 — CTA: Pulo na primeira animação do handle (Framer Motion)

## Contexto

Container CTA com três estados de snap (`collapsed`, `default`, `expanded`) animados via `motion.div` do Framer Motion. A altura e o `bottom` eram controlados pela prop `animate`.

## Comportamento com bug

Na primeira vez que o usuário arrastava o handle para cima, o CTA desaparecia e reaparecia já no estado `expanded`, em vez de animar suavemente a transição.

## Causa raiz

O `motion.div` não tinha `initial` definido. Sem ele, o Framer Motion interpola a partir do valor computado do DOM no momento da montagem — que pode ser `0`, `auto` ou indefinido — em vez do estado atual do snap. A primeira animação parte de um valor incorreto, causando o "pulo".

## Solução tentada (não resolveu totalmente)

```tsx
// Tentativa: initial={false} suprime a animação de montagem
<motion.div initial={false} animate={{ height: ..., bottom: ... }}>
```

Isso elimina a animação de montagem mas não resolve o problema quando o componente está dentro de um IIFE e é recriado a cada render (ver Fix 04 para a solução definitiva).

## Solução definitiva (parte do Fix 04)

O problema real era que o `motion.div` estava dentro de um IIFE (`{(() => { ... })()} `), fazendo com que o Framer criasse uma nova instância a cada render — sem histórico de animação. A solução foi abandonar o `motion.div` para o container externo e usar **CSS transition nativo**:

```tsx
<div
  style={{
    height: snapHeight,
    bottom: snapBottom,
    transition: 'height 0.42s cubic-bezier(0.32, 0.72, 0, 1), bottom 0.42s cubic-bezier(0.32, 0.72, 0, 1)',
  }}
>
```

O CSS transition funciona puramente com base no valor atual do estilo, sem depender de histórico ou identidade de componente. Funciona corretamente desde o primeiro render.

## Padrão geral

> Evite usar `motion.div` para animar propriedades de layout (`height`, `bottom`, `width`) em componentes criados dentro de IIFEs ou funções inline. Prefira CSS transition nativo nesses casos. Reserve o Framer Motion para animações de elementos com ciclo de vida estável (montagem/desmontagem com `AnimatePresence`, componentes com identidade fixa).
