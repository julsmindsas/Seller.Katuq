import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { FormControl, FormGroup, Validators } from '@angular/forms';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { SafeHtml } from '@angular/platform-browser';
import { Detalle, DetallePedido, PedidosParaProduccionEnsamble } from '../../../../shared/models/produccion/Produccion';
import { ServiciosService } from '../../../../shared/services/servicios.service';
import { VentasService } from '../../../../shared/services/ventas/ventas.service';
import { PaymentService } from '../../../../shared/services/ventas/payment.service';
import { Pedido } from '../../../ventas/modelo/pedido';

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
    cantidad: new FormControl('0', [Validators.required, Validators.min(0)]),
    faltante: new FormControl(''),
    resumen: new FormControl(''),
    piezas: new FormControl(''),
    piezasFaltantesPorRepartir: new FormControl('0'),
    totalHistoricoProducido: new FormControl('0')
  });
  htmlModal: SafeHtml | null = null;
  scrollStack: number[] = [];

  constructor(
    private serviciosService: ServiciosService,
    private ventasService: VentasService,
    private paymentService: PaymentService,
    private modalService: NgbModal
  ) { }

  ngOnInit(): void {
    console.log(this.selectedOrdersEnsamble);
    console.log(this.processSelected);
    
    // Ordenar por fecha de entrega - Algoritmo mejorado y más robusto
    this.ordenarPorFechaEntrega();

    this.formulario.controls['faltante'].setValue(this.getCantidadRealmentePendiente().toString());
    this.formulario.controls['piezasFaltantesPorRepartir'].setValue(this.getCantidadRealmentePendiente().toString());
    this.formulario.controls['totalHistoricoProducido'].setValue(this.getTotalHistoricoProducido().toString());
    this.formulario.controls['cantidad'].valueChanges.subscribe((value) => {
      if (value === '' || value === null) {
        this.formulario.controls['resumen'].setValue('');
        this.formulario.controls['faltante'].setValue(this.getCantidadRealmentePendiente().toString());
        return;
      }

      if (value === '0') {
        this.formulario.controls['resumen'].setValue('');
        this.formulario.controls['faltante'].setValue(this.getFaltante().toString());
        return;
      }

      const cantidadIngresada = parseInt(value);

      // Validación adicional para valores negativos
      if (cantidadIngresada < 0) {
        this.formulario.controls['cantidad'].setValue('0');
        this.formulario.controls['resumen'].setValue('No se permiten valores negativos');
        return;
      }

      // Usar la cantidad realmente pendiente en lugar del total general
      const cantidadRealmentePendiente = this.getCantidadRealmentePendiente();
      const totalHistorico = this.getTotalHistoricoProducido();

      if (cantidadIngresada > cantidadRealmentePendiente) {
        this.formulario.controls['cantidad'].setValue(cantidadRealmentePendiente.toString());
        this.formulario.controls['resumen'].setValue(
          `Máximo permitido: ${cantidadRealmentePendiente} piezas (ya se produjeron ${totalHistorico} en total)`
        );
        return;
      }
      
      this.formulario.controls['faltante'].setValue(this.getFaltante().toString());

      // Algoritmo mejorado de distribución
      this.distribuirPiezas(cantidadIngresada, cantidadRealmentePendiente);
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
   * Ordena los pedidos priorizando incompletos y luego por fecha de entrega,
   * manejando casos de fechas nulas, indefinidas o inválidas
   */
  ordenarPorFechaEntrega(): void {
    // Definir una fecha futura lejana para pedidos sin fecha (baja prioridad)
    const fechaFutura = new Date();
    fechaFutura.setFullYear(fechaFutura.getFullYear() + 10);

    this.selectedOrdersEnsamble.forEach(orden => {
      // Ordenar los pedidos dentro de cada orden por estado de completitud y fecha
      orden.detallePedido.sort((a, b) => {
        // Prioridad 1: Estado de completitud (incompletos primero)
        const aCompleto = this.esPedidoCompletoParaArticulo(a);
        const bCompleto = this.esPedidoCompletoParaArticulo(b);

        if (aCompleto && !bCompleto) return 1;  // a completo va después
        if (!aCompleto && bCompleto) return -1; // a incompleto va primero

        // Prioridad 2: Si ambos tienen el mismo estado, ordenar por fecha
        const fechaA = a.fechaEntrega ? new Date(a.fechaEntrega) : fechaFutura;
        const fechaB = b.fechaEntrega ? new Date(b.fechaEntrega) : fechaFutura;

        const tiempoA = !isNaN(fechaA.getTime()) ? fechaA.getTime() : fechaFutura.getTime();
        const tiempoB = !isNaN(fechaB.getTime()) ? fechaB.getTime() : fechaFutura.getTime();

        // Si las fechas son iguales, ordenar por cantidad (menor primero para equilibrar)
        if (tiempoA === tiempoB) {
          return a.cantidadArticulosPorPedido - b.cantidadArticulosPorPedido;
        }

        return tiempoA - tiempoB;
      });
    });

    // También ordenar las órdenes principales por el mismo criterio
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
    // Validar que la cantidad ingresada no sea negativa
    if (cantidadIngresada < 0) {
      cantidadIngresada = 0;
      this.formulario.controls['cantidad'].setValue('0');
    }

    // Validar que cantidadTotal no sea negativa
    if (cantidadTotal < 0) {
      cantidadTotal = 0;
    }

    // Paso 1: Preparar los datos para la distribución
    const pedidosDisponibles: DetallePedido[] = [];
    
    // Aplanar todos los detalles de pedido para trabajar con una única lista
    this.selectedOrdersEnsamble.forEach(orden => {
      orden.detallePedido.forEach(detalle => {
        // Inicializar el proceso y establecer piezas a cero (validar que no sea negativo)
        detalle.proceso = this.processSelected;
        detalle.piezasProducidas = Math.max(0, detalle.piezasProducidas || 0);
        
        // Agregar solo los pedidos con piezas pendientes y que NO estén completos
        if (detalle.cantidadArticulosPorPedido > 0 && !this.esPedidoCompletoParaArticulo(detalle)) {
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
        const asignacion = Math.max(0, Math.min(minimoInicial, detalle.cantidadArticulosPorPedido));
        detalle.piezasProducidas = Math.max(0, asignacion);
        piezasRestantes = Math.max(0, piezasRestantes - asignacion);
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
            
            // Actualizar piezas producidas y restantes (validar que no sean negativos)
            detalle.piezasProducidas = Math.max(0, (detalle.piezasProducidas || 0) + asignacionAdicional);
            piezasRestantes = Math.max(0, piezasRestantes - asignacionAdicional);
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
          const asignacion = Math.max(0, Math.min(piezasRestantes, piezasFaltantes));
          detalle.piezasProducidas = Math.max(0, (detalle.piezasProducidas || 0) + asignacion);
          piezasRestantes = Math.max(0, piezasRestantes - asignacion);
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

  /**
   * Calcula la cantidad que realmente está pendiente de producir,
   * excluyendo los pedidos que ya están completos
   * @returns number - Cantidad total realmente pendiente
   */
  getCantidadRealmentePendiente(): number {
    return this.selectedOrdersEnsamble.reduce((total, orden) => {
      return total + orden.detallePedido.reduce((subtotal, detalle) => {
        // Solo contar si NO está completo
        if (!this.esPedidoCompletoParaArticulo(detalle)) {
          const necesario = detalle.cantidadArticulosPorPedido || 0;
          const producidoHistorico = this.getTotalPiezasProducidasHistoricas(detalle);
          const faltante = Math.max(0, necesario - producidoHistorico);
          return subtotal + faltante;
        }
        return subtotal;
      }, 0);
    }, 0);
  }

  getFaltante() {
    const cantidadIngresada = parseInt(this.formulario.controls['cantidad'].value || '0');
    // Usar la cantidad realmente pendiente (excluyendo pedidos completos)
    const totalRealmentePendiente = this.getCantidadRealmentePendiente();
    return Math.max(0, totalRealmentePendiente - cantidadIngresada);
  }

  onSubmit() {
    console.log(this.formulario.value);
  }

  actualizarPiezasPorRepartir(detalle: DetallePedido) {
    // Validar que piezasProducidas no sea negativo
    if (detalle.piezasProducidas < 0) {
      detalle.piezasProducidas = 0;
    }

    // Asegurar que piezasProducidas tenga un valor válido
    detalle.piezasProducidas = detalle.piezasProducidas || 0;

    // Nueva validación: No permitir más de lo que realmente falta considerando el histórico
    const necesarioTotal = detalle.cantidadArticulosPorPedido || 0;
    const producidoHistorico = this.getTotalPiezasProducidasHistoricas(detalle);
    const realmenteFaltante = Math.max(0, necesarioTotal - producidoHistorico);

    // Si el pedido ya está completo, no permitir añadir más piezas
    if (realmenteFaltante === 0) {
      detalle.piezasProducidas = 0;
    } else if (detalle.piezasProducidas > realmenteFaltante) {
      // No permitir más piezas de las que realmente faltan
      detalle.piezasProducidas = realmenteFaltante;
    }

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
    // Si el pedido está completo, no permitir edición
    if (this.esPedidoCompletoParaArticulo(detalle)) {
      return 0;
    }

    // Calcular cuánto REALMENTE falta para este pedido específico
    const necesarioTotal = detalle.cantidadArticulosPorPedido || 0;
    const producidoHistorico = this.getTotalPiezasProducidasHistoricas(detalle);
    const realmenteFaltante = Math.max(0, necesarioTotal - producidoHistorico);

    // Si no falta nada para este pedido, retornar 0
    if (realmenteFaltante === 0) {
      return 0;
    }

    if (detalle.piezasProducidas !== null && detalle.piezasProducidas !== '' &&
        this.formulario.value.piezasFaltantesPorRepartir !== '' &&
        this.formulario.value.cantidad !== '') {

      const piezasFaltantesPorRepartir = parseInt(this.formulario.value.piezasFaltantesPorRepartir || '0');
      const piezasActuales = Math.max(0, parseInt(detalle.piezasProducidas?.toString() || '0'));

      // El máximo es el menor entre:
      // 1. Lo que realmente falta para completar este pedido
      // 2. Las piezas actuales + las disponibles para repartir
      const maxPermitido = Math.min(
        realmenteFaltante,  // No más de lo que realmente falta
        piezasActuales + piezasFaltantesPorRepartir  // No más de lo disponible
      );

      return Math.max(0, maxPermitido);
    }
    else {
      // Si no hay datos del formulario, el máximo es lo que realmente falta
      return realmenteFaltante;
    }
  }

  /**
   * Abre el PDF del pedido usando la misma lógica del componente de ventas
   * @param nroPedido - Número del pedido a abrir
   */
  async openPdfOrder(nroPedido: string): Promise<void> {
    if (!nroPedido) {
      console.warn('No se puede abrir PDF: número de pedido no válido');
      return;
    }

    try {
      // Usar el método específico para obtener pedido por número
      const response = await this.serviciosService.getOrderByName(nroPedido);
      
      // El servicio devuelve un array, tomamos el primer elemento
      if (response && Array.isArray(response) && response.length > 0) {
        const pedidoEncontrado = response[0];
        // Usar la misma lógica de PDF que el componente de ventas
        this.pdfOrder(pedidoEncontrado);
      } else {
        console.warn('No se encontró el pedido:', nroPedido);
      }
    } catch (error) {
      console.error('Error al buscar el pedido:', error);
    }
  }

  /**
   * Usa la misma lógica de PDF que el componente de ventas/list
   * @param order - Datos del pedido
   */
  pdfOrder(order: Pedido) {
    this.scrollStack.push(window.scrollY);

    // Actualizar el pedido antes de generar PDF (misma lógica que ventas/list)
    const pedidoActualizado = this.actualizarPedidoParaPDF(order);

    // Generar HTML usando PaymentService (misma lógica que ventas/list)
    this.htmlModal = this.paymentService.getHtmlContent(
      pedidoActualizado,
      true // isFromProduction = true
    );

    // Solo mostrar PDF sin actualizar el pedido
    // (comentamos la actualización para evitar errores innecesarios)
    // const now = new Date().toISOString();
    // order.ultimaImpresion = now;
    // this.ventasService.editOrder(order).subscribe({...});

    // Abrir nueva ventana para mostrar el PDF
    const newWindow = window.open('', '_blank', 'width=800,height=600,scrollbars=yes,resizable=yes');
    
    if (newWindow && this.htmlModal) {
      // Convertir SafeHtml a string para escritura en nueva ventana
      const htmlString = (this.htmlModal as any).changingThisBreaksApplicationSecurity || this.htmlModal.toString();
      newWindow.document.write(htmlString);
      newWindow.document.close();
      
      // Solo mostrar el PDF sin auto-imprimir
      // setTimeout(() => {
      //   newWindow.print();
      // }, 500);
    }

    // Limpiar el HTML modal después de usarlo
    setTimeout(() => {
      this.htmlModal = null;
      const last = this.scrollStack.pop();
      if (last !== undefined) {
        window.scrollTo({ top: last });
      }
    }, 1000);
  }

  /**
   * Actualizar pedido antes de generar PDF (misma lógica que ventas/list)
   */
  private actualizarPedidoParaPDF(order: Pedido): Pedido {
    // Clonar el pedido para no modificar el original
    const pedidoActualizado = { ...order };

    console.log('📊 PDF - Pedido actualizado antes de generar:', {
      nroPedido: pedidoActualizado.nroPedido,
      totalPedidoSinDescuento: pedidoActualizado.totalPedidoSinDescuento,
      totalEnvio: pedidoActualizado.totalEnvio,
      totalDescuento: pedidoActualizado.totalDescuento,
      totalPedididoConDescuento: pedidoActualizado.totalPedididoConDescuento
    });

    return pedidoActualizado;
  }

  /**
   * Obtiene la clase CSS para el estado de pago
   * @param estadoPago - Estado del pago del pedido
   * @returns string - Clase CSS correspondiente al estado
   */
  getPaymentStatusClass(estadoPago: string): string {
    if (!estadoPago) return 'payment-status-unknown';

    const estado = estadoPago.toLowerCase().trim();

    switch (estado) {
      case 'pagado':
      case 'paid':
      case 'completado':
        return 'payment-status-paid';
      case 'pendiente':
      case 'pending':
      case 'pendiente de pago':
        return 'payment-status-pending';
      case 'cancelado':
      case 'cancelled':
      case 'cancelado':
        return 'payment-status-cancelled';
      case 'rechazado':
      case 'rejected':
      case 'fallido':
        return 'payment-status-failed';
      case 'parcial':
      case 'partial':
      case 'pago parcial':
        return 'payment-status-partial';
      default:
        return 'payment-status-unknown';
    }
  }

  /**
   * Determina si un artículo está completamente terminado (100% producido)
   * @param articuloEnsamble - Datos del artículo en ensamble
   * @returns boolean - true si el artículo está 100% terminado
   */
  esArticuloCompletamenteTerminado(articuloEnsamble: any): boolean {
    if (!articuloEnsamble || !articuloEnsamble.detallePedido) {
      return false;
    }

    const totalNecesario = articuloEnsamble.cantidadTotalProductoEnsamble || 0;
    if (totalNecesario === 0) {
      return false;
    }

    // Sumar todas las piezas producidas históricamente para este proceso
    const totalProducidoHistorico = articuloEnsamble.detallePedido.reduce((total: number, detalle: any) => {
      if (!detalle.historialPiezasProducidas) {
        return total;
      }

      const piezasDelProceso = detalle.historialPiezasProducidas
        .filter((historial: any) => historial?.proceso === this.processSelected)
        .reduce((acc: number, item: any) => acc + (item?.piezasProducidas || 0), 0);

      return total + piezasDelProceso;
    }, 0);

    return totalProducidoHistorico >= totalNecesario;
  }

  /**
   * Determina si un pedido específico está completo para el artículo actual
   * @param detallePedido - Datos del detalle del pedido
   * @returns boolean - true si el pedido está completo
   */
  esPedidoCompletoParaArticulo(detallePedido: DetallePedido): boolean {
    if (!detallePedido) {
      return false;
    }

    const cantidadNecesaria = detallePedido.cantidadArticulosPorPedido || 0;
    if (cantidadNecesaria === 0) {
      return false;
    }

    // Sumar todas las piezas producidas históricamente para este pedido y proceso
    const totalProducidoHistorico = (detallePedido.historialPiezasProducidas || [])
      .filter(historial => historial?.proceso === this.processSelected)
      .reduce((acc, item) => acc + (item?.piezasProducidas || 0), 0);

    return totalProducidoHistorico >= cantidadNecesaria;
  }

  /**
   * Obtiene el porcentaje de completitud de un pedido específico
   * @param detallePedido - Datos del detalle del pedido
   * @returns number - Porcentaje de 0 a 100
   */
  getPorcentajeCompletitudPedido(detallePedido: DetallePedido): number {
    if (!detallePedido) {
      return 0;
    }

    const cantidadNecesaria = detallePedido.cantidadArticulosPorPedido || 0;
    if (cantidadNecesaria === 0) {
      return 0;
    }

    const totalProducidoHistorico = (detallePedido.historialPiezasProducidas || [])
      .filter(historial => historial?.proceso === this.processSelected)
      .reduce((acc, item) => acc + (item?.piezasProducidas || 0), 0);

    return Math.min(100, Math.round((totalProducidoHistorico / cantidadNecesaria) * 100));
  }

  /**
   * Obtiene el total de piezas producidas históricamente para un pedido específico
   * @param detallePedido - Datos del detalle del pedido
   * @returns number - Total de piezas producidas históricamente
   */
  getTotalPiezasProducidasHistoricas(detallePedido: DetallePedido): number {
    if (!detallePedido) {
      return 0;
    }

    return (detallePedido.historialPiezasProducidas || [])
      .filter(historial => historial?.proceso === this.processSelected)
      .reduce((acc, item) => acc + (item?.piezasProducidas || 0), 0);
  }

  /**
   * Obtiene la fecha de la última producción para un pedido específico
   * @param detallePedido - Datos del detalle del pedido
   * @returns string - Fecha de la última producción o cadena vacía si no hay historial
   */
  getFechaUltimaProduccion(detallePedido: DetallePedido): string {
    if (!detallePedido || !detallePedido.historialPiezasProducidas) {
      return '';
    }

    const historialDelProceso = detallePedido.historialPiezasProducidas
      .filter(historial => historial?.proceso === this.processSelected)
      .sort((a, b) => {
        const fechaA = new Date(a.fecha || 0).getTime();
        const fechaB = new Date(b.fecha || 0).getTime();
        return fechaB - fechaA; // Más reciente primero
      });

    return historialDelProceso.length > 0 ? historialDelProceso[0].fecha : '';
  }

  /**
   * Obtiene el responsable de la última producción para un pedido específico
   * @param detallePedido - Datos del detalle del pedido
   * @returns string - Nombre del responsable o cadena vacía si no hay historial
   */
  getResponsableUltimaProduccion(detallePedido: DetallePedido): string {
    if (!detallePedido || !detallePedido.historialPiezasProducidas) {
      return '';
    }

    const historialDelProceso = detallePedido.historialPiezasProducidas
      .filter(historial => historial?.proceso === this.processSelected)
      .sort((a, b) => {
        const fechaA = new Date(a.fecha || 0).getTime();
        const fechaB = new Date(b.fecha || 0).getTime();
        return fechaB - fechaA; // Más reciente primero
      });

    if (historialDelProceso.length > 0 && historialDelProceso[0].personaResponsable) {
      return historialDelProceso[0].personaResponsable.name ||
             historialDelProceso[0].personaResponsable.email ||
             'Usuario no identificado';
    }

    return '';
  }

  /**
   * Verifica si todos los pedidos están completamente terminados
   * @returns boolean - true si todos los pedidos están 100% completos
   */
  todosPedidosEstanCompletos(): boolean {
    if (!this.selectedOrdersEnsamble || this.selectedOrdersEnsamble.length === 0) {
      return false;
    }

    // Verificar que TODOS los detalles de pedido estén completos
    return this.selectedOrdersEnsamble.every(orden =>
      orden.detallePedido.every(detalle => this.esPedidoCompletoParaArticulo(detalle))
    );
  }

  /**
   * Verifica si hay al menos un pedido incompleto
   * @returns boolean - true si hay pedidos pendientes de completar
   */
  hayPedidosIncompletos(): boolean {
    return !this.todosPedidosEstanCompletos();
  }
}
