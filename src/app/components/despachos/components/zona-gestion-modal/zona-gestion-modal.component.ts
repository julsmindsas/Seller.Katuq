import { Component, Input, OnInit, AfterViewInit, OnDestroy, ViewChild, ChangeDetectorRef } from '@angular/core';
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ToastrService } from 'ngx-toastr';
import { MapaUbicacionesComponent } from '../mapa-ubicaciones/mapa-ubicaciones.component';

interface ZonaEntrega {
  id: string;
  nombre: string;
  descripcion?: string;
  color: string;
  colorBorde?: string;
  opacidad?: number;
  coordenadas: Array<{ lat: number; lng: number }>;
  activa: boolean;
  restricciones?: {
    horarioMinimo?: string;
    horarioMaximo?: string;
    costoAdicional?: number;
  };
  estadisticas?: {
    pedidosEntregados: number;
    tiempoPromedioEntrega: number;
    porcentajeExitoso: number;
  };
}

@Component({
  selector: 'app-zona-gestion-modal',
  templateUrl: './zona-gestion-modal.component.html',
  styleUrls: ['./zona-gestion-modal.component.scss']
})
export class ZonaGestionModalComponent implements OnInit, AfterViewInit, OnDestroy {

  @ViewChild('mapaComponent') mapaComponent: MapaUbicacionesComponent;
  @Input() zonasExistentes: ZonaEntrega[] = [];

  zonas: ZonaEntrega[] = [];
  zonaSeleccionada: ZonaEntrega | null = null;
  modoDibujo: boolean = false;
  modoEdicion: 'crear' | 'editar' | 'visualizar' = 'visualizar';

  // Configuraciones para el mapa
  configuracionMapa: any = {
    centroMapa: { lat: 6.2486, lng: -75.5742 },
    zoom: 12,
    ubicaciones: []
  };

  configuracionZonasActual: any = {
    zonas: [],
    mostrarZonas: true,
    tipoVisualizacion: 'ambos'
  };

  // Variables para dibujo de polígonos
  puntosPoligonoActual: Array<{ lat: number; lng: number }> = [];
  poligonoTemporal: any = null;
  marcadoresTemporales: any[] = [];

  // Observer para redimensionamiento
  private resizeObserver?: ResizeObserver;

  // Formulario
  zonaForm: FormGroup;

  // Colores predefinidos
  coloresDisponibles = [
    { nombre: 'Azul', valor: '#2196F3', borde: '#1976D2' },
    { nombre: 'Verde', valor: '#4CAF50', borde: '#388E3C' },
    { nombre: 'Naranja', valor: '#FF9800', borde: '#F57C00' },
    { nombre: 'Púrpura', valor: '#9C27B0', borde: '#7B1FA2' },
    { nombre: 'Rosa', valor: '#E91E63', borde: '#C2185B' },
    { nombre: 'Rojo', valor: '#F44336', borde: '#D32F2F' },
    { nombre: 'Cyan', valor: '#00BCD4', borde: '#0097A7' },
    { nombre: 'Amarillo', valor: '#FFEB3B', borde: '#FBC02D' }
  ];

  constructor(
    public activeModal: NgbActiveModal,
    private fb: FormBuilder,
    private toastr: ToastrService,
    private cd: ChangeDetectorRef
  ) {
    this.initializeForm();
  }

  ngOnInit() {
    this.zonas = [...this.zonasExistentes];
    this.cargarZonasGuardadas();

    // Actualizar configuración de zonas
    this.configuracionZonasActual = {
      zonas: this.zonas,
      mostrarZonas: true,
      tipoVisualizacion: 'ambos'
    };

    console.log('🗺️ [Modal] Inicializando modal con', this.zonas.length, 'zonas');
  }

  ngAfterViewInit() {
    console.log('🗺️ [Modal] AfterViewInit - Iniciando configuración del mapa');

    // Aguardar a que el modal esté completamente cargado y visible
    setTimeout(() => {
      this.inicializarMapaConReintento();
    }, 200);

    // Listener adicional para cuando el modal esté completamente visible
    this.escucharModalVisible();
  }

