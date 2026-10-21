#!/usr/bin/env node
/**
 * Verificación de los diccionarios y de los textos sueltos del panel (`npm run i18n:check`).
 * D-532, ticket «Traducción» (cd CMNdBkVZXgYoOCvqfGZc), bloque IDI-B00c, design.md D6.
 *
 * Node puro: no compila Angular ni usa dependencias. Lee `src/assets/i18n/*.json` y los
 * `.html`/`.ts` de `src/app` (sin `*.spec.ts`). La configuración está en
 * `scripts/i18n-check.config.json`.
 *
 * Errores (salida 1):
 *   jsonInvalido        un diccionario no es JSON válido
 *   claveDuplicada      la misma clave dos veces en un objeto (se lee el texto: JSON.parse la pisa)
 *   claveFaltante       una clave de `es` no está en `en`, `pt` o `de`
 *   variablesDistintas  las variables {{x}} de un valor no son las mismas que en `es`
 *   eszett              `de` (de-CH) usa «ß»
 *   claveInexistente    una clave literal usada en un módulo cerrado no existe en `es`
 *                       ('…' | translate, translate="…", instant('…'), get('…'), stream('…'))
 *   textoSuelto         texto sin traductor en un módulo cerrado (`modulosCerrados`): nodos de
 *                       texto del HTML (también de las plantillas en línea de los .ts), atributos
 *                       de `atributosTexto` y literales en Swal.fire, toastr.*, messageService.add
 *                       y los demás receptores de mensajes (`LLAMADAS`)
 * Avisos (no cambian la salida):
 *   claveInexistenteAbierta  lo mismo que claveInexistente fuera de los módulos cerrados: D3
 *                       mantiene las claves literales antiguas hasta que se migra su módulo
 *   igualAlEspanol      valor de en/pt/de igual al de `es`, salvo que sea solo nombres propios
 *                       (`nombresPropios`) y siglas de `igualesPermitidos.todos` (por palabra), o
 *                       que el valor completo esté en `igualesPermitidos.<idioma>` (IDI-B00d)
 *   claveSobrante       clave de en/pt/de que no está en `es`
 *   claveSinUso         clave de `es` que no aparece en el código (ni como literal ni por un
 *                       prefijo dinámico permitido)
 *   claveDinamica       clave armada en tiempo de ejecución con un prefijo fuera de `prefijosDinamicos`
 *   diccionarioAusente  falta el diccionario de un idioma de `idiomasOpcionales` (de, hasta IDI-B00f)
 *
 * Un texto suelto no cuenta si no tiene letras, si es solo nombres propios (`nombresPropios`) o
 * si está en `textosIgnorados`. `igualesPermitidos` NO sirve para ignorar textos sueltos: un
 * cognado como «Total» puede quedar igual en pt, pero en el HTML igual tiene que ir al traductor.
 *
 * Opciones:
 *   --modulo <carpeta|bloque>[,…]  imprime los textos sueltos de esas carpetas con archivo y línea,
 *                                  aunque el módulo no esté cerrado. Acepta rutas bajo src/app
 *                                  (`components/ventas`), nombres sueltos (`ventas`) o bloques de
 *                                  D10 (`IDI-B03`).
 *   --bloques   tabla de textos sueltos por bloque y carpeta de D10 (línea base).
 *   --todo      lista todos los hallazgos (por omisión, 15 por tipo).
 *   --json      informe completo en JSON.
 *   --raiz <dir> / --config <archivo>  para las pruebas.
 *
 * Un texto que no se debe traducir se marca con un comentario `i18n-ignorar` en su línea o en
 * la anterior. Salida: 0 sin errores, 1 con errores, 2 si no se pudo verificar (opción o carpeta
 * inexistente, configuración ilegible o cualquier fallo inesperado del script).
 */
'use strict';

const fs = require('node:fs');
const path = require('node:path');

const RAIZ_REPO = path.resolve(__dirname, '..');
const CONFIG_REPO = path.join(__dirname, 'i18n-check.config.json');

const LIMITE_POR_TIPO = 15;
// Atributos de texto por omisión: los de D4 más los de ayuda, accesibilidad y estados vacíos que
// usa el panel (ngbTooltip, alt, textos de PrimeNG). Se pueden cambiar con `atributosTexto`.
const ATRIBUTOS_TEXTO = [
  'placeholder', 'title', 'aria-label', 'ptooltip', 'label', 'header', 'innerhtml',
  'ngbtooltip', 'alt', 'currentpagereporttemplate', 'defaultlabel', 'selecteditemslabel',
  'emptymessage', 'emptyfiltermessage', 'chooselabel', 'uploadlabel', 'cancellabel',
  'acceptlabel', 'rejectlabel',
];
const ETIQUETAS_TEXTO_CRUDO = ['script', 'style'];
const ETIQUETAS_VACIAS = new Set(['area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input', 'link', 'meta', 'param', 'source', 'track', 'wbr']);
const CLAVES_TEXTO = new Set([
  'title', 'titleText', 'text', 'html', 'footer', 'confirmButtonText', 'cancelButtonText', 'denyButtonText',
  'inputPlaceholder', 'inputLabel', 'validationMessage', 'summary', 'detail',
]);
const ICONOS_SWAL = new Set(['success', 'error', 'warning', 'info', 'question']);
// Llamadas que muestran texto: receptor, métodos y posiciones de sus argumentos que son texto.
// Receptores con los nombres que usa el panel: SweetAlert importado como `Swal` o `swal`;
// ToastrService inyectado como `toastr`, `toastrService`, `toast` o `toster`; el
// NotificationService de shared (`success|error|warning|info(titulo, mensaje)`).
const LLAMADAS = [
  { receptores: ['Swal', 'swal'], metodos: ['fire'], posiciones: [0, 1] },
  { receptores: ['Swal', 'swal'], metodos: ['update'], posiciones: [] },
  { receptores: ['Swal', 'swal'], metodos: ['showValidationMessage'], posiciones: [0] },
  { receptores: ['toastr', 'toastrService', 'toast', 'toster', 'toastService'], metodos: ['success', 'error', 'warning', 'info', 'show'], posiciones: [0, 1] },
  { receptores: ['notificationService'], metodos: ['success', 'error', 'warning', 'info'], posiciones: [0, 1] },
  { receptores: ['messageService'], metodos: ['add'], posiciones: [] },
];

const ERRORES = ['jsonInvalido', 'claveDuplicada', 'claveFaltante', 'variablesDistintas', 'eszett', 'claveInexistente', 'textoSuelto'];
const AVISOS = ['claveInexistenteAbierta', 'igualAlEspanol', 'claveSobrante', 'claveSinUso', 'claveDinamica', 'diccionarioAusente'];

class ErrorDeUso extends Error {}

// ---------------------------------------------------------------- utilidades

const posix = p => p.split(path.sep).join('/');
const tieneLetra = s => /\p{L}/u.test(s);

function inicioDeLineas(texto) {
  const inicios = [0];
  for (let i = 0; i < texto.length; i++) if (texto.charCodeAt(i) === 10) inicios.push(i + 1);
  return inicios;
}

function lineaDe(inicios, offset) {
  let bajo = 0;
  let alto = inicios.length - 1;
  while (bajo < alto) {
    const medio = (bajo + alto + 1) >> 1;
    if (inicios[medio] <= offset) bajo = medio;
    else alto = medio - 1;
  }
  return bajo + 1;
}

