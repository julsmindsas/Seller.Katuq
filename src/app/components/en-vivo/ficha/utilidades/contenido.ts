import { EstadoEnVivo } from '../../servicios/en-vivo.modelos';
import { mapaDeEtapas } from '../../utilidades/tonos';
import { Traductor } from '../../utilidades/traductor';
import { ContenidoFicha, ContenidoLista, VistaFicha, claveDeVista } from '../ficha.modelos';
import { filasDeEventos, filasDePedidos } from './filas';
import { armarLista } from './lista';
import { armarMensajero } from './mensajero';
import { armarPedido, EstadoDetalle } from './pedido';

/**
 * Arma lo que pinta la ficha para una vista (un pedido, una lista o un mensajero) a partir del
 * estado de la pantalla. Es el único punto de entrada de la lógica de la ficha: todo lo demás son
 * piezas puras que se prueban por separado. Sin Angular y sin reloj propio.
 */

/** Lo que la ficha necesita del estado de la pantalla (un recorte de `EstadoEnVivo`). */
export type EstadoParaFicha = Pick<
  EstadoEnVivo,
  'vista' | 'empresa' | 'soloLectura' | 'etapas' | 'pedidos' | 'flota' | 'eventos' | 'cifras' | 'cifrasGlobal' | 'actualizadoEn'
>;

export interface EntradaContenido {
  vista: VistaFicha;
  estado: EstadoParaFicha;
  detalle: EstadoDetalle;
  /** "Ocultar clientes y montos" (en toda Katuq: comercios y montos). */
  ocultar: boolean;
  ahoraMs: number;
  /** Ids de pasos del recorrido que se acaban de cumplir. */
  nuevos: ReadonlySet<string>;
  /** El comercio que mira la pantalla (`@Input() empresa` de la ficha), si lo hay. */
  empresaEnfoque: string | null;
  /** Traductor del componente. */
  t: Traductor;
}

/**
 * Empresa a la que se le pide el detalle de un pedido: la que trae la acción, o la que se mira, o la
 * de la foto. Con una sesión que no es de Katuq el servidor ignora `?empresa=`, así que mandarla
 * siempre es seguro; con una de Katuq es obligatoria para ver un comercio.
 */
export function empresaDeConsulta(
  empresaDeLaVista: string | null,
  empresaEnfoque: string | null,
  empresaDeLaFoto: string | null
): string | null {
  return empresaDeLaVista || empresaEnfoque || empresaDeLaFoto || null;
}

function listaNoEntendida(t: Traductor): ContenidoLista {
  return {
    celdas: [],
    filas: [],
    restantes: 0,
    vacio: t('enVivo.ficha.listaNoEntendida'),
    nota: '',
  };
}

export function armarContenido(entrada: EntradaContenido): ContenidoFicha {
  const { vista, estado, ocultar, ahoraMs, t } = entrada;
  const katuq = estado.vista === 'katuq';
  const etapas = mapaDeEtapas(estado.etapas);
  const dia = katuq ? null : estado.cifras?.dia ?? null;
  const clave = claveDeVista(vista);

  let eyebrow = '';
  let titulo = '';
  let pedido: ContenidoFicha['pedido'] = null;
  let lista: ContenidoFicha['lista'] = null;
  let mensajero: ContenidoFicha['mensajero'] = null;

  switch (vista.tipo) {
    case 'pedido': {
      const empresa = empresaDeConsulta(vista.empresa, entrada.empresaEnfoque, estado.empresa);
      // En toda Katuq el nombre y la ciudad del comercio salen de las cifras de plataforma (o del evento).
      const comercio = katuq ? estado.cifrasGlobal?.comercios?.find((c) => c.empresa === empresa) ?? null : null;
      const eventoDelPedido = katuq ? estado.eventos.find((e) => e.pedidoId === vista.id) ?? null : null;
      const nombreComercio = katuq
        ? comercio?.nombre ?? eventoDelPedido?.nombreComercio ?? ''
        : estado.empresa ?? t('enVivo.ficha.tuComercio');
      const resultado = armarPedido({
        id: vista.id,
        empresa: katuq ? empresa : null,
        vivo: katuq ? null : estado.pedidos.find((p) => p.id === vista.id) ?? null,
        detalle: entrada.detalle,
        eventos: estado.eventos,
        flota: estado.flota,
        etapas: estado.etapas,
        vista: estado.vista,
        soloLectura: estado.soloLectura,
        nombreComercio,
        ciudadComercio: katuq ? comercio?.ciudad ?? eventoDelPedido?.ciudadComercio ?? null : null,
        ocultar,
        nuevos: entrada.nuevos,
        ahoraMs,
        t,
      });
      eyebrow = resultado.eyebrow;
      titulo = resultado.titulo;
      pedido = resultado.contenido;
      break;
    }

    case 'lista': {
      const resultado = armarLista({
        clave: vista.clave,
        filas: katuq ? filasDeEventos(estado.eventos) : filasDePedidos(estado.pedidos, estado.empresa),
        dia,
        katuq,
        ocultar,
        nombreComercio: estado.empresa ?? t('enVivo.ficha.tuComercio'),
        ahoraMs,
        etapas,
        t,
      });
      eyebrow = resultado ? resultado.eyebrow : katuq ? t('enVivo.ficha.todaKatuq') : estado.empresa ?? t('enVivo.ficha.tuComercio');
      titulo = resultado ? resultado.titulo : t('enVivo.ficha.pedidos');
      lista = resultado ? resultado.contenido : listaNoEntendida(t);
      break;
    }

    default: {
      const resultado = armarMensajero({
        nombre: vista.nombre,
        flota: estado.flota,
        pedidos: estado.pedidos,
        eventos: estado.eventos,
        actualizadoEn: estado.actualizadoEn,
        dia,
        nombreComercio: estado.empresa ?? t('enVivo.ficha.tuComercio'),
        ocultar,
        ahoraMs,
        etapas,
        t,
      });
      eyebrow = resultado.eyebrow;
      titulo = resultado.titulo;
      mensajero = resultado.contenido;
      break;
    }
  }

  const sinFirma = { eyebrow, titulo, pedido, lista, mensajero };
  return { clave, ...sinFirma, firma: JSON.stringify(sinFirma) };
}