  private escucharModalVisible() {
    // Usar ResizeObserver para detectar cuando el contenedor cambia de tamaño
    if (typeof ResizeObserver !== 'undefined') {
      const observer = new ResizeObserver((entries) => {
        for (const entry of entries) {
          const element = entry.target as HTMLElement;
          if (element.offsetWidth > 0 && element.offsetHeight > 0) {
            console.log('🗺️ [Modal] Contenedor redimensionado:', {
              width: element.offsetWidth,
              height: element.offsetHeight
            });

            // Ejecutar invalidateSize cuando el contenedor tenga dimensiones
            if (this.mapaComponent?.mapa) {
              setTimeout(() => {
                this.mapaComponent.mapa.invalidateSize();
                console.log('🗺️ [Modal] Mapa redimensionado por ResizeObserver');
              }, 100);
            }
          }
        }
      });

      // Observar el contenedor del mapa cuando esté disponible
      const checkContainer = () => {
        const container = document.querySelector('.modal-mapa-container');
        if (container) {
          observer.observe(container);
          console.log('🗺️ [Modal] ResizeObserver configurado');
        } else {
          setTimeout(checkContainer, 100);
        }
      };

      checkContainer();

      // Limpiar observer cuando el componente se destruya
      this.resizeObserver = observer;
    }
  }

  private inicializarMapaConReintento() {
    let intentos = 0;
    const maxIntentos = 15;
    const intervaloDemoraBase = 300;

    const verificarMapa = () => {
      intentos++;
      console.log(`🗺️ [Modal] Intento ${intentos}/${maxIntentos} de configuración del mapa`);

      if (!this.mapaComponent) {
        console.log('🗺️ [Modal] ViewChild del componente de mapa aún no disponible');
        if (intentos < maxIntentos) {
          setTimeout(verificarMapa, intervaloDemoraBase * intentos);
        } else {
          this.mostrarErrorInicializacion('Componente de mapa no encontrado');
        }
        return;
      }

      console.log('🗺️ [Modal] Estado del componente:', {
        mapaComponent: !!this.mapaComponent,
        mapaInstance: !!this.mapaComponent?.mapa,
        leafletCargado: this.mapaComponent?.leafletCargado,
        containerElement: !!this.mapaComponent?.mapaContainer?.nativeElement,
        containerDimensions: this.mapaComponent?.mapaContainer?.nativeElement ? {
          width: this.mapaComponent.mapaContainer.nativeElement.offsetWidth,
          height: this.mapaComponent.mapaContainer.nativeElement.offsetHeight
        } : null
      });

      // Verificar que el contenedor tenga dimensiones
      const container = this.mapaComponent.mapaContainer?.nativeElement;
      if (!container || container.offsetWidth === 0 || container.offsetHeight === 0) {
        console.log('🗺️ [Modal] Contenedor del mapa no tiene dimensiones válidas');
        if (intentos < maxIntentos) {
          setTimeout(verificarMapa, intervaloDemoraBase);
        } else {
          this.mostrarErrorInicializacion('Contenedor de mapa sin dimensiones');
        }
        return;
      }

      if (this.mapaComponent.mapa) {
        console.log('🗺️ [Modal] ¡Mapa ya inicializado! Configurando para dibujo...');
        this.configurarMapaParaDibujo();
        return;
      }

      if (!this.mapaComponent.leafletCargado) {
        console.log('🗺️ [Modal] Leaflet no está cargado. Iniciando carga...');
        this.mapaComponent.cargarLeaflet().then(() => {
          console.log('🗺️ [Modal] Leaflet cargado exitosamente');
          setTimeout(() => this.verificarInicializacionMapa(), 500);
        }).catch(error => {
          console.error('🗺️ [Modal] Error cargando Leaflet:', error);
          if (intentos < maxIntentos) {
            setTimeout(verificarMapa, intervaloDemoraBase);
          } else {
            this.mostrarErrorInicializacion('Error cargando Leaflet: ' + error.message);
          }
        });
        return;
      }

      // Leaflet cargado pero mapa no inicializado
      console.log('🗺️ [Modal] Leaflet cargado pero mapa no inicializado. Forzando inicialización...');
      this.forzarInicializacionMapa();
    };

    verificarMapa();
  }

  private verificarInicializacionMapa() {
    let reintentos = 0;
    const maxReintentos = 5;

    const verificar = () => {
      reintentos++;
      if (this.mapaComponent?.mapa) {
        console.log('🗺️ [Modal] ¡Mapa disponible después de cargar Leaflet!');
        this.configurarMapaParaDibujo();
      } else if (reintentos < maxReintentos) {
        console.log(`🗺️ [Modal] Reintento ${reintentos}/${maxReintentos} para verificar mapa`);
        setTimeout(verificar, 300);
      } else {
        console.log('🗺️ [Modal] Forzando inicialización manual del mapa');
        this.forzarInicializacionMapa();
      }
    };

    verificar();
  }

