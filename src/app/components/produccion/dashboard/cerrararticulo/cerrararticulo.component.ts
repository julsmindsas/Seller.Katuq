import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { FormControl, FormGroup } from '@angular/forms';
import { Detalle, DetallePedido, PedidosParaProduccionEnsamble } from '../../../../shared/models/produccion/Produccion';

@Component({
  selector: 'app-cerrararticulo',
  templateUrl: './cerrararticulo.component.html',
  styleUrls: ['./cerrararticulo.component.scss']
})
export class CerrararticuloComponent implements OnInit {

  @Input()
  selectedOrdersEnsamble: PedidosParaProduccionEnsamble[] = [];

  @Input()
  processSelected: string;


  totalPiezasProducidasSumadas = 0;

  formulario = new FormGroup({
    cantidad: new FormControl('0'),
    faltante: new FormControl(''),
    resumen: new FormControl(''),
    piezas: new FormControl(''),
    piezasFaltantesPorRepartir: new FormControl('0'),
    totalHistoricoProducido: new FormControl('0')
  });
  constructor() { }

  ngOnInit(): void {
    console.log(this.selectedOrdersEnsamble);
    console.log(this.processSelected);
    
    // Ordenar por fecha de entrega - Algoritmo mejorado y más robusto
    this.ordenarPorFechaEntrega();

    this.formulario.controls['faltante'].setValue(this.getFaltante().toString());
    this.formulario.controls['piezasFaltantesPorRepartir'].setValue(this.getFaltante().toString());
    this.formulario.controls['totalHistoricoProducido'].setValue(this.getTotalHistoricoProducido().toString());
    this.formulario.controls['cantidad'].valueChanges.subscribe((value) => {
      if (value === '' || value === null) {
        this.formulario.controls['resumen'].setValue('');
        this.formulario.controls['faltante'].setValue(this.getCantidadTotalProductoEnsamble().toString());
        return;
      }
      
      if (value === '0') {
        this.formulario.controls['resumen'].setValue('');
        this.formulario.controls['faltante'].setValue(this.getFaltante().toString());
        return;
      }

      const cantidadIngresada = parseInt(value);
      const cantidadTotal = this.getCantidadTotalProductoEnsamble();
      
      if (cantidadIngresada > cantidadTotal) {
        this.formulario.controls['faltante'].setValue(cantidadTotal.toString());
        this.formulario.controls['resumen'].setValue('La cantidad ingresada es mayor a la cantidad total de piezas a producir');
        return;
      }
      
      this.formulario.controls['faltante'].setValue(this.getFaltante().toString());

      // Algoritmo mejorado de distribución
      this.distribuirPiezas(cantidadIngresada, cantidadTotal);
    });
  }

  /**
   * Determina si una fecha de entrega es urgente (3 días o menos)
   * @param fechaEntrega - String con la fecha de entrega
   * @returns boolean - true si la fecha es urgente, false si no lo es
   */
  esUrgente(fechaEntrega: string | null): boolean {
    if (!fechaEntrega) return false;
    
    try {
      const hoy = new Date();
      hoy.setHours(0, 0, 0, 0); // Resetear a inicio del día
      
      const fechaEntregaObj = new Date(fechaEntrega);
      fechaEntregaObj.setHours(0, 0, 0, 0); // Resetear a inicio del día
      
      // Verificar si la fecha es válida
      if (isNaN(fechaEntregaObj.getTime())) {
        return false;
      }
      
      // Calcular diferencia en días
      const diferenciaTiempo = fechaEntregaObj.getTime() - hoy.getTime();
      const diferenciaDias = Math.ceil(diferenciaTiempo / (1000 * 3600 * 24));
      
      // Es urgente si es hoy, es pasado, o son 3 días o menos
      return diferenciaDias <= 3;
      
    } catch (error) {
      console.warn('Error al verificar fecha urgente:', error);
      return false;
    }
  }

  /**
   * Ordena los pedidos por fecha de entrega de manera robusta,
   * manejando casos de fechas nulas, indefinidas o inválidas
   */
  ordenarPorFechaEntrega(): void {
    // Definir una fecha futura lejana para pedidos sin fecha (baja prioridad)
    const fechaFutura = new Date();
    fechaFutura.setFullYear(fechaFutura.getFullYear() + 10);
    
    this.selectedOrdersEnsamble.sort((a, b) => {
      // Función para obtener una fecha válida o la fecha futura por defecto
      const obtenerFechaValida = (orden: PedidosParaProduccionEnsamble): Date => {
        // Verificar si hay detallePedido y si tiene elementos
        if (!orden.detallePedido || orden.detallePedido.length === 0) {
          return fechaFutura;
        }
        
        // Buscar el primer pedido con fecha válida
        for (const detalle of orden.detallePedido) {
          if (detalle.fechaEntrega) {
            try {
              const fecha = new Date(detalle.fechaEntrega);
              // Verificar si la fecha es válida
              if (!isNaN(fecha.getTime())) {
                return fecha;
              }
            } catch (error) {
              console.warn('Error al convertir fecha:', detalle.fechaEntrega);
            }
          }
        }
        
        // Si no encontramos fechas válidas, usar la fecha futura
        return fechaFutura;
      };
      
      // Obtener fechas válidas para ambos órdenes
      const fechaA = obtenerFechaValida(a);
      const fechaB = obtenerFechaValida(b);
      
      // Comparar fechas
      return fechaA.getTime() - fechaB.getTime();
    });
    
    console.log('Pedidos ordenados por fecha de entrega:', this.selectedOrdersEnsamble);
  }

