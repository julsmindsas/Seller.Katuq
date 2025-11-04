import { Component, OnInit, OnDestroy, Input, Output, EventEmitter, AfterViewInit, ViewChild, ElementRef } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { MessageService } from 'primeng/api';
import { HttpClient } from '@angular/common/http';
import { Bodega } from '../../../shared/models/inventarios/bodega.model';
import { BodegaService } from '../../../shared/services/bodegas/bodega.service';

/**
 * Step: Warehouses Configuration
 * Configuración de bodegas para gestión de inventario
 */
@Component({
  selector: 'app-warehouses-step',
  templateUrl: './warehouses-step.component.html',
  styleUrls: ['./warehouses-step.component.scss']
})
export class WarehousesStepComponent implements OnInit, OnDestroy, AfterViewInit {
  @Input() initialData: any = null;
  @Input() aiSuggestion: any = null;

  @Output() dataChange = new EventEmitter<any>();
  @Output() stepComplete = new EventEmitter<any>();

  private destroy$ = new Subject<void>();

  warehouseForm!: FormGroup;
  warehousesList: Bodega[] = [];
  isLoading = false;
  isSaving = false;
  editingIndex: number | null = null;

  @ViewChild('mapContainer', { static: false }) mapContainer?: ElementRef;
  map: any;
  marker: any;
  leafletLoaded = false;
  showMap = false;

  paises: string[] = [];
  departamentos: string[] = [];
  ciudades: string[] = [];
  cargandoPaises = false;
  cargandoDepartamentos = false;
  cargandoCiudades = false;

  tipoOptions = [
    { label: 'Física', value: 'Física' },
    { label: 'Transaccional', value: 'Transaccional' }
  ];

  constructor(
    private fb: FormBuilder,
    private messageService: MessageService,
    private http: HttpClient,
    private bodegaService: BodegaService
  ) {}

  ngOnInit(): void {
    this.initForm();
    this.loadInitialData();
    this.cargarPaises();

    // Suscripciones para tipo de bodega
    this.warehouseForm.get('tipo')?.valueChanges.subscribe(tipo => {
      this.actualizarValidaciones(tipo);
      this.showMap = tipo === 'Física';
      if (tipo === 'Física' && !this.leafletLoaded) {
        setTimeout(() => this.initMap(), 200);
      }
    });

    // Suscripción para cargar departamentos al cambiar país
    this.warehouseForm.get('pais')?.valueChanges.subscribe(pais => {
      if (pais) {
        this.cargarDepartamentos(pais);
        this.warehouseForm.patchValue({ departamento: '', ciudad: '' });
      } else {
        this.departamentos = [];
        this.ciudades = [];
      }
    });

    // Suscripción para cargar ciudades al cambiar departamento
    this.warehouseForm.get('departamento')?.valueChanges.subscribe(depto => {
      if (depto) {
        this.cargarCiudades(depto);
        this.warehouseForm.patchValue({ ciudad: '' });
      } else {
        this.ciudades = [];
      }
    });
  }

  ngAfterViewInit(): void {
    if (this.warehouseForm.get('tipo')?.value === 'Física') {
      setTimeout(() => this.initMap(), 200);
    }
  }

  ngOnDestroy(): void {
    this.destroyMap();
    this.destroy$.next();
    this.destroy$.complete();
  }

  /**
   * Inicializa el formulario reactivo
   */
  private initForm(): void {
    this.warehouseForm = this.fb.group({
      id: [''],
      nombre: ['', [Validators.required, Validators.minLength(3)]],
      idBodega: ['', [Validators.required, Validators.pattern(/^BOD-[A-Z0-9]{3,}$/)]],
      direccion: [''],
      coordenadas: [''],
      ciudad: [''],
      departamento: [''],
      pais: [''],
      tipo: ['Física', Validators.required]
    });
  }

  /**
   * Carga datos iniciales si existen
   */
  private loadInitialData(): void {
    if (this.initialData?.data && Array.isArray(this.initialData.data)) {
      this.warehousesList = this.initialData.data;

      // Auto-completar si ya hay bodegas configuradas
      if (this.warehousesList.length > 0) {
        console.log('📦 Cargando bodegas existentes:', this.warehousesList.length);
        setTimeout(() => {
          this.stepComplete.emit({ data: this.warehousesList });
        }, 0);
      }
    }

    // Aplicar sugerencia de IA si existe
    if (this.aiSuggestion && !this.initialData) {
      this.applySuggestion();
    }
  }

  /**
   * Aplica sugerencia de IA
   */
  applySuggestion(): void {
    if (!this.aiSuggestion?.suggestedData) return;

    // Si la IA sugiere bodegas, cargarlas en la lista
    if (Array.isArray(this.aiSuggestion.suggestedData)) {
      this.warehousesList = this.aiSuggestion.suggestedData;
    } else if (this.aiSuggestion.suggestedData.warehouses) {
      this.warehousesList = this.aiSuggestion.suggestedData.warehouses;
    }
  }

