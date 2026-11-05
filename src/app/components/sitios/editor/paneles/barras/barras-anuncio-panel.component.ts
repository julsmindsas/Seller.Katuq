import { Component } from "@angular/core";
import { ICONOS_SITIO, TRAZOS_ICONO_SITIO } from "../../../iconos-sitio";
import { PanelSitioBase } from "../panel-sitio-base";
import { MensajeBarra, NOMBRES_ICONO, TOPES, avisoDeDestino, conMensajes, mensajesDe } from "./barras-datos";

/**
 * Barra de anuncio del diseño nuevo (PLAN-V2 T06, DISENO §3.6, decisión D8): hasta 3 mensajes con ícono y enlace, y
 * hasta 3 enlaces de ayuda a la derecha. Es estática: no desfila ni rota; en celular se ve solo el primer mensaje.
 *
 * Escribe en `bloque.datos`: `disposicion` ("barra" o "" = centrada), `mensajes`, `enlacesBarra`, y deja el primer
 * mensaje en `texto` y `url` (lo que pinta el diseño de siempre). Con el diseño nuevo, el campo «Anuncio» y «Que
 * desfile» de siempre se esconden.
 */
@Component({
  selector: "app-panel-barras-anuncio",
  templateUrl: "./barras-anuncio-panel.component.html",
  styleUrls: ["./barras-anuncio-panel.component.scss"],
})
export class BarrasAnuncioPanelComponent extends PanelSitioBase {
  readonly topes = TOPES;
  readonly iconos = ICONOS_SITIO.map((id) => ({ id, nombre: NOMBRES_ICONO[id] || id }));
  readonly trazos = TRAZOS_ICONO_SITIO;

  get datos(): any {
    return (this.bloque && this.bloque.datos) || {};
  }

  /** Los mensajes para la plantilla, armados una vez por versión de los datos (ver el encabezado). */
  get mensajes(): MensajeBarra[] {
    const fuente = Array.isArray(this.datos.mensajes) && this.datos.mensajes.length ? this.datos.mensajes : this.datos.texto;
    if (!this.cache || this.cache.fuente !== fuente) this.cache = { fuente, lista: mensajesDe(this.datos) };
    return this.cache.lista;
  }
  private cache: { fuente: any; lista: MensajeBarra[] } | null = null;

  get enlaces(): { etiqueta: string; url: string }[] {
    return Array.isArray(this.datos.enlacesBarra) ? this.datos.enlacesBarra : [];
  }

  get disposicion(): "barra" | "centro" {
    return this.datos.disposicion === "barra" ? "barra" : "centro";
  }

  elegirDisposicion(valor: "barra" | "centro"): void {
    this.datos.disposicion = valor === "barra" ? "barra" : "";
    // La primera vez, el texto de siempre pasa a ser el primer mensaje (el servidor pinta la barra nueva desde aquí).
    if (!Array.isArray(this.datos.mensajes) || !this.datos.mensajes.length) conMensajes(this.datos, mensajesDe(this.datos));
    this.avisar();
  }

  cambiarMensaje(k: number, campo: "texto" | "url" | "icono", valor: string): void {
    const lista = mensajesDe(this.datos);
    if (!lista[k]) return;
    lista[k] = { ...lista[k], [campo]: valor };
    conMensajes(this.datos, lista);
    this.avisar();
  }

  agregarMensaje(): void {
    const lista = mensajesDe(this.datos);
    if (lista.length >= TOPES.mensajes) return;
    conMensajes(this.datos, [...lista, { texto: "", url: "", icono: "" }]);
    this.avisar();
  }

  quitarMensaje(k: number): void {
    const lista = mensajesDe(this.datos);
    lista.splice(k, 1);
    conMensajes(this.datos, lista);
    this.avisar();
  }

  moverMensaje(k: number, paso: -1 | 1): void {
    const lista = mensajesDe(this.datos);
    const j = k + paso;
    if (j < 0 || j >= lista.length) return;
    [lista[k], lista[j]] = [lista[j], lista[k]];
    conMensajes(this.datos, lista);
    this.avisar();
  }

  cambiarEnlace(k: number, campo: "etiqueta" | "url", valor: string): void {
    const lista = this.enlaces.map((e) => ({ ...e }));
    if (!lista[k]) return;
    lista[k] = { ...lista[k], [campo]: valor };
    this.datos.enlacesBarra = lista;
    this.avisar();
  }

  agregarEnlace(): void {
    if (this.enlaces.length >= TOPES.enlacesBarra) return;
    this.datos.enlacesBarra = [...this.enlaces, { etiqueta: "", url: "" }];
    this.avisar();
  }

  quitarEnlace(k: number): void {
    const lista = this.enlaces.slice();
    lista.splice(k, 1);
    this.datos.enlacesBarra = lista;
    this.avisar();
  }

  /**
   * Un destino que no sirve: una sección que no existe en el inicio o una página interna (`/empresas`) que el sitio no
   * tiene. La barra lo publica igual y no lleva a ningún lado (el menú del encabezado, en cambio, lo esconde).
   */
  avisoDestino(url: string): string {
    return avisoDeDestino(url, this.contenido, "barra");
  }

  porIndice(k: number): number {
    return k;
  }
}
