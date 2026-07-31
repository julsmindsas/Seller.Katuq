/**
 * Núcleo de cálculo canónico de IVA — spec 010 (T-07, Fase B).
 *
 * ESPEJO EXACTO del backend `functions/services/orderCalculationService.js`
 * (`resolverPrecioLinea` + `tierSinIVA` + `calcularTotalesPedido`).
 * Mismas reglas → mismos números. Validado con los fixtures dorados compartidos
 * (`specs/010/contracts/iva-fixtures.json`).
 *
 * Framework-agnóstico: SIN dependencias de Angular. PURO (no muta el pedido).
 * Jerarquía: manual → tipo de cliente (categoría) → volumen → base.
 * Ancla A: IVA = precioSinIVA_resuelto × (tarifa/100). NUNCA confía en montos de
 * IVA pre-guardados (valorUnitarioPorVolumenIva / precioCategoria.valorIva).
 *
 * NOTA F-11: este núcleo nunca recibe ni usa el `totalImpuesto` persistido, así que
 * es estructuralmente imposible reintroducir el echo `canon || persistido` del viejo.
 */

export const TARIFAS_DESGLOSE = ["0", "5", "8", "19"] as const;

export interface FuenteLinea {
  fuentePrecio: string;
  precioSinIVA: number;
  tarifa: number;
}

export interface TotalesCanonicos {
  subtotalSinDescuento: number;
  totalDescuento: number;
  totalEnvio: number;
  totalImpuesto: number;
  desgloseIVA: { "0": number; "5": number; "8": number; "19": number };
  total: number;
}

const _num = (v: any): number => {
  const n = Number(v);
  return isNaN(n) ? 0 : n;
};
const _redondear = (x: any): number => Math.round((Number(x) || 0) * 100) / 100;

/** Sin-IVA robusto de un tier de volumen: usa el sinIVA y, si falta/0, lo deriva del conIVA. */
export const tierSinIVA = (rango: any): number => {
  const sinIva = _num(rango?.valorUnitarioPorVolumenSinIVA);
  if (sinIva > 0) return sinIva;
  const conIva = _num(rango?.valorUnitarioPorVolumenConIVA);
  const tarifa = _num(rango?.valorIVAPorVolumen);
  if (conIva > 0) return conIva / (1 + tarifa / 100);
  return 0; // sin dato derivable → el caller cae a base
};

const _rangoVolumenPorCantidad = (preciosVolumen: any, cantidad: number): any => {
  if (!Array.isArray(preciosVolumen)) return null;
  for (const x of preciosVolumen) {
    const ini = _num(x?.numeroUnidadesInicial);
    const lim = x?.numeroUnidadesLimite == null ? Infinity : _num(x.numeroUnidadesLimite);
    if (cantidad >= ini && cantidad <= lim) return x;
  }
  return null;
};

/**
 * Resuelve { fuentePrecio, precioSinIVA, tarifa } de una línea según jerarquía.
 * @param item ítem del carrito
 * @param ctx  { categoriaClienteId }
 */
export const resolverPrecioLinea = (item: any, ctx: { categoriaClienteId?: any } = {}): FuenteLinea => {
  const producto = item?.producto || {};
  const precio = producto.precio || {};
  const cantidad = _num(item?.cantidad);
  const ivaManual =
    item?._ivaManualOverride !== undefined && item?._ivaManualOverride !== null
      ? _num(item._ivaManualOverride)
      : null;

  // 1. Precio manual (prima sobre todo, solo si el producto lo permite)
  const tienePrecioManual =
    item?._precioManualOverride !== undefined &&
    item?._precioManualOverride !== null &&
    producto?.procesoComercial?.permitePrecioManual === true;
  if (tienePrecioManual) {
    return {
      fuentePrecio: "manual",
      precioSinIVA: _num(item._precioManualOverride),
      tarifa: ivaManual !== null ? ivaManual : _num(precio.precioUnitarioIva),
    };
  }

  // 2. Precio por tipo de cliente (categoría) — GANA a volumen (AC-10)
  const categoriaId = ctx.categoriaClienteId;
  const preciosTipo = producto.preciosPorTipoCliente;
  if (categoriaId && Array.isArray(preciosTipo)) {
    const pc = preciosTipo.find((p: any) => p?.tipoClienteId === categoriaId && p?.activo === true);
    if (pc) {
      return {
        fuentePrecio: "categoria",
        precioSinIVA: _num(pc.precio),
        tarifa: ivaManual !== null ? ivaManual : _num(pc.porcentajeIva),
      };
    }
  }

  // 3. Precio por volumen (sinIVA robusto)
  const rango = _rangoVolumenPorCantidad(precio.preciosVolumen, cantidad);
  if (rango) {
    const sinIvaTier = tierSinIVA(rango);
    return {
      fuentePrecio: sinIvaTier > 0 ? "volumen" : "volumen-fallback-base",
      precioSinIVA: sinIvaTier > 0 ? sinIvaTier : _num(precio.precioUnitarioSinIva),
      tarifa: ivaManual !== null ? ivaManual : _num(rango.valorIVAPorVolumen),
    };
  }

  // 4. Precio base
  return {
    fuentePrecio: "base",
    precioSinIVA: _num(precio.precioUnitarioSinIva),
    tarifa: ivaManual !== null ? ivaManual : _num(precio.precioUnitarioIva),
  };
};

