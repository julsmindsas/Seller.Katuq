import { EtapaId, EtapaInfo, EventoEnVivo, PedidoEnVivo, VistaEnVivo } from '../servicios/en-vivo.modelos';
import { estadoLegible } from './formato';
import { IconoId } from './iconos';
import { TonoVisual } from './tonos';
import { nombreDeEtapa, Traductor } from './traductor';

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
export function describirEvento(evento: EventoEnVivo, contexto: ContextoDescripcion, t: Traductor): DescripcionEvento {
  const { ocultar, etapas } = contexto;
  const global = contexto.vista === 'katuq';
  const pedido = contexto.pedido ?? null;

  const ciudad = evento.ciudad ?? pedido?.ciudad ?? '';
  const canal = evento.canal ?? pedido?.canal ?? '';
  const ia = evento.ia ?? pedido?.ia ?? false;
  const esPos = canal === 'POS';
  const monto = ocultar ? null : evento.monto ?? pedido?.monto ?? null;
  const cliente = ocultar ? t('enVivo.evento.cliente') : evento.cliente ?? pedido?.cliente ?? t('enVivo.evento.cliente');
  const transportador = evento.transportador ?? pedido?.transportador ?? null;
  const tipoTransporte = evento.tipoTransportador ?? pedido?.tipoTransportador ?? null;
  const ciudadComercio = evento.ciudadComercio ?? '';

  const negrita = global
    ? ocultar
      ? t('enVivo.evento.comercioEn', { ciudad: ciudadComercio || 'Colombia' })
      : evento.nombreComercio ?? t('enVivo.evento.comercio')
    : null;
  // En toda Katuq también va el número: distingue un pedido de otro. Con "ocultar" no, porque su prefijo delata al comercio.
  const numero = global && ocultar ? null : evento.numero ?? null;
  // En toda Katuq, sin número la frase dice "un pedido"; con número, el número ya es el sujeto.
  const sujeto = (conNumero: string, sinNumero: string): string => (numero ? conNumero : sinNumero);
  const quien = global ? '' : cliente;
  const nombreEtapa = (id: EtapaId): string => nombreDeEtapa(id, etapas.get(id), t).toLowerCase();
  const clienteEn = (): string => (ciudad ? t('enVivo.evento.clienteEn', { ciudad }) : '');
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
        pastilla: ia ? t('enVivo.evento.conOpttia') : esPos ? t('enVivo.evento.ventaEnTienda') : t('enVivo.evento.nuevoPedido'),
        texto: global ? conSeparador(ciudadDelComercio) : conSeparador(unir([quien, ciudad])),
        meta: global
          ? esPos
            ? t('enVivo.evento.puntoDeVenta')
            : ia
            ? ciudad
              ? t('enVivo.evento.armoElBotCiudad', { ciudad })
              : t('enVivo.evento.armoElBot')
            : unir([clienteEn(), canal])
          : canal
          ? ia
            ? t('enVivo.evento.canalConOpttia', { canal })
            : canal
          : ia
          ? t('enVivo.evento.conOpttia')
          : '',
      };

    case 'cambio_estado': {
      const etapa = etapas.get(evento.etapaNueva);
      const cambioDeEtapa = evento.etapaAnterior !== evento.etapaNueva;
      const destino = cambioDeEtapa ? nombreEtapa(evento.etapaNueva) : estadoLegible(evento.estadoNuevo) || nombreEtapa(evento.etapaNueva);
      const accion = t(cambioDeEtapa ? 'enVivo.evento.pasoA' : 'enVivo.evento.cambioA', { destino });
      const accionDeUnPedido = t(cambioDeEtapa ? 'enVivo.evento.unPedidoPasoA' : 'enVivo.evento.unPedidoCambioA', { destino });
      return {
        ...comun,
        tono: etapa?.tono ?? 'neutro',
        icono: 'flecha',
        pastilla: etapa ? nombreDeEtapa(evento.etapaNueva, etapa, t) : t('enVivo.evento.cambioDeEstado'),
        monto: global ? monto : null,
        texto: global ? sujeto(accion, accionDeUnPedido) : accion,
        meta: global ? clienteEn() : unir([quien, ciudad]),
      };
    }

    case 'pago_confirmado':
      return {
        ...comun,
        monto,
        tono: 'ok',
        icono: 'tarjeta',
        pastilla: t('enVivo.evento.pagoConfirmado'),
        texto: global ? sujeto(t('enVivo.evento.pagoConfirmadoMin'), t('enVivo.evento.unPagoConfirmado')) : conSeparador(quien),
        meta: global ? clienteEn() : canal,
      };

    case 'salida': {
      const enMoto = tipoTransporte === 'mensajero';
      const enCamion = tipoTransporte === 'transportadora';
      return {
        ...comun,
        tono: 'info',
        icono: iconoDeTransporte(tipoTransporte),
        pastilla: enMoto ? t('enVivo.evento.salioEnMoto') : enCamion ? t('enVivo.evento.salioEnCamion') : t('enVivo.evento.salio'),
        monto: global ? monto : null,
        texto: global
          ? sujeto(t('enVivo.evento.salioAEntrega'), t('enVivo.evento.despachoUnPedido'))
          : transportador
          ? t('enVivo.evento.conTransportador', { transportador })
          : t('enVivo.evento.salioAEntrega'),
        meta: global
          ? enCamion
            ? ciudad
              ? t('enVivo.evento.transportadoraHacia', { ciudad })
              : t('enVivo.evento.transportadora')
            : unir([t('enVivo.evento.mensajeroPropio'), ciudadComercio])
          : enMoto
          ? unir([t('enVivo.evento.moto'), ciudad])
          : enCamion
          ? t('enVivo.evento.hacia', { ciudad: ciudad || t('enVivo.evento.otraCiudad') })
          : ciudad,
      };
    }

    case 'asignado':
      return {
        ...comun,
        tono: 'info',
        icono: iconoDeTransporte(tipoTransporte),
        pastilla: t('enVivo.evento.asignado'),
        texto: global
          ? sujeto(t('enVivo.evento.asignadoMin'), t('enVivo.evento.unPedidoAsignado'))
          : transportador
          ? t('enVivo.evento.asignadoA', { transportador })
          : t('enVivo.evento.asignadoMin'),
        meta: unir([global ? '' : quien, ciudad]),
      };

    case 'entregado':
      return {
        ...comun,
        tono: 'ok',
        icono: 'check',
        pastilla: t('enVivo.evento.entregado'),
        monto: global ? monto : null,
        texto: global ? sujeto(t('enVivo.evento.entregadoMin'), t('enVivo.evento.entregoUnPedido')) : conSeparador(quien),
        meta: global ? (ciudad ? t('enVivo.evento.enCiudad', { ciudad }) : '') : unir([ciudad, transportador]),
      };

    case 'rechazado':
      return {
        ...comun,
        tono: 'peligro',
        icono: 'equis',
        pastilla: t('enVivo.evento.rechazado'),
        texto: global ? '' : conSeparador(quien),
        meta: global ? t('enVivo.evento.clienteRechazo') : ciudad,
      };

    default:
      return {
        ...comun,
        tono: 'peligro',
        icono: 'equis',
        pastilla: t('enVivo.evento.cancelado'),
        texto: global ? '' : conSeparador(quien),
        meta: global ? t('enVivo.evento.sePedidoCancelo') : ciudad,
      };
  }
}

/** Instante del evento en ms (null si la hora no se entiende). */
export function instanteDeEvento(evento: EventoEnVivo): number | null {
  const ms = Date.parse(evento.hora);
  return Number.isFinite(ms) ? ms : null;
}
