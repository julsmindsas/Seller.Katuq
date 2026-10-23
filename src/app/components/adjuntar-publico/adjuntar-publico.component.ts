import { ChangeDetectionStrategy, ChangeDetectorRef, Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { DomSanitizer, SafeUrl, Title } from '@angular/platform-browser';
import { Subject, Subscription } from 'rxjs';
import { take, takeUntil } from 'rxjs/operators';
import { PublicaModule } from '../../shared/components/publica/publica.module';
import { AdjuntosPublicosService } from '../../shared/services/soporte/adjuntos-publicos.service';
import { SesionAdjuntos } from '../../shared/services/soporte/adjuntos-publicos.models';
import {
  ErrorDePagina, errorDePagina, formatearTamano, itemsDeSesion, mensajeDeArchivo, numeroDeRuta, puedeTerminar,
  validarArchivoLocal,
} from '../../shared/services/soporte/adjuntos-publicos.util';

type Paso = 'cargando' | 'error' | 'subir' | 'terminado';
type EstadoItem = 'esperando' | 'subiendo' | 'subido' | 'error';

/** Un archivo en la lista: ya subido antes, subiendo ahora o rechazado con su motivo. */
interface ItemArchivo {
  id: number;
  nombre: string;
  bytes: number;
  estado: EstadoItem;
  progreso: number;
  /** Número de orden en el servidor; con él se quita. Solo cuando ya está subido. */
  n: number | null;
  error: string | null;
  /** Vista previa de una imagen local (solo mientras está en la página). */
  vista: SafeUrl | null;
  vistaUrl: string | null;
  archivo: File | null;
  tipo: string | null;
  /** Se está quitando del servidor. */
  quitando: boolean;
}

/**
 * Página pública donde se suben los archivos de un ticket abierto desde Claude (D-549, plan B). La abre la
 * persona desde el enlace de la tarjeta (`/adjuntar/<token>`), sin iniciar sesión; el enlace vale 30
 * minutos y se usa una sola vez. Los archivos viajan del navegador al almacenamiento de Katuq: nunca por
 * el chat ni por el entorno de Claude. Al terminar, la persona vuelve a la tarjeta y toca «Ya los subí».
 */
@Component({
  selector: 'app-adjuntar-publico',
  standalone: true,
  imports: [CommonModule, PublicaModule],
  templateUrl: './adjuntar-publico.component.html',
  styleUrls: ['./adjuntar-publico.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdjuntarPublicoComponent implements OnInit, OnDestroy {
  paso: Paso = 'cargando';
  error: ErrorDePagina = errorDePagina(null);
  sesion: SesionAdjuntos | null = null;
  items: ItemArchivo[] = [];
  arrastrando = false;
  terminando = false;
  avisoTerminar: string | null = null;

  readonly formatearTamano = formatearTamano;

  private token = '';
  private siguienteId = 1;
  private subiendoAhora: Subscription | null = null;
  private destroy$ = new Subject<void>();

  constructor(
    private route: ActivatedRoute,
    private servicio: AdjuntosPublicosService,
    private title: Title,
    private cdr: ChangeDetectorRef,
    private sanitizer: DomSanitizer,
  ) {}

  get comercio(): string {
    return this.sesion?.comercio || 'tu comercio';
  }

  get tiposAceptados(): string {
    return (this.sesion?.tipos || []).join(',');
  }

  get topeGeneralMb(): number {
    return Math.round((this.sesion?.topes.general || 0) / (1024 * 1024));
  }

  get topeMediaMb(): number {
    return Math.round((this.sesion?.topes.audioVideo || 0) / (1024 * 1024));
  }

  get cuantosSubidos(): number {
    return this.items.filter((i) => i.estado === 'subido').length;
  }

  get hayEnCurso(): boolean {
    return this.items.some((i) => i.estado === 'subiendo' || i.estado === 'esperando');
  }

  get puedeTerminar(): boolean {
    return puedeTerminar(this.items) && !this.terminando;
  }

  get hayCupo(): boolean {
    return this.items.length < (this.sesion?.maximo || 0);
  }

  ngOnInit(): void {
    this.title.setTitle('Subir archivos · Katuq');
    this.route.paramMap.pipe(take(1), takeUntil(this.destroy$)).subscribe((p) => {
      this.token = p.get('token') || '';
      this.cargar();
    });
  }

  ngOnDestroy(): void {
    this.subiendoAhora?.unsubscribe();
    this.items.forEach((i) => this.soltarVista(i));
    this.destroy$.next();
    this.destroy$.complete();
  }

  private cargar(): void {
    if (!this.token) {
      this.mostrarError('INVALIDO');
      return;
    }
    this.servicio.ver(this.token).pipe(takeUntil(this.destroy$)).subscribe({
      next: (r) => {
        this.sesion = r;
        this.items = itemsDeSesion(r.archivos).map((a) => this.nuevoItem(a.nombre, a.bytes, 'subido', a.n));
        this.paso = 'subir';
        this.cdr.markForCheck();
      },
      error: (e) => this.mostrarError(e?.error?.code),
    });
  }

  private mostrarError(codigo: string | undefined | null): void {
    this.error = errorDePagina(codigo);
    this.paso = 'error';
    this.cdr.markForCheck();
  }

  private nuevoItem(nombre: string, bytes: number, estado: EstadoItem, n: number | null = null, archivo: File | null = null, tipo: string | null = null): ItemArchivo {
    // El archivo es del propio navegador de la persona: su dirección `blob:` es segura para la vista previa.
    const vistaUrl = archivo && tipo && tipo.startsWith('image/') ? URL.createObjectURL(archivo) : null;
    const vista = vistaUrl ? this.sanitizer.bypassSecurityTrustUrl(vistaUrl) : null;
    return { id: this.siguienteId++, nombre, bytes, estado, progreso: estado === 'subido' ? 100 : 0, n, error: null, vista, vistaUrl, archivo, tipo, quitando: false };
  }

  private soltarVista(item: ItemArchivo): void {
    if (item.vistaUrl) {
      URL.revokeObjectURL(item.vistaUrl);
      item.vistaUrl = null;
      item.vista = null;
    }
  }

  // ── Elegir o soltar archivos ────────────────────────────────────────────

  alElegir(evento: Event): void {
    const campo = evento.target as HTMLInputElement;
    this.agregar(Array.from(campo.files || []));
    campo.value = '';
  }

  alArrastrar(evento: DragEvent, dentro: boolean): void {
    evento.preventDefault();
    this.arrastrando = dentro;
    this.cdr.markForCheck();
  }

  alSoltar(evento: DragEvent): void {
    evento.preventDefault();
    this.arrastrando = false;
    this.agregar(Array.from(evento.dataTransfer?.files || []));
  }

  private agregar(archivos: File[]): void {
    if (!this.sesion || this.paso !== 'subir') return;
    for (const archivo of archivos) {
      const regla = validarArchivoLocal(archivo, this.sesion, this.items.filter((i) => i.estado !== 'error').length);
      if (!regla.ok) {
        // Rechazado en la lista, sin subirlo; los demás siguen.
        const rechazado = this.nuevoItem(archivo.name, archivo.size, 'error');
        rechazado.error = regla.motivo;
        this.items = [...this.items, rechazado];
        continue;
      }
      this.items = [...this.items, this.nuevoItem(archivo.name, archivo.size, 'esperando', null, archivo, regla.tipo || null)];
    }
    this.cdr.markForCheck();
    this.seguirConLaCola();
  }

  // ── Subir de a uno ──────────────────────────────────────────────────────
  // De a uno a propósito: el servidor numera cada archivo al darle permiso; con dos permisos pedidos a la
  // vez antes de que suba alguno, los dos recibirían el mismo número y se pisarían.

  private seguirConLaCola(): void {
    if (this.subiendoAhora) return;
    const siguiente = this.items.find((i) => i.estado === 'esperando');
    if (!siguiente || !siguiente.archivo || !siguiente.tipo) return;
    siguiente.estado = 'subiendo';
    siguiente.progreso = 0;
    this.cdr.markForCheck();

    const archivo = siguiente.archivo;
    const tipo = siguiente.tipo;
    const sub = new Subscription();
    this.subiendoAhora = sub;
    const cerrar = () => {
      this.subiendoAhora = null;
      this.cdr.markForCheck();
      this.seguirConLaCola();
    };
    const fallar = (e: any) => {
      siguiente.estado = 'error';
      siguiente.error = mensajeDeArchivo(e?.status, e?.error?.code, e?.error?.error);
      cerrar();
    };

    sub.add(this.servicio.permiso(this.token, { nombreArchivo: archivo.name, contentType: tipo, bytes: archivo.size })
      .pipe(takeUntil(this.destroy$)).subscribe({
        next: (permiso) => {
          sub.add(this.servicio.subir(permiso, archivo).pipe(takeUntil(this.destroy$)).subscribe({
            next: (porcentaje) => {
              siguiente.progreso = porcentaje;
              this.cdr.markForCheck();
            },
            error: fallar,
            complete: () => {
              siguiente.estado = 'subido';
              siguiente.progreso = 100;
              siguiente.n = numeroDeRuta(permiso.ruta);
              siguiente.archivo = null;
              cerrar();
            },
          }));
        },
        error: fallar,
      }));
  }

  // ── Quitar ──────────────────────────────────────────────────────────────

  quitar(item: ItemArchivo): void {
    if (item.estado === 'subiendo') {
      // Cancelar a medias: se corta la subida y se deja de contar.
      this.subiendoAhora?.unsubscribe();
      this.subiendoAhora = null;
      this.sacarDeLaLista(item);
      this.seguirConLaCola();
      return;
    }
    if (item.estado === 'subido' && item.n !== null) {
      if (item.quitando) return;
      item.quitando = true;
      item.error = null;
      this.servicio.quitar(this.token, item.n).pipe(takeUntil(this.destroy$)).subscribe({
        next: () => {
          this.sacarDeLaLista(item);
          this.seguirConLaCola();
        },
        error: (e) => {
          item.quitando = false;
          item.error = mensajeDeArchivo(e?.status, e?.error?.code, e?.error?.error);
          this.cdr.markForCheck();
        },
      });
      this.cdr.markForCheck();
      return;
    }
    this.sacarDeLaLista(item);
    this.seguirConLaCola();
  }

  private sacarDeLaLista(item: ItemArchivo): void {
    this.soltarVista(item);
    this.items = this.items.filter((i) => i.id !== item.id);
    this.cdr.markForCheck();
  }

  // ── Listo ───────────────────────────────────────────────────────────────

  terminar(): void {
    if (!this.puedeTerminar) return;
    this.terminando = true;
    this.avisoTerminar = null;
    this.servicio.terminar(this.token).pipe(takeUntil(this.destroy$)).subscribe({
      next: () => {
        this.terminando = false;
        this.paso = 'terminado';
        this.cdr.markForCheck();
      },
      error: (e) => {
        this.terminando = false;
        const codigo = e?.error?.code;
        if (codigo === 'USADO' || codigo === 'VENCIDO' || codigo === 'INVALIDO' || codigo === 'NO_DISPONIBLE') {
          this.mostrarError(codigo);
          return;
        }
        this.avisoTerminar = mensajeDeArchivo(e?.status, codigo, e?.error?.error);
        this.cdr.markForCheck();
      },
    });
    this.cdr.markForCheck();
  }

  trackPorId(_: number, item: ItemArchivo): number {
    return item.id;
  }
}
