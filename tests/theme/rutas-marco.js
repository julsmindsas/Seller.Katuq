'use strict';

// D-502 (ticket 1180), bloque TEMA-B02: enumera las pantallas del marco con menú (rutas con
// `data: { shell: true }`) desde la configuración real de rutas, sin build ni navegador.
//
// - `enumerarRutasMarco(config, opciones)` es pura: recorre `router.config` y pide los hijos de cada
//   `loadChildren` a `opciones.cargarHijos(ruta)`. Sirve para la prueba unitaria con una config simulada.
// - `cargadorPerezoso()` resuelve esos `loadChildren` leyendo los módulos del front con `cargarTs`
//   (cargar-ts.js): ejecuta solo los archivos que declaran rutas y captura `RouterModule.forChild(...)`.
//   Los demás imports son clases vacías que recuerdan su archivo, así una ruta sabe su componente y su SCSS.
// - `rutasDelMarco()` junta las dos cosas con la config real (`cargarRutasApp`) y filtra con el
//   `isShellUrl` del ThemeModeService, igual que el arranque provisional del tema.

const fs = require('node:fs');
const path = require('node:path');
const { RAIZ, cargarTs, cargarRutasApp } = require('./cargar-ts');

const SERVICIO_TEMA = 'src/app/shared/services/theme-mode.service.ts';
const VALOR_PARAMETRO = 'auditoria-tema';
const ARCHIVOS_RAIZ = ['src/app/shared/routes/routes.ts', 'src/app/app-routing.module.ts'];

function unir(prefijo, propio) {
  return [prefijo, propio].filter(Boolean).join('/').replace(/\/+/g, '/').replace(/^\/|\/$/g, '');
}

// `:id` pasa a un valor fijo para poder navegar (la API simulada responde vacío).
function urlDeMuestra(ruta, valor = VALOR_PARAMETRO) {
  return ruta.replace(/(^|\/):[^/]+/g, `$1${valor}`);
}

/**
 * Recorre la configuración de rutas y devuelve las pantallas dentro del marco con menú.
 * @param {object[]} config  `router.config` (rutas de primer nivel).
 * @param {object} opciones
 *   - cargarHijos(ruta): `{ rutas, archivo }` del módulo perezoso, o lanza si no se pudo leer.
 *   - esMarco(url): opcional; descarta las rutas que en la app real caen fuera del marco
 *     (por ejemplo, una ruta pública de primer nivel con el mismo path). Recibe la URL de muestra.
 *   - describir(ruta): opcional; datos extra de la pantalla (componente, scss…).
 * @returns {{ pantallas: object[], omitidas: object[], errores: object[] }}
 */
function enumerarRutasMarco(config, { cargarHijos, esMarco = null, describir = null } = {}) {
  const pantallas = [];
  const omitidas = [];
  const errores = [];
  const vistas = new Set();

  const agregar = (ruta, nodo, modulo, origen, contenedores) => {
    const url = `/${ruta}`;
    if (vistas.has(url)) return;
    vistas.add(url);
    const conParametros = /(^|\/):/.test(ruta);
    if (esMarco && !esMarco(urlDeMuestra(url))) {
      omitidas.push({ ruta: url, motivo: 'otra ruta de primer nivel la atiende fuera del marco' });
      return;
    }
    pantallas.push({
      ruta: url,
      conParametros,
      modulo: modulo ? modulo.nombre : null,
      archivoModulo: modulo ? modulo.archivo : null,
      premium: !!(nodo.data && nodo.data.requiresPremium),
      ...(describir ? describir(nodo, { origen, contenedores }) : {}),
    });
  };

  // `origen`: archivo que declaró estas rutas (para resolver un `loadComponent` relativo); null en la raíz.
  // `contenedores`: componentes con hijos por encima de la pantalla (se pintan alrededor de ella).
  const recorrer = (rutas, prefijo, modulo, enMarco, profundidad, origen = null, contenedores = []) => {
    if (!Array.isArray(rutas) || profundidad > 12) return;
    for (const nodo of rutas) {
      if (!nodo || typeof nodo !== 'object') continue;
      const marco = enMarco || !!(nodo.data && nodo.data.shell === true);
      const propio = typeof nodo.path === 'string' ? nodo.path : '';
      const ruta = unir(prefijo, propio);
      if (!marco) {
        // Fuera del marco solo se baja si un hijo puede abrirlo (data.shell más adentro).
        if (Array.isArray(nodo.children)) recorrer(nodo.children, ruta, modulo, false, profundidad + 1, origen, contenedores);
        continue;
      }
      if (propio === '**' || nodo.matcher) {
        omitidas.push({ ruta: `/${ruta}`, motivo: propio === '**' ? 'comodín' : 'matcher propio' });
        continue;
      }
      if (nodo.redirectTo !== undefined) continue; // no es una pantalla: lleva a otra
      // Un componente con hijos es un contenedor (como el marco): la pantalla la pone su hijo de path vacío.
      const contenedor = Array.isArray(nodo.children) || !!nodo.loadChildren;
      if ((nodo.component || nodo.loadComponent) && !contenedor) agregar(ruta, nodo, modulo, origen, contenedores);
      const debajo = contenedor && (nodo.component || nodo.loadComponent) ? [...contenedores, { nodo, origen }] : contenedores;
      if (Array.isArray(nodo.children)) recorrer(nodo.children, ruta, modulo, true, profundidad + 1, origen, debajo);
      if (nodo.loadChildren) {
        try {
          const hijos = cargarHijos(nodo);
          const siguiente = hijos && hijos.archivo ? { nombre: nombreModulo(hijos.archivo), archivo: hijos.archivo } : modulo;
          recorrer(hijos ? hijos.rutas : [], ruta, siguiente, true, profundidad + 1, hijos && hijos.archivo ? hijos.archivo : origen, debajo);
        } catch (error) {
          errores.push({ ruta: `/${ruta}`, error: String(error && error.message || error).slice(0, 200) });
        }
      }
    }
  };

  recorrer(config, '', null, false, 0);
  return { pantallas, omitidas, errores };
}

