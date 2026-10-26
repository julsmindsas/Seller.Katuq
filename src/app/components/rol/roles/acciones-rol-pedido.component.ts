import { ChangeDetectionStrategy, ChangeDetectorRef, Component, Input, OnChanges } from '@angular/core';
import Swal from 'sweetalert2';
import { OrderActionsService } from '../../../shared/services/ventas/order-actions.service';
import { AccionPedido } from '../../ventas/list/acciones-pedido/acciones-pedido.catalogo';
import { PerfilAccionesRol } from '../../ventas/list/acciones-pedido/acciones-pedido.ocho';
import {
  EstadoAccionesRol, PERFILES_ROL, aplicarPerfil, cambiarAccion, coincideConPerfil, cuerpoGuardarRol,
  estadoInicialRol, opcionesDeLista,
} from './acciones-rol-pedido.logica';

/**
 * D-547 (F2, D18): «Acciones principales del pedido» de un rol, en Roles y permisos. Un administrador escoge un
 * perfil de partida (Caja, Despacho, Comercial o General) y puede cambiar cualquiera de las 4 acciones; se guarda
 * con su propio botón (`PUT /v1/order-actions/roles/:roleId`), aparte de «Actualizar Rol».
 *
 * Solo existe con la bandera `orderPinnedActions` encendida y con un rol ya guardado (lo decide el padre con
 * `*ngIf`). Un rol sin acciones guardadas muestra General marcado y NO genera ninguna petición hasta «Guardar».
 * Estas acciones no dan ni quitan permisos.
 *
 * Artículo IX (excepción acotada como D-054, D-541 y D-543): Angular 14.3 no tiene signals ni `@if`; el
 * componente es OnPush y usa `*ngIf` / `*ngFor`.
 */
@Component({
  selector: 'app-acciones-rol-pedido',
  templateUrl: './acciones-rol-pedido.component.html',
  styleUrls: ['./acciones-rol-pedido.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AccionesRolPedidoComponent implements OnChanges {
  /** `id` del documento del rol (el mismo con que «Actualizar Rol» lo edita). */
  @Input() roleId = '';
  /** Lo que el rol trae guardado en `orderActions` (puede no existir). */
  @Input() orderActions: unknown = null;

  readonly perfiles = PERFILES_ROL;
  estado: EstadoAccionesRol = estadoInicialRol(null);
  guardando = false;
  /** El último guardado de esta pantalla salió bien. */
  guardado = false;

  constructor(private servicio: OrderActionsService, private cdr: ChangeDetectorRef) {}

  ngOnChanges(): void {
    this.estado = estadoInicialRol(this.orderActions);
    this.guardado = false;
  }

  get personalizado(): boolean {
    return !coincideConPerfil(this.estado);
  }

  get tituloPerfil(): string {
    return this.perfiles.find(p => p.id === this.estado.profile)?.titulo || '';
  }

  elegirPerfil(perfil: PerfilAccionesRol): void {
    this.estado = aplicarPerfil(perfil);
    this.guardado = false;
  }

  cambiar(indice: number, id: string): void {
    this.estado = cambiarAccion(this.estado, indice, id);
    this.guardado = false;
  }

  opciones(indice: number): AccionPedido[] {
    return opcionesDeLista(this.estado, indice);
  }

  guardar(): void {
    const cuerpo = cuerpoGuardarRol(this.estado);
    if (!cuerpo || !this.roleId || this.guardando) return;
    this.guardando = true;
    this.servicio.guardarRol(this.roleId, cuerpo.profile, cuerpo.actions).subscribe({
      next: (r) => {
        this.guardando = false;
        this.guardado = true;
        // Lo que confirmó el servidor es lo que queda en pantalla.
        this.estado = estadoInicialRol(r);
        this.cdr.markForCheck();
        Swal.fire({
          icon: 'success',
          title: 'Acciones guardadas', // i18n-ignorar: texto nuevo de la rama principal, sin traducir (pendiente en el ticket de Traducción)
          text: 'Quienes tengan este rol las verán en su siguiente inicio de sesión.', // i18n-ignorar: texto nuevo de la rama principal, sin traducir (pendiente en el ticket de Traducción)
          timer: 2500,
          showConfirmButton: false,
        });
      },
      error: (err) => {
        this.guardando = false;
        this.cdr.markForCheck();
        Swal.fire({
          icon: 'error',
          title: 'No se guardaron las acciones', // i18n-ignorar: texto nuevo de la rama principal, sin traducir (pendiente en el ticket de Traducción)
          text: err?.error?.message || 'No pudimos guardar las acciones del rol. Intenta de nuevo.', // i18n-ignorar: texto nuevo de la rama principal, sin traducir (pendiente en el ticket de Traducción)
          confirmButtonText: 'Ok', // i18n-ignorar: texto nuevo de la rama principal, sin traducir (pendiente en el ticket de Traducción)
          confirmButtonColor: '#5F3FE0',
        });
      },
    });
  }
}
