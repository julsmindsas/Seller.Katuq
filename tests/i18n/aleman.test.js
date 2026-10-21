'use strict';

// D-540 (ticket Traducción cd CMNdBkVZXgYoOCvqfGZc, bloque IDI-B00f, tarea 1.14): src/assets/i18n/de.json,
// alemán estándar de Suiza (de-CH) en BORRADOR, sin revisión nativa. design.md D3, D4 y D7.
// - Todas las claves de es.json, en su mismo orden, incluidos primeng.*, comun.* y notificaciones.*.
// - de-CH: «ss» y nunca «ß»; comillas «»; tratamiento «Sie»; glosario de D7.
// - Mismas variables que el español; los nombres propios de D4 no se traducen.
// - i18n:check del repo sin errores para de (la falta de de.json ya es error, no aviso).
// Node puro: no compila Angular ni llama a la red.

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { test } = require('node:test');

const RAIZ = path.resolve(__dirname, '../..');
const DIR = path.join(RAIZ, 'src/assets/i18n');
const ARCHIVO_DE = path.join(DIR, 'de.json');

const leer = idioma => fs.readFileSync(path.join(DIR, `${idioma}.json`), 'utf8');
const es = JSON.parse(leer('es'));
const textoDe = leer('de');
const de = JSON.parse(textoDe);
const config = JSON.parse(fs.readFileSync(path.join(RAIZ, 'scripts/i18n-check.config.json'), 'utf8'));

/** Claves aplanadas con su valor; el objeto `primeng` es la única clave anidada (D3). */
function aplanar(obj, prefijo = '', fuera = new Map()) {
  for (const [k, v] of Object.entries(obj)) {
    const clave = prefijo ? `${prefijo}.${k}` : k;
    if (v && typeof v === 'object' && !Array.isArray(v)) aplanar(v, clave, fuera);
    else fuera.set(clave, v);
  }
  return fuera;
}

const planoEs = aplanar(es);
const planoDe = aplanar(de);
const comoTexto = v => (Array.isArray(v) ? v.join(' ') : String(v));
const variables = v => [...new Set([...comoTexto(v).matchAll(/\{\{\s*([\w.]+)\s*\}\}|\{([\w.]+)\}/g)].map(m => m[1] || m[2]))].sort();

let informe;
function revisarRepo() {
  if (!informe) informe = require(path.join(RAIZ, 'scripts/i18n-check.js')).ejecutar();
  return informe;
}

// ---------------------------------------------------------------- formato

test('de.json existe, es JSON válido, UTF-8 sin BOM, sin CRLF, sangría de 4 (D7) y salto de línea final', () => {
  assert.ok(fs.existsSync(ARCHIVO_DE));
  const bytes = fs.readFileSync(ARCHIVO_DE);
  assert.notDeepEqual([...bytes.subarray(0, 3)], [0xef, 0xbb, 0xbf], 'sin BOM');
  assert.ok(!textoDe.includes('\r'), 'sin CRLF');
  assert.ok(textoDe.startsWith('{\n    "'), 'sangría de 4 espacios');
  assert.ok(textoDe.endsWith('}\n'));
});

// ---------------------------------------------------------------- claves

test('tiene exactamente las claves de es.json, en el mismo orden, incluidos primeng, comun y notificaciones', () => {
  assert.deepEqual([...planoDe.keys()], [...planoEs.keys()]);
  assert.deepEqual(Object.keys(de), Object.keys(es), 'mismo orden de primer nivel');
  for (const prefijo of ['primeng.', 'comun.', 'notificaciones.']) {
    const claves = [...planoEs.keys()].filter(k => k.startsWith(prefijo));
    assert.ok(claves.length > 0, prefijo);
    for (const k of claves) assert.ok(planoDe.has(k), k);
  }
});

test('cada valor es texto no vacío; los arreglos de primeng tienen la misma longitud que en español', () => {
  for (const [clave, valorEs] of planoEs) {
    const valor = planoDe.get(clave);
    if (Array.isArray(valorEs)) {
      assert.ok(Array.isArray(valor), clave);
      assert.equal(valor.length, valorEs.length, clave);
      for (const x of valor) assert.ok(typeof x === 'string' && x.trim(), clave);
    } else {
      assert.equal(typeof valor, 'string', clave);
      assert.ok(valor.trim(), `${clave} vacío`);
    }
  }
  assert.ok(!('dateFormat' in de.primeng) && !('firstDayOfWeek' in de.primeng), 'primeng solo lleva textos (D5)');
});

