import { ChangeDetectionStrategy, ChangeDetectorRef, Component, EventEmitter, OnDestroy, OnInit, Output } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { ToastrService } from 'ngx-toastr';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import Swal from 'sweetalert2';

import { MessagingLine } from '../../../../../../shared/services/messaging/messaging.models';
import {
  CODIGO_PLANTILLA_NO_SOPORTADA,
  CODIGO_USAR_CAMPANAS_KAPSO,
  PlantillaConsola,
  ResumenEnvio,
  Segmento,
} from '../../../../../../shared/services/messaging/whatsapp-consola.models';
import { WhatsappConsolaService } from '../../../../../../shared/services/messaging/whatsapp-consola.service';
import { ConsolaContextoService } from '../../servicios/consola-contexto.service';
import { nombreLegible } from '../plantillas/plantilla-modelo';

/** Ruta del asistente de campañas de Marketing, que sigue siendo el camino de los números compartidos. */
export const RUTA_CAMPANAS_MARKETING = '/marketing/campanas/whatsapp';

/**
 * Asistente de envío masivo (D-707): número → plantilla aprobada → clientes → resumen con costo →
 * confirmar. El servidor decide a quién se envía de verdad (excluye a quien pidió no recibir mensajes,
 * a los repetidos y a los que no tienen teléfono) y cuánto cuesta; aquí se muestra tal cual antes de
 * pedir la confirmación. En un número compartido de Kapso el envío no sale por aquí: se lleva a la
 * persona al asistente de campañas de Marketing.
 */
