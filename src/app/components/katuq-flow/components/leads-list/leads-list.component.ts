import { Component, OnInit, OnDestroy } from "@angular/core";
import { Subject } from "rxjs";
import { takeUntil, debounceTime, distinctUntilChanged } from "rxjs/operators";
import { KatuqFlowService } from "../../services/katuq-flow.service";
import {
  CrmLead,
  LeadFilters,
  LeadStats,
  LeadStatus,
} from "../../interfaces/crm-lead.interface";
import { MessageService, ConfirmationService, LazyLoadEvent } from "primeng/api";
import { environment } from "../../../../../environments/environment";
import * as XLSX from "xlsx";

@Component({
  selector: "app-leads-list",
  templateUrl: "./leads-list.component.html",
  styleUrls: ["./leads-list.component.scss"],
})
export class LeadsListComponent implements OnInit, OnDestroy {
  // Datos principales
  leads: CrmLead[] = [];
  leadStats: LeadStats | null = null;
  companies: string[] = [];
  sources: string[] = [];

  // Estado de la UI
  loading = false;
  syncLoading = false;
  testingConnection = false;
  exportingToExcel = false;

  // Filtros y búsqueda
  filters: LeadFilters = {};
  searchTerm = "";
  private searchSubject = new Subject<string>();

  // Paginación - PrimeNG usa base 0 internamente
  currentPage = 0;
  pageSize = 20;
  totalRecords = 0;
  first = 0; // Para sincronizar con PrimeNG

  // Opciones para dropdowns
  statusOptions = [
    { label: "Todos los estados", value: null },
    { label: "Nuevo", value: LeadStatus.NUEVO },
    { label: "En Proceso", value: LeadStatus.EN_PROCESO },
    { label: "Contactado", value: LeadStatus.CONTACTADO },
    { label: "Calificado", value: LeadStatus.CALIFICADO },
    { label: "Perdido", value: LeadStatus.PERDIDO },
    { label: "Convertido", value: LeadStatus.CONVERTIDO },
  ];

  // Enum para el template
  LeadStatus = LeadStatus;

  // Math object para cálculos en template
  Math = Math;

  // Para cleanup
  private destroy$ = new Subject<void>();

  // Para manejar resúmenes expandidos
  expandedSummaries = new Set<number>();

  // Modo de vista: 'cards' o 'table'
  viewMode: 'cards' | 'table' = 'cards';

  constructor(
    private katuqFlowService: KatuqFlowService,
    private messageService: MessageService,
    private confirmationService: ConfirmationService,
  ) {
    // Configurar búsqueda con debounce
    this.searchSubject
      .pipe(debounceTime(300), distinctUntilChanged(), takeUntil(this.destroy$))
      .subscribe((searchTerm) => {
        this.filters.searchTerm = searchTerm;
        this.loadLeads(true);
      });
  }

