'use strict';
/**
 * "Llenar con una foto": el código de los DOS formularios corriendo de verdad,
 * con formularios reactivos reales de Angular y servicios falsos (sin red, sin
 * navegador, sin cámara).
 *
 * Se carga la clase del componente transpilada y se ejecuta, igual que en
 * `tests/integrations/dian-invoice-composer.test.js`. Lo que prueba:
 *
 *  - Formulario VACÍO: se llena todo, la categoría queda marcada con la opción
 *    REAL, la foto queda como imagen principal y no se toca ningún precio.
 *  - Formulario con datos: UNA sola pregunta antes de pisar. Solo vacíos respeta
 *    lo escrito; reemplazar lo cambia; cancelar no toca nada.
 *  - Categoría que no existe en la tienda: no se inventa, se avisa.
 *  - Que el payload del formulario rápido sea el de siempre cuando no se usa la
 *    foto, y que "Registrar otro" no arrastre lo de la foto.
 *  - Que una ficha que llega TARDE (la persona ya guardó, pasó a "Registrar otro" o salió
 *    de la pantalla) se descarte sin llenar nada ni avisar nada; y que mientras se guarda
 *    no se pueda pedir otra lectura.
 *  - Que "Reemplazar con la foto" saque también la imagen principal que ya estaba SUBIDA.
 *  - Que la espera de la ficha tenga tope (si la red se cae a medias, el formulario se libera).
 *
 *   node --test tests/productos/ficha-desde-foto-componentes.test.js
 */
const assert = require('node:assert/strict');
const { test, before } = require('node:test');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
const { stringify, parse } = require('flatted');
require('ts-node').register({ transpileOnly: true, compilerOptions: { module: 'CommonJS' } });

const RAIZ = path.resolve(__dirname, '../..');
const mapper = require('../../src/app/shared/services/productos/ficha-desde-foto.mapper.ts');

let forms;
before(async () => {
  await import('@angular/compiler');
  forms = await import('@angular/forms');
});

/** Carga la PRIMERA clase del archivo, transpilada, con lo que necesite como globales. */
function cargarClase(relativa, extras = {}) {
  const archivo = path.join(RAIZ, relativa);
  const fuente = ts.createSourceFile(archivo, fs.readFileSync(archivo, 'utf8'), ts.ScriptTarget.Latest, true);
  const clase = fuente.statements.find(ts.isClassDeclaration);
  const js = ts.transpileModule(clase.getText(fuente), {
    compilerOptions: { target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.CommonJS, experimentalDecorators: true },
  }).outputText;
  const globales = {
    exports: {},
    console,
    Component: () => (valor) => valor,
    ViewChild: () => () => {},
    TabView: class {},
    Validators: forms.Validators,
    FormControl: forms.FormControl,
    FormGroup: forms.FormGroup,
    FormArray: forms.FormArray,
    parse,
    stringify,
    ...mapper,
    ...extras,
  };
  vm.runInNewContext(js, globales);
  return Object.values(globales.exports)[0];
}

/**
 * Lo que crea la clase dentro de `vm` vive en OTRO "realm": su `Array` no es el de esta prueba y
 * `deepStrictEqual` los distingue aunque tengan el mismo contenido. Se pasa por JSON para comparar contenido.
 */
const afuera = (valor) => JSON.parse(JSON.stringify(valor));

/** SweetAlert falso: anota cada llamada y deja que cada prueba decida qué contesta. */
function swalFalso() {
  const llamadas = [];
  return {
    llamadas,
    fire: (...args) => {
      llamadas.push(args);
      return Promise.resolve({});
    },
  };
}

const CATEGORIA_VELAS = { nombre: 'Velas', ruta: ['Hogar', 'Velas'], etiqueta: 'Hogar › Velas' };

function ficha(extra = {}) {
  return {
    nombre: 'Vela aromática de lavanda',
    descripcion: 'Una vela suave y cálida para el hogar.\n\nEl frasco de vidrio la hace elegante.',
    categoria: CATEGORIA_VELAS,
    colores: ['lila', 'transparente'],
    material: 'vidrio y cera',
    etiquetasSeo: ['vela aromática', 'lavanda', 'decoración del hogar'],
    imagenSinFondo: null,
    ...extra,
  };
}

function foto(nombre = 'vela.jpg') {
  const archivo = { name: nombre, type: 'image/jpeg', size: 1234 };
  return { paraIA: 'data:image/jpeg;base64,QUJD', paraProducto: archivo, vistaPrevia: `data:image/jpeg;base64,${nombre}` };
}

/**
 * Servicio de la ficha falso. `contestaFicha`: lo que devuelve `generar` (null = ya se le avisó a la
 * persona); `decision`: lo que contesta la pregunta de "¿pisar?" ('todo' | 'vacios' | null).
 */
function servicioFalso({ resultado, decision = 'vacios', falla = null } = {}) {
  const s = {
    generarLlamadas: 0,
    preguntas: [],
    avisos: [],
    /** El `sigueVigente` que la pantalla le pasó a la última lectura. */
    sigueVigente: null,
    async generar(archivo, sigueVigente) {
      s.generarLlamadas++;
      s.sigueVigente = sigueVigente || null;
      if (falla) throw falla;
      return resultado === undefined ? null : resultado;
    },
    async preguntarSiPisar(conflictos) {
      s.preguntas.push(conflictos);
      return decision;
    },
    avisarListo(texto) {
      s.avisos.push(texto);
    },
  };
  return s;
}

function eventoConArchivo(archivo) {
  return { target: { files: [archivo], value: 'C:\\fakepath\\vela.jpg' } };
}

/**
 * Servicio cuya lectura NO termina hasta que la prueba lo decide: así la prueba puede cambiar la
 * pantalla (guardar, "Registrar otro", salir) con la lectura en vuelo y luego soltar la respuesta.
 */
function servicioDiferido({ decision = 'vacios' } = {}) {
  const s = servicioFalso({ decision });
  let resolver;
  let rechazar;
  s.generar = (archivo, sigueVigente) => {
    s.generarLlamadas++;
    s.sigueVigente = sigueVigente || null;
    return new Promise((resolve, reject) => {
      resolver = resolve;
      rechazar = reject;
    });
  };
  s.liberar = (valor) => resolver(valor);
  s.fallar = (error) => rechazar(error);
  return s;
}

// ═══════════════════════════ Formulario rápido ═══════════════════════════════

function crearLite({ banderas = { productFromPhoto: true }, servicio, swal = swalFalso() } = {}) {
  const Lite = cargarClase('src/app/components/productos/crear-producto-lite/crear-producto-lite.component.ts', {
    Swal: swal,
    HttpEventType: {},
    Subscription: class {
      add() {}
      unsubscribe() {}
    },
    ImagenService: { porcentaje: () => null },
    urlImagenAbsoluta: (u) => u,
    limpiarReferencia: (x) => x,
    referenciaTieneEspacios: () => false,
    AVISO_REFERENCIA_CON_ESPACIOS: '',
    ProductDetailsComponent: class {},
  });
  const features = { isEnabled: (f) => banderas[f] === true };
  const comp = new Lite(new forms.FormBuilder(), {}, {}, {}, {}, {}, {}, features, servicio);
  // Las categorías de la tienda, como las deja `aplanarCategorias` al cargar.
  comp.categorias = [
    { etiqueta: 'Hogar', nodo: { label: 'Hogar', data: { nombre: 'Hogar' }, children: [] } },
    { etiqueta: 'Hogar › Velas', nodo: { label: 'Velas', data: { nombre: 'Velas' }, children: [] } },
    { etiqueta: 'Ropa › Accesorios', nodo: { label: 'Accesorios', data: { nombre: 'Accesorios' }, children: [] } },
  ];
  return { comp, swal };
}

test('rápido: la función solo se ofrece con la bandera prendida y al CREAR', () => {
  const apagada = crearLite({ banderas: {}, servicio: servicioFalso() }).comp;
  assert.equal(apagada.puedeLlenarConFoto, false);

  const otraBandera = crearLite({ banderas: { buyNowCod: true }, servicio: servicioFalso() }).comp;
  assert.equal(otraBandera.puedeLlenarConFoto, false);

  const noEsTrue = crearLite({ banderas: { productFromPhoto: 'true' }, servicio: servicioFalso() }).comp;
  assert.equal(noEsTrue.puedeLlenarConFoto, false, 'solo el booleano true prende la bandera');

  const prendida = crearLite({ servicio: servicioFalso() }).comp;
  assert.equal(prendida.puedeLlenarConFoto, true);

  prendida.productoOriginal = { cd: 'abc' };
  assert.equal(prendida.puedeLlenarConFoto, false, 'al editar un producto existente no se ofrece');
});

