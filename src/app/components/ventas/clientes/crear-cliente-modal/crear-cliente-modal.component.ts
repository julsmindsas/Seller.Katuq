import { Component, Input, OnInit } from "@angular/core";
import { FormGroup, FormBuilder, Validators } from "@angular/forms";
import { NgbActiveModal } from "@ng-bootstrap/ng-bootstrap";
import { MaestroService } from "../../../../shared/services/maestros/maestro.service";
import Swal from "sweetalert2";
import { InfoIndicativos } from "../../../../../Mock/indicativosPais"; // Importa el mock

@Component({
  selector: "app-crear-cliente-modal",
  templateUrl: "./crear-cliente-modal.component.html",
  styleUrls: ["./crear-cliente-modal.component.scss"],
})
export class CrearClienteModalComponent implements OnInit {
  @Input() clienteData: any;
  @Input() isEdit: boolean = false;
  @Input() documentoPrellenado: string = "";

  formulario: FormGroup;
  indicativos: any[] = []; // Usa directamente el mock

  constructor(
    private fb: FormBuilder,
    private maestroService: MaestroService,
    public activeModal: NgbActiveModal,
    private infoIndicativos: InfoIndicativos,
  ) {
    this.initForm();
  }

  ngOnInit(): void {
    // Ya no necesitamos cargarIndicativos() ya que usamos el mock directamente
    this.indicativos = this.infoIndicativos.datos;

    if (this.clienteData && this.isEdit) {
      console.log(
        "📝 Modo edición - cargando datos del cliente:",
        this.clienteData,
      );
      this.formulario.patchValue(this.clienteData);

      // Si estamos editando y no hay datos de WhatsApp, replicamos automáticamente
      if (
        !this.clienteData.indicativo_celular_whatsapp &&
        !this.clienteData.numero_celular_whatsapp
      ) {
        this.replicarWhatsApp({ target: { checked: true } });
      }
    } else {
      console.log("➕ Modo creación");
      // Resetear el formulario para asegurar datos limpios
      this.formulario.reset();

      // Establecer valores por defecto
      this.formulario.patchValue({
        tipo_documento_comprador: "",
        documento: this.documentoPrellenado || "",
        nombres_completos: "",
        apellidos_completos: "",
        indicativo_celular_comprador: "57",
        numero_celular_comprador: "",
        correo_electronico_comprador: "",
        indicativo_celular_whatsapp: "57",
        numero_celular_whatsapp: "",
        estado: "activo",
      });

      console.log("✅ Formulario inicializado con valores por defecto");
    }
  }

  initForm() {
    this.formulario = this.fb.group({
      tipo_documento_comprador: ["", Validators.required],
      documento: ["", Validators.required],
      nombres_completos: ["", Validators.required],
      apellidos_completos: ["", Validators.required],
      indicativo_celular_comprador: ["57", Validators.required],
      numero_celular_comprador: [
        "",
        [Validators.required, Validators.pattern(/^[0-9]*$/)],
      ],
      correo_electronico_comprador: [
        "",
        [Validators.required, Validators.email],
      ],
      indicativo_celular_whatsapp: ["57"],
      numero_celular_whatsapp: [""],
      whatsappSameAsPhone: [false],
      estado: ["activo"],
    });

    console.log("🏗️ Formulario inicializado");
  }

  // Eliminamos el método cargarIndicativos() ya que no es necesario

  validarSoloNumeros(event: any) {
    const pattern = /[0-9]/;
    const inputChar = String.fromCharCode(event.charCode);

    if (!pattern.test(inputChar)) {
      event.preventDefault();
    }
  }

  replicarWhatsApp(event: any) {
    if (event.target.checked) {
      this.formulario.patchValue({
        indicativo_celular_whatsapp: this.formulario.get(
          "indicativo_celular_comprador",
        )?.value,
        numero_celular_whatsapp: this.formulario.get("numero_celular_comprador")
          ?.value,
      });

      // Deshabilitamos los controles de WhatsApp cuando están replicados
      this.formulario.get("indicativo_celular_whatsapp")?.disable();
      this.formulario.get("numero_celular_whatsapp")?.disable();
    } else {
      // Habilitamos los controles si desmarcan la casilla
      this.formulario.get("indicativo_celular_whatsapp")?.enable();
      this.formulario.get("numero_celular_whatsapp")?.enable();
    }
  }

