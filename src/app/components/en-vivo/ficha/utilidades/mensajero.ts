import { EtapaId, EtapaInfo, EventoEnVivo, MensajeroEnVivo, PedidoEnVivo } from '../../servicios/en-vivo.modelos';
import { tipoDeTransportador } from '../../servicios/en-vivo-reglas';
import { armarFlota, sigueEnLaCalle } from '../../utilidades/flota';
import { claveDeNombre, diaDeColombia, entero } from '../../utilidades/formato';
import { CeldaFicha, ContenidoMensajero } from '../ficha.modelos';
import { filasDePedidos, filasParaPintar, ordenarFilas } from './filas';
import { Traductor } from '../../utilidades/traductor';
import { textoDeHora } from './recorrido';

/**
 * Ficha de un mensajero propio (moto) o de una transportadora (camión): su estado, la última
 * salida, lo que entregó hoy y lo que lleva ahora. Todo sale de la foto ya cargada (`flota`,
 * `pedidos` y `eventos`): no se pide nada. Puro.
 *
 * En toda Katuq no hay mensajeros: la foto de plataforma nunca trae sus nombres.
 */

export interface EntradaMensajero {
  nombre: string;
  flota: ReadonlyArray<MensajeroEnVivo>;
  pedidos: ReadonlyArray<PedidoEnVivo>;
  eventos: ReadonlyArray<EventoEnVivo>;
  /** Instante (ms) de la última foto, respaldo del "desde hace". */
  actualizadoEn: number | null;
  /** Día de hoy (AAAA-MM-DD); null = sin filtro de día. */
  dia: string | null;
  nombreComercio: string;
  ocultar: boolean;
  ahoraMs: number;
  etapas: ReadonlyMap<EtapaId, EtapaInfo>;
  /** Traductor del componente. */
  t: Traductor;
}

export interface ResultadoMensajero {
  eyebrow: string;
  titulo: string;
  contenido: ContenidoMensajero;
}

function esHora(valor: unknown): valor is number {
  return typeof valor === 'number' && Number.isFinite(valor);
}

/** Pedidos entregados HOY por esta persona (por la hora en que se vio la entrega; si no hay, por la de llegada). */
export function entregadosDeHoyPor(suyos: ReadonlyArray<PedidoEnVivo>, dia: string | null): number {
  let cuantos = 0;
  for (const pedido of suyos) {
    if (pedido.etapa !== 'entregado') continue;
    const ms = pedido.horas?.entregado ?? pedido.tE ?? pedido.tC;
    if (dia === null || (esHora(ms) && diaDeColombia(ms) === dia)) cuantos += 1;
  }
  return cuantos;
}

/** Última vez que salió: la más reciente entre las salidas de sus pedidos y los eventos `salida`. Null si no se vio. */
export function ultimaSalida(
  clave: string,
  suyos: ReadonlyArray<PedidoEnVivo>,
  eventos: ReadonlyArray<EventoEnVivo>
): number | null {
  let ultima: number | null = null;
  const considerar = (ms: unknown): void => {
    if (esHora(ms) && (ultima === null || ms > ultima)) ultima = ms;
  };
  for (const pedido of suyos) considerar(pedido.horas?.camino ?? pedido.tS);
  for (const evento of eventos) {
    if (evento.tipo === 'salida' && claveDeNombre(evento.transportador) === clave) considerar(Date.parse(evento.hora));
  }
  return ultima;
}