test('rápido: con el formulario vacío se llena todo, sin preguntar, y la foto queda como imagen principal', async () => {
  const f = foto();
  const servicio = servicioFalso({ resultado: { ficha: ficha(), foto: f } });
  const { comp } = crearLite({ servicio });
  const opcionVelas = comp.categorias[1];

  const evento = eventoConArchivo({ name: 'original.jpg' });
  await comp.alElegirFotoFicha(evento);

  assert.equal(evento.target.value, '', 'se limpia el input para poder elegir la MISMA foto otra vez');
  assert.equal(servicio.generarLlamadas, 1);
  assert.deepEqual(servicio.preguntas, [], 'sin datos escritos no se pregunta nada');

  const v = comp.formulario.getRawValue();
  assert.equal(v.titulo, 'Vela aromática de lavanda');
  assert.equal(v.descripcion, 'Una vela suave y cálida para el hogar.\n\nEl frasco de vidrio la hace elegante.');
  assert.equal(v.categoria, opcionVelas.nodo, 'queda marcada la opción REAL del selector (el mismo objeto)');

  assert.equal(comp.archivo, f.paraProducto);
  assert.equal(comp.vistaPrevia, f.vistaPrevia);
  assert.equal(comp.imagenSubida, null, 'la imagen se sube al GUARDAR, como siempre');
  assert.equal(comp.imagenEliminada, false);

  assert.equal(comp.fichaCaracteristicas, 'Material: vidrio y cera. Colores: lila y transparente.');
  assert.deepEqual(comp.fichaEtiquetas, ['vela aromática', 'lavanda', 'decoración del hogar']);

  assert.equal(servicio.avisos.length, 1);
  assert.match(servicio.avisos[0], /^Listo: llenamos título, descripción, categoría, características, etiquetas de búsqueda e imagen principal\./);
  assert.equal(comp.fichaCargando, false);
});

test('rápido: NUNCA toca el precio, el IVA, la referencia ni la disponibilidad', async () => {
  const servicio = servicioFalso({ resultado: { ficha: ficha({ precio: 59900, price: 5 }), foto: foto() } });
  const { comp } = crearLite({ servicio });
  const antes = comp.formulario.getRawValue();

  await comp.alElegirFotoFicha(eventoConArchivo({ name: 'x.jpg' }));
  const despues = comp.formulario.getRawValue();

  for (const campo of ['precioSinIva', 'porcentajeIva', 'referencia', 'tipoEntrega', 'tiempoEntrega', 'cantidadMinVenta', 'inventarioSeguridad', 'inventariable', 'marca', 'codigoBarras', 'activar', 'sellerCenter', 'paginaWeb', 'puntoDeVenta']) {
    assert.deepEqual(despues[campo], antes[campo], `${campo} no debía cambiar`);
  }
  const payload = comp.armarPayload();
  assert.equal(payload.precio.precioUnitarioSinIva, 0);
  assert.equal(payload.precio.precioUnitarioConIva, 0);
  assert.ok(!JSON.stringify(payload).includes('59900'));
});

test('rápido: el payload al guardar lleva lo de la foto; sin usar la foto es el de siempre', async () => {
  const intacto = crearLite({ servicio: servicioFalso() }).comp.armarPayload();
  assert.equal(intacto.crearProducto.caracAdicionales, '');
  assert.deepEqual(afuera(intacto.exposicion.etiquetas), []);

  const servicio = servicioFalso({ resultado: { ficha: ficha(), foto: foto() } });
  const { comp } = crearLite({ servicio });
  await comp.alElegirFotoFicha(eventoConArchivo({ name: 'x.jpg' }));
  const payload = comp.armarPayload();
  assert.equal(payload.crearProducto.titulo, 'Vela aromática de lavanda');
  assert.equal(payload.crearProducto.caracAdicionales, 'Material: vidrio y cera. Colores: lila y transparente.');
  assert.deepEqual(afuera(payload.exposicion.etiquetas), ['vela aromática', 'lavanda', 'decoración del hogar']);
  assert.equal(parse(payload.categorias).label, 'Velas');
  assert.deepEqual(afuera(payload.crearProducto.imagenesPrincipales), [], 'sin subir todavía: se sube al guardar');

  // Y el payload NO comparte el arreglo con el estado interno (no se puede mutar desde afuera).
  payload.exposicion.etiquetas.push('x');
  assert.equal(comp.fichaEtiquetas.length, 3);
});

test('rápido: "Registrar otro" no arrastra características ni etiquetas al producto siguiente', async () => {
  const servicio = servicioFalso({ resultado: { ficha: ficha(), foto: foto() } });
  const { comp } = crearLite({ servicio });
  comp.cargandoReferencia = false;
  await comp.alElegirFotoFicha(eventoConArchivo({ name: 'x.jpg' }));
  assert.ok(comp.fichaCaracteristicas && comp.fichaEtiquetas.length);

  comp.limpiar();
  assert.equal(comp.fichaCaracteristicas, '');
  assert.deepEqual(afuera(comp.fichaEtiquetas), []);
  assert.equal(comp.armarPayload().crearProducto.caracAdicionales, '');
  assert.equal(comp.formulario.getRawValue().titulo, '');
  assert.equal(comp.vistaPrevia, null);
});

test('rápido: quitar lo que sugirió la foto vacía características y etiquetas', async () => {
  const servicio = servicioFalso({ resultado: { ficha: ficha(), foto: foto() } });
  const { comp } = crearLite({ servicio });
  await comp.alElegirFotoFicha(eventoConArchivo({ name: 'x.jpg' }));
  comp.quitarDatosDeFoto();
  assert.equal(comp.fichaCaracteristicas, '');
  assert.deepEqual(afuera(comp.fichaEtiquetas), []);
});

test('rápido: con datos escritos UNA sola pregunta; "solo lo vacío" respeta lo que ya había', async () => {
  const fotoVieja = { name: 'mia.jpg' };
  const servicio = servicioFalso({ resultado: { ficha: ficha(), foto: foto() }, decision: 'vacios' });
  const { comp } = crearLite({ servicio });
  comp.formulario.patchValue({ titulo: 'Mi vela' });
  comp.archivo = fotoVieja;
  comp.vistaPrevia = 'data:image/jpeg;base64,MIA';

  await comp.alElegirFotoFicha(eventoConArchivo({ name: 'x.jpg' }));

  assert.deepEqual(servicio.preguntas, [['titulo', 'imagen']], 'una sola pregunta, con TODOS los campos en conflicto');
  const v = comp.formulario.getRawValue();
  assert.equal(v.titulo, 'Mi vela', 'lo escrito se respeta');
  assert.equal(comp.archivo, fotoVieja, 'la foto que ya había se respeta');
  assert.equal(comp.vistaPrevia, 'data:image/jpeg;base64,MIA');
  assert.equal(v.descripcion, 'Una vela suave y cálida para el hogar.\n\nEl frasco de vidrio la hace elegante.', 'lo vacío sí se llena');
  assert.match(servicio.avisos[0], /Dejamos como estaba: título e imagen principal\./);
});

test('rápido: "reemplazar" cambia lo escrito, incluida la imagen', async () => {
  const f = foto('nueva.jpg');
  const servicio = servicioFalso({ resultado: { ficha: ficha(), foto: f }, decision: 'todo' });
  const { comp } = crearLite({ servicio });
  comp.formulario.patchValue({ titulo: 'Mi vela', descripcion: 'Mi descripción' });
  comp.archivo = { name: 'mia.jpg' };
  comp.vistaPrevia = 'data:image/jpeg;base64,MIA';
  comp.imagenEliminada = true;

  await comp.alElegirFotoFicha(eventoConArchivo({ name: 'x.jpg' }));

  assert.deepEqual(servicio.preguntas, [['titulo', 'descripcion', 'imagen']]);
  const v = comp.formulario.getRawValue();
  assert.equal(v.titulo, 'Vela aromática de lavanda');
  assert.match(v.descripcion, /^Una vela suave/);
  assert.equal(comp.archivo, f.paraProducto);
  assert.equal(comp.vistaPrevia, f.vistaPrevia);
  assert.equal(comp.imagenEliminada, false);
});

test('rápido: cancelar la pregunta no toca absolutamente nada', async () => {
  const servicio = servicioFalso({ resultado: { ficha: ficha(), foto: foto() }, decision: null });
  const { comp } = crearLite({ servicio });
  comp.formulario.patchValue({ titulo: 'Mi vela' });
  const antes = JSON.stringify(comp.formulario.getRawValue());

  await comp.alElegirFotoFicha(eventoConArchivo({ name: 'x.jpg' }));

  assert.equal(JSON.stringify(comp.formulario.getRawValue()), antes);
  assert.equal(comp.vistaPrevia, null);
  assert.equal(comp.fichaCaracteristicas, '');
  assert.deepEqual(afuera(comp.fichaEtiquetas), []);
  assert.deepEqual(servicio.avisos, [], 'sin aviso de "listo": no se hizo nada');
  assert.equal(comp.fichaCargando, false);
});

