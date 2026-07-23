import { Component, OnInit, OnDestroy, ViewChild } from '@angular/core';
import { Table } from 'primeng/table';
import { MessageService } from 'primeng/api';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { Subject, forkJoin } from 'rxjs';
import { concatMap, debounceTime, distinctUntilChanged, map } from 'rxjs/operators';
import Swal from 'sweetalert2';
import * as XLSX from 'xlsx';
import { CorporateClientsService } from '../services/corporate-clients.service';
import { CrmService } from '../../../crm/services/crm.service';
import { ClientTag } from '../services/client-config.service';
import { CrearClienteModalComponent } from '../crear-cliente-modal/crear-cliente-modal.component';
import { resolverNombreApellido } from '../../../../shared/utils/nombre-apellido.util';

/**
 * Listado de Clientes Corporativos (spec 011).
 * Lista propia (colección `corporate_clients`) que alimenta el CRM. No toca la
 * lista de clientes habituales. Reusa `CrearClienteModalComponent` con
 * target='corporate' para crear/editar — el MISMO formulario que "Crear cliente"
 * del listado de Clientes (D-110), con el catálogo de etiquetas de corporativos.
 */
@Component({
  selector: 'app-clientes-corporativos',
  templateUrl: './clientes-corporativos.component.html',
  styleUrls: ['./clientes-corporativos.component.scss'],
  providers: [MessageService],
})
export class ClientesCorporativosComponent implements OnInit, OnDestroy {
  @ViewChild('dt') dt: Table;

  corporativos: any[] = [];
  cargando = true;
  globalFilterValue = '';
  selectedEstadoFilter: 'todos' | 'activo' | 'bloqueado' = 'todos';
  tagsCatalog: ClientTag[] = [];

  private searchSubject = new Subject<string>();

  constructor(
    private corpService: CorporateClientsService,
    private crmService: CrmService,
    private modalService: NgbModal,
    private messageService: MessageService,
  ) {}

  ngOnInit(): void {
    this.cargarCorporativos();
    this.cargarEtiquetas();
    this.searchSubject
      .pipe(debounceTime(300), distinctUntilChanged())
      .subscribe((value) => this.dt?.filterGlobal(value, 'contains'));
  }

  cargarEtiquetas(): void {
    this.corpService.getCorporateTags().subscribe({
      next: (data: any) => {
        const raw = Array.isArray(data) ? data : (data?.tags || []);
        this.tagsCatalog = raw.map((t: any) =>
          typeof t === 'string' ? { name: t, color: 'violet' } : { name: t.name, color: t.color || 'violet' });
      },
      error: () => { this.tagsCatalog = []; },
    });
  }

  ngOnDestroy(): void {
    this.searchSubject.complete();
  }

  cargarCorporativos(): void {
    this.cargando = true;
    this.corpService.obtenerCorporativos().subscribe({
      next: (data: any) => {
        // Ordenar por fecha de creación desc (lo más reciente primero) para que
        // un corporativo recién creado aparezca arriba y no quede sepultado en
        // otra página del paginador (Firestore devuelve por id de documento).
        this.corporativos = (Array.isArray(data) ? data : [])
          .sort((a: any, b: any) => this.fechaCreacion(b) - this.fechaCreacion(a));
        this.cargando = false;
      },
      error: () => {
        this.corporativos = [];
        this.cargando = false;
        this.messageService.add({ severity: 'error', summary: 'Error', detail: 'No se pudieron cargar los clientes corporativos' });
      },
    });
  }

  /** Millis de creación soportando date_add como ISO string o Firestore Timestamp. */
  private fechaCreacion(c: any): number {
    const d = c?.date_add;
    if (!d) return 0;
    if (typeof d === 'string') return Date.parse(d) || 0;
    if (typeof d === 'object') {
      if (typeof d._seconds === 'number') return d._seconds * 1000;
      if (typeof d.seconds === 'number') return d.seconds * 1000;
    }
    return 0;
  }

