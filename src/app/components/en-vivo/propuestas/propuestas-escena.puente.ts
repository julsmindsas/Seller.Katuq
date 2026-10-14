import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, Subject } from 'rxjs';
import { distinctUntilChanged } from 'rxjs/operators';
import { AvisoParaEscena, ContadorPropuestas, PropuestaEnEscena } from './propuestas.modelos';

/**
 * Puente entre la tarjeta de Opttia (que escribe aquí) y la escena y el orbe (que solo leen).
 * Así ninguno depende del otro: la escena no sabe de HTTP ni de aprobar, y la tarjeta no sabe de
 * three.js. D-422, fase 1.
 */
@Injectable({ providedIn: 'root' })
export class EnVivoPropuestaEscenaPuente {
  private readonly actualSub = new BehaviorSubject<PropuestaEnEscena | null>(null);
  private readonly contadorSub = new BehaviorSubject<ContadorPropuestas>({ ideas: 0, urgentes: 0 });
  private readonly toquesSub = new Subject<string>();
  private readonly abrirSub = new Subject<void>();
  private readonly avisosSub = new Subject<AvisoParaEscena>();

  /** La propuesta que la escena debe ensayar ahora (null = ninguna: limpiar la capa). */
  readonly actual$: Observable<PropuestaEnEscena | null> = this.actualSub.pipe(
    distinctUntilChanged((a, b) => (a ? a.id : null) === (b ? b.id : null))
  );
  /** Para el botón del orbe: "Opttia tiene N ideas · M urgentes". */
  readonly contador$: Observable<ContadorPropuestas> = this.contadorSub.pipe(
    distinctUntilChanged((a, b) => a.ideas === b.ideas && a.urgentes === b.urgentes)
  );
  /** La escena avisa que tocaron el montón de un grupo (id del grupo). */
  readonly toques$: Observable<string> = this.toquesSub.asObservable();
  /** El botón del orbe pide mostrar (otra vez) la tarjeta. */
  readonly abrir$: Observable<void> = this.abrirSub.asObservable();
  /**
   * Fase 2: lo que la tarjeta hizo y que no trae evento real (abrir WhatsApp: Katuq no envía nada).
   * La escena lo puede animar (la burbuja vuela de la tienda a la casa). Solo lleva el id del pedido.
   */
  readonly avisos$: Observable<AvisoParaEscena> = this.avisosSub.asObservable();

  get actual(): PropuestaEnEscena | null {
    return this.actualSub.value;
  }

  // ── Lo usa la tarjeta ────────────────────────────────────────────────────
  mostrar(p: PropuestaEnEscena | null): void {
    this.actualSub.next(p);
  }

  contar(c: ContadorPropuestas): void {
    this.contadorSub.next(c);
  }

  avisar(a: AvisoParaEscena): void {
    this.avisosSub.next(a);
  }

  // ── Lo usan la escena y el botón del orbe ────────────────────────────────
  tocarGrupo(grupoId: string): void {
    this.toquesSub.next(grupoId);
  }

  pedirTarjeta(): void {
    this.abrirSub.next();
  }
}
