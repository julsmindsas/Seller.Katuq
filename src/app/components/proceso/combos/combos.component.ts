import { Component, OnInit } from '@angular/core';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { MaestroService } from 'src/app/shared/services/maestros/maestro.service';
import Swal from 'sweetalert2';
import { TranslateService } from '@ngx-translate/core';
import { CrearComboComponent } from './crear-combo/crear-combo.component';
import { ImportarCombosComponent } from './importar-combos/importar-combos.component';

type FiltroEstado = 'todos' | 'activos' | 'inactivos';

/** Cuántos combos se pintan de entrada; "Ver más" suma otra tanda. */
const TANDA = 20;

/** Tonos del ícono de cada combo: par fuerte/fondo suave del tema (D-131). */
const TONOS = [
  { fondo: '#efe9ff', color: '#5F3FE0' },
  { fondo: '#E7F1FF', color: '#1E6FD9' },
  { fondo: '#E6F7EE', color: '#1E874B' },
  { fondo: '#FFF1DF', color: '#B86E08' },
];
const TONO_INACTIVO = { fondo: '#eef0f3', color: '#5A6B78' };

/** Minúsculas y sin tildes, para buscar "piscina" en "PISCINA" o "motor" en "Motór". */
function normalizar(texto: any): string {
  return String(texto || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '');
}

@Component({
  selector: 'app-combos',
  templateUrl: './combos.component.html',
  styleUrls: ['./combos.component.scss']
})
export class CombosComponent implements OnInit {
  cargando = false;
  /** Todos los combos de la empresa, ordenados por nombre. */
  combos: any[] = [];
  busqueda = '';
  filtro: FiltroEstado = 'todos';
  visibles = TANDA;

  constructor(
    private service: MaestroService,
    private modalService: NgbModal,
    private translate: TranslateService
  ) {}

  ngOnInit(): void {
    this.cargarDatos();
  }

  cargarDatos() {
    this.cargando = true;
    this.service.getCombos().subscribe({
      next: (data: any) => {
        const lista = Array.isArray(data) ? data : [];
        this.combos = lista.sort((a: any, b: any) =>
          String(a?.nombre || '').localeCompare(String(b?.nombre || ''), 'es', { sensitivity: 'base' })
        );
        this.cargando = false;
      },
      error: (error) => {
        console.error('Error cargando combos:', error);
        this.cargando = false;
      }
    });
  }

  // ---- Indicadores ----
  get totalActivos(): number {
    return this.combos.filter((c) => c?.activo !== false).length;
  }

  get totalInactivos(): number {
    return this.combos.length - this.totalActivos;
  }

  get productosEnCombos(): number {
    return this.combos.reduce((n, c) => n + (c?.productos || []).length, 0);
  }

  // ---- Búsqueda, filtro y tandas ----
  /** Combos que pasan el filtro de estado y la búsqueda (por nombre, producto o referencia). */
  get filtrados(): any[] {
    const t = normalizar(this.busqueda).trim();
    return this.combos.filter((c) => {
      if (this.filtro === 'activos' && c?.activo === false) return false;
      if (this.filtro === 'inactivos' && c?.activo !== false) return false;
      if (!t) return true;
      if (normalizar(c?.nombre).includes(t)) return true;
      return (c?.productos || []).some(
        (p: any) => normalizar(p?.nombre).includes(t) || normalizar(p?.referencia).includes(t)
      );
    });
  }

  get pagina(): any[] {
    return this.filtrados.slice(0, this.visibles);
  }

  onBuscar(valor: string): void {
    this.busqueda = valor || '';
    this.visibles = TANDA;
  }

  cambiarFiltro(filtro: FiltroEstado): void {
    this.filtro = filtro;
    this.visibles = TANDA;
  }

  verMas(): void {
    this.visibles += TANDA;
  }

  trackCombo(_i: number, c: any): any {
    return c?.id || c;
  }

