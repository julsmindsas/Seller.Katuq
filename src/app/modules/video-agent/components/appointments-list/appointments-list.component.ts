import { Component, OnInit, OnDestroy } from "@angular/core";
import { Subject, takeUntil } from "rxjs";
import {
  AgendamientoService,
  AppointmentData,
} from "src/app/shared/services/agendamiento.service";
import { MessageService } from "primeng/api";

@Component({
  selector: "app-appointments-list",
  templateUrl: "./appointments-list.component.html",
  styleUrls: ["./appointments-list.component.scss"],
  providers: [MessageService],
})
export class AppointmentsListComponent implements OnInit, OnDestroy {
  appointments: AppointmentData[] = [];
  filteredAppointments: AppointmentData[] = [];

  // Filtros
  selectedStatus: string = "all";
  searchText: string = "";

  // Estado
  loading = false;
  currentMode: "DEMO" | "PRODUCTION" = "DEMO";

  // Estadísticas
  stats = {
    total: 0,
    confirmed: 0,
    pending: 0,
    cancelled: 0,
    completed: 0,
  };

  private destroy$ = new Subject<void>();

  constructor(
    private agendamientoService: AgendamientoService,
    private messageService: MessageService,
  ) {}

  ngOnInit(): void {
    this.currentMode = this.agendamientoService.getMode();
    this.loadAppointments();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  loadAppointments(): void {
    this.loading = true;

    this.agendamientoService.appointments$
      .pipe(takeUntil(this.destroy$))
      .subscribe((appointments) => {
        this.appointments = appointments.sort((a, b) => {
          // Ordenar por fecha de cita (más reciente primero)
          return (
            new Date(b.appointmentDate).getTime() -
            new Date(a.appointmentDate).getTime()
          );
        });

        this.calculateStats();
        this.applyFilters();
        this.loading = false;
      });
  }

  calculateStats(): void {
    this.stats.total = this.appointments.length;
    this.stats.confirmed = this.appointments.filter(
      (a) => a.status === "confirmed",
    ).length;
    this.stats.pending = this.appointments.filter(
      (a) => a.status === "pending",
    ).length;
    this.stats.cancelled = this.appointments.filter(
      (a) => a.status === "cancelled",
    ).length;
    this.stats.completed = this.appointments.filter(
      (a) => a.status === "completed",
    ).length;
  }

  applyFilters(): void {
    let filtered = [...this.appointments];

    // Filtro por estado
    if (this.selectedStatus !== "all") {
      filtered = filtered.filter((a) => a.status === this.selectedStatus);
    }

    // Filtro por búsqueda
    if (this.searchText.trim()) {
      const search = this.searchText.toLowerCase();
      filtered = filtered.filter(
        (a) =>
          a.customerName.toLowerCase().includes(search) ||
          a.confirmationNumber.toLowerCase().includes(search) ||
          a.deviceInfo.toLowerCase().includes(search) ||
          a.phone.toLowerCase().includes(search),
      );
    }

    this.filteredAppointments = filtered;
  }

  onStatusChange(): void {
    this.applyFilters();
  }

  onSearchChange(): void {
    this.applyFilters();
  }

  cancelAppointment(appointment: AppointmentData): void {
    if (confirm(`¿Cancelar la cita de ${appointment.customerName}?`)) {
      const success = this.agendamientoService.cancelAppointment(
        appointment.confirmationNumber,
      );

      if (success) {
        this.messageService.add({
          severity: "success",
          summary: "Cita Cancelada",
          detail: `La cita ${appointment.confirmationNumber} ha sido cancelada`,
          life: 3000,
        });
      } else {
        this.messageService.add({
          severity: "error",
          summary: "Error",
          detail: "No se pudo cancelar la cita",
          life: 3000,
        });
      }
    }
  }

  getStatusLabel(status: string): string {
    const labels: Record<string, string> = {
      pending: "Pendiente",
      confirmed: "Confirmada",
      completed: "Completada",
      cancelled: "Cancelada",
    };
    return labels[status] || status;
  }

  getStatusSeverity(status: string): string {
    const severities: Record<string, string> = {
      pending: "warning",
      confirmed: "success",
      completed: "info",
      cancelled: "danger",
    };
    return severities[status] || "info";
  }

  getServiceTypeLabel(type: string): string {
    const labels: Record<string, string> = {
      screen_repair: "Reparación Pantalla",
      battery_replacement: "Reemplazo Batería",
      water_damage: "Daño por Agua",
      diagnostic: "Diagnóstico",
      other: "Otro",
    };
    return labels[type] || type;
  }

  formatDate(dateStr: string): string {
    const date = new Date(dateStr + "T00:00:00");
    return date.toLocaleDateString("es-ES", {
      weekday: "short",
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  }

  isDemoAppointment(appointment: AppointmentData): boolean {
    return appointment.confirmationNumber.startsWith("DEMO-");
  }

  clearAllAppointments(): void {
    if (
      confirm("⚠️ ¿Eliminar TODAS las citas? Esta acción no se puede deshacer.")
    ) {
      this.agendamientoService.clearAllAppointments();
      this.messageService.add({
        severity: "info",
        summary: "Citas Eliminadas",
        detail: "Todas las citas han sido eliminadas",
        life: 3000,
      });
    }
  }

  exportAppointments(): void {
    // TODO: Implementar exportación a Excel/CSV
    this.messageService.add({
      severity: "info",
      summary: "Exportar",
      detail: "Función de exportación próximamente",
      life: 3000,
    });
  }

  toggleMode(): void {
    const newMode = this.currentMode === "DEMO" ? "PRODUCTION" : "DEMO";
    this.agendamientoService.setMode(newMode);
    this.currentMode = newMode;

    this.messageService.add({
      severity: "info",
      summary: "Modo Cambiado",
      detail: `Modo cambiado a ${newMode}`,
      life: 3000,
    });
  }
}
