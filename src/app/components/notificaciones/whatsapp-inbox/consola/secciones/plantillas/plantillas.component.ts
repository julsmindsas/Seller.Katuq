import { ChangeDetectionStrategy, ChangeDetectorRef, Component, OnDestroy, OnInit } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { ToastrService } from 'ngx-toastr';
import { Subject, of } from 'rxjs';
import { catchError, distinctUntilChanged, map, switchMap, takeUntil } from 'rxjs/operators';
import Swal from 'sweetalert2';

import { MessagingLine } from '../../../../../../shared/services/messaging/messaging.models';
import { PlantillaConsola } from '../../../../../../shared/services/messaging/whatsapp-consola.models';
import { WhatsappConsolaService } from '../../../../../../shared/services/messaging/whatsapp-consola.service';
import { ConsolaContextoService } from '../../servicios/consola-contexto.service';
import { EtiquetaColor } from '../../utils/salud-numero';
import {
  PlantillaFormulario,
  etiquetaEstadoPlantilla,
  formularioDesdePlantilla,
  nombreLegible,
} from './plantilla-modelo';

type FiltroPlantillas = 'todas' | 'aprobadas' | 'revision' | 'otras';

/**
 * Sección «Plantillas» de la consola (D-707): lista del número con su estado en Meta y el motivo en
 * palabras sencillas si fue rechazada, formulario completo con vista previa, «Duplicar para corregir»
 * y «Borrar» con confirmación de Katuq. En un número compartido de Kapso se ven las plantillas, pero
 * no se ofrece crear con imagen o botones: eso necesita un número conectado con Meta.
 */
