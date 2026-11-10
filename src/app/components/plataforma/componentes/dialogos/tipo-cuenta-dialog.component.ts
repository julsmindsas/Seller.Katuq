import { AfterViewInit, ChangeDetectionStrategy, ChangeDetectorRef, Component, ElementRef, EventEmitter, HostListener, Input, OnDestroy, OnInit, Output, ViewChild, ViewEncapsulation } from '@angular/core';
import { Subject } from 'rxjs';
import { finalize, takeUntil } from 'rxjs/operators';
import { PlataformaService } from '../../servicios/plataforma.service';
import { TipoCuentaValor } from '../../plataforma.tipos';
import { TEXTOS } from '../../plataforma.textos';
import { MOTIVO_TIPO_MAX, MOTIVO_TIPO_MIN, TIPOS_CUENTA, limpiarTextoLibre, mensajeErrorCuentas, tipoInicial } from '../../logica/cuentas';

/**
 * D-700 17.4 — «Cambiar tipo de cuenta»: formulario propio (no un diálogo de librería) para confirmar o corregir el tipo.
 * Solo se muestra a operadores (el servidor vuelve a comprobarlo). Emite `cerrado` con `true` si algo cambió o ya estaba bien
 * (para que quien lo abrió recargue) y `false` si se canceló.
 */
@Component({
  selector: 'app-tipo-cuenta-dialog',
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  // La ventana se cuelga del <body>: el contenedor de la página crea su propio plano de apilamiento y dejaba la barra inferior móvil por encima.
  // `pl-raiz` en el propio elemento conserva los tokens y las reglas del módulo fuera de su contenedor.
  host: { class: 'pl-raiz' },
  styleUrls: ['./dialogo-cuenta.scss'],
  template: `
    <div class="pl-modal" (mousedown)="alFondo($event)">
      <div class="pl-modal__caja" role="dialog" aria-modal="true" aria-labelledby="pl-tipo-titulo" #caja (keydown)="alTeclado($event)">
        <h2 class="pl-modal__titulo" id="pl-tipo-titulo">{{ t.tipoTitulo }}</h2>
        <p class="pl-modal__sub">{{ nombre }}</p>
        <p class="pl-modal__nota">{{ t.tipoTexto }}</p>
        <p class="pl-modal__nota"><strong>{{ t.tipoAhora }}:</strong> {{ t.tipos[tipoActual] || tipoActual || '—' }} <span class="pl-modal__nota">({{ t.origenes[origenActual] || origenActual || '—' }})</span></p>

        <fieldset class="pl-modal__grupo">
          <legend>{{ t.tipoLegenda }}</legend>
          <label class="pl-modal__opcion" *ngFor="let o of opciones" [class.pl-modal__opcion--on]="tipo === o">
            <input type="radio" name="pl-tipo-cuenta" [value]="o" [checked]="tipo === o" [disabled]="guardando" (change)="elegir(o)" />
            <span class="pl-modal__opcion-texto"><b>{{ t.tipos[o] }}</b><small>{{ t.efecto[o] }}</small></span>
          </label>
        </fieldset>

        <label class="pl-modal__campo">
          <span class="pl-modal__rotulo">{{ t.tipoMotivo }}</span>
          <textarea [value]="motivo" [attr.maxlength]="maximo" [disabled]="guardando" (input)="motivo = $any($event.target).value; error = null" aria-describedby="pl-tipo-ayuda"></textarea>
          <small id="pl-tipo-ayuda"><span>{{ t.tipoMotivoAyuda }}</span><span class="pl-num">{{ largo }}/{{ maximo }}</span></small>
        </label>

        <p class="cfg-aviso cfg-aviso--error" *ngIf="error" role="alert">{{ error }}</p>
        <p class="pl-modal__nota" *ngIf="sinCambio">{{ t.tipoSinCambio }}</p>

        <div class="pl-modal__acciones">
          <button type="button" class="cfg-btn cfg-btn--sec" [disabled]="guardando" (click)="cerrar(false)">{{ t.cancelar }}</button>
          <button type="button" class="cfg-btn" [disabled]="!puedeGuardar" (click)="guardar()">{{ guardando ? t.guardando : (confirmaDeducido ? t.tipoConfirmar : t.tipoGuardar) }}</button>
        </div>
      </div>
    </div>
  `,
})
export class TipoCuentaDialogComponent implements OnInit, AfterViewInit, OnDestroy {
  @Input() docId = '';
  @Input() nombre = '';
  @Input() tipoActual = '';
  @Input() tipoDeducido: string | null = null;
  @Input() origenActual = '';
  @Output() cerrado = new EventEmitter<{ cambio: boolean; mensaje: string | null }>();
  @ViewChild('caja') caja?: ElementRef<HTMLElement>;

  readonly t = TEXTOS.cuentas;
  readonly opciones: TipoCuentaValor[] = TIPOS_CUENTA;
  readonly maximo = MOTIVO_TIPO_MAX;
  tipo: TipoCuentaValor | null = null;
  motivo = '';
  guardando = false;
  error: string | null = null;
  private previo: HTMLElement | null = null;
  private fin$ = new Subject<void>();

  constructor(private servicio: PlataformaService, private cd: ChangeDetectorRef, private anfitrion: ElementRef<HTMLElement>) {}

  ngOnInit(): void {
    document.body.appendChild(this.anfitrion.nativeElement);
    this.tipo = tipoInicial(this.tipoActual, this.tipoDeducido);
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

  get largo(): number { return limpiarTextoLibre(this.motivo).length; }
  get confirmado(): boolean { return this.origenActual === 'confirmado'; }
  get sinCambio(): boolean { return this.confirmado && this.tipo === this.tipoActual; }
  get confirmaDeducido(): boolean { return !this.confirmado && this.tipo !== null && this.tipo === tipoInicial(this.tipoActual, this.tipoDeducido); }
  get puedeGuardar(): boolean {
    return !this.guardando && this.tipo !== null && !this.sinCambio && this.largo >= MOTIVO_TIPO_MIN && this.largo <= MOTIVO_TIPO_MAX;
  }

  elegir(o: TipoCuentaValor): void { this.tipo = o; this.error = null; this.cd.markForCheck(); }

  guardar(): void {
    if (!this.puedeGuardar || this.tipo === null) return;
    this.guardando = true;
    this.error = null;
    this.servicio.cambiarTipoCuenta(this.docId, this.tipo, limpiarTextoLibre(this.motivo)).pipe(
      takeUntil(this.fin$),
      finalize(() => { this.guardando = false; this.cd.markForCheck(); }),
    ).subscribe({
      next: (r) => this.cerrado.emit({ cambio: true, mensaje: r && r.datos && r.datos.cambio === false ? this.t.tipoListoSin : this.t.tipoListo }),
      error: (err) => { this.error = mensajeErrorCuentas(err); this.cd.markForCheck(); },
    });
  }

  cerrar(cambio: boolean): void {
    if (this.guardando) return;
    this.cerrado.emit({ cambio, mensaje: null });
  }

  alFondo(ev: MouseEvent): void {
    if ((ev.target as HTMLElement).classList.contains('pl-modal')) this.cerrar(false);
  }

  @HostListener('document:keydown.escape')
  alEscape(): void { this.cerrar(false); }

  /** El foco no sale de la ventana mientras está abierta. */
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
