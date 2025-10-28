import {
  Component,
  OnInit,
  OnDestroy,
  ViewChild,
  ElementRef,
} from "@angular/core";
import { ActivatedRoute, Router } from "@angular/router";
import { Subject } from "rxjs";
import { takeUntil } from "rxjs/operators";
import { GeminiLiveService } from "../../core/services/gemini-live.service";
import { VideoStreamService } from "../../core/services/video-stream.service";
import { AudioStreamService } from "../../core/services/audio-stream.service";
import { AdapterRegistryService } from "../../core/services/adapter-registry.service";
import { HacebAdapter } from "../../adapters/haceb-adapter";
import { AppleAdapter } from "../../adapters/apple-adapter";
import {
  AgentIndustry,
  AdapterResult,
} from "../../core/models/agent-adapter.interface";
import { ServerMessage } from "../../core/models/agent-config.interface";
import {
  CompanyConfig,
  getCompanyConfig,
} from "../../core/models/company-config.interface";
import { AgendamientoService } from "../../../../shared/services/agendamiento.service";
import { GeolocationService, GeoAddress } from "../../core/services/geolocation.service";
import { ToastrService } from "ngx-toastr";

/**
 * Componente principal para sesiones de Video Agent
 * Integra video, audio y Gemini Live API
 */
@Component({
  selector: "app-agent-session",
  templateUrl: "./agent-session.component.html",
  styleUrls: [
    "./agent-session.component.scss",
    "./agent-session-simple.component.scss",
    "./agent-session-mobile.component.scss", // Mobile-first styles (highest priority)
  ],
})
export class AgentSessionComponent implements OnInit, OnDestroy {
  @ViewChild("videoPreview", { static: false })
  videoPreview!: ElementRef<HTMLDivElement>;

  // Estado de la sesión
  isConnected = false;
  isVideoStreaming = false;
  isAudioRecording = false;
  isAudioPlaying = false;
  sessionActive = false;

  // Volúmenes de audio
  inputVolume = 0;
  outputVolume = 0;

  // Industria seleccionada
  selectedIndustry: AgentIndustry = AgentIndustry.APPLIANCE;
  availableIndustries: AgentIndustry[] = [];

  // Mensajes y transcripciones
  transcript = "";
  messages: Array<{ role: "user" | "agent"; text: string; timestamp: Date }> =
    [];

  // Resultados del diagnóstico
  currentResult: AdapterResult | null = null;
  showResultPanel = false;

  // UI State
  isLoading = false;
  errorMessage = "";
  cameraFacingMode: "user" | "environment" = "environment";

  // Configuración de empresa
  companyConfig!: CompanyConfig;

  // FAB Draggable State
  @ViewChild("fabButton", { static: false })
  fabButton!: ElementRef<HTMLButtonElement>;
  fabPosition = { x: 0, y: 0 };
  isDragging = false;
  private dragStartPos = { x: 0, y: 0 };
  private touchStartPos = { x: 0, y: 0 };
  private dragThreshold = 10; // pixels to distinguish click from drag
  private hasMoved = false;