@Component({
  selector: 'app-asistente-envio',
  templateUrl: './asistente-envio.component.html',
  styleUrls: ['./asistente-envio.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AsistenteEnvioComponent implements OnInit, OnDestroy {
  /** El envío quedó creado: llega el id del lote. */
  @Output() creado = new EventEmitter<string>();
  @Output() cerrar = new EventEmitter<void>();

  readonly rutaCampanas = RUTA_CAMPANAS_MARKETING;

  paso: 1 | 2 | 3 | 4 = 1;
  linea: MessagingLine | null = null;

  // Paso 2
  plantillas: PlantillaConsola[] = [];
  cargandoPlantillas = false;
  errorPlantillas: string | null = null;
  enRevision = 0;
  plantillaElegida: PlantillaConsola | null = null;

  // Paso 3 (se mantiene vivo al volver desde el resumen para no perder la selección)
  visitoAudiencia = false;
  segmento: Segmento | null = null;

  // Paso 4
  resumen: ResumenEnvio | null = null;
  preparando = false;
  errorResumen: string | null = null;
  enviando = false;
  /** El servidor dijo que este número envía por Kapso. */
  usarCampanasKapso = false;

  private lineaDePlantillas = '';
  private readonly destroy$ = new Subject<void>();

  constructor(
    private readonly contexto: ConsolaContextoService,
    private readonly consola: WhatsappConsolaService,
    private readonly toastr: ToastrService,
    private readonly translate: TranslateService,
    private readonly cdr: ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    this.contexto.linea$.pipe(takeUntil(this.destroy$)).subscribe((linea) => {
      const cambio = (linea?.id || null) !== (this.linea?.id || null);
      this.linea = linea;
      if (cambio) {
        // Otro número: la plantilla y el resumen ya no valen.
        this.plantillas = [];
        this.plantillaElegida = null;
        this.lineaDePlantillas = '';
        this.resumen = null;
        this.usarCampanasKapso = false;
        if (this.paso > 1) this.paso = 1;
      }
      this.cdr.markForCheck();
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  // ─── Navegación ───────────────────────────────────────────────────────

  get esMeta(): boolean {
    return this.linea?.provider === 'meta';
  }

  get puedeAvanzar(): boolean {
    switch (this.paso) {
      case 1:
        return !!this.linea && this.esMeta && this.linea.status === 'connected';
      case 2:
        return !!this.plantillaElegida;
      case 3:
        return !!this.segmento && !this.preparando;
      default:
        return false;
    }
  }

  avanzar(): void {
    if (!this.puedeAvanzar) return;
    if (this.paso === 1) {
      this.paso = 2;
      this.cargarPlantillas();
    } else if (this.paso === 2) {
      this.paso = 3;
      this.visitoAudiencia = true;
    } else if (this.paso === 3) {
      this.preparar();
    }
    this.cdr.markForCheck();
  }

  volver(): void {
    if (this.enviando || this.preparando) return;
    if (this.paso > 1) this.paso = (this.paso - 1) as 1 | 2 | 3;
    this.cdr.markForCheck();
  }

  // ─── Paso 2: plantilla aprobada ───────────────────────────────────────

  private cargarPlantillas(): void {
    const linea = this.linea;
    if (!linea || this.lineaDePlantillas === linea.id) return;
    this.cargandoPlantillas = true;
    this.errorPlantillas = null;
    this.consola
      .plantillas(linea.id)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (lista) => {
          this.lineaDePlantillas = linea.id;
          // Solo las aprobadas por Meta se pueden enviar.
          this.plantillas = lista.filter((p) => String(p.status || '').toUpperCase() === 'APPROVED');
          this.enRevision = lista.filter((p) => ['PENDING', 'IN_APPEAL'].includes(String(p.status || '').toUpperCase())).length;
          this.cargandoPlantillas = false;
          this.cdr.markForCheck();
        },
        error: (err) => {
          this.cargandoPlantillas = false;
          this.errorPlantillas = this.mensajeDe(err, this.translate.instant('integrations.messagingLines.plantillasError'));
          this.cdr.markForCheck();
        },
      });
  }

  elegirPlantilla(p: PlantillaConsola): void {
    if (!this.usable(p)) return;
    this.plantillaElegida = p;
    this.resumen = null;
  }

  /** La consola solo llena una variable: el nombre del cliente (`{{1}}`). */
  usable(p: PlantillaConsola): boolean {
    return this.variables(p) <= 1;
  }

  private variables(p: PlantillaConsola): number {
    let mayor = 0;
    const patron = /\{\{\s*(\d+)\s*\}\}/g;
    let m: RegExpExecArray | null;
    while ((m = patron.exec(p.bodyText || ''))) mayor = Math.max(mayor, Number(m[1]));
    return mayor;
  }

  textoPrevio(p: PlantillaConsola): string {
    return (p.bodyText || '').replace(/\{\{\s*1\s*\}\}/g, 'María');
  }

  nombre(p: PlantillaConsola): string {
    return nombreLegible(p.name);
  }

  // ─── Paso 3 → 4: resumen ──────────────────────────────────────────────

  alCambiarSegmento(segmento: Segmento | null): void {
    this.segmento = segmento;
    this.resumen = null;
    this.cdr.markForCheck();
  }

  private preparar(): void {
    const linea = this.linea;
    const plantilla = this.plantillaElegida;
    const segmento = this.segmento;
    if (!linea || !plantilla || !segmento || this.preparando) return;
    this.preparando = true;
    this.errorResumen = null;
    this.cdr.markForCheck();
    this.consola
      .prepararEnvio(linea.id, plantilla.name, plantilla.language || 'es', segmento)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (resumen) => {
          this.resumen = resumen;
          this.preparando = false;
          this.paso = 4;
          this.cdr.markForCheck();
        },
        error: (err) => {
          this.preparando = false;
          this.manejarError(err, 'consolaWhatsapp.envios.errorResumen');
        },
      });
  }

  get totalExcluidos(): number {
    const e = this.resumen?.excluidos;
    return e ? e.sinTelefono + e.noQuieren + e.repetidos : 0;
  }

  // ─── Confirmar ────────────────────────────────────────────────────────

  async confirmar(): Promise<void> {
    const linea = this.linea;
    const plantilla = this.plantillaElegida;
    const segmento = this.segmento;
    const resumen = this.resumen;
    if (!linea || !plantilla || !segmento || !resumen || resumen.aEnviar < 1 || this.enviando) return;
    const r = await Swal.fire({
      title: this.translate.instant('consolaWhatsapp.envios.confirmarTitulo', { cantidad: resumen.aEnviar }),
      text: this.translate.instant('consolaWhatsapp.envios.confirmarTexto', {
        costo: this.formatoCop(resumen.costoEstimadoCOP),
      }),
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: this.translate.instant('consolaWhatsapp.envios.confirmarBoton'),
      cancelButtonText: this.translate.instant('comun.cancelar'),
      reverseButtons: true,
    });
    if (!r.isConfirmed) return;
    this.enviando = true;
    this.errorResumen = null;
    this.cdr.markForCheck();
    this.consola
      .crearEnvio(linea.id, plantilla.name, plantilla.language || 'es', segmento)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (campaignId) => {
          this.enviando = false;
          this.toastr.success(this.translate.instant('consolaWhatsapp.envios.creado'));
          this.creado.emit(campaignId);
          this.cdr.markForCheck();
        },
        error: (err) => {
          this.enviando = false;
          this.manejarError(err, 'consolaWhatsapp.envios.errorEnvio');
        },
      });
  }

  formatoCop(valor: number): string {
    return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 })
      .format(valor)
      .replace(/\s/g, '');
  }

  /** `USE_KAPSO_CAMPAIGNS`: el número es compartido y envía por el asistente de Marketing. */
  private manejarError(err: any, claveGeneral: string): void {
    if (err?.status === 409 && err?.error?.code === CODIGO_USAR_CAMPANAS_KAPSO) {
      this.usarCampanasKapso = true;
      this.paso = 1;
    } else if (err?.status === 400 && err?.error?.code === CODIGO_PLANTILLA_NO_SOPORTADA) {
      // Con más de una variable el servidor no la envía: se vuelve a escoger plantilla.
      this.plantillaElegida = null;
      this.paso = 2;
      this.errorResumen = this.translate.instant('consolaWhatsapp.envios.variablesNoSoportadas');
    } else {
      this.errorResumen = this.mensajeDe(err, this.translate.instant(claveGeneral));
    }
    this.cdr.markForCheck();
  }

  private mensajeDe(err: any, defecto: string): string {
    const m = err?.error?.message;
    return typeof m === 'string' && m.trim() ? m : defecto;
  }

  trackPlantilla(_: number, p: PlantillaConsola): string {
    return p.id || p.name;
  }
}
