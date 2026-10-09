import {
  AccionOpttia,
  ComercioEnVivo,
  EtapaId,
  MensajeroEnVivo,
  PedidoEnVivo,
} from './en-vivo.modelos';
import { claveDeTexto, primerNombre } from './en-vivo-reglas';

/**
 * Acciones de Opttia → acciones de la pantalla. Opttia solo SUGIERE (`{ tipo, objetivo, texto }`,
 * ver `AccionOpttia`); la pantalla decide qué abrir. Este mapeo es puro: no abre nada, solo
 * resuelve el `objetivo` contra lo que la pantalla ya tiene (pedidos, flota, comercios).
 *
 * Las tres primeras variantes de `AccionUi` tienen la misma forma que `AccionPantalla` de
 * `EnVivoInteraccionService` (`abrir-lista`, `abrir-pedido`, `abrir-mensajero`), así que se pueden
 * pasar tal cual a `interaccion.emitir(...)`. `abrir-comercio` (abrir el tablero de un comercio
 * desde toda Katuq, con `?empresa=`) aún no existe ahí: quien lo atienda debe agregarlo.
 */
export type AccionUi =
  /** `clave`: `todos` · `ia` · `etapa:<id>` · `canal:<canal>`. */
  | { tipo: 'abrir-lista'; clave: string }
  | { tipo: 'abrir-pedido'; pedidoId: string; empresa?: string | null }
  | { tipo: 'abrir-mensajero'; nombre: string; pedidoIds: string[] }
  /** `foco: 'atascados'`: abrirlo mostrando sus pedidos listos que esperan (`atascados:<comercio>`). */
  | { tipo: 'abrir-comercio'; empresa: string; nombre: string; foco?: 'atascados' };

/** Un botón listo para pintar: la etiqueta (la de Opttia o una por defecto) y qué hacer al tocarlo. */
export interface AccionOpttiaUi {
  etiqueta: string;
  accion: AccionUi;
}

/** Lo que la pantalla tiene a mano para resolver los objetivos. */
export interface ContextoAccionesOpttia {
  pedidos: ReadonlyArray<PedidoEnVivo>;
  flota: ReadonlyArray<MensajeroEnVivo>;
  /** Comercios de toda Katuq (`cifrasGlobal.comercios`); vacío en la vista de un comercio. */
  comercios: ReadonlyArray<ComercioEnVivo>;
  /** Empresa que se mira, para abrir la ficha de un pedido con `?empresa=` (null = la de la sesión). */
  empresa?: string | null;
}

const ETAPAS: ReadonlyArray<EtapaId> = [
  'recibido',
  'produccion',
  'producido',
  'empacado',
  'listo',
  'camino',
  'entregado',
  'rechazado',
  'cancelado',
];

const TEXTO_ETAPA: Readonly<Record<EtapaId, string>> = {
  recibido: 'sin producir',
  produccion: 'en producción',
  producido: 'producidos',
  empacado: 'empacados',
  listo: 'para despachar',
  camino: 'despachados',
  entregado: 'entregados',
  rechazado: 'rechazados',
  cancelado: 'cancelados',
};

