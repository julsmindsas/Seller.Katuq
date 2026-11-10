import { ChangeDetectionStrategy, ChangeDetectorRef, Component, OnDestroy, OnInit } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { ToastrService } from 'ngx-toastr';
import { Subject, of, timer } from 'rxjs';
import { catchError, distinctUntilChanged, filter, map, switchMap, takeUntil } from 'rxjs/operators';

import { MessagingLine } from '../../../../../../shared/services/messaging/messaging.models';
import { DetalleEnvio, EnvioMasivo, EstadoEnvio } from '../../../../../../shared/services/messaging/whatsapp-consola.models';
import { WhatsappConsolaService } from '../../../../../../shared/services/messaging/whatsapp-consola.service';
import { ConsolaContextoService } from '../../servicios/consola-contexto.service';
import { VarianteColor } from '../../utils/salud-numero';
import { nombreLegible } from '../plantillas/plantilla-modelo';
import { RUTA_CAMPANAS_MARKETING } from './asistente-envio.component';

/** Mientras haya un envío en curso, la lista se vuelve a pedir cada 15 segundos para mostrar las métricas que Meta va informando. */
const REFRESCO_ENVIOS_MS = 15_000;

/**
 * Sección «Envíos» de la consola (D-707): los envíos masivos del número con enviados, entregados,
 * leídos, respondidos y fallidos (con el motivo en palabras sencillas), pausar y reanudar, y el
 * asistente para crear uno nuevo. En un número compartido de Kapso se lleva a la persona al asistente de
 * campañas de Marketing, que sigue siendo el camino de esos números.
 */
