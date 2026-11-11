// A demonstração do site (site/demo/) é o painel de public/index.html com um servidor de mentira dentro
// da página. Três coisas podem dar errado sem ninguém ver: o que está publicado ficar para trás do painel,
// o servidor de mentira parar de contar a história (limite, troca de conta, permissão, sugestão), e a
// página gerada quebrar no navegador. Cada teste aqui pega uma.
import { afterAll, describe, expect, test } from "bun:test";
import { existsSync, mkdtempSync, readFileSync, rmSync } from "fs";
import { tmpdir } from "os";
import { join } from "path";
import { CENAS, PEDIDOS, PLANO, REVISAO } from "../scripts/demo-cenas";
import { gera } from "../scripts/site-demo";

const SITE = join(import.meta.dir, "../site");

test("site/demo está em dia com public/index.html (rode bun scripts/site-demo.ts)", () => {
  for (const [nome, texto] of Object.entries(gera())) expect(readFileSync(join(SITE, "demo", nome), "utf8") === texto, `site/demo/${nome} está desatualizado`).toBe(true);
});

test("a página gerada não pede nada ao servidor nem a endereço de fora", () => {
  const { "index.html": html, "demo.js": js } = gera();
  expect(html.match(/(?:src|href)="\/[^"]*"|url\("\/[^"]*"\)/g)).toBeNull();
  expect(html).not.toContain("xterm");
  expect((html + js).match(/https?:\/\/(?!demo\/|www\.w3\.org\/)[a-z0-9.-]+/gi)).toBeNull();
  expect(() => new Bun.Transpiler({ loader: "js" }).transformSync(js)).not.toThrow();
});

// o servidor de mentira, fora do navegador: uma janela de faz de conta e o relógio dele andando na mão
function servidor() {
  const janela: any = { REVOADA_DEMO: { cenas: CENAS.map((c) => ({ ...c, quando: [c.quando.source, c.quando.flags] })), pedidos: PEDIDOS, plano: PLANO, revisao: REVISAO, logo: "<svg/>" }, location: { href: "http://demo/demo/" } };
  new Function("window", readFileSync(join(import.meta.dir, "../scripts/site-demo/servidor.js"), "utf8"))(janela);
  const s = janela.REVOADA_DEMO.servidor;
  const anda = (ms: number) => { for (let t = 0; t < ms; t += 40) s.avanca(40); };
  const api = async (caminho: string, method = "GET", body?: unknown) => { const r = await janela.fetch(`/api/${caminho}`, { method, body: body ? JSON.stringify(body) : undefined }); return { status: r.status, corpo: await r.json() }; };
  return { janela, s, anda, api };
}

