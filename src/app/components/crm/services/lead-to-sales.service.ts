import { Injectable } from '@angular/core';
import { Router } from '@angular/router';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { firstValueFrom } from 'rxjs';
import Swal from 'sweetalert2';
import { CrmService } from './crm.service';
import { MaestroService } from '../../../shared/services/maestros/maestro.service';
import { CrearClienteModalComponent } from '../../ventas/clientes/crear-cliente-modal/crear-cliente-modal.component';
import { CrmLead } from '../models/crm.models';

/**
 * Botones "Pedido" y "Cotizar" del CRM (D-111): llevan un lead a operar sin
 * pasar por el buscador de clientes.
 *
 * **Por qué existen:** `POST /v1/clients/search` consulta SOLO la colección
 * `clients` (clients.js:340), y el lead vive en `corporate_clients`. Buscar la
 * cédula del lead en Ventas o Cotizaciones NUNCA lo encuentra — es la
 * separación que decidió D-058. Estos botones no buscan: LLEVAN los datos.
 *
 * **Regla de negocio: un cliente nace con su primer pedido.**
 * - `iniciarPedido`  → PROMUEVE (Ventas exige un cliente real de `clients`
 *                      para pasar el paso 1: crear-ventas.component.html:504).
 * - `iniciarCotizacion` → NO promueve. La cotización guarda una COPIA embebida
 *                      del cliente, no un vínculo (no hay `clienteId` en el
 *                      modelo), así que acepta los datos del lead tal cual.
 *                      Verificado contra datos reales: hay cotizaciones en
 *                      producción cuyo `cliente` no tiene `cd`.
 *
 * El lead NO se mueve ni se borra: se queda en el CRM con su pipeline,
 * actividades y tareas intactos. Al promover nace un gemelo en `clients`
 * enlazado por `documento` — la misma llave que ya usa `markVerifiedBuyer`.
 * Por eso, tras el pedido, marcar "Ganado" queda verificado solo.
 *
 * Espejo de `CotizacionConvertService`, mismo patrón: orquestar fuera del
 * componente y entregar el contexto al destino.
 */
@Injectable({ providedIn: 'root' })
export class LeadToSalesService {
  /** Handoff de cliente hacia el editor de cotizaciones. Se consume una vez. */
  static readonly COTIZACION_CLIENTE_KEY = 'crmLeadCotizacionCliente';

  constructor(
    private crmService: CrmService,
    private maestro: MaestroService,
    private modalService: NgbModal,
    private router: Router,
  ) {}

  /** Campos que `clients` exige (los mismos validadores del formulario). */
  private readonly requeridos: { campo: string; label: string }[] = [
    { campo: 'documento', label: 'Número de documento' },
    { campo: 'nombres_completos', label: 'Nombres completos' },
    { campo: 'apellidos_completos', label: 'Apellidos completos' },
    { campo: 'indicativo_celular_comprador', label: 'Indicativo' },
    { campo: 'numero_celular_comprador', label: 'Celular (10 dígitos)' },
    { campo: 'correo_electronico_comprador', label: 'Correo electrónico' },
  ];

  /**
   * "Pedido": promueve el lead a cliente y abre la venta asistida.
   * La promoción es obligatoria aquí — sin cliente persistido el asistente ni
   * siquiera deja pasar del paso 1.
   */
  async iniciarPedido(lead: CrmLead): Promise<void> {
    const candidato = await this.prepararCandidato(lead, 'tomarle un pedido');
    if (!candidato) return;
    const documento = await this.asegurarCliente(candidato);
    if (documento) this.irAVentaAsistida(documento);
  }

  /**
   * Garantiza que el cliente exista en `clients` y devuelve su documento, o
   * `null` si no se pudo (error, o el usuario cerró el formulario).
   *
   * Es el ÚNICO punto de promoción del sistema: aquí es donde un prospecto se
   * vuelve cliente. Lo usan el botón "Pedido" y la conversión cotización →
   * pedido. Idempotente: si ya existe, no crea nada.
   *
   * `creditLimit`/`payTermDays` viajan aquí a `clients`, que es la única
   * colección que lee Cartera (carteraService.js:35) — y es el momento
   * correcto: el cupo solo significa algo cuando hay algo que cobrar.
   */
  async asegurarCliente(candidato: any): Promise<string | null> {
    const yaCliente = await this.buscarCliente(candidato.documento);
    if (yaCliente) return yaCliente.documento || candidato.documento;

    // Con todos los datos → promoción automática, sin fricción.
    if (this.faltantes(candidato).length === 0) {
      return (await this.promoverDirecto(candidato)) ? candidato.documento : null;
    }
    // Falta algo → el formulario decide, precargado con lo que ya se sabe.
    return this.promoverConFormulario(candidato);
  }

  /**
   * "Cotizar": abre el editor con los datos del lead. NO promueve — cotizar no
   * es vender. Si el lead YA es cliente se usa el registro real (trae `cd` y
   * `categoria`, que la copia del lead no tiene); si no, viaja la copia.
   */
  async iniciarCotizacion(lead: CrmLead): Promise<void> {
    const candidato = await this.prepararCandidato(lead, 'cotizarle');
    if (!candidato) return;

    const yaCliente = await this.buscarCliente(candidato.documento);
    const cliente = yaCliente || candidato;

    // Handoff por sessionStorage: el editor no acepta el cliente por la URL y
    // `?documento=` no serviría — buscaría en `clients`, donde el lead no está.
    // Mismo mecanismo que usa CotizacionConvertService para pasar contexto.
    sessionStorage.setItem(
      LeadToSalesService.COTIZACION_CLIENTE_KEY,
      JSON.stringify(cliente),
    );
    this.router.navigate(['/cotizaciones/editor']);
  }

