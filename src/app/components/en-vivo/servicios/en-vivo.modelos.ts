/**
 * Modelos del tablero "En vivo" (D-386, tareas 4.3 y 4.4).
 *
 * Son el CONTRATO REAL entre el backend (`routers/analyticsEnVivo.js` y
 * `services/enVivo/*`) y la pantalla: cada campo sale de lo que el servidor manda por el
 * cable (verificado contra el router, el distribuidor y la plataforma con sus dobles de
 * prueba), no de lo que se supuso antes de que existiera. Nada queda como provisional.
 *
 * Quién produce cada cosa:
 * - `FotoEnVivo` ........... `distribuidor.armarFoto` + `completarFoto` del router (un comercio).
 * - `FotoGlobalEnVivo` ..... `plataforma.armarFoto` + `completarFoto` (toda Katuq, solo Julsmind).
 * - `EventoEnVivo` ......... `detector.diffPedido` + campos del pedido (`publicarEvento`).
 * - `RadarEnVivo` .......... `comercio.centroDelComercio` o `plataforma.radarDeLaPlataforma`,
 *                            traducido por `radarDe` del router.
 * - `DetallePedidoEnVivo` .. `detalle.detallePedido` (respuesta PLANA de `GET /pedido/:id`).
 * - `ResumenOpttia` y
 *   `RespuestaPregunta` .... `opttia.js` (resumen compartido y pregunta).
 *
 * Datos mínimos (spec `eventos-pedidos-en-vivo`): nada de teléfono, dirección, documento ni
 * correo del cliente. El cliente viaja solo como nombre corto ("Laura M."). La única
 * excepción del servidor es `DetallePedidoEnVivo.asesor` (correo del asesor del pedido, para
 * el alcance D-349): la pantalla NUNCA debe pintarlo.
 */

// ── Etapas y tonos ──────────────────────────────────────────────────────────

/** Etapas de la banda de la operación. El mapa estado → etapa vive en el backend (`etapas.js`). */
export type EtapaId =
  | 'recibido'
  | 'produccion'
  | 'alistamiento'
  | 'listo'
  | 'camino'
  | 'entregado'
  | 'rechazado'
  | 'cancelado';

/** Tonos semánticos que manda el backend (`etapas.js`, radar, resumen de Opttia). */
export type TonoEnVivo = 'neutro' | 'info' | 'aviso' | 'acento' | 'ok' | 'peligro';

/** Nombre del tono en el tema (`--ev-slate`, `--ev-info`, `--ev-warn`, `--ev-accent`, `--ev-ok`, `--ev-bad`). */
export type TonoCss = 'slate' | 'info' | 'warn' | 'accent' | 'ok' | 'bad';

const TONO_CSS: Readonly<Record<TonoEnVivo, TonoCss>> = {
  neutro: 'slate',
  info: 'info',
  aviso: 'warn',
  acento: 'accent',
  ok: 'ok',
  peligro: 'bad',
};

/**
 * Tono del backend → nombre del tono en el tema (`neutro→slate`, `aviso→warn`, `acento→accent`,
 * `peligro→bad`; `info` y `ok` no cambian). Lo desconocido o vacío cae en `slate`.
 */
export function tonoCss(tono: TonoEnVivo | string | null | undefined): TonoCss {
  return tono && Object.prototype.hasOwnProperty.call(TONO_CSS, tono) ? TONO_CSS[tono as TonoEnVivo] : 'slate';
}

/** Clase CSS del tema (`t-slate`, `t-warn`...): fija `--tone` y `--tone-soft` (mixin `ev-tonos`). */
export function claseTonoCss(tono: TonoEnVivo | string | null | undefined): string {
  return `t-${tonoCss(tono)}`;
}

/** Variable CSS del color fuerte del tono: `var(--ev-warn)`. */
export function variableTonoCss(tono: TonoEnVivo | string | null | undefined): string {
  return `var(--ev-${tonoCss(tono)})`;
}

/** Variable CSS del fondo suave del tono: `var(--ev-warn-soft)`. */
export function variableTonoSuaveCss(tono: TonoEnVivo | string | null | undefined): string {
  return `var(--ev-${tonoCss(tono)}-soft)`;
}

