import { Component, OnInit } from '@angular/core';
import { DynamicDialogRef, DynamicDialogConfig } from 'primeng/dynamicdialog';

@Component({
  selector: 'app-analisis-despachos',
  templateUrl: './analisis-despachos.component.html',
  styleUrls: ['./analisis-despachos.component.scss']
})
export class AnalisisDespachosComponent implements OnInit {

  // Propiedades para recibir los datos del componente padre
  pedidosUrgentes: any[] = [];
  pedidosEnRiesgo: any[] = [];
  pedidosSinProducir: any[] = [];
  zonasCriticas: any[] = [];
  prediccionCarga: any = {};

  constructor(
    public ref: DynamicDialogRef,
    public config: DynamicDialogConfig
  ) { }

  ngOnInit(): void {
    // Asignar los datos pasados al abrir el modal
    const data = this.config.data;
    this.pedidosUrgentes = data.pedidosUrgentes || [];
    this.pedidosEnRiesgo = data.pedidosEnRiesgo || [];
    this.pedidosSinProducir = data.pedidosSinProducir || [];
    this.zonasCriticas = data.zonasCriticas || [];
    this.prediccionCarga = data.prediccionCarga || {};
  }

  // Helper para convertir el objeto de predicción en un array para el template
  getPrediccionArray() {
    return Object.keys(this.prediccionCarga).map(key => ({
      fecha: key,
      ...this.prediccionCarga[key]
    }));
  }

  // Formatear fechas para la vista
  formatearFecha(fecha: string): string {
    const date = new Date(Number(fecha));
    return date.toLocaleDateString('es-CO', { weekday: 'long', day: 'numeric', month: 'short' });
  }

  cerrar(): void {
    this.ref.close();
  }
}
