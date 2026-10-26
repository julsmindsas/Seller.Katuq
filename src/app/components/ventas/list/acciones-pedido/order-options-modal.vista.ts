/**
 * D-547 (F1, D4 a D6 y D9): lo que el modal «Opciones del pedido» dibuja y decide, como funciones PURAS
 * (sin Angular) para probarlas con `node --test`. `OrderOptionsModalComponent` solo las llama.
 */
import {
  AccionPedido, AccionPedidoId, COLUMNAS_ACCIONES, ColumnaAccion,
  accionPorId, fijasDeColumna, tituloVisible,
} from './acciones-pedido.catalogo';
import { EstadoAccion, EstadoAcciones, contextoVisible, hijosVisibles } from './acciones-pedido.estado';
import { ItemBusqueda, accionParaEnter, candidatasBusqueda, filtrarAcciones } from './acciones-pedido.buscador';

/** Una tarjeta ya lista para pintar. */
export interface TarjetaVista {
  id: AccionPedidoId;
  titulo: string;
  resena: string;
  icono: string;
  habilitada: boolean;
  /** Solo si está deshabilitada: se pinta en lugar de la reseña. */
  motivo: string | null;
}

export interface ColumnaVista {
  id: ColumnaAccion;
  titulo: string;
  tarjetas: TarjetaVista[];
}

/** Una acción de la fila «Para este pedido». */
export interface ContextoVista extends TarjetaVista {
  /** Solo Factura electrónica con más de un hijo: abre la segunda fila. */
  desplegable: boolean;
}

export interface VistaModal {
  /** `true`: sin etiquetas de columna, en flujo (buscando, o pedido abierto desde Producción). */
  modoLista: boolean;
  columnas: ColumnaVista[];
  /** Resultados en flujo (modo lista). */
  lista: TarjetaVista[];
  /** Hay texto en el buscador y no coincide ninguna acción. */
  sinCoincidencias: boolean;
  contexto: ContextoVista[];
  /** Hijos de Factura electrónica que aplican (para la segunda fila). */
  hijosFactura: TarjetaVista[];
  /** `true`: la tarjeta Descuento abre un menú de dos opciones (Aplicar otro / Editar o quitar). */
  descuentoConMenu: boolean;
  /** Editar o quitar descuento: las dos opciones del menú. */
  opcionesDescuento: TarjetaVista[];
  /** Eliminar pedido (pie) visible. */
  puedeEliminar: boolean;
}

export function tarjeta(accion: AccionPedido, estado: EstadoAccion, revisado: boolean): TarjetaVista {
  const habilitada = estado.visible && estado.habilitada;
  return {
    id: accion.id,
    titulo: tituloVisible(accion, revisado),
    resena: accion.resena,
    icono: accion.icono,
    habilitada,
    motivo: habilitada ? null : (estado.motivo || null),
  };
}

export interface EntradaVista {
  estados: EstadoAcciones;
  texto: string;
  desdeProduccion: boolean;
  /** `pedido.revisadoParaProduccion`. */
  revisado: boolean;
}

export function construirVista(e: EntradaVista): VistaModal {
  const { estados, revisado } = e;
  const buscando = !!(e.texto && e.texto.trim());
  const modoLista = buscando || e.desdeProduccion;

  const columnas: ColumnaVista[] = COLUMNAS_ACCIONES.map(c => ({
    id: c.id,
    titulo: c.titulo,
    tarjetas: fijasDeColumna(c.id).map(a => tarjeta(a, estados[a.id], revisado)),
  }));

  let lista: TarjetaVista[] = [];
  if (modoLista) {
    const candidatas: ItemBusqueda[] = candidatasBusqueda(estados);
    lista = filtrarAcciones(buscando ? e.texto : '', candidatas).map(i => tarjeta(i.accion, i.estado, revisado));
    // Desde Producción (sin texto) la lista son solo las fijas que aplican; las de contexto van en su fila.
    if (!buscando) lista = lista.filter(t => accionPorId(t.id).tipo === 'fija');
  }

  const hijos = hijosVisibles(estados, 'electronicInvoice');
  const contexto: ContextoVista[] = contextoVisible(estados).map(id => {
    const a = accionPorId(id);
    if (id === 'electronicInvoice') {
      // Con un solo hijo, el botón lleva el nombre de ese hijo y lo ejecuta.
      if (hijos.length === 1) {
        const h = accionPorId(hijos[0]);
        return { ...tarjeta(h, estados[h.id], revisado), desplegable: false };
      }
      return { ...tarjeta(a, estados[a.id], revisado), desplegable: true };
    }
    return { ...tarjeta(a, estados[a.id], revisado), desplegable: false };
  });

  const hijosFactura = hijos.map(id => tarjeta(accionPorId(id), estados[id], revisado));

  const descuentoConMenu = estados.discount.visible && estados.discount.habilitada
    && estados.editDiscount.visible && estados.editDiscount.habilitada;
  const opcionesDescuento = descuentoConMenu
    ? [
        { ...tarjeta(accionPorId('discount'), estados.discount, revisado), titulo: 'Aplicar otro', resena: 'Aplica un código de descuento' },
        tarjeta(accionPorId('editDiscount'), estados.editDiscount, revisado),
      ]
    : [];

  return {
    modoLista,
    columnas,
    lista,
    sinCoincidencias: buscando && lista.length === 0,
    contexto,
    hijosFactura,
    descuentoConMenu,
    opcionesDescuento,
    puedeEliminar: estados.deleteOrder.visible && estados.deleteOrder.habilitada,
  };
}

/** Qué pasa al tocar una tarjeta: emitir la acción, abrir un menú o nada. */
export type ResultadoClic =
  | { tipo: 'emitir'; id: AccionPedidoId }
  | { tipo: 'menuDescuento' }
  | { tipo: 'menuFactura' }
  | { tipo: 'nada' };

export function resolverClic(tarjetaTocada: TarjetaVista, vista: VistaModal, desplegable = false): ResultadoClic {
  if (!tarjetaTocada.habilitada) return { tipo: 'nada' };
  if (desplegable) return { tipo: 'menuFactura' };
  if (tarjetaTocada.id === 'discount' && vista.descuentoConMenu) return { tipo: 'menuDescuento' };
  return { tipo: 'emitir', id: tarjetaTocada.id };
}

/** Enter en el buscador: la acción a emitir (solo si queda exactamente una coincidencia y está habilitada). */
export function resolverEnter(estados: EstadoAcciones, texto: string): AccionPedidoId | null {
  if (!texto || !texto.trim()) return null;
  return accionParaEnter(filtrarAcciones(texto, candidatasBusqueda(estados)));
}
