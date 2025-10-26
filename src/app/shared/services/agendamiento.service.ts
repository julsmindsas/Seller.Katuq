import { Injectable } from "@angular/core";
import { BehaviorSubject, Observable } from "rxjs";
import { OperadoresService } from "./operadores.service";

export interface AppointmentConfig {
  mode: "DEMO" | "PRODUCTION";
}

export interface AppointmentData {
  confirmationNumber: string;
  customerName: string;
  phone: string;
  email?: string;
  appointmentDate: string;
  appointmentTime: string;
  serviceType: string;
  deviceInfo: string;
  issueSummary: string;
  address: string;
  city: string;
  coordinates?: {
    latitude: number;
    longitude: number;
  };
  estimatedCost?: string;
  specialNotes?: string;
  createdAt: string;
  status: "pending" | "confirmed" | "completed" | "cancelled";
  operadorAsignado?: {
    id: string;
    nombre: string;
    telefono: string;
    email: string;
    distancia?: number; // km desde el cliente
  };
}

@Injectable({
  providedIn: "root",
})
export class AgendamientoService {
  // Configuración: cambiar a 'PRODUCTION' cuando esté listo
  private config: AppointmentConfig = {
    mode: "DEMO", // DEMO | PRODUCTION
  };

  private appointmentsSubject = new BehaviorSubject<AppointmentData[]>([]);
  public appointments$: Observable<AppointmentData[]> =
    this.appointmentsSubject.asObservable();

  constructor(private operadoresService: OperadoresService) {
    this.loadAppointments();
  }

  /**
   * MODO DEMO: Agenda automáticamente para el día siguiente
   * Solo requiere nombre, obtiene ubicación automáticamente
   */
  async createDemoAppointment(
    customerName: string,
    deviceInfo: string,
    issueSummary: string,
    coordinates?: { latitude: number; longitude: number },
  ): Promise<AppointmentData> {
    // Generar fecha para mañana
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const appointmentDate = tomorrow.toISOString().split("T")[0];

    // Asignar horario automático (10:00 - 12:00)
    const appointmentTime = "10:00 - 12:00";

    // Generar número de confirmación
    const confirmationNumber = this.generateConfirmationNumber();

    // Asignar operador automáticamente
    const operador = this.operadoresService.asignarMejorOperador(
      "diagnostic",
      coordinates?.latitude,
      coordinates?.longitude,
    );

    // Crear appointment con datos mínimos
    const appointment: AppointmentData = {
      confirmationNumber,
      customerName,
      phone: "Demo - Sin teléfono", // Placeholder para demo
      email: "demo@katuq.com",
      appointmentDate,
      appointmentTime,
      serviceType: "diagnostic",
      deviceInfo,
      issueSummary,
      address: coordinates
        ? "Ubicación detectada automáticamente"
        : "Sin ubicación",
      city: "Bogotá",
      coordinates,
      estimatedCost: "Por determinar",
      specialNotes: "🎯 DEMO MODE - Agendamiento automático",
      createdAt: new Date().toISOString(),
      status: "confirmed",
      operadorAsignado: operador
        ? {
            id: operador.id,
            nombre: operador.nombreCompleto,
            telefono: operador.telefono,
            email: operador.email,
            distancia: coordinates
              ? this.calcularDistancia(
                  coordinates.latitude,
                  coordinates.longitude,
                  operador.ubicacion.coordinates.latitude,
                  operador.ubicacion.coordinates.longitude,
                )
              : undefined,
          }
        : undefined,
    };

    // Marcar operador como ocupado
    if (operador) {
      this.operadoresService.ocuparOperador(operador.id);
    }

    // Guardar en localStorage
    this.saveAppointment(appointment);

    console.log("🎯 DEMO APPOINTMENT CREATED:", appointment);
    if (operador) {
      console.log(
        `👷 Operador asignado: ${operador.nombreCompleto} (${appointment.operadorAsignado?.distancia?.toFixed(2)} km)`,
      );
    }

    return appointment;
  }

