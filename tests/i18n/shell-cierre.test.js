'use strict';

// D-532 (ticket Traducción cd CMNdBkVZXgYoOCvqfGZc, bloque IDI-B01b, tareas 2.3 a 2.7): cierre del
// shell. Perfil, notificaciones, inicio (dashboard) y piezas comunes pasan sus textos al traductor
// con claves semánticas; el shell entra en `modulosCerrados` y queda en cero textos sueltos.
// Node puro: lee plantillas, .ts y diccionarios; transpila algunos .ts sin Angular ni red.

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { test } = require('node:test');
const { cargarTs } = require('../theme/cargar-ts');

// @Input/@Output de propiedad: decoradores que no tocan la propiedad (el cargador genérico la deja
// de solo lectura).
const angularCore = {
  Component: () => clase => clase,
  ChangeDetectionStrategy: {},
  Input: () => () => undefined,
  Output: () => () => undefined,
  EventEmitter: class { emit() {} },
};

const RAIZ = path.resolve(__dirname, '../..');
const APP = path.join(RAIZ, 'src/app');
const IDIOMAS = ['es', 'en', 'pt', 'de'];
const leer = rel => fs.readFileSync(path.join(RAIZ, rel), 'utf8');
const dics = Object.fromEntries(IDIOMAS.map(i => [i, JSON.parse(leer(`src/assets/i18n/${i}.json`))]));
const config = JSON.parse(leer('scripts/i18n-check.config.json'));

// Carpetas de IDI-B01b (el resto del shell lo cerró IDI-B01a y lo prueba menu-titulos.test.js).
const CARPETAS = [
  'components/usuarios/edit-profile',
  'components/notificaciones',
  'components/dashboard',
  'components/loader',
  'shared/components/footer',
  'shared/components/notification-center',
  'shared/components/aviso-actualizacion',
  'shared/components/upgrade-modal',
  'shared/components/plan-selector',
  'shared/components/usage-widget',
  'shared/components/loader',
  'shared/components/layout',
  'shared/components/novedad-modal',
  'shared/components/tap-to-top',
];
const PREFIJOS = /^(shell|notificaciones|dashboard|usuarios|comun)\./;

function archivos(dir) {
  const res = [];
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const ruta = path.join(dir, e.name);
    if (e.isDirectory()) res.push(...archivos(ruta));
    else if (/\.(html|ts)$/.test(e.name) && !e.name.endsWith('.spec.ts')) res.push(ruta);
  }
  return res;
}
const ARCHIVOS = CARPETAS.flatMap(c => archivos(path.join(APP, c)));
const sinComentarios = t => t.replace(/<!--[\s\S]*?-->/g, '').replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
const variables = v => [...String(v).matchAll(/\{\{\s*(\w+)\s*\}\}/g)].map(m => m[1]).sort();

let informe;
function revisar() {
  if (!informe) informe = require(path.join(RAIZ, 'scripts/i18n-check.js')).ejecutar({ modulos: CARPETAS });
  return informe;
}

test('2.7: cero textos sueltos en las carpetas de IDI-B01b y i18n:check sin errores', () => {
  const r = revisar();
  assert.deepEqual(r.modulo.map(s => `${s.archivo}:${s.linea} ${s.texto}`), []);
  assert.deepEqual(r.errores.map(e => `${e.tipo} ${e.archivo || ''}:${e.linea || ''} ${e.clave || e.mensaje}`), []);
  const inexistentes = r.avisos.filter(h => h.tipo === 'claveInexistenteAbierta'
    && CARPETAS.some(c => h.archivo.startsWith(`src/app/${c}/`)));
  assert.deepEqual(inexistentes.map(h => `${h.archivo}:${h.linea} ${h.clave}`), []);
});

test('2.7: el shell está en modulosCerrados y el bloque cubre las carpetas nuevas', () => {
  for (const c of CARPETAS) {
    assert.ok(config.modulosCerrados.includes(c), `${c} cerrada`);
    assert.ok(config.bloques['IDI-B01 Shell'].includes(c), `${c} en el bloque IDI-B01`);
  }
  for (const c of ['shared/components/sidebar', 'shared/components/bottom-navigation', 'shared/components/adaptive-navigation',
    'shared/components/breadcrumb', 'shared/services/nav.service.ts', 'shared/components/header/header.component.html']) {
    assert.ok(config.modulosCerrados.includes(c), `${c} cerrada`);
  }
  // app.component.ts es «sin bloque» (sus avisos de sesión inactiva son de otro bloque): no se cierra.
  assert.ok(!config.modulosCerrados.includes('app.component.ts'));
});

