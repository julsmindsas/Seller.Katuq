/**
 * D-551 6.1 (ticket 1347): Reportes en español de negocio. Recorre lo que la persona LEE en las pantallas de
 * Reportes (inicio, constructor, vista de un reporte y las piezas de gráficos) y falla si aparece un término
 * de la lista del spec `reportes-lenguaje-claro`: códigos de fuente (`orders`), tipos de gráfico (BAR, table,
 * pivot, kpi), funciones (sum, avg, count), granularidades (day, month), siglas (WO, FV, CxC) y opciones
 * técnicas (persistLines, bucket, aging). También exige íconos de Font Awesome 4.7 (D-546), sin los de 5/6.
 *
 * Qué se revisa:
 *  - los HTML de `src/app/components/dashboard/**`: texto entre etiquetas y los atributos que se ven
 *    (title, placeholder, aria-label, alt, label, data-label), sin lo que va dentro de `{{ }}` ni los
 *    atributos con corchetes o paréntesis (son código, no texto);
 *  - las plantillas en línea (`template:`) de `dashboard/**` y `shared/report-viz/**`;
 *  - los textos de los `.ts` (name, nombre, title, titulo, description, descripcion, frase, label, text,
 *    mensaje, placeholder) y los valores de los diccionarios de etiquetas.
 * Los valores que se guardan en los reportes ('sum', 'month', 'bar'…) NO se revisan: no se muestran.
 *
 * Correr: node --test tests/reportes/terminos-prohibidos.test.js
 */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const RAIZ = path.join(__dirname, '..', '..', 'src', 'app');
const CARPETAS = [path.join(RAIZ, 'components', 'dashboard'), path.join(RAIZ, 'shared', 'report-viz')];

// Palabras prohibidas (palabra completa, sin importar mayúsculas) y siglas (tal cual).
const PALABRAS = ['orders', 'bar', 'table', 'pivot', 'kpi', 'sum', 'avg', 'count', 'count_distinct', 'day', 'month', 'persistLines', 'bucket', 'aging'];
const SIGLAS = ['WO', 'FV', 'CxC'];
const NO_PALABRA = 'A-Za-z0-9_áéíóúñÁÉÍÓÚÑ';
const REGEX_PALABRAS = new RegExp(`(?<![${NO_PALABRA}-])(${PALABRAS.join('|')})(?![${NO_PALABRA}-])`, 'i');
const REGEX_SIGLAS = new RegExp(`(?<![${NO_PALABRA}])(${SIGLAS.join('|')})(?![${NO_PALABRA}])`);

function archivos(carpeta) {
  const salida = [];
  for (const nombre of fs.readdirSync(carpeta)) {
    const ruta = path.join(carpeta, nombre);
    if (fs.statSync(ruta).isDirectory()) salida.push(...archivos(ruta));
    else if (/\.(html|ts)$/.test(nombre) && !/\.spec\.ts$/.test(nombre)) salida.push(ruta);
  }
  return salida;
}

const limpiar = (t) => t.replace(/\{\{[\s\S]*?\}\}/g, ' ').replace(/&nbsp;|&[a-z]+;/g, ' ').replace(/\s+/g, ' ').trim();

/** Lo que la persona lee en un HTML: texto entre etiquetas y atributos visibles; sin código. */
function textosDeHtml(html) {
  const sinComentarios = html.replace(/<!--[\s\S]*?-->/g, ' ').replace(/<(script|style)[\s\S]*?<\/\1>/gi, ' ');
  const textos = [];
  for (const m of sinComentarios.matchAll(/\s(title|placeholder|aria-label|alt|label|data-label)="([^"]*)"/g)) textos.push(m[2]);
  for (const trozo of sinComentarios.replace(/<[^>]*>/g, '\u0000').split('\u0000')) textos.push(trozo);
  return textos.map(limpiar).filter(Boolean);
}