test('rápido: una categoría que no existe en la tienda no se inventa y se le avisa a la persona', async () => {
  const inventada = { nombre: 'Mascotas', ruta: ['Hogar', 'Mascotas'], etiqueta: 'Hogar › Mascotas' };
  const servicio = servicioFalso({ resultado: { ficha: ficha({ categoria: inventada }), foto: foto() } });
  const { comp } = crearLite({ servicio });

  await comp.alElegirFotoFicha(eventoConArchivo({ name: 'x.jpg' }));
  assert.equal(comp.formulario.getRawValue().categoria, null);
  assert.match(servicio.avisos[0], /No encontramos una categoría de su tienda que calce con la foto: elíjala usted\./);
  assert.doesNotMatch(servicio.avisos[0], /llenamos[^.]*categoría/);

  // Y si la IA no devolvió categoría, también se avisa.
  const sinCategoria = servicioFalso({ resultado: { ficha: ficha({ categoria: null }), foto: foto() } });
  const otro = crearLite({ servicio: sinCategoria }).comp;
  await otro.alElegirFotoFicha(eventoConArchivo({ name: 'x.jpg' }));
  assert.equal(otro.formulario.getRawValue().categoria, null);
  assert.match(sinCategoria.avisos[0], /elíjala usted/);
});

test('rápido: una categoría que ya estaba elegida y es distinta se pregunta; la misma no', async () => {
  const servicio = servicioFalso({ resultado: { ficha: ficha(), foto: foto() }, decision: 'vacios' });
  const { comp } = crearLite({ servicio });
  comp.formulario.get('categoria').setValue(comp.categorias[2].nodo); // Ropa › Accesorios
  await comp.alElegirFotoFicha(eventoConArchivo({ name: 'x.jpg' }));
  assert.ok(servicio.preguntas[0].includes('categoria'));
  assert.equal(comp.formulario.getRawValue().categoria, comp.categorias[2].nodo, 'se respetó la elegida');

  const mismo = servicioFalso({ resultado: { ficha: ficha(), foto: foto() } });
  const otro = crearLite({ servicio: mismo }).comp;
  otro.formulario.get('categoria').setValue(otro.categorias[1].nodo); // Hogar › Velas, la misma que sugiere la foto
  await otro.alElegirFotoFicha(eventoConArchivo({ name: 'x.jpg' }));
  assert.ok(!(mismo.preguntas[0] || []).includes('categoria'), 'ya decía lo mismo: no hay conflicto');
});

test('rápido: si el servicio no devuelve ficha (ya avisó) o falla, el formulario queda como estaba', async () => {
  const sinFicha = servicioFalso({ resultado: null });
  const a = crearLite({ servicio: sinFicha });
  await a.comp.alElegirFotoFicha(eventoConArchivo({ name: 'x.jpg' }));
  assert.equal(a.comp.formulario.getRawValue().titulo, '');
  assert.equal(a.comp.fichaCargando, false);
  assert.equal(a.swal.llamadas.length, 0, 'el servicio ya le avisó a la persona: el componente no repite');

  const explota = servicioFalso({ falla: new Error('algo inesperado') });
  const swal = swalFalso();
  const b = crearLite({ servicio: explota, swal });
  const original = console.error;
  console.error = () => {};
  try {
    await b.comp.alElegirFotoFicha(eventoConArchivo({ name: 'x.jpg' }));
  } finally {
    console.error = original;
  }
  assert.equal(b.comp.formulario.getRawValue().titulo, '');
  assert.equal(b.comp.fichaCargando, false);
  assert.equal(swal.llamadas.length, 1);
  assert.deepEqual(swal.llamadas[0].slice(0, 2), ['No se pudo llenar con la foto', 'El formulario quedó como estaba. Intente de nuevo.']);
  assert.doesNotMatch(JSON.stringify(swal.llamadas), /algo inesperado/, 'el error técnico no se muestra');
});

test('rápido: sin archivo, o con una lectura en curso, no hace nada', async () => {
  const servicio = servicioFalso({ resultado: { ficha: ficha(), foto: foto() } });
  const { comp } = crearLite({ servicio });
  await comp.alElegirFotoFicha({ target: { files: [], value: '' } });
  await comp.alElegirFotoFicha({ target: { files: undefined, value: '' } });
  assert.equal(servicio.generarLlamadas, 0);

  comp.fichaCargando = true;
  await comp.alElegirFotoFicha(eventoConArchivo({ name: 'x.jpg' }));
  assert.equal(servicio.generarLlamadas, 0, 'mientras lee una foto, otra elección se ignora');
  assert.equal(comp.fichaCargando, true, 'y no le apaga el estado a la lectura que sigue en curso');
});

test('rápido: las etiquetas de la foto se SUMAN a las que ya hubiera', async () => {
  const servicio = servicioFalso({ resultado: { ficha: ficha(), foto: foto() }, decision: 'todo' });
  const { comp } = crearLite({ servicio });
  comp.fichaEtiquetas = ['regalo', 'Lavanda'];
  await comp.alElegirFotoFicha(eventoConArchivo({ name: 'x.jpg' }));
  assert.deepEqual(comp.fichaEtiquetas, ['regalo', 'Lavanda', 'vela aromática', 'decoración del hogar']);
});

test('rápido: mientras se lee una foto no se puede guardar (se mezclarían dos productos)', async () => {
  const { comp } = crearLite({ servicio: servicioFalso() });
  assert.equal(comp.formulario.touched, false);

  comp.fichaCargando = true;
  await comp.guardar();
  assert.equal(comp.formulario.touched, false, 'guardar() no hizo nada: ni siquiera validó');
  assert.equal(comp.guardando, false);

  comp.fichaCargando = false;
  await comp.guardar();
  assert.equal(comp.formulario.touched, true, 'sin lectura en curso, guardar() sigue validando como siempre');
});

test('rápido: mientras se guarda no se puede pedir otra lectura (la ficha se mezclaría con el producto que se guarda)', async () => {
  const servicio = servicioFalso({ resultado: { ficha: ficha(), foto: foto() } });
  const { comp } = crearLite({ servicio });
  comp.guardando = true;

  const evento = eventoConArchivo({ name: 'x.jpg' });
  await comp.alElegirFotoFicha(evento);

  assert.equal(servicio.generarLlamadas, 0, 'no se llamó al servicio');
  assert.equal(evento.target.value, '', 'igual se limpia el input para poder volver a elegir');
  assert.equal(comp.fichaCargando, false);
  assert.equal(comp.fichaCaracteristicas, '');
  assert.deepEqual(afuera(comp.fichaEtiquetas), []);
  assert.equal(comp.formulario.getRawValue().titulo, '');
  assert.deepEqual(servicio.avisos, []);
});

test('rápido: una ficha que llega DESPUÉS de "Registrar otro" no llena el formulario recién limpio', async () => {
  const servicio = servicioDiferido();
  const { comp } = crearLite({ servicio });
  comp.cargandoReferencia = false;

  const lectura = comp.alElegirFotoFicha(eventoConArchivo({ name: 'x.jpg' }));
  assert.equal(comp.fichaCargando, true);
  assert.equal(servicio.sigueVigente(), true, 'mientras nada cambia, la lectura sigue vigente');

  comp.limpiar(); // la persona pasó a registrar otro producto
  assert.equal(servicio.sigueVigente(), false, 'el servicio se entera: ya no vale la pena avisar un fallo');

  servicio.liberar({ ficha: ficha(), foto: foto() });
  await lectura;

  const v = comp.formulario.getRawValue();
  assert.equal(v.titulo, '', 'el formulario nuevo sigue vacío');
  assert.equal(v.descripcion, '');
  assert.equal(comp.fichaCaracteristicas, '', 'nada de la foto B se arrastra al producto siguiente');
  assert.deepEqual(afuera(comp.fichaEtiquetas), []);
  assert.equal(comp.archivo, null);
  assert.equal(comp.vistaPrevia, null);
  assert.deepEqual(servicio.avisos, [], 'ni el aviso de "Listo"');
  assert.equal(comp.fichaCargando, false);
});

test('rápido: una ficha que llega cuando ya se está guardando se descarta (el producto A no se guarda con lo de la foto B)', async () => {
  const servicio = servicioDiferido();
  const { comp } = crearLite({ servicio });

  const lectura = comp.alElegirFotoFicha(eventoConArchivo({ name: 'x.jpg' }));
  comp.guardando = true; // defensa: el botón de guardar ya está bloqueado mientras se lee, pero si algo lo dejara pasar
  servicio.liberar({ ficha: ficha(), foto: foto() });
  await lectura;

  assert.equal(comp.fichaCaracteristicas, '');
  assert.deepEqual(afuera(comp.fichaEtiquetas), []);
  assert.equal(comp.formulario.getRawValue().titulo, '');
  assert.equal(comp.armarPayload().crearProducto.caracAdicionales, '', 'el payload que se guarda no lleva lo de la foto');
  assert.deepEqual(servicio.avisos, []);
});