// `src/app/components/ventas/ventas.module.ts` → `components/ventas`.
function nombreModulo(archivo) {
  const rel = path.relative(path.join(RAIZ, 'src/app'), path.resolve(RAIZ, archivo)).split(path.sep).join('/');
  return path.posix.dirname(rel);
}

// ---------- lectura de los módulos perezosos ----------

// Un import relativo que no declara rutas: clases vacías que recuerdan su archivo y su nombre.
function moduloMarcador(archivo) {
  const cache = new Map();
  return new Proxy({}, {
    get(_, clave) {
      if (clave === '__esModule') return false;
      if (typeof clave !== 'string') return undefined;
      if (!cache.has(clave)) {
        const marcador = function Marcador() { return objetivo => objetivo; };
        marcador.__archivo = archivo;
        marcador.__nombre = clave;
        cache.set(clave, marcador);
      }
      return cache.get(clave);
    },
  });
}

function resolverArchivo(desde, especificador) {
  const base = path.resolve(path.dirname(desde), especificador);
  for (const candidato of [base, `${base}.ts`, path.join(base, 'index.ts')]) {
    if (fs.existsSync(candidato) && fs.statSync(candidato).isFile()) return candidato;
  }
  return null;
}

// Paquetes (salvo rxjs, que trae cargar-ts): un valor que acepta cualquier uso. Llamado con una clase
// devuelve la clase (decorador); llamado con otra cosa, se devuelve a sí mismo (`forRoot`, `NgModule({…})`).
const PAQUETE = new Proxy(function Paquete() {}, {
  get(_, clave) {
    if (clave === '__esModule' || clave === 'then') return undefined;
    if (clave === Symbol.toPrimitive) return () => '';
    return PAQUETE;
  },
  apply(_, __, args) {
    return args.length === 1 && typeof args[0] === 'function' ? args[0] : PAQUETE;
  },
  construct() { return {}; },
});
const PAQUETES_DE_CARGAR_TS = new Set(['rxjs', 'rxjs/operators']);

