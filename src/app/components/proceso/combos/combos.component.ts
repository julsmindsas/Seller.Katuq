import { Component, OnInit } from '@angular/core';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { MaestroService } from 'src/app/shared/services/maestros/maestro.service';
import Swal from 'sweetalert2';
import { CrearComboComponent } from './crear-combo/crear-combo.component';

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
    private modalService: NgbModal
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
      title: '¿Desactivar el combo?',
      text: `"${row.nombre}" dejará de aparecer al cotizar y al vender. Las cotizaciones y los pedidos que ya lo tienen no cambian.`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Sí, desactivar',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#5F3FE0'
    }).then((result) => {
      if (result.isConfirmed) {
        this.service.removeCombo(row.id).subscribe({
          next: () => {
            Swal.fire('Desactivado', 'El combo quedó inactivo. Lo puedes reactivar desde Editar.', 'success');
            this.cargarDatos();
          },
          error: (error) => {
            console.error('Error desactivando combo:', error);
            Swal.fire('Error', 'No se pudo desactivar el combo', 'error');
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
      title: '¿Eliminar permanentemente?',
      text: `"${row.nombre}" se eliminará de forma definitiva y no se podrá recuperar.`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Sí, eliminar',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#D64545'
    }).then((result) => {
      if (result.isConfirmed) {
        this.service.deletePermanentCombo(row.id).subscribe({
          next: () => {
            Swal.fire('Eliminado', 'El combo se eliminó permanentemente', 'success');
            this.cargarDatos();
          },
          error: (error) => {
            const msg = error?.error?.message || 'No se pudo eliminar el combo';
            Swal.fire('Error', msg, 'error');
          }
        });
      }
    });
  }
}