  // Cleanup
  private destroy$ = new Subject<void>();

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private geminiService: GeminiLiveService,
    private videoService: VideoStreamService,
    private audioService: AudioStreamService,
    private adapterRegistry: AdapterRegistryService,
    private agendamientoService: AgendamientoService,
    private geolocationService: GeolocationService,
    private toastr: ToastrService,
  ) {}

  ngOnInit(): void {
    this.loadCompanyConfig();
    this.initializeAdapters(); // Debe llamarse después de loadCompanyConfig
    this.setupSubscriptions();
    this.checkDeviceCapabilities();
    this.setupMobileOptimizations();
    this.initializeFabPosition();
    this.handleFabOrientationChange();
  }

  /**
   * Carga configuración según parámetro de URL
   */
  private loadCompanyConfig(): void {
    // Obtener parámetro 'company' de URL
    // Ejemplo: /video-agent?company=haceb
    const companyParam = this.route.snapshot.queryParamMap.get("company");
    this.companyConfig = getCompanyConfig(companyParam || undefined);

    console.log("🏢 Company config loaded:", this.companyConfig.name);

    // Aplicar estilos de branding
    this.applyBranding();
  }

  /**
   * Aplica colores de branding dinámicamente
   */
  private applyBranding(): void {
    const root = document.documentElement;
    root.style.setProperty(
      "--company-primary",
      this.companyConfig.branding.primaryColor,
    );
    root.style.setProperty(
      "--company-secondary",
      this.companyConfig.branding.secondaryColor,
    );

    // Aplicar tamaño de fuente
    const fontSizeClass = `font-size-${this.companyConfig.ui.fontSize}`;
    document.body.classList.add(fontSizeClass);

    // Aplicar high contrast si está habilitado
    if (this.companyConfig.ui.highContrast) {
      document.body.classList.add("high-contrast-mode");
    }
  }

  ngOnDestroy(): void {
    this.endSession();
    this.destroy$.next();
    this.destroy$.complete();
  }

  /**
   * Inicializa y registra adapters disponibles
   */
  private initializeAdapters(): void {
    // Registrar Haceb adapter
    const hacebAdapter = new HacebAdapter();
    this.adapterRegistry.registerAdapter(hacebAdapter, true, 100);

    // Registrar Apple adapter
    const appleAdapter = new AppleAdapter();
    this.adapterRegistry.registerAdapter(appleAdapter, true, 90);

    // TODO: Registrar otros adapters aquí (automotive, healthcare, etc.)

    // Obtener industrias disponibles
    this.availableIndustries = this.adapterRegistry.getAvailableIndustries();

    // 🎯 Seleccionar adapter correcto según company config
    // Como Haceb y Apple son ambos APPLIANCE industry, necesitamos seleccionar
    // manualmente el adapter correcto basado en companyConfig.adapterType
    let selectedAdapter: any = null;

    if (this.companyConfig.adapterType === 'HacebAdapter') {
      selectedAdapter = hacebAdapter;
      console.log('🎯 Selecting Haceb adapter based on company config');
    } else if (this.companyConfig.adapterType === 'AppleAdapter') {
      selectedAdapter = appleAdapter;
      console.log('🎯 Selecting Apple adapter based on company config');
    } else {
      // Fallback: usar industry
      this.adapterRegistry.setCurrentAdapter(this.selectedIndustry);
      console.log('✅ Adapters initialized (fallback to industry):', this.availableIndustries);
      return;
    }

    // Establecer el adapter seleccionado directamente
    if (selectedAdapter) {
      this.adapterRegistry['currentAdapterSubject'].next(selectedAdapter);
      console.log(`✅ Adapter set: ${selectedAdapter.name}`);
    }

    console.log("✅ Adapters initialized:", this.availableIndustries);
  }

  /**
   * Configura suscripciones a observables
   */
  private setupSubscriptions(): void {
    // Estado de conexión Gemini
    this.geminiService.isConnected$
      .pipe(takeUntil(this.destroy$))
      .subscribe((connected) => {
        this.isConnected = connected;
      });

    // Transcripciones
    this.geminiService.transcript$
      .pipe(takeUntil(this.destroy$))
      .subscribe((text) => {
        if (text) {
          this.transcript = text;
          this.addMessage("agent", text);
        }
      });

    // Respuestas del servidor
    this.geminiService.serverResponse$
      .pipe(takeUntil(this.destroy$))
      .subscribe((response) => {
        this.handleServerResponse(response);
      });

    // Audio del servidor - Ya no es necesario suscribirse aquí
    // El AudioStreamerService en gemini-live.service maneja la reproducción automáticamente

    // Frames de video
    this.videoService.frame$
      .pipe(takeUntil(this.destroy$))
      .subscribe((frameBase64) => {
        if (this.isConnected) {
          this.geminiService.sendVideoFrame(frameBase64);
        }
      });

    // Chunks de audio
    this.audioService.audioChunk$
      .pipe(takeUntil(this.destroy$))
      .subscribe((chunkBase64) => {
        if (this.isConnected) {
          this.geminiService.sendAudioChunk(chunkBase64);
        }
      });

    // Estado de video streaming
    this.videoService.isStreaming$
      .pipe(takeUntil(this.destroy$))
      .subscribe((streaming) => {
        this.isVideoStreaming = streaming;
      });

    // Estado de audio recording
    this.audioService.isRecording$
      .pipe(takeUntil(this.destroy$))
      .subscribe((recording) => {
        this.isAudioRecording = recording;
      });

    // Volumen de entrada (micrófono)
    this.audioService.volume$
      .pipe(takeUntil(this.destroy$))
      .subscribe((volume) => {
        this.inputVolume = volume;
      });

    // Estado de audio playback (Gemini response)
    this.geminiService.audioStreamer.isPlaying$
      .pipe(takeUntil(this.destroy$))
      .subscribe((playing) => {
        this.isAudioPlaying = playing;
      });

    // Volumen de salida (respuesta de Gemini)
    this.geminiService.audioStreamer.volume$
      .pipe(takeUntil(this.destroy$))
      .subscribe((volume) => {
        this.outputVolume = volume;
      });

    // Errores
    this.geminiService.error$
      .pipe(takeUntil(this.destroy$))
      .subscribe((error) => {
        this.showError(error);
      });

    // NextAction del adapter (para procesar acciones como guardar citas)
    this.geminiService.nextAction$
      .pipe(takeUntil(this.destroy$))
      .subscribe((nextAction) => {
        this.handleNextAction(nextAction);
      });
  }

  /**
   * Verifica capacidades del dispositivo
   */
  private async checkDeviceCapabilities(): Promise<void> {
    const hasCamera = await this.videoService.hasCamera();
    const hasMic = await this.audioService.hasMicrophone();

    if (!hasCamera) {
      this.showError("No se detectó cámara en este dispositivo");
    }

    if (!hasMic) {
      this.showError("No se detectó micrófono en este dispositivo");
    }

    console.log("📱 Device capabilities:", { hasCamera, hasMic });
  }

  /**
   * Inicia una nueva sesión de diagnóstico
   */
  async startSession(): Promise<void> {
    try {
      this.isLoading = true;
      this.errorMessage = "";
      this.messages = [];
      this.currentResult = null;

      // 🎯 NO sobrescribir adapter - ya fue seleccionado en initializeAdapters() según companyConfig
      // this.adapterRegistry.setCurrentAdapter(this.selectedIndustry); // ❌ NO HACER ESTO
      const adapter = this.adapterRegistry.currentAdapter;

      if (!adapter) {
        throw new Error("No se pudo cargar el adapter seleccionado");
      }

      console.log(`🎯 Starting session with adapter: ${adapter.name}`);


      // 📍 Capturar geolocalización con dirección formateada al iniciar diagnóstico
      try {
        console.log("📍 Capturing geolocation with address...");
        const location: GeoAddress = await this.geolocationService.getCurrentLocation();
        console.log("✅ Geolocation captured:", location);

        // Pasar coordenadas, dirección y ciudad al adapter (si soporta setCoordinates)
        if (adapter.setCoordinates) {
          adapter.setCoordinates(
            location.coordinates.latitude,
            location.coordinates.longitude,
            location.formatted,  // Dirección formateada desde API de Maps
            location.city  // Ciudad desde geolocalización
          );
        }
      } catch (geoError) {
        console.warn("⚠️ Could not capture geolocation:", geoError);
        // No bloquear la sesión si falla la geolocalización
      }

      // Conectar a Gemini Live
      await this.geminiService.connect(adapter);

      // Iniciar captura de video
      await this.videoService.startCapture(this.cameraFacingMode);

      // Mostrar preview en UI
      this.attachVideoPreview();

      // Iniciar captura de audio
      await this.audioService.startRecording();

      this.sessionActive = true;
      this.isLoading = false;

      this.addMessage(
        "agent",
        "¡Hola! Soy tu asistente de diagnóstico. Muéstrame el electrodoméstico y cuéntame qué problema tiene.",
      );

      console.log("✅ Session started successfully");
    } catch (error) {
      console.error("❌ Error starting session:", error);
      this.showError(`Error al iniciar sesión: ${error}`);
      this.isLoading = false;
    }
  }

  /**
   * Finaliza la sesión actual
   */
  async endSession(): Promise<void> {
    this.sessionActive = false;

    // Detener servicios
    this.videoService.stopCapture();
    this.audioService.stopRecording();
    await this.geminiService.disconnect();

    console.log("🛑 Session ended");
  }

  /**
   * Adjunta video preview al contenedor
   */
  private attachVideoPreview(): void {
    if (!this.videoPreview) {
      return;
    }

    const videoElement = this.videoService.getVideoElement();

    if (videoElement) {
      // Limpiar contenedor
      this.videoPreview.nativeElement.innerHTML = "";

      // Agregar video
      videoElement.style.width = "100%";
      videoElement.style.height = "100%";
      videoElement.style.objectFit = "cover";
      videoElement.style.borderRadius = "12px";

      this.videoPreview.nativeElement.appendChild(videoElement);
    }
  }

  /**
   * Cambia entre cámara frontal y trasera
   */
  async switchCamera(): Promise<void> {
    try {
      await this.videoService.switchCamera();
      this.cameraFacingMode =
        this.cameraFacingMode === "user" ? "environment" : "user";
      this.attachVideoPreview();
    } catch (error) {
      this.showError("Error al cambiar cámara");
    }
  }

  /**
   * Maneja respuestas del servidor
   * NOTA: El procesamiento de function calls ahora se hace en gemini-live.service
   * que emite nextAction$ procesado por handleNextAction()
   */
  private handleServerResponse(response: ServerMessage): void {
    // Log para debugging
    console.log("📥 Server response:", response);
    // El servicio gemini-live.service procesa los function calls y emite nextAction$
    // No procesamos aquí para evitar duplicación
  }

  /**
   * Maneja acciones del adapter (ej: guardar citas)
   */
  private handleNextAction(nextAction: any): void {
    console.log("🎯 [handleNextAction] Processing next action:", nextAction);
    console.log("🔍 DEBUG - Action type:", nextAction.action);
    console.log("🔍 DEBUG - Has data?:", !!nextAction.data);
    console.log("🔍 DEBUG - isDemoMode?:", nextAction.data?.isDemoMode);

    // Si la acción es SCHEDULE_SERVICE, procesar según modo
    if (nextAction.action === "SCHEDULE_SERVICE") {
      console.log("📅 Scheduling service with data:", nextAction.data);

      // ✅ VALIDACIÓN: Solo guardar si hay nombre de cliente
      if (!nextAction.data.customerName || nextAction.data.customerName.trim() === "" || nextAction.data.customerName === "Demo User") {
        console.warn("⚠️ Cannot save appointment without customer name. Skipping...");
        return;
      }

      // 🎯 MODO DEMO: Auto-guardar appointment directamente
      if (nextAction.data.isDemoMode) {
        console.log(
          "🎯 DEMO MODE: Auto-saving appointment to localStorage",
        );

        const appointment = {
          id: `APPT-${Date.now()}`,
          confirmationNumber:
            nextAction.data.confirmationNumber || `DEMO-${Date.now()}`,
          customerName: nextAction.data.customerName,
          phone: nextAction.data.phone || "Auto-detected",
          email: nextAction.data.email || "demo@katuq.com",
          appointmentDate: nextAction.data.appointmentDate,
          appointmentTime: nextAction.data.appointmentTime,
          serviceType: nextAction.data.serviceType || "diagnostic",
          deviceInfo: nextAction.data.deviceInfo || "Apple Device",
          issueSummary:
            nextAction.data.issueSummary || "Diagnostic needed",
          address: nextAction.data.address || "Dirección no proporcionada",  // Dirección formateada desde Maps API
          city: nextAction.data.city || "Ciudad no detectada",  // Ciudad desde geolocalización
          estimatedCost:
            nextAction.data.estimatedCost || "Por determinar",
          urgency: nextAction.data.urgency || "medium",
          status: "confirmed" as const,
          createdAt: new Date().toISOString(),
          specialNotes:
            nextAction.data.specialNotes ||
            "🎯 DEMO MODE - Auto-agendado desde video agent",
          // Metadatos adicionales (opcionales, no afectan funcionamiento)
          companyId: this.companyConfig?.id || "demo",
          companyName: this.companyConfig?.name || "Demo Company",
        };

        // Guardar usando el AgendamientoService para que notifique a todos los suscriptores
        // El servicio maneja la persistencia en localStorage y actualiza el BehaviorSubject
        this.agendamientoService
          .createDemoAppointment(
            appointment.customerName,
            appointment.deviceInfo,
            appointment.issueSummary,
            nextAction.data.coordinates, // 📍 Incluir coordenadas capturadas al inicio
            nextAction.data.address,     // 🏠 Dirección formateada desde Maps API
            nextAction.data.city         // 🌆 Ciudad desde geolocalización
          )
          .then((savedAppointment) => {
            console.log(
              "✅ Appointment saved via AgendamientoService:",
              savedAppointment,
            );
            console.log(
              "📋 Total appointments:",
              this.agendamientoService.getAppointments().length,
            );

            // Mostrar toast de confirmación
            this.toastr.success(
              `Número de confirmación: ${savedAppointment.confirmationNumber}`,
              '¡Cita creada exitosamente!',
              {
                timeOut: 4000,
                closeButton: true,
                progressBar: true,
                positionClass: 'toast-bottom-right'
              }
            );

            // Mostrar notificación de éxito
            this.addMessage(
              "agent",
              `✅ ¡Cita confirmada! Número de confirmación: ${savedAppointment.confirmationNumber}. Fecha: ${savedAppointment.appointmentDate} a las ${savedAppointment.appointmentTime}. Puedes ver los detalles en "Ver mis citas".`,
            );
          })
          .catch((error) => {
            console.error("❌ Error saving appointment:", error);
            this.addMessage(
              "agent",
              "❌ Error al guardar la cita. Por favor intenta nuevamente.",
            );
          });
      } else {
        // 🌐 MODO PRODUCCIÓN: Enviar a API backend
        console.log("🌐 TODO: Enviar appointment a API backend:", nextAction.data);
        // TODO: Implementar llamada al backend cuando esté disponible
        // this.appointmentApiService.createAppointment(nextAction.data).then(...)

        this.addMessage(
          "agent",
          "⚠️ Modo backend no implementado aún. Contacta al administrador.",
        );
      }
    }
  }

  /**
   * Agrega mensaje al historial
   */
  private addMessage(role: "user" | "agent", text: string): void {
    this.messages.push({
      role,
      text,
      timestamp: new Date(),
    });

    // Auto-scroll al último mensaje
    setTimeout(() => {
      const container = document.querySelector(".messages-container");
      if (container) {
        container.scrollTop = container.scrollHeight;
      }
    }, 100);
  }

  /**
   * Muestra error en UI
   */
  private showError(message: string): void {
    this.errorMessage = message;
    setTimeout(() => {
      this.errorMessage = "";
    }, 5000);
  }

  /**
   * Cambia industria seleccionada
   */
  onIndustryChange(): void {
    if (this.sessionActive) {
      // Si hay sesión activa, preguntar si quiere reiniciar
      const confirmRestart = confirm(
        "¿Deseas reiniciar la sesión con el nuevo tipo de asistente?",
      );

      if (confirmRestart) {
        this.endSession();
        setTimeout(() => {
          this.startSession();
        }, 500);
      }
    }
  }

  /**
   * Cierra el panel de resultados
   */
  closeResultPanel(): void {
    this.showResultPanel = false;
  }

  /**
   * Configuraciones específicas para móvil
   */
  private setupMobileOptimizations(): void {
    // Prevenir zoom en iOS cuando se hace doble tap
    this.preventDoubleTapZoom();

    // Detectar orientación y ajustar layout
    this.handleOrientationChange();

    // Listener para cambios de orientación
    window.addEventListener("orientationchange", () => {
      this.handleOrientationChange();
    });

    // Prevenir pull-to-refresh en iOS durante sesión activa
    document.body.addEventListener(
      "touchmove",
      (e) => {
        if (this.sessionActive && window.scrollY === 0) {
          e.preventDefault();
        }
      },
      { passive: false },
    );

    console.log("📱 Mobile optimizations enabled");
  }

  /**
   * Previene el zoom por doble tap en iOS
   */
  private preventDoubleTapZoom(): void {
    let lastTouchEnd = 0;
    document.addEventListener(
      "touchend",
      (event) => {
        const now = Date.now();
        if (now - lastTouchEnd <= 300) {
          event.preventDefault();
        }
        lastTouchEnd = now;
      },
      false,
    );
  }

  /**
   * Maneja cambios de orientación
   */
  private handleOrientationChange(): void {
    const orientation =
      window.screen.orientation?.type ||
      (window.innerWidth > window.innerHeight ? "landscape" : "portrait");

    console.log("📱 Orientation changed:", orientation);

    // Si está en landscape y la sesión está activa, ajustar video
    if (orientation.includes("landscape") && this.sessionActive) {
      // El CSS ya maneja esto, pero podemos agregar lógica adicional aquí
      this.attachVideoPreview(); // Reattach para ajustar dimensiones
    }
  }

  /**
   * Vibración háptica para feedback táctil (solo móviles)
   */
  private hapticFeedback(type: "light" | "medium" | "heavy" = "light"): void {
    if ("vibrate" in navigator) {
      const patterns = {
        light: 10,
        medium: 20,
        heavy: 30,
      };
      navigator.vibrate(patterns[type]);
    }
  }

  /**
   * Override del método startSession con feedback háptico
   */
  async startSessionWithHaptic(): Promise<void> {
    this.hapticFeedback("medium");
    await this.startSession();
  }

  /**
   * Override del método endSession con feedback háptico
   */
  async endSessionWithHaptic(): Promise<void> {
    this.hapticFeedback("heavy");
    await this.endSession();
  }

  /**
   * Override del método switchCamera con feedback háptico
   */
  async switchCameraWithHaptic(): Promise<void> {
    this.hapticFeedback("light");
    await this.switchCamera();
  }

  /* ==============================================
     FAB DRAGGABLE METHODS
     ============================================== */

  /**
   * Inicializa la posición del FAB desde localStorage o por defecto
   */
  private initializeFabPosition(): void {
    const savedPosition = localStorage.getItem("fabPosition");

    if (savedPosition) {
      this.fabPosition = JSON.parse(savedPosition);
    } else {
      // Posición por defecto: abajo a la derecha
      this.fabPosition = {
        x: window.innerWidth - 90,
        y: window.innerHeight - 90,
      };
    }

    // Asegurar que está dentro de los límites
    this.constrainFabPosition();
  }

  /**
   * Touch Start - Inicia el drag
   */
  onFabTouchStart(event: TouchEvent): void {
    if (this.isLoading) return;

    const touch = event.touches[0];
    this.dragStartPos = { x: touch.clientX, y: touch.clientY };
    this.touchStartPos = { x: this.fabPosition.x, y: this.fabPosition.y };
    this.hasMoved = false;
    this.isDragging = false;

    // NO prevenir el evento aquí para que el click funcione
  }

  /**
   * Touch Move - Arrastra el FAB
   */
  onFabTouchMove(event: TouchEvent): void {
    if (this.isLoading) return;

    const touch = event.touches[0];
    const deltaX = touch.clientX - this.dragStartPos.x;
    const deltaY = touch.clientY - this.dragStartPos.y;

    // Detectar si se movió más allá del threshold
    if (
      Math.abs(deltaX) > this.dragThreshold ||
      Math.abs(deltaY) > this.dragThreshold
    ) {
      this.hasMoved = true;
      this.isDragging = true;
      // Solo prevenir eventos si realmente se está arrastrando
      event.preventDefault();
    }

    if (this.hasMoved) {
      this.fabPosition = {
        x: this.touchStartPos.x + deltaX,
        y: this.touchStartPos.y + deltaY,
      };

      // Haptic feedback sutil durante drag
      if (Math.abs(deltaX) % 50 === 0 || Math.abs(deltaY) % 50 === 0) {
        this.hapticFeedback("light");
      }
    }
  }

  /**
   * Touch End - Finaliza el drag
   */
  onFabTouchEnd(event: TouchEvent): void {
    if (this.isLoading) return;

    if (this.isDragging && this.hasMoved) {
      // Snap a los bordes
      this.snapFabToEdge();
      // Guardar posición
      this.saveFabPosition();
      // Haptic feedback
      this.hapticFeedback("medium");
      // Prevenir click si se arrastró
      event.preventDefault();
      event.stopPropagation();
    } else {
      // Es un tap/click, ejecutar acción (FINALIZAR sesión)
      this.endSessionWithHaptic();
    }

    this.isDragging = false;
    this.hasMoved = false;
  }

  /**
   * Mouse Down - Para soporte desktop
   */
  onFabMouseDown(event: MouseEvent): void {
    if (this.isLoading) return;

    this.dragStartPos = { x: event.clientX, y: event.clientY };
    this.touchStartPos = { x: this.fabPosition.x, y: this.fabPosition.y };
    this.hasMoved = false;
    this.isDragging = false;

    const mouseMoveHandler = (e: MouseEvent) => {
      const deltaX = e.clientX - this.dragStartPos.x;
      const deltaY = e.clientY - this.dragStartPos.y;

      if (
        Math.abs(deltaX) > this.dragThreshold ||
        Math.abs(deltaY) > this.dragThreshold
      ) {
        this.hasMoved = true;
        this.isDragging = true;
      }

      if (this.hasMoved) {
        this.fabPosition = {
          x: this.touchStartPos.x + deltaX,
          y: this.touchStartPos.y + deltaY,
        };
      }
    };

    const mouseUpHandler = () => {
      if (this.isDragging && this.hasMoved) {
        this.snapFabToEdge();
        this.saveFabPosition();
      } else if (!this.hasMoved) {
        // Es un click, ejecutar acción (FINALIZAR sesión)
        this.endSessionWithHaptic();
      }

      this.isDragging = false;
      this.hasMoved = false;

      document.removeEventListener("mousemove", mouseMoveHandler);
      document.removeEventListener("mouseup", mouseUpHandler);
    };

    document.addEventListener("mousemove", mouseMoveHandler);
    document.addEventListener("mouseup", mouseUpHandler);

    event.preventDefault();
  }

  /**
   * Snap del FAB al borde más cercano
   */
  private snapFabToEdge(): void {
    const padding = 16;
    const fabSize = 72;
    const maxX = window.innerWidth - fabSize - padding;
    const maxY = window.innerHeight - fabSize - padding;

    // Determinar borde más cercano
    const distanceToLeft = this.fabPosition.x;
    const distanceToRight = window.innerWidth - this.fabPosition.x;
    const distanceToTop = this.fabPosition.y;
    const distanceToBottom = window.innerHeight - this.fabPosition.y;

    const minDistance = Math.min(
      distanceToLeft,
      distanceToRight,
      distanceToTop,
      distanceToBottom,
    );

    // Snap al borde más cercano
    if (minDistance === distanceToLeft) {
      this.fabPosition.x = padding;
    } else if (minDistance === distanceToRight) {
      this.fabPosition.x = maxX;
    }

    if (minDistance === distanceToTop) {
      this.fabPosition.y = padding;
    } else if (minDistance === distanceToBottom) {
      this.fabPosition.y = maxY;
    }

    // Asegurar dentro de límites
    this.constrainFabPosition();
  }

  /**
   * Limita la posición del FAB dentro de los límites de la pantalla
   */
  private constrainFabPosition(): void {
    const padding = 16;
    const fabSize = 72;
    const maxX = window.innerWidth - fabSize - padding;
    const maxY = window.innerHeight - fabSize - padding;

    this.fabPosition.x = Math.max(padding, Math.min(this.fabPosition.x, maxX));
    this.fabPosition.y = Math.max(padding, Math.min(this.fabPosition.y, maxY));
  }

  /**
   * Guarda la posición del FAB en localStorage
   */
  private saveFabPosition(): void {
    localStorage.setItem("fabPosition", JSON.stringify(this.fabPosition));
  }

  /**
   * Maneja cambios de orientación para reposicionar el FAB
   */
  private handleFabOrientationChange(): void {
    window.addEventListener("orientationchange", () => {
      setTimeout(() => {
        this.constrainFabPosition();
        this.saveFabPosition();
      }, 300);
    });

    window.addEventListener("resize", () => {
      this.constrainFabPosition();
    });
  }
}
