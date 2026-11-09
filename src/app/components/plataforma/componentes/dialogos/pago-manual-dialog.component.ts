import { AfterViewInit, ChangeDetectionStrategy, ChangeDetectorRef, Component, ElementRef, EventEmitter, HostListener, Input, OnDestroy, OnInit, Output, ViewChild, ViewEncapsulation } from '@angular/core';
import { Observable, Subject, of } from 'rxjs';
import { finalize, map, switchMap, takeUntil, tap } from 'rxjs/operators';
import { PlataformaService } from '../../servicios/plataforma.service';
import { PlataformaContextoService } from '../../servicios/plataforma-contexto.service';
import { CuerpoPagoManual, MedioPagoManual, PagoManual } from '../../plataforma.tipos';
import { TEXTOS } from '../../plataforma.textos';
import { limpiarTextoLibre } from '../../logica/cuentas';
import { formatearCop } from '../../logica/formato';
import {
  DetalleErrorPago, ErroresPago, FormularioPago, MEDIOS_CON_REFERENCIA, MEDIOS_PAGO, MOTIVO_PAGO_MAX, REFERENCIA_MAX,
  claveNueva, detalleErrorPago, hoyColombia, montoDeTexto, motivoConfirmacionValido, textoAnular, validarPago,
} from '../../logica/pago-manual';

type Vista = 'lista' | 'registro' | 'anular';

/**
 * D-700 18.8 — «Pagos manuales»: lista los pagos de la empresa y permite registrar uno (con soporte) o anularlo. Formulario propio
 * (no un diálogo de librería), solo para operadores; el servidor vuelve a comprobarlo. Los avisos de monto atípico y de pago
 * repetido los decide el servidor: el formulario los muestra y pide la confirmación con motivo. Emite `cerrado` con `cambio`
 * verdadero si se registró o anuló algo (para que la ficha recargue).
 */
