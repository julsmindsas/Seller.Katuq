import { Component, EventEmitter, Input, OnInit, Output, ViewChild, ElementRef, OnDestroy } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';
import { GeocodingService } from '../../../../shared/services/geocoding.service';
import { debounceTime, distinctUntilChanged, Subscription } from 'rxjs';

@Component({
  selector: 'app-direccion-estructurada',
  templateUrl: './direccion-estructurada.component.html',
  styleUrls: ['./direccion-estructurada.component.scss']
})
export class DireccionEstructuradaComponent implements OnInit, OnDestroy {
  @Input() direccionActual: string = '';
  @Input() ciudadActual: string = '';
  @Output() direccionGenerada = new EventEmitter<string>();
  
  @ViewChild('mapContainer', { static: false }) mapContainer?: ElementRef;
  
  direccionForm: FormGroup;
  
  // Opciones para los selects
  tiposVia: string[] = ['Calle', 'Carrera', 'Avenida', 'Diagonal', 'Transversal', 'Circular', 'Autopista', 'Vía'];
  letras: string[] = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M', 'N', 'O', 'P', 'Q', 'R', 'S', 'T', 'U', 'V', 'W', 'X', 'Y', 'Z'];
  complementos: string[] = ['Bis', 'Este', 'Oeste', 'Norte', 'Sur'];
  
  // Propiedades para el mapa
  map: any;
  marker: any;
  leafletLoaded = false;
  
  // Vista previa de la dirección
  vistaPrevia: string = '';
  
  // Estado de geocodificación
  geocodificando = false;
  errorGeocodificacion = false;
  mensajeError = '';
  
  // Coordenadas geocodificadas
  latitud?: string;
  longitud?: string;
  
  // Suscripciones para liberar en OnDestroy
  private suscripciones: Subscription[] = [];
  
  constructor(
    private fb: FormBuilder,
    public activeModal: NgbActiveModal,
    private geocodingService: GeocodingService
  ) { }
  
  ngOnInit(): void {
    this.inicializarFormulario();
    
    // Si hay una dirección actual, intentar parsearla
    if (this.direccionActual) {
      this.intentarParsearDireccion();
    }
    
    // Suscribirse a cambios en el formulario para actualizar vista previa
    const subscription = this.direccionForm.valueChanges
      .pipe(
        debounceTime(300),
        distinctUntilChanged()
      )
      .subscribe(() => {
        this.actualizarVistaPrevia();
      });
    
    this.suscripciones.push(subscription);
  }
  
  ngAfterViewInit(): void {
    // Inicializar el mapa después de que la vista esté lista
    setTimeout(() => {
      this.initMap();
    }, 200);
  }
  
  ngOnDestroy(): void {
    // Liberar las suscripciones
    this.suscripciones.forEach(sub => sub.unsubscribe());
    
    // Destruir el mapa si existe
    this.destroyMap();
  }
  
  inicializarFormulario(): void {
    this.direccionForm = this.fb.group({
      tipoVia: ['Calle', Validators.required],
      numeroVia: ['', Validators.required],
      letraVia: [''],
      numero: ['', Validators.required],
      letraCruce: [''],
      numeroCasa: ['', Validators.required],
      ciudad: [this.ciudadActual || ''],
      coordenadas: ['']
    });
    
    // Actualizar la vista previa inicial
    this.actualizarVistaPrevia();
  }
  
  // Intenta parsear una dirección existente para llenar el formulario
  intentarParsearDireccion(): void {
    if (!this.direccionActual) return;
    
    try {
      // Procesar la dirección en formato típico "Calle 80 A # 30 B - 15 Apto 202"
      const direccion = this.direccionActual.trim();
      
      // Patrones para extraer partes comunes de la dirección
      const patronPrincipal = /^(Calle|Carrera|Avenida|Diagonal|Transversal|Circular|Autopista|Vía)\s+(\d+)(?:\s+([A-Z]))?(?:\s+(Bis|Norte|Sur|Este|Oeste))?/i;
      const patronCruce = /\#\s*(\d+)(?:\s+([A-Z]))?(?:\s+(Bis|Norte|Sur|Este|Oeste))?/i;
      const patronNumeroCasa = /-\s*(\d+)/i;
      
      // Extraer la vía principal
      const matchPrincipal = direccion.match(patronPrincipal);
      if (matchPrincipal) {
        this.direccionForm.get('tipoVia')?.setValue(matchPrincipal[1]);
        this.direccionForm.get('numeroVia')?.setValue(matchPrincipal[2]);
        
        if (matchPrincipal[3]) {
          this.direccionForm.get('letraVia')?.setValue(matchPrincipal[3]);
        }
      }
      
      // Extraer el cruce
      const matchCruce = direccion.match(patronCruce);
      if (matchCruce) {
        this.direccionForm.get('numero')?.setValue(matchCruce[1]);
        
        if (matchCruce[2]) {
          this.direccionForm.get('letraCruce')?.setValue(matchCruce[2]);
        }
      }
      
      // Extraer el número de casa
      const matchNumeroCasa = direccion.match(patronNumeroCasa);
      if (matchNumeroCasa) {
        this.direccionForm.get('numeroCasa')?.setValue(matchNumeroCasa[1]);
      }
      
      // Si no se pudo extraer algún campo requerido, establecer valores por defecto
      if (!this.direccionForm.get('numeroVia')?.value) {
        this.direccionForm.get('numeroVia')?.setValue('');
      }
      
      if (!this.direccionForm.get('numero')?.value) {
        this.direccionForm.get('numero')?.setValue('');
      }
      
      if (!this.direccionForm.get('numeroCasa')?.value) {
        this.direccionForm.get('numeroCasa')?.setValue('');
      }
      
      // Intentar geocodificar la dirección para obtener las coordenadas
      this.geocodificarDireccion();
      
    } catch (error) {
      console.error('Error al parsear la dirección:', error);
    }
  }
  
