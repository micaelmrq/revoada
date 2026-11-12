// Página da Revoada: copiar os comandos de instalar, a demonstração (o app vivo dentro da janela) e o passeio (a janela presa que troca de tela com a rolagem).
(() => {
  'use strict';
  const botao = document.querySelector('[data-copiar]');
  const bloco = document.querySelector('[data-comandos]');
  const rotulo = document.querySelector('[data-copiar-texto]');
  if (!botao || !bloco || !rotulo) return;
  const original = rotulo.textContent;
  let volta = 0;
  const diz = (texto) => {
    rotulo.textContent = texto;
    clearTimeout(volta);
    volta = setTimeout(() => { rotulo.textContent = original; }, 2400);
  };
  // área de transferência sem permissão (página fora de https, navegador antigo): seleciona os comandos pra copiar na mão
  const seleciona = () => {
    const faixa = document.createRange();
    faixa.selectNodeContents(bloco);
    const sel = getSelection();
    sel.removeAllRanges();
    sel.addRange(faixa);
    diz('Selecionado, agora ⌘C');
  };
  botao.addEventListener('click', () => {
    const texto = [...bloco.querySelectorAll('span')].map((s) => s.textContent).join('\n');
    if (!navigator.clipboard) return seleciona();
    navigator.clipboard.writeText(texto).then(() => diz('Copiado'), seleciona);
  });
})();

