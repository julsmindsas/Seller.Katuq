import { CarteraPedido } from '../../shared/services/cartera/cartera.models';
import { AGING_BUCKETS, RANGO_ANTIGUEDAD_LABEL, rangoAntiguedad } from './cartera.constants';
import { FilaVista, VistaCartera } from './cartera-filtros.util';

/**
 * Ticket 1465: el Excel de Cartera para trabajarlo (cobrar), en tres hojas:
 *   «Resumen»    comercio, quién y cuándo lo generó, filtros, totales, antigüedad, vendedores y mayores deudores.
 *   «Por cliente» una fila por cliente, como Tabla de Excel.
 *   «Detalle»    una fila por pedido con saldo, como Tabla de Excel (autofiltro, encabezado congelado).
 * Todo sale de la misma vista que ve la persona en pantalla (mismos filtros, mismo orden). Las fechas son
 * fechas reales, el plazo es un número de días, el dinero va redondeado a pesos con formato y no hay fila TOTAL
 * dentro de los datos (el total vive en el Resumen y, sobre la tabla del Detalle, en un SUBTOTAL que sigue al filtro).
 * Todo es puro (sin Angular): recibe la librería de Excel por parámetro para poder cargarla bajo demanda.
 */

// Colores del sistema de diseño (acento #5F3FE0, tinta #211F3A, lila suave).
const COLOR_ACENTO = 'FF5F3FE0';
const COLOR_TINTA = 'FF211F3A';
const COLOR_MUTED = 'FF6B6890';
const COLOR_LILA = 'FFF3F0FF';
const COLOR_BORDE = 'FFE4DFF7';

const FMT_PESOS = '"$" #,##0';
const FMT_FECHA = 'dd/mm/yyyy';
const FMT_FECHA_HORA = 'dd/mm/yyyy hh:mm';
const FMT_PORCENTAJE = '0.0%';
const FMT_ENTERO = '#,##0';

export interface DatosExcelCartera {
  empresa: string;
  /** Quién descarga (nombre o correo de la sesión). */
  usuario: string;
  ahora: Date;
  /** Filtros aplicados como pares [nombre, valor]; vacío = toda la cartera. */
  filtros: string[][];
  orden: string;
  vista: VistaCartera;
  /** Origen de la página (https://app...), para armar el link a cada pedido. */
  origen: string;
}

/** Una fila del Detalle (un pedido con saldo). Las fechas son Date a medianoche UTC del día local. */
export interface FilaDetalle {
  cliente: string;
  documento: string;
  telefono: string;
  correo: string;
  ciudad: string;
  vendedor: string;
  plazo: number;
  pedido: string;
  factura: string;
  facturaUrl: string;
  estadoPago: string;
  entregado: string;
  compra: Date | null;
  entrega: Date | null;
  limite: Date | null;
  ultimoAbono: Date | null;
  total: number;
  pagado: number;
  saldo: number;
  diasVencido: number;
  antiguedad: string;
  linkPedido: string;
}

const ESTADO_PAGO_ES: { [k: string]: string } = {
  Pendiente: 'Pendiente',
  Pospendiente: 'Pago en revisión',
  PreAprobado: 'Preaprobado',
  'Pago Parcial': 'Pago parcial',
  PagoParcial: 'Pago parcial',
  Procesando: 'Procesando',
  Credito: 'Crédito',
};

export function estadoPagoEs(estado: string | null | undefined): string {
  const e = (estado || '').trim();
  return ESTADO_PAGO_ES[e] || e;
}

/** Pesos enteros (el Excel no lleva decimales de centavos). */
export function pesos(n: number | null | undefined): number {
  return Math.round(Number(n) || 0);
}

/**
 * Fecha real de Excel desde una fecha ISO: toma el día en hora local (el mismo que ve la persona en pantalla)
 * y lo guarda a medianoche UTC, que es como Excel lo entiende sin correr un día. Vacío si no hay fecha.
 */
