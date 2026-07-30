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

  // Spec 011 — selección múltiple de municipios (chips)
  municipiosSeleccionados: MunicipioDane[] = [];
  municipioBase: MunicipioDane | null = null; // en edición: municipio original (no removible)
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
      ciudad: [''], // ya no es requerido: la selección múltiple es la fuente de municipios
      codigoDane: [''],
      departamento: [''],
      nombreZonaCobro: ['', Validators.required],
      valorZonaCobro: [0, Validators.required],
      impuestoZonaCobro: [0, Validators.required],
      impuesto: [0],
      total: [0]
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

    this.totalMunicipios = this.daneCodesService.getTotalMunicipios();

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
        // El municipio original de la zona editada queda como base (no removible).
        this.municipioBase = {
          nombre: data.ciudad,
          codigo: data.codigoDane || '',
          departamento: data.departamento || ''
        };
      } catch {
        this.editando = false;
      }
    }
  }

  // ========== MÉTODOS DANE CODES ==========

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

  onDepartamentoDaneChange(departamento: string): void {
    this.departamentoSeleccionado = departamento || '';
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

  /** Click en un municipio de la lista → lo agrega a la selección (sin duplicar). */
  seleccionarMunicipioDane(municipio: MunicipioDane): void {
    this.agregarMunicipios([municipio]);
    this.daneCodesService.addMunicipioFrecuente(municipio);
    this.searchQueryDane = '';
    this.municipiosDane = [];
  }

  /** Agregar todos los municipios del departamento filtrado (acción masiva → confirma). */
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
        text: `Se agregarán ${nuevos.length} municipios de ${depto} a la selección.`,
        icon: 'question', showCancelButton: true, confirmButtonText: 'Agregar', cancelButtonText: 'Cancelar'
      }).then(res => {
        if (res.isConfirmed) { this.agregarMunicipios(nuevos); }
      });
    });
  }

  /** Seleccionar TODOS los municipios del país (acción masiva → confirma). */
  seleccionarTodosMunicipios(): void {
    this.daneCodesService.getTodosLosMunicipios().subscribe(todos => {
      const nuevos = todos.filter(m => !this.yaSeleccionado(m));
      if (nuevos.length === 0) {
        Swal.fire({ icon: 'info', title: 'Sin novedades', text: 'Todos los municipios ya están en la lista.' });
        return;
      }
      Swal.fire({
        title: `¿Seleccionar todos?`,
        text: `Se agregarán ${nuevos.length} municipios. Al guardar se creará una zona de cobro por cada uno.`,
        icon: 'warning', showCancelButton: true, confirmButtonText: `Agregar ${nuevos.length}`, cancelButtonText: 'Cancelar'
      }).then(res => {
        if (res.isConfirmed) { this.agregarMunicipios(nuevos); }
      });
    });
  }

  /** Modo empresa (sin DANE): agregar una ciudad del catálogo de la empresa a la selección. */
  agregarCiudadEmpresa(label: string): void {
    const ciudad = (label || '').trim();
    if (!ciudad || ciudad === 'Seleccione') { return; }
    this.agregarMunicipios([{ nombre: ciudad, codigo: '', departamento: '' } as MunicipioDane]);
  }

  /** Quitar un municipio de la selección (el base en edición no se puede quitar). */
  quitarMunicipio(municipio: MunicipioDane): void {
    const k = this.keyOf(municipio);
    this.municipiosSeleccionados = this.municipiosSeleccionados.filter(m => this.keyOf(m) !== k);
  }

  toggleUsarDane(): void {
    this.usarDane = !this.usarDane;
    if (this.usarDane) {
      this.daneCodesService.getMunicipiosPrincipales().subscribe(principales => {
        this.municipiosDane = principales;
      });
    }
  }

  // ---------- helpers de selección ----------

  private keyOf(m: MunicipioDane): string {
    return ((m && (m.codigo || `${m.nombre}|${m.departamento}`)) || '').toString().trim().toLowerCase();
  }

  private yaSeleccionado(m: MunicipioDane): boolean {
    const k = this.keyOf(m);
    if (this.municipioBase && this.keyOf(this.municipioBase) === k) return true;
    return this.municipiosSeleccionados.some(x => this.keyOf(x) === k);
  }

  private agregarMunicipios(lista: MunicipioDane[]): void {
    for (const m of lista) {
      if (!m || !m.nombre) continue;
      if (!this.yaSeleccionado(m)) {
        this.municipiosSeleccionados.push(m);
      }
    }
  }

  /** Total de municipios que se procesarán al guardar (incluye el base en edición). */
  totalSeleccionados(): number {
    return this.municipiosSeleccionados.length + (this.editando && this.municipioBase ? 1 : 0);
  }

  puedeGuardar(): boolean {
    const f = this.zonasCorbroForm;
    const camposOk = f.get('nombreZonaCobro').valid && f.get('valorZonaCobro').valid && f.get('impuestoZonaCobro').valid;
    return !!camposOk && this.totalSeleccionados() >= 1;
  }

  private invalidarCacheZonas(): void {
    // Las zonas recién creadas deben verse sin recargar (checkout, etc.).
    try { sessionStorage.removeItem('allBillingZone'); } catch { /* noop */ }
  }

  private municipiosPayload(lista: MunicipioDane[]): any[] {
    return lista.map(m => ({ ciudad: m.nombre, codigoDane: m.codigo || '', departamento: m.departamento || '' }));
  }

  private mostrarResumen(r: any, tituloExtra: string = ''): void {
    const creadas = Number(r?.creadas) || 0;
    const omitidas = Array.isArray(r?.omitidas) ? r.omitidas : [];
    const fallidas = Array.isArray(r?.fallidas) ? r.fallidas : [];
    const detalle = (arr: any[], label: string) => arr.length
      ? `<details style="margin-top:6px"><summary>${label} (${arr.length})</summary>
         <div style="max-height:120px;overflow:auto;text-align:left;font-size:12px">
         ${arr.map(x => x.ciudad || JSON.stringify(x)).join('<br>')}</div></details>`
      : '';
    Swal.fire({
      icon: fallidas.length ? 'warning' : 'success',
      title: 'Resumen del alta' + (tituloExtra ? ` — ${tituloExtra}` : ''),
      html: `<div style="text-align:left">
               <b>Creadas:</b> ${creadas}<br>
               <b>Omitidas (ya existían):</b> ${omitidas.length}<br>
               <b>Fallidas:</b> ${fallidas.length}
               ${detalle(omitidas, 'Ver omitidas')}
               ${detalle(fallidas, 'Ver fallidas')}
             </div>`,
      confirmButtonText: 'Ok'
    }).then(() => { this.activeModal.close('success'); });
  }

  private calcularImpuestoTotal(): void {
    const v = this.zonasCorbroForm.value;
    this.zonasCorbroForm.value.impuesto = v.valorZonaCobro * (v.impuestoZonaCobro / 100);
    this.zonasCorbroForm.value.total = v.valorZonaCobro + (v.valorZonaCobro * (v.impuestoZonaCobro / 100));
  }

  // ========== GUARDAR / EDITAR ==========

  guardar() {
    if (this.totalSeleccionados() < 1) {
      Swal.fire({ icon: 'info', title: 'Selecciona municipios', text: 'Agrega al menos un municipio a la lista.' });
      return;
    }
    const f = this.zonasCorbroForm.value;

    // 1 municipio → creación individual (comportamiento actual).
    if (this.municipiosSeleccionados.length === 1) {
      const only = this.municipiosSeleccionados[0];
      this.zonasCorbroForm.patchValue({ ciudad: only.nombre, codigoDane: only.codigo || '', departamento: only.departamento || '' });
      this.calcularImpuestoTotal();
      this.service.createBillingZone(this.zonasCorbroForm.value).subscribe(() => {
        this.invalidarCacheZonas();
        Swal.fire({ title: 'Guardado!', text: 'Guardado con éxito', icon: 'success', confirmButtonText: 'Ok' })
          .then(() => this.activeModal.close('success'));
      });
      return;
    }

    // >1 municipio → alta en lote (backend crea una zona por municipio).
    const payload = {
      nombreZonaCobro: f.nombreZonaCobro,
      valorZonaCobro: f.valorZonaCobro,
      impuestoZonaCobro: f.impuestoZonaCobro,
      municipios: this.municipiosPayload(this.municipiosSeleccionados)
    };
    this.guardando = true;
    this.service.createBillingZonesBatch(payload).subscribe((r: any) => {
      this.guardando = false;
      this.invalidarCacheZonas();
      this.mostrarResumen(r);
    }, () => {
      this.guardando = false;
      Swal.fire({ icon: 'error', title: 'Error', text: 'No se pudo completar el alta en lote.' });
    });
  }

  editar() {
    this.calcularImpuestoTotal();
    this.zonasCorbroForm.value['cd'] = JSON.parse(sessionStorage.getItem('billingZoneEdit')).cd;

    const anadidos = this.municipiosSeleccionados; // el base no se incluye (se actualiza aparte)

    this.service.editBillingZone(this.zonasCorbroForm.value).subscribe((r) => {
      if (!r) { return; }
      this.invalidarCacheZonas();

      if (anadidos.length === 0) {
        Swal.fire({ title: 'Guardado!', text: 'Editado con éxito', icon: 'success', confirmButtonText: 'Ok' })
          .then(() => { sessionStorage.removeItem('billingZoneEdit'); this.activeModal.close('success'); });
        return;
      }

      // Crear zonas nuevas para los municipios añadidos (mismo nombre/valor/impuesto).
      const f = this.zonasCorbroForm.value;
      const payload = {
        nombreZonaCobro: f.nombreZonaCobro,
        valorZonaCobro: f.valorZonaCobro,
        impuestoZonaCobro: f.impuestoZonaCobro,
        municipios: this.municipiosPayload(anadidos)
      };
      this.guardando = true;
      this.service.createBillingZonesBatch(payload).subscribe((res: any) => {
        this.guardando = false;
        this.invalidarCacheZonas();
        sessionStorage.removeItem('billingZoneEdit');
        this.mostrarResumen(res, 'zona editada + municipios añadidos');
      }, () => {
        this.guardando = false;
        sessionStorage.removeItem('billingZoneEdit');
        Swal.fire({ icon: 'warning', title: 'Zona editada', text: 'La zona se editó, pero falló la creación de los municipios añadidos.' })
          .then(() => this.activeModal.close('success'));
      });
    });
  }
}