@Component({
  selector: 'app-consola-envios',
  templateUrl: './envios.component.html',
  styleUrls: ['./envios.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EnviosComponent implements OnInit, OnDestroy {
  readonly rutaCampanas = RUTA_CAMPANAS_MARKETING;

  linea: MessagingLine | null = null;
  puedeAdministrar = false;

  cargando = false;
  error: string | null = null;
  envios: EnvioMasivo[] = [];

  asistenteAbierto = false;

  /** Envío con el detalle abierto y su carga. */
  abierto: string | null = null;
  detalle: DetalleEnvio | null = null;
  cargandoDetalle = false;
  /** Envío al que se le está pausando o reanudando. */
  ocupado: string | null = null;

  private readonly destroy$ = new Subject<void>();
  private readonly pedir$ = new Subject<boolean>();

  constructor(
    private readonly contexto: ConsolaContextoService,
    private readonly consola: WhatsappConsolaService,
    private readonly toastr: ToastrService,
    private readonly translate: TranslateService,
    private readonly cdr: ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    this.contexto.estado$
      .pipe(
        map((e) => e.puedeAdministrar),
        distinctUntilChanged(),
        takeUntil(this.destroy$),
      )
      .subscribe((puede) => {
        this.puedeAdministrar = puede;
        this.cdr.markForCheck();
      });

    // Cada petición cancela la anterior: una respuesta tardía de otro número no pisa la lista.
    this.pedir$
      .pipe(
        switchMap((conCarga) => {
          const l = this.linea;
          if (!l || l.provider !== 'meta' || l.status !== 'connected') {
            return of({ envios: [] as EnvioMasivo[], error: null as string | null });
          }
          if (conCarga) {
            this.cargando = true;
            this.error = null;
            this.cdr.markForCheck();
          }
          return this.consola.envios(l.id).pipe(
            map((envios) => ({ envios, error: null as string | null })),
            catchError((err) => of({ envios: this.envios, error: this.mensajeDe(err, '') })),
          );
        }),
        takeUntil(this.destroy$),
      )
      .subscribe((res) => {
        this.cargando = false;
        this.envios = res.envios;
        this.error = res.error;
        this.cdr.markForCheck();
      });

    // Refresco periódico solo mientras haya un envío en curso (la primera pasada la hace el cambio de número).
    timer(REFRESCO_ENVIOS_MS, REFRESCO_ENVIOS_MS)
      .pipe(
        filter(() => this.hayEnCurso && !this.ocupado),
        takeUntil(this.destroy$),
      )
      .subscribe(() => {
        this.pedir$.next(false);
        if (this.abierto) this.cargarDetalle(this.abierto, false);
      });

    // Va al final: el `BehaviorSubject` del contexto emite de una vez y la carga ya debe estar escuchando.
    this.contexto.linea$.pipe(takeUntil(this.destroy$)).subscribe((linea) => {
      this.linea = linea;
      this.envios = [];
      this.error = null;
      this.abierto = null;
      this.detalle = null;
      this.asistenteAbierto = false;
      this.cargando = !!linea && linea.provider === 'meta' && linea.status === 'connected';
      this.cdr.markForCheck();
      this.pedir$.next(true);
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  recargar(): void {
    this.pedir$.next(true);
  }

  get esMeta(): boolean {
    return this.linea?.provider === 'meta';
  }

  get conectada(): boolean {
    return this.linea?.status === 'connected';
  }

  get hayEnCurso(): boolean {
    return this.envios.some((e) => e.estado === 'enviando' || e.estado === 'preparado');
  }

  // ─── Nuevo envío ──────────────────────────────────────────────────────

  nuevo(): void {
    if (!this.puedeAdministrar) return;
    this.asistenteAbierto = true;
    this.cdr.markForCheck();
  }

  alCrearse(): void {
    this.asistenteAbierto = false;
    this.pedir$.next(true);
    this.cdr.markForCheck();
  }

  // ─── Métricas ─────────────────────────────────────────────────────────

  nombre(e: EnvioMasivo): string {
    return nombreLegible(e.templateName);
  }

  estado(e: EnvioMasivo): { clave: string; variante: VarianteColor } {
    const mapa: Record<EstadoEnvio, { clave: string; variante: VarianteColor }> = {
      preparado: { clave: 'consolaWhatsapp.envios.estado.preparado', variante: 'neutro' },
      enviando: { clave: 'consolaWhatsapp.envios.estado.enviando', variante: 'info' },
      pausado: { clave: 'consolaWhatsapp.envios.estado.pausado', variante: 'warn' },
      terminado: { clave: 'consolaWhatsapp.envios.estado.terminado', variante: 'ok' },
    };
    return mapa[e.estado] || mapa.preparado;
  }

  /** Cuánto del envío ya salió, de 0 a 100. */
  avance(e: EnvioMasivo): number {
    if (!e.total) return 0;
    return Math.min(100, Math.round((e.metricas.enviados / e.total) * 100));
  }

  /** El motivo de la pausa en palabras sencillas; si el servidor ya manda una frase, se muestra tal cual. */
  motivoPausa(e: EnvioMasivo): string {
    const m = String(e.motivoPausa || '').trim();
    if (!m) return this.translate.instant('consolaWhatsapp.envios.pausa.manual');
    if (/\s/.test(m)) return m;
    if (/calidad|quality|red/i.test(m)) return this.translate.instant('consolaWhatsapp.envios.pausa.calidad');
    if (/limite|límite|limit|tier/i.test(m)) return this.translate.instant('consolaWhatsapp.envios.pausa.limite');
    if (/manual|usuario|user/i.test(m)) return this.translate.instant('consolaWhatsapp.envios.pausa.manual');
    return this.translate.instant('consolaWhatsapp.envios.pausa.otra');
  }

  fecha(valor: string | null): string {
    if (!valor) return '';
    const f = new Date(valor);
    if (Number.isNaN(f.getTime())) return '';
    return f.toLocaleString(this.translate.currentLang || 'es', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
  }

  // ─── Detalle ──────────────────────────────────────────────────────────

  alternarDetalle(e: EnvioMasivo): void {
    if (this.abierto === e.id) {
      this.abierto = null;
      this.detalle = null;
      return;
    }
    this.abierto = e.id;
    this.detalle = null;
    this.cargarDetalle(e.id, true);
  }

  private cargarDetalle(envioId: string, conCarga: boolean): void {
    const linea = this.linea;
    if (!linea) return;
    if (conCarga) this.cargandoDetalle = true;
    this.cdr.markForCheck();
    this.consola
      .detalleEnvio(linea.id, envioId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (d) => {
          if (this.abierto === envioId) this.detalle = d;
          this.cargandoDetalle = false;
          this.cdr.markForCheck();
        },
        error: () => {
          this.cargandoDetalle = false;
          this.cdr.markForCheck();
        },
      });
  }

  // ─── Pausar y reanudar ────────────────────────────────────────────────

  pausar(e: EnvioMasivo): void {
    this.cambiarEstado(e, 'pausar');
  }

  reanudar(e: EnvioMasivo): void {
    this.cambiarEstado(e, 'reanudar');
  }

  private cambiarEstado(e: EnvioMasivo, accion: 'pausar' | 'reanudar'): void {
    const linea = this.linea;
    if (!linea || this.ocupado || !this.puedeAdministrar) return;
    this.ocupado = e.id;
    this.cdr.markForCheck();
    const llamada = accion === 'pausar' ? this.consola.pausarEnvio(linea.id, e.id) : this.consola.reanudarEnvio(linea.id, e.id);
    llamada.pipe(takeUntil(this.destroy$)).subscribe({
      next: (actualizado) => {
        this.ocupado = null;
        // El servidor responde el envío ya cambiado: se ve de una, y la lista se confirma enseguida.
        if (actualizado) this.envios = this.envios.map((x) => (x.id === actualizado.id ? actualizado : x));
        this.toastr.success(this.translate.instant(accion === 'pausar' ? 'consolaWhatsapp.envios.pausado' : 'consolaWhatsapp.envios.reanudado'));
        this.pedir$.next(false);
        this.cdr.markForCheck();
      },
      error: (err) => {
        this.ocupado = null;
        this.toastr.error(this.mensajeDe(err, this.translate.instant('consolaWhatsapp.envios.errorEstado')));
        this.cdr.markForCheck();
      },
    });
  }

  trackEnvio(_: number, e: EnvioMasivo): string {
    return e.id;
  }

  private mensajeDe(err: any, defecto: string): string {
    const m = err?.error?.message;
    return typeof m === 'string' && m.trim() ? m : defecto;
  }
}