  onGlobalFilter(value: string): void {
    this.globalFilterValue = value;
    this.searchSubject.next(value);
  }

  // ─── Exportar / Importar Excel ──────────────────────────────

  /**
   * Plantilla de importación de corporativos. Es un SUPERSET de la del CRM
   * (`crm-list`): las 6 primeras columnas usan encabezados que el detector del
   * CRM también reconoce, así un mismo archivo sirve para ambos módulos —
   * escriben en la misma colección (`corporate_clients` + `crm_pipeline`).
   *
   * Las 5 últimas son propias del corporativo: el backend ya las mapea en
   * `_mapEntityData` (createLead/updateLead), solo faltaba leerlas del Excel.
   */
  private readonly CORP_TEMPLATE_COLUMNS: { header: string; examples: [string, string] }[] = [
    // Dos filas de ejemplo a propósito: la mayoría de los corporativos reales son
    // personas naturales (CC), no razones sociales — la plantilla tiene que
    // mostrar que ambos casos caben.
    { header: 'Nombre / Razón social', examples: ['Juan Carlos', 'Comercializadora El Progreso S.A.S'] }, // ÚNICO obligatorio
    { header: 'Apellidos', examples: ['Pérez García', ''] },             // vacío en persona jurídica
    { header: 'NIT/Documento', examples: ['1012345678', '900123456-7'] },
    { header: 'Tipo Documento', examples: ['CC', 'NIT'] },
    { header: 'Email', examples: ['juan.perez@correo.com', 'contacto@elprogreso.com'] },
    { header: 'Teléfono', examples: ['3001234567', '3009876543'] },
    { header: 'Etiquetas', examples: ['CRÉDITO', 'Mayorista, CONTADO'] },  // coma-separadas
    { header: 'Etapa', examples: ['contactado', 'propuesta'] },            // crm_pipeline.stage
    { header: 'Fuente', examples: ['referido', 'evento'] },                // crm_pipeline.source
    { header: 'Cupo de crédito (COP)', examples: ['1000000', '5000000'] }, // creditLimit
    { header: 'Plazo de pago (días)', examples: ['15', '30'] },            // payTermDays
    { header: 'Tipo de cliente', examples: ['Detal', 'Distribuidor'] },    // tipoCliente
  ];

  /**
   * Etapas admitidas en importación (CLIENT_STAGES del backend) MENOS
   * `convertido`: esa etapa es `isWon` y el kanban solo la concede tras cruzar
   * contra `orders` reales (`markVerifiedBuyer`). `createLead` NO hace esa
   * verificación, así que permitirla por Excel dejaría fabricar cierres ganados
   * y ensuciaría la métrica de conversión. Se degrada a `negociacion`.
   */
  private readonly IMPORT_STAGES = ['nuevo', 'contactado', 'calificado', 'propuesta', 'negociacion', 'perdido'];
  private readonly STAGE_FALLBACK = 'negociacion';

  /** SOURCES del backend (crmConstants.js). Lo que no calce cae en `manual`. */
  private readonly IMPORT_SOURCES = ['web', 'referido', 'evento', 'cold_call', 'social_media', 'ecommerce', 'manual'];

  /** Genera y descarga la plantilla .xlsx con encabezados + fila de ejemplo. */
  descargarPlantilla(): void {
    const ws = XLSX.utils.aoa_to_sheet([
      this.CORP_TEMPLATE_COLUMNS.map((c) => c.header),
      this.CORP_TEMPLATE_COLUMNS.map((c) => c.examples[0]),
      this.CORP_TEMPLATE_COLUMNS.map((c) => c.examples[1]),
    ]);
    ws['!cols'] = this.CORP_TEMPLATE_COLUMNS.map(() => ({ wch: 26 }));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Plantilla Corporativos');
    XLSX.writeFile(wb, 'plantilla-clientes-corporativos.xlsx');
    this.messageService.add({
      severity: 'success',
      summary: 'Plantilla descargada',
      detail: 'Solo "Nombre / Razón social" es obligatorio. Trae 2 filas de ejemplo (persona natural y empresa): bórralas antes de importar.',
      life: 7000,
    });
  }

