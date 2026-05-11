# Design Tokens

## Fonte
- Definidos em `src/app/globals.css` via Tailwind v4 `@theme`.
- Referencia tipada em `src/tokens/index.ts`.

## Paleta
- `primary-*`: vermelho da marca (acao principal)
- `accent-*`: amarelo quente (destaque)
- `neutral-*`: escala para texto, fundos e bordas

## Tipografia
- Fonte base: Inter (carregada em `src/app/layout.tsx`).

## Regras
- Toda tela nova deve usar tokens (sem cores hardcoded fora de excecoes pontuais).
- Estados visuais devem manter contraste AA.
