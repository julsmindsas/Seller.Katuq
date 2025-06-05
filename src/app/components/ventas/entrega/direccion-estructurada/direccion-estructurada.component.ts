import { Component, EventEmitter, Input, OnInit, Output, ViewChild, ElementRef, OnDestroy } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';
import { GeocodingService } from '../../../../shared/services/geocoding.service';
import { debounceTime, distinctUntilChanged, Subscription } from 'rxjs';
import { ColombiaAddressService, BarrioInfo } from '../../../../shared/services/colombia-address.service';

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
  
  // Opciones para los selects - Mejorado para Colombia
  tiposVia: string[] = [
    'Calle', 'Carrera', 'Avenida', 'Diagonal', 'Transversal', 'Circular', 
    'Autopista', 'Vía', 'Kilometro', 'Troncal', 'Variante', 'Anillo Vial'
  ];
  
  letras: string[] = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M', 'N', 'O', 'P', 'Q', 'R', 'S', 'T', 'U', 'V', 'W', 'X', 'Y', 'Z'];
  
  complementos: string[] = ['Bis', 'Este', 'Oeste', 'Norte', 'Sur'];
  
  // Nuevas opciones específicas para Colombia
  tiposVivienda: string[] = [
    'Casa', 'Apartamento', 'Interior', 'Oficina', 'Local', 'Bodega', 
    'Piso', 'Torre', 'Bloque', 'Manzana', 'Lote', 'Finca'
  ];
  
  estratosSocioeconomicos: number[] = [1, 2, 3, 4, 5, 6];
  
  // Para nomenclatura rural
  tiposNomenclaturaRural: string[] = [
    'Vereda', 'Corregimiento', 'Finca', 'Parcela', 'Predio', 'Hacienda', 'Granja'
  ];
  
  // Barrios populares por ciudades principales (se puede expandir dinámicamente)
  barriosPorCiudad: { [ciudad: string]: string[] } = {
    'Bogotá': ['Chapinero', 'Zona Rosa', 'Centro', 'Suba', 'Engativá', 'Kennedy', 'Fontibón', 'Usaquén', 'Barrios Unidos'],
    'Medellín': ['El Poblado', 'Laureles', 'Centro', 'Belén', 'Envigado', 'Sabaneta', 'La América', 'Guayabal'],
    'Cali': ['Granada', 'San Fernando', 'Centro', 'Ciudad Jardín', 'El Peñón', 'Tequendama', 'Santa Rita'],
    'Barranquilla': ['El Prado', 'Centro', 'Riomar', 'Villa Country', 'Boston', 'Alto Prado', 'Granadillo'],
    'Cartagena': ['Bocagrande', 'Centro Histórico', 'Getsemaní', 'Castillogrande', 'Manga', 'Crespo']
  };
  
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
  
  // Nuevas propiedades para el contexto colombiano
  esDireccionRural = false;
  barriosDisponibles: BarrioInfo[] = [];
  ciudadSeleccionada: string = '';
  estratosSugeridos: number[] = [];
  codigoPostalSugerido: string = '';
  
  // Suscripciones para liberar en OnDestroy
  private suscripciones: Subscription[] = [];
  
  constructor(
    private fb: FormBuilder,
    public activeModal: NgbActiveModal,
    private geocodingService: GeocodingService,
    private colombiaAddressService: ColombiaAddressService
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
      // Formulario principal urbano
      tipoVia: ['Calle', Validators.required],
      numeroVia: ['', Validators.required],
      letraVia: [''],
      complementoVia: [''],
      numero: ['', Validators.required],
      letraCruce: [''],
      complementoCruce: [''],
      numeroCasa: ['', Validators.required],
      
      // Campos adicionales para Colombia
      tipoVivienda: [''],
      numeroVivienda: [''],
      barrio: [''],
      ciudad: [this.ciudadActual || '', Validators.required],
      estrato: [''],
      codigoPostal: [''],
      referencias: [''],
      
      // Formulario rural (alternativo)
      esRural: [false],
      tipoNomenclaturaRural: ['Vereda'],
      nombreRural: [''],
      
      // Coordenadas
      coordenadas: ['']
    });
    
    // Configurar ciudad inicial y barrios
    if (this.ciudadActual) {
      this.ciudadSeleccionada = this.ciudadActual;
      this.actualizarBarriosDisponibles();
    }
    
    // Suscribirse a cambios en el tipo de dirección (urbana/rural)
    this.direccionForm.get('esRural')?.valueChanges.subscribe(esRural => {
      this.esDireccionRural = esRural;
      this.actualizarValidadores();
    });
    
    // Suscribirse a cambios en la ciudad para actualizar barrios
    this.direccionForm.get('ciudad')?.valueChanges.subscribe(ciudad => {
      this.ciudadSeleccionada = ciudad;
      this.actualizarBarriosDisponibles();
    });
    
    // Actualizar la vista previa inicial
    this.actualizarVistaPrevia();
  }
  
  // Intenta parsear una dirección existente para llenar el formulario - Mejorado para Colombia
  intentarParsearDireccion(): void {
    if (!this.direccionActual) return;
    
    try {
      const direccion = this.direccionActual.trim();
      
      // Detectar si es dirección rural
      const esRural = /^(Vereda|Corregimiento|Finca|Parcela|Predio|Hacienda|Granja)\s+/i.test(direccion);
      
      if (esRural) {
        this.parsearDireccionRural(direccion);
      } else {
        this.parsearDireccionUrbana(direccion);
      }
      
      // Intentar geocodificar la dirección para obtener las coordenadas
      this.geocodificarDireccion();
      
    } catch (error) {
      console.error('Error al parsear la dirección:', error);
    }
  }
  
  // Parsea una dirección urbana colombiana
  private parsearDireccionUrbana(direccion: string): void {
    // Patrones mejorados para Colombia
    const patronPrincipal = /^(Calle|Carrera|Avenida|Diagonal|Transversal|Circular|Autopista|Vía|Kilometro|Troncal|Variante|Anillo Vial)\s+(\d+)(?:\s+([A-Z]))?(?:\s+(Bis|Norte|Sur|Este|Oeste))?/i;
    const patronCruce = /\#\s*(\d+)(?:\s+([A-Z]))?(?:\s+(Bis|Norte|Sur|Este|Oeste))?/i;
    const patronNumeroCasa = /-\s*(\d+)/i;
    const patronVivienda = /(Interior|Apartamento|Casa|Oficina|Local|Bodega|Piso|Torre|Bloque|Manzana|Lote)\s+(\d+)/i;
    const patronBarrio = /,\s*([^,]+)$/i;
    
    // Extraer la vía principal
    const matchPrincipal = direccion.match(patronPrincipal);
    if (matchPrincipal) {
      this.direccionForm.get('tipoVia')?.setValue(matchPrincipal[1]);
      this.direccionForm.get('numeroVia')?.setValue(matchPrincipal[2]);
      
      if (matchPrincipal[3]) {
        this.direccionForm.get('letraVia')?.setValue(matchPrincipal[3]);
      }
      
      if (matchPrincipal[4]) {
        this.direccionForm.get('complementoVia')?.setValue(matchPrincipal[4]);
      }
    }
    
    // Extraer el cruce
    const matchCruce = direccion.match(patronCruce);
    if (matchCruce) {
      this.direccionForm.get('numero')?.setValue(matchCruce[1]);
      
      if (matchCruce[2]) {
        this.direccionForm.get('letraCruce')?.setValue(matchCruce[2]);
      }
      
      if (matchCruce[3]) {
        this.direccionForm.get('complementoCruce')?.setValue(matchCruce[3]);
      }
    }
    
    // Extraer el número de casa
    const matchNumeroCasa = direccion.match(patronNumeroCasa);
    if (matchNumeroCasa) {
      this.direccionForm.get('numeroCasa')?.setValue(matchNumeroCasa[1]);
    }
    
    // Extraer información de vivienda
    const matchVivienda = direccion.match(patronVivienda);
    if (matchVivienda) {
      this.direccionForm.get('tipoVivienda')?.setValue(matchVivienda[1]);
      this.direccionForm.get('numeroVivienda')?.setValue(matchVivienda[2]);
    }
    
    // Extraer barrio
    const matchBarrio = direccion.match(patronBarrio);
    if (matchBarrio) {
      this.direccionForm.get('barrio')?.setValue(matchBarrio[1].trim());
    }
    
    // Establecer valores por defecto si falta información requerida
    this.establecerValoresPorDefecto();
  }
  
  // Parsea una dirección rural colombiana
  private parsearDireccionRural(direccion: string): void {
    const patronRural = /^(Vereda|Corregimiento|Finca|Parcela|Predio|Hacienda|Granja)\s+([^-]+)(?:\s*-\s*(.+))?/i;
    
    const matchRural = direccion.match(patronRural);
    if (matchRural) {
      this.direccionForm.get('esRural')?.setValue(true);
      this.direccionForm.get('tipoNomenclaturaRural')?.setValue(matchRural[1]);
      this.direccionForm.get('nombreRural')?.setValue(matchRural[2].trim());
      
      if (matchRural[3]) {
        this.direccionForm.get('referencias')?.setValue(matchRural[3].trim());
      }
    }
  }
  
  // Establece valores por defecto para campos requeridos
  private establecerValoresPorDefecto(): void {
    if (!this.direccionForm.get('numeroVia')?.value) {
      this.direccionForm.get('numeroVia')?.setValue('');
    }
    
    if (!this.direccionForm.get('numero')?.value) {
      this.direccionForm.get('numero')?.setValue('');
    }
    
    if (!this.direccionForm.get('numeroCasa')?.value) {
      this.direccionForm.get('numeroCasa')?.setValue('');
    }
  }
  
  // Actualiza la vista previa de la dirección - Mejorado para Colombia
  actualizarVistaPrevia(): void {
    if (!this.direccionForm) return;
    
    const form = this.direccionForm.value;
    
    // Si es dirección rural
    if (form.esRural) {
      let direccionRural = '';
      if (form.tipoNomenclaturaRural && form.nombreRural) {
        direccionRural = `${form.tipoNomenclaturaRural} ${form.nombreRural}`;
        if (form.referencias) {
          direccionRural += ` - ${form.referencias}`;
        }
      } else {
        direccionRural = 'Completa la información rural para ver la dirección';
      }
      this.vistaPrevia = direccionRural;
      return;
    }
    
    // Validar campos requeridos para dirección urbana
    if (!form.tipoVia || !form.numeroVia || !form.numero || !form.numeroCasa) {
      this.vistaPrevia = 'Completa el formulario para ver la dirección';
      return;
    }
    
    // Construir dirección urbana colombiana
    let direccion = `${form.tipoVia} ${form.numeroVia}`;
    
    if (form.letraVia) {
      direccion += ` ${form.letraVia}`;
    }
    
    if (form.complementoVia) {
      direccion += ` ${form.complementoVia}`;
    }
    
    direccion += ` # ${form.numero}`;
    
    if (form.letraCruce) {
      direccion += ` ${form.letraCruce}`;
    }
    
    if (form.complementoCruce) {
      direccion += ` ${form.complementoCruce}`;
    }
    
    direccion += ` - ${form.numeroCasa}`;
    
    // Agregar información de vivienda específica
    if (form.tipoVivienda && form.numeroVivienda) {
      direccion += ` ${form.tipoVivienda} ${form.numeroVivienda}`;
    } else if (form.tipoVivienda) {
      direccion += ` ${form.tipoVivienda}`;
    }
    
    // Agregar barrio si está disponible
    if (form.barrio) {
      direccion += `, ${form.barrio}`;
    }
    
    this.vistaPrevia = direccion;
  }
  
  // Actualiza los barrios disponibles según la ciudad seleccionada
  actualizarBarriosDisponibles(): void {
    if (this.ciudadSeleccionada) {
      this.colombiaAddressService.getBarriosPorCiudad(this.ciudadSeleccionada)
        .subscribe(barrios => {
          this.barriosDisponibles = barrios;
        });
    } else {
      this.barriosDisponibles = [];
    }
  }
  
  // Actualiza validadores según el tipo de dirección (urbana/rural)
  actualizarValidadores(): void {
    const esRural = this.direccionForm.get('esRural')?.value;
    
    if (esRural) {
      // Validadores para dirección rural
      this.direccionForm.get('tipoNomenclaturaRural')?.setValidators([Validators.required]);
      this.direccionForm.get('nombreRural')?.setValidators([Validators.required]);
      
      // Remover validadores urbanos
      this.direccionForm.get('tipoVia')?.clearValidators();
      this.direccionForm.get('numeroVia')?.clearValidators();
      this.direccionForm.get('numero')?.clearValidators();
      this.direccionForm.get('numeroCasa')?.clearValidators();
    } else {
      // Validadores para dirección urbana
      this.direccionForm.get('tipoVia')?.setValidators([Validators.required]);
      this.direccionForm.get('numeroVia')?.setValidators([Validators.required]);
      this.direccionForm.get('numero')?.setValidators([Validators.required]);
      this.direccionForm.get('numeroCasa')?.setValidators([Validators.required]);
      
      // Remover validadores rurales
      this.direccionForm.get('tipoNomenclaturaRural')?.clearValidators();
      this.direccionForm.get('nombreRural')?.clearValidators();
    }
    
    // Actualizar validez de todos los campos
    Object.keys(this.direccionForm.controls).forEach(key => {
      this.direccionForm.get(key)?.updateValueAndValidity();
    });
  }
  
  // Valida una dirección colombiana específica
  validarDireccionColombiana(): boolean {
    const form = this.direccionForm.value;
    
    // Usar el servicio colombiano para validación completa
    const validacion = this.colombiaAddressService.validarDireccionCompleta(form);
    
    if (!validacion.valida) {
      this.mensajeError = validacion.errores.join(', ');
      return false;
    }
    
    return true;
  }
  
  // Método para manejar cambio de barrio y actualizar información relacionada
  onBarrioSeleccionado(barrio: string): void {
    if (barrio && this.ciudadSeleccionada) {
      // Obtener estrato sugerido
      this.colombiaAddressService.getEstratoSugerido(this.ciudadSeleccionada, barrio)
        .subscribe(estratos => {
          this.estratosSugeridos = estratos;
          if (estratos.length === 1) {
            this.direccionForm.get('estrato')?.setValue(estratos[0]);
          }
        });
      
      // Obtener código postal sugerido
      this.colombiaAddressService.getCodigoPostalBarrio(this.ciudadSeleccionada, barrio)
        .subscribe(codigoPostal => {
          if (codigoPostal) {
            this.codigoPostalSugerido = codigoPostal;
            this.direccionForm.get('codigoPostal')?.setValue(codigoPostal);
          }
        });
    }
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
  
  // Genera una dirección estructurada y cierra el modal - Mejorado para Colombia
  generarDireccion(): void {
    if (!this.validarDireccionColombiana()) {
      this.mensajeError = 'Por favor revisa los datos ingresados. Algunos campos contienen información inválida.';
      return;
    }
    
    this.actualizarVistaPrevia();
    
    // Preparar datos adicionales para Colombia
    const datosCompletos = {
      direccion: this.vistaPrevia,
      coordenadas: this.direccionForm.get('coordenadas')?.value,
      esRural: this.direccionForm.get('esRural')?.value,
      barrio: this.direccionForm.get('barrio')?.value,
      estrato: this.direccionForm.get('estrato')?.value,
      codigoPostal: this.direccionForm.get('codigoPostal')?.value,
      referencias: this.direccionForm.get('referencias')?.value,
      ciudad: this.direccionForm.get('ciudad')?.value,
      tipoVivienda: this.direccionForm.get('tipoVivienda')?.value,
      numeroVivienda: this.direccionForm.get('numeroVivienda')?.value,
      // Datos estructurados para facilitar posteriores usos
      estructura: this.obtenerEstructuraDireccion()
    };
    
    this.direccionGenerada.emit(this.vistaPrevia);
    this.activeModal.close(datosCompletos);
  }
  
  // Obtiene la estructura detallada de la dirección para fácil acceso a sus partes
  private obtenerEstructuraDireccion(): any {
    const form = this.direccionForm.value;
    
    if (form.esRural) {
      return {
        tipo: 'rural',
        nomenclaturaRural: form.tipoNomenclaturaRural,
        nombre: form.nombreRural,
        referencias: form.referencias
      };
    }
    
    return {
      tipo: 'urbana',
      tipoVia: form.tipoVia,
      numeroVia: form.numeroVia,
      letraVia: form.letraVia,
      complementoVia: form.complementoVia,
      numero: form.numero,
      letraCruce: form.letraCruce,
      complementoCruce: form.complementoCruce,
      numeroCasa: form.numeroCasa,
      tipoVivienda: form.tipoVivienda,
      numeroVivienda: form.numeroVivienda,
      barrio: form.barrio
    };
  }
  
  // Método para cambiar entre dirección urbana y rural
  cambiarTipoDireccion(): void {
    const esRural = this.direccionForm.get('esRural')?.value;
    this.esDireccionRural = esRural;
    this.actualizarValidadores();
    this.actualizarVistaPrevia();
  }
  
  // Método para limpiar el formulario
  limpiarFormulario(): void {
    this.direccionForm.reset({
      tipoVia: 'Calle',
      esRural: false,
      tipoNomenclaturaRural: 'Vereda',
      ciudad: this.ciudadActual || ''
    });
    
    this.esDireccionRural = false;
    this.actualizarValidadores();
    this.actualizarVistaPrevia();
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