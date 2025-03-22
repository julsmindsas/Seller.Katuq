import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { FormControl, FormGroup } from '@angular/forms';
import { Detalle, DetallePedido, PedidosParaProduccionEnsamble } from 'src/app/shared/models/produccion/Produccion';

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

      if (parseInt(value) > this.getCantidadTotalProductoEnsamble()) {
        this.formulario.controls['faltante'].setValue(this.getCantidadTotalProductoEnsamble().toString());
        this.formulario.controls['resumen'].setValue('La cantidad ingresada es mayor a la cantidad total de piezas a producir');
        return;
      }
      this.formulario.controls['faltante'].setValue(this.getFaltante().toString());

      //hacer algoritmo para repartir las piezas en los pedidos seleccionados a cada pedido
      let cantidadIngresada = parseInt(value);
      let cantidadTotal = this.getCantidadTotalProductoEnsamble();
      let piezas = cantidadIngresada;
      let totalPedidos = this.selectedOrdersEnsamble.reduce((acc, item) => acc + item.detallePedido.filter(p => p.piezasPorRepartir != 0).length, 0);
      let piezasPorPedido = Math.floor(piezas / totalPedidos);

      

      //piezas faltantes por repartir
      let piezasFaltantes = piezas % totalPedidos;
      if (cantidadIngresada > 0 && cantidadTotal === cantidadIngresada) {
        piezasFaltantes = 0;
      }


      this.selectedOrdersEnsamble.forEach((item, index) => {
        item.detallePedido.sort((a, b) => a.cantidadArticulosPorPedido - b.cantidadArticulosPorPedido)
          .forEach((detalle) => {
            detalle.proceso = this.processSelected;
            if (cantidadIngresada > 0 && cantidadTotal === cantidadIngresada) {
              piezasPorPedido = detalle.cantidadArticulosPorPedido;;
            }
            if (detalle.piezasPorRepartir === 0) {
              return;
            }
            if (piezas > 0) {
              let cantidad = detalle.cantidad;
              let piezasAsignadas = detalle.piezasProducidas || 0;
              if (typeof piezasAsignadas === 'number' || piezasAsignadas === '') {
                if (detalle.cantidadArticulosPorPedido >= piezasPorPedido) {
                  detalle.piezasProducidas = piezasPorPedido;
                  piezas -= piezasPorPedido;
                }
                else if (detalle.cantidadArticulosPorPedido <= piezasPorPedido) {
                  if (piezas >= detalle.cantidadArticulosPorPedido) {
                    detalle.piezasProducidas = detalle.cantidadArticulosPorPedido;
                    piezas -= detalle.cantidadArticulosPorPedido;

                  } else {
                    detalle.piezasProducidas = piezas;
                    piezas = 0;
                  }
                }

                this.actualizarPiezasPorRepartir(detalle);
              }
            }
          });
      });

      if (piezas > 0) {
        piezasFaltantes += piezas;
      }
      if (piezasFaltantes < 0) {
        piezasFaltantes = cantidadIngresada;
      }
      this.formulario.controls['piezasFaltantesPorRepartir'].setValue(piezasFaltantes.toString());
    });
  }

  getTotalHistoricoProducido() {
    const total = this.selectedOrdersEnsamble.reduce((acc1, item) => {
      return acc1 + item.detallePedido?.reduce((acc2, item2) => {
        return acc2 + item2.historialPiezasProducidas?.filter(p => p.proceso == this.processSelected).reduce((acc3, item3) => acc3 + item3.piezasProducidas, 0) || 0;
      }, 0);
    }, 0) || 0;
    return total;

  }

  getCantidadTotalProductoEnsamble() {
    return this.selectedOrdersEnsamble.reduce((acc, item) => acc + item.cantidadTotalProductoEnsamble, 0);
  }

  getFaltante() {
    return (this.getCantidadTotalProductoEnsamble() - this.getTotalHistoricoProducido()) - parseInt(this.formulario.controls['cantidad'].value);
  }

  onSubmit() {
    console.log(this.formulario.value);
  }

  actualizarPiezasPorRepartir(detalle: DetallePedido) {
    // Asumiendo que 'cantidad' es el total de piezas a producir
    detalle.piezasPorRepartir = detalle.cantidadArticulosPorPedido - detalle.piezasProducidas;


    // Asegurándonos de que las piezas por repartir no sean negativas
    if (detalle.piezasPorRepartir < 0) {
      detalle.piezasPorRepartir = 0;
    }

    // validar que si la suma de todas las piezas producidas sea igual a la cantidad total de piezas a producir
    this.totalPiezasProducidasSumadas = this.selectedOrdersEnsamble.reduce((acc, item) => {
      return acc + item.detallePedido.reduce((acc, item) => acc + item.piezasProducidas, 0);
    }, 0);
    if (this.totalPiezasProducidasSumadas === this.getCantidadTotalProductoEnsamble()) {
      this.formulario.controls['resumen'].setValue('La suma de todas las piezas producidas es igual a la cantidad total de piezas a producir');
    } else {
      this.formulario.controls['resumen'].setValue('La suma de todas las piezas producidas no es igual a la cantidad total de piezas a producir');
    }

    console.log('piezasRepartidas', detalle)
  }

  getMaxActualizarPiezasPorRepartir(detalle: any) {

    if (detalle.piezasProducidas !== null && detalle.piezasProducidas !== '' && this.formulario.value.piezasFaltantesPorRepartir !== '' && this.formulario.value.cantidad !== '') {

      if (parseInt(this.formulario.value.piezasFaltantesPorRepartir) === 0) {
        return detalle.piezasProducidas;
      }

      // const suma = detalle.piezasProducidas + parseInt(this.formulario.value.piezasFaltantesPorRepartir);
      const suma = parseInt(this.formulario.value.cantidad) - parseInt(this.formulario.value.piezasFaltantesPorRepartir);

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
