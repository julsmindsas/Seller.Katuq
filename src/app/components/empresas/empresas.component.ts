import { Component, ViewChild, OnInit, OnDestroy } from '@angular/core';
import { Router } from '@angular/router';
import { MaestroService } from '../../shared/services/maestros/maestro.service';
import { BreakpointObserver, Breakpoints } from '@angular/cdk/layout';
import { Subject, forkJoin, of } from 'rxjs';
import { takeUntil, map, debounceTime, distinctUntilChanged, catchError } from 'rxjs/operators';
import { DataStoreService } from '../../shared/services/dataStoreService';
import { FormControl } from '@angular/forms';
import { Table } from 'primeng/table';
import { MessageService } from 'primeng/api';
import { SubscriptionService } from '../../shared/services/subscription.service';
import Swal from 'sweetalert2';

// Interfaz mejorada basada en el modelo completo de Empresa
export interface Empresa {
  _docId?: string;
  nit: string;
  digitoVerificacion?: string;
  nombre: string;
  nomComercial: string;
  emailContactoGeneral: string;
  emailFactuElec?: string;
  fijo?: number | string | null;
  cel?: number | string | null;
  celular?: number | string | null; // Alias para cel
  indicativoFijoLocal?: string;
  indicativoCel?: string;
  direccion?: string;
  barrio?: string;
  ciudad?: string;
  departamento?: string;
  pais: string;
  codPostal?: string;
  logo?: string;
  activo?: boolean;
  date_edit?: any;
  terminosYCondiciones?: boolean;
  tratamientoDeDatosPersonales?: boolean;
  // Campos adicionales para filtrado y visualización
  fechaCreacion?: Date;
  ultimaActualizacion?: Date;
  [key: string]: any;
}

export interface FiltrosAvanzados {
  global: string;
  nit: string;
  nombre: string;
  nomComercial: string;
  email: string;
  telefono: string;
  pais: string[];
  activo: boolean | null;
  fechaDesde: Date | null;
  fechaHasta: Date | null;
}

@Component({
  selector: 'app-empresas',
  templateUrl: './empresas.component.html',
  styleUrls: ['./empresas.component.scss'],
  providers: [MessageService]
})
export class EmpresasComponent implements OnInit, OnDestroy {
  @ViewChild('dt') table!: Table;

  // Estado de carga y datos
  cargando = true;
  exportando = false;
  
  // Datos de empresas
  rows: Empresa[] = [];
  temp: Empresa[] = [];
  empresasFiltradas: Empresa[] = [];
  
  // Configuración de tabla
  rowsPerPageOptions = [5, 10, 25, 50, 100];
  totalRecords = 0;
  
  // Estados y configuraciones
  isMobile = false;
  isJulsmind = false;
  isAdminUser = false;
  upgradingPlan = new Set<string>(); // NITs en proceso de cambio de plan

  // Selección múltiple
  empresasSeleccionadas: Empresa[] = [];
  eliminandoSeleccionadas = false;
  
  // Filtros
  filtros: FiltrosAvanzados = {
    global: '',
    nit: '',
    nombre: '',
    nomComercial: '',
    email: '',
    telefono: '',
    pais: [],
    activo: null,
    fechaDesde: null,
    fechaHasta: null
  };
  
  // Controles de formulario para filtros reactivos
  filtroGlobalControl = new FormControl('');
  mostrarFiltrosAvanzados = false;
  
  // Opciones para filtros
  paisesDisponibles: string[] = [];
  paisesOptions: { label: string, value: string }[] = [];
  estadosActivo = [
    { label: 'Todos', value: null },
    { label: 'Activo', value: true },
    { label: 'Inactivo', value: false }
  ];

  private destroy$ = new Subject<void>();

