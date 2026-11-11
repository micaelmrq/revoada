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
