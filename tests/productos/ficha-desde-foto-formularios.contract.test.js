'use strict';
/**
 * "Llenar con una foto" en los dos formularios de producto (el rápido y el
 * completo): contrato de cómo quedaron conectados.
 *
 * No arranca Angular: lee los fuentes, como las otras pruebas "contract" del
 * proyecto. Protege lo que más se rompe sin que nadie lo note:
 *
 *  1. La función nace APAGADA: el botón solo se pinta con la bandera
 *     `productFromPhoto` prendida, y solo al CREAR (no al editar).
 *  2. El HTTP va por un servicio que extiende BaseService (nunca HttpClient en un
 *     componente) y no usa window.confirm / alert / prompt (REGLA DURA: Swal).
 *  3. El relleno no toca precios: ni el código nuevo de los formularios ni el de
 *     la ficha mencionan un precio, un IVA o la referencia.
 *  4. En el formulario rápido, lo que la foto sugiere (características y
 *     etiquetas) arranca VACÍO, viaja en el payload solo si existe y se limpia al
 *     "Registrar otro": con la bandera apagada el payload es el de siempre.
 *  5. El flujo existente (K.A.I. y servicio de katuqintelligence) no se tocó.
 *  6. Estilos: plano, sin degradados, con el acento canónico.
 *
 *   node --test tests/productos/ficha-desde-foto-formularios.contract.test.js
 */
const assert = require('node:assert/strict');
const { test } = require('node:test');
const fs = require('node:fs');
const path = require('node:path');

const RAIZ = path.resolve(__dirname, '../..');
const leer = (relativa) => fs.readFileSync(path.join(RAIZ, relativa), 'utf8');

const LITE = 'src/app/components/productos/crear-producto-lite/crear-producto-lite.component';
const FULL = 'src/app/components/productos/crear-productos/crear-productos.component';
const SERVICIO = 'src/app/shared/services/productos/ficha-desde-foto.service.ts';
const MAPPER = 'src/app/shared/services/productos/ficha-desde-foto.mapper.ts';

const liteTs = leer(`${LITE}.ts`);
const liteHtml = leer(`${LITE}.html`);
const liteScss = leer(`${LITE}.scss`);
const fullTs = leer(`${FULL}.ts`);
const fullHtml = leer(`${FULL}.html`);
const servicio = leer(SERVICIO);
const mapper = leer(MAPPER);

/** Texto entre dos marcas (la primera inclusive). */
function entre(texto, desde, hasta) {
  const i = texto.indexOf(desde);
  assert.ok(i >= 0, `no se encontró «${desde}»`);
  const j = hasta ? texto.indexOf(hasta, i + desde.length) : texto.length;
  assert.ok(j > i, `no se encontró «${hasta}» después de «${desde}»`);
  return texto.slice(i, j);
}

/** Sin comentarios: así una palabra en una explicación no cuenta como código. */
function sinComentarios(texto) {
  return texto
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/^\s*\/\/.*$/gm, '');
}

// ── 1. Nace apagada ──────────────────────────────────────────────────────────

test('la bandera que se consulta existe en el catálogo del front y en el del backend', () => {
  const banderas = leer('src/app/shared/services/company-features.service.ts');
  assert.match(banderas, /'productFromPhoto'/);
  assert.match(liteTs, /isEnabled\("productFromPhoto"\)/);
  assert.match(fullTs, /isEnabled\("productFromPhoto"\)/);
});

test('formulario rápido: el bloque solo se pinta con la bandera prendida y SOLO al crear', () => {
  assert.match(liteTs, /get puedeLlenarConFoto\(\): boolean \{\s*return !this\.editando && this\.features\.isEnabled\("productFromPhoto"\);\s*\}/);
  const bloque = entre(liteHtml, '<!-- LLENAR CON UNA FOTO -->', '<!-- K.A.I. -->');
  assert.match(bloque, /<section[^>]*\*ngIf="puedeLlenarConFoto"/);
  assert.match(bloque, /alElegirFotoFicha\(\$event\)/);
  assert.match(bloque, /type="file" accept="image\/\*"/);
  // Nada del bloque nuevo está fuera de ese *ngIf: el único elemento raíz es la sección.
  assert.equal((bloque.match(/<section/g) || []).length, 1);
});

