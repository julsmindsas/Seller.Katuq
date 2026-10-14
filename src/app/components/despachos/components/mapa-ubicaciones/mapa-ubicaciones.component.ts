import {
  Component, Input, OnInit, AfterViewInit, OnDestroy, OnChanges, SimpleChanges, ElementRef, ViewChild, ChangeDetectorRef
} from '@angular/core';
import { AngularFireDatabase } from '@angular/fire/compat/database';
import { interval, Subscription } from 'rxjs';
import { SecurityService } from '../../../../shared/services/security/security.service';
import { escaparHtml } from '../../../../shared/utils/escapar-html';
import {
  haceCuanto, marcaDeUbicacion, nombreDesdeClave, perteneceAEmpresa, senalMensajero, SenalMensajero, ubicacionVigente
} from '../../../../shared/utils/ubicacion-mensajero';

/** Pin y ficha de los estados que no tienen color propio en la leyenda. */
const COLOR_OTRO_ESTADO = '#5A6B78';

interface UbicacionPedido {
  nroPedido: string;
  estado: string;
  cliente: string;
  direccion: string;
  latitud?: number;
  longitud?: number;
  transportador?: string;
  fechaEntrega: string;
  horaEstimada?: string;
  distanciaRestante?: number;
  tiempoEstimado?: number;
}

interface UbicacionMensajero {
  id: string;
  nombre: string;
  lat: number;
  lng: number;
  timestamp?: string;
  lastUpdate?: number;
  conectado?: boolean;
  /** Momento (ms) del último punto; null si el nodo no trae hora. */
  marca: number | null;
  senal: SenalMensajero;
  /** "hace 3 min", recalculado cada 30 s. */
  hace: string;
  velocidad?: number;
  bateria?: number;
  /** Hacia dónde va, en grados (0 = norte). La app solo lo cambia si va a 1 m/s o más. */
  rumbo?: number;
  /** Precisión del GPS en metros. */
  precision?: number;
}

/** Puntos del recorrido que se guardan por mensajero mientras el mapa está abierto. */
const MAX_PUNTOS_RECORRIDO = 240;
/**
 * La app manda un punto cada 2-4 s mientras el mensajero se mueve: el marcador se desliza durante ese
 * mismo intervalo, en línea recta y a velocidad pareja, y así se ve continuo (como Uber). Con puntos más
 * espaciados (app vieja, mensajero quieto) se usa un deslizamiento corto.
 */
const MIN_MS_DESLIZAR = 1000;
const MAX_MS_DESLIZAR = 5000;
const MS_DESLIZAR_CORTO = 900;
/** Saltos más largos que esto no se animan: es un mensajero que reapareció lejos, no uno que se movió. */
const MAX_METROS_ANIMACION = 3000;

/** Avance de la ubicación de pedidos que calcula Despachos (openspec mapa-despachos-ubicar-pedidos). */
export interface AvanceUbicacion {
  total: number;
  hechos: number;
  ubicados: number;
  sinUbicar: number;
  terminado: boolean;
}

export interface PedidoSinUbicar {
  nroPedido: string;
  cliente: string;
  direccion: string;
  motivo: string;
}

/** Cuánto se queda el resumen "X ubicados · Y sin ubicar" antes de ocultarse. */
const RESUMEN_UBICACION_MS = 4000;

interface MapaMetricas {
  despachados: number;
  paraDespachar: number;
  empacados: number;
  producidos: number;
  enRuta: number;
  pendientes: number;
  tiempoPromedioEstimado?: number;
}

interface ZonaEntrega {
  id: string;
  nombre: string;
  descripcion?: string;
  color: string;
  colorBorde?: string;
  opacidad?: number;
  coordenadas: Array<{ lat: number; lng: number }>;
  activa: boolean;
  codigosPostales?: string[];
  restricciones?: {
    horarioMinimo?: string;
    horarioMaximo?: string;
    diasNoDisponibles?: number[]; // 0=domingo, 1=lunes, etc.
    costoAdicional?: number;
  };
  estadisticas?: {
    pedidosEntregados: number;
    tiempoPromedioEntrega: number;
    porcentajeExitoso: number;
  };
}

interface ConfiguracionZonas {
  zonas: ZonaEntrega[];
  mostrarZonas: boolean;
  tipoVisualizacion: 'relleno' | 'borde' | 'ambos';
}

interface ConfiguracionMapa {
  centroMapa: { lat: number; lng: number };
  zoom: number;
  ubicaciones: UbicacionPedido[];
}

@Component({
  selector: 'app-mapa-ubicaciones',
  templateUrl: './mapa-ubicaciones.component.html',
  styleUrls: ['./mapa-ubicaciones.component.scss']
})
export class MapaUbicacionesComponent implements OnInit, AfterViewInit, OnDestroy, OnChanges {
  @ViewChild('mapaContainer', { static: true }) mapaContainer!: ElementRef;
  
  @Input() configuracion: ConfiguracionMapa = {
    centroMapa: { lat: 4.6097, lng: -74.0817 },
    zoom: 11,
    ubicaciones: []
  };
  
  @Input() altura: string = '400px';
  @Input() mostrarControles: boolean = true;
  @Input() tiempoReal: boolean = false;
  /** Avance de "ubicar pedidos": lo pinta una tarjeta sobre el mapa, sin taparlo. */
  @Input() avanceUbicacion: AvanceUbicacion | null = null;
  /** Pedidos que no se pudieron ubicar con confianza: van en el panel, nunca en un punto aproximado. */
  @Input() pedidosSinUbicar: PedidoSinUbicar[] = [];
  @Input() verMensajeros: boolean = true;
  @Input() configuracionZonas: ConfiguracionZonas = {
    zonas: [],
    mostrarZonas: true,
    tipoVisualizacion: 'ambos'
  };
  @Input() metricas: MapaMetricas = {
    despachados: 0,
    paraDespachar: 0,
    empacados: 0,
    producidos: 0,
    enRuta: 0,
    pendientes: 0,
    tiempoPromedioEstimado: 0
  };

  mapa: any = null;
  marcadores: any[] = [];
  private capaMensajeros: any = null;
  private capaZonasEntrega: any = null;
  private poligonosZonas: any[] = [];
  private mensajerosSubscription: Subscription | null = null;
  private purgaMensajerosSubscription: Subscription | null = null;
  private marcadorUbicacionUsuario: any = null;
  /** Un marcador por mensajero: se mueve con setLatLng en vez de borrarse y redibujarse en cada aviso. */
  private marcadoresMensajeros = new Map<string, { marcador: any; firmaIcono: string; marca: number | null; giro?: number }>();
  private recorridos = new Map<string, Array<[number, number]>>();
  private lineasRecorrido = new Map<string, any>();
  private animaciones = new Map<string, number>();
  /** Mensajero que la cámara sigue mientras se mueve; se suelta al arrastrar el mapa. */
  public siguiendoId: string | null = null;
  
