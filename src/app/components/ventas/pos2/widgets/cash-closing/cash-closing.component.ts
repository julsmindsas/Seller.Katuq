import { Component } from '@angular/core';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { VentasService } from '../../../../../shared/services/ventas/ventas.service';
import Swal from 'sweetalert2';
import { Pedido } from '../../../modelo/pedido';
import { ReporteCierreComponent } from './reporte-cierre/reporte-cierre.component';

interface CierreData {
  efectivoInicial: number;
  efectivoFinal: number;
  observaciones: string;
}

interface FormaPago {
  nombre: string;
  total: number;
}

interface ProductoVenta {
  nombre: string;
  cantidad: number;
  precioUnitario: number;
  total: number;
  numeroPedido: string;
}

function hoyLocal(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

@Component({
  selector: 'app-cash-closing',
  templateUrl: './cash-closing.component.html',
  styleUrls: ['./cash-closing.component.scss']
})
export class CashClosingComponent {
  // Fecha LOCAL de hoy: toISOString() da la fecha UTC y desde las 7 p. m. de
  // Colombia ya marcaba el día siguiente (el cierre salía "sin ventas").
  fechaCierre: string = hoyLocal();
  fechaFin: string = hoyLocal();
  efectivoInicial: number = 0;
  efectivoFinal: number = 0;
  observaciones: string = '';
  formasPago: FormaPago[] = [];
  productosVendidos: ProductoVenta[] = [];
  pedidos: Pedido[] = [];
  informe: any = {
    totalVentas: 0,
    diferencia: 0,
    totalProductos: 0
  };
  mostrarBotonCompletar: boolean = false;
  cierreFinalizado: boolean = false;
  empresa: string = '';

  /**
   * D-583: ventas de días anteriores que quedaron sin cerrar (por ejemplo, una venta
   * hecha después del cierre de ayer). Van APARTE: no suman a las ventas del período,
   * pero su efectivo está en la caja y cuenta para la diferencia.
   */
  pedidosAnteriores: Pedido[] = [];
  formasPagoAnteriores: FormaPago[] = [];
  totalAnteriores: number = 0;

  /**
   * D-585: se puede cerrar varias veces el mismo día (turnos). `turno` es el número
   * de este cierre en su fecha; el saldo inicial se sugiere con el saldo final del
   * cierre anterior de ese día (lo que quedó en la caja), y la cajera lo puede cambiar.
   */
  turno: number = 1;
  saldoInicialSugerido: boolean = false;

  constructor(
    private ventasService: VentasService,
    public modal: NgbModal
  ) {
    const companyData = localStorage.getItem("currentCompany");
    if (companyData) {
      const company = JSON.parse(companyData);
      this.empresa = company.nomComercial || '';
    }
  }

  /** Ventas por forma de pago. Agrupa sin importar mayúsculas ("Efectivo" = "efectivo"). */
  private agruparFormasPago(ventas: Pedido[]): FormaPago[] {
    const grupos: { [clave: string]: FormaPago } = {};
    for (const venta of ventas) {
      const nombre = (venta.formaDePago || '').trim() || 'Sin especificar';
      const clave = nombre.toLowerCase();
      if (!grupos[clave]) grupos[clave] = { nombre, total: 0 };
      grupos[clave].total += Number(venta.totalPedididoConDescuento) || 0;
    }
    return Object.values(grupos);
  }

  calcularInforme() {
    // D-583: el backend decide qué entra (día de 12 a. m. a 11:59 p. m. hora Colombia
    // y, aparte, las ventas de días anteriores sin cerrar). Es la misma selección del cierre.
    this.ventasService.previsualizarCierreCaja({
      fechaCierre: this.fechaCierre,
      fechaFin: this.fechaFin,
      company: this.empresa
    }).subscribe(
      (respuesta: any) => {
        this.turno = Number(respuesta?.turno) || 1;
        // D-585: segundo cierre del día → arranca con lo que quedó en la caja en el anterior.
        const saldoAnterior = respuesta?.saldoFinalAnterior;
        this.saldoInicialSugerido = saldoAnterior !== null && saldoAnterior !== undefined && !this.efectivoInicial;
        if (this.saldoInicialSugerido) this.efectivoInicial = Number(saldoAnterior) || 0;

        const ventas: Pedido[] = respuesta?.delPeriodo || [];
        const anteriores: Pedido[] = respuesta?.anteriores || [];
        this.pedidosAnteriores = anteriores;
        this.formasPagoAnteriores = this.agruparFormasPago(anteriores);
        this.totalAnteriores = this.formasPagoAnteriores.reduce((sum, fp) => sum + fp.total, 0);

        if (ventas.length > 0 || anteriores.length > 0) {
          this.pedidos = ventas;
          this.formasPago = this.agruparFormasPago(ventas);

          // Procesar productos vendidos
          this.productosVendidos = ventas.reduce((acc: ProductoVenta[], pedido) => {
            if (pedido.carrito) {
              pedido.carrito.forEach(item => {
                if (item.producto && item.cantidad) {
                  acc.push({
                    nombre: item.producto.crearProducto?.titulo || 'Producto sin nombre',
                    cantidad: item.cantidad,
                    precioUnitario: (item.producto.precio?.precioUnitarioConIva || 0),
                    total: (item.producto.precio?.precioUnitarioConIva || 0) * item.cantidad,
                    numeroPedido: pedido.nroPedido || 'Sin número'
                  });
                }
              });
            }
            return acc;
          }, []);

          // Calcular totales
          this.informe.totalVentas = this.formasPago.reduce((sum, fp) => sum + fp.total, 0);
          this.informe.totalProductos = this.productosVendidos.reduce((sum, p) => sum + p.cantidad, 0);
          this.mostrarBotonCompletar = true;
        } else {
          // No es un error: no hubo ventas, o todas ya quedaron en cierres de ese día.
          const yaCerradas = (Number(respuesta?.cierresDelDia) || 0) > 0;
          Swal.fire({
            title: yaCerradas ? 'No hay ventas pendientes' : 'Sin ventas',
            text: yaCerradas
              ? `Todas las ventas de esta fecha ya quedaron en ${respuesta.cierresDelDia === 1 ? 'el cierre que hiciste' : 'los ' + respuesta.cierresDelDia + ' cierres que hiciste'}. Si vendes algo más, vuelve aquí y haz otro cierre.`
              : 'No se encontraron ventas en el período seleccionado',
            icon: 'info',
            confirmButtonColor: '#5F3FE0'
          });
          this.saldoInicialSugerido = false;
        }
      },
      (error) => {
        Swal.fire({
          title: 'Error',
          text: 'Error al obtener las ventas del período',
          icon: 'error'
        });
      }
    );
  }

  /**
   * D-706: la plata de la caja se cuenta en pesos enteros. La casilla aceptaba centavos y la
   * rueda del mouse o las flechas la movían de a 1 centavo (96.000 → 95.999,99) sin que se notara.
   */
  pesosEnteros(valor: any): any {
    // Casilla vacía: se deja vacía (no se vuelve 0) para que siga pidiendo el dato.
    if (valor === null || valor === undefined || valor === '') return valor;
    const n = Number(valor);
    return Number.isFinite(n) ? Math.round(n) : 0;
  }

  /** D-586: sobra o falta plata (diferencia distinta de $0). */
  get hayDescuadre(): boolean {
    return Math.abs(this.efectivoFinal - (this.efectivoInicial + this.totalEfectivo + this.efectivoAnteriores)) >= 0.01;
  }

  /** Correo de quien está cerrando (para el aviso de descuadre). */
  get usuarioActual(): string {
    try {
      return JSON.parse(localStorage.getItem('user') || '{}').email || '';
    } catch {
      return '';
    }
  }

  private pesos(valor: number): string {
    return (Number(valor) || 0).toLocaleString('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 });
  }

  /** Hay algo que cerrar: ventas del período o de días anteriores. */
  get hayVentas(): boolean {
    return this.pedidos.length > 0 || this.pedidosAnteriores.length > 0;
  }

  /**
   * Días de las ventas sin cerrar que entran en este cierre:
   * "03/11/2026", "01/11/2026 y 03/11/2026" o "01/11/2026, 02/11/2026 y 03/11/2026".
   */
  get fechasAnteriores(): string {
    const dias = this.pedidosAnteriores
      .map((p) => {
        const d = new Date((p as any).fechaCreacion);
        return isNaN(d.getTime()) ? '' : d.toLocaleDateString('es-CO', { day: '2-digit', month: '2-digit', year: 'numeric' });
      })
      .filter(Boolean);
    const unicos = Array.from(new Set(dias)).sort((a, b) => a.split('/').reverse().join('').localeCompare(b.split('/').reverse().join('')));
    if (unicos.length <= 1) return unicos[0] || '';
    return unicos.slice(0, -1).join(', ') + ' y ' + unicos[unicos.length - 1];
  }

  /** Efectivo de las ventas de días anteriores que entran en este cierre. */
  get efectivoAnteriores(): number {
    return this.formasPagoAnteriores.find(fp => (fp.nombre || '').toLowerCase() === 'efectivo')?.total || 0;
  }

  /**
   * Contado − (saldo inicial + efectivo del período + efectivo de días anteriores).
   * D-583: el efectivo de días anteriores está en la caja, así que cuenta aquí
   * (el backend guarda la misma cuenta en `diferenciaEfectivo`).
   */
  calcularDiferencia(): number {
    this.informe.diferencia = this.efectivoFinal - (this.efectivoInicial + this.totalEfectivo + this.efectivoAnteriores);
    return this.informe.diferencia;
  }


  calcularTotalProductos(): number {
    return this.productosVendidos.reduce((sum, p) => sum + p.total, 0);
  }

  /**
   * Abre el modal de reporte para imprimir
   */
  imprimir(): void {
    this.abrirModalReporte();
  }

  /**
   * Abre el modal de reporte en modo POS
   */
  imprimirPOS(): void {
    this.abrirModalReporte(true);
  }

  /**
   * Abre el modal del reporte de cierre
   */
  private abrirModalReporte(modoPos: boolean = false): void {
    const datosCierre = {
      fechaCierre: this.fechaCierre,
      fechaFin: this.fechaFin,
      efectivoInicial: this.efectivoInicial,
      efectivoFinal: this.efectivoFinal,
      observaciones: this.observaciones,
      formasPago: this.formasPago,
      productosVendidos: this.productosVendidos,
      informe: this.informe,
      empresa: this.empresa,
      formasPagoAnteriores: this.formasPagoAnteriores,
      totalAnteriores: this.totalAnteriores,
      turno: this.turno,
      pedidosAnteriores: this.pedidosAnteriores.map(p => ({
        nroPedido: p.nroPedido || 'Sin número',
        fechaCreacion: (p as any).fechaCreacion || '',
        formaDePago: p.formaDePago || 'Sin especificar',
        total: Number(p.totalPedididoConDescuento) || 0
      }))
    };

    const modalRef = this.modal.open(ReporteCierreComponent, {
      centered: true,
      size: 'xl',
      backdrop: 'static',
      keyboard: false
    });

    modalRef.componentInstance.datosCierre = datosCierre;

    // Si es modo POS, aplicar estilos específicos
    if (modoPos) {
      modalRef.componentInstance.ngAfterViewInit = () => {
        document.body.classList.add('pos-print-mode');
        setTimeout(() => {
          window.print();
          setTimeout(() => {
            document.body.classList.remove('pos-print-mode');
          }, 1000);
        }, 500);
      };
    }
  }

  /**
   * Obtiene la fecha y hora actual formateada para el reporte
   */
  fechaHoraReporte(): string {
    const ahora = new Date();
    return ahora.toLocaleDateString('es-ES', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  }

  /**
   * Obtiene el total de ventas en efectivo
   */
  get totalEfectivo(): number {
    return this.formasPago.find(fp => (fp.nombre || '').toLowerCase() === 'efectivo')?.total || 0;
  }

  /**
   * Obtiene el resumen del período
   */
  get resumenPeriodo(): string {
    const inicio = this.fechaFormateada(this.fechaCierre);
    const fin = this.fechaFormateada(this.fechaFin);
    return inicio === fin ? inicio : `${inicio} al ${fin}`;
  }

  fechaFormateada(fecha: string): string {
    if (!fecha) return '';

    // "2026-11-02" con new Date() es medianoche UTC: en Colombia salía 01/11.
    const partes = /^(\d{4})-(\d{2})-(\d{2})/.exec(fecha);
    const fechaObj = partes ? new Date(+partes[1], +partes[2] - 1, +partes[3]) : new Date(fecha);
    return fechaObj.toLocaleDateString('es-ES', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  }

  fechaActualFormateada(): string {
    const hoy = new Date();
    return hoy.toLocaleDateString('es-ES', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  completarCierre() {
    if (!this.efectivoFinal) {
      Swal.fire({
        title: 'Error',
        text: 'Debe ingresar el saldo final',
        icon: 'error'
      });
      return;
    }

    // D-706: los saldos se cuentan en pesos enteros (sin centavos).
    this.efectivoInicial = this.pesosEnteros(this.efectivoInicial);
    this.efectivoFinal = this.pesosEnteros(this.efectivoFinal);

    // Calcular diferencia
    const diferencia = this.calcularDiferencia();

    // D-586: con descuadre se puede cerrar, pero hay que explicar qué pasó.
    if (this.hayDescuadre && !(this.observaciones || '').trim()) {
      Swal.fire({
        title: 'Explica la diferencia',
        html: `En la caja <strong>${diferencia < 0 ? 'faltan' : 'sobran'} ${this.pesos(Math.abs(diferencia))}</strong>.<br><br>`
          + 'Escribe en <strong>Observaciones</strong> qué pasó (por ejemplo: "di mal un vuelto") y vuelve a dar '
          + '<strong>Completar Cierre</strong>.',
        icon: 'warning',
        confirmButtonColor: '#5F3FE0'
      });
      return;
    }
    const avisoDescuadre = this.hayDescuadre
      ? '<div style="margin:0 0 12px 0; padding:10px 12px; border-radius:11px; background:#FDECEC; color:#B42318; text-align:left">'
        + `⚠️ Este cierre tiene un <strong>${diferencia < 0 ? 'FALTANTE' : 'SOBRANTE'} de ${this.pesos(Math.abs(diferencia))}</strong>. `
        + `Quedará registrado a nombre de <strong>${this.usuarioActual || 'quien cierra'}</strong>.</div>`
      : '';

    // D-583/D-585: que quede claro qué pasa con lo que se venda después de cerrar.
    const dia = this.fechaFormateada(this.fechaFin);
    const avisoAnteriores = this.pedidosAnteriores.length > 0
      ? `<br><br>Este cierre también recoge <strong>${this.pedidosAnteriores.length} venta(s) de días anteriores</strong> `
        + `que habían quedado sin cerrar, por <strong>${this.totalAnteriores.toLocaleString('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 })}</strong>. `
        + 'Se muestran aparte y no suman a las ventas de este período.'
      : '';
    Swal.fire({
      title: this.turno > 1 ? `¿Hacer el cierre ${this.turno} del día?` : '¿Cerrar la caja?',
      html: avisoDescuadre
        + '<div style="text-align:left">'
        + 'Este cierre incluye las ventas hechas <strong>hasta ahora</strong>.<br><br>'
        + `<strong>Si después vendes algo más el ${dia}:</strong>`
        + '<ol style="margin:8px 0 0 0; padding-left:20px">'
        + '<li>Vuelve a <strong>Cierre de Caja</strong>.</li>'
        + '<li>Dale <strong>Calcular Resumen</strong>: solo te mostrará las ventas nuevas.</li>'
        + `<li>Completa ese cierre (será el <strong>cierre ${this.turno + 1} del día</strong>).</li>`
        + '</ol>'
        + '<br>Así la plata de cada venta cuadra el mismo día.'
        + avisoAnteriores
        + '</div>',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Sí, cerrar la caja',
      cancelButtonText: 'Volver',
      confirmButtonColor: '#5F3FE0',
      reverseButtons: true
    }).then((confirmacion) => {
      if (confirmacion.isConfirmed) this.guardarCierre();
    });
  }

  private guardarCierre() {
    const cierreDataToSave = {
      fechaCierre: this.fechaCierre,
      fechaFin: this.fechaFin,
      efectivoInicial: this.efectivoInicial,
      efectivoFinal: this.efectivoFinal,
      observaciones: this.observaciones,
      informe: {
        ...this.informe,
        formasPago: this.formasPago,
        productosVendidos: this.productosVendidos
      },
      company: this.empresa
    };

    this.ventasService.realizarCierreCaja(cierreDataToSave).subscribe(
      (response) => {
        this.cierreFinalizado = true;
        this.turno = Number(response?.turno) || this.turno;

        Swal.fire({
          title: 'Cierre de Caja Exitoso',
          text: this.turno > 1
            ? `Quedó registrado el cierre ${this.turno} del ${this.fechaFormateada(this.fechaFin)}.`
            : 'El cierre de caja se ha realizado exitosamente',
          icon: 'success',
          showConfirmButton: true,
          confirmButtonText: 'Imprimir',
          showDenyButton: true,
          denyButtonText: 'Imprimir POS',
          showCancelButton: true,
          cancelButtonText: 'Cerrar'
        }).then((result) => {
          if (result.isConfirmed) {
            this.imprimir();
          } else if (result.isDenied) {
            this.imprimirPOS();
          }
          // No cerrar el modal principal automáticamente, 
          // dejar que el usuario decida desde el reporte
        });
      },
      (error) => {
        // D-585: 409 = otro cierre (doble clic u otra caja) ya tomó esas ventas.
        const status = error?.status;
        Swal.fire({
          title: status === 409 ? 'Otro cierre se adelantó'
            : status === 404 ? 'No hay ventas pendientes'
            : error?.error?.observacionObligatoria ? 'Explica la diferencia' : 'Error',
          text: status === 409
            ? 'Algunas de estas ventas ya quedaron en otro cierre. Vuelve a calcular el resumen.'
            : status === 404
              ? 'Todas las ventas ya quedaron cerradas.'
              : error?.error?.observacionObligatoria
                ? 'El cierre tiene diferencia: escribe en Observaciones qué pasó.'
                : 'Error al realizar el cierre de caja',
          icon: status === 409 || status === 404 ? 'info' : error?.error?.observacionObligatoria ? 'warning' : 'error',
          confirmButtonColor: '#5F3FE0'
        });
      }
    );
  }
} 