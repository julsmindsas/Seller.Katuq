import { VistaCartera } from './cartera-filtros.util';
import { diaExcel, fechaHoraExcel, pesos } from './cartera-excel.util';
import { RELACION_ES, TIPOS_INTERNOS } from './cartera.constants';

/**
 * Ticket 1461: el Excel «para nómina» de la Cartera interna (empleados, socios, empresa propia).
 * Una hoja de datos lista para cruzar con la nómina (documento, nombre, tipo, saldo, pedidos, pedido más
 * antiguo y días promedio) y una hoja «Resumen» con quién lo generó, los filtros y el total por tipo.
 * Sale de la misma vista que se ve en pantalla (mismos filtros y mismo orden). Solo muestra y exporta el
 * saldo: el descuento de nómina y su soporte (autorización escrita del empleado) son del comercio.
 * Puro (sin Angular): recibe la librería de Excel por parámetro para cargarla bajo demanda.
 */

const COLOR_ACENTO = 'FF5F3FE0';
const COLOR_TINTA = 'FF211F3A';
const COLOR_MUTED = 'FF6B6890';
const COLOR_LILA = 'FFF3F0FF';
const COLOR_BORDE = 'FFE4DFF7';
const FMT_PESOS = '"$" #,##0';
const FMT_FECHA = 'dd/mm/yyyy';
const FMT_FECHA_HORA = 'dd/mm/yyyy hh:mm';
const FMT_ENTERO = '#,##0';

export interface DatosExcelNomina {
  empresa: string;
  usuario: string;
  ahora: Date;
  /** Filtros aplicados como pares [nombre, valor]; vacío = toda la cartera interna. */
  filtros: string[][];
  vista: VistaCartera;
}

/** Una fila de la hoja «Para nómina»: un cliente interno. */
export interface FilaNomina {
  documento: string;
  nombre: string;
  tipo: string;
  saldo: number;
  pedidos: number;
  /** Fecha de compra del pedido más antiguo con saldo; null si ninguno la trae. */
  masAntiguo: Date | null;
  /** Días promedio en cartera (ponderado por saldo). */
  diasPromedio: number;
}

/** Las filas en el mismo orden de la pantalla; el saldo es la suma de los pedidos visibles ya redondeados a pesos. */
export function filasNomina(vista: VistaCartera): FilaNomina[] {
  return vista.filas.map((f) => {
    const c = f.cliente;
    let masAntiguo: Date | null = null;
    f.pedidos.forEach((p) => {
      const d = diaExcel(p.fechaCompra || p.fechaEntrega);
      if (d && (!masAntiguo || d.getTime() < masAntiguo.getTime())) masAntiguo = d;
    });
    return {
      documento: c.documento || '',
      nombre: c.nombre || '',
      tipo: RELACION_ES[c.relationType || 'customer'] || '',
      saldo: f.pedidos.reduce((s, p) => s + pesos(p.saldo), 0),
      pedidos: f.pedidos.length,
      masAntiguo,
      diasPromedio: Math.max(0, Math.round(Number(c.dso) || 0)),
    };
  });
}

/** Total y cantidad de clientes por tipo, solo de los tipos internos (los que no tienen filas salen en cero). */
export function totalesPorTipo(filas: FilaNomina[]): { tipo: string; clientes: number; saldo: number }[] {
  return TIPOS_INTERNOS.map((t) => {
    const nombre = RELACION_ES[t];
    const delTipo = filas.filter((f) => f.tipo === nombre);
    return { tipo: nombre, clientes: delTipo.length, saldo: delTipo.reduce((s, f) => s + f.saldo, 0) };
  });
}