@Component({
  selector: 'app-consola-plantillas',
  templateUrl: './plantillas.component.html',
  styleUrls: ['./plantillas.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PlantillasComponent implements OnInit, OnDestroy {
  linea: MessagingLine | null = null;
  puedeAdministrar = false;

  cargando = false;
  /** `null` = sin error; texto vacío = falló sin causa legible. */
  error: string | null = null;
  lista: PlantillaConsola[] = [];
  filtro: FiltroPlantillas = 'todas';

  formularioAbierto = false;
  inicial: PlantillaFormulario | null = null;
  /** Plantilla que se está borrando. */
  borrando: string | null = null;

  readonly filtros: Array<{ valor: FiltroPlantillas; clave: string }> = [
    { valor: 'todas', clave: 'consolaWhatsapp.plantillas.filtro.todas' },
    { valor: 'aprobadas', clave: 'consolaWhatsapp.plantillas.filtro.aprobadas' },
    { valor: 'revision', clave: 'consolaWhatsapp.plantillas.filtro.revision' },
    { valor: 'otras', clave: 'consolaWhatsapp.plantillas.filtro.otras' },
  ];

  private readonly destroy$ = new Subject<void>();
  private readonly recargar$ = new Subject<void>();

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

    // Cada cambio de número o «Recargar» pide la lista; una respuesta tardía de otro número se descarta.
    this.recargar$
      .pipe(
        switchMap(() => {
          const l = this.linea;
          if (!l || l.status !== 'connected') return of({ lista: [] as PlantillaConsola[], error: null as string | null });
          this.cargando = true;
          this.error = null;
          this.cdr.markForCheck();
          return this.consola.plantillas(l.id).pipe(
            map((lista) => ({ lista, error: null as string | null })),
            // Un error no corta el flujo: se muestra y se puede reintentar.
            catchError((err) => of({ lista: [] as PlantillaConsola[], error: this.mensajeDe(err, '') })),
          );
        }),
        takeUntil(this.destroy$),
      )
      .subscribe((res) => {
        this.cargando = false;
        this.lista = res.lista;
        this.error = res.error;
        this.cdr.markForCheck();
      });

    // Va al final: el `BehaviorSubject` del contexto emite de una vez y la carga ya debe estar escuchando.
    this.contexto.linea$.pipe(takeUntil(this.destroy$)).subscribe((linea) => {
      this.linea = linea;
      this.cerrarFormulario();
      this.lista = [];
      this.error = null;
      this.cargando = !!linea && linea.status === 'connected';
      this.cdr.markForCheck();
      this.recargar$.next();
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  recargar(): void {
    this.recargar$.next();
  }

  // ─── Lista ────────────────────────────────────────────────────────────

  get esMeta(): boolean {
    return this.linea?.provider === 'meta';
  }

  get conectada(): boolean {
    return this.linea?.status === 'connected';
  }

  /** Crear, duplicar y borrar: solo en un número directo con Meta y para quien administra. */
  get puedeEditar(): boolean {
    return this.puedeAdministrar && this.esMeta && this.conectada;
  }

  get visibles(): PlantillaConsola[] {
    return this.lista.filter((p) => this.coincide(p, this.filtro));
  }

  cuenta(filtro: FiltroPlantillas): number {
    return this.lista.filter((p) => this.coincide(p, filtro)).length;
  }

  private coincide(p: PlantillaConsola, filtro: FiltroPlantillas): boolean {
    const s = String(p.status || '').toUpperCase();
    switch (filtro) {
      case 'aprobadas':
        return s === 'APPROVED';
      case 'revision':
        return s === 'PENDING' || s === 'IN_APPEAL';
      case 'otras':
        return !['APPROVED', 'PENDING', 'IN_APPEAL'].includes(s);
      default:
        return true;
    }
  }

  estado(p: PlantillaConsola): EtiquetaColor {
    return etiquetaEstadoPlantilla(p.status);
  }

  rechazada(p: PlantillaConsola): boolean {
    return String(p.status || '').toUpperCase() === 'REJECTED';
  }

  nombre(p: PlantillaConsola): string {
    return nombreLegible(p.name);
  }

  // ─── Crear y duplicar ─────────────────────────────────────────────────

  nueva(): void {
    if (!this.puedeEditar) return;
    this.inicial = null;
    this.formularioAbierto = true;
    this.cdr.markForCheck();
  }

  duplicar(p: PlantillaConsola): void {
    if (!this.puedeEditar) return;
    this.inicial = formularioDesdePlantilla(p, this.translate.instant('consolaWhatsapp.plantillas.sufijoCopia'));
    this.formularioAbierto = true;
    this.cdr.markForCheck();
  }

  cerrarFormulario(): void {
    this.formularioAbierto = false;
    this.inicial = null;
    this.cdr.markForCheck();
  }

  alCrearse(): void {
    this.cerrarFormulario();
    this.recargar();
  }

  // ─── Borrar ───────────────────────────────────────────────────────────

  async borrar(p: PlantillaConsola): Promise<void> {
    const linea = this.linea;
    if (!this.puedeEditar || !linea || this.borrando) return;
    const r = await Swal.fire({
      title: this.translate.instant('consolaWhatsapp.plantillas.borrarTitulo'),
      text: this.translate.instant('consolaWhatsapp.plantillas.borrarTexto', { nombre: this.nombre(p) }),
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: this.translate.instant('consolaWhatsapp.plantillas.borrarConfirmar'),
      cancelButtonText: this.translate.instant('comun.cancelar'),
      confirmButtonColor: '#D64545',
      reverseButtons: true,
    });
    if (!r.isConfirmed) return;
    this.borrando = p.name;
    this.cdr.markForCheck();
    this.consola
      .borrarPlantilla(linea.id, p.name)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.borrando = null;
          this.toastr.success(this.translate.instant('consolaWhatsapp.plantillas.borrada'));
          this.lista = this.lista.filter((x) => x.name !== p.name);
          this.cdr.markForCheck();
        },
        error: (err) => {
          this.borrando = null;
          this.toastr.error(this.mensajeDe(err, this.translate.instant('consolaWhatsapp.plantillas.borrarError')));
          this.cdr.markForCheck();
        },
      });
  }

  trackPlantilla(_: number, p: PlantillaConsola): string {
    return p.id || p.name;
  }

  private mensajeDe(err: any, defecto: string): string {
    const m = err?.error?.message;
    return typeof m === 'string' && m.trim() ? m : defecto;
  }
}