describe("servidor de mentira", () => {
  test("o dia de exemplo: três coisas esperando a pessoa, cinco tarefas, duas rotinas", async () => {
    const { api } = servidor();
    const S = (await api("state")).corpo, quadro = (await api("board")).corpo;
    expect(S.accounts.map((a: any) => `${a.provider}:${a.label}`)).toEqual(["claude:pessoal", "codex:pessoal", "gemini:pessoal", "grok:pessoal", "claude:trabalho", "codex:trabalho"]);
    expect(S.convos.filter((c: any) => c.waiting).length).toBe(1);
    expect(S.missions.map((m: any) => m.state)).toEqual(["plano"]);
    expect(quadro.map((k: any) => k.state)).toEqual(["done", "review", "doing", "todo", "todo"]);
    expect((await api("schedules")).corpo.length).toBe(2);
    expect(JSON.stringify(S)).not.toMatch(/micael|arara/i);
  });

  test("o pedido de exemplo bate no limite, troca de conta, pede permissão e termina com a sugestão", async () => {
    const { api, anda, s } = servidor();
    const { id } = (await api("chat", "POST", { prompt: PEDIDOS.paginacao, targets: ["pool:claude"], cwd: s.API, mode: "ask" })).corpo;
    anda(12_000);
    let c = (await api(`convos/${id}`)).corpo;
    const resposta = () => c.messages.at(-1);
    expect(c.waiting).toBe(true);
    expect(resposta().items.find((i: any) => i.kind === "note").text).toBe("Claude · pessoal bateu no limite. Continuando em Claude · trabalho, com a conversa.");
    expect(c.accountId).toBe("claude-trabalho");
    const pessoal = (await api("state")).corpo.accounts[0];
    expect(pessoal.limit).toBeTruthy();
    expect(pessoal.usage[0].pct).toBe(100);
    const ask = resposta().items.find((i: any) => i.kind === "ask");
    expect(ask).toMatchObject({ state: "pending", tool: "Bash", detail: "bun test tests/pedidos.test.ts" });
    expect((await api(`convos/${id}/decide`, "POST", { req: ask.req, decision: "allow" })).status).toBe(200);
    anda(12_000);
    c = (await api(`convos/${id}`)).corpo;
    expect(c).toMatchObject({ working: false, waiting: false, title: "Paginação por cursor em pedidos", suggest: "abre o PR com isso" });
    expect(resposta().state).toBe("done");
    expect(resposta().items.at(-1).text).toBe(CENAS[0].passos.at(-1)!.texto);
  });

  test("a conversa ao vivo manda tudo no primeiro aviso e depois só o que mudou", async () => {
    const { janela, api, anda, s } = servidor();
    const { id } = (await api("chat", "POST", { prompt: PEDIDOS.suite, targets: ["pool:codex"], cwd: s.API, mode: "edit" })).corpo;
    const avisos: any[] = [], fonte = new janela.EventSource(`/api/convos/${id}/stream`);
    fonte.onmessage = (e: any) => avisos.push(JSON.parse(e.data));
    await Bun.sleep(20);
    anda(6000);
    await Bun.sleep(80);
    fonte.close();
    expect(avisos[0].first).toBe(true);
    expect(avisos.length).toBeGreaterThan(1);
    expect(avisos.slice(1).every((a) => !a.first)).toBe(true);
    expect(avisos.at(-1).meta.working).toBe(false);
  });

  test("o que depende da máquina responde que não roda, em vez de fingir", async () => {
    const { api, s } = servidor();
    for (const [caminho, corpo] of [["sessions", { accountId: "claude-padrao", kind: "chat", cwd: s.API }], ["attach", {}], ["remote", { on: true }], ["accounts", { provider: "claude", label: "x" }], ["chat", { prompt: "oi", targets: ["pool:claude"], cwd: s.API, terminal: true }]] as const) {
      const r = await api(caminho, "POST", corpo);
      expect(r.status).toBe(400);
      expect(r.corpo.error).toContain("Na demonstração");
    }
    expect((await (await servidor().janela.fetch("https://exemplo.dev/qualquer")).text())).toBe("a demonstração não usa a rede");
  });

  test("tarefa começada vai para Revisar com a leitura de outro provedor", async () => {
    const { api, anda } = servidor();
    const sdk = (await api("board")).corpo.find((k: any) => k.title === PEDIDOS.tarefas[3]);
    await api(`board/${sdk.id}/start`, "POST", {});
    anda(20_000);
    const depois = (await api("board")).corpo.find((k: any) => k.id === sdk.id);
    expect(depois).toMatchObject({ state: "review", reviewed: true, working: false });
    const c = (await api(`convos/${depois.convo}`)).corpo;
    expect(c.messages.at(-1)).toMatchObject({ review: true, state: "done" });
    expect(c.worktree.branch).toStartWith("revoada/atualizar-o-sdk-de-pagamento-");
  });
});

// A página gerada, num Chrome sem janela (o mesmo jeito de tests/tela.test.ts): o roteiro usa o painel de
// verdade do pedido até a sugestão, sem erro no console e sem pedir nada fora do que o site entrega.
const CHROME = [process.env.CHROME, "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome", "/Applications/Chromium.app/Contents/MacOS/Chromium", "/Applications/Brave Browser.app/Contents/MacOS/Brave Browser", "/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge",
  ...["google-chrome", "google-chrome-stable", "chromium", "chromium-browser"].map((b) => Bun.which(b))].find((p) => p && existsSync(p));