@Component({
  selector: 'app-pago-manual-dialog',
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  // Igual que los otros formularios de la ficha: colgado del <body>, con los tokens del módulo en el propio elemento.
  host: { class: 'pl-raiz' },
  styleUrls: ['./dialogo-cuenta.scss'],
  template: `
    <div class="pl-modal" (mousedown)="alFondo($event)">
      <div class="pl-modal__caja pl-modal__caja--ancha" role="dialog" aria-modal="true" aria-labelledby="pl-pago-titulo" #caja (keydown)="alTeclado($event)">

        <!-- LISTA -->
        <ng-container *ngIf="vista === 'lista'">
          <h2 class="pl-modal__titulo" id="pl-pago-titulo">{{ t.titulo }}</h2>
          <p class="pl-modal__sub">{{ nombre }}</p>
          <p class="pl-modal__nota">{{ t.intro }}</p>
          <p class="cfg-aviso cfg-aviso--warn" *ngIf="!activo" role="status">{{ t.apagado }}</p>
          <p class="cfg-aviso cfg-aviso--ok" *ngIf="mensaje" role="status">{{ mensaje }}</p>
          <p class="cfg-aviso cfg-aviso--error" *ngIf="error" role="alert">{{ error }}</p>
          <p class="pl-modal__nota" *ngIf="cargando" role="status">{{ t.cargando }}</p>
          <p class="pl-modal__nota" *ngIf="!cargando && !items.length && !errorLista">{{ t.sinPagos }}</p>
          <ul class="pl-modal__pagos" *ngIf="items.length">
            <li class="pl-modal__pago" *ngFor="let p of items" [class.pl-modal__pago--anulado]="p.estado === 'anulado'">
              <div class="pl-modal__pago-cifra">
                <b class="pl-num">{{ cop(p.montoCOP) }}</b>
                <em class="pl-modal__etq" [class.pl-modal__etq--ok]="p.estado === 'vigente'">{{ t.estado[p.estado] }}</em>
                <em class="pl-modal__etq pl-modal__etq--aviso" *ngIf="p.atipico">{{ t.etqAtipico }}</em>
                <em class="pl-modal__etq pl-modal__etq--aviso" *ngIf="p.duplicadoConfirmado">{{ t.etqDuplicado }}</em>
              </div>
              <small class="pl-modal__pago-dato">{{ t.medios[p.medio] || p.medio }} · {{ p.fechaEfectiva }} · {{ t.periodoDe }} {{ p.periodo.desde }} a {{ p.periodo.hasta }}<ng-container *ngIf="p.referencia"> · {{ t.refDe }} {{ p.referencia }}</ng-container></small>
              <div class="pl-modal__pago-acciones">
                <button type="button" class="cfg-btn cfg-btn--sec" *ngIf="p.tieneSoporte" [disabled]="abriendo === p.id" (click)="verSoporte(p)">{{ t.verSoporte }}</button>
                <button type="button" class="cfg-btn cfg-btn--sec" *ngIf="p.estado === 'vigente'" (click)="irAnular(p)">{{ t.anular }}</button>
              </div>
              <p class="pl-modal__nota" *ngIf="enlace && enlace.pagoId === p.id">
                <a [href]="enlace.url" target="_blank" rel="noopener noreferrer">{{ t.abrirSoporte }}</a> · {{ t.soporteVence }}
              </p>
            </li>
          </ul>
          <div class="pl-modal__acciones">
            <button type="button" class="cfg-btn cfg-btn--sec" (click)="cerrar()">{{ t.cerrar }}</button>
            <button type="button" class="cfg-btn" [disabled]="!activo" (click)="irRegistro()">{{ t.registrarBoton }}</button>
          </div>
        </ng-container>

        <!-- REGISTRO -->
        <ng-container *ngIf="vista === 'registro'">
          <h2 class="pl-modal__titulo" id="pl-pago-titulo">{{ t.registrarTitulo }}</h2>
          <p class="pl-modal__sub">{{ nombre }}</p>

          <fieldset class="pl-modal__grupo">
            <legend>{{ c.periodo }}</legend>
            <div class="pl-modal__fila">
              <label class="pl-modal__campo"><span class="pl-modal__rotulo">{{ c.desde }}</span>
                <input type="date" [value]="f.desde" [max]="hoy" [disabled]="guardando" (input)="poner('desde', $any($event.target).value)" /></label>
              <label class="pl-modal__campo"><span class="pl-modal__rotulo">{{ c.hasta }}</span>
                <input type="date" [value]="f.hasta" [disabled]="guardando" (input)="poner('hasta', $any($event.target).value)" /></label>
            </div>
            <small class="pl-modal__error" *ngIf="verErrores && errores.periodo" role="alert">{{ errores.periodo }}</small>
          </fieldset>

          <div class="pl-modal__fila">
            <label class="pl-modal__campo"><span class="pl-modal__rotulo">{{ c.fecha }}</span>
              <input type="date" [value]="f.fecha" [max]="hoy" [disabled]="guardando" (input)="poner('fecha', $any($event.target).value)" />
              <small class="pl-modal__error" *ngIf="verErrores && errores.fecha" role="alert">{{ errores.fecha }}</small></label>
            <label class="pl-modal__campo"><span class="pl-modal__rotulo">{{ c.monto }}</span>
              <input type="text" inputmode="numeric" autocomplete="off" [value]="f.monto" [disabled]="guardando" (input)="poner('monto', $any($event.target).value)" />
              <small class="pl-modal__ayuda"><b class="pl-num">{{ montoTexto }}</b></small>
              <small class="pl-modal__error" *ngIf="verErrores && errores.monto" role="alert">{{ errores.monto }}</small></label>
          </div>

          <div class="pl-modal__fila">
            <label class="pl-modal__campo"><span class="pl-modal__rotulo">{{ c.medio }}</span>
              <select [value]="f.medio" [disabled]="guardando" (change)="poner('medio', $any($event.target).value)">
                <option value="">{{ c.elegir }}</option>
                <option *ngFor="let m of medios" [value]="m" [selected]="f.medio === m">{{ t.medios[m] }}</option>
              </select>
              <small class="pl-modal__error" *ngIf="verErrores && errores.medio" role="alert">{{ errores.medio }}</small></label>
            <label class="pl-modal__campo"><span class="pl-modal__rotulo">{{ c.referencia }}</span>
              <input type="text" autocomplete="off" [attr.maxlength]="refMax" [value]="f.referencia" [disabled]="guardando" (input)="poner('referencia', $any($event.target).value)" />
              <small class="pl-modal__ayuda">{{ c.referenciaAyuda }}</small>
              <small class="pl-modal__error" *ngIf="verErrores && errores.referencia" role="alert">{{ errores.referencia }}</small></label>
          </div>

          <label class="pl-modal__campo"><span class="pl-modal__rotulo">{{ c.soporte }}</span>
            <input type="file" accept=".pdf,.png,.jpg,.jpeg,application/pdf,image/png,image/jpeg" [disabled]="guardando" (change)="elegirArchivo($event)" />
            <small class="pl-modal__ayuda">{{ archivo ? archivo.name + ' · ' + kb(archivo.size) : c.soporteAyuda }}</small>
            <small class="pl-modal__error" *ngIf="verErrores && errores.soporte" role="alert">{{ errores.soporte }}</small></label>

          <div class="cfg-aviso cfg-aviso--warn pl-modal__aviso" *ngIf="atipico" role="alert">
            <b>{{ t.atipicoTitulo }}</b>
            <p class="pl-modal__nota">{{ atipico.esperado === null ? t.atipicoSinEsperado : t.atipicoEsperado(cop(atipico.esperado), atipico.desviacion) }}</p>
            <label class="pl-modal__opcion-simple"><input type="checkbox" [checked]="confirmaAtipico" [disabled]="guardando" (change)="confirmaAtipico = $any($event.target).checked; error = null" /> {{ t.atipicoConfirmo }}</label>
          </div>
          <div class="cfg-aviso cfg-aviso--warn pl-modal__aviso" *ngIf="duplicado" role="alert">
            <b>{{ t.duplicadoTitulo }}</b>
            <p class="pl-modal__nota">{{ t.duplicadoTexto(duplicado.detalle) }}</p>
            <label class="pl-modal__opcion-simple"><input type="checkbox" [checked]="confirmaDuplicado" [disabled]="guardando" (change)="confirmaDuplicado = $any($event.target).checked; error = null" /> {{ t.duplicadoConfirmo }}</label>
          </div>
          <label class="pl-modal__campo" *ngIf="atipico || duplicado">
            <span class="pl-modal__rotulo">{{ t.motivoConfirmacion }}</span>
            <textarea [value]="f.motivo" [attr.maxlength]="motivoMax" [disabled]="guardando" (input)="f.motivo = $any($event.target).value; error = null" aria-describedby="pl-pago-motivo-ayuda"></textarea>
            <small id="pl-pago-motivo-ayuda"><em class="pl-modal__ayuda">{{ t.motivoConfirmacionAyuda }}</em><em class="pl-num pl-modal__ayuda">{{ largoMotivo }}/{{ motivoMax }}</em></small>
          </label>

          <p class="cfg-aviso cfg-aviso--error" *ngIf="error" role="alert">{{ error }}</p>
          <div class="pl-modal__acciones">
            <button type="button" class="cfg-btn cfg-btn--sec" [disabled]="guardando" (click)="irLista()">{{ t.volver }}</button>
            <button type="button" class="cfg-btn" [disabled]="guardando || !confirmacionLista" (click)="registrar()">{{ guardando ? (subiendo ? t.subiendo : t.registrando) : t.registrarGuardar }}</button>
          </div>
        </ng-container>

        <!-- ANULAR -->
        <ng-container *ngIf="vista === 'anular' && seleccion as s">
          <h2 class="pl-modal__titulo" id="pl-pago-titulo">{{ t.anularTitulo }}</h2>
          <p class="pl-modal__sub">{{ nombre }}</p>
          <p class="pl-modal__nota"><b class="pl-num">{{ cop(s.montoCOP) }}</b> · {{ t.medios[s.medio] || s.medio }} · {{ s.fechaEfectiva }}</p>
          <p class="pl-modal__nota">{{ t.anularTexto }}</p>
          <label class="pl-modal__campo">
            <span class="pl-modal__rotulo">{{ t.anularMotivo }}</span>
            <textarea [value]="motivoAnular" [attr.maxlength]="motivoMax" [disabled]="guardando" (input)="motivoAnular = $any($event.target).value; error = null" aria-describedby="pl-anular-ayuda"></textarea>
            <small id="pl-anular-ayuda"><em class="pl-modal__ayuda">{{ t.anularMotivoAyuda }}</em><em class="pl-num pl-modal__ayuda">{{ largoAnular }}/{{ motivoMax }}</em></small>
          </label>
          <label class="pl-modal__campo">
            <span class="pl-modal__rotulo">{{ t.anularConfirmar }}</span>
            <code class="pl-modal__codigo">{{ textoConfirmar }}</code>
            <input type="text" autocomplete="off" spellcheck="false" [value]="confirmacion" [disabled]="guardando" (input)="confirmacion = $any($event.target).value; error = null" />
          </label>
          <p class="cfg-aviso cfg-aviso--error" *ngIf="error" role="alert">{{ error }}</p>
          <div class="pl-modal__acciones">
            <button type="button" class="cfg-btn cfg-btn--sec" [disabled]="guardando" (click)="irLista()">{{ t.volver }}</button>
            <button type="button" class="cfg-btn cfg-btn--peligro" [disabled]="guardando || !anulacionLista" (click)="anular()">{{ guardando ? t.anulando : t.anularGuardar }}</button>
          </div>
        </ng-container>
      </div>
    </div>
  `,
})
export class PagoManualDialogComponent implements OnInit, AfterViewInit, OnDestroy {
  @Input() docId = '';
  @Input() nombre = '';
  @Output() cerrado = new EventEmitter<{ cambio: boolean; mensaje: string | null }>();
  @ViewChild('caja') caja?: ElementRef<HTMLElement>;