// Archivos que se ejecutan: los que declaran rutas. El resto queda como marcador.
function declaraRutas(texto) {
  return /RouterModule\s*\.\s*for(Child|Root)\s*\(|:\s*Routes\b|\bRoutes\s*=|loadChildren\s*:/.test(texto);
}

function rutaDelImport(funcion) {
  const texto = String(funcion);
  const m = texto.match(/require\(\s*(['"`])([^'"`]+)\1\s*\)/) || texto.match(/import\(\s*(['"`])([^'"`]+)\1\s*\)/);
  return m ? m[2] : null;
}

/**
 * Devuelve `cargarHijos(ruta)` para `enumerarRutasMarco`. Cada `loadChildren` se resuelve contra el
 * archivo que lo declaró; las rutas de `routes.ts` y `app-routing.module.ts` (cargadas por
 * `cargarRutasApp`) se resuelven contra esos dos archivos.
 */
function cargadorPerezoso({ archivosRaiz = ARCHIVOS_RAIZ } = {}) {
  const origen = new WeakMap(); // función loadChildren → archivo que la declaró
  const cache = new Map();      // archivo → { exports, capturas }
  const pila = [];

  const routerSimulado = new Proxy({
    RouterModule: {
      forChild: rutas => { if (pila.length) pila[pila.length - 1].capturas.push(rutas); return {}; },
      forRoot: rutas => { if (pila.length) pila[pila.length - 1].capturas.push(rutas); return {}; },
    },
  }, {
    get(objetivo, clave) {
      if (clave in objetivo) return objetivo[clave];
      if (clave === '__esModule') return false;
      return function Generico() { return o => o; };
    },
    getOwnPropertyDescriptor(objetivo, clave) {
      return Object.getOwnPropertyDescriptor(objetivo, clave)
        || { value: undefined, configurable: true, enumerable: false, writable: true };
    },
  });

  const marcarOrigen = (valor, archivo, vistos = new Set()) => {
    if (!valor || typeof valor !== 'object' || vistos.has(valor)) return;
    vistos.add(valor);
    if (Array.isArray(valor)) { valor.forEach(v => marcarOrigen(v, archivo, vistos)); return; }
    if (typeof valor.loadChildren === 'function' && !origen.has(valor.loadChildren)) origen.set(valor.loadChildren, archivo);
    if (Array.isArray(valor.children)) marcarOrigen(valor.children, archivo, vistos);
  };

  const cargarArchivo = archivo => {
    if (cache.has(archivo)) return cache.get(archivo);
    const registro = { exports: {}, capturas: [] };
    cache.set(archivo, registro); // corta ciclos
    const modulos = new Proxy({}, {
      getOwnPropertyDescriptor(_, especificador) {
        const valor = resolverImport(archivo, especificador, registro);
        return valor === undefined ? undefined : { value: valor, configurable: true, enumerable: true, writable: false };
      },
      get(_, especificador) {
        return resolverImport(archivo, especificador, registro);
      },
    });
    pila.push(registro);
    try {
      registro.exports = cargarTs(path.relative(RAIZ, archivo), { modulos });
    } finally {
      pila.pop();
    }
    for (const rutas of registro.capturas) marcarOrigen(rutas, archivo);
    for (const valor of Object.values(registro.exports || {})) marcarOrigen(valor, archivo);
    return registro;
  };

  function resolverImport(desde, especificador, registro) {
    if (typeof especificador !== 'string') return undefined;
    if (especificador === '@angular/router') return routerSimulado;
    if (!especificador.startsWith('.')) return PAQUETES_DE_CARGAR_TS.has(especificador) ? undefined : PAQUETE;
    const archivo = resolverArchivo(desde, especificador);
    if (!archivo) return moduloMarcador(path.resolve(path.dirname(desde), especificador));
    if (!declaraRutas(fs.readFileSync(archivo, 'utf8'))) return moduloMarcador(archivo);
    const hijo = cargarArchivo(archivo);
    // Las rutas que declaró el archivo importado también cuentan para quien lo importa.
    registro.capturas.push(...hijo.capturas);
    return hijo.exports;
  }

  return function cargarHijos(ruta) {
    const especificador = rutaDelImport(ruta.loadChildren);
    if (!especificador) throw new Error('loadChildren sin import() reconocible');
    const candidatos = origen.has(ruta.loadChildren)
      ? [origen.get(ruta.loadChildren)]
      : archivosRaiz.map(rel => path.resolve(RAIZ, rel));
    for (const desde of candidatos) {
      const archivo = resolverArchivo(desde, especificador);
      if (!archivo) continue;
      const registro = cargarArchivo(archivo);
      const rutas = [];
      const vistos = new Set();
      for (const lista of registro.capturas) {
        if (vistos.has(lista)) continue;
        vistos.add(lista);
        if (Array.isArray(lista)) rutas.push(...lista);
      }
      return { rutas, archivo: path.relative(RAIZ, archivo).split(path.sep).join('/') };
    }
    throw new Error(`no se encontró el módulo ${especificador}`);
  };
}

// ---------- componente, hojas de estilo y base cfg-* de cada pantalla ----------

// Las bases compartidas no cuentan como hoja propia de la pantalla: `_config-pagina.scss` define el
// mixin (y lo nombra en un comentario), y las de `src/assets` son globales.
const HOJAS_COMPARTIDAS = [path.join(RAIZ, 'src/app/shared/styles') + path.sep, path.join(RAIZ, 'src/assets') + path.sep];
const PATRON_CFG = /@include\s+config-pagina\b|\$cfg-/;
const PATRON_INCLUDE_CFG = /@include\s+config-pagina\b/;

function relativo(archivo) {
  return path.relative(RAIZ, archivo).split(path.sep).join('/');
}

function sinComentariosScss(texto) {
  return String(texto).replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:'"(])\/\/.*$/gm, '$1');
}

// `@use`, `@forward` e `@import` de una hoja, resueltos como Sass: `x`, `_x`, `x/_index`, con .scss o .css.
function importsScss(archivo) {
  const texto = sinComentariosScss(fs.readFileSync(archivo, 'utf8'));
  const resultado = [];
  for (const m of texto.matchAll(/@(?:use|forward|import)\s+([^;]+);/g)) {
    for (const parte of m[1].matchAll(/(['"])([^'"]+)\1/g)) {
      const especificador = parte[2];
      if (/^(https?:|url\(|~|sass:)/.test(especificador)) continue;
      const base = path.resolve(path.dirname(archivo), especificador);
      const dir = path.dirname(base);
      const nombre = path.basename(base).replace(/\.(scss|css)$/, '');
      const candidatos = [
        `${path.join(dir, nombre)}.scss`, path.join(dir, `_${nombre}.scss`), `${path.join(dir, nombre)}.css`,
        path.join(base, '_index.scss'), path.join(base, 'index.scss'),
      ];
      const encontrado = candidatos.find(c => fs.existsSync(c) && fs.statSync(c).isFile());
      if (encontrado) resultado.push(encontrado);
    }
  }
  return resultado;
}

/** Hojas propias de una pantalla: su SCSS y los parciales locales que importa (sin las bases compartidas). */
function hojasDe(hojasRaiz) {
  const vistas = new Set();
  const pendientes = [...hojasRaiz];
  while (pendientes.length) {
    const hoja = pendientes.pop();
    if (vistas.has(hoja) || HOJAS_COMPARTIDAS.some(c => hoja.startsWith(c))) continue;
    vistas.add(hoja);
    pendientes.push(...importsScss(hoja));
  }
  return [...vistas];
}

// `styleUrls` del componente; si no se encuentran, la convención `x.component.ts` → `x.component.scss`.
function hojasDelComponente(ts) {
  const hojas = [];
  if (fs.existsSync(ts)) {
    const texto = fs.readFileSync(ts, 'utf8');
    const lista = texto.match(/styleUrls\s*:\s*\[([^\]]*)\]/) || texto.match(/styleUrl\s*:\s*(['"][^'"]+['"])/);
    if (lista) {
      for (const m of lista[1].matchAll(/(['"])([^'"]+)\1/g)) {
        const hoja = path.resolve(path.dirname(ts), m[2]);
        if (fs.existsSync(hoja)) hojas.push(hoja);
      }
    }
  }
  const convencion = ts.replace(/\.ts$/, '.scss');
  if (!hojas.length && fs.existsSync(convencion)) hojas.push(convencion);
  return hojas;
}

// Archivo y nombre del componente de la ruta: `component` (marcador de cargadorPerezoso) o `loadComponent`
// (`import('…').then(m => m.X)`, resuelto contra el archivo que declaró la ruta o, en la raíz, contra
// routes.ts y app-routing.module.ts).
function componenteDe(nodo, origen) {
  if (nodo.component && nodo.component.__archivo) return { archivo: nodo.component.__archivo, nombre: nodo.component.__nombre };
  if (typeof nodo.loadComponent === 'function') {
    const especificador = rutaDelImport(nodo.loadComponent);
    const nombre = (String(nodo.loadComponent).match(/\.\s*then\s*\(\s*\(?\s*(\w+)\s*\)?\s*=>\s*\1\.(\w+)/) || [])[2] || null;
    if (especificador) {
      const desde = origen ? [path.resolve(RAIZ, origen)] : ARCHIVOS_RAIZ.map(rel => path.resolve(RAIZ, rel));
      for (const d of desde) {
        const archivo = resolverArchivo(d, especificador);
        if (archivo) return { archivo, nombre };
      }
    }
    return { archivo: null, nombre };
  }
  return { archivo: null, nombre: nodo.component ? (nodo.component.__nombre || null) : null };
}

/**
 * Componente de la pantalla, su SCSS, las hojas que alcanza (con los parciales importados) y si usa la
 * base `config-pagina` (F2a) o `$cfg-*`. `hojasCfg` son las que incluyen el mixin: sirven para la cobertura.
 */
function describirPantalla(nodo, { origen = null, contenedores = [] } = {}) {
  const { archivo, nombre } = componenteDe(nodo, origen);
  // Hojas de los contenedores que incluyen la base (como el shell de NPS): se pintan con la pantalla.
  const deContenedores = contenedores.flatMap(c => {
    const { archivo: a } = componenteDe(c.nodo, c.origen);
    if (!a) return [];
    return hojasDe(hojasDelComponente(a.endsWith('.ts') ? a : `${a}.ts`))
      .filter(h => PATRON_INCLUDE_CFG.test(sinComentariosScss(fs.readFileSync(h, 'utf8'))));
  });
  if (!archivo) return { componente: nombre, scss: null, hojas: deContenedores.map(relativo), hojasCfg: deContenedores.map(relativo), usaCfg: deContenedores.length > 0 };
  const ts = archivo.endsWith('.ts') ? archivo : `${archivo}.ts`;
  const propias = hojasDelComponente(ts);
  const hojas = [...new Set([...hojasDe(propias), ...deContenedores])];
  const textos = new Map(hojas.map(h => [h, sinComentariosScss(fs.readFileSync(h, 'utf8'))]));
  return {
    componente: nombre,
    scss: propias.length ? relativo(propias[0]) : null,
    hojas: hojas.map(relativo),
    hojasCfg: hojas.filter(h => PATRON_INCLUDE_CFG.test(textos.get(h))).map(relativo),
    usaCfg: hojas.some(h => PATRON_CFG.test(textos.get(h))),
  };
}

/** Archivos de `src/` que incluyen el mixin `config-pagina` (las «pantallas cfg-*» de F2a), sin la base. */
function archivosConfigPagina(raiz = RAIZ) {
  const resultado = [];
  const recorrer = dir => {
    for (const entrada of fs.readdirSync(dir, { withFileTypes: true })) {
      const ruta = path.join(dir, entrada.name);
      if (entrada.isDirectory()) { if (entrada.name !== 'node_modules') recorrer(ruta); continue; }
      if (!entrada.name.endsWith('.scss') || HOJAS_COMPARTIDAS.some(c => ruta.startsWith(c))) continue;
      if (PATRON_INCLUDE_CFG.test(sinComentariosScss(fs.readFileSync(ruta, 'utf8')))) resultado.push(relativo(ruta));
    }
  };
  recorrer(path.join(raiz, 'src'));
  return resultado.sort();
}

// Banderas de empresa que deciden si un guard deja entrar a una ruta (`*.guard.ts` que usan
// CompanyFeaturesService con `isEnabled('…')`). El barrido prende solo estas: así cada pantalla se mide
// en la variante que ven hoy los comercios (banderas apagadas, D-505) y los guards no la desvían.
function banderasDeGuards(raiz = RAIZ) {
  const banderas = new Set();
  const recorrer = dir => {
    for (const entrada of fs.readdirSync(dir, { withFileTypes: true })) {
      const ruta = path.join(dir, entrada.name);
      if (entrada.isDirectory()) { if (entrada.name !== 'node_modules') recorrer(ruta); continue; }
      if (!entrada.name.endsWith('.guard.ts')) continue;
      const texto = fs.readFileSync(ruta, 'utf8');
      if (!/CompanyFeaturesService/.test(texto)) continue;
      for (const m of texto.matchAll(/\.isEnabled\(\s*(['"])([A-Za-z0-9_]+)\1\s*\)/g)) banderas.add(m[2]);
    }
  };
  recorrer(path.join(raiz, 'src/app'));
  return [...banderas].sort();
}

/** Pantallas del marco en la configuración real del front. */
function rutasDelMarco() {
  const { rutas } = cargarRutasApp();
  const { isShellUrl } = cargarTs(SERVICIO_TEMA, { modulos: { '@angular/router': {} } });
  return enumerarRutasMarco(rutas, {
    cargarHijos: cargadorPerezoso(),
    esMarco: url => isShellUrl(url, rutas),
    describir: describirPantalla,
  });
}

module.exports = {
  VALOR_PARAMETRO, enumerarRutasMarco, urlDeMuestra, cargadorPerezoso, rutasDelMarco, nombreModulo, describirPantalla,
  archivosConfigPagina, banderasDeGuards,
};

if (require.main === module) {
  const { pantallas, omitidas, errores } = rutasDelMarco();
  process.stdout.write(`${JSON.stringify({ total: pantallas.length, pantallas, omitidas, errores }, null, 2)}\n`);
}
