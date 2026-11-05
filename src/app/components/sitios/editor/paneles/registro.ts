import { Type } from "@angular/core";
import { PanelSitioBase } from "./panel-sitio-base";
import { PanelPortadaComponent } from "./portada/panel-portada.component";
import { AtencionPanelComponent } from "./atencion/atencion-panel.component";
import { BarrasAnuncioPanelComponent } from "./barras/barras-anuncio-panel.component";
import { BarrasEncabezadoPanelComponent } from "./barras/barras-encabezado-panel.component";
import { FichasPanelComponent } from "./fichas/fichas-panel.component";
import { VitrinaPanelComponent } from "./vitrina/vitrina-panel.component";
import { PanelPlanoComponent } from "./plano/plano-panel.component";
import { resumenPlano } from "./plano/plano-datos";
import { CategoriasPanelComponent } from "./categorias/categorias-panel.component";
import { CategoriasBloquePanelComponent } from "./categorias/categorias-bloque-panel.component";
import { ContactoPanelComponent } from "./contacto/contacto-panel.component";
import { CatalogoInicioPanelComponent } from "./catalogo/catalogo-inicio-panel.component";
export { TIPOS_NUEVOS_SITIO, esTipoNuevoSitio } from "./tipos-nuevos";
// La base vive en su propio archivo (PLAN-V2 T06 y T07): si estuviera aquí, este registro y cada panel se importarían en
// círculo y el editor fallaría al cargar («Cannot access 'PanelSitioBase' before initialization»). Se re-exporta para
// quien la importaba de aquí. Los paneles la importan de "./panel-sitio-base", nunca de este archivo.
export { PanelSitioBase } from "./panel-sitio-base";

/**
 * Registro de los paneles del diseño nuevo (PLAN-V2 §3, tanda T03). Es el espejo en el editor del registro de módulos
 * del servidor (`functions/utils/sitioModulos/index.js`): cada bloque o pieza nueva trae su panel en
 * `paneles/<nombre>/`, y así las tandas T06 a T24 no editan a la vez `sitio-editor.component.{ts,html}`.
 *
 * ── Contrato de un panel ─────────────────────────────────────────────────────────────────────────────────────────
 *  - El componente extiende `PanelSitioBase`: recibe `bloque` (el bloque elegido; null en un panel de la Tienda) y
 *    `contenido` (el sitio: tema, tienda, páginas). Edita EN SU LUGAR `bloque.datos` o `contenido.tienda.<campo>` y,
 *    después de cada cambio, llama `avisar()`: el editor marca el borrador como cambiado, refresca la vista previa y
 *    lo guarda solo, igual que con cualquier otro campo.
 *  - Se declara en `PanelesSitioModule` (o es `standalone`). Sigue la regla de diseño del Seller (`cfg-*`, acento
 *    `#5F3FE0`, sin degradados) y ninguna clase lleva «p-» (trampa de CSS global de AGENTS.md).
 *  - El servidor normaliza todo al guardar: el panel ayuda y avisa, pero no es la validación.
 *  - Para BORRAR un campo de la tienda (`contenido.tienda.<campo>`), el panel lo deja en lista vacía (o null), nunca
 *    lo quita con `delete`: el servidor conserva los campos que el editor no manda (para no perderlos con un editor
 *    viejo), así que una clave ausente vuelve con su valor anterior.
 *  - Los paneles solo salen con el diseño nuevo encendido (el de un bloque y los de la Tienda): con el de siempre, lo
 *    que se llene no se vería en la página y sus textos contarían en la revisión de promesas de un diseño que no los
 *    pinta.
 *  - Los tipos nuevos (`TIPOS_NUEVOS_SITIO`) no se componen a mano (no son lienzo), igual que en el servidor.
 *
 * ── Quién toca este archivo ──────────────────────────────────────────────────────────────────────────────────────
 *  Las líneas de `PANELES_SITIO` las aplica el orquestador al integrar cada tanda; el subagente entrega su línea en la
 *  respuesta y hace commit solo de su carpeta.
 */

export interface PanelSitio {
  /** Identificador único; el mismo `nombre` del módulo del servidor (`plano`, `barras`, `ficha`). */
  id: string;
  /** El componente del panel. */
  componente: Type<PanelSitioBase>;
  /** Tipo de bloque que edita (`plano`, `guia`). Sin tipo, el panel es de la pestaña Tienda (`tienda`). */
  tipo?: string;
  /**
   * Solo para un tipo NUEVO: cómo se ofrece en «Agregar una sección». Se ofrece únicamente con el diseño nuevo
   * encendido (el servidor no pinta un tipo nuevo en v1). `familia` es una de las de `FAMILIAS_BLOQUE` del editor.
   */
  catalogo?: { nombre: string; descripcion: string; icono: string; familia?: string };
  /** Datos con que nace el bloque al agregarlo (sin datos falsos: lo que falta se pide en el panel). */
  datosIniciales?: () => any;
  /** Una línea de resumen para la ficha que el espejo pinta en lugar del bloque. */
  resumen?: (datos: any) => string;
  /** Panel de la pestaña Tienda (Tienda › Atención, Tienda › Fichas de producto). Solo con el diseño nuevo. */
  tienda?: { titulo: string; descripcion?: string };
}

/**
 * Los paneles registrados. Cada tanda trae su línea:
 *   T06 Tienda › Atención · T07 portada · T08 Tienda › Fichas de producto · T13 plano · T15 vitrina · N2 bandas
 *   T17 guia · T20 pedidoRapido · contacto (formulario de contacto y cotización)
 */
