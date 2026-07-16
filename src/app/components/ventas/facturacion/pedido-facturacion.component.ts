import {
  AfterContentInit,
  Component,
  EventEmitter,
  Input,
  OnInit,
  Output,
} from "@angular/core";
import Swal from "sweetalert2";
import { Pedido } from "../modelo/pedido";
import { NgbModal } from "@ng-bootstrap/ng-bootstrap";
import { InfoIndicativos } from "src/Mock/indicativosPais";
import { InfoPaises } from "src/Mock/pais-estado-ciudad";
import { MaestroService } from "src/app/shared/services/maestros/maestro.service";

@Component({
  selector: "app-pedido-facturacion",
  templateUrl: "pedido-facturacion.component.html",
})
export class PedidoFacturacionComponent implements OnInit, AfterContentInit {
  // datosFacturacionElectronica: any[];
  alias_facturacion: any;
  razon_social: any;
  tipo_documento_facturacion: any;
  numero_documento_facturacion: any;
  indicativo_celular_facturacion: any;
  numero_celular_facturacion: any;
  correo_electronico_facturacion: any;
  direccion_facturacion: any;
  pais: any;
  departamento: any;
  ciudad_municipio: any;
  codigo_postal: any;
  facturacionElectronica: boolean;
  @Input() pedidoGral: Pedido;
  @Input() datosFacturacionElectronica: any[];
  @Input() documentoBusqueda: any;
  @Input() formulario: any;
  @Input() isEdit: boolean = false;
  @Input() generarFactura: boolean = false;
  @Input() activeIndex: number = 0;
  @Input() direccionFacturacion = "";
  @Input() paisInicial: string = "";
  @Input() departamentoInicial: string = "";
  @Input() ciudad: string = "";
  @Input() codigoPostal: string = "";
  paises: string[];
  indicativos: {
    nombre: string;
    name: string;
    nom: string;
    iso2: string;
    iso3: string;
    phone_code: string;
  }[];
  departamentos: string[];
  ciudades: string[];
  ciudadesOrigen: any;
  @Output() overridePedido = new EventEmitter<Pedido>();
  @Output() generarFacturaChange = new EventEmitter<boolean>();
  idenxFacturacion: any;
  private originalAliasFact: string;
  editandodato: boolean;
  alias_entrega: string;
  nombres_entrega: string;
  indicativo_celular_entrega: string;
  numero_celular_entrega: string;
  otro_numero_entrega: string;
  direccion_entrega: string;
  observaciones: string;
  departamento_entrega: string;
  ciudad_municipio_entrega: string;
  zona_cobro: string;
  valor_zona_cobro: string;
  codigo_postal_entrega: string;
  pais_entrega: string;
  constructor(
    private inforPaises: InfoPaises,
    private modalService: NgbModal,
    private service: MaestroService,
    private infoIndicativo: InfoIndicativos,
  ) {
    this.paises = this.inforPaises.paises.map((x) => {
      return x.Pais;
    });
    this.indicativos = this.infoIndicativo.datos;
  }
  ngAfterContentInit(): void {
    if (this.isEdit) {
      const data = {
        documento: this.documentoBusqueda,
      };
      this.datosFacturacionElectronica = [];
      this.service.getClientByDocument(data).subscribe((res: any) => {
        if (res.datosFacturacionElectronica && Array.isArray(res.datosFacturacionElectronica)) {
          res.datosFacturacionElectronica.forEach((x: any) => {
            this.datosFacturacionElectronica.push(x);
          });
        }

      });
    }
  }

  ngOnInit() {
    // Si se reciben valores por herencia y no hay datos de facturación, crear uno nuevo
    if (
      this.paisInicial &&
      this.departamentoInicial &&
      this.ciudad &&
      this.direccionFacturacion &&
      (!this.datosFacturacionElectronica ||
        this.datosFacturacionElectronica.length === 0)
    ) {
      this.pais = this.paisInicial;
      this.departamento = this.departamentoInicial;
      this.ciudad_municipio = this.ciudad;
      this.direccion_facturacion = this.direccionFacturacion;
      this.codigo_postal = this.codigoPostal;

      // Identificar departamentos y ciudades
      this.identificarDepto();
      this.identificarCiu();

      // Inicializar la lista si es necesario
      if (!this.datosFacturacionElectronica) {
        this.datosFacturacionElectronica = [];
      }
    }
  }

