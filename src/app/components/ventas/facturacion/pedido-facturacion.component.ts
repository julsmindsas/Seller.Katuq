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
  styleUrls: ["pedido-facturacion.component.scss"],
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

  /**
   * Ticket 1029 (ALMARA): los datos de facturación se guardaban con lo que
   * hubiera, y con eso se emitía la factura electrónica. Un documento "-4" hizo
   * que una factura saliera a nombre de otra persona (ticket 1028). Acá se exige
   * lo mínimo con lo que una factura ante la DIAN sale bien y se explica qué falta.
   * Devuelve true si los datos sirven para facturar.
   */
  validarDatosFacturacion(): boolean {
    const faltan: string[] = [];
    const razon = String(this.razon_social || "").trim();
    const tipo = String(this.tipo_documento_facturacion || "").trim();
    const doc = String(this.numero_documento_facturacion || "").trim();
    const correo = String(this.correo_electronico_facturacion || "").trim();
    const celular = String(this.numero_celular_facturacion || "").trim();
    const ciudad = String(this.ciudad_municipio || "").trim();
    const depto = String(this.departamento || "").trim();

    if (razon.length < 3) { faltan.push("Razón social o nombre completo"); }
    if (!tipo) { faltan.push("Tipo de documento"); }
    if (!doc) { faltan.push("Número de documento"); }
    // Ticket 1040 (OH MY STORE): decir solo "Ciudad" dejaba al vendedor sin
    // salida, porque la ciudad es un desplegable en cascada que permanece
    // vacío hasta elegir el departamento. El aviso ahora dice qué hacer.
    if (!ciudad) {
      faltan.push(
        depto
          ? "Ciudad"
          : "Departamento y luego Ciudad (la lista de ciudades se llena al elegir el departamento)",
      );
    }
    if (!celular) { faltan.push("Celular"); }
    if (!correo || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(correo)) { faltan.push("Correo electrónico válido"); }

    // El documento debe tener forma de documento: el "-4" no pasa.
    let docInvalido = "";
    if (doc) {
      const limpio = doc.replace(/[\s.]/g, "").toUpperCase();
      if (tipo === "NIT") {
        if (!/^\d{6,12}(-\d)?$/.test(limpio)) { docInvalido = "El NIT debe ser numérico, con el dígito de verificación opcional después de un guion (ej: 901072822-4)."; }
      } else if (tipo === "PA") {
        if (!/^[A-Z0-9]{4,20}$/.test(limpio)) { docInvalido = "El pasaporte debe tener solo letras y números (entre 4 y 20)."; }
      } else if (!/^\d{4,15}$/.test(limpio.split("-")[0])) {
        docInvalido = "El número de documento debe ser numérico (entre 4 y 15 dígitos).";
      }
    }

    if (!faltan.length && !docInvalido) { return true; }

    const partes: string[] = [];
    if (faltan.length) {
      partes.push(`<b>Faltan o están mal:</b><ul style="text-align:left;margin:8px 0 0 18px">${faltan.map((f) => `<li>${f}</li>`).join("")}</ul>`);
    }
    if (docInvalido) { partes.push(`<div style="text-align:left;margin-top:8px">${docInvalido}</div>`); }
    Swal.fire({
      icon: "warning",
      title: "Revisa los datos de facturación",
      html: partes.join(""),
      footer: "Con estos datos se emite la factura electrónica; si están mal, la factura sale mal.",
      confirmButtonText: "Corregir",
    });
    return false;
  }

  guardarDatosFacturacionElectronica(): boolean {
    if (!this.validarDatosFacturacion()) { return false; }
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

    // Ticket 1041: sin documento del cliente o sin formulario, la consulta
    // fallaba en silencio y "Guardar" no hacia nada. Ahora se avisa.
    if (!this.documentoBusqueda || !this.formulario) {
      Swal.fire({
        title: "No se pudo guardar",
        text: "Primero busque y seleccione el cliente del pedido; los datos de facturación se guardan sobre ese cliente.",
        icon: "warning",
        confirmButtonText: "Ok",
      });
      return false;
    }

    // Guarda el dato sobre la ficha `res` (la que devolvió el servidor o, si el
    // documento está repetido, la que el pedido ya tenía seleccionada).
    const guardarSobreFicha = (res: any) => {
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
      this.service.editClient(this.formulario.value).subscribe({
        next: (r) => {
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
        },
        error: (err) => {
          console.error("Error al guardar dirección de facturación:", err);
          Swal.fire({
            title: "Error",
            text: "No se pudo guardar la dirección de facturación. Intente nuevamente.",
            icon: "error",
            confirmButtonText: "Ok",
          });
        },
      });
    };

    this.service.getClientByDocument(data).subscribe({
      next: (res: any) => guardarSobreFicha(res),
      error: (err) => {
        // Ticket 1041: cuando hay varias fichas con el mismo documento el
        // servidor responde 409 y no elige ninguna. Pero el pedido YA sabe cuál
        // ficha eligió el vendedor (formulario.cd) y ya tiene su lista de datos
        // de facturación cargada, así que se guarda sobre esa sin volver a buscar.
        const cdSeleccionado = this.formulario?.value?.cd;
        if (err?.status === 409 && cdSeleccionado) {
          guardarSobreFicha({
            cd: cdSeleccionado,
            datosFacturacionElectronica: Array.isArray(this.datosFacturacionElectronica)
              ? [...this.datosFacturacionElectronica]
              : [],
            datosEntrega: this.formulario.value.datosEntrega,
            notas: this.formulario.value.notas,
            estado: this.formulario.value.estado,
          });
          return;
        }
        console.error("Error consultando el cliente para guardar facturación:", err);
        Swal.fire({
          title: "No se pudo guardar",
          text: err?.error?.error || err?.error?.message ||
            "No se pudo consultar el cliente del pedido. Intente de nuevo.",
          icon: "error",
          confirmButtonText: "Ok",
        });
      },
    });
    // El modal lo cierra el exito del guardado (dismissAll). Devolver false evita
    // que el `&& modal.dismiss('Save')` del template lo cierre antes de tiempo y
    // deje al usuario sin ver el aviso de error, con los datos perdidos.
    return false;
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
      // Ticket 1041: se asignaba el pais y el departamento pero no se cargaban
      // sus listas (eso solo pasaba al CAMBIAR el select). El desplegable de
      // departamentos salia vacio hasta cambiar de pais y volver a Colombia.
      this.identificarDepto();
      this.identificarCiu();
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
  editarDatosFacturacion(): boolean {
    if (!this.validarDatosFacturacion()) { return false; }
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
        
        // Recalcular el costo de envío (domicilio) si es necesario.
        // G2 (spec 010): un código de envío gratis fuerza el envío a 0.
        if (this.pedidoGral?.descuentoAplicado?.tipo === 'envio_gratis') {
          this.pedidoGral.totalEnvio = 0;
        } else if (this.pedidoGral.envio && this.pedidoGral.envio.zonaCobro) {
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
    // Ticket 1041: arrancar con el pais del cliente (o Colombia) y sus
    // departamentos ya cargados, para que el desplegable no salga vacio.
    this.pais = this.paisInicial || "Colombia";
    this.identificarDepto();
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
