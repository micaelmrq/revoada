// O `mcp add|remove|get|list|login` dos CLIs de mentira (os dos testes, em tests/stubs, e os do
// `bun run demo`). Imita o que os de verdade fazem na conta padrão: o Claude guarda em ~/.claude.json
// (mcpServers), o Codex em ~/.codex/config.toml (mcp_servers), e servidor remoto nasce sem login até
// rodar `mcp login`. Três gatilhos para os testes:
//  - nome começando por "falha": o CLI recusa com erro;
//  - endereço com "espera" no Codex: o `add` grava e fica esperando o login, como o de verdade faz com OAuth;
//  - o login "volta do navegador" depois de um instante, ou quando o arquivo ~/.volta-do-login aparece.
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "fs";
import { dirname, join } from "path";

const nap = (ms: number) => new Promise((r) => setTimeout(r, ms));

export async function mcpDeMentira(cli: "claude" | "codex", a: string[]): Promise<never> {
  const home = process.env.HOME!;
  const arquivo = cli === "claude" ? join(process.env.CLAUDE_CONFIG_DIR || home, ".claude.json") : join(process.env.CODEX_HOME || join(home, ".codex"), "config.toml");
  const loginsEm = join(dirname(arquivo), `.mcp-logins-${cli}.json`);
  const le = (f: string) => { try { return readFileSync(f, "utf8"); } catch { return ""; } };
  const logins = (): string[] => { try { return JSON.parse(le(loginsEm)); } catch { return []; } };
  const sai = (code: number, texto: string): never => { (code ? console.error : console.log)(texto); process.exit(code); };
  const grava = (texto: string) => { mkdirSync(dirname(arquivo), { recursive: true }); writeFileSync(arquivo, texto); };

  const todos = (): Record<string, any> => {
    try { return cli === "claude" ? JSON.parse(le(arquivo) || "{}").mcpServers || {} : (Bun.TOML.parse(le(arquivo)) as any).mcp_servers || {}; } catch { return {}; }
  };
  function poe(name: string, def: Record<string, unknown>) {
    if (cli === "claude") { const j = JSON.parse(le(arquivo) || "{}"); (j.mcpServers ||= {})[name] = def; return grava(JSON.stringify(j, null, 2)); }
    grava(`${le(arquivo).trimEnd()}\n\n[mcp_servers.${name}]\n${Object.entries(def).filter(([k]) => k !== "type").map(([k, v]) => `${k} = ${JSON.stringify(v)}`).join("\n")}\n`.trimStart());
  }
  function tira(name: string) {
    if (cli === "claude") { const j = JSON.parse(le(arquivo)); delete j.mcpServers[name]; return grava(JSON.stringify(j, null, 2)); }
    const linhas = le(arquivo).split("\n"), fica: string[] = [];
    let dentro = false;
    for (const l of linhas) { if (/^\s*\[/.test(l)) dentro = l.trim() === `[mcp_servers.${name}]` || l.trim().startsWith(`[mcp_servers.${name}.`); if (!dentro) fica.push(l); }
    grava(fica.join("\n"));
  }
  const remoto = (def: any) => typeof def?.url === "string";
  async function entra(name: string) {
    for (const ate = Date.now() + 60_000; Date.now() < ate && !existsSync(join(home, ".volta-do-login")); await nap(80)) if (!name.includes("espera") && Date.now() > ate - 60_000 + 900) break;
    writeFileSync(loginsEm, JSON.stringify([...new Set([...logins(), name])]));
  }

  const [, acao, ...resto] = a;
  if (acao === "add") {
    const corte = resto.indexOf("--"), antes = corte < 0 ? resto : resto.slice(0, corte), comando = corte < 0 ? [] : resto.slice(corte + 1);
    const soltos: string[] = [], headers: Record<string, string> = {}; let url = "";
    for (let i = 0; i < antes.length; i++) {
      if (antes[i] === "--url") url = antes[++i];
      else if (antes[i] === "--header" || antes[i] === "-H") { const [k, ...v] = antes[++i].split(":"); headers[k.trim()] = v.join(":").trim(); }
      else if (["--scope", "-s", "--transport", "-t"].includes(antes[i])) i++;
      else soltos.push(antes[i]);
    }
    const name = soltos[0];
    if (cli === "claude" && soltos[1]) url = soltos[1];
    if (!name || (!url && !comando.length)) sai(2, "error: missing required argument");
    if (name.startsWith("falha")) sai(1, `Error: could not reach the server for ${name}`);
    if (name in todos()) sai(1, `MCP server ${name} already exists in user config`);
    poe(name, url ? { type: "http", url, ...(Object.keys(headers).length ? { headers } : {}) } : { type: "stdio", command: comando[0], args: comando.slice(1) });
    if (cli === "codex" && url.includes("espera")) { console.log("Detected OAuth support. Starting OAuth flow…"); await entra(name); }
    sai(0, `Added ${url ? "HTTP" : "stdio"} MCP server ${name}`);
  }
  if (acao === "remove") {
    const name = resto.find((x, i) => !x.startsWith("-") && !["--scope", "-s"].includes(resto[i - 1]))!;
    if (!(name in todos())) sai(1, `No MCP server found with name: ${name}`);
    tira(name);
    writeFileSync(loginsEm, JSON.stringify(logins().filter((n) => n !== name)));
    sai(0, `Removed MCP server ${name}`);
  }
  if (acao === "login") {
    const name = resto.find((x) => !x.startsWith("-"))!;
    if (!remoto(todos()[name])) sai(1, `No MCP server named '${name}' found.`);
    await entra(name);
    sai(0, `Successfully logged in to MCP server '${name}'.`);
  }
  if (acao === "get") {
    const name = resto[0], def = todos()[name];
    if (!def) sai(1, `No MCP server found with name: ${name}`);
    sai(0, `${name}:\n  Scope: User config (available in all your projects)\n  Status: ${remoto(def) && !logins().includes(name) ? "! Needs authentication" : "✔ Connected"}\n  Type: ${remoto(def) ? "http" : "stdio"}`);
  }
  if (acao === "list") {
    sai(0, JSON.stringify(Object.entries(todos()).map(([name, def]) => ({ name, enabled: true, transport: { type: remoto(def) ? "streamable_http" : "stdio" }, auth_status: !remoto(def) ? "unsupported" : logins().includes(name) ? "o_auth" : "not_logged_in" }))));
  }
  return sai(2, `error: unrecognized subcommand '${acao}'`);
}
