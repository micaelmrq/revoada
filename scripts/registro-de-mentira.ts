// Um registro de MCP de mentira para os testes: responde no formato do oficial
// (GET /v0/servers?search=) com um punhado de entradas que cobrem cada caso que a Revoada trata.
// Busca por "cai" devolve erro, pra testar o registro fora do ar.
const oficial = { "io.modelcontextprotocol.registry/official": { status: "active", isLatest: true } };
export const ENTRADAS = [
  { server: { name: "dev.exemplo/planilhas", title: "Planilhas Exemplo", description: "Lê e escreve planilhas.", version: "1.0.0", remotes: [{ type: "streamable-http", url: "https://mcp.exemplo.dev/planilhas" }] }, _meta: oficial },
  { server: { name: "io.github.fulano/planilhas-local", description: "Planilhas do disco.", version: "0.3.1", packages: [{ registryType: "npm", identifier: "@fulano/planilhas-mcp", version: "0.3.1", transport: { type: "stdio" } }] }, _meta: oficial },
  { server: { name: "com.cofre/planilhas-com-chave", description: "Pede chave.", version: "1.0.0", remotes: [{ type: "streamable-http", url: "https://mcp.cofre.dev/mcp", headers: [{ name: "Authorization", isRequired: true, isSecret: true }] }] }, _meta: oficial },
  { server: { name: "org.banco/planilhas-sql", description: "Pede variável.", version: "2.0.0", packages: [{ registryType: "pypi", identifier: "planilhas-sql", version: "2.0.0", transport: { type: "stdio" }, environmentVariables: [{ name: "DATABASE_URL", isRequired: true }] }] }, _meta: oficial },
  { server: { name: "net.inseguro/planilhas-http", description: "Sem https.", version: "1.0.0", remotes: [{ type: "streamable-http", url: "http://mcp.inseguro.net/mcp" }] }, _meta: oficial },
];

export function registroDeMentira() {
  const srv = Bun.serve({ port: 0, hostname: "127.0.0.1", fetch(req) {
    const u = new URL(req.url), q = (u.searchParams.get("search") || "").toLowerCase();
    if (u.pathname !== "/v0/servers") return new Response("not found", { status: 404 });
    if (q === "cai") return new Response("fora do ar", { status: 503 });
    const servers = ENTRADAS.filter((e) => e.server.name.toLowerCase().includes(q));
    return Response.json({ servers, metadata: { count: servers.length } });
  } });
  return { url: `http://127.0.0.1:${srv.port}`, stop: () => srv.stop(true) };
}
