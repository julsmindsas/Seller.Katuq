import { Component, OnInit, AfterViewInit } from '@angular/core';
import * as ApexCharts from 'apexcharts';

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
export class SuperadminClientesComponent implements OnInit, AfterViewInit {

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

  // Datos mock para gráficos de tiendas
  private tiendas = [
    { nombre: 'Tienda A', ingresos: 40000000, pedidos: 120, crecimiento: 15 },
    { nombre: 'Tienda B', ingresos: 30000000, pedidos: 80, crecimiento: 5 },
    { nombre: 'Tienda C', ingresos: 25000000, pedidos: 70, crecimiento: -2 },
    { nombre: 'Tienda D', ingresos: 25000000, pedidos: 50, crecimiento: 8 }
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

  ngAfterViewInit(): void {
    this.renderStoreCharts();
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

  // Método para inicializar los gráficos de tiendas
  private renderStoreCharts(): void {
    this.renderVentasPorTiendaChart();
    this.renderPedidosPorTiendaChart();
    this.renderCrecimientoTiendasChart();
  }

  // Gráfico de barras para ventas por tienda
  private renderVentasPorTiendaChart(): void {
    const options = {
      chart: { 
        type: 'bar',
        height: 250,
        toolbar: { show: false }
      },
      plotOptions: {
        bar: {
          borderRadius: 4,
          distributed: true,
          dataLabels: {
            position: 'top'
          }
        }
      },
      colors: ['#008ffb', '#00e396', '#feb019', '#ff4560'],
      dataLabels: {
        enabled: true,
        formatter: function (val: number) {
          return '$' + (val / 1000000).toFixed(1) + 'M';
        },
        offsetY: -20,
        style: {
          fontSize: '12px',
          colors: ["#304758"]
        }
      },
      series: [{
        name: 'Ingresos',
        data: this.tiendas.map(t => t.ingresos)
      }],
      xaxis: {
        categories: this.tiendas.map(t => t.nombre),
        position: 'bottom'
      },
      yaxis: {
        axisBorder: { show: false },
        labels: {
          formatter: function (val: number) {
            return '$' + (val / 1000000).toFixed(1) + 'M';
          }
        }
      },
      title: {
        text: 'Ventas por Tienda (Mes Actual)',
        floating: false,
        align: 'center',
        style: {
          fontWeight: 600
        }
      }
    };

    const chart = new ApexCharts(document.querySelector('#chart-ventas-tiendas'), options);
    chart.render();
  }

  // Gráfico de donut para distribución de pedidos
  private renderPedidosPorTiendaChart(): void {
    const options = {
      chart: {
        type: 'donut',
        height: 250
      },
      series: this.tiendas.map(t => t.pedidos),
      labels: this.tiendas.map(t => t.nombre),
      colors: ['#008ffb', '#00e396', '#feb019', '#ff4560'],
      legend: {
        position: 'bottom'
      },
      plotOptions: {
        pie: {
          donut: {
            size: '65%',
            labels: {
              show: true,
              total: {
                show: true,
                label: 'Total Pedidos',
                formatter: function (w: any) {
                  return w.globals.seriesTotals.reduce((a: number, b: number) => a + b, 0);
                }
              }
            }
          }
        }
      },
      title: {
        text: 'Distribución de Pedidos',
        align: 'center',
        style: {
          fontWeight: 600
        }
      }
    };

    const chart = new ApexCharts(document.querySelector('#chart-pedidos-tiendas'), options);
    chart.render();
  }

  // Gráfico de líneas para crecimiento de tiendas
  private renderCrecimientoTiendasChart(): void {
    const options = {
      chart: {
        type: 'line',
        height: 250,
        toolbar: { show: false }
      },
      stroke: {
        curve: 'smooth',
        width: 3
      },
      series: [{
        name: 'Crecimiento %',
        data: this.tiendas.map(t => t.crecimiento)
      }],
      colors: ['#43cea2'],
      xaxis: {
        categories: this.tiendas.map(t => t.nombre)
      },
      yaxis: {
        labels: {
          formatter: function (val: number) {
            return val.toFixed(1) + '%';
          }
        }
      },
      markers: {
        size: 6,
        strokeWidth: 0,
        hover: {
          size: 8
        }
      },
      title: {
        text: 'Crecimiento Mensual por Tienda',
        align: 'center',
        style: {
          fontWeight: 600
        }
      }
    };

    const chart = new ApexCharts(document.querySelector('#chart-crecimiento-tiendas'), options);
    chart.render();
  }
}
