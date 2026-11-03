import { CarteraPedido, CarteraCliente } from '../../shared/services/cartera/cartera.models';
import { RangoAntiguedad, rangoAntiguedad } from './cartera.constants';
import { FilaVista, VistaCartera } from './cartera-filtros.util';
import { pesos, resumenDeVista, ResumenCartera } from './cartera-excel.util';

/**
 * Ticket 1466: el PDF de Cartera como informe interno, en hoja horizontal.
 *   Página 1  Resumen: comercio, fecha y hora, quién lo generó, filtros, tarjetas, gráfica de antigüedad,
 *             tabla por vendedor y 10 mayores deudores.
 *   Detalle   (solo en «Completo») agrupado por cliente: encabezado del cliente, sus pedidos con color según
 *             la antigüedad y subtotal. No se parten filas ni grupos de cliente entre páginas (salvo un cliente
 *             tan largo que no cabe en una página: ahí se parte entre pedidos y se repite su encabezado).
 *   Pie       «Página X de Y» en todas las páginas.
 * Todo sale de la misma vista de la pantalla (mismos filtros y orden) que el Excel (ticket 1465), así que los
 * totales cuadran. Es puro (sin Angular): recibe jsPDF y jspdf-autotable por parámetro para cargarlos bajo demanda.
 */

export type ModoPdfCartera = 'resumen' | 'completo';

/** Logo ya descargado como imagen PNG en base64, con su tamaño original. */
export interface LogoPdf {
  dataUrl: string;
  ancho: number;
  alto: number;
}

export interface DatosPdfCartera {
  empresa: string;
  /** Quién descarga (nombre o correo de la sesión). */
  usuario: string;
  ahora: Date;
  /** Filtros aplicados como pares [nombre, valor]; vacío = toda la cartera. */
  filtros: string[][];
  orden: string;
  vista: VistaCartera;
  modo: ModoPdfCartera;
  logo: LogoPdf | null;
  /** Días promedio de la cartera que se ve (el de las tarjetas de la pantalla); null = se calcula aquí. */
  diasPromedio: number | null;
}

type Color = [number, number, number];

// Colores del sistema de diseño (acento #5F3FE0, tinta #211F3A, lila suave).
const ACENTO: Color = [95, 63, 224];
const TINTA: Color = [33, 31, 58];
const MUTED: Color = [107, 104, 144];
const LILA: Color = [243, 240, 255];
const LILA_FUERTE: Color = [233, 227, 252];
const BORDE: Color = [228, 223, 247];
const BLANCO: Color = [255, 255, 255];

/** Orden y estilo de los rangos: barra de la gráfica, fondo suave de la fila y tinta legible. */
const RANGOS: { key: RangoAntiguedad; corto: string; barra: Color; fondo: Color | null; tinta: Color }[] = [
  { key: 'sin_vencer', corto: 'Sin vencer', barra: [23, 153, 79], fondo: null, tinta: [16, 112, 58] },
  { key: 'd1_15', corto: '1-15 d', barra: [224, 180, 27], fondo: [253, 246, 220], tinta: [138, 90, 16] },
  { key: 'd16_30', corto: '16-30 d', barra: [224, 137, 27], fondo: [253, 237, 215], tinta: [158, 85, 8] },
  { key: 'd31_60', corto: '31-60 d', barra: [224, 72, 63], fondo: [252, 233, 232], tinta: [176, 38, 31] },
  { key: 'd61_90', corto: '61-90 d', barra: [192, 48, 43], fondo: [250, 222, 220], tinta: [152, 30, 26] },
  { key: 'd90', corto: '+90 d', barra: [142, 29, 29], fondo: [245, 205, 203], tinta: [120, 20, 20] },
];

const MARGEN = 28;
/** Margen superior de las páginas de detalle (deja sitio al encabezado corrido) y inferior (pie). */
const TOPE = 40;
const FONDO = 32;

// ── Formato ─────────────────────────────────────────────────────────────────

/** «$26.601.321»: pesos enteros con punto de miles, como se lee en Colombia. */
export function dineroPdf(n: number | null | undefined): string {
  const v = Math.round(Number(n) || 0);
  const miles = Math.abs(v).toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return `${v < 0 ? '-' : ''}$${miles}`;
}