/** Etapa con nombre y tono, tal como viaja en la foto (el front no la duplica). */
export interface EtapaInfo {
  id: EtapaId;
  nombre: string;
  tono: TonoEnVivo;
}

/** Etapas que llevan hora en `horas` (rechazado y cancelado no). */
export const ETAPAS_CON_HORA: ReadonlyArray<EtapaId> = [
  'recibido',
  'produccion',
  'alistamiento',
  'listo',
  'camino',
  'entregado',
];

/** Hora (ms) en que el distribuidor vio entrar el pedido a cada etapa; null = sin hora registrada. */
export type HorasPorEtapa = Partial<Record<EtapaId, number | null>>;

/** Mensajero propio (moto) o transportadora externa (camión). */
export type TipoTransportador = 'mensajero' | 'transportadora' | null;

// ── Pedido ──────────────────────────────────────────────────────────────────

/**
 * Proyección mínima de un pedido (`proyeccion.js`) tal como sale en `foto.pedidos`.
 * La foto NO trae `empresa`, `asesor` ni `tipoTransportador`: el último lo completa el front
 * al aplicar la foto (`tipoDeTransportador`, con los nombres de `flota`).
 */
export interface PedidoEnVivo {
  id: string;
  numero: string | null;
  /** Solo en el detalle del pedido: la empresa dueña. */
  empresa?: string | null;
  estadoProceso: string | null;
  estadoPago: string | null;
  transportador: string | null;
  /** NO viaja en la foto: lo derivan los reductores (eventos `salida`/`asignado` o la `flota`). */
  tipoTransportador?: TipoTransportador;
  etapa: EtapaId;
  /** Fecha de creación tal cual viene en el pedido (ISO). */
  creado: string | null;
  /** Fecha de creación en ms. */
  tC: number | null;
  /** Atajos de hora (ms) en que se vio al pedido listo, salir y entregarse; null = no se vio. Siempre vienen en la foto. */
  tL?: number | null;
  tS?: number | null;
  tE?: number | null;
  horas: HorasPorEtapa;
  /** 0 si el pedido está cancelado o rechazado. */
  monto: number;
  canal: string;
  /** Nombre corto: "Laura M.". */
  cliente: string | null;
  ciudad: string | null;
  barrio: string | null;
  dane?: string | null;
  /** Nació de una cotización armada por el bot de WhatsApp de Opttia (diseño 17). */
  ia: boolean;
  /** true también para un pedido rechazado (no cuenta para ventas). */
  cancelado: boolean;
}

// ── Eventos ─────────────────────────────────────────────────────────────────

export type TipoEvento =
  | 'pedido_nuevo'
  | 'cambio_estado'
  | 'salida'
  | 'entregado'
  | 'rechazado'
  | 'cancelado'
  | 'pago_confirmado'
  | 'asignado';

/** Comercio de un evento de toda Katuq (el router además lo aplana en `empresa`, `nombreComercio` y `ciudadComercio`). */
export interface ComercioDeEvento {
  empresa: string;
  nombre: string;
  ciudad: string | null;
  dane: string | null;
}

/**
 * Campos comunes de cada evento. El distribuidor copia del pedido (`publicarEvento`):
 * `cliente`, `ciudad`, `barrio`, `canal`, `monto`, `dane` e `ia`, y SIEMPRE `etapa` (la
 * del pedido ya actualizado). En toda Katuq no viajan `cliente` ni `barrio` (y `monto`
 * llega como número o null).
 */
export interface EventoBase {
  /** Identificador único: permite descartar el que llega dos veces. */
  id: string;
  tipo: TipoEvento;
  pedidoId: string;
  numero: string | null;
  /** Hora del cambio, ISO. */
  hora: string;
  etapa: EtapaId;
  cliente?: string | null;
  ciudad?: string | null;
  barrio?: string | null;
  canal?: string | null;
  monto?: number | null;
  dane?: string | null;
  ia?: boolean;
  /** Solo en toda Katuq. */
  comercio?: ComercioDeEvento;
  empresa?: string | null;
  nombreComercio?: string | null;
  ciudadComercio?: string | null;
  /** Solo en `salida` y `asignado` (en toda Katuq viaja únicamente `tipoTransportador`: nunca el nombre del mensajero). */
  transportador?: string | null;
  tipoTransportador?: TipoTransportador;
}

