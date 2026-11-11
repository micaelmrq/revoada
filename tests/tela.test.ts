// Teste de tela: abre o painel de verdade num Chrome sem janela e confere o que os outros testes
// não enxergam: nada estoura a largura da conversa, a resposta chega aos poucos sem a página ficar
// perguntando, o comando não aparece repetido e a fila de mensagens funciona pelo teclado.
// Fala o protocolo de depuração do Chrome direto, sem dependência. Sem Chrome na máquina o teste
// é pulado (no GitHub, onde o Chrome vem instalado, a falta dele é erro).
import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { existsSync, mkdtempSync, rmSync } from "fs";
import { tmpdir } from "os";
import { join } from "path";
import { sobe } from "./ambiente";

const CHROME = [process.env.CHROME, "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome", "/Applications/Chromium.app/Contents/MacOS/Chromium", "/Applications/Brave Browser.app/Contents/MacOS/Brave Browser", "/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge",
  ...["google-chrome", "google-chrome-stable", "chromium", "chromium-browser"].map((b) => Bun.which(b))].find((p) => p && existsSync(p));
if (!CHROME && process.env.CI) throw new Error("teste de tela: não achei o Chrome nesta máquina de CI");

const SLOW = 40_000;
let env: Awaited<ReturnType<typeof sobe>>, chrome: any, ws: WebSocket, session = "", profile = "";
let seq = 0;
const waiting = new Map<number, (m: any) => void>();
const cdp = (method: string, params: object = {}, sid = session) => new Promise<any>((resolve, reject) => {
  const id = ++seq;
  // sem resposta em 20 s é defeito: melhor falhar com o nome do comando do que travar a bateria inteira
  const timer = setTimeout(() => { waiting.delete(id); reject(new Error(`${method}: o Chrome não respondeu`)); }, 20_000);
  waiting.set(id, (m) => { clearTimeout(timer); m.error ? reject(new Error(`${method}: ${m.error.message}`)) : resolve(m.result); });
  ws.send(JSON.stringify({ id, method, params, ...(sid ? { sessionId: sid } : {}) }));
});
// roda um trecho de código na página e devolve o valor
async function page<T = any>(expression: string): Promise<T> {
  const r = await cdp("Runtime.evaluate", { expression: `(async () => { ${expression} })()`, awaitPromise: true, returnByValue: true });
  if (r.exceptionDetails) throw new Error(r.exceptionDetails.exception?.description || r.exceptionDetails.text);
  return r.result.value;
}
const until = (expr: string, ms = 15_000) => env.until(() => page<boolean>(`return !!(${expr})`), ms);
// o quanto algum pedaço da conversa passa da borda direita da coluna, e se há rolagem horizontal
const OVERFLOW = `const w = document.querySelector("#msgs"), edge = w.getBoundingClientRect().right;
  return { over: Math.round(Math.max(0, ...[...w.querySelectorAll("*")].map((e) => e.getBoundingClientRect().right - edge))), scroll: document.querySelector("#chatScroll").scrollWidth - document.querySelector("#chatScroll").clientWidth, col: Math.round(w.getBoundingClientRect().width) };`;
const key = (k: string) => `document.querySelector("#prompt").focus(); document.querySelector("#prompt").dispatchEvent(new KeyboardEvent("keydown", { key: "${k}", bubbles: true, cancelable: true }));`;

