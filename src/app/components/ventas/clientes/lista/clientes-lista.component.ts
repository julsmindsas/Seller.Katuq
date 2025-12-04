import { Component, OnInit, ViewChild, OnDestroy, HostListener } from '@angular/core';
import { FormBuilder, FormGroup } from '@angular/forms';
import { Table } from 'primeng/table';
import { DatePipe } from '@angular/common';
import { MaestroService } from '../../../../shared/services/maestros/maestro.service';
import { MessageService } from 'primeng/api';
import * as XLSX from 'xlsx';
import { Router } from '@angular/router';
import { DataStoreService } from '../../../../shared/services/dataStoreService';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { CrearClienteModalComponent } from '../crear-cliente-modal/crear-cliente-modal.component';
import { Subject } from 'rxjs';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';
import { ImportResult } from '../../../../shared/models/column-mapping.model';

@Component({
    selector: 'app-clientes-lista',
    templateUrl: './clientes-lista.component.html',
    styleUrls: ['./clientes-lista.component.scss'],
    providers: [DatePipe, MessageService]
})
export class ClientesListaComponent implements OnInit, OnDestroy {
    @ViewChild('dt') dt: Table;

    clientes: any[] = [];
    clientesOriginales: any[] = []; // Guardamos los datos originales sin filtrar
    cargando: boolean = true;
    formFiltros: FormGroup;
    totalRecords: number = 0;
    rows: number = 10;
    mostrarFiltros: boolean = true;
    viewMode: 'compact' | 'detailed' = 'compact';
    selectedCliente: any | null = null;

    // Propiedades para debounce en búsqueda global
    private searchSubject = new Subject<string>();
    globalFilterValue: string = '';

    // Filtros rápidos por estado
    selectedEstadoFilter: 'todos' | 'activo' | 'inactivo' = 'todos';

    // Opciones para dropdown de estado
    estadoOptions = [
        { label: 'Activo', value: 'activo' },
        { label: 'Inactivo', value: 'inactivo' }
    ];

    // Import modal
    showImportModal: boolean = false;

    constructor(
        private modalService: NgbModal,
        private router: Router,
        private clienteService: MaestroService,
        private storeService: DataStoreService,
        private fb: FormBuilder,
        private datePipe: DatePipe,
        private messageService: MessageService
    ) {
        // Intentar cargar filtros guardados
        const savedFilters = this.loadSavedFilters();

        if (savedFilters) {
            this.formFiltros = this.fb.group(savedFilters);
        } else {
            this.formFiltros = this.fb.group({
                cliente: [''],
                documento: [''],
                email: [''],
                estado: [null]
            });
        }
    }

    ngOnInit(): void {
        this.cargarClientes();

        // Configurar debounce para búsqueda global
        this.searchSubject
            .pipe(debounceTime(300), distinctUntilChanged())
            .subscribe((searchValue) => {
                this.dt.filterGlobal(searchValue, 'contains');
            });
    }

    ngOnDestroy(): void {
        this.searchSubject.complete();
    }

    // Modo de visualización
    setViewMode(mode: 'compact' | 'detailed'): void {
        this.viewMode = mode;
    }

    toggleFiltros(): void {
        this.mostrarFiltros = !this.mostrarFiltros;
    }

    // Filtros rápidos por estado
    applyEstadoFilter(estado: 'todos' | 'activo' | 'inactivo'): void {
        this.selectedEstadoFilter = estado;

        // Actualizar el valor en el formulario
        this.formFiltros.patchValue({ estado: estado === 'todos' ? null : estado });

        // Aplicar filtrado local
        if (estado === 'todos') {
            this.clientes = [...this.clientesOriginales];
        } else {
            this.clientes = this.clientesOriginales.filter(c => c.estado === estado);
        }

        this.totalRecords = this.clientes.length;

        // Guardar preferencia
        this.saveFilters();
    }

    cargarClientes(): void {
        this.cargando = true;
        this.clienteService.obtenerClientes().subscribe({
            next: (clientes: any) => {
                this.clientesOriginales = clientes; // Guardar datos originales
                this.clientes = clientes;
                this.totalRecords = clientes.length;
                this.cargando = false;
            },
            error: (error) => {
                console.error(error);
                this.messageService.add({
                    severity: 'error',
                    summary: 'Error',
                    detail: 'Error al cargar los clientes'
                });
                this.cargando = false;
            }
        });
    }

