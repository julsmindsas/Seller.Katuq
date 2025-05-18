import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';

@Component({
  selector: 'app-customer-info',
  templateUrl: './customer-info.component.html',
  styleUrls: ['./customer-info.component.scss']
})
export class CustomerInfoComponent implements OnInit {
  @Input() cliente: any;
  @Output() clienteSeleccionado = new EventEmitter<any>();

  constructor() { }

  ngOnInit(): void {}

  // Métodos para seleccionar/editar cliente aquí
} 