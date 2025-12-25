import { Component, OnInit, ViewChild } from '@angular/core';
import { MaestroService } from 'src/app/shared/services/maestros/maestro.service';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import * as XLSX from 'xlsx';
import Swal from 'sweetalert2';
import { EditarPreciosTipoClienteComponent } from '../editar-precios-tipo-cliente/editar-precios-tipo-cliente.component';
import { Producto, PrecioPorTipoCliente } from 'src/app/shared/models/productos/Producto';

@Component({
  selector: 'app-lista-precios',
  templateUrl: './lista-precios.component.html',
  styleUrls: ['./lista-precios.component.scss']
})
export class ListaPreciosComponent implements OnInit {
  @ViewChild('fileInput') fileInput: any;

  cargando = false;
  productos: Producto[] = [];
  productosFiltrados: Producto[] = [];
  tiposCliente: any[] = [];
  searchTerm: string = '';
  activeTab: number = 0; // 0: Tipo Cliente, 1: Volumen, 2: Canal

  // Paginación
  pageSize = 10;
  currentPage = 0;
  totalRecords = 0;

  constructor(
    private service: MaestroService,
    private modalService: NgbModal
  ) {}

  ngOnInit(): void {
    this.cargarTiposCliente();
    this.cargarProductos();
  }

  cargarTiposCliente() {
    // Cargar TODOS los tipos de cliente (no solo activos) para la plantilla
    this.service.consultarTiposCliente().subscribe({
      next: (data: any) => {
        console.log('Respuesta completa de tipos de cliente:', data);
        
        // Procesar la respuesta
        let tiposProcesados: any[] = [];
        if (Array.isArray(data)) {
          tiposProcesados = data;
        } else if (data && Array.isArray(data.data)) {
          tiposProcesados = data.data;
        } else if (data && data.results && Array.isArray(data.results)) {
          tiposProcesados = data.results;
        } else {
          tiposProcesados = [];
        }
        
        // Normalizar los datos - usar descripcion como nombre principal
        this.tiposCliente = tiposProcesados.map(tipo => {
          console.log('Tipo de cliente recibido:', tipo);
          // La descripcion es el campo principal para el nombre
          const descripcion = tipo.descripcion || tipo.description || '';
          const nombre = tipo.nombre || tipo.name || '';
          
          return {
            ...tipo,
            descripcion: descripcion,
            nombre: nombre
          };
        });
        
        console.log('Tipos de cliente procesados:', this.tiposCliente.length);
        console.log('Detalles de tipos:', this.tiposCliente.map(t => ({ 
          id: t.id, 
          nombre: t.nombre, 
          descripcion: t.descripcion,
          todosLosCampos: Object.keys(t)
        })));
      },
      error: (error) => {
        console.error('Error cargando tipos de cliente:', error);
        // Intentar cargar solo activos como fallback
        this.service.consultarTiposClienteActivos().subscribe({
          next: (dataActivos: any) => {
            this.tiposCliente = Array.isArray(dataActivos) ? dataActivos : [];
          }
        });
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

    // Verificar si hay tipos de cliente cargados
    if (this.tiposCliente.length === 0) {
      Swal.fire({
        title: 'Cargando tipos de cliente...',
        text: 'Por favor espera mientras cargamos los tipos de cliente',
        allowOutsideClick: false,
        didOpen: () => {
          Swal.showLoading();
        }
      });

      // Recargar tipos de cliente
      this.service.consultarTiposCliente().subscribe({
        next: (data: any) => {
          if (Array.isArray(data)) {
            this.tiposCliente = data;
          } else if (data && Array.isArray(data.data)) {
            this.tiposCliente = data.data;
          } else if (data && data.results && Array.isArray(data.results)) {
            this.tiposCliente = data.results;
          }

          if (this.tiposCliente.length === 0) {
            Swal.fire('Advertencia', 'No hay tipos de cliente disponibles. Por favor, crea tipos de cliente primero.', 'warning');
            return;
          }

          // Generar plantilla después de cargar
          this.generarPlantillaExcel();
        },
        error: (error) => {
          Swal.fire('Error', 'No se pudieron cargar los tipos de cliente', 'error');
        }
      });
      return;
    }

    // Si ya hay tipos de cliente, generar directamente
    this.generarPlantillaExcel();
  }

  generarPlantillaExcel() {
    console.log('=== GENERANDO PLANTILLA EXCEL ===');
    console.log('Tipos de cliente disponibles:', this.tiposCliente);
    console.log('Cantidad de tipos:', this.tiposCliente.length);
    
    // Crear encabezados: REFERENCIA + nombres de tipos de cliente
    const headers = ['REFERENCIA'];
    this.tiposCliente.forEach((tipo, index) => {
      console.log(`\n--- Procesando tipo ${index + 1} ---`);
      console.log('Objeto completo:', tipo);
      console.log('Campos disponibles:', Object.keys(tipo));
      console.log('tipo.descripcion:', tipo.descripcion);
      console.log('tipo.nombre:', tipo.nombre);
      
      // FORZAR uso de descripcion como campo principal para el nombre
      // SIEMPRE usar descripcion si existe, sin importar si nombre también existe
      let nombreTipo = '';
      
      // Verificar descripcion primero (campo principal)
      const descripcion = tipo.descripcion || tipo.description || '';
      const descripcionTrim = String(descripcion).trim();
      
      if (descripcionTrim) {
        nombreTipo = descripcionTrim;
        console.log('✅ USANDO DESCRIPCION:', nombreTipo);
      } else {
        // Solo usar nombre como último recurso si NO hay descripcion
        const nombre = tipo.nombre || tipo.name || '';
        const nombreTrim = String(nombre).trim();
        
        if (nombreTrim) {
          nombreTipo = nombreTrim;
          console.log('⚠️ Usando nombre (fallback - NO hay descripcion):', nombreTipo);
        } else {
          console.error('⚠️ Tipo de cliente sin descripción válida:', tipo);
          nombreTipo = `Tipo_${tipo.id || index}`;
        }
      }
      
      console.log(`✅ Nombre final seleccionado: "${nombreTipo}"`);
      headers.push(nombreTipo);
    });
    
    console.log('\n=== ENCABEZADOS FINALES ===');
    console.log(headers);
    console.log('===========================\n');

    // Crear plantilla vacía (solo encabezados, sin filas de datos)
    // Crear workbook directamente con los encabezados
    const worksheet = XLSX.utils.aoa_to_sheet([headers]); // aoa_to_sheet crea solo la fila de encabezados

    // Ajustar ancho de columnas
    const colWidths = [
      { wch: 20 }, // REFERENCIA
      ...this.tiposCliente.map(() => ({ wch: 25 })) // Precios por tipo de cliente
    ];
    worksheet['!cols'] = colWidths;

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Precios');

    // Descargar
    const fecha = new Date().toISOString().split('T')[0];
    XLSX.writeFile(workbook, `Plantilla_Precios_Tipo_Cliente_${fecha}.xlsx`);

    Swal.fire({
      title: 'Éxito',
      html: `Plantilla Excel descargada correctamente<br><br><small>La plantilla incluye ${this.tiposCliente.length} tipo(s) de cliente:<br>${this.tiposCliente.map(t => `• ${t.nombre || t.descripcion || t.id}`).join('<br>')}</small>`,
      icon: 'success',
      confirmButtonText: 'Ok',
      width: '500px'
    });
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

    const productosActualizados: Producto[] = [];
    let procesados = 0;
    let errores = 0;
    const erroresDetalle: string[] = [];

    datos.forEach((row: any, index: number) => {
      // Buscar referencia (puede estar en diferentes formatos)
      const referencia = row['REFERENCIA'] || row['referencia'] || row['Referencia'] || row['Referencia'] || '';
      
      if (!referencia || referencia.toString().trim() === '') {
        errores++;
        erroresDetalle.push(`Fila ${index + 2}: Sin referencia`);
        return;
      }

      // Buscar producto por referencia
      const producto = this.productos.find(p => 
        p.identificacion?.referencia?.toString().trim().toLowerCase() === referencia.toString().trim().toLowerCase()
      );

      if (!producto) {
        errores++;
        erroresDetalle.push(`Fila ${index + 2}: Producto con referencia "${referencia}" no encontrado`);
        return;
      }

      // Extraer precios por tipo de cliente (buscar por nombre de columna = nombre del tipo de cliente)
      const preciosPorTipo: PrecioPorTipoCliente[] = [];
      
      this.tiposCliente.forEach(tipo => {
        // Buscar el precio en la columna que coincide con la descripción del tipo de cliente
        const nombreTipo = tipo.descripcion?.trim() || tipo.description?.trim() || tipo.nombre?.trim() || '';
        
        if (!nombreTipo) {
          console.warn('Tipo de cliente sin descripción válida:', tipo);
          return;
        }
        
        // Buscar el precio en diferentes variaciones del nombre (mayúsculas, minúsculas, etc.)
        const precio = row[nombreTipo] || 
                      row[nombreTipo.toUpperCase()] || 
                      row[nombreTipo.toLowerCase()] ||
                      row[nombreTipo.charAt(0).toUpperCase() + nombreTipo.slice(1).toLowerCase()];
        
        if (precio !== undefined && precio !== null && precio !== '' && !isNaN(precio)) {
          const precioNumero = parseFloat(precio.toString().replace(/[^0-9.-]/g, ''));
          if (precioNumero > 0) {
            preciosPorTipo.push({
              tipoClienteId: tipo.id,
              tipoClienteNombre: tipo.descripcion || nombreTipo,
              precio: precioNumero,
              activo: true
            });
          }
        }
      });

      // Si no se encontraron precios, saltar este producto
      if (preciosPorTipo.length === 0) {
        errores++;
        erroresDetalle.push(`Fila ${index + 2}: No se encontraron precios válidos para "${referencia}"`);
        return;
      }

      // Inicializar array si no existe
      if (!producto.preciosPorTipoCliente) {
        producto.preciosPorTipoCliente = [];
      }
      
      // Actualizar o agregar precios
      preciosPorTipo.forEach(precioNuevo => {
        const indexExistente = producto.preciosPorTipoCliente!.findIndex(
          (p: PrecioPorTipoCliente) => p.tipoClienteId === precioNuevo.tipoClienteId
        );
        if (indexExistente !== -1) {
          producto.preciosPorTipoCliente![indexExistente] = precioNuevo;
        } else {
          producto.preciosPorTipoCliente!.push(precioNuevo);
        }
      });

      // Actualizar fecha de edición
      producto.date_edit = new Date().toISOString();

      productosActualizados.push(producto);
      procesados++;
    });

    // Actualizar productos en el backend
    this.actualizarProductosEnBackend(productosActualizados, procesados, errores, erroresDetalle);
  }

  actualizarProductosEnBackend(productos: Producto[], procesados: number, errores: number, erroresDetalle: string[] = []) {
    let actualizados = 0;
    const total = productos.length;

    if (total === 0) {
      Swal.fire('Advertencia', 'No se encontraron productos para actualizar', 'warning');
      return;
    }

    productos.forEach((producto) => {
      // Preparar datos para actualizar - mantener estructura del producto y agregar precios
      const productoActualizado: Producto = {
        ...producto,
        date_edit: new Date().toISOString(),
        preciosPorTipoCliente: producto.preciosPorTipoCliente
      };

      // Actualizar producto usando el método de edición
      this.service.editProductByReference(productoActualizado).subscribe({
        next: () => {
          actualizados++;
          if (actualizados === total) {
            let mensajeHtml = `
              <p><strong>Productos procesados:</strong> ${procesados}</p>
              <p><strong>Productos actualizados:</strong> ${actualizados}</p>
              <p><strong>Errores:</strong> ${errores}</p>
            `;
            
            if (erroresDetalle.length > 0 && erroresDetalle.length <= 10) {
              mensajeHtml += '<hr><p><strong>Detalles de errores:</strong></p><ul style="text-align: left; font-size: 0.9em;">';
              erroresDetalle.forEach(error => {
                mensajeHtml += `<li>${error}</li>`;
              });
              mensajeHtml += '</ul>';
            } else if (erroresDetalle.length > 10) {
              mensajeHtml += `<p><small>Hay ${erroresDetalle.length} errores. Revisa la consola para más detalles.</small></p>`;
              console.log('Errores detallados:', erroresDetalle);
            }

            Swal.fire({
              title: errores > 0 ? 'Importación completada con errores' : 'Importación completada',
              html: mensajeHtml,
              icon: errores > 0 ? 'warning' : 'success',
              confirmButtonText: 'Ok',
              width: '600px'
            }).then(() => {
              this.cargarProductos();
            });
          }
        },
        error: (error) => {
          console.error('Error actualizando producto:', error);
          errores++;
          if (actualizados + errores === total) {
            let mensajeHtml = `
              <p><strong>Productos procesados:</strong> ${procesados}</p>
              <p><strong>Productos actualizados:</strong> ${actualizados}</p>
              <p><strong>Errores:</strong> ${errores}</p>
            `;
            
            if (erroresDetalle.length > 0 && erroresDetalle.length <= 10) {
              mensajeHtml += '<hr><p><strong>Detalles de errores:</strong></p><ul style="text-align: left; font-size: 0.9em;">';
              erroresDetalle.forEach(error => {
                mensajeHtml += `<li>${error}</li>`;
              });
              mensajeHtml += '</ul>';
            }

            Swal.fire({
              title: 'Importación completada con errores',
              html: mensajeHtml,
              icon: 'warning',
              confirmButtonText: 'Ok',
              width: '600px'
            }).then(() => {
              this.cargarProductos();
            });
          }
        }
      });
    });
  }

  editarPrecio(producto: Producto) {
    console.log('editarPrecio llamado', { producto, activeTab: this.activeTab });
    
    // Solo abrir modal en el tab de tipo de cliente
    if (this.activeTab !== 0) {
      Swal.fire('Info', 'Esta funcionalidad solo está disponible en el tab "Precio tipo clientes"', 'info');
      return;
    }

    if (!producto) {
      console.error('Producto no definido');
      return;
    }

    try {
      const modalRef = this.modalService.open(EditarPreciosTipoClienteComponent, {
        size: 'lg',
        centered: true,
        backdrop: 'static'
      });

      if (!modalRef) {
        console.error('No se pudo abrir el modal');
        return;
      }

      modalRef.componentInstance.producto = producto;

      modalRef.result.then((result) => {
        if (result && result.success) {
          console.log('Precios guardados exitosamente:', result);
          // Actualizar el producto en la lista local
          const index = this.productos.findIndex(p => p.cd === result.producto.cd);
          if (index !== -1) {
            this.productos[index] = result.producto;
            this.productosFiltrados = [...this.productos];
          }
          Swal.fire('Éxito', 'Precios por tipo de cliente guardados correctamente', 'success');
        } else if (result && !result.success) {
          console.error('Error al guardar:', result.error);
          Swal.fire('Error', 'No se pudieron guardar los precios', 'error');
        }
      }).catch((error) => {
        // Usuario canceló o hubo un error
        console.log('Modal cerrado:', error);
      });
    } catch (error) {
      console.error('Error al abrir modal:', error);
      Swal.fire('Error', 'No se pudo abrir el modal de edición', 'error');
    }
  }

  obtenerPrecio(producto: Producto): number {
    if (this.activeTab === 0 && producto.preciosPorTipoCliente && Array.isArray(producto.preciosPorTipoCliente)) {
      // Si hay precios por tipo de cliente, mostrar el primero o el precio base
      if (producto.preciosPorTipoCliente.length > 0) {
        return producto.preciosPorTipoCliente[0].precio || 
               producto.precio?.precioUnitarioConIva || 
               producto.precio?.precioUnitarioSinIva || 
               0;
      }
    }
    return producto.precio?.precioUnitarioConIva || 
           producto.precio?.precioUnitarioSinIva || 
           0;
  }

  obtenerFechaEdicion(producto: Producto): string {
    return producto.date_edit || '-';
  }
}

