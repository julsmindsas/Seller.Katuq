import {
  BotonPlantilla,
  CategoriaPlantilla,
  ComponentePlantilla,
  EntradaPlantilla,
  PlantillaConsola,
  TipoBoton,
  TipoEncabezado,
} from '../../../../../../shared/services/messaging/whatsapp-consola.models';
import { EtiquetaColor } from '../../utils/salud-numero';

/** Límites de Meta que la pantalla avisa antes de enviar (el servidor igual los valida). */
export const LIMITES_PLANTILLA = {
  titulo: { min: 3, max: 60 },
  cuerpo: { min: 10, max: 1024 },
  encabezadoTexto: 60,
  pie: 60,
  botones: 3,
  textoBoton: 25,
  imagenBytes: 5 * 1024 * 1024,
} as const;

export const MIMES_IMAGEN = ['image/jpeg', 'image/png'];

/** Imagen de muestra del encabezado: el archivo viaja al servidor, que se la pasa a Meta (no se guarda en Katuq). */
export interface ImagenEncabezado {
  base64: string;
  mime: string;
  nombre: string;
  /** `data:` para la vista previa. */
  vistaPrevia: string;
}

/** Lo que el administrador escribe en el formulario. */
export interface PlantillaFormulario {
  titulo: string;
  categoria: CategoriaPlantilla;
  encabezadoTipo: TipoEncabezado | '';
  encabezadoTexto: string;
  imagen: ImagenEncabezado | null;
  cuerpo: string;
  pie: string;
  botones: BotonPlantilla[];
}

export function formularioVacio(): PlantillaFormulario {
  return {
    titulo: '',
    categoria: 'MARKETING',
    encabezadoTipo: '',
    encabezadoTexto: '',
    imagen: null,
    cuerpo: '',
    pie: '',
    botones: [],
  };
}