function hojaDatos(wb: any, filas: FilaNomina[]): void {
  const ws = wb.addWorksheet('Para nómina', { views: [{ state: 'frozen', ySplit: 1 }] });
  ws.columns = [
    { header: 'Documento', key: 'documento', width: 18 },
    { header: 'Nombre', key: 'nombre', width: 38 },
    { header: 'Tipo de relación', key: 'tipo', width: 18 },
    { header: 'Saldo pendiente', key: 'saldo', width: 18, style: { numFmt: FMT_PESOS } },
    { header: 'Pedidos con saldo', key: 'pedidos', width: 18, style: { numFmt: FMT_ENTERO } },
    { header: 'Pedido más antiguo', key: 'masAntiguo', width: 20, style: { numFmt: FMT_FECHA } },
    { header: 'Días promedio en cartera', key: 'diasPromedio', width: 24, style: { numFmt: FMT_ENTERO } },
  ];
  filas.forEach((f) => ws.addRow(f));
  const cabecera = ws.getRow(1);
  cabecera.font = { bold: true, color: { argb: 'FFFFFFFF' } };
  cabecera.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLOR_ACENTO } };
  cabecera.alignment = { vertical: 'middle', wrapText: true };
  cabecera.height = 24;
  // El documento es texto: una cédula con ceros a la izquierda no debe volverse número.
  ws.getColumn('documento').numFmt = '@';
  ws.autoFilter = { from: { row: 1, column: 1 }, to: { row: 1, column: 7 } };
}

function hojaResumen(wb: any, d: DatosExcelNomina, filas: FilaNomina[]): void {
  const ws = wb.addWorksheet('Resumen');
  ws.getColumn(1).width = 30;
  ws.getColumn(2).width = 46;
  ws.getColumn(3).width = 18;
  const titulo = ws.addRow(['Cartera interna para nómina']);
  titulo.font = { bold: true, size: 16, color: { argb: COLOR_TINTA } };
  ws.addRow([]);
  const dato = (k: string, v: any, fmt?: string) => {
    const fila = ws.addRow([k, v]);
    fila.getCell(1).font = { bold: true, color: { argb: COLOR_MUTED } };
    if (fmt) fila.getCell(2).numFmt = fmt;
    fila.getCell(2).alignment = { horizontal: 'left' };
  };
  dato('Comercio', d.empresa || '—');
  dato('Generado por', d.usuario || '—');
  dato('Generado el', fechaHoraExcel(d.ahora), FMT_FECHA_HORA);
  if (d.filtros.length) {
    d.filtros.forEach(([k, v]) => dato(k, v));
  } else {
    dato('Filtros', 'Toda la cartera interna');
  }
  ws.addRow([]);
  const cab = ws.addRow(['Tipo de relación', 'Clientes', 'Saldo pendiente']);
  cab.font = { bold: true, color: { argb: COLOR_TINTA } };
  cab.eachCell((c: any) => {
    c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLOR_LILA } };
    c.border = { bottom: { style: 'thin', color: { argb: COLOR_BORDE } } };
  });
  totalesPorTipo(filas).forEach((t) => {
    const fila = ws.addRow([t.tipo, t.clientes, t.saldo]);
    fila.getCell(2).numFmt = FMT_ENTERO;
    fila.getCell(3).numFmt = FMT_PESOS;
  });
  const total = ws.addRow(['Total', filas.length, filas.reduce((s, f) => s + f.saldo, 0)]);
  total.font = { bold: true, color: { argb: COLOR_TINTA } };
  total.getCell(2).numFmt = FMT_ENTERO;
  total.getCell(3).numFmt = FMT_PESOS;
  ws.addRow([]);
  const nota = ws.addRow(['Katuq muestra y exporta el saldo. El descuento de nómina y su soporte (la autorización escrita del empleado) son del comercio.']);
  nota.font = { italic: true, color: { argb: COLOR_MUTED } };
}

/** Libro de Excel con la hoja «Para nómina» (datos) y la hoja «Resumen». */
export function construirLibroNomina(ExcelJS: any, d: DatosExcelNomina): any {
  const lib = ExcelJS && ExcelJS.Workbook ? ExcelJS : ExcelJS.default;
  const wb = new lib.Workbook();
  wb.creator = 'Katuq';
  wb.created = d.ahora;
  const filas = filasNomina(d.vista);
  hojaDatos(wb, filas);
  hojaResumen(wb, d, filas);
  return wb;
}
