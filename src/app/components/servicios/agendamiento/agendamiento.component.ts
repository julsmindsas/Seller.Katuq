import { Component, OnInit } from "@angular/core";
import { FormBuilder, FormGroup, Validators } from "@angular/forms";
import { Router } from "@angular/router";
import {
  GeolocationService,
  GeoAddress,
} from "../../../modules/video-agent/core/services/geolocation.service";

/**
 * Componente LITE de agendamiento para servicios técnicos
 * Integrado con diagnóstico de video-agent
 * Ahora con geolocalización automática
 */
@Component({
  selector: "app-agendamiento",
  templateUrl: "./agendamiento.component.html",
  styleUrls: ["./agendamiento.component.scss"],
})
export class AgendamientoComponent implements OnInit {
  agendamientoForm!: FormGroup;
  pendingService: any = null;
  isLoading = false;
  showSuccessMessage = false;
  isLoadingLocation = false;
  locationError = "";
  currentLocation: GeoAddress | null = null;

  // Opciones de fecha/hora
  availableDates: Date[] = [];
  availableTimeSlots: string[] = [
    "08:00 - 10:00",
    "10:00 - 12:00",
    "14:00 - 16:00",
    "16:00 - 18:00",
  ];

  constructor(
    private fb: FormBuilder,
    private router: Router,
    private geolocationService: GeolocationService,
  ) {}

  ngOnInit(): void {
    this.initializeForm();
    this.loadPendingService();
    this.generateAvailableDates();
    this.tryAutoDetectLocation();
  }

  /**
   * Inicializa el formulario
   */
  private initializeForm(): void {
    this.agendamientoForm = this.fb.group({
      // Datos del cliente
      nombreCompleto: ["", Validators.required],
      telefono: ["", [Validators.required, Validators.pattern(/^[0-9]{10}$/)]],
      correo: ["", [Validators.required, Validators.email]],

      // Dirección
      direccion: ["", Validators.required],
      ciudad: ["", Validators.required],

      // Agendamiento
      fechaPreferida: ["", Validators.required],
      horarioPreferido: ["", Validators.required],

      // Información del servicio
      tipoServicio: ["", Validators.required],
      descripcionProblema: ["", Validators.required],

      // Observaciones
      observaciones: [""],
    });
  }

  /**
   * Carga información del servicio pendiente desde sessionStorage
   */
  private loadPendingService(): void {
    const pending = sessionStorage.getItem("pendingService");

    if (pending) {
      try {
        this.pendingService = JSON.parse(pending);

        // Pre-llenar información del servicio
        this.agendamientoForm.patchValue({
          tipoServicio: this.pendingService.serviceType || "Reparación",
          descripcionProblema: this.pendingService.reason || "",
        });

        console.log("✅ Pending service loaded:", this.pendingService);
      } catch (error) {
        console.error("❌ Error parsing pending service:", error);
      }
    }
  }

  /**
   * Genera fechas disponibles (próximos 14 días, excluyendo domingos)
   */
  private generateAvailableDates(): void {
    const today = new Date();
    let daysAdded = 0;
    let currentDate = new Date(today);

    while (daysAdded < 14) {
      currentDate.setDate(currentDate.getDate() + 1);

      // Excluir domingos (0 = domingo)
      if (currentDate.getDay() !== 0) {
        this.availableDates.push(new Date(currentDate));
        daysAdded++;
      }
    }
  }

  /**
   * Envía la solicitud de agendamiento
   */
  async onSubmit(): Promise<void> {
    if (this.agendamientoForm.invalid) {
      this.agendamientoForm.markAllAsTouched();
      return;
    }

    try {
      this.isLoading = true;

      const formData = this.agendamientoForm.value;

      // Crear objeto de solicitud
      const solicitud = {
        ...formData,
        fechaCreacion: new Date().toISOString(),
        estado: "pendiente",
        urgencia: this.pendingService?.urgency || "media",
        costoEstimado: this.pendingService?.estimatedCost || "A cotizar",
        diagnostico: this.pendingService?.diagnosticResult || null,
      };

      console.log("📤 Enviando solicitud de agendamiento:", solicitud);

      // TODO: Integrar con backend real
      // await this.serviciosService.createSolicitud(solicitud);

      // Simular delay de red
      await this.delay(1500);

      // Limpiar sessionStorage
      sessionStorage.removeItem("pendingService");

      // Mostrar mensaje de éxito
      this.showSuccessMessage = true;
      this.isLoading = false;

      // Redirigir después de 3 segundos
      setTimeout(() => {
        this.router.navigate(["/video-agent"]);
      }, 3000);
    } catch (error) {
      console.error("❌ Error al agendar servicio:", error);
      this.isLoading = false;
      alert("Error al agendar el servicio. Por favor intenta nuevamente.");
    }
  }

  /**
   * Cancela y vuelve atrás
   */
  onCancel(): void {
    const confirmCancel = confirm("¿Deseas cancelar el agendamiento?");

    if (confirmCancel) {
      sessionStorage.removeItem("pendingService");
      this.router.navigate(["/video-agent"]);
    }
  }

  /**
   * Delay helper
   */
  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Getters para validación
   */
  get nombreCompleto() {
    return this.agendamientoForm.get("nombreCompleto");
  }

  get telefono() {
    return this.agendamientoForm.get("telefono");
  }

  get correo() {
    return this.agendamientoForm.get("correo");
  }

  get direccion() {
    return this.agendamientoForm.get("direccion");
  }

  get ciudad() {
    return this.agendamientoForm.get("ciudad");
  }

  get fechaPreferida() {
    return this.agendamientoForm.get("fechaPreferida");
  }

  get horarioPreferido() {
    return this.agendamientoForm.get("horarioPreferido");
  }

  get tipoServicio() {
    return this.agendamientoForm.get("tipoServicio");
  }

  get descripcionProblema() {
    return this.agendamientoForm.get("descripcionProblema");
  }

  /**
   * Intenta detectar automáticamente la ubicación del usuario
   */
  async tryAutoDetectLocation(): Promise<void> {
    if (!this.geolocationService.isGeolocationSupported()) {
      console.warn("⚠️ Geolocalización no soportada en este navegador");
      return;
    }

    try {
      this.isLoadingLocation = true;
      this.locationError = "";

      console.log("📍 Solicitando ubicación...");
      const location = await this.geolocationService.getCurrentLocation();

      this.currentLocation = location;
      console.log("✅ Ubicación obtenida:", location);

      // Auto-llenar campos de dirección
      if (location.street) {
        this.agendamientoForm.patchValue({
          direccion: `${location.street}${location.neighborhood ? ", " + location.neighborhood : ""}`,
          ciudad: location.city || location.state || "",
        });
      } else {
        // Si no hay calle, usar dirección formateada
        this.agendamientoForm.patchValue({
          direccion: location.formatted,
          ciudad: location.city || location.state || "",
        });
      }

      this.isLoadingLocation = false;
    } catch (error: any) {
      console.error("❌ Error obteniendo ubicación:", error);
      this.locationError = error.message || "No se pudo obtener la ubicación";
      this.isLoadingLocation = false;
    }
  }

  /**
   * Solicita manualmente la ubicación (botón en UI)
   */
  async requestLocation(): Promise<void> {
    await this.tryAutoDetectLocation();
  }

  /**
   * Limpia la dirección auto-detectada
   */
  clearAutoLocation(): void {
    this.currentLocation = null;
    this.agendamientoForm.patchValue({
      direccion: "",
      ciudad: "",
    });
  }
}