test('rápido: si la persona sale de la pantalla mientras se lee la foto, el resultado se descarta sin avisar nada', async () => {
  const servicio = servicioDiferido();
  const { comp, swal } = crearLite({ servicio });
  comp.loader = { releaseGlobalLoader() {} };
  comp.salirDeEdicion = () => {};

  const lectura = comp.alElegirFotoFicha(eventoConArchivo({ name: 'x.jpg' }));
  comp.ngOnDestroy();
  assert.equal(servicio.sigueVigente(), false);
  servicio.liberar({ ficha: ficha(), foto: foto() });
  await lectura;

  assert.equal(comp.formulario.getRawValue().titulo, '');
  assert.equal(comp.fichaCaracteristicas, '');
  assert.deepEqual(servicio.avisos, [], 'el aviso de "Listo" no aparece en otra pantalla');
  assert.equal(swal.llamadas.length, 0);
  assert.equal(comp.fichaCargando, false);
});

test('rápido: un fallo que llega con la pantalla ya cambiada tampoco se avisa; con la pantalla vigente sí', async () => {
  const original = console.error;
  console.error = () => {};
  try {
    const tarde = servicioDiferido();
    const a = crearLite({ servicio: tarde });
    a.comp.cargandoReferencia = false;
    const lecturaTarde = a.comp.alElegirFotoFicha(eventoConArchivo({ name: 'x.jpg' }));
    a.comp.limpiar();
    tarde.fallar(new Error('algo inesperado'));
    await lecturaTarde;
    assert.equal(a.swal.llamadas.length, 0, 'ya es otro producto: no se avisa');
    assert.equal(a.comp.fichaCargando, false);

    const vigente = servicioDiferido();
    const b = crearLite({ servicio: vigente });
    const lecturaVigente = b.comp.alElegirFotoFicha(eventoConArchivo({ name: 'x.jpg' }));
    vigente.fallar(new Error('algo inesperado'));
    await lecturaVigente;
    assert.equal(b.swal.llamadas.length, 1, 'con la pantalla vigente el aviso de siempre sigue saliendo');
  } finally {
    console.error = original;
  }
});

test('rápido: si la pantalla cambia mientras la persona contesta "¿pisar?", no se aplica nada', async () => {
  const servicio = servicioFalso({ resultado: { ficha: ficha(), foto: foto() }, decision: 'todo' });
  const { comp } = crearLite({ servicio });
  comp.cargandoReferencia = false;
  comp.formulario.patchValue({ titulo: 'Mi vela' });
  servicio.preguntarSiPisar = async (conflictos) => {
    servicio.preguntas.push(conflictos);
    comp.limpiar(); // mientras se decidía, la pantalla pasó a otro producto
    return 'todo';
  };

  await comp.alElegirFotoFicha(eventoConArchivo({ name: 'x.jpg' }));

  assert.equal(servicio.preguntas.length, 1);
  assert.equal(comp.formulario.getRawValue().titulo, '', 'el formulario limpio no se llenó');
  assert.equal(comp.fichaCaracteristicas, '');
  assert.deepEqual(servicio.avisos, []);
});

test('rápido: la lectura de siempre (sin que cambie nada) sigue aplicando y avisando', async () => {
  const servicio = servicioDiferido();
  const { comp } = crearLite({ servicio });
  const lectura = comp.alElegirFotoFicha(eventoConArchivo({ name: 'x.jpg' }));
  servicio.liberar({ ficha: ficha(), foto: foto() });
  await lectura;
  assert.equal(comp.formulario.getRawValue().titulo, 'Vela aromática de lavanda');
  assert.equal(servicio.avisos.length, 1);
});

// ═══════════════════════════ Formulario completo ═════════════════════════════

function arbolDelSelector() {
  const hogar = { label: 'Hogar', data: { nombre: 'Hogar' }, parent: undefined, children: [] };
  const velas = { label: 'Velas', data: { nombre: 'Velas' }, parent: hogar, children: [] };
  hogar.children.push(velas);
  const ropa = { label: 'Ropa', data: { nombre: 'Ropa' }, parent: undefined, children: [] };
  const accesorios = { label: 'Accesorios', data: { nombre: 'Accesorios' }, parent: ropa, children: [] };
  ropa.children.push(accesorios);
  return { arbol: [hogar, ropa], hogar, velas, ropa, accesorios };
}

function crearFull({ banderas = { productFromPhoto: true }, servicio, swal = swalFalso(), propiedades = {} } = {}) {
  const Full = cargarClase('src/app/components/productos/crear-productos/crear-productos.component.ts', {
    Swal: swal,
  });
  // Sin pasar por el constructor (levanta ~30 llamadas a servicios): solo lo que usan los métodos de la foto.
  const c = Object.create(Full.prototype);
  const fb = new forms.FormBuilder();
  const arbol = arbolDelSelector();
  const irATab = [];
  Object.assign(c, {
    features: { isEnabled: (f) => banderas[f] === true },
    fichaService: servicio,
    // Lo que el constructor (que aquí no corre) deja en su valor inicial.
    fichaCargando: false,
    generacionFicha: 0,
    saving: false,
    uploadingImages: false,
    procesandoImagenes: false,
    mostrarCrear: true,
    isDropshippingConfigMode: false,
    activeTabIndex: 0,
    crearProducto: fb.group({
      titulo: [''],
      descripcion: [''],
      caracAdicionales: [''],
      imagenesPrincipales: [''],
    }),
    categoriasForm: fb.group({ categorias: [''] }),
    exposicion: fb.group({ etiquetas: [[]] }),
    etiquetas: [],
    fileImg: [],
    filesNames: [],
    categorias: arbol.arbol,
    cdr: { detectChanges() {} },
    // Lo que toca el navegador, falso: la imagen "se convierte" en sí misma y la vista previa es un texto.
    convertToWebP: async (archivo) => archivo,
    generatePreviewImage: async (archivo, entrada) => {
      entrada.preview = `vista:${archivo.name}`;
    },
    irATab: (header) => irATab.push(header),
    ...propiedades,
  });
  return { c, swal, irATab, arbol };
}

test('completo: la función solo se ofrece con la bandera prendida, al crear y fuera de dropshipping', () => {
  assert.equal(crearFull({ banderas: {}, servicio: servicioFalso() }).c.puedeLlenarConFoto, false);
  assert.equal(crearFull({ banderas: { product3d: true }, servicio: servicioFalso() }).c.puedeLlenarConFoto, false);
  assert.equal(crearFull({ servicio: servicioFalso() }).c.puedeLlenarConFoto, true);
  assert.equal(crearFull({ servicio: servicioFalso(), propiedades: { mostrarCrear: false } }).c.puedeLlenarConFoto, false, 'editando');
  assert.equal(crearFull({ servicio: servicioFalso(), propiedades: { isDropshippingConfigMode: true } }).c.puedeLlenarConFoto, false);
});

test('completo: con el formulario vacío se llena todo; la descripción va en HTML y la categoría es el nodo REAL del selector', async () => {
  const f = foto('vela.jpg');
  const servicio = servicioFalso({ resultado: { ficha: ficha({ descripcion: 'Una vela <b>suave</b> & cálida.\n\nSegundo párrafo.' }), foto: f } });
  const { c, irATab, arbol } = crearFull({ servicio });

  const evento = eventoConArchivo({ name: 'original.jpg' });
  await c.alElegirFotoFicha(evento);

  assert.equal(evento.target.value, '');
  assert.equal(c.crearProducto.get('titulo').value, 'Vela aromática de lavanda');
  assert.equal(
    c.crearProducto.get('descripcion').value,
    '<p>Una vela &lt;b&gt;suave&lt;/b&gt; &amp; cálida.</p><p>Segundo párrafo.</p>',
    'el editor guarda HTML y lo que escriba la IA se escapa',
  );
  assert.equal(c.crearProducto.get('caracAdicionales').value, 'Material: vidrio y cera. Colores: lila y transparente.');
  assert.equal(c.categoriasForm.get('categorias').value, arbol.velas, 'el mismo nodo del selector (no una copia)');
  assert.deepEqual(c.etiquetas, ['vela aromática', 'lavanda', 'decoración del hogar']);
  assert.equal(c.exposicion.get('etiquetas').value, c.etiquetas, 'el control y la lista visible son el mismo arreglo');

  assert.equal(c.fileImg.length, 1);
  assert.equal(c.fileImg[0].tipo, 'principal');
  assert.equal(c.fileImg[0].img, f.paraProducto);
  assert.equal(c.fileImg[0].preview, 'vista:vela.jpg');
  assert.equal(c.filesNames.length, 1, 'fileImg y filesNames siempre del mismo largo: se suben juntos al guardar');
  assert.match(c.filesNames[0], /^vela-\d+-\d+\.jpg$/, 'nombre único, como en la subida manual');

  assert.deepEqual(irATab, ['Datos básicos'], 'estando en la pestaña de K.A.I. se lleva a la persona a lo que se llenó');
  assert.deepEqual(servicio.preguntas, []);
  assert.match(servicio.avisos[0], /^Listo: llenamos título, descripción, categoría, características, etiquetas de búsqueda e imagen principal\./);
});

test('completo: no se mueve de pestaña si la persona ya estaba en otra', async () => {
  const servicio = servicioFalso({ resultado: { ficha: ficha(), foto: foto() } });
  const { c, irATab } = crearFull({ servicio, propiedades: { activeTabIndex: 3 } });
  await c.alElegirFotoFicha(eventoConArchivo({ name: 'x.jpg' }));
  assert.deepEqual(irATab, []);
});

