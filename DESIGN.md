---
name: Revoada
description: Página do projeto Revoada no tema Grafite do app. Capa de tela inteira sobre um campo de grão que ondula, e abaixo dela uma janela presa com o app de verdade, que troca de cena conforme a rolagem.
colors:
  fundo: "#111112"
  lateral: "#0c0c0d"
  sup: "#19191b"
  sup-2: "#232326"
  fio: "rgba(255, 255, 255, 0.075)"
  fio-2: "rgba(255, 255, 255, 0.14)"
  tinta: "#ededee"
  tinta-2: "#a7a7ac"
  tinta-3: "#6f6f75"
  botao: "#ededee"
  sobre-botao: "#111112"
  term: "#0a0a0b"
typography:
  display:
    fontFamily: "Newsreader, 'Iowan Old Style', Georgia, serif"
    fontSize: "clamp(2.75rem, 6.6vw, 5.25rem)"
    fontWeight: 400
    lineHeight: 1.02
    letterSpacing: "-0.024em"
  headline:
    fontFamily: "Newsreader, 'Iowan Old Style', Georgia, serif"
    fontSize: "clamp(1.75rem, 3.1vw, 2.625rem)"
    fontWeight: 400
    lineHeight: 1.14
    letterSpacing: "-0.016em"
  marca:
    fontFamily: "Newsreader, 'Iowan Old Style', Georgia, serif"
    fontSize: "1.3125rem"
    fontWeight: 400
    letterSpacing: "-0.012em"
  lead:
    fontFamily: "Geist, ui-sans-serif, system-ui, -apple-system, 'Segoe UI', sans-serif"
    fontSize: "clamp(1.0625rem, 1.35vw, 1.25rem)"
    fontWeight: 400
    lineHeight: 1.55
  body:
    fontFamily: "Geist, ui-sans-serif, system-ui, -apple-system, 'Segoe UI', sans-serif"
    fontSize: "1.0625rem"
    fontWeight: 400
    lineHeight: 1.6
  termo:
    fontFamily: "Geist, ui-sans-serif, system-ui, sans-serif"
    fontSize: "1.0625rem"
    fontWeight: 500
    lineHeight: 1.6
  nota:
    fontFamily: "Geist, ui-sans-serif, system-ui, sans-serif"
    fontSize: "0.9375rem"
    fontWeight: 400
    lineHeight: 1.55
  mono:
    fontFamily: "'Geist Mono', ui-monospace, Menlo, monospace"
    fontSize: "0.9375rem"
    fontWeight: 400
    lineHeight: 1.9
  mono-detalhe:
    fontFamily: "'Geist Mono', ui-monospace, Menlo, monospace"
    fontSize: "0.8125rem"
    fontWeight: 400
    letterSpacing: "-0.01em"
rounded:
  sm: "5px"
  md: "12px"
  pill: "999px"
spacing:
  margem: "clamp(16px, 4vw, 48px)"
  container: "1280px"
  respiro: "clamp(72px, 10vw, 136px)"
  coluna: "clamp(32px, 6vw, 96px)"
  topo-do-bloco: "clamp(28px, 4vw, 52px)"
components:
  button:
    backgroundColor: "{colors.botao}"
    textColor: "{colors.sobre-botao}"
    rounded: "{rounded.pill}"
    padding: "0 22px"
    height: "46px"
  button-hover:
    opacity: 0.88
  janela:
    backgroundColor: "{colors.lateral}"
    rounded: "{rounded.md}"
    border: "1px {colors.fio-2}"
    shadow: "0 18px 50px rgba(0, 0, 0, 0.5)"
  janela-barra:
    backgroundColor: "{colors.lateral}"
    height: "34px"
    border: "1px {colors.fio}"
  recorte:
    rounded: "{rounded.md}"
    border: "1px {colors.fio-2}"
  comandos:
    backgroundColor: "{colors.term}"
    textColor: "{colors.tinta}"
    typography: "{typography.mono}"
    rounded: "{rounded.md}"
    padding: "20px 22px"
  codigo:
    backgroundColor: "{colors.sup}"
    textColor: "{colors.tinta}"
    rounded: "{rounded.sm}"
  faixa:
    backgroundColor: "{colors.lateral}"
    border: "1px {colors.fio}"
---

# Design System: Revoada

## Overview

**Creative North Star: "A mesma sala, vista de fora"**

A página do projeto é a continuação do app. Usa o tema Grafite inteiro, com os mesmos tokens de `public/index.html`: fundo cinza quase preto, tinta clara, fio de um pixel, títulos numa serifa (Newsreader), texto em Geist e detalhes pequenos em Geist Mono. Não há cor de marca. O único elemento cheio é o botão claro, um por dobra.

