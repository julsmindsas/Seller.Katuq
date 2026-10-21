'use strict';

// D-540 (ticket Traducción cd CMNdBkVZXgYoOCvqfGZc, bloque IDI-B02, tareas 3.1 a 3.7): páginas
// públicas y de sesión. Pasan sus textos al traductor con claves authentication.*, publica.*,
// changePassword.*, pricing.* y comun.*; el español no cambia (salvo ortografía) y los valores que
// se guardan, se comparan o se envían tampoco. Node puro: lee plantillas, .ts y diccionarios.

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { test } = require('node:test');
const { cargarTs } = require('../theme/cargar-ts');

const RAIZ = path.resolve(__dirname, '../..');
const APP = path.join(RAIZ, 'src/app');
const IDIOMAS = ['es', 'en', 'pt', 'de'];
const leer = rel => fs.readFileSync(path.join(RAIZ, rel), 'utf8');
const dics = Object.fromEntries(IDIOMAS.map(i => [i, JSON.parse(leer(`src/assets/i18n/${i}.json`))]));
const config = JSON.parse(leer('scripts/i18n-check.config.json'));

// Carpetas y archivos que IDI-B02 deja cerrados.
const CERRADAS = [
  'auth/login',
  'pages/authentication/forgot-password',
  'pages/authentication/reset-password',
  'shared/components/change-password',
  'components/change-password',
  'components/payment-callback',
  'components/subscription-callback',
  'components/terms-conditions',
  'components/pricing',
  'shared/components/publica',
  'shared/components/page-not-found',
  'shared/components/codigo-correo',
];
const PREFIJOS = /^(authentication|publica|changePassword|pricing|comun)\./;

function archivos(dir) {
  const res = [];
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const ruta = path.join(dir, e.name);
    if (e.isDirectory()) res.push(...archivos(ruta));
    else if (/\.(html|ts)$/.test(e.name) && !e.name.endsWith('.spec.ts')) res.push(ruta);
  }
  return res;
}
const ARCHIVOS = CERRADAS.flatMap(c => archivos(path.join(APP, c)));
const sinComentarios = t => t.replace(/<!--[\s\S]*?-->/g, '').replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
const variables = v => [...String(v).matchAll(/\{\{\s*(\w+)\s*\}\}/g)].map(m => m[1]).sort();

let informe;
function revisar() {
  if (!informe) informe = require(path.join(RAIZ, 'scripts/i18n-check.js')).ejecutar({ modulos: CERRADAS });
  return informe;
}

test('3.6: cero textos sueltos en las pantallas cerradas, sin errores y sin claves inexistentes', () => {
  const r = revisar();
  assert.deepEqual(r.modulo.map(s => `${s.archivo}:${s.linea} ${s.texto}`), []);
  assert.deepEqual(r.errores.map(e => `${e.tipo} ${e.archivo || ''}:${e.linea || ''} ${e.clave || e.mensaje}`), []);
  const inexistentes = r.avisos.filter(h => h.tipo === 'claveInexistenteAbierta'
    && CERRADAS.some(c => h.archivo.startsWith(`src/app/${c}/`)));
  assert.deepEqual(inexistentes.map(h => `${h.archivo}:${h.linea} ${h.clave}`), []);
});