test('formulario completo: el botón solo se pinta con la bandera, al crear y fuera de la configuración de dropshipping', () => {
  assert.match(
    fullTs,
    /get puedeLlenarConFoto\(\): boolean \{\s*return !!this\.mostrarCrear && !this\.isDropshippingConfigMode && this\.features\.isEnabled\("productFromPhoto"\);\s*\}/,
  );
  const bloque = entre(fullHtml, '<ng-container *ngIf="puedeLlenarConFoto">', '</ng-container>');
  assert.match(bloque, /alElegirFotoFicha\(\$event\)/);
  assert.match(bloque, /Llenar con una foto/);
  assert.equal((fullHtml.match(/puedeLlenarConFoto/g) || []).length, 1, 'un solo punto de entrada en el HTML');
});

test('mientras se lee una foto el botón de guardar queda bloqueado en los dos formularios', () => {
  assert.match(liteHtml, /<button type="submit" class="lite-btn lite-btn--primary" \[disabled\]="guardando \|\| fichaCargando">/);
  assert.match(fullHtml, /\(click\)="guardarProductos\(\)"\s*\[disabled\]="saving \|\| uploadingImages \|\| procesandoImagenes \|\| fichaCargando"/);
  assert.match(liteTs, /async guardar\(\): Promise<void> \{\s*(?:\/\/[^\n]*\n\s*)?if \(this\.guardando \|\| this\.fichaCargando\) return;/);
  assert.match(fullTs, /async guardarProductos\(\) \{\s*(?:\/\/[^\n]*\n\s*)?if \(this\.saving \|\| this\.fichaCargando\) \{\s*return;/);
});

test('formulario rápido: el botón de la foto también se bloquea mientras se guarda, y el manejador no corre guardando', () => {
  const bloque = entre(liteHtml, '<!-- LLENAR CON UNA FOTO -->', '<!-- K.A.I. -->');
  assert.match(bloque, /\[disabled\]="fichaCargando \|\| guardando"/);
  assert.match(liteTs, /if \(!archivo \|\| this\.fichaCargando \|\| this\.guardando\) return;/);
});

test('una ficha que llega tarde se descarta: la pantalla cuenta cuándo deja de ser "el producto de esta lectura"', () => {
  // Formulario rápido: guardar, "Registrar otro" y salir de la pantalla invalidan la lectura en vuelo.
  assert.match(liteTs, /private generacionFicha = 0;/);
  assert.match(liteTs, /private fichaVigente\(generacion: number\): boolean \{\s*return generacion === this\.generacionFicha && !this\.guardando;\s*\}/);
  const guardar = entre(liteTs, 'async guardar(): Promise<void> {', 'private referenciaEstaLibre');
  assert.match(guardar, /this\.guardando = true;\s*(?:\/\/[^\n]*\n\s*)?this\.generacionFicha\+\+;/);
  const limpiar = entre(liteTs, 'private limpiar(): void {', 'irAlImportador(): void {');
  assert.match(limpiar, /this\.generacionFicha\+\+;/);
  const destruir = entre(liteTs, 'ngOnDestroy(): void {', '// ─── Referencia');
  assert.match(destruir, /this\.generacionFicha\+\+;/);
  assert.match(liteTs, /this\.fichaService\.generar\(archivo, \(\) => this\.fichaVigente\(generacion\)\)/);

  // Formulario completo: empezar a guardar y salir de la pantalla.
  assert.match(fullTs, /private generacionFicha = 0;/);
  assert.match(fullTs, /private fichaVigente\(generacion: number\): boolean \{\s*return generacion === this\.generacionFicha && !this\.saving;\s*\}/);
  const guardarCompleto = entre(fullTs, 'async guardarProductos() {', 'async editarProducto() {');
  assert.match(guardarCompleto, /this\.saving = true;\s*(?:\/\/[^\n]*\n\s*)?this\.generacionFicha\+\+;/);
  assert.match(entre(fullTs, '  ngOnDestroy() {', '}\n}'), /this\.generacionFicha\+\+;/);
  assert.match(fullTs, /this\.fichaService\.generar\(archivo, \(\) => this\.fichaVigente\(generacion\)\)/);
  assert.match(fullTs, /if \(!archivo \|\| this\.fichaCargando \|\| this\.saving \|\| this\.uploadingImages \|\| this\.procesandoImagenes\) \{\s*return;/);
});

test('la espera de la ficha tiene tope en el cliente: timeout antes de leer la respuesta', () => {
  assert.match(servicio, /import \{ finalize, map, timeout \} from 'rxjs\/operators';/);
  assert.match(servicio, /\{ imagen: fotoParaIA \}\)\.pipe\(\s*timeout\(TIEMPO_LIMITE_FICHA_MS\),\s*map\(/);
  assert.match(mapper, /export const TIEMPO_LIMITE_FICHA_MS = 70000;/);
});

test('ambos componentes exponen las banderas con el servicio compartido (no leen localStorage por su cuenta)', () => {
  for (const ts of [liteTs, fullTs]) {
    assert.match(ts, /import \{ CompanyFeaturesService \} from "\.\.\/\.\.\/\.\.\/shared\/services\/company-features\.service"/);
    assert.match(ts, /public features: CompanyFeaturesService/);
    assert.match(ts, /private fichaService: FichaDesdeFotoService/);
  }
  const nuevoLite = entre(liteTs, '// ─── Llenar con una foto', '// ─── Canales de venta');
  const nuevoFull = entre(fullTs, '// ─── Llenar con una foto (bandera productFromPhoto)', '// UTILIDAD: Convierte una imagen a formato WebP');
  for (const codigo of [nuevoLite, nuevoFull]) {
    assert.doesNotMatch(sinComentarios(codigo), /localStorage|sessionStorage/);
  }
});

// ── 2. HTTP por BaseService, y Swal en vez de confirm ───────────────────────

test('el HTTP va por un servicio que extiende BaseService: ningún componente usa HttpClient', () => {
  assert.match(servicio, /@Injectable\(\{\s*providedIn: 'root',?\s*\}\)/);
  assert.match(servicio, /export class FichaDesdeFotoService extends BaseService/);
  assert.match(servicio, /import \{ BaseService \} from '\.\.\/base\.service'/);
  assert.match(servicio, /this\.post<RespuestaFichaDesdeFoto>\('\/v1\/katuqintelligence\/ficha-desde-foto', \{ imagen: fotoParaIA \}\)/);
  for (const ts of [liteTs, fullTs]) {
    const nuevo = ts.includes('// ─── Canales de venta')
      ? entre(ts, '// ─── Llenar con una foto', '// ─── Canales de venta')
      : entre(ts, '// ─── Llenar con una foto (bandera productFromPhoto)', '// UTILIDAD: Convierte una imagen a formato WebP');
    assert.doesNotMatch(sinComentarios(nuevo), /HttpClient|\bhttp\b|\.post\(|\.put\(|\.delete\(|fetch\(/);
  }
});

test('REGLA DURA: nada de window.confirm / alert / prompt; los avisos son SweetAlert', () => {
  for (const [nombre, codigo] of [['servicio', servicio], ['mapper', mapper]]) {
    assert.doesNotMatch(sinComentarios(codigo), /\b(?:window\.)?(?:confirm|alert|prompt)\s*\(/, nombre);
  }
  assert.doesNotMatch(sinComentarios(servicio), /showUpgradeModal/, 'ese método usa confirm(): no se llama');
  assert.match(servicio, /import Swal from 'sweetalert2'/);
});

// ── 3. No toca precios ───────────────────────────────────────────────────────

test('el relleno no menciona precios, IVA ni la referencia del producto', () => {
  const nuevoLite = sinComentarios(entre(liteTs, '// ─── Llenar con una foto', '// ─── Canales de venta'));
  const nuevoFull = sinComentarios(entre(fullTs, '// ─── Llenar con una foto (bandera productFromPhoto)', '// UTILIDAD: Convierte una imagen a formato WebP'));
  for (const [nombre, codigo] of [['rápido', nuevoLite], ['completo', nuevoFull], ['servicio', sinComentarios(servicio)]]) {
    assert.doesNotMatch(codigo, /precio|iva\b|valorIva|referencia|cantidadDisponible|inventario/i, `formulario ${nombre}`);
  }
  // El tipo de la ficha no tiene ni un campo de precio.
  const tipoFicha = entre(mapper, 'export interface FichaDesdeFoto {', '}');
  assert.doesNotMatch(tipoFicha, /precio|price|iva/i);
});

// ── 4. Formulario rápido: lo que la foto sugiere ─────────────────────────────

test('formulario rápido: características y etiquetas de la foto arrancan vacías, así el payload es el de siempre', () => {
  assert.match(liteTs, /fichaCaracteristicas = "";/);
  assert.match(liteTs, /fichaEtiquetas: string\[\] = \[\];/);
  assert.match(liteTs, /caracAdicionales: this\.fichaCaracteristicas,/);
  assert.match(liteTs, /etiquetas: \[\.\.\.this\.fichaEtiquetas\],/);
  // Y no quedó el literal viejo en esos dos sitios del payload.
  const payload = entre(liteTs, 'private armarPayload(): any {', 'private limpiar(): void {');
  assert.doesNotMatch(payload, /caracAdicionales: "",/);
  assert.doesNotMatch(payload, /etiquetas: \[\],/);
});

test('formulario rápido: "Registrar otro" no arrastra lo de la foto al producto siguiente', () => {
  const limpiar = entre(liteTs, 'private limpiar(): void {', 'irAlImportador(): void {');
  assert.match(limpiar, /this\.quitarDatosDeFoto\(\);/);
  assert.match(liteTs, /quitarDatosDeFoto\(\): void \{\s*this\.fichaCaracteristicas = "";\s*this\.fichaEtiquetas = \[\];\s*\}/);
});

test('formulario rápido: la edición de un producto existente no usa nada de esto', () => {
  const edicion = entre(liteTs, 'private armarPayloadEdicion(): any {', 'private salirDeEdicion(): void {');
  assert.doesNotMatch(edicion, /ficha/i, 'el payload de edición no incluye datos de la foto');
});

// ── 5. El flujo existente no se tocó ─────────────────────────────────────────

test('K.A.I. y el servicio de katuqintelligence siguen como estaban', () => {
  assert.match(liteHtml, /<app-katuqintelligence/);
  assert.match(liteTs, /katuqIntelligeceResponse\(evento: any\): void \{/);
  assert.match(fullHtml, /<app-katuqintelligence/);
  assert.match(fullTs, /katuqIntelligeceResponse\(event: any\) \{/);
  const kai = leer('src/app/shared/services/katuqintelligence/katuqintelligence.service.ts');
  assert.doesNotMatch(kai, /ficha-desde-foto|FichaDesdeFoto/);
  assert.match(kai, /'\/v1\/katuqintelligence\/ia'/);
});

// ── 6. Estilos ───────────────────────────────────────────────────────────────

test('los estilos nuevos son planos (sin degradados) y usan los tokens del tema canónico', () => {
  const nuevo = entre(liteScss, '// ─── Llenar con una foto (bandera productFromPhoto)');
  assert.doesNotMatch(nuevo, /gradient\(/i);
  assert.doesNotMatch(nuevo, /#2196f3|#4361ee|#2563eb|#5c6ac4|#667eea/i, 'sin primaries paralelos');
  assert.match(nuevo, /var\(--k-accent\)/);
});
