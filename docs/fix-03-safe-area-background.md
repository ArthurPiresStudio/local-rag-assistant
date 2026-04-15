# Fix 03 — CTA: Background do safe area some após usar o handle

## Contexto

Container CTA fixo na parte inferior da tela com fundo branco. Em dispositivos iOS, há uma área de safe area abaixo da barra de navegação do sistema que deve ser coberta pelo fundo branco do CTA para evitar que o conteúdo da página apareça atrás dela.

## Comportamento com bug

Após arrastar o handle para cima ou para baixo e retornar ao estado `collapsed` ou `default`, o fundo branco que cobria o safe area desaparecia, expondo o conteúdo da página abaixo do container.

## Causa raiz

O div interno do container tinha `overflow: 'hidden'`, que cortava qualquer conteúdo além da altura definida. A altura animada do container (`120px` ou `220px`) não incluía a área do safe area — que fica abaixo do `bottom: 0` do container. O fundo branco precisava "vazar" para baixo dessa fronteira, o que `overflow: hidden` impedia.

## Solução

Adicionar um `div` fixo separado que cobre exclusivamente a área do safe area, independente do container CTA:

```tsx
{!isExpanded && !ctaNavigating && (
  <div
    style={{
      position: 'fixed',
      bottom: 0,
      left: 0,
      right: 0,
      height: 'max(calc(env(safe-area-inset-bottom) + 1px), 1px)',
      backgroundColor: '#FFFFFF',
      zIndex: 24,  // logo abaixo do CTA (zIndex 25)
      pointerEvents: 'none',
    }}
  />
)}
```

**Pontos importantes:**
- `zIndex: 24` — fica logo abaixo do container CTA (`zIndex: 25`) para não interferir com interações
- `pointerEvents: 'none'` — não bloqueia toques
- Só renderiza quando `!isExpanded && !ctaNavigating` — no expanded o container já ocupa toda a altura necessária; no navigating o container vai para `100vh`
- `height: 'max(calc(env(safe-area-inset-bottom) + 1px), 1px)'` — garante pelo menos 1px mesmo em dispositivos sem safe area

## Padrão geral

> Quando um container fixo na parte inferior da tela tem `overflow: hidden` e não pode "vazar" seu fundo para o safe area, use um div auxiliar fixo com `height: env(safe-area-inset-bottom)` e o mesmo `backgroundColor`. Mantenha o `zIndex` dele logo abaixo do container principal.