  private forzarInicializacionMapa() {
    if (!this.mapaComponent || !this.mapaComponent.leafletCargado) {
      console.log('🗺️ [Modal] No se puede forzar - componente o Leaflet no disponible');
      return;
    }

    try {
      // Limpiar cualquier instancia previa del mapa
      if (this.mapaComponent.mapa) {
        this.mapaComponent.mapa.remove();
        this.mapaComponent.mapa = null;
      }

      const container = this.mapaComponent.mapaContainer?.nativeElement;
      if (container) {
        container._leaflet_id = undefined;
        container.innerHTML = '';
      }

      // Forzar reinicialización del mapa usando el método público
      setTimeout(() => {
        if (this.mapaComponent.reinicializarMapa) {
          console.log('🗺️ [Modal] Usando reinicializarMapa()');
          this.mapaComponent.reinicializarMapa();
          setTimeout(() => {
            if (this.mapaComponent?.mapa) {
              this.configurarMapaParaDibujo();
            } else {
              this.mostrarErrorInicializacion('Error en reinicialización del mapa');
            }
          }, 1000);
        } else {
          this.mostrarErrorInicializacion('Método reinicializarMapa no disponible');
        }
      }, 100);

    } catch (error) {
      console.error('🗺️ [Modal] Error en forzarInicializacionMapa:', error);
      this.mostrarErrorInicializacion('Error forzando inicialización: ' + error.message);
    }
  }

  private mostrarErrorInicializacion(mensaje: string) {
    console.error('🗺️ [Modal] ERROR CRÍTICO:', mensaje);
    this.toastr.error(
      'No se pudo inicializar el mapa. Intenta cerrar y abrir el modal nuevamente.',
      'Error de Mapa'
    );
  }

  private initializeForm() {
    this.zonaForm = this.fb.group({
      nombre: ['', [Validators.required, Validators.minLength(3)]],
      descripcion: [''],
      color: [this.coloresDisponibles[0].valor, Validators.required],
      colorBorde: [this.coloresDisponibles[0].borde],
      opacidad: [0.4, [Validators.min(0.1), Validators.max(1)]],
      horarioMinimo: ['08:00'],
      horarioMaximo: ['18:00'],
      costoAdicional: [0, [Validators.min(0)]]
    });

    // Actualizar color de borde automáticamente
    this.zonaForm.get('color')?.valueChanges.subscribe(color => {
      const colorSeleccionado = this.coloresDisponibles.find(c => c.valor === color);
      if (colorSeleccionado) {
        this.zonaForm.patchValue({ colorBorde: colorSeleccionado.borde });
      }
    });
  }

  private configurarMapaParaDibujo() {
    if (!this.mapaComponent) {
      console.log('🗺️ [Modal] Componente de mapa no disponible, reintentando...');
      setTimeout(() => this.configurarMapaParaDibujo(), 500);
      return;
    }

    if (!this.mapaComponent.mapa) {
      console.log('🗺️ [Modal] Instancia de mapa no disponible, reintentando...');
      setTimeout(() => this.configurarMapaParaDibujo(), 500);
      return;
    }

    console.log('🗺️ [Modal] Configurando mapa para dibujo de zonas');
    console.log('🗺️ [Modal] Mapa encontrado:', !!this.mapaComponent.mapa);
    console.log('🗺️ [Modal] Leaflet cargado:', this.mapaComponent.leafletCargado);

    try {
      // Forzar que Leaflet recalcule el tamaño del contenedor
      this.mapaComponent.mapa.invalidateSize();
      console.log('🗺️ [Modal] invalidateSize() ejecutado');

      // Pequeña demora para que el DOM se estabilice
      setTimeout(() => {
        if (this.mapaComponent?.mapa) {
          this.mapaComponent.mapa.invalidateSize();
          console.log('🗺️ [Modal] Segundo invalidateSize() ejecutado');

          // Actualizar las configuraciones del mapa
          this.mapaComponent.configuracionZonas = this.configuracionZonasActual;

          // Mostrar las zonas existentes
          this.mostrarZonasEnMapa();

          // Asegurar que el mapa esté centrado correctamente
          const centro = this.configuracionMapa.centroMapa;
          this.mapaComponent.mapa.setView([centro.lat, centro.lng], this.configuracionMapa.zoom);

          console.log('🗺️ [Modal] Mapa configurado y centrado correctamente');
        }
      }, 250);

    } catch (error) {
      console.error('🗺️ [Modal] Error configurando mapa:', error);
    }

    // Forzar detección de cambios
    this.cd.detectChanges();
  }