export function diaExcel(iso: string | null | undefined): Date | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (isNaN(d.getTime())) return null;
  return new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
}

/** Fecha y hora local (para «Generado el»), guardada como hora de pared. */
export function fechaHoraExcel(d: Date): Date {
  return new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate(), d.getHours(), d.getMinutes()));
}

function linkPedido(origen: string, nroPedido: string): string {
  if (!nroPedido) return '';
  return `${(origen || '').replace(/\/+$/, '')}/ventas/pedidos?buscar=${encodeURIComponent(nroPedido)}`;
}

/** Saldo de lo visible de un cliente: suma de sus pedidos ya redondeados, para que las tres hojas den el mismo total. */
function saldoRedondeado(f: FilaVista): number {
  return f.pedidos.reduce((s, p) => s + pesos(p.saldo), 0);
}

/** Los pedidos de la vista como filas del Detalle, en el mismo orden de la pantalla. */
export function filasDetalle(vista: VistaCartera, origen: string): FilaDetalle[] {
  const filas: FilaDetalle[] = [];
  vista.filas.forEach((f) => {
    const c = f.cliente;
    f.pedidos.forEach((p) => {
      const dias = Number(p.diasVencido) || 0;
      filas.push({
        cliente: c.nombre || '',
        documento: c.documento || '',
        telefono: c.telefono || '',
        correo: c.correo || '',
        ciudad: p.ciudad || '',
        vendedor: c.vendedor || '',
        plazo: Math.max(0, Number(c.payTermDays) || 0),
        pedido: p.nroPedido || '',
        factura: p.factura || '',
        facturaUrl: p.facturaUrl || '',
        estadoPago: estadoPagoEs(p.estadoPago),
        entregado: p.entregado ? 'Sí' : 'No',
        compra: diaExcel(p.fechaCompra),
        entrega: diaExcel(p.fechaEntrega),
        limite: diaExcel(p.payDueDate),
        ultimoAbono: diaExcel(p.ultimoAbono),
        total: pesos(p.total),
        pagado: pesos(p.pagado),
        saldo: pesos(p.saldo),
        diasVencido: dias > 0 ? dias : 0,
        antiguedad: RANGO_ANTIGUEDAD_LABEL[rangoAntiguedad(dias)],
        linkPedido: linkPedido(origen, p.nroPedido || ''),
      });
    });
  });
  return filas;
}

/** Una fila de «Por cliente». */
export interface FilaPorCliente {
  cliente: string;
  documento: string;
  vendedor: string;
  plazo: number;
  /** Cupo de crédito; null = el cliente no tiene cupo configurado. */
  cupo: number | null;
  pedidos: number;
  saldo: number;
  porRango: number[];
  diasMasVencido: number;
  telefono: string;
  correo: string;
}

export function filasPorCliente(vista: VistaCartera): FilaPorCliente[] {
  return vista.filas.map((f: FilaVista) => {
    const c = f.cliente;
    // Por rango y total salen de los pedidos visibles ya redondeados: el cliente suma exactamente lo que suman sus pedidos.
    const porRango = AGING_BUCKETS.map((b) =>
      f.pedidos.filter((p) => rangoAntiguedad(p.diasVencido) === b.key).reduce((s, p) => s + pesos(p.saldo), 0));
    return {
      cliente: c.nombre || '',
      documento: c.documento || '',
      vendedor: c.vendedor || '',
      plazo: Math.max(0, Number(c.payTermDays) || 0),
      cupo: (Number(c.creditLimit) || 0) > 0 ? pesos(c.creditLimit) : null,
      pedidos: f.pedidos.length,
      saldo: saldoRedondeado(f),
      porRango,
      diasMasVencido: f.pedidos.reduce((m, p) => Math.max(m, Number(p.diasVencido) || 0), 0),
      telefono: c.telefono || '',
      correo: c.correo || '',
    };
  });
}