export const PANELES_SITIO: PanelSitio[] = [
  // T06 (módulo `barras`): Tienda › Atención, y lo nuevo del encabezado y de la barra de anuncio, que sale debajo de sus
  // campos de siempre (con el diseño nuevo).
  {
    id: "barras",
    componente: AtencionPanelComponent,
    tienda: { titulo: "Atención", descripcion: "El horario y el tiempo de respuesta reales de tu WhatsApp. Los usa el botón «Asesor» del encabezado." },
  },
  { id: "barrasEncabezado", tipo: "encabezado", componente: BarrasEncabezadoPanelComponent },
  { id: "barrasAnuncio", tipo: "anuncio", componente: BarrasAnuncioPanelComponent },
  // T07 (módulo `portada`): la portada «Espacios». Extiende el bloque `hero`: sale debajo de sus campos de siempre.
  { id: "portada", componente: PanelPortadaComponent, tipo: "hero" },
  // T08 (módulo `ficha`): Tienda › Fichas de producto («Ideal para», datos clave, pasos, preguntas respondidas y quién
  // responde).
  {
    id: "ficha",
    componente: FichasPanelComponent,
    tienda: {
      titulo: "Fichas de producto",
      descripcion: "Para qué sirve cada producto, cómo se instala y las preguntas que ya respondiste. Salen en su tarjeta y en su ficha.",
    },
  },
  // T13 (módulo `plano`): el plano con el kit. Tipo NUEVO: se ofrece en «Agregar una sección» solo con el diseño nuevo.
  // Nace sin espacios y sin compra: el comercio enciende «Agregar el kit» en el panel cuando el kit está validado.
  {
    id: "plano",
    tipo: "plano",
    componente: PanelPlanoComponent,
    catalogo: {
      nombre: "Plano y kit",
      descripcion: "El plano de tu espacio con las piezas numeradas y el kit con su total.",
      icono: "M3 10.5 12 3l9 7.5V21H3zM9 21v-6h6v6",
      familia: "Para vender",
    },
    datosIniciales: () => ({ espacios: [] }),
    resumen: (d: any) => resumenPlano(d),
  },
  // T15 (módulo `vitrina`): las pestañas de la vitrina. Extiende el bloque `productos`: sale debajo de sus campos de
  // siempre.
  { id: "vitrina", tipo: "productos", componente: VitrinaPanelComponent },
  // N2 (módulo `bandas`): Tienda › Nombres de categorías (`tienda.categoriasInfo`), los nombres e íconos con que se leen
  // las categorías en las baldosas, el menú, la fila del encabezado y los filtros del catálogo del diseño nuevo; y la
  // forma de la banda «Categorías» (fotos o íconos, y si muestra la cantidad), debajo de sus campos de siempre.
  { id: "bandasCategorias", tipo: "categorias", componente: CategoriasBloquePanelComponent },
  {
    id: "bandas",
    componente: CategoriasPanelComponent,
    tienda: {
      titulo: "Nombres de categorías",
      descripcion: "Cómo se leen tus categorías en la página, con sus tildes. No cambia la categoría en tu catálogo.",
    },
  },
  // Módulo `contacto` (5-nov): el formulario de contacto o cotización con su columna de confianza. Extiende el bloque
  // `formulario`: sale debajo de sus campos de siempre (título, descripción, qué se pide, botón y destino).
  { id: "contacto", tipo: "formulario", componente: ContactoPanelComponent },
  // Módulo `catalogoInicio` (5-nov): la sección del catálogo en el inicio (cuántos productos y su título). Extiende el bloque
  // `catalogo`: sale debajo de sus campos de siempre. La foto genérica de los productos sin foto va en Tienda › Nombres de
  // categorías (panel `bandas`).
  { id: "catalogoInicio", tipo: "catalogo", componente: CatalogoInicioPanelComponent },
];

/** El panel que edita un tipo de bloque, si lo hay. */
export function panelDeTipo(tipo: string, lista: PanelSitio[] = PANELES_SITIO): PanelSitio | null {
  return lista.find((p) => !!p.tipo && p.tipo === tipo) || null;
}

/** Los paneles de la pestaña Tienda, en el orden del registro. */
export function panelesDeTienda(lista: PanelSitio[] = PANELES_SITIO): PanelSitio[] {
  return lista.filter((p) => !p.tipo && !!p.tienda);
}

/** Las entradas de «Agregar una sección» de los tipos nuevos (solo se ofrecen con el diseño nuevo). */
export function catalogoDisenoNuevo(lista: PanelSitio[] = PANELES_SITIO): { tipo: string; nombre: string; descripcion: string; icono: string; familia?: string }[] {
  return lista
    .filter((p) => !!p.tipo && !!p.catalogo)
    .map((p) => ({ tipo: p.tipo as string, ...(p.catalogo as { nombre: string; descripcion: string; icono: string; familia?: string }) }));
}

/** Lo que el espejo del editor necesita para la ficha de cada tipo nuevo. */
export interface FichaFiel {
  nombre: string;
  resumen?: (datos: any) => string;
}

export function fichasFieles(lista: PanelSitio[] = PANELES_SITIO): { [tipo: string]: FichaFiel } {
  const salida: { [tipo: string]: FichaFiel } = {};
  for (const p of lista) {
    if (p.tipo && p.catalogo) salida[p.tipo] = { nombre: p.catalogo.nombre, resumen: p.resumen };
  }
  return salida;
}
