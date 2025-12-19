import { Component, OnInit, ViewChild } from '@angular/core';
import { MaestroService } from 'src/app/shared/services/maestros/maestro.service';
import * as XLSX from 'xlsx';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-lista-precios',
  templateUrl: './lista-precios.component.html',
  styleUrls: ['./lista-precios.component.scss']
})
export class ListaPreciosComponent implements OnInit {
  @ViewChild('fileInput') fileInput: any;

  cargando = false;
  productos: any[] = [];
  productosFiltrados: any[] = [];
  tiposCliente: any[] = [];
  searchTerm: string = '';
  activeTab: number = 0; // 0: Tipo Cliente, 1: Volumen, 2: Canal

  // Paginación
  pageSize = 10;
  currentPage = 0;
  totalRecords = 0;

  constructor(private service: MaestroService) {}

  ngOnInit(): void {
    this.cargarTiposCliente();
    this.cargarProductos();
  }

  cargarTiposCliente() {
    this.service.consultarTiposClienteActivos().subscribe({
      next: (data: any) => {
        this.tiposCliente = data || [];
      },
      error: (error) => {
        console.error('Error cargando tipos de cliente:', error);
      }
    });
  }

  cargarProductos() {
    this.cargando = true;
    // Cargar productos con paginación
    this.service.getAllProductsPagination(1000, 1).subscribe({
      next: (data: any) => {
        this.productos = Array.isArray(data?.products) ? data.products : (Array.isArray(data) ? data : []);
        this.productosFiltrados = [...this.productos];
        this.totalRecords = this.productos.length;
        this.cargando = false;
      },
      error: (error) => {
        console.error('Error cargando productos:', error);
        // Intentar método alternativo
        this.service.getProductByBarcode('').subscribe({
          next: (data: any) => {
            this.productos = Array.isArray(data) ? data : [];
            this.productosFiltrados = [...this.productos];
            this.totalRecords = this.productos.length;
            this.cargando = false;
          },
          error: (err) => {
            console.error('Error cargando productos:', err);
            this.cargando = false;
          }
        });
      }
    });
  }

  buscarProducto(event?: any) {
    if (event && event.key !== 'Enter') return;
    
    if (!this.searchTerm.trim()) {
      this.productosFiltrados = [...this.productos];
      return;
    }

    const term = this.searchTerm.toLowerCase();
    this.productosFiltrados = this.productos.filter(p => 
      p.identificacion?.referencia?.toLowerCase().includes(term) ||
      p.crearProducto?.titulo?.toLowerCase().includes(term)
    );
  }

  onTabChange(event: any) {
    this.activeTab = event.index;
  }

  descargarFormatoExcel() {
    if (this.activeTab !== 0) {
      Swal.fire('Info', 'El formato Excel solo está disponible para Precio por Tipo de Cliente', 'info');
      return;
    }

    // Crear encabezados
    const headers = ['REFERENCIA', 'TITULO'];
    this.tiposCliente.forEach(tipo => {
      headers.push(`PRECIO ${tipo.nombre?.toUpperCase()}`);
    });

    // Crear datos de ejemplo
    const datos = this.productos.slice(0, 5).map(producto => {
      const row: any = {
        'REFERENCIA': producto.identificacion?.referencia || '',
        'TITULO': producto.crearProducto?.titulo || ''
      };
      
      this.tiposCliente.forEach(tipo => {
        row[`PRECIO ${tipo.nombre?.toUpperCase()}`] = producto.precio?.precio || '';
      });
      
      return row;
    });

    // Crear workbook
    const worksheet = XLSX.utils.json_to_sheet([], { header: headers });
    XLSX.utils.sheet_add_json(worksheet, datos, { origin: 'A2', skipHeader: true });

    // Ajustar ancho de columnas
    const colWidths = [
      { wch: 15 }, // REFERENCIA
      { wch: 30 }, // TITULO
      ...this.tiposCliente.map(() => ({ wch: 20 })) // Precios
    ];
    worksheet['!cols'] = colWidths;

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Precios');

    // Descargar
    const fecha = new Date().toISOString().split('T')[0];
    XLSX.writeFile(workbook, `Formato_Precios_Tipo_Cliente_${fecha}.xlsx`);

    Swal.fire('Éxito', 'Formato Excel descargado correctamente', 'success');
  }