  public mostrarMensajeros: boolean = true;
  public mostrarZonasEntrega: boolean = true;
  public mensajeros: UbicacionMensajero[] = [];

  intervalTimer: any = null;
  /** La tarjeta de avance se ve mientras ubica y unos segundos con el resumen al terminar. */
  public avanceVisible = false;
  private ocultarAvanceTimer: any = null;
  leafletCargado: boolean = false;
  marcadoresAnimandose: Set<string> = new Set();
  ultimosLocationsProcesados: number = 0;
  /** Cada redibujo invalida los pines escalonados que el anterior aún no había puesto. */
  private generacionMarcadores = 0;
  private companyName: string;
  private ubicacionUsuario: { lat: number; lng: number } | null = null;
  private usandoUbicacionUsuario: boolean = false;

  // Colores semánticos del design-system, los mismos de la leyenda
  iconosEstado: Record<string, { color: string; fondo: string; etiqueta: string }> = {
    'Despachado': { color: '#1E874B', fondo: '#E6F7EE', etiqueta: 'En ruta' },
    'ParaDespachar': { color: '#D9820A', fondo: '#FFF1DF', etiqueta: 'Para despachar' },
    'Empacado': { color: '#8E27B0', fondo: '#f3e9fb', etiqueta: 'Empacado' },
    'ProducidoTotalmente': { color: '#5F3FE0', fondo: '#efe9ff', etiqueta: 'Producido' }
  };

  constructor(
    private db: AngularFireDatabase, 
    private cd: ChangeDetectorRef,
    private securityService: SecurityService
  ) { }