test('completo: NUNCA toca precio, dimensiones ni referencia (ni siquiera tiene a dónde)', async () => {
  const servicio = servicioFalso({ resultado: { ficha: ficha({ precio: 59900 }), foto: foto() } });
  const { c } = crearFull({ servicio });
  const fb = new forms.FormBuilder();
  c.precio = fb.group({ precioUnitarioSinIva: ['0'], precioUnitarioIva: ['0'] });
  c.identificacion = fb.group({ referencia: ['PRD-000001'], codigoBarras: ['PRD-000001'] });
  c.Dimensiones = fb.group({ largoProductoCm: [''] });
  const antes = JSON.stringify([c.precio.value, c.identificacion.value, c.Dimensiones.value]);

  await c.alElegirFotoFicha(eventoConArchivo({ name: 'x.jpg' }));

  assert.equal(JSON.stringify([c.precio.value, c.identificacion.value, c.Dimensiones.value]), antes);
});

test('completo: la descripción vacía del editor (HTML sin texto o el marcador) cuenta como vacía y se llena sin preguntar', async () => {
  for (const vacia of ['<p>&nbsp;</p>', '<p>Descripcion</p>', '']) {
    const servicio = servicioFalso({ resultado: { ficha: ficha(), foto: foto() } });
    const { c } = crearFull({ servicio });
    c.crearProducto.get('descripcion').setValue(vacia);
    await c.alElegirFotoFicha(eventoConArchivo({ name: 'x.jpg' }));
    assert.deepEqual(servicio.preguntas, [], `"${vacia}" no debía generar pregunta`);
    assert.match(c.crearProducto.get('descripcion').value, /^<p>Una vela suave/);
  }
});

test('completo: con una imagen principal pendiente, "solo lo vacío" la respeta y "reemplazar" la cambia (sin tocar las secundarias)', async () => {
  const armar = (decision) => {
    const servicio = servicioFalso({ resultado: { ficha: ficha(), foto: foto('nueva.jpg') }, decision });
    const t = crearFull({ servicio });
    t.c.fileImg.push({ img: { name: 'secundaria.webp' }, tipo: 'secundaria', preview: 's' }, { img: { name: 'mia.webp' }, tipo: 'principal', preview: 'p' });
    t.c.filesNames.push('secundaria-1.webp', 'mia-2.webp');
    return { ...t, servicio };
  };

  const respeta = armar('vacios');
  await respeta.c.alElegirFotoFicha(eventoConArchivo({ name: 'x.jpg' }));
  assert.deepEqual(respeta.servicio.preguntas, [['imagen']]);
  assert.deepEqual(respeta.c.fileImg.map((e) => e.img.name), ['secundaria.webp', 'mia.webp']);
  assert.deepEqual(respeta.c.filesNames, ['secundaria-1.webp', 'mia-2.webp']);

  const reemplaza = armar('todo');
  await reemplaza.c.alElegirFotoFicha(eventoConArchivo({ name: 'x.jpg' }));
  assert.deepEqual(reemplaza.c.fileImg.map((e) => [e.tipo, e.img.name]), [['secundaria', 'secundaria.webp'], ['principal', 'nueva.jpg']]);
  assert.equal(reemplaza.c.filesNames.length, reemplaza.c.fileImg.length);
  assert.equal(reemplaza.c.filesNames[0], 'secundaria-1.webp');
  assert.match(reemplaza.c.filesNames[1], /^nueva-\d+-\d+\.jpg$/);
});

test('completo: una imagen principal ya subida cuenta como existente (se pregunta)', async () => {
  const servicio = servicioFalso({ resultado: { ficha: ficha(), foto: foto() }, decision: 'vacios' });
  const { c } = crearFull({ servicio });
  c.crearProducto.get('imagenesPrincipales').setValue([{ urls: 'https://x/a.webp', path: 'Productos/a.webp' }]);
  await c.alElegirFotoFicha(eventoConArchivo({ name: 'x.jpg' }));
  assert.deepEqual(servicio.preguntas, [['imagen']]);
  assert.deepEqual(c.fileImg, [], 'con "solo lo vacío" no se agrega otra');
});

test('completo: con título escrito, cancelar no toca nada y reemplazar sí', async () => {
  const cancela = servicioFalso({ resultado: { ficha: ficha(), foto: foto() }, decision: null });
  const a = crearFull({ servicio: cancela });
  a.c.crearProducto.get('titulo').setValue('Mi vela');
  await a.c.alElegirFotoFicha(eventoConArchivo({ name: 'x.jpg' }));
  assert.equal(a.c.crearProducto.get('titulo').value, 'Mi vela');
  assert.equal(a.c.crearProducto.get('descripcion').value, '');
  assert.deepEqual(a.c.fileImg, []);
  assert.deepEqual(a.irATab, []);
  assert.deepEqual(cancela.avisos, []);

  const reemplaza = servicioFalso({ resultado: { ficha: ficha(), foto: foto() }, decision: 'todo' });
  const b = crearFull({ servicio: reemplaza });
  b.c.crearProducto.get('titulo').setValue('Mi vela');
  await b.c.alElegirFotoFicha(eventoConArchivo({ name: 'x.jpg' }));
  assert.equal(b.c.crearProducto.get('titulo').value, 'Vela aromática de lavanda');
});

test('completo: las etiquetas se SUMAN a las que ya hubiera', async () => {
  const servicio = servicioFalso({ resultado: { ficha: ficha(), foto: foto() }, decision: 'todo' });
  const { c } = crearFull({ servicio });
  c.etiquetas = ['regalo', 'Lavanda'];
  c.exposicion.get('etiquetas').setValue(c.etiquetas);
  await c.alElegirFotoFicha(eventoConArchivo({ name: 'x.jpg' }));
  assert.deepEqual(c.etiquetas, ['regalo', 'Lavanda', 'vela aromática', 'decoración del hogar']);
  assert.equal(c.exposicion.get('etiquetas').value, c.etiquetas);
});

test('completo: una categoría que no está en el árbol de la tienda no se inventa y se avisa', async () => {
  const inventada = { nombre: 'Mascotas', ruta: ['Hogar', 'Mascotas'], etiqueta: 'Hogar › Mascotas' };
  const servicio = servicioFalso({ resultado: { ficha: ficha({ categoria: inventada }), foto: foto() } });
  const { c } = crearFull({ servicio });
  await c.alElegirFotoFicha(eventoConArchivo({ name: 'x.jpg' }));
  assert.equal(c.categoriasForm.get('categorias').value, '');
  assert.match(servicio.avisos[0], /elíjala usted/);

  // Y si el árbol todavía no cargó, tampoco revienta.
  const sinArbol = crearFull({ servicio: servicioFalso({ resultado: { ficha: ficha(), foto: foto() } }), propiedades: { categorias: undefined } });
  await sinArbol.c.alElegirFotoFicha(eventoConArchivo({ name: 'x.jpg' }));
  assert.equal(sinArbol.c.categoriasForm.get('categorias').value, '');
  assert.equal(sinArbol.c.crearProducto.get('titulo').value, 'Vela aromática de lavanda', 'lo demás se llena igual');
});

test('completo: una categoría ya elegida (el nodo del selector) se reconoce por su ruta', async () => {
  const servicio = servicioFalso({ resultado: { ficha: ficha(), foto: foto() }, decision: 'vacios' });
  const { c, arbol } = crearFull({ servicio });
  c.categoriasForm.get('categorias').setValue(arbol.velas); // la MISMA que sugiere la foto
  await c.alElegirFotoFicha(eventoConArchivo({ name: 'x.jpg' }));
  assert.ok(!(servicio.preguntas[0] || []).includes('categoria'), 'ya decía lo mismo');
  assert.equal(c.categoriasForm.get('categorias').value, arbol.velas);

  const otra = servicioFalso({ resultado: { ficha: ficha(), foto: foto() }, decision: 'vacios' });
  const t = crearFull({ servicio: otra });
  t.c.categoriasForm.get('categorias').setValue(t.arbol.accesorios);
  await t.c.alElegirFotoFicha(eventoConArchivo({ name: 'x.jpg' }));
  assert.ok(otra.preguntas[0].includes('categoria'));
  assert.equal(t.c.categoriasForm.get('categorias').value, t.arbol.accesorios, 'la elegida se respeta');
});

test('completo: si el servicio no devuelve ficha o falla, el formulario queda como estaba y se apaga el estado de carga', async () => {
  const a = crearFull({ servicio: servicioFalso({ resultado: null }) });
  await a.c.alElegirFotoFicha(eventoConArchivo({ name: 'x.jpg' }));
  assert.equal(a.c.crearProducto.get('titulo').value, '');
  assert.equal(a.c.fichaCargando, false);

  const swal = swalFalso();
  const b = crearFull({ servicio: servicioFalso({ falla: new Error('boom técnico') }), swal });
  const original = console.error;
  console.error = () => {};
  try {
    await b.c.alElegirFotoFicha(eventoConArchivo({ name: 'x.jpg' }));
  } finally {
    console.error = original;
  }
  assert.equal(b.c.fichaCargando, false);
  assert.equal(b.c.crearProducto.get('titulo').value, '');
  assert.equal(swal.llamadas.length, 1);
  assert.doesNotMatch(JSON.stringify(swal.llamadas), /boom/);
});