  // ---- Presentación de cada combo ----
  tono(c: any, indice: number): { fondo: string; color: string } {
    return c?.activo === false ? TONO_INACTIVO : TONOS[indice % TONOS.length];
  }

  /** Hasta 3 productos como pastillas; el resto se cuenta en "+N". */
  productosVisibles(c: any): any[] {
    return (c?.productos || []).slice(0, 3);
  }

  productosRestantes(c: any): number {
    return Math.max(0, (c?.productos || []).length - 3);
  }

  // ---- Acciones ----
  openCrearModal() {
    const modalRef = this.abrirModal();
    modalRef.componentInstance.mostrarCrear = true;
    modalRef.result.then((result) => {
      if (result === 'success') this.cargarDatos();
    }).catch(() => {});
  }

  /** Ticket 1323 (D-538): carga de combos desde Excel; la plantilla sale con los combos actuales. */
  openImportarModal() {
    const modalRef = this.modalService.open(ImportarCombosComponent, { size: 'lg', centered: true, windowClass: 'kq-combo-modal' });
    modalRef.componentInstance.combos = this.combos;
    modalRef.result.then((result) => {
      if (result === 'success') this.cargarDatos();
    }).catch(() => {});
  }

  openEditarModal(row: any) {
    const modalRef = this.abrirModal();
    modalRef.componentInstance.mostrarCrear = false;
    modalRef.componentInstance.comboData = row;
    modalRef.result.then((result) => {
      if (result === 'success') this.cargarDatos();
    }).catch(() => {});
  }

  private abrirModal() {
    return this.modalService.open(CrearComboComponent, {
      size: 'xl',
      centered: true,
      scrollable: true,
      windowClass: 'kq-combo-modal'
    });
  }

  eliminar(row: any) {
    // El backend no borra: desactiva el documento. Las cotizaciones y pedidos
    // guardan sus productos (con la marca del combo, D-339), así que
    // desactivarlo no cambia nada de lo que ya se vendió.
    Swal.fire({
      title: this.translate.instant('proceso.combos.desactivarTitulo'),
      text: this.translate.instant('proceso.combos.desactivarTexto', { nombre: row.nombre }),
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: this.translate.instant('proceso.descuentosPromociones.siDesactivar'),
      cancelButtonText: this.translate.instant('comun.cancelar'),
      confirmButtonColor: '#5F3FE0'
    }).then((result) => {
      if (result.isConfirmed) {
        this.service.removeCombo(row.id).subscribe({
          next: () => {
            Swal.fire(this.translate.instant('proceso.descuentosPromociones.desactivado'), this.translate.instant('proceso.combos.desactivadoTexto'), 'success');
            this.cargarDatos();
          },
          error: (error) => {
            console.error('Error desactivando combo:', error);
            Swal.fire(this.translate.instant('comun.error'), this.translate.instant('proceso.combos.errorDesactivar'), 'error');
          }
        });
      }
    });
  }

  /**
   * Borrado permanente (físico). Solo disponible cuando el registro ya está
   * inhabilitado (activo === false).
   */
  eliminarPermanente(row: any) {
    Swal.fire({
      title: this.translate.instant('proceso.descuentosPromociones.eliminarPermanenteTitulo'),
      text: this.translate.instant('proceso.combos.eliminarTexto', { nombre: row.nombre }),
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: this.translate.instant('proceso.comun.siEliminar'),
      cancelButtonText: this.translate.instant('comun.cancelar'),
      confirmButtonColor: '#D64545'
    }).then((result) => {
      if (result.isConfirmed) {
        this.service.deletePermanentCombo(row.id).subscribe({
          next: () => {
            Swal.fire(this.translate.instant('proceso.descuentosPromociones.eliminado'), this.translate.instant('proceso.combos.eliminadoTexto'), 'success');
            this.cargarDatos();
          },
          error: (error) => {
            const msg = error?.error?.message || this.translate.instant('proceso.combos.errorEliminar');
            Swal.fire(this.translate.instant('comun.error'), msg, 'error');
          }
        });
      }
    });
  }
}
