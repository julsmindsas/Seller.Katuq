'use strict';

// D-502 (ticket 1180): auditoría del modo oscuro en navegador (tareas 0.2, 1.5 y cierre de cada fase).
//
// Uso:
//   node tests/theme/auditoria-tema.js --deps <carpeta con node_modules/playwright-core y axe-core>
//        [--dist dist/cuba] [--salida <carpeta>] [--base <carpeta de una corrida anterior>]
//
// - No suma dependencias al repo: playwright-core y axe-core se instalan fuera (p. ej. en el scratchpad).
// - Sirve el build en localhost con API simulada. Toda llamada a *.katuq.com se responde aquí
//   (POST /v1/users/edit incluido): nunca escribe en producción. Los demás hosts se bloquean por DNS,
//   salvo fuentes y cdnjs, y los WebSocket se cierran sin conectarse (Firebase incluido).
// - Mide los criterios 1, 2, 3 y 6 de la propuesta, el destello al recargar con el chunk demorado,
//   si la barra inferior y el chat (tarea 2.11) siguen al botón o al sistema operativo y si SignOut()
//   llama reset() (tarea 2.5). Los filtros no se miden: su bloque estaba vacío y se borró (2.8).
//   Con --base compara las capturas en claro.

const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
const os = require('node:os');
const { createRequire } = require('node:module');

const RAIZ = path.resolve(__dirname, '../..');

function argumento(nombre, porDefecto) {
  const i = process.argv.indexOf(`--${nombre}`);
  return i > -1 && process.argv[i + 1] ? process.argv[i + 1] : porDefecto;
}

const DEPS = argumento('deps', process.env.KATUQ_AUDIT_DEPS || '');
const DIST = path.resolve(RAIZ, argumento('dist', 'dist/cuba'));
const FECHA = new Date().toISOString().slice(0, 10);
const SALIDA = path.resolve(argumento('salida', path.join(os.tmpdir(), `auditoria-tema-${FECHA}`)));
const BASE = argumento('base', '');
const ANCHOS = [1440, 390];
const DEMORA_CHUNK_MS = 2000;

const PANTALLAS = {
  inicio: '/welcome',
  ocasiones: '/proceso/ocasiones',
  bodegas: '/inventario/bodegas',
  pedidos: '/ventas/pedidos',
};

// Lo que cambia entre corridas sin ser tema (versión, aviso de actualización, saludo por hora) se tapa.
const DINAMICOS = 'app-aviso-actualizacion, [class*="version"], .greeting-text';

const HOSTS_PERMITIDOS = ['fonts.googleapis.com', 'fonts.gstatic.com', 'cdnjs.cloudflare.com'];

if (!DEPS) {
  console.error('Falta --deps <carpeta> con playwright-core y axe-core instalados (fuera del repo).');
  process.exit(2);
}
const requerirDeps = createRequire(path.join(path.resolve(DEPS), 'package.json'));
const { chromium } = requerirDeps('playwright-core');
const AXE = fs.readFileSync(requerirDeps.resolve('axe-core/axe.min.js'), 'utf8');

// ---------- servidor estático con respaldo a index.html ----------
const TIPOS = {
  '.js': 'application/javascript', '.css': 'text/css', '.html': 'text/html', '.json': 'application/json',
  '.png': 'image/png', '.jpg': 'image/jpeg', '.svg': 'image/svg+xml', '.ico': 'image/x-icon', '.woff': 'font/woff',
  '.woff2': 'font/woff2', '.ttf': 'font/ttf', '.map': 'application/json', '.webmanifest': 'application/manifest+json',
};

function servir(dist) {
  const servidor = http.createServer((req, res) => {
    const ruta = decodeURIComponent(new URL(req.url, 'http://x').pathname);
    let archivo = path.resolve(dist, '.' + ruta);
    if (!archivo.startsWith(dist) || !fs.existsSync(archivo) || fs.statSync(archivo).isDirectory()) {
      archivo = path.extname(ruta) ? null : path.join(dist, 'index.html');
    }
    if (!archivo) { res.writeHead(404); res.end(); return; }
    res.writeHead(200, { 'Content-Type': TIPOS[path.extname(archivo)] || 'application/octet-stream' });
    fs.createReadStream(archivo).pipe(res);
  });
  return new Promise(listo => servidor.listen(0, '127.0.0.1', () => listo(servidor)));
}