  ngOnInit(): void {
    this.initializeData();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  /**
   * Inicializa los datos del componente
   */
  private initializeData(): void {
    // Cargar filtros primero
    this.loadCompanies();
    this.loadSources();
    // Luego cargar datos
    this.loadLeads();
    this.loadStats();
  }

  /**
   * Carga la lista de leads con filtros y paginación
   */
  loadLeads(resetPage = false): void {
    if (resetPage) {
      this.currentPage = 0;
      this.first = 0;
    }

    this.loading = true;

    // Convertir currentPage de PrimeNG (base 0) a base 1 para la API
    const apiPage = this.currentPage + 1;

    this.katuqFlowService
      .getLeads(this.filters, apiPage, this.pageSize)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          this.leads = response.data || [];
          this.totalRecords = response.total || 0;
          this.loading = false;

          // Actualizar first para mantener sincronizado PrimeNG
          this.first = this.currentPage * this.pageSize;

          console.log("📊 Data loaded:", {
            totalLeads: this.totalRecords,
            currentPage: this.currentPage,
            apiPage: apiPage,
            pageSize: this.pageSize,
            totalPages: Math.ceil(this.totalRecords / this.pageSize),
            leadsShown: this.leads.length,
            first: this.first,
            filtersApplied: this.filters,
          });
        },
        error: (error) => {
          console.error("Error loading leads:", error);
          this.messageService.add({
            severity: "error",
            summary: "Error",
            detail: "No se pudieron cargar los leads",
          });
          this.loading = false;
          this.leads = [];
          this.totalRecords = 0;
        },
      });
  }

  /**
   * Maneja el evento de lazy load de PrimeNG
   */
  onLazyLoad(event: LazyLoadEvent): void {
    console.log("📄 Lazy load event:", event);

    // Calcular página actual (PrimeNG envía first y rows)
    const newPageSize = event.rows || this.pageSize;
    const newCurrentPage = Math.floor((event.first || 0) / newPageSize);

    console.log(`📄 Calculated page: ${newCurrentPage}, size: ${newPageSize}, first: ${event.first}`);

    // Solo actualizar si realmente cambió para evitar loops
    const sizeChanged = newPageSize !== this.pageSize;
    const pageChanged = newCurrentPage !== this.currentPage;

    if (sizeChanged || pageChanged) {
      this.pageSize = newPageSize;
      this.currentPage = newCurrentPage;

      // Si cambió el tamaño de página, resetear a página 0
      if (sizeChanged) {
        this.currentPage = 0;
        this.first = 0;
      }

      // Cargar datos con los nuevos parámetros
      this.loadLeads(false);
    }
  }

  /**
   * Carga las estadísticas de leads - SINCRONIZADO CON FILTROS
   */
  loadStats(): void {
    // Usar los mismos filtros que la tabla para consistencia
    this.katuqFlowService
      .getLeadStatsWithFilters(this.filters)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (stats) => {
          this.leadStats = stats;
          console.log("📊 Stats loaded with filters:", stats, this.filters);
        },
        error: (error) => {
          console.error("Error loading stats:", error);
          // Fallback: usar estadísticas básicas
          this.loadBasicStats();
        },
      });
  }

  /**
   * Carga estadísticas básicas como fallback
   */
  private loadBasicStats(): void {
    this.katuqFlowService
      .getLeadStats(this.filters.company)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (stats) => {
          this.leadStats = stats;
        },
        error: (error) => {
          console.error("Error loading basic stats:", error);
        },
      });
  }

  /**
   * Carga la lista de empresas
   */
  private loadCompanies(): void {
    this.katuqFlowService
      .getCompanies()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (companies) => {
          this.companies = companies;
        },
        error: (error) => {
          console.error("Error loading companies:", error);
        },
      });
  }

  /**
   * Carga la lista de fuentes
   */
  private loadSources(): void {
    this.katuqFlowService
      .getSources()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (sources) => {
          this.sources = sources;
        },
        error: (error) => {
          console.error("Error loading sources:", error);
        },
      });
  }

  /**
   * Maneja la búsqueda con debounce
   */
  onSearchChange(searchTerm: string): void {
    this.searchSubject.next(searchTerm);
  }

  /**
   * Aplica filtros y recarga los datos
   */
  applyFilters(): void {
    this.loadLeads(true);
    this.loadStats();
  }

  /**
   * Limpia todos los filtros
   */
  clearFilters(): void {
    this.filters = {};
    this.searchTerm = "";
    this.loadLeads(true);
    this.loadStats();
  }

  /**
   * Actualiza el estado de un lead
   */
  updateLeadStatus(lead: CrmLead, newStatus: LeadStatus): void {
    this.confirmationService.confirm({
      message: `¿Está seguro que desea cambiar el estado del lead "${lead.name}" a "${newStatus}"?`,
      header: "Confirmar cambio de estado",
      icon: "pi pi-exclamation-triangle",
      accept: () => {
        this.katuqFlowService
          .updateLeadStatus(lead.mobile_id, newStatus)
          .pipe(takeUntil(this.destroy$))
          .subscribe({
            next: (success) => {
              if (success) {
                this.messageService.add({
                  severity: "success",
                  summary: "Estado actualizado",
                  detail: `El estado del lead se actualizó correctamente`,
                });
                this.loadLeads();
                this.loadStats();
              } else {
                this.messageService.add({
                  severity: "error",
                  summary: "Error",
                  detail: "No se pudo actualizar el estado del lead",
                });
              }
            },
            error: (error) => {
              console.error("Error updating lead status:", error);
              this.messageService.add({
                severity: "error",
                summary: "Error",
                detail: "Error al actualizar el estado del lead",
              });
            },
          });
      },
    });
  }

  /**
   * Sincroniza los datos con el servidor
   */
  syncData(): void {
    this.syncLoading = true;

    this.katuqFlowService
      .syncData()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (success) => {
          this.syncLoading = false;
          if (success) {
            this.messageService.add({
              severity: "success",
              summary: "Sincronización completada",
              detail: "Los datos se sincronizaron correctamente",
            });
            this.loadLeads();
            this.loadStats();
          } else {
            this.messageService.add({
              severity: "warn",
              summary: "Sincronización incompleta",
              detail: "La sincronización no se completó correctamente",
            });
          }
        },
        error: (error) => {
          console.error("Error syncing data:", error);
          this.syncLoading = false;
          this.messageService.add({
            severity: "error",
            summary: "Error de sincronización",
            detail: "No se pudo sincronizar con el servidor",
          });
        },
      });
  }

  /**
   * Obtiene la clase CSS para el estado del lead
   */
  getStatusSeverity(status: LeadStatus): string {
    switch (status) {
      case LeadStatus.NUEVO:
        return "info";
      case LeadStatus.EN_PROCESO:
        return "warning";
      case LeadStatus.CONTACTADO:
        return "secondary";
      case LeadStatus.CALIFICADO:
        return "success";
      case LeadStatus.CONVERTIDO:
        return "success";
      case LeadStatus.PERDIDO:
        return "danger";
      default:
        return "secondary";
    }
  }

  /**
   * Formatea las fechas para mostrar
   */
  formatDate(dateString: string): string {
    if (!dateString) return "-";

    const date = new Date(dateString);
    return date.toLocaleDateString("es-CO", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  /**
   * Obtiene el tiempo transcurrido desde una fecha
   */
  getTimeAgo(dateString: string): string {
    if (!dateString) return "-";

    const date = new Date(dateString);
    const now = new Date();
    const diffInMs = now.getTime() - date.getTime();
    const diffInHours = Math.floor(diffInMs / (1000 * 60 * 60));
    const diffInDays = Math.floor(diffInHours / 24);

    if (diffInHours < 1) {
      return "Hace menos de 1 hora";
    } else if (diffInHours < 24) {
      return `Hace ${diffInHours} hora${diffInHours > 1 ? "s" : ""}`;
    } else if (diffInDays < 30) {
      return `Hace ${diffInDays} día${diffInDays > 1 ? "s" : ""}`;
    } else {
      return this.formatDate(dateString);
    }
  }

  /**
   * Exporta los leads a Excel usando XLSX
   */
  exportToExcel(): void {
    try {
      this.exportingToExcel = true;
      
      this.messageService.add({
        severity: "info",
        summary: "Iniciando exportación",
        detail: "Generando archivo Excel...",
      });

      // Obtener todos los leads para exportar (sin paginación)
      this.katuqFlowService
        .getLeads(this.filters, 1, 10000) // Obtener un número alto para todos los registros
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: (response) => {
            const allLeads = response.data || [];
            
            // Preparar datos para Excel con metadatos
            const excelData = [];
            
            // Agregar título
            excelData.push(['REPORTE KATUQ FLOW CRM - GESTIÓN DE LEADS']);
            excelData.push([`Generado el: ${this.formatDate(new Date().toISOString())}`]);
            
            // Agregar información de filtros si existen
            if (this.hasActiveFilters()) {
              const activeFilters = [];
              if (this.filters.company) activeFilters.push(`Empresa: ${this.filters.company}`);
              if (this.filters.status) activeFilters.push(`Estado: ${this.filters.status}`);
              if (this.filters.source) activeFilters.push(`Fuente: ${this.filters.source}`);
              if (this.searchTerm) activeFilters.push(`Búsqueda: ${this.searchTerm}`);
              
              excelData.push([`Filtros aplicados: ${activeFilters.join(' | ')}`]);
            }
            
            // Agregar línea vacía
            excelData.push([]);
            
            // Agregar headers
            excelData.push([
              'ID',
              'Nombre',
              'Email',
              'Teléfono',
              'Empresa',
              'Estado',
              'Fuente',
              'Fecha Creación',
              'Última Actualización',
              'Creado Por',
              'Resumen'
            ]);
            
            // Agregar datos de leads
            allLeads.forEach(lead => {
              excelData.push([
                lead.mobile_id,
                lead.name,
                lead.email,
                lead.phone,
                lead.company,
                lead.status,
                lead.source,
                this.formatDate(lead.created_at),
                this.formatDate(lead.updated_at),
                lead.created_by,
                lead.summary
              ]);
            });
            
            // Crear worksheet principal
            const ws: XLSX.WorkSheet = XLSX.utils.aoa_to_sheet(excelData);
            
            // Configurar anchos de columnas
            const colWidths = [
              { wch: 8 },  // ID
              { wch: 20 }, // Nombre
              { wch: 25 }, // Email
              { wch: 15 }, // Teléfono
              { wch: 20 }, // Empresa
              { wch: 15 }, // Estado
              { wch: 30 }, // Fuente
              { wch: 15 }, // Fecha Creación
              { wch: 15 }, // Última Actualización
              { wch: 15 }, // Creado Por
              { wch: 50 }  // Resumen
            ];
            ws['!cols'] = colWidths;
            
            // Crear datos para hoja de estadísticas
            const statsData = [];
            statsData.push(['ESTADÍSTICAS DE LEADS']);
            statsData.push([]);
            statsData.push(['Estado', 'Cantidad', 'Porcentaje']);
            
            // Calcular estadísticas
            const totalLeads = allLeads.length;
            const estadosCount = {};
            allLeads.forEach(lead => {
              estadosCount[lead.status] = (estadosCount[lead.status] || 0) + 1;
            });
            
            Object.keys(estadosCount).forEach(estado => {
              const cantidad = estadosCount[estado];
              const porcentaje = ((cantidad / totalLeads) * 100).toFixed(1);
              statsData.push([estado, cantidad, `${porcentaje}%`]);
            });
            
            // Agregar total
            statsData.push([]);
            statsData.push(['TOTAL', totalLeads, '100%']);
            
            // Crear worksheet de estadísticas
            const wsStats: XLSX.WorkSheet = XLSX.utils.aoa_to_sheet(statsData);
            
            // Configurar anchos para estadísticas
            wsStats['!cols'] = [
              { wch: 20 }, // Estado
              { wch: 15 }, // Cantidad
              { wch: 15 }  // Porcentaje
            ];
            
            // Crear workbook
            const wb: XLSX.WorkBook = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(wb, ws, 'Leads Katuq Flow');
            XLSX.utils.book_append_sheet(wb, wsStats, 'Estadísticas');
            
            // Crear nombre de archivo con timestamp
            const now = new Date();
            const timestamp = now.toISOString().slice(0, 16).replace(/[:-]/g, '');
            const filename = `katuq-flow-leads-${timestamp}.xlsx`;
            
            // Descargar archivo
            XLSX.writeFile(wb, filename);

            this.messageService.add({
              severity: "success",
              summary: "Exportación exitosa",
              detail: `Se exportaron ${allLeads.length} leads a Excel`,
            });
            
            this.exportingToExcel = false;
          },
          error: (error) => {
            console.error("Error en exportación:", error);
            this.messageService.add({
              severity: "error",
              summary: "Error en exportación",
              detail: "No se pudo exportar los datos a Excel",
            });
            this.exportingToExcel = false;
          }
        });

    } catch (error) {
      console.error("Error al exportar:", error);
      this.messageService.add({
        severity: "error",
        summary: "Error",
        detail: "Error al generar el archivo Excel",
      });
      this.exportingToExcel = false;
    }
  }

  /**
   * Abre el detalle de un lead (placeholder)
   */
  viewLeadDetails(lead: CrmLead): void {
    // Aquí se podría abrir un modal o navegar a una página de detalle
    console.log("View lead details:", lead);
  }

  /**
   * Verifica si hay filtros activos
   */
  hasActiveFilters(): boolean {
    return !!(
      this.searchTerm ||
      this.filters.company ||
      this.filters.status ||
      this.filters.source ||
      this.filters.dateFrom ||
      this.filters.dateTo
    );
  }

  /**
   * Cuenta los filtros activos
   */
  getActiveFiltersCount(): number {
    let count = 0;
    if (this.searchTerm) count++;
    if (this.filters.company) count++;
    if (this.filters.status) count++;
    if (this.filters.source) count++;
    if (this.filters.dateFrom) count++;
    if (this.filters.dateTo) count++;
    return count;
  }

  /**
   * Toggle para mostrar/ocultar resumen del lead
   */
  toggleSummary(leadId: number): void {
    if (this.expandedSummaries.has(leadId)) {
      this.expandedSummaries.delete(leadId);
    } else {
      this.expandedSummaries.add(leadId);
    }
  }

  /**
   * Obtiene el nombre corto de la fuente para mostrar
   */
  getSourceDisplayName(source: string): string {
    if (!source) return 'Sin fuente';
    
    // Acortar nombres largos de fuentes
    if (source.includes('Transcripción de voz')) {
      return 'Transcripción de voz';
    }
    if (source.includes('Formulario web')) {
      return 'Formulario web';
    }
    if (source.includes('LinkedIn')) {
      return 'LinkedIn';
    }
    if (source.includes('Referido')) {
      return 'Referido';
    }
    if (source.includes('Redes sociales')) {
      return 'Redes sociales';
    }
    if (source.includes('Llamada fría')) {
      return 'Llamada fría';
    }
    if (source.includes('Evento')) {
      return 'Evento comercial';
    }
    if (source.includes('Chatbot')) {
      return 'Chatbot web';
    }
    
    // Si es muy largo, truncar
    return source.length > 20 ? source.substring(0, 20) + '...' : source;
  }

  /**
   * Obtiene el tipo de fuente para mostrar como subtítulo
   */
  getSourceType(source: string): string | null {
    if (!source) return null;
    
    if (source.includes('Transcripción de voz')) {
      return 'Lead directo';
    }
    if (source.includes('Cliente existente')) {
      return 'Referido';
    }
    if (source.includes('Instagram') || source.includes('Facebook')) {
      return 'Social Media';
    }
    if (source.includes('Expopyme') || source.includes('Expo')) {
      return 'Evento';
    }
    if (source.includes('Mensaje directo')) {
      return 'Outreach';
    }
    
    return null;
  }

  /**
   * Cambia el modo de vista
   */
  setViewMode(mode: 'cards' | 'table'): void {
    this.viewMode = mode;
    // Ajustar tamaño de página según la vista y dispositivo
    if (mode === 'cards') {
      // En móvil: muchos más items por página ya que son súper compactos
      this.pageSize = window.innerWidth <= 768 ? 35 : 18;
    } else {
      this.pageSize = 20; // Estándar para tabla
    }
    this.loadLeads(true);
  }

  /**
   * Obtiene las iniciales del nombre para el avatar
   */
  getInitials(name: string): string {
    if (!name) return '??';
    const words = name.trim().split(' ');
    if (words.length === 1) {
      return words[0].substring(0, 2).toUpperCase();
    }
    return (words[0].charAt(0) + words[words.length - 1].charAt(0)).toUpperCase();
  }

  /**
   * Obtiene la clase CSS para el estado
   */
  getStatusClass(status: LeadStatus): string {
    switch (status) {
      case LeadStatus.NUEVO:
        return 'nuevo';
      case LeadStatus.EN_PROCESO:
        return 'en-proceso';
      case LeadStatus.CONTACTADO:
        return 'contactado';
      case LeadStatus.CALIFICADO:
        return 'calificado';
      case LeadStatus.CONVERTIDO:
        return 'convertido';
      case LeadStatus.PERDIDO:
        return 'perdido';
      default:
        return 'nuevo';
    }
  }

  /**
   * Obtiene el icono para el estado
   */
  getStatusIcon(status: LeadStatus): string {
    switch (status) {
      case LeadStatus.NUEVO:
        return 'pi-circle';
      case LeadStatus.EN_PROCESO:
        return 'pi-clock';
      case LeadStatus.CONTACTADO:
        return 'pi-phone';
      case LeadStatus.CALIFICADO:
        return 'pi-check-circle';
      case LeadStatus.CONVERTIDO:
        return 'pi-thumbs-up';
      case LeadStatus.PERDIDO:
        return 'pi-times-circle';
      default:
        return 'pi-circle';
    }
  }

  /**
   * TrackBy function para optimizar el renderizado de las cards
   */
  trackByLeadId(index: number, lead: CrmLead): number {
    return lead.mobile_id;
  }

  /**
   * Maneja el cambio de página en vista de cards
   */
  onCardPageChange(event: any): void {
    console.log("📄 Card page change event:", event);
    this.onLazyLoad(event);
  }

  /**
   * Prueba la conexión con la API
   */
  testConnection(): void {
    this.testingConnection = true;

    this.katuqFlowService
      .testConnection()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (result) => {
          this.testingConnection = false;
          this.messageService.add({
            severity: result.success ? "success" : "error",
            summary: result.success ? "Conexión exitosa" : "Error de conexión",
            detail: result.message,
            life: 5000,
          });

          if (result.success) {
            console.log("🔗 Connection test details:", result.details);
            // Si la conexión es exitosa, intentar cargar datos
            this.loadLeads(true);
          } else {
            console.error("🔗 Connection test failed:", result.details);
          }
        },
        error: (error) => {
          this.testingConnection = false;
          console.error("Error testing connection:", error);
          this.messageService.add({
            severity: "error",
            summary: "Error de prueba",
            detail: "No se pudo realizar la prueba de conexión",
          });
        },
      });
  }
}