function lineasIgnoradas(texto) {
  const lineas = new Set();
  texto.split('\n').forEach((l, i) => { if (l.includes('i18n-ignorar')) lineas.add(i + 1); });
  return lineas;
}

/** Texto visible de un literal: sin etiquetas HTML, entidades ni `${…}`. */
function textoVisible(s) {
  return s.replace(/\$\{[^}]*\}/g, ' ').replace(/<[^>]*>/g, ' ').replace(/&[#\w]+;/g, ' ');
}

const escaparRegex = s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/** Texto visible sin las frases dadas (enteras, sin distinguir mayúsculas). */
function quitarFrases(frases) {
  const lista = [...new Set(frases.map(f => String(f).trim()).filter(Boolean))].sort((a, b) => b.length - a.length);
  const re = lista.length
    ? new RegExp(`(?<![\\p{L}\\p{N}])(?:${lista.map(escaparRegex).join('|')})(?![\\p{L}\\p{N}])`, 'giu')
    : null;
  return texto => {
    const visible = textoVisible(texto);
    return re ? visible.replace(re, ' ') : visible;
  };
}

/** Verdadero si, quitando las frases dadas (enteras, sin distinguir mayúsculas), no quedan letras. */
function soloFrases(frases) {
  const quitar = quitarFrases(frases);
  return texto => !tieneLetra(quitar(texto));
}

/** Solo letras en minúscula y espacios simples: «Documento:» y «documento» son iguales. */
const soloLetras = t => String(t).replace(/[^\p{L}]+/gu, ' ').trim().toLowerCase();

/**
 * Dos listas separadas (hallazgo de la corrección de IDI-B00c):
 * - `iguales(texto, idioma)`: el valor traducido puede ser igual al español. `nombresPropios` e
 *   `igualesPermitidos.todos` (siglas, formatos) se quitan por palabra; `igualesPermitidos.<idioma>`
 *   (cognados) solo vale si es el valor completo, para que una palabra corta («de», «Tipo») no
 *   silencie frases enteras que siguen en español (corrección de IDI-B00d).
 * - `ignorado(texto)`: un texto suelto no necesita traductor (sin letras, solo nombres propios o
 *   en `textosIgnorados`). Los cognados de `igualesPermitidos` no lo silencian.
 */
function crearPermitidos(config) {
  const propios = config.nombresPropios || [];
  const ip = config.igualesPermitidos || [];
  const igualesTodos = Array.isArray(ip) ? ip : (ip.todos || []);
  const porIdioma = Array.isArray(ip) ? {} : ip;
  const sinSiglas = quitarFrases([...propios, ...igualesTodos]);
  const completosDe = {};
  const completosPara = idioma => {
    if (!completosDe[idioma]) completosDe[idioma] = new Set((porIdioma[idioma] || []).map(f => soloLetras(sinSiglas(f))));
    return completosDe[idioma];
  };
  // Se quitan nombres propios y siglas por palabra; lo que queda debe ser vacío o, entero, un
  // cognado de la lista del idioma («Formato JSON» queda «formato»; «Error 404», «error»).
  const iguales = (texto, idioma) => {
    const resto = soloLetras(sinSiglas(texto));
    return !resto || completosPara(idioma).has(resto);
  };
  const soloPropios = soloFrases(propios);
  const exactos = new Set((config.textosIgnorados || []).map(t => t.trim().toLowerCase()));
  return {
    iguales,
    ignorado: texto => exactos.has(String(texto).trim().toLowerCase()) || soloPropios(texto),
  };
}

// ---------------------------------------------------------------- diccionarios

/** Recorre un JSON ya validado: claves duplicadas y línea de cada clave (aplanada con puntos). */
function recorrerJson(texto) {
  const inicios = inicioDeLineas(texto);
  const duplicadas = [];
  const lineas = new Map();
  let i = 0;
  const espacios = () => { while (i < texto.length && /\s/.test(texto[i])) i++; };
  const cadena = () => {
    let j = i + 1;
    while (texto[j] !== '"') j += texto[j] === '\\' ? 2 : 1;
    const valor = JSON.parse(texto.slice(i, j + 1));
    i = j + 1;
    return valor;
  };
  const valor = ruta => {
    espacios();
    const c = texto[i];
    if (c === '{') {
      i++;
      const vistas = new Set();
      espacios();
      if (texto[i] === '}') { i++; return; }
      for (;;) {
        espacios();
        const inicio = i;
        const clave = cadena();
        const completa = ruta ? `${ruta}.${clave}` : clave;
        if (vistas.has(clave)) duplicadas.push({ clave: completa, linea: lineaDe(inicios, inicio) });
        else lineas.set(completa, lineaDe(inicios, inicio));
        vistas.add(clave);
        espacios();
        i++; // :
        valor(completa);
        espacios();
        if (texto[i++] === ',') continue;
        return;
      }
    }
    if (c === '[') {
      i++;
      espacios();
      if (texto[i] === ']') { i++; return; }
      for (;;) {
        valor(ruta);
        espacios();
        if (texto[i++] === ',') continue;
        return;
      }
    }
    if (c === '"') { cadena(); return; }
    while (i < texto.length && !/[\s,\]}]/.test(texto[i])) i++;
  };
  valor('');
  return { duplicadas, lineas };
}

function aplanar(objeto, prefijo, valores, objetos) {
  for (const [clave, valor] of Object.entries(objeto)) {
    const ruta = prefijo ? `${prefijo}.${clave}` : clave;
    if (valor && typeof valor === 'object' && !Array.isArray(valor)) {
      objetos.add(ruta);
      aplanar(valor, ruta, valores, objetos);
    } else {
      valores.set(ruta, valor);
    }
  }
}

function lineaDeError(mensaje, texto) {
  const porLinea = /line (\d+)/.exec(mensaje);
  if (porLinea) return Number(porLinea[1]);
  const porPosicion = /position (\d+)/.exec(mensaje);
  if (porPosicion) return lineaDe(inicioDeLineas(texto), Number(porPosicion[1]));
  return null;
}

function leerDiccionario(raiz, config, idioma, hallazgos) {
  const rel = posix(path.join(config.diccionarios, `${idioma}.json`));
  const archivo = path.join(raiz, rel);
  if (!fs.existsSync(archivo)) {
    if ((config.idiomasOpcionales || []).includes(idioma)) {
      hallazgos.push({ tipo: 'diccionarioAusente', idioma, archivo: rel, mensaje: `todavía no existe ${rel}` });
    } else {
      hallazgos.push({ tipo: 'jsonInvalido', idioma, archivo: rel, linea: null, mensaje: `no existe ${rel}` });
    }
    return null;
  }
  const texto = fs.readFileSync(archivo, 'utf8').replace(/^﻿/, '');
  let datos;
  try {
    datos = JSON.parse(texto);
  } catch (e) {
    hallazgos.push({ tipo: 'jsonInvalido', idioma, archivo: rel, linea: lineaDeError(e.message, texto), mensaje: e.message });
    return null;
  }
  const { duplicadas, lineas } = recorrerJson(texto);
  for (const d of duplicadas) {
    hallazgos.push({ tipo: 'claveDuplicada', idioma, archivo: rel, linea: d.linea, clave: d.clave, mensaje: `«${d.clave}» repetida` });
  }
  const valores = new Map();
  const objetos = new Set();
  aplanar(datos, '', valores, objetos);
  return { idioma, archivo: rel, valores, objetos, lineas };
}