const SCRIPTS_INICIALES = new Set(
  [...fs.readFileSync(path.join(DIST, 'index.html'), 'utf8').matchAll(/<script[^>]+src="([^"]+)"/g)].map(m => path.basename(m[1])),
);

// ---------- sesión y API simuladas ----------
function sesion(tema, premium) {
  const user = {
    token: 'auditoria0000.tema0000000.d5020000000', email: 'auditoria@katuq.test', rol: 'Administrador',
    company: 'AUDITORIA TEMA', nit: '900000000', name: 'Auditoría Tema', lang: { language: 'Español', code: 'es', type: 'CO', icon: 'co' }, tema,
  };
  // Sin `authorizationCode` el interceptor arma un header indefinido y ninguna llamada sale. Así se tomó la
  // línea base, por eso solo se agrega donde hace falta que salga la del plan (SubscriptionGuard).
  if (premium) user.authorizationCode = 'auditoria-tema';
  return { user, currentCompany: { nomComercial: 'Auditoría Tema', nit: '900000000' } };
}

// `premium` solo para entrar a /agent-builder (SubscriptionGuard): las demás pantallas siguen con la
// misma API simulada de la línea base, así la comparación en claro no cambia.
async function nuevoContexto(navegador, { tema = null, ancho = 1440, esquema = 'light', demorar = false, premium = false } = {}) {
  const contexto = await navegador.newContext({
    viewport: { width: ancho, height: ancho > 600 ? 900 : 844 },
    colorScheme: esquema,
    reducedMotion: 'reduce',
  });
  // Hora fija: el saludo y el reloj del resumen no cambian entre corridas.
  if (contexto.clock) await contexto.clock.setFixedTime(new Date('2026-10-18T10:00:00-05:00'));
  const estado = { pendientes: 0, ediciones: [] };
  if (tema !== null) {
    const datos = sesion(tema, premium);
    await contexto.addInitScript(([d]) => {
      if (sessionStorage.getItem('__auditoria_tema')) return; // la recarga conserva lo que hizo la página
      sessionStorage.setItem('__auditoria_tema', '1');
      localStorage.setItem('user', JSON.stringify(d.user));
      localStorage.setItem('loginTime', new Date().toISOString());
      localStorage.setItem('currentCompany', JSON.stringify(d.currentCompany));
    }, [datos]);
  }
  // close() es asíncrono: si el contexto ya se cerró, su rechazo no debe tumbar la corrida.
  if (contexto.routeWebSocket) await contexto.routeWebSocket(/.*/, ws => Promise.resolve(ws.close()).catch(() => {}));
  await contexto.route('**/*', async ruta => {
    const url = new URL(ruta.request().url());
    if (url.hostname === '127.0.0.1') {
      const lazy = url.pathname.endsWith('.js') && !SCRIPTS_INICIALES.has(path.basename(url.pathname));
      if (demorar && lazy) {
        estado.pendientes++;
        await new Promise(listo => setTimeout(listo, DEMORA_CHUNK_MS));
        estado.pendientes--;
      }
      return ruta.continue().catch(() => {}); // el contexto pudo cerrarse durante la demora
    }
    // El build de desarrollo apunta a localhost:3300 y el de producción a back.katuq.com: el plan se responde en los dos.
    if (premium && url.pathname.endsWith('/v1/subscriptions/status')) {
      return ruta.fulfill({ status: 200, contentType: 'application/json', body: '{"subscription":{"plan":"premium"}}' }).catch(() => {});
    }
    if (url.hostname.endsWith('katuq.com')) {
      if (url.pathname.includes('/v1/users/edit')) {
        estado.ediciones.push(ruta.request().postData());
        return ruta.fulfill({ status: 200, contentType: 'application/json', body: '{"ok":true}' }).catch(() => {});
      }
      return ruta.fulfill({ status: 200, contentType: 'application/json', body: '[]' }).catch(() => {});
    }
    if (HOSTS_PERMITIDOS.includes(url.hostname)) return ruta.continue().catch(() => {});
    return ruta.abort().catch(() => {});
  });
  await contexto.addInitScript(() => {
    const estilo = () => {
      const s = document.createElement('style');
      s.textContent = '*,*::before,*::after{animation:none!important;transition:none!important;caret-color:transparent!important}';
      document.head.appendChild(s);
    };
    if (document.head) estilo(); else document.addEventListener('DOMContentLoaded', estilo);
  });
  return { contexto, estado };
}