describe.skipIf(!CHROME)("tela", () => {
  beforeAll(async () => {
    env = await sobe();
    profile = mkdtempSync(join(tmpdir(), "revoada-chrome-"));
    chrome = Bun.spawn([CHROME!, "--headless=new", "--remote-debugging-port=0", `--user-data-dir=${profile}`, "--no-first-run", "--no-default-browser-check", "--disable-gpu", "--no-sandbox", "--window-size=1280,860", "about:blank"], { stdout: "ignore", stderr: "pipe" });
    // o Chrome avisa no erro padrão em que endereço atende o protocolo de depuração
    let log = "";
    const url = await new Promise<string>(async (resolve, reject) => {
      const timer = setTimeout(() => reject(new Error(`o Chrome não abriu a porta de depuração:\n${log}`)), 20_000);
      const dec = new TextDecoder();
      for await (const chunk of chrome.stderr) { log += dec.decode(chunk); const m = log.match(/DevTools listening on (ws:\/\/\S+)/); if (m) { clearTimeout(timer); return resolve(m[1]); } }
    });
    ws = new WebSocket(url);
    await new Promise((r, j) => { ws.onopen = r; ws.onerror = j; });
    ws.onmessage = (e) => { const m = JSON.parse(String(e.data)); if (m.id && waiting.has(m.id)) { waiting.get(m.id)!(m); waiting.delete(m.id); } };
    const { targetId } = await cdp("Target.createTarget", { url: "about:blank" }, "");
    session = (await cdp("Target.attachToTarget", { targetId, flatten: true }, "")).sessionId;
    await cdp("Emulation.setDeviceMetricsOverride", { width: 1280, height: 860, deviceScaleFactor: 1, mobile: false });
    await cdp("Page.enable");
    await cdp("Page.navigate", { url: env.origin });
    await until(`typeof go === "function" && typeof S === "object" && S && S.convos`);
  }, SLOW);

  afterAll(async () => {
    try { ws?.close(); } catch {}
    chrome?.kill();
    await chrome?.exited;
    await env?.stop();
    if (profile) rmSync(profile, { recursive: true, force: true });
  });

  test("resposta longa e formatada cabe na coluna, em tela larga e estreita", async () => {
    const id = await env.chat("claude-padrao", "DEMO-RICA: e já foi?");
    await env.idle(id);
    await page(`await refresh(); go({ type: "chat", id: "${id}" });`);
    await until(`document.querySelector("#msgs table") && !chat.working`);
    const wide = await page(OVERFLOW);
    expect(wide).toEqual({ over: 0, scroll: 0, col: 760 });
    const seen = await page(`const m = document.querySelector("#msgs"); return { rows: m.querySelectorAll("tbody tr").length, cols: m.querySelectorAll("thead th").length, raw: /\\|\\s*---/.test(m.innerText), nested: m.querySelectorAll("li li").length, title: !!m.querySelector(".md h3"), code: !!m.querySelector(".md pre code"),
      groups: [...m.querySelectorAll(".acts")].map((d) => [d.querySelector(".lbl").textContent, d.open]) };`);
    expect(seen).toEqual({ rows: 4, cols: 2, raw: false, nested: 1, title: true, code: true, groups: [["Rodou 1 comando, leu 1 arquivo", false]] });
    // aberto, o grupo mostra o comando comprido numa linha só, cortado com reticências, sem empurrar a coluna
    console.log("DEBUG", await page(`return { view: JSON.stringify(view), msgs: document.querySelector("#msgs").innerHTML.length, acts: document.querySelectorAll("#msgs .acts").length, html: document.querySelector("#msgs").innerHTML.slice(0, 300), err: window.__err || null }`));
    await page(`document.querySelector("#msgs .acts > summary").click();`);
    await until(`document.querySelector("#msgs .acts").open && document.querySelector("#msgs .acts .what")`);
    expect(await page(OVERFLOW)).toEqual({ over: 0, scroll: 0, col: 760 });
    // cada passo é uma linha com o que o agente disse que ia fazer; o comando cru só aparece ao abrir o passo
    const steps = await page(`const g = document.querySelector("#msgs .acts"); const rows = [...g.querySelectorAll(".astep")];
      const before = rows.map((e) => (e.querySelector("summary") || e).innerText.trim());
      const boxed = rows.some((e) => parseFloat(getComputedStyle(e).borderTopWidth) > 0);
      // fechado, cada passo é uma linha baixa que ocupa a largura da lista (uma classe trocada já fez isto virar uma coluna de 44px)
      const lines = rows.every((e) => { const r = e.getBoundingClientRect(), t = (e.querySelector(".what") || e).getBoundingClientRect(); return r.height < 34 && t.width > 200; });
      g.querySelector(".astep > summary").click(); await new Promise((r) => setTimeout(r, 100));
      return { before, boxed, lines, shown: g.querySelector(".astep pre.cmdline").innerText.includes("criar-contas.sh") && g.querySelector(".astep pre.cmdline").getBoundingClientRect().height > 0 };`);
    expect(steps).toEqual({ before: ["Confere o andamento da criação da rodada r9", "Read ops/disparo/log.txt"], boxed: false, lines: true, shown: true });
    expect(await page(OVERFLOW)).toEqual({ over: 0, scroll: 0, col: 760 });
    // janela estreita: a coluna encolhe e o conteúdo acompanha
    await cdp("Emulation.setDeviceMetricsOverride", { width: 760, height: 800, deviceScaleFactor: 1, mobile: false });
    await Bun.sleep(150);
    const narrow = await page(OVERFLOW);
    expect([narrow.over, narrow.scroll]).toEqual([0, 0]);
    expect(narrow.col).toBeLessThan(600);
    await cdp("Emulation.setDeviceMetricsOverride", { width: 1280, height: 860, deviceScaleFactor: 1, mobile: false });
  }, SLOW);

  test("o texto chega aos poucos, empurrado pelo servidor, sem a página ficar perguntando", async () => {
    const id = await env.chat("claude-padrao", "DEMO-RICA: de novo");
    await page(`performance.clearResourceTimings(); window.sizes = new Set(); go({ type: "chat", id: "${id}" });
      window.watch = setInterval(() => { const t = document.querySelector("#msgs .md"); if (t) sizes.add(t.innerText.length); }, 20);`);
    await until(`chat && chat.id === "${id}" && !chat.working && document.querySelector("#msgs table")`);
    const r = await page(`clearInterval(watch); return { steps: sizes.size, live: live.es.readyState, polls: performance.getEntriesByType("resource").filter((e) => /\\/api\\/convos\\/${id}(\\?|$)/.test(e.name)).length, text: chat.messages.at(-1).items.at(-1).text.length };`);
    expect(r.steps).toBeGreaterThan(4);   // vários tamanhos intermediários: chegou em pedaços
    expect(r.live).toBe(1);               // conexão ao vivo de pé
    expect(r.polls).toBe(0);              // nenhuma consulta de tempo em tempo
    expect(r.text).toBe((await env.api(`convos/${id}`)).messages.at(-1).items.at(-1).text.length);
  }, SLOW);

  test("pasta de caminho comprido não vaza do campo de pedido nem do cabeçalho", async () => {
    const deep = join(env.home, "Library/Application Support/Claude/scratch-workspaces/d1ab563f-8797-4857-88c3-13efdc7aa9e9/7fc5e0b6-8b05-47a9-95dd-89f14c5f7129/scratch-2026-10-07-bf0031");
    require("fs").mkdirSync(deep, { recursive: true });
    const id = await env.chat("claude-padrao", "oi", { cwd: deep });
    await env.idle(id);
    await page(`go({ type: "chat", id: "${id}" });`);
    await until(`chat && chat.id === "${id}" && document.querySelector("#chDir span")`);
    // na conversa a pasta é a etiqueta do topo; o campo de pedido só mostra a pasta na tela inicial
    const measure = `const chip = document.querySelector("#chDir"), top = chip.parentElement.getBoundingClientRect(), sub = document.querySelector("#chSub").getBoundingClientRect();
      return { fits: chip.getBoundingClientRect().width > 0 && chip.getBoundingClientRect().right <= top.right + 1, header: sub.right <= innerWidth && [...document.querySelectorAll("#v-chat .topo *")].every((e) => e.getBoundingClientRect().right <= innerWidth + 1), page: document.documentElement.scrollWidth <= innerWidth, text: chip.innerText.trim(), full: chip.title.endsWith("scratch-2026-10-07-bf0031") };`;
    expect(await page(measure)).toEqual({ fits: true, header: true, page: true, text: "…/scratch-2026-10-07-bf0031", full: true });
    // na tela inicial, com a mesma pasta, a ficha do campo corta o caminho e não passa da faixa
    const field = `setCwd(${JSON.stringify(deep)}); go({ type: "home" }); await new Promise((r) => setTimeout(r, 120)); const chip = document.querySelector("#dirChip"), strip = chip.parentElement.getBoundingClientRect();
      const r = { fits: chip.getBoundingClientRect().width > 0 && chip.getBoundingClientRect().right <= strip.right + 1, page: document.documentElement.scrollWidth <= innerWidth, text: chip.innerText.trim(), full: chip.title.endsWith("scratch-2026-10-07-bf0031") }; go({ type: "chat", id: "${id}" }); return r;`;
    expect(await page(field)).toEqual({ fits: true, page: true, text: "…/scratch-2026-10-07-bf0031", full: true });
    // na menor janela que o app permite (920 de largura) continua cabendo
    await cdp("Emulation.setDeviceMetricsOverride", { width: 920, height: 700, deviceScaleFactor: 1, mobile: false });
    await Bun.sleep(150);
    const small = await page(measure), smallField = await page(field);
    await cdp("Emulation.setDeviceMetricsOverride", { width: 1280, height: 860, deviceScaleFactor: 1, mobile: false });
    await page(`setCwd(S.home);`);
    expect([small.fits, small.header, small.page, smallField.fits, smallField.page]).toEqual([true, true, true, true, true]);
  }, SLOW);

  test("janela estreita (até 600 de largura): nada sai da tela, na conversa e no início", async () => {
    const id = await env.chat("claude-padrao", "DEMO-RICA: estreita");
    await env.idle(id);
    // tudo o que estiver visível e passar da borda direita da janela
    const leak = `return { doc: document.documentElement.scrollWidth - innerWidth, out: [...document.querySelectorAll("body *")].filter((e) => { const r = e.getBoundingClientRect(); return r.width && r.height && r.right > innerWidth + 1 && !e.closest("dialog, .pop, #toast"); }).slice(0, 6).map((e) => e.tagName + "#" + e.id) };`;
    try {
      for (const width of [900, 760, 600]) {
        await cdp("Emulation.setDeviceMetricsOverride", { width, height: 720, deviceScaleFactor: 1, mobile: false });
        await page(`go({ type: "chat", id: "${id}" });`);
        await until(`chat && chat.id === "${id}" && document.querySelector("#msgs table")`);
        await Bun.sleep(120);
        expect([width, "conversa", await page(leak)]).toEqual([width, "conversa", { doc: 0, out: [] }]);
        // tabela e bloco de código têm rolagem própria quando não cabem; fora deles nada passa da coluna
        expect(await page(`const w = document.querySelector("#msgs"), edge = w.getBoundingClientRect().right;
          return { over: Math.round(Math.max(0, ...[...w.querySelectorAll("*")].filter((e) => !e.closest(".tbl table, pre code")).map((e) => e.getBoundingClientRect().right - edge))), scroll: document.querySelector("#chatScroll").scrollWidth - document.querySelector("#chatScroll").clientWidth };`)).toEqual({ over: 0, scroll: 0 });
        await page(`go({ type: "home" });`);
        await Bun.sleep(120);
        expect([width, "início", await page(leak)]).toEqual([width, "início", { doc: 0, out: [] }]);
      }
      // apertado, a linha sob o campo segue em texto (quebra de linha se precisar) e a conta continua legível
      const row = await page(`go({ type: "chat", id: "${id}" }); await new Promise((r) => setTimeout(r, 200)); const v = (q) => { const e = document.querySelector(q); return !!e && e.getBoundingClientRect().width > 0; };
        return { rotulo: v("#brainChip .lb"), icone: v("#brainChip svg"), conta: document.querySelector("#targetChip .lb").getBoundingClientRect().width > 40, enviar: v("#send") };`);
      expect(row).toEqual({ rotulo: true, icone: false, conta: true, enviar: true });
    } finally { await cdp("Emulation.setDeviceMetricsOverride", { width: 1280, height: 860, deviceScaleFactor: 1, mobile: false }); }
    expect(await page(`return document.querySelector("#brainChip .lb").getBoundingClientRect().width > 0`)).toBe(true); // na largura normal o nome volta
  }, SLOW);

  test("agente terminou: o campo oferece o próximo pedido (Tab aceita) e os tokens abrem o raio-x", async () => {
    const id = await env.chat("claude-padrao", "diga olá");
    await env.idle(id);
    await page(`go({ type: "chat", id: "${id}" });`);
    await until(`chat && chat.id === "${id}" && chat.suggest && document.querySelector("#prompt").placeholder === chat.suggest`);
    expect(await page(`return [document.querySelector("#prompt").placeholder, document.querySelector("#notes").textContent, [...document.querySelectorAll("#chActs button")].map((b) => b.textContent)]`))
      .toEqual(["roda os testes agora", "sugestão · Tab aceita · Enter envia", ["Plano", "Mudanças", "Revisar", "Segurança"]]);
    await page(key("Tab"));
    expect(await page(`return document.querySelector("#prompt").value`)).toBe("roda os testes agora");
    // começou a escrever outra coisa: a sugestão sai da frente
    await page(`const p = document.querySelector("#prompt"); p.value = ""; p.dispatchEvent(new Event("input", { bubbles: true }));`);
    await page(`document.querySelector("#msgs [data-xray]").click();`);
    await until(`document.querySelector("#msgs .xray")`);
    const x = await page(`const e = document.querySelector("#msgs .xray"); return { text: e.innerText.replace(/\\s+/g, " "), bars: e.querySelectorAll(".bar i").length };`);
    expect(x.text).toContain("de entrada");
    expect(x.text).toContain("seu pedido");
    expect(x.bars).toBeGreaterThan(1);
    expect(await page(OVERFLOW)).toEqual({ over: 0, scroll: 0, col: 760 });
    await page(`document.querySelector("#msgs [data-xray]").click();`);
    await until(`!document.querySelector("#msgs .xray")`);
  }, SLOW);

  test("agendar pelo campo: o pedido sai do campo, aparece em Agendados e some ao apagar", async () => {
    await page(`go({ type: "home" }); const p = document.querySelector("#prompt"); p.value = "relatório de vendas da semana"; p.dispatchEvent(new Event("input", { bubbles: true })); paintComposer();`);
    await until(`getComputedStyle(document.querySelector("#schedChip")).display !== "none"`);
    await page(`document.querySelector("#schedChip").click();`);
    await until(`document.querySelector("#popSched").classList.contains("on")`);
    await page(`document.querySelector('#schedKind [data-k="daily"]').click(); document.querySelector('#schedDays [data-d="1"]').click(); document.querySelector("#schedSave").click();`);
    const list = await env.until(async () => { const l = await env.api("schedules"); return l.length === 1 && l; });
    expect([list[0].prompt, list[0].kind, list[0].time, list[0].days, list[0].enabled]).toEqual(["relatório de vendas da semana", "daily", "03:00", [1], true]);
    // o servidor já tem o agendamento antes de a página receber a resposta: espera ela reagir
    await until(`document.querySelector("#prompt").value === "" && !document.querySelector("#popSched").classList.contains("on")`);
    await page(`await refresh(); go({ type: "sched" });`);
    await until(`document.querySelector("#schedList .r")`);
    expect(await page(`return [document.querySelector("#schedLead").textContent, document.querySelector("#schedList .r b").textContent, document.querySelector("#schedCount").textContent, document.querySelector("#schedList small").textContent.includes("todo dia às 03:00 (seg)")]`))
      .toEqual(["1 pedido agendado.", "relatório de vendas da semana", "1", true]);
    await page(`document.querySelector("#schedList [data-rm]").click();`);
    await until(`!document.querySelector("#schedList .r")`);
    expect(await env.api("schedules")).toEqual([]);
  }, SLOW);

  test("supervisor pela tela: plano, aprovação e tarefas até o fim", async () => {
    await page(`setCwd(${JSON.stringify("")} || "${env.repo}"); go({ type: "home" });`);
    await until(`getComputedStyle(document.querySelector("#supChip")).display !== "none"`);
    await page(`document.querySelector("#supChip").click(); const p = document.querySelector("#prompt"); p.value = "Exportação e importação da loja"; p.dispatchEvent(new Event("input", { bubbles: true })); document.querySelector("#send").click();`);
    await until(`view.type === "mission" && document.querySelector('#misActs [data-m="start"]')`);
    expect(await page(`return [document.querySelector("#misLead").textContent, document.querySelector('#misActs [data-m="start"]').textContent, [...document.querySelectorAll("#misTasks .r b")].map((b) => b.textContent), [...document.querySelectorAll("#misTasks .tag")].map((b) => b.textContent)]`))
      .toEqual(["Exportação e importação da loja", "Rodar 2 tarefas", ["1. Exportação de pedidos", "2. Importação de clientes"], ["pendente", "pendente"]]);
    // na lateral, a missão que espera aprovação aparece marcada
    expect(await page(`await refresh(); return !!document.querySelector('#threads [data-open^="mission:"] .dot.wait')`)).toBe(true);
    await page(`document.querySelector('#misActs [data-m="start"]').click();`);
    await until(`mission && mission.state === "pronta" && [...document.querySelectorAll("#misTasks .tag")].every((t) => t.textContent === "pronta")`, 30_000);
    expect(await page(`return [document.querySelectorAll("#misTasks [data-conv]").length, !!document.querySelector('#misActs [data-m="merge"]'), document.documentElement.scrollWidth <= innerWidth]`)).toEqual([2, true, true]);
    await page(`setCwd("${env.home}");`);
  }, 60_000);

  test("Contas mostra skills e MCP; Cérebro mostra a arrumação", async () => {
    await page(`go({ type: "accounts" });`);
    await until(`document.querySelector("#toolsBox .switch")`);
    expect(await page(`return document.querySelector("#toolsBox").innerText.includes("Usar nas outras contas")`)).toBe(true);
    await page(`go({ type: "brain" });`);
    await until(`document.querySelector("#brainTidy .switch")`);
    expect(await page(`return document.querySelector("#brainTidy").innerText.includes("Arquivar sozinho")`)).toBe(true);
    await page(`go({ type: "home" });`);
  }, SLOW);

  test("linha de status mostra o passo em curso e o tempo; no fim sobram as ações da mensagem", async () => {
    const id = await env.chat("claude-padrao", "DEMO-RICA: status");
    await page(`window.seen = new Set(); window.times = new Set(); go({ type: "chat", id: "${id}" });
      window.watch = setInterval(() => { const n = document.querySelector("#msgs .working .now"), t = document.querySelector("#msgs .working .num"); if (n) seen.add(n.textContent); if (t && t.textContent) times.add(t.textContent); }, 15);`);
    await until(`chat && chat.id === "${id}" && !chat.working && document.querySelector("#msgs table")`);
    const live = await page(`clearInterval(watch); return { seen: [...seen], time: [...times].every((t) => /^\\d+ s$/.test(t)) && times.size > 0, dots: document.querySelectorAll("#msgs .working").length };`);
    expect(live.seen).toContain("Confere o andamento da criação da rodada r9"); // o passo, com as palavras do agente
    expect(live.seen).toContain("Escrevendo a resposta");
    expect([live.time, live.dots]).toEqual([true, 0]); // tempo no formato "12 s"; terminou, a linha some

    // copiar leva o texto como o agente escreveu (markdown), não o HTML
    await page(`window.copied = []; Object.defineProperty(navigator, "clipboard", { configurable: true, value: { writeText: async (t) => { copied.push(t); } } });`);
    const acts = await page(`const ms = [...document.querySelectorAll("#msgs > .m")]; const names = (el) => [...el.querySelectorAll(".mact button")].map((b) => b.getAttribute("aria-label"));
      ms.at(-1).querySelector('[data-act="copy"]').click(); ms[0].querySelector('[data-act="copy"]').click(); await new Promise((r) => setTimeout(r, 80));
      return { user: names(ms[0]), bot: names(ms.at(-1)), table: copied[0].includes("| Conta | Registrados (de 500) |"), mine: copied[1], feedback: ms.at(-1).querySelector('[data-act="copy"] span').textContent };`);
    expect(acts).toEqual({ user: ["Copiar", "Editar"], bot: ["Copiar", "Tentar de novo"], table: true, mine: "DEMO-RICA: status", feedback: "Copiado" });
    // bloco de código ganha o botão de copiar quando o mouse passa
    expect(await page(`const pre = document.querySelector("#msgs .md pre"); pre.dispatchEvent(new MouseEvent("mouseover", { bubbles: true })); pre.querySelector("[data-copy-code]").click(); await new Promise((r) => setTimeout(r, 50)); return copied.at(-1);`)).toBe("./criar-contas.sh --rodada r9 --so-o-que-falta");
  }, SLOW);

  test("editar reescreve a mensagem no campo e volta a conversa; Esc desiste; tentar de novo refaz a resposta", async () => {
    const id = await env.chat("claude-padrao", "oi");
    await env.idle(id);
    await page(`go({ type: "chat", id: "${id}" });`);
    await until(`chat && chat.id === "${id}" && document.querySelector('#msgs [data-act="edit"]')`);
    // Esc desiste e limpa o campo
    await page(`document.querySelector('#msgs [data-act="edit"]').click();`);
    expect(await page(`return [document.querySelector("#prompt").value, !!document.querySelector("#msgs .bubble.editing"), document.querySelector("#prompt").placeholder.startsWith("Reescreva")]`)).toEqual(["oi", true, true]);
    await page(`window.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true, cancelable: true }));`);
    expect(await page(`return [document.querySelector("#prompt").value, !!document.querySelector("#msgs .bubble.editing")]`)).toEqual(["", false]);
    // editar de verdade
    await page(`document.querySelector('#msgs [data-act="edit"]').click(); const p = document.querySelector("#prompt"); p.value = "oi, com mais contexto"; p.dispatchEvent(new Event("input", { bubbles: true })); ${key("Enter")}`);
    let c = await env.until(async () => { const x = await env.api(`convos/${id}`); return x.messages[0].text === "oi, com mais contexto" && !x.working && x; });
    expect(c.messages.length).toBe(2);
    await until(`!chat.working && document.querySelector("#msgs .bubble").textContent === "oi, com mais contexto" && !document.querySelector("#msgs .bubble.editing")`);
    // tentar de novo: mesma pergunta, resposta nova
    const before = c.messages[1].at;
    await page(`document.querySelector('#msgs [data-act="retry"]').click();`);
    c = await env.until(async () => { const x = await env.api(`convos/${id}`); return x.messages.length === 2 && !x.working && x.messages[1].at > before && x; });
    expect(c.messages[0].text).toBe("oi, com mais contexto");
  }, SLOW);

  test("modelo e esforço se escolhem no campo e vão com o pedido; o anel abre janela de contexto e limites", async () => {
    const id = await env.chat("claude-padrao", "DEMO-RICA: uso");
    await env.idle(id);
    await page(`localStorage.removeItem("models"); for (const k of Object.keys(choice)) delete choice[k]; go({ type: "chat", id: "${id}" });`);
    await until(`chat && chat.id === "${id}" && !chat.working && document.querySelector("#modelChip .lb")`);
    expect(await page(`return document.querySelector("#modelChip .lb").textContent`)).toBe("Modelo padrão");
    await page(`document.querySelector("#modelChip").click(); document.querySelector('#popModel [data-model="opus"]').click(); document.querySelector('#popModel [data-effort="high"]').click();`);
    expect(await page(`return [document.querySelector("#modelChip .lb").textContent, [...document.querySelectorAll("#popModel [data-effort]")].map((b) => b.textContent)]`)).toEqual(["Opus · Alto", ["Padrão", "Baixo", "Médio", "Alto", "Muito alto", "Máximo"]]);
    await page(`closePops(); mode = "edit"; const p = document.querySelector("#prompt"); p.value = "com opus"; p.dispatchEvent(new Event("input", { bubbles: true })); ${key("Enter")}`);
    const c = await env.until(async () => { const x = await env.api(`convos/${id}`); return x.messages.length === 4 && !x.working && x; });
    expect([c.model, c.effort, c.messages.at(-1).model]).toEqual(["opus", "high", "claude-opus-teste"]);
    await until(`!chat.working && document.querySelector("#msgs > .m:last-child .mdl")`);
    expect(await page(`return document.querySelector("#msgs > .m:last-child .mdl").textContent`)).toBe("opus-teste");

    // painel de uso: a janela desta conversa e os limites da conta que responde
    await page(`document.querySelector("#usageChip").click();`);
    const use = await page(`const p = document.querySelector("#popUsage"); return { on: p.classList.contains("on"), rows: [...p.querySelectorAll(".u")].map((u) => u.querySelector("span").textContent + " | " + u.querySelector("small").textContent.replace(/\\s+/g, " ").trim()), fits: p.getBoundingClientRect().right <= innerWidth && p.getBoundingClientRect().left >= 0 };`);
    expect(use.on && use.fits).toBe(true);
    expect(use.rows[0]).toBe("Janela de contexto | 53,9k / 200k (27%)");
    expect(use.rows[1]).toMatch(/^Limite de sessão \| Reinicia em (5\d|60|1 h 0) min 42%$/);
    expect(use.rows[2]).toMatch(/^Semanal · todos os modelos \| Reinicia (em 23 h \d+ min|\S+,? \d\d:\d\d) 10%$/);
    await page(`closePops(); localStorage.removeItem("models"); for (const k of Object.keys(choice)) delete choice[k];`);
  }, SLOW);

  test("quadro: tarefa escrita vira cartão, começa ao arrastar, anda sozinha para revisar e abre a conversa", async () => {
    // a tarefa vai para uma conta do Codex, pra a revisão cair em outro provedor
    const reserva = (await env.api("accounts", "POST", { provider: "codex", label: "reserva" })).id;
    await env.api("state?refresh=1");
    await page(`await refresh(true); picked.clear(); picked.add("${reserva}"); setCwd("${env.repo}"); go({ type: "board" }); const t = document.querySelector("#boardText"); t.value = "CRIA-ARQUIVO do quadro\\nsó uma conversa"; document.querySelector("#boardAdd").click();`);
    await until(`document.querySelectorAll('#board [data-col="todo"] .card').length === 2`);
    expect(await page(`return [...document.querySelectorAll("#board .col")].map((c) => [c.querySelector("h4 span").textContent, c.querySelectorAll(".card").length]).concat([[document.querySelector("#boardCount").textContent, document.querySelector("#boardText").value]])`))
      .toEqual([["A fazer", 2], ["Fazendo", 0], ["Revisar", 0], ["Feito", 0], ["2", ""]]);
    // arrastar o primeiro cartão para "Fazendo" começa a tarefa
    await page(`const card = document.querySelector('#board [data-col="todo"] .card'), col = document.querySelector('#board [data-col="doing"]'), dt = new DataTransfer();
      card.dispatchEvent(new DragEvent("dragstart", { bubbles: true, dataTransfer: dt })); col.dispatchEvent(new DragEvent("dragover", { bubbles: true, cancelable: true, dataTransfer: dt }));
      col.dispatchEvent(new DragEvent("drop", { bubbles: true, cancelable: true, dataTransfer: dt })); card.dispatchEvent(new DragEvent("dragend", { bubbles: true, dataTransfer: dt }));`);
    // sem ninguém mexer, ele sai de "Fazendo" e chega em "Revisar" (depois da revisão por outra conta)
    await until(`document.querySelector('#board [data-col="review"] [data-card-done]')`, 25_000);
    const cards = await env.api("board");
    const first = cards.find((c: any) => c.title === "CRIA-ARQUIVO do quadro");
    expect([first.state, cards.find((c: any) => c.title === "só uma conversa").state]).toEqual(["review", "todo"]);
    expect((await env.api(`convos/${first.convo}`)).messages.at(-1).review).toBe(true);
    // marcar como feito, e o cartão abre a conversa dele
    await page(`document.querySelector('#board [data-col="review"] [data-card-done]').click();`);
    await until(`document.querySelector('#board [data-col="done"] .card')`);
    await page(`document.querySelector('#board [data-col="done"] [data-card-open]').click();`);
    await until(`view.type === "chat" && chat && chat.id === "${first.convo}"`);
    expect(await page(OVERFLOW)).toMatchObject({ over: 0, scroll: 0 });
    // o quadro cabe na janela mínima do app (as colunas rolam por dentro, a página não)
    await cdp("Emulation.setDeviceMetricsOverride", { width: 920, height: 700, deviceScaleFactor: 1, mobile: false });
    await page(`go({ type: "board" });`);
    await until(`document.querySelector("#board .col")`);
    const fits = await page(`return document.documentElement.scrollWidth <= innerWidth && document.querySelector("#boardAdd").getBoundingClientRect().right <= innerWidth`);
    await cdp("Emulation.setDeviceMetricsOverride", { width: 1280, height: 860, deviceScaleFactor: 1, mobile: false });
    expect(fits).toBe(true);
    await page(`picked.clear(); setCwd(S.home);`);
  }, 60_000);

  test("plano em arquivo: liga pelo cabeçalho, o progresso aparece e o plano abre formatado", async () => {
    const id = await env.chat("claude-padrao", "tarefa comprida");
    await env.idle(id);
    await page(`mode = "edit"; go({ type: "chat", id: "${id}" });`);
    await until(`chat && chat.id === "${id}" && document.querySelector("#seePlan")`);
    expect(await page(`return document.querySelector("#seePlan").textContent`)).toBe("Plano");
    await page(`document.querySelector("#seePlan").click();`);
    await until(`chat.plan === true`);
    await page(`const p = document.querySelector("#prompt"); p.value = "segue com o plano"; p.dispatchEvent(new Event("input", { bubbles: true })); ${key("Enter")}`);
    await env.until(async () => { const x = await env.api(`convos/${id}`); return x.messages.length === 4 && !x.working; });
    await until(`document.querySelector("#seePlan").textContent === "Plano 0/3"`);
    await page(`document.querySelector("#seePlan").click();`);
    await until(`document.querySelector("#planDlg").open && document.querySelector("#planBody li.task")`);
    expect(await page(`return [document.querySelector("#planSub").textContent.startsWith("0 de 3 passos"), document.querySelectorAll("#planBody li.task").length, !!document.querySelector("#planBody h2")]`)).toEqual([true, 3, true]);
    await page(`document.querySelector("#planClose").click();`);
  }, SLOW);

  test("a busca da lateral acha texto de dentro das conversas e abre a conversa certa", async () => {
    const id = await env.chat("claude-padrao", "o código do cofre é tamanduá-bandeira");
    await env.idle(id);
    await page(`await refresh(); const q = document.querySelector("#tq"); q.value = "tamanduá"; q.dispatchEvent(new Event("input", { bubbles: true }));`);
    await until(`document.querySelector("#threads .item.hit")`);
    const hit = await page(`const h = document.querySelector("#threads .item.hit"); return [h.dataset.open, h.querySelector("mark").textContent, h.querySelector(".sn").textContent.includes("código do cofre"), [...document.querySelectorAll("#threads h4")].map((x) => x.textContent)]`);
    expect(hit).toEqual([`chat:${id}`, "tamanduá", true, ["Nenhuma conversa com esse texto no título", "No conteúdo · 1"]]);
    await page(`document.querySelector("#threads .item.hit").click();`);
    await until(`view.type === "chat" && view.id === "${id}"`);
    await page(`const q = document.querySelector("#tq"); q.value = ""; q.dispatchEvent(new Event("input", { bubbles: true }));`);
  }, SLOW);

  test("modelo automático se escolhe no campo e a resposta mostra o porte; aviso sonoro toca na hora certa", async () => {
    // sons: troca o motor de áudio por um contador, pra saber o que tocaria
    await page(`window.played = []; const real = tone; tone = (notes) => { played.push(notes.length); return true; }; for (const k of Object.keys(choice)) delete choice[k]; mode = "edit"; go({ type: "home" });`);
    await page(`picked.clear(); picked.add("claude-padrao"); paintComposer(); document.querySelector("#modelChip").click();`);
    expect(await page(`return [...document.querySelectorAll("#popModel [data-model]")].map((b) => b.textContent)`)).toEqual(["Fable", "Opus", "Sonnet", "Haiku", "Padrão da conta", "Automático"]);
    await page(`document.querySelector('#popModel [data-model="auto"]').click(); closePops(); const p = document.querySelector("#prompt"); p.value = "roda os testes"; p.dispatchEvent(new Event("input", { bubbles: true })); ${key("Enter")}`);
    await until(`view.type === "chat" && chat && !chat.working && document.querySelector("#msgs .mdl")`);
    expect(await page(`return [document.querySelector("#modelChip .lb").textContent, document.querySelector("#msgs .mdl").textContent]`)).toEqual(["Automático", "haiku-teste · auto leve"]);
    // resposta rápida com a janela em foco não toca; pedido de permissão toca sempre, com o som de três notas
    await page(`await refresh(); await refresh();`);
    const quiet = await page(`return played.length`);
    const asking = await env.chat("claude-padrao", "crie o arquivo", { mode: "ask" });
    await env.until(async () => (await env.api(`convos/${asking}`)).waiting);
    await page(`await refresh();`);
    expect([quiet, await page(`return played`)]).toEqual([0, [3]]);
    // desligado em Ajustes, não toca
    await env.api("settings", "POST", { sound: false });
    await env.api(`convos/${asking}/stop`, "POST", {});
    const again = await env.chat("claude-padrao", "crie o arquivo", { mode: "ask" });
    await env.until(async () => (await env.api(`convos/${again}`)).waiting);
    await page(`await refresh();`);
    expect(await page(`return played`)).toEqual([3]);
    await env.api("settings", "POST", { sound: true });
    await env.api(`convos/${again}/stop`, "POST", {});
    await page(`for (const k of Object.keys(choice)) delete choice[k]; localStorage.removeItem("models");`);
  }, SLOW);

  test("Esc nega, e o cartão de negado com comando comprido não alarga a conversa", async () => {
    const id = await env.chat("claude-padrao", "DEMO-RICA: nega esta", { mode: "ask" });
    await page(`go({ type: "chat", id: "${id}" });`);
    await until(`document.querySelector('#msgs [data-decide="deny"]')`);
    await page(key("Escape"));
    await until(`chat && !chat.working && document.querySelector("#msgs .askcard.done")`);
    expect(await page(`return document.querySelector("#msgs .askcard.done").innerText.replace(/\\s+/g, " ").slice(0, 14)`)).toBe("Negado Bash · ");
    // foi este cartão, com o comando numa linha só, que empurrava a coluna inteira pra fora da tela
    expect(await page(OVERFLOW)).toEqual({ over: 0, scroll: 0, col: 760 });
  }, SLOW);

  // A janela do app é um WKWebView, não um Chrome. O estouro de largura que motivou este arquivo
  // aparecia justamente ali, então as mesmas medidas são tiradas também nesse motor.
  test.skipIf(process.platform !== "darwin" || !Bun.which("swift"))("no motor do app (WebKit): conversa ao vivo de pé e nada estoura a coluna", async () => {
    const rica = await env.chat("claude-padrao", "DEMO-RICA: webkit");
    const negada = await env.chat("claude-padrao", "DEMO-RICA: webkit nega", { mode: "ask" });
    const w = await env.until(async () => { const c = await env.api(`convos/${negada}`); return c.waiting && c; });
    await env.api(`convos/${negada}/decide`, "POST", { req: w.messages.at(-1).items.find((i: any) => i.kind === "ask").req, decision: "deny" });
    const deep = join(env.home, "Library/Application Support/Claude/scratch-workspaces/d1ab563f-8797-4857-88c3-13efdc7aa9e9/7fc5e0b6-8b05-47a9-95dd-89f14c5f7129/scratch-webkit");
    require("fs").mkdirSync(deep, { recursive: true });
    const funda = await env.chat("claude-padrao", "oi", { cwd: deep });
    await env.idle(rica); await env.idle(negada); await env.idle(funda);
    const js = `
      const wait = async (f) => { for (let i = 0; i < 200; i++) { const v = f(); if (v) return v; await new Promise((r) => setTimeout(r, 60)); } throw new Error("esperei demais"); };
      const measure = () => { const w = document.querySelector("#msgs"), edge = w.getBoundingClientRect().right; return [Math.round(Math.max(0, ...[...w.querySelectorAll("*")].map((e) => e.getBoundingClientRect().right - edge))), document.querySelector("#chatScroll").scrollWidth - document.querySelector("#chatScroll").clientWidth, Math.round(w.getBoundingClientRect().width)]; };
      await wait(() => typeof go === "function" && typeof S === "object" && S && S.convos);
      go({ type: "chat", id: "${rica}" });
      await wait(() => chat && chat.id === "${rica}" && !chat.working && document.querySelector("#msgs table"));
      document.querySelector("#msgs .acts > summary").click();
      await wait(() => document.querySelector("#msgs .acts").open);
      const a = measure(), alive = live.es.readyState;
      go({ type: "chat", id: "${negada}" });
      await wait(() => chat && chat.id === "${negada}" && !chat.working && document.querySelector("#msgs .askcard.done"));
      const b = measure();
      go({ type: "chat", id: "${funda}" });
      await wait(() => chat && chat.id === "${funda}" && document.querySelector("#chDir span"));
      const chip = document.querySelector("#chDir");
      const pasta = chip.getBoundingClientRect().right <= chip.parentElement.getBoundingClientRect().right + 1 && document.documentElement.scrollWidth <= innerWidth;
      return JSON.stringify({ rica: a, negada: b, pasta, live: alive, webkit: /AppleWebKit/.test(navigator.userAgent) && !/Chrome/.test(navigator.userAgent) });`;
    const run = Bun.spawnSync(["swift", join(import.meta.dir, "webkit.swift"), env.origin, js], { stdout: "pipe", stderr: "pipe" });
    if (run.exitCode !== 0) throw new Error(run.stderr.toString().slice(-800));
    expect(JSON.parse(run.stdout.toString())).toEqual({ rica: [0, 0, 760], negada: [0, 0, 760], pasta: true, live: 1, webkit: true });
    // e com a janela em 600 de largura: nada passa da borda, e os botões do campo ficam só com o ícone
    const narrow = Bun.spawnSync(["swift", join(import.meta.dir, "webkit.swift"), env.origin, `
      const wait = async (f) => { for (let i = 0; i < 200; i++) { const v = f(); if (v) return v; await new Promise((r) => setTimeout(r, 60)); } throw new Error("esperei demais"); };
      await wait(() => typeof go === "function" && typeof S === "object" && S && S.convos);
      go({ type: "chat", id: "${rica}" });
      await wait(() => chat && chat.id === "${rica}" && document.querySelector("#msgs table"));
      await new Promise((r) => setTimeout(r, 200));
      const out = [...document.querySelectorAll("body *")].filter((e) => { const r = e.getBoundingClientRect(); return r.width && r.height && r.right > innerWidth + 1 && !e.closest("dialog, .pop, #toast"); }).slice(0, 6).map((e) => e.tagName + "#" + e.id);
      return JSON.stringify({ width: innerWidth, doc: document.documentElement.scrollWidth - innerWidth, out, rotulo: document.querySelector("#brainChip .lb").getBoundingClientRect().width > 0 });`, "600"], { stdout: "pipe", stderr: "pipe" });
    if (narrow.exitCode !== 0) throw new Error(narrow.stderr.toString().slice(-800));
    expect(JSON.parse(narrow.stdout.toString())).toEqual({ width: 600, doc: 0, out: [], rotulo: true });
  }, 90_000);

  test("pedido de permissão mostra o comando uma vez; Enter com texto põe na fila, Enter vazio permite", async () => {
    const id = await env.chat("claude-padrao", "DEMO-RICA: retoma", { mode: "ask" });
    await page(`go({ type: "chat", id: "${id}" });`);
    await until(`document.querySelector('#msgs [data-decide="allow"]')`);
    const card = await page(`const t = document.querySelector("#msgs").innerText; return { times: t.split("criar-contas.sh").length - 1, hint: document.querySelector("#prompt").placeholder };`);
    expect(card.times).toBe(1);
    expect(card.hint).toContain("Enter permite");
    expect(await page(OVERFLOW)).toEqual({ over: 0, scroll: 0, col: 760 });

    // escreve a próxima enquanto o agente espera: vai pra fila, e o agente continua parado esperando
    await page(`const p = document.querySelector("#prompt"); p.value = "segunda mensagem"; p.dispatchEvent(new Event("input", { bubbles: true })); ${key("Enter")}`);
    await until(`document.querySelector("#queued .bubble")`);
    let c = await env.api(`convos/${id}`);
    expect(c.queue.map((q: any) => q.text)).toEqual(["segunda mensagem"]);
    expect([c.working, c.waiting, c.messages.length]).toEqual([true, true, 2]);
    expect(await page(`return [document.querySelector("#queued").innerText.includes("segunda mensagem"), document.querySelector("#prompt").value, document.querySelector("#send").classList.contains("stop")]`)).toEqual([true, "", true]);

    // Enter com o campo vazio permite; ao terminar, a mensagem da fila entra sozinha
    await page(key("Enter"));
    c = await env.until(async () => { const x = await env.api(`convos/${id}`); return x.messages.length === 4 && x; });
    expect(c.messages[2].text).toBe("segunda mensagem");
    expect(c.queue).toBeUndefined();
    await until(`!document.querySelector("#queued .bubble") && document.querySelectorAll("#msgs > .m").length === 4`);
    await env.api(`convos/${id}/stop`, "POST", {});
  }, SLOW);

  test("menus do campo: modelo em lista curta com esforço e mais modelos ao lado, modo com descrição, e o número escolhe", async () => {
    await page(`go({ type: "home" }); closePops(); document.querySelector("#modelChip").click();`);
    const m = await page(`const p = document.querySelector("#popModel"); return { aberto: p.classList.contains("on"), linhas: [...p.querySelectorAll(":scope > .opt")].map((b) => [b.textContent, b.dataset.key]),
      lados: [...p.querySelectorAll(":scope > .subrow > .opt")].map((b) => b.childNodes[0].textContent), campoALado: !!p.querySelector(".subrow .sub #modelFree") && !p.querySelector(":scope > #modelFree") }`);
    expect(m).toEqual({ aberto: true, linhas: [["Fable", "1"], ["Opus", "2"], ["Sonnet", "3"], ["Haiku", "4"]], lados: ["Esforço", "Mais modelos"], campoALado: true });
    await page(`document.dispatchEvent(new KeyboardEvent("keydown", { key: "3", bubbles: true }));`);
    expect(await page(`return [document.querySelector("#popModel").classList.contains("on"), document.querySelector("#modelChip .lb").textContent.startsWith("Sonnet")]`)).toEqual([false, true]);
    await page(`document.querySelector("#modelChip").click(); document.querySelector('#popModel [data-model=""]').click(); document.querySelector("#modelChip").click(); document.querySelector('#popModel [data-effort=""]').click();`);
    await page(`document.querySelector("#modeChip").click();`);
    const modo = await page(`const p = document.querySelector("#popMode"); return { aberto: p.classList.contains("on"), linhas: [...p.querySelectorAll(".opt")].map((b) => [b.querySelector("b").textContent, !!b.querySelector("small").textContent, b.dataset.key]) }`);
    expect(modo).toEqual({ aberto: true, linhas: [["Só leitura", true, "1"], ["Pergunta antes", true, "2"], ["Pode editar", true, "3"], ["Acesso total", true, "4"]] });
    await page(`document.querySelector('#popMode [data-mode="edit"]').click();`);
    expect(await page(`return [document.querySelector("#popMode").classList.contains("on"), document.querySelector("#modeChip .lb").textContent]`)).toEqual([false, "Pode editar"]);
    await page(`document.querySelector("#modeChip").click(); document.dispatchEvent(new KeyboardEvent("keydown", { key: "2", bubbles: true }));`);
    expect(await page(`return document.querySelector("#modeChip .lb").textContent`)).toBe("Pergunta antes");
  }, SLOW);

  test("lateral: a cópia de trabalho conta para o repositório de origem e a pasta de rascunho vai para Avulsas", async () => {
    const r = await page(`return {
      copia: copyOf("/Users/ana/.revoada/worktrees/loja/projeto-ajustar-rodape-b359"), normal: copyOf("/Users/ana/git/loja"),
      rascunhos: ["/private/tmp/claude-501/x/scratchpad/api", "/private/tmp/claude-501/x/scratchpad", "/Users/ana/sessoes/scratch-2026-11-11-5ec934"].map(isScratch),
      projetos: ["/Users/ana/git/loja", "/Users/ana/git/scratchy", "/var/folders/m9/abc/T/repo"].map(isScratch) }`);
    expect(r).toEqual({ copia: "loja", normal: "", rascunhos: [true, true, true], projetos: [false, false, false] });
  });

  test("lateral: das conversas de outros programas ficam só as da última semana, uma por título e sem as que um agente abriu; as daqui ficam todas", async () => {
    const r = await page(`const dia = 86_400_000, agora = Date.now();
      return sideThreads([{ type: "imp", id: "a", title: "igual", at: agora - dia }, { type: "imp", id: "b", title: "igual", at: agora - 2 * dia }, { type: "imp", id: "c", title: "velha", at: agora - 9 * dia },
        { type: "chat", id: "d", title: "igual", at: agora - 30 * dia }, { type: "chat", id: "e", title: "igual", at: agora - 40 * dia },
        { type: "imp", id: "f", title: "Primeiro carregue com ToolSearch as definições", at: agora }, { type: "imp", id: "g", title: "Você tem o servidor MCP runway. Pode gerar", at: agora },
        { type: "imp", id: "h", title: "Você é o testador de lançamento do app", at: agora }, { type: "imp", id: "i", title: "você consegue ver por que o deploy caiu?", at: agora },
        { type: "chat", id: "j", title: "Você é o revisor", at: agora }]).map((t) => t.id)`);
    expect(r).toEqual(["a", "d", "e", "i", "j"]);
  });

  test("menu da sala: o botão direito fixa no topo, arquiva (volta por Arquivadas) e apaga com confirmação", async () => {
    await page(`expanded.clear(); await refresh(); go({ type: "home" });`);
    const alvo = await page(`const t = sideThreads(allThreads()).filter((t) => t.type === "chat").pop(); return { key: keyOf(t), total: S.convos.length }`);
    const menu = (acao: string) => page(`document.querySelector('#threads [data-open="${alvo.key}"]').dispatchEvent(new MouseEvent("contextmenu", { bubbles: true, cancelable: true, clientX: 60, clientY: 200 }));
      const itens = [...document.querySelectorAll("#popRow .opt")].map((b) => b.textContent.trim()); document.querySelector('#popRow [data-row="${acao}"]').click(); return itens`);
    await page(`expanded.add("salas"); renderThreads.last = null; renderThreads();`);
    expect(await menu("pin")).toEqual(["Fixar no topo", "Renomear", "Arquivar", "Apagar"]);
    await until(`document.querySelector("#threads > .item[data-open]")?.dataset.open === "${alvo.key}" && !!document.querySelector('#threads [data-open="${alvo.key}"] .pin')`);
    expect((await menu("archive"))[0]).toBe("Desafixar");
    await until(`!document.querySelector('#threads [data-open="${alvo.key}"]') && [...document.querySelectorAll("#threads .item.more")].some((b) => b.textContent.trim() === "Arquivadas 1")`);
    await page(`document.querySelector('#threads [data-more="arquivadas"]').click();`);
    await until(`!!document.querySelector('#threads [data-open="${alvo.key}"]')`);
    expect((await menu("archive"))[2]).toBe("Desarquivar");
    await until(`![...document.querySelectorAll("#threads .item.more")].some((b) => b.textContent.trim().startsWith("Arquivadas"))`);
    // apagar pede confirmação dentro do menu; Cancelar não apaga
    await menu("del");
    expect(await page(`const p = document.querySelector("#popRow"); const r = [p.classList.contains("on"), p.querySelector("p").textContent]; p.querySelector('[data-row="del-no"]').click(); return r`)).toEqual([true, "A conversa some de vez."]);
    expect(await page(`return S.convos.length`)).toBe(alvo.total);
    await menu("del");
    await page(`document.querySelector('#popRow [data-row="del-yes"]').click();`);
    await until(`S.convos.length === ${alvo.total - 1} && !document.querySelector('#threads [data-open="${alvo.key}"]')`);
    expect(await page(`return [S.marks.pinned.length, S.marks.archived.length]`)).toEqual([0, 0]);
  }, SLOW);

  test("lateral nova: Salas com as conversas recentes, Projetos que abrem, Bots que levam a Contas e o menu da pessoa", async () => {
    await page(`localStorage.removeItem("openDirs"); openDirs.clear(); expanded.clear(); setCwd(S.home); await refresh(); go({ type: "home" });`);
    const side = await page(`const all = allThreads(); return { groups: [...document.querySelectorAll("#threads .grupo")].map((g) => g.textContent.trim()), total: all.length,
      salas: [...document.querySelectorAll("#threads > .item[data-open]")].map((b) => b.dataset.open), first: all.slice(0, 8).map((t) => t.type + ":" + t.id), more: !!document.querySelector('#threads [data-more="salas"]'),
      hash: !!document.querySelector("#threads > .item[data-open] svg.i"), dirs: [...document.querySelectorAll("#threads .org-cab [data-dir]")].map((b) => [b.dataset.dir, b.getAttribute("aria-expanded")]), nav: [...document.querySelectorAll("aside .nav .item")].filter((b) => b.getBoundingClientRect().height).map((b) => b.querySelector(".t").textContent) };`);
    expect(side.groups).toEqual(["Salas", "Projetos"]);
    expect(side.nav).toEqual(["Precisa de você", "Rotinas", "Tarefas"]);
    expect(side.total).toBeGreaterThan(8);          // os testes de cima já abriram mais conversas do que cabem
    expect(side.salas).toEqual(side.first);         // as oito mais recentes, na ordem
    expect([side.more, side.hash]).toEqual([true, true]);
    expect(side.dirs.length).toBeGreaterThan(1);
    expect(side.dirs.every(([, open]: [string, string]) => open === "false")).toBe(true);
    // "Mostrar mais" abre a lista inteira de Salas
    await page(`document.querySelector('#threads [data-more="salas"]').click();`);
    expect(await page(`return document.querySelectorAll("#threads > .item[data-open]").length`)).toBe(side.total);
    await page(`document.querySelector('#threads [data-more="salas"]').click();`);
    // um projeto abre e mostra só as conversas dele; o + põe a pasta no campo e vai para o novo chat
    const dir = env.home;
    const inside = await page(`document.querySelector('#threads .org-cab [data-dir="${dir}"]').click(); const rows = [...document.querySelectorAll("#threads .item.thread[data-open]")];
      return { open: document.querySelector('#threads .org-cab [data-dir="${dir}"]').getAttribute("aria-expanded"), rows: rows.length, mine: rows.every((r) => { const [type, id] = r.dataset.open.split(":"); return allThreads().find((t) => t.type === type && t.id === id).cwd === "${dir}"; }), kept: localStorage.getItem("openDirs") };`);
    expect([inside.open, inside.mine, inside.kept]).toEqual(["true", true, JSON.stringify([dir])]);
    expect(inside.rows).toBeGreaterThan(0);
    expect(inside.rows).toBeLessThanOrEqual(5);
    await page(`document.querySelector('#threads .org-cab [data-dir="${dir}"]').click();`);
    expect(await page(`return document.querySelectorAll("#threads .item.thread").length`)).toBe(0);
    await page(`go({ type: "board" }); document.querySelector('#threads [data-newin="${env.repo}"]').click();`);
    expect(await page(`return [view.type, cwd()]`)).toEqual(["home", env.repo]);
    await page(`setCwd(S.home);`);

    // Bots: uma linha por conta, com a barra de uso ou "Entrar"; clicar leva a Contas com a conta em foco
    const bots = await page(`return [...document.querySelectorAll("#bots .item.botl")].map((b) => [b.dataset.acc, b.querySelector(".t").textContent, b.querySelector(".tag").textContent, !!b.querySelector("svg.logo"), b.querySelector(".entrar") ? "Entrar" : b.querySelector(".uso-m") ? "uso" : ""]);`);
    // só entra em Bots a conta de provedor instalado na máquina (no CI, sem o Gemini e o Grok, elas ficam de fora)
    const estado = await env.api("state"), accounts = estado.accounts;
    const instalados = new Set(estado.providers.filter((p: any) => p.installed).map((p: any) => p.id));
    expect(bots.map((b: string[]) => b[0])).toEqual(accounts.filter((a: any) => instalados.has(a.provider)).map((a: any) => a.id));
    expect(bots.find((b: string[]) => b[0] === "claude-padrao")).toEqual(["claude-padrao", "Claude", accounts.find((a: any) => a.id === "claude-padrao").label, true, "uso"]);
    expect(bots.filter((b: any[]) => b[4] === "Entrar").map((b: any[]) => b[0])).toEqual(accounts.filter((a: any) => instalados.has(a.provider) && !a.status.ok).map((a: any) => a.id));
    await page(`document.querySelector('#bots [data-acc="claude-padrao"]').click();`);
    await until(`document.querySelector('#accList .conta.foco')`);
    expect(await page(`return [view.type, view.focus, document.querySelector("#accList .conta.foco").dataset.conta, document.querySelector('#bots [data-acc="claude-padrao"]').classList.contains("on"), !!document.querySelector("#accList .conta.foco .uso .trilha"), [...document.querySelectorAll("#accList .prov-cab b")].map((b) => b.textContent)]`))
      .toEqual(["accounts", "claude-padrao", "claude-padrao", true, true, ["Claude", "Codex", "Gemini", "Grok"]]);

    // pé da lateral: o menu da pessoa leva a Cérebro e Clones; o tema nasce escuro e troca pelo botão
    await page(`localStorage.removeItem("theme"); applyTheme("dark"); document.querySelector("#meBtn").click();`);
    expect(await page(`return [document.querySelector("#popMe").classList.contains("on"), [...document.querySelectorAll("#popMe .opt")].map((b) => b.textContent.trim().replace(/\\s*\\d.*$/, "")), document.querySelector("#meName").textContent.length > 0, /^\\d+ contas?, \\d+ projetos?$/.test(document.querySelector("#meSub").textContent)]`))
      .toEqual([true, ["Cérebro", "Clones", "Acompanhar pelo celular", "Ajustes"], true, true]);
    await page(`document.querySelector('#popMe [data-go="clones"]').click();`);
    expect(await page(`return [view.type, document.querySelector("#popMe").classList.contains("on")]`)).toEqual(["clones", false]);
    await page(`document.querySelector("#meBtn").click(); document.querySelector('#popMe [data-go="brain"]').click();`);
    expect(await page(`return view.type`)).toBe("brain");
    await page(`document.querySelector("#meBtn").click(); document.querySelector("#meSettings").click();`);
    expect(await page(`return [document.querySelector("#popSettings").classList.contains("on"), document.querySelector("#popSettings").innerText.includes("Rodízio de contas")]`)).toEqual([true, true]);
    // um ajuste liga e desliga pelo painel (o clique não pode ser engolido pela troca de tema)
    const was = (await env.api("state")).settings.autoReview;
    await page(`document.querySelector('#popSettings [data-set="autoReview"]').click();`);
    await env.until(async () => (await env.api("state")).settings.autoReview === !was);
    await env.api("settings", "POST", { autoReview: was });
    await page(`closePops();`);
    const theme = await page(`const t = () => document.documentElement.dataset.theme, bg = () => getComputedStyle(document.body).backgroundColor; const a = [t(), bg()]; document.querySelector("#themeBtn").click(); const b = [t(), bg(), localStorage.getItem("theme")]; document.querySelector("#themeBtn").click(); return [a, b, t()];`);
    expect(theme).toEqual([["dark", "rgb(17, 17, 18)"], ["light", "rgb(251, 251, 250)", "light"], "dark"]);
    await page(`go({ type: "home" });`);
  }, SLOW);

  test("Precisa de você: junta permissão pendente, plano do supervisor e tarefa em Revisar, e responde dali", async () => {
    const asking = await env.chat("claude-padrao", "DEMO-RICA: precisa de mim", { mode: "ask" });
    await env.until(async () => (await env.api(`convos/${asking}`)).waiting);
    const mission = (await env.api("missions", "POST", { prompt: "Exportação e importação da loja", cwd: env.repo, targets: ["claude-padrao"] })).id;
    await env.until(async () => (await env.api(`missions/${mission}`)).state === "plano", 30_000);
    const card = (await env.api("board", "POST", { prompt: "só conversa, sem mexer em arquivo", cwd: env.repo, target: "claude-padrao" }))[0];
    await env.api(`board/${card.id}/start`, "POST", {});
    await env.until(async () => { const c = (await env.api("board")).find((x: any) => x.id === card.id); return c.state === "review" && !c.working; }, 30_000);

    await page(`await refresh(); go({ type: "need" });`);
    await until(`document.querySelector('#needList [data-need-decide="allow"][data-conv="${asking}"]') && document.querySelector('#needList [data-need-open="mission:${mission}"]') && document.querySelector('#needList [data-need-done="${card.id}"]')`);
    const seen = await page(`const rows = [...document.querySelectorAll("#needList .pv")]; const row = document.querySelector('#needList [data-conv="${asking}"]').closest(".pv");
      return { count: document.querySelector("#needCount").textContent, hidden: document.querySelector("#needCount").hidden, rows: rows.length, on: document.querySelector('aside [data-go="need"]').classList.contains("on"),
        ask: row.innerText.replace(/\\s+/g, " "), logo: !!row.querySelector(".rosto svg.logo"), fits: document.documentElement.scrollWidth <= innerWidth && rows.every((r) => r.getBoundingClientRect().right <= innerWidth) };`);
    expect([seen.count, seen.hidden, seen.on, seen.logo, seen.fits]).toEqual([String(seen.rows), false, true, true, true]);
    expect(seen.rows).toBeGreaterThanOrEqual(3);
    expect(seen.ask).toContain("pede sua permissão");
    expect(seen.ask).toContain("Rodar este comando");
    expect(seen.ask).toContain("criar-contas.sh");

    // Permitir responde o pedido sem abrir a conversa; a linha some e o contador desce
    await page(`document.querySelector('#needList [data-need-decide="allow"][data-conv="${asking}"]').click();`);
    await env.until(async () => { const c = await env.api(`convos/${asking}`); return !c.waiting && !c.working; });
    await until(`!document.querySelector('#needList [data-conv="${asking}"]') && +document.querySelector("#needCount").textContent === ${seen.rows - 1}`);
    expect((await env.api(`convos/${asking}`)).messages.at(-1).items.some((i: any) => i.kind === "ask" && i.state === "allowed")).toBe(true);
    // tarefa em Revisar: marcar como feito dali mesmo
    await page(`document.querySelector('#needList [data-need-done="${card.id}"]').click();`);
    await env.until(async () => (await env.api("board")).find((x: any) => x.id === card.id).state === "done");
    await until(`!document.querySelector('#needList [data-need-done="${card.id}"]')`);
    // o plano abre a missão, onde se aprova
    await page(`document.querySelector('#needList [data-need-open="mission:${mission}"]').click();`);
    await until(`view.type === "mission" && view.id === "${mission}" && document.querySelector('#misActs [data-m="start"]')`);
    await env.api(`missions/${mission}`, "DELETE");
    await env.api(`board/${card.id}`, "DELETE");
    await page(`await refresh(); go({ type: "need" });`);
    await until(`!document.querySelector('#needList [data-need-open="mission:${mission}"]')`);
    // sem nada esperando, a página diz isso e o contador some da lateral
    const rest = await page(`return [document.querySelectorAll("#needList .pv").length, document.querySelector("#needCount").hidden, !!document.querySelector("#needList .vazio")]`);
    expect(rest[1]).toBe(rest[0] === 0);
    expect(rest[2]).toBe(rest[0] === 0);
    await page(`go({ type: "home" });`);
  }, 90_000);

  test("Rotinas: a rotina escrita vai para o campo com a hora aberta, e a chave da lista para e retoma", async () => {
    await page(`picked.clear(); picked.add("claude-padrao"); setCwd(S.home); go({ type: "sched" });`);
    await until(`document.querySelector("#schedNew") && document.querySelector("#v-sched").classList.contains("on")`);
    await page(`document.querySelector("#schedNew").value = "resumo do que mudou na semana"; document.querySelector("#schedNewGo").click();`);
    await until(`view.type === "home" && document.querySelector("#popSched").classList.contains("on")`);
    expect(await page(`return [document.querySelector("#prompt").value, document.querySelector("#schedNew").value]`)).toEqual(["resumo do que mudou na semana", ""]);
    await page(`document.querySelector('#schedKind [data-k="daily"]').click(); document.querySelector("#schedSave").click();`);
    const made = await env.until(async () => { const l = await env.api("schedules"); return l.length === 1 && l[0]; });
    expect([made.prompt, made.kind, made.enabled, made.target]).toEqual(["resumo do que mudou na semana", "daily", true, "claude-padrao"]);
    await until(`document.querySelector("#prompt").value === ""`);
    await page(`await refresh(); go({ type: "sched" });`);
    await until(`document.querySelector('#schedList .chave[aria-checked="true"]')`);
    expect(await page(`const r = document.querySelector("#schedList .r"); return [!!r.querySelector(".rosto svg.logo"), r.classList.contains("off"), r.querySelector(".st").innerText.includes("próxima:"), document.documentElement.scrollWidth <= innerWidth]`)).toEqual([true, false, true, true]);
    await page(`document.querySelector("#schedList .chave").click();`);
    await until(`document.querySelector('#schedList .chave[aria-checked="false"]') && document.querySelector("#schedList .r.off")`);
    expect((await env.api("schedules"))[0].enabled).toBe(false);
    expect(await page(`return [document.querySelector("#schedLead").textContent, document.querySelector("#schedList .st").innerText.includes("parado")]`)).toEqual(["0 pedidos agendados, 1 parado.", true]);
    await page(`document.querySelector("#schedList .chave").click();`);
    await until(`document.querySelector('#schedList .chave[aria-checked="true"]')`);
    expect((await env.api("schedules"))[0].enabled).toBe(true);
    await page(`document.querySelector("#schedList [data-rm]").click();`);
    await until(`!document.querySelector("#schedList .r")`);
    await page(`picked.clear(); go({ type: "home" });`);
  }, SLOW);

  test("conversa no molde de sala: rosto do provedor, etiqueta da conta, passos contados, e a aba Terminal vai e volta", async () => {
    const id = await env.chat("claude-padrao", "DEMO-RICA: sala");
    await env.idle(id);
    await page(`await refresh(); go({ type: "chat", id: "${id}" });`);
    await until(`chat && chat.id === "${id}" && !chat.working && document.querySelector("#msgs .acts .cnt")`);
    const label = (await env.api("state")).accounts.find((a: any) => a.id === "claude-padrao").label;
    const room = await page(`const ms = [...document.querySelectorAll("#msgs > .m")], bot = ms.at(-1), me = ms[0];
      return { title: document.querySelector("#chTitle").textContent === chat.title, dir: document.querySelector("#chDir").innerText.trim(), tabs: [...document.querySelectorAll("#v-chat .abas button")].map((b) => [b.textContent, b.getAttribute("aria-current")]),
        acc: document.querySelector("#chAcc").innerText.trim(), acts: [...document.querySelectorAll("#chActs button")].map((b) => b.textContent),
        bot: [!!bot.querySelector('[data-k="av"] .rosto svg.logo'), bot.querySelector(".who b").textContent, bot.querySelector(".who .tag").textContent, /^\\d\\d:\\d\\d$/.test(bot.querySelector(".who time").textContent)],
        me: [me.querySelector('[data-k="av"] .rosto.eu').textContent.length, me.querySelector(".who b").textContent], steps: document.querySelector("#msgs .acts .cnt").textContent,
        left: Math.round(bot.querySelector('[data-k="av"]').getBoundingClientRect().left - document.querySelector("#msgs").getBoundingClientRect().left), strip: getComputedStyle(document.querySelector("#dirChip")).display };`);
    expect(room).toEqual({ title: true, dir: "~", tabs: [["Conversa", "true"], ["Terminal", null]], acc: `Claude · ${label}`, acts: ["Plano", "Mudanças", "Revisar", "Segurança"],
      bot: [true, "Claude", label, true], me: [1, "Você"], steps: "2 passos", left: 0, strip: "none" });
    expect(await page(OVERFLOW)).toEqual({ over: 0, scroll: 0, col: 760 });
    // Terminal abre o terminal do agente desta conversa, na mesma pasta; a aba Conversa volta
    await page(`document.querySelector("#chTerm").click();`);
    await until(`view.type === "session" && view.from === "${id}" && document.querySelector("#stage .pane.show") && document.querySelector("#thTabs [data-back]")`);
    const term = await page(`const s = S.sessions.find((x) => x.id === view.id); return [s.accountId, s.cwd === "${env.home}", [...document.querySelectorAll("#thTabs button")].map((b) => [b.textContent, b.getAttribute("aria-current")]), view.id];`);
    expect(term.slice(0, 3)).toEqual(["claude-padrao", true, [["Conversa", null], ["Terminal", "true"]]]);
    await page(`document.querySelector("#thTabs [data-back]").click();`);
    await until(`view.type === "chat" && chat && chat.id === "${id}"`);
    // de novo: reaproveita o terminal que já está aberto em vez de abrir outro
    await page(`document.querySelector("#chTerm").click();`);
    await until(`view.type === "session"`);
    expect(await page(`return view.id`)).toBe(term[3]);
    await env.api(`sessions/${term[3]}?purge=1`, "DELETE");
    await page(`await refresh();`);
    await until(`view.type === "home"`);
  }, SLOW);

  test("início no molde de sala vazia e a pílula de apps: atalhos abrem o que já existe, sem item morto", async () => {
    await page(`setCwd(S.home); go({ type: "home" });`);
    const home = await page(`return { h1: document.querySelector("#v-home h1").innerText.replace(/\\s+/g, " "), serif: getComputedStyle(document.querySelector("#v-home h1")).fontFamily.includes("Newsreader"), cards: [...document.querySelectorAll("#heroCards b")].map((b) => b.textContent),
      fonts: await Promise.all(["/geist.woff2", "/geist-mono.woff2", "/newsreader.woff2"].map((u) => fetch(u).then((r) => r.status + " " + r.headers.get("content-type")))), remote: [...document.querySelectorAll("link[href], script[src]")].map((e) => e.getAttribute("href") || e.getAttribute("src")).filter((u) => /^https?:/.test(u)),
      dead: [...document.querySelectorAll("aside button")].map((b) => b.textContent.trim()).filter((t) => /Reuni|Voz/.test(t)) };`);
    expect(home).toEqual({ h1: `O que vamos fazer em ${env.home.split("/").pop()}?`, serif: true, cards: ["Escolher quem responde", "Trocar de projeto", "Despejar tarefas"], fonts: ["200 font/woff2", "200 font/woff2", "200 font/woff2"], remote: [], dead: [] });
    await page(`document.querySelector('#heroCards [data-hero="target"]').click();`);
    expect(await page(`return [document.querySelector("#popTarget").classList.contains("on"), document.querySelector("#popTarget").getBoundingClientRect().right <= innerWidth]`)).toEqual([true, true]);
    await page(`document.querySelector('#heroCards [data-hero="dir"]').click();`);
    expect(await page(`return [document.querySelector("#popDir").classList.contains("on"), document.querySelector("#popTarget").classList.contains("on")]`)).toEqual([true, false]);
    await page(`closePops(); document.querySelector('#heroCards [data-hero="board"]').click();`);
    expect(await page(`return view.type`)).toBe("board");
    // a pílula abre a janela de apps com o que a API de skills e MCP já entrega, e leva à seção em Contas
    await page(`document.querySelector("#appsPill").click();`);
    await until(`document.querySelector("#appsDlg").open && document.querySelector("#appsBody .switch")`);
    expect(await page(`const t = document.querySelector("#appsBody").innerText; return [t.includes("Servidores MCP"), t.includes("Skills"), t.includes("Usar nas outras contas"), document.querySelector("#appsText").textContent.length > 0]`)).toEqual([true, true, true, true]);
    await page(`document.querySelector("#appsBody [data-apps-acc]").click();`);
    await until(`view.type === "accounts" && !document.querySelector("#appsDlg").open && document.querySelector("#toolsBox .switch")`);
    await page(`go({ type: "home" });`);
  }, SLOW);
});
