import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  Input,
  OnChanges,
  OnDestroy,
  OnInit,
  SimpleChanges,
} from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { Subscription } from 'rxjs';
import Swal from 'sweetalert2';
import { sesionEsAdministrador } from '../paginas/sesion-katuq';
import { EnVivoEstadoService } from '../servicios/en-vivo-estado.service';
import { EnVivoService } from '../servicios/en-vivo.service';

/** El nombre del comercio va dentro del HTML del aviso. */
function escapar(texto: string): string {
  return texto.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' } as Record<string, string>)[c]);
}

/**
 * Botón "Opttia" del encabezado de "En vivo" (D-386): prende o apaga a Opttia para la empresa de
 * la sesión. En "Katuq en vivo" (sesión de Julsmind) es el de toda la plataforma, y mirando un
 * comercio desde Katuq (`comercio`), el de ese comercio. Solo lo ven el
 * Administrador y el Super Administrador; el servidor rechaza a los demás. Con el interruptor general
 * del servidor apagado (`EN_VIVO_OPTTIA=false`) queda deshabilitado: "apagado por Katuq".
 *
 * Tras guardar, `EnVivoEstadoService.cambiarOpttia` lo muestra o lo esconde sin recargar.
 */
@Component({
  selector: 'app-en-vivo-opttia-interruptor',
  templateUrl: './en-vivo-opttia-interruptor.component.html',
  styleUrls: ['./en-vivo-opttia-interruptor.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EnVivoOpttiaInterruptorComponent implements OnInit, OnChanges, OnDestroy {
  /** true en "Katuq en vivo": el aviso dice que aplica a todos los comercios juntos. */
  @Input() katuq = false;
  /** Comercio ajeno que mira una sesión de Katuq (`?empresa=`): el botón cambia el de ese comercio. */
  @Input() comercio?: string;

  /** null hasta que responde el servidor (o si no se puede leer): el botón no se pinta. */
  activado: boolean | null = null;
  general = true;
  guardando = false;

  private readonly suscripciones = new Subscription();
  /** Lectura en curso: al cambiar de comercio se cancela, para que una respuesta tardía no pise la nueva. */
  private lectura: Subscription | null = null;

  constructor(
    private readonly api: EnVivoService,
    private readonly estado: EnVivoEstadoService,
    private readonly cambios: ChangeDetectorRef,
    private readonly translate: TranslateService
  ) {}

  ngOnInit(): void {
    this.cargar();
  }

  /** Se pasó a mirar otro comercio sin destruir el botón: lee el interruptor de ese. */
  ngOnChanges(cambios: SimpleChanges): void {
    if (cambios.comercio && !cambios.comercio.firstChange) this.cargar();
  }

  private cargar(): void {
    if (!sesionEsAdministrador()) return;
    this.activado = null;
    this.lectura?.unsubscribe();
    this.lectura = this.api.interruptorOpttia(this.comercio).subscribe({
      next: (r) => {
        this.activado = r?.activado !== false;
        this.general = r?.general !== false;
        this.cambios.markForCheck();
      },
      error: () => {
        this.activado = null;
        this.cambios.markForCheck();
      },
    });
  }

  ngOnDestroy(): void {
    this.lectura?.unsubscribe();
    this.suscripciones.unsubscribe();
  }

  get prendido(): boolean {
    return this.general && this.activado === true;
  }

  get texto(): string {
    if (!this.general) return this.translate.instant('enVivo.enVivoOpttiaInterruptor.apagadoPorKatuq');
    return this.translate.instant(this.activado ? 'enVivo.enVivoOpttiaInterruptor.prendido' : 'enVivo.enVivoOpttiaInterruptor.apagado');
  }

  get titulo(): string {
    if (!this.general) return this.translate.instant('enVivo.enVivoOpttiaInterruptor.descKatuqApago');
    return this.translate.instant(this.activado ? 'enVivo.enVivoOpttiaInterruptor.descPrendido' : 'enVivo.enVivoOpttiaInterruptor.descApagado');
  }

  cambiar(): void {
    if (this.activado === null || !this.general || this.guardando) return;
    const nuevo = !this.activado;
    const donde = this.katuq
      ? this.translate.instant('enVivo.enVivoOpttiaInterruptor.alcanceKatuq')
      : this.comercio
        ? this.translate.instant('enVivo.enVivoOpttiaInterruptor.alcanceComercio', { comercio: escapar(this.comercio) })
        : this.translate.instant('enVivo.enVivoOpttiaInterruptor.alcanceEmpresa');
    const alcance = `<p style="color:#6b7280;margin:12px 0 0;font-size:13px;">${donde}</p>`;
    Swal.fire({
      title: this.translate.instant(nuevo ? 'enVivo.enVivoOpttiaInterruptor.tituloPrender' : 'enVivo.enVivoOpttiaInterruptor.tituloApagar'),
      html:
        this.translate.instant(nuevo ? 'enVivo.enVivoOpttiaInterruptor.textoPrender' : 'enVivo.enVivoOpttiaInterruptor.textoApagar') + alcance,
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: this.translate.instant(nuevo ? 'enVivo.enVivoOpttiaInterruptor.siPrender' : 'enVivo.enVivoOpttiaInterruptor.siApagar'),
      cancelButtonText: this.translate.instant('comun.cancelar'),
    }).then((r) => {
      if (!r.isConfirmed) return;
      this.guardando = true;
      this.cambios.markForCheck();
      this.suscripciones.add(
        this.api.guardarInterruptorOpttia(nuevo, this.comercio).subscribe({
          next: () => {
            this.activado = nuevo;
            this.guardando = false;
            this.estado.cambiarOpttia(nuevo);
            this.cambios.markForCheck();
          },
          error: (e) => {
            this.guardando = false;
            this.cambios.markForCheck();
            Swal.fire(this.translate.instant('comun.error'), e?.error?.message || this.translate.instant('enVivo.enVivoOpttiaInterruptor.noSeGuardo'), 'error');
          },
        })
      );
    });
  }
}
