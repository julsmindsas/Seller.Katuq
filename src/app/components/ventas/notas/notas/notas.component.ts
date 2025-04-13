import { AfterContentInit, OnChanges, SimpleChanges, Component, Input, OnInit, Output } from '@angular/core';
import { FormGroup, FormBuilder, Validators, FormArray } from '@angular/forms';
import { CartSingletonService } from '../../../../shared/services/ventas/cart.singleton.service';
import { Notas, Pedido, EstadoProceso, EstadoPago } from '../../modelo/pedido';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-notas',
  templateUrl: './notas.component.html',
  styleUrls: ['./notas.component.scss']
})
export class NotasComponent implements OnInit, AfterContentInit, OnChanges {
  @Input() pedido: Pedido;
  @Input() carrito: any;
  @Input() isEdit: boolean = false;
  fecha: Date
  notasCliente: any[] = [];
  notasDespachos: any[] = [];
  notasEntregas: any[] = [];
  notasFacturacionPagos: any[] = [];
  notasClienteForm: FormGroup;
  notasDespachoForm: FormGroup;
  notasEntregasForm: FormGroup;
  notasFacturacionPagosForm: FormGroup;
  bandera: boolean = true;
  notasClienteOrdenadas: Notas[];
  notasDespachosOrdenadas: Notas[];
  notasEntregasOrdenadas: Notas[];
  notasFacturacionPagosOrdenadas: Notas[];

  constructor(
    private singleton: CartSingletonService, 
    private formBuilder: FormBuilder, 
    private modalService: NgbModal
  ) {}

  ngAfterContentInit(): void {
    // Inicializar notas ordenadas
    this.notasClienteOrdenadas = this.ordenarNotas(this.pedido?.notasPedido?.notasCliente || []);
    this.notasDespachosOrdenadas = this.ordenarNotas(this.pedido?.notasPedido?.notasDespachos || []);
    this.notasEntregasOrdenadas = this.ordenarNotas(this.pedido?.notasPedido?.notasEntregas || []);
    this.notasFacturacionPagosOrdenadas = this.ordenarNotas(this.pedido?.notasPedido?.notasFacturacionPagos || []);

    // Inicializar estructura de notas si no existe
    if (!this.pedido) {
      this.pedido = {
        referencia: '',
        notasPedido: {
          notasProduccion: [],
          notasCliente: [],
          notasDespachos: [],
          notasEntregas: [],
          notasFacturacionPagos: []
        },
        estadoProceso: EstadoProceso.SinProducir,
        estadoPago: EstadoPago.Pendiente
      };
    }

    if (!this.pedido.notasPedido) {
      this.pedido.notasPedido = {
        notasProduccion: [],
        notasCliente: [],
        notasDespachos: [],
        notasEntregas: [],
        notasFacturacionPagos: []
      };
    }
  }

  ngOnInit(): void {
    this.fecha = new Date();

    // Inicializar formularios
    this.notasClienteForm = this.formBuilder.group({
      nota: ['', Validators.required]
    });

    this.notasDespachoForm = this.formBuilder.group({
      nota: ['', Validators.required]
    });

    this.notasEntregasForm = this.formBuilder.group({
      nota: ['', Validators.required]
    });

    this.notasFacturacionPagosForm = this.formBuilder.group({
      nota: ['', Validators.required]
    });
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes.carrito) {
      this.singleton.refreshCart().subscribe((data: any) => {
        this.pedido.carrito = data;
      });
    }
  }

  // Método para ordenar notas de más reciente a menos reciente
  private ordenarNotas(notas: Notas[]): Notas[] {
    return [...notas].sort((a, b) => {
      const fechaA = a.fecha ? new Date(a.fecha).getTime() : 0;
      const fechaB = b.fecha ? new Date(b.fecha).getTime() : 0;
      return fechaB - fechaA;
    });
  }

  onSubmitCliente() {
    if (!this.pedido.notasPedido) {
      this.pedido.notasPedido = {
        notasProduccion: [],
        notasCliente: [],
        notasDespachos: [],
        notasEntregas: [],
        notasFacturacionPagos: []
      };
    }

    const nota = this.notasClienteForm.value;
    nota.fecha = new Date().toISOString();
    this.pedido.notasPedido.notasCliente.unshift(nota);

    this.notasClienteForm.reset();
  }

  onSubmitDespachos() {
    if (!this.pedido.notasPedido) {
      this.pedido.notasPedido = {
        notasProduccion: [],
        notasCliente: [],
        notasDespachos: [],
        notasEntregas: [],
        notasFacturacionPagos: []
      };
    }

    const notaDespachos = this.notasDespachoForm.value;
    notaDespachos.fecha = new Date().toISOString();
    this.notasDespachos.unshift(notaDespachos);
    this.pedido.notasPedido.notasDespachos = this.notasDespachos as Notas[];
    this.notasDespachoForm.reset();
  }

  onSubmitEntregas() {
    if (!this.pedido.notasPedido) {
      this.pedido.notasPedido = {
        notasProduccion: [],
        notasCliente: [],
        notasDespachos: [],
        notasEntregas: [],
        notasFacturacionPagos: []
      };
    }

    const notaEntrega = this.notasEntregasForm.value;
    notaEntrega.fecha = new Date().toISOString();
    this.notasEntregas.unshift(notaEntrega);
    this.pedido.notasPedido.notasEntregas = this.notasEntregas as Notas[];
    this.notasEntregasForm.reset();
  }

  onSubmitFacturacionPagos() {
    if (!this.pedido.notasPedido) {
      this.pedido.notasPedido = {
        notasProduccion: [],
        notasCliente: [],
        notasDespachos: [],
        notasEntregas: [],
        notasFacturacionPagos: []
      };
    }

    const notaFacturacionPagos = this.notasFacturacionPagosForm.value;
    notaFacturacionPagos.fecha = new Date().toISOString();
    this.notasFacturacionPagos.unshift(notaFacturacionPagos);
    this.pedido.notasPedido.notasFacturacionPagos = this.notasFacturacionPagos as Notas[];
    this.notasFacturacionPagosForm.reset();
  }

  eliminarNota(index: number, tipo: string) {
    if (!this.pedido.notasPedido) {
      this.pedido.notasPedido = {
        notasProduccion: [],
        notasCliente: [],
        notasDespachos: [],
        notasEntregas: [],
        notasFacturacionPagos: []
      };
    }

    switch (tipo) {
      case 'cliente':
        this.pedido.notasPedido.notasCliente.splice(index, 1);
        break;
      case 'despachos':
        this.pedido.notasPedido.notasDespachos.splice(index, 1);
        break;
      case 'entregas':
        this.pedido.notasPedido.notasEntregas.splice(index, 1);
        break;
      case 'facturacionPagos':
        this.pedido.notasPedido.notasFacturacionPagos.splice(index, 1);
        break;
    }
  }
}
