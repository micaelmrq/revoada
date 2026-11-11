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