/** Totales y cortes de lo que se ve, para el Resumen. */
export interface ResumenCartera {
  total: number;
  vencida: number;
  sinVencer: number;
  porVencer7: number;
  porVencer7Pedidos: number;
  pedidos: number;
  clientes: number;
  rangos: { rango: string; saldo: number; pedidos: number }[];
  vendedores: { vendedor: string; clientes: number; total: number; vencida: number }[];
  mayores: { cliente: string; documento: string; vendedor: string; saldo: number; vencida: number; telefono: string }[];
}

export function resumenDeVista(vista: VistaCartera): ResumenCartera {
  const rangos = AGING_BUCKETS.map((b) => ({ key: b.key as string, rango: RANGO_ANTIGUEDAD_LABEL[b.key], saldo: 0, pedidos: 0 }));
  const r: ResumenCartera = {
    total: 0, vencida: 0, sinVencer: 0, porVencer7: 0, porVencer7Pedidos: 0, pedidos: 0, clientes: vista.filas.length,
    rangos: [], vendedores: [], mayores: [],
  };
  const vend = new Map<string, { clientes: number; total: number; vencida: number }>();
  const deudores: ResumenCartera['mayores'] = [];
  vista.filas.forEach((f) => {
    let vencidaCliente = 0;
    f.pedidos.forEach((p: CarteraPedido) => {
      const saldo = pesos(p.saldo);
      const dias = Number(p.diasVencido) || 0;
      r.total += saldo;
      r.pedidos += 1;
      if (dias > 0) { r.vencida += saldo; vencidaCliente += saldo; } else { r.sinVencer += saldo; }
      if (p.porVencer7) { r.porVencer7 += saldo; r.porVencer7Pedidos += 1; }
      const rango = rangos.find((x) => x.key === rangoAntiguedad(dias));
      if (rango) { rango.saldo += saldo; rango.pedidos += 1; }
    });
    const nombreVend = (f.cliente.vendedor || '').trim() || 'Sin vendedor';
    const v = vend.get(nombreVend) || { clientes: 0, total: 0, vencida: 0 };
    v.clientes += 1;
    v.total += saldoRedondeado(f);
    v.vencida += vencidaCliente;
    vend.set(nombreVend, v);
    deudores.push({
      cliente: f.cliente.nombre || '', documento: f.cliente.documento || '', vendedor: f.cliente.vendedor || '',
      saldo: saldoRedondeado(f), vencida: vencidaCliente, telefono: f.cliente.telefono || '',
    });
  });
  r.rangos = rangos.map((x) => ({ rango: x.rango, saldo: x.saldo, pedidos: x.pedidos }));
  r.vendedores = Array.from(vend.entries())
    .map(([vendedor, v]) => ({ vendedor, ...v }))
    .sort((a, b) => {
      if ((a.vendedor === 'Sin vendedor') !== (b.vendedor === 'Sin vendedor')) return a.vendedor === 'Sin vendedor' ? 1 : -1;
      return b.total - a.total;
    });
  r.mayores = deudores.sort((a, b) => b.saldo - a.saldo).slice(0, 10);
  return r;
}

// ── Libro de Excel ──────────────────────────────────────────────────────────

function estiloEncabezado(cell: any): void {
  cell.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 10 };
  cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLOR_ACENTO } };
  cell.alignment = { vertical: 'middle', horizontal: 'left', wrapText: true };
}

function estiloEtiqueta(cell: any): void {
  cell.font = { bold: true, color: { argb: COLOR_MUTED }, size: 9 };
}

function titulo(ws: any, fila: number, texto: string): void {
  const c = ws.getCell(fila, 1);
  c.value = texto;
  c.font = { bold: true, color: { argb: COLOR_ACENTO }, size: 11 };
}

/** Encabezado de un bloque del Resumen (varias columnas con el fondo del acento). */
function encabezadoBloque(ws: any, fila: number, textos: string[]): void {
  textos.forEach((t, i) => {
    const c = ws.getCell(fila, i + 1);
    c.value = t;
    estiloEncabezado(c);
    if (i > 0) c.alignment = { vertical: 'middle', horizontal: 'right', wrapText: true };
  });
}

