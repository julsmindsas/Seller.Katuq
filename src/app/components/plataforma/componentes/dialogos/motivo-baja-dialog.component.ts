import { AfterViewInit, ChangeDetectionStrategy, ChangeDetectorRef, Component, ElementRef, EventEmitter, HostListener, Input, OnDestroy, OnInit, Output, ViewChild, ViewEncapsulation } from '@angular/core';
import { Subject } from 'rxjs';
import { finalize, takeUntil } from 'rxjs/operators';
import { PlataformaService } from '../../servicios/plataforma.service';
import { MotivoBajaValor } from '../../plataforma.tipos';
import { TEXTOS } from '../../plataforma.textos';
import { COMENTARIO_BAJA_MAX, MOTIVOS_BAJA, limpiarTextoLibre, mensajeErrorCuentas } from '../../logica/cuentas';

/**
 * D-700 17.4 — «Registrar motivo de baja»: lista cerrada más un comentario opcional. La ficha lo ofrece solo si el ciclo admite
 * la baja (pausada, bloqueada, cancelada o eliminada) y solo a operadores; el servidor lo comprueba de nuevo. Emite `cerrado`.
 */
@Component({
  selector: 'app-motivo-baja-dialog',
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  // La ventana se cuelga del <body>: el contenedor de la página crea su propio plano de apilamiento y dejaba la barra inferior móvil por encima.
  // `pl-raiz` en el propio elemento conserva los tokens y las reglas del módulo fuera de su contenedor.
  host: { class: 'pl-raiz' },
  styleUrls: ['./dialogo-cuenta.scss'],
  template: `
    <div class="pl-modal" (mousedown)="alFondo($event)">
      <div class="pl-modal__caja" role="dialog" aria-modal="true" aria-labelledby="pl-baja-titulo" #caja (keydown)="alTeclado($event)">
        <h2 class="pl-modal__titulo" id="pl-baja-titulo">{{ t.bajaTitulo }}</h2>
        <p class="pl-modal__sub">{{ nombre }}</p>
        <p class="pl-modal__nota">{{ t.bajaTexto }}</p>

        <fieldset class="pl-modal__grupo">
          <legend>{{ t.bajaLegenda }}</legend>
          <label class="pl-modal__opcion" *ngFor="let m of opciones" [class.pl-modal__opcion--on]="motivo === m">
            <input type="radio" name="pl-motivo-baja" [value]="m" [checked]="motivo === m" [disabled]="guardando" (change)="elegir(m)" />
            <span class="pl-modal__opcion-texto"><b>{{ t.motivos[m] }}</b></span>
          </label>
        </fieldset>

        <label class="pl-modal__campo">
          <span class="pl-modal__rotulo">{{ t.bajaComentario }}</span>
          <textarea [value]="comentario" [attr.maxlength]="maximo" [disabled]="guardando" (input)="comentario = $any($event.target).value; error = null" aria-describedby="pl-baja-ayuda"></textarea>
          <small id="pl-baja-ayuda"><span>{{ t.bajaComentarioAyuda }}</span><span class="pl-num">{{ largo }}/{{ maximo }}</span></small>
        </label>

        <p class="cfg-aviso cfg-aviso--error" *ngIf="error" role="alert">{{ error }}</p>

        <div class="pl-modal__acciones">
          <button type="button" class="cfg-btn cfg-btn--sec" [disabled]="guardando" (click)="cerrar()">{{ t.cancelar }}</button>
          <button type="button" class="cfg-btn" [disabled]="!puedeGuardar" (click)="guardar()">{{ guardando ? t.guardando : t.bajaGuardar }}</button>
        </div>
      </div>
    </div>
  `,
})
export class MotivoBajaDialogComponent implements OnInit, AfterViewInit, OnDestroy {
  @Input() docId = '';
  @Input() nombre = '';
  /** Motivo ya registrado, si lo hay (se preselecciona para corregirlo). */
  @Input() motivoActual: string | null = null;
  @Output() cerrado = new EventEmitter<{ cambio: boolean; mensaje: string | null }>();
  @ViewChild('caja') caja?: ElementRef<HTMLElement>;

  readonly t = TEXTOS.cuentas;
  readonly opciones: MotivoBajaValor[] = MOTIVOS_BAJA;
  readonly maximo = COMENTARIO_BAJA_MAX;
  motivo: MotivoBajaValor | null = null;
  comentario = '';
  guardando = false;
  error: string | null = null;
  private previo: HTMLElement | null = null;
  private fin$ = new Subject<void>();

  constructor(private servicio: PlataformaService, private cd: ChangeDetectorRef, private anfitrion: ElementRef<HTMLElement>) {}

  ngOnInit(): void {
    document.body.appendChild(this.anfitrion.nativeElement);
    this.motivo = (MOTIVOS_BAJA as string[]).includes(this.motivoActual || '') ? (this.motivoActual as MotivoBajaValor) : null;
  }

  ngAfterViewInit(): void {
    this.previo = (document.activeElement as HTMLElement) || null;
    const entrada = this.caja && (this.caja.nativeElement.querySelector<HTMLElement>('input[type=radio]:checked') || this.caja.nativeElement.querySelector<HTMLElement>('input[type=radio]'));
    if (entrada) entrada.focus();
    this.cd.markForCheck();
  }

  ngOnDestroy(): void {
    this.fin$.next();
    this.fin$.complete();
    // Colgada del <body>: si la vista padre se destruye primero, Angular no la quita; se quita aquí.
    this.anfitrion.nativeElement.remove();
    if (this.previo && typeof this.previo.focus === 'function') this.previo.focus();
  }

  get largo(): number { return limpiarTextoLibre(this.comentario).length; }
  get puedeGuardar(): boolean { return !this.guardando && this.motivo !== null && this.largo <= COMENTARIO_BAJA_MAX; }

  elegir(m: MotivoBajaValor): void { this.motivo = m; this.error = null; this.cd.markForCheck(); }

  guardar(): void {
    if (!this.puedeGuardar || this.motivo === null) return;
    this.guardando = true;
    this.error = null;
    this.servicio.registrarMotivoBaja(this.docId, this.motivo, limpiarTextoLibre(this.comentario)).pipe(
      takeUntil(this.fin$),
      finalize(() => { this.guardando = false; this.cd.markForCheck(); }),
    ).subscribe({
      next: (r) => this.cerrado.emit({ cambio: true, mensaje: r && r.datos && r.datos.cambio === false ? this.t.bajaListoSin : this.t.bajaListo }),
      error: (err) => { this.error = mensajeErrorCuentas(err); this.cd.markForCheck(); },
    });
  }

  cerrar(): void {
    if (this.guardando) return;
    this.cerrado.emit({ cambio: false, mensaje: null });
  }

  alFondo(ev: MouseEvent): void {
    if ((ev.target as HTMLElement).classList.contains('pl-modal')) this.cerrar();
  }

  @HostListener('document:keydown.escape')
  alEscape(): void { this.cerrar(); }

  alTeclado(ev: KeyboardEvent): void {
    if (ev.key !== 'Tab' || !this.caja) return;
    const foco = Array.from(this.caja.nativeElement.querySelectorAll<HTMLElement>('input:not([disabled]), textarea:not([disabled]), button:not([disabled])'));
    if (!foco.length) return;
    const primero = foco[0];
    const ultimo = foco[foco.length - 1];
    const activo = document.activeElement;
    if (ev.shiftKey && activo === primero) { ev.preventDefault(); ultimo.focus(); }
    else if (!ev.shiftKey && activo === ultimo) { ev.preventDefault(); primero.focus(); }
  }
}