export interface EventoPedidoNuevo extends EventoBase {
  tipo: 'pedido_nuevo';
  /** Estado de proceso con el que entró el pedido. */
  estado: string | null;
}

export interface EventoCambioEstado extends EventoBase {
  tipo: 'cambio_estado';
  estadoAnterior: string | null;
  estadoNuevo: string | null;
  etapaAnterior: EtapaId;
  etapaNueva: EtapaId;
}

export interface EventoSalida extends EventoBase {
  tipo: 'salida';
  tipoTransportador: TipoTransportador;
}

export interface EventoAsignado extends EventoBase {
  tipo: 'asignado';
  tipoTransportador: TipoTransportador;
}

export interface EventoPagoConfirmado extends EventoBase {
  tipo: 'pago_confirmado';
  estadoPago: string | null;
}

export interface EventoSimple extends EventoBase {
  tipo: 'entregado' | 'rechazado' | 'cancelado';
}

export type EventoEnVivo =
  | EventoPedidoNuevo
  | EventoCambioEstado
  | EventoSalida
  | EventoAsignado
  | EventoPagoConfirmado
  | EventoSimple;

// ── Cifras ──────────────────────────────────────────────────────────────────

export interface ResumenDia {
  ventas: number;
  pedidos: number;
  ticketPromedio: number;
}

/** Lo que cuenta un comercio de la plataforma contra ayer a esta hora (sin ticket promedio). */
export interface ResumenParcial {
  ventas: number;
  pedidos: number;
}

export interface CifraPorHora {
  hora: number;
  ventas: number;
  pedidos: number;
  ventasAyer: number;
  pedidosAyer: number;
}

export interface CifraPorCanal {
  canal: string;
  pedidos: number;
  ventas: number;
}

export interface ProductoEstrella {
  nombre: string;
  unidades: number;
  valor: number;
}

/** Conteo por etapa de TODA la ventana (7 días), con una clave por etapa. */
export type ConteoPorEtapa = Record<EtapaId, number>;

/** Cifras de hoy y de ayer de un comercio (`cifras.js`), calculadas SOLO en el servidor; el front no suma nada. */
export interface CifrasEnVivo extends ResumenDia {
  /** Día de Colombia, AAAA-MM-DD. */
  dia: string;
  ayer: ResumenDia;
  ayerMismaHora: ResumenDia;
  porHora: CifraPorHora[];
  porCanal: CifraPorCanal[];
  porEtapa: ConteoPorEtapa;
  /**
   * Top 6 de hoy. Solo viaja en la FOTO (el mensaje `cifras` no lo trae); lo que se mantiene al
   * día cada 30 s es `radar.productosEstrella`: usa `productosEstrellaDe(estado)`.
   */
  productosEstrella?: ProductoEstrella[];
  /**
   * Vendido hoy con Opttia (diseño 17). El router ya lo lee en un comercio, pero el
   * distribuidor TODAVÍA NO lo emite: hoy solo se puede contar con `pedidos[].ia`.
   */
  conOpttia?: { pedidos: number; ventas: number };
}

/** Último evento de un comercio, para el muro de toda Katuq. */
export interface UltimoEventoComercio {
  tipo: TipoEvento;
  numero: string | null;
  hora: string | null;
}

/** Un comercio dentro de las cifras de toda Katuq (`plataforma.comerciosDe`). */
export interface ComercioEnVivo {
  empresa: string;
  nombre: string;
  ciudad: string | null;
  dane: string | null;
  /** Pedidos de hoy (sin cancelados). */
  n: number;
  ventas: number;
  ayerMismaHora: ResumenParcial;
  /** Pedidos por etapa de la ventana. */
  etapas: ConteoPorEtapa;
  /** 24 valores, uno por hora de Colombia. */
  porHora: { ventas: number[]; ventasAyer: number[] };
  ultimoEvento: UltimoEventoComercio | null;
}

/** Ritmo récord del día: la ventana de 5 minutos con más llegadas. */
export interface RitmoRecord {
  porMinuto: number;
  pedidos: number;
  /** ISO del cierre de esa ventana. */
  hora: string;
}