function variables(valor) {
  const texto = Array.isArray(valor) ? valor.join('\n') : String(valor ?? '');
  return [...new Set([...texto.matchAll(/\{\{\s*([\w.]+)\s*\}\}/g)].map(m => m[1]))].sort();
}

function revisarDiccionarios(dics, config, permitidos, hallazgos) {
  const ref = dics[config.referencia];
  if (!ref) return;
  for (const [idioma, dic] of Object.entries(dics)) {
    if (!dic || idioma === config.referencia) continue;
    const base = { idioma, archivo: dic.archivo };
    for (const [clave, valorEs] of ref.valores) {
      if (!dic.valores.has(clave)) {
        hallazgos.push({ tipo: 'claveFaltante', ...base, clave, mensaje: `«${clave}» no está en ${idioma}` });
        continue;
      }
      const valor = dic.valores.get(clave);
      const linea = dic.lineas.get(clave) ?? null;
      const varsEs = variables(valorEs);
      const varsOtro = variables(valor);
      if (varsEs.join('|') !== varsOtro.join('|')) {
        hallazgos.push({
          tipo: 'variablesDistintas', ...base, linea, clave,
          mensaje: `es usa {{${varsEs.join('}}, {{') || '—'}}} y ${idioma} {{${varsOtro.join('}}, {{') || '—'}}}`.replace(/\{\{—\}\}/g, 'ninguna'),
        });
      }
      const normal = v => (Array.isArray(v) ? JSON.stringify(v) : String(v ?? '').trim()).toLowerCase();
      const plano = Array.isArray(valor) ? valor.join(' ') : String(valor ?? '');
      if (normal(valor) === normal(valorEs) && plano.trim() && !permitidos.iguales(plano, idioma)) {
        hallazgos.push({ tipo: 'igualAlEspanol', ...base, linea, clave, mensaje: `«${plano}» igual que en español` });
      }
    }
    for (const clave of dic.valores.keys()) {
      if (!ref.valores.has(clave)) {
        hallazgos.push({ tipo: 'claveSobrante', ...base, linea: dic.lineas.get(clave) ?? null, clave, mensaje: `«${clave}» no está en ${config.referencia}` });
      }
    }
    if (idioma === 'de') {
      for (const [clave, valor] of dic.valores) {
        const plano = Array.isArray(valor) ? valor.join(' ') : String(valor ?? '');
        if (plano.includes('ß')) {
          hallazgos.push({ tipo: 'eszett', ...base, linea: dic.lineas.get(clave) ?? null, clave, mensaje: `«${plano}»: en de-CH se escribe «ss»` });
        }
      }
    }
  }
}

// ---------------------------------------------------------------- léxico de TypeScript

const PREVIO_DE_REGEX = new Set(['(', ',', '=', ':', '[', '!', '&', '|', '?', '{', '}', ';', '+', '-', '*', '%', '<', '>', '~', '^']);
const PALABRAS_PREVIAS_REGEX = new Set(['return', 'typeof', 'case', 'in', 'of', 'delete', 'void', 'throw', 'new']);

function unescape(s) {
  return s.replace(/\\(u\{[0-9a-fA-F]+\}|u[0-9a-fA-F]{4}|x[0-9a-fA-F]{2}|[\s\S])/g, (_, c) => {
    if (c[0] === 'u' && c.length > 1) return String.fromCodePoint(parseInt(c.replace(/[u{}]/g, ''), 16));
    if (c[0] === 'x' && c.length === 3) return String.fromCharCode(parseInt(c.slice(1), 16));
    return { n: '\n', t: '\t', r: '\r', '\n': '' }[c] ?? c;
  });
}

/**
 * Tokens de un .ts: cadenas, plantillas (con su texto estático), identificadores y puntuación.
 * Salta comentarios y expresiones regulares. También devuelve el texto sin comentarios
 * (mismas posiciones) para buscar claves sin falsos positivos.
 */
function lexTs(t) {
  const tokens = [];
  const sinComentarios = t.split('');
  let i = 0;
  const n = t.length;
  const blanquear = (a, b) => { for (let k = a; k < b; k++) if (sinComentarios[k] !== '\n') sinComentarios[k] = ' '; };

  const leerCadena = (j, comilla) => {
    let k = j + 1;
    while (k < n && t[k] !== comilla && t[k] !== '\n') k += t[k] === '\\' ? 2 : 1;
    return k + 1;
  };
  // Devuelve el fin de una plantilla y sus partes estáticas.
  const leerPlantilla = j => {
    let k = j + 1;
    let estatico = '';
    while (k < n && t[k] !== '`') {
      if (t[k] === '\\') { estatico += t.slice(k, k + 2); k += 2; continue; }
      if (t[k] === '$' && t[k + 1] === '{') { k = saltarExpresion(k + 2); estatico += ' '; continue; }
      estatico += t[k++];
    }
    return { fin: k + 1, estatico };
  };
  // Salta hasta la llave que cierra un `${`, respetando cadenas y plantillas anidadas.
  const saltarExpresion = j => {
    let k = j;
    let profundidad = 1;
    while (k < n && profundidad > 0) {
      const c = t[k];
      if (c === '\'' || c === '"') { k = leerCadena(k, c); continue; }
      if (c === '`') { k = leerPlantilla(k).fin; continue; }
      if (c === '{') profundidad++;
      else if (c === '}') profundidad--;
      k++;
    }
    return k;
  };

  while (i < n) {
    const c = t[i];
    if (c === ' ' || c === '\t' || c === '\n' || c === '\r') { i++; continue; }
    if (c === '/' && t[i + 1] === '/') {
      const fin = t.indexOf('\n', i);
      const f = fin < 0 ? n : fin;
      blanquear(i, f);
      i = f;
      continue;
    }
    if (c === '/' && t[i + 1] === '*') {
      const fin = t.indexOf('*/', i + 2);
      const f = fin < 0 ? n : fin + 2;
      blanquear(i, f);
      i = f;
      continue;
    }
    if (c === '\'' || c === '"') {
      const fin = leerCadena(i, c);
      tokens.push({ tipo: 'cadena', valor: unescape(t.slice(i + 1, fin - 1)), crudo: t.slice(i + 1, fin - 1), inicio: i });
      i = fin;
      continue;
    }
    if (c === '`') {
      const { fin, estatico } = leerPlantilla(i);
      const crudo = t.slice(i + 1, fin - 1);
      tokens.push({ tipo: 'plantilla', valor: crudo, estatico, dinamica: crudo.includes('${'), inicio: i });
      i = fin;
      continue;
    }
    if (/[A-Za-z_$]/.test(c)) {
      let k = i + 1;
      while (k < n && /[\w$]/.test(t[k])) k++;
      tokens.push({ tipo: 'ident', valor: t.slice(i, k), inicio: i });
      i = k;
      continue;
    }
    if (/[0-9]/.test(c)) {
      let k = i + 1;
      while (k < n && /[\w.]/.test(t[k])) k++;
      tokens.push({ tipo: 'num', valor: t.slice(i, k), inicio: i });
      i = k;
      continue;
    }
    if (c === '/') {
      const previo = tokens[tokens.length - 1];
      const esRegex = !previo
        || (previo.tipo === 'punt' && PREVIO_DE_REGEX.has(previo.valor))
        || (previo.tipo === 'ident' && PALABRAS_PREVIAS_REGEX.has(previo.valor));
      if (esRegex) {
        let k = i + 1;
        let enClase = false;
        while (k < n && t[k] !== '\n') {
          if (t[k] === '\\') { k += 2; continue; }
          if (t[k] === '[') enClase = true;
          else if (t[k] === ']') enClase = false;
          else if (t[k] === '/' && !enClase) break;
          k++;
        }
        k++;
        while (k < n && /[a-z]/.test(t[k])) k++;
        tokens.push({ tipo: 'regex', valor: t.slice(i, k), inicio: i });
        i = k;
        continue;
      }
    }
    tokens.push({ tipo: 'punt', valor: c, inicio: i });
    i++;
  }
  return { tokens, sinComentarios: sinComentarios.join('') };
}

