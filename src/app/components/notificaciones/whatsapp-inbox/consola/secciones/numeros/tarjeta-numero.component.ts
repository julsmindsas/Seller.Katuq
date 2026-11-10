import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  EventEmitter,
  Input,
  OnChanges,
  OnDestroy,
  Output,
  SimpleChanges,
} from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { ToastrService } from 'ngx-toastr';
import { Subject, Subscription, timer } from 'rxjs';
import { switchMap, takeUntil } from 'rxjs/operators';

import { MessagingLinesService } from '../../../../../../shared/services/messaging/messaging-lines.service';
import { MessagingLine, MiembroEquipo } from '../../../../../../shared/services/messaging/messaging.models';
import { SaludNumero } from '../../../../../../shared/services/messaging/whatsapp-consola.models';
import { WhatsappConsolaService } from '../../../../../../shared/services/messaging/whatsapp-consola.service';
import {
  EtiquetaColor,
  etiquetaCalidad,
  etiquetaEstadoNombre,
  fechaDeSalud,
  limiteDiarioNumero,
} from '../../utils/salud-numero';

export type SeccionDestino = 'plantillas' | 'envios' | 'registro';

/** La salud se vuelve a pedir cada dos minutos mientras la tarjeta está a la vista (Meta avisa por webhook; esto solo la refresca). */
const REFRESCO_SALUD_MS = 120_000;

/**
 * Tarjeta de un número de WhatsApp (D-707): estado, salud que reporta Meta (calidad, límite diario,
 * nombre visible, si está en el celular), aviso en palabras sencillas cuando la calidad es baja y el
 * equipo que lo atiende, editable. Un número compartido de Kapso se muestra sin datos de calidad y
 * sin error.
 */