export interface MejorHora {
  hora: number;
  ventas: number;
  pedidos: number;
}

/** Pedidos y ventas de hoy en un municipio (solo los que se pudieron ubicar; tope de 30). */
export interface CiudadEnVivo {
  dane: string;
  nombre: string;
  departamento: string | null;
  iso: string | null;
  pedidos: number;
  ventas: number;
}

export interface DepartamentoEnVivo {
  dane: string;
  nombre: string;
  iso: string | null;
  pedidos: number;
  ventas: number;
}

/** Cifras de toda Katuq (`plataforma.cifrasPlataforma`): las de un comercio más las de la plataforma. */
export interface CifrasGlobalEnVivo extends ResumenDia {
  dia: string;
  ayer: ResumenDia;
  ayerMismaHora: ResumenDia;
  porHora: CifraPorHora[];
  porCanal: CifraPorCanal[];
  porEtapa: ConteoPorEtapa;
  /** Comercios con pedidos hoy y con pedidos en la última hora. */
  comerciosHoy: number;
  comerciosUltimaHora: number;
  /** Llegadas de los últimos 5 minutos entre 5. */
  pedidosPorMinuto: number;
  /** null mientras no haya llegadas hoy. */
  ritmoRecord: RitmoRecord | null;
  mejorHora: MejorHora | null;
  enCamino: number;
  despachosHoy: number;
  entregadosHoy: number;
  ciudadesEntregadas: number;
  /** Vendido hoy en pedidos armados por el bot de WhatsApp. */
  opttia: { pedidos: number; ventas: number };
  /** De más a menos ventas. */
  comercios: ComercioEnVivo[];
  ciudades: CiudadEnVivo[];
  departamentos: DepartamentoEnVivo[];
}

// ── Flota, radar y Opttia ───────────────────────────────────────────────────

/** Mensajero propio: solo nombre y si va en ruta (nada más del mensajero). */
export interface MensajeroEnVivo {
  nombre: string;
  enRuta: boolean;
  /** @deprecated El servidor NO lo manda: se saca de los pedidos en camino de la foto. */
  pedidos?: number;
  /** @deprecated El servidor NO lo manda: se saca de `horas.camino` de sus pedidos. */
  salioEn?: number | null;
}

/** Tipos de alerta: de plataforma (`radarPlataforma`) y de comercio (`atencionComercio`). */
export type TipoAlertaRadar =
  | 'silencio'
  | 'atascado'
  | 'rechazos'
  | 'racha'
  | 'listo'
  | 'demorado'
  | 'mensajero'
  | 'sin_pago';

/**
 * Alerta del radar. `sev` 3 = grave, 2 = revisar, 1 = informativa. En un comercio `comercio`
 * es su empresa; en toda Katuq, el nombre del comercio (más `empresa` con la llave).
 */
export interface AlertaRadar {
  sev: 1 | 2 | 3;
  tono: TonoEnVivo;
  tipo: TipoAlertaRadar;
  comercio: string | null;
  titulo: string;
  texto: string;
  sugerencia: string;
  pedidoId?: string;
  numero?: string;
  minutos?: number;
  /** Primer nombre del mensajero (alertas `listo` y `mensajero`). */
  mensajero?: string;
  cantidad?: number;
  /** Solo en toda Katuq. */
  empresa?: string;
  /** Solo en `atascado` de toda Katuq: ids de los pedidos (hasta 20). */
  pedidos?: string[];
}

/** Medianas en ms (`tiemposOperacion`). */
export interface TiemposOperacion {
  prep: number | null;
  espera: number | null;
  entrega: number | null;
  ciclo: number | null;
  camion: number | null;
  n: number;
  nCamion: number;
  /** El comercio con mejor ciclo y al menos 3 entregas (en toda Katuq trae también `nombre`). */
  rapido: { empresa: string; nombre?: string; mediana: number } | null;
}

export type TramoComparacion = 'preparacion' | 'espera' | 'entrega';

/** Comparación del comercio con la mediana de Katuq. null si hay menos de 5 comercios en el cálculo; nunca trae nombres. */
export interface ComparacionKatuq {
  veredicto: 'mas_rapido' | 'igual' | 'mas_lento';
  diferenciaPct: number;
  medianaKatuq: number;
  comercios: number;
  tramoMasLargo: TramoComparacion | null;
  tramoDondePierde: TramoComparacion | null;
}