    buscarClientes(): void {
        if (this.formFiltros.valid) {
            this.saveFilters();
            this.aplicarFiltros();
        }
    }

    // Aplicar filtros locales a los datos
    private aplicarFiltros(): void {
        const filtros = this.formFiltros.value;

        let clientesFiltrados = [...this.clientesOriginales];

        // Filtro por nombre/cliente
        if (filtros.cliente && filtros.cliente.trim()) {
            const nombreLower = filtros.cliente.toLowerCase();
            clientesFiltrados = clientesFiltrados.filter(c =>
                (c.nombres_completos || '').toLowerCase().includes(nombreLower) ||
                (c.apellidos_completos || '').toLowerCase().includes(nombreLower)
            );
        }

        // Filtro por documento
        if (filtros.documento && filtros.documento.trim()) {
            const docLower = filtros.documento.toLowerCase();
            clientesFiltrados = clientesFiltrados.filter(c =>
                (c.documento || '').toLowerCase().includes(docLower) ||
                (c.tipo_documento_comprador || '').toLowerCase().includes(docLower)
            );
        }

        // Filtro por email
        if (filtros.email && filtros.email.trim()) {
            const emailLower = filtros.email.toLowerCase();
            clientesFiltrados = clientesFiltrados.filter(c =>
                (c.correo_electronico_comprador || '').toLowerCase().includes(emailLower)
            );
        }

        // Filtro por estado
        if (filtros.estado) {
            clientesFiltrados = clientesFiltrados.filter(c =>
                c.estado === filtros.estado
            );
        }

        // Aplicar resultados filtrados
        this.clientes = clientesFiltrados;
        this.totalRecords = clientesFiltrados.length;

        // Mostrar mensaje si no hay resultados
        if (this.clientes.length === 0) {
            this.messageService.add({
                severity: 'info',
                summary: 'Sin resultados',
                detail: 'No se encontraron clientes que coincidan con los filtros',
                life: 3000
            });
        } else {
            this.messageService.add({
                severity: 'success',
                summary: 'Búsqueda completada',
                detail: `Se encontraron ${this.clientes.length} cliente(s)`,
                life: 2000
            });
        }
    }

    limpiarFiltros(): void {
        this.formFiltros.reset({
            cliente: '',
            documento: '',
            email: '',
            estado: null
        });

        this.selectedCliente = null;
        this.selectedEstadoFilter = 'todos';
        this.globalFilterValue = '';
        localStorage.removeItem('clientesLista_filtros');

        // Restaurar todos los clientes
        this.clientes = [...this.clientesOriginales];
        this.totalRecords = this.clientesOriginales.length;

        this.messageService.add({
            severity: 'info',
            summary: 'Filtros limpios',
            detail: 'Se muestran todos los clientes nuevamente',
            life: 2000
        });
    }

    openCrearModal(): void {
        const modalRef = this.modalService.open(CrearClienteModalComponent, {
            size: 'lg',
            centered: true
        });
        modalRef.componentInstance.isEdit = false;

        modalRef.result.then((result) => {
            if (result === 'success') {
                this.cargarClientes();
            }
        });
    }

    async editarCliente(cliente: any): Promise<void> {
        this.selectedCliente = null;
        try {
            await this.storeService.set('cliente', cliente);
            await this.storeService.set('isEdit', true);
            this.router.navigate(['/ventas/clientes']);
        } catch (error) {
            console.error('Error al guardar datos en IndexedDB:', error);
            this.messageService.add({
                severity: 'error',
                summary: 'Error',
                detail: 'Error al editar el cliente'
            });
        }
    }

    verDetalles(cliente: any): void {
        this.selectedCliente = null;
        this.messageService.add({
            severity: 'info',
            summary: 'Detalles del Cliente',
            detail: `${cliente.nombres_completos} - ${cliente.documento}`,
            life: 3000
        });
    }

