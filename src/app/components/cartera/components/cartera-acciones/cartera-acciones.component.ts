import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  ElementRef,
  EventEmitter,
  Input,
  NgZone,
  OnDestroy,
  OnInit,
  Output,
} from '@angular/core';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { CarteraCliente } from '../../../../shared/services/cartera/cartera.models';
import { ModoAccionCartera } from './cartera-accion-modal.component';
import { abrirAccionCartera } from './cartera-accion-abrir';
import { CompanyFeaturesService } from '../../../../shared/services/company-features.service';
import { abrirRecordatorioCobro } from '../../../../shared/components/recordatorio-cobro/recordatorio-cobro-modal.component';
import { abrirPagoGrupo } from '../../../../shared/components/pago-grupo/pago-grupo-modal.component';
import { claveDocumento } from '../../../../shared/utils/clave-documento';
import { esFamiliaAdministrador, normalizarRol } from '../../../../shared/utils/roles';

/** Una entrada del menú «Acciones». */
interface EntradaMenu {
  /** `recordatorio` (tickets 1385 y 1457) abre «Recordar pago»; los demás, la ventana de acciones de la tarjeta. */
  modo: ModoAccionCartera | 'recordatorio';
  icono: string;
  claveTexto: string;
  peligro?: boolean;
}

/**
 * Ticket 1463: menú «Acciones» en el encabezado de la tarjeta de cada cliente de Cartera.
 * Registrar pago, Estado de cuenta (PDF), Compromiso de pago, Registrar gestión, Cupo y plazo y, con la
 * bandera `carteraCastigo` y solo para Administrador, Castigar deuda. Cada acción abre su ventana
 * (`CarteraAccionModalComponent`); este componente no escribe nada por sí mismo.
 * Solo se pinta con la bandera `accionesCartera` encendida (lo decide quien lo usa).
 */
