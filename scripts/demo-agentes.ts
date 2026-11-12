// Os agentes de mentira do `bun run demo`. Um arquivo só faz o papel dos quatro CLIs (o primeiro
// argumento diz qual) e fala o mesmo protocolo que a Revoada lê dos de verdade. Cada pedido de
// exemplo casa com uma cena: a lista de passos que o agente "faz" e o texto que ele responde.
// Nada aqui fala com provedor nenhum; os arquivos que as cenas editam ficam na pasta descartável.
import { appendFileSync, mkdirSync, writeFileSync } from "fs";
import { dirname, join } from "path";
import { CENAS, PADRAO, PLANO, REVISAO } from "./demo-cenas";

const [quem, ...a] = process.argv.slice(2);
const out = (o: unknown) => console.log(JSON.stringify(o));
const nap = (ms: number) => new Promise((r) => setTimeout(r, ms));
const cena = (texto: string) => CENAS.find((c) => c.quando.test(texto));
const agora = Math.floor(Date.now() / 1000);
// quem lançou o agente saiu (o demo foi encerrado): não fica processo para trás
setInterval(() => { if (process.ppid === 1) process.exit(0); }, 2000).unref();

// Sala: os quatro conversam sobre o pedido, cada um com as suas falas, na ordem em que a vez chega.
// A fala seguinte de cada um sai conforme quantas vezes ele já falou na conversa; acabou a lista, ele passa.
const SALA: Record<string, string[]> = {
  claude: ["Olhei `src/rotas/pedidos.ts`: o offset aparece na rota e no repositório. Eu pego esses dois.", "Fechado: cursor composto, como o Gemini disse. Codex, pode escrever os testes já nesse formato."],
  codex: ["Fico com `tests/pedidos.test.ts`. Escrevo os casos do cursor antes de o Claude mexer na rota, assim a troca já nasce coberta.", "Combinado. Os testes vão com (data, id)."],
  gemini: ["Um cuidado antes: cursor só por `id` quebra se a lista sair ordenada por data. Sugiro cursor composto, data e id.", "Eu atualizo a documentação da API, que ainda cita `?pagina=`."],
  grok: ["Voto no cursor composto. Da minha parte, confiro no fim se o `?pagina=` antigo continua respondendo."],
};
function sala(dito: string, eu: string): string | null {
  if (!dito.includes("<sala>")) return null;
  const nome = dito.match(/Você é (.+?) e está numa sala/)?.[1] || "", conversa = dito.split("<conversa>")[1] || "";
  return SALA[eu][conversa.split(`[agente: ${nome}]`).length - 1] || "PASSO";
}

// o agente "edita" de verdade, pra a conversa ter diff e a revisão cruzada ter o que ler
function edita(caminho: string, novo?: boolean) {
  try {
    mkdirSync(dirname(join(process.cwd(), caminho)), { recursive: true });
    const linha = caminho.endsWith(".sql") ? "alter table pedidos add column entregue_em timestamptz;\n" : `// ajuste de exemplo em ${caminho}\n`;
    novo ? writeFileSync(caminho, linha) : appendFileSync(caminho, linha);
  } catch {}
}