async function esperarApp(pagina) {
  await pagina.waitForFunction(() => document.querySelector('app-root')?.children.length > 0, null, { timeout: 30000 }).catch(() => {});
  await pagina.waitForTimeout(2500);
  const entendido = pagina.getByRole('button', { name: /entendido/i });
  if (await entendido.isVisible().catch(() => false)) await entendido.click().catch(() => {});
}

function temaDom(pagina) {
  return pagina.evaluate(() => ({
    clase: document.body.classList.contains('dark-only'),
    fondoEnLinea: document.body.style.backgroundColor || '',
    bundle: document.getElementById('app-theme')?.getAttribute('href') || '',
  }));
}

// ---------- chequeos ----------
// Anota si body.dark-only seguía puesto cuando la URL cambió a /login. El router cambia la URL antes
// del NavigationEnd, así que solo queda en false si SignOut() llamó reset() antes de navegar (tarea 2.5).
function sondaCambioALogin() {
  for (const metodo of ['pushState', 'replaceState']) {
    const original = history[metodo].bind(history);
    history[metodo] = function (estado, titulo, destino) {
      if (window.__claseAlIrALogin === undefined && destino && /\/login(?:[?#]|$)/.test(String(destino))) {
        window.__claseAlIrALogin = document.body.classList.contains('dark-only');
      }
      return original(estado, titulo, destino);
    };
  }
}

// Devuelve dos chequeos. El criterio 1 mira el estado final, y ese ya lo deja claro el NavigationEnd
// hacia /login aunque falte reset(): no sirve para cerrar 2.5. Para 2.5 cuenta `tarea25`.
async function criterio1CerrarSesion(navegador, url) {
  const { contexto } = await nuevoContexto(navegador, { tema: true });
  const pagina = await contexto.newPage();
  await pagina.addInitScript(sondaCambioALogin);
  await pagina.goto(url + PANTALLAS.pedidos);
  await esperarApp(pagina);
  const antes = await temaDom(pagina);
  await pagina.locator('.avatar-trigger').first().click().catch(() => {});
  await pagina.locator('.menu-item.logout').first().click({ timeout: 5000 }).catch(() => {});
  await pagina.waitForURL(/\/login/, { timeout: 10000 }).catch(() => {});
  await pagina.waitForTimeout(800);
  const despues = await temaDom(pagina);
  const claseAlIrALogin = await pagina.evaluate(() => (window.__claseAlIrALogin === undefined ? null : window.__claseAlIrALogin));
  await pagina.screenshot({ path: path.join(SALIDA, 'oscuro-1440-login-despues-de-cerrar-sesion.png') });
  await contexto.close();
  const ok = antes.clase && !despues.clase && !despues.fondoEnLinea && !/dark/.test(despues.bundle);
  const medible = antes.clase && claseAlIrALogin !== null;
  return {
    criterio1: { ok, antes, despues },
    tarea25: {
      ok: medible ? claseAlIrALogin === false : null,
      claseAlIrALogin,
      nota: medible ? 'clase en el body cuando la URL pasó a /login' : 'no se llegó a cerrar sesión en oscuro',
    },
  };
}

async function publicaConSesionOscura(navegador, url) {
  const { contexto } = await nuevoContexto(navegador, { tema: true });
  const pagina = await contexto.newPage();
  await pagina.goto(url + '/terms-conditions');
  await esperarApp(pagina);
  const dom = await temaDom(pagina);
  await contexto.close();
  return { ok: !dom.clase, dom };
}

async function destelloAlRecargar(navegador, url) {
  const { contexto, estado } = await nuevoContexto(navegador, { tema: true, demorar: true });
  const pagina = await contexto.newPage();
  await pagina.goto(url + PANTALLAS.pedidos, { waitUntil: 'commit' });
  await pagina.waitForFunction(() => document.querySelector('app-root')?.children.length > 0, null, { timeout: 30000 }).catch(() => {});
  const mientras = { ...(await temaDom(pagina)), chunksPendientes: estado.pendientes };
  await contexto.close();
  return { ok: mientras.clase, mientras, nota: mientras.chunksPendientes ? 'medido con el chunk demorado' : 'el chunk ya había llegado' };
}

async function barraInferior(navegador, url, tema, esquema) {
  const { contexto } = await nuevoContexto(navegador, { tema, ancho: 390, esquema });
  const pagina = await contexto.newPage();
  await pagina.goto(url + PANTALLAS.pedidos);
  await esperarApp(pagina);
  const fondo = await pagina.evaluate(() => {
    const barra = document.querySelector('.bottom-navigation');
    return barra ? getComputedStyle(barra).backgroundColor : null;
  });
  await contexto.close();
  const oscura = fondo ? /rgba?\(28, 28, 30/.test(fondo) : null;
  return { ok: fondo === null ? null : oscura === tema, fondo, temaApp: tema ? 'oscuro' : 'claro', sistema: esquema };
}

// Tarea 2.11: el chat de /chat pone `.dark-mode` según isDark$ y general-chat (sin encapsulado) pinta
// --gemini-bg según body.dark-only (#131314 en oscuro). Los dos siguen al botón, no al sistema operativo.
async function chatSigueAlBoton(navegador, url, tema, esquema) {
  const { contexto } = await nuevoContexto(navegador, { tema, esquema, premium: true });
  const pagina = await contexto.newPage();
  await pagina.goto(url + '/chat');
  await esperarApp(pagina);
  const chatOscuro = await pagina.evaluate(() => {
    const chat = document.querySelector('.chat-container');
    return chat ? chat.classList.contains('dark-mode') : null;
  });
  await pagina.goto(url + '/agent-builder/general-chat');
  await esperarApp(pagina);
  const fondoGeneral = await pagina.evaluate(() => {
    const chat = document.querySelector('.unified-chat-container');
    return chat ? getComputedStyle(chat).backgroundColor : null;
  });
  await contexto.close();
  const generalOscuro = fondoGeneral === null ? null : fondoGeneral === 'rgb(19, 19, 20)';
  const medidas = [chatOscuro, generalOscuro];
  // Falla si alguno sigue al sistema; sin medir (null) si alguno no se pintó.
  const ok = medidas.some(m => m !== null && m !== tema) ? false : medidas.includes(null) ? null : true;
  return { ok, chatOscuro, fondoGeneral, temaApp: tema ? 'oscuro' : 'claro', sistema: esquema };
}

async function medirPantalla(pagina) {
  return pagina.evaluate(() => {
    const selector = '.card, .cfg-card, .cfg-cabeza, .modal-content, .page-header, .p-datatable-tbody > tr, .p-datatable-thead > tr > th, .p-card, .p-panel';
    const blancos = [];
    for (const el of document.querySelectorAll(selector)) {
      const caja = el.getBoundingClientRect();
      if (!caja.width || !caja.height) continue;
      const fondo = getComputedStyle(el).backgroundColor;
      if (fondo === 'rgb(255, 255, 255)') blancos.push(String(el.className).slice(0, 60));
    }
    return {
      fondosBlancos: blancos.length,
      muestrasBlancos: blancos.slice(0, 5),
      scrollHorizontal: document.documentElement.scrollWidth > window.innerWidth + 1,
    };
  });
}

// Guarda el json de axe junto a la captura y devuelve cuántos nodos fallan color-contrast.
async function axeContraste(pagina, archivoPng) {
  await pagina.addScriptTag({ content: AXE });
  const resultado = await pagina.evaluate(() => window.axe.run(document, { runOnly: ['color-contrast'] }));
  fs.writeFileSync(path.join(SALIDA, archivoPng.replace(/\.png$/, '.axe.json')), JSON.stringify(resultado.violations, null, 2));
  return resultado.violations.reduce((suma, v) => suma + v.nodes.length, 0);
}

async function recorrerPantallas(navegador, url) {
  const filas = [];
  for (const tema of [false, true]) {
    for (const ancho of ANCHOS) {
      const { contexto } = await nuevoContexto(navegador, { tema, ancho });
      const pagina = await contexto.newPage();
      for (const [nombre, ruta] of Object.entries(PANTALLAS)) {
        await pagina.goto(url + ruta);
        await esperarApp(pagina);
        const archivo = `${tema ? 'oscuro' : 'claro'}-${ancho}-${nombre}.png`;
        await pagina.screenshot({ path: path.join(SALIDA, archivo), mask: [pagina.locator(DINAMICOS)] });
        const medida = await medirPantalla(pagina);
        const contraste = ancho === 1440 ? await axeContraste(pagina, archivo) : null;
        filas.push({ pantalla: nombre, tema: tema ? 'oscuro' : 'claro', ancho, archivo, ...medida, axeColorContrast: contraste });
      }
      await contexto.close();
    }
  }
  // login sin sesión, en claro
  for (const ancho of ANCHOS) {
    const { contexto } = await nuevoContexto(navegador, { ancho });
    const pagina = await contexto.newPage();
    await pagina.goto(url + '/login');
    await esperarApp(pagina);
    const archivo = `claro-${ancho}-login.png`;
    await pagina.screenshot({ path: path.join(SALIDA, archivo), mask: [pagina.locator(DINAMICOS)] });
    filas.push({ pantalla: 'login', tema: 'claro', ancho, archivo, ...(await medirPantalla(pagina)), axeColorContrast: ancho === 1440 ? await axeContraste(pagina, archivo) : null });
    await contexto.close();
  }
  return filas;
}

// Compara píxel a píxel en el mismo Chromium (sin dependencias). Cuenta como distinto un píxel
// con algún canal que cambie más de 16; la captura es «igual» si cambia menos del 0,1 % (con la hora fija, dos
// corridas del mismo build dan 0,000 %). El reporte trae el porcentaje de cada una.
const UMBRAL_CANAL = 16;
const UMBRAL_PIXELES = 0.001;

async function compararConBase(navegador, filas) {
  if (!BASE) return null;
  const contexto = await navegador.newContext();
  const pagina = await contexto.newPage();
  const resultado = [];
  for (const fila of filas.filter(f => f.tema === 'claro')) {
    const base = path.join(path.resolve(BASE), fila.archivo);
    if (!fs.existsSync(base)) { resultado.push({ archivo: fila.archivo, igual: false, motivo: 'sin línea base' }); continue; }
    const datos = [base, path.join(SALIDA, fila.archivo)].map(a => `data:image/png;base64,${fs.readFileSync(a).toString('base64')}`);
    const medida = await pagina.evaluate(async ([a, b, umbral]) => {
      const cargar = src => new Promise((listo, falla) => { const i = new Image(); i.onload = () => listo(i); i.onerror = falla; i.src = src; });
      const [ia, ib] = await Promise.all([cargar(a), cargar(b)]);
      if (ia.width !== ib.width || ia.height !== ib.height) return { distintos: 1, total: 1 };
      const pixeles = img => { const c = document.createElement('canvas'); c.width = img.width; c.height = img.height; const x = c.getContext('2d'); x.drawImage(img, 0, 0); return x.getImageData(0, 0, c.width, c.height).data; };
      const pa = pixeles(ia);
      const pb = pixeles(ib);
      let distintos = 0;
      for (let i = 0; i < pa.length; i += 4) {
        if (Math.abs(pa[i] - pb[i]) > umbral || Math.abs(pa[i + 1] - pb[i + 1]) > umbral || Math.abs(pa[i + 2] - pb[i + 2]) > umbral) distintos++;
      }
      return { distintos, total: pa.length / 4 };
    }, [datos[0], datos[1], UMBRAL_CANAL]);
    const proporcion = medida.distintos / medida.total;
    resultado.push({ archivo: fila.archivo, igual: proporcion <= UMBRAL_PIXELES, pixelesDistintos: `${(proporcion * 100).toFixed(3)} %` });
  }
  await contexto.close();
  return { ok: resultado.every(r => r.igual), capturas: resultado };
}

async function principal() {
  fs.mkdirSync(SALIDA, { recursive: true });
  const servidor = await servir(DIST);
  const url = `http://127.0.0.1:${servidor.address().port}`;
  const reglasDns = ['MAP * ~NOTFOUND', 'EXCLUDE 127.0.0.1', 'EXCLUDE localhost', ...HOSTS_PERMITIDOS.map(h => `EXCLUDE ${h}`)].join(', ');
  const navegador = await chromium.launch({ headless: true, args: [`--host-resolver-rules=${reglasDns}`] });
  let version = null;
  try { version = JSON.parse(fs.readFileSync(path.join(DIST, 'assets/version.json'), 'utf8')); } catch { /* sin versión */ }
  const reporte = { fecha: new Date().toISOString(), build: version, chequeos: {} };
  try {
    const cierre = await criterio1CerrarSesion(navegador, url);
    reporte.chequeos.criterio1CerrarSesion = cierre.criterio1;
    reporte.chequeos.tarea25ResetEnSignOut = cierre.tarea25;
    reporte.chequeos.publicaConSesionOscura = await publicaConSesionOscura(navegador, url);
    reporte.chequeos.destelloAlRecargar = await destelloAlRecargar(navegador, url);
    reporte.chequeos.barraSistemaOscuroAppClara = await barraInferior(navegador, url, false, 'dark');
    reporte.chequeos.barraSistemaClaroAppOscura = await barraInferior(navegador, url, true, 'light');
    reporte.chequeos.chatSistemaOscuroAppClara = await chatSigueAlBoton(navegador, url, false, 'dark');
    reporte.chequeos.chatSistemaClaroAppOscura = await chatSigueAlBoton(navegador, url, true, 'light');
    reporte.pantallas = await recorrerPantallas(navegador, url);
    reporte.chequeos.criterio3SinFondosBlancosEnOscuro = {
      ok: reporte.pantallas.filter(f => f.tema === 'oscuro').every(f => f.fondosBlancos === 0),
      porPantalla: reporte.pantallas.filter(f => f.tema === 'oscuro').map(f => `${f.pantalla}@${f.ancho}: ${f.fondosBlancos}`),
    };
    reporte.chequeos.criterio6SinScrollHorizontal = { ok: reporte.pantallas.every(f => !f.scrollHorizontal) };
    reporte.chequeos.comparacionClaro = await compararConBase(navegador, reporte.pantallas);
  } finally {
    await navegador.close();
    servidor.close();
  }
  fs.writeFileSync(path.join(SALIDA, 'reporte.json'), JSON.stringify(reporte, null, 2));
  for (const [nombre, valor] of Object.entries(reporte.chequeos)) {
    if (!valor) continue;
    process.stdout.write(`${valor.ok === true ? 'OK   ' : valor.ok === false ? 'FALLA' : 'N/A  '} ${nombre}\n`);
  }
  process.stdout.write(`Reporte: ${path.join(SALIDA, 'reporte.json')}\n`);
}

principal().catch(error => {
  process.stderr.write(`${error && error.stack || error}\n`);
  process.exit(1);
});
