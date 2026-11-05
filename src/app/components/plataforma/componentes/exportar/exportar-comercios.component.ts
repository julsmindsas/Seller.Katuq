import { ChangeDetectionStrategy, ChangeDetectorRef, Component, Input, OnDestroy } from '@angular/core';
import { Subject } from 'rxjs';
import { finalize, takeUntil } from 'rxjs/operators';
import { PlataformaService } from '../../servicios/plataforma.service';
import { FiltrosTabla, FormatoExportacion } from '../../plataforma.tipos';
import { guardarBlob, nombreDeCabecera } from '../../logica/descarga';
import { TEXTOS } from '../../plataforma.textos';

/**
 * D-700 14.6 — Botones de exportación (CSV y PDF). La descarga va por el servicio (con la autorización del usuario) y el
 * archivo se guarda en el navegador; el servidor deja el registro de quién exportó y con qué filtros.
 */
@Component({
  selector: 'app-exportar-comercios',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="pl-exportar">
      <button type="button" class="cfg-btn cfg-btn--sec" [disabled]="exportando" (click)="exportar('csv')">{{ t.csv }}</button>
      <button type="button" class="cfg-btn cfg-btn--sec" [disabled]="exportando" (click)="exportar('pdf')">{{ t.pdf }}</button>
      <small class="pl-muted">{{ t.nota }}</small>
    </div>
    <p class="cfg-aviso" *ngIf="exportando" role="status">{{ t.exportando }}</p>
    <p class="cfg-aviso cfg-aviso--ok" *ngIf="mensaje === 'listo'" role="status">{{ t.listo }}</p>
    <p class="cfg-aviso cfg-aviso--error" *ngIf="mensaje === 'fallo'" role="status">{{ t.fallo }}</p>
    <p class="cfg-aviso cfg-aviso--error" *ngIf="mensaje === 'sinRegistro'" role="status">{{ t.sinRegistro }}</p>
  `,
})
export class ExportarComerciosComponent implements OnDestroy {
  @Input() filtros!: FiltrosTabla;
  readonly t = TEXTOS.exportar;
  exportando = false;
  mensaje: 'listo' | 'fallo' | 'sinRegistro' | null = null;
  private fin$ = new Subject<void>();

  constructor(private servicio: PlataformaService, private cd: ChangeDetectorRef) {}

  exportar(formato: FormatoExportacion): void {
    if (this.exportando) return;
    this.exportando = true;
    this.mensaje = null;
    this.servicio.exportarComercios(this.filtros, formato).pipe(
      takeUntil(this.fin$),
      finalize(() => { this.exportando = false; this.cd.markForCheck(); }),
    ).subscribe({
      next: (res) => {
        const respaldo = `plataforma-comercios.${formato}`;
        guardarBlob(res.body as Blob, nombreDeCabecera(res.headers.get('Content-Disposition'), respaldo));
        this.mensaje = 'listo';
        this.cd.markForCheck();
      },
      error: async (err) => {
        // El cuerpo del error también llega como blob: se lee el código para decirlo con palabras.
        let codigo: string | null = null;
        try { codigo = JSON.parse(await (err?.error as Blob).text())?.code || null; } catch { codigo = null; }
        this.mensaje = codigo === 'AUDITORIA_NO_REGISTRADA' ? 'sinRegistro' : 'fallo';
        this.cd.markForCheck();
      },
    });
  }

  ngOnDestroy(): void {
    this.fin$.next();
    this.fin$.complete();
  }
}
