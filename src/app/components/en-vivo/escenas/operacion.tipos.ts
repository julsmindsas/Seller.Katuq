import type { EtapaId } from '../servicios/en-vivo.modelos';
import type { Tokens } from './escena-tokens';

/** Estaciones de la banda de la operación (las etapas que tienen caja a la vista). */
export type EstacionId = 'recibido' | 'produccion' | 'alistamiento' | 'listo';

export const ESTACIONES: ReadonlyArray<EstacionId> = ['recibido', 'produccion', 'alistamiento', 'listo'];

export const esEstacion = (etapa: EtapaId | string | null | undefined): etapa is EstacionId =>
  etapa === 'recibido' || etapa === 'produccion' || etapa === 'alistamiento' || etapa === 'listo';

/** Lo que se tocó en la escena. `id`: pedido = id del pedido, estacion = id de la etapa, vehiculo = nombre del transportador. */
export interface ToqueEscena {
  tipo: 'pedido' | 'estacion' | 'vehiculo';
  id: string;
}

/** Opciones de la escena de la operación. */
export interface OpcionesOperacion {
  canvas: HTMLCanvasElement;
  /** Contenedor de las etiquetas HTML (`position: absolute; inset: 0; pointer-events: none`). */
  etiquetas: HTMLElement;
  reducirMovimiento: boolean;
  calidadBaja: boolean;
  /** Lee los tokens de color vigentes (tema claro u oscuro del modo pantalla). */
  tokens: () => Tokens;
  onClick: (toque: ToqueEscena) => void;
  onHover?: (toque: ToqueEscena | null) => void;
  /** Tocaron un lugar vacío (cierra la ficha). */
  onVacio?: () => void;
}

/** Un pedido tal como lo necesita la escena (sin nada que no se dibuje). */
export interface PedidoEscena {
  id: string;
  numero: string | null;
  etapa: EtapaId;
  cliente: string | null;
  ciudad: string | null;
  barrio: string | null;
  monto: number;
  canal: string;
  ia: boolean;
  transportador: string | null;
  tipoTransportador: 'mensajero' | 'transportadora' | null;
}

/** Qué sigue la cámara cuando la ficha está abierta. */
export type ObjetivoCamara =
  | { tipo: 'pedido'; id: string }
  | { tipo: 'vehiculo'; id: string }
  | { tipo: 'estacion'; id: string };

/** Cuántas cajas caben a la vista por estación; el resto se cuenta como "+N". */
export const CAJAS_VISIBLES = 18;
