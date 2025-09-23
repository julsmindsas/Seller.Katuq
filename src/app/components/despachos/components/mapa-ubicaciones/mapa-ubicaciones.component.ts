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

interface UbicacionMensajero {
  id: string;
  lat: number;
  lng: number;
  timestamp: string;
  nombre?: string;
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
  private mensajerosSubscription: Subscription | null = null;
  private marcadorUbicacionUsuario: any = null;
  
  public mostrarMensajeros: boolean = true;
  public mensajeros: UbicacionMensajero[] = [];

  intervalTimer: any = null;
  leafletCargado: boolean = false;
  marcadoresAnimandose: Set<string> = new Set();
  ultimosLocationsProcesados: number = 0;
  private companyName: string;
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
    if (this.mapa) {
      this.mapa.remove();
    }
    if (this.mensajerosSubscription) {
      this.mensajerosSubscription.unsubscribe();
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
    console.log('🔄 Refrescando ubicación del usuario...');

    try {
      // Intentar obtener nueva ubicación del usuario
      await this.obtenerUbicacionUsuario();
      console.log('✅ Ubicación actualizada');

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
          console.log('Usando ubicación por defecto (Bogotá)');
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

      console.log('📍 Solicitando ubicación del usuario...');

      navigator.geolocation.getCurrentPosition(
        (position) => {
          this.ubicacionUsuario = {
            lat: position.coords.latitude,
            lng: position.coords.longitude
          };
          this.usandoUbicacionUsuario = true;
          console.log(`✅ Ubicación obtenida: ${this.ubicacionUsuario.lat}, ${this.ubicacionUsuario.lng}`);
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

        console.log(`🎯 Centro calculado desde pedidos: ${promedioLat.toFixed(4)}, ${promedioLng.toFixed(4)} (zoom: ${zoom})`);
        return {
          lat: promedioLat,
          lng: promedioLng,
          zoom: zoom
        };
      }
    }

    // 2. Si no hay pedidos pero sí ubicación del usuario
    if (this.ubicacionUsuario && this.usandoUbicacionUsuario) {
      console.log(`🌐 Centro desde ubicación del usuario: ${this.ubicacionUsuario.lat}, ${this.ubicacionUsuario.lng}`);
      return {
        lat: this.ubicacionUsuario.lat,
        lng: this.ubicacionUsuario.lng,
        zoom: 13 // Zoom más cercano para ubicación personal
      };
    }

    // 3. Usar centro configurado o Bogotá por defecto
    const centroConfig = this.configuracion.centroMapa || defaultCenter;
    console.log(`🏢 Centro por defecto: ${centroConfig.lat}, ${centroConfig.lng}`);
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

    console.log(`📍 Marcador de usuario agregado en: ${this.ubicacionUsuario.lat}, ${this.ubicacionUsuario.lng}`);
  }

  private inicializarMapa(): void {
    if (!this.leafletCargado || !this.mapaContainer) {
      return;
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

      // Agregar marcadores
      this.agregarMarcadores();
      this.actualizarMarcadoresMensajeros();

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
    console.log('🗺️ [DEBUG] Actualizando marcadores de mensajeros...');
    console.log('🗺️ [DEBUG] Mapa cargado:', !!this.mapa);
    console.log('🗺️ [DEBUG] Leaflet cargado:', this.leafletCargado);
    console.log('🗺️ [DEBUG] Capa mensajeros:', !!this.capaMensajeros);
    console.log('🗺️ [DEBUG] Mostrar mensajeros:', this.mostrarMensajeros);

    if (!this.mapa || !this.leafletCargado || !this.capaMensajeros) {
      console.log('🗺️ [DEBUG] No se puede actualizar marcadores - falta inicialización');
      return;
    }

    this.capaMensajeros.clearLayers();

    if (!this.mostrarMensajeros) {
      console.log('🗺️ [DEBUG] Mostrar mensajeros está desactivado');
      return;
    }

    const L = (window as any).L;

    console.log(`🗺️ [DEBUG] Procesando ${this.mensajeros.length} mensajeros para marcadores`);

    this.mensajeros.forEach((mensajero, index) => {
      console.log(`🗺️ [DEBUG] Mensajero ${index + 1}:`, {
        id: mensajero.id,
        nombre: mensajero.nombre,
        lat: mensajero.lat,
        lng: mensajero.lng,
        timestamp: mensajero.timestamp
      });

      if (mensajero.lat && mensajero.lng) {
        const iconoMensajero = L.divIcon({
          className: 'custom-marker-mensajero',
          html: `
            <div class="marker-mensajero-content" title="Mensajero: ${mensajero.nombre || mensajero.id}">
              <span class="marker-mensajero-icon">🛵</span>
              <div class="marker-mensajero-pulse"></div>
            </div>
          `,
          iconSize: [40, 40],
          iconAnchor: [20, 40]
        });

        const marcador = L.marker([mensajero.lat, mensajero.lng], { icon: iconoMensajero });
        
        const popupContent = `
          <div style="font-size: 12px; color: #333;">
            <strong style="color: #007bff;">Mensajero</strong><br>
            <strong>ID:</strong> ${mensajero.id}<br>
            ${mensajero.nombre ? `<strong>Nombre:</strong> ${mensajero.nombre}<br>` : ''}
            <strong>Actualizado:</strong> ${new Date(mensajero.timestamp).toLocaleTimeString()}
          </div>
        `;
        marcador.bindPopup(popupContent);
        this.capaMensajeros.addLayer(marcador);

        console.log(`✅ [DEBUG] Marcador de mensajero creado exitosamente para: ${mensajero.nombre || mensajero.id} en [${mensajero.lat}, ${mensajero.lng}]`);
      } else {
        console.log(`❌ [DEBUG] Mensajero ${mensajero.nombre || mensajero.id} no tiene coordenadas válidas:`, {
          lat: mensajero.lat,
          lng: mensajero.lng
        });
      }
    });

    console.log(`🗺️ [DEBUG] Actualización de marcadores completada. Total marcadores activos: ${this.mensajeros.filter(m => m.lat && m.lng).length}`);
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
    if (!this.mapa || this.marcadores.length === 0) {
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
    // Actualizar posiciones cada 30 segundos (simulado)
    this.intervalTimer = setInterval(() => {
      this.simularMovimientoPedidos();
    }, 30000);
  }

  private simularMovimientoPedidos(): void {
    // Simular pequeños movimientos para pedidos en ruta
    this.configuracion.ubicaciones.forEach(ubicacion => {
      if (ubicacion.estado === 'Despachado' && ubicacion.latitud && ubicacion.longitud) {
        // Pequeño movimiento aleatorio (simulando avance en la ruta)
        const variacion = 0.001; // Aproximadamente 100 metros
        ubicacion.latitud += (Math.random() - 0.5) * variacion;
        ubicacion.longitud += (Math.random() - 0.5) * variacion;
        
        // Actualizar tiempo estimado (reducir aleatoriamente)
        if (ubicacion.tiempoEstimado && ubicacion.tiempoEstimado > 5) {
          ubicacion.tiempoEstimado -= Math.floor(Math.random() * 3) + 1;
        }
      }
    });

    // Actualizar marcadores en el mapa
    this.agregarMarcadores();
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
    console.log('Pedido seleccionado:', ubicacion);
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

  private escucharUbicacionMensajeros(): void {
    if (this.mensajerosSubscription) {
      this.mensajerosSubscription.unsubscribe();
    }

    console.log('🔍 [DEBUG] Iniciando escucha de ubicaciones de mensajeros...');
    console.log('🔍 [DEBUG] Nombre de empresa para filtrar:', this.companyName);

    const activeUsersRef = this.db.list('active_users');
    this.mensajerosSubscription = activeUsersRef.snapshotChanges().subscribe(snapshots => {
      console.log('🔍 [DEBUG] Snapshots recibidos desde Firebase:', snapshots.length);

      // Log de todas las claves recibidas para debugging
      const allKeys = snapshots.map(s => s.key);
      console.log('🔍 [DEBUG] Todas las claves en Firebase active_users:', allKeys);

      this.mensajeros = snapshots
        .filter(snapshot => {
          if (!this.companyName) {
            console.log('🔍 [DEBUG] No hay nombre de empresa configurado');
            return false;
          }
          const key = snapshot.key as string;
          const keyParts = key.split('_');

          console.log(`🔍 [DEBUG] Procesando clave: "${key}" -> partes:`, keyParts);

          // Nuevo filtro más flexible: buscar la empresa en cualquier parte de la clave
          const keyUpperCase = key.toUpperCase();
          const companyNameUpper = this.companyName.toUpperCase();

          // Buscar coincidencias parciales en las partes de la clave
          const hasCompanyMatch = keyParts.some(part => {
            const partUpper = part.toUpperCase();
            return partUpper.includes(companyNameUpper) || companyNameUpper.includes(partUpper);
          });

          // También buscar en la clave completa por si la empresa tiene espacios/guiones
          const hasKeyMatch = keyUpperCase.includes(companyNameUpper) ||
                             companyNameUpper.includes(keyUpperCase.replace(/_/g, ' '));

          const match = hasCompanyMatch || hasKeyMatch;

          console.log(`🔍 [DEBUG] Filtro flexible - Empresa: "${this.companyName}"`);
          console.log(`🔍 [DEBUG] - ¿Coincidencia en partes?: ${hasCompanyMatch}`);
          console.log(`🔍 [DEBUG] - ¿Coincidencia en clave?: ${hasKeyMatch}`);
          console.log(`🔍 [DEBUG] - Resultado final: ${match}`);

          return match;
        })
        .filter(snapshot => {
          // Filtrar por timestamp - solo mostrar mensajeros activos del día actual
          const data = snapshot.payload.val() as any;
          const timestamp = data?.timestamp;

          if (!timestamp) {
            console.log(`🕒 [DEBUG] Mensajero ${snapshot.key} no tiene timestamp`);
            return false;
          }

          const timestampDate = new Date(timestamp);
          const today = new Date();

          // Comparar solo la fecha (año, mes, día) sin las horas
          const isToday = timestampDate.getFullYear() === today.getFullYear() &&
                         timestampDate.getMonth() === today.getMonth() &&
                         timestampDate.getDate() === today.getDate();

          const hoursAgo = (today.getTime() - timestampDate.getTime()) / (1000 * 60 * 60);

          console.log(`🕒 [DEBUG] Mensajero ${snapshot.key}:`);
          console.log(`🕒 [DEBUG] - Timestamp: ${timestamp}`);
          console.log(`🕒 [DEBUG] - Fecha timestamp: ${timestampDate.toLocaleDateString()}`);
          console.log(`🕒 [DEBUG] - Fecha hoy: ${today.toLocaleDateString()}`);
          console.log(`🕒 [DEBUG] - ¿Es de hoy?: ${isToday}`);
          console.log(`🕒 [DEBUG] - Horas transcurridas: ${hoursAgo.toFixed(1)}`);

          return isToday;
        })
        .map(snapshot => {
          const key = snapshot.key as string;
          const keyParts = key.split('_');

          // Reconstruir el nombre del mensajero de manera más inteligente
          // Tomar las primeras partes que parecen ser nombres propios
          const nombreParts = keyParts.slice(0, -2); // Asumir que las últimas 2 partes son apellidos o empresa
          const nombreMensajero = nombreParts.length > 0
            ? nombreParts.join(' ').replace(/[_-]/g, ' ')
            : key.replace(/[_-]/g, ' ');

          const data = snapshot.payload.val() as any;
          const mensajero = {
            id: key,
            nombre: nombreMensajero,
            ...data
          };

          console.log('🔍 [DEBUG] Mensajero encontrado:', mensajero);
          return mensajero;
        });

      console.log(`🔍 [DEBUG] ====== RESUMEN DE FILTROS ======`);
      console.log(`🔍 [DEBUG] - Total snapshots de Firebase: ${snapshots.length}`);
      console.log(`🔍 [DEBUG] - Después de filtro empresa: ${snapshots.filter(s => {
        if (!this.companyName) return false;
        const key = s.key as string;
        const keyParts = key.split('_');
        const keyUpperCase = key.toUpperCase();
        const companyNameUpper = this.companyName.toUpperCase();
        const hasCompanyMatch = keyParts.some(part => {
          const partUpper = part.toUpperCase();
          return partUpper.includes(companyNameUpper) || companyNameUpper.includes(partUpper);
        });
        const hasKeyMatch = keyUpperCase.includes(companyNameUpper) ||
                           companyNameUpper.includes(keyUpperCase.replace(/_/g, ' '));
        return hasCompanyMatch || hasKeyMatch;
      }).length}`);
      console.log(`🔍 [DEBUG] - Después de filtro timestamp (hoy): ${this.mensajeros.length}`);
      console.log('🔍 [DEBUG] - Mensajeros finales:', this.mensajeros);

      this.actualizarMarcadoresMensajeros();
      this.cd.detectChanges(); // Forzar detección de cambios para el contador
    }, error => {
      console.error('❌ [ERROR] Error escuchando ubicación de mensajeros:', error);
    });
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
      this.mensajeros = [];
      if (this.capaMensajeros) {
        this.capaMensajeros.clearLayers();
      }
    }
    this.cd.detectChanges();
  }
}