if (quem === "claude") {
  const padrao = !process.env.CLAUDE_CONFIG_DIR;
  if (a[0] === "auth") {
    out(padrao ? { loggedIn: true, email: "voce@exemplo.dev", subscriptionType: "max", orgName: "voce@exemplo.dev" } : { loggedIn: true, email: "voce@trabalho.exemplo", subscriptionType: "team", orgName: "voce@trabalho.exemplo" });
    process.exit(0);
  }
  // pedido avulso (`-p <texto> --model haiku`): o título da conversa ou a sugestão da próxima mensagem
  if (a[0] === "-p" && a[1] && !a[1].startsWith("--")) {
    const c = cena(a[1]), sugere = a[1].includes("próxima mensagem");
    const linha = sugere ? c?.sugestao : a[1].includes("supervisor de uma equipe") ? "Plano: exportar e importar" : c?.titulo;
    if (!linha) process.exit(1);
    console.log(linha);
    process.exit(0);
  }
  const linhas = console[Symbol.asyncIterator]();
  const dito: string = JSON.parse((await linhas.next()).value).message.content.filter((b: any) => b.type === "text").map((b: any) => b.text).join("\n");
  const pergunta = a.includes("--permission-prompt-tool");
  out({ type: "system", subtype: "init", session_id: `s-${process.pid}`, model: "claude-sonnet-4-5" });
  out({ type: "rate_limit_event", rate_limit_info: { unifiedWindows: padrao
    ? { five_hour: { utilization: 0.97, resetsAt: agora + 134 * 60 }, seven_day: { utilization: 0.61, resetsAt: agora + 3 * 86400 } }
    : { five_hour: { utilization: 0.38, resetsAt: agora + 201 * 60 }, seven_day: { utilization: 0.22, resetsAt: agora + 5 * 86400 } } } });
  let n = 0;
  const fala = async (texto: string) => {
    const id = `m${++n}`;
    out({ type: "stream_event", event: { type: "message_start", message: { id } } });
    for (let i = 0; i < texto.length; i += 28) { out({ type: "stream_event", event: { type: "content_block_delta", index: 0, delta: { type: "text_delta", text: texto.slice(i, i + 28) } } }); await nap(12); }
    out({ type: "assistant", message: { id, content: [{ type: "text", text: texto }], usage: { input_tokens: 1800, cache_read_input_tokens: 41000, cache_creation_input_tokens: 2600, output_tokens: 700 } } });
  };
  const fim = () => { out({ type: "result", subtype: "success", is_error: false, session_id: `s-${process.pid}`, total_cost_usd: 0.04, modelUsage: { "claude-sonnet-4-5": { contextWindow: 200_000 } }, usage: { input_tokens: 1800, cache_creation_input_tokens: 2600, cache_read_input_tokens: 41000, output_tokens: 700 } }); process.exit(0); };
  if (dito.includes("Você é o revisor")) { await fala(REVISAO); fim(); }
  const naSala = sala(dito, "claude");
  if (naSala) { await nap(700); await fala(naSala); fim(); }
  if (dito.includes("supervisor de uma equipe")) { await fala(`${PLANO.fala}\n\n\`\`\`json\n${JSON.stringify({ tarefas: PLANO.tarefas })}\n\`\`\``); fim(); }
  const c = cena(dito);
  if (!c) { await fala(PADRAO); fim(); }
  // a conta seguinte do rodízio continua do passo depois do limite
  const corte = c!.passos.findIndex((p) => "limite" in p);
  for (const p of padrao || corte < 0 ? c!.passos : c!.passos.slice(corte + 1)) {
    if ("limite" in p) {
      out({ type: "rate_limit_event", rate_limit_info: { unifiedWindows: { five_hour: { utilization: 1, resetsAt: agora + 134 * 60 }, seven_day: { utilization: 0.61, resetsAt: agora + 3 * 86400 } } } });
      out({ type: "result", subtype: "error_during_execution", is_error: true, session_id: `s-${process.pid}`, result: "Claude usage limit reached. Try again in 2 hours 14 minutes" });
      process.exit(1);
    }
    if ("demora" in p) { await nap(p.demora); continue; }
    if ("texto" in p) { await fala(p.texto); continue; }
    const id = `t${++n}`;
    const [name, input] = "ler" in p ? ["Read", { file_path: p.ler }] : "rodar" in p ? ["Bash", { command: p.rodar, description: p.desc }] : [p.novo ? "Write" : "Edit", { file_path: p.editar }];
    out({ type: "assistant", message: { id: `m${++n}`, content: [{ type: "tool_use", id, name, input }] } });
    if (pergunta && "pede" in p && p.pede) {
      out({ type: "control_request", request_id: `r${n}`, request: { subtype: "can_use_tool", tool_name: name, input } });
      const resposta = JSON.parse((await linhas.next()).value).response.response;
      if (resposta.behavior !== "allow") {
        out({ type: "user", message: { content: [{ type: "tool_result", tool_use_id: id, content: "negado", is_error: true }] } });
        await fala("Sem essa permissão eu paro aqui. Diga como prefere seguir.");
        fim();
      }
    }
    if ("editar" in p) edita(p.editar, p.novo);
    await nap(60);
    if ("rodar" in p && p.saida == null) continue; // comando ainda rodando
    out({ type: "user", message: { content: [{ type: "tool_result", tool_use_id: id, content: "rodar" in p ? p.saida : "" }] } });
  }
  fim();
}

