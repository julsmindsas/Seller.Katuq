import { ChangeDetectionStrategy, ChangeDetectorRef, Component } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { TranslateService } from '@ngx-translate/core';
import { ToastrService } from 'ngx-toastr';

import { MessagingLine } from '../../../../../../shared/services/messaging/messaging.models';
import { ConsolaContextoService } from '../../servicios/consola-contexto.service';
import { SeccionDestino } from './tarjeta-numero.component';

/**
 * Sección «Números» de la consola (D-707): una tarjeta por número con su salud en Meta, el equipo que
 * lo atiende y «Conectar número» (asistente de tres pasos). Los números salen de las líneas del
 * comercio (D-437); no hay otro modelo de asignación.
 */
@Component({
  selector: 'app-consola-numeros',
  templateUrl: './numeros.component.html',
  styleUrls: ['./numeros.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NumerosComponent {
  readonly estado$ = this.contexto.estado$;

  asistenteAbierto = false;
  /** La conexión directa con Meta no está encendida: se explica dónde conectar el número compartido. */
  sinConexionDirecta = false;

  constructor(
    private readonly contexto: ConsolaContextoService,
    private readonly route: ActivatedRoute,
    private readonly router: Router,
    private readonly toastr: ToastrService,
    private readonly translate: TranslateService,
    private readonly cdr: ChangeDetectorRef,
  ) {}

  recargar(): void {
    this.contexto.cargar();
  }

  conectar(): void {
    if (this.contexto.actual.metaDirecto.habilitada) {
      this.sinConexionDirecta = false;
      this.asistenteAbierto = true;
    } else {
      this.sinConexionDirecta = true;
    }
    this.cdr.markForCheck();
  }

  /** El asistente confirmó el número con Meta: ya aparece en la lista. */
  alCrearseLinea(linea: MessagingLine): void {
    this.contexto.poner(linea);
  }

  alTerminarAsistente(linea: MessagingLine | null): void {
    this.asistenteAbierto = false;
    if (linea) {
      this.contexto.poner(linea);
      this.toastr.success(
        this.translate.instant('asistenteConectar.conectado', { linea: linea.displayName || linea.displayPhone }),
      );
    }
    this.cdr.markForCheck();
  }

  alActualizarseLinea(linea: MessagingLine): void {
    this.contexto.poner(linea);
  }

  /** Abre otra sección de la consola con este número escogido. */
  abrir(destino: SeccionDestino, linea: MessagingLine): void {
    this.contexto.seleccionar(linea.id);
    this.router.navigate(['..', destino], {
      relativeTo: this.route,
      queryParams: { linea: linea.id },
      queryParamsHandling: 'merge',
    });
  }

  trackLinea(_: number, linea: MessagingLine): string {
    return linea.id;
  }
}