test('3.6: las pantallas reales están en modulosCerrados; la política de privacidad y las plantillas de demostración no', () => {
  for (const c of CERRADAS) assert.ok(config.modulosCerrados.includes(c), `${c} cerrada`);
  for (const c of config.bloques['IDI-B02 Públicas']) {
    if (c === 'components/privacy-policy' || c === 'pages/authentication') continue;
    assert.ok(config.modulosCerrados.includes(c), `${c} (bloque IDI-B02) cerrada`);
  }
  assert.ok(config.bloques['IDI-B02 Públicas'].includes('shared/components/codigo-correo'));
  // El texto legal no se traduce: la política de privacidad queda fuera de los cerrados y sin tocar.
  assert.ok(!config.modulosCerrados.includes('components/privacy-policy'));
  assert.ok(!config.modulosCerrados.some(c => c === 'pages/authentication' || c.startsWith('pages/authentication/login') || c.startsWith('pages/authentication/register')));
  const privacidad = leer('src/app/components/privacy-policy/privacy-policy.component.html');
  assert.doesNotMatch(privacidad, /\| translate/);
  // Las rutas de demostración de la plantilla siguen redirigiendo a las pantallas reales (nadie las pinta).
  const rutas = leer('src/app/pages/authentication/authentication-routing.module.ts');
  for (const demo of ['login/simple', 'login/image-one', 'login/image-two', 'login/validation', 'login/tooltip', 'login/sweetalert',
    'register/simple', 'register/image-one', 'register/image-two', 'unlock-user']) {
    assert.match(rutas, new RegExp(`path: '${demo}', redirectTo`), demo);
  }
});