  /** Normaliza la etapa del Excel a una clave válida del pipeline. */
  private mapEtapa(raw: string): { stage: string | null; clamped: boolean } {
    const v = (raw || '').toString().trim().toLowerCase()
      .replace(/ó/g, 'o').replace(/é/g, 'e');
    if (!v) return { stage: null, clamped: false };
    // Etiquetas visibles del kanban → clave interna.
    const alias: Record<string, string> = {
      'propuesta enviada': 'propuesta',
      'cerrado ganado': 'convertido',
      'cerrado perdido': 'perdido',
      'ganado': 'convertido',
      'negociacion': 'negociacion',
    };
    const key = alias[v] || v;
    if (this.IMPORT_STAGES.includes(key)) return { stage: key, clamped: false };
    // `convertido` es la única que se degrada avisando; el resto es basura → default.
    if (key === 'convertido') return { stage: this.STAGE_FALLBACK, clamped: true };
    return { stage: null, clamped: false };
  }

  /** Normaliza la fuente del Excel a una clave de SOURCES. */
  private mapFuente(raw: string): string | null {
    const v = (raw || '').toString().trim().toLowerCase();
    if (!v) return null;
    if (this.IMPORT_SOURCES.includes(v)) return v;
    if (v.includes('facebook') || v.includes('instagram') || v.includes('redes')) return 'social_media';
    if (v.includes('google') || v.includes('web') || v.includes('sitio')) return 'web';
    if (v.includes('refer') || v.includes('recomend')) return 'referido';
    if (v.includes('evento') || v.includes('feria')) return 'evento';
    if (v.includes('fria') || v.includes('fría') || v.includes('call')) return 'cold_call';
    if (v.includes('ecommerce') || v.includes('tienda')) return 'ecommerce';
    return 'manual';
  }

  /**
   * Monto/entero desde Excel tolerando separadores de miles ("5.000.000",
   * "5,000,000", "$ 5000000"). Devuelve undefined si la celda venía vacía, para
   * distinguir "no lo mandó" de "lo puso en 0".
   */
  private toEntero(raw: string): number | undefined {
    const digits = (raw || '').toString().replace(/[^\d]/g, '');
    if (!digits) return undefined;
    const n = Number(digits);
    return isNaN(n) ? undefined : n;
  }

  /** Exporta el listado actual de corporativos a un .xlsx. */
  exportarExcel(): void {
    if (!this.corporativos.length) {
      this.messageService.add({ severity: 'warn', summary: 'Sin datos', detail: 'No hay corporativos para exportar' });
      return;
    }
    const data = this.corporativos.map((c) => ({
      'Tipo Documento': c.tipo_documento_comprador || 'CC',
      'Documento': c.documento || '',
      'Nombre / Razón social': c.nombres_completos || '',
      'Apellidos': c.apellidos_completos || '',
      'Correo': c.correo_electronico_comprador || '',
      'Teléfono': c.numero_celular_comprador || '',
      'Etiquetas': Array.isArray(c.etiquetas) ? c.etiquetas.join(', ') : '',
      'Estado': c.estado === 'bloqueado' ? 'Bloqueado' : 'Activo',
    }));
    const ws = XLSX.utils.json_to_sheet(data);
    ws['!cols'] = [{ wch: 16 }, { wch: 16 }, { wch: 28 }, { wch: 20 }, { wch: 28 }, { wch: 16 }, { wch: 22 }, { wch: 12 }];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Corporativos');
    const ts = new Date().toISOString().slice(0, 10);
    XLSX.writeFile(wb, `clientes-corporativos-${ts}.xlsx`);
    this.messageService.add({ severity: 'success', summary: 'Exportado', detail: `${data.length} corporativos exportados` });
  }