/** Literales de texto en Swal.fire, toastr.* y messageService.add de un .ts. */
function sueltosEnTs(tokens) {
  const hallazgos = [];
  for (let i = 0; i + 3 < tokens.length; i++) {
    const [r, punto, m, abre] = [tokens[i], tokens[i + 1], tokens[i + 2], tokens[i + 3]];
    if (r.tipo !== 'ident' || punto.valor !== '.' || m.tipo !== 'ident' || abre.valor !== '(') continue;
    const llamada = LLAMADAS.find(l => l.receptores.includes(r.valor) && l.metodos.includes(m.valor));
    if (!llamada) continue;

    const pila = [{ tipo: '(', raiz: true, posicion: 0 }];
    for (let j = i + 4; j < tokens.length && pila.length; j++) {
      const tk = tokens[j];
      const v = tk.tipo === 'punt' ? tk.valor : null;
      if (v === '(') {
        const previo = tokens[j - 1];
        const callee = previo && previo.tipo === 'ident' ? previo.valor : null;
        pila.push({ tipo: '(', callee, grupo: !callee });
      } else if (v === ')' || v === '}' || v === ']') {
        pila.pop();
      } else if (v === '{') {
        pila.push({ tipo: '{', clave: null });
      } else if (v === '[') {
        pila.push({ tipo: '[' });
      } else if (v === ',') {
        const tope = pila[pila.length - 1];
        if (tope.tipo === '{') tope.clave = null;
        if (tope.raiz) tope.posicion++;
      } else if (v === ':') {
        const tope = pila[pila.length - 1];
        const prev = tokens[j - 1];
        const antes = tokens[j - 2];
        if (tope.tipo === '{' && (prev.tipo === 'ident' || prev.tipo === 'cadena') && antes && (antes.valor === '{' || antes.valor === ',')) {
          tope.clave = prev.valor;
        }
      } else if (tk.tipo === 'cadena' || tk.tipo === 'plantilla') {
        // `tipo === 'credit' ? …`: un literal que se compara no se muestra.
        const val = d => (tokens[j + d] ? tokens[j + d].valor : '');
        if ((val(-1) === '=' && ['=', '!'].includes(val(-2))) || (['=', '!'].includes(val(1)) && val(2) === '=')) continue;
        const efectiva = pila.filter(f => !f.grupo);
        const tope = efectiva[efectiva.length - 1];
        let esTexto = false;
        if (tope.raiz) {
          esTexto = llamada.posiciones.includes(tope.posicion) && !(tk.tipo === 'cadena' && ICONOS_SWAL.has(tk.valor) && tope.posicion > 0 && r.valor === 'Swal');
        } else if (tope.tipo === '{' && efectiva.length === 2 && efectiva[0].raiz) {
          esTexto = CLAVES_TEXTO.has(tope.clave);
        }
        if (esTexto) {
          const visible = tk.tipo === 'plantilla' ? tk.estatico : tk.valor;
          hallazgos.push({ offset: tk.inicio + 1, texto: tk.valor, visible, origen: 'mensaje' });
        }
      }
    }
  }
  return hallazgos;
}

/** Plantillas en línea de un componente: `template: \`…\`` o `template: '…'`. */
function plantillasEnLinea(tokens) {
  const res = [];
  for (let i = 0; i + 2 < tokens.length; i++) {
    const [a, b, c] = [tokens[i], tokens[i + 1], tokens[i + 2]];
    if (a.tipo !== 'ident' || a.valor !== 'template' || b.valor !== ':') continue;
    if (c.tipo === 'plantilla') res.push({ texto: c.valor, base: c.inicio + 1 });
    else if (c.tipo === 'cadena') res.push({ texto: c.crudo, base: c.inicio + 1 });
  }
  return res;
}

// ---------------------------------------------------------------- claves usadas en el código

