import { Component, OnInit, OnDestroy, ViewChild } from '@angular/core';
import { Table } from 'primeng/table';
import { MessageService } from 'primeng/api';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { Subject } from 'rxjs';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';
import Swal from 'sweetalert2';
import { CorporateClientsService } from '../services/corporate-clients.service';
import { CrearClienteModalComponent } from '../crear-cliente-modal/crear-cliente-modal.component';

/**
 * Listado de Clientes Corporativos (spec 011).
 * Lista propia (colección `corporate_clients`) que alimenta el CRM. No toca la
 * lista de clientes habituales. Reusa `CrearClienteModalComponent` con
 * target='corporate' para crear/editar (incluye etiquetas).
 */
@Component({
  selector: 'app-clientes-corporativos',
  templateUrl: './clientes-corporativos.component.html',
  styleUrls: ['./clientes-corporativos.component.scss'],
  providers: [MessageService],
})
export class ClientesCorporativosComponent implements OnInit, OnDestroy {
  @ViewChild('dt') dt: Table;

  corporativos: any[] = [];
  cargando = true;
  globalFilterValue = '';
  selectedEstadoFilter: 'todos' | 'activo' | 'bloqueado' = 'todos';

  private searchSubject = new Subject<string>();

  constructor(
    private corpService: CorporateClientsService,
    private modalService: NgbModal,
    private messageService: MessageService,
  ) {}

  ngOnInit(): void {
    this.cargarCorporativos();
    this.searchSubject
      .pipe(debounceTime(300), distinctUntilChanged())
      .subscribe((value) => this.dt?.filterGlobal(value, 'contains'));
  }

  ngOnDestroy(): void {
    this.searchSubject.complete();
  }

  cargarCorporativos(): void {
    this.cargando = true;
    this.corpService.obtenerCorporativos().subscribe({
      next: (data: any) => {
        this.corporativos = Array.isArray(data) ? data : [];
        this.cargando = false;
      },
      error: () => {
        this.corporativos = [];
        this.cargando = false;
        this.messageService.add({ severity: 'error', summary: 'Error', detail: 'No se pudieron cargar los clientes corporativos' });
      },
    });
  }

  onGlobalFilter(value: string): void {
    this.globalFilterValue = value;
    this.searchSubject.next(value);
  }

  filtrarPorEstado(estado: 'todos' | 'activo' | 'bloqueado'): void {
    this.selectedEstadoFilter = estado;
    if (estado === 'todos') {
      this.dt?.filter(null, 'estado', 'equals');
    } else {
      this.dt?.filter(estado, 'estado', 'equals');
    }
  }

  openCrearModal(): void {
    const modalRef = this.modalService.open(CrearClienteModalComponent, { size: 'lg', centered: true });
    modalRef.componentInstance.isEdit = false;
    modalRef.componentInstance.target = 'corporate';

    modalRef.result.then((result) => {
      if (result?.action === 'created' && result?.cliente) {
        this.corporativos = [result.cliente, ...this.corporativos];
      } else if (result?.action === 'existing_found') {
        this.messageService.add({ severity: 'info', summary: 'Ya existe', detail: 'Ese cliente corporativo ya estaba registrado' });
      }
    }).catch(() => {});
  }

  editarCorporativo(cliente: any): void {
    const modalRef = this.modalService.open(CrearClienteModalComponent, { size: 'lg', centered: true });
    modalRef.componentInstance.isEdit = true;
    modalRef.componentInstance.clienteData = cliente;
    modalRef.componentInstance.target = 'corporate';

    modalRef.result.then((result) => {
      if (result?.action === 'updated' || result?.action === 'created') {
        this.cargarCorporativos();
      }
    }).catch(() => {});
  }

  eliminarCorporativo(cliente: any): void {
    Swal.fire({
      title: `¿Eliminar a "${cliente.nombres_completos || cliente.documento}"?`,
      text: 'Se quitará de la lista corporativa y del CRM. Esta acción no se puede deshacer.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#dc2626',
      cancelButtonColor: '#6b7280',
      confirmButtonText: 'Sí, eliminar',
      cancelButtonText: 'Cancelar',
    }).then((result) => {
      if (!result.isConfirmed) return;
      this.corpService.eliminar(cliente.cd).subscribe({
        next: () => {
          this.corporativos = this.corporativos.filter((c) => c.cd !== cliente.cd);
          this.messageService.add({ severity: 'success', summary: 'Eliminado', detail: 'Cliente corporativo eliminado' });
        },
        error: () => this.messageService.add({ severity: 'error', summary: 'Error', detail: 'No se pudo eliminar' }),
      });
    });
  }
}
