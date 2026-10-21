'use strict';

// D-540 (ticket Traducción cd CMNdBkVZXgYoOCvqfGZc, bloque IDI-B01a, tarea 2.2). Lee los títulos del
// menú de src/app/shared/services/nav.service.ts con el AST de TypeScript, sin ejecutar Angular.
// Excepción D3: los títulos son identidad (favoritos, secciones plegadas, `item.title === "Mensajes"`)
// y siguen siendo claves literales en español; la prueba fija que no cambien.

const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');

const RAIZ = path.resolve(__dirname, '../..');
const NAV = 'src/app/shared/services/nav.service.ts';
const CANALES = 'src/app/shared/data/future-message-channels.ts';
const CAMPOS = ['headTitle1', 'title', 'path', 'badgeValue'];
const ARREGLOS = ['MENUITEMS', 'MEGAMENUITEMS', 'LEVELMENUITEMS'];

function fuente(rel) {
  const archivo = path.join(RAIZ, rel);
  return ts.createSourceFile(archivo, fs.readFileSync(archivo, 'utf8'), ts.ScriptTarget.Latest, true);
}

const literal = n => (n && (ts.isStringLiteral(n) || ts.isNoSubstitutionTemplateLiteral(n)) ? n.text : undefined);

/** Objetos del arreglo, en orden de aparición (padres antes que hijos), con sus campos de identidad. */
function objetosDe(nodo, sf) {
  const fuera = [];
  (function visitar(n) {
    if (ts.isObjectLiteralExpression(n)) {
      const o = {};
      for (const p of n.properties) {
        if (!ts.isPropertyAssignment(p)) continue;
        const nombre = p.name.getText(sf);
        if (CAMPOS.includes(nombre)) o[nombre] = literal(p.initializer) ?? `<${ts.SyntaxKind[p.initializer.kind]}>`;
      }
      if (Object.keys(o).length) fuera.push(o);
    }
    ts.forEachChild(n, visitar);
  })(nodo);
  return fuera;
}

/** { MENUITEMS: [...], MEGAMENUITEMS: [...], LEVELMENUITEMS: [...], canales: [...] } */
function extraerMenu() {
  const sf = fuente(NAV);
  const clase = sf.statements.find(ts.isClassDeclaration);
  const menu = {};
  for (const nombre of ARREGLOS) {
    const miembro = clase.members.find(m => m.name && m.name.getText(sf) === nombre);
    if (!miembro || !miembro.initializer) throw new Error(`${NAV}: no se encontró ${nombre}`);
    menu[nombre] = objetosDe(miembro.initializer, sf);
  }
  const sfc = fuente(CANALES);
  menu.canales = objetosDe(sfc, sfc).map(({ title }) => ({ title }));
  return menu;
}

/**
 * Claves que el panel muestra del menú: títulos, encabezados de sección e insignias de MENUITEMS y los
 * canales futuros de Mensajes con su insignia «Próximamente». MEGAMENUITEMS y LEVELMENUITEMS solo los
 * usa `app-mega-menu`, que ninguna plantilla pinta (restos de la plantilla Cuba).
 */
function clavesVisibles(menu = extraerMenu()) {
  const claves = new Set();
  for (const o of menu.MENUITEMS) {
    for (const campo of ['headTitle1', 'title', 'badgeValue']) if (o[campo] && !o[campo].startsWith('<')) claves.add(o[campo]);
  }
  for (const c of menu.canales) claves.add(c.title);
  claves.add('Próximamente');
  return [...claves];
}

module.exports = { extraerMenu, clavesVisibles, RAIZ, NAV };
