// Gerado por scripts/site-demo.ts a partir de public/ e scripts/site-demo/. Não edite aqui.
window.REVOADA_DEMO = {"cenas":[{"quando":["pagina[\\u00E7c][\\u00E3a]o de \\/pedidos","i"],"titulo":"Paginação por cursor em pedidos","sugestao":"abre o PR com isso","passos":[{"ler":"src/rotas/pedidos.ts"},{"ler":"src/repositorio/pedidos.ts"},{"editar":"src/repositorio/pedidos.ts"},{"limite":true},{"editar":"src/rotas/pedidos.ts"},{"editar":"tests/pedidos.test.ts"},{"rodar":"bun test tests/pedidos.test.ts","desc":"Roda os testes de pedidos","saida":"14 pass\n0 fail","pede":true},{"texto":"Pronto. `/pedidos` agora pagina por cursor e o `?pagina=` antigo continua respondendo.\n\n| Arquivo | O que mudou |\n| --- | --- |\n| `src/repositorio/pedidos.ts` | busca por `(criado_em, id)` depois do cursor |\n| `src/rotas/pedidos.ts` | aceita `?depois=` e devolve `proximo` |\n| `tests/pedidos.test.ts` | 4 casos novos, 14 passando |\n\n- **Compatível:** quem ainda manda `?pagina=` recebe a mesma resposta de antes.\n- **Índice:** a consulta usa o índice que já existe em `(criado_em, id)`.\n\nFalta só avisar o app sobre o campo `proximo`."}]},{"quando":["coluna entregue_em","i"],"titulo":"Migração da coluna entregue_em","passos":[{"ler":"db/schema.sql"},{"editar":"db/migrations/0042_pedidos_entregue_em.sql","novo":true,"pede":true},{"rodar":"bun run db:migrate --alvo local","desc":"Aplica a migração no banco local","saida":"0042_pedidos_entregue_em aplicada","pede":true},{"texto":"Migração `0042` aplicada no banco local. A coluna `entregue_em` aceita nulo, então os pedidos antigos seguem valendo."}]},{"quando":["fuso do relat[\\u00F3o]rio","i"],"titulo":"Fuso do relatório diário","passos":[{"ler":"src/relatorio/diario.ts"},{"editar":"src/relatorio/diario.ts"},{"rodar":"bun test tests/relatorio.test.ts","desc":"Roda os testes do relatório","saida":"9 pass\n0 fail"},{"texto":"O relatório fechava o dia em UTC e jogava as vendas depois das 21h para o dia seguinte. Agora o corte usa o fuso da loja. 9 testes passam, um deles novo para a virada do dia."}]},{"quando":["frete no resumo","i"],"titulo":"Frete no resumo do carrinho","passos":[{"ler":"src/carrinho/Resumo.tsx"},{"editar":"src/carrinho/Resumo.tsx"},{"editar":"tests/carrinho.test.tsx"},{"rodar":"bun test tests/carrinho.test.tsx","desc":"Roda os testes do carrinho","saida":"11 pass\n0 fail"},{"texto":"O resumo do carrinho agora mostra a linha de frete antes do total. Sem CEP informado aparece \"a calcular\" no lugar do valor."}]},{"quando":["gr[\\u00E1a]fico de vendas","i"],"titulo":"Gráfico de vendas em barras","passos":[{"ler":"src/painel/GraficoVendas.tsx"},{"editar":"src/painel/GraficoVendas.tsx"},{"rodar":"bun test tests/painel.test.tsx","desc":"Roda os testes do painel"},{"demora":1800000}]},{"quando":["su[\\u00EDi]te inteira","i"],"titulo":"Suíte da manhã","passos":[{"rodar":"bun test","desc":"Roda a suíte inteira","saida":"212 pass\n0 fail"},{"texto":"Rodei a suíte inteira: 212 testes, todos passando. Nada quebrou desde ontem, então não abri PR."}]},{"quando":["SDK de pagamentos","i"],"titulo":"SDK de pagamentos atualizado","passos":[{"ler":"package.json"},{"rodar":"bun update pagamentos-sdk","desc":"Atualiza o SDK de pagamentos","saida":"pagamentos-sdk 4.2.0 -> 5.0.1"},{"editar":"src/pagamentos/cliente.ts"},{"rodar":"bun test tests/pagamentos.test.ts","desc":"Roda os testes de pagamentos","saida":"17 pass\n0 fail"},{"texto":"SDK de pagamentos na versão 5. A única quebra era o nome do campo de valor, que passou de `amount` para `valor_centavos`. Ajustei o cliente e os 17 testes passam."}]},{"quando":["flag antiga do checkout","i"],"titulo":"Flag antiga do checkout removida","passos":[{"ler":"src/checkout/flags.ts"},{"editar":"src/checkout/flags.ts"},{"editar":"src/checkout/Pagina.tsx"},{"rodar":"bun test tests/checkout.test.tsx","desc":"Roda os testes do checkout","saida":"23 pass\n0 fail"},{"texto":"A flag `checkout_novo` saiu. O caminho antigo, que ela ainda protegia, foi junto: ninguém caía nele desde que a flag foi ligada para todos."}]},{"quando":["exporta[\\u00E7c][\\u00E3a]o de pedidos em CSV","i"],"titulo":"Exportar pedidos em CSV","passos":[{"ler":"src/pedidos/lista.ts"},{"editar":"src/pedidos/exportar.ts","novo":true},{"editar":"tests/exportar.test.ts","novo":true},{"rodar":"bun test tests/exportar.test.ts","desc":"Roda os testes da exportação","saida":"6 pass\n0 fail"},{"texto":"A exportação fica em `src/pedidos/exportar.ts` e devolve o CSV com cabeçalho, uma linha por pedido. Vírgula e aspas dentro de campo saem escapadas. 6 testes."}]},{"quando":["importa[\\u00E7c][\\u00E3a]o de clientes por planilha","i"],"titulo":"Importar clientes por planilha","passos":[{"ler":"src/clientes/modelo.ts"},{"editar":"src/clientes/importar.ts","novo":true},{"editar":"tests/importar.test.ts","novo":true},{"rodar":"bun test tests/importar.test.ts","desc":"Roda os testes da importação","saida":"8 pass\n0 fail"},{"texto":"A importação fica em `src/clientes/importar.ts`. Linha com e-mail inválido ou repetido não entra e volta numa lista de recusadas, com o motivo. 8 testes."}]}],"pedidos":{"paginacao":"Troca a paginação de /pedidos de offset para cursor. Mantém o ?pagina= antigo funcionando por enquanto e ajusta os testes.","migracao":"Cria a migração da coluna entregue_em em pedidos e roda no banco local.","tarefas":["Corrigir o fuso do relatório diário","Mostrar o frete no resumo do carrinho","Trocar o gráfico de vendas para barras empilhadas","Atualizar o SDK de pagamentos","Remover a flag antiga do checkout"],"suite":"Roda a suíte inteira e abre um PR com o que quebrou","dependencias":"Atualiza as dependências e roda os testes","missao":"Exportar pedidos em CSV e importar clientes por planilha"},"plano":{"fala":"Dá para separar em duas frentes que não tocam nos mesmos arquivos.","tarefas":[{"titulo":"Exportar pedidos em CSV","pedido":"Crie a exportação de pedidos em CSV em src/pedidos/exportar.ts, com teste. Não mexa em src/clientes."},{"titulo":"Importar clientes por planilha","pedido":"Crie a importação de clientes por planilha em src/clientes/importar.ts, com teste. Não mexa em src/pedidos."}]},"revisao":"Nada a corrigir.\n\nConferi o diff contra o pedido, abri os arquivos em volta e rodei os testes da área: o caso novo cobre a mudança e nada que já existia mudou de comportamento.","logo":"<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"150 250 720 480\">\n  <path d=\"M240.6 383.8 Q288.0 292.3 351.3 362.4 Q404.2 284.1 464.0 368.2 Q405.1 328.2 354.3 405.5 Q293.3 336.0 240.6 383.8 Z\" fill=\"currentColor\" fill-opacity=\".42\"/>\n  <path d=\"M496.7 466.5 Q555.6 316.5 665.4 415.2 Q734.8 284.9 841.4 405.8 Q743.3 353.3 677.1 481.7 Q571.0 383.6 496.7 466.5 Z\" fill=\"currentColor\" fill-opacity=\".72\"/>\n  <path d=\"M164.6 690.3 Q280.1 456.9 449.5 626.1 Q580.0 425.4 741.5 629.6 Q585.8 535.4 460.8 733.5 Q297.3 565.7 164.6 690.3 Z\" fill=\"currentColor\"/>\n</svg>\n"};
// Markdown das respostas dos agentes → HTML. Usado pelo painel e pela página do celular.
// O texto vem de um modelo e pode ter sido influenciado pelo que ele leu, então nada do que
// chega vira marcação por conta própria: tudo passa por esc() e só o que este arquivo monta é HTML.
(function (root) {
  const esc = (s) => String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

  // ---------- dentro da linha ----------
  function inline(raw) {
    const keep = [];
    const hold = (html) => `\u0000${keep.push(html) - 1}\u0000`;
    let t = String(raw ?? "").replace(/\u0000/g, "");
    // código primeiro: o que está entre crases não é negrito, link nem nada
    t = t.replace(/(`+)(?!`)([\s\S]*?[^`])\1(?!`)/g, (_, _q, code) => hold(`<code>${esc(code.replace(/^ (.*) $/, "$1"))}</code>`));
    t = t.replace(/\\([\\`*_{}\[\]()#+\-.!|~>])/g, (_, c) => hold(esc(c)));
    t = esc(t);
    const emph = (s) => s
      .replace(/\*\*(?=\S)([\s\S]*?\S)\*\*/g, "<b>$1</b>")
      .replace(/(^|[^\w_])__(?=\S)([\s\S]*?\S)__(?![\w_])/g, "$1<b>$2</b>")
      .replace(/(^|[^\w*])\*(?=[^\s*])([^*]*?[^\s*]|[^\s*])\*(?![\w*])/g, "$1<i>$2</i>")
      .replace(/(^|[^\w_])_(?=[^\s_])([^_]*?[^\s_]|[^\s_])_(?![\w_])/g, "$1<i>$2</i>")
      .replace(/~~(?=\S)([\s\S]*?\S)~~/g, "<s>$1</s>");
    // só endereço http(s) e e-mail viram link; javascript: e afins ficam como texto
    t = t.replace(/\[([^\]\n]+)\]\(((?:https?:\/\/|mailto:)[^\s)]+)\)/g, (_, label, url) => hold(`<a href="${url}" target="_blank" rel="noopener noreferrer">${emph(label)}</a>`));
    t = t.replace(/(^|[\s(])(https?:\/\/(?:(?!&quot;|&gt;|&lt;)[^\s\u0000])+)/g, (_, pre, found) => {
      const url = found.replace(/[.,;:!?)\]}'*_~]+$/, ""); // pontuação do fim da frase não é do endereço
      return pre + hold(`<a href="${url}" target="_blank" rel="noopener noreferrer">${url}</a>`) + found.slice(url.length);
    });
    t = emph(t);
    return t.replace(/\u0000(\d+)\u0000/g, (_, i) => keep[+i] ?? "").replace(/\u0000(\d+)\u0000/g, (_, i) => keep[+i] ?? "");
  }

  // ---------- blocos ----------
  const FENCE = /^\s*(```+|~~~+)\s*([\w+#.-]*)\s*$/;
  const HEADING = /^\s{0,3}(#{1,6})\s+(.*?)\s*#*\s*$/;
  const RULE = /^\s{0,3}([-*_])(?:\s*\1){2,}\s*$/;
  const QUOTE = /^\s{0,3}>\s?(.*)$/;
  const ITEM = /^(\s*)([-*+]|\d{1,9}[.)])\s+(.*)$/;
  const TABLE_SEP = /^\s*\|?\s*:?-+:?\s*(\|\s*:?-+:?\s*)*\|?\s*$/;
  const width = (ws) => ws.replace(/\t/g, "    ").length;

  // corta a linha da tabela nas barras, sem contar as que estão escapadas ou dentro de código
  function cells(line) {
    const out = [];
    let cur = "", tick = false;
    const s = line.trim().replace(/^\|/, "").replace(/\|$/, "");
    for (let i = 0; i < s.length; i++) {
      if (s[i] === "\\" && s[i + 1] === "|") { cur += "|"; i++; }
      else if (s[i] === "`") { tick = !tick; cur += s[i]; }
      else if (s[i] === "|" && !tick) { out.push(cur.trim()); cur = ""; }
      else cur += s[i];
    }
    out.push(cur.trim());
    return out;
  }

  function table(head, sep, rows) {
    const align = cells(sep).map((c) => (/^:-+:$/.test(c) ? "center" : /-:$/.test(c) ? "right" : ""));
    const cols = cells(head);
    const at = (j) => (align[j] ? ` style="text-align:${align[j]}"` : "");
    return `<div class="tbl"><table><thead><tr>${cols.map((c, j) => `<th${at(j)}>${inline(c)}</th>`).join("")}</tr></thead><tbody>`
      + rows.map(cells).map((r) => `<tr>${cols.map((_, j) => `<td${at(j)}>${inline(r[j] ?? "")}</td>`).join("")}</tr>`).join("") + `</tbody></table></div>`;
  }

  function list(lines) {
    let html = "";
    const stack = []; // { indent, tag }
    const closeTo = (n) => { while (stack.length > n) html += `</li></${stack.pop().tag}>`; };
    for (const line of lines) {
      const m = line.match(ITEM);
      if (!m) { if (line.trim() && stack.length) html += `<br>${inline(line.trim())}`; continue; }
      const indent = width(m[1]), ordered = /\d/.test(m[2]), tag = ordered ? "ol" : "ul";
      while (stack.length > 1 && indent < stack[stack.length - 1].indent) closeTo(stack.length - 1);
      const top = stack[stack.length - 1];
      if (!top || indent >= top.indent + 2) {
        stack.push({ indent, tag });
        html += ordered && parseInt(m[2]) !== 1 ? `<ol start="${parseInt(m[2])}">` : `<${tag}>`;
      } else if (top.tag !== tag) {
        html += `</li></${stack.pop().tag}>`;
        stack.push({ indent, tag });
        html += ordered && parseInt(m[2]) !== 1 ? `<ol start="${parseInt(m[2])}">` : `<${tag}>`;
      } else html += "</li>";
      const task = m[3].match(/^\[([ xX])\]\s+(.*)$/);
      html += task ? `<li class="task"><span class="tk">${task[1] === " " ? "○" : "✓"}</span>${inline(task[2])}` : `<li>${inline(m[3])}`;
    }
    closeTo(0);
    return html;
  }

  function md(src, depth = 0) {
    const lines = String(src ?? "").replace(/\r\n?/g, "\n").split("\n");
    let html = "", para = [];
    const flush = () => { if (para.length) { html += `<p>${para.map(inline).join("<br>")}</p>`; para = []; } };
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const fence = line.match(FENCE);
      if (fence) {
        flush();
        const body = [];
        // sem fechamento (texto ainda chegando): o resto é código
        for (i++; i < lines.length && !(lines[i].trim().startsWith(fence[1][0].repeat(3)) && /^\s*(`{3,}|~{3,})\s*$/.test(lines[i])); i++) body.push(lines[i]);
        const pad = Math.min(...body.filter((l) => l.trim()).map((l) => l.match(/^\s*/)[0].length), width(line.match(/^\s*/)[0]));
        html += `<pre>${fence[2] ? `<span class="lang">${esc(fence[2])}</span>` : ""}<code>${esc(body.map((l) => l.slice(Number.isFinite(pad) ? pad : 0)).join("\n"))}</code></pre>`;
        continue;
      }
      if (!line.trim()) { flush(); continue; }
      const h = line.match(HEADING);
      if (h) { flush(); const n = Math.min(h[1].length + 1, 4); html += `<h${n}>${inline(h[2])}</h${n}>`; continue; }
      if (RULE.test(line)) { flush(); html += "<hr>"; continue; }
      if (QUOTE.test(line) && depth < 4) {
        flush();
        const body = [];
        for (; i < lines.length && QUOTE.test(lines[i]); i++) body.push(lines[i].match(QUOTE)[1]);
        i--;
        html += `<blockquote>${md(body.join("\n"), depth + 1)}</blockquote>`;
        continue;
      }
      if (line.includes("|") && i + 1 < lines.length && TABLE_SEP.test(lines[i + 1]) && lines[i + 1].includes("-") && cells(lines[i + 1]).length === cells(line).length) {
        flush();
        const rows = [];
        let j = i + 2;
        for (; j < lines.length && lines[j].trim() && lines[j].includes("|"); j++) rows.push(lines[j]);
        html += table(line, lines[i + 1], rows);
        i = j - 1;
        continue;
      }
      if (ITEM.test(line)) {
        flush();
        const body = [];
        for (; i < lines.length; i++) {
          const l = lines[i];
          if (ITEM.test(l) && !RULE.test(l)) { body.push(l); continue; }
          if (FENCE.test(l)) break;
          if (l.trim() && /^\s{2,}/.test(l)) { body.push(l); continue; }
          // linha em branco só continua a lista se o que vem depois ainda é item
          if (!l.trim() && i + 1 < lines.length && (ITEM.test(lines[i + 1]) && !RULE.test(lines[i + 1]))) continue;
          break;
        }
        i--;
        html += list(body);
        continue;
      }
      para.push(line.trim());
    }
    flush();
    return html;
  }

  root.md = md;
  root.mdInline = inline;
})(typeof window !== "undefined" ? window : globalThis);

// Aplica um aviso da conversa ao vivo (ver `watch` em convos.ts) no que a página já tem.
// O primeiro aviso de cada conexão traz tudo; os outros, só o que mudou.
(function (root) {
  root.applyStream = function (chat, ev) {
    const c = ev.first || !chat ? { messages: [] } : chat;
    const messages = c.messages;
    for (const k of Object.keys(c)) delete c[k];
    Object.assign(c, ev.meta, { messages });
    for (const m of ev.msgs) {
      const items = m.len < 0 ? null : messages[m.i]?.items || [];
      if (items) { for (const [j, it] of m.at) items[j] = it; items.length = m.len; }
      messages[m.i] = items ? { ...m.head, items } : { ...m.head };
    }
    messages.length = ev.n;
    return c;
  };
})(typeof window !== "undefined" ? window : globalThis);

// O servidor de mentira da demonstração do site. Vive dentro da página: responde o que o painel pede
// por fetch em /api/... e pela conversa ao vivo (EventSource), com um dia de trabalho de exemplo e os
// agentes de mentira de scripts/demo-cenas.ts. Nada sai para a rede e nada toca em máquina nenhuma.
// O tempo dos agentes corre num relógio próprio, que o roteiro (roteiro.js) para e solta.
(function (root) {
  "use strict";
  const D = root.REVOADA_DEMO;
  const CENAS = D.cenas.map((c) => ({ ...c, quando: new RegExp(c.quando[0], c.quando[1]) }));
  const HOME = "/Users/dev", GIT = `${HOME}/git`, API = `${GIT}/loja-api`, WEB = `${GIT}/loja-web`, COPIAS = `${HOME}/.revoada/worktrees/`;
  const DIRS = [HOME, GIT, API, `${API}/tests`, `${API}/db`, `${API}/src`, WEB, `${WEB}/tests`, `${WEB}/src`];
  const MIN = 60_000;
  const PROV = { claude: "Claude", codex: "Codex", gemini: "Gemini", grok: "Grok" };
  const NAO_RODA = "Na demonstração isso não roda.";
  const PADRAO = "Esta é uma demonstração: os agentes aqui são de mentira e só sabem responder aos pedidos de exemplo. Instale a Revoada para pedir de verdade, com as suas contas.";
  const LIMITE = "Claude usage limit reached. Try again in 2 hours 14 minutes";
  const SUPERVISOR = (pedido) => `Você é o supervisor de uma equipe de agentes de código. Divida o pedido abaixo em tarefas que agentes diferentes possam fazer ao mesmo tempo, cada um numa cópia própria deste repositório.\n\n<pedido>\n${pedido}\n</pedido>`;

  // ---------- relógio ----------
  const relogio = { t: 0, fila: [] };
  function depois(ms, fn) { const x = { em: relogio.t + ms, fn }; relogio.fila.push(x); return x; }
  function avanca(ms) {
    relogio.t += ms;
    for (;;) {
      const x = relogio.fila.filter((y) => y.em <= relogio.t).sort((a, b) => a.em - b.em)[0];
      if (!x) return;
      relogio.fila.splice(relogio.fila.indexOf(x), 1);
      x.fn();
    }
  }

  // ---------- estado ----------
  let E, seq = 0, desloc = 0, epoca = 0;
  const priv = new Map(); // conversa -> o que o servidor guarda e a página não vê
  const olhando = new Map(); // conversa -> avisos de quem está com ela aberta
  const agora = () => Date.now() + desloc;
  const id = () => ((++seq * 2654435761) >>> 0).toString(16).padStart(8, "0");
  const base = (p) => p.split("/").filter(Boolean).pop() || "/";
  const conta = (x) => E.accounts.find((a) => a.id === x);
  const conversa = (x) => E.convos.find((c) => c.id === x);
  const nomeConta = (a) => `${PROV[a.provider]} · ${a.label}`;
  const pronta = (a) => a.status.ok && !a.limit;
  const escolhe = (alvo) => (alvo.startsWith("pool:") ? E.accounts.find((a) => a.provider === alvo.slice(5) && pronta(a)) : pronta(conta(alvo) || { status: {} }) ? conta(alvo) : null) || null;
  const ehAlvo = (t) => typeof t === "string" && (t.startsWith("pool:") ? !!PROV[t.slice(5)] : !!conta(t));
  const pasta = (d) => (typeof d === "string" && (DIRS.includes(d) || d.startsWith(COPIAS)) ? d : null);
  const raiz = (d) => (d.startsWith(COPIAS) ? `${GIT}/${d.slice(COPIAS.length).split("/")[0]}` : d === API || d.startsWith(API + "/") ? API : d === WEB || d.startsWith(WEB + "/") ? WEB : null);
  const modo = (m) => (["read", "ask", "edit", "full"].includes(m) ? m : "ask");
  function nao(msg, status = 400) { const e = new Error(msg); e.status = status; throw e; }
  const lesma = (s) => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 28).replace(/-$/, "");
  function copia(cwd, pedido) {
    const main = raiz(cwd), nome = `${lesma(pedido)}-${id().slice(0, 4)}`;
    return { main, path: `${COPIAS}${base(main)}/${nome}`, branch: `revoada/${nome}` };
  }

  // a página fica sabendo na hora do que mudou na lateral, sem esperar a consulta de 4 em 4 segundos
  let aviso = null;
  function mudou() {
    if (aviso || typeof root.refresh !== "function") return;
    aviso = setTimeout(() => { aviso = null; try { Promise.resolve(root.refresh()).catch(() => {}); } catch {} }, 90);
  }
  function toca(c, lateral) {
    c.rev++; c.at = agora();
    for (const kick of olhando.get(c.id) || []) kick();
    if (lateral) mudou();
  }

  // Conversa ao vivo, como `watch` em convos.ts: o primeiro aviso leva tudo, os seguintes só o que mudou.
  function assiste(cid, push) {
    if (!conversa(cid)) return null;
    let seen = 0, cacheAt = -1, last = 0, timer = null, first = true, closed = false, ep = priv.get(cid).epoca;
    const cache = [], aqui = epoca;
    const emit = () => {
      timer = null;
      if (closed) return;
      last = Date.now();
      const c = conversa(cid);
      if (!c || aqui !== epoca) return push({ gone: true });
      const { messages, ...meta } = c;
      if (priv.get(cid).epoca !== ep) { ep = priv.get(cid).epoca; seen = 0; cacheAt = -1; first = true; }
      const msgs = [];
      for (let i = Math.max(0, seen - 1); i < messages.length; i++) {
        const { items, ...head } = messages[i];
        if (i !== cacheAt) { cache.length = 0; cacheAt = i; }
        const at = [];
        (items || []).forEach((it, j) => { const s = JSON.stringify(it); if (cache[j] !== s) { cache[j] = s; at.push([j, it]); } });
        cache.length = items ? items.length : 0;
        msgs.push({ i, head, at, len: items ? items.length : -1 });
      }
      seen = messages.length;
      push({ ...(first ? { first: true } : {}), meta, n: messages.length, msgs });
      first = false;
    };
    const kick = () => { if (!timer && !closed) timer = setTimeout(emit, Math.max(0, 30 - (Date.now() - last))); };
    if (!olhando.has(cid)) olhando.set(cid, new Set());
    olhando.get(cid).add(kick);
    emit();
    return () => { closed = true; clearTimeout(timer); olhando.get(cid)?.delete(kick); };
  }

  // ---------- agentes de mentira ----------
  function novaConversa(o) {
    const c = { id: id(), title: o.title || o.prompt.split("\n")[0].slice(0, 80) || "Conversa", cwd: o.cwd, target: o.target, mode: modo(o.mode), brain: o.brain !== false, accountId: null, provider: null, native: null, messages: [], working: false, at: agora(), rev: 0, waiting: false };
    if (o.worktree) c.worktree = o.worktree;
    if (o.title) c.titled = true;
    E.convos.push(c);
    priv.set(c.id, { epoca: 0, mao: 0, run: null, pede: null, sempre: false });
    fala(c, o.prompt, o);
    return c;
  }
  function fala(c, texto, o = {}) {
    c.messages.push({ role: "user", at: agora(), text: texto });
    delete c.suggest;
    responde(c, texto, o);
  }
  function responde(c, dito, o) {
    const p = priv.get(c.id), run = (p.run = {});
    let inst = !!o.instant, auto = o.auto || 0, a = (o.conta && conta(o.conta)) || escolhe(c.target), n = 0;
    const m = { role: "assistant", at: agora(), items: [], state: "working", accountId: a ? a.id : undefined, sent: { ask: dito.length, brain: 0, handoff: 0, resumed: !!c.native } };
    c.messages.push(m);
    if (!a) { m.state = "error"; m.error = "Nenhuma conta pronta para esse pedido."; m.endedAt = agora(); return toca(c, true); }
    c.working = true; c.accountId = a.id; c.provider = a.provider; a.lastUsed = agora();
    if (a.provider === "claude") m.model = "claude-sonnet-4-5";
    const sabe = a.provider === "claude" || a.provider === "codex";
    const cena = sabe && !o.plano ? CENAS.find((x) => x.quando.test(dito)) : null;
    const passos = o.plano ? [{ texto: `${D.plano.fala}\n\n\`\`\`json\n${JSON.stringify({ tarefas: D.plano.tarefas })}\n\`\`\`` }] : cena ? cena.passos : [{ texto: PADRAO }];
    const claude = () => a.provider === "claude";
    const k = (s) => `${p.mao}:${claude() ? s : `item_${n}`}`;
    const espera = (ms, fn) => { if (inst) { desloc += ms; return fn(); } depois(ms, () => { if (p.run === run) fn(); }); };
    const fim = (estado = "done") => {
      m.state = estado; m.endedAt = agora();
      if (estado === "done") {
        m.tokens = claude() ? { in: 4400, out: 700, cache: 41000, usd: 0.04 } : { in: 1300, out: 420, cache: 3900 };
        if (claude()) m.ctx = { used: 46100, window: 200000 };
        c.native = { accountId: a.id, sessionId: `s-${c.id}` };
        if (cena && cena.sugestao && E.settings.suggest) c.suggest = cena.sugestao;
      }
      if (cena && !c.titled) c.title = cena.titulo;
      c.titled = true; c.working = false; c.waiting = false; p.run = null;
      toca(c, true);
      if (o.aoFim) o.aoFim(c);
      if (c.queue && c.queue.length && !c.working) { const q = c.queue.shift(); if (!c.queue.length) delete c.queue; fala(c, q.text); }
    };
    const escreve = (texto, cont) => {
      n++;
      const it = { k: k(`m${n}:b0`), text: "", output: "", kind: "text" };
      m.items.push(it);
      if (inst || !claude()) { it.text = texto; toca(c); return espera(claude() ? 0 : 500, cont); }
      const mais = () => { it.text = texto.slice(0, it.text.length + 9); toca(c); it.text.length < texto.length ? espera(40, mais) : espera(200, cont); };
      mais();
    };
    const passo = (i) => {
      if (p.run !== run) return;
      const s = passos[i], prox = () => passo(i + 1);
      if (!s) return fim();
      if ("limite" in s) {
        if (a.id !== "claude-padrao") return prox();
        a.limit = { until: agora() + 134 * MIN, reason: LIMITE, at: agora() };
        a.usage = a.usage.map((u) => (u.key === "five_hour" ? { ...u, pct: 100 } : u));
        const b = E.settings.rotate ? escolhe(`pool:${a.provider}`) : null;
        if (!b) { m.error = LIMITE; return fim("error"); }
        m.items.push({ k: `note:${m.items.length}`, kind: "note", text: `${nomeConta(a)} bateu no limite. Continuando em ${nomeConta(b)}, com a conversa.`, tone: "amber" });
        p.mao++; n = 0; a = b; m.accountId = c.accountId = b.id; m.sent.handoff = 569; b.lastUsed = agora();
        toca(c, true);
        return espera(1800, prox);
      }
      if ("demora" in s) return inst ? undefined : espera(s.demora, prox);
      if ("texto" in s) return escreve(s.texto, prox);
      n++;
      const it = "ler" in s ? (claude() ? { k: k(`t${n}`), text: "", output: "", kind: "tool", name: "Read", detail: s.ler, status: "in_progress" } : { k: k(), text: "", output: "", kind: "cmd", command: `sed -n '1,120p' ${s.ler}`, exit: null, status: "in_progress" })
        : "editar" in s ? { k: k(`t${n}`), text: "", output: "", kind: "files", changes: [{ path: s.editar, kind: s.novo ? "add" : "update" }], status: "completed", ...(claude() ? { exit: 0 } : {}) }
        : { k: k(`t${n}`), text: "", output: "", kind: "cmd", command: s.rodar, exit: null, status: "in_progress", ...(claude() ? { desc: s.desc } : {}) };
      m.items.push(it);
      const faz = () => {
        toca(c);
        if ("editar" in s) return espera(900, prox);
        if ("rodar" in s && s.saida == null) return prox(); // comando ainda rodando
        espera("ler" in s ? 700 : 1500, () => { it.status = "completed"; it.exit = 0; if ("rodar" in s) it.output = s.saida; toca(c); espera(250, prox); });
      };
      if (!s.pede || !claude() || c.mode !== "ask" || p.sempre) return faz();
      // o agente para e pergunta; segue quando a pessoa responde
      n++;
      const ask = { k: `${p.mao}:ask:r${n}`, kind: "ask", req: `r${n}`, tool: "rodar" in s ? "Bash" : s.novo ? "Write" : "Edit", detail: "rodar" in s ? s.rodar : s.editar, state: "pending" };
      m.items.push(ask);
      c.waiting = true;
      p.pede = { req: ask.req, cont: (dec) => {
        p.pede = null; c.waiting = false; ask.state = dec === "deny" ? "denied" : "allowed";
        if (dec === "always") p.sempre = true;
        if (dec !== "deny") return faz();
        m.items.splice(m.items.indexOf(it), 1);
        escreve("Sem essa permissão eu paro aqui. Diga como prefere seguir.", fim);
      } };
      if (inst && auto > 0) { auto--; return p.pede.cont("allow"); }
      inst = false;
      toca(c, true);
    };
    if (cena && !c.titled) espera(1300, () => { c.title = cena.titulo; c.titled = true; toca(c, true); });
    toca(c, true);
    espera(800, () => passo(0));
  }
  // outra conta, de outro provedor, lê o que mudou
  function revisa(c, o = {}) {
    const autor = conta(c.accountId), r = E.accounts.find((a) => (a.provider === "claude" || a.provider === "codex") && a.provider !== (autor && autor.provider) && pronta(a));
    if (!r) nao("nenhuma conta de outro provedor pronta para revisar");
    const p = priv.get(c.id), run = (p.run = {});
    const m = { role: "assistant", at: agora(), items: [], state: "working", accountId: r.id, review: true, ...(o.kind ? { reviewKind: o.kind } : {}) };
    c.messages.push(m); c.working = true;
    const fecha = () => {
      m.items.push({ k: "0:item_1", text: D.revisao, output: "", kind: "text" });
      m.state = "done"; m.tokens = { in: 1300, out: 420, cache: 3900 }; m.endedAt = agora();
      c.working = false; p.run = null;
      toca(c, true);
      if (o.aoFim) o.aoFim();
    };
    toca(c, true);
    if (o.instant) { desloc += 12_000; return fecha(); }
    depois(2600, () => { if (p.run === run) fecha(); });
    return r;
  }
  function para(c) {
    const p = priv.get(c.id), m = c.messages[c.messages.length - 1];
    if (!c.working) return;
    p.run = null; p.pede = null;
    for (const it of m.items || []) { if (it.kind === "ask" && it.state === "pending") it.state = "denied"; if (it.status === "in_progress") { it.status = "failed"; if (it.kind === "cmd") it.exit = 130; } }
    m.state = "stopped"; m.endedAt = agora();
    c.working = false; c.waiting = false;
    toca(c, true);
  }

  // ---------- tarefas, rotinas e supervisor ----------
  const vistaCartao = (k) => { const c = k.convo && conversa(k.convo); return { ...k, working: !!(c && c.working), waiting: !!(c && c.waiting) }; };
  const cartao = (x) => E.cards.find((k) => k.id === x) || nao("tarefa não existe", 404);
  function novoCartao(prompt, cwd, target) { const k = { id: id(), title: prompt.split("\n")[0].slice(0, 80), prompt, cwd, target, at: agora(), state: "todo" }; E.cards.push(k); return k; }
  function comeca(k, o = {}) {
    if (k.state !== "todo") nao("esta tarefa já começou");
    const wt = copia(k.cwd, k.prompt);
    k.state = "doing";
    const c = novaConversa({ prompt: k.prompt, target: k.target, cwd: wt.path, worktree: wt, mode: "edit", title: k.title, ...o, aoFim: (conv) => {
      if (k.convo && k.convo !== conv.id) return;
      k.convo = conv.id;
      if (k.state !== "doing" || conv.messages[conv.messages.length - 1].state !== "done") return mudou();
      k.state = "review";
      try { revisa(conv, { instant: o.instant, aoFim: () => { k.reviewed = true; mudou(); } }); } catch {}
      mudou();
    } });
    k.convo = c.id;
    return vistaCartao(k);
  }
  function move(k, para_) {
    if (!["todo", "doing", "review", "done"].includes(para_)) nao("lista não existe");
    if (para_ === "doing" && k.state === "todo") return comeca(k);
    if (para_ === "todo") { const c = k.convo && conversa(k.convo); if (c && c.working) nao("pare o agente antes de devolver a tarefa"); delete k.convo; delete k.reviewed; }
    k.state = para_;
    return vistaCartao(k);
  }
  function proxima(s) {
    if (s.kind !== "daily") return s.at && s.at > agora() ? s.at : undefined;
    const [h, mi] = String(s.time || "03:00").split(":").map(Number);
    for (let d = 0; d < 8; d++) {
      const t = new Date(agora()); t.setDate(t.getDate() + d); t.setHours(h, mi, 0, 0);
      if (t.getTime() > agora() && (!s.days || !s.days.length || s.days.includes(t.getDay()))) return t.getTime();
    }
  }
  function novaRotina(b) {
    const s = { prompt: b.prompt, cwd: b.cwd, target: b.target, mode: modo(b.mode), brain: b.brain !== false, isolate: !!b.isolate, kind: b.kind === "daily" ? "daily" : "once", ...(b.kind === "daily" ? { time: typeof b.time === "string" ? b.time : "03:00", days: Array.isArray(b.days) ? b.days.map(Number) : [] } : { at: Number(b.at) || agora() + 60 * MIN }), id: id(), enabled: true, created: agora() };
    s.next = proxima(s);
    E.schedules.unshift(s);
    return s;
  }
  const rotina = (x) => E.schedules.find((s) => s.id === x) || nao("agendamento não existe", 404);
  function rodaRotina(s, o = {}) {
    const wt = s.isolate && raiz(s.cwd) ? copia(s.cwd, s.prompt) : null;
    const c = novaConversa({ prompt: s.prompt, target: s.target, cwd: wt ? wt.path : s.cwd, worktree: wt || undefined, mode: s.mode, brain: s.brain, ...o });
    s.last = { at: agora(), convo: c.id };
    if (s.kind === "once") s.enabled = false;
    s.next = s.enabled ? proxima(s) : undefined;
    return s;
  }
  const missao = (x) => E.missions.find((m) => m.id === x) || nao("missão não existe", 404);
  function novaMissao(prompt, cwd, workers, o = {}) {
    const m = { id: id(), prompt, cwd, planner: workers[0], workers, at: agora(), state: "planejando", tasks: [] };
    E.missions.push(m);
    m.plan = novaConversa({ prompt: SUPERVISOR(prompt), target: m.planner, cwd, mode: "read", title: `Plano: ${prompt.split("\n")[0].slice(0, 70)}`, plano: true, ...o, aoFim: () => {
      m.state = "plano"; m.note = D.plano.fala;
      m.tasks = D.plano.tarefas.map((t) => ({ title: t.titulo, prompt: t.pedido }));
      mudou();
    } }).id;
    return m;
  }
  function rodaMissao(m) {
    if (m.state !== "plano") nao("este plano já rodou");
    m.state = "rodando";
    m.tasks.forEach((t, i) => {
      const wt = copia(m.cwd, t.title);
      t.branch = wt.branch;
      t.convo = novaConversa({ prompt: t.prompt, target: m.workers[i % m.workers.length], cwd: wt.path, worktree: wt, mode: "edit", title: t.title, aoFim: () => {
        if (m.tasks.every((x) => x.convo && !(conversa(x.convo) || {}).working)) m.state = "pronta";
        mudou();
      } }).id;
    });
    return m;
  }
  const vistaMissao = (m) => ({ ...m, tasks: m.tasks.map((t) => { const c = t.convo ? conversa(t.convo) : null, last = c && c.messages[c.messages.length - 1]; return { ...t, working: !!(c && c.working), waiting: !!(c && c.waiting), state: !t.convo ? "pendente" : !c ? "apagada" : c.working ? (last && last.review ? "em revisão" : "rodando") : last && last.state === "error" ? "erro" : "pronta", who: c && conta(c.accountId) ? nomeConta(conta(c.accountId)) : "" }; }) });

  // ---------- o dia de trabalho de exemplo ----------
  function semeia() {
    epoca++; seq = 0; desloc = 0; relogio.fila.length = 0; priv.clear();
    for (const s of olhando.values()) for (const kick of s) kick();
    olhando.clear();
    const t = Date.now(), uso = (h5, d7, m5, dd) => [{ key: "five_hour", pct: h5, resetsAt: t + m5 * MIN }, { key: "seven_day", pct: d7, resetsAt: t + dd * 1440 * MIN }];
    const c = (cid, provider, label, detail, usage) => ({ id: cid, provider, label, isolated: label !== "pessoal", envKeys: [], status: { ok: true, detail, at: t }, limit: null, lastUsed: null, taught: false, usage });
    E = {
      marks: { pinned: [], archived: [], hidden: [] },
      providers: [{ id: "claude", name: "Claude", installed: true, efforts: ["low", "medium", "high", "xhigh", "max"], auto: true }, { id: "codex", name: "Codex", installed: true, efforts: ["low", "medium", "high"], auto: true }, { id: "gemini", name: "Gemini", installed: true, efforts: [], auto: false }, { id: "grok", name: "Grok", installed: true, efforts: [], auto: false }],
      accounts: [c("claude-padrao", "claude", "pessoal", "Max · voce@exemplo.dev", uso(97, 61, 134, 3)), c("codex-padrao", "codex", "pessoal", "ChatGPT", uso(27, 14, 163, 4)), c("gemini-padrao", "gemini", "pessoal", "voce@exemplo.dev", []), c("grok-padrao", "grok", "pessoal", "logado", []),
        c("claude-trabalho", "claude", "trabalho", "Team · voce@trabalho.exemplo", uso(38, 22, 201, 5)), c("codex-trabalho", "codex", "trabalho", "ChatGPT", uso(9, 6, 163, 4))],
      settings: { agentTools: true, sound: false, autoRead: true, suggest: true, shareTools: false, tidyBrain: false, rotate: true, teach: false, onboarded: true, autoClean: false, importChats: false, keepAwake: true, lidAwake: false, lidFreeze: false, autoReview: false, remote: false, remoteSend: false },
      brain: { vault: `${HOME}/cofre`, syncedAt: t, counts: {}, notes: 0, sections: 0, blocked: {}, topics: { "finanças": true, infra: true }, semantic: { on: false, state: "desligada", pct: 0, model: "bge-m3", indexed: 0, total: 0 } },
      convos: [], cards: [], schedules: [], missions: [],
    };
    const ha = (min, fn) => { desloc = -min * MIN; try { return fn(); } finally { desloc = 0; } };
    const P = D.pedidos, alvos = ["pool:codex", "pool:claude", "pool:codex", "pool:claude", "pool:codex"];
    const cards = ha(184, () => P.tarefas.map((p, i) => novoCartao(p, WEB, alvos[i])));
    ha(183, () => comeca(cards[0], { instant: true }));
    ha(150, () => move(cards[0], "done"));
    ha(171, () => comeca(cards[1], { instant: true, conta: "claude-trabalho" }));
    ha(26, () => comeca(cards[2], { instant: true, conta: "codex-trabalho" }));
    const oito = new Date(t); oito.setHours(8, 0, 0, 0);
    if (oito.getTime() > t - 5 * MIN) oito.setDate(oito.getDate() - 1);
    const suite = ha(2880, () => novaRotina({ prompt: P.suite, cwd: API, target: "pool:claude", mode: "edit", brain: false, kind: "daily", time: "08:00", days: [1, 2, 3, 4, 5] }));
    ha(2879, () => novaRotina({ prompt: P.dependencias, cwd: WEB, target: "pool:codex", mode: "edit", brain: false, isolate: true, kind: "daily", time: "07:30", days: [1] }));
    ha((t - oito.getTime()) / MIN, () => rodaRotina(suite, { instant: true, conta: "claude-trabalho" }));
    ha(41, () => novaMissao(P.missao, WEB, ["pool:claude", "pool:codex"], { instant: true, conta: "claude-trabalho" }));
    ha(6, () => novaConversa({ prompt: P.migracao, target: "pool:claude", cwd: API, mode: "ask", brain: false, instant: true, auto: 1, conta: "claude-trabalho" }));
    for (const a of E.accounts) if (a.lastUsed) a.lastUsed = Math.min(a.lastUsed, t);
    for (const s of E.schedules) s.next = proxima(s);
  }

  // ---------- rotas ----------
  function estado() {
    const t = agora();
    return { home: HOME, projects: GIT, marks: E.marks, providers: E.providers, accounts: E.accounts, settings: E.settings, sessions: [], runs: [], brain: E.brain,
      clones: { scannedAt: t, count: 0, sizeKb: 0, safe: 0 }, cleaned: null, vigil: null, remote: { on: false, port: 4778 }, schedules: E.schedules.length, board: E.cards.filter((k) => k.state !== "done").length,
      missions: E.missions.map((m) => ({ id: m.id, title: m.prompt.split("\n")[0].slice(0, 80), cwd: m.cwd, at: m.at, state: m.state })),
      convos: E.convos.map((c) => ({ id: c.id, title: c.title, cwd: c.cwd, at: c.at, working: c.working, waiting: c.waiting, accountId: c.accountId, target: c.target, startedAt: (c.messages.findLast((m) => m.role === "assistant") || c).at })), history: [] };
  }
  function mudancas(dir) {
    const cs = E.convos.filter((c) => c.cwd === dir), wt = cs.find((c) => c.worktree);
    if (!raiz(dir)) return { repo: false };
    const vistos = new Map();
    for (const c of cs) for (const m of c.messages) for (const it of m.items || []) if (it.kind === "files") for (const ch of it.changes) if (!vistos.has(ch.path)) vistos.set(ch.path, ch.kind);
    const patch = [...vistos].map(([p, kind]) => (kind === "add" ? `diff --git a/${p} b/${p}\nnew file mode 100644\n--- /dev/null\n+++ b/${p}\n@@ -0,0 +1 @@\n+// ${p}` : `diff --git a/${p} b/${p}\n--- a/${p}\n+++ b/${p}\n@@ -1 +1,2 @@\n // ${p}\n+// ajuste de exemplo em ${p}`)).join("\n");
    return { repo: true, branch: wt ? wt.worktree.branch : "main", files: [...vistos].map(([p, kind]) => `${kind === "add" ? "??" : " M"} ${p}`), commits: [], patch, truncated: false };
  }
  function busca(q) {
    const needle = q.toLowerCase(), out = [];
    for (const c of [...E.convos].sort((a, b) => b.at - a.at)) for (const m of c.messages) {
      const text = m.role === "user" ? m.text || "" : (m.items || []).filter((i) => i.kind === "text").map((i) => i.text).join("\n"), at = text.toLowerCase().indexOf(needle);
      if (at < 0) continue;
      out.push({ id: c.id, title: c.title, cwd: c.cwd, at: m.at, who: m.role === "user" ? "você" : "agente", snippet: text.slice(Math.max(0, at - 70), at + needle.length + 110).replace(/\s+/g, " ").trim() });
      break;
    }
    return out.slice(0, 30);
  }
  const ARRUMACAO = { total: 0, empty: [], copies: [], similar: [], stale: [] };
  const ferramentas = () => ({ on: E.settings.shareTools, skills: { claude: 0, codex: 0, gemini: 0, grok: 0 }, mcp: { claude: [], codex: [] }, accounts: E.accounts.filter((a) => a.isolated && (a.provider === "claude" || a.provider === "codex")).map((a) => ({ id: a.id, linked: 0, own: 0 })) });

  function rota(metodo, caminho, q, b) {
    const [recurso, x, acao, extra] = caminho.split("/").map(decodeURIComponent), POST = metodo === "POST", GET = metodo === "GET", DEL = metodo === "DELETE";
    if (recurso === "state") return estado();
    if (recurso === "dirs") return DIRS;
    if (recurso === "ls") { const dir = (q.get("dir") || HOME).replace(/(.)\/+$/, "$1"), filhos = [...new Set(DIRS.filter((d) => d.startsWith(dir + "/")).map((d) => d.slice(dir.length + 1).split("/")[0]))]; return { dir, exists: dir === "" || DIRS.includes(dir), parent: dir.split("/").slice(0, -1).join("/") || "/", subs: filhos }; }
    if (recurso === "chat" && POST) {
      const prompt = String(b.prompt || "").trim(), alvos = Array.isArray(b.targets) ? b.targets.filter(ehAlvo) : [], cwd = pasta(b.cwd);
      if (!alvos.length) nao("escolha ao menos uma conta");
      if (!cwd) nao("pasta não existe");
      if (b.terminal) nao("Na demonstração o terminal não roda: ele abriria o CLI de verdade.");
      if (alvos.length > 1) nao("Na demonstração o pedido vai para uma conta por vez.");
      if (!prompt) nao("escreva o pedido");
      const wt = b.isolate && raiz(cwd) ? copia(cwd, prompt) : null;
      return { kind: "chat", id: novaConversa({ prompt, target: alvos[0], cwd: wt ? wt.path : cwd, worktree: wt || undefined, mode: b.mode, brain: b.brain }).id };
    }
    if (recurso === "attach") nao("Na demonstração não dá para anexar arquivo.");
    if (recurso === "history") return POST ? nao(NAO_RODA) : { counts: {}, items: [] };
    if (recurso === "convos") {
      const c = conversa(x) || nao("conversa não existe", 404), p = priv.get(c.id);
      if (DEL && acao === "queue") { if (c.queue && c.queue[+extra]) { c.queue.splice(+extra, 1); if (!c.queue.length) delete c.queue; toca(c); } return { ok: true }; }
      if (DEL) { para(c); E.convos.splice(E.convos.indexOf(c), 1); for (const kick of olhando.get(c.id) || []) kick(); mudou(); return { ok: true }; }
      if (POST && acao === "stop") { para(c); return { ok: true }; }
      if (acao === "plan") return POST ? nao("Na demonstração o agente não escreve plano em arquivo.") : { on: false, text: "", total: 0, done: 0, file: "" };
      if (POST && acao === "rewind") {
        const i = Number(b.index), u = c.messages[i];
        if (c.working) nao("espere o agente terminar");
        if (!u || u.role !== "user") nao("mensagem não existe");
        c.messages.length = i; c.native = null; p.epoca++;
        fala(c, typeof b.text === "string" && b.text.trim() ? b.text : u.text);
        return { ok: true };
      }
      if (POST && acao === "review") { if (c.working) nao("espere o agente terminar"); return { ok: true, reviewer: revisa(c, b.kind === "security" ? { kind: "security" } : {}).id }; }
      if (POST && acao === "decide") { if (!p.pede || p.pede.req !== String(b.req)) nao("esse pedido de permissão não está mais esperando"); p.pede.cont(b.decision === "always" ? "always" : b.decision === "allow" ? "allow" : "deny"); toca(c, true); return { ok: true }; }
      if (POST && acao === "send") {
        const text = String(b.text || "").trim();
        if (!text) nao("escreva a mensagem");
        if (c.working) { (c.queue = c.queue || []).push({ text }); toca(c); return { ok: true, queued: true }; }
        if (ehAlvo(b.target)) c.target = b.target;
        if (b.mode) c.mode = modo(b.mode);
        fala(c, text);
        return { ok: true, queued: false };
      }
      return q.get("rev") === String(c.rev) ? { rev: c.rev, same: true } : c;
    }
    if (recurso === "brain") {
      if (GET && x === "search") return [];
      if (GET && x === "blocked") return [];
      if (GET && x === "tidy") return ARRUMACAO;
      if (POST && x === "rules") { if (typeof b.topic === "string") E.brain.topics[b.topic] = !!b.on; return E.brain; }
      if (POST && x === "sync") { E.brain.syncedAt = agora(); return E.brain; }
      if (POST) nao("Na demonstração não há cofre de verdade: o cérebro fica vazio.");
      return E.brain;
    }
    if (recurso === "vigil") return { ok: true };
    if (recurso === "board") {
      if (POST && !x) {
        const prompt = String(b.prompt || "").trim(), cwd = pasta(b.cwd);
        if (!prompt) nao("escreva a tarefa");
        if (!cwd || !raiz(cwd)) nao("as tarefas rodam em cópias isoladas: escolha uma pasta que seja um repositório git");
        if (!ehAlvo(b.target)) nao("escolha quem vai fazer a tarefa");
        const linhas = b.split ? prompt.split("\n").map((l) => l.replace(/^\s*(?:[-*]|\d+[.)])\s+/, "").trim()).filter(Boolean).slice(0, 30) : [prompt];
        const novos = linhas.map((l) => vistaCartao(novoCartao(l, raiz(cwd), b.target)));
        mudou();
        return novos;
      }
      if (POST && acao === "start") return comeca(cartao(x));
      if (POST && acao === "move") return move(cartao(x), String(b.to));
      if (DEL) { E.cards.splice(E.cards.indexOf(cartao(x)), 1); return { ok: true }; }
      return E.cards.map(vistaCartao);
    }
    if (recurso === "search") { const s = (q.get("q") || "").trim(); return { chats: s.length < 3 ? [] : busca(s), history: [] }; }
    if (recurso === "schedules") {
      if (POST && !x) {
        const prompt = String(b.prompt || "").trim(), cwd = pasta(b.cwd);
        if (!prompt) nao("escreva o pedido que vai ser agendado");
        if (!cwd) nao("pasta não existe");
        if (!ehAlvo(b.target)) nao("escolha uma conta para o agendamento");
        return novaRotina({ ...b, prompt, cwd });
      }
      if (POST && acao === "run") return rodaRotina(rotina(x));
      if (POST && (acao === "on" || acao === "off")) { const s = rotina(x); s.enabled = acao === "on"; s.next = s.enabled ? proxima(s) : undefined; return s; }
      if (DEL) { E.schedules.splice(E.schedules.indexOf(rotina(x)), 1); return { ok: true }; }
      return E.schedules;
    }
    if (recurso === "missions") {
      if (POST && !x) {
        const prompt = String(b.prompt || "").trim(), cwd = pasta(b.cwd), workers = (Array.isArray(b.targets) ? b.targets : []).filter(ehAlvo);
        if (!prompt) nao("escreva o pedido que o supervisor vai dividir");
        if (!cwd || !raiz(cwd)) nao("o supervisor trabalha com cópias isoladas: escolha uma pasta que seja um repositório git");
        if (!workers.length) nao("escolha ao menos uma conta");
        return novaMissao(prompt, raiz(cwd), workers);
      }
      if (POST && acao === "start") return vistaMissao(rodaMissao(missao(x)));
      if (POST && acao === "merge") nao("Na demonstração não há branch de verdade para juntar.");
      if (DEL) { E.missions.splice(E.missions.indexOf(missao(x)), 1); return { ok: true }; }
      return x ? vistaMissao(missao(x)) : E.missions;
    }
    if (recurso === "tools") { if (POST && typeof b.on === "boolean") E.settings.shareTools = b.on; return { ...(POST ? { did: { linked: 0, removed: 0 } } : {}), ...ferramentas() }; }
    if (recurso === "remote") return POST ? nao("Na demonstração o acompanhamento pelo celular fica desligado.") : { on: false, port: 4778, links: [], send: false };
    if (recurso === "rename" && POST) {
      const title = String(b.title || "").trim().slice(0, 80), c = conversa(String(b.id));
      if (!title) nao("o título não pode ficar vazio");
      if (b.type !== "chat" || !c) nao("este item não tem título editável");
      c.title = title; c.titled = true; toca(c, true);
      return { ok: true };
    }
    if (recurso === "diff") return mudancas(pasta(q.get("cwd")) || "");
    if (recurso === "repo") { const d = pasta(q.get("cwd")); return { repo: !!(d && raiz(d)), branch: d && raiz(d) ? "main" : "", busy: !!d && E.convos.some((c) => c.working && c.cwd === d) }; }
    if (recurso === "clones") return POST ? nao(NAO_RODA) : { scannedAt: agora(), count: 0, sizeKb: 0, safe: 0, items: [] };
    if (recurso === "marks" && POST) {
      const keys = (Array.isArray(b.keys) ? b.keys : [b.key]).filter((k) => typeof k === "string");
      for (const kind of ["pinned", "archived", "hidden"]) { if (typeof b[kind] !== "boolean") continue; const set = new Set(E.marks[kind]); for (const k of keys) b[kind] ? set.add(k) : set.delete(k); E.marks[kind] = [...set]; }
      return E.marks;
    }
    if (recurso === "settings" && POST) { for (const k of Object.keys(E.settings)) if (typeof b[k] === "boolean" && k !== "remote" && k !== "remoteSend") E.settings[k] = b[k]; return E.settings; }
    if (recurso === "limits" && DEL) { const a = conta(x); if (a) a.limit = null; return { ok: true }; }
    if (recurso === "accounts") {
      if (POST && !x) nao("Na demonstração não dá para adicionar conta: o login abre o CLI de verdade.");
      const a = conta(x) || nao("conta não existe", 404);
      if (metodo === "PATCH") { if (typeof b.label === "string" && b.label.trim()) a.label = b.label.trim().slice(0, 60); return { ok: true }; }
      if (DEL) { if (!a.isolated) nao("a conta padrão da máquina não sai daqui"); E.accounts.splice(E.accounts.indexOf(a), 1); return { ok: true }; }
    }
    if (recurso === "sessions") nao("Na demonstração o terminal não roda: ele abriria o CLI de verdade.");
    if (recurso === "runs" && GET && !x) return [];
    nao("rota não existe", 404);
  }
  function pede(metodo, caminho, corpo) {
    const u = new URL(caminho, "http://demo/");
    return JSON.parse(JSON.stringify(rota(metodo, u.pathname.slice(1), u.searchParams, corpo || {})));
  }

  // ---------- o que a página enxerga: fetch e a conversa ao vivo ----------
  const json = (dado, status = 200) => new Response(JSON.stringify(dado), { status, headers: { "content-type": "application/json" } });
  root.fetch = async (entrada, init = {}) => {
    const u = new URL(typeof entrada === "string" ? entrada : entrada.url, root.location ? root.location.href : "http://demo/");
    const m = u.pathname.match(/\/api\/(.*)$/);
    await new Promise((r) => setTimeout(r, 12));
    if (!m) return /\/logo\.svg$/.test(u.pathname) ? new Response(D.logo, { headers: { "content-type": "image/svg+xml" } }) : new Response("a demonstração não usa a rede", { status: 404 });
    let corpo = {};
    try { if (typeof init.body === "string") corpo = JSON.parse(init.body); } catch {}
    try { return json(rota(String(init.method || "GET").toUpperCase(), m[1], u.searchParams, corpo)); }
    catch (e) { if (!e.status) throw e; return json({ error: e.message }, e.status); }
  };
  root.EventSource = class {
    constructor(url) {
      this.readyState = 0; this.onmessage = null; this.onerror = null;
      const cid = decodeURIComponent((String(url).match(/convos\/([^/]+)\/stream/) || [])[1] || "");
      setTimeout(() => {
        if (this.readyState === 2) return;
        this.readyState = 1;
        this.off = assiste(cid, (ev) => this.onmessage && this.onmessage({ data: JSON.stringify(ev) }));
        if (!this.off) { this.readyState = 2; if (this.onerror) this.onerror(); }
      }, 0);
    }
    close() { this.readyState = 2; if (this.off) this.off(); }
  };
  root.WebSocket = class { constructor() { throw new Error("a demonstração não abre terminal"); } };

  semeia();
  D.servidor = { relogio, depois, avanca, reinicia: semeia, pede, API, WEB };
})(typeof window !== "undefined" ? window : globalThis);

// O roteiro da demonstração do site: usa o painel como uma pessoa usaria (escreve no campo, clica nos
// botões de verdade), com um cursor de exemplo, cena por cena, em laço. Só anda com a demonstração
// visível e a janela em foco. Se o visitante clicar ou digitar, o roteiro para e a tela é dele.
// A página de fora conversa com esta por postMessage (ver o topo de scripts/site-demo.ts).
(function () {
  "use strict";
  const D = window.REVOADA_DEMO, srv = D.servidor, P = D.pedidos;
  const dentro = window.parent !== window;

  // nada do que o visitante faz aqui fica guardado no navegador dele
  const mem = new Map([["cwd", srv.API]]);
  Object.defineProperty(window, "localStorage", { configurable: true, value: { getItem: (k) => (mem.has(k) ? mem.get(k) : null), setItem: (k, v) => void mem.set(k, String(v)), removeItem: (k) => void mem.delete(k) } });
  // o painel põe o foco no campo a cada tela; dentro do site isso não pode rolar a página de fora nem
  // tirar o teclado de quem está lendo o resto
  const foca = HTMLElement.prototype.focus;
  HTMLElement.prototype.focus = function () { if (!dentro || document.hasFocus()) foca.call(this, { preventScroll: true }); };

  // o alvo de um gesto é um seletor ou uma função: a tela se redesenha, então ele é procurado de novo na hora de usar
  const $ = (x) => (typeof x === "string" ? document.querySelector(x) : typeof x === "function" ? x() : x);
  const diz = (m) => { if (dentro) window.parent.postMessage(m, location.origin); };
  class Parou extends Error {}
  let vez = null, pausado = false, naTela = !dentro, cursor = null;

  // ---------- o relógio só anda com alguém olhando ----------
  const emFoco = () => { try { return window.top.document.hasFocus(); } catch { return true; } };
  const olhando = () => !pausado && naTela && document.visibilityState === "visible" && emFoco();
  let antes = performance.now();
  setInterval(() => { const t = performance.now(), dt = Math.min(t - antes, 120); antes = t; if (olhando()) srv.avanca(dt); }, 40);
  if (dentro) new IntersectionObserver((es) => { naTela = es[es.length - 1].intersectionRatio >= 0.3; }, { threshold: [0, 0.3, 0.6] }).observe(document.documentElement);

  // ---------- gestos ----------
  const dorme = (ms) => { const eu = vez; return new Promise((ok, erro) => srv.depois(ms, () => (vez === eu ? ok() : erro(new Parou())))); };
  async function ate(fn, ms = 30_000) {
    for (let t = 0; t < ms; t += 80) { const v = fn(); if (v) return v; await dorme(80); }
    throw new Error("o roteiro esperou demais");
  }
  // rola só as listas de dentro do painel, na mão: scrollIntoView rolaria também a página de fora
  async function mostra(el) {
    for (let p = el.parentElement; p && p !== document.body; p = p.parentElement) {
      if (p.scrollHeight <= p.clientHeight + 1 || !/auto|scroll/.test(getComputedStyle(p).overflowY)) continue;
      const a = el.getBoundingClientRect(), b = p.getBoundingClientRect(), d = a.top < b.top + 8 ? a.top - b.top - 8 : a.bottom > b.bottom - 8 ? a.bottom - b.bottom + 8 : 0;
      if (!d) continue;
      p.scrollTo({ top: p.scrollTop + d, behavior: "smooth" });
      await dorme(420);
    }
  }
  async function aponta(alvo) {
    let el = $(alvo); if (!el) return;
    await mostra(el);
    el = $(alvo) || el;
    const r = el.getBoundingClientRect();
    cursor.classList.add("on");
    cursor.style.transform = `translate(${Math.round(r.left + Math.min(r.width / 2, 120))}px, ${Math.round(r.top + r.height / 2)}px)`;
    await dorme(620);
  }
  async function clica(alvo) {
    if (!$(alvo)) return;
    await aponta(alvo);
    cursor.classList.add("toque");
    await dorme(140);
    cursor.classList.remove("toque");
    $(alvo)?.click();
    await dorme(260);
  }
  async function digita(el, texto) {
    await aponta(el);
    el.classList.add("demo-foco");
    for (let i = 1; i <= texto.length; i++) {
      el.value = texto.slice(0, i);
      el.dispatchEvent(new Event("input", { bubbles: true }));
      await dorme(texto[i - 1] === " " ? 46 : 24 + (i * 7) % 16);
    }
    el.classList.remove("demo-foco");
  }
  // volta o painel e o servidor de mentira para o começo do dia de exemplo
  async function zera() {
    document.querySelectorAll("dialog[open]").forEach((d) => d.close());
    srv.reinicia();
    picked.clear(); supervisor = false; terminal = false; isolate = null; attached = []; rewriting = null;
    for (const c of ["prompt", "boardText", "schedNew", "tq"]) document.getElementById(c).value = "";
    document.querySelector("aside").classList.remove("busca");
    setMode("ask"); setCwd(srv.API);
    go({ type: "home" });
    await refresh();
  }
  const entra = (cena) => diz({ revoada: "cena", cena });

  // ---------- cenas ----------
  const CENAS = {
    // o pedido, os passos, o limite da conta no meio, a permissão e a resposta com a sugestão
    async conversa() {
      entra("conversa");
      await zera();
      await dorme(900);
      await digita($("#prompt"), P.paginacao);
      await dorme(500);
      await clica("#send");
      await ate(() => view.type === "chat" && $("#msgs .sys.amber"));
      entra("limite");
      await dorme(500);
      await aponta('#bots [data-acc="claude-trabalho"]');
      await aponta('#bots [data-acc="claude-padrao"]');
      await dorme(1500);
      await aponta('#bots [data-acc="claude-trabalho"]');
      await dorme(900);
      entra("conversa");
      const permitir = '#msgs [data-decide="allow"]:not(:disabled)';
      await ate(() => $(permitir) || (chat && !chat.working));
      if ($(permitir)) { await dorme(1500); await clica(permitir); }
      await ate(() => chat && !chat.working);
      await dorme(700);
      await aponta("#prompt");
      await dorme(3400);
    },
    // a conta bate no limite, a conversa segue na outra e a tela de Contas mostra quem parou
    async limite() {
      entra("limite");
      await zera();
      const { id } = srv.pede("POST", "chat", { prompt: P.paginacao, targets: ["pool:claude"], cwd: srv.API, mode: "edit", brain: false });
      await refresh();
      go({ type: "chat", id });
      await ate(() => $("#msgs .sys.amber"));
      await dorme(700);
      await aponta('#bots [data-acc="claude-trabalho"]');
      await aponta('#bots [data-acc="claude-padrao"]');
      await dorme(1700);
      await clica('#bots [data-acc="claude-padrao"]');
      await dorme(1600);
    },
    async precisa() {
      entra("precisa");
      await clica('aside [data-go="need"]');
      const permitir = '#needList [data-need-decide="allow"]';
      await ate(() => $(permitir) || (view.type === "need" && $("#needList .vazio")));
      await dorme(1900);
      if ($(permitir)) { await clica(permitir); await ate(() => !$(permitir)); }
      await dorme(2600);
    },
    async tarefas() {
      entra("tarefas");
      await clica('aside [data-go="board"]');
      await ate(() => $("#board .card"));
      await dorme(1700);
      if ($("#boardAll").style.display !== "none") {
        await clica("#boardAll");
        await ate(() => !$('#board [data-col="todo"] .card'));
        await ate(() => document.querySelectorAll("#board .st.run").length <= 1, 40_000);
      }
      await dorme(2400);
    },
    async rotinas() {
      entra("rotinas");
      await clica('aside [data-go="sched"]');
      await ate(() => $("#schedList [data-run]"));
      await dorme(1700);
      await clica(() => ([...document.querySelectorAll("#schedList .rot-l")].find((r) => r.textContent.includes(P.suite)) || document).querySelector("#schedList [data-run]"));
      await ate(() => view.type === "chat" && chat && chat.messages.length > 1 && !chat.working);
      await dorme(2200);
      await clica('aside [data-go="sched"]');
      await dorme(2800);
    },
  };
  // as cenas pedidas de fora começam do dia de exemplo intacto; no laço, uma continua de onde a outra parou
  const sozinha = (nome) => async () => { if (nome !== "conversa" && nome !== "limite") await zera(); await CENAS[nome](); };
  async function laco() { for (;;) { await CENAS.conversa(); await CENAS.precisa(); await CENAS.tarefas(); await CENAS.rotinas(); await dorme(600); } }

  function toca(fn) {
    const eu = (vez = {});
    pausado = false;
    document.documentElement.classList.remove("demo-solta");
    fn().catch((e) => { if (!(e instanceof Parou)) console.error(e); }).finally(() => { if (vez === eu) { vez = null; cursor.classList.remove("on"); } });
  }
  function solta() {
    if (!vez) return;
    vez = null; pausado = false;
    cursor.classList.remove("on", "toque");
    document.documentElement.classList.add("demo-solta");
    document.querySelectorAll(".demo-foco").forEach((el) => el.classList.remove("demo-foco"));
    diz({ revoada: "mexeu" });
  }
  for (const tipo of ["pointerdown", "keydown"]) window.addEventListener(tipo, (e) => { if (e.isTrusted) solta(); }, true);
  window.addEventListener("message", (e) => {
    if (e.origin !== location.origin || e.source !== window.parent || !e.data || typeof e.data !== "object" || !cursor) return;
    const m = e.data;
    if (m.revoada === "cena" && Object.hasOwn(CENAS, m.cena)) toca(sozinha(m.cena));
    else if (m.revoada === "tocar") { pausado = false; if (!vez) toca(laco); }
    else if (m.revoada === "pausar") pausado = true;
  });

  window.addEventListener("DOMContentLoaded", () => {
    cursor = document.createElement("div");
    cursor.id = "demo-cursor";
    cursor.innerHTML = '<svg width="22" height="22" viewBox="0 0 22 22" aria-hidden="true"><path d="M4 2.5 17.5 10 11 11.6 8.6 18z"/></svg>';
    document.body.appendChild(cursor);
    const pronto = setInterval(() => {
      if (typeof S !== "object" || !S.accounts.length || !S.convos) return;
      clearInterval(pronto);
      diz({ revoada: "pronto" });
      if (location.hash !== "#parado") toca(laco);
    }, 60);
  });
})();