  private mostrarZonasEnMapa() {
    if (!this.mapaComponent?.mapa) {
      console.log('🗺️ [Modal] No se puede mostrar zonas - mapa no disponible');
      return;
    }

    console.log('🗺️ [Modal] Mostrando', this.zonas.length, 'zonas en el mapa');

    // Actualizar configuración de zonas
    this.configuracionZonasActual = {
      zonas: this.zonas,
      mostrarZonas: true,
      tipoVisualizacion: 'ambos'
    };

    // Actualizar configuración del mapa
    this.mapaComponent.configuracionZonas = this.configuracionZonasActual;

    // Actualizar zonas si el método existe
    if (this.mapaComponent.actualizarZonas) {
      this.mapaComponent.actualizarZonas();
    }
  }

  iniciarDibujoZona() {
    if (!this.mapaComponent?.mapa) {
      this.toastr.error('El mapa no está disponible');
      return;
    }

    this.modoDibujo = true;
    this.modoEdicion = 'crear';
    this.puntosPoligonoActual = [];
    this.limpiarDibujoTemporal();

    // Cambiar cursor del mapa
    this.mapaComponent.mapa.getContainer().style.cursor = 'crosshair';

    // Agregar evento de click al mapa
    this.mapaComponent.mapa.on('click', this.onMapClick.bind(this));

    this.toastr.info('Haz clic en el mapa para agregar puntos al polígono. Doble clic para finalizar.');
  }

  private onMapClick(e: any) {
    if (!this.modoDibujo) return;

    const punto = { lat: e.latlng.lat, lng: e.latlng.lng };
    this.puntosPoligonoActual.push(punto);

    this.agregarMarcadorTemporal(punto);
    this.actualizarPoligonoTemporal();

    console.log(`🗺️ Punto agregado: ${punto.lat}, ${punto.lng}. Total: ${this.puntosPoligonoActual.length}`);
  }

  private agregarMarcadorTemporal(punto: { lat: number; lng: number }) {
    if (!this.mapaComponent?.mapa) return;

    const L = (window as any).L;

    const marcador = L.circleMarker([punto.lat, punto.lng], {
      radius: 6,
      fillColor: '#ff0000',
      color: '#ffffff',
      weight: 2,
      opacity: 1,
      fillOpacity: 0.8
    }).addTo(this.mapaComponent.mapa);

    this.marcadoresTemporales.push(marcador);
  }

  private actualizarPoligonoTemporal() {
    if (!this.mapaComponent?.mapa || this.puntosPoligonoActual.length < 2) return;

    const L = (window as any).L;

    // Remover polígono temporal anterior
    if (this.poligonoTemporal) {
      this.mapaComponent.mapa.removeLayer(this.poligonoTemporal);
    }

    // Crear nueva línea temporal (polilínea)
    const coordenadas = this.puntosPoligonoActual.map(p => [p.lat, p.lng]);

    if (this.puntosPoligonoActual.length >= 3) {
      // Si hay 3 o más puntos, mostrar como polígono temporal
      this.poligonoTemporal = L.polygon(coordenadas, {
        color: '#ff0000',
        weight: 2,
        opacity: 0.8,
        fillColor: '#ff0000',
        fillOpacity: 0.2,
        dashArray: '5, 5'
      }).addTo(this.mapaComponent.mapa);
    } else {
      // Si hay menos de 3 puntos, mostrar como línea
      this.poligonoTemporal = L.polyline(coordenadas, {
        color: '#ff0000',
        weight: 2,
        opacity: 0.8,
        dashArray: '5, 5'
      }).addTo(this.mapaComponent.mapa);
    }
  }