test('mismas variables {{x}} y {x} que el español', () => {
  for (const [clave, valorEs] of planoEs) {
    assert.deepEqual(variables(planoDe.get(clave)), variables(valorEs), clave);
  }
  assert.equal(
    de['Mostrando {first} a {last} de {totalRecords} pedidos'],
    '{first} bis {last} von {totalRecords} Bestellungen',
  );
});

test('conserva los espacios de las piezas que la plantilla une alrededor del enlace', () => {
  // notificaciones.component.html: note_1 + enlace «Política de privacidad» + «.» + note_2.
  assert.ok(de['notificaciones.privacy_note_1'].endsWith(' '));
  assert.ok(de['notificaciones.privacy_note_2'].startsWith(' '));
  assert.ok(!de['notificaciones.privacy_note_2'].trim().startsWith('beschrieben'), 'la frase no queda partida por el «.» de la plantilla');
});

// ---------------------------------------------------------------- de-CH

test('de-CH: ninguna «ß» en el archivo y las palabras con «ss» que la llevarían', () => {
  assert.ok(!textoDe.includes('ß'));
  assert.equal(de['Cerrar'], 'Schliessen');
  assert.equal(de['comun.cerrar'], 'Schliessen');
  assert.equal(de.primeng.gt, 'Grösser als');
  assert.equal(de['Acercar'], 'Vergrössern');
});

