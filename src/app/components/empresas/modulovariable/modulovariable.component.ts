import { Component, OnInit } from '@angular/core';
import Swal from 'sweetalert2';
import { ModoPrecio, PricingModeService } from 'src/app/shared/services/empresas/pricing-mode.service';

@Component({
    selector: 'app-modulovariable',
    templateUrl: './modulovariable.component.html',
    styleUrls: ['./modulovariable.component.scss']
})

export class ModuloVariableComponent implements OnInit {
    /** Modo de precios de la empresa. `null` = todavía no eligió. */
    modoPrecio: ModoPrecio = null;
    cargandoModo = true;
    guardandoModo = false;
    /** Solo el administrador de la empresa puede cambiarlo. */
    puedeEditarModo = false;

    constructor(private pricingMode: PricingModeService) { }

    ngOnInit() {
        this.puedeEditarModo = this.pricingMode.puedeEditar();
        this.cargarModo();
    }

    private cargarModo() {
        this.cargandoModo = true;
        this.pricingMode.getModo(true).subscribe({
            next: (modo) => {
                this.modoPrecio = modo;
                this.cargandoModo = false;
            },
            error: () => {
                this.modoPrecio = null;
                this.cargandoModo = false;
            }
        });
    }

    /**
     * Cambia el modo de precios. Pide confirmación porque cambia lo que ve todo
     * el equipo en Lista de Precios; los precios del modo que se apaga NO se
     * borran, solo dejan de mostrarse.
     */
    async seleccionarModo(modo: Exclude<ModoPrecio, null>) {
        if (!this.puedeEditarModo || this.guardandoModo || modo === this.modoPrecio) {
            return;
        }

        const nombre = modo === 'tipoCliente' ? 'Precio por tipo de cliente' : 'Precio por volumen';
        const otro = modo === 'tipoCliente' ? 'Precio por volumen' : 'Precio por tipo de cliente';

        const confirmacion = await Swal.fire({
            title: `¿Manejar ${nombre}?`,
            html: `En <strong>Lista de precios</strong> se mostrará solo la pestaña de
                   <strong>${nombre}</strong> y se ocultará la de <strong>${otro}</strong>.<br><br>
                   Los precios que ya tengas cargados en <strong>${otro}</strong>
                   <u>no se borran</u>: quedan guardados y vuelven a verse si cambias de modo.`,
            icon: 'question',
            showCancelButton: true,
            confirmButtonText: 'Sí, usar este modo',
            cancelButtonText: 'Cancelar',
            confirmButtonColor: '#5F3FE0'
        });

        if (!confirmacion.isConfirmed) {
            return;
        }

        this.guardandoModo = true;
        this.pricingMode.setModo(modo).subscribe({
            next: (confirmado) => {
                this.modoPrecio = confirmado;
                this.guardandoModo = false;
                Swal.fire({
                    icon: 'success',
                    title: 'Modo de precios actualizado',
                    text: `Tu empresa maneja ahora ${nombre}.`,
                    confirmButtonColor: '#5F3FE0'
                });
            },
            error: (err) => {
                this.guardandoModo = false;
                const esPermiso = err?.status === 403;
                Swal.fire({
                    icon: 'error',
                    title: esPermiso ? 'No tienes permiso' : 'No se pudo guardar',
                    text: esPermiso
                        ? 'Solo el administrador de la empresa puede cambiar el modo de precios.'
                        : (err?.error?.error || 'Intenta de nuevo en unos segundos.'),
                    confirmButtonColor: '#5F3FE0'
                });
            }
        });
    }
}