/** «12,5 %» desde una fracción 0..1 (un decimal; sin decimal si es entero). */
export function porcentajePdf(fraccion: number): string {
  const p = Math.round((Number(fraccion) || 0) * 1000) / 10;
  return `${String(p).replace('.', ',')} %`;
}

/** Antigüedad abreviada para que no se parta en dos líneas («1-15 d», «+90 d»). */
export function antiguedadCorta(diasVencido: number): string {
  const r = rangoAntiguedad(diasVencido);
  return (RANGOS.find((x) => x.key === r) as typeof RANGOS[number]).corto;
}

function dosDigitos(n: number): string {
  return String(n).padStart(2, '0');
}

/** «dd/mm/aaaa» en hora local; vacío si no hay fecha. */
export function fechaPdf(iso: string | Date | null | undefined): string {
  if (!iso) return '';
  const d = iso instanceof Date ? iso : new Date(iso);
  if (isNaN(d.getTime())) return '';
  return `${dosDigitos(d.getDate())}/${dosDigitos(d.getMonth() + 1)}/${d.getFullYear()}`;
}

export function fechaHoraPdf(d: Date): string {
  return `${fechaPdf(d)} ${dosDigitos(d.getHours())}:${dosDigitos(d.getMinutes())}`;
}

function plural(n: number, uno: string, varios: string): string {
  return `${n.toLocaleString('es-CO')} ${n === 1 ? uno : varios}`;
}

// ── Datos de las piezas (puros, sin jsPDF) ──────────────────────────────────

export interface TarjetaPdf {
  etiqueta: string;
  valor: string;
  detalle: string;
  /** El valor va en rojo (cartera vencida). */
  alerta?: boolean;
}

/** Días promedio ponderado por saldo, con los clientes que se ven (misma cuenta de las tarjetas con filtros). */
export function diasPromedioDeVista(vista: VistaCartera): number {
  const total = vista.filas.reduce((s, f) => s + f.pedidos.reduce((x, p) => x + pesos(p.saldo), 0), 0);
  if (total <= 0) return 0;
  const ponderado = vista.filas.reduce((s, f) => {
    const saldo = f.pedidos.reduce((x, p) => x + pesos(p.saldo), 0);
    return s + (Number(f.cliente.dso) || 0) * saldo;
  }, 0);
  return Math.round(ponderado / total);
}

export function tarjetasPdf(res: ResumenCartera, diasPromedio: number): TarjetaPdf[] {
  const pct = (x: number) => (res.total > 0 ? x / res.total : 0);
  return [
    { etiqueta: 'CARTERA TOTAL', valor: dineroPdf(res.total),
      detalle: `${plural(res.clientes, 'cliente', 'clientes')} · ${plural(res.pedidos, 'pedido', 'pedidos')}` },
    { etiqueta: 'VENCIDA DESDE EL DÍA 1', valor: dineroPdf(res.vencida), alerta: res.vencida > 0,
      detalle: `${porcentajePdf(pct(res.vencida))} de la cartera` },
    { etiqueta: 'SIN VENCER', valor: dineroPdf(res.sinVencer), detalle: `${porcentajePdf(pct(res.sinVencer))} de la cartera` },
    { etiqueta: 'POR VENCER EN 7 DÍAS', valor: dineroPdf(res.porVencer7),
      detalle: `${plural(res.porVencer7Pedidos, 'pedido', 'pedidos')} (ya en «Sin vencer»)` },
    { etiqueta: 'DÍAS PROMEDIO', valor: `${Math.max(0, Math.round(diasPromedio))} ${Math.round(diasPromedio) === 1 ? 'día' : 'días'}`,
      detalle: 'edad promedio de la cartera' },
  ];
}

export interface FilaVendedorPdf {
  vendedor: string;
  total: number;
  vencida: number;
}

/** Los vendedores que caben en la página 1: los mayores y, si hay más, una fila «Otros (n vendedores)». */
export function vendedoresParaPortada(vendedores: ResumenCartera['vendedores'], maximo = 7): FilaVendedorPdf[] {
  const base = vendedores.map((v) => ({ vendedor: v.vendedor, total: v.total, vencida: v.vencida }));
  if (base.length <= maximo + 1) return base;
  const resto = base.slice(maximo);
  return [
    ...base.slice(0, maximo),
    {
      vendedor: `Otros (${resto.length} vendedores)`,
      total: resto.reduce((s, v) => s + v.total, 0),
      vencida: resto.reduce((s, v) => s + v.vencida, 0),
    },
  ];
}

