// Skills e servidores MCP em todas as contas. Cada conta isolada tem a própria pasta de configuração,
// então o que você instala na conta padrão da máquina não aparece nas outras. Aqui a conta padrão de
// cada provedor é a fonte:
//  - skills entram nas outras contas como atalhos (symlinks) para a pasta original. Pasta de verdade
//    que a conta já tenha nunca é tocada, e só os atalhos são removidos quando a skill some da fonte.
//  - servidores MCP não são copiados para dentro do perfil (o CLI regrava esse arquivo o tempo todo):
//    vão como argumento em cada execução que a Revoada inicia.
import { chmodSync, existsSync, lstatSync, mkdirSync, readFileSync, readdirSync, readlinkSync, realpathSync, rmSync, symlinkSync, writeFileSync } from "fs";
import { join } from "path";
import { AREAS, CATALOGO } from "./apps";

type Acc = { id: string; provider: string; home: string | null };
type Proc = { stdout: ReadableStream<Uint8Array>; stderr: ReadableStream<Uint8Array>; exited: Promise<number>; kill(): void };
type Estado = { estado: "pronto" | "entrar" | "entrando" | "falhou" | "instalado"; nota?: string };
// `cabecalho` (a chave de um app que pede token) só o Claude recebe; `so` limita os agentes em que o pedido vale
export type Pedido = { name: string; url?: string; comando?: string[]; cabecalho?: string; so?: string[] };