/** Claves de traducción de lo que falta corregir; vacío = lista para enviar. */
export function problemasFormulario(f: PlantillaFormulario): string[] {
  const p: string[] = [];
  const titulo = f.titulo.trim();
  const cuerpo = f.cuerpo.trim();
  if (titulo.length < LIMITES_PLANTILLA.titulo.min) p.push('consolaWhatsapp.plantillas.errores.titulo');
  if (cuerpo.length < LIMITES_PLANTILLA.cuerpo.min) p.push('consolaWhatsapp.plantillas.errores.cuerpoCorto');
  if (cuerpo.length > LIMITES_PLANTILLA.cuerpo.max) p.push('consolaWhatsapp.plantillas.errores.cuerpoLargo');
  // Regla de Meta: el mensaje no puede empezar ni terminar con una variable.
  if (/^\{\s*nombre\s*\}/i.test(cuerpo) || /\{\s*nombre\s*\}$/i.test(cuerpo)) {
    p.push('consolaWhatsapp.plantillas.errores.variableEnExtremo');
  }
  if (f.encabezadoTipo === 'TEXT') {
    const t = f.encabezadoTexto.trim();
    if (!t) p.push('consolaWhatsapp.plantillas.errores.encabezadoVacio');
    else if (t.length > LIMITES_PLANTILLA.encabezadoTexto) p.push('consolaWhatsapp.plantillas.errores.encabezadoLargo');
  }
  if (f.encabezadoTipo === 'IMAGE' && !f.imagen) p.push('consolaWhatsapp.plantillas.errores.imagenFalta');
  if (f.pie.trim().length > LIMITES_PLANTILLA.pie) p.push('consolaWhatsapp.plantillas.errores.pieLargo');
  if (f.botones.length > LIMITES_PLANTILLA.botones) p.push('consolaWhatsapp.plantillas.errores.muchosBotones');
  f.botones.forEach((b) => {
    const texto = (b.texto || '').trim();
    if (!texto) p.push('consolaWhatsapp.plantillas.errores.botonSinTexto');
    else if (texto.length > LIMITES_PLANTILLA.textoBoton) p.push('consolaWhatsapp.plantillas.errores.botonTextoLargo');
    if (b.tipo === 'URL' && !/^https?:\/\/\S+\.\S+/i.test((b.url || '').trim())) p.push('consolaWhatsapp.plantillas.errores.botonEnlace');
    // El enlace del botón es fijo: Meta lo acepta con variable, pero la consola no la ofrece.
    if (b.tipo === 'URL' && /\{/.test(b.url || '')) p.push('consolaWhatsapp.plantillas.errores.botonEnlaceVariable');
    if (b.tipo === 'PHONE_NUMBER' && (b.telefono || '').replace(/\D/g, '').length < 7) p.push('consolaWhatsapp.plantillas.errores.botonTelefono');
  });
  return Array.from(new Set(p));
}

/** Cuerpo del `POST lines/:lineId/templates`. */
export function entradaDeFormulario(f: PlantillaFormulario): EntradaPlantilla {
  const entrada: EntradaPlantilla = {
    titulo: f.titulo.trim(),
    mensaje: f.cuerpo.trim(),
    categoria: f.categoria,
  };
  if (f.encabezadoTipo === 'TEXT') {
    entrada.encabezado = { tipo: 'TEXT', texto: f.encabezadoTexto.trim() };
  } else if (f.encabezadoTipo === 'IMAGE' && f.imagen) {
    entrada.encabezado = { tipo: 'IMAGE', imagenBase64: f.imagen.base64, mime: f.imagen.mime };
  }
  const pie = f.pie.trim();
  if (pie) entrada.pie = pie;
  if (f.botones.length) {
    entrada.botones = f.botones.map((b) => {
      const boton: BotonPlantilla = { tipo: b.tipo, texto: b.texto.trim() };
      if (b.tipo === 'URL') boton.url = (b.url || '').trim();
      if (b.tipo === 'PHONE_NUMBER') boton.telefono = (b.telefono || '').trim();
      return boton;
    });
  }
  return entrada;
}

function componente(p: PlantillaConsola, tipo: string): ComponentePlantilla | undefined {
  return (p.componentes || []).find((c) => String(c?.type).toUpperCase() === tipo);
}

/** Meta guarda la variable como `{{1}}`; en el formulario es `{nombre}`. */
function variableANombre(texto: string): string {
  return String(texto || '').replace(/\{\{\s*1\s*\}\}/g, '{nombre}');
}

/**
 * «Duplicar»: prellena el formulario con lo que tiene una plantilla. La imagen de muestra no se puede
 * traer de Meta, así que si el encabezado era una imagen la persona la vuelve a subir.
 */
export function formularioDesdePlantilla(p: PlantillaConsola, sufijoCopia: string): PlantillaFormulario {
  const f = formularioVacio();
  const base = p.name.replace(/_+/g, ' ').replace(/\s+\d{6,}$/, '').trim();
  f.titulo = `${base.charAt(0).toUpperCase()}${base.slice(1)} ${sufijoCopia}`.trim().slice(0, LIMITES_PLANTILLA.titulo.max);
  f.categoria = String(p.category || '').toUpperCase() === 'UTILITY' ? 'UTILITY' : 'MARKETING';

  const encabezado = componente(p, 'HEADER');
  const formato = String(encabezado?.format || '').toUpperCase();
  if (formato === 'TEXT') {
    f.encabezadoTipo = 'TEXT';
    f.encabezadoTexto = variableANombre(encabezado?.text || '');
  } else if (formato === 'IMAGE') {
    f.encabezadoTipo = 'IMAGE';
  }

  f.cuerpo = variableANombre(componente(p, 'BODY')?.text || p.bodyText || '');
  f.pie = componente(p, 'FOOTER')?.text || '';

  const botones = componente(p, 'BUTTONS')?.buttons || [];
  f.botones = botones
    .filter((b) => ['QUICK_REPLY', 'URL', 'PHONE_NUMBER'].includes(String(b?.type).toUpperCase()))
    .slice(0, LIMITES_PLANTILLA.botones)
    .map((b) => {
      const tipo = String(b.type).toUpperCase() as TipoBoton;
      const boton: BotonPlantilla = { tipo, texto: b.text || '' };
      if (tipo === 'URL') boton.url = String(b.url || '').replace(/\{\{\s*\d+\s*\}\}/g, '');
      if (tipo === 'PHONE_NUMBER') boton.telefono = b.phone_number || '';
      return boton;
    });
  return f;
}

/** Estado de la plantilla en Meta como etiqueta de color. */
export function etiquetaEstadoPlantilla(status: string | null | undefined): EtiquetaColor {
  switch (String(status || '').toUpperCase()) {
    case 'APPROVED':
      return { clave: 'consolaWhatsapp.plantillas.estado.aprobada', variante: 'ok' };
    case 'PENDING':
    case 'IN_APPEAL':
      return { clave: 'consolaWhatsapp.plantillas.estado.enRevision', variante: 'warn' };
    case 'REJECTED':
      return { clave: 'consolaWhatsapp.plantillas.estado.rechazada', variante: 'error' };
    case 'PAUSED':
      return { clave: 'consolaWhatsapp.plantillas.estado.pausada', variante: 'warn' };
    case 'DISABLED':
      return { clave: 'consolaWhatsapp.plantillas.estado.desactivada', variante: 'neutro' };
    default:
      return { clave: 'consolaWhatsapp.plantillas.estado.sinDato', variante: 'neutro' };
  }
}

/** Nombre de Meta (`confirmacion_pedido_20261109`) en palabras: «Confirmacion pedido». */
export function nombreLegible(name: string): string {
  const base = String(name || '').replace(/_+/g, ' ').replace(/\s+\d{6,}$/, '').trim();
  return base ? `${base.charAt(0).toUpperCase()}${base.slice(1)}` : name;
}