  /**
   * Común a ambos botones: valida que el lead sea operable y trae su entidad
   * COMPLETA. La tarjeta del kanban es solo una proyección (name/email/phone/
   * nit): no trae apellidos, indicativo ni cupo.
   */
  private async prepararCandidato(lead: CrmLead, accion: string): Promise<any | null> {
    if (lead.activo === false) {
      await Swal.fire({
        title: 'Lead bloqueado',
        text: `Desbloquéalo antes de ${accion}.`,
        icon: 'warning',
        confirmButtonColor: '#8b5cf6',
      });
      return null;
    }

    const res: any = await firstValueFrom(this.crmService.getLead(lead.id));
    const entity = res?.data?.entity;
    if (!res?.success || !entity) {
      await Swal.fire('Error', 'No se pudieron cargar los datos del lead.', 'error');
      return null;
    }
    return this.leadACliente(entity);
  }

  /**
   * Mapea la entidad del CRM a la forma de `clients`. Whitelist explícita: los
   * campos propios del CRM (productoInteres) y los metadatos del doc (cd, id,
   * company, date_add, user_add) NO viajan.
   *
   * `creditLimit`/`payTermDays` sí viajan, y es justo lo que cierra el círculo:
   * Cartera (CxC) solo lee la colección `clients` (carteraService.js:35), así
   * que es aquí donde por fin significan algo.
   */
  private leadACliente(entity: any): any {
    return {
      tipo_documento_comprador: entity.tipo_documento_comprador || 'CC',
      documento: entity.documento || entity.nit || '',
      nombres_completos: entity.nombres_completos || entity.name || '',
      apellidos_completos: entity.apellidos_completos || '',
      indicativo_celular_comprador: entity.indicativo_celular_comprador || '57',
      numero_celular_comprador: entity.numero_celular_comprador || entity.phone || '',
      indicativo_celular_whatsapp: entity.indicativo_celular_whatsapp || '57',
      numero_celular_whatsapp: entity.numero_celular_whatsapp || '',
      correo_electronico_comprador: entity.correo_electronico_comprador || entity.email || '',
      tipoCliente: entity.tipoCliente || '',
      fechaCumpleanos: entity.fechaCumpleanos || '',
      comoNosConocio: entity.comoNosConocio || '',
      etiquetas: Array.isArray(entity.etiquetas) ? entity.etiquetas : [],
      creditLimit: Number(entity.creditLimit) || 0,
      payTermDays: Number(entity.payTermDays) || 0,
      estado: 'activo',
    };
  }

  /** Campos que impedirían crear el cliente o pasar el paso 1 de la venta. */
  private faltantes(cliente: any): string[] {
    const malos = this.requeridos
      .filter(r => !String(cliente[r.campo] ?? '').trim())
      .map(r => r.label);
    const cel = String(cliente.numero_celular_comprador ?? '').trim();
    if (cel && !/^[0-9]{10}$/.test(cel)) malos.push('Celular (10 dígitos)');
    const mail = String(cliente.correo_electronico_comprador ?? '').trim();
    if (mail && !/^\S+@\S+\.\S+$/.test(mail)) malos.push('Correo electrónico válido');
    return [...new Set(malos)];
  }

  private async buscarCliente(documento: string): Promise<any | null> {
    if (!documento) return null;
    try {
      const res: any = await firstValueFrom(this.maestro.getClientByDocument({ documento }));
      if (Array.isArray(res)) return res.length ? res[0] : null;
      return res || null;
    } catch {
      return null;
    }
  }

  private async promoverDirecto(cliente: any): Promise<boolean> {
    try {
      await firstValueFrom(this.maestro.createClient(cliente));
    } catch {
      await Swal.fire('Error', 'No se pudo crear el cliente. Intenta de nuevo.', 'error');
      return false;
    }
    Swal.fire({
      title: '¡Ahora es cliente!',
      text: `${cliente.nombres_completos} quedó en el listado de clientes.`,
      icon: 'success',
      timer: 2500,
      timerProgressBar: true,
      showConfirmButton: false,
      toast: true,
      position: 'top-end',
    });
    return true;
  }

  /** Devuelve el documento del cliente creado, o null si el usuario desistió. */
  private promoverConFormulario(cliente: any): Promise<string | null> {
    const modalRef = this.modalService.open(CrearClienteModalComponent, { size: 'lg', centered: true });
    modalRef.componentInstance.isEdit = false;
    modalRef.componentInstance.target = 'client';
    modalRef.componentInstance.title = 'Completa los datos del cliente';
    modalRef.componentInstance.prefill = cliente;

    return modalRef.result.then(
      // 'created' → recién promovido · 'existing_found' → ya existía (carrera o
      // documento editado dentro del modal). Ambos habilitan la venta.
      (res: any) =>
        res?.action === 'created' || res?.action === 'existing_found'
          ? res.cliente?.documento || cliente.documento
          : null,
      () => null, // dismiss = el usuario se arrepintió
    );
  }

  /**
   * `?documento=` es el contrato que ya existe: crear-ventas lo lee y busca el
   * cliente contra el servidor (crear-ventas.component.ts:332-343). El cliente
   * DEBE existir antes de navegar — si no, la venta muestra "No encontrado".
   */
  private irAVentaAsistida(documento: string): void {
    this.router.navigate(['/ventas/crear-ventas'], { queryParams: { documento } });
  }
}