@Component({
  selector: 'app-cartera-acciones',
  templateUrl: './cartera-acciones.component.html',
  styleUrls: ['./cartera-acciones.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CarteraAccionesComponent implements OnInit, OnDestroy {
  @Input() cliente!: CarteraCliente;
  /** Bandera `accionesCartera` (ticket 1463). Sin ella el menú solo trae «Recordar pago», si su bandera está encendida. */
  @Input() accionesActivas = true;
  /** Bandera `carteraCastigo` de la empresa. */
  @Input() castigoActivo = false;
  /** El rol actual es de la familia Administrador (el servidor lo vuelve a exigir). */
  @Input() esAdmin = false;
  /** Algo cambió (compromiso, gestión, cupo, castigo o pago): la pantalla vuelve a pedir la cartera. */
  @Output() cambio = new EventEmitter<void>();

  abierto = false;
  /** El menú se posiciona sobre la ventana (la tarjeta recorta lo que se sale de ella). */
  estiloMenu: { [k: string]: string } = {};
  private alHacerClicFuera = (e: Event) => {
    if (this.abierto && !this.el.nativeElement.contains(e.target as Node)) {
      this.abierto = false;
      this.cdr.markForCheck();
    }
  };

  constructor(
    private el: ElementRef<HTMLElement>,
    private modal: NgbModal,
    private cdr: ChangeDetectorRef,
    private zone: NgZone,
    private features: CompanyFeaturesService,
  ) {}

  private alMoverse = () => {
    if (this.abierto) {
      this.abierto = false;
      this.cdr.markForCheck();
    }
  };

  ngOnInit(): void {
    // Fuera de Angular: no hay que revisar toda la pantalla por cada clic; solo se cierra el menú si estaba abierto.
    this.zone.runOutsideAngular(() => {
      document.addEventListener('click', this.alHacerClicFuera, true);
      window.addEventListener('scroll', this.alMoverse, true);
      window.addEventListener('resize', this.alMoverse);
    });
  }

  ngOnDestroy(): void {
    document.removeEventListener('click', this.alHacerClicFuera, true);
    window.removeEventListener('scroll', this.alMoverse, true);
    window.removeEventListener('resize', this.alMoverse);
  }

  private ubicarMenu(): void {
    const boton = this.el.nativeElement.querySelector<HTMLElement>('.ca-boton');
    if (!boton) return;
    const r = boton.getBoundingClientRect();
    const angosto = window.innerWidth <= 600;
    this.estiloMenu = angosto
      ? { top: `${Math.round(r.bottom + 6)}px`, left: '16px', right: '16px' }
      : { top: `${Math.round(r.bottom + 6)}px`, right: `${Math.max(8, Math.round(window.innerWidth - r.right))}px` };
  }

  get entradas(): EntradaMenu[] {
    const lista: EntradaMenu[] = [];
    if (this.accionesActivas) lista.push({ modo: 'pago', icono: 'pi-wallet', claveTexto: 'cartera.acciones.registrarPago' });
    // Tickets 1385 y 1457: bandera `recordatoriosCobro`.
    if (this.features.isEnabled('recordatoriosCobro')) {
      lista.push({ modo: 'recordatorio', icono: 'pi-send', claveTexto: 'cartera.recordatorio.menu' });
    }
    if (this.accionesActivas) {
      lista.push(
        { modo: 'estadoCuenta', icono: 'pi-file-pdf', claveTexto: 'cartera.acciones.estadoCuenta' },
        { modo: 'compromiso', icono: 'pi-calendar', claveTexto: 'cartera.acciones.compromiso' },
        { modo: 'gestion', icono: 'pi-comments', claveTexto: 'cartera.acciones.gestion' },
        { modo: 'credito', icono: 'pi-credit-card', claveTexto: 'cartera.acciones.cupoPlazo' },
      );
      if (this.castigoActivo && this.esAdmin) {
        lista.push({ modo: 'castigo', icono: 'pi-ban', claveTexto: 'cartera.acciones.castigar', peligro: true });
      }
    }
    return lista;
  }

  alternar(): void {
    this.abierto = !this.abierto;
  }

  cerrar(devolverFoco = false): void {
    this.abierto = false;
    if (devolverFoco) {
      const boton = this.el.nativeElement.querySelector<HTMLElement>('.ca-boton');
      if (boton) boton.focus();
    }
  }

  /** Con el menú abierto, la flecha abajo y arriba mueven entre las opciones. */
  alTeclado(evento: KeyboardEvent): void {
    if (evento.key === 'Escape' && this.abierto) {
      evento.stopPropagation();
      this.cerrar(true);
      return;
    }
    if (!this.abierto || (evento.key !== 'ArrowDown' && evento.key !== 'ArrowUp')) return;
    const items = Array.from(this.el.nativeElement.querySelectorAll<HTMLElement>('.ca-item'));
    if (!items.length) return;
    evento.preventDefault();
    const i = items.indexOf(document.activeElement as HTMLElement);
    const siguiente = evento.key === 'ArrowDown' ? (i + 1) % items.length : (i - 1 + items.length) % items.length;
    items[siguiente].focus();
  }

  abrirMenu(): void {
    this.ubicarMenu();
    this.abierto = true;
    setTimeout(() => {
      const primero = this.el.nativeElement.querySelector<HTMLElement>('.ca-item');
      if (primero) primero.focus();
    });
  }

  /**
   * Ticket 1453 (bandera `pagoVariosPedidos`): si el cliente tiene dos o más pedidos con saldo y un documento real,
   * «Registrar pago» abre la ventana de pago a varios pedidos (que también deja registrar uno solo). Sin la
   * bandera, o con un solo pedido, abre la ventana de siempre. Las rutas del pago de grupo son de Tesorería
   * (Tesorero y familia Administrador): quien no lo es sigue registrando el pago de un pedido como siempre.
   */
  private get usaPagoGrupo(): boolean {
    if (!this.features.isEnabled('pagoVariosPedidos')) return false;
    if (!this.esRolDeTesoreria()) return false;
    const documento = String(this.cliente?.documento || '').trim();
    if (!claveDocumento(documento) || documento.includes('@')) return false;
    return (this.cliente?.pedidos || []).filter((p) => Number(p.saldo) >= 1).length >= 2;
  }

  /** Espejo informativo de `TREASURY_ROLES` del servidor (que vuelve a exigirlo): Tesorero o familia Administrador. */
  private esRolDeTesoreria(): boolean {
    try {
      const u = JSON.parse(localStorage.getItem('user') || '{}');
      const rol = u.rol || u.role || '';
      return ['tesorero', 'tesoreria'].includes(normalizarRol(rol)) || esFamiliaAdministrador(rol);
    } catch {
      return false;
    }
  }

  elegir(entrada: EntradaMenu): void {
    this.cerrar(false);
    if (entrada.modo === 'pago' && this.usaPagoGrupo) {
      abrirPagoGrupo(this.modal, {
        documento: String(this.cliente.documento).trim(),
        cliente: this.cliente.nombre,
        alUnSoloPedido: () => {
          abrirAccionCartera(this.modal, 'pago', this.cliente, this.esAdmin).then((cambio) => {
            if (cambio) this.cambio.emit();
          });
        },
      }).then((cambio) => {
        if (cambio) this.cambio.emit();
      });
      return;
    }
    if (entrada.modo === 'recordatorio') {
      abrirRecordatorioCobro(this.modal, [{ documento: this.cliente.documento, nombre: this.cliente.nombre }], this.esAdmin).then((cambio) => {
        if (cambio) this.cambio.emit();
      });
      return;
    }
    abrirAccionCartera(this.modal, entrada.modo, this.cliente, this.esAdmin).then((cambio) => {
      if (cambio) this.cambio.emit();
    });
  }

  trackByModo(_i: number, e: EntradaMenu): string {
    return e.modo;
  }
}