const RE_LITERAL = /(['"])((?:\\.|(?!\1)[^\\\n])*)\1/g;
const RE_LITERAL_INICIO = /^(['"])((?:\\.|(?!\1)[^\\\n])*)\1/;

function literalAntes(texto, fin) {
  // `fin` apunta a la comilla de cierre; busca la de apertura.
  const comilla = texto[fin];
  for (let k = fin - 1; k >= 0 && texto[k] !== '\n'; k--) {
    if (texto[k] === comilla && texto[k - 1] !== '\\') return { inicio: k, valor: unescape(texto.slice(k + 1, fin)) };
  }
  return null;
}

/** Claves de `| translate` (también dentro de un ternario entre paréntesis) y de la directiva. */
function clavesDePipe(texto) {
  const usos = [];
  const dinamicas = [];
  for (const m of texto.matchAll(/\|\s*translate\b/g)) {
    let k = m.index - 1;
    while (k >= 0 && /\s/.test(texto[k])) k--;
    const c = texto[k];
    if (c === '\'' || c === '"') {
      const lit = literalAntes(texto, k);
      if (!lit) continue;
      // `'prefijo.' + x | translate` no llega aquí; `x + 'sufijo' | translate` es dinámica.
      let p = lit.inicio - 1;
      while (p >= 0 && /\s/.test(texto[p])) p--;
      if (texto[p] === '+') dinamicas.push({ offset: lit.inicio, prefijo: '' });
      else {
        usos.push({ clave: lit.valor, offset: lit.inicio + 1 });
        // `cond ? 'A' : 'B' | translate` es `(cond ? 'A' : 'B') | translate`: 'A' también es clave.
        if (texto[p] === ':') {
          let q = p - 1;
          while (q >= 0 && /\s/.test(texto[q])) q--;
          const otro = texto[q] === '\'' || texto[q] === '"' ? literalAntes(texto, q) : null;
          if (otro) {
            let r = otro.inicio - 1;
            while (r >= 0 && /\s/.test(texto[r])) r--;
            if (texto[r] === '?') usos.push({ clave: otro.valor, offset: otro.inicio + 1 });
          }
        }
      }
    } else if (c === ')') {
      let profundidad = 0;
      let a = k;
      for (; a >= 0; a--) {
        if (texto[a] === ')') profundidad++;
        else if (texto[a] === '(') { profundidad--; if (profundidad === 0) break; }
      }
      if (a < 0) continue;
      const grupo = texto.slice(a, k + 1);
      for (const l of grupo.matchAll(RE_LITERAL)) {
        let p = l.index - 1;
        while (p >= 0 && /\s/.test(grupo[p])) p--;
        let s = l.index + l[0].length;
        while (s < grupo.length && /\s/.test(grupo[s])) s++;
        if (grupo[s] === '+') dinamicas.push({ offset: a + l.index, prefijo: unescape(l[2]) });
        else if (['?', ':', '('].includes(grupo[p])) usos.push({ clave: unescape(l[2]), offset: a + l.index + 1 });
      }
    }
  }
  for (const m of texto.matchAll(/(['"])((?:\\.|(?!\1)[^\\\n])*)\1\s*\+\s*[\w$.?!\[\]]+\s*\|\s*translate\b/g)) {
    dinamicas.push({ offset: m.index, prefijo: unescape(m[2]) });
  }
  for (const m of texto.matchAll(/(?<![\w.\[-])translate=(["'])([^"']*)\1/g)) {
    if (m[2].trim()) usos.push({ clave: m[2], offset: m.index + 'translate='.length + 1 });
  }
  for (const m of texto.matchAll(/\[translate\]=(["'])\s*(['"])([^'"]*)\2\s*\1/g)) {
    usos.push({ clave: m[3], offset: m.index });
  }
  return { usos, dinamicas };
}

/** Claves de `translate.instant|get|stream(…)` en un .ts (receptor cuyo nombre contiene «translat»). */
function clavesDeTs(sinComentarios) {
  const usos = [];
  const dinamicas = [];
  const re = /\b([A-Za-z_$][\w$]*)\s*\.\s*(instant|get|stream)\s*\(\s*/g;
  for (const m of sinComentarios.matchAll(re)) {
    if (!/translat/i.test(m[1])) continue;
    const k = m.index + m[0].length;
    const c = sinComentarios[k];
    if (c === '\'' || c === '"') {
      const lit = new RegExp(`${c}((?:\\\\.|[^\\\\${c}\\n])*)${c}`, 'y');
      lit.lastIndex = k;
      const l = lit.exec(sinComentarios);
      if (!l) continue;
      let s = k + l[0].length;
      while (/\s/.test(sinComentarios[s] || '')) s++;
      if (sinComentarios[s] === '+') dinamicas.push({ offset: k, prefijo: unescape(l[1]) });
      else usos.push({ clave: unescape(l[1]), offset: k + 1 });
    } else if (c === '`') {
      const fin = sinComentarios.indexOf('`', k + 1);
      const contenido = sinComentarios.slice(k + 1, fin);
      if (contenido.includes('${')) dinamicas.push({ offset: k, prefijo: contenido.slice(0, contenido.indexOf('${')) });
      else usos.push({ clave: contenido, offset: k + 1 });
    } else if (c === '[') {
      const fin = sinComentarios.indexOf(']', k);
      const arreglo = sinComentarios.slice(k, fin);
      for (const l of arreglo.matchAll(RE_LITERAL)) usos.push({ clave: unescape(l[2]), offset: k + l.index + 1 });
    }
  }
  return { usos, dinamicas };
}

// ---------------------------------------------------------------- HTML

/** Primer segmento de una expresión de Angular antes de un pipe (`|` que no es `||`). */
function primerSegmento(expr) {
  let profundidad = 0;
  for (let k = 0; k < expr.length; k++) {
    const c = expr[k];
    if (c === '\'' || c === '"') {
      const fin = expr.indexOf(c, k + 1);
      k = fin < 0 ? expr.length : fin;
      continue;
    }
    if (c === '(' || c === '[' || c === '{') profundidad++;
    else if (c === ')' || c === ']' || c === '}') profundidad--;
    else if (c === '|' && profundidad === 0 && expr[k + 1] !== '|' && expr[k - 1] !== '|') return expr.slice(0, k);
  }
  return expr;
}

const RE_ARGUMENTO_PIPE = /(?:^|[^|])\|\s*[A-Za-z_$][\w$]*\s*(?::\s*(?:'[^']*'|"[^"]*"|[^:|?()'"]+?)\s*)*$/;

/** Literales con texto en posición de valor (inicio, ternario, `||`, `??` o concatenación). */
function literalesMostrados(expr) {
  const seg = primerSegmento(expr);
  const res = [];
  for (const l of seg.matchAll(RE_LITERAL)) {
    let p = l.index - 1;
    while (p >= 0 && /\s/.test(seg[p])) p--;
    let s = l.index + l[0].length;
    while (s < seg.length && /\s/.test(seg[s])) s++;
    const antes = p < 0 ? '' : seg[p];
    const despues = seg[s] || '';
    // `x | date:'short'`: argumento de un pipe, no se muestra.
    if (antes === ':' && RE_ARGUMENTO_PIPE.test(seg.slice(0, p))) continue;
    if ((despues === '=' || despues === '!') && seg[s + 1] === '=') continue;
    if (antes === '' || antes === '?' || antes === ':' || antes === '|' || antes === '+' || despues === '+') {
      res.push({ valor: unescape(l[2]), offset: l.index + 1 });
    }
  }
  return res;
}

const SIGUE_TRADUCTOR = /^[\s)]*\|\s*translate\b/;

/**
 * Literales mostrados que no pasan por el traductor. Una expresión cuyo pipe final es
 * `translate` está traducida entera; si no, cada literal se salva si lo sigue `| translate`
 * o si su paréntesis más interno lo sigue (`(a ? 'x' : 'y') | translate`).
 */
function literalesSinTraductor(expr) {
  const seg = primerSegmento(expr);
  const resto = expr.slice(seg.length);
  if (/^\|\s*translate\b/.test(resto) || /\binstant\s*\(/.test(seg)) return [];
  return literalesMostrados(expr).filter(l => {
    const fin = l.offset + seg.slice(l.offset - 1).match(RE_LITERAL_INICIO)[0].length - 1;
    if (SIGUE_TRADUCTOR.test(seg.slice(fin))) return false;
    let profundidad = 0;
    for (let k = fin; k < seg.length; k++) {
      const c = seg[k];
      if (c === '\'' || c === '"') {
        const cierre = seg.indexOf(c, k + 1);
        k = cierre < 0 ? seg.length : cierre;
        continue;
      }
      if (c === '(') profundidad++;
      else if (c === ')') {
        if (profundidad === 0) return !/^\s*\|\s*translate\b/.test(seg.slice(k + 1));
        profundidad--;
      }
    }
    return true;
  });
}

/**
 * Textos sueltos de una plantilla: nodos de texto sin pipe, literales mostrados en
 * interpolaciones y atributos de D4 (estáticos o enlazados) sin traductor.
 */
function escanearHtml(t, atributosTexto = ATRIBUTOS_TEXTO) {
  const hallazgos = [];
  const clavesDirectiva = [];
  const pila = [];
  const n = t.length;
  let i = 0;

  const analizarTextoConInterpolaciones = (texto, base, origenTexto, origenInterp) => {
    const estatico = texto.replace(/\{\{[\s\S]*?\}\}/g, m => ' '.repeat(m.length));
    const visible = textoVisible(estatico).replace(/\s+/g, ' ').trim();
    if (tieneLetra(visible)) {
      const primero = estatico.search(/\S/);
      hallazgos.push({ offset: base + primero, texto: visible, visible, origen: origenTexto });
    }
    for (const m of texto.matchAll(/\{\{([\s\S]*?)\}\}/g)) {
      for (const l of literalesSinTraductor(m[1])) {
        hallazgos.push({ offset: base + m.index + 2 + l.offset, texto: l.valor, visible: l.valor, origen: origenInterp });
      }
    }
  };

  while (i < n) {
    if (t.startsWith('<!--', i)) {
      const fin = t.indexOf('-->', i + 4);
      i = fin < 0 ? n : fin + 3;
      continue;
    }
    if (t[i] === '<' && t[i + 1] === '/' && /[A-Za-z]/.test(t[i + 2] || '')) {
      let k = i + 2;
      while (k < n && /[\w:-]/.test(t[k])) k++;
      const nombre = t.slice(i + 2, k).toLowerCase();
      const fin = t.indexOf('>', k);
      i = fin < 0 ? n : fin + 1;
      const pos = pila.map(e => e.nombre).lastIndexOf(nombre);
      if (pos >= 0) pila.length = pos;
      continue;
    }
    if (t[i] === '<' && /[A-Za-z]/.test(t[i + 1] || '')) {
      let k = i + 1;
      while (k < n && /[\w:-]/.test(t[k])) k++;
      const nombre = t.slice(i + 1, k).toLowerCase();
      const atributos = [];
      let autocierre = false;
      while (k < n) {
        while (k < n && /\s/.test(t[k])) k++;
        if (t[k] === '>') { k++; break; }
        if (t[k] === '/' && t[k + 1] === '>') { autocierre = true; k += 2; break; }
        const inicioNombre = k;
        while (k < n && !/[\s=>]/.test(t[k]) && !(t[k] === '/' && t[k + 1] === '>')) k++;
        const nombreAtr = t.slice(inicioNombre, k);
        let valor = null;
        let inicioValor = k;
        let j = k;
        while (j < n && /\s/.test(t[j])) j++;
        if (t[j] === '=') {
          j++;
          while (j < n && /\s/.test(t[j])) j++;
          if (t[j] === '"' || t[j] === '\'') {
            const fin = t.indexOf(t[j], j + 1);
            inicioValor = j + 1;
            valor = t.slice(j + 1, fin < 0 ? n : fin);
            k = fin < 0 ? n : fin + 1;
          } else {
            inicioValor = j;
            while (j < n && !/[\s>]/.test(t[j])) j++;
            valor = t.slice(inicioValor, j);
            k = j;
          }
        }
        if (!nombreAtr) { k++; continue; }
        atributos.push({ nombre: nombreAtr, valor, inicio: inicioValor });
      }
      i = k;

      for (const a of atributos) {
        const enlazado = /^\[(attr\.)?([^\]]+)\]$/.exec(a.nombre);
        const base = (enlazado ? enlazado[2] : a.nombre).toLowerCase();
        if (!atributosTexto.includes(base) || a.valor == null) continue;
        if (enlazado) {
          for (const l of literalesSinTraductor(a.valor)) {
            hallazgos.push({ offset: a.inicio + l.offset, texto: l.valor, visible: l.valor, origen: 'atributo' });
          }
        } else {
          analizarTextoConInterpolaciones(a.valor, a.inicio, 'atributo', 'atributo');
        }
      }

      if (ETIQUETAS_TEXTO_CRUDO.includes(nombre)) {
        const fin = t.toLowerCase().indexOf(`</${nombre}`, i);
        i = fin < 0 ? n : fin;
        continue;
      }
      if (!autocierre && !ETIQUETAS_VACIAS.has(nombre)) {
        const directiva = atributos.some(a => a.nombre === 'translate' && (a.valor == null || a.valor === ''));
        pila.push({ nombre, directiva });
      }
      continue;
    }
    // Nodo de texto: hasta la próxima etiqueta, saltando interpolaciones (pueden traer < y >).
    const inicio = i;
    while (i < n) {
      if (t.startsWith('{{', i)) {
        const fin = t.indexOf('}}', i + 2);
        i = fin < 0 ? n : fin + 2;
        continue;
      }
      if (t[i] === '<' && /[A-Za-z/!]/.test(t[i + 1] || '')) break;
      i++;
    }
    const texto = t.slice(inicio, i);
    if (!texto.trim()) continue;
    const padre = pila[pila.length - 1];
    if (padre && padre.directiva) {
      clavesDirectiva.push({ clave: texto.trim(), offset: inicio + texto.search(/\S/) });
      continue;
    }
    analizarTextoConInterpolaciones(texto, inicio, 'texto', 'interpolacion');
  }
  return { hallazgos, clavesDirectiva };
}

// ---------------------------------------------------------------- configuración y carpetas

function cargarConfig(archivo) {
  if (!fs.existsSync(archivo)) throw new ErrorDeUso(`No existe la configuración ${archivo}`);
  let config;
  try {
    config = JSON.parse(fs.readFileSync(archivo, 'utf8'));
  } catch (e) {
    throw new ErrorDeUso(`La configuración ${archivo} no es JSON válido: ${e.message}`);
  }
  return {
    diccionarios: 'src/assets/i18n',
    codigo: 'src/app',
    referencia: 'es',
    idiomas: ['es', 'en', 'pt', 'de'],
    idiomasOpcionales: [],
    nombresPropios: [],
    igualesPermitidos: [],
    textosIgnorados: [],
    prefijosDinamicos: [],
    modulosCerrados: [],
    fueraDeAlcance: [],
    bloques: {},
    ...config,
  };
}

const dentroDe = (rel, carpeta) => rel === carpeta || rel.startsWith(`${carpeta}/`);

/**
 * Carpetas y bloques pedidos. Un bloque (`IDI-B03`) cubre los archivos cuyo bloque de D10 es ese
 * (la carpeta más específica gana: `components/ventas/clientes` es de IDI-B05 aunque esté dentro
 * de `components/ventas`); una carpeta cubre todo lo que tiene debajo.
 */
function resolverModulos(lista, config, raizCodigo) {
  const carpetas = [];
  const bloques = new Set();
  for (const crudo of lista) {
    const item = crudo.trim().replace(/^src\/app\//, '').replace(/\/+$/, '');
    if (!item) continue;
    if (/^IDI-B\d+/i.test(item)) {
      const bloque = Object.keys(config.bloques).find(b => b.split(' ')[0].toLowerCase() === item.toLowerCase());
      if (!bloque) throw new ErrorDeUso(`No existe el bloque «${crudo}» en la configuración`);
      carpetas.push(...config.bloques[bloque]);
      bloques.add(bloque);
      continue;
    }
    const candidatos = [item, `components/${item}`, `shared/components/${item}`, `pages/${item}`, `modules/${item}`];
    const encontrada = candidatos.find(c => fs.existsSync(path.join(raizCodigo, c)));
    if (!encontrada) throw new ErrorDeUso(`No existe la carpeta o el bloque «${crudo}» en src/app`);
    carpetas.push(encontrada);
  }
  const unicas = [...new Set(carpetas)];
  const sueltas = unicas.filter(c => !Object.entries(config.bloques).some(([b, cs]) => bloques.has(b) && cs.includes(c)));
  return {
    carpetas: unicas,
    incluye: (rel, bloqueDelArchivo) => bloques.has(bloqueDelArchivo) || sueltas.some(c => dentroDe(rel, c)),
  };
}

function carpetaGenerica(rel) {
  const partes = rel.split('/');
  if (partes[0] === 'shared' && partes[1] === 'components') return partes.slice(0, 3).join('/');
  return partes.length > 2 ? partes.slice(0, 2).join('/') : partes.slice(0, -1).join('/') || rel;
}

function bloqueDe(rel, config) {
  let mejor = null;
  for (const [bloque, carpetas] of Object.entries(config.bloques)) {
    for (const c of carpetas) {
      if (dentroDe(rel, c) && (!mejor || c.length > mejor.carpeta.length)) mejor = { bloque, carpeta: c };
    }
  }
  return mejor || { bloque: 'Sin bloque', carpeta: carpetaGenerica(rel) };
}

function listarArchivos(dir) {
  const res = [];
  const pendientes = [dir];
  while (pendientes.length) {
    const actual = pendientes.pop();
    for (const e of fs.readdirSync(actual, { withFileTypes: true })) {
      if (e.name === 'node_modules' || e.name.startsWith('.')) continue;
      const ruta = path.join(actual, e.name);
      if (e.isDirectory()) pendientes.push(ruta);
      else if (/\.(html|ts)$/.test(e.name) && !e.name.endsWith('.spec.ts') && !e.name.endsWith('.d.ts')) res.push(ruta);
    }
  }
  return res.sort();
}

// ---------------------------------------------------------------- ejecución

function ejecutar({ raiz = RAIZ_REPO, config: rutaConfig = CONFIG_REPO, modulos = [] } = {}) {
  const inicioMs = Date.now();
  const config = cargarConfig(rutaConfig);
  const raizCodigo = path.join(raiz, config.codigo);
  const permitidos = crearPermitidos(config);
  const atributosTexto = (config.atributosTexto || ATRIBUTOS_TEXTO).map(a => String(a).toLowerCase());
  const hallazgos = [];

  // Diccionarios.
  const dics = {};
  for (const idioma of config.idiomas) dics[idioma] = leerDiccionario(raiz, config, idioma, hallazgos);
  revisarDiccionarios(dics, config, permitidos, hallazgos);
  const ref = dics[config.referencia];

  // Código.
  const cerradas = resolverModulos(config.modulosCerrados, config, raizCodigo);
  const pedidas = resolverModulos(modulos, config, raizCodigo);
  const archivos = fs.existsSync(raizCodigo) ? listarArchivos(raizCodigo) : [];
  const usos = [];
  const literales = new Set();
  const sueltos = [];
  const modulo = [];

  for (const archivo of archivos) {
    const texto = fs.readFileSync(archivo, 'utf8');
    const relCodigo = posix(path.relative(raizCodigo, archivo));
    const rel = posix(path.relative(raiz, archivo));
    const inicios = inicioDeLineas(texto);
    const ignoradas = lineasIgnoradas(texto);
    const linea = offset => lineaDe(inicios, offset);
    let encontrados = [];
    let fuente = texto;
    const desde = usos.length;
    const fuera = config.fueraDeAlcance.some(c => dentroDe(relCodigo, c));
    const { bloque, carpeta } = bloqueDe(relCodigo, config);
    const enCerrado = cerradas.incluye(relCodigo, bloque);
    const enPedido = pedidas.incluye(relCodigo, bloque);

    if (archivo.endsWith('.ts')) {
      const { tokens, sinComentarios } = lexTs(texto);
      fuente = sinComentarios;
      for (const tk of tokens) if (tk.tipo === 'cadena' || (tk.tipo === 'plantilla' && !tk.dinamica)) literales.add(tk.valor);
      const ts = clavesDeTs(sinComentarios);
      ts.usos.forEach(u => usos.push({ ...u, archivo: rel, linea: linea(u.offset) }));
      ts.dinamicas.forEach(d => usos.push({ ...d, dinamica: true, archivo: rel, linea: linea(d.offset) }));
      encontrados = sueltosEnTs(tokens);
      // Plantillas en línea (`template: \`…\``): se revisan como un .html.
      for (const p of plantillasEnLinea(tokens)) {
        const html = escanearHtml(p.texto, atributosTexto);
        html.clavesDirectiva.forEach(c => usos.push({ ...c, offset: p.base + c.offset, archivo: rel, linea: linea(p.base + c.offset) }));
        html.hallazgos.forEach(h => encontrados.push({ ...h, offset: p.base + h.offset }));
      }
    } else {
      fuente = texto.replace(/<!--[\s\S]*?-->/g, m => m.replace(/[^\n]/g, ' '));
      for (const l of fuente.matchAll(RE_LITERAL)) literales.add(unescape(l[2]));
      const html = escanearHtml(texto, atributosTexto);
      html.clavesDirectiva.forEach(c => usos.push({ ...c, archivo: rel, linea: linea(c.offset) }));
      encontrados = html.hallazgos;
    }
    const pipe = clavesDePipe(fuente);
    pipe.usos.forEach(u => usos.push({ ...u, archivo: rel, linea: linea(u.offset) }));
    pipe.dinamicas.forEach(d => usos.push({ ...d, dinamica: true, archivo: rel, linea: linea(d.offset) }));
    for (let k = desde; k < usos.length; k++) usos[k].enCerrado = enCerrado;
    for (const h of encontrados) {
      const l = linea(h.offset);
      if (ignoradas.has(l) || ignoradas.has(l - 1) || permitidos.ignorado(h.visible)) continue;
      const suelto = { tipo: 'textoSuelto', archivo: rel, linea: l, texto: h.texto.trim(), origen: h.origen, bloque, carpeta };
      if (enPedido) modulo.push(suelto);
      if (fuera) continue;
      sueltos.push(suelto);
      if (enCerrado) hallazgos.push({ ...suelto, mensaje: `texto sin traductor en un módulo cerrado: «${h.texto}»` });
    }
  }

  // Claves usadas que no existen en es, dinámicas y sin uso.
  const prefijoPermitido = clave => config.prefijosDinamicos.some(p => clave.startsWith(p));
  if (ref) {
    const existe = clave => ref.valores.has(clave) || ref.objetos.has(clave);
    for (const u of usos) {
      if (u.dinamica) {
        if (!prefijoPermitido(u.prefijo)) {
          hallazgos.push({ tipo: 'claveDinamica', archivo: u.archivo, linea: u.linea, clave: u.prefijo, mensaje: `clave armada en ejecución desde «${u.prefijo}»; su prefijo no está en prefijosDinamicos` });
        }
        continue;
      }
      if (!existe(u.clave)) {
        // D3: las claves literales antiguas siguen vigentes hasta que se migra su módulo. En un
        // módulo cerrado es error; fuera, aviso (línea base para el bloque de cada módulo).
        hallazgos.push({
          tipo: u.enCerrado ? 'claveInexistente' : 'claveInexistenteAbierta',
          archivo: u.archivo, linea: u.linea, clave: u.clave,
          mensaje: `«${u.clave}» no está en ${config.referencia}.json`,
        });
      }
    }
    const usadas = new Set(usos.filter(u => !u.dinamica).map(u => u.clave));
    const usada = clave => {
      if (usadas.has(clave) || literales.has(clave) || prefijoPermitido(clave)) return true;
      const partes = clave.split('.');
      for (let k = 1; k < partes.length; k++) if (usadas.has(partes.slice(0, k).join('.'))) return true;
      return false;
    };
    for (const clave of ref.valores.keys()) {
      if (!usada(clave)) {
        hallazgos.push({ tipo: 'claveSinUso', idioma: config.referencia, archivo: ref.archivo, linea: ref.lineas.get(clave) ?? null, clave, mensaje: `nadie usa «${clave}»` });
      }
    }
  }

  const errores = hallazgos.filter(h => ERRORES.includes(h.tipo));
  const avisos = hallazgos.filter(h => AVISOS.includes(h.tipo));
  const contar = lista => lista.reduce((acc, h) => ({ ...acc, [h.tipo]: (acc[h.tipo] || 0) + 1 }), {});
  return {
    errores,
    avisos,
    sueltos,
    modulo,
    modulosPedidos: pedidas.carpetas,
    modulosCerrados: cerradas.carpetas,
    archivos: archivos.length,
    diccionarios: Object.fromEntries(Object.entries(dics).map(([k, d]) => [k, d ? d.valores.size : null])),
    resumen: { errores: contar(errores), avisos: contar(avisos) },
    bloques: tablaDeBloques(sueltos, config),
    duracionMs: Date.now() - inicioMs,
  };
}

function tablaDeBloques(sueltos, config) {
  const filas = new Map();
  const orden = [...Object.keys(config.bloques), 'Sin bloque'];
  for (const s of sueltos) {
    const clave = `${s.bloque}\u0000${s.carpeta}`;
    if (!filas.has(clave)) filas.set(clave, { bloque: s.bloque, carpeta: s.carpeta, texto: 0, atributo: 0, mensaje: 0, total: 0 });
    const f = filas.get(clave);
    const tipo = s.origen === 'mensaje' ? 'mensaje' : s.origen === 'atributo' ? 'atributo' : 'texto';
    f[tipo]++;
    f.total++;
  }
  return [...filas.values()].sort((a, b) => orden.indexOf(a.bloque) - orden.indexOf(b.bloque) || b.total - a.total);
}

// ---------------------------------------------------------------- salida

const corto = s => {
  const t = String(s ?? '').replace(/\s+/g, ' ');
  return t.length > 100 ? `${t.slice(0, 97)}…` : t;
};

function lineaHallazgo(h) {
  const donde = h.linea ? `${h.archivo}:${h.linea}` : h.archivo;
  const idioma = h.idioma ? `[${h.idioma}] ` : '';
  if (h.tipo === 'textoSuelto') return `${donde}  (${h.origen})  ${corto(h.texto)}`;
  return `${donde}  ${idioma}${corto(h.mensaje)}`;
}

function imprimirGrupo(titulo, lista, tiposOrden, todo) {
  console.log(`\n${titulo} (${lista.length})`);
  for (const tipo of tiposOrden) {
    const deTipo = lista.filter(h => h.tipo === tipo);
    if (!deTipo.length) continue;
    console.log(`  ${tipo} (${deTipo.length})`);
    const mostrar = todo ? deTipo : deTipo.slice(0, LIMITE_POR_TIPO);
    for (const h of mostrar) console.log(`    ${lineaHallazgo(h)}`);
    if (mostrar.length < deTipo.length) console.log(`    … y ${deTipo.length - mostrar.length} más (--todo para verlos)`);
  }
}

function imprimirBloques(informe) {
  console.log('\n| Bloque | Carpeta | Texto HTML | Atributos | Mensajes TS | Total |');
  console.log('|---|---|---:|---:|---:|---:|');
  const totales = new Map();
  for (const f of informe.bloques) {
    console.log(`| ${f.bloque} | \`${f.carpeta}\` | ${f.texto} | ${f.atributo} | ${f.mensaje} | ${f.total} |`);
    const t = totales.get(f.bloque) || { texto: 0, atributo: 0, mensaje: 0, total: 0 };
    for (const k of Object.keys(t)) t[k] += f[k];
    totales.set(f.bloque, t);
  }
  console.log('\n| Bloque | Texto HTML | Atributos | Mensajes TS | Total |');
  console.log('|---|---:|---:|---:|---:|');
  let suma = 0;
  for (const [bloque, t] of totales) {
    console.log(`| ${bloque} | ${t.texto} | ${t.atributo} | ${t.mensaje} | ${t.total} |`);
    suma += t.total;
  }
  console.log(`| **Total** | | | | **${suma}** |`);
}

function main(argv) {
  const opciones = { modulos: [] };
  let json = false;
  let todo = false;
  let bloques = false;
  for (let k = 0; k < argv.length; k++) {
    const a = argv[k];
    if (a === '--json') json = true;
    else if (a === '--todo') todo = true;
    else if (a === '--bloques') bloques = true;
    else if (a === '--modulo' || a === '--raiz' || a === '--config') {
      const v = argv[++k];
      if (!v) throw new ErrorDeUso(`${a} necesita un valor`);
      if (a === '--modulo') opciones.modulos.push(...v.split(','));
      else if (a === '--raiz') opciones.raiz = path.resolve(v);
      else opciones.config = path.resolve(v);
    } else if (a.startsWith('--modulo=')) opciones.modulos.push(...a.slice(9).split(','));
    else throw new ErrorDeUso(`Opción desconocida: ${a}`);
  }

  const informe = ejecutar(opciones);
  if (json) {
    process.stdout.write(`${JSON.stringify(informe, null, 2)}\n`);
    return informe.errores.length ? 1 : 0;
  }

  const dic = Object.entries(informe.diccionarios).map(([k, v]) => `${k} ${v == null ? '(no existe)' : v}`).join(', ');
  console.log(`i18n:check (D-532). Diccionarios: ${dic}. Archivos revisados: ${informe.archivos} en ${informe.duracionMs} ms.`);
  console.log(`Módulos cerrados: ${informe.modulosCerrados.length ? informe.modulosCerrados.join(', ') : 'ninguno'}.`);
  if (informe.errores.length) imprimirGrupo('ERRORES', informe.errores, ERRORES, todo);
  if (informe.avisos.length) imprimirGrupo('Avisos', informe.avisos, AVISOS, todo);

  const porOrigen = informe.sueltos.reduce((acc, s) => ({ ...acc, [s.origen]: (acc[s.origen] || 0) + 1 }), {});
  console.log(`\nTextos sueltos en todo el panel (informativo fuera de los módulos cerrados): ${informe.sueltos.length}`
    + ` (texto ${porOrigen.texto || 0}, interpolación ${porOrigen.interpolacion || 0}, atributo ${porOrigen.atributo || 0}, mensaje ${porOrigen.mensaje || 0}).`);
  if (bloques) imprimirBloques(informe);

  if (opciones.modulos.length) {
    console.log(`\nTextos sueltos en ${informe.modulosPedidos.join(', ')}: ${informe.modulo.length}`);
    for (const s of informe.modulo) console.log(`  ${lineaHallazgo(s)}`);
  }

  console.log(`\nResultado: ${informe.errores.length} errores, ${informe.avisos.length} avisos.`);
  return informe.errores.length ? 1 : 0;
}

if (require.main === module) {
  try {
    process.exitCode = main(process.argv.slice(2));
  } catch (e) {
    // Salida 2 = no se pudo verificar; nunca se confunde con «hay errores de traducción» (1).
    process.stderr.write(e instanceof ErrorDeUso ? `i18n:check: ${e.message}\n` : `i18n:check: fallo inesperado\n${e.stack || e}\n`);
    process.exitCode = 2;
  }
}

module.exports = { ejecutar, main, escanearHtml, lexTs, sueltosEnTs, clavesDePipe, clavesDeTs, recorrerJson, plantillasEnLinea };