  readonly t = TEXTOS.pagoManual;
  readonly c = TEXTOS.pagoManual.campos;
  readonly medios: MedioPagoManual[] = MEDIOS_PAGO;
  readonly motivoMax = MOTIVO_PAGO_MAX;
  readonly refMax = REFERENCIA_MAX;
  readonly hoy = hoyColombia();

  vista: Vista = 'lista';
  activo = false;
  cargando = true;
  errorLista = false;
  items: PagoManual[] = [];
  mensaje: string | null = null;
  error: string | null = null;
  guardando = false;
  subiendo = false;
  hizoCambio = false;
  abriendo: string | null = null;
  enlace: { pagoId: string; url: string } | null = null;

  f: FormularioPago = this.formularioVacio();
  archivo: File | null = null;
  verErrores = false;
  atipico: { esperado: number | null; desviacion: string } | null = null;
  duplicado: { detalle: string } | null = null;
  confirmaAtipico = false;
  confirmaDuplicado = false;
  private clave = claveNueva();
  private soporteId: string | null = null;
  private archivoSubido: File | null = null;

  seleccion: PagoManual | null = null;
  motivoAnular = '';
  confirmacion = '';

  private previo: HTMLElement | null = null;
  private fin$ = new Subject<void>();

  constructor(private servicio: PlataformaService, private ctx: PlataformaContextoService, private cd: ChangeDetectorRef, private anfitrion: ElementRef<HTMLElement>) {}

