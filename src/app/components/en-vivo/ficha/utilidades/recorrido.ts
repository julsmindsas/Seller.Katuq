import { EtapaId, EtapaInfo, PedidoEnVivo } from '../../servicios/en-vivo.modelos';
import { diaDeColombia, diaYMes, horaDeReloj, horaRelativa } from '../../utilidades/formato';
import { claseTono } from '../../utilidades/tonos';
import { Traductor } from '../../utilidades/traductor';
import { PasoRecorrido } from '../ficha.modelos';

/**
 * Recorrido de hoy de un pedido: cada etapa cumplida con su hora, la actual resaltada y las que
 * faltan como pendientes. Puro: la hora actual entra por parámetro.
 *
 * Las horas son las que vio el distribuidor del servidor (`horas`). Una etapa cumplida antes de que
 * el servidor empezara a observar el pedido no tiene hora: el paso aparece cumplido y dice
 * "Sin hora registrada" (spec `ficha-en-vivo`, escenario "Etapa sin hora").
 */

/** Pasos de un pedido normal, con el nombre que lleva el recorrido (distinto del de la franja). */
export const PASOS_RECORRIDO: ReadonlyArray<{ id: EtapaId; clave: string }> = [
  { id: 'recibido', clave: 'enVivo.ficha.pasoRecibido' },
  { id: 'produccion', clave: 'enVivo.ficha.pasoProduccion' },
  { id: 'producido', clave: 'enVivo.ficha.pasoProducido' },
  { id: 'empacado', clave: 'enVivo.ficha.pasoEmpacado' },
  { id: 'listo', clave: 'enVivo.ficha.pasoListo' },
  { id: 'camino', clave: 'enVivo.ficha.pasoCamino' },
  { id: 'entregado', clave: 'enVivo.ficha.pasoEntregado' },
];

export const CLAVE_SIN_HORA = 'enVivo.ficha.sinHoraRegistrada';
export const CLAVE_PENDIENTE = 'enVivo.ficha.pendiente';

const ES_FINAL: ReadonlyArray<EtapaId> = ['rechazado', 'cancelado'];

function esHora(valor: unknown): valor is number {
  return typeof valor === 'number' && Number.isFinite(valor);
}

/**
 * "3:40 p. m. · hace 20 min" si es de hoy; "7 de octubre · 3:40 p. m." si es de otro día.
 * Vacío si no hay hora.
 */
export function textoDeHora(ms: number | null | undefined, ahoraMs: number, t: Traductor): string {
  if (!esHora(ms)) return '';
  const hora = horaDeReloj(ms, t);
  if (diaDeColombia(ms) === diaDeColombia(ahoraMs)) {
    const relativa = horaRelativa(ms, ahoraMs, t);
    return relativa ? `${hora} · ${relativa}` : hora;
  }
  return `${diaYMes(diaDeColombia(ms), t)} · ${hora}`;
}

/** Hora (ms) en que el pedido entró a la etapa, o null si no se vio. La llegada sale también de `tC`. */
export function horaDeEtapa(pedido: PedidoEnVivo, etapa: EtapaId): number | null {
  const directa = pedido.horas ? pedido.horas[etapa] : undefined;
  if (esHora(directa)) return directa;
  const atajo = etapa === 'listo' ? pedido.tL : etapa === 'camino' ? pedido.tS : etapa === 'entregado' ? pedido.tE : undefined;
  if (esHora(atajo)) return atajo;
  if (etapa === 'recibido' && esHora(pedido.tC)) return pedido.tC;
  return null;
}

export interface OpcionesRecorrido {
  etapas: ReadonlyMap<EtapaId, EtapaInfo>;
  ahoraMs: number;
  /** Hora en que se vio el pedido rechazado o cancelado (viene de los eventos); null = no se sabe. */
  horaFinal?: number | null;
  /** Quién lo llevó, para el paso "Salió a entrega": "con Carlos". Vacío = no se muestra. */
  salida?: string;
  /** Ids de pasos que se acaban de cumplir: entran animados. */
  nuevos?: ReadonlySet<string>;
  /** Traductor del componente. */
  t: Traductor;
}