/** Un cliente del detalle: su encabezado y sus pedidos ya redondeados a pesos. */
export interface GrupoDetallePdf {
  nombre: string;
  /** «NIT 890907489 · Vendedor: … · Plazo 30 días · Cupo $… · Tel …» */
  info: string;
  pedidos: {
    pedido: string; factura: string; compra: string; limite: string; dias: number; rango: RangoAntiguedad;
    total: number; pagado: number; saldo: number;
  }[];
  total: number;
  pagado: number;
  saldo: number;
}

function infoCliente(c: CarteraCliente): string {
  const partes: string[] = [];
  const doc = (c.documento || '').trim();
  if (doc) partes.push(`${(c.tipoDocumento || '').trim() || 'NIT/CC'} ${doc}`);
  partes.push(`Vendedor: ${(c.vendedor || '').trim() || 'sin vendedor'}`);
  const dias = Number(c.payTermDays) || 0;
  partes.push(dias <= 0 ? 'Contado' : `Plazo ${dias} ${dias === 1 ? 'día' : 'días'}`);
  partes.push((Number(c.creditLimit) || 0) > 0 ? `Cupo ${dineroPdf(c.creditLimit)}` : 'Sin cupo');
  const tel = (c.telefono || '').trim();
  if (tel) partes.push(`Tel ${tel}`);
  return partes.join(' · ');
}

export function gruposDetalle(vista: VistaCartera): GrupoDetallePdf[] {
  const grupos: GrupoDetallePdf[] = [];
  vista.filas.forEach((f: FilaVista) => {
    if (!f.pedidos.length) return;
    const pedidos = f.pedidos.map((p: CarteraPedido) => {
      const dias = Number(p.diasVencido) || 0;
      return {
        pedido: p.nroPedido || '', factura: p.factura || '', compra: fechaPdf(p.fechaCompra), limite: fechaPdf(p.payDueDate),
        dias: dias > 0 ? dias : 0, rango: rangoAntiguedad(dias),
        total: pesos(p.total), pagado: pesos(p.pagado), saldo: pesos(p.saldo),
      };
    });
    grupos.push({
      nombre: f.cliente.nombre || 'Sin nombre',
      info: infoCliente(f.cliente),
      pedidos,
      total: pedidos.reduce((s, p) => s + p.total, 0),
      pagado: pedidos.reduce((s, p) => s + p.pagado, 0),
      saldo: pedidos.reduce((s, p) => s + p.saldo, 0),
    });
  });
  return grupos;
}

// ── Logo ────────────────────────────────────────────────────────────────────

/**
 * Descarga el logo del comercio y lo pasa a PNG. Si no se puede (sin logo, la dirección no permite leerlo desde
 * la página, tarda más de 4 s), devuelve null y el PDF usa la inicial del comercio: nunca falla por el logo.
 */
