import { Pipe, PipeTransform } from '@angular/core';
import { Pedido } from '../../ventas/modelo/pedido';

@Pipe({
  name: 'totalValorACobrar'
})
export class TotalValorACobrarPipe implements PipeTransform {
  transform(pedidos: Pedido[]): number {
    if (!pedidos || pedidos.length === 0) {
      return 0;
    }
    
    return pedidos.reduce((total, pedido) => {
      return total + (pedido.faltaPorPagar || 0);
    }, 0);
  }
} 