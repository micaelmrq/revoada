// Catálogo de apps que a janela "Apps conectados" instala com um clique. Cada linha é o servidor MCP
// oficial do fornecedor, com a página da documentação dele de onde saiu o endereço (`fonte`) e o dia em
// que foi conferido. As de 2026-11-03 vêm do catálogo do bots (conectores-catalogo.json), que guarda
// também a frase da documentação que sustenta o tipo de login; as de 2026-11-11 foram conferidas aqui.
// Como o app se liga:
//  - "oauth": login no navegador, feito pelo próprio CLI (`mcp login`); não pede chave;
//  - "nenhum": público, sem login;
//  - "token": pede uma chave da sua conta no cabeçalho Authorization. Só o Claude Code guarda cabeçalho
//    pela linha de comando; o Codex lê a chave de uma variável de ambiente, então por aqui só entra no Claude.
// O que não está aqui se instala pela busca no registro público (registro.ts) ou por "Outro endereço".
export type AppDoCatalogo = { id: string; nome: string; o_que: string; area: string; login: "oauth" | "token" | "nenhum"; url: string; fonte: string; conferido: string };

export const AREAS: [string, string][] = [["tecnologia", "Tecnologia"], ["gestao", "Gestão"], ["comunicacao", "Comunicação"], ["design", "Design"], ["vendas", "Vendas"], ["clientes", "Clientes"], ["dinheiro", "Dinheiro"], ["loja", "Loja"], ["automacao", "Automação"]];

