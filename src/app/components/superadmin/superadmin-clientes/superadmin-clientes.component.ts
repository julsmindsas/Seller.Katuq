import { Component, OnInit } from '@angular/core';
import { CompaniesService } from '../../../services/companies.service';
import { NotificationService } from '../../../shared/services/notification.service';
import { catchError, finalize, Observable, of } from 'rxjs';
import { Sede, Contacto, HorarioPV, MarketPlace, CanalComunicacion, RedSocial } from '../../../shared/models/empresa/empresa';

interface Cliente {
  id: number;
  empresa: {
    nombre: string;
    nit: string;
    direccion: string;
    ciudad: string;
    departamento: string;
    pais: string;
    emailContacto: string;
    telContacto: string;
    nombreSede: string;
    fijoContacto: string;
    emailFactuElec: string;
    cel: string;
    comoLlegarSede: string;
    extensionFijo: string;
    direccionSede: string;
    sedes: Sede[];
    contactos: Contacto[];
    horarios: HorarioPV[];
    marketplaces: MarketPlace[];
    canalesComunicacion: CanalComunicacion[];
    redesSociales: RedSocial[];
  };
  estado: string;
  plan: string;
  fechaRegistro: Date;
}

@Component({
  selector: 'app-superadmin-clientes',
  templateUrl: './superadmin-clientes.component.html',
  styleUrls: ['./superadmin-clientes.component.scss']
})
export class SuperadminClientesComponent implements OnInit {

  clientes: Cliente[] = [];
  clientesFiltrados: Cliente[] = [];
  clienteSeleccionado: Cliente | null = null;
  filtroNombre = '';
  filtroEstado = '';
  filtroFecha = '';
  cargando = false;
  error = '';
  viewMode = 'table';

  get totalClientes(): number {
    return this.clientes.length;
  }

  get clientesActivosCount(): number {
    return this.clientes.filter(c => c.estado === 'Activo').length;
  }

  get clientesInactivosCount(): number {
    return this.clientes.filter(c => c.estado === 'Inactivo').length;
  }

  get clientesPendientesCount(): number {
    return this.clientes.filter(c => c.estado === 'Pendiente').length;
  }

  get premiumCount(): number {
    return this.clientes.filter(c => c.plan === 'premium').length;
  }

  get freemiumCount(): number {
    return this.clientes.filter(c => c.plan !== 'premium').length;
  }

