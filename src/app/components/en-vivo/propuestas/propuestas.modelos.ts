/**
 * Opttia propone en la escena (D-422, cambio `opttia-propone-en-la-escena`, fase 1).
 *
 * Contrato compartido entre:
 *  - la tarjeta y su servicio (`propuestas/`), que piden la cola al servidor y aprueban;
 *  - la escena y el orbe (`escenas/`), que solo LEEN la propuesta actual para ensayarla
 *    (copias fantasma, anillos, líneas) y para el contador del botón del orbe.
 *
 * El código arma la propuesta (ids, cifras, huella); Opttia solo redacta; la persona aprueba;
 * lo que se ve moverse "de verdad" son los eventos reales del canal en vivo.
 */
import type { GrupoPlan, PlanDespachos } from '../despachos/plan-despachos.modelos';

export type TipoPropuesta = 'despachos' | 'produccion' | 'cobro';
export type PrioridadPropuesta = 'urgente' | 'importante' | 'cuando-puedas';
/** on: se aprueba · sombra: "así lo haría Opttia", sin botón · senal: abre algo, no escribe. */
export type ModoPropuesta = 'on' | 'sombra' | 'senal';
/** Cómo la ensaya la escena. */
export type EfectoEscena = 'montones' | 'fila' | 'moneda';
/** Colores de la escena (tokens del tema de En vivo). */
export type ColorEscena = 'accent' | 'info' | 'pack' | 'ok' | 'warn' | 'bad';
export type EstacionEscena = 'recibido' | 'produccion' | 'empacado' | 'listo';

/** Lo que devuelve GET /v1/opttia/propuestas por cada propuesta. */
export interface PropuestaServidor {
  /** Huella estable: cambia si cambian los pedidos o lo que se propone. */
  id: string;
  tipo: 'despachos' | 'produccion';
  modo: 'on' | 'sombra';
  prioridad: PrioridadPropuesta;
  /** Hora límite legible ("9 a 11 a. m.") o null. */
  horaLimite: string | null;
  titulo: string;
  razon: string;
  /** Efecto real de aprobar, en palabras ("Le avisa a Carlos en su app"). */
  consecuencias: string[];
  cifras: { pedidos: number; porCobrar?: number };
  pedidos: Array<{ id: string; nroPedido: string }>;
  escena: {
    efecto: EfectoEscena;
    estacion: EstacionEscena | null;
    /** Nombre del mensajero (como lo trae el pedido) o null; la escena lo normaliza. */
    veh: string | null;
    /** true si va en camión de transportadora en vez de moto. */
    transportadora: boolean;
    color: ColorEscena;
  };
  puedeAprobar: boolean;
  /** Despachos: el grupo del plan tal cual, para aprobar y para "Ajustar". */
  grupo?: GrupoPlan;
}

export interface RespuestaPropuestas {
  disponible: boolean;
  motivo?: string;
  /** Huella de toda la respuesta: si no cambia, no se repinta. */
  version: string;
  generadoEn: number;
  /** Despachos: lo del plan que necesitan aprobar y "Ajustar" (sin datos de clientes). */
  despachos: null | {
    planHuella: string;
    puedeAprobar: boolean;
    mensajerosDisponibles: PlanDespachos['mensajerosDisponibles'];
    fueraDelPlan: PlanDespachos['fueraDelPlan'];
    envioAutomatico: PlanDespachos['envioAutomatico'];
  };
  propuestas: PropuestaServidor[];
  /**
   * Por fuente: cuándo se leyó lo que trae (`leidoEn`) y hasta cuándo el servidor lo sirve de su
   * memoria (`venceEn`), en ms del reloj del servidor. No entra en `version`. Con esto la tarjeta sabe
   * si lo que llegó ya incluye un cambio que vio en vivo y cuándo vale la pena volver a pedir.
   */
  lecturas?: Partial<Record<PropuestaServidor['tipo'], { leidoEn: number; venceEn: number }>>;
}

/** Un grupo tal como lo ensaya la escena (montón frente al PICK o al camión). */
export interface GrupoEnEscena {
  id: string;
  pedidos: string[];
  /** Mensajero (la escena busca o rotula su moto) o, con `transportadora`, el nombre de la transportadora (rótulo del montón). */
  veh: string | null;
  transportadora: boolean;
  color: ColorEscena;
}

/**
 * Lo único que la escena necesita de la propuesta que está en la tarjeta. La escena NO escribe ni
 * mueve cajas reales: solo dibuja fantasmas, anillos y líneas, y atenúa lo demás.
 */
export interface PropuestaEnEscena {
  id: string;
  tipo: TipoPropuesta;
  modo: ModoPropuesta;
  prioridad: PrioridadPropuesta;
  efecto: EfectoEscena;
  /** Ids de los pedidos (los mismos de las cajas de la escena). */
  pedidos: string[];
  grupos: GrupoEnEscena[];
  /** Estación de respaldo para el orbe si no hay cajas visibles de esos pedidos. */
  estacion: EstacionEscena | null;
  /** Texto corto que el orbe muestra al señalar ("Carlos · 4"). */
  etiqueta: string;
}

export interface ContadorPropuestas {
  ideas: number;
  urgentes: number;
}
