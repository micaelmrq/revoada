// As cenas do modo de demonstração: o que cada agente de mentira "faz" e responde em cada pedido de
// exemplo. Um lugar só para o `bun run demo` (scripts/demo-agentes.ts) e para a demonstração que roda
// no navegador, dentro do site (scripts/site-demo.ts).
export type Passo =
  | { ler: string }
  | { rodar: string; desc: string; saida?: string; pede?: boolean }
  | { editar: string; novo?: boolean; pede?: boolean }
  | { texto: string }
  | { limite: true }      // a conta padrão para aqui, no limite de uso; a seguinte continua do passo de baixo
  | { demora: number };   // segura o agente trabalhando (ms)
export type Cena = { quando: RegExp; titulo: string; sugestao?: string; passos: Passo[] };

export const CENAS: Cena[] = [
  {
    quando: /pagina[çc][ãa]o de \/pedidos/i, titulo: "Paginação por cursor em pedidos", sugestao: "abre o PR com isso",
    passos: [
      { ler: "src/rotas/pedidos.ts" },
      { ler: "src/repositorio/pedidos.ts" },
      { editar: "src/repositorio/pedidos.ts" },
      { limite: true },
      { editar: "src/rotas/pedidos.ts" },
      { editar: "tests/pedidos.test.ts" },
      { rodar: "bun test tests/pedidos.test.ts", desc: "Roda os testes de pedidos", saida: "14 pass\n0 fail", pede: true },
      { texto: `Pronto. \`/pedidos\` agora pagina por cursor e o \`?pagina=\` antigo continua respondendo.

| Arquivo | O que mudou |
| --- | --- |
| \`src/repositorio/pedidos.ts\` | busca por \`(criado_em, id)\` depois do cursor |
| \`src/rotas/pedidos.ts\` | aceita \`?depois=\` e devolve \`proximo\` |
| \`tests/pedidos.test.ts\` | 4 casos novos, 14 passando |

- **Compatível:** quem ainda manda \`?pagina=\` recebe a mesma resposta de antes.
- **Índice:** a consulta usa o índice que já existe em \`(criado_em, id)\`.

Falta só avisar o app sobre o campo \`proximo\`.` },
    ],
  },
  {
    quando: /coluna entregue_em/i, titulo: "Migração da coluna entregue_em",
    passos: [
      { ler: "db/schema.sql" },
      { editar: "db/migrations/0042_pedidos_entregue_em.sql", novo: true, pede: true },
      { rodar: "bun run db:migrate --alvo local", desc: "Aplica a migração no banco local", saida: "0042_pedidos_entregue_em aplicada", pede: true },
      { texto: "Migração `0042` aplicada no banco local. A coluna `entregue_em` aceita nulo, então os pedidos antigos seguem valendo." },
    ],
  },
  {
    quando: /fuso do relat[óo]rio/i, titulo: "Fuso do relatório diário",
    passos: [
      { ler: "src/relatorio/diario.ts" },
      { editar: "src/relatorio/diario.ts" },
      { rodar: "bun test tests/relatorio.test.ts", desc: "Roda os testes do relatório", saida: "9 pass\n0 fail" },
      { texto: "O relatório fechava o dia em UTC e jogava as vendas depois das 21h para o dia seguinte. Agora o corte usa o fuso da loja. 9 testes passam, um deles novo para a virada do dia." },
    ],
  },
  {
    quando: /frete no resumo/i, titulo: "Frete no resumo do carrinho",
    passos: [
      { ler: "src/carrinho/Resumo.tsx" },
      { editar: "src/carrinho/Resumo.tsx" },
      { editar: "tests/carrinho.test.tsx" },
      { rodar: "bun test tests/carrinho.test.tsx", desc: "Roda os testes do carrinho", saida: "11 pass\n0 fail" },
      { texto: "O resumo do carrinho agora mostra a linha de frete antes do total. Sem CEP informado aparece \"a calcular\" no lugar do valor." },
    ],
  },
  {
    quando: /gr[áa]fico de vendas/i, titulo: "Gráfico de vendas em barras",
    passos: [
      { ler: "src/painel/GraficoVendas.tsx" },
      { editar: "src/painel/GraficoVendas.tsx" },
      { rodar: "bun test tests/painel.test.tsx", desc: "Roda os testes do painel" },
      { demora: 30 * 60_000 },
    ],
  },
  {
    quando: /su[íi]te inteira/i, titulo: "Suíte da manhã",
    passos: [
      { rodar: "bun test", desc: "Roda a suíte inteira", saida: "212 pass\n0 fail" },
      { texto: "Rodei a suíte inteira: 212 testes, todos passando. Nada quebrou desde ontem, então não abri PR." },
    ],
  },
  {
    quando: /SDK de pagamentos/i, titulo: "SDK de pagamentos atualizado",
    passos: [
      { ler: "package.json" },
      { rodar: "bun update pagamentos-sdk", desc: "Atualiza o SDK de pagamentos", saida: "pagamentos-sdk 4.2.0 -> 5.0.1" },
      { editar: "src/pagamentos/cliente.ts" },
      { rodar: "bun test tests/pagamentos.test.ts", desc: "Roda os testes de pagamentos", saida: "17 pass\n0 fail" },
      { texto: "SDK de pagamentos na versão 5. A única quebra era o nome do campo de valor, que passou de `amount` para `valor_centavos`. Ajustei o cliente e os 17 testes passam." },
    ],
  },
  {
    quando: /flag antiga do checkout/i, titulo: "Flag antiga do checkout removida",
    passos: [
      { ler: "src/checkout/flags.ts" },
      { editar: "src/checkout/flags.ts" },
      { editar: "src/checkout/Pagina.tsx" },
      { rodar: "bun test tests/checkout.test.tsx", desc: "Roda os testes do checkout", saida: "23 pass\n0 fail" },
      { texto: "A flag `checkout_novo` saiu. O caminho antigo, que ela ainda protegia, foi junto: ninguém caía nele desde que a flag foi ligada para todos." },
    ],
  },
  {
    quando: /exporta[çc][ãa]o de pedidos em CSV/i, titulo: "Exportar pedidos em CSV",
    passos: [
      { ler: "src/pedidos/lista.ts" },
      { editar: "src/pedidos/exportar.ts", novo: true },
      { editar: "tests/exportar.test.ts", novo: true },
      { rodar: "bun test tests/exportar.test.ts", desc: "Roda os testes da exportação", saida: "6 pass\n0 fail" },
      { texto: "A exportação fica em `src/pedidos/exportar.ts` e devolve o CSV com cabeçalho, uma linha por pedido. Vírgula e aspas dentro de campo saem escapadas. 6 testes." },
    ],
  },
  {
    quando: /importa[çc][ãa]o de clientes por planilha/i, titulo: "Importar clientes por planilha",
    passos: [
      { ler: "src/clientes/modelo.ts" },
      { editar: "src/clientes/importar.ts", novo: true },
      { editar: "tests/importar.test.ts", novo: true },
      { rodar: "bun test tests/importar.test.ts", desc: "Roda os testes da importação", saida: "8 pass\n0 fail" },
      { texto: "A importação fica em `src/clientes/importar.ts`. Linha com e-mail inválido ou repetido não entra e volta numa lista de recusadas, com o motivo. 8 testes." },
    ],
  },
];

