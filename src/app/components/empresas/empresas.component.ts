import { Component, ViewChild, OnInit, OnDestroy } from '@angular/core';
import { Router } from '@angular/router';
import { DatatableComponent, ColumnMode } from "@swimlane/ngx-datatable";
import { MaestroService } from '../../shared/services/maestros/maestro.service';
import { BreakpointObserver, Breakpoints } from '@angular/cdk/layout';
import { Subject } from 'rxjs';
import { takeUntil, map } from 'rxjs/operators';
import { DataStoreService } from '../../shared/services/dataStoreService';

// Definir interfaz para la estructura de datos de Empresa
interface Empresa {
  nit: string;
  nombre: string;
  emailContactoGeneral: string;
  nomComercial: string;
  fijo?: number | string | null; // Permitir null/undefined y string si es necesario
  cel?: number | string | null;  // Permitir null/undefined y string si es necesario
  pais: string;
  // Añadir otras propiedades que se usen de la empresa si existen
  [key: string]: any; // Para permitir otras propiedades no definidas explícitamente si es necesario
}


@Component({
  selector: 'app-empresas',
  templateUrl: './empresas.component.html',
  styleUrls: ['./empresas.component.scss']
})
export class EmpresasComponent implements OnInit, OnDestroy {
  @ViewChild(DatatableComponent, { static: false }) table: DatatableComponent;

  cargando = true;

  rows: Empresa[] = [];
  temp: Empresa[] = [];

  // Propiedades eliminadas: userRol, userNit, NombreUsuario, Vendedor, empresas, closeResult, paises

  ColumnMode = ColumnMode;

  isMobile = false;
  isJulsmind = false;

  private destroy$ = new Subject<void>(); // Subject para gestionar la cancelación de suscripciones

  constructor(
    private service: MaestroService,
    private router: Router,
    private breakpointObserver: BreakpointObserver,
    private dataStoreService: DataStoreService // Inyectar DataStoreService
  ) {
    const currentCompany = JSON.parse(sessionStorage.getItem("currentCompany") || '{}');
    this.isJulsmind = currentCompany.nomComercial === 'Julsmind';

    // Observar cambios en el tamaño de la pantalla para actualizar isMobile
    this.breakpointObserver.observe([
      Breakpoints.HandsetPortrait,
      Breakpoints.TabletPortrait
    ]).pipe(
      map(result => result.matches),
      takeUntil(this.destroy$)
    ).subscribe(matches => {
      this.isMobile = matches;
    });
  }

  ngOnInit(): void {
    this.cargarDatos();
    // La detección de móvil ahora es reactiva y se maneja en el constructor
  }

  ngOnDestroy(): void {
    // Completar el Subject para cancelar todas las suscripciones pendientes
    this.destroy$.next();
    this.destroy$.complete();
  }

  cargarDatos() {
    this.cargando = true;
    this.service.consultarEmpresas()
      .pipe(takeUntil(this.destroy$)) // Cancelar la suscripción al destruir el componente
      .subscribe({
        next: (datos: any) => { // Revertir temporalmente a 'any' debido al tipo de retorno del servicio
          this.temp = [...datos];
          this.rows = datos;
          this.cargando = false;
        },
        error: (err) => {
          console.error('Error fetching empresas:', err);
          this.cargando = false;
        }
      });
  }

  crearEmpresa() {
    this.dataStoreService.remove('infoFormsCompany').then(() => {
      this.router.navigateByUrl('empresas/crearEmpresa');
    });
  };

  editarEmpresa(row: Empresa) { // Usar la interfaz Empresa
    console.log(row);
    this.dataStoreService.set('infoFormsCompany', row).then(() => {
      this.router.navigateByUrl('empresas/crearEmpresa');
    });
  }

  updateFilter(event: Event) { // Tipar el evento como Event
    const target = event.target as HTMLInputElement; // Castear a HTMLInputElement
    const val = target.value.toLowerCase(); // Obtener valor y convertir a minúsculas una vez

    let temp: Empresa[]; // Usar la interfaz Empresa

    if (this.isMobile) {
      temp = this.temp.filter((d: Empresa) => { // Usar la interfaz Empresa
        const res1 = d.nombre.toLowerCase().includes(val);
        const res3 = d.nomComercial.toLowerCase().includes(val);
        return res1 || res3;
      });
    } else {
      temp = this.temp.filter((d: Empresa) => { // Usar la interfaz Empresa
        const res = d.nit.toLowerCase().includes(val);
        const res1 = d.nombre.toLowerCase().includes(val);
        const res2 = d.emailContactoGeneral.toLowerCase().includes(val);
        const res3 = d.nomComercial.toLowerCase().includes(val);
        // Añadir comprobaciones de nulidad/undefined antes de toString()
        const res4 = (d.fijo?.toString() || '').toLowerCase().includes(val);
        const res5 = (d.cel?.toString() || '').toLowerCase().includes(val);
        const res7 = d.pais.toLowerCase().includes(val);

        return res || res1 || res2 || res3 || res4 || res5 || res7;
      });
    }

    this.rows = temp;
    if (this.table) { // Asegurarse que la tabla existe antes de acceder a offset
        this.table.offset = 0;
    }
  }
}
