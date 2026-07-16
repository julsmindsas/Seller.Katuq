import { Component, OnInit, OnDestroy, ViewChild } from '@angular/core';
import { Table } from 'primeng/table';
import { MessageService } from 'primeng/api';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { Subject, forkJoin } from 'rxjs';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';
import Swal from 'sweetalert2';
import * as XLSX from 'xlsx';
import { CorporateClientsService } from '../services/corporate-clients.service';
import { CrmService } from '../../../crm/services/crm.service';
import { ClientTag } from '../services/client-config.service';
import { CrearClienteModalComponent } from '../crear-cliente-modal/crear-cliente-modal.component';

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
      'Correo': c.correo_electronico_comprador || '',
      'Teléfono': c.numero_celular_comprador || '',
      'Etiquetas': Array.isArray(c.etiquetas) ? c.etiquetas.join(', ') : '',
      'Estado': c.estado === 'bloqueado' ? 'Bloqueado' : 'Activo',
    }));
    const ws = XLSX.utils.json_to_sheet(data);
    ws['!cols'] = [{ wch: 16 }, { wch: 16 }, { wch: 28 }, { wch: 28 }, { wch: 16 }, { wch: 22 }, { wch: 12 }];
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
        rows.forEach((row) => {
          const name = pick(row, ['nombre / razón social', 'nombre', 'razón social', 'razon social', 'nombres_completos', 'nombre completo']);
          if (!name) { skipped++; return; }
          const documento = pick(row, ['documento', 'nit', 'nit/doc', 'número de documento', 'numero de documento']);
          const tipoDocumento = pick(row, ['tipo documento', 'tipo_documento', 'tipo doc']);
          const email = pick(row, ['correo', 'correo electrónico', 'correo electronico', 'email', 'e-mail']);
          const phone = pick(row, ['teléfono', 'telefono', 'celular', 'whatsapp', 'phone']);
          const etiquetasRaw = pick(row, ['etiquetas', 'tags']);
          const etiquetas = etiquetasRaw ? etiquetasRaw.split(',').map((s) => s.trim()).filter(Boolean) : [];

          // Dedup dentro del propio archivo: si otra fila ya usó este documento o
          // nombre, se omite (evita crear/actualizar el mismo registro 2 veces).
          const keys: string[] = [];
          if (documento) keys.push('doc:' + norm(documento));
          keys.push('name:' + norm(name));
          if (keys.some((k) => seen.has(k))) { dupInFile++; return; }
          keys.forEach((k) => seen.add(k));

          const existing = this.corporativos.find((c) =>
            (documento && norm(c.documento) === norm(documento)) ||
            norm(c.nombres_completos) === norm(name));

          if (existing) {
            // Actualiza. Merge con lo actual: los campos vacíos del Excel
            // conservan el valor existente (el backend mapea vacío→null y lo
            // borraría). NO se envía priority/source para no pisar el pipeline.
            tasks.push({
              op: 'update',
              obs: this.crmService.updateLead(existing.cd, {
                name,
                nit: documento || existing.documento || null,
                tipoDocumento: tipoDocumento || existing.tipo_documento_comprador || 'CC',
                email: email || existing.correo_electronico_comprador || null,
                phone: phone || existing.numero_celular_comprador || null,
                etiquetas: etiquetas.length ? etiquetas : (existing.etiquetas || []),
              }, true),
            });
          } else {
            tasks.push({
              op: 'create',
              obs: this.crmService.createLead({
                name,
                nit: documento || null,
                tipoDocumento: tipoDocumento || 'CC',
                email: email || null,
                phone: phone || null,
                etiquetas,
                source: 'other',
                priority: 'medium',
              }, true),
            });
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