@Component({
  selector: 'app-tarjeta-numero',
  templateUrl: './tarjeta-numero.component.html',
  styleUrls: ['./tarjeta-numero.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TarjetaNumeroComponent implements OnChanges, OnDestroy {
  @Input() linea!: MessagingLine;
  @Input() equipo: MiembroEquipo[] = [];
  @Input() puedeAdministrar = false;

  /** El equipo se guardó o el número se reintentó: llega la línea nueva. */
  @Output() lineaActualizada = new EventEmitter<MessagingLine>();
  /** Pidió ir a otra sección con este número. */
  @Output() abrir = new EventEmitter<SeccionDestino>();

  salud: SaludNumero | null = null;
  /** Proveedor que dijo el servidor al leer la salud: un número compartido de Kapso responde `salud` con todo en null. */
  proveedorLeido: 'meta' | 'kapso' | null = null;
  cargandoSalud = false;
  errorSalud = false;

  seleccion: string[] = [];
  guardando = false;
  reintentando = false;

  private lineaId = '';
  private lectura?: Subscription;
  private readonly destroy$ = new Subject<void>();

  constructor(
    private readonly consola: WhatsappConsolaService,
    private readonly lineas: MessagingLinesService,
    private readonly toastr: ToastrService,
    private readonly translate: TranslateService,
    private readonly cdr: ChangeDetectorRef,
  ) {}

  ngOnChanges(cambios: SimpleChanges): void {
    if (cambios['linea'] && this.linea) {
      // Si el equipo guardado cambió por fuera (otra pestaña, el asistente), la selección sigue a la línea.
      this.seleccion = (this.linea.sellers || []).map((s) => s.email);
      if (this.linea.id !== this.lineaId) {
        this.lineaId = this.linea.id;
        this.iniciarLectura();
      }
    }
  }

  ngOnDestroy(): void {
    this.lectura?.unsubscribe();
    this.destroy$.next();
    this.destroy$.complete();
  }

  // ─── Salud ────────────────────────────────────────────────────────────

  get esMeta(): boolean {
    return this.linea?.provider === 'meta';
  }

  get conectada(): boolean {
    return this.linea?.status === 'connected';
  }

  /** Número compartido de Kapso: lo dice la línea o el propio servidor al leer la salud. Se muestra «sin datos de Meta». */
  get compartido(): boolean {
    return !this.esMeta || this.proveedorLeido === 'kapso';
  }

  /** Solo un número directo con Meta y conectado tiene salud que leer. */
  private iniciarLectura(): void {
    this.lectura?.unsubscribe();
    this.salud = null;
    this.proveedorLeido = null;
    this.errorSalud = false;
    if (!this.esMeta || !this.conectada) {
      this.cargandoSalud = false;
      return;
    }
    this.cargandoSalud = true;
    this.lectura = timer(0, REFRESCO_SALUD_MS)
      .pipe(
        switchMap(() => this.consola.salud(this.linea.id)),
        takeUntil(this.destroy$),
      )
      .subscribe({
        next: (res) => {
          this.salud = res.salud;
          this.proveedorLeido = res.proveedor;
          this.errorSalud = false;
          this.cargandoSalud = false;
          this.cdr.markForCheck();
        },
        error: () => {
          this.errorSalud = true;
          this.cargandoSalud = false;
          this.cdr.markForCheck();
        },
      });
  }

  /** «Actualizar»: vuelve a leer la salud y reinicia el conteo de dos minutos. */
  actualizarSalud(): void {
    if (this.cargandoSalud) return;
    this.iniciarLectura();
    this.cdr.markForCheck();
  }

  get calidad(): EtiquetaColor {
    return etiquetaCalidad(this.salud?.calidad);
  }

  get calidadBaja(): boolean {
    return this.salud?.calidad === 'RED';
  }

  get estadoNombre(): EtiquetaColor | null {
    return etiquetaEstadoNombre(this.salud?.estadoNombre);
  }

  /** `null` = sin dato; `'ilimitado'` = Meta no pone tope. */
  get limite(): number | 'ilimitado' | null {
    return limiteDiarioNumero(this.salud?.limiteDiario, this.salud?.limiteDiarioNumero);
  }

  get actualizadaEn(): Date | null {
    return fechaDeSalud(this.salud?.actualizadaEn);
  }

  get dondeEsta(): string | null {
    if (this.salud?.enCelular === true) return 'consolaWhatsapp.numeros.enCelular';
    if (this.salud?.enCelular === false) return 'consolaWhatsapp.numeros.soloKatuq';
    return null;
  }

  // ─── Equipo ───────────────────────────────────────────────────────────

  get hayCambios(): boolean {
    const actuales = (this.linea.sellers || []).map((s) => s.email).sort().join('|');
    return actuales !== [...this.seleccion].sort().join('|');
  }

  descartar(): void {
    this.seleccion = (this.linea.sellers || []).map((s) => s.email);
  }

  guardarEquipo(): void {
    if (this.guardando || !this.hayCambios) return;
    this.guardando = true;
    this.cdr.markForCheck();
    this.lineas
      .actualizar(this.linea.id, { sellers: [...this.seleccion] })
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (nueva) => {
          this.guardando = false;
          this.toastr.success(this.translate.instant('consolaWhatsapp.numeros.equipoGuardado'));
          this.lineaActualizada.emit(nueva);
          this.cdr.markForCheck();
        },
        error: (err) => {
          this.guardando = false;
          this.toastr.error(this.mensajeDe(err, this.translate.instant('consolaWhatsapp.numeros.equipoError')));
          this.cdr.markForCheck();
        },
      });
  }

  /** Fecha corta en el idioma de la pantalla. */
  fechaCorta(f: Date | null): string {
    if (!f) return '';
    return f.toLocaleString(this.translate.currentLang || 'es', {
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  nombresEquipo(): string {
    const nombres = (this.linea.sellers || []).map((s) => s.nombre || s.email);
    return nombres.length ? nombres.join(', ') : this.translate.instant('consolaWhatsapp.numeros.sinEquipo');
  }

  // ─── Reintentar (número por terminar) ─────────────────────────────────

  reintentar(): void {
    if (this.reintentando) return;
    this.reintentando = true;
    this.cdr.markForCheck();
    this.lineas
      .reintentar(this.linea.id)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (nueva) => {
          this.reintentando = false;
          if (nueva.setup && nueva.setup !== 'completo') {
            this.toastr.warning(this.translate.instant('integrations.messagingLines.reintentarFallo', { causa: nueva.setupError || '' }));
          } else {
            this.toastr.success(this.translate.instant('integrations.messagingLines.reintentarOk'));
          }
          this.lineaActualizada.emit(nueva);
          this.cdr.markForCheck();
        },
        error: (err) => {
          this.reintentando = false;
          this.toastr.error(this.mensajeDe(err, this.translate.instant('integrations.messagingLines.metaErrorMeta')));
          this.cdr.markForCheck();
        },
      });
  }

  private mensajeDe(err: any, defecto: string): string {
    const m = err?.error?.message;
    return typeof m === 'string' && m.trim() ? m : defecto;
  }
}