O produto se mostra em print real. Cada bloco traz uma ideia e a tela do app que a prova, numa moldura simples de janela. As telas vêm do modo de demonstração (`bun run demo`), com contas, projetos e pedidos de exemplo.

A versão anterior (sistema Plumagem, foto de bando, letra monumental em Geist 600, folha de papel clara e conversa transcrita em fita) foi trocada por esta em 11/11/2026, a pedido do dono, para a página parecer do mesmo produto que o app novo.

**Key Characteristics:**
- Escuro e cinza, sem gradiente, sem brilho e sem acento de cor. O âmbar e o verde só aparecem dentro dos prints, porque são do app.
- Título grande só na capa. Do segundo bloco em diante a escala é contida.
- Print real em moldura de janela, sempre na largura inteira do container para ficar legível.
- Título à esquerda e texto à direita em todo bloco. A mesma grade de duas colunas (5 e 6) serve às listas e às perguntas.
- Um botão cheio por dobra. O resto é link sublinhado.

## Colors

Todos os valores são os do `:root` do app. Mudou lá, muda aqui.

### Neutral
- **fundo** `#111112`: o fundo da página, igual ao da área principal do app.
- **lateral** `#0c0c0d`: as faixas (segurança e instalar), o rodapé e o corpo da moldura de janela. É o tom da lateral do app.
- **sup** `#19191b` e **sup-2** `#232326`: fundo de `code` e os três pontos da barra da janela.
- **fio** e **fio-2**: branco a 7,5% e a 14%. Separam linhas de lista e contornam molduras.
- **tinta** `#ededee`: títulos, termos e links.
- **tinta-2** `#a7a7ac`: parágrafos, notas e legendas. Contraste de 7,7:1 sobre o fundo.
- **tinta-3** `#6f6f75`: só enfeite sem informação (o `$` dos comandos). Não passa em AA para texto pequeno.

### Named Rules
- **Regra do botão único.** `botao` sobre `sobre-botao` aparece uma vez por dobra: "Instalar em 4 comandos" na capa, "Copiar os comandos" no fecho, "Voltar ao início" na 404.
- **Regra do cinza.** Nenhuma cor nova entra na página. Se um estado precisar de destaque, usa peso ou tinta, nunca matiz.

## Typography

Três famílias, servidas pelo próprio site (`site/*.woff2`, copiadas de `public/`), sem CDN.

### Hierarchy
- **display** (Newsreader 400, até 5,25rem, entrelinha 1,02): só o `h1` da capa, em até 13 caracteres por linha.
- **headline** (Newsreader 400, até 2,625rem): o `h2` de cada bloco, em até 19 caracteres por linha.
- **marca** (Newsreader 400, 1,3125rem): "revoada" em minúsculas ao lado das três aves, como na lateral do app.
- **lead** e **body** (Geist 400): o apoio da capa e os parágrafos, em `tinta-2`, com até 60 caracteres por linha.
- **termo** (Geist 500): `dt` das listas e `summary` das perguntas, em `tinta`.
- **mono** e **mono-detalhe** (Geist Mono): os comandos de instalar, `code` no meio do texto e a nota curta sob o botão da capa.

### Named Rules
- **Regra da serifa.** Newsreader só em título e na marca. Nunca em parágrafo.
- **Regra da mono.** Geist Mono só onde há código, comando ou requisito de máquina.

## Layout

Container de 1280px com margem lateral de 16 a 48px. O print de 1280 pontos de largura entra em tamanho real no desktop largo.

- **Capa:** `h1`, depois uma linha de duas colunas (apoio à esquerda, botão e nota à direita) e a janela principal logo abaixo, já visível na primeira dobra.
- **Bloco:** topo em duas colunas (título em 5, texto em 6) e a janela na largura inteira.
- **Faixa:** fundo `lateral` com fio em cima e embaixo. Usada na segurança e no fecho.
- **Lista:** linhas separadas por `fio`, com o título do bloco na coluna da esquerda.
- **Ritmo:** `respiro` entre blocos.

Abaixo de 860px tudo vira uma coluna. Cada print tem três arquivos: janela inteira em 1280 pontos, janela inteira em 920 pontos (até 1040px de tela) e recorte só da área principal, sem a lateral (até 700px), para o texto do app não ficar ilegível no celular.

## Elevation & Depth

Uma sombra só, a `--sombra` do app (`0 18px 50px rgba(0, 0, 0, 0.5)`), nas molduras de janela. O resto é plano e separado por fio.

## Shapes

