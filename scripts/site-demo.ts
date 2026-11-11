// bun scripts/site-demo.ts: gera site/demo/, o painel de verdade rodando dentro do site, sem servidor.
// A página é a mesma de public/index.html (mesmo HTML, CSS e script), com três trocas: os arquivos que
// o servidor entregava viram vizinhos, o terminal sai, e antes de tudo entra demo.js, que junta as
// cenas de scripts/demo-cenas.ts, um servidor de mentira que responde ao fetch e à conversa ao vivo
// (scripts/site-demo/servidor.js) e o roteiro que usa a tela sozinho (scripts/site-demo/roteiro.js).
// O teste tests/site-demo.test.ts falha se site/demo/ ficar para trás de qualquer um desses arquivos.
//
// A página de fora fala com a demonstração por postMessage, sempre na mesma origem:
//   para dentro  { revoada: "cena", cena }   toca uma cena do começo e para no fim dela:
//                                            conversa | limite | precisa | tarefas | rotinas
//                { revoada: "tocar" }        solta a pausa; sem roteiro andando, recomeça o laço inteiro
//                { revoada: "pausar" }       congela o roteiro e os agentes onde estão
//   para fora    { revoada: "pronto" }       carregou e aceita comandos
//                { revoada: "cena", cena }   o roteiro entrou nessa cena
//                { revoada: "mexeu" }        o visitante clicou ou digitou e o roteiro parou
// Aberta como demo/#parado, a demonstração não começa sozinha: espera o primeiro comando.
import { mkdirSync, readFileSync, writeFileSync } from "fs";
import { join } from "path";
import { CENAS, PEDIDOS, PLANO, REVISAO } from "./demo-cenas";

const ROOT = join(import.meta.dir, "..");
const le = (...p: string[]) => readFileSync(join(ROOT, ...p), "utf8");

// cada troca tem de acontecer o número certo de vezes: se o painel mudar aqui, o gerador avisa em vez de gerar torto
function troca(html: string, de: string, para: string, vezes = 1) {
  const n = html.split(de).length - 1;
  if (n !== vezes) throw new Error(`site-demo: esperava ${vezes}x "${de}" em public/index.html e achei ${n}. Ajuste scripts/site-demo.ts.`);
  return html.replaceAll(de, para);
}
// o roteiro mexe no painel pelo nome destas peças; sumiu uma, o gerador para aqui
const PECAS = ["function go(v)", "async function refresh(force)", "function setMode(k)", "function setCwd(dir)", "let view =", "let chat =", "let S =", "const picked =", "terminal = false, supervisor = false", "let isolate =", "let attached =", "let rewriting =",
  'id="prompt"', 'id="send"', 'id="boardAll"', 'id="boardText"', 'id="schedNew"', 'id="tq"', 'id="needList"', 'id="schedList"', 'id="bots"', 'data-go="need"', 'data-go="board"', 'data-go="sched"', "data-need-decide=", 'data-decide="allow"', "data-run=", 'data-acc="', 'class="sys ${it.tone}"', "rot-l"];

export function gera(): Record<string, string> {
  let html = le("public/index.html");
  for (const p of PECAS) if (!html.includes(p)) throw new Error(`site-demo: o roteiro usa "${p}" e isso não está mais em public/index.html. Ajuste scripts/site-demo/roteiro.js.`);
  html = troca(html, '<link rel="icon" href="/icon.svg">', '<link rel="icon" href="../icon.svg">\n<meta name="robots" content="noindex">');
  html = troca(html, '<link rel="stylesheet" href="/vendor/xterm.css">\n', "");
  html = troca(html, '<script src="/md.js"></script>\n<script src="/sync.js"></script>', '<script src="demo.js"></script>');
  html = troca(html, '<script src="/vendor/xterm.js"></script>\n<script src="/vendor/addon-fit.js"></script>\n', "");
  for (const f of ["geist", "geist-mono", "newsreader"]) html = troca(html, `url("/${f}.woff2")`, `url("../${f}.woff2")`);
  html = troca(html, "</style>\n</head>", `${le("scripts/site-demo/demo.css")}</style>\n</head>`);
  const dados = { cenas: CENAS.map((c) => ({ ...c, quando: [c.quando.source, c.quando.flags] })), pedidos: PEDIDOS, plano: PLANO, revisao: REVISAO, logo: le("public/logo.svg") };
  const js = ["// Gerado por scripts/site-demo.ts a partir de public/ e scripts/site-demo/. Não edite aqui.", `window.REVOADA_DEMO = ${JSON.stringify(dados)};`,
    le("public/md.js"), le("public/sync.js"), le("scripts/site-demo/servidor.js"), le("scripts/site-demo/roteiro.js")].join("\n");
  return { "index.html": html, "demo.js": js };
}

if (import.meta.main) {
  const dir = join(ROOT, "site/demo");
  mkdirSync(dir, { recursive: true });
  for (const [nome, texto] of Object.entries(gera())) { writeFileSync(join(dir, nome), texto); console.log(`site/demo/${nome}  ${(texto.length / 1024).toFixed(0)} KB`); }
}
