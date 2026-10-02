import { Component, Input, OnInit, AfterViewInit, OnDestroy, ElementRef, ViewChild, ChangeDetectorRef } from '@angular/core';
import { AngularFireDatabase } from '@angular/fire/compat/database';
import { Subscription } from 'rxjs';
import { SecurityService } from '../../../../shared/services/security/security.service';

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

/** Estado de la ubicación de un mensajero según qué tan reciente es y si la app sigue conectada. */
type EstadoMensajero = 'en-vivo' | 'sin-senal' | 'desconectado';

interface UbicacionMensajero {
  /** Id del transportador en Katuq (o su clave de rastreo si no tiene). */
  id: string;
  nombre: string;
  lat: number;
  lng: number;
  /** Hora (ms, reloj del servidor) del último punto recibido. */
  ultimaActualizacion: number;
  /** false cuando la app se cerró o perdió la conexión sin ponerse fuera de línea. */
  conectado: boolean;
  precision?: number;
  velocidad?: number;
  bateria?: number;
  estado: EstadoMensajero;
  pedidosEnRuta: number;
}

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

/** Un punto con menos de 3 min se muestra "en vivo" (la app publica al menos cada minuto mientras está en línea). */
const EN_VIVO_MS = 3 * 60 * 1000;
/** Puntos más viejos que esto no se muestran: el mensajero ya no está trabajando. */
const MAX_ANTIGUEDAD_MS = 8 * 60 * 60 * 1000;
const MAX_PUNTOS_RECORRIDO = 60;

@Component({
  selector: 'app-mapa-ubicaciones',
  templateUrl: './mapa-ubicaciones.component.html',
  styleUrls: ['./mapa-ubicaciones.component.scss']
})
export class MapaUbicacionesComponent implements OnInit, AfterViewInit, OnDestroy {
  @ViewChild('mapaContainer', { static: true }) mapaContainer!: ElementRef;
  
  @Input() configuracion: ConfiguracionMapa = {
    centroMapa: { lat: 4.6097, lng: -74.0817 },
    zoom: 11,
    ubicaciones: []
  };
  
  @Input() altura: string = '400px';
  @Input() mostrarControles: boolean = true;
  @Input() tiempoReal: boolean = false;
  @Input() geocodingInProgress: boolean = false;
  @Input() geocodingProgress: number = 0;
  @Input() verMensajeros: boolean = true;

  /**
   * Transportadores de la empresa (los de Despachos). El mapa solo escucha la ubicación de estos, cada uno en su
   * propio nodo de `active_users`: nunca descarga ni muestra mensajeros de otras empresas.
   */
  @Input() set transportadores(lista: any[] | null) {
    this.transportadoresEmpresa = Array.isArray(lista) ? lista : [];
    if (this.mostrarMensajeros) this.escucharUbicacionMensajeros();
  }
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
    private marcadorUbicacionUsuario: any = null;
  
  public mostrarMensajeros: boolean = true;
  public mostrarZonasEntrega: boolean = true;
  public mensajeros: UbicacionMensajero[] = [];

  intervalTimer: any = null;
  private transportadoresEmpresa: any[] = [];
  /** Suscripción por clave de rastreo (`active_users/{clave}`). */
  private suscripcionesRastreo = new Map<string, Subscription>();
  /** Último dato recibido por clave de rastreo. */
  private datosRastreo = new Map<string, any>();
  /** Clave de rastreo -> transportador al que pertenece. */
  private transportadorPorClave = new Map<string, any>();
  private offsetServidorMs = 0;
  private offsetSubscription: Subscription | null = null;
  private marcadoresMensajero = new Map<string, any>();
  private recorridos = new Map<string, Array<[number, number]>>();
  private lineasRecorrido = new Map<string, any>();
  /** Mensajero al que el mapa sigue (se centra en cada actualización). */
  public mensajeroSeguido: string | null = null;
  /** Mensajeros de la empresa sin una ubicación reciente (no aparecen en el mapa). */
  public mensajerosSinUbicacion = 0;
  leafletCargado: boolean = false;
  marcadoresAnimandose: Set<string> = new Set();
  ultimosLocationsProcesados: number = 0;
  private ubicacionUsuario: { lat: number; lng: number } | null = null;
  private usandoUbicacionUsuario: boolean = false;

