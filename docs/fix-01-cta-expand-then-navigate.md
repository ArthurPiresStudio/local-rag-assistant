# Fix 01 — CTA: Animação expand → full-screen → navegação

## Contexto

Página home de um app de inglês com um container CTA fixo na parte inferior da tela. O CTA tem três estados de snap: `collapsed`, `default` e `expanded`, controlados por drag no handle. Ao clicar no botão de ação do CTA, o usuário era levado diretamente para a rota `/task-intro` sem nenhuma animação de transição.

## Comportamento desejado

1. Se o CTA estiver em `collapsed` ou `default`: ao clicar no botão, primeiro anima para `expanded` (com a spring animation existente), depois expande para ocupar 100% da tela (width e height), e só então navega.
2. Se o CTA já estiver em `expanded`: pula direto para o full-screen e navega.

## Causa raiz

O `ActionButton` chamava `handleToggleTask` diretamente no `onClick`, sem nenhuma etapa de animação intermediária.

## Solução

### 1. Novo estado `ctaNavigating`

```tsx
const [ctaNavigating, setCtaNavigating] = useState(false);
```

Controla a fase de full-screen pré-navegação, separada do snap normal.

### 2. ActionButton com sequência de animação

```tsx
const ActionButton = ({ size }: { size: number }) => (
  <button
    onClick={() => {
      if (isSelectedLocked) return;
      if (ctaNavigatingRef.current) return;
      if (ctaSnapRef.current !== 'expanded') {
        // Step 1: anima para expanded
        setCtaSnap('expanded');
        // Step 2: após a spring assentar, vai full-screen e navega
        setTimeout(() => {
          setCtaNavigating(true);
          ctaNavigatingRef.current = true;
          setTimeout(() => {
            handleToggleTask(activeTask);
            setTimeout(() => {
              setCtaNavigating(false);
              ctaNavigatingRef.current = false;
            }, 600);
          }, 420);
        }, 450);
      } else {
        // Já expanded: vai direto para full-screen
        setCtaNavigating(true);
        ctaNavigatingRef.current = true;
        setTimeout(() => {
          handleToggleTask(activeTask);
          setTimeout(() => {
            setCtaNavigating(false);
            ctaNavigatingRef.current = false;
          }, 600);
        }, 420);
      }
    }}
    // ... resto das props
  >
```

**Timings:**
- `450ms` → tempo para a spring do CTA assentar no estado `expanded`
- `420ms` → tempo para a animação full-screen assentar antes de navegar
- `600ms` → reset do estado após navegação (segurança)

### 3. Container externo responde ao `ctaNavigating`

```tsx
style={{
  height: ctaNavigating
    ? '100vh'
    : isExpanded
    ? `calc(100vh - ${headerHeight + 48}px - max(calc(env(safe-area-inset-bottom) + 44px), 56px))`
    : SNAP_HEIGHTS[ctaSnap],
  bottom: ctaNavigating ? '0px' : isExpanded ? 'max(...)' : '0px',
  paddingLeft: ctaNavigating ? '0px' : '8px',
  paddingRight: ctaNavigating ? '0px' : '8px',
  zIndex: ctaNavigating ? 9999 : 25,
  transition: 'height 0.42s cubic-bezier(0.32, 0.72, 0, 1), ...',
}}
```

O `zIndex` sobe para `9999` durante `ctaNavigating` para cobrir toda a UI. O `borderRadius` do div interno vai para `0` via CSS transition, eliminando os cantos arredondados enquanto toma toda a tela.

## Padrão geral

> Quando uma navegação deve ser precedida de uma animação de UI, use um estado booleano de transição (`isNavigating`, `ctaNavigating`, etc.) controlado por `setTimeout` escalonado. Nunca chame `navigate()` diretamente no `onClick` se houver animação pendente.
      