  guardarDatosFacturacionElectronica() {
    const datosFacturacionElec = {
      alias: this.alias_facturacion,
      nombres: this.razon_social,
      tipoDocumento: this.tipo_documento_facturacion,
      documento: this.numero_documento_facturacion,
      indicativoCel: this.indicativo_celular_facturacion,
      celular: this.numero_celular_facturacion,
      correoElectronico: this.correo_electronico_facturacion,
      direccion: this.direccion_facturacion,
      pais: this.pais,
      departamento: this.departamento,
      ciudad: this.ciudad_municipio,
      codigoPostal: this.codigo_postal,
    };
    const data = {
      documento: this.documentoBusqueda,
    };

    this.service.getClientByDocument(data).subscribe((res: any) => {
      // Reconstruir la lista manteniendo el orden correcto
      const nuevaLista = [];

      // Agregar datos del servidor
      if (res.datosFacturacionElectronica && Array.isArray(res.datosFacturacionElectronica)) {
        res.datosFacturacionElectronica.forEach((x) => {
          nuevaLista.push(x);
        });
      }

      // Agregar el nuevo dato
      nuevaLista.push(datosFacturacionElec);

      // Spec 024: mutar en el lugar (no reasignar) — `datosFacturacionElectronica`
      // es un @Input() bindeado en un solo sentido desde el padre; reasignarlo
      // rompe la referencia y el padre la vuelve a pisar en el siguiente ciclo
      // de CD (mismo patrón ya arreglado para edición más abajo en este archivo).
      if (!this.datosFacturacionElectronica) {
        this.datosFacturacionElectronica = [];
      }
      this.datosFacturacionElectronica.splice(0, this.datosFacturacionElectronica.length, ...nuevaLista);

      // ✅ IMPORTANTE: Setear el cd del cliente para que el backend pueda identificarlo
      this.formulario.controls["cd"].setValue(res.cd);
      this.formulario.controls["datosFacturacionElectronica"].setValue(
        this.datosFacturacionElectronica,
      );
      this.formulario.controls["datosEntrega"].setValue(res.datosEntrega);
      this.formulario.controls["notas"].setValue(res.notas);
      this.formulario.controls["estado"].setValue(res.estado);
      this.service.editClient(this.formulario.value).subscribe((r) => {
        // Cerrar modal si está abierto
        this.modalService.dismissAll();

        Swal.fire({
          title: "Guardado!",
          text: "Datos de facturación guardados con éxito",
          icon: "success",
          confirmButtonText: "Ok",
          timer: 2000,
        });

        // Limpiar TODOS los campos del formulario
        this.limpiarVariables();
      });
    });
  }

  seleccionarDireccionFE(index) {
    this.pedidoGral.facturacion = { ...this.datosFacturacionElectronica[index] };

    // Recalcular el costo de envío (domicilio) si hay información de envío
    if (this.pedidoGral.envio && this.pedidoGral.envio.zonaCobro) {
      // Aquí deberías llamar al servicio para recalcular el totalEnvio
      // Por ahora, mantenemos el valor actual
      console.log('Dirección de facturación seleccionada, se debe recalcular totalEnvio');
    }

    this.pedidoGral = { ...this.pedidoGral };

    Swal.fire({
      title: "Datos Seleccionados!",
      text: this.datosFacturacionElectronica[index].alias,
      icon: "success",
      confirmButtonText: "Ok",
    });

    // Siempre emitir el pedido actualizado para que el componente padre pueda guardarlo
    this.overridePedido.emit(this.pedidoGral);

    if (this.isEdit) {
      this.modalService.dismissAll();
    }
  }

  redirectToPostalCode() {
    window.open("https://visor.codigopostal.gov.co/472/visor", "_blank");
  }

  // generarFacturacionElectronica() {
  //   //llamar api para generar la factura
  //   // TODO: llamar api para generar la factura
  //   Swal.fire({
  //     title: "Factura Generada!",
  //     text: "Factura generada con exito",
  //     icon: "success",
  //     confirmButtonText: "Ok",
  //   });
  // }

  identificarDepto() {
    this.inforPaises.paises.map((x) => {
      if (x.Pais == this.pais) {
        this.departamentos = x.Regiones.map((c) => {
          return c.departamento;
        });
      }
    });
  }
  identificarCiu() {
    this.inforPaises.paises.map((x) => {
      if (x.Pais == this.pais) {
        x.Regiones.map((y) => {
          if (y.departamento == this.departamento) {
            this.ciudades = y.ciudades.map((c) => {
              return c;
            });
            this.ciudadesOrigen = this.ciudades.map((city) => ({
              value: city,
              label: city,
            }));
          }
        });
      }
    });
  }