/** Los textos visibles de un .ts: claves de texto con comillas simples, dobles o de plantilla, y `template:`. */
function textosDeTs(codigo) {
  const sinComentarios = codigo.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/(^|[^:'"`])\/\/.*$/gm, '$1');
  const textos = [];
  const claves = '(?:name|nombre|title|titulo|description|descripcion|frase|label|text|mensaje|placeholder|subtitle|subtitulo|tooltip|ayuda)';
  for (const m of sinComentarios.matchAll(new RegExp(`\\b${claves}\\s*:\\s*(?:'((?:[^'\\\\]|\\\\.)*)'|"((?:[^"\\\\]|\\\\.)*)"|\`((?:[^\`\\\\]|\\\\.)*)\`)`, 'g'))) {
    textos.push(limpiar(m[1] ?? m[2] ?? m[3] ?? ''));
  }
  // Diccionarios de etiquetas (`Record<…, string>`): sus valores, no sus claves.
  for (const bloque of sinComentarios.matchAll(/Record<[^>]*>\s*=\s*\{([\s\S]*?)\n\};?/g)) {
    for (const m of bloque[1].matchAll(/:\s*'((?:[^'\\]|\\.)*)'/g)) textos.push(limpiar(m[1]));
  }
  for (const m of sinComentarios.matchAll(/template:\s*`([\s\S]*?)`/g)) textos.push(...textosDeHtml(m[1]));
  return textos.filter(Boolean);
}

function textosVisibles() {
  const salida = [];
  for (const carpeta of CARPETAS) {
    for (const ruta of archivos(carpeta)) {
      const contenido = fs.readFileSync(ruta, 'utf8');
      const textos = ruta.endsWith('.html') ? textosDeHtml(contenido) : textosDeTs(contenido);
      for (const texto of textos) salida.push({ archivo: path.relative(RAIZ, ruta), texto });
    }
  }
  return salida;
}

test('el recorrido ve texto: no pasa en falso por no leer nada', () => {
  const visibles = textosVisibles();
  assert.ok(visibles.length > 100, `solo ${visibles.length} textos revisados`);
  assert.ok(visibles.some((v) => v.archivo.endsWith('report-view.component.html') && /Editar/.test(v.texto)), 'no leyó la vista de un reporte');
  assert.ok(visibles.some((v) => v.archivo.endsWith('report-labels.ts') && v.texto === 'Tabla dinámica'), 'no leyó los diccionarios de etiquetas');
  assert.ok(visibles.some((v) => v.archivo.endsWith('viz-table.component.ts') && /Limpiar filtros/.test(v.texto)), 'no leyó las plantillas en línea');
});

test('el detector detecta: cada término prohibido de la lista se encuentra en un texto de prueba', () => {
  for (const termino of ['orders', 'BAR', 'table', 'pivot', 'kpi', 'sum', 'avg', 'count', 'day', 'month', 'persistLines', 'bucket', 'aging']) {
    assert.match(`Total (${termino})`, REGEX_PALABRAS, termino);
  }
  for (const sigla of ['WO', 'FV', 'CxC']) assert.match(`Documento ${sigla}`, REGEX_SIGLAS, sigla);
  // Palabras en español que contienen o se parecen no deben saltar.
  for (const bien of ['Sumar al total', 'Tablero de control', 'Barras', 'Contar pedidos', 'Cuenta por cobrar', 'Diario', 'Mensual', 'Información de', 'Datos para agrupar']) {
    assert.doesNotMatch(bien, REGEX_PALABRAS, bien);
    assert.doesNotMatch(bien, REGEX_SIGLAS, bien);
  }
});

/**
 * PENDIENTES DE 6.2 (no son una dispensa): estos nombres se muestran hoy, pero también son la clave con la
 * que las fórmulas guardadas encuentran la columna («[Saldo CxC (sum)]»). Cambiarlos antes de que 6.2 traiga
 * `claveFormula` y los alias rompería reportes guardados. La prueba los deja pasar SOLO si no crecen:
 *  - `calc-engine.ts`: el texto que arma la clave de la fórmula `Etiqueta (función)`;
 *  - `source-catalog.ts`: nombres de las fuentes contables de World Office (siglas WO, CxC, «aging»).
 * Al cerrar 6.2 esta lista se vacía y la prueba exige cero.
 */
const PENDIENTES_6_2 = {
  'components/dashboard/model/calc-engine.ts': 1,
  'components/dashboard/model/source-catalog.ts': 20,
};

test('ninguna pantalla de Reportes muestra un término prohibido', () => {
  const hallazgos = [];
  const pendientes = {};
  for (const { archivo, texto } of textosVisibles()) {
    const palabra = REGEX_PALABRAS.exec(texto) || REGEX_SIGLAS.exec(texto);
    if (!palabra) continue;
    if (PENDIENTES_6_2[archivo.split(path.sep).join('/')] !== undefined) pendientes[archivo.split(path.sep).join('/')] = (pendientes[archivo.split(path.sep).join('/')] || 0) + 1;
    else hallazgos.push(`${archivo}: «${palabra[1]}» en «${texto.slice(0, 90)}»`);
  }
  assert.deepEqual(hallazgos, [], `Términos prohibidos a la vista:\n  ${hallazgos.join('\n  ')}`);
  for (const [archivo, tope] of Object.entries(PENDIENTES_6_2)) {
    const hay = pendientes[archivo] || 0;
    assert.ok(hay <= tope, `${archivo}: ${hay} términos prohibidos, más que los ${tope} pendientes de 6.2`);
    assert.ok(hay === tope, `${archivo}: ahora hay ${hay} (eran ${tope}): baja el tope de PENDIENTES_6_2 a ${hay}${hay === 0 ? ' y quita el archivo de la lista' : ''}`);
  }
});

test('íconos de Font Awesome 4.7: ninguno de FA 5/6 en Reportes (D-546)', () => {
  const FA56 = /\bfa-(?:xmark|pen|file-excel|file-image|file-pdf|triangle-exclamation|circle-exclamation|circle-check|circle-xmark|trash-can|magnifying-glass|floppy-disk|rotate|gear|house|download|upload|chart-column|chart-pie|chart-line|xmarks?|wand-magic-sparkles|circle-info|eye-slash|angles-[a-z]+)(?![\w-])/;
  const hallazgos = [];
  for (const carpeta of CARPETAS) {
    for (const ruta of archivos(carpeta)) {
      fs.readFileSync(ruta, 'utf8').split('\n').forEach((linea, i) => {
        // `fa-file-excel-o` (4.7) no es `fa-file-excel` (5/6): la expresión pide que no siga `-o`.
        const m = FA56.exec(linea);
        if (m && !/-o(?![\w-])/.test(linea.slice(m.index, m.index + m[0].length + 3))) hallazgos.push(`${path.relative(RAIZ, ruta)}:${i + 1}: ${m[0]}`);
      });
    }
  }
  assert.deepEqual(hallazgos, [], `Íconos de 5/6:\n  ${hallazgos.join('\n  ')}`);
});