// A demonstração: no palco do passeio, no lugar dos prints, entra o app de verdade rodando num iframe (site/demo/, gerado por
// scripts/site-demo.ts), com um servidor de mentira dentro dele. Só carrega quando o passeio chega perto da tela, e nunca em tela
// pequena nem com movimento reduzido: aí ficam os prints. A cena que a rolagem escolhe vai para o app por postMessage.
(() => {
  'use strict';
  const secao = document.querySelector('[data-passeio]');
  if (!secao || !('IntersectionObserver' in window) || !('ResizeObserver' in window) || matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const LARGURA = 1100; // o app é de computador: abaixo disso ele é desenhado nessa largura e encolhido para caber na janela
  let perto = false, quadro = null, pronto = false, cena = '', espera = 0;
  const manda = (m) => { if (pronto && quadro && quadro.contentWindow) quadro.contentWindow.postMessage(m, location.origin); };
  const toca = () => { clearTimeout(espera); espera = setTimeout(() => { if (cena) manda({ revoada: 'cena', cena }); }, 260); };
  const mede = new ResizeObserver(([e]) => {
    const { width, height } = e.contentRect, base = Math.max(LARGURA, width), k = width / base;
    if (!quadro || !width) return;
    quadro.style.width = base + 'px'; quadro.style.height = Math.round(height / k) + 'px'; quadro.style.transform = k < 1 ? 'scale(' + k + ')' : '';
  });
  const monta = () => {
    const janela = document.querySelector('[data-palco]');
    if (!perto || !janela || janela.querySelector('iframe')) return;
    const telas = janela.querySelector('.passeio-telas');
    pronto = false;
    quadro = document.createElement('iframe');
    quadro.title = 'Demonstração do Revoada, com agentes de mentira e dados de exemplo';
    quadro.src = 'demo/#parado';
    telas.append(quadro);
    mede.disconnect(); mede.observe(telas);
  };
  addEventListener('message', (e) => {
    if (e.origin !== location.origin || !quadro || e.source !== quadro.contentWindow || !e.data || typeof e.data !== 'object') return;
    if (e.data.revoada === 'pronto') {
      pronto = true;
      const janela = quadro.closest('[data-palco]');
      janela.classList.add('viva');
      toca();
    }
  });
  // a página só manda cena quando a rolagem troca de ideia: se o visitante mexeu no app, ele fica como está até lá
  document.addEventListener('revoada:cena', (e) => { cena = e.detail.cena; monta(); toca(); });
  // a capa pinta primeiro: o iframe só entra na fila depois de a página carregar, a capa aparecer na tela e o navegador ficar ocioso, e com o passeio perto da tela
  const vigia = () => new IntersectionObserver((es, o) => { if (!es.some((x) => x.isIntersecting)) return; o.disconnect(); perto = true; monta(); }, { rootMargin: '60% 0px' }).observe(secao);
  const ocioso = () => ('requestIdleCallback' in window ? requestIdleCallback(vigia, { timeout: 2500 }) : setTimeout(vigia, 900));
  const pintou = () => performance.getEntriesByName('first-contentful-paint').length > 0;
  const carregou = () => {
    if (pintou()) return ocioso();
    try { new PerformanceObserver((l, o) => { if (pintou()) { o.disconnect(); ocioso(); } }).observe({ type: 'paint', buffered: true }); } catch { setTimeout(ocioso, 600); }
  };
  if (document.readyState === 'complete') carregou(); else addEventListener('load', carregou, { once: true });
})();

// O passeio. Em tela larga as ideias dividem uma janela só, presa na tela: a rolagem escolhe a ideia, o texto e a tela trocam
// juntos, e os nomes embaixo levam direto a cada uma. Em tela pequena fica como está no HTML, uma embaixo da outra.
(() => {
  'use strict';
  const secao = document.querySelector('[data-passeio]');
  if (!secao) return;
  const passos = [...secao.querySelectorAll('.passo')];
  const larga = matchMedia('(min-width: 1000px) and (min-height: 620px)');
  let palco = null, atual = -1, quadro = 0;
  const pecas = passos.map((p) => ({ passo: p, texto: p.querySelector('.passo-texto'), figura: p.querySelector('.janela'), tela: p.querySelector('picture'), cena: p.dataset.cena, rotulo: p.dataset.rotulo }));

  const mostra = (i) => {
    if (i === atual || !palco) return;
    atual = i;
    pecas.forEach((x, n) => { x.texto.classList.toggle('on', n === i); x.tela.classList.toggle('on', n === i); x.botao.setAttribute('aria-current', String(n === i)); });
    document.dispatchEvent(new CustomEvent('revoada:cena', { detail: { cena: pecas[i].cena } }));
  };
  const curso = () => secao.offsetHeight - innerHeight;
  const mede = () => {
    quadro = 0;
    if (!palco) return;
    const p = Math.min(0.9999, Math.max(0, -secao.getBoundingClientRect().top / curso()));
    mostra(Math.floor(p * pecas.length));
  };
  const rola = () => { if (!quadro) quadro = requestAnimationFrame(mede); };
  const vai = (i) => scrollTo({ top: scrollY + secao.getBoundingClientRect().top + ((i + 0.5) / pecas.length) * curso() });

  const monta = () => {
    palco = document.createElement('div'); palco.className = 'passeio-palco';
    const textos = document.createElement('div'); textos.className = 'passeio-textos';
    const janela = document.createElement('div'); janela.className = 'janela passeio-janela'; janela.dataset.palco = '';
    janela.innerHTML = '<div class="barra" aria-hidden="true"><i></i><i></i><i></i></div><div class="passeio-telas"></div>';
    const nav = document.createElement('nav'); nav.className = 'passeio-nav'; nav.setAttribute('aria-label', 'Telas do app');
    pecas.forEach((x, i) => {
      textos.append(x.texto); janela.lastChild.append(x.tela);
      x.botao = document.createElement('button'); x.botao.type = 'button'; x.botao.textContent = x.rotulo; x.botao.addEventListener('click', () => vai(i));
      nav.append(x.botao);
    });
    palco.append(textos, janela, nav);
    secao.style.setProperty('--n', pecas.length); secao.classList.add('vivo'); secao.prepend(palco);
    addEventListener('scroll', rola, { passive: true }); addEventListener('resize', rola);
    atual = -1; mede();
  };
  const desmonta = () => {
    removeEventListener('scroll', rola); removeEventListener('resize', rola);
    pecas.forEach((x) => { x.texto.classList.remove('on'); x.tela.classList.remove('on'); x.passo.prepend(x.texto); x.figura.append(x.tela); });
    palco.remove(); palco = null; secao.classList.remove('vivo');
  };
  const ajusta = () => { if (larga.matches && !palco) monta(); else if (!larga.matches && palco) desmonta(); };
  larga.addEventListener('change', ajusta);
  ajusta();
})();

// O fundo. Um campo de fios de grão que ondula devagar, pintado em WebGL em duas passadas, do mesmo jeito da página da Pandora:
// a primeira desenha os fios (ruído esticado na horizontal, torcido por duas ondas) numa textura pequena; a segunda junta os fios
// com um grão de 256 pontos puxado na vertical e pinta a tela. Fica preso à janela, atrás da página inteira, um pouco mais
// fraco que o original para o texto pequeno da capa ler bem, e mais fraco ainda abaixo dela, atrás do texto corrido. Sem WebGL, ficam as faixas em CSS; com menos movimento, um quadro parado.
(() => {
  'use strict';
  const fundo = document.querySelector('[data-fundo]');
  const tela = fundo?.querySelector('canvas');
  if (!tela) return;
  let gl = null, quadro = 0;
  const desiste = () => { cancelAnimationFrame(quadro); tela.remove(); fundo.classList.remove('gl'); };
  try { gl = tela.getContext('webgl', { alpha: false, antialias: false, depth: false, stencil: false, powerPreference: 'low-power' }); } catch { /* sem WebGL */ }
  if (!gl) return desiste();

  const PRECISAO = '#ifdef GL_FRAGMENT_PRECISION_HIGH\nprecision highp float;\n#else\nprecision mediump float;\n#endif\n';
  const VERTICE = 'attribute vec2 p;void main(){gl_Position=vec4(p,0.,1.);}';
  const FIOS = PRECISAO + `uniform vec2 uSize;uniform float uAr,uTime,uIn;uniform vec3 uPtr;
vec2 h22(vec2 p){vec3 q=fract(vec3(p.xyx)*vec3(.1031,.1030,.0973));q+=dot(q,q.yzx+33.33);return fract((q.xx+q.yz)*q.zy)*2.-1.;}
float gn(vec2 p){vec2 i=floor(p),f=fract(p),u=f*f*f*(f*(f*6.-15.)+10.);
  return mix(mix(dot(h22(i),f),dot(h22(i+vec2(1.,0.)),f-vec2(1.,0.)),u.x),mix(dot(h22(i+vec2(0.,1.)),f-vec2(0.,1.)),dot(h22(i+vec2(1.,1.)),f-vec2(1.,1.)),u.x),u.y);}
float fbm3(vec2 p){float s=0.,a=.5;for(int i=0;i<3;i++){s+=a*gn(p);p=p*2.+vec2(13.7,7.3);a*=.5;}return s;}
float fbm5(vec2 p){float s=0.,a=.5;for(int i=0;i<5;i++){s+=a*gn(p);p=p*2.+vec2(13.7,7.3);a*=.5;}return s;}
void main(){
  vec2 uv=gl_FragCoord.xy/uSize*vec2(uAr,1.);float t=uTime;
  vec2 p=vec2(uv.x/1.03,uv.y/.154);
  p.y+=.38*sin(uv.x*2.4-t*.30)+.18*sin(uv.x*5.1-t*.45+1.7);
  p.x-=t*.03;
  vec2 q=p*vec2(.55,.4);
  vec2 w=vec2(fbm3(q+vec2(0.,t*.045)),fbm3(q+vec2(4.1,1.3-t*.037)));
  float a=clamp(.35+1.2*fbm5(p+w*vec2(1.1,.8)),0.,1.);
  vec2 d=uv-vec2(.5*uAr,.5),e=uv-vec2(uPtr.x*uAr,uPtr.y),l=(uv-vec2(.8*uAr,1.))/vec2(max(uAr,1.)*.63,.7);
  float m=(1.+.32*uPtr.z*exp(-dot(e,e)/.035))*(1.-.5*smoothstep(.45,1.25,length(d/vec2(max(uAr,1.)*.62,.62))))*uIn*uIn*(3.-2.*uIn);
  gl_FragColor=vec4(a,m/1.5,exp(-dot(l,l)),1.);}`;
  const PINTA = PRECISAO + `uniform sampler2D uWisps,uGrain;uniform vec2 uRes;uniform float uDpr,uForca;
void main(){
  vec4 w=texture2D(uWisps,gl_FragCoord.xy/uRes);
  float b=texture2D(uGrain,gl_FragCoord.xy/(uDpr*256.)).r;
  float al=min(1.,clamp(1.32*(1.1*w.r*b+.45*w.r)-.5,0.,1.)*w.g*1.5)*uForca;
  gl_FragColor=vec4(mix(vec3(.0667,.0667,.0706),vec3(.50,.50,.51),al)+.045*w.b*uForca,1.);}`;

  const programa = (fragmento) => {
    const prog = gl.createProgram();
    for (const [tipo, fonte] of [[gl.VERTEX_SHADER, VERTICE], [gl.FRAGMENT_SHADER, fragmento]]) {
      const sh = gl.createShader(tipo);
      gl.shaderSource(sh, fonte); gl.compileShader(sh);
      if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(sh));
      gl.attachShader(prog, sh);
    }
    gl.bindAttribLocation(prog, 0, 'p'); gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(prog));
    const u = {};
    for (let i = 0; i < gl.getProgramParameter(prog, gl.ACTIVE_UNIFORMS); i++) { const nome = gl.getActiveUniform(prog, i).name; u[nome] = gl.getUniformLocation(prog, nome); }
    return { prog, u };
  };
  let fios, pinta;
  try { fios = programa(FIOS); pinta = programa(PINTA); } catch { return desiste(); }
  gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
  gl.enableVertexAttribArray(0); gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
  const textura = (borda, filtro) => {
    const t = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, t);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, filtro); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, filtro);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, borda); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, borda);
    return t;
  };

  // o grão: ruído com semente fixa, cada ponto misturado com os três de baixo, o que puxa o fio na vertical
  const LADO = 256, grao = new Uint8Array(LADO * LADO);
  let semente = 5;
  const sorteia = () => { semente = semente + 1831565813 | 0; let v = Math.imul(semente ^ semente >>> 15, 1 | semente); v = v + Math.imul(v ^ v >>> 7, 61 | v) ^ v; return ((v ^ v >>> 14) >>> 0) / 4294967296; };
  const fino = Float32Array.from({ length: LADO * LADO }, sorteia), largo = Float32Array.from({ length: LADO * LADO }, sorteia);
  for (let y = 0; y < LADO; y++) for (let x = 0; x < LADO; x++) {
    let fio = 0;
    for (let k = 0; k < 4; k++) fio += fino[(y + k) % LADO * LADO + x];
    const v = 0.5 + 0.7 * (fio / 4 - 0.5) + 0.2 * ((largo[y * LADO + x] + largo[(y + 1) % LADO * LADO + x]) / 2 - 0.5);
    grao[y * LADO + x] = Math.round(Math.min(1, Math.max(0, v)) * 255);
  }
  const texGrao = textura(gl.REPEAT, gl.NEAREST);
  gl.pixelStorei(gl.UNPACK_ALIGNMENT, 1);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.LUMINANCE, LADO, LADO, 0, gl.LUMINANCE, gl.UNSIGNED_BYTE, grao);

  let placa = gl.getParameter(gl.RENDERER);
  if (placa === 'WebKit WebGL') { const ext = gl.getExtension('WEBGL_debug_renderer_info'); if (ext) placa = gl.getParameter(ext.UNMASKED_RENDERER_WEBGL); }
  const fraca = /swiftshader|llvmpipe|software|basic render/i.test(placa);
  const texFios = textura(gl.CLAMP_TO_EDGE, gl.LINEAR), quadroFios = gl.createFramebuffer();
  let escala = 1, larg = 1, alt = 1, fiosL = 2, fiosA = 2;
  const mede = () => {
    larg = tela.clientWidth || innerWidth; alt = tela.clientHeight || innerHeight;
    escala = Math.min(fraca ? 0.6 : 1, Math.sqrt(4e6 / (larg * alt)));
    tela.width = Math.max(1, Math.round(larg * escala)); tela.height = Math.max(1, Math.round(alt * escala));
    fiosL = Math.max(2, Math.ceil(larg / 6)); fiosA = Math.max(2, Math.ceil(alt / 3));
    gl.bindTexture(gl.TEXTURE_2D, texFios);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, fiosL, fiosA, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
    gl.bindFramebuffer(gl.FRAMEBUFFER, quadroFios);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, texFios, 0);
    return gl.checkFramebufferStatus(gl.FRAMEBUFFER) === gl.FRAMEBUFFER_COMPLETE;
  };
  if (!mede()) return desiste();
  fundo.classList.add('gl');

  const mouse = { x: 0.5, y: 0.5, on: 0, tx: 0.5, ty: 0.5, ton: 0 };
  addEventListener('pointermove', (e) => { if (e.pointerType !== 'mouse') return; mouse.tx = e.clientX / innerWidth; mouse.ty = 1 - e.clientY / innerHeight; mouse.ton = 1; }, { passive: true });
  document.documentElement.addEventListener('pointerleave', () => { mouse.ton = 0; });
  const calmo = matchMedia('(prefers-reduced-motion: reduce)');
  // na capa o campo aparece inteiro; rolando para o texto corrido ele cai para esta fração
  const FORCA_NA_CAPA = 0.8, FORCA_NO_TEXTO = 0.42, TEMPO_INICIAL = 40, comeco = performance.now();
  const forca = () => FORCA_NA_CAPA - (FORCA_NA_CAPA - FORCA_NO_TEXTO) * Math.min(1, scrollY / (innerHeight * 0.7));
  const desenha = () => {
    const t = (performance.now() - comeco) / 1000, vivo = !calmo.matches;
    mouse.x += (mouse.tx - mouse.x) * 0.05; mouse.y += (mouse.ty - mouse.y) * 0.05; mouse.on += (mouse.ton - mouse.on) * 0.03;
    gl.bindFramebuffer(gl.FRAMEBUFFER, quadroFios); gl.viewport(0, 0, fiosL, fiosA); gl.useProgram(fios.prog);
    gl.uniform2f(fios.u.uSize, fiosL, fiosA); gl.uniform1f(fios.u.uAr, larg / alt);
    gl.uniform1f(fios.u.uTime, vivo ? TEMPO_INICIAL + t : TEMPO_INICIAL);
    gl.uniform1f(fios.u.uIn, vivo ? Math.min(1, Math.max(0, t - 0.3) / 3.2) : 1);
    gl.uniform3f(fios.u.uPtr, mouse.x, mouse.y, vivo ? mouse.on : 0);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null); gl.viewport(0, 0, tela.width, tela.height); gl.useProgram(pinta.prog);
    gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, texFios); gl.uniform1i(pinta.u.uWisps, 0);
    gl.activeTexture(gl.TEXTURE1); gl.bindTexture(gl.TEXTURE_2D, texGrao); gl.uniform1i(pinta.u.uGrain, 1);
    gl.uniform2f(pinta.u.uRes, tela.width, tela.height); gl.uniform1f(pinta.u.uDpr, escala); gl.uniform1f(pinta.u.uForca, forca());
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  };
  const PASSO_MS = fraca ? 49 : 32;
  let ultimo = -1e9;
  const laco = (agora) => { quadro = requestAnimationFrame(laco); if (agora - ultimo < PASSO_MS) return; ultimo = agora; desenha(); };
  const liga = () => { cancelAnimationFrame(quadro); if (calmo.matches) desenha(); else quadro = requestAnimationFrame(laco); };
  addEventListener('resize', () => { if (!mede()) return desiste(); if (calmo.matches) desenha(); });
  addEventListener('scroll', () => { if (calmo.matches) desenha(); }, { passive: true });
  calmo.addEventListener('change', liga);
  tela.addEventListener('webglcontextlost', (e) => { e.preventDefault(); desiste(); });
  liga();
})();