test('completo: mientras se lee una foto no se puede guardar', async () => {
  const { c } = crearFull({ servicio: servicioFalso() });
  c.saving = false;
  c.fichaCargando = true;
  await c.guardarProductos();
  assert.equal(c.saving, false, 'guardarProductos() salió antes de empezar a guardar');
});

test('completo: "Reemplazar con la foto" saca también la imagen principal que ya estaba SUBIDA (la nueva queda de primera)', async () => {
  const subida = { urls: 'https://almacen/vieja.webp', path: 'Productos/vieja.webp', nombreImagen: 'vieja.webp' };
  const f = foto('nueva.jpg');
  const servicio = servicioFalso({ resultado: { ficha: ficha(), foto: f }, decision: 'todo' });
  const { c } = crearFull({ servicio });
  c.crearProducto.get('imagenesPrincipales').setValue([subida]);
  c.fileImg.push({ img: { name: 'secundaria.webp' }, tipo: 'secundaria', preview: 's' });
  c.filesNames.push('secundaria-1.webp');

  await c.alElegirFotoFicha(eventoConArchivo({ name: 'x.jpg' }));

  assert.deepEqual(servicio.preguntas, [['imagen']], 'se le preguntó: había una imagen principal');
  assert.deepEqual(afuera(c.crearProducto.get('imagenesPrincipales').value), [], 'la subida vieja dejó de ser la imagen principal');
  assert.deepEqual(c.fileImg.map((e) => [e.tipo, e.img.name]), [['secundaria', 'secundaria.webp'], ['principal', 'nueva.jpg']]);
  assert.equal(c.filesNames.length, c.fileImg.length);

  // Lo que hace `uploadPendingImages` al guardar: [...actuales, ...nuevas]. Con la subida vieja fuera, la nueva queda de primera.
  const alGuardar = [...c.crearProducto.get('imagenesPrincipales').value, { urls: 'https://almacen/nueva.webp', tipo: 'principal' }];
  assert.equal(alGuardar[0].urls, 'https://almacen/nueva.webp');
  assert.match(servicio.avisos[0], /imagen principal/);
});

test('completo: la imagen principal que dejó K.A.I. también se reemplaza; con "solo lo vacío" se respeta', async () => {
  const deKai = [{ urls: 'https://kai/foto.png', nombreImagen: 'principal' }];

  const reemplaza = servicioFalso({ resultado: { ficha: ficha(), foto: foto('nueva.jpg') }, decision: 'todo' });
  const a = crearFull({ servicio: reemplaza });
  a.c.crearProducto.get('imagenesPrincipales').setValue(deKai);
  await a.c.alElegirFotoFicha(eventoConArchivo({ name: 'x.jpg' }));
  assert.deepEqual(afuera(a.c.crearProducto.get('imagenesPrincipales').value), []);
  assert.equal(a.c.fileImg.length, 1);

  const respeta = servicioFalso({ resultado: { ficha: ficha(), foto: foto('nueva.jpg') }, decision: 'vacios' });
  const b = crearFull({ servicio: respeta });
  b.c.crearProducto.get('imagenesPrincipales').setValue(deKai);
  await b.c.alElegirFotoFicha(eventoConArchivo({ name: 'x.jpg' }));
  assert.deepEqual(afuera(b.c.crearProducto.get('imagenesPrincipales').value), deKai, 'sin autorizar, la imagen subida no se toca');
  assert.deepEqual(b.c.fileImg, []);
});

test('completo: sin ninguna imagen principal, la foto entra sin tocar nada más', async () => {
  const servicio = servicioFalso({ resultado: { ficha: ficha(), foto: foto('nueva.jpg') } });
  const { c } = crearFull({ servicio });
  await c.alElegirFotoFicha(eventoConArchivo({ name: 'x.jpg' }));
  assert.deepEqual(servicio.preguntas, []);
  assert.equal(c.fileImg.length, 1);
  assert.ok(!c.crearProducto.get('imagenesPrincipales').value || c.crearProducto.get('imagenesPrincipales').value.length === 0);
});

test('completo: mientras se guarda, se suben imágenes o se preparan no se puede pedir otra lectura', async () => {
  for (const estado of [{ saving: true }, { uploadingImages: true }, { procesandoImagenes: true }]) {
    const servicio = servicioFalso({ resultado: { ficha: ficha(), foto: foto() } });
    const { c } = crearFull({ servicio, propiedades: estado });
    const evento = eventoConArchivo({ name: 'x.jpg' });
    await c.alElegirFotoFicha(evento);
    assert.equal(servicio.generarLlamadas, 0, JSON.stringify(estado));
    assert.equal(evento.target.value, '');
    assert.equal(c.fichaCargando, false);
    assert.equal(c.crearProducto.get('titulo').value, '');
  }
});

test('completo: una ficha que llega cuando ya se está guardando, o con la pantalla cerrada, se descarta sin avisar', async () => {
  const guardando = servicioDiferido();
  const a = crearFull({ servicio: guardando });
  const lecturaA = a.c.alElegirFotoFicha(eventoConArchivo({ name: 'x.jpg' }));
  assert.equal(guardando.sigueVigente(), true);
  a.c.saving = true; // se empezó a guardar
  assert.equal(guardando.sigueVigente(), false);
  guardando.liberar({ ficha: ficha(), foto: foto() });
  await lecturaA;
  assert.equal(a.c.crearProducto.get('titulo').value, '');
  assert.deepEqual(a.c.fileImg, []);
  assert.deepEqual(guardando.avisos, []);

  const cerrada = servicioDiferido();
  const b = crearFull({ servicio: cerrada, propiedades: { subs: { unsubscribe() {} } } });
  const lecturaB = b.c.alElegirFotoFicha(eventoConArchivo({ name: 'x.jpg' }));
  b.c.ngOnDestroy(); // la persona salió de la pantalla
  assert.equal(cerrada.sigueVigente(), false);
  cerrada.liberar({ ficha: ficha(), foto: foto() });
  await lecturaB;
  assert.equal(b.c.crearProducto.get('titulo').value, '');
  assert.deepEqual(cerrada.avisos, [], 'el "Listo" no aparece en otra pantalla');
  assert.equal(b.swal.llamadas.length, 0);
  assert.equal(b.c.fichaCargando, false);
});

test('completo: un fallo que llega con la pantalla ya cerrada no se avisa; con la pantalla vigente sí', async () => {
  const original = console.error;
  console.error = () => {};
  try {
    const tarde = servicioDiferido();
    const a = crearFull({ servicio: tarde, propiedades: { subs: { unsubscribe() {} } } });
    const lecturaTarde = a.c.alElegirFotoFicha(eventoConArchivo({ name: 'x.jpg' }));
    a.c.ngOnDestroy();
    tarde.fallar(new Error('boom técnico'));
    await lecturaTarde;
    assert.equal(a.swal.llamadas.length, 0);

    const vigente = servicioDiferido();
    const b = crearFull({ servicio: vigente });
    const lecturaVigente = b.c.alElegirFotoFicha(eventoConArchivo({ name: 'x.jpg' }));
    vigente.fallar(new Error('boom técnico'));
    await lecturaVigente;
    assert.equal(b.swal.llamadas.length, 1);
  } finally {
    console.error = original;
  }
});

test('completo: si la pantalla se cierra mientras se prepara la imagen, no se avisa nada', async () => {
  const servicio = servicioFalso({ resultado: { ficha: ficha(), foto: foto() } });
  const { c } = crearFull({
    servicio,
    propiedades: {
      subs: { unsubscribe() {} },
      // La conversión de la imagen tarda; mientras tanto la persona sale de la pantalla.
      convertToWebP: async (archivo) => {
        c.ngOnDestroy();
        return archivo;
      },
    },
  });
  await c.alElegirFotoFicha(eventoConArchivo({ name: 'x.jpg' }));
  assert.deepEqual(servicio.avisos, []);
  assert.equal(c.fichaCargando, false);
});

// ═══════════════════════════ El servicio ═════════════════════════════════════

const { of, throwError, firstValueFrom, Observable } = require('rxjs');
const { map, finalize, timeout } = require('rxjs/operators');

/** Clase base falsa: `post` va al "http" falso que cada prueba arma. */
class BaseServiceFalso {
  constructor(http) {
    this.http = http;
  }
  post(url, body) {
    return this.http.post(url, body);
  }
}