  /**
   * Importa corporativos desde un .xlsx/.csv. Mapea columnas por encabezado
   * (tolerante a mayúsculas/acentos) y omite solo las filas sin nombre. Para
   * cada fila: si ya existe un corporativo (por documento o nombre) lo
   * ACTUALIZA; si no, lo crea. Todo vía CRM forzando contexto corporate
   * (corporate_clients + crm_pipeline).
   */
  onFileImport(event: any): void {
    const file = event.target?.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e: any) => {
      try {
        const wb = XLSX.read(e.target.result, { type: 'binary' });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const rows: any[] = XLSX.utils.sheet_to_json(ws);
        if (!rows.length) {
          this.messageService.add({ severity: 'warn', summary: 'Archivo vacío' });
          event.target.value = '';
          return;
        }

        const norm = (s: any) => (s ?? '').toString().trim().toLowerCase();
        const pick = (row: any, keys: string[]): string => {
          const k = Object.keys(row).find((col) => keys.includes(norm(col)));
          return k ? String(row[k]).trim() : '';
        };

        const tasks: { op: 'create' | 'update'; obs: any }[] = [];
        const seen = new Set<string>();
        let skipped = 0;
        let dupInFile = 0;
        let clampedStages = 0;
        rows.forEach((row) => {
          const nombreRaw = pick(row, ['nombre / razón social', 'nombre', 'razón social', 'razon social', 'nombres_completos', 'nombre completo']);
          if (!nombreRaw) { skipped++; return; }
          const documento = pick(row, ['documento', 'nit', 'nit/documento', 'nit/doc', 'número de documento', 'numero de documento']);
          const tipoDocumento = pick(row, ['tipo documento', 'tipo_documento', 'tipo doc']);

          // Persona natural: si no vino "Apellidos" se parte el nombre completo.
          // Con tipo NIT no se toca (razón social). Ver nombre-apellido.util.
          const { nombres: name, apellidos } = resolverNombreApellido(
            nombreRaw,
            pick(row, ['apellidos', 'apellido', 'apellidos completos', 'apellidos_completos']),
            tipoDocumento,
          );
          const email = pick(row, ['correo', 'correo electrónico', 'correo electronico', 'email', 'e-mail']);
          const phone = pick(row, ['teléfono', 'telefono', 'celular', 'whatsapp', 'phone']);
          const etiquetasRaw = pick(row, ['etiquetas', 'tags']);
          const etiquetas = etiquetasRaw ? etiquetasRaw.split(',').map((s) => s.trim()).filter(Boolean) : [];

          // Columnas propias del corporativo (superset sobre la plantilla del CRM).
          const etapa = this.mapEtapa(pick(row, ['etapa', 'stage', 'etapa del pipeline']));
          if (etapa.clamped) clampedStages++;
          const fuente = this.mapFuente(pick(row, ['fuente', 'source', 'origen', 'plataforma']));
          const creditLimit = this.toEntero(pick(row, ['cupo de crédito (cop)', 'cupo de credito (cop)', 'cupo de crédito', 'cupo de credito', 'cupo', 'credit limit']));
          const payTermDays = this.toEntero(pick(row, ['plazo de pago (días)', 'plazo de pago (dias)', 'plazo de pago', 'plazo', 'pay term days']));
          const tipoCliente = pick(row, ['tipo de cliente', 'tipo cliente', 'tipocliente']);

          // Dedup y búsqueda del existente van SIEMPRE por el nombre completo,
          // nunca por `name` suelto: tras el split `name` es solo el nombre de
          // pila, y compararlo contra registros legacy (que guardan el nombre
          // entero en `nombres_completos`) crearía duplicados.
          const fullName = [name, apellidos].filter(Boolean).join(' ');
          const keys: string[] = [];
          if (documento) keys.push('doc:' + norm(documento));
          keys.push('name:' + norm(fullName));
          if (keys.some((k) => seen.has(k))) { dupInFile++; return; }
          keys.forEach((k) => seen.add(k));

          const nombreDe = (c: any) => norm([c.nombres_completos, c.apellidos_completos].filter(Boolean).join(' '));
          const existing = this.corporativos.find((c) =>
            (documento && norm(c.documento) === norm(documento)) ||
            nombreDe(c) === norm(fullName) ||
            norm(c.nombres_completos) === norm(fullName));

          if (existing) {
            // Actualiza. Merge con lo actual: los campos vacíos del Excel
            // conservan el valor existente (el backend mapea vacío→null y lo
            // borraría). `priority` no se toca para no pisar el pipeline; la
            // fuente sí se respeta si el archivo la trae.
            const payload: any = {
              name,
              apellidos_completos: apellidos || existing.apellidos_completos || null,
              nit: documento || existing.documento || null,
              tipoDocumento: tipoDocumento || existing.tipo_documento_comprador || 'CC',
              email: email || existing.correo_electronico_comprador || null,
              phone: phone || existing.numero_celular_comprador || null,
              etiquetas: etiquetas.length ? etiquetas : (existing.etiquetas || []),
            };
            if (fuente) payload.source = fuente;
            if (tipoCliente) payload.tipoCliente = tipoCliente;
            if (creditLimit !== undefined) payload.creditLimit = creditLimit;
            if (payTermDays !== undefined) payload.payTermDays = payTermDays;

            // La etapa NO viaja en updateLead (`updateLeadEntity` solo toca la
            // entidad + priority/source). Se encadena a /pipeline, que además
            // deja la actividad `stage_change` en la bitácora del lead.
            let obs = this.crmService.updateLead(existing.cd, payload, true);
            if (etapa.stage) {
              obs = obs.pipe(
                concatMap((res: any) =>
                  this.crmService.updatePipeline(existing.cd, { stage: etapa.stage }, true)
                    .pipe(map(() => res))),
              );
            }
            tasks.push({ op: 'update', obs });
          } else {
            const payload: any = {
              name,
              apellidos_completos: apellidos || null,
              nit: documento || null,
              tipoDocumento: tipoDocumento || 'CC',
              email: email || null,
              phone: phone || null,
              etiquetas,
              source: fuente || 'manual',
              priority: 'medium',
            };
            if (etapa.stage) payload.stage = etapa.stage;
            if (tipoCliente) payload.tipoCliente = tipoCliente;
            if (creditLimit !== undefined) payload.creditLimit = creditLimit;
            if (payTermDays !== undefined) payload.payTermDays = payTermDays;
            tasks.push({ op: 'create', obs: this.crmService.createLead(payload, true) });
          }
        });

        if (!tasks.length) {
          const nada = [`${skipped} sin nombre`, `${dupInFile} duplicados en archivo`].filter((p) => !p.startsWith('0 ')).join(', ');
          this.messageService.add({ severity: 'info', summary: 'Nada que importar', detail: nada || 'Sin registros válidos' });
          event.target.value = '';
          return;
        }

        this.messageService.add({ severity: 'info', summary: 'Importando', detail: `Procesando ${tasks.length} registros...` });
        forkJoin(tasks.map((t) => t.obs)).subscribe({
          next: (results: any[]) => {
            let created = 0;
            let updated = 0;
            results.forEach((r, i) => {
              if (!r || !r.success) return;
              if (tasks[i].op === 'create') created++; else updated++;
            });
            const failed = tasks.length - created - updated;
            const parts = [`${created} creados`, `${updated} actualizados`];
            if (dupInFile) parts.push(`${dupInFile} duplicados en archivo`);
            if (skipped) parts.push(`${skipped} sin nombre`);
            if (clampedStages) parts.push(`${clampedStages} con etapa "convertido" → "negociación" (requiere compra verificada)`);
            if (failed) parts.push(`${failed} con error`);
            this.messageService.add({
              severity: failed ? 'warn' : 'success',
              summary: 'Importación completada',
              detail: parts.join(', '), life: 5000,
            });
            this.cargarCorporativos();
          },
          error: () => this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Falló la importación' }),
        });
      } catch (err) {
        this.messageService.add({ severity: 'error', summary: 'Error', detail: 'No se pudo leer el archivo' });
      }
      event.target.value = '';
    };