/**
 * Cálculo canónico de totales. PURO (no muta `order`).
 * Envío (D-058): order.totalEnvio SIN IVA + order.tarifaEnvio; IVA del envío una sola vez.
 */
export const calcularTotalesCanonico = (order: any): TotalesCanonicos => {
  const ctx = { categoriaClienteId: order?.cliente?.categoria?.id ?? null };
  const porceDesc = _num(order?.porceDescuento) / 100;
  const carrito = Array.isArray(order?.carrito) ? order.carrito : [];

  let subtotalProductos = 0;
  let subtotalNeto = 0;
  let totalImpuesto = 0;
  const desglose: { [k: string]: number } = { "0": 0, "5": 0, "8": 0, "19": 0 };
  const addDesglose = (tarifa: number, monto: number) => {
    const key = String(Math.round(_num(tarifa)));
    if ((TARIFAS_DESGLOSE as readonly string[]).includes(key)) desglose[key] += monto;
  };

  for (const item of carrito) {
    const cantidad = _num(item?.cantidad);
    if (cantidad <= 0) continue;

    const { precioSinIVA, tarifa } = resolverPrecioLinea(item, ctx);
    // Descuento de línea (0-100, opcional) compuesto con el global: aditivo —
    // sin descuentoLinea, factorDescuento = (1-porceDesc), idéntico al cálculo previo.
    const descLineaFrac = Math.min(1, Math.max(0, _num(item?.descuentoLinea) / 100));
    const factorDescuento = (1 - descLineaFrac) * (1 - porceDesc);

    const lineaSinIVA = precioSinIVA * cantidad;
    subtotalProductos += lineaSinIVA;
    subtotalNeto += lineaSinIVA * factorDescuento;
    const ivaLinea = lineaSinIVA * factorDescuento * (tarifa / 100);
    totalImpuesto += ivaLinea;
    addDesglose(tarifa, ivaLinea);

    // Adiciones y preferencias: misma ancla (sinIVA × su tarifa), mismo descuento de línea+global
    for (const grupo of ["adiciones", "preferencias"]) {
      const lista = item?.configuracion?.[grupo];
      if (!Array.isArray(lista)) continue;
      for (const extra of lista) {
        const extraSin = _num(extra?.valorUnitarioSinIva) * cantidad;
        const extraTarifa = _num(extra?.porcentajeIva);
        subtotalProductos += extraSin;
        subtotalNeto += extraSin * factorDescuento;
        const ivaExtra = extraSin * factorDescuento * (extraTarifa / 100);
        totalImpuesto += ivaExtra;
        addDesglose(extraTarifa, ivaExtra);
      }
    }
  }

  const descuento = subtotalProductos - subtotalNeto;

  // Envío (D-058)
  const totalEnvio = _num(order?.totalEnvio);
  const tarifaEnvio = _num(order?.tarifaEnvio);
  if (totalEnvio > 0 && tarifaEnvio > 0) {
    const ivaEnvio = totalEnvio * (tarifaEnvio / 100);
    totalImpuesto += ivaEnvio;
    addDesglose(tarifaEnvio, ivaEnvio);
  }

  const total = subtotalProductos - descuento + totalEnvio + totalImpuesto;

  return {
    subtotalSinDescuento: _redondear(subtotalProductos),
    totalDescuento: _redondear(descuento),
    totalEnvio: _redondear(totalEnvio),
    totalImpuesto: _redondear(totalImpuesto),
    desgloseIVA: {
      "0": _redondear(desglose["0"]),
      "5": _redondear(desglose["5"]),
      "8": _redondear(desglose["8"]),
      "19": _redondear(desglose["19"]),
    },
    total: _redondear(total),
  };
};

/**
 * Base (sin IVA, con descuento aplicado) de las líneas con tarifa 0 — para el campo
 * "totalExcluidos" del FE (presentación). El núcleo de totales se mantiene idéntico al BE.
 */
export const baseExcluidaCanonica = (order: any): number => {
  const ctx = { categoriaClienteId: order?.cliente?.categoria?.id ?? null };
  const porceDesc = _num(order?.porceDescuento) / 100;
  const carrito = Array.isArray(order?.carrito) ? order.carrito : [];
  let excluida = 0;
  for (const item of carrito) {
    const cantidad = _num(item?.cantidad);
    if (cantidad <= 0) continue;
    const { precioSinIVA, tarifa } = resolverPrecioLinea(item, ctx);
    const descLineaFrac = Math.min(1, Math.max(0, _num(item?.descuentoLinea) / 100));
    const factorDescuento = (1 - descLineaFrac) * (1 - porceDesc);
    if (Math.round(_num(tarifa)) === 0) excluida += precioSinIVA * cantidad * factorDescuento;
    for (const grupo of ["adiciones", "preferencias"]) {
      const lista = item?.configuracion?.[grupo];
      if (!Array.isArray(lista)) continue;
      for (const extra of lista) {
        if (Math.round(_num(extra?.porcentajeIva)) === 0)
          excluida += _num(extra?.valorUnitarioSinIva) * cantidad * factorDescuento;
      }
    }
  }
  return _redondear(excluida);
};
