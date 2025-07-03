import { Component, OnInit } from "@angular/core";
import {
  FormGroup,
  FormBuilder,
  FormControl,
  Validators,
  FormArray,
} from "@angular/forms";
import { Router } from "@angular/router";
import { MaestroService } from "../../../../../shared/services/maestros/maestro.service";
import { DataStoreService } from "src/app/shared/services/dataStoreService";
import Swal from "sweetalert2";

@Component({
  selector: "app-crear-formas-pago",
  templateUrl: "./crear-formas-pago.component.html",
  styleUrls: ["./crear-formas-pago.component.scss"],
})
export class POSCrearFormasPagoComponent implements OnInit {
  fomrasPagoForm: FormGroup;
  editando: boolean = false;
  payEditData: any = null;
  guardando: boolean = false;
  imagenInterna: File | null = null;
  imagenCarrito: File | null = null;

  constructor(
    private fb: FormBuilder,
    private service: MaestroService,
    private dataStore: DataStoreService,
    private router: Router,
  ) {
    this.initializeForm();
  }

  private initializeForm(): void {
    this.fomrasPagoForm = this.fb.group({
      id: [{ value: "", disabled: true }], // ID será automático y readonly
      online: ["", [Validators.required]],
      nombre: [
        "",
        [
          Validators.required,
          Validators.minLength(2),
          Validators.maxLength(100),
        ],
      ],
      posicion: ["", [Validators.required, Validators.min(1)]],
      integracion: ["No", [Validators.required]],
      activo: [true, [Validators.required]],
      descripcionCorreoElectronico: [
        "",
        [Validators.required, Validators.minLength(10)],
      ],
      recordatorioCobro: ["", [Validators.required, Validators.minLength(10)]],
    });

    // Marcar todos los campos como touched para mostrar validaciones desde el inicio
    this.markFormGroupTouched();
  }

  async ngOnInit(): Promise<void> {
    try {
      this.payEditData = await this.dataStore.get("payEdit");

      if (this.payEditData) {
        this.editando = true;
        this.populateFormForEdit();
      } else {
        // Generar ID automático para nuevo registro
        await this.generateAutoId();
      }
    } catch (error) {
      console.error("Error al inicializar el componente:", error);
      this.showErrorMessage("Error al cargar los datos");
    }
  }

  private populateFormForEdit(): void {
    // Habilitar el campo ID temporalmente para actualizarlo
    this.fomrasPagoForm.get("id")?.enable();
    this.fomrasPagoForm.patchValue(this.payEditData);
    // Volver a deshabilitar el campo ID
    this.fomrasPagoForm.get("id")?.disable();
  }

  private async generateAutoId(): Promise<void> {
    try {
      // Consultar todas las formas de pago existentes para generar el próximo ID
      this.service.consultarFormaPagoPOS().subscribe(
        (formasPago: any) => {
          try {
            let maxId = 0;
            if (formasPago && formasPago.length > 0) {
              maxId = Math.max(
                ...formasPago.map((fp: any) => parseInt(fp.id) || 0),
              );
            }
            const nextId = maxId + 1;

            // Habilitar temporalmente para actualizar
            this.fomrasPagoForm.get("id")?.enable();
            this.fomrasPagoForm.get("id")?.setValue(nextId);
            this.fomrasPagoForm.get("id")?.disable();
          } catch (error) {
            console.error("Error al procesar formas de pago:", error);
            // Usar un ID por defecto si hay error
            this.fomrasPagoForm.get("id")?.enable();
            this.fomrasPagoForm.get("id")?.setValue(1);
            this.fomrasPagoForm.get("id")?.disable();
          }
        },
        (error) => {
          console.error("Error al generar ID automático:", error);
          // Usar un ID por defecto si hay error
          this.fomrasPagoForm.get("id")?.enable();
          this.fomrasPagoForm.get("id")?.setValue(1);
          this.fomrasPagoForm.get("id")?.disable();
        },
      );
    } catch (error) {
      console.error("Error en generateAutoId:", error);
    }
  }

  private markFormGroupTouched(): void {
    Object.keys(this.fomrasPagoForm.controls).forEach((key) => {
      const control = this.fomrasPagoForm.get(key);
      if (control) {
        control.markAsTouched();
      }
    });
  }