    reader.readAsBinaryString(file);
  }

  filtrarPorEstado(estado: 'todos' | 'activo' | 'bloqueado'): void {
    this.selectedEstadoFilter = estado;
    if (estado === 'todos') {
      this.dt?.filter(null, 'estado', 'equals');
    } else {
      this.dt?.filter(estado, 'estado', 'equals');
    }
  }

  /**
   * Abre el MISMO formulario que "Crear cliente" del listado de Clientes
   * (D-110), con target='corporate': persiste vía CRM (corporate_clients +
   * crm_pipeline) y muestra el catálogo de etiquetas propio de corporativos.
   * El modal se encarga de validar, deduplicar por documento y guardar.
   */
  openCrearModal(): void {
    const modalRef = this.modalService.open(CrearClienteModalComponent, { size: 'lg', centered: true });
    modalRef.componentInstance.isEdit = false;
    modalRef.componentInstance.target = 'corporate';
    modalRef.componentInstance.title = 'Nuevo corporativo';
    modalRef.componentInstance.tagsCatalog = this.tagsCatalog;

    modalRef.result.then((res) => {
      if (res?.action === 'created') this.cargarCorporativos();
    }).catch(() => {});
  }

  editarCorporativo(cliente: any): void {
    const modalRef = this.modalService.open(CrearClienteModalComponent, { size: 'lg', centered: true });
    modalRef.componentInstance.isEdit = true;
    modalRef.componentInstance.target = 'corporate';
    modalRef.componentInstance.title = 'Editar corporativo';
    modalRef.componentInstance.clienteData = cliente;
    modalRef.componentInstance.tagsCatalog = this.tagsCatalog;

    modalRef.result.then((res) => {
      if (res?.action === 'updated') this.cargarCorporativos();
    }).catch(() => {});
  }

  /**
   * Bloquea/desbloquea el corporativo (soft-block por trazabilidad). NO se borra
   * el registro: se conserva su historial en el CRM (pipeline/actividades) y se
   * puede reactivar. Usa el campo `estado` (activo | bloqueado) que ya filtra la
   * lista, y queda auditado (user_edit/date_edit en el backend).
   */
  toggleBloqueo(cliente: any): void {
    const bloquear = cliente.estado !== 'bloqueado';
    Swal.fire({
      title: `¿${bloquear ? 'Bloquear' : 'Desbloquear'} a "${cliente.nombres_completos || cliente.documento}"?`,
      text: bloquear
        ? 'Se ocultará de la lista activa pero se conserva su historial en el CRM. Podrás reactivarlo cuando quieras.'
        : 'Volverá a estar activo en la lista.',
      icon: bloquear ? 'warning' : 'question',
      showCancelButton: true,
      confirmButtonColor: bloquear ? '#d97706' : '#16a34a',
      cancelButtonColor: '#6b7280',
      confirmButtonText: bloquear ? 'Sí, bloquear' : 'Sí, desbloquear',
      cancelButtonText: 'Cancelar',
    }).then((result) => {
      if (!result.isConfirmed) return;
      const nuevoEstado = bloquear ? 'bloqueado' : 'activo';
      this.corpService.editar({ cd: cliente.cd, estado: nuevoEstado }).subscribe({
        next: () => {
          cliente.estado = nuevoEstado;
          // Reemplazo inmutable del item para forzar el re-render de la fila en
          // la p-table (mutar en sitio no siempre refresca el ícono/badge).
          this.corporativos = this.corporativos.map(
            (c) => (c.cd === cliente.cd ? { ...c, estado: nuevoEstado } : c));
          this.messageService.add({
            severity: 'success',
            summary: bloquear ? 'Bloqueado' : 'Desbloqueado',
            detail: `Cliente corporativo ${bloquear ? 'bloqueado' : 'reactivado'}`,
          });
        },
        error: () => this.messageService.add({ severity: 'error', summary: 'Error', detail: 'No se pudo cambiar el estado' }),
      });
    });
  }
}
