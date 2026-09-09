import { Component, ViewChild, OnInit, OnDestroy } from '@angular/core';
import { Router } from '@angular/router';
import { MaestroService } from '../../shared/services/maestros/maestro.service';
import { BreakpointObserver, Breakpoints } from '@angular/cdk/layout';
import { Subject } from 'rxjs';
import { takeUntil, map, debounceTime, distinctUntilChanged } from 'rxjs/operators';
import { DataStoreService } from '../../shared/services/dataStoreService';
import { FormControl } from '@angular/forms';
import { Table } from 'primeng/table';
import { MessageService } from 'primeng/api';
import { ConfigPrecios, ModoPrecio, PricingModeService } from '../../shared/services/empresas/pricing-mode.service';
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

  // ── Modo de precios de la empresa (unitario | tipo de cliente | volumen) ──
  /**
   * `modo: null` = la empresa todavía no eligió. Cuál tipo de cliente define el
   * precio base NO se decide acá: es una marca del propio tipo, en el módulo
   * Tipos de Cliente.
   */
  configPrecios: ConfigPrecios = { modo: null };
  cargandoModo = true;
  guardandoModo = false;
  /** Solo el administrador de la empresa puede cambiarlo. */
  puedeEditarModo = false;

  constructor(
    private service: MaestroService,
    private router: Router,
    private breakpointObserver: BreakpointObserver,
    private dataStoreService: DataStoreService,
    private messageService: MessageService,
    private pricingMode: PricingModeService
  ) {
    const currentCompany = JSON.parse(localStorage.getItem("currentCompany") || '{}');
    this.isJulsmind = currentCompany.nomComercial === 'Julsmind';

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
    this.puedeEditarModo = this.pricingMode.puedeEditar();
    this.cargarModoPrecio();
  }

  // ── Modo de precios ──

  /** Nombre legible de cada modo, para los mensajes. */
  private readonly NOMBRE_MODO: { [k: string]: string } = {
    unitario: 'Precio unitario',
    tipoCliente: 'Precio por tipo de cliente',
    volumen: 'Precio por volumen'
  };

  get modoPrecio(): ModoPrecio {
    return this.configPrecios.modo;
  }

  private cargarModoPrecio(): void {
    this.cargandoModo = true;
    this.pricingMode.getConfig(true)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (config) => {
          this.configPrecios = config;
          this.cargandoModo = false;
        },
        error: () => {
          this.configPrecios = { modo: null };
          this.cargandoModo = false;
        }
      });
  }

  /**
   * Cambia el modo de precios de la empresa. Pide confirmación porque cambia lo
   * que ve todo el equipo en Lista de Precios; los precios de los modos que se
   * apagan NO se borran, solo dejan de mostrarse.
   */
  async seleccionarModoPrecio(modo: Exclude<ModoPrecio, null>): Promise<void> {
    if (!this.puedeEditarModo || this.guardandoModo || modo === this.configPrecios.modo) {
      return;
    }

    const nombre = this.NOMBRE_MODO[modo];
    const ocultas = Object.keys(this.NOMBRE_MODO)
      .filter(k => k !== modo && k !== 'unitario')
      .map(k => this.NOMBRE_MODO[k]);

    const confirmacion = await Swal.fire({
      title: `¿Manejar ${nombre}?`,
      html: `En <strong>Lista de precios</strong> se mostrará la pestaña de
             <strong>${nombre}</strong>${modo === 'unitario' ? '' : ' y se ocultará la de <strong>' + ocultas.join('</strong> y <strong>') + '</strong>'}.<br><br>
             Los precios que ya tengas cargados en los otros modos
             <u>no se borran</u>: quedan guardados y vuelven a verse si cambias de modo.`,
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'Sí, usar este modo',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#5F3FE0'
    });

    if (!confirmacion.isConfirmed) return;

    this.guardarConfigPrecios({ modo }, `Tu empresa maneja ahora ${nombre}.`);
  }

  private guardarConfigPrecios(
    config: { modo: Exclude<ModoPrecio, null> },
    mensajeExito: string
  ): void {
    this.guardandoModo = true;
    this.pricingMode.setConfig(config)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (confirmada) => {
          this.configPrecios = confirmada;
          this.guardandoModo = false;
          Swal.fire({
            icon: 'success',
            title: 'Configuración de precios actualizada',
            text: mensajeExito,
            confirmButtonColor: '#5F3FE0'
          });
        },
        error: (err) => {
          this.guardandoModo = false;
          const esPermiso = err?.status === 403;
          Swal.fire({
            icon: 'error',
            title: esPermiso ? 'No tienes permiso' : 'No se pudo guardar',
            text: esPermiso
              ? 'Solo el administrador de la empresa puede cambiar el modo de precios.'
              : (err?.error?.error || 'Intenta de nuevo en unos segundos.'),
            confirmButtonColor: '#5F3FE0'
          });
        }
      });
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
    this.router.navigateByUrl('empresas/crearEmpresa');
  }

  /**
   * Abre la ficha de la empresa por su docId.
   *
   * Antes se le pasaba al formulario LA FILA de esta tabla por IndexedDB. La
   * fila es una proyección: no trae `sedes`, `contactos`, `horarioPV` ni
   * `canalesComunicacion`, y el formulario persiste lo que tenga cargado — así
   * que guardar desde acá BORRABA las sedes y los contactos de la empresa.
   */
  editarEmpresa(empresa: Empresa): void {
    const docId = empresa._docId;

    // `_docId` puede ser una llave sintética (`nit__nombre__índice`) cuando el
    // backend no devolvió el id real; con esa llave la ficha daría 404.
    if (!docId || docId.includes('__')) {
      this.messageService.add({
        severity: 'error',
        summary: 'No se pudo abrir',
        detail: 'Esta empresa no tiene identificador. Recarga el listado e intenta de nuevo.'
      });
      return;
    }

    this.router.navigate(['empresas', 'editar', docId]);
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

  // La administración de la PLATAFORMA (cambiar plan, expiraciones,
  // eliminar empresas, borrado masivo) se movió a la Consola de
  // plataforma (superadmin/clientes). Esta pantalla es la configuración
  // de la propia empresa: un solo sitio administra empresas.
}