Raio de 12px em molduras e no bloco de comandos, 5px em `code`, pílula no botão. Ícones em traço de 1,75 (seta, mais, copiar), desenhados no próprio HTML.

## Components

### Botão
Pílula clara de 46px de altura, Geist 500. Hover em 88% de opacidade, clique encolhe para 97%. Foco com contorno de 2px em `tinta`.

### Link (`.elo`)
Texto em `tinta` com sublinhado em `fio-2` que vira `tinta` no hover. A seta anda 3px.

### Janela (assinatura)
Moldura dos prints: barra de 34px com três pontos cinza, fio de um pixel em volta, raio de 12px e a sombra do app. O print dentro dela é sempre uma tela real, em 2x, com `width`, `height` e `alt` que descreve o que aparece.

### Recorte
Trecho de uma tela, sem barra de janela, só com o fio e o raio. Usado no pedido de permissão do bloco de segurança.

### Lista e fatos
`dl` em linhas com fio: termo em `tinta` 500, descrição em `tinta-2`.

### Perguntas
`details` nativo. O sinal de mais gira 45 graus ao abrir.

### Bloco de comandos
`pre` em Geist Mono sobre `term`, com `$` em `tinta-3` na frente de cada linha e rolagem lateral própria em tela estreita. O botão "Copiar os comandos" fica embaixo e confirma no próprio rótulo.

## Motion

Um movimento só: a janela da capa assenta ao carregar (opacidade, 18px de subida e recorte, 0,9s, saída exponencial). Com `prefers-reduced-motion` nada se move.

## Do's and Don'ts

### Do:
- Tirar todo print do modo de demonstração (`DEMO_PORT=4792 bun scripts/demo.ts`), nunca do app instalado de alguém.
- Em tela larga a janela do passeio mostra o app de verdade num `iframe` (`site/demo/`, gerado de `public/index.html` por `bun scripts/site-demo.ts`, com servidor e agentes de mentira dentro da página); em tela pequena, com movimento reduzido ou sem script ficam os prints.
- Manter os tokens iguais aos do app.
- Dizer cada fato uma vez e sustentar cada afirmação no README.
- Conferir a página em 360, 390, 768, 1440 e 1800 de largura.

### Don't:
- Gradiente, brilho, vidro, cor de marca ou ícone em grade de cartões.
- Ilustração ou tela recriada no lugar do print.
- Rótulo pequeno em cima de título, ou numeração de seção.
- Segundo botão cheio na mesma dobra.
- Fonte de CDN ou biblioteca nova.


## A página hoje (11/11/2026)

O que vale quando este documento e o código discordarem em algum trecho mais antigo acima:

- **Fundo.** Um campo de fios de grão pintado em WebGL (`site/main.js`, bloco "O fundo"), portado da landing da Pandora: uma passada desenha os fios numa textura pequena, a outra junta com um grão de 256 pontos puxado na vertical. Fica preso à janela, atrás da página inteira, a 80% da força na capa e 42% atrás do texto corrido. Sem WebGL, entram cinco faixas onduladas em CSS (`.fundo i`). Com menos movimento, um quadro parado.
- **Capa.** Tela inteira, tudo no centro: a marca em serifa, a frase, uma linha de apoio, um link sublinhado no lugar do botão e uma linha de garantia. No topo, o aviso de código aberto à esquerda e a navegação pequena à direita. No pé, os quatro agentes com o símbolo de cada um. O texto de apoio da capa usa `--apoio-capa` (#c9c9cd), mais claro que o do resto, porque fica por cima do campo.
- **Passeio.** Cinco ideias (`conversa`, `limite`, `precisa`, `tarefas`, `rotinas`). Em tela larga elas dividem uma janela só, presa na tela: a rolagem escolhe a ideia, o texto e a cena trocam juntos, e os nomes embaixo levam a cada uma. A janela mostra o app de verdade num `iframe` (`site/demo/`, gerado por `bun scripts/site-demo.ts`), dirigido por mensagens; os prints ficam de cartaz até ele carregar. Em tela pequena, com menos movimento ou sem script, cada ideia fica com o seu print, uma embaixo da outra.
- **Seções.** Segurança, extras, perguntas e instalar em coluna central, sem faixa de fundo nem borda entre elas. Fatos em grade de duas ou três colunas com fio de um pixel em cima. Perguntas e instalar em coluna de 760px.
- **Cor de texto.** `--tinta` para títulos, `--tinta2` para texto corrido, `--apoio` (#b1b1b6) para notas. `--tinta3` não vai em texto: dá 3,8:1 sobre o fundo.
- **Movimento.** O campo de grão, a troca de cena do passeio e as perguntas, que abrem deslizando. Nada entra animado ao carregar.