  datosFacElect(event) {
    console.log(event);
    if (this.facturacionElectronica === true) {
      this.razon_social = this.formulario.value.nombres_completos;
      this.tipo_documento_facturacion =
        this.formulario.value.tipo_documento_comprador;
      this.numero_documento_facturacion = this.formulario.value.documento;
      this.indicativo_celular_facturacion =
        this.formulario.value.indicativo_celular_comprador;
      this.numero_celular_facturacion =
        this.formulario.value.numero_celular_comprador;
      this.correo_electronico_facturacion =
        this.formulario.value.correo_electronico_comprador;
      this.direccion_facturacion = this.direccionFacturacion || "";
      this.pais = this.paisInicial || "";
      this.departamento = this.departamentoInicial || "";
      this.ciudad_municipio = this.ciudad || "";
      this.codigo_postal = this.codigoPostal || "";
    } else {
      this.razon_social = "";
      this.tipo_documento_facturacion = "";
      this.numero_documento_facturacion = "";
      this.indicativo_celular_facturacion = "";
      this.numero_celular_facturacion = "";
      this.correo_electronico_facturacion = "";
    }
  }
  editarDatos1(modal, index) {
    this.idenxFacturacion = index;
    this.originalAliasFact = this.datosFacturacionElectronica[index].alias;
    this.editandodato = true;
    this.alias_facturacion = this.datosFacturacionElectronica[index].alias;
    this.razon_social = this.datosFacturacionElectronica[index].nombres;
    this.tipo_documento_facturacion =
      this.datosFacturacionElectronica[index].tipoDocumento;
    this.numero_documento_facturacion =
      this.datosFacturacionElectronica[index].documento;
    this.indicativo_celular_facturacion =
      this.datosFacturacionElectronica[index].indicativoCel;
    this.numero_celular_facturacion =
      this.datosFacturacionElectronica[index].celular;
    this.correo_electronico_facturacion =
      this.datosFacturacionElectronica[index].correoElectronico;
    this.direccion_facturacion =
      this.datosFacturacionElectronica[index].direccion;
    this.pais = this.datosFacturacionElectronica[index].pais;
    this.departamento = this.datosFacturacionElectronica[index].departamento;
    this.ciudad_municipio = this.datosFacturacionElectronica[index].ciudad;
    this.codigo_postal = this.datosFacturacionElectronica[index].codigoPostal;
    this.identificarDepto();
    this.identificarCiu();
    this.modalService.open(modal, { size: "lg" }).result.then(
      () => {
        this.limpiarVariables();
      },
      () => {
        // Esto se ejecutará cuando el modal se cierre sin completarse (por ejemplo, al hacer clic fuera del modal)
        this.limpiarVariables();
      },
    );
  }
  eliminarDato(index: number): void {
    // Eliminar el elemento en el índice especificado
    this.datosFacturacionElectronica.splice(index, 1);
    const data = {
      documento: this.formulario.value.documento,
    };
    this.service.getClientByDocument(data).subscribe((res: any) => {
      // ✅ IMPORTANTE: Setear el cd del cliente para que el backend pueda identificarlo
      this.formulario.controls["cd"].setValue(res.cd);
      this.formulario.controls["datosFacturacionElectronica"].setValue(
        this.datosFacturacionElectronica,
      );
      this.formulario.controls["datosEntrega"].setValue(res.datosEntrega);
      this.formulario.controls["notas"].setValue(res.notas);
      this.formulario.controls["estado"].setValue(res.estado);
      this.service.editClient(this.formulario.value).subscribe((r) => {
        console.log(r);
        Swal.fire({
          title: "Eliminado!",
          text: "Eliminado con exito",
          icon: "success",
          confirmButtonText: "Ok",
        });
      });
    });
  }
  editarDatosFacturacion() {
    const datosFacturacionElec = {
      alias: this.alias_facturacion,
      nombres: this.razon_social,
      tipoDocumento: this.tipo_documento_facturacion,
      documento: this.numero_documento_facturacion,
      indicativoCel: this.indicativo_celular_facturacion,
      celular: this.numero_celular_facturacion,
      correoElectronico: this.correo_electronico_facturacion,
      direccion: this.direccion_facturacion,
      pais: this.pais,
      departamento: this.departamento,
      ciudad: this.ciudad_municipio,
      codigoPostal: this.codigo_postal,
    };
    this.datosFacturacionElectronica[this.idenxFacturacion] =
      datosFacturacionElec;

    // Si los datos editados son los que están en uso en el pedido, actualizarlos
    if (this.pedidoGral?.facturacion && this.pedidoGral.facturacion.alias === this.originalAliasFact) {
      this.pedidoGral.facturacion = { ...datosFacturacionElec };
      this.pedidoGral = { ...this.pedidoGral };
      // Emitir el cambio al componente padre
      this.overridePedido.emit(this.pedidoGral);
    }

    // ✅ REFACTORIZADO: Actualizar solo el array de datosFacturacionElectronica en el formulario
    // El cd ya está en el formulario desde cuando se buscó el cliente
    this.formulario.controls["datosFacturacionElectronica"].setValue(
      this.datosFacturacionElectronica,
    );

    // ✅ LLAMADA ÚNICA: Solo editClient() - el formulario ya tiene todos los datos
    this.service.editClient(this.formulario.value).subscribe({
      next: (r) => {
        // Cerrar el modal después de guardar exitosamente
        this.modalService.dismissAll();

        // Resetear el flag de edición
        this.editandodato = false;

        // Recargar los datos del servidor para actualizar la lista
        this.service
          .getClientByDocument({ documento: this.documentoBusqueda })
          .subscribe((clientRes: any) => {
            if (
              clientRes &&
              clientRes.datosFacturacionElectronica &&
              Array.isArray(clientRes.datosFacturacionElectronica)
            ) {
              // Actualizar en-place para que Angular no sobreescriba con el array viejo del padre
              this.datosFacturacionElectronica.splice(0, this.datosFacturacionElectronica.length, ...clientRes.datosFacturacionElectronica);
            }
          });

        Swal.fire({
          title: "Editado!",
          text: "Editado con éxito",
          icon: "success",
          confirmButtonText: "Ok",
          timer: 2000,
        });

        // Limpiar variables de facturación
        this.alias_facturacion = "";
        this.razon_social = "";
        this.tipo_documento_facturacion = "";
        this.numero_documento_facturacion = "";
        this.indicativo_celular_facturacion = "";
        this.numero_celular_facturacion = "";
        this.correo_electronico_facturacion = "";
        this.direccion_facturacion = "";
        this.pais = "";
        this.departamento = "";
        this.ciudad_municipio = "";
        this.codigo_postal = "";
      },
      error: (err) => {
        console.error("Error al editar datos de facturación:", err);
        Swal.fire({
          title: "Error",
          text: "No se pudieron guardar los datos de facturación. Por favor intente nuevamente.",
          icon: "error",
          confirmButtonText: "Ok",
        });
      }
    });
  }
  limpiarVariables() {
    // Variables de control
    this.editandodato = false;
    this.idenxFacturacion = null;

    // Variables de entrega (si se usan en este componente)
    this.alias_entrega = "";
    this.nombres_entrega = "";
    this.indicativo_celular_entrega = "";
    this.numero_celular_entrega = "";
    this.otro_numero_entrega = "";
    this.direccion_entrega = "";
    this.observaciones = "";
    this.pais_entrega = "";
    this.departamento_entrega = "";
    this.ciudad_municipio_entrega = "";
    this.zona_cobro = "";
    this.valor_zona_cobro = "";
    this.codigo_postal_entrega = "";

    // Variables de facturación
    this.facturacionElectronica = false;
    this.alias_facturacion = "";
    this.razon_social = "";
    this.tipo_documento_facturacion = "";
    this.numero_documento_facturacion = "";
    this.indicativo_celular_facturacion = "";
    this.numero_celular_facturacion = "";
    this.correo_electronico_facturacion = "";
    this.direccion_facturacion = "";
    this.pais = "";
    this.departamento = "";
    this.ciudad_municipio = "";
    this.codigo_postal = "";
  }