interface ColTabla {
  nombre: string;
  ancho: number;
  fmt?: string;
  derecha?: boolean;
}

/** Agrega una Tabla de Excel (con autofiltro) y le da formato a sus columnas. Devuelve la fila de datos inicial. */
function agregarTabla(ws: any, nombreTabla: string, filaEncabezado: number, cols: ColTabla[], filas: any[][]): number {
  ws.addTable({
    name: nombreTabla,
    ref: `A${filaEncabezado}`,
    headerRow: true,
    totalsRow: false,
    style: { theme: 'TableStyleLight1', showRowStripes: true },
    columns: cols.map((c) => ({ name: c.nombre, filterButton: true })),
    rows: filas,
  });
  cols.forEach((c, i) => {
    ws.getColumn(i + 1).width = c.ancho;
    estiloEncabezado(ws.getCell(filaEncabezado, i + 1));
    if (c.derecha) ws.getCell(filaEncabezado, i + 1).alignment = { vertical: 'middle', horizontal: 'right', wrapText: true };
    for (let r = 0; r < filas.length; r++) {
      const cell = ws.getCell(filaEncabezado + 1 + r, i + 1);
      if (c.fmt) cell.numFmt = c.fmt;
      cell.alignment = { vertical: 'middle', horizontal: c.derecha ? 'right' : 'left' };
      cell.font = { color: { argb: COLOR_TINTA }, size: 10 };
    }
  });
  ws.getRow(filaEncabezado).height = 28;
  return filaEncabezado + 1;
}

