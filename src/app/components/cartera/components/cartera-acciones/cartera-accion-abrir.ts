import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { CarteraCliente } from '../../../../shared/services/cartera/cartera.models';
import { CarteraAccionModalComponent, ModoAccionCartera } from './cartera-accion-modal.component';

/**
 * Ticket 1463: abre la ventana de una acción de cobro para un cliente. La usan el menú «Acciones» y el acceso directo
 * «Asignar cupo y plazo» de la tarjeta sin cupo. Devuelve `true` si se guardó algo (la pantalla debe volver a pedir la cartera).
 */
export function abrirAccionCartera(modal: NgbModal, modo: ModoAccionCartera, cliente: CarteraCliente, esAdmin: boolean): Promise<boolean> {
  const ref = modal.open(CarteraAccionModalComponent, {
    size: modo === 'estadoCuenta' || modo === 'pago' ? 'lg' : 'md',
    centered: true,
    scrollable: true,
  });
  const instancia = ref.componentInstance as CarteraAccionModalComponent;
  instancia.modo = modo;
  instancia.cliente = cliente;
  instancia.esAdmin = esAdmin;
  return ref.result.then(
    (res: { changed?: boolean } | undefined) => !!(res && res.changed),
    () => false,
  );
}