  ngOnInit(): void {
    document.body.appendChild(this.anfitrion.nativeElement);
    this.ctx.pagosManualesActivos().pipe(takeUntil(this.fin$)).subscribe((v) => { this.activo = v; this.cd.markForCheck(); });
    this.cargarLista();
  }

  ngAfterViewInit(): void {
    this.previo = (document.activeElement as HTMLElement) || null;
    this.enfocar();
  }

  ngOnDestroy(): void {
    this.fin$.next();
    this.fin$.complete();
    this.anfitrion.nativeElement.remove();
    if (this.previo && typeof this.previo.focus === 'function') this.previo.focus();
  }

  // ---- derivados ----
  cop = formatearCop;
  kb(bytes: number): string { return bytes >= 1048576 ? `${(bytes / 1048576).toFixed(1).replace('.', ',')} MB` : `${Math.max(1, Math.round(bytes / 1024))} KB`; }
  get montoTexto(): string { const m = montoDeTexto(this.f.monto); return m === null ? ' ' : formatearCop(m); }
  get errores(): ErroresPago { return validarPago(this.f, this.archivo); }
  get largoMotivo(): number { return limpiarTextoLibre(this.f.motivo).length; }
  get largoAnular(): number { return limpiarTextoLibre(this.motivoAnular).length; }
  get textoConfirmar(): string { return this.seleccion ? textoAnular(this.seleccion.id) : ''; }
  get anulacionLista(): boolean {
    return !!this.seleccion && motivoConfirmacionValido(this.motivoAnular) && this.confirmacion.trim() === this.textoConfirmar;
  }
  /** Lo que falta confirmar tras un aviso del servidor: la casilla de cada aviso y el motivo. */
  get confirmacionLista(): boolean {
    if (!this.atipico && !this.duplicado) return true;
    return (!this.atipico || this.confirmaAtipico) && (!this.duplicado || this.confirmaDuplicado) && motivoConfirmacionValido(this.f.motivo);
  }

  private formularioVacio(): FormularioPago {
    const hoy = hoyColombia();
    return { desde: '', hasta: '', fecha: hoy, monto: '', medio: '', referencia: '', motivo: '' };
  }