  /**
   * Genera automáticamente el ID de bodega basado en el nombre
   */
  onNombreChange(): void {
    const nombre = this.warehouseForm.get('nombre')?.value;
    if (nombre && !this.warehouseForm.get('idBodega')?.dirty) {
      const idBodega = 'BOD-' + nombre
        .toUpperCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '') // Remover acentos
        .replace(/[^A-Z0-9]/g, '')
        .substring(0, 10);

      this.warehouseForm.patchValue({ idBodega }, { emitEvent: false });
    }
  }

  /**
   * Actualiza validaciones según el tipo de bodega
   */
  actualizarValidaciones(tipo: string): void {
    const controles = ['direccion', 'coordenadas', 'ciudad', 'departamento', 'pais'];

    controles.forEach(control => {
      const formControl = this.warehouseForm.get(control);
      if (tipo === 'Física') {
        formControl?.setValidators([Validators.required]);
      } else {
        formControl?.clearValidators();
        formControl?.setValue('');
      }
      formControl?.updateValueAndValidity();
    });
  }

  /**
   * Carga lista de países
   */
  cargarPaises(): void {
    this.cargandoPaises = true;
    this.http.get<any>('https://countriesnow.space/api/v0.1/countries/positions').subscribe({
      next: (data) => {
        this.paises = data.data.map((p: any) => p.name).sort();
        this.cargandoPaises = false;
      },
      error: () => {
        this.paises = ['Colombia']; // Fallback
        this.cargandoPaises = false;
      }
    });
  }

  /**
   * Carga departamentos según el país
   */
  cargarDepartamentos(pais: string): void {
    this.cargandoDepartamentos = true;
    this.departamentos = [];
    this.ciudades = [];
    this.http.post<any>('https://countriesnow.space/api/v0.1/countries/states', { country: pais }).subscribe({
      next: (data) => {
        this.departamentos = (data.data.states || []).map((d: any) => d.name).sort();
        this.cargandoDepartamentos = false;
      },
      error: () => {
        this.departamentos = [];
        this.cargandoDepartamentos = false;
      }
    });
  }

  /**
   * Carga ciudades según el departamento
   */
  cargarCiudades(departamento: string): void {
    this.cargandoCiudades = true;
    this.ciudades = [];
    const pais = this.warehouseForm.get('pais')?.value;
    this.http.post<any>('https://countriesnow.space/api/v0.1/countries/state/cities', {
      country: pais,
      state: departamento
    }).subscribe({
      next: (data) => {
        this.ciudades = (data.data || []).sort();
        this.cargandoCiudades = false;
      },
      error: () => {
        this.ciudades = [];
        this.cargandoCiudades = false;
      }
    });
  }

  /**
   * Inicializa el mapa de Leaflet
   */
  async initMap(): Promise<void> {
    if (this.leafletLoaded) return;
    if (!(window as any).L) {
      await this.loadLeaflet();
    }
    this.leafletLoaded = true;
    const L = (window as any).L;
    if (!this.mapContainer) return;

    this.map = L.map(this.mapContainer.nativeElement).setView([4.6097, -74.0817], 6);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors'
    }).addTo(this.map);

    this.map.on('click', (e: any) => {
      const { lat, lng } = e.latlng;
      this.warehouseForm.get('coordenadas')?.setValue(`${lat.toFixed(6)}, ${lng.toFixed(6)}`);
      if (this.marker) {
        this.marker.setLatLng([lat, lng]);
      } else {
        this.marker = L.marker([lat, lng]).addTo(this.map);
      }
    });

    // Si ya hay coordenadas, mostrar el marcador
    const coords = this.warehouseForm.get('coordenadas')?.value;
    if (coords) {
      const [lat, lng] = coords.split(',').map((v: string) => parseFloat(v.trim()));
      if (!isNaN(lat) && !isNaN(lng)) {
        this.marker = L.marker([lat, lng]).addTo(this.map);
        this.map.setView([lat, lng], 13);
      }
    }
  }

  /**
   * Destruye el mapa de Leaflet
   */
  destroyMap(): void {
    if (this.map) {
      this.map.remove();
      this.map = null;
      this.marker = null;
      this.leafletLoaded = false;
    }
  }

  /**
   * Carga la librería Leaflet dinámicamente
   */
  loadLeaflet(): Promise<void> {
    return new Promise((resolve) => {
      const leafletCss = document.createElement('link');
      leafletCss.rel = 'stylesheet';
      leafletCss.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
      document.head.appendChild(leafletCss);

      const script = document.createElement('script');
      script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
      script.onload = () => resolve();
      document.body.appendChild(script);
    });
  }

  /**
   * Agrega una bodega a la lista
   */
  addWarehouse(): void {
    if (this.warehouseForm.invalid) {
      this.markFormAsTouched();
      this.messageService.add({
        severity: 'warn',
        summary: 'Formulario Incompleto',
        detail: 'Por favor completa todos los campos requeridos'
      });
      return;
    }

    const warehouseData: Bodega = this.warehouseForm.value;

    // Verificar que no exista ya una bodega con el mismo ID
    const existsId = this.warehousesList.some(
      (w, idx) => w.idBodega === warehouseData.idBodega && idx !== this.editingIndex
    );

    if (existsId) {
      this.messageService.add({
        severity: 'error',
        summary: 'ID Duplicado',
        detail: 'Ya existe una bodega con este ID'
      });
      return;
    }

    if (this.editingIndex !== null) {
      // Editar bodega existente
      this.warehousesList[this.editingIndex] = warehouseData;
      this.editingIndex = null;
      this.messageService.add({
        severity: 'success',
        summary: 'Actualizado',
        detail: 'Bodega actualizada correctamente'
      });
    } else {
      // Agregar nueva bodega
      this.warehousesList.push(warehouseData);
      this.messageService.add({
        severity: 'success',
        summary: 'Agregado',
        detail: 'Bodega agregada a la lista'
      });
    }

    this.warehouseForm.reset({ tipo: 'Física', pais: '' });
    this.dataChange.emit({ data: this.warehousesList });
  }

  /**
   * Edita una bodega de la lista
   */
  editWarehouse(index: number): void {
    this.editingIndex = index;
    const warehouse = this.warehousesList[index];
    this.warehouseForm.patchValue(warehouse);

    // Scroll al formulario
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  /**
   * Cancela la edición
   */
  cancelEdit(): void {
    this.editingIndex = null;
    this.warehouseForm.reset({ tipo: 'Física', pais: '' });
  }

  /**
   * Elimina una bodega de la lista
   */
  removeWarehouse(index: number): void {
    const warehouse = this.warehousesList[index];
    this.warehousesList.splice(index, 1);
    this.dataChange.emit({ data: this.warehousesList });

    this.messageService.add({
      severity: 'info',
      summary: 'Eliminado',
      detail: `Bodega "${warehouse.nombre}" eliminada`
    });

    // Si estaba editando esta bodega, cancelar
    if (this.editingIndex === index) {
      this.cancelEdit();
    }
  }

  /**
   * Completa el paso y guarda las bodegas
   */
  async onComplete(): Promise<void> {
    if (this.warehousesList.length === 0) {
      this.messageService.add({
        severity: 'warn',
        summary: 'Configuración Incompleta',
        detail: 'Debes agregar al menos una bodega para continuar'
      });
      return;
    }

    this.isSaving = true;

    try {
      // Guardar cada bodega usando BodegaService
      for (const bodega of this.warehousesList) {
        await this.bodegaService.agregarBodega(bodega).toPromise();
      }

      console.log('📦 Bodegas guardadas:', this.warehousesList.length);
      this.stepComplete.emit({ data: this.warehousesList });

      this.messageService.add({
        severity: 'success',
        summary: 'Guardado',
        detail: `${this.warehousesList.length} bodega(s) configurada(s) correctamente`
      });
    } catch (error) {
      console.error('Error guardando bodegas:', error);
      this.messageService.add({
        severity: 'error',
        summary: 'Error',
        detail: 'No se pudo guardar la configuración de bodegas'
      });
    } finally {
      this.isSaving = false;
    }
  }

  /**
   * Marca todos los campos del formulario como touched
   */
  private markFormAsTouched(): void {
    Object.keys(this.warehouseForm.controls).forEach(key => {
      this.warehouseForm.get(key)?.markAsTouched();
    });
  }

  /**
   * Verifica si un campo tiene error
   */
  hasError(field: string, error: string): boolean {
    const control = this.warehouseForm.get(field);
    return !!(control?.hasError(error) && (control?.dirty || control?.touched));
  }

  /**
   * Obtiene el mensaje de error para un campo
   */
  getErrorMessage(field: string): string {
    const control = this.warehouseForm.get(field);

    if (control?.hasError('required')) {
      return 'Este campo es requerido';
    }

    if (control?.hasError('minlength')) {
      const minLength = control.errors?.['minlength'].requiredLength;
      return `Mínimo ${minLength} caracteres`;
    }

    if (control?.hasError('pattern')) {
      if (field === 'idBodega') {
        return 'Debe tener el formato BOD-XXX (ej: BOD-PRINCIPAL)';
      }
      return 'Formato inválido';
    }

    return '';
  }
}