  /**
   * MODO PRODUCCIÓN: Requiere validaciones completas
   * Todos los campos obligatorios, validación de horarios, confirmación por email
   */
  async createProductionAppointment(
    data: Partial<AppointmentData>,
  ): Promise<AppointmentData> {
    // Validaciones estrictas
    if (!data.customerName || data.customerName.length < 3) {
      throw new Error("Nombre completo requerido (mínimo 3 caracteres)");
    }

    if (!data.phone || !this.validatePhone(data.phone)) {
      throw new Error("Teléfono válido requerido (10 dígitos)");
    }

    if (!data.email || !this.validateEmail(data.email)) {
      throw new Error("Email válido requerido");
    }

    if (!data.appointmentDate || !this.validateDate(data.appointmentDate)) {
      throw new Error("Fecha de cita válida requerida");
    }

    if (!data.appointmentTime) {
      throw new Error("Horario de cita requerido");
    }

    if (!data.serviceType) {
      throw new Error("Tipo de servicio requerido");
    }

    // Validar disponibilidad del horario
    const isAvailable = await this.checkAvailability(
      data.appointmentDate,
      data.appointmentTime,
    );
    if (!isAvailable) {
      throw new Error("El horario seleccionado no está disponible");
    }

    const confirmationNumber = this.generateConfirmationNumber();

    const appointment: AppointmentData = {
      confirmationNumber,
      customerName: data.customerName,
      phone: data.phone,
      email: data.email,
      appointmentDate: data.appointmentDate,
      appointmentTime: data.appointmentTime,
      serviceType: data.serviceType,
      deviceInfo: data.deviceInfo || "Sin especificar",
      issueSummary: data.issueSummary || "Sin descripción",
      address: data.address || "Sin especificar",
      city: data.city || "Sin especificar",
      coordinates: data.coordinates,
      estimatedCost: data.estimatedCost,
      specialNotes: data.specialNotes,
      createdAt: new Date().toISOString(),
      status: "pending", // En producción inicia como pending
    };

    // Guardar en localStorage (en producción sería backend)
    this.saveAppointment(appointment);

    // TODO: Enviar email de confirmación
    // await this.sendConfirmationEmail(appointment);

    console.log("✅ PRODUCTION APPOINTMENT CREATED:", appointment);

    return appointment;
  }

  /**
   * Método principal que decide entre DEMO y PRODUCCIÓN
   */
  async createAppointment(
    data: Partial<AppointmentData>,
  ): Promise<AppointmentData> {
    if (this.config.mode === "DEMO") {
      return this.createDemoAppointment(
        data.customerName || "Cliente Demo",
        data.deviceInfo || "iPhone",
        data.issueSummary || "Diagnóstico general",
        data.coordinates,
      );
    } else {
      return this.createProductionAppointment(data);
    }
  }

  /**
   * Obtener slots disponibles
   */
  getAvailableTimeSlots(
    date?: string,
  ): { date: string; time: string; available: boolean }[] {
    const slots: { date: string; time: string; available: boolean }[] = [];
    const timeSlots = [
      "08:00 - 10:00",
      "10:00 - 12:00",
      "14:00 - 16:00",
      "16:00 - 18:00",
    ];
    const startDate = date ? new Date(date) : new Date();

    // Generar slots para 14 días
    for (let i = 1; i <= 14; i++) {
      const slotDate = new Date(startDate);
      slotDate.setDate(slotDate.getDate() + i);

      // Excluir domingos
      if (slotDate.getDay() === 0) continue;

      const dateStr = slotDate.toISOString().split("T")[0];

      timeSlots.forEach((slot) => {
        // En modo DEMO todos los slots están disponibles
        // En PRODUCCIÓN verificar contra appointments guardados
        const available =
          this.config.mode === "DEMO"
            ? true
            : this.isSlotAvailable(dateStr, slot);

        slots.push({
          date: dateStr,
          time: slot,
          available,
        });
      });
    }

    return slots.slice(0, 20); // Limitar a 20 slots
  }

