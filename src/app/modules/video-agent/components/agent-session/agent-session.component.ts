import {
  Component,
  OnInit,
  OnDestroy,
  ViewChild,
  ElementRef,
  ChangeDetectorRef,
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
import { AudioFeedbackService } from "../../core/services/audio-feedback.service";

/**
 * Componente principal para sesiones de Video Agent
 * Integra video, audio y Gemini Live API
 */
@Component({
  selector: "app-agent-session",
  templateUrl: "./agent-session.component.html",
  styleUrls: [
    // "./agent-session.component.scss", // DISABLED: Conflicts with elderly styles
    // "./agent-session-simple.component.scss", // DISABLED: Not needed for elderly UI
    "./agent-session-mobile.component.scss", // Mobile-first styles (CRITICAL)
    "./agent-session-elderly-enhanced.scss", // Enhanced UI for elderly (PRIORITY)
    "./agent-session-elderly-ultra.scss", // ULTRA-enhanced for 70+ users (MAXIMUM VISIBILITY)
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
  showSessionEndedOverlay = false;

  // FIX UX: Propiedades para mejorar experiencia de personas mayores
  hasUserSpoken = false;  // Controla si el usuario ya habló (para ocultar guía)
  showEndDialog = false;  // Diálogo de confirmación elegante (reemplaza confirm() nativo)

  // Elderly-specific enhancements
  isElderlyMode = true; // Enable by default for 70+ users
  autoZoomEnabled = true; // Auto-zoom camera for better visibility
  simplifiedUI = true; // Hide complex UI elements
  largeTextMode = true; // Force larger text sizes
  highContrastMode = false; // Can be toggled for vision problems
  voiceGuidanceEnabled = true; // Audio instructions for each step

  // Tool execution status (for UI indicator)
  currentToolStatus: { name: string; displayName: string; status: string } | null = null;

  // Configuración de empresa
  companyConfig!: CompanyConfig;

  // FAB State - SIMPLIFIED (no dragging)
  // FAB is now in fixed position: bottom-right corner

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
    private audioFeedback: AudioFeedbackService,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    this.loadCompanyConfig();
    this.initializeAdapters(); // Debe llamarse después de loadCompanyConfig
    this.setupSubscriptions();
    this.checkDeviceCapabilities();
    this.setupMobileOptimizations();
    // FAB is now in fixed position (CSS-based), no initialization needed
    this.setupElderlyEnhancements(); // NEW: Elderly-specific setup
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

    // Tool calls - Mostrar indicador de lo que está haciendo el modelo
    this.geminiService.toolCall$
      .pipe(takeUntil(this.destroy$))
      .subscribe((toolEvent) => {
        console.log('🔧 [UI] Tool event received:', toolEvent);
        if (toolEvent) {
          if (toolEvent.status === 'executing' || toolEvent.type === 'tool_call') {
            // Tool iniciando - mostrar indicador
            const displayName = toolEvent.display_name || toolEvent.displayName || `Procesando ${toolEvent.name || toolEvent.tool_name}...`;
            console.log('🔧 [UI] Showing tool indicator:', displayName);
            this.currentToolStatus = {
              name: toolEvent.name || toolEvent.tool_name,
              displayName: displayName,
              status: 'executing'
            };
            this.cdr.detectChanges();
          } else if (toolEvent.status === 'completed' || toolEvent.type === 'tool_result') {
            // Tool completado - ocultar indicador después de un momento
            console.log('🔧 [UI] Tool completed, hiding indicator');
            setTimeout(() => {
              this.currentToolStatus = null;
              this.cdr.detectChanges();
            }, 1000); // Aumentado a 1 segundo para que sea visible
          }
        }
      });

    // Frames de video
    this.videoService.frame$
      .pipe(takeUntil(this.destroy$))
      .subscribe((frameBase64) => {
        // 🛡️ FIX: Verificar sessionActive para prevenir envío después de finalizar
        if (this.isConnected && this.sessionActive) {
          this.geminiService.sendVideoFrame(frameBase64);
        }
      });

    // Chunks de audio - usar rawAudioChunk$ para envío binario (33% más eficiente)
    this.audioService.rawAudioChunk$
      .pipe(takeUntil(this.destroy$))
      .subscribe((pcmData: Int16Array) => {
        // 🛡️ FIX: Verificar sessionActive para prevenir envío después de finalizar
        if (this.isConnected && this.sessionActive) {
          this.geminiService.sendAudioPCM16(pcmData);
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

        // 🔊 Beep cuando empieza a grabar (detecta voz)
        if (recording && this.sessionActive) {
          this.audioFeedback.playVoiceDetected();

          // FIX UX: Marcar que el usuario ya habló (para ocultar guía visual)
          this.hasUserSpoken = true;
        }
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

        // 🔊 Beep cuando el asistente empieza a hablar
        if (playing && this.sessionActive) {
          this.audioFeedback.playAssistantSpeaking();
        }
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
      this.hasUserSpoken = false;  // FIX UX: Resetear para mostrar guía

      // FAB is now in fixed CSS position, no initialization needed

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

      // Iniciar captura de audio
      await this.audioService.startRecording();

      // FIX CAMERA: Establecer sessionActive ANTES de attachVideoPreview
      // para que el elemento #videoPreview exista en el DOM
      this.sessionActive = true;
      this.isLoading = false;

      // Forzar detección de cambios para renderizar el elemento
      this.cdr.detectChanges();

      // Ahora sí mostrar preview en UI (el elemento ya existe)
      this.attachVideoPreview();

      // 🔊 Reproducir beep de inicio
      this.audioFeedback.playSessionStart();

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
    // 🛡️ FIX: Establecer sessionActive a false INMEDIATAMENTE para bloquear frames/audio
    this.sessionActive = false;
    console.log("🛑 Session ending, sessionActive set to false");

    // Detener servicios (el orden importa)
    this.videoService.stopCapture();
    this.audioService.stopRecording();

    // Esperar a que Gemini desconecte completamente
    await this.geminiService.disconnect();

    // 🔊 Reproducir beep de finalización
    this.audioFeedback.playSessionEnd();

    // 💬 Mostrar overlay grande de confirmación
    this.showSessionEndedOverlay = true;
    setTimeout(() => {
      this.showSessionEndedOverlay = false;
    }, 3000); // 3 segundos

    console.log("✅ Session ended successfully");
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
   * Agrega mensaje al historial (con deduplicación)
   */
  private addMessage(role: "user" | "agent", text: string): void {
    // 🛡️ Evitar duplicados: Si el último mensaje es igual (mismo role y texto), no agregar
    const lastMessage = this.messages[this.messages.length - 1];
    if (lastMessage && lastMessage.role === role && lastMessage.text === text) {
      console.log("🚫 Duplicate message detected, skipping:", text.substring(0, 50));
      return;
    }

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
   * Muestra error en UI - ULTRA-MEJORADO PARA PERSONAS MAYORES
   */
  private showError(message: string): void {
    // Traducir mensajes de error técnicos a español simple y claro
    let userFriendlyMessage = message;
    let instructions = "";
    let isPermissionError = false;

    if (message.includes('Permission denied') || message.includes('NotAllowedError')) {
      userFriendlyMessage = '📷 NECESITO PERMISO';
      instructions = 'Para usar la cámara y micrófono:\n\n' +
                    '1. Busca el mensaje de permiso\n' +
                    '2. Toca "PERMITIR" o "ACEPTAR"\n' +
                    '3. Luego toca el botón verde de abajo';
      isPermissionError = true;
    } else if (message.includes('NotFoundError') || message.includes('No se detectó')) {
      userFriendlyMessage = '⚠️ NO ENCUENTRO LA CÁMARA';
      instructions = 'Posibles soluciones:\n\n' +
                    '1. Revisa que la cámara esté conectada\n' +
                    '2. Reinicia el teléfono\n' +
                    '3. Vuelve a intentar';
    } else if (message.includes('NotReadableError')) {
      userFriendlyMessage = '🔄 CÁMARA OCUPADA';
      instructions = 'Otra aplicación está usando la cámara:\n\n' +
                    '1. Cierra otras aplicaciones\n' +
                    '2. Espera 5 segundos\n' +
                    '3. Toca el botón verde de nuevo';
    } else if (message.includes('Error al iniciar')) {
      userFriendlyMessage = '❌ SIN CONEXIÓN';
      instructions = 'Verifica tu internet:\n\n' +
                    '1. Activa el WiFi o datos móviles\n' +
                    '2. Espera que aparezca la señal\n' +
                    '3. Vuelve a intentar';
    } else {
      userFriendlyMessage = '⚠️ ALGO SALIÓ MAL';
      instructions = 'Por favor:\n\n' +
                    '1. Espera un momento\n' +
                    '2. Toca el botón verde de nuevo\n' +
                    '3. Si no funciona, llama al soporte';
    }

    // Combine message with instructions
    this.errorMessage = userFriendlyMessage + '\n\n' + instructions;
    this.isLoading = false; // CRITICAL: Always stop loading on error

    // Voice announce the error for elderly users
    if (this.isElderlyMode && this.voiceGuidanceEnabled) {
      this.announceToUser(userFriendlyMessage + '. ' + instructions.replace(/\n/g, '. '));
    }

    // Show helpful toast with action button for permission errors
    if (isPermissionError && this.isElderlyMode) {
      this.toastr.warning(
        'Toca aquí para ver cómo dar permisos',
        'AYUDA CON PERMISOS',
        {
          timeOut: 0, // Don't auto-hide
          closeButton: true,
          tapToDismiss: true,
          positionClass: 'toast-top-center',
          toastClass: 'toast-elderly-help',
          enableHtml: true,
        }
      ).onTap.subscribe(() => {
        // Open help modal or guide
        this.showPermissionGuide();
      });
    }

    // Para errores críticos, no auto-limpiar el mensaje
    const isCriticalError = message.includes('Permission denied') ||
                           message.includes('NotFoundError') ||
                           message.includes('No se detectó');

    if (!isCriticalError) {
      setTimeout(() => {
        this.errorMessage = "";
      }, 15000); // 15 segundos para errores normales (más tiempo para elderly)
    }
    // Para errores críticos, el mensaje permanece hasta que el usuario lo resuelva
  }

  /**
   * Show permission guide for elderly users
   */
  private showPermissionGuide(): void {
    // This would open a modal or overlay with step-by-step visual guide
    // For now, just announce instructions
    const guide = "Para dar permisos: Primero, busca el mensaje que apareció arriba. " +
                 "Segundo, toca donde dice Permitir o Aceptar. " +
                 "Tercero, cuando veas que dice Permitido, toca el botón verde grande.";

    this.announceToUser(guide);

    // You could also implement a visual guide modal here
    console.log("📱 Permission guide requested for elderly user");
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
   * ELDERLY ENHANCEMENTS: Setup optimizations for 70+ users
   */
  private setupElderlyEnhancements(): void {
    console.log("👵 Setting up elderly enhancements...");

    // 1. Check if elderly mode is requested via URL param
    const elderlyParam = this.route.snapshot.queryParamMap.get("elderly");
    if (elderlyParam === "true" || elderlyParam === "1") {
      this.isElderlyMode = true;
    }

    // 2. Apply elderly-specific CSS classes to body
    if (this.isElderlyMode) {
      document.body.classList.add("elderly-mode");
      document.body.classList.add("font-size-extra-large");
    }

    // 3. Enable high contrast if requested
    const highContrastParam = this.route.snapshot.queryParamMap.get("highContrast");
    if (highContrastParam === "true" || highContrastParam === "1") {
      this.highContrastMode = true;
      document.body.classList.add("high-contrast-mode");
    }

    // 4. Set larger default font size for elderly
    if (this.isElderlyMode) {
      const root = document.documentElement;
      root.style.setProperty("--base-font-size", "18px"); // Larger base font
      root.style.setProperty("--min-touch-target", "60px"); // Larger touch targets
    }

    // 5. Disable complex animations for better focus
    if (this.isElderlyMode && this.simplifiedUI) {
      this.disableComplexAnimations();
    }

    // 6. Setup voice guidance announcements
    if (this.voiceGuidanceEnabled) {
      this.setupVoiceGuidance();
    }

    // 7. Add extra visual cues
    this.addElderlyVisualCues();

    // 8. Optimize camera for elderly users
    this.optimizeCameraForElderly();

    console.log("✅ Elderly enhancements applied:", {
      elderlyMode: this.isElderlyMode,
      highContrast: this.highContrastMode,
      simplifiedUI: this.simplifiedUI,
      largeText: this.largeTextMode,
      voiceGuidance: this.voiceGuidanceEnabled,
    });
  }

  /**
   * Disable complex animations that might confuse elderly users
   */
  private disableComplexAnimations(): void {
    const style = document.createElement("style");
    style.innerHTML = `
      * {
        animation-duration: 0.3s !important;
        transition-duration: 0.3s !important;
      }
    `;
    document.head.appendChild(style);
  }

  /**
   * Setup voice guidance for elderly users
   */
  private setupVoiceGuidance(): void {
    // Use browser's speech synthesis for voice guidance
    if ("speechSynthesis" in window) {
      // Announce important state changes
      this.geminiService.isConnected$.pipe(takeUntil(this.destroy$)).subscribe((connected) => {
        if (connected && this.sessionActive) {
          this.announceToUser("Conectado. Ya puedes hablar y mostrar el electrodoméstico.");
        }
      });

      // Announce when recording starts
      this.audioService.isRecording$.pipe(takeUntil(this.destroy$)).subscribe((recording) => {
        if (recording && this.sessionActive && this.voiceGuidanceEnabled) {
          this.announceToUser("Te estoy escuchando. Habla claro.");
        }
      });
    }
  }

  /**
   * Announce message to user using speech synthesis
   */
  private announceToUser(message: string): void {
    if (!this.voiceGuidanceEnabled || !("speechSynthesis" in window)) {
      return;
    }

    const utterance = new SpeechSynthesisUtterance(message);
    utterance.lang = "es-ES"; // Spanish
    utterance.rate = 0.8; // Slower speech for elderly
    utterance.pitch = 1.0;
    utterance.volume = 1.0;

    // Cancel any ongoing speech and speak new message
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(utterance);
  }

  /**
   * Add extra visual cues for elderly users
   */
  private addElderlyVisualCues(): void {
    // Add pulsing animation to important buttons
    const style = document.createElement("style");
    style.innerHTML = `
      .elderly-mode .btn-main-elderly {
        animation: elderly-pulse 2s ease-in-out infinite !important;
      }

      @keyframes elderly-pulse {
        0%, 100% {
          box-shadow: 0 0 0 0 rgba(0, 200, 81, 0.7);
        }
        50% {
          box-shadow: 0 0 0 20px rgba(0, 200, 81, 0);
        }
      }
    `;
    document.head.appendChild(style);
  }

  /**
   * Optimize camera settings for elderly users
   */
  private optimizeCameraForElderly(): void {
    // When starting video, apply elderly-friendly settings
    const originalStartCapture = this.videoService.startCapture.bind(this.videoService);

    this.videoService.startCapture = async (facingMode?: "user" | "environment") => {
      const result = await originalStartCapture(facingMode);

      // After camera starts, apply optimizations
      if (this.isElderlyMode && this.autoZoomEnabled) {
        const videoElement = this.videoService.getVideoElement();
        if (videoElement) {
          // Apply CSS zoom for better visibility
          videoElement.style.transform = "scale(1.2)"; // 20% zoom
          videoElement.style.transformOrigin = "center center";
        }
      }

      return result;
    };
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
    // 🛡️ FIX: Prevenir doble llamada (importante en Android con touch events)
    if (!this.sessionActive) {
      console.warn("⚠️ Session already ended, ignoring duplicate call");
      return;
    }

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
   * Get safe area inset value in pixels
   * MOBILE-CRITICAL: Prevents elements from hiding behind notches/home indicators
   * KEPT: This utility method is still useful for other components
   */
  private getSafeAreaInset(side: 'top' | 'right' | 'bottom' | 'left'): number {
    try {
      // Ensure document.body exists
      if (!document || !document.body) {
        return 16; // Default safe padding
      }

      // Try to get computed safe area value from CSS env() variable
      const testDiv = document.createElement('div');
      testDiv.style.position = 'fixed';
      testDiv.style.padding = `env(safe-area-inset-${side})`;
      testDiv.style.visibility = 'hidden';
      testDiv.style.pointerEvents = 'none';

      // Append to body
      document.body.appendChild(testDiv);

      // Get computed style
      const computedStyle = window.getComputedStyle(testDiv);
      const computedPadding = computedStyle.getPropertyValue('padding-' + side);

      // Clean up - check if still a child before removing
      if (testDiv.parentNode === document.body) {
        document.body.removeChild(testDiv);
      }

      const pixels = parseInt(computedPadding) || 0;

      // Fallback: Add minimum padding if safe area not detected
      return Math.max(pixels, 16); // Minimum 16px padding
    } catch (error) {
      console.warn('Could not detect safe area inset:', error);
      return 16; // Default safe padding on error
    }
  }

  /* ==============================================
     FAB METHODS - SIMPLIFIED (NO DRAGGING)
     ============================================== */

  /**
   * End session - Called when FAB button is clicked
   * FIX UX: Usa diálogo elegante en lugar de confirm() nativo
   */
  openEndSessionDialog(): void {
    this.showEndDialog = true;
  }

  /**
   * Confirma finalización de sesión (llamado desde p-dialog)
   */
  async confirmEndSession(): Promise<void> {
    this.showEndDialog = false;
    this.hapticFeedback("medium");
    await this.endSession();
  }

  /**
   * Cancela el diálogo de finalización
   */
  cancelEndSession(): void {
    this.showEndDialog = false;
  }
}
