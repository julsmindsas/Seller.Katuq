import { EtapaId, EtapaInfo, EventoEnVivo, MensajeroEnVivo, PedidoEnVivo } from '../../servicios/en-vivo.modelos';
import { tipoDeTransportador } from '../../servicios/en-vivo-reglas';
import { armarFlota } from '../../utilidades/flota';
import { claveDeNombre, diaDeColombia, entero } from '../../utilidades/formato';
import { CeldaFicha, ContenidoMensajero } from '../ficha.modelos';
import { filasDePedidos, filasParaPintar, ordenarFilas } from './filas';
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
      eyebrow: 'Mensajero',
      titulo: entrada.nombre,
      contenido: {
        esTransportadora: false,
        descripcion: '',
        subtitulo: entrada.nombreComercio,
        pastilla: 'Sin datos',
        clasePastilla: 't-slate',
        celdas: [],
        tituloLleva: '',
        filas: [],
        restantes: 0,
        nota: 'Ya no tenemos datos de este mensajero en la pantalla.',
      },
    };
  }

  const lleva = suyos.filter((p) => p.etapa === 'camino');
  const ultima = ultimaSalida(clave, suyos, entrada.eventos);
  const entregados = entregadosDeHoyPor(suyos, entrada.dia);

  const celdas: CeldaFicha[] = [
    { etiqueta: 'Última salida', valor: ultima !== null ? textoDeHora(ultima, entrada.ahoraMs) : 'Hoy no ha salido', clase: '' },
    { etiqueta: 'Entregó hoy', valor: `${entero(entregados)} ${entregados === 1 ? 'pedido' : 'pedidos'}`, clase: '' },
  ];

  const pintadas = filasParaPintar(ordenarFilas(filasDePedidos(lleva)), {
    ocultar: entrada.ocultar,
    katuq: false,
    ahoraMs: entrada.ahoraMs,
    etapas: entrada.etapas,
  });

  return {
    eyebrow: esTransportadora ? 'Transportadora' : 'Mensajero',
    titulo: delaFlota?.nombre ?? entrada.nombre,
    contenido: {
      esTransportadora,
      descripcion: esTransportadora ? 'Camión · envíos a otras ciudades' : 'Moto · mensajero propio',
      subtitulo: entrada.nombreComercio,
      pastilla: lleva.length > 0 ? `En ruta · ${lleva.length}` : esTransportadora ? 'Disponible' : 'En bodega',
      clasePastilla: lleva.length > 0 ? 't-info' : 't-slate',
      celdas,
      tituloLleva: lleva.length > 0 ? 'Lo que lleva ahora' : 'No lleva pedidos ahora',
      filas: pintadas.filas,
      restantes: pintadas.restantes,
      nota: 'Aquí se ve su estado; la ubicación en vivo no se muestra en esta pantalla.',
    },
  };
}