/** Número de pedido comparable: sin "#", sin tildes y en minúsculas. */
function claveDeNumero(numero: string | null | undefined): string {
  return claveDeTexto(String(numero ?? '').replace(/^\s*#/, ''));
}

/** Canal comparable: "Tienda Web", "tienda-web" y "tienda_web" son el mismo. */
function claveDeCanal(canal: string | null | undefined): string {
  return claveDeTexto(String(canal ?? '').replace(/[-_]+/g, ' '));
}

function buscarComercio(comercios: ReadonlyArray<ComercioEnVivo>, objetivo: string): ComercioEnVivo | null {
  const clave = claveDeTexto(objetivo);
  if (!clave) return null;
  return comercios.find((c) => claveDeTexto(c.nombre) === clave || claveDeTexto(c.empresa) === clave) ?? null;
}

/** El botón de una acción `lista` con su etiqueta por defecto, o null si el objetivo no existe. */
function deLista(objetivo: string, contexto: ContextoAccionesOpttia): AccionOpttiaUi | null {
  const lista = (clave: string, etiqueta: string): AccionOpttiaUi => ({ etiqueta, accion: { tipo: 'abrir-lista', clave } });
  if (objetivo === 'todos') return lista('todos', 'Ver todos los pedidos');
  if (objetivo === 'ia') return lista('ia', 'Ver los pedidos de Opttia');

  if (objetivo.startsWith('etapa:')) {
    const etapa = objetivo.slice('etapa:'.length) as EtapaId;
    return ETAPAS.indexOf(etapa) === -1 ? null : lista(`etapa:${etapa}`, `Ver pedidos ${TEXTO_ETAPA[etapa]}`);
  }

  if (objetivo.startsWith('canal:')) {
    const pedido = objetivo.slice('canal:'.length).trim();
    if (!pedido) return null;
    // El servidor solo deja pasar canales sin espacios ("tienda-web"): se busca el nombre real del canal.
    const canal = contexto.pedidos.map((p) => p.canal).find((c) => claveDeCanal(c) === claveDeCanal(pedido)) ?? pedido;
    return lista(`canal:${canal}`, `Ver pedidos de ${canal}`);
  }

  if (objetivo.startsWith('atascados:')) {
    const comercio = buscarComercio(contexto.comercios, objetivo.slice('atascados:'.length));
    return comercio
      ? {
          etiqueta: `Ver atascados de ${comercio.nombre}`,
          accion: { tipo: 'abrir-comercio', empresa: comercio.empresa, nombre: comercio.nombre, foco: 'atascados' },
        }
      : null;
  }
  return null;
}

/**
 * Convierte una acción de Opttia en un botón de la pantalla, o null si el objetivo no se puede
 * abrir con lo que hay (un pedido que ya no está en la foto, un comercio que no se conoce...): en
 * ese caso la pantalla no pinta el botón.
 */
export function accionOpttiaAUi(accion: AccionOpttia | null | undefined, contexto: ContextoAccionesOpttia): AccionOpttiaUi | null {
  if (!accion || typeof accion.objetivo !== 'string') return null;
  const objetivo = accion.objetivo.trim();
  if (!objetivo) return null;
  const etiquetaOpttia = typeof accion.texto === 'string' ? accion.texto.trim() : '';
  const con = (porDefecto: string, ui: AccionUi): AccionOpttiaUi => ({ etiqueta: etiquetaOpttia || porDefecto, accion: ui });

  switch (accion.tipo) {
    case 'tablero': {
      const comercio = buscarComercio(contexto.comercios, objetivo);
      return comercio ? con(`Ver ${comercio.nombre}`, { tipo: 'abrir-comercio', empresa: comercio.empresa, nombre: comercio.nombre }) : null;
    }

    case 'ficha': {
      // El objetivo es el NÚMERO del pedido ("FLO-1004" o "#FLO-1004"); el id sale de la lista.
      const numero = claveDeNumero(objetivo);
      const pedido = numero ? contexto.pedidos.find((p) => claveDeNumero(p.numero) === numero) : undefined;
      return pedido
        ? con(`Abrir el pedido #${String(pedido.numero ?? '').replace(/^\s*#/, '')}`, {
            tipo: 'abrir-pedido',
            pedidoId: pedido.id,
            empresa: contexto.empresa ?? null,
          })
        : null;
    }

    case 'mensajero': {
      // El objetivo es el PRIMER nombre del mensajero; se busca entre la flota para tener el nombre completo.
      const clave = claveDeTexto(objetivo);
      const mensajero = contexto.flota.find((m) => claveDeTexto(primerNombre(m.nombre)) === clave);
      if (!mensajero) return null;
      const suyo = claveDeTexto(mensajero.nombre);
      const pedidoIds = contexto.pedidos.filter((p) => p.etapa === 'camino' && claveDeTexto(p.transportador) === suyo).map((p) => p.id);
      return con(`Ver a ${primerNombre(mensajero.nombre)}`, { tipo: 'abrir-mensajero', nombre: mensajero.nombre, pedidoIds });
    }

    case 'lista': {
      const resuelta = deLista(objetivo, contexto);
      return resuelta ? { etiqueta: etiquetaOpttia || resuelta.etiqueta, accion: resuelta.accion } : null;
    }

    default:
      return null;
  }
}

/** Las acciones de una respuesta o de un punto del resumen, sin las que no se pueden abrir. */
export function accionesOpttiaAUi(
  acciones: ReadonlyArray<AccionOpttia> | null | undefined,
  contexto: ContextoAccionesOpttia
): AccionOpttiaUi[] {
  const salida: AccionOpttiaUi[] = [];
  for (const accion of acciones ?? []) {
    const ui = accionOpttiaAUi(accion, contexto);
    if (ui) salida.push(ui);
  }
  return salida;
}
