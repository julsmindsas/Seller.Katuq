import { Component, OnInit } from '@angular/core';
import { MaestroService } from "../../../../shared/services/maestros/maestro.service";
import * as XLSX from 'xlsx';
import { MultiSelectModule } from 'primeng/multiselect';

interface Column {
    field: string;
    header: string;
}

@Component({
    selector: 'app-clientes-lista',
    templateUrl: './clientes-lista.component.html',
    styleUrls: ['./clientes-lista.component.scss']
})
export class ClientesListaComponent implements OnInit {
    clientes: any[] = [];
    temp: any[] = [];
    cargando: boolean = true;
    isMobile: boolean = false; // Asume que tienes una forma de determinar si es móvil

    cols: Column[];
    _selectedColumns: Column[];

    constructor(private clienteService: MaestroService) { }

    ngOnInit(): void {

debugger;

        this.cargarClientes();

        this.cols = [
            { field: 'tipo_documento_comprador', header: 'CC-Nit' },
            { field: 'documento', header: '# Documento' },
            { field: 'correo_electronico_comprador', header: 'Email' },
            { field: 'numero_celular_comprador', header: 'Celular' },
            { field: 'estado', header: 'Estado' },
        ];

        this._selectedColumns = this.cols;
    }

    get selectedColumns(): Column[] {
        return this._selectedColumns;
    }

    set selectedColumns(val: Column[]) {
        //restore original order
        this._selectedColumns = this.cols.filter((col) => val.includes(col));
    }

    getSeverity(status: string) {
        switch (status) {
            case 'activo':
                return 'success';
            case 'inactivo':
                return 'danger';
        }
    }

    cargarClientes(): void {
        this.cargando = true;
        this.clienteService.obtenerClientes().subscribe({
            next: (clientes: any) => {
                this.clientes = clientes;
                this.temp = [...clientes];
                this.cargando = false;
            },
            error: (error) => {
                console.error(error);
                this.cargando = false;
            }
        });
    }

    updateFilter(event: any): void {
        const val = event.target.value.toLowerCase();

        let temp: any;

        if (this.isMobile) {
            temp = this.temp.filter(function (d) {
                const res1 = d.nombres_completos.toLowerCase().indexOf(val) !== -1 || !val;
                const res2 = d.documento.toLowerCase().indexOf(val) !== -1 || !val;
                return res1 || res2;
            });
        } else {
            temp = this.temp.filter(function (d) {
                const res1 = d.nombres_completos.toLowerCase().indexOf(val) !== -1 || !val;
                const res2 = d.tipo_documento_comprador.toLowerCase().indexOf(val) !== -1 || !val;
                const res3 = d.documento.toLowerCase().indexOf(val) !== -1 || !val;
                const res4 = d.correo_electronico_comprador.toLowerCase().indexOf(val) !== -1 || !val;
                return res1 || res2 || res3 || res4;
            });
        }

        this.clientes = temp;
    }

    editarCliente(cliente: any): void {
        // Implementa la lógica para editar el cliente aquí
        console.log('Editar cliente', cliente);
    }

    eliminarCliente(cliente: any): void {
        this.clienteService.eliminarCliente(cliente.cd).subscribe({
            next: () => {
                this.cargarClientes();
            },
            error: (error) => {
                console.error(error);
            }
        });
    }

    exportarExcel() {
        // Define los encabezados para el Excel
        const headers = [
            // Campos principales
            'Nombres Completos',
            'Tipo Documento Comprador',
            'Documento',
            'Indicativo Celular Comprador',
            'Número Celular Comprador',
            'Correo Electrónico Comprador',
            'Indicativo Celular WhatsApp',
            'Número Celular WhatsApp',
            'Estado',
            'Fecha de Adición',
            'Empresa',
            'Usuario de Adición',
            // Campos de Facturación
            'Facturación Alias',
            'Facturación Nombres',
            'Facturación Tipo Documento',
            'Facturación Documento',
            'Facturación Indicativo Cel',
            'Facturación Celular',
            'Facturación Correo Electrónico',
            'Facturación Dirección',
            'Facturación País',
            'Facturación Departamento',
            'Facturación Ciudad',
            // Campos de Entrega
            'Entrega Alias',
            'Entrega Nombres',
            'Entrega Indicativo Cel',
            'Entrega Celular',
            'Entrega Dirección',
            'Entrega Observaciones',
            'Entrega Barrio',
            'Entrega Nombre Unidad',
            'Entrega Especificaciones Internas',
            'Entrega País',
            'Entrega Departamento',
            'Entrega Ciudad',
            'Entrega Zona Cobro'
        ];

        // Mapea los datos de los clientes para incluir los campos anidados
        const data = this.clientes.map(cliente => {
            // Extrae los datos de facturación y entrega, asumiendo que son arrays con al menos un objeto
            const facturacion = cliente.datosFacturacionElectronica && cliente.datosFacturacionElectronica.length > 0
                ? cliente.datosFacturacionElectronica[0]
                : {};
            const entrega = cliente.datosEntrega && cliente.datosEntrega.length > 0
                ? cliente.datosEntrega[0]
                : {};

            return [
                // Campos principales
                cliente.nombres_completos || '',
                cliente.tipo_documento_comprador || '',
                cliente.documento || '',
                cliente.indicativo_celular_comprador || '',
                cliente.numero_celular_comprador || '',
                cliente.correo_electronico_comprador || '',
                cliente.indicativo_celular_whatsapp || '',
                cliente.numero_celular_whatsapp || '',
                cliente.estado || '',
                cliente.date_add ? this.formatearFecha(cliente.date_add) : '',
                cliente.company || '',
                cliente.user_add || '',
                // Campos de Facturación
                facturacion.alias || '',
                facturacion.nombres || '',
                facturacion.tipoDocumento || '',
                facturacion.documento || '',
                facturacion.indicativoCel || '',
                facturacion.celular || '',
                facturacion.correoElectronico || '',
                facturacion.direccion || '',
                facturacion.pais || '',
                facturacion.departamento || '',
                facturacion.ciudad || '',
                // Campos de Entrega
                entrega.alias || '',
                entrega.nombres || '',
                entrega.indicativoCel || '',
                entrega.celular || '',
                entrega.direccionEntrega || '',
                entrega.observaciones || '',
                entrega.barrio || '',
                entrega.nombreUnidad || '',
                entrega.especificacionesInternas || '',
                entrega.pais || '',
                entrega.departamento || '',
                entrega.ciudad || '',
                entrega.zonaCobro || ''
            ];
        });

        // Agrega los encabezados al principio de los datos
        data.unshift(headers);

        // Crea una nueva hoja de cálculo
        const worksheet = XLSX.utils.aoa_to_sheet(data);

        // Crea un nuevo libro de trabajo y añade la hoja
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, 'Clientes');

        // Exporta el libro a un archivo Excel
        XLSX.writeFile(workbook, 'clientes.xlsx');
    }

    formatearFecha(fecha) {
        // Convierte el timestamp a una fecha legible
        const date = new Date(fecha._seconds * 1000 + fecha._nanoseconds / 1e6);
        return date.toLocaleString();
    }

}