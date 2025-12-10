import { Component, Input, OnInit, AfterViewInit, ViewChild, ElementRef } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { NgbActiveModal, NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { HttpClient } from '@angular/common/http';
import { BodegaService } from '../../../../shared/services/bodegas/bodega.service';
import { ToastrService } from 'ngx-toastr';
import { CiudadCobertura } from '../../../../shared/models/inventarios/bodega.model';
import { SelectorCiudadesCoberturaComponent } from '../selector-ciudades-cobertura/selector-ciudades-cobertura.component';
import { DaneCodesService } from '../../../../shared/services/dane-codes.service';
import { GeocodingService } from '../../../../shared/services/geocoding.service';

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

  // Ciudades de cobertura
  coberturaNacional: boolean = false;
  ciudadesCobertura: CiudadCobertura[] = [];

  // Geocodificación
  geocodificando = false;

  // Mapa nombre limpio → nombre original para API
  departamentosMap: { [key: string]: string } = {};

  constructor(
    private fb: FormBuilder,
    public activeModal: NgbActiveModal,
    private modalService: NgbModal,
    private http: HttpClient,
    private bodegaService: BodegaService,
    private toastr: ToastrService,
    private daneService: DaneCodesService,
    private geocodingService: GeocodingService
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
    // Suscripción para tipo de bodega
    this.bodegaForm.get('tipo')?.valueChanges.subscribe(tipo => {
      this.actualizarValidaciones(tipo);
    });

    // Suscripción para cargar departamentos al cambiar país (solo si no es carga inicial)
    this.bodegaForm.get('pais')?.valueChanges.subscribe(pais => {
      if (pais && !this.cargandoEdicion) {
        this.cargarDepartamentos(pais);
        this.bodegaForm.get('departamento')?.setValue('');
        this.bodegaForm.get('ciudad')?.setValue('');
      } else if (!pais) {
        this.departamentos = [];
        this.ciudades = [];
        this.bodegaForm.get('departamento')?.setValue('');
        this.bodegaForm.get('ciudad')?.setValue('');
      }
    });

    // Suscripción para cargar ciudades al cambiar departamento (solo si no es carga inicial)
    this.bodegaForm.get('departamento')?.valueChanges.subscribe(depto => {
      if (depto && !this.cargandoEdicion) {
        this.cargarCiudades(depto);
        this.bodegaForm.get('ciudad')?.setValue('');
      } else if (!depto) {
        this.ciudades = [];
        this.bodegaForm.get('ciudad')?.setValue('');
      }
    });

    // Cargar países y luego manejar modo edición
    this.cargarPaises();

    if (this.bodegaData) {
      this.cargarDatosEdicion();
    }
  }

  // Flag para evitar resetear valores durante carga de edición
  private cargandoEdicion = false;

  /**
   * Carga los datos en cascada para modo edición
   */
  private cargarDatosEdicion(): void {
    this.cargandoEdicion = true;

    // Cargar cobertura
    this.coberturaNacional = this.bodegaData.coberturaNacional || false;
    if (this.bodegaData.ciudadesCobertura) {
      this.ciudadesCobertura = [...this.bodegaData.ciudadesCobertura];
    }

    // Cargar datos básicos primero
    this.bodegaForm.patchValue({
      id: this.bodegaData.id,
      nombre: this.bodegaData.nombre,
      idBodega: this.bodegaData.idBodega,
      tipo: this.bodegaData.tipo,
      direccion: this.bodegaData.direccion,
      coordenadas: this.bodegaData.coordenadas
    });

    // Cargar país y esperar a que se carguen departamentos
    const pais = this.bodegaData.pais;
    const departamento = this.bodegaData.departamento;
    const ciudad = this.bodegaData.ciudad;

    if (pais) {
      this.bodegaForm.get('pais')?.setValue(pais);

      // Cargar departamentos del país
      if (pais === 'Colombia') {
        this.daneService.getDepartamentos().subscribe({
          next: (deptos) => {
            this.departamentos = deptos.sort();

            if (departamento) {
              this.bodegaForm.get('departamento')?.setValue(departamento);

              // Cargar ciudades del departamento
              this.daneService.getMunicipiosByDepartamento(departamento).subscribe({
                next: (municipios) => {
                  this.ciudades = municipios.map(m => m.nombre).sort();
                  if (ciudad) {
                    this.bodegaForm.get('ciudad')?.setValue(ciudad);
                  }
                  this.cargandoEdicion = false;
                },
                error: () => {
                  this.cargandoEdicion = false;
                }
              });
            } else {
              this.cargandoEdicion = false;
            }
          },
          error: () => {
            this.cargandoEdicion = false;
          }
        });
      } else {
        // Para otros países usar countriesnow
        this.http.post<any>('https://countriesnow.space/api/v0.1/countries/states', { country: pais }).subscribe({
          next: (data) => {
            const states = data.data.states || [];
            this.departamentos = states.map((d: any) => {
              const original = d.name;
              const limpio = original
                .replace(/ Department$/i, '')
                .replace(/ Province$/i, '')
                .replace(/ State$/i, '')
                .replace(/ Region$/i, '');
              this.departamentosMap[limpio] = original;
              return limpio;
            }).sort();

            if (departamento) {
              // Buscar el departamento limpio que corresponde
              const deptoLimpio = this.departamentos.find(d =>
                d === departamento || this.departamentosMap[d] === departamento
              ) || departamento;

              this.bodegaForm.get('departamento')?.setValue(deptoLimpio);

              const deptoOriginal = this.departamentosMap[deptoLimpio] || deptoLimpio;
              this.http.post<any>('https://countriesnow.space/api/v0.1/countries/state/cities', { country: pais, state: deptoOriginal }).subscribe({
                next: (cityData) => {
                  this.ciudades = (cityData.data || []).sort();
                  if (ciudad) {
                    this.bodegaForm.get('ciudad')?.setValue(ciudad);
                  }
                  this.cargandoEdicion = false;
                },
                error: () => {
                  this.cargandoEdicion = false;
                }
              });
            } else {
              this.cargandoEdicion = false;
            }
          },
          error: () => {
            this.cargandoEdicion = false;
          }
        });
      }
    } else {
      this.cargandoEdicion = false;
    }
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
    this.departamentosMap = {};

    if (pais === 'Colombia') {
      // Usar DaneCodesService para Colombia (nombres correctos en español)
      this.daneService.getDepartamentos().subscribe({
        next: (deptos) => {
          this.departamentos = deptos.sort();
          this.cargandoDepartamentos = false;
        },
        error: () => {
          this.departamentos = [];
          this.cargandoDepartamentos = false;
        }
      });
    } else {
      // Usar countriesnow para otros países
      this.http.post<any>('https://countriesnow.space/api/v0.1/countries/states', { country: pais }).subscribe({
        next: (data) => {
          const states = data.data.states || [];
          // Limpiar sufijos comunes y guardar mapa para API
          this.departamentos = states.map((d: any) => {
            const original = d.name;
            const limpio = original
              .replace(/ Department$/i, '')
              .replace(/ Province$/i, '')
              .replace(/ State$/i, '')
              .replace(/ Region$/i, '');
            this.departamentosMap[limpio] = original;
            return limpio;
          }).sort();
          this.cargandoDepartamentos = false;
        },
        error: () => {
          this.departamentos = [];
          this.cargandoDepartamentos = false;
        }
      });
    }
  }

  cargarCiudades(departamento: string) {
    this.cargandoCiudades = true;
    this.ciudades = [];
    const pais = this.bodegaForm.get('pais')?.value;

    if (pais === 'Colombia') {
      // Usar DaneCodesService para Colombia (1,122 municipios con códigos DANE)
      this.daneService.getMunicipiosByDepartamento(departamento).subscribe({
        next: (municipios) => {
          this.ciudades = municipios.map(m => m.nombre).sort();
          this.cargandoCiudades = false;
        },
        error: () => {
          this.ciudades = [];
          this.cargandoCiudades = false;
        }
      });
    } else {
      // Usar countriesnow para otros países
      const departamentoOriginal = this.departamentosMap[departamento] || departamento;
      this.http.post<any>('https://countriesnow.space/api/v0.1/countries/state/cities', { country: pais, state: departamentoOriginal }).subscribe({
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
  }

  abrirSelectorCiudades(): void {
    const modalRef = this.modalService.open(SelectorCiudadesCoberturaComponent, {
      size: 'xl',
      centered: true,
      backdrop: 'static'
    });
    modalRef.componentInstance.ciudadesSeleccionadas = [...this.ciudadesCobertura];
    modalRef.componentInstance.coberturaNacional = this.coberturaNacional;

    modalRef.result.then((result: { coberturaNacional: boolean; ciudadesCobertura: CiudadCobertura[] }) => {
      if (result) {
        this.coberturaNacional = result.coberturaNacional;
        this.ciudadesCobertura = result.ciudadesCobertura;
      }
    }, () => {});
  }

  /**
   * Geocodifica una dirección usando GeocodingService
   * Sistema con fallback: Google Maps → Firebase → Nominatim
   */
  geocodificarDireccion(): void {
    const direccion = this.bodegaForm.get('direccion')?.value;
    const ciudad = this.bodegaForm.get('ciudad')?.value;

    if (!direccion) {
      this.toastr.warning('Ingresa una dirección para buscar', 'Dirección requerida');
      return;
    }

    this.geocodificando = true;

    // Usar GeocodingService existente (tiene fallback a múltiples proveedores)
    this.geocodingService.geocodeDireccion(direccion, ciudad).subscribe({
      next: (result) => {
        const lat = parseFloat(result.latitud);
        const lng = parseFloat(result.longitud);

        // Actualizar coordenadas en el formulario
        this.bodegaForm.get('coordenadas')?.setValue(`${lat.toFixed(6)}, ${lng.toFixed(6)}`);

        // Actualizar mapa y marcador
        if (this.map) {
          const L = (window as any).L;
          if (this.marker) {
            this.marker.setLatLng([lat, lng]);
          } else {
            this.marker = L.marker([lat, lng]).addTo(this.map);
          }
          this.map.setView([lat, lng], 15);
        }

        this.toastr.success(`Coordenadas encontradas (calidad: ${result.quality}%)`, 'Geocodificación exitosa');
        this.geocodificando = false;
      },
      error: (err) => {
        console.error('Error en geocodificación:', err);
        this.toastr.error('Error al buscar coordenadas', 'Error');
        this.geocodificando = false;
      }
    });
  }

  guardarBodega() {
    if (this.bodegaForm.invalid) {
      this.marcarControlesComoTocados();
      const camposInvalidos = this.obtenerCamposInvalidos();
      this.toastr.warning(
        `Campos requeridos: ${camposInvalidos.join(', ')}`,
        'Formulario incompleto'
      );
      return;
    }
    const bodega = {
      ...this.bodegaForm.value,
      coberturaNacional: this.coberturaNacional,
      ciudadesCobertura: this.ciudadesCobertura
    };
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

  private obtenerCamposInvalidos(): string[] {
    const campos: string[] = [];
    const nombresAmigables: { [key: string]: string } = {
      nombre: 'Nombre',
      idBodega: 'Código Bodega',
      tipo: 'Tipo',
      pais: 'País',
      departamento: 'Departamento',
      ciudad: 'Ciudad',
      direccion: 'Dirección',
      coordenadas: 'Coordenadas'
    };

    Object.keys(this.bodegaForm.controls).forEach(key => {
      const control = this.bodegaForm.get(key);
      if (control?.invalid) {
        campos.push(nombresAmigables[key] || key);
      }
    });

    return campos;
  }
}