function hojaResumen(wb: any, d: DatosExcelCartera, res: ResumenCartera): void {
  const ws = wb.addWorksheet('Resumen', { views: [{ showGridLines: false }] });
  [34, 20, 18, 18, 18, 18, 22].forEach((w, i) => { ws.getColumn(i + 1).width = w; });

  const t = ws.getCell(1, 1);
  t.value = `Cartera · ${d.empresa || 'Comercio'}`;
  t.font = { bold: true, color: { argb: COLOR_TINTA }, size: 16 };
  ws.getRow(1).height = 26;

  let fila = 3;
  const dato = (etiqueta: string, valor: any, fmt?: string) => {
    estiloEtiqueta(ws.getCell(fila, 1));
    ws.getCell(fila, 1).value = etiqueta;
    const c = ws.getCell(fila, 2);
    c.value = valor;
    c.font = { color: { argb: COLOR_TINTA }, size: 10 };
    c.alignment = { horizontal: 'left', wrapText: false };
    if (fmt) c.numFmt = fmt;
    fila++;
  };
  dato('COMERCIO', d.empresa);
  dato('GENERADO EL', fechaHoraExcel(d.ahora), FMT_FECHA_HORA);
  dato('GENERADO POR', d.usuario || '—');
  if (d.filtros.length === 0) {
    dato('FILTROS APLICADOS', 'Toda la cartera (sin filtros)');
  } else {
    d.filtros.forEach((par, i) => dato(i === 0 ? 'FILTROS APLICADOS' : '', `${par[0]}: ${par[1]}`));
  }
  dato('ORDEN', d.orden);
  dato('PEDIDOS CON SALDO', res.pedidos, FMT_ENTERO);
  dato('CLIENTES', res.clientes, FMT_ENTERO);

  // Totales
  fila++;
  titulo(ws, fila++, 'Totales');
  encabezadoBloque(ws, fila++, ['Concepto', 'Saldo', '% de la cartera', 'Pedidos']);
  const pct = (x: number) => (res.total > 0 ? x / res.total : 0);
  const pedidosVencidos = res.rangos.slice(1).reduce((s, x) => s + x.pedidos, 0);
  const filasTotales: [string, number, number | null, number][] = [
    ['Cartera total', res.total, 1, res.pedidos],
    ['Cartera vencida (desde el día 1)', res.vencida, pct(res.vencida), pedidosVencidos],
    ['Sin vencer', res.sinVencer, pct(res.sinVencer), res.rangos[0].pedidos],
    ['Por vencer en los próximos 7 días', res.porVencer7, pct(res.porVencer7), res.porVencer7Pedidos],
  ];
  filasTotales.forEach(([etq, saldo, p, n]) => {
    ws.getCell(fila, 1).value = etq;
    ws.getCell(fila, 2).value = saldo;
    ws.getCell(fila, 2).numFmt = FMT_PESOS;
    ws.getCell(fila, 3).value = p;
    ws.getCell(fila, 3).numFmt = FMT_PORCENTAJE;
    ws.getCell(fila, 4).value = n;
    ws.getCell(fila, 4).numFmt = FMT_ENTERO;
    fila++;
  });
  const nota = ws.getCell(fila, 1);
  nota.value = '«Por vencer» ya está incluido en «Sin vencer»; no se suma aparte.';
  nota.font = { italic: true, color: { argb: COLOR_MUTED }, size: 9 };
  fila += 2;

  // Antigüedad
  titulo(ws, fila++, 'Antigüedad');
  encabezadoBloque(ws, fila++, ['Rango', 'Saldo', '% de la cartera', 'Pedidos']);
  res.rangos.forEach((x) => {
    ws.getCell(fila, 1).value = x.rango;
    ws.getCell(fila, 2).value = x.saldo;
    ws.getCell(fila, 2).numFmt = FMT_PESOS;
    ws.getCell(fila, 3).value = pct(x.saldo);
    ws.getCell(fila, 3).numFmt = FMT_PORCENTAJE;
    ws.getCell(fila, 4).value = x.pedidos;
    ws.getCell(fila, 4).numFmt = FMT_ENTERO;
    fila++;
  });
  fila++;

  // Por vendedor
  titulo(ws, fila++, 'Por vendedor');
  encabezadoBloque(ws, fila++, ['Vendedor', 'Clientes', 'Cartera total', 'Cartera vencida', '% vencido', '% de la cartera']);
  res.vendedores.forEach((v) => {
    ws.getCell(fila, 1).value = v.vendedor;
    ws.getCell(fila, 2).value = v.clientes;
    ws.getCell(fila, 2).numFmt = FMT_ENTERO;
    ws.getCell(fila, 3).value = v.total;
    ws.getCell(fila, 3).numFmt = FMT_PESOS;
    ws.getCell(fila, 4).value = v.vencida;
    ws.getCell(fila, 4).numFmt = FMT_PESOS;
    ws.getCell(fila, 5).value = v.total > 0 ? v.vencida / v.total : 0;
    ws.getCell(fila, 5).numFmt = FMT_PORCENTAJE;
    ws.getCell(fila, 6).value = pct(v.total);
    ws.getCell(fila, 6).numFmt = FMT_PORCENTAJE;
    fila++;
  });
  fila++;

  // Mayores deudores
  titulo(ws, fila++, '10 mayores deudores');
  encabezadoBloque(ws, fila++, ['Cliente', 'Documento', 'Saldo', 'Vencido', '% de la cartera', 'Vendedor', 'Teléfono']);
  res.mayores.forEach((m) => {
    ws.getCell(fila, 1).value = m.cliente;
    ws.getCell(fila, 2).value = m.documento;
    ws.getCell(fila, 2).alignment = { horizontal: 'right' };
    ws.getCell(fila, 3).value = m.saldo;
    ws.getCell(fila, 3).numFmt = FMT_PESOS;
    ws.getCell(fila, 4).value = m.vencida;
    ws.getCell(fila, 4).numFmt = FMT_PESOS;
    ws.getCell(fila, 5).value = pct(m.saldo);
    ws.getCell(fila, 5).numFmt = FMT_PORCENTAJE;
    ws.getCell(fila, 6).value = m.vendedor;
    ws.getCell(fila, 7).value = m.telefono;
    fila++;
  });

  // Tinta suave en el cuerpo y banda lila en las etiquetas de totales.
  ws.eachRow((row: any) => row.eachCell((cell: any) => {
    if (!cell.font || !cell.font.color) cell.font = { ...(cell.font || {}), color: { argb: COLOR_TINTA }, size: (cell.font && cell.font.size) || 10 };
  }));
  ws.pageSetup = { orientation: 'landscape', fitToPage: true, fitToWidth: 1, fitToHeight: 0 };
}