  guardarCliente() {
    console.log("💾 Iniciando guardado de cliente");
    console.log("📋 Formulario válido:", this.formulario.valid);
    console.log("🔄 Es edición:", this.isEdit);

    if (this.formulario.invalid) {
      console.log("❌ Formulario inválido:", this.formulario.errors);
      this.marcarControlesComoTocados();
      Swal.fire(
        "Error",
        "Por favor complete todos los campos requeridos",
        "error",
      );
      return;
    }

    // Usamos getRawValue() para incluir los controles disabled
    const formValue = this.formulario.getRawValue();
    console.log("📝 Valores del formulario:", formValue);

    const clienteData = {
      ...formValue,
      // Convertimos los números de teléfono a Number
      numero_celular_comprador: Number(formValue.numero_celular_comprador),
      numero_celular_whatsapp: formValue.numero_celular_whatsapp
        ? Number(formValue.numero_celular_whatsapp)
        : null,
    };

    console.log("👤 Datos del cliente procesados:", clienteData);

    if (this.isEdit) {
      console.log("✏️ Ejecutando edición de cliente");
      this.editarCliente(clienteData);
    } else {
      console.log("➕ Ejecutando creación de cliente");
      this.crearCliente(clienteData);
    }
  }

  private crearCliente(clienteData: any) {
    console.log("📝 Datos del cliente a crear:", clienteData);
    this.maestroService.createClient(clienteData).subscribe({
      next: (response: any) => {
        console.log("✅ Respuesta del servidor al crear cliente:", response);

        // Cerrar el SweetAlert inmediatamente para evitar conflictos
        Swal.close();

        // Devolver el cliente creado para asociarlo automáticamente
        const clienteCreado = response.cliente || response || clienteData;

        // Asegurar que el cliente tenga todos los campos necesarios
        const clienteCompleto = {
          ...clienteData,
          ...clienteCreado,
          id: clienteCreado.id || clienteCreado._id,
        };

        console.log("👤 Cliente creado para retornar:", clienteCompleto);

        const resultadoModal = {
          cliente: clienteCompleto,
          isEdit: false,
          action: "created",
        };
        console.log("📦 Resultado completo del modal:", resultadoModal);

        this.activeModal.close(resultadoModal);
      },
      error: (error) => {
        console.error("Error al crear cliente:", error);
        Swal.fire("Error", "Ocurrió un error al crear el cliente", "error");
      },
    });
  }

  private editarCliente(clienteData: any) {
    const clienteActualizado = {
      ...clienteData,
      id: this.clienteData.id, // Asegurarnos de incluir el ID
    };

    console.log("📝 Datos del cliente a actualizar:", clienteActualizado);

    this.maestroService.editClient(clienteActualizado).subscribe({
      next: (response: any) => {
        console.log("✅ Respuesta del servidor al editar cliente:", response);

        // Cerrar el SweetAlert inmediatamente
        Swal.close();

        // Devolver el cliente actualizado para mantenerlo asociado
        const clienteRespuesta =
          response.cliente || response || clienteActualizado;

        // Asegurar que mantenga todos los datos necesarios
        const clienteCompleto = {
          ...this.clienteData,
          ...clienteActualizado,
          ...clienteRespuesta,
          id: clienteRespuesta.id || this.clienteData.id,
        };

        console.log("👤 Cliente editado para retornar:", clienteCompleto);

        const resultadoModal = {
          cliente: clienteCompleto,
          isEdit: true,
          action: "updated",
        };
        console.log(
          "📦 Resultado completo del modal de edición:",
          resultadoModal,
        );

        this.activeModal.close(resultadoModal);
      },
      error: (error) => {
        console.error("Error al actualizar cliente:", error);
        Swal.fire(
          "Error",
          "Ocurrió un error al actualizar el cliente",
          "error",
        );
      },
    });
  }

  private marcarControlesComoTocados() {
    Object.values(this.formulario.controls).forEach((control) => {
      control.markAsTouched();
    });
  }
}