export interface ProyeccionCierre {
  ventas: number;
  pedidos: number;
  fraccionVentas: number;
  fraccionPedidos: number;
}

export interface RecordPedidos {
  n: number;
  /** AAAA-MM-DD. */
  fecha: string;
}

/**
 * `radar` de la foto y mensaje `radar` (el router traduce `radarComercio → atencion`).
 * - Comercio: `atencion` ("Atención ahora", ya con D-349), `tiempos`, `comparacion`,
 *   `proyeccion`, `record` (null para un vendedor con D-349 o sin récord) y `productosEstrella`.
 * - Toda Katuq: `alertas`, `tiempos`, `proyeccion` y `record`.
 * `calculadoEn` falta en el `radar` de la foto de toda Katuq.
 */
export interface RadarEnVivo {
  calculadoEn?: string;
  alertas?: AlertaRadar[];
  atencion?: AlertaRadar[];
  tiempos?: TiemposOperacion | null;
  comparacion?: ComparacionKatuq | null;
  proyeccion?: ProyeccionCierre | null;
  record?: RecordPedidos | null;
  productosEstrella?: ProductoEstrella[];
}

/**
 * Lo que Opttia sugiere abrir. El servidor solo deja pasar acciones que apuntan a algo que
 * está en lo que vio:
 * - `tablero`: nombre de un comercio (solo toda Katuq).
 * - `lista`: `todos` · `ia` · `etapa:<etapa>` · `canal:<canal>` · `atascados:<comercio>` (este solo en toda Katuq).
 * - `ficha`: NÚMERO de un pedido (`FLO-1004` o `#FLO-1004`), no su id.
 * - `mensajero`: PRIMER nombre de un mensajero.
 * Para convertirlas en acciones de pantalla usa `accionOpttiaAUi` (`en-vivo-acciones.ts`).
 */
export type TipoAccionOpttia = 'tablero' | 'lista' | 'ficha' | 'mensajero';

export interface AccionOpttia {
  tipo: TipoAccionOpttia;
  objetivo: string;
  /** Etiqueta corta del botón (hasta 60 caracteres). */
  texto?: string;
}

export interface PuntoOpttia {
  tono: TonoEnVivo;
  texto: string;
  accion?: AccionOpttia;
}

/** Foto `opttia` y mensaje `opttia`: resumen compartido (diseño 16). */
export interface ResumenOpttia {
  titular: string;
  puntos: PuntoOpttia[];
  /** ISO de cuándo lo armó Opttia. */
  generadoEn: string;
}

/**
 * Respuesta (200) de `POST /opttia/pregunta`. Con el tope de 20 por hora trae `restantes: 0`
 * y `reintentarEnMin`; con privacidad o si Opttia falla trae solo `texto` y `acciones: []`.
 */
export interface RespuestaPregunta {
  texto: string;
  acciones: AccionOpttia[];
  restantes?: number;
  /** Con el tope de 20 por hora: en cuántos minutos puede volver a preguntar. */
  reintentarEnMin?: number;
}

// ── Fotos y detalle ─────────────────────────────────────────────────────────

/** Motivos por los que el servidor dice `disponible: false` con 200 (sin motivo = el rol no tiene el menú). */
export type MotivoNoDisponible = 'deshabilitado' | 'plataforma_no_disponible';

/** El servidor responde 200 con esto cuando el rol no tiene el menú `en-vivo` (el interceptor convierte un 403 en otra cosa). */
export interface RespuestaNoDisponible {
  disponible: false;
  motivo?: MotivoNoDisponible;
}

export function esNoDisponible(valor: unknown): valor is RespuestaNoDisponible {
  return typeof valor === 'object' && valor !== null && (valor as { disponible?: unknown }).disponible === false;
}

export type ModoCanal = 'vivo' | 'sondeo';