    exportarCliente(cliente: any): void {
        this.selectedCliente = null;

        const datosExcel = [
            {
                'Nombres': cliente.nombres_completos || '',
                'Tipo Documento': cliente.tipo_documento_comprador || '',
                'Documento': cliente.documento || '',
                'Email': cliente.correo_electronico_comprador || '',
                'Celular': cliente.numero_celular_comprador || '',
                'Estado': cliente.estado || '',
                'Empresa': cliente.company || ''
            }
        ];

        const ws: XLSX.WorkSheet = XLSX.utils.json_to_sheet(datosExcel);
        const wb: XLSX.WorkBook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Cliente');

        const fileName = `cliente_${cliente.documento}_${new Date().getTime()}.xlsx`;
        XLSX.writeFile(wb, fileName);

        this.messageService.add({
            severity: 'success',
            summary: 'Exportado',
            detail: 'Cliente exportado correctamente',
            life: 3000
        });
    }

    exportarExcel(): void {
        const headers = [
            'Nombres Completos',
            'Tipo Documento',
            'Documento',
            'Email',
            'Celular',
            'Estado',
            'Empresa',
            'Fecha de Adición'
        ];

        const data = this.clientes.map(cliente => [
            cliente.nombres_completos || '',
            cliente.tipo_documento_comprador || '',
            cliente.documento || '',
            cliente.correo_electronico_comprador || '',
            cliente.numero_celular_comprador || '',
            cliente.estado || '',
            cliente.company || '',
            cliente.date_add ? this.formatearFecha(cliente.date_add) : ''
        ]);

        data.unshift(headers);

        const worksheet = XLSX.utils.aoa_to_sheet(data);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, 'Clientes');

        XLSX.writeFile(workbook, `clientes_${new Date().getTime()}.xlsx`);

        this.messageService.add({
            severity: 'success',
            summary: 'Éxito',
            detail: 'Archivo exportado correctamente',
            life: 3000
        });
    }

    formatearFecha(fecha: any): string {
        if (!fecha) return '';
        const date = new Date(fecha._seconds * 1000 + (fecha._nanoseconds || 0) / 1e6);
        return this.datePipe.transform(date, 'dd/MM/yyyy HH:mm') || '';
    }

    getEstadoClass(estado: string): string {
        if (estado === 'activo') {
            return 'badge-success';
        } else if (estado === 'inactivo') {
            return 'badge-danger';
        } else {
            return 'badge-secondary';
        }
    }

    onPageChange(event: any): void {
        this.rows = event.rows;
    }

    onGlobalFilter(event: Event): void {
        const value = (event.target as HTMLInputElement).value;
        this.globalFilterValue = value;
        this.searchSubject.next(value);
    }

    toggleActionMenu(event: Event, cliente: any): void {
        event.stopPropagation();

        if (this.selectedCliente?.documento === cliente.documento) {
            this.selectedCliente = null;
        } else {
            this.selectedCliente = cliente;

            setTimeout(() => {
                const button = event.target as HTMLElement;
                const btnElement = button.closest('.btn-options') as HTMLElement;
                const menu = btnElement?.parentElement?.querySelector('.list-actions') as HTMLElement;

                if (menu && btnElement) {
                    const rect = btnElement.getBoundingClientRect();
                    menu.style.top = `${rect.bottom + 5}px`;
                    menu.style.left = `${rect.left - 170}px`;
                }
            }, 0);
        }
    }

    @HostListener('document:click', ['$event'])
    clickOutside(event: Event): void {
        const target = event.target as HTMLElement;
        if (!target.closest('.hover-container')) {
            this.selectedCliente = null;
        }
    }

    // Persistencia de filtros
    private loadSavedFilters(): any {
        try {
            const saved = localStorage.getItem('clientesLista_filtros');
            if (saved) {
                return JSON.parse(saved);
            }
        } catch (error) {
            console.error('Error loading saved filters:', error);
        }
        return null;
    }

    private saveFilters(): void {
        try {
            localStorage.setItem(
                'clientesLista_filtros',
                JSON.stringify(this.formFiltros.value)
            );
        } catch (error) {
            console.error('Error saving filters:', error);
        }
    }

    // Import functionality
    openImportModal(): void {
        this.showImportModal = true;
    }

    onImportComplete(result: ImportResult): void {
        this.showImportModal = false;
        if (result.success > 0) {
            this.messageService.add({
                severity: 'success',
                summary: 'Importacion Exitosa',
                detail: `${result.success} clientes importados correctamente`
            });
            // Recargar lista de clientes
            this.cargarClientes();
        }
        if (result.failed > 0) {
            this.messageService.add({
                severity: 'warn',
                summary: 'Importacion con errores',
                detail: `${result.failed} clientes no pudieron ser importados`
            });
        }
    }
}