export function armarMensajero(entrada: EntradaMensajero): ResultadoMensajero {
  const { t } = entrada;
  const clave = claveDeNombre(entrada.nombre);
  const entradas = armarFlota(entrada.flota, entrada.pedidos, entrada.actualizadoEn);
  const delaFlota = entradas.find((e) => e.clave === clave) ?? null;
  const suyos = entrada.pedidos.filter((p) => claveDeNombre(p.transportador) === clave);

  // Una transportadora que ya entregó todo sale de la flota: se sigue mostrando con lo que hizo hoy.
  const tipo =
    delaFlota?.tipo ??
    (suyos.some((p) => p.tipoTransportador === 'transportadora')
      ? 'transportadora'
      : tipoDeTransportador(entrada.nombre, entrada.flota) ?? 'mensajero');
  const esTransportadora = tipo === 'transportadora';

  if (!delaFlota && suyos.length === 0) {
    return {
      eyebrow: t('enVivo.ficha.mensajero'),
      titulo: entrada.nombre,
      contenido: {
        esTransportadora: false,
        descripcion: '',
        subtitulo: entrada.nombreComercio,
        pastilla: t('enVivo.ficha.sinDatos'),
        clasePastilla: 't-slate',
        celdas: [],
        tituloLleva: '',
        filas: [],
        restantes: 0,
        tituloSinCerrar: '',
        filasSinCerrar: [],
        restantesSinCerrar: 0,
        nota: t('enVivo.ficha.mensajeroSinDatosNota'),
      },
    };
  }

  // Un mensajero propio lleva lo que salió hoy; lo de días anteriores que sigue "despachado" va
  // aparte, para que el comercio lo cierre. Una transportadora lleva lo de los últimos 5 días: sus
  // envíos tardan días, pero no tantos.
  const enCamino = suyos.filter((p) => p.etapa === 'camino');
  const lleva = enCamino.filter((p) => sigueEnLaCalle(p, tipo, entrada.ahoraMs));
  const sinCerrar = enCamino.filter((p) => !sigueEnLaCalle(p, tipo, entrada.ahoraMs));
  const ultima = ultimaSalida(clave, suyos, entrada.eventos);
  const entregados = entregadosDeHoyPor(suyos, entrada.dia);

  const celdas: CeldaFicha[] = [
    {
      etiqueta: t('enVivo.ficha.ultimaSalida'),
      valor: ultima !== null ? textoDeHora(ultima, entrada.ahoraMs, t) : t('enVivo.ficha.hoyNoHaSalido'),
      clase: '',
    },
    {
      etiqueta: t('enVivo.ficha.entregoHoy'),
      valor: t(entregados === 1 ? 'enVivo.ficha.pedidoUno' : 'enVivo.ficha.pedidosVarios', { n: entero(entregados) }),
      clase: '',
    },
  ];

  const opcionesFilas = {
    ocultar: entrada.ocultar,
    katuq: false,
    ahoraMs: entrada.ahoraMs,
    etapas: entrada.etapas,
    t,
  };
  const pintadas = filasParaPintar(ordenarFilas(filasDePedidos(lleva)), opcionesFilas);
  const pintadasSinCerrar = filasParaPintar(ordenarFilas(filasDePedidos(sinCerrar)), opcionesFilas);

  return {
    eyebrow: t(esTransportadora ? 'enVivo.ficha.transportadora' : 'enVivo.ficha.mensajero'),
    titulo: delaFlota?.nombre ?? entrada.nombre,
    contenido: {
      esTransportadora,
      descripcion: t(esTransportadora ? 'enVivo.ficha.descCamion' : 'enVivo.ficha.descMoto'),
      subtitulo: entrada.nombreComercio,
      pastilla:
        lleva.length > 0
          ? t('enVivo.ficha.enRuta', { n: lleva.length })
          : t(esTransportadora ? 'enVivo.ficha.disponible' : 'enVivo.ficha.enBodega'),
      clasePastilla: lleva.length > 0 ? 't-info' : 't-slate',
      celdas,
      tituloLleva: t(lleva.length > 0 ? 'enVivo.ficha.llevaAhora' : 'enVivo.ficha.noLlevaAhora'),
      filas: pintadas.filas,
      restantes: pintadas.restantes,
      tituloSinCerrar: sinCerrar.length > 0 ? t('enVivo.ficha.sinCerrar') : '',
      filasSinCerrar: pintadasSinCerrar.filas,
      restantesSinCerrar: pintadasSinCerrar.restantes,
      nota: t(sinCerrar.length > 0 ? 'enVivo.ficha.notaSinCerrar' : 'enVivo.ficha.notaEstado'),
    },
  };
}
