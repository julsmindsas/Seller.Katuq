import { Component, OnInit } from '@angular/core';
import { FilaCampana, PautaMetricasService } from '../../../../shared/services/pauta-metricas.service';

/**
 * Registros por campaña de pauta (D-327): cuántos trae cada campaña, cuántos
 * ya venden 10 o más pedidos a la semana y cuánto cuesta cada uno. El costo lo
 * escribe el Super Admin mientras no haya integración con Meta.
 */
@Component({
  selector: 'app-pauta-campanas',
  templateUrl: './pauta-campanas.component.html',
  styleUrls: ['./pauta-campanas.component.scss'],
})
export class PautaCampanasComponent implements OnInit {
  desde = new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10);
  filas: FilaCampana[] = [];
  cargando = false;
  error = '';
  costos: { [campana: string]: number | null } = {};
  guardando: string | null = null;

  constructor(private servicio: PautaMetricasService) {}

  ngOnInit(): void {
    this.cargar();
  }

  cargar(): void {
    this.cargando = true;
    this.error = '';
    this.servicio.metricas(this.desde).subscribe({
      next: (r) => {
        this.filas = r?.data?.campanas || [];
        this.costos = Object.fromEntries(this.filas.map((f) => [f.campana, f.costoCOP]));
        this.cargando = false;
      },
      error: (err) => {
        this.error = err?.error?.error || 'No se pudieron cargar los registros por campaña.';
        this.cargando = false;
      },
    });
  }

  guardarCosto(fila: FilaCampana): void {
    const costo = Number(this.costos[fila.campana]);
    if (!Number.isFinite(costo) || costo < 0) return;
    this.guardando = fila.campana;
    this.servicio.guardarCosto(fila.campana, costo).subscribe({
      next: () => {
        this.guardando = null;
        this.cargar();
      },
      error: (err) => {
        this.guardando = null;
        this.error = err?.error?.error || 'No se pudo guardar el costo.';
      },
    });
  }
}