  ngOnInit(): void {
    const companyInfo = this.securityService.getCompanyInformationLogged();
    if (companyInfo && companyInfo.nombreComercio) {
      this.companyName = companyInfo.nombreComercio.toUpperCase();
    } else {
      console.warn('No se pudo obtener el nombre del comercio. El filtro de mensajeros por comercio puede no funcionar.');
      this.companyName = '';
    }
    
    this.mostrarMensajeros = this.verMensajeros;
    this.cargarLeaflet();
    if (this.mostrarMensajeros) {
      this.escucharUbicacionMensajeros();
    }
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['avanceUbicacion']) {
      const avance = this.avanceUbicacion;
      clearTimeout(this.ocultarAvanceTimer);
      this.avanceVisible = !!avance;
      if (avance?.terminado) {
        this.ocultarAvanceTimer = setTimeout(() => {
          this.avanceVisible = false;
          this.cd.detectChanges();
        }, RESUMEN_UBICACION_MS);
      }
    }
    // D-421: los pedidos se pintan apenas se ubican, también con la pestaña del mapa ya abierta.
    // Despachos entrega un objeto nuevo en cada detección de cambios; solo se redibuja si cambió la lista.
    const cambioConfig = changes['configuracion'];
    if (cambioConfig && !cambioConfig.firstChange && this.mapa) {
      const antes: UbicacionPedido[] | undefined = cambioConfig.previousValue?.ubicaciones;
      if (antes !== this.configuracion?.ubicaciones) {
        const sinPinesAntes = !antes?.some(u => u.latitud && u.longitud);
        this.agregarMarcadores();
        // Encuadrar solo con los primeros pines: después, no mover el mapa mientras alguien lo usa
        if (sinPinesAntes) this.ajustarVistaAMarcadores();
      }
    }
    if (changes['pedidosSinUbicar'] && !changes['pedidosSinUbicar'].firstChange) {
      // El panel puede aparecer o irse: el mapa cambia de ancho y Leaflet debe medirse otra vez
      requestAnimationFrame(() => this.mapa?.invalidateSize());
    }
  }

  get porcentajeUbicacion(): number {
    const a = this.avanceUbicacion;
    return a && a.total > 0 ? Math.round((a.hechos / a.total) * 100) : 0;
  }

  get mostrarPanel(): boolean {
    return this.mostrarControles && (this.mostrarMensajeros || this.pedidosSinUbicar.length > 0);
  }

  public porNroPedido(_: number, p: PedidoSinUbicar): string {
    return p.nroPedido;
  }

  ngAfterViewInit(): void {
    // Inicializar el mapa después de que la vista esté lista
    setTimeout(() => {
      if (this.leafletCargado) {
        this.inicializarMapa();
      }
    }, 100);
  }

  ngOnDestroy(): void {
    if (this.intervalTimer) {
      clearInterval(this.intervalTimer);
    }
    clearTimeout(this.ocultarAvanceTimer);
    if (this.mapa) {
      this.mapa.remove();
      this.mapa = null;
    }
    if (this.mensajerosSubscription) {
      this.mensajerosSubscription.unsubscribe();
    }
    this.purgaMensajerosSubscription?.unsubscribe();
    this.animaciones.forEach(id => cancelAnimationFrame(id));
    this.animaciones.clear();

    // Limpiar referencias del contenedor de Leaflet
    if (this.mapaContainer?.nativeElement) {
      const contenedor = this.mapaContainer.nativeElement;
      contenedor._leaflet_id = undefined;
      contenedor.innerHTML = '';
    }
  }

  /**
   * Método para reinicializar completamente el mapa
   * Útil cuando hay problemas de inicialización
   */
  public reinicializarMapa(): void {
    // console.log('🔄 Reinicializando mapa completamente...');

    // Limpiar mapa existente
    if (this.mapa) {
      this.mapa.remove();
      this.mapa = null;
    }

    // Limpiar contenedor
    if (this.mapaContainer?.nativeElement) {
      const contenedor = this.mapaContainer.nativeElement;
      contenedor._leaflet_id = undefined;
      contenedor.innerHTML = '';
    }

    // Limpiar capas
    this.capaMensajeros = null;
    this.capaZonasEntrega = null;
    this.limpiarCapaMensajeros();

    // Reinicializar si Leaflet está disponible
    if (this.leafletCargado) {
      setTimeout(() => {
        this.inicializarMapa();
      }, 100);
    } else {
      this.cargarLeaflet();
    }
  }

  public refrescarMapa(): void {
    if (this.mapa) {
      setTimeout(() => {
        this.mapa.invalidateSize();

        // Recalcular centro inteligente con las nuevas ubicaciones
        const centroInteligente = this.calcularCentroInteligente();
        this.mapa.setView([centroInteligente.lat, centroInteligente.lng], centroInteligente.zoom);

        this.agregarMarcadores();
        this.ajustarVistaAMarcadores();
      }, 100);
    }
  }

  /**
   * Refresca la ubicación del usuario y luego actualiza el mapa
   */
  public async refrescarUbicacionYMapa(): Promise<void> {
    // console.log('🔄 Refrescando ubicación del usuario...');

    try {
      // Intentar obtener nueva ubicación del usuario
      await this.obtenerUbicacionUsuario();
      // console.log('✅ Ubicación actualizada');

      // Agregar o actualizar marcador de ubicación del usuario
      this.agregarMarcadorUsuario();

    } catch (error) {
      console.warn('❌ No se pudo actualizar la ubicación del usuario:', error);
    }

    // Refrescar el mapa independientemente del resultado de geolocalización
    this.refrescarMapa();
  }

  public async cargarLeaflet(): Promise<void> {
    try {
      // Verificar si Leaflet ya está cargado
      if (typeof window !== 'undefined' && (window as any).L) {
        this.leafletCargado = true;

        // Si Leaflet ya está cargado pero no hay mapa, inicializarlo
        if (!this.mapa && this.mapaContainer) {
          this.obtenerUbicacionUsuario().then(() => {
            this.inicializarMapa();
          }).catch(() => {
            this.inicializarMapa();
          });
        }
        return;
      }

      // Cargar dinámicamente Leaflet
      await this.cargarScript('https://unpkg.com/leaflet@1.9.4/dist/leaflet.js');
      await this.cargarCSS('https://unpkg.com/leaflet@1.9.4/dist/leaflet.css');
      
      this.leafletCargado = true;
      
      // Inicializar el mapa una vez que Leaflet esté cargado
      if (this.mapaContainer) {
        // Intentar obtener ubicación del usuario antes de inicializar el mapa
        this.obtenerUbicacionUsuario().then(() => {
          this.inicializarMapa();
        }).catch(() => {
          // Si falla la geolocalización, inicializar mapa normal
          // console.log('Usando ubicación por defecto (Bogotá)');
          this.inicializarMapa();
        });
      }
    } catch (error) {
      console.error('Error cargando Leaflet:', error);
      this.leafletCargado = false;
    }
  }

  private cargarScript(url: string): Promise<void> {
    return new Promise((resolve, reject) => {
      if (document.querySelector(`script[src="${url}"]`)) {
        resolve();
        return;
      }

      const script = document.createElement('script');
      script.src = url;
      script.onload = () => resolve();
      script.onerror = () => reject(new Error(`Error cargando script: ${url}`));
      document.head.appendChild(script);
    });
  }

  private cargarCSS(url: string): Promise<void> {
    return new Promise((resolve, reject) => {
      if (document.querySelector(`link[href="${url}"]`)) {
        resolve();
        return;
      }

      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = url;
      link.onload = () => resolve();
      link.onerror = () => reject(new Error(`Error cargando CSS: ${url}`));
      document.head.appendChild(link);
    });
  }

  /**
   * Obtiene la ubicación actual del usuario usando navigator.geolocation
   */
  private obtenerUbicacionUsuario(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        console.warn('🚫 Geolocalización no es compatible con este navegador');
        reject(new Error('Geolocalización no compatible'));
        return;
      }

      // console.log('📍 Solicitando ubicación del usuario...');

      navigator.geolocation.getCurrentPosition(
        (position) => {
          this.ubicacionUsuario = {
            lat: position.coords.latitude,
            lng: position.coords.longitude
          };
          this.usandoUbicacionUsuario = true;
          // console.log(`✅ Ubicación obtenida: ${this.ubicacionUsuario.lat}, ${this.ubicacionUsuario.lng}`);
          resolve();
        },
        (error) => {
          console.warn('❌ Error obteniendo ubicación:', error.message);
          switch (error.code) {
            case error.PERMISSION_DENIED:
              console.warn('🚫 Usuario denegó el acceso a la ubicación');
              break;
            case error.POSITION_UNAVAILABLE:
              console.warn('📍 Información de ubicación no disponible');
              break;
            case error.TIMEOUT:
              console.warn('⏰ Tiempo de espera agotado para obtener ubicación');
              break;
          }
          reject(error);
        },
        {
          enableHighAccuracy: true,
          timeout: 10000, // 10 segundos
          maximumAge: 300000 // Caché por 5 minutos
        }
      );
    });
  }

  /**
   * Calcula el centro del mapa de forma inteligente basado en:
   * 1. Promedio de ubicaciones de pedidos si existen
   * 2. Ubicación del usuario si está disponible
   * 3. Bogotá como fallback
   */
  private calcularCentroInteligente(): { lat: number; lng: number; zoom: number } {
    const defaultCenter = { lat: 4.6097, lng: -74.0817, zoom: 11 }; // Bogotá

    // 1. Si hay ubicaciones de pedidos, calcular el centroide
    if (this.configuracion.ubicaciones && this.configuracion.ubicaciones.length > 0) {
      const ubicacionesConCoordenadas = this.configuracion.ubicaciones.filter(
        u => u.latitud && u.longitud
      );

      if (ubicacionesConCoordenadas.length > 0) {
        const promedioLat = ubicacionesConCoordenadas.reduce((sum, u) => sum + u.latitud!, 0) / ubicacionesConCoordenadas.length;
        const promedioLng = ubicacionesConCoordenadas.reduce((sum, u) => sum + u.longitud!, 0) / ubicacionesConCoordenadas.length;

        // Calcular zoom basado en la dispersión de puntos
        const latitudes = ubicacionesConCoordenadas.map(u => u.latitud!);
        const longitudes = ubicacionesConCoordenadas.map(u => u.longitud!);
        const rangeLat = Math.max(...latitudes) - Math.min(...latitudes);
        const rangeLng = Math.max(...longitudes) - Math.min(...longitudes);
        const maxRange = Math.max(rangeLat, rangeLng);

        // Ajustar zoom según la dispersión
        let zoom = 11;
        if (maxRange < 0.01) zoom = 15;      // Muy concentrado
        else if (maxRange < 0.05) zoom = 13; // Concentrado
        else if (maxRange < 0.1) zoom = 11;  // Disperso
        else zoom = 9;                       // Muy disperso

        // console.log(`🎯 Centro calculado desde pedidos: ${promedioLat.toFixed(4)}, ${promedioLng.toFixed(4)} (zoom: ${zoom})`);
        return {
          lat: promedioLat,
          lng: promedioLng,
          zoom: zoom
        };
      }
    }

    // 2. Si no hay pedidos pero sí ubicación del usuario
    if (this.ubicacionUsuario && this.usandoUbicacionUsuario) {
      // console.log(`🌐 Centro desde ubicación del usuario: ${this.ubicacionUsuario.lat}, ${this.ubicacionUsuario.lng}`);
      return {
        lat: this.ubicacionUsuario.lat,
        lng: this.ubicacionUsuario.lng,
        zoom: 13 // Zoom más cercano para ubicación personal
      };
    }

    // 3. Usar centro configurado o Bogotá por defecto
    const centroConfig = this.configuracion.centroMapa || defaultCenter;
    // console.log(`🏢 Centro por defecto: ${centroConfig.lat}, ${centroConfig.lng}`);
    return {
      lat: centroConfig.lat,
      lng: centroConfig.lng,
      zoom: this.configuracion.zoom || defaultCenter.zoom
    };
  }

  /**
   * Agrega o actualiza el marcador de ubicación del usuario en el mapa
   */
  private agregarMarcadorUsuario(): void {
    if (!this.mapa || !this.leafletCargado || !this.ubicacionUsuario) {
      return;
    }

    const L = (window as any).L;

    // Remover marcador anterior si existe
    if (this.marcadorUbicacionUsuario) {
      this.mapa.removeLayer(this.marcadorUbicacionUsuario);
    }

    // Punto "tú estás aquí": el estilo vive en el SCSS (.user-location-marker)
    const iconoUsuario = L.divIcon({
      className: 'user-location-marker',
      html: '<div class="user-marker"><div class="user-marker__halo"></div><div class="user-marker__punto"></div></div>',
      iconSize: [22, 22],
      iconAnchor: [11, 11]
    });

    this.marcadorUbicacionUsuario = L.marker(
      [this.ubicacionUsuario.lat, this.ubicacionUsuario.lng],
      { icon: iconoUsuario, zIndexOffset: -100, keyboard: false }
    ).addTo(this.mapa);

    this.marcadorUbicacionUsuario.bindPopup('<div class="mpop"><div class="mpop__nombre">Tu ubicación</div></div>');

    // console.log(`📍 Marcador de usuario agregado en: ${this.ubicacionUsuario.lat}, ${this.ubicacionUsuario.lng}`);
  }

  private inicializarMapa(): void {
    if (!this.leafletCargado || !this.mapaContainer) {
      return;
    }

    // Verificar si el mapa ya está inicializado
    if (this.mapa) {
      // console.log('🗺️ Mapa ya inicializado, omitiendo reinicialización');
      return;
    }

    // Verificar si el contenedor ya tiene un mapa de Leaflet
    const contenedor = this.mapaContainer.nativeElement;
    if (contenedor._leaflet_id) {
      // console.log('🗺️ Contenedor ya tiene un mapa de Leaflet, limpiando...');
      // Limpiar el contenedor
      contenedor._leaflet_id = undefined;
      contenedor.innerHTML = '';
    }

    try {
      const L = (window as any).L;

      // Calcular el centro inteligente del mapa
      const centroInteligente = this.calcularCentroInteligente();

      // Crear el mapa
      this.mapa = L.map(this.mapaContainer.nativeElement, {
        center: [centroInteligente.lat, centroInteligente.lng],
        zoom: centroInteligente.zoom,
        zoomControl: this.mostrarControles
      });

      // Capa base OpenStreetMap; el SCSS la desatura (.mapa-base) para que resalten pedidos y mensajeros
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors',
        maxZoom: 19,
        className: 'mapa-base'
      }).addTo(this.mapa);

      // Arrastrar el mapa suelta el seguimiento: el despachador tomó el control de la cámara
      this.mapa.on('dragstart', () => {
        if (this.siguiendoId) {
          this.siguiendoId = null;
          this.refrescarIconosMensajeros();
          this.cd.detectChanges();
        }
      });

      this.capaMensajeros = L.layerGroup().addTo(this.mapa);
      this.capaZonasEntrega = L.layerGroup().addTo(this.mapa);

      // Agregar marcadores y zonas
      this.agregarMarcadores();
      this.actualizarMarcadoresMensajeros();
      this.dibujarZonasEntrega();

      // Agregar marcador de ubicación del usuario si está disponible
      if (this.ubicacionUsuario) {
        this.agregarMarcadorUsuario();
      }

      // Ajustar vista a todos los marcadores
      this.ajustarVistaAMarcadores();

    } catch (error) {
      console.error('Error inicializando mapa:', error);
    }
  }

  private agregarMarcadores(): void {
    if (!this.mapa || !this.leafletCargado) {
      return;
    }

    const L = (window as any).L;
    
    // Limpiar marcadores existentes
    this.marcadores.forEach(marcador => {
      this.mapa.removeLayer(marcador);
    });
    this.marcadores = [];
    const generacion = ++this.generacionMarcadores;

    // Agregar nuevos marcadores con animación
    this.configuracion.ubicaciones.forEach((ubicacion, index) => {
      if (ubicacion.latitud && ubicacion.longitud) {
        // Verificar si es un marcador nuevo (para animación)
        const isNewMarker = index >= this.ultimosLocationsProcesados;
        
        // Los demás estados (en producción, sin producir…) van en gris, como "En preparación" en la leyenda
        const iconoConfig = this.iconosEstado[ubicacion.estado] || { color: COLOR_OTRO_ESTADO };

        // Pin plano del color del estado (el mismo de la leyenda)
        const icono = L.divIcon({
          className: 'custom-marker',
          html: `
            <div class="pedido-pin ${isNewMarker ? 'marker-new' : ''}" style="--pin: ${iconoConfig.color}">
              <div class="pedido-pin__cabeza"><div class="pedido-pin__centro"></div></div>
            </div>
          `,
          iconSize: [28, 36],
          iconAnchor: [14, 34],
          popupAnchor: [0, -30]
        });

        // Crear marcador
        const marcador = L.marker([ubicacion.latitud, ubicacion.longitud], { icon: icono });

        // Crear popup con información del pedido
        const popupContent = this.crearContenidoPopup(ubicacion);
        marcador.bindPopup(popupContent);

        // Agregar evento de click
        marcador.on('click', () => {
          this.onMarcadorClick(ubicacion);
        });

        // Se registra ya (para encuadrar y para limpiarlo en el próximo redibujo) y entra al mapa escalonado
        this.marcadores.push(marcador);
        if (isNewMarker) {
          setTimeout(() => {
            if (generacion === this.generacionMarcadores && this.mapa) marcador.addTo(this.mapa);
          }, Math.min(index * 40, 1200)); // escalonado corto: con cientos de pedidos no tarda medio minuto
        } else {
          marcador.addTo(this.mapa);
        }
      }
    });
    
    // Actualizar contador de ubicaciones procesadas
    this.ultimosLocationsProcesados = this.configuracion.ubicaciones.length;
  }

  /**
   * Sincroniza los marcadores con `this.mensajeros`: mueve los que ya existen (con animación corta),
   * crea los nuevos y quita los que dejaron de enviar. Así un popup abierto no se cierra en cada aviso.
   */
  private actualizarMarcadoresMensajeros(): void {
    if (!this.mapa || !this.leafletCargado || !this.capaMensajeros) {
      return;
    }

    if (!this.mostrarMensajeros) {
      this.limpiarCapaMensajeros();
      return;
    }

    const L = (window as any).L;
    const vigentes = new Set<string>();

    this.mensajeros.forEach(mensajero => {
      if (!Number.isFinite(mensajero.lat) || !Number.isFinite(mensajero.lng)) {
        return;
      }
      vigentes.add(mensajero.id);
      this.registrarPuntoRecorrido(mensajero);

      const existente = this.marcadoresMensajeros.get(mensajero.id);
      const firma = this.firmaIconoMensajero(mensajero);

      if (existente) {
        const intervalo = existente.marca !== null && mensajero.marca !== null ? mensajero.marca - existente.marca : null;
        existente.marca = mensajero.marca;
        this.moverSuave(mensajero.id, existente.marcador, [mensajero.lat, mensajero.lng], intervalo);
        if (existente.firmaIcono !== firma) {
          existente.marcador.setIcon(this.iconoMensajero(mensajero));
          existente.firmaIcono = firma;
        }
        this.aplicarRumbo(existente, mensajero.rumbo);
      } else {
        const marcador = L.marker([mensajero.lat, mensajero.lng], {
          icon: this.iconoMensajero(mensajero),
          zIndexOffset: 1000,
          riseOnHover: true
        });
        // Función y no texto armado: Leaflet la evalúa al abrir el popup, así el "hace X min"
        // siempre está al día. El nombre sale de datos que escriben las apps: se escapa.
        marcador.bindPopup(() => this.popupMensajero(mensajero.id), { closeButton: false, offset: [0, -14] });
        this.capaMensajeros.addLayer(marcador);
        const nuevo = { marcador, firmaIcono: firma, marca: mensajero.marca };
        this.marcadoresMensajeros.set(mensajero.id, nuevo);
        this.aplicarRumbo(nuevo, mensajero.rumbo);
      }

      if (this.siguiendoId === mensajero.id) {
        this.marcadoresMensajeros.get(mensajero.id)?.marcador.closePopup();
        this.mapa.panTo([mensajero.lat, mensajero.lng], { animate: true, duration: 0.9 });
      }
    });

    // Quitar a quien ya no está (desconectado o sin punto en 15 min)
    Array.from(this.marcadoresMensajeros.keys()).forEach(id => {
      if (vigentes.has(id)) return;
      this.capaMensajeros.removeLayer(this.marcadoresMensajeros.get(id)!.marcador);
      this.marcadoresMensajeros.delete(id);
      const linea = this.lineasRecorrido.get(id);
      if (linea) this.capaMensajeros.removeLayer(linea);
      this.lineasRecorrido.delete(id);
      this.recorridos.delete(id);
      const anim = this.animaciones.get(id);
      if (anim) cancelAnimationFrame(anim);
      this.animaciones.delete(id);
      if (this.siguiendoId === id) this.siguiendoId = null;
    });
  }

  private limpiarCapaMensajeros(): void {
    this.animaciones.forEach(id => cancelAnimationFrame(id));
    this.animaciones.clear();
    this.capaMensajeros?.clearLayers();
    this.marcadoresMensajeros.clear();
    this.lineasRecorrido.clear();
    this.recorridos.clear();
    this.siguiendoId = null;
  }

  /** Recorrido desde que se abrió el mapa: solo se agregan puntos que de verdad cambiaron (≥ 8 m). */
  private registrarPuntoRecorrido(mensajero: UbicacionMensajero): void {
    const L = (window as any).L;
    const puntos = this.recorridos.get(mensajero.id) || [];
    const ultimo = puntos[puntos.length - 1];
    if (ultimo && L.latLng(ultimo).distanceTo([mensajero.lat, mensajero.lng]) < 8) {
      return;
    }
    puntos.push([mensajero.lat, mensajero.lng]);
    if (puntos.length > MAX_PUNTOS_RECORRIDO) puntos.shift();
    this.recorridos.set(mensajero.id, puntos);

    if (puntos.length < 2) return;
    const linea = this.lineasRecorrido.get(mensajero.id);
    if (linea) {
      linea.setLatLngs(puntos);
    } else {
      const nueva = L.polyline(puntos, {
        color: '#5F3FE0',
        weight: 3,
        opacity: 0.55,
        dashArray: '2 7',
        lineCap: 'round',
        interactive: false
      });
      this.capaMensajeros.addLayer(nueva);
      this.lineasRecorrido.set(mensajero.id, nueva);
    }
  }

  /**
   * Gira la flecha hacia donde va el mensajero por el camino corto (de 350° a 10° gira 20°, no 340°).
   * Se aplica sobre el elemento, sin regenerar el ícono, para no cortar el deslizamiento.
   */
  private aplicarRumbo(entrada: { marcador: any; giro?: number }, rumbo: number | undefined): void {
    if (rumbo === undefined) return;
    const anterior = entrada.giro ?? rumbo;
    const delta = ((rumbo - anterior) % 360 + 540) % 360 - 180;
    entrada.giro = anterior + delta;
    const flecha = entrada.marcador.getElement?.()?.querySelector('.mm__rumbo') as HTMLElement | null;
    if (flecha) flecha.style.transform = `rotate(${entrada.giro}deg)`;
  }

  /**
   * Desliza el marcador al punto nuevo. Si los puntos llegan seguido (2-5 s), dura lo mismo que el
   * intervalo y avanza parejo, para que nunca se detenga entre un punto y el siguiente.
   */
  private moverSuave(id: string, marcador: any, destino: [number, number], intervaloMs: number | null = null): void {
    const L = (window as any).L;
    const origen = marcador.getLatLng();
    const anterior = this.animaciones.get(id);
    if (anterior) cancelAnimationFrame(anterior);

    const distancia = origen.distanceTo(destino);
    if (distancia < 1 || distancia > MAX_METROS_ANIMACION) {
      marcador.setLatLng(destino);
      this.animaciones.delete(id);
      return;
    }

    const continuo = intervaloMs !== null && intervaloMs >= MIN_MS_DESLIZAR && intervaloMs <= MAX_MS_DESLIZAR;
    const duracion = continuo ? intervaloMs! : MS_DESLIZAR_CORTO;
    const inicio = performance.now();
    const paso = (ahora: number) => {
      const t = Math.min(1, (ahora - inicio) / duracion);
      const suave = continuo ? t : 1 - Math.pow(1 - t, 3);
      marcador.setLatLng(L.latLng(
        origen.lat + (destino[0] - origen.lat) * suave,
        origen.lng + (destino[1] - origen.lng) * suave
      ));
      if (t < 1) {
        this.animaciones.set(id, requestAnimationFrame(paso));
      } else {
        this.animaciones.delete(id);
      }
    };
    this.animaciones.set(id, requestAnimationFrame(paso));
  }

  /** El ícono solo se regenera si cambia algo visible (señal, nombre o seguimiento). */
  private firmaIconoMensajero(m: UbicacionMensajero): string {
    return `${m.senal}|${m.nombre}|${this.siguiendoId === m.id}|${m.rumbo !== undefined}`;
  }

  private iconoMensajero(m: UbicacionMensajero): any {
    const L = (window as any).L;
    const siguiendo = this.siguiendoId === m.id;
    return L.divIcon({
      className: 'custom-marker-mensajero',
      html: `
        <div class="mm mm--${m.senal} ${siguiendo ? 'mm--siguiendo' : ''}">
          ${m.senal === 'en-vivo' ? '<div class="mm__onda"></div>' : ''}
          ${m.rumbo !== undefined ? '<div class="mm__rumbo"><div class="mm__flecha"></div></div>' : ''}
          <div class="mm__avatar">${escaparHtml(this.iniciales(m.nombre))}</div>
          <div class="mm__nombre">${escaparHtml(this.nombreCorto(m.nombre))}</div>
        </div>
      `,
      iconSize: [40, 40],
      iconAnchor: [20, 20]
    });
  }

  private refrescarIconosMensajeros(): void {
    this.mensajeros.forEach(m => {
      const existente = this.marcadoresMensajeros.get(m.id);
      if (!existente) return;
      const firma = this.firmaIconoMensajero(m);
      if (existente.firmaIcono !== firma) {
        existente.marcador.setIcon(this.iconoMensajero(m));
        existente.firmaIcono = firma;
      }
    });
  }

  private popupMensajero(id: string): string {
    const m = this.mensajeros.find(x => x.id === id);
    if (!m) return '';
    const filas: string[] = [
      `<div class="mpop__fila"><span>Actualizado</span><b>${escaparHtml(this.textoActualizacion(m))}</b></div>`
    ];
    if (m.velocidad !== undefined && m.velocidad > 0.5) {
      filas.push(`<div class="mpop__fila"><span>Velocidad</span><b>${Math.round(m.velocidad * 3.6)} km/h</b></div>`);
    }
    if (m.bateria !== undefined) {
      filas.push(`<div class="mpop__fila"><span>Batería</span><b>${Math.round(m.bateria)}%</b></div>`);
    }
    return `
      <div class="mpop">
        <div class="mpop__cabeza">
          <div class="mpop__avatar mpop__avatar--${m.senal}">${escaparHtml(this.iniciales(m.nombre))}</div>
          <div>
            <div class="mpop__nombre">${escaparHtml(m.nombre)}</div>
            <div class="mpop__estado mpop__estado--${m.senal}">${m.senal === 'en-vivo' ? 'En vivo' : 'Sin señal reciente'}</div>
          </div>
        </div>
        ${filas.join('')}
      </div>
    `;
  }

  private crearContenidoPopup(ubicacion: UbicacionPedido): string {
    // cliente y dirección los escriben compradores en canales externos: todo se escapa
    const config = this.iconosEstado[ubicacion.estado];
    const color = config?.color || COLOR_OTRO_ESTADO;
    const fondo = config?.fondo || '#eef0f3';
    const etiqueta = config?.etiqueta || ubicacion.estado;
    const fila = (label: string, valor: any) =>
      `<div class="mpop__fila"><span>${label}</span><b>${escaparHtml(valor)}</b></div>`;

    return `
      <div class="mpop mpop--pedido">
        <div class="mpop__cabeza">
          <div>
            <div class="mpop__numero">#${escaparHtml(ubicacion.nroPedido)}</div>
            <div class="mpop__estado" style="color:${color};background:${fondo}">${escaparHtml(etiqueta)}</div>
          </div>
        </div>
        ${fila('Cliente', ubicacion.cliente)}
        ${fila('Dirección', ubicacion.direccion)}
        ${ubicacion.transportador ? fila('Mensajero', ubicacion.transportador) : ''}
        ${ubicacion.horaEstimada ? fila('Hora estimada', ubicacion.horaEstimada) : ''}
        ${ubicacion.tiempoEstimado ? fila('Tiempo estimado', `${ubicacion.tiempoEstimado} min`) : ''}
      </div>
    `;
  }

  public ajustarVistaAMarcadores(): void {
    if (!this.mapa) {
      return;
    }

    const L = (window as any).L;
    const marcadoresTotales = [...this.marcadores];
    if (this.mostrarMensajeros) {
      this.marcadoresMensajeros.forEach(({ marcador }) => marcadoresTotales.push(marcador));
    }

    if (marcadoresTotales.length === 0) {
      return;
    }

    const grupo = new L.featureGroup(marcadoresTotales);
    this.mapa.fitBounds(grupo.getBounds().pad(0.15), { maxZoom: 16 });
  }

  /** Clic en un mensajero de la lista: vuela hasta él y abre su ficha. */
  public centrarEnMensajero(m: UbicacionMensajero): void {
    const existente = this.marcadoresMensajeros.get(m.id);
    if (!this.mapa || !existente) return;
    this.mapa.flyTo(existente.marcador.getLatLng(), Math.max(this.mapa.getZoom(), 16), { duration: 0.8 });
    existente.marcador.openPopup();
  }

  /** Seguir: la cámara acompaña al mensajero en cada punto nuevo, hasta que se arrastre el mapa. */
  public alternarSeguir(m: UbicacionMensajero): void {
    this.siguiendoId = this.siguiendoId === m.id ? null : m.id;
    this.refrescarIconosMensajeros();
    const existente = this.marcadoresMensajeros.get(m.id);
    if (this.siguiendoId && existente && this.mapa) {
      // Sin ficha abierta: Leaflet re-encuadra una ficha abierta en cada paso de la animación y
      // le quita la cámara al seguimiento
      existente.marcador.closePopup();
      this.mapa.flyTo(existente.marcador.getLatLng(), Math.max(this.mapa.getZoom(), 16), { duration: 0.8 });
    }
  }

  public iniciales(nombre: string): string {
    const partes = String(nombre || '').trim().split(/\s+/).filter(Boolean);
    return ((partes[0]?.[0] || '?') + (partes[1]?.[0] || '')).toUpperCase();
  }

  private nombreCorto(nombre: string): string {
    const partes = String(nombre || '').trim().split(/\s+/).filter(Boolean);
    return partes.length > 1 ? `${partes[0]} ${partes[1][0]}.` : (partes[0] || '');
  }

  public porId(_: number, m: UbicacionMensajero): string {
    return m.id;
  }

  get mostrarPanelMensajeros(): boolean {
    return this.mostrarControles && this.mostrarMensajeros;
  }

  get mensajerosEnVivo(): number {
    return this.mensajeros.filter(m => m.senal === 'en-vivo').length;
  }

  // Ticket 1159: antes un temporizador movía al azar, cada 30 s, los marcadores de pedidos Despachado
  // (y bajaba su tiempo estimado): ubicaciones inventadas en un mapa que se usa para ubicar mensajeros.
  // El movimiento real es el de los mensajeros, que llega de active_users.

  // Método público para actualizar configuración
  actualizarConfiguracion(nuevaConfiguracion: ConfiguracionMapa): void {
    this.configuracion = { ...this.configuracion, ...nuevaConfiguracion };
    
    if (this.mapa) {
      this.agregarMarcadores();
      this.ajustarVistaAMarcadores();
    }
  }

  // Método público para centrar en una ubicación específica
  centrarEnUbicacion(nroPedido: string): void {
    const ubicacion = this.configuracion.ubicaciones.find(u => u.nroPedido === nroPedido);
    
    if (ubicacion && ubicacion.latitud && ubicacion.longitud && this.mapa) {
      this.mapa.setView([ubicacion.latitud, ubicacion.longitud], 15);
      
      // Abrir popup del marcador correspondiente
      const marcador = this.marcadores.find((m, index) => 
        this.configuracion.ubicaciones[index].nroPedido === nroPedido
      );
      
      if (marcador) {
        marcador.openPopup();
      }
    }
  }

  // Evento cuando se hace click en un marcador
  private onMarcadorClick(ubicacion: UbicacionPedido): void {
    // Emitir evento o realizar acción específica
    // console.log('Pedido seleccionado:', ubicacion);
  }

  // Métodos getter unificados (ahora usan métricas del Input)
  get contadorDespachados(): number {
    return this.metricas.despachados;
  }

  get contadorParaDespachar(): number {
    return this.metricas.paraDespachar;
  }

  get contadorEmpacados(): number {
    return this.metricas.empacados;
  }

  get contadorProducidos(): number {
    return this.metricas.producidos;
  }

  /** Pedidos en el mapa con un estado fuera de los cuatro de la leyenda (pin gris). */
  get contadorOtrosEstados(): number {
    return (this.configuracion?.ubicaciones || []).filter(
      u => u.latitud && u.longitud && !this.iconosEstado[u.estado]
    ).length;
  }

  get contadorPendientes(): number {
    return this.metricas.pendientes;
  }

  get contadorEnRuta(): number {
    return this.metricas.enRuta;
  }

  // Método público para obtener estadísticas del mapa (unificado)
  obtenerEstadisticas() {
    const stats = {
      totalUbicaciones: this.configuracion.ubicaciones.length,
      enRuta: this.metricas.enRuta,
      paraDespacho: this.metricas.paraDespachar,
      empacados: this.metricas.empacados,
      tiempoPromedioEstimado: this.metricas.tiempoPromedioEstimado || this.calcularTiempoPromedioEstimado()
    };

    return stats;
  }

  private calcularTiempoPromedioEstimado(): number {
    const tiempos = this.configuracion.ubicaciones
      .filter(u => u.tiempoEstimado && u.tiempoEstimado > 0)
      .map(u => u.tiempoEstimado!);
    
    if (tiempos.length === 0) return 0;
    
    return Math.round(tiempos.reduce((sum, tiempo) => sum + tiempo, 0) / tiempos.length);
  }

  private escucharUbicacionMensajeros(): void {
    if (this.mensajerosSubscription) {
      this.mensajerosSubscription.unsubscribe();
    }

    this.iniciarPurgaMensajeros();
    const activeUsersRef = this.db.list('active_users');
    this.mensajerosSubscription = activeUsersRef.snapshotChanges().subscribe(snapshots => {
      this.mensajeros = snapshots
        // Ticket 1159: solo los mensajeros de ESTA empresa (la clave termina en la de la empresa).
        .filter(snapshot => !!this.companyName && perteneceAEmpresa(snapshot.key, this.companyName))
        // Ticket 1154: solo ubicaciones de los últimos 15 minutos de quien no figura desconectado.
        .filter(snapshot => ubicacionVigente(snapshot.payload.val() as any))
        .map(snapshot => this.aMensajero(snapshot.key as string, snapshot.payload.val() as any))
        .sort((a, b) => (b.marca || 0) - (a.marca || 0));

      this.actualizarMarcadoresMensajeros();
      this.cd.detectChanges();
    }, error => {
      console.error('❌ [ERROR] Error escuchando ubicación de mensajeros:', error);
    });
  }

  /**
   * Solo se toman los campos que el mapa usa (no se esparce el nodo entero: un campo cualquiera de
   * `active_users` no debe pisar el nombre ni la posición). Velocidad y batería, si la app las manda.
   */
  private aMensajero(clave: string, dato: any): UbicacionMensajero {
    const marca = marcaDeUbicacion(dato);
    const nombrePropio = typeof dato?.nombre === 'string' ? dato.nombre.trim() : '';
    const numero = (v: any) => (v === null || v === undefined || v === '' || !Number.isFinite(Number(v)) ? undefined : Number(v));
    return {
      id: clave,
      nombre: nombrePropio || nombreDesdeClave(clave, this.companyName) || 'Mensajero',
      lat: Number(dato?.lat),
      lng: Number(dato?.lng),
      timestamp: dato?.timestamp,
      lastUpdate: dato?.lastUpdate,
      conectado: dato?.conectado,
      marca,
      senal: senalMensajero(marca),
      hace: marca === null ? 'sin dato' : haceCuanto(marca),
      velocidad: numero(dato?.velocidad ?? dato?.speed),
      bateria: numero(dato?.bateria ?? dato?.battery),
      rumbo: numero(dato?.rumbo),
      precision: numero(dato?.precision ?? dato?.accuracy)
    };
  }

  /**
   * Firebase solo avisa cuando alguien escribe: si un mensajero deja de enviar, nadie dispara el
   * filtro. Cada 30 s se quitan los puntos de más de 15 minutos y se refrescan "hace X min" y la señal.
   */
  private iniciarPurgaMensajeros(): void {
    this.purgaMensajerosSubscription?.unsubscribe();
    this.purgaMensajerosSubscription = interval(30000).subscribe(() => {
      const ahora = Date.now();
      this.mensajeros = this.mensajeros
        .filter(m => ubicacionVigente(m, ahora))
        .map(m => ({
          ...m,
          senal: senalMensajero(m.marca, ahora),
          hace: m.marca === null ? 'sin dato' : haceCuanto(m.marca, ahora)
        }));
      this.actualizarMarcadoresMensajeros();
      this.cd.detectChanges();
    });
  }

  private textoActualizacion(mensajero: UbicacionMensajero): string {
    const marca = marcaDeUbicacion(mensajero);
    if (marca === null) return 'sin dato';
    const hora = new Date(marca).toLocaleTimeString('es-CO', { hour: 'numeric', minute: '2-digit' });
    return `${haceCuanto(marca)} · ${hora}`;
  }

  public toggleMensajeros(event: any): void {
    this.mostrarMensajeros = event.target.checked;
    if (this.mostrarMensajeros) {
      this.escucharUbicacionMensajeros();
    } else {
      if (this.mensajerosSubscription) {
        this.mensajerosSubscription.unsubscribe();
        this.mensajerosSubscription = null;
      }
      this.purgaMensajerosSubscription?.unsubscribe();
      this.purgaMensajerosSubscription = null;
      this.mensajeros = [];
      this.limpiarCapaMensajeros();
    }
    this.cd.detectChanges();
    // El panel lateral aparece o se va: el mapa cambia de ancho y Leaflet debe medirse otra vez
    requestAnimationFrame(() => this.mapa?.invalidateSize());
  }

  /**
   * Dibuja las zonas de entrega como polígonos en el mapa
   */
  private dibujarZonasEntrega(): void {
    if (!this.mapa || !this.leafletCargado || !this.capaZonasEntrega) {
      // console.log('🗺️ [DEBUG] No se pueden dibujar zonas - falta inicialización del mapa');
      return;
    }

    // console.log('🗺️ [DEBUG] Dibujando zonas de entrega...');
    // console.log('🗺️ [DEBUG] Zonas disponibles:', this.configuracionZonas.zonas.length);
    // console.log('🗺️ [DEBUG] Mostrar zonas:', this.configuracionZonas.mostrarZonas && this.mostrarZonasEntrega);

    // Limpiar polígonos existentes
    this.capaZonasEntrega.clearLayers();
    this.poligonosZonas = [];

    if (!this.configuracionZonas.mostrarZonas || !this.mostrarZonasEntrega) {
      // console.log('🗺️ [DEBUG] Zonas de entrega están ocultas');
      return;
    }

    const L = (window as any).L;

    this.configuracionZonas.zonas.forEach((zona, index) => {
      if (!zona.activa || zona.coordenadas.length < 3) {
        // console.log(`🗺️ [DEBUG] Zona "${zona.nombre}" no activa o sin suficientes coordenadas`);
        return;
      }

      // console.log(`🗺️ [DEBUG] Dibujando zona: ${zona.nombre} con ${zona.coordenadas.length} coordenadas`);

      // Convertir coordenadas al formato de Leaflet
      const coordenadasLeaflet = zona.coordenadas.map(coord => [coord.lat, coord.lng]);

      // Configurar estilo del polígono
      const estiloPoligono = this.obtenerEstiloZona(zona);

      // Crear polígono
      const poligono = L.polygon(coordenadasLeaflet, estiloPoligono);

      // Crear contenido del popup
      const popupContent = this.crearContenidoPopupZona(zona);
      poligono.bindPopup(popupContent);

      // Agregar eventos
      poligono.on('mouseover', () => {
        poligono.setStyle({
          weight: estiloPoligono.weight + 2,
          opacity: Math.min(estiloPoligono.opacity + 0.3, 1)
        });
      });

      poligono.on('mouseout', () => {
        poligono.setStyle(estiloPoligono);
      });

      poligono.on('click', () => {
        this.onZonaClick(zona);
      });

      // Agregar al mapa
      this.capaZonasEntrega.addLayer(poligono);
      this.poligonosZonas.push({
        zona: zona,
        poligono: poligono
      });

      // console.log(`✅ [DEBUG] Zona "${zona.nombre}" dibujada exitosamente`);
    });

    // console.log(`🗺️ [DEBUG] Total zonas dibujadas: ${this.poligonosZonas.length}`);
  }

  /**
   * Obtiene el estilo para una zona específica
   */
  private obtenerEstiloZona(zona: ZonaEntrega): any {
    // Relleno suave: la zona es contexto, lo que se sigue son pedidos y mensajeros
    const opacidad = Math.min(zona.opacidad || 0.12, 0.18);
    const tipoVisualizacion = this.configuracionZonas.tipoVisualizacion;

    return {
      color: zona.colorBorde || zona.color,
      weight: 1.5,
      opacity: tipoVisualizacion === 'relleno' ? 0 : 0.7,
      dashArray: '6 4',
      fillColor: zona.color,
      fillOpacity: tipoVisualizacion === 'borde' ? 0 : opacidad,
      interactive: true
    };
  }

  /**
   * Crea el contenido del popup para una zona
   */
  private crearContenidoPopupZona(zona: ZonaEntrega): string {
    const r = zona.restricciones;
    const e = zona.estadisticas;
    const fila = (label: string, valor: any) =>
      `<div class="mpop__fila"><span>${label}</span><b>${escaparHtml(valor)}</b></div>`;

    return `
      <div class="mpop">
        <div class="mpop__cabeza">
          <div class="mpop__zona" style="background:${escaparHtml(zona.color)}"></div>
          <div>
            <div class="mpop__nombre">${escaparHtml(zona.nombre)}</div>
            ${zona.descripcion ? `<div class="mpop__desc">${escaparHtml(zona.descripcion)}</div>` : ''}
          </div>
        </div>
        ${r?.horarioMinimo && r?.horarioMaximo ? fila('Horario', `${r.horarioMinimo} – ${r.horarioMaximo}`) : ''}
        ${r?.costoAdicional ? fila('Costo adicional', `$${r.costoAdicional.toLocaleString('es-CO')}`) : ''}
        ${e ? fila('Entregados', e.pedidosEntregados) : ''}
        ${e ? fila('Tiempo promedio', `${e.tiempoPromedioEntrega} min`) : ''}
        ${e ? fila('Éxito', `${e.porcentajeExitoso}%`) : ''}
      </div>
    `;
  }

  /**
   * Maneja el click en una zona
   */
  private onZonaClick(zona: ZonaEntrega): void {
    // console.log('🗺️ [DEBUG] Click en zona:', zona.nombre);
    // Aquí se puede agregar lógica adicional como filtrar pedidos de esa zona
  }

  /**
   * Toggle para mostrar/ocultar zonas de entrega
   */
  public toggleZonasEntrega(event: any): void {
    this.mostrarZonasEntrega = event.target.checked;
    this.dibujarZonasEntrega();
    this.cd.detectChanges();
  }

  /**
   * Actualiza las zonas cuando cambia la configuración
   */
  public actualizarZonas(): void {
    if (this.mapa && this.leafletCargado) {
      this.dibujarZonasEntrega();
    }
  }

  /**
   * Getter para obtener zonas activas
   * Resuelve el problema de usar filter() directamente en el template
   */
  get zonasActivas(): ZonaEntrega[] {
    return this.configuracionZonas.zonas.filter(z => z.activa);
  }

  /**
   * Getter para verificar si hay zonas activas disponibles
   */
  get tieneZonasActivas(): boolean {
    return this.zonasActivas.length > 0;
  }

  /**
   * Getter para obtener el conteo de zonas activas
   */
  get contadorZonasActivas(): number {
    return this.zonasActivas.length;
  }

  /**
   * Getter para tiempo promedio estimado
   * Resuelve el problema de llamar obtenerEstadisticas() en el template
   */
  get tiempoPromedioEstimado(): number {
    return this.obtenerEstadisticas().tiempoPromedioEstimado || 0;
  }
}