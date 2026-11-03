import { CarteraCliente } from '../../shared/services/cartera/cartera.models';

/**
 * Ticket 1464 (punto 4): resumen de la cartera por vendedor. Sale de los mismos clientes que ya
 * trae la pantalla (el vendedor de cada cliente es el asesor de su pedido), así que cuadra con las
 * tarjetas: la suma de la columna «Cartera total» es la cartera total.
 */
export interface ResumenVendedor {
  /** Nombre del vendedor tal como llega ('' = sin vendedor asignado). */
  vendedor: string;
  carteraTotal: number;
  carteraVencida: number;
  /** % vencido de lo suyo (0 a 100, un decimal). */
  pctVencido: number;
  clientes: number;
  /** Su parte de toda la cartera (0 a 100, un decimal). */
  pctDelTotal: number;
}

function redondear1(n: number): number {
  return Math.round(n * 10) / 10;
}

/**
 * Ticket 1457 (bandera `carteraVendedorMora`): el mismo resumen pero sumado por el vendedor de CADA pedido (un cliente con
 * pedidos de dos vendedores aporta a cada uno lo suyo; el total no cambia). Es la misma cuenta que hace el servidor en
 * `porVendedor`, así que el resumen de 1464 y la vista «Agrupar por vendedor» muestran un solo número.
 */
function resumenPorVendedorDePedidos(clientes: CarteraCliente[]): ResumenVendedor[] {
  const mapa = new Map<string, { total: number; vencida: number; docs: Set<string> }>();
  let granTotal = 0;
  clientes.forEach((c) => {
    (c.pedidos || []).forEach((p) => {
      const saldo = Number(p.saldo) || 0;
      if (saldo <= 0) return;
      const clave = (p.vendedor || '').trim();
      const actual = mapa.get(clave) || { total: 0, vencida: 0, docs: new Set<string>() };
      actual.total += saldo;
      if ((Number(p.diasVencido) || 0) > 0) actual.vencida += saldo;
      actual.docs.add(c.documento || c.nombre || '');
      mapa.set(clave, actual);
      granTotal += saldo;
    });
  });
  return ordenarResumen(Array.from(mapa.entries()).map(([vendedor, v]) => ({
    vendedor,
    carteraTotal: v.total,
    carteraVencida: v.vencida,
    pctVencido: v.total > 0 ? redondear1((v.vencida / v.total) * 100) : 0,
    clientes: v.docs.size,
    pctDelTotal: granTotal > 0 ? redondear1((v.total / granTotal) * 100) : 0,
  })));
}

function ordenarResumen(filas: ResumenVendedor[]): ResumenVendedor[] {
  return filas.sort((a, b) => {
    if (!a.vendedor !== !b.vendedor) return a.vendedor ? -1 : 1; // sin vendedor al final
    return b.carteraTotal - a.carteraTotal;
  });
}

/** Un renglón por vendedor, del que más cartera concentra al que menos; sin vendedor al final. */
export function resumenPorVendedor(clientes: CarteraCliente[] | null | undefined): ResumenVendedor[] {
  if ((clientes || []).some((c) => (c.pedidos || []).some((p) => p.vendedor !== undefined))) {
    return resumenPorVendedorDePedidos(clientes as CarteraCliente[]);
  }
  const mapa = new Map<string, { total: number; vencida: number; clientes: number }>();
  let granTotal = 0;
  (clientes || []).forEach((c) => {
    const saldo = Number(c.saldoPendiente) || 0;
    if (saldo <= 0) return;
    const clave = (c.vendedor || '').trim();
    const actual = mapa.get(clave) || { total: 0, vencida: 0, clientes: 0 };
    actual.total += saldo;
    actual.vencida += Number(c.vencido) || 0;
    actual.clientes += 1;
    mapa.set(clave, actual);
    granTotal += saldo;
  });
  return Array.from(mapa.entries())
    .map(([vendedor, v]) => ({
      vendedor,
      carteraTotal: v.total,
      carteraVencida: v.vencida,
      pctVencido: v.total > 0 ? redondear1((v.vencida / v.total) * 100) : 0,
      clientes: v.clientes,
      pctDelTotal: granTotal > 0 ? redondear1((v.total / granTotal) * 100) : 0,
    }))
    .sort((a, b) => {
      if (!a.vendedor !== !b.vendedor) return a.vendedor ? -1 : 1; // sin vendedor al final
      return b.carteraTotal - a.carteraTotal;
    });
}
