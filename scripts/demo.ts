// bun run demo: o painel com um dia de trabalho de exemplo, pra mexer na interface sem gastar conta
// nem tocar na sua pasta. Os agentes são de mentira (scripts/demo-agentes.ts) e tudo mora numa pasta
// de usuário descartável. Ctrl+C encerra e apaga.
import { chmodSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from "fs";
import { tmpdir } from "os";
import { dirname, join } from "path";
import { PEDIDOS } from "./demo-cenas";

const ROOT = join(import.meta.dir, "..");
const port = Number(process.env.DEMO_PORT || 4790);
const origin = `http://127.0.0.1:${port}`;
const tmp = mkdtempSync(join(tmpdir(), "revoada-demo-"));
const home = join(tmp, "dev"); // o nome da pasta é o nome que o painel mostra no rodapé da lateral

// os quatro CLIs de mentira, na frente do PATH
const bin = join(tmp, "bin");
mkdirSync(bin, { recursive: true });
for (const cli of ["claude", "codex", "gemini", "grok"]) {
  writeFileSync(join(bin, cli), `#!/bin/sh\nexec bun "${join(ROOT, "scripts/demo-agentes.ts")}" ${cli} "$@"\n`);
  chmodSync(join(bin, cli), 0o755);
}
// Gemini e Grok contam como logados pelo arquivo de login na pasta do usuário
const escreve = (caminho: string, texto: string) => { mkdirSync(dirname(caminho), { recursive: true }); writeFileSync(caminho, texto); };
escreve(join(home, ".gemini/oauth_creds.json"), "{}");
escreve(join(home, ".gemini/google_accounts.json"), JSON.stringify({ active: "voce@exemplo.dev" }));
escreve(join(home, ".grok/auth.json"), "{}");

// dois repositórios de exemplo, com os arquivos em que as cenas mexem
function repositorio(nome: string, arquivos: string[]) {
  const dir = join(home, "git", nome);
  for (const f of ["README.md", ...arquivos]) escreve(join(dir, f), f === "README.md" ? `# ${nome}\n` : `// ${f}\n`);
  const git = (...args: string[]) => Bun.spawnSync(["git", "-c", "user.name=demo", "-c", "user.email=demo@exemplo.dev", ...args], { cwd: dir });
  git("init", "-q", "-b", "main");
  git("add", ".");
  git("commit", "-qm", "inicial");
  return dir;
}
const api = repositorio("loja-api", ["src/rotas/pedidos.ts", "src/repositorio/pedidos.ts", "src/relatorio/diario.ts", "tests/pedidos.test.ts", "tests/relatorio.test.ts", "db/schema.sql"]);
const web = repositorio("loja-web", ["src/carrinho/Resumo.tsx", "src/painel/GraficoVendas.tsx", "tests/carrinho.test.tsx", "tests/painel.test.tsx"]);

const server = Bun.spawn(["bun", "server.ts"], {
  cwd: ROOT, stdout: "ignore", stderr: "inherit",
  env: { ...process.env, HOME: home, REVOADA_HOME: join(home, ".revoada"), REVOADA_VAULT: join(home, "cofre"), PORT: String(port), PATH: `${bin}:${process.env.PATH}`, GEMINI_API_KEY: "", GOOGLE_API_KEY: "", XAI_API_KEY: "", OLLAMA_HOST: "http://127.0.0.1:1", REVOADA_ASSETS: "", REVOADA_PROJECTS: "", REVOADA_REMOTE_PORT: "" },
});
const para = async () => { server.kill(); await server.exited; rmSync(tmp, { recursive: true, force: true }); };
const bye = async () => { await para(); process.exit(0); };
process.on("SIGINT", bye);
process.on("SIGTERM", bye);

async function pede(path: string, method = "GET", body?: unknown) {
  const r = await fetch(`${origin}/api/${path}`, { method, headers: { origin, ...(body ? { "content-type": "application/json" } : {}) }, body: body ? JSON.stringify(body) : undefined });
  const j = await r.json().catch(() => ({})) as any;
  if (!r.ok) throw new Error(`${path}: ${r.status} ${JSON.stringify(j)}`);
  return j;
}
async function ate<T>(fn: () => Promise<T | false | null | undefined>, ms = 30_000): Promise<T> {
  const fim = Date.now() + ms;
  while (Date.now() < fim) { const v = await fn(); if (v) return v; await Bun.sleep(100); }
  throw new Error("esperei demais");
}
const conversa = async (target: string, prompt: string, cwd: string, extra: Record<string, unknown> = {}) => (await pede("chat", "POST", { prompt, targets: [target], cwd, brain: false, mode: "edit", ...extra })).id as string;
const parada = (id: string) => ate(async () => { const c = await pede(`convos/${id}`); return !c.working && c; });
const pedindo = (id: string) => ate(async () => { const c = await pede(`convos/${id}`); return c.messages.at(-1)?.items?.find((i: any) => i.kind === "ask" && i.state === "pending"); });
const cartao = (id: string, state: string) => ate(async () => (await pede("board")).find((c: any) => c.id === id && c.state === state && !c.working));

try {
  await ate(() => fetch(`${origin}/api/dirs`).then((r) => r.ok).catch(() => false));
  await pede("settings", "POST", { onboarded: true });
  // as contas: duas do Claude, duas do Codex, uma do Gemini e uma do Grok
  for (const provider of ["claude", "codex", "gemini", "grok"]) await pede(`accounts/${provider}-padrao`, "PATCH", { label: "pessoal" });
  await pede("accounts", "POST", { provider: "claude", label: "trabalho" });
  await pede("accounts", "POST", { provider: "codex", label: "trabalho" });
  await pede("state?refresh=1");

  // 1. o rodízio: a conta pessoal do Claude bate no limite no meio do pedido e a do trabalho continua
  await parada(await conversa("pool:claude", PEDIDOS.paginacao, api));

  // 2. as tarefas: uma por linha, cada uma num agente e numa cópia própria do repositório
  const tarefa = async (prompt: string, target: string) => (await pede("board", "POST", { prompt, cwd: web, target }))[0];
  const fuso = await tarefa(PEDIDOS.tarefas[0], "pool:codex");
  const frete = await tarefa(PEDIDOS.tarefas[1], "pool:claude");
  const grafico = await tarefa(PEDIDOS.tarefas[2], "pool:codex");
  await tarefa(PEDIDOS.tarefas[3], "pool:claude");
  await tarefa(PEDIDOS.tarefas[4], "pool:codex");
  await pede(`board/${fuso.id}/start`, "POST", {});
  await pede(`board/${frete.id}/start`, "POST", {});
  await cartao(fuso.id, "review");  // terminou e passou pela revisão de outro provedor
  await cartao(frete.id, "review");
  await pede(`board/${fuso.id}/move`, "POST", { to: "done" });
  await pede(`board/${grafico.id}/start`, "POST", {}); // este fica trabalhando

  // 3. as rotinas: uma já rodou hoje
  const suite = await pede("schedules", "POST", { prompt: PEDIDOS.suite, cwd: api, target: "pool:claude", mode: "edit", brain: false, kind: "daily", time: "08:00", days: [1, 2, 3, 4, 5] });
  await pede("schedules", "POST", { prompt: PEDIDOS.dependencias, cwd: web, target: "pool:codex", mode: "edit", brain: false, isolate: true, kind: "daily", time: "07:30", days: [1] });
  await pede(`schedules/${suite.id}/run`, "POST", {});

  // 4. o que espera a pessoa: um plano do supervisor e um pedido de permissão (o primeiro já foi permitido)
  await pede("missions", "POST", { prompt: PEDIDOS.missao, cwd: web, targets: ["pool:claude", "pool:codex"] });
  const migracao = await conversa("pool:claude", PEDIDOS.migracao, api, { mode: "ask" });
  await pede(`convos/${migracao}/decide`, "POST", { req: (await pedindo(migracao)).req, decision: "allow" });
  await pedindo(migracao);
  await pede("rename", "POST", { type: "chat", id: migracao, title: "Migração da coluna entregue_em" });
  await ate(async () => (await pede("missions")).every((m: any) => m.state !== "planejando"));
} catch (e) {
  console.error(`\nNão consegui montar a demonstração: ${(e as Error).message}`);
  await para();
  process.exit(1);
}

console.log(`\nRevoada de demonstração em ${origin}\n(pasta descartável: ${tmp})\nCtrl+C para encerrar.\n`);
if (process.platform === "darwin" && !process.env.DEMO_QUIET) Bun.spawn(["open", origin]);
await new Promise(() => {});
