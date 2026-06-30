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
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../../../environments/environment';
import { CrearClienteModalComponent } from '../crear-cliente-modal/crear-cliente-modal.component';
import { Subject } from 'rxjs';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';
import { ImportResult } from '../../../../shared/models/column-mapping.model';
import { ClientConfigService, ClientTag } from '../services/client-config.service';
import Swal from 'sweetalert2';

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
    selectedEstadoFilter: 'todos' | 'activo' | 'bloqueado' = 'todos';

    // Opciones para dropdown de estado
    estadoOptions = [
        { label: 'Activo', value: 'activo' },
        { label: 'Bloqueado', value: 'bloqueado' }
    ];

    // Opciones para dropdown de tipo de cliente
    clientTypes: { label: string; value: string }[] = [];

    // Import modal
    showImportModal: boolean = false;

    // Config modal (etiquetas)
    showConfigModal: boolean = false;
    editableTags: ClientTag[] = [];
    newTagName: string = '';
    newTagColor: string = 'violet';
    availableColors: string[] = [];

    // Filtro por etiquetas
    availableTagsForFilter: ClientTag[] = [];
    selectedTagNames: string[] = [];

    constructor(
        private modalService: NgbModal,
        private router: Router,
        private clienteService: MaestroService,
        private storeService: DataStoreService,
        private fb: FormBuilder,
        private datePipe: DatePipe,
        private messageService: MessageService,
        private http: HttpClient,
        private clientConfig: ClientConfigService
    ) {
        this.formFiltros = this.fb.group({
            cliente: [''],
            documento: [''],
            email: [''],
            estado: [null],
            tipoCliente: [null]
        });

        const savedFilters = this.loadSavedFilters();
        if (savedFilters) {
            this.formFiltros.patchValue(savedFilters);
        }
    }

    ngOnInit(): void {
        this.cargarClientes();
        this.clientConfig.loadClientTags().subscribe(tags => {
            this.availableTagsForFilter = tags;
        });
        this.clienteService.consultarTiposClienteActivos().subscribe({
            next: (tipos: any) => {
                this.clientTypes = Array.isArray(tipos)
                    ? tipos.filter((t: any) => t.active !== false).map((t: any) => ({ label: t.nombre, value: t.nombre }))
                    : [];
            },
            error: () => { this.clientTypes = []; }
        });

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
    applyEstadoFilter(estado: 'todos' | 'activo' | 'bloqueado'): void {
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
                console.log('[clientes/all] total:', clientes?.length);
                console.log('[clientes/all] primer registro:', clientes?.[0]);
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

        // Filtro por tipo de cliente (puede estar en c.categoria.nombre o c.tipoCliente)
        if (filtros.tipoCliente) {
            const filtroNombre = filtros.tipoCliente.toLowerCase();
            clientesFiltrados = clientesFiltrados.filter(c => {
                const tipo = (c.categoria?.nombre || c.tipoCliente || '').toLowerCase();
                return tipo === filtroNombre;
            });
        }

        // Filtro por etiquetas (OR: el cliente debe tener al menos una de las etiquetas seleccionadas)
        if (this.selectedTagNames.length > 0) {
            clientesFiltrados = clientesFiltrados.filter(c => {
                const etiquetas: string[] = c.etiquetas || [];
                return this.selectedTagNames.some(t => etiquetas.includes(t));
            });
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
            estado: null,
            tipoCliente: null
        });

        this.selectedCliente = null;
        this.selectedEstadoFilter = 'todos';
        this.selectedTagNames = [];
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
            if (result?.action === 'created' && result?.cliente) {
                const nuevo = result.cliente;
                this.clientesOriginales = [nuevo, ...this.clientesOriginales];
                this.clientes = [nuevo, ...this.clientes];
                this.totalRecords = this.clientes.length;
            } else if (result?.action === 'existing_found') {
                // Cliente ya existía — no era nuevo, no agregar duplicado
            }
        }).catch(() => {});
    }

    editarCliente(cliente: any): void {
        this.selectedCliente = null;
        const modalRef = this.modalService.open(CrearClienteModalComponent, {
            size: 'lg',
            centered: true
        });
        modalRef.componentInstance.isEdit = true;
        modalRef.componentInstance.clienteData = cliente;

        modalRef.result.then((result) => {
            if (result?.action === 'updated' || result?.action === 'created') {
                this.cargarClientes();
            }
        }).catch(() => {});
    }

    // ── Config modal ─────────────────────────────────────────────────

    abrirConfigModal(): void {
        this.editableTags = this.clientConfig.getClientTags().map(t => ({ ...t }));
        this.availableColors = this.clientConfig.getColors();
        this.newTagName = '';
        this.newTagColor = 'violet';
        this.showConfigModal = true;
    }

    cerrarConfigModal(): void {
        this.showConfigModal = false;
    }

    // Etiquetas
    addTag(): void {
        const name = this.newTagName.trim();
        if (name && !this.editableTags.find(t => t.name === name)) {
            this.editableTags.push({ name, color: this.newTagColor });
        }
        this.newTagName = '';
    }

    removeTag(index: number): void {
        const tag = this.editableTags[index];
        Swal.fire({
            title: `¿Eliminar etiqueta "${tag.name}"?`,
            text: 'Se quitará de todos los clientes que la tengan asignada. Esta acción no se puede deshacer.',
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#dc2626',
            cancelButtonColor: '#6b7280',
            confirmButtonText: 'Sí, eliminar',
            cancelButtonText: 'Cancelar',
            didOpen: () => {
                const container = document.querySelector('.swal2-container') as HTMLElement;
                if (container) container.style.zIndex = '99999';
            }
        }).then(result => {
            if (!result.isConfirmed) return;
            this.editableTags.splice(index, 1);
            this.clientConfig.saveClientTags(this.editableTags).subscribe();
            this.clientConfig.removeTagFromClients(tag.name).subscribe(() => {
                this.availableTagsForFilter = [...this.clientConfig.getClientTags()];
                // Limpiar del filtro activo si estaba seleccionada
                this.selectedTagNames = this.selectedTagNames.filter(n => n !== tag.name);
                // Limpiar de los clientes cargados en memoria
                this.clientes = this.clientes.map(c => ({
                    ...c,
                    etiquetas: Array.isArray(c.etiquetas) ? c.etiquetas.filter((e: string) => e !== tag.name) : []
                }));
                this.clientesOriginales = this.clientesOriginales.map(c => ({
                    ...c,
                    etiquetas: Array.isArray(c.etiquetas) ? c.etiquetas.filter((e: string) => e !== tag.name) : []
                }));
                Swal.fire({
                    title: 'Etiqueta eliminada',
                    text: `La etiqueta "${tag.name}" fue eliminada del catálogo y de los clientes asignados.`,
                    icon: 'success',
                    timer: 2500,
                    timerProgressBar: true,
                    showConfirmButton: false,
                    toast: true,
                    position: 'top-end',
                    didOpen: () => {
                        const container = document.querySelector('.swal2-container') as HTMLElement;
                        if (container) container.style.zIndex = '99999';
                    }
                });
            });
        });
    }

    guardarConfig(): void {
        this.addTag();
        this.clientConfig.saveClientTags(this.editableTags).subscribe(() => {
            this.availableTagsForFilter = [...this.clientConfig.getClientTags()];
            this.showConfigModal = false;
            this.messageService.add({
                severity: 'success',
                summary: 'Configuración guardada',
                detail: 'Etiquetas actualizadas correctamente.',
                life: 3000
            });
        });
    }

    getTagBgColor(color: string): string {
        const map: Record<string, string> = {
            violet: '#ede9fe', green: '#d1fae5', blue: '#dbeafe',
            amber: '#fef3c7', red: '#fee2e2', gray: '#f3f4f6'
        };
        return map[color] || '#f3f4f6';
    }

    getTagFgColor(color: string): string {
        const map: Record<string, string> = {
            violet: '#5b21b6', green: '#065f46', blue: '#1e40af',
            amber: '#92400e', red: '#991b1b', gray: '#374151'
        };
        return map[color] || '#374151';
    }

    getTagColorByName(tagName: string): string {
        return this.availableTagsForFilter.find(t => t.name === tagName)?.color || 'gray';
    }

    toggleTagFilter(tagName: string): void {
        const idx = this.selectedTagNames.indexOf(tagName);
        if (idx >= 0) {
            this.selectedTagNames.splice(idx, 1);
        } else {
            this.selectedTagNames.push(tagName);
        }
        this.aplicarFiltros();
    }

    // ── Panel de detalles ────────────────────────────────────────────
    showDetallePanel: boolean = false;
    clienteDetalle: any = null;

    verDetalles(cliente: any): void {
        this.selectedCliente = null;
        this.clienteDetalle = cliente;
        this.showDetallePanel = true;
    }

    cerrarDetallePanel(): void {
        this.showDetallePanel = false;
        this.clienteDetalle = null;
    }

    getInitialsDetalle(cliente: any): string {
        if (!cliente) return '?';
        const n = (cliente.nombres_completos || '').trim();
        const a = (cliente.apellidos_completos || '').trim();
        return ((n[0] || '') + (a[0] || '')).toUpperCase() || '?';
    }

    editarDesdeDetalle(): void {
        const c = this.clienteDetalle;
        this.cerrarDetallePanel();
        this.editarCliente(c);
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
      try {
        const workbook = XLSX.utils.book_new();

        // ── Hoja 1: Clientes ──────────────────────────────────────────
        const headersClientes = [
            'Nombres Completos', 'Apellidos', 'Tipo Documento', 'Documento',
            'Email', 'Celular', 'WhatsApp', 'Estado', 'Tipo de Cliente',
            'Etiquetas', '¿Cómo nos conoció?', 'Fecha de Cumpleaños',
            'Empresa', 'Fecha de Adición'
        ];
        const dataClientes = this.clientes.map(c => [
            c.nombres_completos || '',
            c.apellidos_completos || '',
            c.tipo_documento_comprador || '',
            c.documento || '',
            c.correo_electronico_comprador || '',
            c.numero_celular_comprador || '',
            c.numero_celular_whatsapp || '',
            c.estado || '',
            c.categoria?.nombre || c.tipoCliente || '',
            Array.isArray(c.etiquetas) ? c.etiquetas.join(', ') : '',
            c.comoNosConocio || '',
            c.fechaCumpleanos || '',
            c.company || '',
            c.date_add ? this.formatearFecha(c.date_add) : ''
        ]);
        dataClientes.unshift(headersClientes);
        XLSX.utils.book_append_sheet(workbook, XLSX.utils.aoa_to_sheet(dataClientes), 'Clientes');

        // ── Hoja 2: Notas ─────────────────────────────────────────────
        const headersNotas = ['Documento', 'Nombre', 'Fecha', 'Nota'];
        const dataNotas: any[][] = [headersNotas];
        this.clientes.forEach(c => {
            const notas: any[] = Array.isArray(c.notas) ? c.notas : [];
            if (notas.length === 0) return;
            notas.forEach(n => dataNotas.push([
                c.documento || '',
                `${c.nombres_completos || ''} ${c.apellidos_completos || ''}`.trim(),
                n.fecha || '',
                n.nota || ''
            ]));
        });
        XLSX.utils.book_append_sheet(workbook, XLSX.utils.aoa_to_sheet(dataNotas), 'Notas');

        // ── Hoja 3: Facturación ───────────────────────────────────────
        const headersFact = ['Documento Cliente', 'Nombre Cliente', 'Referencia', 'Razón Social', 'Tipo Doc.', 'Nro. Documento', 'Correo'];
        const dataFact: any[][] = [headersFact];
        this.clientes.forEach(c => {
            const facts: any[] = Array.isArray(c.datosFacturacionElectronica) ? c.datosFacturacionElectronica : [];
            if (facts.length === 0) return;
            facts.forEach(f => dataFact.push([
                c.documento || '',
                `${c.nombres_completos || ''} ${c.apellidos_completos || ''}`.trim(),
                f.alias || '',
                f.nombres || '',
                f.tipoDocumento || '',
                f.documento || '',
                f.correo || ''
            ]));
        });
        XLSX.utils.book_append_sheet(workbook, XLSX.utils.aoa_to_sheet(dataFact), 'Facturación');

        // ── Hoja 4: Entrega ───────────────────────────────────────────
        const headersEntrega = ['Documento Cliente', 'Nombre Cliente', 'Referencia', 'Destinatario', 'Celular', 'Dirección', 'Ciudad', 'Departamento', 'País'];
        const dataEntrega: any[][] = [headersEntrega];
        this.clientes.forEach(c => {
            const entregas: any[] = Array.isArray(c.datosEntrega) ? c.datosEntrega : [];
            if (entregas.length === 0) return;
            entregas.forEach(e => dataEntrega.push([
                c.documento || '',
                `${c.nombres_completos || ''} ${c.apellidos_completos || ''}`.trim(),
                e.alias || '',
                `${e.nombres || ''} ${e.apellidos || ''}`.trim(),
                e.celular || '',
                e.direccionEntrega || '',
                e.ciudad || '',
                e.departamento || '',
                e.pais || ''
            ]));
        });
        XLSX.utils.book_append_sheet(workbook, XLSX.utils.aoa_to_sheet(dataEntrega), 'Entrega');

        XLSX.writeFile(workbook, `clientes_${new Date().getTime()}.xlsx`);

        this.messageService.add({
            severity: 'success',
            summary: 'Éxito',
            detail: `${this.clientes.length} clientes exportados en 4 hojas`,
            life: 3000
        });
      } catch (err) {
        console.error('[exportarExcel] error:', err);
        this.messageService.add({
            severity: 'error',
            summary: 'Error al exportar',
            detail: 'No se pudo generar el Excel. Revisa la consola para más detalle.',
            life: 5000
        });
      }
    }

    formatearFecha(fecha: any): string {
        if (!fecha) return '';
        let date: Date;
        // Timestamp Firestore: { _seconds, _nanoseconds } o { seconds, nanoseconds }
        if (typeof fecha === 'object' && (fecha._seconds != null || fecha.seconds != null)) {
            const secs = fecha._seconds != null ? fecha._seconds : fecha.seconds;
            const nanos = fecha._nanoseconds != null ? fecha._nanoseconds : (fecha.nanoseconds || 0);
            date = new Date(secs * 1000 + nanos / 1e6);
        } else {
            // String ISO, número (epoch) o Date
            date = new Date(fecha);
        }
        if (isNaN(date.getTime())) return ''; // fecha inválida → no romper la exportación
        return this.datePipe.transform(date, 'dd/MM/yyyy HH:mm') || '';
    }

    getEstadoClass(estado: string): string {
        if (estado === 'activo') {
            return 'badge-success';
        } else if (estado === 'bloqueado') {
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
        // NO cerrar el modal — el usuario puede revisar resultados o eliminar la importación
        if (result.success > 0) {
            this.cargarClientes();
        }
    }

    async deleteAllClients(): Promise<void> {
        if (!confirm('⚠️ ESTO ELIMINARÁ TODOS LOS CLIENTES DE LA EMPRESA. ¿Estás seguro?')) return;
        try {
            // El interceptor agrega Authorization, company y demás headers automáticamente
            const response = await this.http.delete<{ success: boolean; deleted: number }>(
                `${environment.urlApi}/v1/onboarding/delete-all-clients`
            ).toPromise();
            this.messageService.add({
                severity: 'warn',
                summary: 'Clientes eliminados',
                detail: `Se eliminaron ${response?.deleted || 0} clientes`
            });
            this.cargarClientes();
        } catch (error: any) {
            this.messageService.add({
                severity: 'error',
                summary: 'Error',
                detail: error?.error?.error || 'No se pudieron eliminar los clientes'
            });
        }
    }
}