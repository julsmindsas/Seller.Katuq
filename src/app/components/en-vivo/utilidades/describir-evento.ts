import { EtapaId, EtapaInfo, EventoEnVivo, PedidoEnVivo, VistaEnVivo } from '../servicios/en-vivo.modelos';
import { estadoLegible } from './formato';
import { IconoId } from './iconos';
import { TonoVisual } from './tonos';

/**
 * Lo que necesita la lista "Lo que está pasando" para pintar un evento. La línea se arma así:
 * `<b>negrita</b> #numero texto` (el `texto` ya trae su separador "·" si lo necesita).
 */
export interface DescripcionEvento {
  tono: TonoVisual;
  icono: IconoId;
  /** Pastilla de color: "Nuevo pedido", "Salió en moto"... */
  pastilla: string;
  /** Comercio (solo en toda Katuq), en negrita. */
  negrita: string | null;
  /** Número del pedido, en monoespaciada ("1018", sin la almohadilla). */
  numero: string | null;
  texto: string;
  meta: string;
  /** null si el evento no lleva dinero o si se ocultaron los montos. */
  monto: number | null;
}

export interface ContextoDescripcion {
  vista: VistaEnVivo;
  /** "Ocultar clientes y montos" (en toda Katuq: comercios y montos). */
  ocultar: boolean;
  etapas: ReadonlyMap<EtapaId, EtapaInfo>;
  /** El pedido del evento, para lo que el evento no trae (cliente, ciudad, monto...). */
  pedido?: PedidoEnVivo | null;
}

/** Une con " · " lo que no esté vacío. */
function unir(partes: ReadonlyArray<string | null | undefined>): string {
  return partes.filter((p): p is string => !!p).join(' · ');
}

/** "· algo" si hay algo; vacío si no. */
function conSeparador(texto: string): string {
  return texto ? `· ${texto}` : '';
}

function iconoDeTransporte(tipo: string | null): IconoId {
  return tipo === 'transportadora' ? 'camion' : tipo === 'mensajero' ? 'moto' : 'flecha';
}

/**
 * Describe un evento para la lista, del comercio o de toda Katuq. Puro.
 * En toda Katuq nunca se escribe el cliente: solo el comercio y la ciudad del cliente.
 */