  // ---- navegación ----
  irLista(): void { this.vista = 'lista'; this.error = null; this.seleccion = null; this.cd.markForCheck(); this.enfocar(); }
  irRegistro(): void {
    this.f = this.formularioVacio();
    this.archivo = null; this.soporteId = null; this.archivoSubido = null; this.clave = claveNueva();
    this.verErrores = false; this.atipico = null; this.duplicado = null; this.confirmaAtipico = false; this.confirmaDuplicado = false;
    this.mensaje = null; this.error = null; this.enlace = null; this.vista = 'registro';
    this.cd.markForCheck(); this.enfocar();
  }
  irAnular(p: PagoManual): void {
    this.seleccion = p; this.motivoAnular = ''; this.confirmacion = ''; this.mensaje = null; this.error = null; this.enlace = null; this.vista = 'anular';
    this.cd.markForCheck(); this.enfocar();
  }

  private enfocar(): void {
    setTimeout(() => {
      const cajaEl = this.caja && this.caja.nativeElement;
      const e = cajaEl && cajaEl.querySelector<HTMLElement>('input:not([disabled]), textarea:not([disabled]), button:not([disabled])');
      if (e) e.focus();
    }, 0);
  }

  // ---- lista ----
  cargarLista(): void {
    this.cargando = true; this.errorLista = false;
    this.servicio.pagosManuales(this.docId).pipe(takeUntil(this.fin$), finalize(() => { this.cargando = false; this.cd.markForCheck(); })).subscribe({
      next: (r) => { this.items = (r && r.datos && r.datos.items) || []; },
      error: (err) => { this.errorLista = true; this.error = detalleErrorPago(err).mensaje; },
    });
  }

  verSoporte(p: PagoManual): void {
    if (!p.soporteId) return;
    this.abriendo = p.id; this.error = null; this.enlace = null;
    this.servicio.abrirSoportePago(this.docId, p.soporteId).pipe(takeUntil(this.fin$), finalize(() => { this.abriendo = null; this.cd.markForCheck(); })).subscribe({
      next: (r) => { if (r && r.datos && typeof r.datos.url === 'string' && r.datos.url.startsWith('https://')) this.enlace = { pagoId: p.id, url: r.datos.url }; },
      error: (err) => { this.error = detalleErrorPago(err).mensaje; },
    });
  }

  // ---- registro ----
  poner(campo: keyof FormularioPago, valor: string): void {
    (this.f as unknown as Record<string, string>)[campo] = valor;
    if (campo === 'medio' && valor && !MEDIOS_CON_REFERENCIA.includes(valor as MedioPagoManual)) { /* referencia opcional */ }
    // Los avisos del servidor dependen de lo escrito: se piden de nuevo con el valor nuevo.
    this.atipico = null; this.duplicado = null; this.confirmaAtipico = false; this.confirmaDuplicado = false; this.error = null;
    this.cd.markForCheck();
  }

  elegirArchivo(ev: Event): void {
    const input = ev.target as HTMLInputElement;
    this.archivo = input.files && input.files.length ? input.files[0] : null;
    this.error = null;
    this.cd.markForCheck();
  }

  private cuerpo(soporteId: string): CuerpoPagoManual {
    const ref = limpiarTextoLibre(this.f.referencia);
    const cuerpo: CuerpoPagoManual = {
      claveIdempotencia: this.clave, periodo: { desde: this.f.desde, hasta: this.f.hasta }, fechaEfectiva: this.f.fecha,
      montoCOP: montoDeTexto(this.f.monto) as number, medio: this.f.medio as MedioPagoManual, soporteId,
    };
    if (ref) cuerpo.referencia = ref;
    if (this.atipico && this.confirmaAtipico) cuerpo.confirmarAtipico = true;
    if (this.duplicado && this.confirmaDuplicado) cuerpo.confirmarDuplicado = true;
    if (cuerpo.confirmarAtipico || cuerpo.confirmarDuplicado) cuerpo.motivoConfirmacion = limpiarTextoLibre(this.f.motivo);
    return cuerpo;
  }

