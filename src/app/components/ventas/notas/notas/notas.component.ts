import { AfterContentInit, OnChanges, SimpleChanges, Component, Input, OnInit, Output } from '@angular/core';
import { FormGroup, FormBuilder, Validators, FormArray } from '@angular/forms';
import { CartSingletonService } from '../../../../shared/services/ventas/cart.singleton.service';
import { Notas, Pedido } from '../../modelo/pedido';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { After } from 'v8';
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
  notasProduccion: any[] = [];
  notasCliente: any[] = [];
  notasDespachos: any[] = [];
  notasEntregas: any[] = [];
  notasFacturacionPagos: any[] = [];
  notasProduccionForm: FormGroup;
  notasClienteForm: FormGroup;
  notasDespachoForm: FormGroup;
  notasEntregasForm: FormGroup;
  notasFacturacionPagosForm: FormGroup;
  bandera: boolean = true;
  notasClienteOrdenadas: Notas[];
  notasDespachosOrdenadas: Notas[];
  notasEntregasOrdenadas: Notas[];
  notasFacturacionPagosOrdenadas: Notas[];
  constructor(private singleton: CartSingletonService, private formBuilder: FormBuilder, private modalService: NgbModal) {
    localStorage.getItem('carrito')

  }
  ngAfterContentInit(): void {
    if (!this.pedido?.notasPedido && !this.pedido?.notasPedido?.notasCliente && !this.pedido?.notasPedido?.notasDespachos && !this.pedido?.notasPedido?.notasEntregas && !this.pedido?.notasPedido?.notasFacturacionPagos) {
      this.pedido.notasPedido = {
        notasProduccion: [],
        notasCliente: [],
        notasDespachos: [],
        notasEntregas: [],
        notasFacturacionPagos: []
      }

    }
    this.notasClienteOrdenadas = [...this.pedido?.notasPedido?.notasCliente].sort((a, b) => {
      // Ordenar de más reciente a menos reciente
      return new Date(b.fecha).getTime() - new Date(a.fecha).getTime();
    });
    this.notasDespachosOrdenadas = [...this.pedido?.notasPedido?.notasDespachos].sort((a, b) => {
      // Ordenar de más reciente a menos reciente
      return new Date(b.fecha).getTime() - new Date(a.fecha).getTime();
    });
    this.notasEntregasOrdenadas = [...this.pedido?.notasPedido?.notasEntregas].sort((a, b) => {
      // Ordenar de más reciente a menos reciente
      return new Date(b.fecha).getTime() - new Date(a.fecha).getTime();
    });
    this.notasFacturacionPagosOrdenadas = [...this.pedido?.notasPedido?.notasFacturacionPagos].sort((a, b) => {
      // Ordenar de más reciente a menos reciente
      return new Date(b.fecha).getTime() - new Date(a.fecha).getTime();
    });

    if (this.isEdit) {
      this.notasProduccion = this.pedido.notasPedido.notasProduccion;
      this.notasCliente = this.pedido.notasPedido.notasCliente;
      this.notasDespachos = this.pedido.notasPedido.notasDespachos;
      this.notasEntregas = this.pedido.notasPedido.notasEntregas;
      this.notasFacturacionPagos = this.pedido.notasPedido.notasFacturacionPagos;
    }
  }

  ngOnInit(): void {

    this.fecha = new Date();
    this.notasProduccionForm = this.formBuilder.group({
      productos: this.formBuilder.array(this.pedido.carrito.map(prod => this.formBuilder.group({
        notas: this.formBuilder.array((prod.notaProduccion || []).map(nota => this.formBuilder.control(nota))),
          
        
      })))
    });
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
      })
      // console.log('carrito En notas:',JSON.parse(this.carrito))
      if (typeof this.carrito === 'string') {
        this.carrito = JSON.parse(this.carrito)
        this.llenarFormulario()
      } else {
        this.carrito = this.carrito
        this.llenarFormulario()
      }

    }
  }
  llenarFormulario() {
    if(!this.notasProduccionForm){
      return;
    }
    const productos = this.notasProduccionForm.get('productos') as FormArray;
    productos.clear();
    this.pedido.carrito.forEach(prod => {
      const notasArray = this.formBuilder.array((prod.notaProduccion || []).map(nota => this.formBuilder.control(nota)));
      productos.push(this.formBuilder.group({ notas: notasArray }));
    });
  }
  get notasFormArray() {
    return this.notasProduccionForm.get('productos') as FormArray;
  }
  agregarNota(productoIndex: number) {
    const notasArray = this.notasFormArray.at(productoIndex).get('notas') as FormArray;
    notasArray.push(this.formBuilder.control(''));
    
  }
  guardarNotas() {
    const notasActualizadas = this.notasFormArray.value;
    notasActualizadas.map(x=>{
      if(x.fecha==undefined || x.fecha==null)
      x.fecha=new Date()
    })
    this.pedido.carrito.forEach((obj, index) => {
      obj.notaProduccion = notasActualizadas[index].notas;

    });
    
    this.pedido.notasPedido.notasProduccion=notasActualizadas
    Swal.fire('Notas Guardadas Con Exito', 'Se han guardado con exito las notas de produccion para los productos', 'success')
    console.log(this.carrito);
    localStorage.setItem('carrito', JSON.stringify(this.pedido.carrito))
    this.singleton.refreshCart()
    this.bandera = false
  }
  onSubmitPedido() {
    const notaPedido = this.notasProduccionForm.value;
    notaPedido.fecha = this.fecha;
    this.notasProduccion.unshift(notaPedido);
    this.pedido.notasPedido.notasProduccion = this.notasProduccion as Notas[]
    this.notasProduccionForm.reset();
  }

  onSubmitCliente() {
    const nota = this.notasClienteForm.value;
    nota.fecha = this.fecha;
    this.pedido.notasPedido.notasCliente.unshift(nota);

    this.notasClienteForm.reset();
  }
  onSubmitDespachos() {
    const notaDespachos = this.notasDespachoForm.value;
    notaDespachos.fecha = this.fecha;
    this.notasDespachos.unshift(notaDespachos);
    this.pedido.notasPedido.notasDespachos = this.notasDespachos as Notas[]
    this.notasDespachoForm.reset();
  }
  onSubmitEntregas() {
    const notaEntrega = this.notasEntregasForm.value;
    notaEntrega.fecha = this.fecha;
    this.notasEntregas.unshift(notaEntrega);
    this.pedido.notasPedido.notasEntregas = this.notasEntregas as Notas[]
    this.notasEntregasForm.reset();
  }
  onSubmitFacturacionPagos() {
    const notaFacturacionPagos = this.notasFacturacionPagosForm.value;
    notaFacturacionPagos.fecha = this.fecha;
    this.notasFacturacionPagos.unshift(notaFacturacionPagos);
    this.pedido.notasPedido.notasFacturacionPagos = this.notasFacturacionPagos as Notas[]
    this.notasFacturacionPagosForm.reset();
  }


  eliminarNota(index: number, tipo: string) {
    switch (tipo) {
      case 'produccion':
        this.notasProduccion.splice(index, 1);
        break;
      case 'cliente':
        this.notasCliente.splice(index, 1);
        break;
      case 'despachos':
        this.notasDespachos.splice(index, 1);
        break;
      case 'entregas':
        this.notasEntregas.splice(index, 1);
        break;
      case 'facturacionPagos':
        this.notasFacturacionPagos.splice(index, 1);
        break;
    }
  }
}
