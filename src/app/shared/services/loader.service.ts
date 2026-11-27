import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class LoaderService {
  private loadingSubject = new BehaviorSubject<boolean>(false);
  public loading$: Observable<boolean> = this.loadingSubject.asObservable();

  private requestCount = 0;
  // Pantallas que manejan sus propios loaders por sección (ej. /welcome) y no
  // quieren el overlay global bloqueante. Contador para soportar anidamiento.
  private suppressCount = 0;
  // Pantallas que se refrescan solas cada pocos segundos (la bandeja de mensajes): la barra fina de
  // arriba parpadearía en cada refresco, así que se oculta mientras estén abiertas.
  private barraOcultaCount = 0;

  show() {
    this.requestCount++;
    if (this.requestCount === 1 && this.suppressCount === 0) {
      this.loadingSubject.next(true);
    }
  }

  hide() {
    if (this.requestCount > 0) {
      this.requestCount--;
    }
    if (this.requestCount === 0) {
      this.loadingSubject.next(false);
    }
  }

  /**
   * Suprime el overlay global mientras la pantalla actual esté montada.
   * Llamar en ngOnInit y SIEMPRE emparejar con releaseGlobalLoader() en
   * ngOnDestroy. Las requests siguen contándose; solo se silencia el overlay.
   */
  suppressGlobalLoader(): void {
    this.suppressCount++;
    if (this.loadingSubject.value) {
      this.loadingSubject.next(false);
    }
  }

  /** Oculta la barra fina de progreso de arriba. Emparejar SIEMPRE con mostrarBarraSuperior() en ngOnDestroy. */
  ocultarBarraSuperior(): void {
    this.barraOcultaCount++;
    document.body.classList.add('kq-sin-barra-carga');
  }

  mostrarBarraSuperior(): void {
    if (this.barraOcultaCount > 0) this.barraOcultaCount--;
    if (this.barraOcultaCount === 0) document.body.classList.remove('kq-sin-barra-carga');
  }

  releaseGlobalLoader(): void {
    if (this.suppressCount > 0) {
      this.suppressCount--;
    }
    // Si al liberar hay requests en vuelo, el overlay vuelve a ser visible.
    if (this.suppressCount === 0 && this.requestCount > 0) {
      this.loadingSubject.next(true);
    }
  }

  /** Descarta solicitudes visuales pertenecientes a una sesión que terminó. */
  reset(): void {
    this.requestCount = 0;
    this.suppressCount = 0;
    this.loadingSubject.next(false);
  }
}
