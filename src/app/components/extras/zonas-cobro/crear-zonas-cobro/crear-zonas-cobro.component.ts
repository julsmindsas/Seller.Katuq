import { Component, OnInit } from '@angular/core';
import { FormGroup, FormBuilder, Validators } from '@angular/forms';
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';
import { MaestroService } from 'src/app/shared/services/maestros/maestro.service';
import { DaneCodesService } from 'src/app/shared/services/dane-codes.service';
import { MunicipioDane } from 'src/app/shared/data/colombia-dane-codes';
import { normalizeZonaCobro } from 'src/app/shared/util/zona-cobro.util';
import Swal from 'sweetalert2';

/**
 * Modal de crear/editar zona de cobro (spec 011 v2, T-09). Una zona de cobro es un
 * PAQUETE: un único registro con nombre + valor + impuesto + una lista de municipios
 * (chips). En edición se precargan TODOS los municipios (todos editables/removibles).
 */
@Component({
  selector: 'app-crear-zonas-cobro',
  templateUrl: './crear-zonas-cobro.component.html',
  styleUrls: ['./crear-zonas-cobro.component.scss']
})
export class CrearZonasCobroComponent implements OnInit {
  zonasCorbroForm: FormGroup;
  editando: boolean = false;
  private editCd: string | null = null;
  ciudades: any[] = [];

  // Propiedades para DANE codes
  departamentosDane: string[] = [];
  municipiosDane: MunicipioDane[] = [];
  searchQueryDane: string = '';
  cargandoMunicipios: boolean = false;
  usarDane: boolean = true;

  // Selección múltiple de municipios (chips) — todos removibles.
  municipiosSeleccionados: MunicipioDane[] = [];
  departamentoSeleccionado: string = '';
  totalMunicipios: number = 0;
  guardando: boolean = false;

  constructor(
    private fb: FormBuilder,
    private service: MaestroService,
    public activeModal: NgbActiveModal,
    private daneCodesService: DaneCodesService
  ) {
    this.zonasCorbroForm = this.fb.group({
      nombreZonaCobro: ['', Validators.required],
      valorZonaCobro: [0, [Validators.required, Validators.min(0)]],
      impuestoZonaCobro: [0, Validators.required]
    });
  }

  ngOnInit(): void {
    try {
      const companyStr = localStorage.getItem('currentCompany') || sessionStorage.getItem('currentCompany');
      this.ciudades = companyStr ? (JSON.parse(companyStr)?.ciudadess?.ciudadesEntrega || []) : [];
    } catch {
      this.ciudades = [];
    }

    this.totalMunicipios = this.daneCodesService.getTotalMunicipios();

    this.daneCodesService.getDepartamentos().subscribe(deptos => this.departamentosDane = deptos);
    this.daneCodesService.getMunicipiosPrincipales().subscribe(p => this.municipiosDane = p);

    // Edición: precargar nombre/valor/impuesto + TODOS los municipios de la zona (paquete).
    const editStr = sessionStorage.getItem('billingZoneEdit');
    if (editStr) {
      try {
        const data = JSON.parse(editStr);
        this.editando = true;
        this.editCd = data.cd || null;
        this.zonasCorbroForm.patchValue({
          nombreZonaCobro: data.nombreZonaCobro,
          valorZonaCobro: data.valorZonaCobro,
          impuestoZonaCobro: data.impuestoZonaCobro
        });
        const zona = normalizeZonaCobro(data);
        this.municipiosSeleccionados = (zona.municipios || []).map(m => ({
          nombre: m.ciudad,
          codigo: m.codigoDane || '',
          departamento: m.departamento || ''
        } as MunicipioDane));
      } catch {
        this.editando = false;
      }
    }
  }

  // ========== MÉTODOS DANE CODES ==========

  buscarMunicipioDane(query: string): void {
    if (!query || query.length < 2) { this.municipiosDane = []; return; }
    this.cargandoMunicipios = true;
    this.daneCodesService.searchMunicipios(query).subscribe(resultados => {
      this.municipiosDane = resultados;
      this.cargandoMunicipios = false;
    });
  }

  onDepartamentoDaneChange(departamento: string): void {
    this.departamentoSeleccionado = departamento || '';
    if (!departamento) { this.municipiosDane = []; return; }
    this.cargandoMunicipios = true;
    this.daneCodesService.getMunicipiosByDepartamento(departamento).subscribe(municipios => {
      this.municipiosDane = municipios;
      this.cargandoMunicipios = false;
    });
  }

  seleccionarMunicipioDane(municipio: MunicipioDane): void {
    this.agregarMunicipios([municipio]);
    this.daneCodesService.addMunicipioFrecuente(municipio);
    this.searchQueryDane = '';
    this.municipiosDane = [];
  }

  agregarTodosDelDepartamento(): void {
    if (!this.departamentoSeleccionado) {
      Swal.fire({ icon: 'info', title: 'Elige un departamento', text: 'Selecciona un departamento en el filtro para agregar todos sus municipios.' });
      return;
    }
    const depto = this.departamentoSeleccionado;
    this.daneCodesService.getMunicipiosByDepartamento(depto).subscribe(municipios => {
      const nuevos = municipios.filter(m => !this.yaSeleccionado(m));
      if (nuevos.length === 0) {
        Swal.fire({ icon: 'info', title: 'Sin novedades', text: `Todos los municipios de ${depto} ya están en la lista.` });
        return;
      }
      Swal.fire({
        title: `¿Agregar ${nuevos.length} municipios?`,
        text: `Se agregarán ${nuevos.length} municipios de ${depto} a esta zona.`,
        icon: 'question', showCancelButton: true, confirmButtonText: 'Agregar', cancelButtonText: 'Cancelar'
      }).then(res => { if (res.isConfirmed) { this.agregarMunicipios(nuevos); } });
    });
  }

