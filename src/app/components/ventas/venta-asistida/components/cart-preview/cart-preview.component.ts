import { Component, EventEmitter, Input, Output } from '@angular/core';

@Component({
  selector: 'app-cart-preview',
  templateUrl: './cart-preview.component.html',
  styleUrls: ['./cart-preview.component.scss']
})
export class CartPreviewComponent {
  @Input() productosCarrito: any[] = [];
  @Input() subtotal: number = 0;
  @Input() costoEnvio: number = 0;
  @Input() advertenciaCobertura: string | null = null;
  @Input() totalPedido: number = 0;
  @Output() limpiarCarrito = new EventEmitter<void>();
} 