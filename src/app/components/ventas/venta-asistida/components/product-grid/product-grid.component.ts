import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';

@Component({
  selector: 'app-product-grid',
  templateUrl: './product-grid.component.html',
  styleUrls: ['./product-grid.component.scss']
})
export class ProductGridComponent implements OnInit {
  @Input() productos: any[] = [];
  @Input() productosCarrito: any[] = [];
  @Input() productosFiltrados: any[] = [];
  @Input() productoSeleccionado: any = null;
  @Input() loadingProductos: boolean = false;
  @Input() errorStockProducto: string | null = null;

  @Output() productoAgregado = new EventEmitter<any>();
  @Output() buscarProductos = new EventEmitter<any>();
  @Output() productoSeleccionadoChange = new EventEmitter<any>();
  @Output() actualizarCantidad = new EventEmitter<{producto: any, cantidad: number}>();
  @Output() eliminarProductoCarrito = new EventEmitter<any>();

  constructor() { }

  ngOnInit(): void {}

  // Métodos para buscar/agregar productos aquí
} 