test('de-CH: comillas «» y nunca comillas rectas ni alemanas „“', () => {
  for (const [clave, valor] of planoDe) {
    assert.doesNotMatch(comoTexto(valor), /["„“”]/, clave);
  }
  assert.ok([...planoDe.values()].some(v => comoTexto(v).includes('«')), 'usa «» donde hay comillas');
});

test('tratamiento «Sie» (D7): ningún «du», «dich», «dir» ni «dein»', () => {
  for (const [clave, valor] of planoDe) {
    assert.doesNotMatch(comoTexto(valor), /\b(du|dich|dir|dein\w*)\b/i, clave);
  }
  assert.equal(de['authentication.login.title'], 'Melden Sie sich bei Ihrem Konto an'); // IDI-B02: la clave literal antigua pasó a authentication.login.title
});

test('glosario de D7 en todo el diccionario', () => {
  const reglas = [
    [/\bpedidos?\b/i, /Bestell/, 'Pedido → Bestellung'],
    [/\bdesp?achos?\b|\bdespach/i, /Versand|versend/i, 'Despacho → Versand'],
    [/\bbodegas?\b/i, /lager/i, 'Bodega → Lager'],
    // IDI-B01a: «Firmenkunden» (Clientes corporativos) lleva «kunden» en minúscula dentro del compuesto.
    [/\bclientes?\b/i, /Kund|kund/, 'Cliente → Kunde'],
    [/\binventarios?\b/i, /lager/i, 'Inventario → Lagerbestand'],
    [/\bcotizaci[oó]n/i, /Offerte/, 'Cotización → Offerte'],
    [/facturaci[oó]n electr[oó]nica/i, /E-Rechnung/, 'Factura electrónica → E-Rechnung'],
  ];
  let revisadas = 0;
  for (const [clave, valorEs] of planoEs) {
    for (const [enEs, enDe, nombre] of reglas) {
      if (enEs.test(comoTexto(valorEs))) {
        revisadas += 1;
        assert.match(comoTexto(planoDe.get(clave)), enDe, `${nombre}: «${valorEs}» → «${planoDe.get(clave)}»`);
      }
    }
  }
  assert.ok(revisadas > 40, `revisó ${revisadas} valores`);
  // Términos que el glosario descarta («Im Angebot» sí vale: es «en oferta», no una cotización).
  for (const [clave, valor] of planoDe) {
    assert.doesNotMatch(comoTexto(valor), /\b(Klient\w*|Spedition|Warenlager)\b/, clave);
  }
  assert.equal(de['Inventario global'], 'Gesamter Lagerbestand');
  assert.equal(de['Bodegas Principales'], 'Hauptlager');
  assert.equal(de['Generar Facturación Electrónica'], 'E-Rechnung erstellen');
});

test('el IVA se llama MWST en de-CH y los nombres propios de D4 no se traducen', () => {
  for (const [clave, valorEs] of planoEs) {
    if (/\biva\b/i.test(comoTexto(valorEs))) assert.match(comoTexto(planoDe.get(clave)), /MWST/, clave);
  }
  for (const nombre of config.nombresPropios) {
    for (const [clave, valorEs] of planoEs) {
      if (comoTexto(valorEs).includes(nombre)) assert.ok(comoTexto(planoDe.get(clave)).includes(nombre), `${nombre} en ${clave}`);
    }
  }
});

test('comun.* en de: textos de botón de siempre', () => {
  const esperado = {
    'comun.guardar': 'Speichern', 'comun.cancelar': 'Abbrechen', 'comun.aceptar': 'Akzeptieren',
    'comun.cerrar': 'Schliessen', 'comun.buscar': 'Suchen', 'comun.eliminar': 'Löschen', 'comun.editar': 'Bearbeiten',
    'comun.si': 'Ja', 'comun.no': 'Nein', 'comun.cargando': 'Wird geladen...', 'comun.sinResultados': 'Keine Ergebnisse',
  };
  for (const [clave, valor] of Object.entries(esperado)) assert.equal(de[clave], valor, clave);
  // Igual que en es, en y pt: comun.* coincide con su clave literal antigua mientras exista.
  for (const [clave, antigua] of [['comun.guardar', 'Guardar'], ['comun.cancelar', 'Cancelar'], ['comun.cerrar', 'Cerrar'], ['comun.buscar', 'Buscar']]) {
    assert.equal(de[clave], de[antigua], `${clave} = «${antigua}»`);
  }
});

test('1.11: de nace con las 11 claves de ortografía corregida y sin las viejas', () => {
  const corregidas = [
    'Generar Facturación Electrónica', 'Dirección de facturación seleccionada:', 'Usar esta dirección',
    'Los datos de facturación electrónica son iguales a los del cliente', 'Cantidad mínima de venta:', 'Acción',
    'Ecommerce/Configuración catálogo/adiciones', 'Conoce tu código postal', 'Número de teléfono fijo',
    'Horarios de disponibilidad página web', 'Nombres/Razón social',
  ];
  const viejas = [
    'Generar Facturación Electronica', 'Dirección de facturacion seleccionada:', 'Usar Esta Direccion',
    'Los datos de facturacion electronica son iguales a los del cliente', 'Cantidad minima de venta:', 'Accion',
    'Ecommerce/Configuracion catalogo/adiciones', 'Conoce Tu Codigo Postal', 'Número de Telefono Fijo',
    'Horarios de disponibilidad Pagina Web', 'Nombres/Razon Social',
  ];
  for (const k of corregidas) assert.equal(typeof de[k], 'string', k);
  assert.deepEqual(viejas.filter(k => k in de), []);
});

test('primeng de-CH: días, meses y semana del calendario', () => {
  assert.deepEqual(de.primeng.dayNamesMin, ['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa']);
  assert.equal(de.primeng.monthNames[2], 'März');
  assert.equal(de.primeng.weekHeader, 'KW');
  assert.equal(de.primeng.today, 'Heute');
});

// ---------------------------------------------------------------- i18n:check

test('i18n:check del repo: de ya no es opcional y no tiene errores ni «igual al español» fuera de la lista', () => {
  assert.deepEqual(config.idiomasOpcionales, [], 'la falta de de.json es error (IDI-B00f)');
  const r = revisarRepo();
  assert.deepEqual(r.errores.filter(h => h.idioma === 'de'), []);
  assert.deepEqual(r.avisos.filter(h => h.idioma === 'de' && h.tipo !== 'claveSinUso'), []);
  assert.equal(r.avisos.filter(h => h.tipo === 'diccionarioAusente').length, 0);
});

test('igualesPermitidos.de: cada frase sigue en uso como valor igual al español', () => {
  const lista = config.igualesPermitidos.de;
  assert.ok(Array.isArray(lista));
  for (const frase of lista) {
    const usada = [...planoDe].some(([clave, valor]) => valor === frase && planoEs.get(clave) === frase);
    assert.ok(usada, `«${frase}» ya no se usa en de.json`);
  }
});