  importarPrecios() {
    this.fileInput.nativeElement.click();
  }

  onFileSelected(event: any) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e: any) => {
      try {
        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, { type: 'array' });
        const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
        const jsonData = XLSX.utils.sheet_to_json(firstSheet);

        this.procesarImportacion(jsonData);
      } catch (error) {
        console.error('Error leyendo archivo:', error);
        Swal.fire('Error', 'Error al leer el archivo Excel', 'error');
      }
    };
    reader.readAsArrayBuffer(file);
  }

  procesarImportacion(datos: any[]) {
    Swal.fire({
      title: 'Procesando...',
      text: 'Importando precios, por favor espere',
      allowOutsideClick: false,
      didOpen: () => {
        Swal.showLoading();
      }
    });

    const productosActualizados: any[] = [];
    let procesados = 0;
    let errores = 0;

    datos.forEach((row: any) => {
      const referencia = row['REFERENCIA'] || row['referencia'] || row['Referencia'];
      if (!referencia) {
        errores++;
        return;
      }

      // Buscar producto por referencia
      const producto = this.productos.find(p => 
        p.identificacion?.referencia === referencia
      );

      if (!producto) {
        errores++;
        return;
      }

      // Extraer precios por tipo de cliente
      const preciosPorTipo: any = {};
      this.tiposCliente.forEach(tipo => {
        const columna = `PRECIO ${tipo.nombre?.toUpperCase()}`;
        const precio = row[columna] || row[columna.toLowerCase()];
        if (precio && !isNaN(precio)) {
          preciosPorTipo[tipo.id] = parseFloat(precio);
        }
      });

      // Actualizar producto con nuevos precios
      if (!producto.preciosPorTipoCliente) {
        producto.preciosPorTipoCliente = {};
      }
      Object.assign(producto.preciosPorTipoCliente, preciosPorTipo);

      productosActualizados.push(producto);
      procesados++;
    });

    // Actualizar productos en el backend
    this.actualizarProductosEnBackend(productosActualizados, procesados, errores);
  }

  actualizarProductosEnBackend(productos: any[], procesados: number, errores: number) {
    let actualizados = 0;
    const total = productos.length;

    if (total === 0) {
      Swal.fire('Advertencia', 'No se encontraron productos para actualizar', 'warning');
      return;
    }

    productos.forEach((producto) => {
      // Preparar datos para actualizar - mantener estructura del producto y agregar precios
      const productoActualizado = {
        ...producto,
        date_edit: new Date().toISOString(),
        // Guardar precios por tipo de cliente en la estructura del producto
        preciosPorTipoCliente: producto.preciosPorTipoCliente
      };

      // Actualizar producto usando el método de edición
      this.service.createProduct(productoActualizado).subscribe({
        next: () => {
          actualizados++;
          if (actualizados === total) {
            Swal.fire({
              title: 'Importación completada',
              html: `
                <p>Productos procesados: ${procesados}</p>
                <p>Productos actualizados: ${actualizados}</p>
                <p>Errores: ${errores}</p>
              `,
              icon: 'success',
              confirmButtonText: 'Ok'
            }).then(() => {
              this.cargarProductos();
            });
          }
        },
        error: (error) => {
          console.error('Error actualizando producto:', error);
          errores++;
          if (actualizados + errores === total) {
            Swal.fire({
              title: 'Importación completada con errores',
              html: `
                <p>Productos procesados: ${procesados}</p>
                <p>Productos actualizados: ${actualizados}</p>
                <p>Errores: ${errores}</p>
              `,
              icon: 'warning',
              confirmButtonText: 'Ok'
            }).then(() => {
              this.cargarProductos();
            });
          }
        }
      });
    });
  }

  editarPrecio(producto: any) {
    // TODO: Implementar modal de edición de precios
    Swal.fire('Info', 'Funcionalidad de edición en desarrollo', 'info');
  }

  obtenerPrecio(producto: any): number {
    if (this.activeTab === 0 && producto.preciosPorTipoCliente) {
      // Retornar el primer precio disponible o el precio base
      const primerPrecio = Object.values(producto.preciosPorTipoCliente)[0];
      return primerPrecio as number || producto.precio?.precio || 0;
    }
    return producto.precio?.precio || 0;
  }

  obtenerFechaEdicion(producto: any): string {
    return producto.date_edit || producto.updatedAt || '-';
  }
}