const CLIS = ["claude", "codex"] as const;
const NOME_CLI: Record<string, string> = { claude: "Claude", codex: "Codex" };
const NOME = /^[a-z0-9][a-z0-9_-]{0,39}$/;
const ESPERA_LOGIN = 5 * 60_000, VALE = 120_000;
const semCor = (s: string) => s.replace(/\x1b\[[0-9;?]*[ -\/]*[@-~]/g, "");
// a última linha que o CLI escreveu costuma ser o motivo; é ela que vai para a tela
const motivo = (out: string, err: string) => semCor(err || out).split("\n").map((l) => l.trim()).filter(Boolean).pop()?.replace(/^(error|erro):\s*/i, "").slice(0, 240) || "";
const mesmoEndereco = (a: string, b: string) => { try { const x = new URL(a), y = new URL(b); return x.host === y.host && x.pathname.replace(/\/+$/, "") === y.pathname.replace(/\/+$/, ""); } catch { return false; } };

// "npx -y pacote --flag 'com espaço'" em lista de argumentos, sem passar por shell nenhum
function partes(s: string): string[] | null {
  const out: string[] = []; let cur = "", aspa = "", abriu = false;
  for (const ch of s) {
    if (aspa) { if (ch === aspa) aspa = ""; else cur += ch; }
    else if (ch === '"' || ch === "'") { aspa = ch; abriu = true; }
    else if (/\s/.test(ch)) { if (cur || abriu) out.push(cur); cur = ""; abriu = false; }
    else cur += ch;
  }
  if (aspa) return null;
  if (cur || abriu) out.push(cur);
  return out;
}

// o que a tela mandou vira um pedido conferido, ou a frase do que está errado
export function pedido(body: { app?: unknown; name?: unknown; endereco?: unknown; chave?: unknown }): Pedido | string {
  if (typeof body.app === "string" && body.app) {
    const app = CATALOGO.find((a) => a.id === body.app);
    if (!app) return "Esse app não existe no catálogo.";
    if (app.login !== "token") return { name: app.id, url: app.url };
    const chave = String(body.chave ?? "").trim();
    if (!chave) return `Cole a chave de acesso do ${app.nome} para instalar.`;
    if (chave.length < 8 || chave.length > 600 || /[\s\x00-\x1f]/.test(chave)) return "A chave de acesso parece inválida: confira se copiou inteira e sem espaços.";
    return { name: app.id, url: app.url, cabecalho: `Authorization: Bearer ${chave.replace(/^Bearer\s*/i, "")}`, so: ["claude"] };
  }
  const name = String(body.name ?? "").trim(), alvo = String(body.endereco ?? "").trim();
  if (!name) return "Escreva um nome para o app.";
  if (!NOME.test(name)) return "O nome só pode ter letras minúsculas, números, traço e sublinhado, começando por letra ou número (até 40).";
  if (name === "revoada") return "Esse nome é da própria Revoada. Escolha outro.";
  if (!alvo) return "Escreva o endereço do servidor MCP ou o comando que o inicia.";
  if (alvo.length > 2000 || /[\x00-\x1f]/.test(alvo)) return "O endereço ou comando é inválido.";
  if (/^[a-z][a-z0-9+.-]*:\/\//i.test(alvo)) {
    let u: URL;
    try { u = new URL(alvo); } catch { return "O endereço não é uma URL válida."; }
    if (u.protocol !== "https:" || /\s/.test(alvo)) return "O endereço precisa começar com https://.";
    if (u.username || u.password) return "O endereço não pode levar usuário nem senha.";
    return { name, url: alvo };
  }
  const comando = partes(alvo);
  if (!comando) return "O comando tem aspas sem fechar.";
  if (!comando.length || comando.length > 40 || !/^[\w./@~+-]+$/.test(comando[0]) || comando[0].startsWith("-")) return "O comando precisa começar pelo nome de um programa, como npx ou uvx.";
  return { name, comando };
}

export function createTools(o: { home: string; root: string; spawn?: (provider: string, args: string[]) => Proc | null }) {
  // pasta de skills de uma conta; home null = a conta padrão da máquina
  const skillsDir = (provider: string, home: string | null) =>
    provider === "claude" ? join(home || join(o.home, ".claude"), "skills")
    : provider === "codex" ? join(home || join(o.home, ".codex"), "skills")
    : provider === "gemini" ? join(home || o.home, ".gemini", "skills")
    : join(home || join(o.home, ".grok"), "skills");

  const entries = (dir: string) => { try { return readdirSync(dir).filter((n) => !n.startsWith(".")); } catch { return []; } };
  const real = (p: string) => { try { return realpathSync(p); } catch { return null; } };
  const isLink = (p: string) => { try { return lstatSync(p).isSymbolicLink(); } catch { return false; } };

  // os atalhos que a Revoada criou, por conta: é o que permite remover só o que é dela
  const linksFile = join(o.root, "skills-links.json");
  const links: Record<string, Record<string, string>> = (() => { try { return JSON.parse(readFileSync(linksFile, "utf8")); } catch { return {}; } })();
  const saveLinks = () => writeFileSync(linksFile, JSON.stringify(links));
  const mine = (acc: Acc, name: string, p: string) => { try { return isLink(p) && links[acc.id]?.[name] === readlinkSync(p); } catch { return false; } };

  function syncSkills(acc: Acc) {
    const out = { linked: 0, own: 0, removed: 0, total: 0 };
    if (!acc.home) return out;
    const src = skillsDir(acc.provider, null), dest = skillsDir(acc.provider, acc.home);
    const source = new Map<string, string>();
    for (const name of entries(src)) { const r = real(join(src, name)); if (r && existsSync(join(r, "SKILL.md"))) source.set(name, r); }
    out.total = source.size;
    if (!source.size && !existsSync(dest)) return out;
    mkdirSync(dest, { recursive: true });
    const made = (links[acc.id] ||= {});
    for (const name of entries(dest)) {
      const p = join(dest, name);
      if (!mine(acc, name, p)) { out.own++; continue; } // pasta de verdade, ou atalho que a pessoa mesma fez
      if (source.get(name) === made[name]) continue;
      rmSync(p, { force: true }); // saiu da fonte ou mudou de lugar
      delete made[name];
      out.removed++;
    }
    for (const [name, target] of source) {
      const p = join(dest, name);
      if (existsSync(p) || isLink(p)) continue;
      symlinkSync(target, p);
      made[name] = target;
      out.linked++;
    }
    saveLinks();
    return out;
  }
  function unlinkSkills(acc: Acc) {
    if (!acc.home) return 0;
    const dest = skillsDir(acc.provider, acc.home);
    let n = 0;
    for (const name of entries(dest)) { const p = join(dest, name); if (mine(acc, name, p)) { rmSync(p, { force: true }); n++; } }
    delete links[acc.id];
    saveLinks();
    return n;
  }

  // ---------- MCP ----------
  function claudeServers(): Record<string, unknown> {
    try { return JSON.parse(readFileSync(join(o.home, ".claude.json"), "utf8")).mcpServers || {}; } catch { return {}; }
  }
  function codexServers(): Record<string, unknown> {
    try { return (Bun.TOML.parse(readFileSync(join(o.home, ".codex", "config.toml"), "utf8")) as any).mcp_servers || {}; } catch { return {}; }
  }
  // valor em TOML de uma linha, do jeito que o `codex -c chave=valor` espera
  const toml = (v: unknown): string =>
    typeof v === "string" ? JSON.stringify(v)
    : typeof v === "number" || typeof v === "boolean" ? String(v)
    : Array.isArray(v) ? `[${v.map(toml).join(", ")}]`
    : v && typeof v === "object" ? `{ ${Object.entries(v).map(([k, x]) => `${/^[\w-]+$/.test(k) ? k : JSON.stringify(k)} = ${toml(x)}`).join(", ")} }`
    : '""';

  const mcpFile = join(o.root, "mcp-claude.json");
  // argumentos a mais para uma execução desta conta; vazio para a conta padrão, que já tem tudo
  function mcpArgs(acc: Acc): string[] {
    if (!acc.home) return [];
    if (acc.provider === "claude") {
      const servers = claudeServers();
      if (!Object.keys(servers).length) return [];
      // o arquivo leva as mesmas chaves que já estão no ~/.claude.json: fica só para o dono ler
      const body = JSON.stringify({ mcpServers: servers });
      let cur = ""; try { cur = readFileSync(mcpFile, "utf8"); } catch {}
      if (cur !== body) { writeFileSync(mcpFile, body, { mode: 0o600 }); chmodSync(mcpFile, 0o600); }
      return ["--mcp-config", mcpFile];
    }
    if (acc.provider === "codex") return Object.entries(codexServers()).filter(([name]) => /^[\w-]+$/.test(name)).flatMap(([name, def]) => ["-c", `mcp_servers.${name}=${toml(def)}`]);
    return [];
  }

  // ---------- instalar, remover e entrar ----------
  // Tudo passa pelo CLI oficial, na conta padrão: `claude mcp add|remove|get|login` e
  // `codex mcp add|remove|list|login`. Os arquivos de configuração só são lidos, nunca escritos aqui.
  const servers = (provider: string) => (provider === "claude" ? claudeServers() : codexServers()) as Record<string, any>;
  const sobe = (provider: string, args: string[]) => o.spawn?.(provider, args) || null;
  const fim = (p: Proc) => Promise.all([new Response(p.stdout).text(), new Response(p.stderr).text(), p.exited]);
  async function roda(provider: string, args: string[], ms = 20_000) {
    const p = sobe(provider, args);
    if (!p) return { code: 127, out: "", err: "" };
    let estourou = false;
    const t = setTimeout(() => { estourou = true; p.kill(); }, ms);
    const [out, err, code] = await fim(p);
    clearTimeout(t);
    return { code: estourou ? 124 : code, out, err };
  }
  const falha = (provider: string, oQue: string, r: { code: number; out: string; err: string }) =>
    r.code === 127 ? `O ${NOME_CLI[provider]} não está instalado nesta máquina.`
    : r.code === 124 ? `O ${NOME_CLI[provider]} demorou demais para ${oQue} e foi interrompido.`
    : /already exists/i.test(r.err + r.out) ? `O ${NOME_CLI[provider]} já tem um app com esse nome.`
    : `O ${NOME_CLI[provider]} não conseguiu ${oQue}${motivo(r.out, r.err) ? `: ${motivo(r.out, r.err)}` : "."}`;

  // logins em andamento (o CLI abriu o navegador e espera a volta) e como terminou o último de cada app
  const logins = new Map<string, Proc>();
  const ultimo = new Map<string, string>();
  const visto = new Map<string, { at: number; val: Estado }>();
  function acompanha(provider: string, name: string, p: Proc, saida = fim(p)) {
    const key = `${provider}:${name}`;
    logins.set(key, p); ultimo.delete(key);
    const t = setTimeout(() => p.kill(), ESPERA_LOGIN);
    saida.then(([out, err, code]) => {
      clearTimeout(t);
      if (logins.get(key) !== p) return;
      logins.delete(key); visto.delete(key);
      if (code !== 0 && name in servers(provider)) ultimo.set(key, `O login não terminou${motivo(out, err) ? `: ${motivo(out, err)}` : "."}`);
    });
  }
  const esquece = (provider: string, name: string) => { const key = `${provider}:${name}`; logins.get(key)?.kill(); logins.delete(key); ultimo.delete(key); visto.delete(key); };

  async function installOne(provider: string, p: Pedido): Promise<{ ok: boolean; erro?: string; login?: boolean }> {
    if (p.name in servers(provider)) return { ok: false, erro: `O ${NOME_CLI[provider]} já tem um app com esse nome.` };
    if (p.so && !p.so.includes(provider)) return { ok: false, erro: `Este app pede uma chave, e por aqui ela só pode ser guardada no ${p.so.map((x) => NOME_CLI[x]).join(" e ")}.` };
    const args = provider === "claude"
      ? ["mcp", "add", "--scope", "user", ...(p.url ? ["--transport", "http", p.name, p.url, ...(p.cabecalho ? ["--header", p.cabecalho] : [])] : [p.name, "--", ...p.comando!])]
      : ["mcp", "add", p.name, ...(p.url ? ["--url", p.url] : ["--", ...p.comando!])];
    const proc = sobe(provider, args);
    if (!proc) return { ok: false, erro: falha(provider, "instalar", { code: 127, out: "", err: "" }) };
    // o Codex, ao adicionar servidor com OAuth, já abre o navegador e fica esperando o login: a instalação
    // está feita quando o app aparece na configuração, e o processo que sobra é o login
    let saiu: [string, string, number] | null = null;
    const saida = fim(proc);
    saida.then((v) => (saiu = v));
    for (const ate = Date.now() + 20_000; !saiu && Date.now() < ate; await Bun.sleep(60)) if (p.name in servers(provider)) { await Bun.sleep(150); break; }
    visto.delete(`${provider}:${p.name}`);
    if (saiu) {
      const [out, err, code] = saiu as [string, string, number];
      if (code !== 0) return { ok: false, erro: falha(provider, `instalar ${p.name}`, { code, out, err }) };
      return p.name in servers(provider) ? { ok: true } : { ok: false, erro: `O ${NOME_CLI[provider]} respondeu que instalou, mas ${p.name} não apareceu na configuração dele.` };
    }
    if (!(p.name in servers(provider))) { proc.kill(); return { ok: false, erro: falha(provider, `instalar ${p.name}`, { code: 124, out: "", err: "" }) }; }
    acompanha(provider, p.name, proc, saida);
    return { ok: true, login: true };
  }
  async function install(p: Pedido, provedores: string[]) {
    const out: Record<string, { ok: boolean; erro?: string; login?: boolean }> = {};
    for (const provider of p.so ? provedores.filter((x) => p.so!.includes(x)) : provedores) out[provider] = await installOne(provider, p);
    if (!Object.keys(out).length) out[provedores[0]] = await installOne(provedores[0], p);
    return out;
  }
  async function remove(name: string, provedores: string[]) {
    const out: Record<string, { ok: boolean; erro?: string }> = {};
    for (const provider of provedores) {
      if (!(name in servers(provider))) continue;
      esquece(provider, name);
      const r = await roda(provider, provider === "claude" ? ["mcp", "remove", name, "--scope", "user"] : ["mcp", "remove", name]);
      out[provider] = r.code === 0 && !(name in servers(provider)) ? { ok: true } : { ok: false, erro: falha(provider, `remover ${name}`, r) };
    }
    return out;
  }
  // os dois CLIs têm `mcp login <nome>`: abrem o navegador e esperam a volta. Aqui só se inicia; o estado diz como anda.
  function login(provider: string, name: string): string | null {
    if (!(name in servers(provider))) return `${name} não existe no ${NOME_CLI[provider]}.`;
    if (logins.has(`${provider}:${name}`)) return null;
    const p = sobe(provider, ["mcp", "login", name]);
    if (!p) return falha(provider, "entrar", { code: 127, out: "", err: "" });
    acompanha(provider, name, p);
    return null;
  }

  const remoto = (def: any) => typeof def?.url === "string";
  // O estado é o que o CLI informa, sem adivinhar: o Claude diz na linha Status do `mcp get` (que testa
  // a conexão), o Codex no campo auth_status do `mcp list --json`. Servidor local não tem login.
  async function status(): Promise<Record<string, Record<string, Estado>>> {
    const out: Record<string, Record<string, Estado>> = {};
    const poe = (name: string, provider: string, val: Estado) => {
      const key = `${provider}:${name}`;
      (out[name] ||= {})[provider] = logins.has(key) ? { estado: "entrando" } : ultimo.has(key) && val.estado !== "pronto" ? { ...val, nota: ultimo.get(key) } : val;
    };
    const fresco = (key: string) => { const v = visto.get(key); return v && Date.now() - v.at < VALE ? v.val : null; };
    const guarda = (key: string, val: Estado) => { visto.set(key, { at: Date.now(), val }); return val; };
    const tarefas: (() => Promise<void>)[] = [];
    for (const [name, def] of Object.entries(servers("claude"))) {
      if (!remoto(def) || !NOME.test(name)) { poe(name, "claude", { estado: "instalado" }); continue; }
      const key = `claude:${name}`, tem = fresco(key);
      if (tem) { poe(name, "claude", tem); continue; }
      tarefas.push(async () => {
        const r = await roda("claude", ["mcp", "get", name], 15_000), linha = semCor(r.out).match(/Status:\s*(.*)/)?.[1] || "";
        poe(name, "claude", guarda(key, /needs authentication/i.test(linha) ? { estado: "entrar" } : /connected/i.test(linha) && !/failed/i.test(linha) ? { estado: "pronto" } : /failed/i.test(linha) ? { estado: "falhou" } : { estado: "instalado" }));
      });
    }
    const codex = Object.entries(servers("codex"));
    if (codex.length) tarefas.push(async () => {
      const cached = codex.every(([name]) => fresco(`codex:${name}`));
      let lista: any[] = [];
      if (!cached) { const r = await roda("codex", ["mcp", "list", "--json"], 20_000); try { lista = JSON.parse(r.out); } catch {} }
      for (const [name, def] of codex) {
        const key = `codex:${name}`;
        if (cached) { poe(name, "codex", fresco(key)!); continue; }
        const auth = Array.isArray(lista) ? lista.find((s) => s?.name === name)?.auth_status : undefined;
        poe(name, "codex", guarda(key, !remoto(def) ? { estado: "instalado" } : auth === "not_logged_in" ? { estado: "entrar" } : auth === "o_auth" || auth === "oauth" || auth === "bearer_token" ? { estado: "pronto" } : { estado: "instalado" }));
      }
    });
    let i = 0;
    await Promise.all(Array.from({ length: 4 }, async () => { while (i < tarefas.length) await tarefas[i++](); }));
    return out;
  }

  return {
    syncSkills, unlinkSkills, mcpArgs, skillsDir, install, remove, login, status,
    stop() { for (const p of logins.values()) p.kill(); logins.clear(); },
    mcpNames: (provider: string) => Object.keys(servers(provider)),
    // o que a tela precisa de cada app, sem cabeçalho, chave nem variável de ambiente
    apps(clis: Record<string, boolean>) {
      const todos = CLIS.flatMap((c) => Object.entries(servers(c)).map(([name, def]) => ({ c, name, def })));
      const nomes = [...new Set(todos.map((t) => t.name))];
      const onde = (def: any) => { try { return remoto(def) ? new URL(def.url).host : String(def?.command || "").split("/").pop() || ""; } catch { return ""; } };
      return {
        clis,
        apps: nomes.map((name) => { const meus = todos.filter((t) => t.name === name); return { name, em: meus.map((t) => t.c), remoto: meus.some((t) => remoto(t.def)), onde: onde(meus[0].def) }; }),
        areas: AREAS.filter(([id]) => CATALOGO.some((a) => a.area === id)),
        catalogo: CATALOGO.map((a) => ({ id: a.id, nome: a.nome, o_que: a.o_que, area: a.area, login: a.login, onde: new URL(a.url).host, falta: CLIS.filter((c) => clis[c] && (a.login !== "token" || c === "claude") && !todos.some((t) => t.c === c && (t.name === a.id || (remoto(t.def) && mesmoEndereco(t.def.url, a.url))))) })),
      };
    },
    // o que existe na fonte, pra tela mostrar
    summary(accounts: Acc[]) {
      const count = (provider: string) => entries(skillsDir(provider, null)).filter((n) => existsSync(join(skillsDir(provider, null), n, "SKILL.md"))).length;
      const providers = [...new Set(accounts.map((a) => a.provider))];
      return {
        skills: Object.fromEntries(providers.map((p) => [p, count(p)])),
        mcp: { claude: Object.keys(claudeServers()), codex: Object.keys(codexServers()) },
        accounts: accounts.filter((a) => a.home).map((a) => {
          const dest = skillsDir(a.provider, a.home);
          const names = entries(dest);
          const linked = names.filter((n) => mine(a, n, join(dest, n))).length;
          return { id: a.id, linked, own: names.length - linked };
        }),
      };
    },
  };
}