  /**
   * Algoritmo mejorado para distribuir piezas entre pedidos de forma proporcional y justa
   * @param cantidadIngresada - Total de piezas a distribuir
   * @param cantidadTotal - Cantidad total de productos
   */
  distribuirPiezas(cantidadIngresada: number, cantidadTotal: number): void {
    // Paso 1: Preparar los datos para la distribución
    const pedidosDisponibles: DetallePedido[] = [];
    
    // Aplanar todos los detalles de pedido para trabajar con una única lista
    this.selectedOrdersEnsamble.forEach(orden => {
      orden.detallePedido.forEach(detalle => {
        // Inicializar el proceso y establecer piezas a cero
        detalle.proceso = this.processSelected;
        detalle.piezasProducidas = 0;
        
        // Agregar solo los pedidos con piezas pendientes
        if (detalle.cantidadArticulosPorPedido > 0) {
          pedidosDisponibles.push(detalle);
        }
      });
    });
    
    // No hay pedidos para distribuir
    if (pedidosDisponibles.length === 0) {
      this.formulario.controls['piezasFaltantesPorRepartir'].setValue(cantidadIngresada.toString());
      return;
    }
    
    // Paso 2: Calcular la distribución proporcional
    if (cantidadIngresada >= cantidadTotal) {
      // Si hay suficientes piezas para cubrir todo, asignar completo a cada pedido
      pedidosDisponibles.forEach(detalle => {
        detalle.piezasProducidas = detalle.cantidadArticulosPorPedido;
        this.actualizarPiezasPorRepartir(detalle);
      });
      
      this.formulario.controls['piezasFaltantesPorRepartir'].setValue('0');
      return;
    }
    
    // Paso 3: Distribución proporcional cuando hay menos piezas que el total
    
    // Ordenar por fecha de entrega y prioridad (primero los más urgentes)
    pedidosDisponibles.sort((a, b) => {
      // Definir una fecha futura lejana para pedidos sin fecha
      const fechaFutura = new Date();
      fechaFutura.setFullYear(fechaFutura.getFullYear() + 10);
      
      // Obtener fechas seguras
      const fechaA = a.fechaEntrega ? new Date(a.fechaEntrega) : fechaFutura;
      const fechaB = b.fechaEntrega ? new Date(b.fechaEntrega) : fechaFutura;
      
      // Validar que las fechas sean válidas
      const tiempoA = !isNaN(fechaA.getTime()) ? fechaA.getTime() : fechaFutura.getTime();
      const tiempoB = !isNaN(fechaB.getTime()) ? fechaB.getTime() : fechaFutura.getTime();
      
      // Si las fechas son iguales, ordenar por cantidad (menor primero para balancear)
      if (tiempoA === tiempoB) {
        return a.cantidadArticulosPorPedido - b.cantidadArticulosPorPedido;
      }
      
      return tiempoA - tiempoB;
    });
    
    // Distribuir piezas usando un enfoque de prioridad y proporcionalidad
    let piezasRestantes = cantidadIngresada;
    
    // Primer paso: asignar un mínimo a cada pedido para garantizar que todos reciban algo
    const minimoInicial = Math.floor(cantidadIngresada / pedidosDisponibles.length);
    
    if (minimoInicial > 0) {
      pedidosDisponibles.forEach(detalle => {
        const asignacion = Math.min(minimoInicial, detalle.cantidadArticulosPorPedido);
        detalle.piezasProducidas = asignacion;
        piezasRestantes -= asignacion;
      });
    }
    
    // Segundo paso: distribuir las piezas restantes de forma proporcional a las necesidades
    if (piezasRestantes > 0) {
      // Calcular las necesidades restantes totales
      const necesidadesRestantes = pedidosDisponibles.reduce((total, detalle) => 
        total + (detalle.cantidadArticulosPorPedido - (detalle.piezasProducidas || 0)), 0);
      
      // Distribuir proporcionalmente las piezas restantes
      pedidosDisponibles.forEach(detalle => {
        if (piezasRestantes > 0) {
          const necesidadRestante = detalle.cantidadArticulosPorPedido - (detalle.piezasProducidas || 0);
          
          if (necesidadRestante > 0) {
            // Calcular asignación proporcional
            const proporcion = necesidadRestante / necesidadesRestantes;
            let asignacionAdicional = Math.round(piezasRestantes * proporcion);
            
            // Ajustar al máximo necesario
            asignacionAdicional = Math.min(asignacionAdicional, necesidadRestante);
            
            // Ajustar si quedan menos piezas que la asignación
            asignacionAdicional = Math.min(asignacionAdicional, piezasRestantes);
            
            // Actualizar piezas producidas y restantes
            detalle.piezasProducidas = (detalle.piezasProducidas || 0) + asignacionAdicional;
            piezasRestantes -= asignacionAdicional;
          }
        }
        
        this.actualizarPiezasPorRepartir(detalle);
      });
    }
    
    // Si aún quedan piezas, distribuirlas a los pedidos más urgentes
    if (piezasRestantes > 0) {
      for (const detalle of pedidosDisponibles) {
        if (piezasRestantes <= 0) break;
        
        const piezasFaltantes = detalle.cantidadArticulosPorPedido - (detalle.piezasProducidas || 0);
        
        if (piezasFaltantes > 0) {
          const asignacion = Math.min(piezasRestantes, piezasFaltantes);
          detalle.piezasProducidas = (detalle.piezasProducidas || 0) + asignacion;
          piezasRestantes -= asignacion;
          this.actualizarPiezasPorRepartir(detalle);
        }
      }
    }
    
    // Actualizar piezas faltantes por repartir
    this.formulario.controls['piezasFaltantesPorRepartir'].setValue(piezasRestantes.toString());
  }

