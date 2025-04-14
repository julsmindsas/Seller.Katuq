import { Component, Input, OnInit, AfterViewInit, ViewChild, ElementRef } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';
import { HttpClient } from '@angular/common/http';
import { BodegaService } from '../../../../shared/services/bodegas/bodega.service';
import { ToastrService } from 'ngx-toastr';

@Component({
  selector: 'app-crear-bodegas',
  templateUrl: './crear-bodegas.component.html',
  styleUrls: ['./crear-bodegas.component.scss']
})
export class CrearBodegasComponent implements OnInit, AfterViewInit {

  @Input() bodegaData: any;
  @Input() isEditMode = false;

  bodegaForm: FormGroup;
  paises: string[] = [];
  departamentos: string[] = [];
  ciudades: string[] = [];
  cargandoPaises = false;
  cargandoDepartamentos = false;
  cargandoCiudades = false;
  tiposBodega: string[] = ['Física', 'Transaccional'];

  @ViewChild('mapContainer', { static: false }) mapContainer?: ElementRef;
  map: any;
  marker: any;
  leafletLoaded = false;

  constructor(
    private fb: FormBuilder,
    public activeModal: NgbActiveModal,
    private http: HttpClient,
    private bodegaService: BodegaService,
    private toastr: ToastrService
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

    // Suscripción para cargar departamentos al cambiar país
    this.bodegaForm.get('pais')?.valueChanges.subscribe(pais => {
      if (pais) {
        this.cargarDepartamentos(pais);
        this.bodegaForm.get('departamento')?.setValue('');
        this.bodegaForm.get('ciudad')?.setValue('');
      } else {
        this.departamentos = [];
        this.ciudades = [];
        this.bodegaForm.get('departamento')?.setValue('');
        this.bodegaForm.get('ciudad')?.setValue('');
      }
    });

    // Suscripción para cargar ciudades al cambiar departamento
    this.bodegaForm.get('departamento')?.valueChanges.subscribe(depto => {
      if (depto) {
        this.cargarCiudades(depto);
        this.bodegaForm.get('ciudad')?.setValue('');
      } else {
        this.ciudades = [];
        this.bodegaForm.get('ciudad')?.setValue('');
      }
    });

    this.cargarPaises();
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

  cargarPaises() {
    this.cargandoPaises = true;
    this.http.get<any>('https://countriesnow.space/api/v0.1/countries/positions').subscribe({
      next: (data) => {
        this.paises = data.data.map((p: any) => p.name).sort();
        this.cargandoPaises = false;
      },
      error: () => {
        this.paises = [];
        this.cargandoPaises = false;
      }
    });
  }

  cargarDepartamentos(pais: string) {
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

  cargarCiudades(departamento: string) {
    this.cargandoCiudades = true;
    this.ciudades = [];
    const pais = this.bodegaForm.get('pais')?.value;
    this.http.post<any>('https://countriesnow.space/api/v0.1/countries/state/cities', { country: pais, state: departamento }).subscribe({
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

  guardarBodega() {
    if (this.bodegaForm.invalid) {
      this.marcarControlesComoTocados();
      return;
    }
    const bodega = this.bodegaForm.value;
    if (this.isEditMode) {
      this.bodegaService.actualizarBodega(bodega).subscribe({
        next: () => {
          this.toastr.success('Bodega actualizada correctamente', 'Éxito');
          this.activeModal.close(true);
        },
        error: () => {
          this.toastr.error('Error al actualizar la bodega', 'Error');
        }
      });
    } else {
      this.bodegaService.agregarBodega(bodega).subscribe({
        next: () => {
          this.toastr.success('Bodega creada correctamente', 'Éxito');
          this.activeModal.close(true);
        },
        error: () => {
          this.toastr.error('Error al crear la bodega', 'Error');
        }
      });
    }
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