  // Configuración de íconos para diferentes estados
  iconosEstado = {
    'Despachado': {
      color: 'green',
      icon: '🚚',
      animation: true
    },
    'ParaDespachar': {
      color: 'orange',
      icon: '📦',
      animation: false
    },
    'Empacado': {
      color: 'blue',
      icon: '📋',
      animation: false
    },
    'ProducidoTotalmente': {
      color: 'purple',
      icon: '✅',
      animation: false
    }
  };

  constructor(
    private db: AngularFireDatabase, 
    private cd: ChangeDetectorRef,
    private securityService: SecurityService
  ) { }

  ngOnInit(): void {
    this.mostrarMensajeros = this.verMensajeros;
    this.cargarLeaflet();
    if (this.mostrarMensajeros) {
      this.escucharUbicacionMensajeros();
    }
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
    this.dejarDeEscucharMensajeros();
    if (this.mapa) {
      this.mapa.remove();
      this.mapa = null;
    }
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
    this.marcadoresMensajero.clear();
    this.lineasRecorrido.clear();
    this.capaZonasEntrega = null;

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

    // Crear nuevo marcador con ícono distintivo para el usuario
    const iconoUsuario = L.divIcon({
      className: 'user-location-marker',
      html: `
        <div class="user-marker-container" style="
          background: linear-gradient(45deg, #007bff, #0056b3);
          border-radius: 50%;
          width: 20px;
          height: 20px;
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          font-weight: bold;
          font-size: 12px;
          border: 3px solid white;
          box-shadow: 0 2px 8px rgba(0,123,255,0.5);
          animation: user-location-pulse 2s infinite;
          position: relative;
        ">
          📍
          <div style="
            position: absolute;
            top: -5px;
            left: -5px;
            right: -5px;
            bottom: -5px;
            border: 2px solid rgba(0,123,255,0.4);
            border-radius: 50%;
            animation: user-location-ring 2s infinite;
          "></div>
        </div>
      `,
      iconSize: [26, 26],
      iconAnchor: [13, 13]
    });

    // Crear el marcador
    this.marcadorUbicacionUsuario = L.marker(
      [this.ubicacionUsuario.lat, this.ubicacionUsuario.lng],
      { icon: iconoUsuario }
    ).addTo(this.mapa);

    // Agregar popup informativo
    this.marcadorUbicacionUsuario.bindPopup(`
      <div style="text-align: center;">
        <strong>📍 Tu ubicación</strong><br>
        <small>Lat: ${this.ubicacionUsuario.lat.toFixed(6)}<br>
        Lng: ${this.ubicacionUsuario.lng.toFixed(6)}</small>
      </div>
    `);

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

      // Agregar capa de tiles (OpenStreetMap)
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors',
        maxZoom: 18
      }).addTo(this.mapa);

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

      // Configurar actualización en tiempo real si está habilitada
      if (this.tiempoReal) {
        this.iniciarActualizacionTiempoReal();
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

    // Agregar nuevos marcadores con animación
    this.configuracion.ubicaciones.forEach((ubicacion, index) => {
      if (ubicacion.latitud && ubicacion.longitud) {
        // Verificar si es un marcador nuevo (para animación)
        const isNewMarker = index >= this.ultimosLocationsProcesados;
        
        const iconoConfig = this.iconosEstado[ubicacion.estado] || this.iconosEstado['ParaDespachar'];
        
        // Crear ícono personalizado con animación condicional
        const icono = L.divIcon({
          className: 'custom-marker',
          html: `
            <div class="marker-container ${isNewMarker ? 'marker-new' : ''}" style="
              background-color: ${iconoConfig.color};
              border-radius: 50%;
              width: 30px;
              height: 30px;
              display: flex;
              align-items: center;
              justify-content: center;
              color: white;
              font-weight: bold;
              font-size: 12px;
              border: 2px solid white;
              box-shadow: 0 2px 6px rgba(0,0,0,0.3);
              ${iconoConfig.animation ? 'animation: pulse 2s infinite;' : ''}
              ${isNewMarker ? 'animation: marker-drop 0.8s ease-out forwards;' : ''}
            ">
              ${iconoConfig.icon}
            </div>
          `,
          iconSize: [30, 30],
          iconAnchor: [15, 15]
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

        // Agregar al mapa con delay para animación escalonada
        if (isNewMarker) {
          setTimeout(() => {
            marcador.addTo(this.mapa);
            this.marcadores.push(marcador);
          }, index * 100); // 100ms de delay entre marcadores
        } else {
          marcador.addTo(this.mapa);
          this.marcadores.push(marcador);
        }
      }
    });
    
    // Actualizar contador de ubicaciones procesadas
    this.ultimosLocationsProcesados = this.configuracion.ubicaciones.length;
  }

  private actualizarMarcadoresMensajeros(): void {
    if (!this.mapa || !this.leafletCargado || !this.capaMensajeros) return;
    const L = (window as any).L;

    if (!this.mostrarMensajeros) {
      this.capaMensajeros.clearLayers();
      this.marcadoresMensajero.clear();
      this.lineasRecorrido.clear();
      this.recorridos.clear();
      return;
    }

    const vigentes = new Set(this.mensajeros.map(m => m.id));
    // Mensajeros que ya no están (fuera de línea, o su último punto venció): se quitan del mapa.
    Array.from(this.marcadoresMensajero.keys()).filter(id => !vigentes.has(id)).forEach(id => {
      this.capaMensajeros.removeLayer(this.marcadoresMensajero.get(id));
      this.marcadoresMensajero.delete(id);
      const linea = this.lineasRecorrido.get(id);
      if (linea) this.capaMensajeros.removeLayer(linea);
      this.lineasRecorrido.delete(id);
      this.recorridos.delete(id);
      if (this.mensajeroSeguido === id) this.mensajeroSeguido = null;
    });

    this.mensajeros.forEach(m => {
      const posicion: [number, number] = [m.lat, m.lng];
      const icono = L.divIcon({
        className: 'custom-marker-mensajero',
        html: `<div class="marker-mensajero-content marker-mensajero--${m.estado}">
                 <span class="marker-mensajero-icon">🛵</span>
                 ${m.estado === 'en-vivo' ? '<div class="marker-mensajero-pulse"></div>' : ''}
               </div>
               <div class="marker-mensajero-nombre">${this.escaparHtml(m.nombre.split(' ')[0])}</div>`,
        iconSize: [40, 54],
        iconAnchor: [20, 40],
        popupAnchor: [0, -36],
      });
      let marcador = this.marcadoresMensajero.get(m.id);
      if (!marcador) {
        marcador = L.marker(posicion, { icon: icono, zIndexOffset: 1000 });
        marcador.bindPopup(this.crearPopupMensajero(m));
        this.capaMensajeros.addLayer(marcador);
        this.marcadoresMensajero.set(m.id, marcador);
      } else {
        marcador.setLatLng(posicion);
        marcador.setIcon(icono);
        marcador.setPopupContent(this.crearPopupMensajero(m));
      }

      // Recorrido desde que se abrió el mapa (últimos puntos, solo si se movió).
      const recorrido = this.recorridos.get(m.id) || [];
      const ultimo = recorrido[recorrido.length - 1];
      if (!ultimo || this.mapa.distance(ultimo, posicion) > 10) {
        recorrido.push(posicion);
        if (recorrido.length > MAX_PUNTOS_RECORRIDO) recorrido.shift();
        this.recorridos.set(m.id, recorrido);
      }
      let linea = this.lineasRecorrido.get(m.id);
      if (recorrido.length > 1) {
        if (!linea) {
          linea = L.polyline(recorrido, { color: '#6C4CE0', weight: 3, opacity: 0.55, dashArray: '6 6' });
          this.capaMensajeros.addLayer(linea);
          this.lineasRecorrido.set(m.id, linea);
        } else {
          linea.setLatLngs(recorrido);
        }
      }

      if (this.mensajeroSeguido === m.id) this.mapa.panTo(posicion);
    });
  }

  /** Ficha del mensajero. Todo lo que viene de datos se escapa antes de ir al HTML de Leaflet. */
  private crearPopupMensajero(m: UbicacionMensajero): string {
    const filas: string[] = [];
    filas.push(`<strong>${this.escaparHtml(this.textoEstadoMensajero(m))}</strong>`);
    if (m.pedidosEnRuta > 0) filas.push(`${m.pedidosEnRuta} pedido${m.pedidosEnRuta === 1 ? '' : 's'} en ruta`);
    if (m.velocidad !== undefined && m.velocidad > 0.5) filas.push(`${Math.round(m.velocidad * 3.6)} km/h`);
    if (m.bateria !== undefined) filas.push(`Batería ${Math.round(m.bateria)}%`);
    if (m.precision !== undefined) filas.push(`Precisión ±${Math.round(m.precision)} m`);
    return `<div class="popup-mensajero">
              <div class="popup-mensajero__nombre">${this.escaparHtml(m.nombre)}</div>
              <div class="popup-mensajero__detalle">${filas.join('<br>')}</div>
            </div>`;
  }

  private escaparHtml(texto: string): string {
    return String(texto ?? '').replace(/[&<>"']/g, c => (
      { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' } as Record<string, string>
    )[c]);
  }

  private crearContenidoPopup(ubicacion: UbicacionPedido): string {
    const estadoClass = this.obtenerClaseEstado(ubicacion.estado);
    
    return `
      <div class="popup-pedido" style="min-width: 200px; font-family: Arial, sans-serif;">
        <div style="border-bottom: 1px solid #eee; padding-bottom: 8px; margin-bottom: 8px;">
          <h6 style="margin: 0; color: #333; font-size: 14px;">
            <strong>Pedido #${ubicacion.nroPedido}</strong>
          </h6>
          <span class="badge ${estadoClass}" style="
            font-size: 10px; 
            padding: 2px 6px; 
            border-radius: 12px;
            margin-top: 4px;
            display: inline-block;
          ">${ubicacion.estado}</span>
        </div>
        
        <div style="font-size: 12px; color: #666; line-height: 1.4;">
          <div style="margin-bottom: 4px;">
            <strong>Cliente:</strong> ${ubicacion.cliente}
          </div>
          <div style="margin-bottom: 4px;">
            <strong>Dirección:</strong> ${ubicacion.direccion}
          </div>
          ${ubicacion.transportador ? `
            <div style="margin-bottom: 4px;">
              <strong>Transportador:</strong> ${ubicacion.transportador}
            </div>
          ` : ''}
          ${ubicacion.horaEstimada ? `
            <div style="margin-bottom: 4px;">
              <strong>Hora estimada:</strong> ${ubicacion.horaEstimada}
            </div>
          ` : ''}
          ${ubicacion.tiempoEstimado ? `
            <div style="margin-bottom: 4px;">
              <strong>Tiempo estimado:</strong> ${ubicacion.tiempoEstimado} min
            </div>
          ` : ''}
        </div>
      </div>
    `;
  }

  private obtenerClaseEstado(estado: string): string {
    const clases = {
      'Despachado': 'bg-success',
      'ParaDespachar': 'bg-warning',
      'Empacado': 'bg-info',
      'ProducidoTotalmente': 'bg-primary'
    };
    return clases[estado] || 'bg-secondary';
  }

  public ajustarVistaAMarcadores(): void {
    if (!this.mapa || (this.marcadores.length === 0 && this.marcadoresMensajero.size === 0)) {
      return;
    }

    const L = (window as any).L;
    const marcadoresTotales = [...this.marcadores];
    if (this.mostrarMensajeros && this.capaMensajeros) {
      marcadoresTotales.push(...this.capaMensajeros.getLayers());
    }

    if (marcadoresTotales.length === 0) {
      return;
    }

    const grupo = new L.featureGroup(marcadoresTotales);
    this.mapa.fitBounds(grupo.getBounds().pad(0.1));
  }

  private iniciarActualizacionTiempoReal(): void {
    // El tiempo real son las ubicaciones de los mensajeros (RTDB). Antes este temporizador movía los pedidos al azar
    // para simular avance, y el mapa mostraba posiciones que no existían.
    if (this.mostrarMensajeros) this.escucharUbicacionMensajeros();
  }

  // Método público para actualizar configuración
  actualizarConfiguracion(nuevaConfiguracion: ConfiguracionMapa): void {
    this.configuracion = { ...this.configuracion, ...nuevaConfiguracion };
    
    if (this.mapa) {
      this.agregarMarcadores();
      this.ajustarVistaAMarcadores();
    }
  }

  // Método para mostrar animación de geocodificación
  mostrarAnimacionGeocodificacion(): void {
    if (!this.mapa) return;
    
    const L = (window as any).L;
    
    // Crear marcador de geocodificación animado
    const marcadorGeocoding = L.divIcon({
      className: 'geocoding-marker',
      html: `
        <div class="geocoding-animation">
          <div class="geocoding-pulse"></div>
          <div class="geocoding-icon">
            <i class="pi pi-map-marker"></i>
          </div>
        </div>
      `,
      iconSize: [40, 40],
      iconAnchor: [20, 20]
    });
    
    // Agregar marcador temporal en el centro del mapa
    const centro = this.mapa.getCenter();
    const marcadorTemporal = L.marker([centro.lat, centro.lng], { icon: marcadorGeocoding });
    marcadorTemporal.addTo(this.mapa);
    
    // Remover después de 3 segundos
    setTimeout(() => {
      if (this.mapa) {
        this.mapa.removeLayer(marcadorTemporal);
      }
    }, 3000);
  }

  // Método para simular efecto de búsqueda en el mapa
  mostrarEfectoBusqueda(): void {
    if (!this.mapa) return;
    
    const L = (window as any).L;
    
    // Crear círculo de búsqueda que se expande
    const centro = this.mapa.getCenter();
    const circulo = L.circle([centro.lat, centro.lng], {
      color: '#2196F3',
      fillColor: '#2196F3',
      fillOpacity: 0.1,
      radius: 100
    }).addTo(this.mapa);
    
    // Animar expansión del círculo
    let radius = 100;
    const interval = setInterval(() => {
      radius += 200;
      circulo.setRadius(radius);
      circulo.setStyle({ fillOpacity: Math.max(0.01, 0.1 - (radius / 5000)) });
      
      if (radius > 2000) {
        clearInterval(interval);
        this.mapa.removeLayer(circulo);
      }
    }, 100);
  }

  // Método para mostrar progreso de geocodificación
  actualizarProgresoGeocodificacion(progreso: number): void {
    const progressElement = document.querySelector('.geocoding-progress');
    if (progressElement) {
      (progressElement as HTMLElement).style.width = `${progreso}%`;
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

  /**
   * Clave con la que la app del mensajero publica su ubicación (`active_users/{clave}`): igual que Android, Flutter e
   * iOS, `nombres_apellidos_empresa` con todo lo que no sea letra, número o `_` cambiado por `_`, los `_` repetidos
   * colapsados y en minúsculas. Se incluye la variante sin `_` en los bordes (nombres con espacios sobrantes).
   */
  private clavesRastreo(t: any): string[] {
    const cruda = `${t?.nombres || ''}_${t?.apellidos || ''}_${t?.company || ''}`
      .replace(/[^a-zA-Z0-9_]/g, '_')
      .replace(/_+/g, '_')
      .toLowerCase();
    const recortada = cruda.replace(/^_+|_+$/g, '');
    return Array.from(new Set([cruda, recortada].filter(c => c.length > 1)));
  }

  private nombreTransportador(t: any): string {
    return `${t?.nombres || ''} ${t?.apellidos || ''}`.replace(/\s+/g, ' ').trim() || 'Mensajero';
  }

  /** Escucha la ubicación de cada transportador de la empresa en su propio nodo (nunca todo `active_users`). */
  private escucharUbicacionMensajeros(): void {
    if (!this.offsetSubscription) {
      // Diferencia entre el reloj del navegador y el del servidor, para medir bien hace cuánto llegó cada punto.
      this.offsetSubscription = this.db.object<number>('.info/serverTimeOffset').valueChanges()
        .subscribe(offset => this.offsetServidorMs = Number(offset) || 0);
    }
    const claves = new Map<string, any>();
    this.transportadoresEmpresa.forEach(t => this.clavesRastreo(t).forEach(clave => claves.set(clave, t)));

    // Fuera las claves de transportadores que ya no están en la lista.
    Array.from(this.suscripcionesRastreo.keys()).filter(clave => !claves.has(clave)).forEach(clave => {
      this.suscripcionesRastreo.get(clave)?.unsubscribe();
      this.suscripcionesRastreo.delete(clave);
      this.datosRastreo.delete(clave);
    });
    this.transportadorPorClave = claves;
    claves.forEach((_, clave) => {
      if (this.suscripcionesRastreo.has(clave)) return;
      const sub = this.db.object<any>(`active_users/${clave}`).valueChanges().subscribe(
        dato => {
          if (dato) this.datosRastreo.set(clave, dato); else this.datosRastreo.delete(clave);
          this.recalcularMensajeros();
        },
        error => console.error('No se pudo escuchar la ubicación de un mensajero:', error?.message || error),
      );
      this.suscripcionesRastreo.set(clave, sub);
    });

    if (!this.intervalTimer) {
      // Cada 30 s se recalcula si cada mensajero sigue en vivo, aunque no lleguen puntos nuevos.
      this.intervalTimer = setInterval(() => this.recalcularMensajeros(), 30000);
    }
    this.recalcularMensajeros();
  }

  private dejarDeEscucharMensajeros(): void {
    this.suscripcionesRastreo.forEach(sub => sub.unsubscribe());
    this.suscripcionesRastreo.clear();
    this.datosRastreo.clear();
    this.offsetSubscription?.unsubscribe();
    this.offsetSubscription = null;
    if (this.intervalTimer) {
      clearInterval(this.intervalTimer);
      this.intervalTimer = null;
    }
  }

  private ahoraServidor(): number {
    return Date.now() + this.offsetServidorMs;
  }

  /** Hora (ms) de un punto: `lastUpdate` del servidor; los datos viejos solo traen el `timestamp` del teléfono. */
  private horaDelPunto(dato: any): number {
    const servidor = Number(dato?.lastUpdate);
    if (servidor > 0) return servidor;
    const telefono = Date.parse(dato?.timestamp || '');
    return isNaN(telefono) ? 0 : telefono;
  }

  /** Une los datos recibidos con los transportadores: un mensajero por transportador, con su punto más reciente. */
  private recalcularMensajeros(): void {
    const ahora = this.ahoraServidor();
    const porTransportador = new Map<string, UbicacionMensajero>();
    this.datosRastreo.forEach((dato, clave) => {
      const t = this.transportadorPorClave.get(clave);
      const lat = Number(dato?.lat);
      const lng = Number(dato?.lng);
      if (!t || !isFinite(lat) || !isFinite(lng) || (lat === 0 && lng === 0)) return;
      const hora = this.horaDelPunto(dato);
      if (!hora || ahora - hora > MAX_ANTIGUEDAD_MS) return;
      const id = String(t.id || clave);
      const previo = porTransportador.get(id);
      if (previo && previo.ultimaActualizacion >= hora) return;
      const conectado = dato?.conectado !== false;
      porTransportador.set(id, {
        id,
        nombre: this.nombreTransportador(t),
        lat,
        lng,
        ultimaActualizacion: hora,
        conectado,
        precision: isFinite(Number(dato?.accuracy)) ? Number(dato.accuracy) : undefined,
        velocidad: isFinite(Number(dato?.velocidad)) ? Number(dato.velocidad) : undefined,
        bateria: isFinite(Number(dato?.bateria)) ? Number(dato.bateria) : undefined,
        estado: !conectado ? 'desconectado' : ahora - hora <= EN_VIVO_MS ? 'en-vivo' : 'sin-senal',
        pedidosEnRuta: this.contarPedidosEnRuta(t),
      });
    });
    const orden: Record<EstadoMensajero, number> = { 'en-vivo': 0, 'sin-senal': 1, 'desconectado': 2 };
    this.mensajeros = Array.from(porTransportador.values())
      .sort((a, b) => orden[a.estado] - orden[b.estado] || a.nombre.localeCompare(b.nombre));
    this.mensajerosSinUbicacion = Math.max(0, this.transportadoresEmpresa.length - this.mensajeros.length);
    this.actualizarMarcadoresMensajeros();
    this.cd.markForCheck();
  }

  /** Pedidos del mapa que van con este transportador y siguen en ruta. */
  private contarPedidosEnRuta(t: any): number {
    const nombre = this.normalizarTexto(this.nombreTransportador(t));
    if (!nombre) return 0;
    return (this.configuracion?.ubicaciones || []).filter(u =>
      (u.estado === 'Despachado' || u.estado === 'EnDespacho') &&
      this.normalizarTexto(u.transportador || '').startsWith(nombre)
    ).length;
  }

  private normalizarTexto(texto: string): string {
    return (texto || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/\s+/g, ' ').trim();
  }

  public toggleMensajeros(event: any): void {
    this.mostrarMensajeros = event.target.checked;
    if (this.mostrarMensajeros) {
      this.escucharUbicacionMensajeros();
    } else {
      this.dejarDeEscucharMensajeros();
      this.mensajeros = [];
      this.mensajeroSeguido = null;
      this.actualizarMarcadoresMensajeros();
    }
    this.cd.detectChanges();
  }

  /** Centra el mapa en el mensajero y abre su ficha. */
  public verMensajero(m: UbicacionMensajero): void {
    if (!this.mapa) return;
    this.mapa.setView([m.lat, m.lng], Math.max(this.mapa.getZoom(), 15));
    this.marcadoresMensajero.get(m.id)?.openPopup();
  }

  /** Sigue al mensajero: el mapa se mueve con cada punto nuevo. Otro clic deja de seguirlo. */
  public seguirMensajero(m: UbicacionMensajero): void {
    this.mensajeroSeguido = this.mensajeroSeguido === m.id ? null : m.id;
    if (this.mensajeroSeguido) this.verMensajero(m);
  }

  public trackMensajero(_: number, m: UbicacionMensajero): string {
    return m.id;
  }

  public textoEstadoMensajero(m: UbicacionMensajero): string {
    const hace = this.textoHace(m.ultimaActualizacion);
    switch (m.estado) {
      case 'en-vivo': return `En vivo · ${hace}`;
      case 'sin-senal': return `Sin señal · último punto ${hace}`;
      default: return `App cerrada · último punto ${hace}`;
    }
  }

  private textoHace(hora: number): string {
    const segundos = Math.max(0, Math.round((this.ahoraServidor() - hora) / 1000));
    if (segundos < 60) return 'hace menos de 1 min';
    const minutos = Math.round(segundos / 60);
    if (minutos < 60) return `hace ${minutos} min`;
    const horas = Math.floor(minutos / 60);
    return `hace ${horas} h ${minutos % 60} min`;
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
    const opacidad = zona.opacidad || 0.5;
    const tipoVisualizacion = this.configuracionZonas.tipoVisualizacion;

    return {
      color: zona.colorBorde || zona.color,
      weight: 2,
      opacity: tipoVisualizacion === 'relleno' ? 0 : 0.8,
      fillColor: zona.color,
      fillOpacity: tipoVisualizacion === 'borde' ? 0 : opacidad,
      interactive: true
    };
  }

  /**
   * Crea el contenido del popup para una zona
   */
  private crearContenidoPopupZona(zona: ZonaEntrega): string {
    const restricciones = zona.restricciones;
    const estadisticas = zona.estadisticas;

    return `
      <div style="font-size: 14px; line-height: 1.4;">
        <h6 style="margin: 0 0 8px 0; color: ${zona.color};">
          📍 ${zona.nombre}
        </h6>
        ${zona.descripcion ? `<p style="margin: 4px 0; color: #666;">${zona.descripcion}</p>` : ''}

        ${restricciones ? `
          <div style="margin: 8px 0;">
            <strong>Restricciones:</strong>
            ${restricciones.horarioMinimo && restricciones.horarioMaximo ?
              `<br>🕐 Horario: ${restricciones.horarioMinimo} - ${restricciones.horarioMaximo}` : ''}
            ${restricciones.costoAdicional ?
              `<br>💰 Costo adicional: $${restricciones.costoAdicional.toLocaleString()}` : ''}
          </div>
        ` : ''}

        ${estadisticas ? `
          <div style="margin: 8px 0; padding: 6px; background: #f8f9fa; border-radius: 4px;">
            <strong>Estadísticas:</strong>
            <br>📦 Pedidos entregados: ${estadisticas.pedidosEntregados}
            <br>⏱️ Tiempo promedio: ${estadisticas.tiempoPromedioEntrega} min
            <br>✅ Éxito: ${estadisticas.porcentajeExitoso}%
          </div>
        ` : ''}
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