function crearServicio({ post, puedeUsarIA = true, swal = swalFalso(), globalesDelNavegador = {}, plazoCorto = null } = {}) {
  /** Cada plazo con el que el servicio pidió esperar. `plazoCorto` lo acorta para poder probar la espera agotada sin esperar 70 s. */
  const plazos = [];
  const Servicio = cargarClase('src/app/shared/services/productos/ficha-desde-foto.service.ts', {
    Injectable: () => (valor) => valor,
    BaseService: BaseServiceFalso,
    firstValueFrom,
    map,
    finalize,
    timeout: (ms) => {
      plazos.push(ms);
      return timeout(plazoCorto == null ? ms : plazoCorto);
    },
    Swal: swal,
    ...globalesDelNavegador,
  });
  const refrescos = [];
  const llamadas = [];
  const http = {
    post: (url, body) => {
      llamadas.push({ url, body });
      return post(url, body);
    },
  };
  const servicio = new Servicio(
    http,
    { canUseAIFeature: (f) => (f === 'products' ? puedeUsarIA : true) },
    { refresh: () => refrescos.push(1) },
  );
  return { servicio, swal, refrescos, llamadas, plazos };
}

test('servicio: pide la ficha a la ruta nueva con SOLO la foto y refresca el contador de uso', async () => {
  const { servicio, llamadas, refrescos, plazos } = crearServicio({ post: () => of({ success: true, ficha: { ...ficha(), precio: 99 } }) });
  const resultado = await firstValueFrom(servicio.pedirFicha('data:image/jpeg;base64,QUJD'));
  assert.deepEqual(plazos, [mapper.TIEMPO_LIMITE_FICHA_MS], 'la espera de la ficha tiene tope');

  assert.deepEqual(afuera(llamadas), [{ url: '/v1/katuqintelligence/ficha-desde-foto', body: { imagen: 'data:image/jpeg;base64,QUJD' } }]);
  assert.equal(resultado.nombre, 'Vela aromática de lavanda');
  assert.ok(!('precio' in resultado), 'ni aunque el servidor lo mande');
  assert.equal(refrescos.length, 1);
});

test('servicio: una respuesta sin ficha utilizable se trata como "no identificamos el producto"', async () => {
  for (const respuesta of [null, {}, { success: false, message: 'Algo' }, { success: true }, { success: true, ficha: { nombre: '' } }, { success: true, ficha: 'texto' }]) {
    const { servicio, refrescos } = crearServicio({ post: () => of(respuesta) });
    await assert.rejects(firstValueFrom(servicio.pedirFicha('x')), (e) => e.status === 422 && e.error.code === 'FICHA_SIN_DATOS');
    assert.equal(refrescos.length, 1, 'el cupo se descontó en el servidor: se refresca igual');
  }
});

test('servicio: un error del servidor pasa tal cual y también refresca el contador', async () => {
  const error = { status: 503, error: { code: 'IA_NO_DISPONIBLE', message: 'No pudimos leer la foto en este momento.' } };
  const { servicio, refrescos } = crearServicio({ post: () => throwError(() => error) });
  await assert.rejects(firstValueFrom(servicio.pedirFicha('x')), (e) => e === error);
  assert.equal(refrescos.length, 1);
});

test('servicio: si el contador falla al refrescar, no daña la ficha', async () => {
  const { servicio } = crearServicio({ post: () => of({ success: true, ficha: ficha() }) });
  servicio.subscription = { refresh: () => { throw new Error('sin red'); } };
  const resultado = await firstValueFrom(servicio.pedirFicha('x'));
  assert.equal(resultado.nombre, 'Vela aromática de lavanda');
});

test('servicio: sin cupo de IA en el plan avisa con Swal y NO llama al servidor ni prepara la foto', async () => {
  const swal = swalFalso();
  const { servicio, llamadas } = crearServicio({ post: () => of({}), puedeUsarIA: false, swal });
  servicio.prepararFoto = async () => assert.fail('no debe leer la foto si no puede usar la IA');

  assert.equal(await servicio.generar({ name: 'x.jpg' }), null);
  assert.equal(llamadas.length, 0);
  assert.equal(swal.llamadas.length, 1);
  assert.equal(swal.llamadas[0][0].icon, 'info');
  assert.match(swal.llamadas[0][0].text, /Vuelva a intentar más tarde o pase a Premium/);
  assert.doesNotMatch(swal.llamadas[0][0].text, /mañana/, 'el cupo diario se renueva a las 7:00 p. m. en Colombia: "mañana" era falso');
  assert.doesNotMatch(JSON.stringify(swal.llamadas), /products|freemium|limit/i);
});

test('servicio: generar devuelve { ficha, foto } cuando todo sale bien', async () => {
  const f = foto();
  const { servicio, llamadas } = crearServicio({ post: () => of({ success: true, ficha: ficha() }) });
  servicio.prepararFoto = async () => f;
  const r = await servicio.generar({ name: 'x.jpg' });
  assert.equal(r.foto, f);
  assert.equal(r.ficha.nombre, 'Vela aromática de lavanda');
  assert.equal(llamadas[0].body.imagen, f.paraIA, 'a la IA viaja la copia reducida, no la original');
});

test('servicio: cada falla se traduce a un aviso en español, sin repetir lo que ya avisó el interceptor', async () => {
  const caso = async ({ post, preparar }) => {
    const swal = swalFalso();
    const { servicio } = crearServicio({ post, swal });
    if (preparar) servicio.prepararFoto = preparar;
    else servicio.prepararFoto = async () => foto();
    const resultado = await servicio.generar({ name: 'x.jpg' });
    assert.equal(resultado, null);
    return swal.llamadas;
  };

  // 403 (función apagada o límite del plan) y 401: el interceptor global ya avisó.
  assert.deepEqual(await caso({ post: () => throwError(() => ({ status: 403, error: { code: 'FEATURE_DISABLED', message: 'Esta función todavía no está activa' } })) }), []);
  assert.deepEqual(await caso({ post: () => throwError(() => ({ status: 401, error: { error: 'Token expirado' } })) }), []);

  // La IA no pudo: el mensaje que ya redactó el servidor.
  const ia = await caso({ post: () => throwError(() => ({ status: 503, error: { code: 'IA_NO_DISPONIBLE', message: 'No pudimos leer la foto en este momento. Intente de nuevo.' } })) });
  assert.equal(ia.length, 1);
  assert.equal(ia[0][0].title, 'K.A.I. no está disponible ahora');
  assert.equal(ia[0][0].text, 'No pudimos leer la foto en este momento. Intente de nuevo.');

  // Sin internet.
  const sinRed = await caso({ post: () => throwError(() => ({ status: 0, message: 'Http failure response for (unknown url): 0 Unknown Error' })) });
  assert.equal(sinRed[0][0].title, 'Sin conexión');
  assert.doesNotMatch(JSON.stringify(sinRed), /Http failure|Unknown Error/);

  // Un error raro: genérico, sin el texto técnico.
  const raro = await caso({ post: () => throwError(() => new TypeError("Cannot read properties of undefined (reading 'x')")) });
  assert.equal(raro[0][0].icon, 'error');
  assert.doesNotMatch(JSON.stringify(raro), /Cannot read|TypeError/);

  // La foto no sirve: ni siquiera se llama al servidor.
  let llamado = false;
  const mala = await caso({
    post: () => ((llamado = true), of({})),
    preparar: async () => {
      throw new mapper.FotoError('NO_ES_IMAGEN', mapper.MENSAJES_FOTO.NO_ES_IMAGEN);
    },
  });
  assert.equal(llamado, false);
  assert.equal(mala[0][0].text, mapper.MENSAJES_FOTO.NO_ES_IMAGEN);
});

test('servicio: si la red se cae a medias y nunca llega respuesta, se rinde con un aviso, cancela la petición y libera el contador', async () => {
  let cancelada = false;
  const nuncaResponde = new Observable(() => () => {
    cancelada = true; // el teardown: se desuscribió = el navegador aborta la petición
  });
  const swal = swalFalso();
  const { servicio, refrescos, plazos } = crearServicio({ post: () => nuncaResponde, swal, plazoCorto: 15 });
  servicio.prepararFoto = async () => foto();

  const resultado = await servicio.generar({ name: 'x.jpg' });

  assert.equal(resultado, null);
  assert.deepEqual(plazos, [mapper.TIEMPO_LIMITE_FICHA_MS]);
  assert.equal(cancelada, true, 'la petición en vuelo se cancela');
  assert.equal(refrescos.length, 1, 'el cupo ya se había descontado en el servidor: se refresca igual');
  assert.equal(swal.llamadas.length, 1);
  assert.equal(swal.llamadas[0][0].title, 'Tardó demasiado');
  assert.match(swal.llamadas[0][0].text, /Intente de nuevo/);
  assert.doesNotMatch(JSON.stringify(swal.llamadas), /Timeout|TimeoutError|rxjs|has occurred/i, 'sin el texto técnico');
});

test('servicio: el tiempo de espera del cliente es mayor al del servidor (55 s) y al del proxy (60 s)', () => {
  assert.ok(mapper.TIEMPO_LIMITE_FICHA_MS > 60000, 'el cliente espera más que el proxy: si llega un 504, es el 504 el que se muestra');
  assert.ok(mapper.TIEMPO_LIMITE_FICHA_MS <= 120000, 'pero no minutos');
});

