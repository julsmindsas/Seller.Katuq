import { Component, OnInit, ViewChild, OnDestroy, HostListener } from '@angular/core';
import { FormBuilder, FormGroup } from '@angular/forms';
import { Table } from 'primeng/table';
import { DatePipe } from '@angular/common';
import { MaestroService } from '../../../../shared/services/maestros/maestro.service';
import { MessageService } from 'primeng/api';
import * as XLSX from 'xlsx';
import { Router, ActivatedRoute } from '@angular/router';
import { DataStoreService } from '../../../../shared/services/dataStoreService';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../../../environments/environment';
import { CrearClienteModalComponent } from '../crear-cliente-modal/crear-cliente-modal.component';
import { Subject, Subscription } from 'rxjs';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';
import { ImportResult } from '../../../../shared/models/column-mapping.model';
import { ClientConfigService, ClientTag } from '../services/client-config.service';
import { ClientesListaService, ClientesPagina, ClientesPaginaParams } from '../services/clientes-lista.service';
import Swal from 'sweetalert2';
import { SitiosService } from '../../../sitios/sitios.service';
import { clientBillingProfiles, matchesClientSearch } from '../../../../shared/utils/client-search';
import { TranslateService } from '@ngx-translate/core';
import { CompanyFeaturesService } from '../../../../shared/services/company-features.service';
import { esFamiliaAdministrador, normalizarRol } from '../../../../shared/utils/roles';

interface FiltrosAplicados {
    q: string;
    cliente: string;
    documento: string;
    email: string;
    estado: string | null;
    tipoCliente: string | null;
    etiquetas: string[];
}

@Component({
    selector: 'app-clientes-lista',
    templateUrl: './clientes-lista.component.html',
    styleUrls: ['./clientes-lista.component.scss'],
    providers: [DatePipe, MessageService]
})
export class ClientesListaComponent implements OnInit, OnDestroy {
    @ViewChild('dt') dt: Table;

