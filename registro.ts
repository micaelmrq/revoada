// Busca no registro público oficial de servidores MCP (registry.modelcontextprotocol.io): é o que deixa
// a janela "Apps conectados" instalar o que não está no catálogo conferido (apps.ts). O registro é
// aberto: qualquer pessoa publica nele, e a Revoada não confere quem publicou. Por isso a tela mostra
// de onde vem cada resultado, e só entra o que dá para instalar sem chave nem configuração própria:
//  - servidor remoto (streamable-http, https) sem cabeçalho obrigatório;
//  - pacote npm ou PyPI que roda por npx/uvx sem variável nem argumento obrigatório.
// O resto fica de fora da lista (a resposta diz quantos) e continua instalável por "Outro endereço".
import type { Pedido } from "./tools";

export type Achado = { registro: string; name: string; nome: string; o_que: string; onde: string; remoto: boolean };

const OFICIAL = "https://registry.modelcontextprotocol.io";
// nome e versão de pacote começam por letra ou número: um que começasse por traço viraria opção do npx
const PACOTE = /^(@[a-z0-9][\w.-]*\/)?[a-z0-9][\w.-]*$/i, VERSAO = /^[a-z0-9][\w.+-]{0,39}$/i;

// "com.cloudflare.mcp/mcp" vira "cloudflare-mcp": o nome que o app ganha nos CLIs
export function nomeDe(registro: string) {
  const [dono = "", resto = ""] = registro.toLowerCase().split("/");
  const fim = resto.replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
  const marca = dono.split(".").filter((p) => !["com", "io", "ai", "org", "net", "dev", "app", "co", "github", "mcp"].includes(p)).pop()?.replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") || "";
  const junto = !fim || ["mcp", "server", "mcp-server"].includes(fim) ? [marca, fim].filter(Boolean).join("-") : fim;
  return (junto || "app").slice(0, 40).replace(/-+$/, "");
}

// uma entrada do registro vira um pedido de instalação, ou nada se pede chave ou configuração
export function pedidoDoRegistro(e: any): { achado: Achado; pedido: Pedido } | null {
  const s = e?.server;
  if (!s || typeof s.name !== "string" || e?._meta?.["io.modelcontextprotocol.registry/official"]?.status === "deleted") return null;
  const name = nomeDe(s.name);
  if (!/^[a-z0-9][a-z0-9_-]{0,39}$/.test(name) || name === "revoada") return null;
  const base = { registro: s.name, name, nome: String(s.title || s.name).slice(0, 80), o_que: String(s.description || "").slice(0, 200) };
  for (const r of Array.isArray(s.remotes) ? s.remotes : []) {
    if (r?.type !== "streamable-http" || typeof r.url !== "string" || r.url.includes("{") || (r.headers || []).some((h: any) => h?.isRequired)) continue;
    // túnel temporário (trycloudflare, ngrok) é a máquina de alguém por algumas horas, não um serviço
    try { const u = new URL(r.url); if (u.protocol !== "https:" || u.username || u.password || /(^|\.)(trycloudflare\.com|ngrok(-free)?\.(app|io|dev)|loca\.lt)$/.test(u.hostname)) continue; return { achado: { ...base, onde: u.host, remoto: true }, pedido: { name, url: r.url } }; } catch {}
  }
  for (const p of Array.isArray(s.packages) ? s.packages : []) {
    if (p?.transport?.type !== "stdio" || !["npm", "pypi"].includes(p.registryType) || !PACOTE.test(String(p.identifier)) || !VERSAO.test(String(p.version))) continue;
    if ([...(p.environmentVariables || []), ...(p.packageArguments || []), ...(p.runtimeArguments || [])].some((v: any) => v?.isRequired)) continue;
    const comando = p.registryType === "npm" ? ["npx", "-y", `${p.identifier}@${p.version}`] : ["uvx", `${p.identifier}@${p.version}`];
    return { achado: { ...base, onde: `${comando[0]} ${p.identifier}`, remoto: false }, pedido: { name, comando } };
  }
  return null;
}

export function createRegistro(o: { url?: string } = {}) {
  const raiz = (o.url || OFICIAL).replace(/\/+$/, "");
  const vistos = new Map<string, Pedido>();
  async function busca(q: string): Promise<{ achados: Achado[]; fora: number }> {
    const r = await fetch(`${raiz}/v0/servers?version=latest&limit=40&search=${encodeURIComponent(q)}`, { signal: AbortSignal.timeout(8000), headers: { accept: "application/json" } });
    if (!r.ok) throw new Error(`o registro respondeu ${r.status}`);
    const lista = ((await r.json()) as any)?.servers;
    if (!Array.isArray(lista)) throw new Error("o registro respondeu num formato que não conheço");
    const achados: Achado[] = [];
    let fora = 0;
    for (const e of lista) {
      const p = pedidoDoRegistro(e);
      if (!p) { fora++; continue; }
      if (achados.some((a) => a.registro === p.achado.registro)) continue;
      vistos.set(p.achado.registro, p.pedido);
      achados.push(p.achado);
    }
    return { achados, fora };
  }
  return {
    busca,
    // instalar um resultado: o endereço é o que o registro informou a este servidor, nunca o que a tela mandar
    async pedido(registro: string): Promise<Pedido | null> {
      if (!vistos.has(registro)) await busca(registro).catch(() => null);
      return vistos.get(registro) || null;
    },
  };
}
