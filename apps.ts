// Catálogo de apps que a janela "Apps conectados" sabe instalar com um clique. Cada linha é o servidor
// MCP oficial do fornecedor, conferido na documentação dele (a página está em `fonte`, a data em
// CONFERIDO). Só entra aqui servidor remoto que entra por login no navegador (OAuth) nos dois CLIs,
// sem pedir chave: o que pede chave ou cadastro prévio de cliente (GitHub, Slack) fica de fora e
// continua podendo ser instalado por "Outro endereço".
export type AppDoCatalogo = { id: string; nome: string; o_que: string; transporte: "http"; url: string; fonte: string };

export const CONFERIDO = "2026-11-11";

export const CATALOGO: AppDoCatalogo[] = [
  { id: "linear", nome: "Linear", o_que: "Tarefas, projetos e ciclos", transporte: "http", url: "https://mcp.linear.app/mcp", fonte: "https://linear.app/docs/mcp" },
  { id: "notion", nome: "Notion", o_que: "Páginas e bancos de dados", transporte: "http", url: "https://mcp.notion.com/mcp", fonte: "https://developers.notion.com/docs/get-started-with-mcp" },
  { id: "figma", nome: "Figma", o_que: "Desenhos e componentes", transporte: "http", url: "https://mcp.figma.com/mcp", fonte: "https://developers.figma.com/docs/figma-mcp-server/remote-server-installation/" },
  { id: "sentry", nome: "Sentry", o_que: "Erros em produção", transporte: "http", url: "https://mcp.sentry.dev/mcp", fonte: "https://mcp.sentry.dev/" },
  { id: "stripe", nome: "Stripe", o_que: "Pagamentos e assinaturas", transporte: "http", url: "https://mcp.stripe.com", fonte: "https://docs.stripe.com/mcp" },
  { id: "vercel", nome: "Vercel", o_que: "Projetos e publicações", transporte: "http", url: "https://mcp.vercel.com", fonte: "https://vercel.com/docs/agent-resources/vercel-mcp" },
  { id: "supabase", nome: "Supabase", o_que: "Banco de dados e funções", transporte: "http", url: "https://mcp.supabase.com/mcp", fonte: "https://supabase.com/docs/guides/getting-started/mcp" },
];
