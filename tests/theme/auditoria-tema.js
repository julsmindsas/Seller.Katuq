'use strict';

// D-502 (ticket 1180): auditoría del modo oscuro en navegador (tareas 0.2, 1.5, 3.8, 4.1 y cierre de cada fase).
//
// Uso:
//   node tests/theme/auditoria-tema.js --deps <carpeta con node_modules/playwright-core y axe-core>
//        [--dist dist/cuba] [--salida <carpeta>] [--base <carpeta de una corrida anterior>]
//        [--solo f0,pantallas,f1,terceros] [--base-terceros <corrida de terceros sobre el build de F0>]
//   node tests/theme/auditoria-tema.js --deps <…> --todas [--movil] [--sin-parametros] [--banderas todas]
//        [--salida <carpeta>]
//
// - No suma dependencias al repo: playwright-core y axe-core se instalan fuera (p. ej. en el scratchpad).
// - Sirve el build en localhost con API simulada. Toda llamada a *.katuq.com se responde aquí
//   (POST /v1/users/edit incluido): nunca escribe en producción. Los demás hosts se bloquean por DNS,
//   salvo fuentes y cdnjs, y los WebSocket se cierran sin conectarse (Firebase incluido).
// - Modo normal. Secciones (todas por defecto; `--solo` elige):
//   · f0: criterio 1, destello al recargar con el chunk demorado, barra inferior y chat contra el sistema
//     operativo y SignOut() con reset() (tarea 2.5). Los filtros no se miden: su bloque se borró (2.8).
//   · pantallas: capturas y axe de las pantallas de la línea base (criterios 2, 3 y 6) y, con --base,
//     comparación de las capturas en claro.
//   · f1: rellenos primarios #5F3FE0 con texto blanco en oscuro, tamaños de PrimeNG iguales en los dos
//     temas y ningún color de la familia del azul heredado dentro del marco (design-pruebas.md, F1).
//   · terceros: gráficos de Inicio, ng-select, SweetAlert2, driver.js, editor de texto rico y agenda en los
//     dos temas (tarea 3.8). Con --base-terceros (o --base) compara los conteos de axe y de fondos #fff con
//     el reporte.json de esa corrida: el criterio de 3.8 es «ninguno empeora». Se anota; no se arregla aquí.
// - Modo --todas: recorre las pantallas del marco enumeradas desde la configuración real de rutas
//   (rutas-marco.js) a 1440 px en oscuro (y a 390 px con --movil), también las de `:param` (con un valor
//   de muestra) salvo --sin-parametros. Mide axe color-contrast, los fondos #fff de paneles, tarjetas y
//   filas (criterio 3), los fondos casi blancos, los controles que no se separan 3:1 del fondo, el scroll
//   horizontal y el azul heredado. Escribe reporte.json ordenado por violaciones, con el módulo de cada
//   ruta, el resumen por módulo, la cobertura de las hojas con `config-pagina` y la lista de pantallas F2a
//   de revisión manual. Solo prende las banderas que piden los guards (la variante de producción); con
//   --banderas todas prende el catálogo entero.

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
const TODAS = process.argv.includes('--todas');
const MOVIL = process.argv.includes('--movil');
const SIN_PARAMETROS = process.argv.includes('--sin-parametros');
const BANDERAS_TODAS = argumento('banderas', 'guards') === 'todas';
const BASE_TERCEROS = argumento('base-terceros', BASE);
const SECCIONES = new Set(argumento('solo', 'f0,pantallas,f1,terceros').split(',').map(s => s.trim()).filter(Boolean));
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

const {
  GRUPOS_RELLENO, rellenoPrimarioOk, SELECTORES_TAMANO, PROPIEDADES_TAMANO, compararTamanos,
  azulHeredadoEn, AZUL_HEREDADO, PROPIEDADES_COLOR, SELECTOR_FONDOS, grupoF2aManual, revisionManualF2a,
  violacionesDe, ordenarReporte, resumenPorModulo, nombreArchivoRuta, coberturaCfg, compararTerceroConBase,
  SELECTOR_CONTROLES, LUMINANCIA_CASI_BLANCO, CONTRASTE_MINIMO_CONTROL,
  parseRgb, luminanciaRgb, contrasteRgb, esCasiBlanco, controlSeDistingue,
} = require('./auditoria-puras');

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
function sesion(tema, premium, banderas) {
  const user = {
    token: 'auditoria0000.tema0000000.d5020000000', email: 'auditoria@katuq.test', rol: 'Administrador',
    company: 'AUDITORIA TEMA', nit: '900000000', name: 'Auditoría Tema', lang: { language: 'Español', code: 'es', type: 'CO', icon: 'co' }, tema,
  };
  // Sin `authorizationCode` el interceptor arma un header indefinido y ninguna llamada sale. Así se tomó la
  // línea base, por eso solo se agrega donde hace falta que salga la del plan (SubscriptionGuard).
  if (premium) user.authorizationCode = 'auditoria-tema';
  // Con `banderas` (barrido --todas y terceros): la empresa guardada es la de la sesión, como exige
  // CompanyFeaturesService, y trae prendidas las banderas que piden los guards, para que no desvíen la
  // pantalla. Solo en este navegador simulado: nada sale a Firestore.
  if (banderas) {
    const featureFlags = Object.fromEntries(banderas.map(b => [b, true]));
    return { user, currentCompany: { nomComercial: user.company, nit: '900000000', featureFlags } };
  }
  return { user, currentCompany: { nomComercial: 'Auditoría Tema', nit: '900000000' } };
}

