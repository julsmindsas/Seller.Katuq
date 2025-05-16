import { Component, OnInit } from '@angular/core';
import { DynamicDialogRef, DynamicDialogConfig } from 'primeng/dynamicdialog';

@Component({
  selector: 'app-observaciones-detalle',
  templateUrl: './observaciones-detalle.component.html',
  styleUrls: ['./observaciones-detalle.component.scss']
})
export class ObservacionesDetalleComponent implements OnInit {

  envioData: any;

  constructor(
    public ref: DynamicDialogRef,
    public config: DynamicDialogConfig
  ) { }

  ngOnInit(): void {
    this.envioData = this.config.data;
  }

  cerrar(): void {
    this.ref.close();
  }
} 