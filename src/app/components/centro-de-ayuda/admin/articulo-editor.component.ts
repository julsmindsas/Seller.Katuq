import { Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { ToastrService } from 'ngx-toastr';
import Swal from 'sweetalert2';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { CentroAyudaService, ErrorAyuda } from '../centro-ayuda.service';
import {
  AlcanceArticulo, ArticuloAdmin, CambiosArticulo, HallazgoDato, MODULOS_AYUDA, ModuloAyuda, TIPOS_ARTICULO, TipoArticulo,
  VersionArticulo, VisibilidadArticulo,
} from '../centro-ayuda.models';
import { CLASE_ESTADO, NOMBRE_ESTADO, NOMBRE_MODULO, NOMBRE_MOTIVO_VERSION, NOMBRE_TIPO, fechaCorta, mensajeError } from '../centro-ayuda-comun';

const MAX_CONTENIDO = 40000;

/**
 * Editor de un artículo (D-628, fase 1), solo para Julsmind. Texto plano: se le quita todo marcado al
 * guardar. Editar un artículo publicado lo devuelve a borrador (hay que publicarlo de nuevo).
 */
@Component({
  selector: 'app-centro-ayuda-articulo-editor',
  standalone: true,
  imports: [TranslateModule, CommonModule, FormsModule, RouterModule],
  templateUrl: './articulo-editor.component.html',
  styleUrls: ['./articulo-editor.component.scss'],
})
export class ArticuloEditorComponent implements OnInit, OnDestroy {
  readonly TIPOS = TIPOS_ARTICULO;
  readonly MODULOS = MODULOS_AYUDA;
  readonly NOMBRE_TIPO = NOMBRE_TIPO;
  readonly NOMBRE_MODULO = NOMBRE_MODULO;
  readonly NOMBRE_ESTADO = NOMBRE_ESTADO;
  readonly CLASE_ESTADO = CLASE_ESTADO;
  readonly NOMBRE_MOTIVO = NOMBRE_MOTIVO_VERSION;
  readonly MAX_CONTENIDO = MAX_CONTENIDO;

  id: string | null = null;
  articulo: ArticuloAdmin | null = null;
  versiones: VersionArticulo[] = [];

  // Campos del formulario.
  titulo = '';
  resumen = '';
  contenido = '';
  tipo: TipoArticulo = 'guia';
  modulo: ModuloAyuda = 'primeros-pasos';
  alcance: AlcanceArticulo = 'global';
  empresa = '';
  visibilidad: VisibilidadArticulo = 'interna';
  version = '';
  rutas = '';

  cargando = false;
  guardando = false;
  error: string | null = null;
  hallazgos: HallazgoDato[] = [];

  private readonly destroy$ = new Subject<void>();

  constructor(
    private readonly ruta: ActivatedRoute,
    private readonly router: Router,
    private readonly ayuda: CentroAyudaService,
    private readonly toastr: ToastrService,
    private readonly translate: TranslateService,
  ) {}

  ngOnInit(): void {
    const id = this.ruta.snapshot.paramMap.get('id');
    this.id = id && id !== 'nuevo' ? id : null;
    if (this.id) this.cargar(this.id);
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  get esNuevo(): boolean { return !this.id; }
  get excede(): boolean { return this.contenido.length > MAX_CONTENIDO; }
  get puedeGuardar(): boolean {
    return !this.guardando && this.titulo.trim().length >= 4 && this.contenido.trim().length > 0 && !this.excede
      && (this.alcance !== 'company' || this.empresa.trim().length > 0 || !this.esNuevo);
  }

  private cargar(id: string): void {
    this.cargando = true;
    this.ayuda.adminArticulo(id).pipe(takeUntil(this.destroy$)).subscribe({
      next: (r) => { this.llenar(r.data); this.cargando = false; this.cargarVersiones(id); },
      error: (e) => { this.cargando = false; this.error = mensajeError(e, this.translate.instant('centroAyuda.errorCargar')); },
    });
  }

  private cargarVersiones(id: string): void {
    this.ayuda.adminVersiones(id).pipe(takeUntil(this.destroy$)).subscribe({
      next: (r) => { this.versiones = r.data || []; },
      error: () => { this.versiones = []; },
    });
  }

  private llenar(a: ArticuloAdmin): void {
    this.articulo = a;
    this.titulo = a.title;
    this.resumen = a.summary || '';
    this.contenido = a.content || '';
    this.tipo = a.type;
    this.modulo = a.module;
    this.alcance = a.scope;
    this.empresa = a.company || '';
    this.visibilidad = a.visibility;
    this.version = a.appliesToVersion || '';
    this.rutas = (a.routes || []).join(', ');
  }

  private cambios(): CambiosArticulo {
    const datos: CambiosArticulo = {
      title: this.titulo.trim(),
      summary: this.resumen.trim(),
      content: this.contenido,
      type: this.tipo,
      module: this.modulo,
      visibility: this.alcance === 'company' ? 'interna' : this.visibilidad,
      appliesToVersion: this.version.trim(),
      routes: this.rutas.split(',').map((r) => r.trim()).filter(Boolean),
    };
    if (this.esNuevo) {
      datos.scope = this.alcance;
      if (this.alcance === 'company') datos.company = this.empresa.trim();
    }
    return datos;
  }

  async guardar(): Promise<void> {
    if (!this.puedeGuardar) return;
    const t = (k: string) => this.translate.instant(k);
    if (this.articulo?.status === 'publicado') {
      const ok = await Swal.fire({
        title: t('centroAyuda.editor.editarPublicadoTitulo'),
        text: t('centroAyuda.editor.editarPublicadoTexto'),
        icon: 'warning',
        showCancelButton: true,
        confirmButtonText: t('centroAyuda.editor.guardar'),
        cancelButtonText: t('comun.cancelar'),
      });
      if (!ok.isConfirmed) return;
    }
    this.guardando = true;
    this.error = null;
    if (this.esNuevo) {
      this.ayuda.adminCrear(this.cambios()).pipe(takeUntil(this.destroy$)).subscribe({
        next: (r) => {
          this.guardando = false;
          this.toastr.success(t('centroAyuda.editor.creado'));
          // La ruta «nuevo» y la de un id real son la misma: Angular reutiliza el componente y no vuelve a leer
          // la ruta. Se pasa a modo «editar» aquí, para que otro Guardar actualice y no cree un duplicado.
          this.id = r.data.id;
          this.llenar(r.data);
          this.cargarVersiones(r.data.id);
          this.router.navigate(['/centro-de-ayuda/administrar', r.data.id], { replaceUrl: true });
        },
        error: (e) => this.fallo(e),
      });
      return;
    }
    this.ayuda.adminActualizar(this.id as string, this.cambios()).pipe(takeUntil(this.destroy$)).subscribe({
      next: (r) => {
        this.guardando = false;
        this.llenar(r.data);
        this.cargarVersiones(r.data.id);
        this.toastr.success(t(r.vuelveABorrador ? 'centroAyuda.editor.guardadoVuelveBorrador' : 'centroAyuda.editor.guardado'));
      },
      error: (e) => this.fallo(e),
    });
  }

  async publicar(): Promise<void> {
    if (!this.articulo || this.articulo.status !== 'borrador' || this.guardando) return;
    this.guardando = true;
    this.error = null;
    this.hallazgos = [];
    this.ayuda.adminCambiarEstado(this.articulo.id, 'publish').pipe(takeUntil(this.destroy$)).subscribe({
      next: (r) => {
        this.guardando = false;
        this.llenar(r.data);
        this.cargarVersiones(r.data.id);
        this.toastr.success(this.translate.instant('centroAyuda.hecho.publish'));
      },
      error: (e) => this.fallo(e),
    });
  }

  private fallo(e: ErrorAyuda): void {
    this.guardando = false;
    this.hallazgos = e?.error?.hallazgos || [];
    this.error = mensajeError(e, this.translate.instant('centroAyuda.errorGuardar'));
  }

  fecha(iso: string | null): string { return fechaCorta(iso); }
  porId(_: number, v: VersionArticulo): string { return v.id; }
}