  constructor(
    private service: MaestroService,
    private router: Router,
    private breakpointObserver: BreakpointObserver,
    private dataStoreService: DataStoreService,
    private messageService: MessageService,
    private subscriptionService: SubscriptionService
  ) {
    const currentCompany = JSON.parse(localStorage.getItem("currentCompany") || '{}');
    this.isJulsmind = currentCompany.nomComercial === 'Julsmind';

    // Verificar si el usuario es el administrador autorizado para eliminar empresas
    const user = JSON.parse(localStorage.getItem("user") || '{}');
    this.isAdminUser = user.email === 'dgarciah@julsmind.com';

    // Observar cambios en el tamaño de la pantalla
    this.breakpointObserver.observe([
      Breakpoints.HandsetPortrait,
      Breakpoints.TabletPortrait
    ]).pipe(
      map(result => result.matches),
      takeUntil(this.destroy$)
    ).subscribe(matches => {
      this.isMobile = matches;
    });

    // Configurar filtro global reactivo
    this.filtroGlobalControl.valueChanges.pipe(
      debounceTime(300),
      distinctUntilChanged(),
      takeUntil(this.destroy$)
    ).subscribe(valor => {
      this.filtros.global = valor || '';
      this.aplicarFiltros();
    });
  }

  ngOnInit(): void {
    this.cargarDatos();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  cargarDatos(): void {
    this.cargando = true;
    this.service.consultarEmpresas()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (datos: any) => {
          this.procesarDatos(datos as Empresa[]);
          this.cargando = false;
        },
        error: (err) => {
          console.error('Error fetching empresas:', err);
          this.messageService.add({
            severity: 'error',
            summary: 'Error',
            detail: 'Error al cargar las empresas'
          });
          this.cargando = false;
        }
      });
  }

  private procesarDatos(datos: Empresa[]): void {
    // Procesar y normalizar datos
    this.temp = datos.map((empresa, idx) => ({
      ...empresa,
      // Garantizar clave única para la tabla (fallback si no viene _docId del backend)
      _docId: empresa._docId || `${empresa.nit || 'sin-nit'}__${empresa.nomComercial || empresa.nombre || 'sin-nombre'}__${idx}`,
      // Normalizar campos de teléfono
      celular: empresa.cel || empresa.celular,
      // Procesar fechas si existen
      fechaCreacion: empresa.date_edit ? new Date(empresa.date_edit) : undefined,
      ultimaActualizacion: empresa.date_edit ? new Date(empresa.date_edit) : undefined
    }));
    
    this.rows = [...this.temp];
    this.empresasFiltradas = [...this.temp];
    this.totalRecords = this.temp.length;
    
    // Extraer países únicos para filtros
    this.paisesDisponibles = [...new Set(datos.map(e => e.pais).filter(Boolean))].sort();
    this.paisesOptions = this.paisesDisponibles.map(pais => ({ label: pais, value: pais }));
  }

  aplicarFiltros(): void {
    let resultado = [...this.temp];

    // Filtro global
    if (this.filtros.global) {
      const termino = this.filtros.global.toLowerCase();
      resultado = resultado.filter(empresa => 
        this.buscarEnTodosLosCampos(empresa, termino)
      );
    }

    // Filtros específicos
    if (this.filtros.nit) {
      resultado = resultado.filter(empresa => 
        empresa.nit?.toLowerCase().includes(this.filtros.nit.toLowerCase())
      );
    }

    if (this.filtros.nombre) {
      resultado = resultado.filter(empresa => 
        empresa.nombre?.toLowerCase().includes(this.filtros.nombre.toLowerCase())
      );
    }

    if (this.filtros.nomComercial) {
      resultado = resultado.filter(empresa => 
        empresa.nomComercial?.toLowerCase().includes(this.filtros.nomComercial.toLowerCase())
      );
    }

    if (this.filtros.email) {
      resultado = resultado.filter(empresa => 
        empresa.emailContactoGeneral?.toLowerCase().includes(this.filtros.email.toLowerCase())
      );
    }

    if (this.filtros.telefono) {
      resultado = resultado.filter(empresa => {
        const telefono = this.filtros.telefono.toLowerCase();
        return (
          empresa.fijo?.toString().includes(telefono) ||
          empresa.cel?.toString().includes(telefono) ||
          empresa.celular?.toString().includes(telefono)
        );
      });
    }

    if (this.filtros.pais.length > 0) {
      resultado = resultado.filter(empresa => 
        this.filtros.pais.includes(empresa.pais)
      );
    }

    if (this.filtros.activo !== null) {
      resultado = resultado.filter(empresa => 
        Boolean(empresa.activo) === this.filtros.activo
      );
    }

    // Filtros de fecha
    if (this.filtros.fechaDesde || this.filtros.fechaHasta) {
      resultado = resultado.filter(empresa => {
        if (!empresa.fechaCreacion) return false;
        
        const fechaEmpresa = new Date(empresa.fechaCreacion);
        
        if (this.filtros.fechaDesde && fechaEmpresa < this.filtros.fechaDesde) {
          return false;
        }
        
        if (this.filtros.fechaHasta && fechaEmpresa > this.filtros.fechaHasta) {
          return false;
        }
        
        return true;
      });
    }

    this.empresasFiltradas = resultado;
    this.rows = resultado;
    this.totalRecords = resultado.length;
  }

  private buscarEnTodosLosCampos(empresa: Empresa, termino: string): boolean {
    const campos = [
      empresa.nit,
      empresa.nombre,
      empresa.nomComercial,
      empresa.emailContactoGeneral,
      empresa.fijo?.toString(),
      empresa.cel?.toString(),
      empresa.celular?.toString(),
      empresa.pais,
      empresa.ciudad,
      empresa.direccion
    ];

    return campos.some(campo => 
      campo?.toString().toLowerCase().includes(termino)
    );
  }

  limpiarFiltros(): void {
    this.filtros = {
      global: '',
      nit: '',
      nombre: '',
      nomComercial: '',
      email: '',
      telefono: '',
      pais: [],
      activo: null,
      fechaDesde: null,
      fechaHasta: null
    };
    
    this.filtroGlobalControl.setValue('', { emitEvent: false });
    this.aplicarFiltros();
    
    if (this.table) {
      this.table.clear();
    }
  }

  toggleFiltrosAvanzados(): void {
    this.mostrarFiltrosAvanzados = !this.mostrarFiltrosAvanzados;
  }

  crearEmpresa(): void {
    this.dataStoreService.remove('infoFormsCompany').then(() => {
      this.router.navigateByUrl('empresas/crearEmpresa');
    });
  }

  editarEmpresa(empresa: Empresa): void {
    this.dataStoreService.set('infoFormsCompany', empresa).then(() => {
      this.router.navigateByUrl('empresas/crearEmpresa');
    });
  }

  async exportarExcel(): Promise<void> {
    try {
      this.exportando = true;
      
      // Usar el método existente del servicio para exportar
      this.service.exportToExcel().subscribe({
        next: (blob: any) => {
          // Crear un enlace de descarga para el archivo
          const url = window.URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.href = url;
          link.download = `empresas_${new Date().toISOString().split('T')[0]}.xlsx`;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          window.URL.revokeObjectURL(url);
          
          this.messageService.add({
            severity: 'success',
            summary: 'Éxito',
            detail: 'Archivo exportado correctamente'
          });
        },
        error: (error) => {
          console.error('Error al exportar:', error);
          this.messageService.add({
            severity: 'error',
            summary: 'Error',
            detail: 'Error al exportar los datos'
          });
        },
        complete: () => {
          this.exportando = false;
        }
      });
      
    } catch (error) {
      this.exportando = false;
      this.messageService.add({
        severity: 'error',
        summary: 'Error',
        detail: 'Error al iniciar la exportación'
      });
    }
  }

  onFiltroChange(): void {
    this.aplicarFiltros();
  }

  // Métodos para formato de datos
  formatearTelefono(empresa: Empresa): string {
    const telefono = empresa.fijo || empresa.cel || empresa.celular;
    return telefono ? telefono.toString() : '-';
  }

  formatearNit(empresa: Empresa): string {
    if (!empresa.nit) return '-';
    return empresa.digitoVerificacion 
      ? `${empresa.nit}-${empresa.digitoVerificacion}` 
      : empresa.nit;
  }

  getEstadoSeverity(activo: boolean | undefined): string {
    return activo ? 'success' : 'danger';
  }

  getEstadoLabel(activo: boolean | undefined): string {
    return activo ? 'Activo' : 'Inactivo';
  }

  // NUEVO: alternar estado activo/inactivo de una empresa
  toggleEstado(empresa: Empresa): void {
    // Determinar nuevo estado
    const nuevoEstado = !empresa.activo;
    const accion = nuevoEstado ? 'activar' : 'desactivar';

    // Confirmación rápida (puede reemplazarse por un diálogo más elaborado)
    if (!confirm(`¿Está seguro de ${accion} la empresa \"${empresa.nomComercial || empresa.nombre}\"?`)) {
      return;
    }

    const payload: Empresa = { ...empresa, activo: nuevoEstado };

    this.service.editCompany(payload).subscribe({
      next: () => {
        // Actualizar estado localmente para reflejar el cambio al instante
        empresa.activo = nuevoEstado;
        this.messageService.add({
          severity: 'success',
          summary: 'Éxito',
          detail: `Empresa ${accion}da correctamente`
        });
      },
      error: (err) => {
        console.error(`Error al ${accion} la empresa`, err);
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: `No se pudo ${accion} la empresa`
        });
      }
    });
  }

  // Eliminar empresa y todos sus datos relacionados (solo para dgarciah@julsmind.com)
  cambiarPlan(empresa: Empresa): void {
    const nombre = empresa.nomComercial || empresa.nombre;
    const planActual = empresa.subscriptionPlan || 'freemium';
    const nuevoPlan: 'premium' | 'freemium' = planActual === 'premium' ? 'freemium' : 'premium';
    const key = empresa.nit || nombre;
    const subiendo = nuevoPlan === 'premium';

    Swal.fire({
      title: subiendo ? '¿Activar Premium?' : '¿Bajar a Freemium?',
      html: `<b>${nombre}</b><br><small class="text-muted">${planActual.toUpperCase()} → ${nuevoPlan.toUpperCase()}</small>`,
      icon: subiendo ? 'success' : 'warning',
      showCancelButton: true,
      confirmButtonText: subiendo ? '★ Activar Premium' : 'Bajar a Freemium',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: subiendo ? '#059669' : '#6b7280',
      cancelButtonColor: '#e5e7eb',
      reverseButtons: true
    }).then(result => {
      if (!result.isConfirmed) return;

      this.upgradingPlan.add(key);

      this.subscriptionService.adminUpgradePlan(nombre, nuevoPlan)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: () => {
            empresa.subscriptionPlan = nuevoPlan;
            this.upgradingPlan.delete(key);
            Swal.fire({
              title: '¡Listo!',
              text: `"${nombre}" ahora está en plan ${nuevoPlan.toUpperCase()}`,
              icon: 'success',
              timer: 2000,
              showConfirmButton: false
            });
          },
          error: (err) => {
            this.upgradingPlan.delete(key);
            Swal.fire('Error', err?.error?.message || 'No se pudo actualizar el plan', 'error');
          }
        });
    });
  }

  private buildDeletePayload(empresa: Empresa): { nit?: string; companyDocId?: string } {
    const payload: { nit?: string; companyDocId?: string } = {};
    if (empresa.nit) payload.nit = empresa.nit;
    if (empresa._docId && !empresa._docId.includes('__')) payload.companyDocId = empresa._docId;
    return payload;
  }

  /** Parsea un Firestore Timestamp o string ISO a Date */
  private parseFirestoreDate(raw: any): Date | null {
    if (!raw) return null;
    let date: Date;
    if (raw._seconds) {
      date = new Date(raw._seconds * 1000);
    } else if (raw.seconds) {
      date = new Date(raw.seconds * 1000);
    } else {
      date = new Date(raw);
    }
    return isNaN(date.getTime()) ? null : date;
  }

  /** Resuelve la fecha de expiración: nextBillingDate o subscriptionStartDate + 30 días */
  private resolveExpirationDate(empresa: Empresa): Date | null {
    // Prioridad 1: nextBillingDate (set por billing/payments)
    const next = this.parseFirestoreDate(empresa.nextBillingDate);
    if (next) return next;

    // Prioridad 2: calcular desde subscriptionStartDate + 30 días
    const start = this.parseFirestoreDate(empresa.subscriptionStartDate);
    if (start) {
      const expiry = new Date(start);
      expiry.setMonth(expiry.getMonth() + 1);
      return expiry;
    }

    return null;
  }

  /** Obtiene la fecha de expiración formateada */
  getExpirationDate(empresa: Empresa): string | null {
    const date = this.resolveExpirationDate(empresa);
    if (!date) return null;
    return date.toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' });
  }

  /** Verifica si la suscripción ya expiró */
  isExpired(empresa: Empresa): boolean {
    const date = this.resolveExpirationDate(empresa);
    if (!date) return false;
    return date < new Date();
  }

  /** Verifica si la suscripción expira en los próximos 7 días */
  isExpiringSoon(empresa: Empresa): boolean {
    const date = this.resolveExpirationDate(empresa);
    if (!date) return false;
    const now = new Date();
    const sevenDays = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    return date >= now && date <= sevenDays;
  }

  eliminarEmpresa(empresa: Empresa): void {
    const nombreEmpresa = empresa.nomComercial || empresa.nombre;

    // Confirmación con mensaje de advertencia muy claro
    const confirmacion = confirm(
      `⚠️ ADVERTENCIA: Esta acción eliminará PERMANENTEMENTE la empresa "${nombreEmpresa}" y TODOS sus datos relacionados:\n\n` +
      `- Usuarios de la empresa\n` +
      `- Roles y permisos\n` +
      `- Bodegas\n` +
      `- Productos\n` +
      `- Pedidos\n` +
      `- Clientes\n` +
      `- Toda otra información asociada\n\n` +
      `Esta acción NO se puede deshacer.\n\n` +
      `¿Está completamente seguro de que desea eliminar "${nombreEmpresa}"?`
    );

    if (!confirmacion) {
      return;
    }

    // Segunda confirmación para estar seguros
    const confirmacionFinal = confirm(
      `⚠️ ÚLTIMA CONFIRMACIÓN:\n\n` +
      `Por favor confirme que desea eliminar "${nombreEmpresa}" (NIT: ${empresa.nit})\n\n` +
      `Esta es su última oportunidad para cancelar.`
    );

    if (!confirmacionFinal) {
      return;
    }

    // Mostrar mensaje de procesamiento
    this.messageService.add({
      severity: 'info',
      summary: 'Procesando',
      detail: `Eliminando empresa "${nombreEmpresa}" y todos sus datos...`,
      life: 5000
    });

    // Llamar al servicio de eliminación
    const payload = this.buildDeletePayload(empresa);
    if (!payload.nit && !payload.companyDocId) {
      this.messageService.add({
        severity: 'error',
        summary: 'Error',
        detail: 'No se puede eliminar: la empresa no tiene NIT ni identificador válido.'
      });
      return;
    }
    this.service.deleteCompany(payload).subscribe({
      next: (response: any) => {
        console.log('Empresa eliminada exitosamente:', response);

        // Mostrar mensaje de éxito
        this.messageService.add({
          severity: 'success',
          summary: 'Eliminación Exitosa',
          detail: `La empresa "${nombreEmpresa}" y todos sus datos han sido eliminados permanentemente.`,
          life: 5000
        });

        // Recargar datos para reflejar el cambio
        this.cargarDatos();
      },
      error: (err) => {
        console.error('Error al eliminar la empresa:', err);
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: err.error?.message || `No se pudo eliminar la empresa "${nombreEmpresa}". Por favor, intente nuevamente.`,
          life: 5000
        });
      }
    });
  }

  eliminarSeleccionadas(): void {
    const todas = this.empresasSeleccionadas || [];
    const seleccionadas = todas.filter(e => {
      const p = this.buildDeletePayload(e);
      return !!(p.nit || p.companyDocId);
    });
    const descartadas = todas.length - seleccionadas.length;
    if (seleccionadas.length === 0) {
      this.messageService.add({
        severity: 'warn',
        summary: 'Sin selección válida',
        detail: 'Las empresas seleccionadas no tienen NIT ni doc ID para eliminar.'
      });
      return;
    }
    if (descartadas > 0) {
      this.messageService.add({
        severity: 'info',
        summary: 'Aviso',
        detail: `${descartadas} empresa(s) sin identificador fueron omitidas.`,
        life: 4000
      });
    }

    const total = seleccionadas.length;
    const listadoHtml = seleccionadas
      .slice(0, 10)
      .map(e => `<li><b>${e.nomComercial || e.nombre || '-'}</b> <small class="text-muted">(${e.nit})</small></li>`)
      .join('');
    const extra = total > 10 ? `<li class="text-muted">… y ${total - 10} más</li>` : '';

    Swal.fire({
      title: `¿Eliminar ${total} empresa(s)?`,
      html:
        `<div class="text-start">` +
        `<p>Se eliminarán <b>PERMANENTEMENTE</b> las empresas y <b>TODOS</b> sus datos relacionados ` +
        `(usuarios, roles, bodegas, productos, pedidos, clientes, etc.). Esta acción <b>NO</b> se puede deshacer.</p>` +
        `<ul>${listadoHtml}${extra}</ul>` +
        `</div>`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: `Sí, eliminar ${total}`,
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#dc3545',
      cancelButtonColor: '#6b7280',
      reverseButtons: true,
      focusCancel: true
    }).then(result => {
      if (!result.isConfirmed) return;

      Swal.fire({
        title: 'Confirmación final',
        html: `Escribe <b>ELIMINAR</b> para confirmar la eliminación de <b>${total}</b> empresa(s).`,
        input: 'text',
        inputPlaceholder: 'ELIMINAR',
        showCancelButton: true,
        confirmButtonText: 'Eliminar definitivamente',
        cancelButtonText: 'Cancelar',
        confirmButtonColor: '#dc3545',
        reverseButtons: true,
        focusCancel: true,
        inputValidator: (value) => {
          if ((value || '').trim().toUpperCase() !== 'ELIMINAR') {
            return 'Debes escribir exactamente ELIMINAR para continuar';
          }
          return null;
        }
      }).then(confirmacionFinal => {
        if (!confirmacionFinal.isConfirmed) return;
        this.ejecutarEliminacionMasiva(seleccionadas);
      });
    });
  }

  private ejecutarEliminacionMasiva(seleccionadas: Empresa[]): void {
    this.eliminandoSeleccionadas = true;

    Swal.fire({
      title: 'Eliminando empresas…',
      html: `Procesando <b>${seleccionadas.length}</b> empresa(s). Esto puede tardar unos minutos.`,
      allowOutsideClick: false,
      allowEscapeKey: false,
      didOpen: () => Swal.showLoading()
    });

    const peticiones = seleccionadas.map(empresa =>
      this.service.deleteCompany(this.buildDeletePayload(empresa)).pipe(
        map(() => ({ empresa, ok: true as const })),
        catchError(err => of({ empresa, ok: false as const, error: err }))
      )
    );

    forkJoin(peticiones)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (resultados) => {
          const exitosas = resultados.filter(r => r.ok);
          const fallidas = resultados.filter(r => !r.ok);

          const exitosasHtml = exitosas
            .map(r => `<li>✅ ${r.empresa.nomComercial || r.empresa.nombre} <small class="text-muted">(${r.empresa.nit})</small></li>`)
            .join('');
          const fallidasHtml = fallidas
            .map((r: any) => `<li>❌ ${r.empresa.nomComercial || r.empresa.nombre} <small class="text-muted">(${r.empresa.nit})</small> — ${r.error?.error?.message || r.error?.message || 'Error'}</li>`)
            .join('');

          Swal.fire({
            title: fallidas.length === 0 ? 'Eliminación completa' : 'Eliminación parcial',
            icon: fallidas.length === 0 ? 'success' : 'warning',
            html:
              `<div class="text-start">` +
              `<p><b>${exitosas.length}</b> eliminada(s) correctamente, <b>${fallidas.length}</b> con error.</p>` +
              (exitosasHtml ? `<p class="mb-1"><b>Eliminadas:</b></p><ul>${exitosasHtml}</ul>` : '') +
              (fallidasHtml ? `<p class="mb-1"><b>Con error:</b></p><ul>${fallidasHtml}</ul>` : '') +
              `</div>`,
            confirmButtonText: 'Aceptar'
          });

          this.empresasSeleccionadas = [];
          this.eliminandoSeleccionadas = false;
          this.cargarDatos();
        },
        error: (err) => {
          console.error('Error inesperado en eliminación masiva:', err);
          this.eliminandoSeleccionadas = false;
          Swal.fire('Error', 'Ocurrió un error inesperado durante la eliminación masiva.', 'error');
        }
      });
  }
}
