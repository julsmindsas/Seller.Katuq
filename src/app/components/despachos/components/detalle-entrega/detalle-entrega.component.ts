import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { PedidoEntrega } from '../../interfaces/pedido-entrega.interface';

@Component({
  selector: 'app-detalle-entrega',
  templateUrl: './detalle-entrega.component.html',
  styleUrls: ['./detalle-entrega.component.scss']
})
export class DetalleEntregaComponent implements OnInit {
  @Input() pedido: PedidoEntrega;
  @Output() onClose = new EventEmitter<void>();
  @Output() onImageClick = new EventEmitter<string>();
  
  constructor() { }

  ngOnInit(): void {
  }
  
  isArray(value: any): boolean {
    return Array.isArray(value);
  }
  
  closeModal(): void {
    this.onClose.emit();
  }
  
  openFullImage(imageUrl: string): void {
    this.onImageClick.emit(imageUrl);
  }
} 