  getTotalHistoricoProducido() {
    const total = this.selectedOrdersEnsamble.reduce((acc1, item) => {
      return acc1 + item.detallePedido?.reduce((acc2, item2) => {
        // Manejar posibles valores nulos o indefinidos
        const historialFiltrado = item2.historialPiezasProducidas?.filter(p => p?.proceso === this.processSelected) || [];
        const piezasDelProceso = historialFiltrado.reduce((acc3, item3) => acc3 + (item3?.piezasProducidas || 0), 0);
        return acc2 + piezasDelProceso;
      }, 0) || 0;
    }, 0) || 0;
    return total;
  }

  getCantidadTotalProductoEnsamble() {
    return this.selectedOrdersEnsamble.reduce((acc, item) => acc + (item.cantidadTotalProductoEnsamble || 0), 0);
  }

  getFaltante() {
    const cantidadIngresada = parseInt(this.formulario.controls['cantidad'].value || '0');
    return (this.getCantidadTotalProductoEnsamble() - this.getTotalHistoricoProducido()) - cantidadIngresada;
  }

  onSubmit() {
    console.log(this.formulario.value);
  }

  actualizarPiezasPorRepartir(detalle: DetallePedido) {
    // Asegurar que piezasProducidas tenga un valor válido
    detalle.piezasProducidas = detalle.piezasProducidas || 0;
    
    // Calcular piezas por repartir
    detalle.piezasPorRepartir = detalle.cantidadArticulosPorPedido - detalle.piezasProducidas;

    // Asegurándonos de que las piezas por repartir no sean negativas
    if (detalle.piezasPorRepartir < 0) {
      detalle.piezasPorRepartir = 0;
    }

    // Validar que la suma de todas las piezas producidas sea igual a la cantidad total de piezas a producir
    this.totalPiezasProducidasSumadas = this.selectedOrdersEnsamble.reduce((acc, item) => {
      return acc + item.detallePedido.reduce((acc, pedido) => acc + (pedido.piezasProducidas || 0), 0);
    }, 0);
    
    const cantidadIngresada = parseInt(this.formulario.controls['cantidad'].value || '0');
    if (this.totalPiezasProducidasSumadas === cantidadIngresada) {
      this.formulario.controls['resumen'].setValue('La distribución está completa y balanceada');
    } else {
      this.formulario.controls['resumen'].setValue('La distribución está en progreso');
    }

    console.log('piezasRepartidas', detalle);
  }

  getMaxActualizarPiezasPorRepartir(detalle: any) {
    if (detalle.piezasProducidas !== null && detalle.piezasProducidas !== '' && 
        this.formulario.value.piezasFaltantesPorRepartir !== '' && 
        this.formulario.value.cantidad !== '') {

      // Usar valores seguros con operadores de coalescencia nula
      const piezasFaltantesPorRepartir = parseInt(this.formulario.value.piezasFaltantesPorRepartir || '0');
      const cantidad = parseInt(this.formulario.value.cantidad || '0');

      if (piezasFaltantesPorRepartir === 0) {
        return detalle.piezasProducidas;
      }

      const suma = cantidad - piezasFaltantesPorRepartir;

      if (((suma - 1) > suma) && ((suma - 1) >= 0))
        return suma - 1;
      else
        return suma;
    }
    else {
      return 0;
    }
  }
}