export const REVISAO = `Nada a corrigir.

Conferi o diff contra o pedido, abri os arquivos em volta e rodei os testes da área: o caso novo cobre a mudança e nada que já existia mudou de comportamento.`;
export const PLANO = { fala: "Dá para separar em duas frentes que não tocam nos mesmos arquivos.", tarefas: [
  { titulo: "Exportar pedidos em CSV", pedido: "Crie a exportação de pedidos em CSV em src/pedidos/exportar.ts, com teste. Não mexa em src/clientes." },
  { titulo: "Importar clientes por planilha", pedido: "Crie a importação de clientes por planilha em src/clientes/importar.ts, com teste. Não mexa em src/pedidos." },
] };
export const PADRAO = "Este é o modo de demonstração: os agentes aqui são de mentira e só sabem responder aos pedidos de exemplo. Para usar de verdade, feche esta janela e rode `bun start`.";

// os pedidos de exemplo, como a pessoa escreveria: o `bun run demo` e a demonstração do site montam o mesmo dia de trabalho
export const PEDIDOS = {
  paginacao: "Troca a paginação de /pedidos de offset para cursor. Mantém o ?pagina= antigo funcionando por enquanto e ajusta os testes.",
  migracao: "Cria a migração da coluna entregue_em em pedidos e roda no banco local.",
  tarefas: ["Corrigir o fuso do relatório diário", "Mostrar o frete no resumo do carrinho", "Trocar o gráfico de vendas para barras empilhadas", "Atualizar o SDK de pagamentos", "Remover a flag antiga do checkout"],
  suite: "Roda a suíte inteira e abre um PR com o que quebrou",
  dependencias: "Atualiza as dependências e roda os testes",
  missao: "Exportar pedidos em CSV e importar clientes por planilha",
};