  seleccionarTodosMunicipios(): void {
    this.daneCodesService.getTodosLosMunicipios().subscribe(todos => {
      const nuevos = todos.filter(m => !this.yaSeleccionado(m));
      if (nuevos.length === 0) {
        Swal.fire({ icon: 'info', title: 'Sin novedades', text: 'Todos los municipios ya están en la lista.' });
        return;
      }
      Swal.fire({
        title: `¿Seleccionar todos?`,
        text: `Se agregarán ${nuevos.length} municipios a esta zona de cobro.`,
        icon: 'warning', showCancelButton: true, confirmButtonText: `Agregar ${nuevos.length}`, cancelButtonText: 'Cancelar'
      }).then(res => { if (res.isConfirmed) { this.agregarMunicipios(nuevos); } });
    });
  }

  agregarCiudadEmpresa(label: string): void {
    const ciudad = (label || '').trim();
    if (!ciudad || ciudad === 'Seleccione') { return; }
    this.agregarMunicipios([{ nombre: ciudad, codigo: '', departamento: '' } as MunicipioDane]);
  }

  quitarMunicipio(municipio: MunicipioDane): void {
    const k = this.keyOf(municipio);
    this.municipiosSeleccionados = this.municipiosSeleccionados.filter(m => this.keyOf(m) !== k);
  }

  toggleUsarDane(): void {
    this.usarDane = !this.usarDane;
    if (this.usarDane) {
      this.daneCodesService.getMunicipiosPrincipales().subscribe(p => this.municipiosDane = p);
    }
  }

  // ---------- helpers de selección ----------

  private keyOf(m: MunicipioDane): string {
    return ((m && (m.codigo || `${m.nombre}|${m.departamento}`)) || '').toString().trim().toLowerCase();
  }

  private yaSeleccionado(m: MunicipioDane): boolean {
    const k = this.keyOf(m);
    return this.municipiosSeleccionados.some(x => this.keyOf(x) === k);
  }

  private agregarMunicipios(lista: MunicipioDane[]): void {
    for (const m of lista) {
      if (!m || !m.nombre) { continue; }
      if (!this.yaSeleccionado(m)) { this.municipiosSeleccionados.push(m); }
    }
  }

  totalSeleccionados(): number {
    return this.municipiosSeleccionados.length;
  }

  puedeGuardar(): boolean {
    const f = this.zonasCorbroForm;
    const camposOk = f.get('nombreZonaCobro').valid && f.get('valorZonaCobro').valid && f.get('impuestoZonaCobro').valid;
    return !!camposOk && this.totalSeleccionados() >= 1;
  }

  private invalidarCacheZonas(): void {
    try { sessionStorage.removeItem('allBillingZone'); } catch { /* noop */ }
  }

  private construirPayload(): any {
    const f = this.zonasCorbroForm.value;
    return {
      nombreZonaCobro: f.nombreZonaCobro,
      valorZonaCobro: Number(f.valorZonaCobro),
      impuestoZonaCobro: Number(f.impuestoZonaCobro),
      municipios: this.municipiosSeleccionados.map(m => ({
        ciudad: m.nombre,
        codigoDane: m.codigo || '',
        departamento: m.departamento || ''
      }))
    };
  }

  private mostrarError(e: any): void {
    this.guardando = false;
    const msg = (e && e.error && e.error.error) ? e.error.error : 'No se pudo guardar la zona de cobro.';
    Swal.fire({ icon: 'error', title: 'Error', text: msg });
  }

  // ========== GUARDAR / EDITAR (una zona-paquete) ==========

  guardar(): void {
    if (!this.puedeGuardar()) {
      Swal.fire({ icon: 'info', title: 'Faltan datos', text: 'Completa nombre, valor y agrega al menos un municipio.' });
      return;
    }
    this.guardando = true;
    this.service.createBillingZone(this.construirPayload()).subscribe({
      next: () => {
        this.guardando = false;
        this.invalidarCacheZonas();
        Swal.fire({ title: 'Guardado!', text: 'Zona de cobro creada con éxito', icon: 'success', confirmButtonText: 'Ok' })
          .then(() => this.activeModal.close('success'));
      },
      error: (e) => this.mostrarError(e)
    });
  }

  editar(): void {
    if (!this.puedeGuardar()) {
      Swal.fire({ icon: 'info', title: 'Faltan datos', text: 'Completa nombre, valor y deja al menos un municipio.' });
      return;
    }
    const payload = this.construirPayload();
    payload.cd = this.editCd;
    this.guardando = true;
    this.service.editBillingZone(payload).subscribe({
      next: () => {
        this.guardando = false;
        this.invalidarCacheZonas();
        sessionStorage.removeItem('billingZoneEdit');
        Swal.fire({ title: 'Guardado!', text: 'Zona de cobro actualizada con éxito', icon: 'success', confirmButtonText: 'Ok' })
          .then(() => this.activeModal.close('success'));
      },
      error: (e) => this.mostrarError(e)
    });
  }
}
