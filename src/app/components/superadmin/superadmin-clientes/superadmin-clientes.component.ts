import { Component, OnInit } from '@angular/core';

// Interfaz para definir la estructura del cliente (opcional pero recomendado)
interface Cliente {
  id: number;
  nombre: string;
  empresa: string;
  email: string;
  telefono: string;
  estado: 'Activo' | 'Bloqueado' | 'Pendiente';
  fechaRegistro: Date;
  ultimoAcceso: Date | null;
}

@Component({
  selector: 'app-superadmin-clientes',
  templateUrl: './superadmin-clientes.component.html',
  styleUrls: ['./superadmin-clientes.component.scss']
})
export class SuperadminClientesComponent implements OnInit {

  clientes: Cliente[] = [];
  clientesFiltrados: Cliente[] = [];
  filtroNombre: string = '';
  filtroEstado: string = '';

  // Datos mock
  private mockClientes: Cliente[] = [
    { id: 1, nombre: 'Cliente Alfa', empresa: 'Empresa X', email: 'alfa@ejemplo.com', telefono: '123456789', estado: 'Activo', fechaRegistro: new Date(2024, 10, 15), ultimoAcceso: new Date(2025, 3, 17) },
    { id: 2, nombre: 'Cliente Beta', empresa: 'Empresa Y', email: 'beta@ejemplo.com', telefono: '987654321', estado: 'Bloqueado', fechaRegistro: new Date(2024, 5, 20), ultimoAcceso: new Date(2025, 1, 5) },
    { id: 3, nombre: 'Cliente Gamma', empresa: 'Empresa Z', email: 'gamma@ejemplo.com', telefono: '555555555', estado: 'Pendiente', fechaRegistro: new Date(2025, 0, 10), ultimoAcceso: null },
    { id: 4, nombre: 'Cliente Delta', empresa: 'Empresa X', email: 'delta@ejemplo.com', telefono: '111222333', estado: 'Activo', fechaRegistro: new Date(2023, 8, 1), ultimoAcceso: new Date(2025, 3, 18) },
  ];

  // --- Inicio: Añadir Getters ---
  get totalClientes(): number {
    return this.clientes.length;
  }

  get clientesActivosCount(): number {
    return this.clientes.filter(c => c.estado === 'Activo').length;
  }

  get clientesBloqueadosCount(): number {
    return this.clientes.filter(c => c.estado === 'Bloqueado').length;
  }

  get clientesPendientesCount(): number {
    return this.clientes.filter(c => c.estado === 'Pendiente').length;
  }
  // --- Fin: Añadir Getters ---

  constructor() { }

  ngOnInit(): void {
    this.clientes = this.mockClientes;
    this.filtrarClientes(); // Inicializar la lista filtrada
  }

  filtrarClientes(): void {
    this.clientesFiltrados = this.clientes.filter(cliente => {
      const coincideNombre = cliente.nombre.toLowerCase().includes(this.filtroNombre.toLowerCase()) ||
                             cliente.empresa.toLowerCase().includes(this.filtroNombre.toLowerCase()) ||
                             cliente.email.toLowerCase().includes(this.filtroNombre.toLowerCase());
      const coincideEstado = this.filtroEstado === '' || cliente.estado === this.filtroEstado;
      return coincideNombre && coincideEstado;
    });
  }

  // Métodos para acciones (editar, cambiar estado, etc.) - se implementarán después
  editarCliente(cliente: Cliente): void {
    console.log('Editar cliente:', cliente);
    // Lógica para editar
  }

  cambiarEstado(cliente: Cliente, nuevoEstado: 'Activo' | 'Bloqueado'): void {
    console.log('Cambiar estado cliente:', cliente, 'a', nuevoEstado);
    const index = this.clientes.findIndex(c => c.id === cliente.id);
    if (index !== -1) {
      this.clientes[index].estado = nuevoEstado;
      this.filtrarClientes(); // Actualizar vista
    }
  }

   verDetalles(cliente: Cliente): void {
    console.log('Ver detalles cliente:', cliente);
    // Lógica para mostrar detalles (puede ser un modal o navegar a otra vista)
  }

   eliminarCliente(cliente: Cliente): void {
     if (confirm(`¿Está seguro de que desea eliminar al cliente ${cliente.nombre}?`)) {
        console.log('Eliminar cliente:', cliente);
        this.clientes = this.clientes.filter(c => c.id !== cliente.id);
        this.filtrarClientes(); // Actualizar vista
     }
   }
}
