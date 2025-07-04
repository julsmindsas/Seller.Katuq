import { Component, EventEmitter, Input, OnInit, Output, OnChanges, SimpleChanges } from '@angular/core';
import { PedidoEntrega } from '../../interfaces/pedido-entrega.interface';

@Component({
  selector: 'app-detalle-entrega',
  templateUrl: './detalle-entrega.component.html',
  styleUrls: ['./detalle-entrega.component.scss']
})
export class DetalleEntregaComponent implements OnInit, OnChanges {
  @Input() pedido: PedidoEntrega;
  @Output() onClose = new EventEmitter<void>();
  @Output() onImageClick = new EventEmitter<string>();
  
  constructor() { }

  ngOnInit(): void {
    console.log('DetalleEntregaComponent - ngOnInit:', this.pedido);
  }
  
  ngOnChanges(changes: SimpleChanges): void {
    console.log('DetalleEntregaComponent - ngOnChanges:', changes);
    if (changes['pedido']) {
      console.log('Pedido changed:', changes['pedido'].currentValue);
    }
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