test('3.2/3.3: las plantillas y los .ts piden claves semánticas que existen en los cuatro idiomas con las mismas variables', () => {
  const usadas = new Set();
  const literales = [];
  for (const archivo of ARCHIVOS) {
    const texto = sinComentarios(fs.readFileSync(archivo, 'utf8'));
    for (const m of texto.matchAll(/'([^'\n]+)'\s*\|\s*translate/g)) {
      if (PREFIJOS.test(m[1])) usadas.add(m[1]);
      else literales.push(`${path.relative(RAIZ, archivo)} '${m[1]}'`);
    }
    for (const m of texto.matchAll(/['"`]((?:authentication|publica|changePassword|pricing|comun)\.[\w.]+)['"`]/g)) usadas.add(m[1]);
  }
  // Las plantillas de Angular también pasan claves a los componentes por atributo (enlacePregunta="…").
  assert.deepEqual(literales, [], 'ninguna clave literal antigua en las pantallas cerradas');
  assert.ok(usadas.size > 230, `${usadas.size} claves`);
  for (const clave of usadas) {
    for (const idioma of IDIOMAS) {
      assert.equal(typeof dics[idioma][clave], 'string', `${idioma}: ${clave}`);
      assert.ok(dics[idioma][clave].length > 0, `${idioma}: ${clave} no vacía`);
      assert.deepEqual(variables(dics[idioma][clave]), variables(dics.es[clave]), `${idioma}: variables de ${clave}`);
    }
  }
});

test('3.4: ortografía del español en las claves nuevas y el español que se veía antes no cambia', () => {
  const nuevas = Object.entries(dics.es).filter(([k]) => /^(authentication|publica|changePassword|pricing)\./.test(k)
    || ['comun.mostrar', 'comun.ocultar', 'comun.error', 'comun.exito', 'comun.entendido', 'comun.volver'].includes(k));
  assert.ok(nuevas.length > 280, `${nuevas.length} claves nuevas`);
  for (const [clave, valor] of nuevas) {
    assert.doesNotMatch(valor, /\.\.\./, `${clave}: «…»`);
    assert.doesNotMatch(valor, /[¡¿]\s|\s[!?]/, `${clave}: signos pegados`);
    assert.doesNotMatch(valor, /\b(Prob[aá] de nuevo|Inténtelo)\b/, `${clave}: tratamiento de tú (D7)`);
  }
  // Texto en español de antes, tal cual lo veía la persona.
  const antes = {
    'authentication.login.title': 'Ingresa a tu cuenta',
    'authentication.login.lead': 'Ingresa tu correo y tu contraseña',
    'authentication.login.forgot': '¿Olvidaste tu contraseña?',
    'authentication.login.noAccount': '¿No tienes una cuenta?',
    'authentication.login.register': 'Registrarse',
    'authentication.login.version': 'Versión',
    'authentication.login.emailRequired': 'Correo es requerido',
    'authentication.login.passwordRequired': 'Contraseña es requerida',
    'authentication.login.otherAccount': 'Entrar con otra cuenta',
    'authentication.emailCode.title': 'Confirma tu correo',
    'authentication.emailCode.confirm': 'Confirmar y entrar',
    'authentication.forgot.title': 'Recuperar contraseña',
    'authentication.forgot.submit': 'Enviar instrucciones',
    'authentication.forgot.requestFailed': 'No pudimos procesar la solicitud. Intenta nuevamente.',
    'authentication.reset.title': 'Crear nueva contraseña',
    'authentication.reset.invalidLinkTitle': 'Enlace no válido',
    'authentication.reset.updateRetry': 'Error al actualizar la contraseña. Intenta nuevamente.',
    'changePassword.reminderTitle': 'Recuerda actualizar la contraseña',
    'changePassword.later': 'Cambiar más tarde',
    'changePassword.failedTitle': 'No se pudo actualizar',
    'publica.notFound.title': 'No encontramos esta página',
    'publica.backHome': 'Volver al inicio',
    'publica.payment.approvedTitle': '¡Pago aprobado!',
    'publica.payment.rejectedTitle': 'Transacción rechazada',
    'publica.payment.noTransactionId': 'No se recibió un ID de transacción válido',
    'publica.subscription.successTitle': '¡Pago exitoso!',
    'publica.subscription.failedTitle': 'Pago no aprobado',
    'publica.subscription.verifyError': 'Hubo un error al verificar este pago. Por favor intenta nuevamente o contacta soporte.',
    'publica.terms.title': 'Términos y condiciones',
    'pricing.free.kaiQueries': 'Consultas KAI: 10 al día por usuario',
    'pricing.free.aiProducts': 'Productos con IA: 10 al día por usuario',
    'pricing.free.includes': 'Lo que incluye tu plan Gratis',
    'pricing.period.title': '¿Mensual o anual?',
    'pricing.period.save': 'Guardar para el próximo cobro',
    'pricing.receipt.payNow': 'Pagar ahora',
    'pricing.receipt.reconciling': 'Estamos confirmando este pago con Wompi. No vuelvas a pagarlo.',
    'pricing.receipt.sandbox': 'Simulación Wompi Sandbox · sin dinero real',
    'pricing.tiers.publicPrices': 'Ver precios públicos',
    'pricing.cancel.title': '¿Volver al plan Gratis?',
  };
  for (const [clave, texto] of Object.entries(antes)) assert.equal(dics.es[clave], texto, clave);
  // Corregidos solo en ortografía: «...» pasa a «…» y el signo de apertura que faltaba.
  assert.equal(dics.es['authentication.forgot.sending'], 'Enviando…');
  assert.equal(dics.es['authentication.reset.updating'], 'Actualizando…');
  assert.equal(dics.es['authentication.reset.doneText'], 'Ya puedes entrar con tu contraseña nueva. Te llevamos a la pantalla de ingreso…');
  assert.equal(dics.es['changePassword.changedOk'], '¡Contraseña cambiada con éxito!');
  assert.equal(dics.es['authentication.login.emailLabel'], 'Correo electrónico');
});

test('3.5: en, pt y de traducidos con los nombres propios y el tratamiento de D7 (Sie en alemán, sin ß)', () => {
  const nuevas = Object.keys(dics.es).filter(k => /^(authentication|publica|changePassword|pricing)\./.test(k));
  for (const clave of nuevas) {
    assert.doesNotMatch(dics.de[clave], /ß/, `de: ${clave} sin ß`);
    assert.doesNotMatch(dics.de[clave], /\b(du|dein|deine|deinen|dir)\b/i, `de: ${clave} con «Sie»`);
  }
  assert.equal(dics.en['authentication.login.submit'], 'Log in');
  assert.equal(dics.pt['authentication.login.passwordLabel'], 'Senha');
  assert.equal(dics.de['authentication.login.passwordLabel'], 'Passwort');
  assert.equal(dics.pt['authentication.login.register'], 'Cadastre-se');
  for (const idioma of ['en', 'pt', 'de']) {
    assert.match(dics[idioma]['publica.payment.whatsapp'], /WhatsApp/, idioma);
    assert.match(dics[idioma]['pricing.free.safety'], /Wompi/, idioma);
    assert.match(dics[idioma]['pricing.hero.titleAccent'], /Katuq/, idioma);
  }
  // Las claves literales antiguas que las pantallas dejaron de usar ya no están en ningún diccionario.
  for (const antigua of ['Actualizar Contraseña', 'Confirmar Contraseña', 'Nueva Contraseña', 'Recuerda actualizar la contraseña',
    'Ingresa a tu cuenta', 'Ingresa tu correo y tu contraseña', 'Contraseña es requerida']) {
    for (const idioma of IDIOMAS) assert.equal(dics[idioma][antigua], undefined, `${idioma}: ${antigua}`);
  }
  // Las que otras pantallas siguen usando se conservan.
  for (const viva of ['Correo Electrónico', 'Correo es requerido', 'Correo inválido', 'Contraseña', 'Ingresar']) {
    for (const idioma of IDIOMAS) assert.equal(typeof dics[idioma][viva], 'string', `${idioma}: ${viva}`);
  }
});

test('marco público: las entradas del enlace y el pie se traducen y el aria-label ya no es fijo', () => {
  const html = leer('src/app/shared/components/publica/publica-marco.component.html');
  assert.match(html, /\{\{ enlacePregunta \| translate \}\}/);
  assert.match(html, /\{\{ enlaceTexto \| translate \}\}/);
  assert.match(html, /\{\{ pie \| translate \}\}/);
  assert.match(html, /\[attr\.aria-label\]="'publica\.marco\.goHome' \| translate"/);
  assert.match(leer('src/app/shared/components/publica/publica.module.ts'), /imports: \[CommonModule, RouterModule, TranslateModule\]/);
  // Quien pasa un texto que no es clave (encuesta pública) lo ve igual: el traductor devuelve la entrada.
  assert.match(leer('src/app/components/encuesta-publica/encuesta-publica.component.html'), /pie="Encuesta con tecnología de Katuq"/);
  // Las pantallas de recuperación pasan claves.
  assert.match(leer('src/app/pages/authentication/forgot-password/forgot-password.component.html'), /enlacePregunta="authentication\.forgot\.rememberQuestion" enlaceTexto="authentication\.forgot\.signIn"/);
  assert.match(leer('src/app/pages/authentication/reset-password/reset-password.component.html'), /enlacePregunta="authentication\.reset\.alreadyRemember" enlaceTexto="authentication\.reset\.signIn"/);
  // El módulo del pago y el del código de correo no tenían el traductor.
  assert.match(leer('src/app/components/payment-callback/payment-callback.module.ts'), /TranslateModule,/);
  assert.match(leer('src/app/shared/components/codigo-correo/codigo-correo.module.ts'), /TranslateModule\]/);
});

test('términos y privacidad: se traduce la interfaz del visor, el documento legal no', () => {
  const html = leer('src/app/components/terms-conditions/terms-conditions.component.html');
  assert.match(html, /\[href\]="pdfUrl" download>\{\{ 'publica\.terms\.download' \| translate \}\}/);
  assert.match(html, /\[data\]="safePdfUrl"/, 'el PDF sigue siendo el mismo documento');
  assert.equal(dics.en['publica.terms.title'], 'Terms and conditions');
  assert.equal(dics.de['publica.terms.title'], 'Allgemeine Geschäftsbedingungen');
  assert.equal(dics.es['publica.terms.lead'], 'Estas son las condiciones generales de uso de KATUQ. Puedes leerlas aquí o descargar el PDF.');
});

test('resultados de pago y suscripción: los mensajes del servidor se muestran como llegan y los locales guardan la clave', () => {
  const pago = leer('src/app/components/payment-callback/payment-callback.component.html');
  assert.match(pago, /transactionDetails\?\.status_message \|\| \('publica\.payment\.pendingFallback' \| translate\)/);
  assert.match(pago, /transactionDetails\?\.status_message \|\| \('publica\.payment\.rejectedFallback' \| translate\)/);
  assert.match(pago, /\(errorMessage \|\| 'publica\.payment\.errorFallback'\) \| translate/);
  const pagoTs = leer('src/app/components/payment-callback/payment-callback.component.ts');
  assert.deepEqual([...pagoTs.matchAll(/this\.errorMessage = '([^']+)'/g)].map(m => m[1]),
    ['publica.payment.noTransactionId', 'publica.payment.unknownStatus', 'publica.payment.queryFailed']);
  // Lo que decide si el pago está aprobado no cambia.
  assert.match(pagoTs, /aprobada/);
  const sus = leer('src/app/components/subscription-callback/subscription-callback.component.html');
  assert.equal([...sus.matchAll(/\{\{ message \| translate \}\}/g)].length, 2);
  assert.match(sus, /\(failed \? 'publica\.subscription\.failedTitle' : 'publica\.payment\.pendingTitle'\) \| translate/);
  const susTs = leer('src/app/components/subscription-callback/subscription-callback.component.ts');
  for (const clave of ['notFound', 'activated', 'declined', 'processing', 'verifyError']) {
    assert.ok(susTs.includes(`'publica.subscription.${clave}'`), clave);
  }
  assert.ok(susTs.includes("['failed', 'declined', 'error', 'voided']"));
  assert.ok(susTs.includes('payment.activated === true'));
});

test('cambio de contraseña, recuperación y código: solo cambian los textos de Swal y toastr (con instant dentro del manejador)', () => {
  const obligatorio = leer('src/app/components/change-password/change-password.component.ts');
  assert.match(obligatorio, /title: this\.translate\.instant\('changePassword\.updated'\)/);
  assert.match(obligatorio, /text: result\?\.message \|\| this\.translate\.instant\('changePassword\.updatedText'\)/);
  assert.match(obligatorio, /err\?\.error\?\.message \|\| err\?\.message \|\| this\.translate\.instant\('changePassword\.failedText'\)/);
  assert.match(obligatorio, /this\.service\.changePassword\(passwordUpdate\)/);
  assert.match(obligatorio, /user\.mustChangePassword = false;/);
  const perfil = leer('src/app/shared/components/change-password/change-password.component.ts');
  assert.match(perfil, /title: this\.translate\.instant\('changePassword\.changedOk'\)/);
  assert.match(perfil, /this\.service\.changeNewPassword\(user\)/);
  const reset = leer('src/app/pages/authentication/reset-password/reset-password.component.ts');
  assert.match(reset, /this\.toastr\.error\(result\.message \|\| this\.translate\.instant\('authentication\.reset\.updateFailed'\), this\.translate\.instant\('comun\.error'\)\)/);
  assert.match(reset, /this\.serviciosService\.resetPassword\(resetData\)/);
  const olvido = leer('src/app/pages/authentication/forgot-password/forgot-password.component.ts');
  assert.match(olvido, /this\.serviciosService\.forgotPassword\(\{ email \}\)/);
  assert.match(olvido, /this\.translate\.instant\('authentication\.forgot\.requestFailed'\)/);
  const codigo = leer('src/app/shared/components/codigo-correo/codigo-correo.component.ts');
  assert.match(codigo, /\(err && err\.error && err\.error\.message\) \|\| this\.translate\.instant\('authentication\.emailCode\.confirmFailed'\)/);
  assert.match(codigo, /\(err && err\.error && err\.error\.message\) \|\| this\.translate\.instant\('authentication\.emailCode\.sendFailed'\)/);
  // El texto con el correo no se arma con HTML: el correo escrito por la persona se pinta como texto.
  const html = leer('src/app/shared/components/codigo-correo/codigo-correo.component.html');
  assert.match(html, /<strong>\{\{ email \}\}<\/strong>/);
  assert.doesNotMatch(html, /innerHTML/);
  assert.match(html, /'authentication\.emailCode\.resendIn' \| translate: \{ seconds: segundos \}/);
});

test('login: no cambia nada de la lógica; los botones y los errores usan las claves', () => {
  const html = leer('src/app/auth/login/login.component.html');
  assert.match(html, /\(ngSubmit\)="onSubmit\(\)"/);
  assert.match(html, /\(click\)="showPassword\(\)"/);
  assert.match(html, /\[routerLink\]="'\/authentication\/forgot-password'"/);
  assert.match(html, /\[routerLink\]="'\/registrarse'"/);
  assert.match(html, /\(\(show \? 'comun\.ocultar' : 'comun\.mostrar'\) \| translate\)|\{\{ \(show \? 'comun\.ocultar' : 'comun\.mostrar'\) \| translate \}\}/);
  assert.match(html, /\[placeholder\]="'authentication\.login\.passwordPlaceholder' \| translate"/);
});

// ---- Pricing: el componente real, con un traductor de diccionario
function pricing(idioma) {
  const { PricingComponent } = cargarTs('src/app/components/pricing/pricing.component.ts', {
    modulos: { sweetalert2: { default: { fire: () => Promise.resolve({ isConfirmed: false }) } } },
  });
  const translate = {
    instant: (clave, params) => String(dics[idioma][clave] ?? clave)
      .replace(/\{\{\s*(\w+)\s*\}\}/g, (_, n) => (params && n in params ? params[n] : '')),
  };
  const c = new PricingComponent({ subscription$: { pipe: () => ({ subscribe() {} }) } }, translate);
  return c;
}

test('pricing: las etiquetas calculadas salen del diccionario del idioma y los datos del plan no cambian', () => {
  const es = pricing('es');
  const en = pricing('en');
  const pt = pricing('pt');
  const base = es.tiers[0];
  assert.equal(es.tierSalesLabel(base), 'Hasta $15M COP al mes');
  assert.equal(en.tierSalesLabel(base), 'Up to $15M COP per month');
  assert.equal(pt.tierSalesLabel(base), 'Até $15M COP por mês');
  const cumbre = es.tiers[es.tiers.length - 1];
  assert.equal(es.tierSalesLabel(cumbre), 'Más de $500M COP al mes');
  assert.equal(es.tierPrice(cumbre), 'A medida');
  assert.equal(en.tierPrice(cumbre), 'Custom');
  assert.equal(es.tierCurrencyLabel(base), 'USD / mes');
  assert.equal(en.tierCurrencyLabel(base), 'USD / month');
  assert.equal(es.tierCurrencyLabel(cumbre), 'Contacta a nuestro equipo');
  // Nombres de tramo, precios y topes: iguales que antes (los usa el cobro y los comprueba otra prueba).
  assert.deepEqual(JSON.parse(JSON.stringify(es.tiers.map(t => [t.name, t.priceUSD, t.maxSalesCOP]))),
    [['Base', 27, 15000000], ['Origen', 47, 30000000], ['Esencia', 77, 60000000], ['Impulso', 147, 150000000],
      ['Expansión', 247, 300000000], ['Liderazgo', 427, 500000000], ['Cumbre', 0, null]]);
  assert.equal(es.tierShortLabel(base), '$15M');
  assert.equal(es.tierPrice(base), '$27');
  // Estados de la factura.
  assert.equal(es.invoiceStatusLabel('paid'), 'Pagado');
  assert.equal(en.invoiceStatusLabel('paid'), 'Paid');
  assert.equal(es.invoiceStatusLabel('PENDING_MANUAL'), 'Pendiente de pago');
  assert.equal(pt.invoiceStatusLabel('overdue'), 'Vencida');
  assert.equal(es.invoiceStatusLabel('algo-raro'), 'Pendiente');
  assert.equal(en.invoiceStatusLabel(undefined), 'Pending');
  // Etiquetas del plan y del botón principal.
  es.subscriptionStateReady = false;
  assert.equal(es.currentPlanLabel, 'Cargando…');
  assert.equal(es.primaryBillingActionLabel, 'Cargando tu plan…');
  es.subscriptionStateReady = true;
  assert.equal(es.currentPlanLabel, 'Plan Gratis');
  assert.equal(en.currentPlanLabel, dics.en['comun.cargando'], 'sin estado listo se ve el texto de comun.cargando en el idioma');
});

test('pricing: período, método de pago y modo de cobro', () => {
  for (const idioma of ['es', 'en']) {
    const c = pricing(idioma);
    c.currentSubscription = { billingPeriod: 'yearly' };
    c.billingPeriodChoice = 'monthly';
    assert.equal(c.currentBillingPeriodLabel, dics[idioma]['pricing.period.yearly']);
    assert.equal(c.billingPeriodChoiceLabel, dics[idioma]['pricing.period.monthly']);
    c.billingInfo = { billingMode: 'manual', paymentMethod: { brand: 'VISA', lastFour: '4242' } };
    assert.equal(c.billingModeSummary, dics[idioma]['pricing.period.modeManual']);
    assert.equal(c.savedPaymentMethodLabel, dics[idioma]['pricing.card.endingIn'].replace('{{brand}}', 'VISA').replace('{{lastFour}}', '4242'));
    c.billingInfo = { billingMode: 'recurring', paymentMethod: null };
    assert.equal(c.billingModeSummary, dics[idioma]['pricing.period.modeAuto']);
    assert.equal(c.savedPaymentMethodLabel, dics[idioma]['pricing.card.authorized']);
  }
  assert.equal(dics.es['pricing.card.endingIn'], '{{brand}} terminada en {{lastFour}}');
});

test('pricing: las listas guardan claves y la plantilla las traduce; lo que viaja al servidor no cambia', () => {
  const c = pricing('es');
  assert.equal(c.freeFeatures.length, 7);
  assert.equal(c.paidFeatures.length, 8);
  for (const f of c.freeFeatures) assert.ok(dics.es[f.text], f.text);
  for (const f of c.paidFeatures) { assert.ok(dics.es[f.title], f.title); assert.ok(dics.es[f.text], f.text); }
  assert.deepEqual(JSON.parse(JSON.stringify(c.freeFeatures.map(f => f.enabled))), [true, true, true, true, true, true, false]);
  const html = leer('src/app/components/pricing/pricing.component.html');
  assert.match(html, /\{\{ feature\.text \| translate \}\}/);
  assert.match(html, /\{\{ feature\.title \| translate \}\}/);
  assert.match(html, /'pricing\.status\.annualDiscount' \| translate: \{ percent: annualDiscount \}/);
  assert.match(html, /\(click\)="activarPlan\(\)" \[disabled\]="billingActionDisabled"/);
  const ts = leer('src/app/components/pricing/pricing.component.ts');
  // El cobro, los períodos, la sesión y el correo de ventas siguen igual.
  for (const trozo of ["this.subscriptionService.upgradePlan('freemium')", 'this.subscriptionService.updateBillingPeriod(this.billingPeriodChoice)',
    "readonly publicPricingUrl = 'https://katuq.com/es/precios'", 'Math.round(monthly * 12 * 0.8',
    "window.location.href = 'mailto:soporte@katuq.com?subject=Plan%20Cumbre%20de%20Katuq'", "confirmButtonColor: '#b91c1c'"]) {
    assert.ok(ts.includes(trozo), trozo);
  }
  // Mensajes del servidor: se muestran como llegan; el texto propio es solo el respaldo.
  assert.match(ts, /text: response\?\.message \|\| this\.translate\.instant\('pricing\.cancel\.doneText'\)/);
  assert.match(ts, /text: error\?\.error\?\.message \|\| this\.translate\.instant\('pricing\.cancel\.failedText'\)/);
  assert.match(ts, /this\.billingPeriodMessage = response\?\.message \|\| this\.translate\.instant\('pricing\.period\.updated'\)/);
  assert.match(ts, /this\.billingPeriodError = error\?\.error\?\.message \|\| this\.translate\.instant\('pricing\.period\.updateFailed'\)/);
  assert.equal(dics.es['pricing.cancel.text'].includes('<strong>inmediata</strong>'), true, 'el Swal sigue pintando el énfasis con html');
  for (const idioma of IDIOMAS) assert.match(dics[idioma]['pricing.cancel.text'], /<strong>[^<]+<\/strong>/, idioma);
});