  finalizarDibujo() {
    if (this.puntosPoligonoActual.length < 3) {
      this.toastr.warning('Necesitas al menos 3 puntos para crear una zona');
      return;
    }

    this.modoDibujo = false;

    // Restaurar cursor del mapa
    if (this.mapaComponent?.mapa) {
      this.mapaComponent.mapa.getContainer().style.cursor = '';
      this.mapaComponent.mapa.off('click', this.onMapClick);
    }

    this.toastr.success(`Polígono creado con ${this.puntosPoligonoActual.length} puntos`);
  }

  cancelarDibujo() {
    this.modoDibujo = false;
    this.modoEdicion = 'visualizar';
    this.limpiarDibujoTemporal();

    if (this.mapaComponent?.mapa) {
      this.mapaComponent.mapa.getContainer().style.cursor = '';
      this.mapaComponent.mapa.off('click', this.onMapClick);
    }

    this.puntosPoligonoActual = [];
    this.toastr.info('Dibujo cancelado');
  }

  private limpiarDibujoTemporal() {
    if (!this.mapaComponent?.mapa) return;

    // Remover polígono temporal
    if (this.poligonoTemporal) {
      this.mapaComponent.mapa.removeLayer(this.poligonoTemporal);
      this.poligonoTemporal = null;
    }

    // Remover marcadores temporales
    this.marcadoresTemporales.forEach(marcador => {
      this.mapaComponent.mapa.removeLayer(marcador);
    });
    this.marcadoresTemporales = [];
  }

  guardarZona() {
    if (!this.zonaForm.valid) {
      this.toastr.error('Por favor completa todos los campos requeridos');
      return;
    }

    if (this.puntosPoligonoActual.length < 3) {
      this.toastr.error('Debes dibujar un polígono válido antes de guardar');
      return;
    }

    const formValues = this.zonaForm.value;

    const nuevaZona: ZonaEntrega = {
      id: this.generarId(),
      nombre: formValues.nombre,
      descripcion: formValues.descripcion,
      color: formValues.color,
      colorBorde: formValues.colorBorde,
      opacidad: formValues.opacidad,
      coordenadas: [...this.puntosPoligonoActual],
      activa: true,
      restricciones: {
        horarioMinimo: formValues.horarioMinimo,
        horarioMaximo: formValues.horarioMaximo,
        costoAdicional: formValues.costoAdicional || 0
      },
      estadisticas: {
        pedidosEntregados: 0,
        tiempoPromedioEntrega: 0,
        porcentajeExitoso: 0
      }
    };

    this.zonas.push(nuevaZona);
    this.guardarZonasEnStorage();
    this.mostrarZonasEnMapa();
    this.limpiarFormulario();
    this.limpiarDibujoTemporal();

    this.toastr.success(`Zona "${nuevaZona.nombre}" creada exitosamente`);
  }

  editarZona(zona: ZonaEntrega) {
    this.zonaSeleccionada = zona;
    this.modoEdicion = 'editar';

    this.zonaForm.patchValue({
      nombre: zona.nombre,
      descripcion: zona.descripcion,
      color: zona.color,
      colorBorde: zona.colorBorde,
      opacidad: zona.opacidad,
      horarioMinimo: zona.restricciones?.horarioMinimo,
      horarioMaximo: zona.restricciones?.horarioMaximo,
      costoAdicional: zona.restricciones?.costoAdicional
    });
  }

  eliminarZona(zona: ZonaEntrega) {
    if (confirm(`¿Estás seguro de eliminar la zona "${zona.nombre}"?`)) {
      this.zonas = this.zonas.filter(z => z.id !== zona.id);
      this.guardarZonasEnStorage();
      this.mostrarZonasEnMapa();
      this.toastr.success(`Zona "${zona.nombre}" eliminada`);
    }
  }

  toggleZona(zona: ZonaEntrega) {
    zona.activa = !zona.activa;
    this.guardarZonasEnStorage();
    this.mostrarZonasEnMapa();
  }

  public limpiarFormulario() {
    this.zonaForm.reset();
    this.zonaForm.patchValue({
      color: this.coloresDisponibles[0].valor,
      colorBorde: this.coloresDisponibles[0].borde,
      opacidad: 0.4,
      horarioMinimo: '08:00',
      horarioMaximo: '18:00',
      costoAdicional: 0
    });

    this.modoEdicion = 'visualizar';
    this.zonaSeleccionada = null;
    this.puntosPoligonoActual = [];
  }

  private generarId(): string {
    return 'zona_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
  }

  private guardarZonasEnStorage() {
    localStorage.setItem('katuq_zonas_entrega', JSON.stringify(this.zonas));
  }