export const CATALOGO: AppDoCatalogo[] = [
  { id: "linear", nome: "Linear", o_que: "Tarefas, projetos e ciclos", area: "gestao", login: "oauth", url: "https://mcp.linear.app/mcp", fonte: "https://linear.app/docs/mcp", conferido: "2026-11-11" },
  { id: "notion", nome: "Notion", o_que: "Páginas e bancos de dados", area: "gestao", login: "oauth", url: "https://mcp.notion.com/mcp", fonte: "https://developers.notion.com/docs/get-started-with-mcp", conferido: "2026-11-11" },
  { id: "figma", nome: "Figma", o_que: "Desenhos e componentes", area: "design", login: "oauth", url: "https://mcp.figma.com/mcp", fonte: "https://developers.figma.com/docs/figma-mcp-server/remote-server-installation/", conferido: "2026-11-11" },
  { id: "vercel", nome: "Vercel", o_que: "Projetos e publicações", area: "tecnologia", login: "oauth", url: "https://mcp.vercel.com", fonte: "https://vercel.com/docs/agent-resources/vercel-mcp", conferido: "2026-11-11" },
  { id: "atlassian", nome: "Atlassian", o_que: "Jira e Confluence", area: "gestao", login: "oauth", url: "https://mcp.atlassian.com/v2/mcp", fonte: "https://support.atlassian.com/atlassian-ai-gateway/docs/get-started-with-the-atlassian-remote-mcp-server/", conferido: "2026-11-03" },
  { id: "sentry", nome: "Sentry", o_que: "Erros em produção", area: "tecnologia", login: "oauth", url: "https://mcp.sentry.dev/mcp", fonte: "https://mcp.sentry.dev/", conferido: "2026-11-11" },
  { id: "stripe", nome: "Stripe", o_que: "Pagamentos e assinaturas", area: "dinheiro", login: "oauth", url: "https://mcp.stripe.com", fonte: "https://docs.stripe.com/mcp", conferido: "2026-11-11" },
  { id: "supabase", nome: "Supabase", o_que: "Banco de dados e funções", area: "tecnologia", login: "oauth", url: "https://mcp.supabase.com/mcp", fonte: "https://supabase.com/docs/guides/getting-started/mcp", conferido: "2026-11-11" },
  { id: "cloudflare", nome: "Cloudflare", o_que: "Workers, DNS e armazenamento", area: "tecnologia", login: "oauth", url: "https://mcp.cloudflare.com/mcp", fonte: "https://developers.cloudflare.com/agents/model-context-protocol/mcp-servers-for-cloudflare/", conferido: "2026-11-03" },
  { id: "neon", nome: "Neon", o_que: "Postgres sem servidor", area: "tecnologia", login: "oauth", url: "https://mcp.neon.tech/mcp", fonte: "https://neon.com/docs/ai/neon-mcp-server", conferido: "2026-11-03" },
  { id: "github", nome: "GitHub", o_que: "Repositórios, issues e PRs", area: "tecnologia", login: "token", url: "https://api.githubcopilot.com/mcp/", fonte: "https://github.com/github/github-mcp-server/blob/main/docs/remote-server.md", conferido: "2026-11-03" },
  { id: "intercom", nome: "Intercom", o_que: "Conversas com clientes", area: "clientes", login: "token", url: "https://mcp.intercom.com/mcp", fonte: "https://developers.intercom.com/docs/guides/mcp", conferido: "2026-11-03" },
  { id: "context7", nome: "Context7", o_que: "Documentação atual de bibliotecas", area: "tecnologia", login: "token", url: "https://mcp.context7.com/mcp", fonte: "https://github.com/upstash/context7", conferido: "2026-11-03" },
  { id: "deepwiki", nome: "DeepWiki", o_que: "Perguntas sobre repositórios", area: "tecnologia", login: "nenhum", url: "https://mcp.deepwiki.com/mcp", fonte: "https://docs.devin.ai/work-with-devin/deepwiki-mcp", conferido: "2026-11-03" },
  { id: "microsoft-learn", nome: "Microsoft Learn", o_que: "Documentação da Microsoft", area: "tecnologia", login: "nenhum", url: "https://learn.microsoft.com/api/mcp", fonte: "https://learn.microsoft.com/en-us/training/support/mcp", conferido: "2026-11-03" },
  { id: "granola", nome: "Granola", o_que: "Notas de reunião", area: "comunicacao", login: "oauth", url: "https://mcp.granola.ai/mcp", fonte: "https://docs.granola.ai/help-center/sharing/integrations/mcp", conferido: "2026-11-03" },
  { id: "fireflies", nome: "Fireflies", o_que: "Transcrição de reuniões", area: "comunicacao", login: "oauth", url: "https://api.fireflies.ai/mcp", fonte: "https://docs.fireflies.ai/getting-started/mcp-configuration", conferido: "2026-11-03" },
  { id: "calendly", nome: "Calendly", o_que: "Agenda e horários", area: "comunicacao", login: "oauth", url: "https://mcp.calendly.com", fonte: "https://developer.calendly.com/docs/mcp/calendly-mcp-server", conferido: "2026-11-03" },
  { id: "monday", nome: "monday.com", o_que: "Quadros e projetos", area: "gestao", login: "oauth", url: "https://mcp.monday.com/mcp", fonte: "https://developer.monday.com/api-reference/docs/mcp-dynamic-client-registration", conferido: "2026-11-03" },
  { id: "trello", nome: "Trello", o_que: "Quadros e cartões", area: "gestao", login: "oauth", url: "https://mcp.trello.com/v1", fonte: "https://support.atlassian.com/trello/docs/connect-trello-to-ai-assistants-with-trello-mcp/", conferido: "2026-11-03" },
  { id: "todoist", nome: "Todoist", o_que: "Tarefas pessoais", area: "gestao", login: "oauth", url: "https://ai.todoist.net/mcp", fonte: "https://github.com/Doist/todoist-ai", conferido: "2026-11-03" },
  { id: "jotform", nome: "Jotform", o_que: "Formulários e respostas", area: "gestao", login: "oauth", url: "https://mcp.jotform.com", fonte: "https://www.jotform.com/developers/mcp", conferido: "2026-11-03" },
  { id: "attio", nome: "Attio", o_que: "CRM e contatos", area: "vendas", login: "oauth", url: "https://mcp.attio.com/mcp", fonte: "https://docs.attio.com/mcp/overview", conferido: "2026-11-03" },
  { id: "bling", nome: "Bling", o_que: "Pedidos, estoque e notas", area: "loja", login: "oauth", url: "https://mcp.bling.com.br/mcp", fonte: "https://developer.bling.com.br/mcp-server", conferido: "2026-11-03" },
  { id: "webflow", nome: "Webflow", o_que: "Sites e CMS", area: "loja", login: "oauth", url: "https://mcp.webflow.com/mcp", fonte: "https://developers.webflow.com/mcp/reference/how-it-works", conferido: "2026-11-03" },
  { id: "wix", nome: "Wix", o_que: "Sites e lojas", area: "loja", login: "oauth", url: "https://mcp.wix.com/mcp", fonte: "https://dev.wix.com/docs/overview/ai-the-wix-platform/the-wix-mcp", conferido: "2026-11-03" },
  { id: "miro", nome: "Miro", o_que: "Quadros brancos", area: "design", login: "oauth", url: "https://mcp.miro.com/", fonte: "https://developers.miro.com/docs/mcp-intro", conferido: "2026-11-03" },
  { id: "make", nome: "Make", o_que: "Automações entre apps", area: "automacao", login: "oauth", url: "https://mcp.make.com/v2", fonte: "https://developers.make.com/mcp-server/connect-using-oauth", conferido: "2026-11-03" },
  { id: "mercado-pago", nome: "Mercado Pago", o_que: "Integração de pagamentos", area: "tecnologia", login: "oauth", url: "https://mcp.mercadopago.com/mcp", fonte: "https://www.mercadopago.com.br/developers/pt/docs/mcp-server/connection", conferido: "2026-11-03" },
];