test('2.3/2.4: las plantillas y los .ts del bloque solo piden claves semánticas, y existen en los cuatro idiomas', () => {
  const usadas = new Set();
  const literales = [];
  for (const archivo of ARCHIVOS) {
    const texto = sinComentarios(fs.readFileSync(archivo, 'utf8'));
    for (const m of texto.matchAll(/'([^'\n]+)'\s*\|\s*translate/g)) {
      if (PREFIJOS.test(m[1])) usadas.add(m[1]);
      else literales.push(`${path.relative(RAIZ, archivo)} '${m[1]}'`);
    }
    for (const m of texto.matchAll(/['"`]((?:shell|notificaciones|dashboard|usuarios|comun)\.[\w.]+)['"`]/g)) usadas.add(m[1]);
  }
  assert.deepEqual(literales, [], 'ninguna clave literal antigua en el bloque');
  assert.ok(usadas.size > 600, `${usadas.size} claves`);
  for (const clave of usadas) {
    for (const idioma of IDIOMAS) {
      assert.equal(typeof dics[idioma][clave], 'string', `${idioma}: ${clave}`);
      assert.ok(dics[idioma][clave].length > 0, `${idioma}: ${clave} no vacía`);
      assert.deepEqual(variables(dics[idioma][clave]), variables(dics.es[clave]), `${idioma}: variables de ${clave}`);
    }
  }
});

test('2.5: ortografía del español en las claves nuevas (… en vez de ..., ¡! y ¿? pegados, sin «Pre-»)', () => {
  const nuevas = Object.entries(dics.es).filter(([k]) => /^(shell\.(app|update|novedad|notificationCenter|usage|planSelector|upgrade)|notificaciones\.(page|channels|prefs|teamAlerts|billing|owner|meta|whatsapp|privacyLink)|dashboard|usuarios\.editProfile)\./.test(k)
    || k === 'notificaciones.privacyLink');
  assert.ok(nuevas.length > 700, `${nuevas.length} claves nuevas`);
  for (const [clave, valor] of nuevas) {
    assert.doesNotMatch(valor, /\.\.\./, `${clave}: «…»`);
    assert.doesNotMatch(valor, /[¡¿]\s|\s[!?]/, `${clave}: signos pegados`);
    assert.doesNotMatch(valor, /\b(Prob[aá] de nuevo|Inténtelo)\b/, `${clave}: tratamiento de tú (D7)`);
  }
  assert.equal(dics.es['notificaciones.prefs.orderCreated.title'], 'Pedido confirmado');
  assert.equal(dics.es['usuarios.editProfile.preferencesSaved'], '¡Cambios guardados con éxito!');
  assert.equal(dics.es['shell.notificationCenter.types.paymentPreapproved'], 'Pago preaprobado');
});

test('2.6: claves literales que el módulo ya no usa, borradas de los cuatro diccionarios', () => {
  for (const clave of ['Mensaje de texto', 'Política de privacidad']) {
    for (const idioma of IDIOMAS) assert.equal(dics[idioma][clave], undefined, `${idioma}: ${clave}`);
  }
  for (const idioma of ['en', 'pt']) assert.equal(dics[idioma]['Panel de Control'], undefined, idioma);
  // Las semánticas que ya existían se conservan (encargo del bloque).
  for (const clave of ['notificaciones.privacy_note_1', 'notificaciones.privacy_note_2', 'notificaciones.channels_hint']) {
    for (const idioma of IDIOMAS) assert.equal(typeof dics[idioma][clave], 'string', `${idioma}: ${clave}`);
  }
});

test('2.4: el aviso de notificaciones pendientes de app.component usa instant dentro del subscribe', () => {
  const app = leer('src/app/app.component.ts');
  assert.doesNotMatch(app, /Tienes notificaciones pendientes|'Notification'/);
  const bloque = app.slice(app.indexOf('this.notificationService.notifications$'), app.indexOf('// Service Worker update listener'));
  assert.match(bloque, /\.subscribe\(/);
  assert.match(bloque, /translate\.instant\('shell\.app\.pendingNotifications'\), translate\.instant\('shell\.app\.pendingNotificationsTitle'\)/);
  assert.equal(dics.en['shell.app.pendingNotifications'], 'You have pending notifications');
});

test('D3: los valores que se guardan, se comparan o se envían no cambian', () => {
  const plan = leer('src/app/shared/components/plan-selector/plan-selector.component.ts');
  for (const nombre of ["name: 'EARLY ADOPTER'", "name: 'PLAN #1'", "name: 'PLAN POS'", "return 'Mensual+Comisión'", "'Porcentaje' : 'Fijo'"]) {
    assert.ok(plan.includes(nombre), nombre);
  }
  const notif = leer('src/app/components/notificaciones/notificaciones.component.ts');
  for (const id of ['order_created', 'payment_approved', 'order_produced', 'order_dispatched', 'order_delivered', 'order_rejected']) {
    assert.ok(notif.includes(`id: '${id}'`), id);
  }
  // Las respuestas rápidas se envían al comprador: su texto no se traduce (D4, idioma del comercio).
  const detalle = leer('src/app/components/notificaciones/whatsapp-inbox/components/whatsapp-thread-detail/whatsapp-thread-detail.component.ts');
  assert.ok(detalle.includes('"Hola, gracias por escribirnos. ¿En qué te podemos ayudar hoy?"'));
  // El nombre del lead que se manda al CRM sigue igual.
  const panel = leer('src/app/components/notificaciones/whatsapp-inbox/components/whatsapp-contact-panel/whatsapp-contact-panel.component.ts');
  assert.ok(panel.includes('`Contacto WhatsApp ${phone || ""}`.trim()'));
  // Tramos del plan: nombres propios del producto, quedan escritos (y los marca i18n-ignorar).
  const modal = leer('src/app/shared/components/upgrade-modal/upgrade-modal.component.html');
  assert.ok(modal.includes('<td>Base</td>') && modal.includes('$27 USD'));
  // El nombre por omisión de un reporte se guarda con el reporte: no se traduce en este bloque.
  assert.ok(leer('src/app/components/dashboard/builder/report-builder.component.ts').includes("reportName = 'Nuevo reporte'"));
});

test('aviso de actualización: las etiquetas y los pasos guardan la clave y la plantilla los traduce', () => {
  const { AvisoActualizacionComponent } = cargarTs('src/app/shared/components/aviso-actualizacion/aviso-actualizacion.component.ts');
  const c = new AvisoActualizacionComponent({ actualizacionDisponible$: { subscribe() {} } }, { isLoggedIn: false });
  assert.equal(c.textoEtiqueta('mejora'), 'shell.update.tagImprovement');
  assert.equal(c.textoEtiqueta('CORRIGE'), 'shell.update.tagFix');
  assert.equal(c.textoEtiqueta(undefined), 'shell.update.tagNew');
  assert.equal(c.claseEtiqueta('MEJORA'), 'act-tag act-tag--mejora', 'la clase CSS sigue saliendo del tipo, no del texto');
  const html = leer('src/app/shared/components/aviso-actualizacion/aviso-actualizacion.component.html');
  assert.match(html, /\{\{ textoEtiqueta\(n\.tipo\) \| translate \}\}/);
  assert.match(html, /\{\{ pasoTexto \| translate \}\}/);
  assert.equal(dics.en['shell.update.tagFix'], 'FIX');
});

test('franja de dueño del chat: título y motivo son claves con el nombre como parámetro', () => {
  const { ChatDuenoComponent } = cargarTs('src/app/components/notificaciones/inbox-core/chat-dueno/chat-dueno.component.ts', {
    modulos: { '@angular/core': angularCore },
  });
  const c = new ChatDuenoComponent();
  c.miEmail = 'yo@comercio.co';
  assert.equal(c.titulo, 'notificaciones.owner.unassigned');
  assert.equal(c.motivo, 'notificaciones.owner.takeHint');
  c.dueno = { email: 'ana@comercio.co', nombre: 'Ana' };
  assert.equal(c.titulo, 'notificaciones.owner.other');
  assert.equal(c.motivo, 'notificaciones.owner.onlyOwner');
  c.esAdministrador = true;
  assert.equal(c.motivo, 'notificaciones.owner.onlyOwnerAdmin');
  c.dueno = { email: 'YO@comercio.co', nombre: 'Yo' };
  assert.equal(c.titulo, 'notificaciones.owner.mine');
  assert.equal(c.motivo, '', 'sin motivo cuando el chat es mío');
  const html = leer('src/app/components/notificaciones/inbox-core/chat-dueno/chat-dueno.component.html');
  assert.match(html, /titulo \| translate: \{ nombre: dueno\?\.nombre \|\| dueno\?\.email \}/);
  assert.equal(dics.de['notificaciones.owner.other'], 'Betreut von: {{nombre}}');
  // inbox-core no importaba el traductor: sin TranslateModule el pipe no existe.
  assert.match(leer('src/app/components/notificaciones/inbox-core/inbox-core.module.ts'), /imports: \[CommonModule, SelectorEquipoModule, TranslateModule\]/);
  assert.match(leer('src/app/components/notificaciones/meta-inbox/meta-inbox.module.ts'), /TranslateModule\]/);
});

test('centro de notificaciones: el tipo se muestra traducido y el plural de «no leídas» va por .one/.other', () => {
  const ts = leer('src/app/shared/components/notification-center/notification-center.component.ts');
  const tipos = [...ts.matchAll(/\[NotificationType\.\w+\]: '(shell\.notificationCenter\.[\w.]+)'/g)].map(m => m[1]);
  assert.ok(tipos.length >= 45, `${tipos.length} tipos`);
  for (const clave of tipos) assert.notEqual(dics.en[clave], dics.es[clave], clave);
  const html = leer('src/app/shared/components/notification-center/notification-center.component.html');
  assert.match(html, /getTypeName\(notification\.type\) \| translate/);
  assert.match(html, /unreadCount === 1 \? 'shell\.notificationCenter\.unread\.one' : 'shell\.notificationCenter\.unread\.other'/);
  assert.equal(dics.es['shell.notificationCenter.unread.one'], '{{count}} no leída');
  assert.equal(dics.es['shell.notificationCenter.unread.other'], '{{count}} no leídas');
});

test('frases con parámetro: no se pegan fragmentos traducidos (D3)', () => {
  const legacy = leer('src/app/components/dashboard/legacy-dashboard.component.html');
  assert.doesNotMatch(legacy, /'Sin salidas en los últimos'|'días' \| translate/);
  assert.match(legacy, /'dashboard\.legacy\.dormantHelp' \| translate: \{ days:/);
  const modal = leer('src/app/shared/components/upgrade-modal/upgrade-modal.component.html');
  assert.doesNotMatch(modal, /'Primer cobro y facturación ' \+|' \+ billingPeriodLabel|'Plan ' \+ tierName/);
  for (const idioma of IDIOMAS) {
    assert.match(dics[idioma]['shell.upgrade.summary.planYearly'], /\{\{tier\}\}/, idioma);
    assert.match(dics[idioma]['dashboard.legacy.dormantHelp'], /\{\{days\}\}/, idioma);
  }
});

// Hallazgos del corrector: el catálogo del constructor se traduce al mostrarlo (el dato sigue en
// español porque las fórmulas [Etiqueta] y el backend lo comparan) y lo que guarda una clave en una
// variable se pinta con el pipe.
test('catálogo del dashboard: cada texto tiene clave en los cuatro idiomas', () => {
  const claveDe = texto => 'dashboard.catalogo.' + texto.replace(/%/g, 'pct ').normalize('NFD')
    .replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '');
  const fuentes = leer('src/app/components/dashboard/model/source-catalog.ts')
    + leer('src/app/components/dashboard/home/preset-reports.ts');
  const textos = [...new Set([...fuentes.matchAll(/(?:label|description|group|name): '([^']*)'/g)].map(m => m[1]))];
  assert.ok(textos.length > 150);
  for (const texto of textos) {
    for (const idioma of IDIOMAS) {
      assert.ok(dics[idioma][claveDe(texto)], `${idioma}: falta ${claveDe(texto)}`);
    }
  }
});

test('errorMsg del constructor guarda claves y se pinta con translate', () => {
  const html = leer('src/app/components/dashboard/builder/report-builder.component.html');
  const ts = leer('src/app/components/dashboard/builder/report-builder.component.ts');
  assert.match(html, /\{\{ errorMsg \| translate \}\}/);
  assert.doesNotMatch(ts, /errorMsg = '[A-Z]/);
  assert.ok(dics.en['dashboard.builder.needValue'] && dics.en['dashboard.common.queryError']);
});