// Banderas prendidas en la sesión simulada. Por defecto, solo las de los guards de ruta (rutas-marco.js,
// banderasDeGuards): el resto queda apagado, como en producción para casi todos los comercios (D-505), y
// cada pantalla se mide en esa variante. `--banderas todas` prende el catálogo entero
// (company-features.service.ts) para medir también la variante con las funciones nuevas.
function banderasDeLaSesion() {
  if (!BANDERAS_TODAS) return require('./rutas-marco').banderasDeGuards();
  const { cargarTs } = require('./cargar-ts');
  const { COMPANY_FEATURE_FLAGS } = cargarTs('src/app/shared/services/company-features.service.ts');
  return Array.isArray(COMPANY_FEATURE_FLAGS) ? [...COMPANY_FEATURE_FLAGS] : [];
}

// `premium` solo para entrar a /agent-builder (SubscriptionGuard): las demás pantallas siguen con la
// misma API simulada de la línea base, así la comparación en claro no cambia.
async function nuevoContexto(navegador, { tema = null, ancho = 1440, esquema = 'light', demorar = false, premium = false, banderas = null } = {}) {
  const contexto = await navegador.newContext({
    viewport: { width: ancho, height: ancho > 600 ? 900 : 844 },
    colorScheme: esquema,
    reducedMotion: 'reduce',
  });
  // Hora fija: el saludo y el reloj del resumen no cambian entre corridas.
  if (contexto.clock) await contexto.clock.setFixedTime(new Date('2026-10-18T10:00:00-05:00'));
  const estado = { pendientes: 0, ediciones: [] };
  if (tema !== null) {
    const datos = sesion(tema, premium, banderas);
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

// Selector de la línea base (0.2). El barrido --todas usa uno más amplio (SELECTOR_FONDOS, criterio 3).
const SELECTOR_BASE = '.card, .cfg-card, .cfg-cabeza, .modal-content, .page-header, .p-datatable-tbody > tr, .p-datatable-thead > tr > th, .p-card, .p-panel';

async function medirPantalla(pagina, selectorFondos = SELECTOR_BASE) {
  return pagina.evaluate(selector => {
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
  }, selectorFondos);
}

// Funciones de color de auditoria-puras.js, inyectadas una vez por página (son autocontenidas).
function inyectarColor(pagina) {
  const fuente = `window.__auditoriaColor = window.__auditoriaColor || (function () {
    const LUMINANCIA_CASI_BLANCO = ${LUMINANCIA_CASI_BLANCO};
    const CONTRASTE_MINIMO_CONTROL = ${CONTRASTE_MINIMO_CONTROL};
    ${parseRgb}
    ${luminanciaRgb}
    ${contrasteRgb}
    ${esCasiBlanco}
    ${controlSeDistingue}
    return { esCasiBlanco, controlSeDistingue, contrasteRgb };
  })();`;
  return pagina.evaluate(fuente);
}

// Barrido --todas: lo de medirPantalla (criterio 3 con el selector ampliado) más los fondos casi blancos
// de esos mismos paneles y los controles que no se separan 3:1 del fondo de alrededor (WCAG 1.4.11).
async function medirPantallaTodas(pagina) {
  const base = await medirPantalla(pagina, SELECTOR_FONDOS);
  await inyectarColor(pagina);
  const extra = await pagina.evaluate(([fondos, controles]) => {
    const { esCasiBlanco, controlSeDistingue, contrasteRgb } = window.__auditoriaColor;
    const visible = el => { const c = el.getBoundingClientRect(); return c.width > 0 && c.height > 0 && getComputedStyle(el).visibility !== 'hidden'; };
    const etiqueta = el => `${el.tagName.toLowerCase()}.${String(el.className).trim().split(/\s+/).slice(0, 3).join('.')}`.slice(0, 80);
    const opaco = valor => { const m = /rgba?\(([^)]+)\)/.exec(valor || ''); if (!m) return false; const p = m[1].split(/[\s,/]+/).filter(Boolean); return p.length < 4 || parseFloat(p[3]) >= 0.9; };
    const fondoDetras = el => {
      for (let n = el.parentElement; n; n = n.parentElement) {
        const f = getComputedStyle(n).backgroundColor;
        if (opaco(f)) return f;
      }
      return getComputedStyle(document.body).backgroundColor || 'rgb(255, 255, 255)';
    };
    const casiBlancos = [...document.querySelectorAll(fondos)].filter(el => visible(el) && esCasiBlanco(getComputedStyle(el).backgroundColor));
    const sinContraste = [];
    for (const el of document.querySelectorAll(controles)) {
      if (!visible(el)) continue;
      const estilo = getComputedStyle(el);
      const conBorde = parseFloat(estilo.borderTopWidth) > 0 || parseFloat(estilo.borderBottomWidth) > 0;
      const fondoControl = opaco(estilo.backgroundColor) ? estilo.backgroundColor : null;
      const fondoExterior = fondoDetras(el);
      const medida = { borde: conBorde ? estilo.borderBottomColor : null, fondoControl, fondoExterior };
      if (controlSeDistingue(medida) === false) {
        sinContraste.push({
          elemento: etiqueta(el), ...medida,
          contrasteBorde: medida.borde ? Number(contrasteRgb(medida.borde, fondoExterior).toFixed(2)) : null,
        });
      }
    }
    return {
      fondosCasiBlancos: casiBlancos.length,
      muestrasCasiBlancos: casiBlancos.slice(0, 5).map(el => ({ elemento: etiqueta(el), fondo: getComputedStyle(el).backgroundColor })),
      controlesSinContraste: sinContraste.length,
      muestrasControles: sinContraste.slice(0, 5),
    };
  }, [SELECTOR_FONDOS, SELECTOR_CONTROLES]);
  return { ...base, ...extra };
}

// Guarda el json de axe junto a la captura y devuelve cuántos nodos fallan color-contrast.
// Con `selector`, mide solo dentro del primer elemento que coincide (terceros); si no está, devuelve null.
async function axeContraste(pagina, archivoPng, selector = null) {
  if (!(await pagina.evaluate(() => !!window.axe))) await pagina.addScriptTag({ content: AXE });
  const resultado = await pagina.evaluate(async sel => {
    const contexto = sel ? document.querySelector(sel) : document;
    if (!contexto) return null;
    return window.axe.run(contexto, { runOnly: ['color-contrast'] });
  }, selector);
  if (!resultado) return null;
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

// ---------- F1 (design-pruebas.md, «Auditoría en navegador», F1) ----------

// Piezas mínimas de Bootstrap y PrimeNG con sus clases reales, dentro del marco. Sirven cuando la
// pantalla no trae ninguna (rellenos) y como referencia fija de tamaños en los dos temas.
const FIXTURE_F1 = [
  '<button type="button" class="btn btn-primary">Auditoría</button>',
  '<span class="badge bg-primary">1</span>',
  '<button type="button" class="p-button p-component"><span class="p-button-label">Auditoría</span></button>',
  '<input type="text" class="p-inputtext p-component" value="Auditoría">',
  '<div class="p-datatable p-component"><div class="p-datatable-wrapper"><table class="p-datatable-table">',
  '<thead class="p-datatable-thead"><tr><th>Columna</th></tr></thead>',
  '<tbody class="p-datatable-tbody"><tr><td>Celda</td></tr></tbody></table></div></div>',
].join('');
const MARCA_FIXTURE = 'data-auditoria-f1';

function inyectarFixtureF1(pagina) {
  return pagina.evaluate(([html, marca]) => {
    if (document.querySelector(`[${marca}]`)) return;
    const destino = document.querySelector('app-content .page-body') || document.querySelector('app-content') || document.body;
    const caja = document.createElement('div');
    caja.setAttribute(marca, '');
    caja.style.cssText = 'position:relative;z-index:1;padding:8px;';
    caja.innerHTML = html;
    destino.appendChild(caja);
  }, [FIXTURE_F1, MARCA_FIXTURE]);
}

// Fondo y color del texto de los rellenos primarios. `enFixture` mide solo dentro del fixture.
function medirRellenos(pagina, enFixture) {
  return pagina.evaluate(([grupos, marca, enFixture]) => {
    const visible = el => {
      const caja = el.getBoundingClientRect();
      const estilo = getComputedStyle(el);
      return caja.width > 0 && caja.height > 0 && estilo.visibility !== 'hidden' && estilo.display !== 'none';
    };
    const resultado = {};
    for (const [grupo, selector] of Object.entries(grupos)) {
      const elementos = [...document.querySelectorAll(enFixture ? `[${marca}] ${selector}` : selector)]
        .filter(el => (enFixture ? true : !el.closest(`[${marca}]`)) && visible(el))
        .slice(0, 10);
      resultado[grupo] = elementos.map(el => {
        const texto = el.querySelector('.p-button-label') || el;
        return { clase: String(el.className).slice(0, 80), fondo: getComputedStyle(el).backgroundColor, texto: getComputedStyle(texto).color };
      });
    }
    return resultado;
  }, [GRUPOS_RELLENO, MARCA_FIXTURE, enFixture]);
}

// font-size y padding del primer elemento visible de cada selector (de la pantalla o del fixture).
function medirTamanos(pagina, enFixture) {
  return pagina.evaluate(([selectores, propiedades, marca, enFixture]) => {
    const resultado = {};
    for (const [clave, selector] of Object.entries(selectores)) {
      const el = [...document.querySelectorAll(enFixture ? `[${marca}] ${selector}` : selector)]
        .find(e => (enFixture || !e.closest(`[${marca}]`)) && e.getBoundingClientRect().width > 0);
      if (!el) { resultado[clave] = null; continue; }
      const estilo = getComputedStyle(el);
      resultado[clave] = Object.fromEntries(propiedades.map(p => [p, estilo[p]]));
    }
    return resultado;
  }, [SELECTORES_TAMANO, PROPIEDADES_TAMANO, MARCA_FIXTURE, enFixture]);
}

// Colores computados de la familia del azul heredado dentro del marco (app-content), con ::before y ::after.
function medirAzul(pagina) {
  const triples = Object.values(AZUL_HEREDADO).map(c => c.join('\\s*,\\s*')).join('|');
  const patron = `rgba?\\(\\s*(${triples})\\s*[,)]`;
  return pagina.evaluate(([patron, propiedades, marca]) => {
    const re = new RegExp(patron, 'i');
    const raiz = document.querySelector('app-content') || document.body;
    const hallazgos = [];
    let total = 0;
    for (const el of [raiz, ...raiz.querySelectorAll('*')]) {
      if (el.closest(`[${marca}]`) || !el.getClientRects().length) continue;
      for (const pseudo of [null, '::before', '::after']) {
        const estilo = getComputedStyle(el, pseudo);
        if (pseudo && (estilo.content === 'none' || estilo.content === 'normal')) continue;
        for (const propiedad of propiedades) {
          const valor = estilo[propiedad];
          if (!valor || !re.test(valor)) continue;
          total++;
          if (hallazgos.length < 15) {
            const clase = typeof el.className === 'string' && el.className.trim() ? `.${el.className.trim().split(/\s+/).slice(0, 3).join('.')}` : '';
            hallazgos.push({ elemento: `${el.tagName.toLowerCase()}${clase}`, pseudo, propiedad, valor: valor.slice(0, 90) });
          }
        }
      }
    }
    return { total, hallazgos };
  }, [patron, PROPIEDADES_COLOR, MARCA_FIXTURE])
    .then(r => ({ ...r, hallazgos: r.hallazgos.map(h => ({ ...h, hex: azulHeredadoEn(h.valor) })) }));
}

// Los tres chequeos de F1 sobre las pantallas de la línea base, a 1440 px.
async function chequeosF1(navegador, url) {
  const medidas = { claro: {}, oscuro: {} };
  const rellenos = {};
  const azul = {};
  for (const tema of [false, true]) {
    const clave = tema ? 'oscuro' : 'claro';
    const { contexto } = await nuevoContexto(navegador, { tema });
    const pagina = await contexto.newPage();
    for (const [nombre, ruta] of Object.entries(PANTALLAS)) {
      await pagina.goto(url + ruta);
      await esperarApp(pagina);
      if (tema) azul[nombre] = await medirAzul(pagina);
      const real = await medirTamanos(pagina, false);
      const enPantalla = tema ? await medirRellenos(pagina, false) : null;
      await inyectarFixtureF1(pagina);
      medidas[clave][nombre] = { real, fixture: await medirTamanos(pagina, true) };
      if (tema) {
        const enFixture = await medirRellenos(pagina, true);
        rellenos[nombre] = Object.fromEntries(Object.keys(GRUPOS_RELLENO).map(grupo => {
          const propias = enPantalla[grupo];
          const origen = propias.length ? 'pantalla' : 'fixture';
          const lista = propias.length ? propias : enFixture[grupo];
          return [grupo, { origen, ok: lista.length ? lista.every(rellenoPrimarioOk) : null, medidas: lista }];
        }));
        await pagina.screenshot({ path: path.join(SALIDA, `f1-oscuro-1440-${nombre}.png`), mask: [pagina.locator(DINAMICOS)] });
      }
    }
    await contexto.close();
  }
  const tamanos = Object.fromEntries(Object.keys(PANTALLAS).map(nombre => [nombre, {
    real: compararTamanos(medidas.claro[nombre].real, medidas.oscuro[nombre].real),
    fixture: compararTamanos(medidas.claro[nombre].fixture, medidas.oscuro[nombre].fixture),
  }]));
  const resultadosTamano = Object.values(tamanos).flatMap(t => [t.real.ok, t.fixture.ok]).filter(v => v !== null);
  const resultadosRelleno = Object.values(rellenos).flatMap(r => Object.values(r).map(g => g.ok)).filter(v => v !== null);
  return {
    f1RellenosPrimarios: {
      ok: resultadosRelleno.length ? resultadosRelleno.every(Boolean) : null,
      esperado: 'fondo rgb(95, 63, 224) y texto rgb(255, 255, 255) en oscuro',
      porPantalla: rellenos,
    },
    f1TamanosPrimeNG: {
      ok: resultadosTamano.length ? resultadosTamano.every(Boolean) : null,
      porPantalla: tamanos,
    },
    f1SinAzulHeredado: {
      ok: Object.values(azul).every(a => a.total === 0),
      porPantalla: azul,
    },
  };
}

// ---------- terceros en oscuro (tarea 3.8) ----------

// Al 2026-10-21: ApexCharts no aparece en ninguna plantilla (Inicio y el dashboard clásico usan
// ECharts), FullCalendar no está instalado (la agenda es propia) y el editor de productos es CKEditor;
// Quill solo trae su CSS. Se mide lo que haya y se anota cuál librería apareció.
const LIBRERIAS = {
  apexcharts: '.apexcharts-canvas',
  echarts: '[_echarts_instance_]',
  ngSelect: '.ng-select',
  sweetalert2: '.swal2-popup',
  driverJs: '.driver-popover',
  quill: '.ql-editor',
  ckeditor: '.ck-editor',
  fullcalendar: '.fc',
};

const TERCEROS = [
  { nombre: 'graficos-inicio', ruta: '/welcome', selector: `${LIBRERIAS.apexcharts}, ${LIBRERIAS.echarts}` },
  { nombre: 'graficos-dashboard-clasico', ruta: '/dashboards/classic', selector: `${LIBRERIAS.apexcharts}, ${LIBRERIAS.echarts}` },
  { nombre: 'ng-select', ruta: '/tiempoentrega/create', selector: LIBRERIAS.ngSelect, abrir: '.ng-select .ng-select-container' },
  { nombre: 'sweetalert2', ruta: PANTALLAS.ocasiones, selector: LIBRERIAS.sweetalert2, disparar: 'sweetalert2' },
  { nombre: 'driver-js', ruta: PANTALLAS.ocasiones, selector: LIBRERIAS.driverJs, disparar: 'driver' },
  { nombre: 'editor-texto-rico', ruta: '/productos/crearProductos', selector: `${LIBRERIAS.quill}, ${LIBRERIAS.ckeditor}` },
  { nombre: 'agenda', ruta: '/agenda', selector: `app-agenda-page, ${LIBRERIAS.fullcalendar}` },
];

// Marcado real de cada librería, para cuando no se puede llamar a la librería desde el bundle.
const FIXTURES_TERCEROS = {
  sweetalert2: '<div class="swal2-container swal2-center swal2-backdrop-show" style="overflow-y:auto">'
    + '<div class="swal2-popup swal2-modal swal2-icon-warning swal2-show" style="display:grid">'
    + '<div class="swal2-icon swal2-warning swal2-icon-show" style="display:flex"><div class="swal2-icon-content">!</div></div>'
    + '<h2 class="swal2-title" style="display:block">Auditoría del tema</h2>'
    + '<div class="swal2-html-container" style="display:block">Aviso de prueba: no guarda nada.</div>'
    + '<div class="swal2-actions" style="display:flex"><button type="button" class="swal2-confirm swal2-styled" style="display:inline-block">Aceptar</button>'
    + '<button type="button" class="swal2-cancel swal2-styled" style="display:inline-block">Cancelar</button></div></div></div>',
  // Lo que driver.js pinta en un paso: overlay SVG, el elemento resaltado y el popover con la clase del
  // tour de la app (`driverjs-theme katuq-tour`, tour.service.ts). `body.driver-active` lo pone el script.
  driver: '<svg class="driver-overlay driver-overlay-animated" viewBox="0 0 1440 900" preserveAspectRatio="xMinYMin slice"'
    + ' style="fill-rule:evenodd;clip-rule:evenodd;z-index:10000;position:fixed;top:0;left:0;width:100%;height:100%">'
    + '<path d="M1440,0L0,0L0,900L1440,900L1440,0Z M100,100 h400 v80 h-400 Z" style="fill:rgb(0,0,0);opacity:0.7;pointer-events:auto;cursor:auto"></path></svg>'
    + '<div class="driver-popover driverjs-theme katuq-tour" style="position:fixed;top:200px;left:110px;display:block;z-index:1000000000">'
    + '<button type="button" class="driver-popover-close-btn">×</button>'
    + '<header class="driver-popover-title" style="display:block">Auditoría del tema</header>'
    + '<div class="driver-popover-description" style="display:block">Paso de prueba: no guarda nada.</div>'
    + '<footer class="driver-popover-footer" style="display:flex"><span class="driver-popover-progress-text" style="display:block">1 de 2</span>'
    + '<span class="driver-popover-navigation-btns"><button type="button" class="driver-popover-prev-btn">Anterior</button>'
    + '<button type="button" class="driver-popover-next-btn">Siguiente</button></span></footer></div>',
};

// Abre SweetAlert2 o driver.js con la librería del bundle (su módulo se busca entre los que webpack ya
// cargó). Solo muestran un aviso o un paso del tour: ninguno llama a la API. En el build de producción
// driver.js queda concatenado dentro del módulo de TourService, que no exporta `driver`: entonces se
// usa `TourService.highlightElement` (el tour real de la app, con su `popoverClass`, sin marcar tours
// como vistos). Si no se encuentra nada, se usa el marcado de FIXTURES_TERCEROS con el CSS de la app.
async function dispararTercero(pagina, cual) {
  const desdeLibreria = await pagina.evaluate(cual => {
    const clave = Object.keys(window).find(k => k.startsWith('webpackChunk'));
    if (!clave) return 'sin registro de chunks de webpack';
    let requerir = null;
    window[clave].push([[`auditoria-tema-${Date.now()}`], {}, r => { requerir = r; }]);
    if (!requerir || !requerir.m) return 'sin acceso a los módulos de webpack';
    const huella = cual === 'sweetalert2' ? 'swal2-popup' : 'driver-popover';
    for (const id of Object.keys(requerir.m)) {
      if (!Function.prototype.toString.call(requerir.m[id]).includes(huella)) continue;
      let modulo;
      try { modulo = requerir(id); } catch { continue; }
      const candidatos = [modulo, modulo && modulo.default, ...Object.values(modulo || {})];
      if (cual === 'sweetalert2') {
        const swal = candidatos.find(c => c && typeof c.fire === 'function');
        if (!swal) continue;
        swal.fire({ title: 'Auditoría del tema', text: 'Aviso de prueba: no guarda nada.', icon: 'warning', showCancelButton: true, confirmButtonText: 'Aceptar', cancelButtonText: 'Cancelar' });
        return 'libreria';
      }
      const tour = candidatos.find(c => typeof c === 'function' && c.prototype && typeof c.prototype.highlightElement === 'function');
      if (tour) {
        const destino = ['.cfg-cabeza', '.page-header', 'app-content .page-body', 'app-content'].find(s => document.querySelector(s));
        new tour({ navigate: () => Promise.resolve(true), events: { subscribe: () => ({ unsubscribe() {} }) }, url: location.pathname })
          .highlightElement(destino || 'body', 'Auditoría del tema', 'Paso de prueba: no guarda nada.');
        return 'tourService';
      }
      const fabrica = (modulo && typeof modulo.driver === 'function') ? modulo.driver : null;
      if (!fabrica) continue;
      fabrica({
        showProgress: true, animate: false,
        steps: [
          { popover: { title: 'Auditoría del tema', description: 'Paso de prueba: no guarda nada.' } },
          { popover: { title: 'Segundo paso', description: 'Fin del tour de prueba.' } },
        ],
      }).drive();
      return 'libreria';
    }
    return cual === 'sweetalert2'
      ? 'no se encontró Swal.fire en los módulos cargados'
      : 'no se encontró ni `driver` exportado ni TourService.highlightElement en los módulos cargados';
  }, cual);
  if (desdeLibreria === 'libreria' || desdeLibreria === 'tourService') return { origen: desdeLibreria };
  await pagina.evaluate(([html, cual]) => {
    const caja = document.createElement('div');
    caja.setAttribute('data-auditoria-tercero', '');
    caja.innerHTML = html;
    document.body.appendChild(caja);
    if (cual === 'driver') {
      document.body.classList.add('driver-active', 'driver-fade', 'driver-simple');
      const resaltado = document.querySelector('.cfg-cabeza, .page-header, app-content .page-body');
      if (resaltado) resaltado.classList.add('driver-active-element');
    }
  }, [FIXTURES_TERCEROS[cual], cual]);
  return { origen: 'fixture', motivo: desdeLibreria };
}

// Qué librerías hay en la pantalla y fondos #fff visibles dentro del tercero.
function medirTercero(pagina, selector) {
  return pagina.evaluate(([librerias, selector]) => {
    const presentes = Object.fromEntries(Object.entries(librerias).map(([n, s]) => [n, !!document.querySelector(s)]));
    const raiz = document.querySelector(selector);
    let fondosBlancos = 0;
    if (raiz) {
      for (const el of [raiz, ...raiz.querySelectorAll('*')]) {
        const caja = el.getBoundingClientRect();
        if (caja.width && caja.height && getComputedStyle(el).backgroundColor === 'rgb(255, 255, 255)') fondosBlancos++;
      }
    }
    return { presente: !!raiz, librerias: presentes, fondosBlancos };
  }, [LIBRERIAS, selector]);
}

// reporte.json de la corrida de terceros que sirve de base (la del build de F0, tomada antes de 3.4).
function terceroBase() {
  if (!BASE_TERCEROS) return null;
  try {
    const reporte = JSON.parse(fs.readFileSync(path.join(path.resolve(BASE_TERCEROS), 'reporte.json'), 'utf8'));
    return (reporte.chequeos && reporte.chequeos.tarea38Terceros && reporte.chequeos.tarea38Terceros.porTercero) || null;
  } catch {
    return null;
  }
}

async function terceros(navegador, url) {
  const banderas = banderasDeLaSesion();
  const resultado = {};
  const base = terceroBase();
  const comparador = BASE_TERCEROS ? await navegador.newContext() : null;
  const paginaComparar = comparador ? await comparador.newPage() : null;
  for (const tercero of TERCEROS) {
    const fila = { ruta: tercero.ruta, selector: tercero.selector, temas: {} };
    for (const tema of [false, true]) {
      const clave = tema ? 'oscuro' : 'claro';
      const { contexto } = await nuevoContexto(navegador, { tema, premium: true, banderas });
      const pagina = await contexto.newPage();
      try {
        await pagina.goto(url + tercero.ruta);
        await esperarApp(pagina);
        let disparo = null;
        if (tercero.disparar) {
          disparo = await dispararTercero(pagina, tercero.disparar);
          await pagina.waitForTimeout(600);
        }
        if (tercero.abrir) await pagina.locator(tercero.abrir).first().click({ timeout: 3000 }).catch(() => {});
        const medida = await medirTercero(pagina, tercero.selector);
        const archivo = `tercero-${tercero.nombre}-${clave}-1440.png`;
        await pagina.screenshot({ path: path.join(SALIDA, archivo), mask: [pagina.locator(DINAMICOS)] });
        const axe = medida.presente ? await axeContraste(pagina, archivo, tercero.selector) : null;
        const capturaBase = paginaComparar ? await compararPar(paginaComparar, archivo, BASE_TERCEROS) : null;
        fila.temas[clave] = { archivo, urlFinal: new URL(pagina.url()).pathname, disparo, ...medida, axeColorContrast: axe, capturaBase };
      } catch (error) {
        fila.temas[clave] = { error: String(error && error.message || error).slice(0, 200) };
      }
      await contexto.close();
    }
    const oscuro = fila.temas.oscuro || {};
    // Criterio de 3.8: ninguno empeora frente a la base. Sin base comparable, `ok` queda sin medir.
    fila.sinViolacionesEnOscuro = oscuro.presente ? oscuro.axeColorContrast === 0 && oscuro.fondosBlancos === 0 : null;
    fila.contraBase = compararTerceroConBase(fila, base && base[tercero.nombre]);
    fila.ok = fila.contraBase.comparable ? !fila.contraBase.empeora : null;
    fila.nota = !oscuro.presente
      ? 'no apareció en la pantalla: se anota y se revisa a mano'
      : !fila.contraBase.comparable ? 'sin base de terceros comparable (--base-terceros): no se puede decir si empeoró'
        : fila.ok ? (fila.sinViolacionesEnOscuro ? 'no empeora y sin violaciones en oscuro' : 'no empeora; lo que queda se anota para F3')
          : 'EMPEORA frente a la base: anotar para F3 (no se arregla en 3.8)';
    resultado[tercero.nombre] = fila;
  }
  if (comparador) await comparador.close();
  const medidos = Object.values(resultado).map(r => r.ok).filter(v => v !== null);
  return {
    ok: medidos.length ? medidos.every(Boolean) : null,
    base: BASE_TERCEROS ? { carpeta: path.resolve(BASE_TERCEROS), conReporte: !!base } : null,
    porTercero: resultado,
  };
}

// ---------- barrido de «todas las páginas» (--todas) ----------

const MAX_PANTALLAS_POR_CONTEXTO = 25;

function sinBarraFinal(ruta) {
  return ruta.length > 1 ? ruta.replace(/\/+$/, '') : ruta;
}

async function barridoTodas(navegador, url) {
  const { rutasDelMarco, urlDeMuestra, archivosConfigPagina } = require('./rutas-marco');
  const { pantallas, omitidas, errores } = rutasDelMarco();
  const banderas = banderasDeLaSesion();
  const anchos = MOVIL ? [1440, 390] : [1440];
  fs.mkdirSync(path.join(SALIDA, 'todas'), { recursive: true });
  const aMedir = pantallas.filter(p => !SIN_PARAMETROS || !p.conParametros);
  const conParametros = pantallas.filter(p => SIN_PARAMETROS && p.conParametros)
    .map(p => ({ ruta: p.ruta, motivo: 'lleva :param y se pidió --sin-parametros' }));
  const filas = [];
  for (const ancho of anchos) {
    let contexto = null;
    let pagina = null;
    let usadas = 0;
    for (const pantalla of aMedir) {
      if (!contexto || usadas >= MAX_PANTALLAS_POR_CONTEXTO) {
        if (contexto) await contexto.close();
        ({ contexto } = await nuevoContexto(navegador, { tema: true, ancho, premium: true, banderas }));
        pagina = await contexto.newPage();
        usadas = 0;
      }
      usadas++;
      const destino = urlDeMuestra(pantalla.ruta);
      const fila = {
        ruta: pantalla.ruta, url: destino, modulo: pantalla.modulo, archivoModulo: pantalla.archivoModulo,
        componente: pantalla.componente || null, scss: pantalla.scss || null, usaCfg: !!pantalla.usaCfg,
        f2aManual: grupoF2aManual(pantalla.ruta), tema: 'oscuro', ancho,
      };
      try {
        await pagina.goto(url + destino, { timeout: 30000 });
        await esperarApp(pagina);
        const estado = await pagina.evaluate(() => ({ urlFinal: location.pathname, oscuro: document.body.classList.contains('dark-only') }));
        const archivo = `todas/oscuro-${ancho}-${nombreArchivoRuta(pantalla.ruta)}.png`;
        await pagina.screenshot({ path: path.join(SALIDA, archivo), mask: [pagina.locator(DINAMICOS)] });
        const medida = await medirPantallaTodas(pagina);
        const axe = await axeContraste(pagina, archivo);
        const azul = await medirAzul(pagina);
        Object.assign(fila, estado, medida, {
          redirigida: sinBarraFinal(estado.urlFinal) !== sinBarraFinal(destino),
          archivo, axeColorContrast: axe, azulHeredado: azul.total,
        });
        // Una pantalla que cerró la sesión deja a las siguientes en /login: se empieza otra sesión.
        if (/^\/login/.test(estado.urlFinal)) { await contexto.close(); contexto = null; }
      } catch (error) {
        fila.error = String(error && error.message || error).slice(0, 200);
        await contexto.close().catch(() => {});
        contexto = null;
      }
      filas.push(fila);
    }
    if (contexto) await contexto.close();
  }
  const ordenadas = ordenarReporte(filas);
  return {
    modo: 'todas',
    anchos,
    banderas: { modo: BANDERAS_TODAS ? 'todas' : 'guards', prendidas: banderas },
    enumeradas: pantallas.length,
    medidas: ordenadas.filter(f => f.violaciones !== null).length,
    sinMedir: ordenadas.filter(f => f.violaciones === null).map(f => ({
      ruta: f.ruta, ancho: f.ancho,
      motivo: f.error ? `error: ${f.error}` : f.redirigida ? `redirigida a ${f.urlFinal}` : 'quedó fuera del marco (sin dark-only)',
    })),
    omitidas: [...omitidas, ...conParametros],
    erroresAlEnumerar: errores,
    revisionManualF2a: revisionManualF2a(pantallas),
    // Hojas con `config-pagina` que el barrido abre, las que solo se abren con `:param` y las que no son
    // pantalla de ninguna ruta (hijos y diálogos: van a la revisión manual de F2a).
    coberturaCfg: coberturaCfg(pantallas, archivosConfigPagina(), { sinParametros: SIN_PARAMETROS }),
    porModulo: resumenPorModulo(ordenadas),
    pantallas: ordenadas,
  };
}

// Compara píxel a píxel en el mismo Chromium (sin dependencias). Cuenta como distinto un píxel
// con algún canal que cambie más de 16; la captura es «igual» si cambia menos del 0,1 % (con la hora fija, dos
// corridas del mismo build dan 0,000 %). El reporte trae el porcentaje de cada una.
const UMBRAL_CANAL = 16;
const UMBRAL_PIXELES = 0.001;

// Compara una captura con la de la base en una página ya abierta. Devuelve null si no hay base.
async function compararPar(pagina, archivo, carpetaBase = BASE) {
  if (!carpetaBase) return null;
  const base = path.join(path.resolve(carpetaBase), archivo);
  if (!fs.existsSync(base)) return null;
  const datos = [base, path.join(SALIDA, archivo)].map(a => `data:image/png;base64,${fs.readFileSync(a).toString('base64')}`);
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
  return { archivo, igual: proporcion <= UMBRAL_PIXELES, pixelesDistintos: `${(proporcion * 100).toFixed(3)} %` };
}

async function compararConBase(navegador, filas) {
  if (!BASE) return null;
  const contexto = await navegador.newContext();
  const pagina = await contexto.newPage();
  const resultado = [];
  for (const fila of filas.filter(f => f.tema === 'claro')) {
    resultado.push((await compararPar(pagina, fila.archivo)) || { archivo: fila.archivo, igual: false, motivo: 'sin línea base' });
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
    if (TODAS) {
      Object.assign(reporte, await barridoTodas(navegador, url));
    } else {
      if (SECCIONES.has('f0')) {
        const cierre = await criterio1CerrarSesion(navegador, url);
        reporte.chequeos.criterio1CerrarSesion = cierre.criterio1;
        reporte.chequeos.tarea25ResetEnSignOut = cierre.tarea25;
        reporte.chequeos.publicaConSesionOscura = await publicaConSesionOscura(navegador, url);
        reporte.chequeos.destelloAlRecargar = await destelloAlRecargar(navegador, url);
        reporte.chequeos.barraSistemaOscuroAppClara = await barraInferior(navegador, url, false, 'dark');
        reporte.chequeos.barraSistemaClaroAppOscura = await barraInferior(navegador, url, true, 'light');
        reporte.chequeos.chatSistemaOscuroAppClara = await chatSigueAlBoton(navegador, url, false, 'dark');
        reporte.chequeos.chatSistemaClaroAppOscura = await chatSigueAlBoton(navegador, url, true, 'light');
      }
      if (SECCIONES.has('pantallas')) {
        reporte.pantallas = await recorrerPantallas(navegador, url);
        reporte.chequeos.criterio3SinFondosBlancosEnOscuro = {
          ok: reporte.pantallas.filter(f => f.tema === 'oscuro').every(f => f.fondosBlancos === 0),
          porPantalla: reporte.pantallas.filter(f => f.tema === 'oscuro').map(f => `${f.pantalla}@${f.ancho}: ${f.fondosBlancos}`),
        };
        reporte.chequeos.criterio6SinScrollHorizontal = { ok: reporte.pantallas.every(f => !f.scrollHorizontal) };
        reporte.chequeos.comparacionClaro = await compararConBase(navegador, reporte.pantallas);
      }
      if (SECCIONES.has('f1')) Object.assign(reporte.chequeos, await chequeosF1(navegador, url));
      if (SECCIONES.has('terceros')) reporte.chequeos.tarea38Terceros = await terceros(navegador, url);
    }
  } finally {
    await navegador.close();
    servidor.close();
  }
  fs.writeFileSync(path.join(SALIDA, 'reporte.json'), JSON.stringify(reporte, null, 2));
  for (const [nombre, valor] of Object.entries(reporte.chequeos)) {
    if (!valor) continue;
    process.stdout.write(`${valor.ok === true ? 'OK   ' : valor.ok === false ? 'FALLA' : 'N/A  '} ${nombre}\n`);
  }
  if (TODAS) {
    process.stdout.write(`Pantallas del marco: ${reporte.enumeradas} enumeradas, ${reporte.medidas} medidas, ${reporte.sinMedir.length} sin medir, ${reporte.omitidas.length} omitidas.\n`);
    const cobertura = reporte.coberturaCfg;
    process.stdout.write(`Hojas con config-pagina: ${cobertura.archivos}; el barrido abre ${cobertura.alcanzadas.length}, ${cobertura.sinRuta.length} no son pantalla de ninguna ruta (revisión manual)${cobertura.soloConParametros.length ? `, ${cobertura.soloConParametros.length} solo con :param` : ''}.\n`);
    for (const fila of reporte.pantallas.filter(f => f.violaciones).slice(0, 20)) {
      process.stdout.write(`${String(fila.violaciones).padStart(5)}  ${fila.ruta} @${fila.ancho} (${fila.modulo || 'sin módulo'})${fila.f2aManual ? ` [F2a manual: ${fila.f2aManual}]` : ''}\n`);
    }
  }
  process.stdout.write(`Reporte: ${path.join(SALIDA, 'reporte.json')}\n`);
}

principal().catch(error => {
  process.stderr.write(`${error && error.stack || error}\n`);
  process.exit(1);
});