function hojaPorCliente(wb: any, filas: FilaPorCliente[]): void {
  const ws = wb.addWorksheet('Por cliente');
  const cols: ColTabla[] = [
    { nombre: 'Cliente', ancho: 34 },
    { nombre: 'Documento', ancho: 16 },
    { nombre: 'Vendedor', ancho: 22 },
    { nombre: 'Plazo (días)', ancho: 11, fmt: '0', derecha: true },
    { nombre: 'Cupo', ancho: 15, fmt: FMT_PESOS, derecha: true },
    { nombre: '# Pedidos', ancho: 10, fmt: '0', derecha: true },
    { nombre: 'Saldo', ancho: 15, fmt: FMT_PESOS, derecha: true },
    { nombre: 'Sin vencer', ancho: 15, fmt: FMT_PESOS, derecha: true },
    { nombre: '1-15 días', ancho: 15, fmt: FMT_PESOS, derecha: true },
    { nombre: '16-30 días', ancho: 15, fmt: FMT_PESOS, derecha: true },
    { nombre: '31-60 días', ancho: 15, fmt: FMT_PESOS, derecha: true },
    { nombre: '61-90 días', ancho: 15, fmt: FMT_PESOS, derecha: true },
    { nombre: '+90 días', ancho: 15, fmt: FMT_PESOS, derecha: true },
    { nombre: 'Días del pedido más vencido', ancho: 16, fmt: '0', derecha: true },
    { nombre: 'Teléfono', ancho: 18 },
    { nombre: 'Correo', ancho: 32 },
  ];
  const datos = filas.map((f) => [
    f.cliente, f.documento, f.vendedor, f.plazo, f.cupo, f.pedidos, f.saldo, ...f.porRango, f.diasMasVencido, f.telefono, f.correo,
  ]);
  agregarTabla(ws, 'TablaPorCliente', 1, cols, datos);
  ws.views = [{ state: 'frozen', xSplit: 1, ySplit: 1 }];
}