test('servicio: si la pantalla ya cambió (sigueVigente = false) un fallo no se avisa; con una pantalla vigente sí', async () => {
  const post = () => throwError(() => ({ status: 503, error: { code: 'IA_NO_DISPONIBLE', message: 'No pudimos leer la foto en este momento.' } }));

  const tarde = swalFalso();
  const a = crearServicio({ post, swal: tarde });
  a.servicio.prepararFoto = async () => foto();
  assert.equal(await a.servicio.generar({ name: 'x.jpg' }, () => false), null);
  assert.equal(tarde.llamadas.length, 0, 'la pantalla ya es otra: el aviso saldría sobre algo que no existe');
  assert.equal(a.refrescos.length, 1, 'el contador se refresca igual');

  const vigente = swalFalso();
  const b = crearServicio({ post, swal: vigente });
  b.servicio.prepararFoto = async () => foto();
  assert.equal(await b.servicio.generar({ name: 'x.jpg' }, () => true), null);
  assert.equal(vigente.llamadas.length, 1);

  const sinArgumento = swalFalso();
  const c = crearServicio({ post, swal: sinArgumento });
  c.servicio.prepararFoto = async () => foto();
  await c.servicio.generar({ name: 'x.jpg' });
  assert.equal(sinArgumento.llamadas.length, 1, 'sin el argumento todo sigue como siempre');
});

test('servicio: la pregunta de "¿pisar?" traduce los tres botones', async () => {
  const preguntar = async (resultadoSwal) => {
    const swal = { llamadas: [], fire: (...a) => (swal.llamadas.push(a), Promise.resolve(resultadoSwal)) };
    const { servicio } = crearServicio({ post: () => of({}), swal });
    const decision = await servicio.preguntarSiPisar(['titulo', 'imagen']);
    return { decision, opciones: swal.llamadas[0][0] };
  };

  const reemplazar = await preguntar({ isConfirmed: true, isDenied: false, isDismissed: false });
  assert.equal(reemplazar.decision, 'todo');
  assert.equal((await preguntar({ isConfirmed: false, isDenied: true, isDismissed: false })).decision, 'vacios');
  assert.equal((await preguntar({ isConfirmed: false, isDenied: false, isDismissed: true })).decision, null);
  assert.equal((await preguntar({})).decision, null, 'cerrar con Escape o fuera del cuadro no toca nada');

  const { opciones } = reemplazar;
  assert.equal(opciones.confirmButtonText, 'Reemplazar con la foto');
  assert.equal(opciones.denyButtonText, 'Solo llenar lo vacío');
  assert.equal(opciones.cancelButtonText, 'Cancelar');
  assert.match(opciones.html, /título e imagen principal/);
  assert.doesNotMatch(opciones.html, /<script|onerror/i);
});

test('servicio: el aviso final es un toast que no tapa la pantalla', () => {
  const swal = swalFalso();
  const { servicio } = crearServicio({ post: () => of({}), swal });
  servicio.avisarListo('Listo: llenamos título.');
  const o = swal.llamadas[0][0];
  assert.equal(o.toast, true);
  assert.equal(o.title, 'Listo: llenamos título.');
  assert.equal(o.showConfirmButton, false);
  assert.ok(o.timer >= 5000);
});

// ── prepararFoto con un "navegador" falso ────────────────────────────────────

function navegadorFalso({ ancho = 4000, alto = 3000, falla = false } = {}) {
  const registro = { revocadas: [], lienzos: [], blobs: [] };
  class ImagenFalsa {
    set src(valor) {
      registro.src = valor;
      setTimeout(() => {
        if (falla) return this.onerror && this.onerror();
        this.naturalWidth = ancho;
        this.naturalHeight = alto;
        this.onload && this.onload();
      }, 0);
    }
  }
  class LectorFalso {
    readAsDataURL(archivo) {
      setTimeout(() => {
        this.result = `data:${archivo.type};base64,LEIDO(${archivo.name})`;
        this.onload && this.onload();
      }, 0);
    }
  }
  const document = {
    createElement: (tag) => {
      assert.equal(tag, 'canvas');
      const lienzo = {
        width: 0,
        height: 0,
        getContext: () => ({ fillStyle: '', fillRect() {}, drawImage() {} }),
        toDataURL: (tipo, calidad) => `data:${tipo};base64,IA(${lienzo.width}x${lienzo.height},q${calidad})`,
        toBlob: (cb, tipo, calidad) => {
          registro.blobs.push({ ancho: lienzo.width, alto: lienzo.height, tipo, calidad });
          cb(new Blob(['x'], { type: tipo }));
        },
      };
      registro.lienzos.push(lienzo);
      return lienzo;
    },
  };
  return {
    registro,
    globales: {
      Image: ImagenFalsa,
      FileReader: LectorFalso,
      File,
      Blob,
      document,
      URL: { createObjectURL: () => 'blob:falso', revokeObjectURL: (u) => registro.revocadas.push(u) },
      setTimeout,
    },
  };
}

function archivoFalso(nombre, tipo, bytes) {
  return { name: nombre, type: tipo, size: bytes };
}

test('prepararFoto: una foto JPG de 3 MB se usa tal cual para el producto y se reduce SOLO la copia de la IA', async () => {
  const nav = navegadorFalso({ ancho: 4000, alto: 3000 });
  const { servicio } = crearServicio({ post: () => of({}), globalesDelNavegador: nav.globales });
  const original = archivoFalso('IMG_1.jpg', 'image/jpeg', 3 * 1024 * 1024);

  const r = await servicio.prepararFoto(original);

  assert.equal(r.paraProducto, original, 'la original queda como imagen principal');
  assert.equal(r.paraIA, 'data:image/jpeg;base64,IA(1568x1176,q0.85)', 'la copia de la IA: lado largo 1568, JPG');
  assert.equal(r.vistaPrevia, 'data:image/jpeg;base64,LEIDO(IMG_1.jpg)');
  assert.deepEqual(nav.registro.blobs, [], 'no hubo que reducir la imagen del producto');
  assert.deepEqual(nav.registro.revocadas, ['blob:falso'], 'se libera la dirección temporal de la foto');
});

test('prepararFoto: una foto de iPhone (HEIC) o muy pesada se reduce a un JPG de hasta 2048 px para el producto', async () => {
  for (const [nombre, tipo, bytes] of [['IMG_2.HEIC', 'image/heic', 2 * 1024 * 1024], ['gigante.png', 'image/png', 9 * 1024 * 1024]]) {
    const nav = navegadorFalso({ ancho: 6000, alto: 4000 });
    const { servicio } = crearServicio({ post: () => of({}), globalesDelNavegador: nav.globales });
    const r = await servicio.prepararFoto(archivoFalso(nombre, tipo, bytes));

    assert.notEqual(r.paraProducto.name, nombre);
    assert.match(r.paraProducto.name, /^(IMG_2|gigante)\.jpg$/);
    assert.equal(r.paraProducto.type, 'image/jpeg');
    assert.deepEqual(nav.registro.blobs, [{ ancho: 2048, alto: 1365, tipo: 'image/jpeg', calidad: 0.9 }]);
    assert.match(r.paraIA, /IA\(1568x1045,q0\.85\)/);
    assert.deepEqual(nav.registro.revocadas, ['blob:falso']);
  }
});

test('prepararFoto: lo que no es una imagen o pesa más de 15 MB se rechaza ANTES de leerlo', async () => {
  const nav = navegadorFalso();
  const { servicio } = crearServicio({ post: () => of({}), globalesDelNavegador: nav.globales });
  await assert.rejects(servicio.prepararFoto(archivoFalso('a.pdf', 'application/pdf', 1000)), (e) => e.codigo === 'NO_ES_IMAGEN' && e.name === 'FotoError');
  await assert.rejects(servicio.prepararFoto(archivoFalso('b.jpg', 'image/jpeg', 16 * 1024 * 1024)), (e) => e.codigo === 'MUY_PESADA');
  assert.equal(nav.registro.src, undefined, 'ni siquiera se intentó abrir');
  assert.deepEqual(nav.registro.revocadas, []);
});

test('prepararFoto: una foto que el navegador no puede abrir da un aviso amable y libera la dirección temporal', async () => {
  const nav = navegadorFalso({ falla: true });
  const { servicio } = crearServicio({ post: () => of({}), globalesDelNavegador: nav.globales });
  await assert.rejects(
    servicio.prepararFoto(archivoFalso('rota.jpg', 'image/jpeg', 1000)),
    (e) => e.codigo === 'NO_SE_PUDO_LEER' && /No pudimos abrir esa foto/.test(e.message),
  );
  assert.deepEqual(nav.registro.revocadas, ['blob:falso']);
});

test('prepararFoto: una imagen sin medidas (un SVG sin tamaño) no revienta: aviso amable', async () => {
  const nav = navegadorFalso({ ancho: 0, alto: 0 });
  const { servicio } = crearServicio({ post: () => of({}), globalesDelNavegador: nav.globales });
  await assert.rejects(servicio.prepararFoto(archivoFalso('logo.svg', 'image/svg+xml', 500)), (e) => e.codigo === 'NO_SE_PUDO_LEER');
});
