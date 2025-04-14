import { Component, Input, OnInit, AfterViewInit, ViewChild, ElementRef } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';
@Component({
  selector: 'app-crear-bodegas',
  templateUrl: './crear-bodegas.component.html',
  styleUrls: ['./crear-bodegas.component.scss']
})
export class CrearBodegasComponent implements OnInit, AfterViewInit {

  @Input() bodegaData: any;
  @Input() isEditMode = false;

  bodegaForm: FormGroup;
  tiposBodega = ['Física', 'Transaccional'];
  paises = ['Colombia', 'Ecuador', 'Perú', 'Chile', 'Argentina'];
  departamentos: string[] = [];
  ciudades: string[] = [];

  @ViewChild('mapContainer', { static: false }) mapContainer?: ElementRef;
  map: any;
  marker: any;
  leafletLoaded = false;

  constructor(
    private fb: FormBuilder,
    public activeModal: NgbActiveModal
  ) {
    this.bodegaForm = this.fb.group({
      id: [''],
      nombre: ['', Validators.required],
      idBodega: ['', [Validators.required, Validators.pattern(/^BOD-[A-Z0-9]{3,}$/)]],
      direccion: [''],
      coordenadas: [''],
      ciudad: [''],
      departamento: [''],
      pais: [''],
      tipo: ['Física', Validators.required]
    });
  }

  ngOnInit(): void {
    if (this.bodegaData) {
      this.bodegaForm.patchValue(this.bodegaData);
    }

    this.bodegaForm.get('tipo')?.valueChanges.subscribe(tipo => {
      this.actualizarValidaciones(tipo);
    });

    this.bodegaForm.get('pais')?.valueChanges.subscribe(pais => {
      this.cargarDepartamentos(pais);
    });

    this.bodegaForm.get('departamento')?.valueChanges.subscribe(depto => {
      this.cargarCiudades(depto);
    });
  }

  ngAfterViewInit(): void {
    if (this.bodegaForm.get('tipo')?.value === 'Física') {
      this.initMap();
    }
    this.bodegaForm.get('tipo')?.valueChanges.subscribe(tipo => {
      if (tipo === 'Física') {
        setTimeout(() => this.initMap(), 200);
      } else {
        this.destroyMap();
      }
    });
  }

  async initMap() {
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
      this.bodegaForm.get('coordenadas')?.setValue(`${lat.toFixed(6)}, ${lng.toFixed(6)}`);
      if (this.marker) {
        this.marker.setLatLng([lat, lng]);
      } else {
        this.marker = L.marker([lat, lng]).addTo(this.map);
      }
    });
    // Si ya hay coordenadas, mostrar el marcador
    const coords = this.bodegaForm.get('coordenadas')?.value;
    if (coords) {
      const [lat, lng] = coords.split(',').map((v: string) => parseFloat(v));
      this.marker = L.marker([lat, lng]).addTo(this.map);
      this.map.setView([lat, lng], 13);
    }
  }

  destroyMap() {
    if (this.map) {
      this.map.remove();
      this.map = null;
      this.marker = null;
      this.leafletLoaded = false;
    }
  }

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

  actualizarValidaciones(tipo: string) {
    const controles = ['direccion', 'coordenadas', 'ciudad', 'departamento', 'pais'];
    
    controles.forEach(control => {
      const formControl = this.bodegaForm.get(control);
      if (tipo === 'Física') {
        formControl?.setValidators([Validators.required]);
      } else {
        formControl?.clearValidators();
        formControl?.setValue('');
      }
      formControl?.updateValueAndValidity();
    });
  }

  cargarDepartamentos(pais: string) {
    // Simulación de carga de departamentos
    this.departamentos = pais === 'Colombia' ? 
      ['Bogotá D.C.', 'Antioquia', 'Valle del Cauca'] : 
      ['Departamento 1', 'Departamento 2'];
    this.bodegaForm.get('departamento')?.setValue('');
  }

  cargarCiudades(departamento: string) {
    // Simulación de carga de ciudades
    this.ciudades = departamento === 'Bogotá D.C.' ? 
      ['Bogotá'] : 
      ['Ciudad 1', 'Ciudad 2'];
    this.bodegaForm.get('ciudad')?.setValue('');
  }

  guardarBodega() {
    if (this.bodegaForm.invalid) {
      this.marcarControlesComoTocados();
      return;
    }

    this.activeModal.close(this.bodegaForm.value);
  }

  cancelar() {
    this.activeModal.dismiss();
  }

  private marcarControlesComoTocados() {
    Object.values(this.bodegaForm.controls).forEach(control => {
      control.markAsTouched();
    });
  }

}