/** Lo común a las dos fotos (`GET /foto`, `GET /global/foto`, primer mensaje del stream y respaldo del sondeo). */
export interface FotoBaseEnVivo {
  disponible: true;
  modo: ModoCanal;
  generadoEn: string;
  etapas: EtapaInfo[];
  /** Igual a `cifras.porEtapa`. */
  porEtapa: ConteoPorEtapa;
  /**
   * Los últimos 60 que guarda el servidor, del MÁS VIEJO al más nuevo (al revés que `estado.eventos`,
   * que `fusionarEventos` deja del más nuevo al más viejo). Vacío en el modo sondeo.
   */
  eventos: EventoEnVivo[];
  radar: RadarEnVivo | null;
  /** El último resumen de Opttia, o null si aún no hay (llega después como mensaje `opttia`). */
  opttia: ResumenOpttia | null;
  /** Solo con `modo: 'sondeo'`. */
  sondeoCadaSegundos?: number;
}

/** Foto del comercio. Con sesión de Katuq y `?empresa=`, `soloLectura` es true. */
export interface FotoEnVivo extends FotoBaseEnVivo {
  /** Empresa que se mira. */
  empresa: string;
  soloLectura: boolean;
  /** D-349: el vendedor ve solo lo suyo. */
  soloPropias: boolean;
  cifras: CifrasEnVivo;
  /** Pedidos de hoy (también entregados, rechazados y cancelados) y los activos de la ventana, del más nuevo al más viejo. */
  pedidos: PedidoEnVivo[];
  flota: MensajeroEnVivo[];
}

/** Foto de toda Katuq (`GET /global/foto`). Sin cliente, barrio ni nombre de mensajero. */
export interface FotoGlobalEnVivo extends FotoBaseEnVivo {
  /** Llave del observador de plataforma (`__katuq__`). */
  llave: string;
  cifras: CifrasGlobalEnVivo;
}

/** Línea del carrito de un pedido, con IVA y descuentos (nada más del producto). */
export interface LineaDetalle {
  nombre: string;
  cantidad: number;
  valor: number;
}

/**
 * Ficha del pedido: respuesta PLANA de `GET /pedido/:id` (la proyección del pedido más sus líneas,
 * sin envolver). `productos` + `envio` suman `monto`. 404 si es de otra empresa o está fuera de D-349.
 * Ojo: aquí `ia` siempre llega false (el detalle no lee la cotización de origen).
 */
export interface DetallePedidoEnVivo extends PedidoEnVivo {
  disponible: true;
  productos: LineaDetalle[];
  /** Lo que pagó el cliente por el domicilio, con IVA. */
  envio: number;
  /** El servidor lo manda (correo del asesor, alcance D-349): NO se muestra. */
  asesor?: string | null;
  soloLectura: boolean;
}

// ── Mensajes del stream SSE ─────────────────────────────────────────────────

export type NombreMensajeStream =
  | 'foto'
  | 'evento'
  | 'cifras'
  | 'radar'
  | 'opttia'
  | 'modo'
  | 'reconectar';

export interface DatosModo {
  modo: ModoCanal;
  motivo?: 'tope_de_empresas';
  sondeoCadaSegundos?: number;
}

/**
 * Por qué el servidor pide reconectar: `vida_maxima` (cada 30 min, espera 0), `medianoche`
 * (500 ms), `apagado` (1 s, reinicio del servidor) y `error` (5 s, falló el listener).
 */
export type MotivoReconectar = 'vida_maxima' | 'medianoche' | 'apagado' | 'error';

export interface DatosReconectar {
  motivo?: MotivoReconectar;
  /** Espera sugerida por el servidor antes de reconectar, en ms. */
  esperaMs?: number;
}

/** Lo que dice el servidor, ya tipado. Cada bloque SSE trae `event:` y `data:` (JSON). */
export type MensajeStream =
  | { tipo: 'foto'; datos: FotoEnVivo | FotoGlobalEnVivo | RespuestaNoDisponible }
  | { tipo: 'evento'; datos: EventoEnVivo }
  | { tipo: 'cifras'; datos: CifrasEnVivo | CifrasGlobalEnVivo }
  | { tipo: 'radar'; datos: RadarEnVivo }
  | { tipo: 'opttia'; datos: ResumenOpttia }
  | { tipo: 'modo'; datos: DatosModo }
  | { tipo: 'reconectar'; datos: DatosReconectar };