  get ciudadesTop(): { nombre: string; count: number }[] {
    const map = new Map<string, number>();
    this.clientes.forEach(c => {
      const ciudad = c.empresa.ciudad || 'Sin ciudad';
      map.set(ciudad, (map.get(ciudad) || 0) + 1);
    });
    return Array.from(map.entries())
      .map(([nombre, count]) => ({ nombre, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);
  }

  get registrosRecientes(): Cliente[] {
    return [...this.clientes]
      .sort((a, b) => b.fechaRegistro.getTime() - a.fechaRegistro.getTime())
      .slice(0, 5);
  }

  constructor(
    private companiesService: CompaniesService,
    private notificationService: NotificationService
  ) {}

  ngOnInit(): void {
    this.cargarClientes();
    this.initializeResponsiveView();
  }

  cargarClientes(): void {
    this.cargando = true;
    this.error = '';

    let serviceCall: Observable<any[]>;
    if (this.filtroNombre || this.filtroEstado) {
      serviceCall = this.companiesService.filterCompanies({
        nombre: this.filtroNombre || undefined,
        estado: this.filtroEstado || undefined
      });
    } else {
      serviceCall = this.companiesService.getAllCompanies();
    }

    serviceCall.pipe(
      catchError(err => {
        this.error = 'Error al cargar las empresas. Verifica tu conexion.';
        console.error('Error cargando empresas:', err);
        return of([]);
      }),
      finalize(() => { this.cargando = false; })
    ).subscribe(res => {
      if (!this.error) {
        this.procesarRespuestaClientes(res);
        this.filtrarClientes();
      }
    });
  }

  private procesarRespuestaClientes(res: any[]): void {
    if (!res || !Array.isArray(res)) {
      this.error = 'Respuesta invalida del servidor.';
      this.clientes = [];
      this.clientesFiltrados = [];
      return;
    }

    this.clientes = res.map((empresa: any, index: number) => ({
      id: empresa.id || index + 1,
      empresa: {
        nombre: empresa.nombre || '',
        nit: empresa.nit || '',
        direccion: empresa.direccion || '',
        ciudad: empresa.ciudad || '',
        departamento: empresa.departamento || '',
        pais: empresa.pais || '',
        emailContacto: empresa.emailContacto || '',
        telContacto: empresa.telContacto || '',
        nombreSede: empresa.nombreSede || '',
        fijoContacto: empresa.fijoContacto || '',
        emailFactuElec: empresa.emailFactuElec || '',
        cel: empresa.cel ? empresa.cel.toString() : '',
        comoLlegarSede: empresa.comoLlegarSede || '',
        extensionFijo: empresa.extensionFijo ? empresa.extensionFijo.toString() : '',
        direccionSede: empresa.direccionSede || '',
        sedes: empresa.sedes || [],
        contactos: empresa.contactos || [],
        horarios: empresa.horarios || empresa.horarioPV || [],
        marketplaces: empresa.marketplaces || empresa.marketPlace || [],
        canalesComunicacion: empresa.canalesComunicacion || [],
        redesSociales: empresa.redesSociales || []
      },
      estado: empresa.activo === false ? 'Inactivo' : (empresa.activo === true ? 'Activo' : 'Pendiente'),
      plan: empresa.subscriptionPlan || 'freemium',
      fechaRegistro: empresa.date_edit ? new Date(empresa.date_edit._seconds * 1000) : new Date()
    }));
  }

  filtrarClientes(): void {
    if (!this.clientes) {
      this.clientesFiltrados = [];
      return;
    }
    this.clientesFiltrados = this.clientes.filter(cliente => {
      const filtro = this.filtroNombre.toLowerCase();
      const nombre = cliente.empresa?.nombre?.toLowerCase() || '';
      const nit = cliente.empresa?.nit?.toLowerCase() || '';
      const email = cliente.empresa?.emailContacto?.toLowerCase() || '';

      const coincideTexto = !filtro || nombre.includes(filtro) || nit.includes(filtro) || email.includes(filtro);
      const coincideEstado = !this.filtroEstado || cliente.estado === this.filtroEstado;
      return coincideTexto && coincideEstado;
    });
  }

  refreshData(): void {
    this.cargarClientes();
  }

  exportData(): void {
    this.notificationService.info('Info', 'Exportacion en desarrollo');
  }

  editarCliente(cliente: Cliente): void {
    this.notificationService.info('Info', 'Edicion en desarrollo');
  }

  verDetalles(cliente: Cliente): void {
    this.clienteSeleccionado = cliente;
    this.companiesService.getCompanyById(cliente.id.toString())
      .pipe(catchError(() => of(null)))
      .subscribe(data => {
        if (data) {
          this.clienteSeleccionado = {
            ...cliente,
            empresa: {
              ...cliente.empresa,
              sedes: data.sedes || cliente.empresa.sedes,
              contactos: data.contactos || cliente.empresa.contactos,
              horarios: data.horarios || data.horarioPV || cliente.empresa.horarios,
              marketplaces: data.marketplaces || data.marketPlace || cliente.empresa.marketplaces,
              canalesComunicacion: data.canalesComunicacion || cliente.empresa.canalesComunicacion,
              redesSociales: data.redesSociales || cliente.empresa.redesSociales
            }
          };
        }
      });
  }

  cambiarEstado(cliente: Cliente, nuevoEstado: 'Activo' | 'Inactivo'): void {
    const statusBool = nuevoEstado === 'Activo';
    this.companiesService.updateCompanyStatus(cliente.id.toString(), statusBool as any)
      .pipe(catchError(() => {
        this.notificationService.error('Error', 'No se pudo cambiar el estado');
        return of(null);
      }))
      .subscribe((res: any) => {
        if (res?.success) {
          const index = this.clientes.findIndex(c => c.id === cliente.id);
          if (index !== -1) {
            this.clientes[index].estado = nuevoEstado;
            this.filtrarClientes();
            this.notificationService.success('Listo', `Estado cambiado a ${nuevoEstado}`);
          }
        }
      });
  }

  eliminarCliente(cliente: Cliente): void {
    if (!confirm(`Eliminar "${cliente.empresa.nombre}"? Esta accion no se puede deshacer.`)) return;

    this.companiesService.deleteCompany(cliente.id.toString())
      .pipe(catchError(() => {
        this.notificationService.error('Error', 'No se pudo eliminar');
        return of(null);
      }))
      .subscribe((res: any) => {
        if (res?.success) {
          this.clientes = this.clientes.filter(c => c.id !== cliente.id);
          this.filtrarClientes();
          this.notificationService.success('Listo', 'Empresa eliminada');
        }
      });
  }

  openNewClientModal(): void {
    this.notificationService.info('Info', 'Creacion de empresa en desarrollo');
  }

  toggleViewMode(): void {
    this.viewMode = this.viewMode === 'table' ? 'cards' : 'table';
  }

  getInitials(nombre: string): string {
    if (!nombre) return '?';
    return nombre.split(' ').map(w => w[0]).join('').substring(0, 2).toUpperCase();
  }

  getClienteColor(cliente: Cliente): string {
    switch (cliente.estado) {
      case 'Activo': return 'success';
      case 'Inactivo': return 'danger';
      case 'Pendiente': return 'warning';
      default: return 'secondary';
    }
  }

  private initializeResponsiveView(): void {
    if (window.innerWidth < 768) {
      this.viewMode = 'cards';
    }
  }
}