function claseDe(etapas: ReadonlyMap<EtapaId, EtapaInfo>, etapa: EtapaId): string {
  return claseTono(etapas.get(etapa)?.tono ?? 'neutro');
}

/** Arma los pasos del recorrido de un pedido. */
export function armarRecorrido(pedido: PedidoEnVivo, opciones: OpcionesRecorrido): PasoRecorrido[] {
  const { etapas, ahoraMs, t } = opciones;
  const nuevos = opciones.nuevos ?? new Set<string>();
  const cuando = (ms: number | null): string => textoDeHora(ms, ahoraMs, t) || t(CLAVE_SIN_HORA);

  // Venta de mostrador: nace entregada, no pasa por la franja.
  if (pedido.canal === 'POS' && pedido.etapa === 'entregado') {
    const llegada = horaDeEtapa(pedido, 'recibido');
    return [
      {
        id: 'pos',
        nombre: t('enVivo.ficha.pasoVentaPos'),
        detalle: t('enVivo.ficha.pasoVentaPosDetalle', { cuando: cuando(llegada) }),
        cumplido: true,
        actual: false,
        sinHora: llegada === null,
        nuevo: nuevos.has('pos'),
        clase: claseDe(etapas, 'entregado'),
      },
    ];
  }

  const etapa = pedido.etapa;
  const termino = ES_FINAL.indexOf(etapa) !== -1;

  // Índice del último paso cumplido. Rechazado y cancelado no llevan hora: se llega hasta el último
  // paso con hora y ahí se corta el recorrido.
  let indice: number;
  if (termino) {
    indice = -1;
    PASOS_RECORRIDO.forEach((paso, i) => {
      if (horaDeEtapa(pedido, paso.id) !== null) indice = i;
    });
  } else {
    indice = PASOS_RECORRIDO.findIndex((paso) => paso.id === etapa);
    if (indice === -1) indice = 0;
  }

  const pasos: PasoRecorrido[] = [];
  PASOS_RECORRIDO.forEach((paso, i) => {
    if (termino && i > indice) return;
    const cumplido = i <= indice;
    const actual = !termino && cumplido && i === indice && etapa !== 'entregado';
    const hora = cumplido ? horaDeEtapa(pedido, paso.id) : null;
    const extra = paso.id === 'camino' && cumplido && opciones.salida ? ` · ${opciones.salida}` : '';
    pasos.push({
      id: paso.id,
      nombre: t(paso.clave),
      detalle: cumplido ? `${cuando(hora)}${extra}` : t(CLAVE_PENDIENTE),
      cumplido,
      actual,
      sinHora: cumplido && hora === null,
      nuevo: cumplido && nuevos.has(paso.id),
      clase: cumplido ? claseDe(etapas, paso.id) : 't-slate',
    });
  });

  if (termino) {
    const hora = esHora(opciones.horaFinal) ? opciones.horaFinal : null;
    pasos.push({
      id: etapa,
      nombre: t(etapa === 'rechazado' ? 'enVivo.ficha.pasoRechazado' : 'enVivo.ficha.pasoCancelado'),
      detalle: cuando(hora),
      cumplido: true,
      actual: true,
      sinHora: hora === null,
      nuevo: nuevos.has(etapa),
      clase: claseDe(etapas, etapa),
    });
  }
  return pasos;
}

/** Ids de los pasos cumplidos: sirve para saber cuál se cumplió mientras la ficha estaba abierta. */
export function idsCumplidos(pasos: ReadonlyArray<PasoRecorrido>): string[] {
  return pasos.filter((p) => p.cumplido).map((p) => p.id);
}

/** Ids que están en `ahora` y no estaban en `antes`. Con `antes` null (primera vez) no hay nuevos. */
export function pasosNuevos(antes: ReadonlyArray<string> | null, ahora: ReadonlyArray<string>): string[] {
  if (antes === null) return [];
  return ahora.filter((id) => antes.indexOf(id) === -1);
}