  /**
   * Verificar disponibilidad de un slot específico
   */
  private async checkAvailability(
    date: string,
    time: string,
  ): Promise<boolean> {
    if (this.config.mode === "DEMO") return true; // En demo siempre disponible

    return this.isSlotAvailable(date, time);
  }

  private isSlotAvailable(date: string, time: string): boolean {
    const appointments = this.appointmentsSubject.value;

    // Verificar si ya existe una cita en ese horario
    const conflict = appointments.find(
      (apt) =>
        apt.appointmentDate === date &&
        apt.appointmentTime === time &&
        apt.status !== "cancelled",
    );

    return !conflict;
  }

  /**
   * Validaciones
   */
  private validatePhone(phone: string): boolean {
    // Validar 10 dígitos
    const phoneRegex = /^\d{10}$/;
    return phoneRegex.test(phone.replace(/\s|-/g, ""));
  }

  private validateEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  private validateDate(date: string): boolean {
    const appointmentDate = new Date(date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // La fecha debe ser futura
    return appointmentDate >= today;
  }

  /**
   * Calcular distancia entre dos puntos (Haversine)
   */
  private calcularDistancia(
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number,
  ): number {
    const R = 6371; // Radio de la Tierra en km
    const dLat = this.toRadians(lat2 - lat1);
    const dLon = this.toRadians(lon2 - lon1);

    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.toRadians(lat1)) *
        Math.cos(this.toRadians(lat2)) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return Math.round(R * c * 100) / 100; // Redondear a 2 decimales
  }

  private toRadians(degrees: number): number {
    return degrees * (Math.PI / 180);
  }

  /**
   * Generar número de confirmación único
   */
  private generateConfirmationNumber(): string {
    const prefix = this.config.mode === "DEMO" ? "DEMO" : "APL";
    const timestamp = Date.now().toString().slice(-8);
    const random = Math.floor(Math.random() * 1000)
      .toString()
      .padStart(3, "0");
    return `${prefix}-${timestamp}-${random}`;
  }

  /**
   * Persistencia en localStorage
   */
  private saveAppointment(appointment: AppointmentData): void {
    const appointments = this.appointmentsSubject.value;
    const updated = [...appointments, appointment];

    localStorage.setItem("katuq_appointments", JSON.stringify(updated));
    this.appointmentsSubject.next(updated);
  }

  private loadAppointments(): void {
    const stored = localStorage.getItem("katuq_appointments");
    if (stored) {
      try {
        const appointments = JSON.parse(stored);
        this.appointmentsSubject.next(appointments);
      } catch (error) {
        console.error("Error loading appointments:", error);
      }
    }
  }

  /**
   * Obtener todas las citas
   */
  getAppointments(): AppointmentData[] {
    return this.appointmentsSubject.value;
  }

  /**
   * Obtener cita por número de confirmación
   */
  getAppointmentByConfirmation(
    confirmationNumber: string,
  ): AppointmentData | undefined {
    return this.appointmentsSubject.value.find(
      (apt) => apt.confirmationNumber === confirmationNumber,
    );
  }

  /**
   * Cancelar cita
   */
  cancelAppointment(confirmationNumber: string): boolean {
    const appointments = this.appointmentsSubject.value;
    const index = appointments.findIndex(
      (apt) => apt.confirmationNumber === confirmationNumber,
    );

    if (index !== -1) {
      appointments[index].status = "cancelled";
      localStorage.setItem("katuq_appointments", JSON.stringify(appointments));
      this.appointmentsSubject.next([...appointments]);
      return true;
    }

    return false;
  }

  /**
   * Cambiar modo (DEMO <-> PRODUCTION)
   */
  setMode(mode: "DEMO" | "PRODUCTION"): void {
    this.config.mode = mode;
    console.log(`🔧 Agendamiento mode changed to: ${mode}`);
  }

  getMode(): "DEMO" | "PRODUCTION" {
    return this.config.mode;
  }

  /**
   * Limpiar todas las citas (útil para testing)
   */
  clearAllAppointments(): void {
    localStorage.removeItem("katuq_appointments");
    this.appointmentsSubject.next([]);
    console.log("🗑️ All appointments cleared");
  }
}