  registrar(): void {
    this.verErrores = true;
    if (Object.keys(this.errores).length || this.guardando || !this.confirmacionLista || !this.archivo) { this.cd.markForCheck(); return; }
    this.guardando = true; this.error = null;
    const archivo = this.archivo;
    const subir$: Observable<string> = this.soporteId && this.archivoSubido === archivo
      ? of(this.soporteId)
      : (this.subiendo = true, this.servicio.subirSoportePago(this.docId, archivo).pipe(
        map((r) => r.datos.soporteId),
        tap((id) => { this.soporteId = id; this.archivoSubido = archivo; }),
      ));
    subir$.pipe(
      tap(() => { this.subiendo = false; this.cd.markForCheck(); }),
      switchMap((id) => this.servicio.registrarPagoManual(this.docId, this.cuerpo(id))),
      takeUntil(this.fin$),
      finalize(() => { this.guardando = false; this.subiendo = false; this.cd.markForCheck(); }),
    ).subscribe({
      next: (r) => {
        this.hizoCambio = this.hizoCambio || !(r.datos && r.datos.repetido);
        this.mensaje = r.datos && r.datos.repetido ? this.t.listoRepetido : this.t.listoRegistrado;
        this.vista = 'lista';
        this.cargarLista();
        this.enfocar();
      },
      error: (err) => this.alErrorRegistro(detalleErrorPago(err)),
    });
  }

  private alErrorRegistro(d: DetalleErrorPago): void {
    if (d.codigo === 'MONTO_ATIPICO') {
      const e = d.datos && typeof d.datos['esperadoCOP'] === 'number' ? (d.datos['esperadoCOP'] as number) : null;
      const pct = d.datos && typeof d.datos['desviacionPct'] === 'number' ? String((d.datos['desviacionPct'] as number)).replace('.', ',') : '';
      this.atipico = { esperado: e, desviacion: pct };
      this.error = null;
    } else if (d.codigo === 'DUPLICADO_PROBABLE') {
      const x = d.datos && (d.datos['existente'] as PagoManual | undefined);
      this.duplicado = { detalle: x ? `${formatearCop(x.montoCOP)}, ${x.fechaEfectiva}` : '—' };
      this.error = null;
    } else {
      if (d.codigo === 'SOPORTE_YA_USADO' || d.codigo === 'SOPORTE_INVALIDO' || d.codigo === 'SOPORTE_TIPO_INVALIDO') { this.soporteId = null; this.archivoSubido = null; }
      this.error = d.mensaje;
    }
    this.cd.markForCheck();
  }

  // ---- anulación ----
  anular(): void {
    const s = this.seleccion;
    if (!s || !this.anulacionLista || this.guardando) return;
    this.guardando = true; this.error = null;
    this.servicio.anularPagoManual(s.id, limpiarTextoLibre(this.motivoAnular), this.confirmacion.trim()).pipe(
      takeUntil(this.fin$),
      finalize(() => { this.guardando = false; this.cd.markForCheck(); }),
    ).subscribe({
      next: (r) => {
        this.hizoCambio = this.hizoCambio || !!(r.datos && r.datos.cambio);
        this.mensaje = r.datos && r.datos.yaAnulado ? this.t.listoYaAnulado : this.t.listoAnulado;
        this.vista = 'lista'; this.seleccion = null;
        this.cargarLista();
        this.enfocar();
      },
      error: (err) => { this.error = detalleErrorPago(err).mensaje; },
    });
  }

  // ---- cierre y teclado ----
  cerrar(): void {
    if (this.guardando) return;
    this.cerrado.emit({ cambio: this.hizoCambio, mensaje: this.hizoCambio ? (this.mensaje || this.t.listoRegistrado) : null });
  }

  alFondo(ev: MouseEvent): void {
    if ((ev.target as HTMLElement).classList.contains('pl-modal')) this.cerrar();
  }

  @HostListener('document:keydown.escape')
  alEscape(): void { this.cerrar(); }

  /** El foco no sale de la ventana mientras está abierta. */
  alTeclado(ev: KeyboardEvent): void {
    if (ev.key !== 'Tab' || !this.caja) return;
    const foco = Array.from(this.caja.nativeElement.querySelectorAll<HTMLElement>('input:not([disabled]), select:not([disabled]), textarea:not([disabled]), button:not([disabled]), a[href]'));
    if (!foco.length) return;
    const primero = foco[0];
    const ultimo = foco[foco.length - 1];
    const activoEl = document.activeElement;
    if (ev.shiftKey && activoEl === primero) { ev.preventDefault(); ultimo.focus(); }
    else if (!ev.shiftKey && activoEl === ultimo) { ev.preventDefault(); primero.focus(); }
  }
}