describe.skipIf(!CHROME)("demonstração no navegador", () => {
  let chrome: any, site: any, profile = "";
  afterAll(() => { chrome?.kill(); site?.stop(true); if (profile) rmSync(profile, { recursive: true, force: true }); });

  test("o roteiro vai do pedido à sugestão, e um clique do visitante para tudo", async () => {
    site = Bun.serve({ port: 0, hostname: "127.0.0.1", fetch: (req) => { const p = new URL(req.url).pathname, f = Bun.file(join(SITE, p.endsWith("/") ? `${p}index.html` : p)); return f.exists().then((ok) => (ok ? new Response(f) : new Response("", { status: 404 }))); } });
    profile = mkdtempSync(join(tmpdir(), "revoada-chrome-"));
    chrome = Bun.spawn([CHROME!, "--headless=new", "--remote-debugging-port=0", `--user-data-dir=${profile}`, "--no-first-run", "--no-default-browser-check", "--disable-gpu", "--no-sandbox", "about:blank"], { stdout: "ignore", stderr: "pipe" });
    let log = "";
    const url = await new Promise<string>(async (resolve, reject) => {
      const timer = setTimeout(() => reject(new Error(`o Chrome não abriu a porta de depuração:\n${log}`)), 20_000), dec = new TextDecoder();
      for await (const chunk of chrome.stderr) { log += dec.decode(chunk); const m = log.match(/DevTools listening on (ws:\/\/\S+)/); if (m) { clearTimeout(timer); return resolve(m[1]); } }
    });
    const ws = new WebSocket(url);
    await new Promise((r, j) => { ws.onopen = r; ws.onerror = j; });
    let seq = 0, session = "";
    const waiting = new Map<number, (m: any) => void>(), pedidos: string[] = [], erros: string[] = [];
    ws.onmessage = (e) => {
      const m = JSON.parse(String(e.data));
      if (m.id && waiting.has(m.id)) { waiting.get(m.id)!(m); waiting.delete(m.id); }
      if (m.method === "Network.requestWillBeSent" && !m.params.request.url.startsWith("data:")) pedidos.push(new URL(m.params.request.url).pathname);
      if (m.method === "Runtime.exceptionThrown") erros.push(m.params.exceptionDetails.exception?.description || m.params.exceptionDetails.text);
      if (m.method === "Runtime.consoleAPICalled" && m.params.type === "error") erros.push(m.params.args.map((a: any) => a.value ?? a.description).join(" "));
    };
    const cdp = (method: string, params: object = {}, sid = session) => new Promise<any>((resolve, reject) => { const id = ++seq; waiting.set(id, (m) => (m.error ? reject(new Error(`${method}: ${m.error.message}`)) : resolve(m.result))); ws.send(JSON.stringify({ id, method, params, ...(sid ? { sessionId: sid } : {}) })); });
    const page = async (expression: string) => { const r = await cdp("Runtime.evaluate", { expression: `(() => { ${expression} })()`, returnByValue: true }); if (r.exceptionDetails) throw new Error(r.exceptionDetails.exception?.description || r.exceptionDetails.text); return r.result.value; };
    // o relógio da demonstração anda na mão, dez vezes mais rápido que o de parede
    const ate = async (expr: string, ms = 30_000) => { for (const fim = Date.now() + ms; Date.now() < fim; await Bun.sleep(20)) if (await page(`REVOADA_DEMO.servidor.avanca(200); return !!(${expr})`)) return; throw new Error(`esperei demais por ${expr}`); };
    const { targetId } = await cdp("Target.createTarget", { url: "about:blank" }, "");
    session = (await cdp("Target.attachToTarget", { targetId, flatten: true }, "")).sessionId;
    await cdp("Emulation.setDeviceMetricsOverride", { width: 1100, height: 650, deviceScaleFactor: 1, mobile: false });
    await cdp("Emulation.setFocusEmulationEnabled", { enabled: true });
    for (const d of ["Page", "Runtime", "Network"]) await cdp(`${d}.enable`);
    await cdp("Page.navigate", { url: `http://127.0.0.1:${site.port}/demo/` });
    for (const fim = Date.now() + 15_000; Date.now() < fim; await Bun.sleep(50)) if (await page(`return typeof REVOADA_DEMO === "object" && !!document.querySelector("#demo-cursor")`).catch(() => false)) break;

    await ate(`view.type === "chat" && document.querySelector("#msgs .sys.amber")`);
    await ate(`document.querySelector('#bots [data-acc="claude-padrao"] .pct')?.textContent === "100%"`);
    await ate(`document.querySelector('#msgs [data-decide="allow"]')`);
    await ate(`chat && !chat.working && document.querySelector("#prompt").placeholder === "abre o PR com isso"`);
    expect(await page(`return [document.documentElement.scrollWidth <= innerWidth, document.documentElement.scrollHeight <= innerHeight]`)).toEqual([true, true]);
    await ate(`view.type === "need"`);

    expect(await page(`return document.querySelector("#demo-cursor").classList.contains("on")`)).toBe(true);
    await cdp("Input.dispatchMouseEvent", { type: "mousePressed", x: 700, y: 300, button: "left", clickCount: 1 });
    await cdp("Input.dispatchMouseEvent", { type: "mouseReleased", x: 700, y: 300, button: "left", clickCount: 1 });
    expect(await page(`return [document.documentElement.classList.contains("demo-solta"), document.querySelector("#demo-cursor").classList.contains("on")]`)).toEqual([true, false]);

    expect(erros).toEqual([]);
    expect([...new Set(pedidos)].sort()).toEqual(["/demo/", "/demo/demo.js", "/geist-mono.woff2", "/geist.woff2", "/icon.svg", "/newsreader.woff2"]);
  }, 90_000);
});