export function describirEvento(evento: EventoEnVivo, contexto: ContextoDescripcion): DescripcionEvento {
  const { ocultar, etapas } = contexto;
  const global = contexto.vista === 'katuq';
  const pedido = contexto.pedido ?? null;

  const ciudad = evento.ciudad ?? pedido?.ciudad ?? '';
  const canal = evento.canal ?? pedido?.canal ?? '';
  const ia = evento.ia ?? pedido?.ia ?? false;
  const esPos = canal === 'POS';
  const monto = ocultar ? null : evento.monto ?? pedido?.monto ?? null;
  const cliente = ocultar ? 'Cliente' : evento.cliente ?? pedido?.cliente ?? 'Cliente';
  const transportador = evento.transportador ?? pedido?.transportador ?? null;
  const tipoTransporte = evento.tipoTransportador ?? pedido?.tipoTransportador ?? null;
  const ciudadComercio = evento.ciudadComercio ?? '';

  const negrita = global
    ? ocultar
      ? `Comercio en ${ciudadComercio || 'Colombia'}`
      : evento.nombreComercio ?? 'Comercio'
    : null;
  const numero = global ? null : evento.numero;
  const quien = global ? '' : cliente;
  const nombreEtapa = (id: EtapaId): string => (etapas.get(id)?.nombre ?? id).toLowerCase();
  // Con el nombre del comercio oculto la ciudad ya va en la negrita: no se repite.
  const ciudadDelComercio = global && !ocultar ? ciudadComercio : '';

  const comun = { negrita, numero, monto: null as number | null };

  switch (evento.tipo) {
    case 'pedido_nuevo':
      return {
        ...comun,
        monto,
        tono: ia ? 'pack' : esPos ? 'ok' : 'acento',
        icono: ia ? 'ia' : esPos ? 'efectivo' : 'bolsa',
        pastilla: ia ? 'Con Opttia' : esPos ? 'Venta en tienda' : 'Nuevo pedido',
        texto: global ? conSeparador(ciudadDelComercio) : conSeparador(unir([quien, ciudad])),
        meta: global
          ? esPos
            ? 'Punto de venta'
            : ia
            ? `Lo armó el bot de WhatsApp${ciudad ? ` · cliente en ${ciudad}` : ''}`
            : unir([ciudad ? `Cliente en ${ciudad}` : '', canal])
          : canal
          ? `${canal}${ia ? ' con Opttia' : ''}`
          : ia
          ? 'Con Opttia'
          : '',
      };

    case 'cambio_estado': {
      const etapa = etapas.get(evento.etapaNueva);
      const accion =
        evento.etapaAnterior !== evento.etapaNueva
          ? `pasó a ${nombreEtapa(evento.etapaNueva)}`
          : `cambió a ${estadoLegible(evento.estadoNuevo) || nombreEtapa(evento.etapaNueva)}`;
      return {
        ...comun,
        tono: etapa?.tono ?? 'neutro',
        icono: 'flecha',
        pastilla: etapa?.nombre ?? 'Cambio de estado',
        texto: global ? `· un pedido ${accion}` : accion,
        meta: unir([global ? '' : quien, ciudad]),
      };
    }

    case 'pago_confirmado':
      return {
        ...comun,
        monto,
        tono: 'ok',
        icono: 'tarjeta',
        pastilla: 'Pago confirmado',
        texto: global ? '· pago confirmado' : conSeparador(quien),
        meta: global ? (ciudad ? `Cliente en ${ciudad}` : '') : canal,
      };

    case 'salida': {
      const enMoto = tipoTransporte === 'mensajero';
      const enCamion = tipoTransporte === 'transportadora';
      return {
        ...comun,
        tono: 'info',
        icono: iconoDeTransporte(tipoTransporte),
        pastilla: enMoto ? 'Salió en moto' : enCamion ? 'Salió en camión' : 'Salió',
        texto: global ? '· despachó un pedido' : transportador ? `con ${transportador}` : 'salió a entrega',
        meta: global
          ? enCamion
            ? `Transportadora${ciudad ? ` hacia ${ciudad}` : ''}`
            : unir(['Mensajero propio', ciudadComercio])
          : enMoto
          ? unir(['Moto', ciudad])
          : enCamion
          ? `Hacia ${ciudad || 'otra ciudad'}`
          : ciudad,
      };
    }

    case 'asignado':
      return {
        ...comun,
        tono: 'info',
        icono: iconoDeTransporte(tipoTransporte),
        pastilla: 'Asignado',
        texto: global ? '· un pedido asignado' : transportador ? `asignado a ${transportador}` : 'asignado',
        meta: unir([global ? '' : quien, ciudad]),
      };

    case 'entregado':
      return {
        ...comun,
        tono: 'ok',
        icono: 'check',
        pastilla: 'Entregado',
        texto: global ? '· entregó un pedido' : conSeparador(quien),
        meta: global ? (ciudad ? `En ${ciudad}` : '') : unir([ciudad, transportador]),
      };

    case 'rechazado':
      return {
        ...comun,
        tono: 'peligro',
        icono: 'equis',
        pastilla: 'Rechazado',
        texto: global ? '' : conSeparador(quien),
        meta: global ? 'El cliente rechazó un pedido' : ciudad,
      };

    default:
      return {
        ...comun,
        tono: 'peligro',
        icono: 'equis',
        pastilla: 'Cancelado',
        texto: global ? '' : conSeparador(quien),
        meta: global ? 'Se canceló un pedido' : ciudad,
      };
  }
}

/** Instante del evento en ms (null si la hora no se entiende). */
export function instanteDeEvento(evento: EventoEnVivo): number | null {
  const ms = Date.parse(evento.hora);
  return Number.isFinite(ms) ? ms : null;
}