if (quem === "codex") {
  if (a[0] === "login") { console.log("Logged in using ChatGPT"); process.exit(0); }
  const dito = a.join("\n"), fio = a[1] === "resume" ? a[2] : `demo-${process.pid}`;
  if (a[1] !== "resume") out({ type: "thread.started", thread_id: fio });
  // a leitura de uso do Codex vem do arquivo da sessão, como no CLI de verdade
  const sessoes = join(process.env.CODEX_HOME || join(process.env.HOME!, ".codex"), "sessions");
  mkdirSync(sessoes, { recursive: true });
  writeFileSync(join(sessoes, `rollout-${fio}.jsonl`), JSON.stringify({ payload: { rate_limits: { primary: { window_minutes: 300, used_percent: process.env.CODEX_HOME ? 9 : 27, resets_at: agora + 163 * 60 }, secondary: { window_minutes: 10080, used_percent: process.env.CODEX_HOME ? 6 : 14, resets_at: agora + 4 * 86400 } } } }) + "\n");
  const fim = () => { out({ type: "turn.completed", usage: { input_tokens: 5200, cached_input_tokens: 3900, output_tokens: 420 } }); process.exit(0); };
  let n = 0;
  const fala = (text: string) => out({ type: "item.completed", item: { id: `item_${++n}`, type: "agent_message", text } });
  if (dito.includes("Você é o revisor")) { fala(REVISAO); fim(); }
  const naSala = sala(dito, "codex");
  if (naSala) { await nap(900); fala(naSala); fim(); }
  const c = cena(dito);
  if (!c) { fala(PADRAO); fim(); }
  for (const p of c!.passos) {
    if ("limite" in p) continue;
    if ("demora" in p) { await nap(p.demora); continue; }
    if ("texto" in p) { fala(p.texto); continue; }
    if ("editar" in p) { edita(p.editar, p.novo); out({ type: "item.completed", item: { id: `item_${++n}`, type: "file_change", changes: [{ path: p.editar, kind: p.novo ? "add" : "update" }], status: "completed" } }); }
    else if ("ler" in p) out({ type: "item.completed", item: { id: `item_${++n}`, type: "command_execution", command: `sed -n '1,120p' ${p.ler}`, aggregated_output: "", exit_code: 0, status: "completed" } });
    else if (p.saida == null) out({ type: "item.started", item: { id: `item_${++n}`, type: "command_execution", command: p.rodar, aggregated_output: "", exit_code: null, status: "in_progress" } });
    else out({ type: "item.completed", item: { id: `item_${++n}`, type: "command_execution", command: p.rodar, aggregated_output: p.saida, exit_code: 0, status: "completed" } });
    await nap(60);
  }
  fim();
}

if (quem === "gemini") {
  out({ type: "init", session_id: `g-${process.pid}` });
  const naSala = sala(a.join("\n"), "gemini");
  if (naSala) await nap(900);
  out({ type: "message", role: "assistant", content: naSala || PADRAO });
  out({ type: "result", status: "success", stats: { input_tokens: 900, output_tokens: 60, cached: 0 } });
  process.exit(0);
}

const salaDoGrok = sala(a.join("\n"), "grok");
if (salaDoGrok) await nap(900);
console.log(salaDoGrok || PADRAO); // grok: texto puro