    clientes: any[] = []; // Solo la página que se está viendo: el servidor pagina, ordena y filtra
    billingProfiles = clientBillingProfiles;
    cargando: boolean = true;
    formFiltros: FormGroup;
    totalRecords: number = 0;
    rows: number = 10;
    first: number = 0;
    sortField: string | undefined;
    sortOrder: 'asc' | 'desc' | undefined;
    /** El buscador tiene más coincidencias de las que devolvió (el servidor topa la búsqueda). */
    busquedaParcial: boolean = false;
    /** Exportando a Excel (indicador propio: no comparte `cargando` con la tabla). */
    exportando: boolean = false;
    /**
     * Filtros que ya se aplicaron (los de la última búsqueda, no lo que hay escrito en los campos).
     * Paginar, ordenar o refrescar usan ESTA copia, para que lo escrito sin pulsar Buscar no se aplique en silencio.
     */
    private filtrosAplicados: FiltrosAplicados = {
        q: '', cliente: '', documento: '', email: '', estado: null, tipoCliente: null, etiquetas: []
    };
    private cargaSub?: Subscription;
    private primeraCarga = true;
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
        { label: 'ventas.clientes.activo', value: 'activo' },
        { label: 'ventas.clientes.bloqueado', value: 'bloqueado' }
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
        private route: ActivatedRoute,
        private clienteService: MaestroService,
        private storeService: DataStoreService,
        private fb: FormBuilder,
        private datePipe: DatePipe,
        private messageService: MessageService,
        private http: HttpClient,
        private clientConfig: ClientConfigService,
        private sitiosService: SitiosService,
        private listaService: ClientesListaService,
        private translate: TranslateService,
        private features: CompanyFeaturesService
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
        // Entrada desde el buscador global del header (?buscar=documento|nombre):
        // prefiltra la tabla. Reacciona aunque ya estemos en esta ruta.
        // La primera emisión decide la carga inicial (con o sin término), así no se piden dos páginas.
        this.route.queryParams.subscribe(params => {
            const buscar = (params['invoiceCustomer'] || params['buscar'] || '').toString().trim();
            if (buscar) {
                if (params['invoiceCustomer']) {
                    this.formFiltros.reset(); this.selectedTagNames = []; this.selectedEstadoFilter = 'todos';
                }
                this.globalFilterValue = buscar;
                this.primeraCarga = false;
                this.cargarClientes({ reiniciar: true, aplicar: true });
            } else if (this.primeraCarga) {
                this.primeraCarga = false;
                // Primera carga: valen los filtros guardados que la pantalla muestra.
                this.cargarClientes({ aplicar: true });
            }
        });

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
            .subscribe(() => {
                this.aplicarFiltros(false);
            });
    }

    ngOnDestroy(): void {
        this.cargaSub?.unsubscribe();
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

        this.aplicarFiltros(false);

        // Guardar preferencia
        this.saveFilters();
    }

    /** Fija como aplicados los filtros que hay en pantalla en este momento. */
    private capturarFiltros(): void {
        const f = this.formFiltros.value;
        this.filtrosAplicados = {
            q: this.globalFilterValue,
            cliente: f.cliente,
            documento: f.documento,
            email: f.email,
            estado: f.estado,
            tipoCliente: f.tipoCliente,
            etiquetas: [...this.selectedTagNames]
        };
    }

    /** Parámetros del servidor según los filtros YA aplicados (no lo escrito sin pulsar Buscar). */
    private paramsPagina(): ClientesPaginaParams {
        const f = this.filtrosAplicados;
        return {
            first: this.first,
            rows: this.rows,
            sortField: this.sortField,
            sortOrder: this.sortOrder,
            q: f.q,
            cliente: f.cliente,
            documento: f.documento,
            email: f.email,
            estado: f.estado,
            tipoCliente: f.tipoCliente,
            etiquetas: f.etiquetas,
            ocultarFusionados: this.features.isEnabled('calidadDatosClientes')
        };
    }

    /**
     * Pide al servidor la página actual. Una petición nueva cancela la anterior
     * (si el usuario sigue escribiendo, solo vale la última respuesta).
     */
    cargarClientes(opciones: { reiniciar?: boolean; notificar?: boolean; aplicar?: boolean; ordenPorDefecto?: boolean; reintento?: boolean } = {}): void {
        if (opciones.aplicar) { this.capturarFiltros(); }
        if (opciones.reiniciar) {
            this.first = 0;
            if (this.dt) { this.dt.first = 0; }
        }
        if (opciones.ordenPorDefecto) {
            // Vuelve al orden de la lista (más recientes primero) y apaga la flecha de la columna ordenada.
            this.sortField = undefined;
            this.sortOrder = undefined;
            if (this.dt) {
                (this.dt as any).sortField = null;
                (this.dt as any).sortOrder = 1;
                this.dt.tableService.onSort(null);
            }
        }
        this.cargando = true;
        this.cargaSub?.unsubscribe();
        this.cargaSub = this.listaService.listarPagina(this.paramsPagina()).subscribe({
            next: (pagina: ClientesPagina) => {
                this.clientes = pagina?.data || [];
                this.totalRecords = pagina?.total || 0;
                this.busquedaParcial = !!pagina?.parcial;
                // Página que quedó vacía (se borraron o bloquearon fichas, o se importó): volver a la última válida.
                if (this.clientes.length === 0 && this.first > 0 && !opciones.reintento) {
                    this.first = this.totalRecords > 0 ? Math.floor((this.totalRecords - 1) / this.rows) * this.rows : 0;
                    if (this.dt) { this.dt.first = this.first; }
                    if (this.totalRecords > 0) {
                        this.cargarClientes({ ...opciones, reintento: true, reiniciar: false, aplicar: false, ordenPorDefecto: false });
                        return;
                    }
                }
                this.cargando = false;
                if (opciones.notificar) { this.avisarResultado(); }
            },
            error: (error) => {
                console.error(error);
                this.messageService.add({
                    severity: 'error',
                    summary: this.translate.instant('comun.error'),
                    detail: this.translate.instant('ventas.clientesLista.errorCargar')
                });
                this.cargando = false;
            }
        });
    }

    /** La tabla (modo lazy) pide página u orden nuevo. */
    onLazyLoad(event: any): void {
        this.first = event.first || 0;
        this.rows = event.rows || this.rows;
        if (event.sortField) {
            this.sortField = event.sortField;
            this.sortOrder = event.sortOrder === -1 ? 'desc' : 'asc';
        }
        this.cargarClientes();
    }

    buscarClientes(): void {
        if (this.formFiltros.valid) {
            this.saveFilters();
            this.aplicarFiltros();
        }
    }

    // Aplicar filtros: vuelve a la primera página y pregunta al servidor
    private aplicarFiltros(notify = true): void {
        this.cargarClientes({ reiniciar: true, notificar: notify, aplicar: true });
    }

    private avisarResultado(): void {
        if (this.clientes.length === 0) {
            this.messageService.add({
                severity: 'info',
                summary: this.translate.instant('comun.sinResultados'),
                detail: this.translate.instant('ventas.clientesLista.sinCoincidencias'),
                life: 3000
            });
        } else {
            this.messageService.add({
                severity: 'success',
                summary: this.translate.instant('ventas.clientesLista.busquedaCompletada'),
                detail: this.translate.instant('ventas.clientesLista.seEncontraron', { n: this.totalRecords }),
                life: 2000
            });
        }
    }

    /**
     * Filtro local, solo para la exportación a Excel: el servidor pagina, así que al exportar se baja
     * la lista completa una vez y se aplican los mismos filtros de pantalla.
     */
    private filtrarParaExportar(lista: any[]): any[] {
        const filtros = this.filtrosAplicados;
        let out = [...lista];
        if (filtros.cliente && filtros.cliente.trim()) out = out.filter(c => matchesClientSearch(c, filtros.cliente, 'name'));
        if (filtros.documento && filtros.documento.trim()) out = out.filter(c => matchesClientSearch(c, filtros.documento, 'document'));
        if (filtros.email && filtros.email.trim()) out = out.filter(c => matchesClientSearch(c, filtros.email, 'email'));
        if (filtros.estado) out = out.filter(c => c.estado === filtros.estado);
        if (filtros.tipoCliente) {
            const nombre = filtros.tipoCliente.toLowerCase();
            out = out.filter(c => (c.categoria?.nombre || c.tipoCliente || '').toLowerCase() === nombre);
        }
        if (filtros.etiquetas.length > 0) {
            out = out.filter(c => filtros.etiquetas.some(t => (c.etiquetas || []).includes(t)));
        }
        if (filtros.q.trim()) out = out.filter(c => matchesClientSearch(c, filtros.q));
        return out;
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

        // Restaurar todos los clientes (primera página, sin filtros)
        this.cargarClientes({ reiniciar: true, aplicar: true });

        this.messageService.add({
            severity: 'info',
            summary: this.translate.instant('ventas.clientesLista.filtrosLimpios'),
            detail: this.translate.instant('ventas.clientesLista.filtrosLimpiosTexto'),
            life: 2000
        });
    }

    // ── Posibles duplicados (ticket 1462, D-667) ─────────────────────────────────
    /** La vista de duplicados está abierta debajo de la cabecera. */
    mostrarDuplicados = false;

    /**
     * El botón «Posibles duplicados» solo existe con la bandera `calidadDatosClientes` y para los roles que el
     * servidor deja entrar (Administrador y Tesorería; el servidor lo vuelve a exigir). Sin la bandera la lista es la de siempre.
     */
    get puedeVerDuplicados(): boolean {
        if (!this.features.isEnabled('calidadDatosClientes')) { return false; }
        try {
            const rol = JSON.parse(localStorage.getItem('user') || '{}').rol;
            // Igual que el servidor (requireRole): Tesorero y toda la familia Administrador.
            return ['tesorero', 'tesoreria'].includes(normalizarRol(rol)) || esFamiliaAdministrador(rol);
        } catch {
            return false;
        }
    }

    toggleDuplicados(): void {
        this.mostrarDuplicados = !this.mostrarDuplicados;
    }

    openCrearModal(): void {
        const modalRef = this.modalService.open(CrearClienteModalComponent, {
            size: 'lg',
            centered: true
        });
        modalRef.componentInstance.isEdit = false;

        modalRef.result.then((result) => {
            if (result?.action === 'created' && result?.cliente) {
                // El servidor cuenta y ordena: primera página y orden por defecto (más recientes primero), así el nuevo queda de primero.
                // Los filtros aplicados se conservan; lo escrito sin pulsar Buscar no se aplica.
                this.cargarClientes({ reiniciar: true, ordenPorDefecto: true });
            } else if (result?.action === 'existing_found') {
                // Cliente ya existía — no era nuevo, no agregar duplicado
            }
        }).catch(() => {});
    }

    editarCliente(cliente: any): void {
        this.selectedCliente = null;
        // La fila de la tabla trae solo sus columnas: la ventana de edición recibe la ficha completa.
        this.obtenerFicha(cliente, (ficha) => {
            const modalRef = this.modalService.open(CrearClienteModalComponent, {
                size: 'lg',
                centered: true
            });
            modalRef.componentInstance.isEdit = true;
            modalRef.componentInstance.clienteData = ficha;

            modalRef.result.then((result) => {
                if (result?.action === 'updated' || result?.action === 'created') {
                    this.cargarClientes();
                }
            }).catch(() => {});
        });
    }

    /** Trae la ficha completa del cliente (cd) y se la entrega a quien la necesita. */
    private obtenerFicha(fila: any, alTener: (ficha: any) => void): void {
        if (!fila?.cd) { alTener(fila); return; }
        this.listaService.obtenerFicha(fila.cd).subscribe({
            next: (ficha) => alTener(ficha || fila),
            error: () => {
                this.messageService.add({
                    severity: 'error',
                    summary: this.translate.instant('comun.error'),
                    detail: this.translate.instant('ventas.clientesLista.errorCargar')
                });
            }
        });
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
            title: this.translate.instant('ventas.clientes.eliminarEtiquetaTitulo', { nombre: tag.name }),
            text: this.translate.instant('ventas.clientes.eliminarEtiquetaTexto'),
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#D64545',
            cancelButtonColor: '#8f8bab',
            confirmButtonText: this.translate.instant('ventas.clientes.siEliminar'),
            cancelButtonText: this.translate.instant('comun.cancelar'),
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
                // También de los filtros ya aplicados: si no, la siguiente página pediría una etiqueta borrada.
                this.filtrosAplicados = {
                    ...this.filtrosAplicados,
                    etiquetas: this.filtrosAplicados.etiquetas.filter(n => n !== tag.name)
                };
                // Limpiar de los clientes cargados en memoria
                this.clientes = this.clientes.map(c => ({
                    ...c,
                    etiquetas: Array.isArray(c.etiquetas) ? c.etiquetas.filter((e: string) => e !== tag.name) : []
                }));
                Swal.fire({
                    title: this.translate.instant('ventas.clientes.etiquetaEliminada'),
                    text: this.translate.instant('ventas.clientes.etiquetaEliminadaTexto', { nombre: tag.name }),
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
                summary: this.translate.instant('ventas.clientesLista.configuracionGuardada'),
                detail: this.translate.instant('ventas.clientesLista.etiquetasActualizadas'),
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
        // Se abre ya con lo de la fila y se completa con la ficha entera apenas llega.
        this.clienteDetalle = cliente;
        this.showDetallePanel = true;
        this.obtenerFicha(cliente, (ficha) => {
            if (this.showDetallePanel && this.clienteDetalle?.cd === cliente?.cd) { this.clienteDetalle = ficha; }
        });
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
            summary: this.translate.instant('ventas.clientesLista.exportado'),
            detail: this.translate.instant('ventas.clientesLista.clienteExportado'),
            life: 3000
        });
    }

    exportarExcel(): void {
        if (this.exportando) { return; }
        // La tabla solo tiene una página: se baja la lista completa (una vez, al exportar) y se filtra igual que la pantalla.
        this.exportando = true;
        this.clienteService.obtenerClientes().subscribe({
            next: (todos: any) => {
                this.exportando = false;
                this.exportarLista(this.filtrarParaExportar(this.ordenarPorReciente(todos || [])));
            },
            error: () => {
                this.exportando = false;
                this.messageService.add({
                    severity: 'error',
                    summary: this.translate.instant('ventas.clientesLista.errorExportar'),
                    detail: this.translate.instant('ventas.clientesLista.errorExportarIntentar'),
                    life: 5000
                });
            }
        });
    }

    private exportarLista(lista: any[]): void {
      try {
        const workbook = XLSX.utils.book_new();

        // ── Hoja 1: Clientes ──────────────────────────────────────────
        const headersClientes = [
            'Nombres Completos', 'Apellidos', 'Tipo Documento', 'Documento',
            'Email', 'Celular', 'WhatsApp', 'Estado', 'Tipo de Cliente',
            'Etiquetas', '¿Cómo nos conoció?', 'Fecha de Cumpleaños',
            'Empresa', 'Fecha de Adición'
        ];
        const dataClientes = lista.map(c => [
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
        lista.forEach(c => {
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
        lista.forEach(c => {
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
        lista.forEach(c => {
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
            summary: this.translate.instant('comun.exito'),
            detail: this.translate.instant('ventas.clientesLista.clientesExportados', { n: lista.length }),
            life: 3000
        });
      } catch (err) {
        console.error('[exportarExcel] error:', err);
        this.messageService.add({
            severity: 'error',
            summary: this.translate.instant('ventas.clientesLista.errorExportar'),
            detail: this.translate.instant('ventas.clientesLista.errorExportarTexto'),
            life: 5000
        });
      }
    }

    // Convierte date_add (timestamp Firestore, ISO, epoch o Date) a milisegundos para ordenar.
    private fechaMs(fecha: any): number {
        if (!fecha) return 0;
        if (typeof fecha === 'object' && (fecha._seconds != null || fecha.seconds != null)) {
            const secs = fecha._seconds != null ? fecha._seconds : fecha.seconds;
            const nanos = fecha._nanoseconds != null ? fecha._nanoseconds : (fecha.nanoseconds || 0);
            return secs * 1000 + nanos / 1e6;
        }
        const t = new Date(fecha).getTime();
        return isNaN(t) ? 0 : t;
    }

    // Ordena por fecha de creación descendente (más recientes primero).
    private ordenarPorReciente(lista: any[]): any[] {
        return [...lista].sort((a, b) => this.fechaMs(b?.date_add) - this.fechaMs(a?.date_add));
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
        if (!confirm(this.translate.instant('ventas.clientesLista.confirmarEliminarTodos'))) return;
        try {
            // El interceptor agrega Authorization, company y demás headers automáticamente
            const response = await this.http.delete<{ success: boolean; deleted: number }>(
                `${environment.urlApi}/v1/onboarding/delete-all-clients`
            ).toPromise();
            this.messageService.add({
                severity: 'warn',
                summary: this.translate.instant('ventas.clientesLista.clientesEliminados'),
                detail: this.translate.instant('ventas.clientesLista.clientesEliminadosTexto', { n: response?.deleted || 0 })
            });
            this.cargarClientes();
        } catch (error: any) {
            this.messageService.add({
                severity: 'error',
                summary: this.translate.instant('comun.error'),
                detail: error?.error?.error || this.translate.instant('ventas.clientesLista.errorEliminar')
            });
        }
    }

    /**
     * Link de acceso personal del cliente a la tienda publicada: al abrirlo,
     * la tienda lo saluda y le muestra los precios de SU lista. Generarlo de
     * nuevo ROTA el acceso — el link anterior deja de servir (así se revoca).
     */
    generarAccesoTienda(cliente: any): void {
        const cd = cliente?.cd;
        if (!cd) {
            Swal.fire(this.translate.instant('ventas.clientesLista.sinIdentificador'), this.translate.instant('ventas.clientesLista.sinIdentificadorTexto'), 'warning');
            return;
        }
        this.sitiosService.generarAccesoCliente(cd).subscribe({
            next: (res) => {
                const data = res && res.data;
                if (!data) {
                    Swal.fire(this.translate.instant('comun.error'), this.translate.instant('ventas.clientesLista.errorAcceso'), 'error');
                    return;
                }
                if (!data.links.length) {
                    Swal.fire(
                        this.translate.instant('ventas.clientesLista.accesoSinTienda'),
                        data.aviso || this.translate.instant('ventas.clientesLista.accesoSinTiendaTexto'),
                        'info'
                    );
                    return;
                }
                const link = data.links[0].url;
                navigator.clipboard?.writeText(link).catch(() => undefined);
                Swal.fire({
                    title: this.translate.instant('ventas.clientesLista.linkCopiado'),
                    html:
                        `<p style="margin-bottom:.5rem">${this.translate.instant('ventas.clientesLista.linkCopiadoTexto', { nombre: cliente.nombres_completos || this.translate.instant('ventas.clientesLista.tuCliente'), categoria: data.categoria ? ` (${data.categoria})` : '' })}</p>` +
                        `<code style="font-size:.75rem;word-break:break-all">${link}</code>` +
                        `<p style="margin-top:.75rem;font-size:.8rem;opacity:.75">${this.translate.instant('ventas.clientesLista.linkRevoca')}</p>`,
                    icon: 'success',
                    confirmButtonText: this.translate.instant('ventas.clientesLista.listo'),
                });
            },
            error: () => Swal.fire(this.translate.instant('comun.error'), this.translate.instant('ventas.clientesLista.errorAcceso'), 'error'),
        });
    }
}
