/**
 * Modo pantalla de "En vivo" (televisor): pantalla completa, sin apagar la pantalla y tema
 * oscuro. Todo con try/catch: el navegador puede negar la pantalla completa o el bloqueo
 * (iframe, permisos, equipo sin soporte) y la pantalla debe seguir funcionando.
 *
 * El tema oscuro es un desvío JUSTIFICADO del tema canónico y vive solo en esta pantalla:
 * la clase `CLASE_TV` redefine las variables `--ev-*` (ver `_en-vivo-tema.scss`).
 */

/** Clase que activa la variante oscura y la letra grande en el elemento raíz de la pantalla. */
export const CLASE_TV = 'ev-tv';

interface BloqueoDePantalla {
  release(): Promise<void>;
}

interface NavegadorConBloqueo {
  wakeLock?: { request(tipo: 'screen'): Promise<BloqueoDePantalla> };
}

export class ControlPantalla {
  private elemento: HTMLElement | null = null;
  private bloqueo: BloqueoDePantalla | null = null;
  private activo = false;
  /** true si el navegador sí entró en pantalla completa (si no dejó, Esc no debe cerrar el modo). */
  private enPantallaCompleta = false;

  private readonly alCambiarPantallaCompleta = (): void => {
    if (this.activo && this.enPantallaCompleta && !this.doc.fullscreenElement) {
      // La persona salió con Esc: el modo termina con ella.
      this.enPantallaCompleta = false;
      void this.salir().then(() => this.alSalirPorSistema());
    }
  };

  private readonly alCambiarVisibilidad = (): void => {
    // El navegador suelta el bloqueo al ocultar la pestaña; al volver, se pide de nuevo.
    if (this.activo && !this.doc.hidden && this.bloqueo === null) void this.pedirBloqueo();
  };

  constructor(private readonly doc: Document, private readonly alSalirPorSistema: () => void) {
    doc.addEventListener('fullscreenchange', this.alCambiarPantallaCompleta);
    doc.addEventListener('visibilitychange', this.alCambiarVisibilidad);
  }

  get enModoPantalla(): boolean {
    return this.activo;
  }

  /** Entra al modo: tema oscuro, pantalla completa (si deja) y pantalla encendida (si deja). */
  async entrar(elemento: HTMLElement): Promise<void> {
    this.elemento = elemento;
    this.activo = true;
    elemento.classList.add(CLASE_TV);
    try {
      if (elemento.requestFullscreen) {
        await elemento.requestFullscreen();
        this.enPantallaCompleta = true;
      }
    } catch {
      // El visor no deja pantalla completa: queda el modo oscuro y de letra grande.
      this.enPantallaCompleta = false;
    }
    await this.pedirBloqueo();
  }

  /** Sale del modo y deja todo como estaba. */
  async salir(): Promise<void> {
    this.activo = false;
    this.enPantallaCompleta = false;
    this.elemento?.classList.remove(CLASE_TV);
    this.elemento = null;
    try {
      if (this.doc.fullscreenElement && this.doc.exitFullscreen) await this.doc.exitFullscreen();
    } catch {
      // Ya no estaba en pantalla completa.
    }
    await this.soltarBloqueo();
  }

  /** Suelta oyentes y bloqueo. Se llama al destruir la pantalla. */
  destruir(): void {
    this.doc.removeEventListener('fullscreenchange', this.alCambiarPantallaCompleta);
    this.doc.removeEventListener('visibilitychange', this.alCambiarVisibilidad);
    void this.salir();
  }

  private async pedirBloqueo(): Promise<void> {
    try {
      const nav = navigator as unknown as NavegadorConBloqueo;
      if (nav.wakeLock) this.bloqueo = await nav.wakeLock.request('screen');
    } catch {
      this.bloqueo = null;
    }
  }

  private async soltarBloqueo(): Promise<void> {
    const bloqueo = this.bloqueo;
    this.bloqueo = null;
    try {
      if (bloqueo) await bloqueo.release();
    } catch {
      // Ya estaba suelto.
    }
  }
}