  private cargarZonasGuardadas() {
    const zonasGuardadas = localStorage.getItem('katuq_zonas_entrega');
    if (zonasGuardadas) {
      try {
        const zonasCargadas = JSON.parse(zonasGuardadas);
        // Combinar zonas existentes con las guardadas, evitando duplicados
        zonasCargadas.forEach((zonaGuardada: ZonaEntrega) => {
          const existe = this.zonas.find(z => z.id === zonaGuardada.id);
          if (!existe) {
            this.zonas.push(zonaGuardada);
          }
        });
      } catch (error) {
        console.error('Error al cargar zonas guardadas:', error);
      }
    }
  }

  cerrarModal() {
    this.activeModal.close({ zonas: this.zonas });
  }

  cancelarModal() {
    // Limpiar observer si existe
    if (this.resizeObserver) {
      this.resizeObserver.disconnect();
    }
    this.activeModal.dismiss();
  }

  ngOnDestroy() {
    // Limpiar observer si existe
    if (this.resizeObserver) {
      this.resizeObserver.disconnect();
    }
  }

  // Método para forzar recarga del mapa si hay problemas
  public forzarRecargaMapa() {
    console.log('🗺️ [Modal] Forzando recarga del mapa...');
    this.toastr.info('Reinicializando mapa...', 'Recarga Manual');

    // Cancelar cualquier dibujo en progreso
    if (this.modoDibujo) {
      this.cancelarDibujo();
    }

    if (!this.mapaComponent) {
      console.log('🗺️ [Modal] No hay componente de mapa disponible');
      this.toastr.warning('Componente de mapa no encontrado');
      return;
    }

    try {
      // Limpiar estado del mapa
      if (this.mapaComponent.mapa) {
        this.mapaComponent.mapa.remove();
        this.mapaComponent.mapa = null;
      }

      // Limpiar contenedor
      const container = this.mapaComponent.mapaContainer?.nativeElement;
      if (container) {
        container._leaflet_id = undefined;
        container.innerHTML = '';
      }

      // Reinicializar con el método mejorado
      this.inicializarMapaConReintento();

    } catch (error) {
      console.error('🗺️ [Modal] Error en forzarRecargaMapa:', error);
      this.toastr.error('Error al recargar el mapa: ' + error.message);
    }
  }

  // Método para mostrar información detallada del mapa en la consola
  public debugMapaInfo() {
    console.log('🗺️ [DEBUG] === INFORMACIÓN DETALLADA DEL MAPA ===');
    console.log('🗺️ [DEBUG] Componente modal:', this);
    console.log('🗺️ [DEBUG] MapaComponent:', this.mapaComponent);

    if (this.mapaComponent) {
      console.log('🗺️ [DEBUG] Estado del MapaComponent:', {
        mapa: this.mapaComponent.mapa,
        leafletCargado: this.mapaComponent.leafletCargado,
        altura: this.mapaComponent.altura,
        mapaContainer: this.mapaComponent.mapaContainer,
        configuracion: this.mapaComponent.configuracion,
        configuracionZonas: this.mapaComponent.configuracionZonas,
        mostrarControles: this.mapaComponent.mostrarControles,
        tiempoReal: this.mapaComponent.tiempoReal
      });

      // Verificar el DOM
      if (this.mapaComponent.mapaContainer) {
        const elemento = this.mapaComponent.mapaContainer.nativeElement;
        console.log('🗺️ [DEBUG] Elemento DOM del mapa:', {
          elemento: elemento,
          dimensiones: {
            width: elemento.offsetWidth,
            height: elemento.offsetHeight,
            clientWidth: elemento.clientWidth,
            clientHeight: elemento.clientHeight
          },
          estilos: window.getComputedStyle(elemento),
          innerHTML: elemento.innerHTML.length > 0 ? 'Tiene contenido' : 'Vacío'
        });
      }
    }

    console.log('🗺️ [DEBUG] Configuraciones del modal:', {
      configuracionMapa: this.configuracionMapa,
      configuracionZonasActual: this.configuracionZonasActual,
      zonas: this.zonas
    });

    console.log('🗺️ [DEBUG] Window.L (Leaflet):', (window as any).L);
    console.log('🗺️ [DEBUG] === FIN DEBUG ===');

    this.toastr.info('Información del mapa mostrada en la consola', 'Debug Info');
  }
}