  // Actualiza la vista previa de la dirección
  actualizarVistaPrevia(): void {
    if (!this.direccionForm.valid) {
      this.vistaPrevia = 'Completa el formulario para ver la dirección';
      return;
    }
    
    const form = this.direccionForm.value;
    
    let direccion = `${form.tipoVia} ${form.numeroVia}`;
    
    if (form.letraVia) {
      direccion += ` ${form.letraVia}`;
    }
    
    direccion += ` # ${form.numero}`;
    
    if (form.letraCruce) {
      direccion += ` ${form.letraCruce}`;
    }
    
    direccion += ` - ${form.numeroCasa}`;
    
    this.vistaPrevia = direccion;
  }
  
  // Geocodifica la dirección actual
  geocodificarDireccion(): void {
    // Solo geocodificar si el formulario es válido y hay una ciudad
    if (!this.direccionForm.valid || !this.direccionForm.get('ciudad')?.value) {
      return;
    }
    
    this.geocodificando = true;
    this.errorGeocodificacion = false;
    
    const direccion = this.vistaPrevia;
    const ciudad = this.direccionForm.get('ciudad')?.value;
    
    this.geocodingService.geocodeDireccion(direccion, ciudad)
      .subscribe({
        next: (respuesta) => {
          this.geocodificando = false;
          
          // Guardar coordenadas
          this.latitud = respuesta.latitud;
          this.longitud = respuesta.longitud;
          
          // Actualizar el campo de coordenadas
          this.direccionForm.get('coordenadas')?.setValue(`${this.latitud}, ${this.longitud}`);
          
          // Actualizar el marcador en el mapa
          this.actualizarMarcador();
          
          // Mostrar un mensaje informativo si la calidad de geocodificación es baja
          if (respuesta.quality < 0.7) {
            this.errorGeocodificacion = true;
            this.mensajeError = 'Las coordenadas pueden no ser exactas. Por favor, ajusta la ubicación manualmente en el mapa.';
          }
        },
        error: (error) => {
          console.error('Error al geocodificar:', error);
          this.geocodificando = false;
          this.errorGeocodificacion = true;
          this.mensajeError = 'No se pudo obtener la ubicación geográfica. Por favor verifica la dirección y la ciudad o ubica manualmente el punto en el mapa.';
        }
      });
  }
  
  // Inicializa el mapa de Leaflet
  async initMap() {
    if (this.leafletLoaded) return;
    if (!(window as any).L) {
      await this.loadLeaflet();
    }
    
    this.leafletLoaded = true;
    const L = (window as any).L;
    
    if (!this.mapContainer) return;
    
    // Crear el mapa con una vista inicial de Colombia
    this.map = L.map(this.mapContainer.nativeElement).setView([4.6097, -74.0817], 6);
    
    // Añadir la capa de OpenStreetMap
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors'
    }).addTo(this.map);
    
    // Manejar clics en el mapa para actualizar coordenadas manualmente
    this.map.on('click', (e: any) => {
      const { lat, lng } = e.latlng;
      
      // Actualizar propiedades
      this.latitud = lat.toFixed(7);
      this.longitud = lng.toFixed(7);
      
      // Actualizar el formulario
      this.direccionForm.get('coordenadas')?.setValue(`${this.latitud}, ${this.longitud}`);
      
      // Actualizar marcador
      if (this.marker) {
        this.marker.setLatLng([lat, lng]);
      } else {
        this.marker = L.marker([lat, lng]).addTo(this.map);
      }
    });
    
    // Si ya hay coordenadas, mostrar el marcador
    if (this.latitud && this.longitud) {
      this.actualizarMarcador();
    }
  }
  
  // Actualiza la posición del marcador en el mapa
  actualizarMarcador(): void {
    if (!this.map || !this.latitud || !this.longitud) return;
    
    const L = (window as any).L;
    const lat = parseFloat(this.latitud);
    const lng = parseFloat(this.longitud);
    
    if (this.marker) {
      this.marker.setLatLng([lat, lng]);
    } else {
      this.marker = L.marker([lat, lng]).addTo(this.map);
    }
    
    // Centrar el mapa en el marcador
    this.map.setView([lat, lng], 15);
  }
  
  // Limpia recursos del mapa
  destroyMap() {
    if (this.map) {
      this.map.remove();
      this.map = null;
      this.marker = null;
      this.leafletLoaded = false;
    }
  }
  
  // Carga las bibliotecas de Leaflet
  loadLeaflet(): Promise<void> {
    return new Promise((resolve) => {
      // Cargar CSS de Leaflet
      const leafletCss = document.createElement('link');
      leafletCss.rel = 'stylesheet';
      leafletCss.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
      document.head.appendChild(leafletCss);
      
      // Cargar JS de Leaflet
      const script = document.createElement('script');
      script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
      script.onload = () => resolve();
      document.body.appendChild(script);
    });
  }
  
  // Genera una dirección estructurada y cierra el modal
  generarDireccion(): void {
    this.actualizarVistaPrevia();
    this.direccionGenerada.emit(this.vistaPrevia);
    this.activeModal.close({
      direccion: this.vistaPrevia,
      coordenadas: this.direccionForm.get('coordenadas')?.value
    });
  }
  
  // Cierra el modal sin aplicar cambios
  cancelar(): void {
    this.activeModal.dismiss('cancel');
  }
  
  // Acción del botón para geocodificar
  buscarCoordenadas(): void {
    this.actualizarVistaPrevia();
    this.geocodificarDireccion();
  }
}