function hojaDetalle(wb: any, filas: FilaDetalle[]): void {
  const ws = wb.addWorksheet('Detalle');
  const cols: ColTabla[] = [
    { nombre: 'Cliente', ancho: 34 },
    { nombre: 'Documento', ancho: 16 },
    { nombre: 'Teléfono', ancho: 18 },
    { nombre: 'Correo', ancho: 32 },
    { nombre: 'Ciudad', ancho: 18 },
    { nombre: 'Vendedor', ancho: 22 },
    { nombre: 'Plazo (días)', ancho: 11, fmt: '0', derecha: true },
    { nombre: 'Pedido', ancho: 14 },
    { nombre: 'Factura electrónica', ancho: 18 },
    { nombre: 'Estado de pago', ancho: 18 },
    { nombre: 'Entregado', ancho: 11 },
    { nombre: 'Fecha de compra', ancho: 14, fmt: FMT_FECHA, derecha: true },
    { nombre: 'Fecha de entrega', ancho: 14, fmt: FMT_FECHA, derecha: true },
    { nombre: 'Límite de pago', ancho: 14, fmt: FMT_FECHA, derecha: true },
    { nombre: 'Último abono', ancho: 14, fmt: FMT_FECHA, derecha: true },
    { nombre: 'Total', ancho: 15, fmt: FMT_PESOS, derecha: true },
    { nombre: 'Pagado', ancho: 15, fmt: FMT_PESOS, derecha: true },
    { nombre: 'Saldo', ancho: 15, fmt: FMT_PESOS, derecha: true },
    { nombre: 'Días vencido', ancho: 12, fmt: '0', derecha: true },
    { nombre: 'Antigüedad', ancho: 24 },
    { nombre: 'Link al pedido', ancho: 16 },
  ];
  const datos = filas.map((f) => [
    f.cliente, f.documento, f.telefono, f.correo, f.ciudad, f.vendedor, f.plazo, f.pedido, f.factura, f.estadoPago, f.entregado,
    f.compra, f.entrega, f.limite, f.ultimoAbono, f.total, f.pagado, f.saldo, f.diasVencido, f.antiguedad,
    f.linkPedido ? 'Abrir pedido' : '',
  ]);
  const FILA_ENC = 3;
  const primera = agregarTabla(ws, 'TablaDetalle', FILA_ENC, cols, datos);

  // Links: al pedido y, cuando hay, al PDF de la factura.
  const colFactura = cols.findIndex((c) => c.nombre === 'Factura electrónica') + 1;
  const colLink = cols.findIndex((c) => c.nombre === 'Link al pedido') + 1;
  filas.forEach((f, i) => {
    const r = primera + i;
    if (f.linkPedido) {
      const c = ws.getCell(r, colLink);
      c.value = { text: 'Abrir pedido', hyperlink: f.linkPedido };
      c.font = { color: { argb: COLOR_ACENTO }, underline: true, size: 10 };
    }
    if (f.factura && f.facturaUrl) {
      const c = ws.getCell(r, colFactura);
      c.value = { text: f.factura, hyperlink: f.facturaUrl };
      c.font = { color: { argb: COLOR_ACENTO }, underline: true, size: 10 };
    }
  });

  // Fila 1: qué es. Fila 2: subtotales de lo que quede visible (SUBTOTAL ignora lo que el filtro esconde).
  const t = ws.getCell(1, 1);
  t.value = 'Detalle de cartera: una fila por pedido con saldo';
  t.font = { bold: true, color: { argb: COLOR_TINTA }, size: 12 };
  const etq = ws.getCell(2, 1);
  etq.value = 'Suma de lo visible (cambia al filtrar)';
  etq.font = { bold: true, color: { argb: COLOR_MUTED }, size: 9 };
  const ultima = primera + Math.max(filas.length, 1) - 1;
  (['Total', 'Pagado', 'Saldo'] as const).forEach((nombre) => {
    const idx = cols.findIndex((c) => c.nombre === nombre) + 1;
    const letra = ws.getColumn(idx).letter;
    const suma = filas.reduce((s, f) => s + (nombre === 'Total' ? f.total : nombre === 'Pagado' ? f.pagado : f.saldo), 0);
    const c = ws.getCell(2, idx);
    c.value = { formula: `SUBTOTAL(109,${letra}${primera}:${letra}${ultima})`, result: suma };
    c.numFmt = FMT_PESOS;
    c.font = { bold: true, color: { argb: COLOR_TINTA }, size: 10 };
    c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLOR_LILA } };
    c.border = { bottom: { style: 'thin', color: { argb: COLOR_BORDE } } };
    c.alignment = { horizontal: 'right' };
  });
  ws.views = [{ state: 'frozen', xSplit: 1, ySplit: FILA_ENC }];
}

/** Arma el libro completo. `ExcelJS` es el módulo cargado con `await import('exceljs')`. */
export function construirLibroCartera(ExcelJS: any, d: DatosExcelCartera): any {
  const lib = ExcelJS && ExcelJS.Workbook ? ExcelJS : ExcelJS.default;
  const wb = new lib.Workbook();
  wb.creator = 'Katuq';
  wb.created = d.ahora;
  hojaResumen(wb, d, resumenDeVista(d.vista));
  hojaPorCliente(wb, filasPorCliente(d.vista));
  hojaDetalle(wb, filasDetalle(d.vista, d.origen));
  return wb;
}