// ── Canal ───────────────────────────────────────────────────────────────────

export type VistaEnVivo = 'comercio' | 'katuq';

/**
 * - `conectando`: primer intento, aún sin foto.
 * - `en-vivo`: el stream entrega.
 * - `reconectando`: se cayó; espera creciente (1, 2, 5, 10, 20, 30 s).
 * - `sondeo`: foto cada 30 s ("Actualiza cada 30 s"), por orden del servidor o por falla del stream.
 * - `sin-acceso`: rol sin el menú, sesión no válida o 403. No reintenta.
 * - `pausado`: pestaña oculta más de 5 minutos; al volver se reconecta y se pone al día.
 * - `detenido`: sin conexión abierta (antes de iniciar o tras detener).
 */
export type EstadoConexion =
  | 'conectando'
  | 'en-vivo'
  | 'reconectando'
  | 'sondeo'
  | 'sin-acceso'
  | 'pausado'
  | 'detenido';

export type MotivoSinAcceso = 'rol' | 'sesion' | 'prohibido';

export interface OpcionesCanal {
  /** `katuq` = toda la plataforma (solo Julsmind); `comercio` = la empresa de la sesión. */
  vista: VistaEnVivo;
  /** Solo con `vista: 'comercio'` y sesión de Katuq: el comercio que se mira (`?empresa=`). */
  empresa?: string;
  /** Pausar el canal si la pestaña lleva más de 5 minutos oculta. Por defecto sí. */
  pausarSiOculta?: boolean;
}

/** Lo que entrega `EnVivoCanalService.abrir()`. `modo` y `reconectar` los consume el propio canal. */
export type SalidaCanal =
  | { tipo: 'estado'; estado: EstadoConexion; motivo?: MotivoSinAcceso }
  | {
      tipo: 'foto';
      foto: FotoEnVivo | FotoGlobalEnVivo;
      /** true si es la primera foto tras una caída o una pausa (de ahí sale "Te pusimos al día"). */
      trasCorte: boolean;
      fuente: 'stream' | 'sondeo';
    }
  | { tipo: 'evento'; evento: EventoEnVivo }
  | { tipo: 'cifras'; cifras: CifrasEnVivo | CifrasGlobalEnVivo }
  | { tipo: 'radar'; radar: RadarEnVivo }
  | { tipo: 'opttia'; resumen: ResumenOpttia };

// ── Estado de la pantalla ───────────────────────────────────────────────────

/** Modelo de vista que pintan los componentes (`EnVivoEstadoService.estado$`). */
export interface EstadoEnVivo {
  conexion: EstadoConexion;
  motivoSinAcceso: MotivoSinAcceso | null;
  /** null = aún no se sabe; false = el rol no tiene "En vivo". */
  disponible: boolean | null;
  /** Ya llegó la primera foto. */
  cargado: boolean;
  vista: VistaEnVivo;
  empresa: string | null;
  soloLectura: boolean;
  soloPropias: boolean;
  etapas: EtapaInfo[];
  cifras: CifrasEnVivo | null;
  cifrasGlobal: CifrasGlobalEnVivo | null;
  pedidos: PedidoEnVivo[];
  flota: MensajeroEnVivo[];
  /** Del más nuevo al más viejo, sin ids repetidos. */
  eventos: EventoEnVivo[];
  radar: RadarEnVivo | null;
  opttia: ResumenOpttia | null;
  /** ms de la última foto aplicada. */
  actualizadoEn: number | null;
}

/** Preferencias guardadas en el navegador (localStorage, con try/catch). */
export interface PreferenciasEnVivo {
  /** Identificador de la vista que usó por última vez (lo definen los componentes). */
  vista: string | null;
  /** Nace apagado: solo suena después de que el usuario lo encienda. */
  sonido: boolean;
  /** "Ocultar clientes y montos" (en toda Katuq: "comercios y montos"). */
  ocultar: boolean;
}

/** Avisos pasajeros para el shell. */
export type AvisoEnVivo =
  | { tipo: 'al-dia'; cambios: number; texto: string }
  /** Texto libre (por ejemplo, "Hoy todavía no hay pedidos para repetir"). */
  | { tipo: 'info'; texto: string };