export async function cargarLogoPdf(url: string | null | undefined): Promise<LogoPdf | null> {
  try {
    if (!url || !/^https:\/\//i.test(url) || typeof document === 'undefined') return null;
    const control = new AbortController();
    const reloj = setTimeout(() => control.abort(), 4000);
    let blob: Blob;
    try {
      const resp = await fetch(url, { mode: 'cors', signal: control.signal });
      if (!resp.ok) return null;
      blob = await resp.blob();
    } finally {
      clearTimeout(reloj);
    }
    const objeto = URL.createObjectURL(blob);
    try {
      const img = await new Promise<HTMLImageElement>((ok, mal) => {
        const i = new Image();
        i.onload = () => ok(i);
        i.onerror = () => mal(new Error('logo'));
        i.src = objeto;
      });
      const ancho = img.naturalWidth || img.width;
      const alto = img.naturalHeight || img.height;
      if (!ancho || !alto) return null;
      // Se reduce a 240 px: pesa poco en el PDF y se ve nítido a 40 pt.
      const escala = Math.min(1, 240 / Math.max(ancho, alto));
      const lienzo = document.createElement('canvas');
      lienzo.width = Math.max(1, Math.round(ancho * escala));
      lienzo.height = Math.max(1, Math.round(alto * escala));
      const ctx = lienzo.getContext('2d');
      if (!ctx) return null;
      ctx.drawImage(img, 0, 0, lienzo.width, lienzo.height);
      return { dataUrl: lienzo.toDataURL('image/png'), ancho: lienzo.width, alto: lienzo.height };
    } finally {
      URL.revokeObjectURL(objeto);
    }
  } catch {
    return null;
  }
}

// ── Dibujo ──────────────────────────────────────────────────────────────────

interface OpcTexto {
  size?: number;
  bold?: boolean;
  color?: Color;
  align?: 'left' | 'right' | 'center';
}

function texto(pdf: any, t: string, x: number, y: number, o: OpcTexto = {}): void {
  pdf.setFont('helvetica', o.bold ? 'bold' : 'normal');
  pdf.setFontSize(o.size || 9);
  const c = o.color || TINTA;
  pdf.setTextColor(c[0], c[1], c[2]);
  pdf.text(t, x, y, { align: o.align || 'left' });
}

/** Recorta el texto con «...» para que quepa en `ancho` puntos con la fuente actual. */
function ajustar(pdf: any, t: string, ancho: number): string {
  if (pdf.getTextWidth(t) <= ancho) return t;
  let s = t;
  while (s.length > 1 && pdf.getTextWidth(s + '...') > ancho) s = s.slice(0, -1);
  return s.trimEnd() + '...';
}

function rellenar(pdf: any, c: Color): void {
  pdf.setFillColor(c[0], c[1], c[2]);
}

function trazo(pdf: any, c: Color, grosor = 0.6): void {
  pdf.setDrawColor(c[0], c[1], c[2]);
  pdf.setLineWidth(grosor);
}

/** Cabecera de la página 1. Devuelve la «y» donde sigue el contenido. */
function cabeceraPortada(pdf: any, d: DatosPdfCartera, W: number): number {
  const lado = 40;
  const y0 = 24;
  let dibujado = false;
  if (d.logo) {
    try {
      const esc = Math.min(lado / d.logo.ancho, lado / d.logo.alto);
      const w = d.logo.ancho * esc;
      const h = d.logo.alto * esc;
      pdf.addImage(d.logo.dataUrl, 'PNG', MARGEN + (lado - w) / 2, y0 + (lado - h) / 2, w, h);
      dibujado = true;
    } catch { dibujado = false; }
  }
  if (!dibujado) {
    rellenar(pdf, ACENTO);
    pdf.roundedRect(MARGEN, y0, lado, lado, 8, 8, 'F');
    texto(pdf, ((d.empresa || 'K').trim().charAt(0) || 'K').toUpperCase(), MARGEN + lado / 2, y0 + 27,
      { size: 20, bold: true, color: BLANCO, align: 'center' });
  }
  const xt = MARGEN + lado + 12;
  const anchoTitulo = W - MARGEN - 230 - xt;
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(17);
  texto(pdf, ajustar(pdf, d.empresa || 'Comercio', anchoTitulo), xt, y0 + 17, { size: 17, bold: true });
  texto(pdf, 'Informe de cartera por cliente', xt, y0 + 33, { size: 9.5, color: MUTED });
  texto(pdf, `Generado el ${fechaHoraPdf(d.ahora)}`, W - MARGEN, y0 + 14, { size: 9, align: 'right' });
  pdf.setFontSize(9);
  texto(pdf, ajustar(pdf, `Generado por: ${d.usuario || '-'}`, 220), W - MARGEN, y0 + 28, { size: 9, color: MUTED, align: 'right' });
  texto(pdf, d.modo === 'resumen' ? 'Versión resumida' : 'Versión completa', W - MARGEN, y0 + 41,
    { size: 8, bold: true, color: ACENTO, align: 'right' });
  trazo(pdf, BORDE, 0.8);
  pdf.line(MARGEN, 72, W - MARGEN, 72);
  return 72;
}

/** Filtros aplicados (hasta 3 renglones). Devuelve la «y» donde terminan. */
function bloqueFiltros(pdf: any, d: DatosPdfCartera, y: number, W: number): number {
  texto(pdf, 'FILTROS APLICADOS', MARGEN, y + 8, { size: 6.5, bold: true, color: MUTED });
  const partes = d.filtros.length ? d.filtros.map((p) => `${p[0]}: ${p[1]}`).join(' · ') : 'Toda la cartera (sin filtros)';
  const completo = `${partes} · Orden: ${d.orden}`;
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(8.5);
  let lineas: string[] = pdf.splitTextToSize(completo, W - MARGEN * 2);
  if (lineas.length > 3) {
    lineas = lineas.slice(0, 3);
    lineas[2] = ajustar(pdf, lineas[2] + ' ...', W - MARGEN * 2);
  }
  lineas.forEach((l, i) => texto(pdf, l, MARGEN, y + 20 + i * 10.5, { size: 8.5 }));
  return y + 20 + (lineas.length - 1) * 10.5 + 4;
}

function tarjetas(pdf: any, items: TarjetaPdf[], y: number, W: number): number {
  const hueco = 8;
  const ancho = (W - MARGEN * 2 - hueco * (items.length - 1)) / items.length;
  const alto = 54;
  items.forEach((t, i) => {
    const x = MARGEN + i * (ancho + hueco);
    rellenar(pdf, LILA);
    trazo(pdf, BORDE, 0.8);
    pdf.roundedRect(x, y, ancho, alto, 8, 8, 'FD');
    texto(pdf, t.etiqueta, x + 10, y + 14, { size: 6.5, bold: true, color: MUTED });
    // La cifra se achica si no cabe (cifras de miles de millones).
    let size = 15;
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(size);
    while (size > 9 && pdf.getTextWidth(t.valor) > ancho - 20) { size -= 0.5; pdf.setFontSize(size); }
    texto(pdf, t.valor, x + 10, y + 32, { size, bold: true, color: t.alerta ? [176, 38, 31] : TINTA });
    pdf.setFontSize(7);
    texto(pdf, ajustar(pdf, t.detalle, ancho - 20), x + 10, y + 46, { size: 7, color: MUTED });
  });
  return y + alto;
}

/** Gráfica de antigüedad: una barra horizontal por rango. Devuelve la «y» donde termina. */
function graficaAntiguedad(pdf: any, res: ResumenCartera, x: number, y: number, ancho: number): number {
  texto(pdf, 'ANTIGÜEDAD DE LA CARTERA', x, y + 7, { size: 7, bold: true, color: MUTED });
  const fila = 20;
  const xEtq = x;
  const xBarra = x + 62;
  const anchoValor = 118;
  const anchoBarra = ancho - 62 - anchoValor - 6;
  const maximo = Math.max(1, ...res.rangos.map((r) => r.saldo));
  let yy = y + 16;
  res.rangos.forEach((r, i) => {
    const est = RANGOS[i];
    texto(pdf, est.corto, xEtq, yy + 11, { size: 8, bold: true, color: est.tinta });
    rellenar(pdf, LILA);
    pdf.roundedRect(xBarra, yy + 2, anchoBarra, 12, 3, 3, 'F');
    if (r.saldo > 0) {
      rellenar(pdf, est.barra);
      pdf.roundedRect(xBarra, yy + 2, Math.max(3, (r.saldo / maximo) * anchoBarra), 12, 3, 3, 'F');
    }
    const p = res.total > 0 ? r.saldo / res.total : 0;
    texto(pdf, `${dineroPdf(r.saldo)}  (${porcentajePdf(p)})`, x + ancho, yy + 11, { size: 8, align: 'right' });
    yy += fila;
  });
  return yy;
}

function portada(pdf: any, autoTable: any, d: DatosPdfCartera, res: ResumenCartera): void {
  const W = pdf.internal.pageSize.getWidth();
  let y = cabeceraPortada(pdf, d, W);
  y = bloqueFiltros(pdf, d, y + 6, W);
  const dias = d.diasPromedio != null ? d.diasPromedio : diasPromedioDeVista(d.vista);
  y = tarjetas(pdf, tarjetasPdf(res, dias), y + 8, W) + 16;

  const colIzq = 380;
  const xDer = MARGEN + colIzq + 26;
  const anchoDer = W - MARGEN - xDer;

  // Izquierda: gráfica y tabla por vendedor.
  const finGrafica = graficaAntiguedad(pdf, res, MARGEN, y, colIzq);
  const yVend = finGrafica + 12;
  texto(pdf, 'POR VENDEDOR', MARGEN, yVend + 7, { size: 7, bold: true, color: MUTED });
  const vend = vendedoresParaPortada(res.vendedores);
  const estiloTabla = {
    styles: { font: 'helvetica', fontSize: 8, cellPadding: { top: 3, bottom: 3, left: 5, right: 5 }, textColor: TINTA,
      lineColor: BORDE, lineWidth: 0.25, overflow: 'ellipsize' },
    headStyles: { fillColor: ACENTO, textColor: BLANCO, fontStyle: 'bold', fontSize: 7 },
    theme: 'plain',
    margin: { top: TOPE, bottom: FONDO },
  };
  autoTable(pdf, {
    ...estiloTabla,
    startY: yVend + 13,
    margin: { left: MARGEN, right: W - MARGEN - colIzq, top: TOPE, bottom: FONDO },
    tableWidth: colIzq,
    head: [['Vendedor', 'Cartera total', 'Vencida', '% vencido', '% cartera']],
    body: vend.map((v) => [
      v.vendedor, dineroPdf(v.total), dineroPdf(v.vencida),
      porcentajePdf(v.total > 0 ? v.vencida / v.total : 0), porcentajePdf(res.total > 0 ? v.total / res.total : 0),
    ]),
    columnStyles: {
      0: { cellWidth: 118 }, 1: { halign: 'right', cellWidth: 80 }, 2: { halign: 'right', cellWidth: 72 },
      3: { halign: 'right', cellWidth: 55 }, 4: { halign: 'right', cellWidth: 55 },
    },
  });

  // Derecha: 10 mayores deudores.
  texto(pdf, '10 MAYORES DEUDORES', xDer, y + 7, { size: 7, bold: true, color: MUTED });
  autoTable(pdf, {
    ...estiloTabla,
    startY: y + 16,
    margin: { left: xDer, right: MARGEN, top: TOPE, bottom: FONDO },
    tableWidth: anchoDer,
    head: [['#', 'Cliente', 'Saldo', 'Vencido', '% cartera']],
    body: res.mayores.map((m, i) => [
      String(i + 1), m.cliente || 'Sin nombre', dineroPdf(m.saldo), dineroPdf(m.vencida),
      porcentajePdf(res.total > 0 ? m.saldo / res.total : 0),
    ]),
    columnStyles: {
      0: { cellWidth: 26, halign: 'center' }, 2: { halign: 'right', cellWidth: 74 }, 3: { halign: 'right', cellWidth: 74 },
      4: { halign: 'right', cellWidth: 50 },
    },
  });
  const finDer = (pdf.lastAutoTable && pdf.lastAutoTable.finalY) || y + 16;
  texto(pdf, '«Por vencer en 7 días» ya está incluido en «Sin vencer»; no se suma aparte.', xDer, finDer + 12,
    { size: 7, color: MUTED });
  if (d.modo === 'resumen') {
    texto(pdf, 'Esta es la versión resumida. Para ver el detalle de pedidos por cliente, descargue el informe completo.',
      MARGEN, pdf.internal.pageSize.getHeight() - FONDO - 6, { size: 7.5, color: MUTED });
  }
}

// Medidas del detalle (puntos). Las alturas se calculan con la misma regla de jspdf-autotable para decidir antes de
// dibujar si un cliente cabe en lo que queda de la página.
const TAM_FILA = 8;
const PAD_FILA = 3.5;
const TAM_NOMBRE = 8.5;
const PAD_NOMBRE = 4.5;
const TAM_COLS = 7;
const PAD_COLS = 3.5;
/** Anchos de las 9 columnas del detalle; la última toma lo que sobre hasta el ancho útil de la página. */
const ANCHOS_BASE = [100, 80, 76, 76, 62, 70, 108, 108];

function anchosDetalle(W: number): number[] {
  const resto = W - MARGEN * 2 - ANCHOS_BASE.reduce((s, w) => s + w, 0);
  return [...ANCHOS_BASE, resto];
}

function alturaLinea(pdf: any, size: number): number {
  return size * pdf.getLineHeightFactor();
}

function estiloRango(r: RangoAntiguedad): typeof RANGOS[number] {
  return RANGOS.find((x) => x.key === r) as typeof RANGOS[number];
}

function detalle(pdf: any, autoTable: any, d: DatosPdfCartera): void {
  const W = pdf.internal.pageSize.getWidth();
  const H = pdf.internal.pageSize.getHeight();
  const grupos = gruposDetalle(d.vista);
  if (!grupos.length) return;
  const anchos = anchosDetalle(W);

  pdf.addPage();
  texto(pdf, 'DETALLE POR CLIENTE', MARGEN, TOPE + 12, { size: 11, bold: true, color: ACENTO });
  const nPedidos = grupos.reduce((s, g) => s + g.pedidos.length, 0);
  texto(pdf, `${plural(grupos.length, 'cliente', 'clientes')} · ${plural(nPedidos, 'pedido', 'pedidos')} con saldo · Orden: ${d.orden}`,
    W - MARGEN, TOPE + 12, { size: 8.5, color: MUTED, align: 'right' });
  let y = TOPE + 22;

  const hFila = alturaLinea(pdf, TAM_FILA) + PAD_FILA * 2;
  const hCabCliente = alturaLinea(pdf, TAM_NOMBRE) + PAD_NOMBRE * 2;
  const hCabCols = alturaLinea(pdf, TAM_COLS) + PAD_COLS * 2;
  const hSub = hFila;
  const usable = H - FONDO - TOPE;

  grupos.forEach((g) => {
    const alto = hCabCliente + hCabCols + g.pedidos.length * hFila + hSub + 2;
    const libre = H - FONDO - y;
    if (alto > libre) {
      // Cabe entero en una página nueva: se pasa. Si es más largo que una página, solo se pasa cuando lo que
      // queda no alcanza ni para su encabezado, dos pedidos y el subtotal.
      if (alto <= usable || libre < hCabCliente + hCabCols + 2 * hFila + hSub) {
        pdf.addPage();
        y = TOPE;
      }
    }
    // El nombre y los datos del cliente van en una sola línea: se recortan a mano para que nunca toquen el borde
    // (así la altura del encabezado es la que se calculó arriba).
    const anchoNombre = anchos[0] + anchos[1] + anchos[2] - PAD_NOMBRE * 2 - 4;
    const anchoInfo = anchos.slice(3).reduce((s, w) => s + w, 0) - PAD_NOMBRE * 2 - 4;
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(TAM_NOMBRE);
    const nombreVisible = ajustar(pdf, g.nombre, anchoNombre);
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(7.5);
    const infoVisible = ajustar(pdf, g.info, anchoInfo);
    const base = { fontSize: TAM_FILA, cellPadding: PAD_FILA };
    const fila = g.pedidos.map((p) => {
      const est = estiloRango(p.rango);
      const fondo = est.fondo ? { fillColor: est.fondo } : {};
      return [
        { content: p.pedido, styles: { ...fondo } },
        { content: p.factura, styles: { ...fondo } },
        { content: p.compra, styles: { ...fondo } },
        { content: p.limite, styles: { ...fondo } },
        { content: String(p.dias), styles: { ...fondo, halign: 'center' } },
        { content: antiguedadCorta(p.dias), styles: { ...fondo, halign: 'center', fontStyle: 'bold', textColor: est.tinta } },
        { content: dineroPdf(p.total), styles: { ...fondo, halign: 'right' } },
        { content: dineroPdf(p.pagado), styles: { ...fondo, halign: 'right' } },
        { content: dineroPdf(p.saldo), styles: { ...fondo, halign: 'right', fontStyle: 'bold' } },
      ];
    });
    const subtotal = [
      { content: `Subtotal · ${plural(g.pedidos.length, 'pedido', 'pedidos')}`, colSpan: 6,
        styles: { halign: 'right', fontStyle: 'bold', fillColor: LILA_FUERTE } },
      { content: dineroPdf(g.total), styles: { halign: 'right', fontStyle: 'bold', fillColor: LILA_FUERTE } },
      { content: dineroPdf(g.pagado), styles: { halign: 'right', fontStyle: 'bold', fillColor: LILA_FUERTE } },
      { content: dineroPdf(g.saldo), styles: { halign: 'right', fontStyle: 'bold', fillColor: LILA_FUERTE } },
    ];
    autoTable(pdf, {
      startY: y,
      margin: { left: MARGEN, right: MARGEN, top: TOPE, bottom: FONDO },
      theme: 'plain',
      // Los grupos que caben se pasan enteros a página nueva (arriba); aquí solo se evita partir filas.
      pageBreak: 'auto',
      rowPageBreak: 'avoid',
      showHead: 'everyPage',
      styles: { font: 'helvetica', ...base, textColor: TINTA, lineColor: BORDE, lineWidth: 0.25, overflow: 'ellipsize' },
      headStyles: { fillColor: ACENTO, textColor: BLANCO, fontStyle: 'bold', fontSize: TAM_COLS, cellPadding: PAD_COLS },
      columnStyles: anchos.reduce((o: any, w, i) => { o[i] = { cellWidth: w }; return o; }, {}),
      head: [
        [
          { content: nombreVisible, colSpan: 3, styles: { fillColor: LILA_FUERTE, textColor: TINTA, fontSize: TAM_NOMBRE,
            cellPadding: PAD_NOMBRE, halign: 'left' } },
          { content: infoVisible, colSpan: 6, styles: { fillColor: LILA_FUERTE, textColor: MUTED, fontSize: 7.5,
            fontStyle: 'normal', cellPadding: PAD_NOMBRE, halign: 'right' } },
        ],
        ['Pedido', 'Factura', 'Compra', 'Límite de pago', { content: 'Días vencido', styles: { halign: 'center' } },
          { content: 'Antigüedad', styles: { halign: 'center' } },
          { content: 'Total', styles: { halign: 'right' } }, { content: 'Pagado', styles: { halign: 'right' } },
          { content: 'Saldo', styles: { halign: 'right' } }],
      ],
      body: [...fila, subtotal],
    });
    y = pdf.lastAutoTable.finalY + 12;
  });

  // Total general de lo que se ve (cuadra con las tarjetas de la página 1 y con el Excel).
  const sum = (c: 'total' | 'pagado' | 'saldo') => grupos.reduce((s, g) => s + g[c], 0);
  if (H - FONDO - y < hFila + 4) { pdf.addPage(); y = TOPE; }
  autoTable(pdf, {
    startY: y,
    margin: { left: MARGEN, right: MARGEN, top: TOPE, bottom: FONDO },
    theme: 'plain',
    styles: { font: 'helvetica', fontSize: 9, cellPadding: 5, textColor: BLANCO, fontStyle: 'bold', fillColor: ACENTO },
    columnStyles: anchos.reduce((o: any, w, i) => { o[i] = { cellWidth: w }; return o; }, {}),
    body: [[
      { content: `TOTAL GENERAL · ${plural(grupos.length, 'cliente', 'clientes')} · ${plural(nPedidos, 'pedido', 'pedidos')}`,
        colSpan: 6, styles: { halign: 'left' } },
      { content: dineroPdf(sum('total')), styles: { halign: 'right' } },
      { content: dineroPdf(sum('pagado')), styles: { halign: 'right' } },
      { content: dineroPdf(sum('saldo')), styles: { halign: 'right' } },
    ]],
  });
}

/** Pie con «Página X de Y» y, desde la 2, un encabezado corrido. */
function numerar(pdf: any, d: DatosPdfCartera): void {
  const W = pdf.internal.pageSize.getWidth();
  const H = pdf.internal.pageSize.getHeight();
  const n = pdf.getNumberOfPages();
  for (let i = 1; i <= n; i++) {
    pdf.setPage(i);
    if (i > 1) {
      texto(pdf, ajustar(pdf, `Cartera · ${d.empresa}`, 400), MARGEN, 24, { size: 8.5, bold: true, color: ACENTO });
      texto(pdf, `Generado el ${fechaHoraPdf(d.ahora)}`, W - MARGEN, 24, { size: 8, color: MUTED, align: 'right' });
      trazo(pdf, BORDE, 0.6);
      pdf.line(MARGEN, 30, W - MARGEN, 30);
    }
    trazo(pdf, BORDE, 0.6);
    pdf.line(MARGEN, H - 24, W - MARGEN, H - 24);
    texto(pdf, ajustar(pdf, `${d.empresa} · Informe de cartera`, 500), MARGEN, H - 13, { size: 7.5, color: MUTED });
    texto(pdf, `Página ${i} de ${n}`, W - MARGEN, H - 13, { size: 8, bold: true, color: TINTA, align: 'right' });
  }
}

/** Arma el PDF completo. `JsPDF` y `autoTable` son los módulos cargados con `await import(...)`. */
export function construirPdfCartera(JsPDF: any, autoTable: any, d: DatosPdfCartera): any {
  const pdf = new JsPDF({ orientation: 'landscape', unit: 'pt', format: 'a4' });
  pdf.setProperties({ title: `Informe de cartera - ${d.empresa}`, subject: 'Cartera por cliente', creator: 'Katuq' });
  const res = resumenDeVista(d.vista);
  portada(pdf, autoTable, d, res);
  if (d.modo === 'completo') detalle(pdf, autoTable, d);
  numerar(pdf, d);
  return pdf;
}