  // Método para verificar si ya existe un consumidor final en la lista
  // Busca por documento "222222222222" o por alias "Consumidor Final" para evitar duplicados
  existeConsumidorFinal(): boolean {
    if (!this.datosFacturacionElectronica || !Array.isArray(this.datosFacturacionElectronica)) return false;
    return this.datosFacturacionElectronica.some(
      (item) =>
        item.documento === "222222222222" ||
        item.alias?.toLowerCase() === "consumidor final" ||
        item.nombres?.toLowerCase() === "consumidor final",
    );
  }

  // Método para eliminar duplicados de consumidor final de la lista
  eliminarDuplicadosConsumidorFinal(): void {
    if (!this.datosFacturacionElectronica || !Array.isArray(this.datosFacturacionElectronica)) return;

    let encontradoPrimero = false;
    this.datosFacturacionElectronica = this.datosFacturacionElectronica.filter((item) => {
      const esConsumidorFinal =
        item.documento === "222222222222" ||
        item.alias?.toLowerCase() === "consumidor final" ||
        item.nombres?.toLowerCase() === "consumidor final";

      if (esConsumidorFinal) {
        if (encontradoPrimero) {
          // Ya encontramos uno antes, este es duplicado, eliminarlo
          return false;
        }
        encontradoPrimero = true;
      }
      return true;
    });
  }

