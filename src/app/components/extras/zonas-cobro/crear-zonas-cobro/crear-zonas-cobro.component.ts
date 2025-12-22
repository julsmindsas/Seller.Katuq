import { Component, OnInit } from '@angular/core';
import { FormGroup, FormBuilder, Validators } from '@angular/forms';
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';
import { MaestroService } from 'src/app/shared/services/maestros/maestro.service';
import { DaneCodesService } from 'src/app/shared/services/dane-codes.service';
import { MunicipioDane } from 'src/app/shared/data/colombia-dane-codes';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-crear-zonas-cobro',
  templateUrl: './crear-zonas-cobro.component.html',
  styleUrls: ['./crear-zonas-cobro.component.scss']
})
export class CrearZonasCobroComponent implements OnInit {
  zonasCorbroForm: FormGroup;
  editando: boolean = false;
  ciudades: string[] = [];

  // Propiedades para DANE codes
  departamentosDane: string[] = [];
  municipiosDane: MunicipioDane[] = [];
  searchQueryDane: string = '';
  cargandoMunicipios: boolean = false;
  usarDane: boolean = true; // Por defecto usar DANE

  constructor(
    private fb: FormBuilder,
    private service: MaestroService,
    public activeModal: NgbActiveModal,
    private daneCodesService: DaneCodesService
  ) {
    this.zonasCorbroForm = this.fb.group({
      ciudad: ['Seleccione', Validators.required],
      codigoDane: [''], // Código DANE del municipio
      departamento: [''], // Departamento del municipio
      nombreZonaCobro: ['', Validators.required],
      valorZonaCobro: [0, Validators.required],
      impuestoZonaCobro: [0, Validators.required],
      impuesto: [0, Validators.required],
      total: [0, Validators.required]
    });
  }

  ngOnInit(): void {
    // Cargar ciudades desde localStorage o sessionStorage de forma segura
    try {
      const companyStr = localStorage.getItem('currentCompany') || sessionStorage.getItem('currentCompany');
      if (companyStr) {
        const company = JSON.parse(companyStr);
        this.ciudades = company?.ciudadess?.ciudadesEntrega || [];
      } else {
        this.ciudades = [];
      }
    } catch {
      this.ciudades = [];
    }

    // Cargar departamentos DANE
    this.daneCodesService.getDepartamentos().subscribe(deptos => {
      this.departamentosDane = deptos;
    });

    // Cargar municipios principales como sugerencias iniciales
    this.daneCodesService.getMunicipiosPrincipales().subscribe(principales => {
      this.municipiosDane = principales;
    });

    // Cargar datos a editar del sessionStorage (si existen) de forma segura
    const editStr = sessionStorage.getItem('billingZoneEdit');
    if (editStr) {
      try {
        const data = JSON.parse(editStr);
        this.editando = true;
        this.zonasCorbroForm.patchValue(data);
      } catch {
        this.editando = false;
      }
    }
  }

  // ========== MÉTODOS DANE CODES ==========

  /**
   * Busca municipios por texto (nombre o código DANE)
   */
  buscarMunicipioDane(query: string): void {
    if (!query || query.length < 2) {
      this.municipiosDane = [];
      return;
    }
    this.cargandoMunicipios = true;
    this.daneCodesService.searchMunicipios(query).subscribe(resultados => {
      this.municipiosDane = resultados;
      this.cargandoMunicipios = false;
    });
  }

  /**
   * Filtra municipios por departamento
   */
  onDepartamentoDaneChange(departamento: string): void {
    if (!departamento) {
      this.municipiosDane = [];
      return;
    }
    this.cargandoMunicipios = true;
    this.daneCodesService.getMunicipiosByDepartamento(departamento).subscribe(municipios => {
      this.municipiosDane = municipios;
      this.cargandoMunicipios = false;
    });
  }

  /**
   * Selecciona un municipio DANE y actualiza el formulario
   */
  seleccionarMunicipioDane(municipio: MunicipioDane): void {
    this.zonasCorbroForm.patchValue({
      ciudad: municipio.nombre,
      codigoDane: municipio.codigo,
      departamento: municipio.departamento
    });
    // Guardar como frecuente
    this.daneCodesService.addMunicipioFrecuente(municipio);
    // Limpiar búsqueda
    this.searchQueryDane = '';
    this.municipiosDane = [];
  }

  /**
   * Alterna entre usar ciudades de empresa o DANE
   */
  toggleUsarDane(): void {
    this.usarDane = !this.usarDane;
    if (this.usarDane) {
      // Cargar municipios principales
      this.daneCodesService.getMunicipiosPrincipales().subscribe(principales => {
        this.municipiosDane = principales;
      });
    }
  }

  guardar() {
    this.zonasCorbroForm.value.impuesto = (this.zonasCorbroForm.value.valorZonaCobro * (this.zonasCorbroForm.value.impuestoZonaCobro / 100));
    this.zonasCorbroForm.value.total = (this.zonasCorbroForm.value.valorZonaCobro + (this.zonasCorbroForm.value.valorZonaCobro * (this.zonasCorbroForm.value.impuestoZonaCobro / 100)));
    
    this.service.createBillingZone(this.zonasCorbroForm.value).subscribe(r => {
      Swal.fire({
        title: 'Guardado!',
        text: 'Guardado con éxito',
        icon: 'success',
        confirmButtonText: 'Ok'
      }).then(() => {
        this.activeModal.close('success');
      });
    });
  }

  editar() {
    this.zonasCorbroForm.value.impuesto = (this.zonasCorbroForm.value.valorZonaCobro * (this.zonasCorbroForm.value.impuestoZonaCobro / 100));
    this.zonasCorbroForm.value.total = (this.zonasCorbroForm.value.valorZonaCobro + (this.zonasCorbroForm.value.valorZonaCobro * (this.zonasCorbroForm.value.impuestoZonaCobro / 100)));
    this.zonasCorbroForm.value['cd'] = JSON.parse(sessionStorage.getItem('billingZoneEdit')).cd;
    
    this.service.editBillingZone(this.zonasCorbroForm.value).subscribe(r => {
      if (r) {
        Swal.fire({
          title: 'Guardado!',
          text: 'Editado con éxito',
          icon: 'success',
          confirmButtonText: 'Ok'
        }).then(() => {
          sessionStorage.removeItem('billingZoneEdit');
          this.activeModal.close('success');
        });
      }
    });
  }
}