  guardar(): void {
    if (this.fomrasPagoForm.invalid) {
      this.markFormGroupTouched();
      this.showErrorMessage(
        "Por favor, complete todos los campos obligatorios correctamente.",
      );
      return;
    }

    this.guardando = true;

    // Incluir el ID en el valor del formulario
    const formValue = {
      ...this.fomrasPagoForm.value,
      id: this.fomrasPagoForm.get("id")?.value,
    };

    this.service.crearFormaPagoPOS(formValue).subscribe(
      (response) => {
        console.log("Forma de pago creada:", response);
        this.guardando = false;
        Swal.fire({
          title: "¡Éxito!",
          text: "Forma de pago creada exitosamente",
          icon: "success",
          confirmButtonText: "Ok",
        }).then(() => {
          this.router.navigate(["/extras/pos/formasPago"]);
        });
      },
      (error) => {
        console.error("Error al crear forma de pago:", error);
        this.guardando = false;
        this.showErrorMessage(
          "Error al crear la forma de pago. Intente nuevamente.",
        );
      },
    );
  }

  editar(): void {
    if (this.fomrasPagoForm.invalid) {
      this.markFormGroupTouched();
      this.showErrorMessage(
        "Por favor, complete todos los campos obligatorios correctamente.",
      );
      return;
    }

    this.guardando = true;

    const formValue = {
      ...this.fomrasPagoForm.value,
      id: this.fomrasPagoForm.get("id")?.value,
      cd: this.payEditData.cd,
    };

    this.service.editFormaPagoPOS(formValue).subscribe(
      (response) => {
        console.log("Forma de pago editada:", response);
        this.guardando = false;
        Swal.fire({
          title: "¡Éxito!",
          text: "Forma de pago actualizada exitosamente",
          icon: "success",
          confirmButtonText: "Ok",
        }).then(() => {
          this.router.navigate(["/extras/pos/formasPago"]);
        });
      },
      (error) => {
        console.error("Error al editar forma de pago:", error);
        this.guardando = false;
        this.showErrorMessage(
          "Error al actualizar la forma de pago. Intente nuevamente.",
        );
      },
    );
  }

  cancelar(): void {
    Swal.fire({
      title: "¿Está seguro?",
      text: "Se perderán todos los cambios no guardados",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#3085d6",
      cancelButtonColor: "#d33",
      confirmButtonText: "Sí, cancelar",
      cancelButtonText: "No, continuar",
    }).then((result) => {
      if (result.isConfirmed) {
        this.router.navigate(["/extras/pos/formasPago"]);
      }
    });
  }

  onImageInternaChange(event: any): void {
    const file = event.target.files[0];
    if (file) {
      if (this.validateImageFile(file)) {
        this.imagenInterna = file;
        console.log("Imagen interna seleccionada:", file.name);
      } else {
        event.target.value = ""; // Limpiar el input
      }
    }
  }

  onImageCarritoChange(event: any): void {
    const file = event.target.files[0];
    if (file) {
      if (this.validateImageFile(file)) {
        this.imagenCarrito = file;
        console.log("Imagen carrito seleccionada:", file.name);
      } else {
        event.target.value = ""; // Limpiar el input
      }
    }
  }

  private validateImageFile(file: File): boolean {
    const validTypes = ["image/jpeg", "image/jpg", "image/png", "image/gif"];
    const maxSize = 5 * 1024 * 1024; // 5MB

    if (!validTypes.includes(file.type)) {
      this.showErrorMessage(
        "Por favor, seleccione un archivo de imagen válido (JPEG, PNG, GIF).",
      );
      return false;
    }

    if (file.size > maxSize) {
      this.showErrorMessage("El archivo de imagen debe ser menor a 5MB.");
      return false;
    }

    return true;
  }

  private showErrorMessage(message: string): void {
    Swal.fire({
      title: "Error",
      text: message,
      icon: "error",
      confirmButtonText: "Ok",
    });
  }

  // Getters para facilitar el acceso a los controles del formulario en el template
  get idControl() {
    return this.fomrasPagoForm.get("id");
  }
  get onlineControl() {
    return this.fomrasPagoForm.get("online");
  }
  get nombreControl() {
    return this.fomrasPagoForm.get("nombre");
  }
  get posicionControl() {
    return this.fomrasPagoForm.get("posicion");
  }
  get integracionControl() {
    return this.fomrasPagoForm.get("integracion");
  }
  get activoControl() {
    return this.fomrasPagoForm.get("activo");
  }
  get descripcionCorreoElectronicoControl() {
    return this.fomrasPagoForm.get("descripcionCorreoElectronico");
  }
  get recordatorioCobroControl() {
    return this.fomrasPagoForm.get("recordatorioCobro");
  }
}