  // Método para agregar un consumidor final a la lista de facturación
  // IMPORTANTE: Usar documento "222222222222" consistente con crear-ventas.component
  agregarConsumidorFinal(): void {
    // Primero eliminar duplicados si existen
    this.eliminarDuplicadosConsumidorFinal();

    // Datos actualizados del consumidor final según normativa colombiana
    const consumidorFinal = {
      alias: "Consumidor Final",
      nombres: "CONSUMIDOR FINAL",
      tipoDocumento: "CC",
      documento: "222222222222",
      indicativoCel: "57",
      celular: "0000000000",
      correoElectronico: "consumidorfinal@katuq.com",
      direccion: "N/A",
      pais: "Colombia",
      departamento: "N/A",
      ciudad: "N/A",
      codigoPostal: "000000",
    };

    // Asegurar que la lista esté inicializada
    if (!this.datosFacturacionElectronica) {
      this.datosFacturacionElectronica = [];
    }

    // Buscar si ya existe un consumidor final para actualizarlo
    const index = this.datosFacturacionElectronica.findIndex(
      (item) =>
        item.documento === "222222222222" ||
        item.alias?.toLowerCase() === "consumidor final" ||
        item.nombres?.toLowerCase() === "consumidor final"
    );

    if (index >= 0) {
      // Actualizar el consumidor final existente con los nuevos datos
      this.datosFacturacionElectronica[index] = consumidorFinal;
    } else {
      // Agregar un nuevo consumidor final
      this.datosFacturacionElectronica.push(consumidorFinal);
    }
  }

  seleccionarConsumidorFinal(): void {
    // Asegurar que el consumidor final exista en la lista
    this.agregarConsumidorFinal();

    // Buscar el índice del consumidor final
    const index = this.datosFacturacionElectronica.findIndex(
      (item) =>
        item.documento === "222222222222" ||
        item.alias?.toLowerCase() === "consumidor final" ||
        item.nombres?.toLowerCase() === "consumidor final"
    );

    if (index >= 0) {
      this.seleccionarDireccionFE(index);
    }
  }

  quitarDireccionFacturacion(): void {
    Swal.fire({
      title: "¿Estás seguro?",
      text: "¿Deseas quitar la dirección de facturación del pedido?",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#d33",
      cancelButtonColor: "#3085d6",
      confirmButtonText: "Sí, quitar dirección",
      cancelButtonText: "Cancelar",
    }).then((result) => {
      if (result.isConfirmed) {
        // Quitar la dirección de facturación
        this.pedidoGral.facturacion = undefined;
        
        // Recalcular el costo de envío (domicilio) si es necesario
        if (this.pedidoGral.envio && this.pedidoGral.envio.zonaCobro) {
          // Si hay zona de cobro, recalcular el costo de envío
          this.pedidoGral.totalEnvio = this.calcularCostoEnvio(this.pedidoGral.envio.zonaCobro);
        } else {
          // Si no hay zona de cobro, el envío es 0
          this.pedidoGral.totalEnvio = 0;
        }
        
        // Emitir el pedido actualizado
        if (this.isEdit) {
          this.overridePedido.emit(this.pedidoGral);
        }
        
        Swal.fire({
          title: "Dirección Quitada",
          text: "La dirección de facturación ha sido removida del pedido.",
          icon: "success",
          confirmButtonText: "Aceptar",
        });
      }
    });
  }

  private calcularCostoEnvio(zonaCobro: string): number {
    // Aquí deberías implementar la lógica para calcular el costo de envío
    // basado en la zona de cobro. Por ahora retorno 0 como valor por defecto
    // TODO: Implementar cálculo real del costo de envío
    return 0;
  }

  /**
   * Emite el cambio del checkbox de generar factura electrónica
   * @param value - Nuevo valor del checkbox
   */
  onGenerarFacturaChange(value: boolean): void {
    this.generarFacturaChange.emit(value);
  }

  abrirModalCrearFacturacion(modal): void {
    this.limpiarVariables();
    this.modalService.open(modal, { size: "lg" }).result.then(
      () => {
        this.limpiarVariables();
      },
      () => {
        this.limpiarVariables();
      },
    );
  }

  trackByIndex(index: number, item: any): number {
    return index;
  }
}
