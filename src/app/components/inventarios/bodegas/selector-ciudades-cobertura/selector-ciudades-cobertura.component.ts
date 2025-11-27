import { Component, Input, OnInit } from '@angular/core';
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';
import { DaneCodesService } from '../../../../shared/services/dane-codes.service';
import { MunicipioDane } from '../../../../shared/data/colombia-dane-codes';
import { CiudadCobertura } from '../../../../shared/models/inventarios/bodega.model';

@Component({
  selector: 'app-selector-ciudades-cobertura',
  templateUrl: './selector-ciudades-cobertura.component.html',
  styleUrls: ['./selector-ciudades-cobertura.component.scss']
})
export class SelectorCiudadesCoberturaComponent implements OnInit {
  @Input() ciudadesSeleccionadas: CiudadCobertura[] = [];

  departamentos: string[] = [];
  departamentoSeleccionado: string = '';
  municipiosFiltrados: MunicipioDane[] = [];
  searchQuery: string = '';
  cargando: boolean = false;

  // Track selected cities by DANE code for quick lookup
  seleccionadasMap: Map<string, CiudadCobertura> = new Map();

  constructor(
    public activeModal: NgbActiveModal,
    private daneCodesService: DaneCodesService
  ) {}

  ngOnInit(): void {
    // Load departments
    this.daneCodesService.getDepartamentos().subscribe(deptos => {
      this.departamentos = deptos;
    });

    // Initialize selection map from input
    if (this.ciudadesSeleccionadas) {
      this.ciudadesSeleccionadas.forEach(c => {
        this.seleccionadasMap.set(c.codigo, c);
      });
    }
  }

  onDepartamentoChange(): void {
    this.searchQuery = '';
    if (this.departamentoSeleccionado) {
      this.cargando = true;
      this.daneCodesService.getMunicipiosByDepartamento(this.departamentoSeleccionado)
        .subscribe(municipios => {
          this.municipiosFiltrados = municipios;
          this.cargando = false;
        });
    } else {
      this.municipiosFiltrados = [];
    }
  }

  onSearch(): void {
    if (this.searchQuery.length >= 2) {
      this.cargando = true;
      this.departamentoSeleccionado = '';
      this.daneCodesService.searchMunicipios(this.searchQuery)
        .subscribe(results => {
          this.municipiosFiltrados = results;
          this.cargando = false;
        });
    } else if (this.searchQuery.length === 0 && !this.departamentoSeleccionado) {
      this.municipiosFiltrados = [];
    }
  }

  isSelected(municipio: MunicipioDane): boolean {
    return this.seleccionadasMap.has(municipio.codigo);
  }

  toggleSelection(municipio: MunicipioDane): void {
    if (this.seleccionadasMap.has(municipio.codigo)) {
      this.seleccionadasMap.delete(municipio.codigo);
    } else {
      this.seleccionadasMap.set(municipio.codigo, {
        codigo: municipio.codigo,
        nombre: municipio.nombre,
        departamento: municipio.departamento
      });
    }
  }

  selectAllVisible(): void {
    this.municipiosFiltrados.forEach(m => {
      if (!this.seleccionadasMap.has(m.codigo)) {
        this.seleccionadasMap.set(m.codigo, {
          codigo: m.codigo,
          nombre: m.nombre,
          departamento: m.departamento
        });
      }
    });
  }

  deselectAllVisible(): void {
    this.municipiosFiltrados.forEach(m => {
      this.seleccionadasMap.delete(m.codigo);
    });
  }

  removeCity(codigo: string): void {
    this.seleccionadasMap.delete(codigo);
  }

  guardar(): void {
    const ciudades = Array.from(this.seleccionadasMap.values());
    this.activeModal.close(ciudades);
  }

  cancelar(): void {
    this.activeModal.dismiss();
  }

  get selectedCount(): number {
    return this.seleccionadasMap.size;
  }

  get selectedCities(): CiudadCobertura[] {
    return Array.from(this.seleccionadasMap.values())
      .sort((a, b) => a.departamento.localeCompare(b.departamento) || a.nombre.localeCompare(b.nombre));
  }

  // Group selected cities by department for display
  get selectedByDepartment(): { departamento: string; ciudades: CiudadCobertura[] }[] {
    const groups = new Map<string, CiudadCobertura[]>();

    this.seleccionadasMap.forEach(ciudad => {
      const existing = groups.get(ciudad.departamento) || [];
      existing.push(ciudad);
      groups.set(ciudad.departamento, existing);
    });

    return Array.from(groups.entries())
      .map(([departamento, ciudades]) => ({
        departamento,
        ciudades: ciudades.sort((a, b) => a.nombre.localeCompare(b.nombre))
      }))
      .sort((a, b) => a.departamento.localeCompare(b.departamento));
  }
}
