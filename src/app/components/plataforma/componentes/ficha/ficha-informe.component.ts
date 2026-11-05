import { ChangeDetectionStrategy, ChangeDetectorRef, Component, Input, OnDestroy } from '@angular/core';
import { Subject } from 'rxjs';
import { finalize, takeUntil } from 'rxjs/operators';
import { CompaniesService } from '../../../../services/companies.service';
import { mensajeErrorInforme, periodoMesAnterior, validarPeriodo } from '../../../../shared/utils/informe-ejecutivo';
import { guardarBlob, nombreDeCabecera } from '../../logica/descarga';
import { TEXTOS } from '../../plataforma.textos';

/**
 * D-700 14.6 — «Informe de ventas (PDF)» del comercio: usa el informe ejecutivo que ya existe. El PDF viaja como `blob` por el
 * servicio de empresas (con la autorización del usuario) y se guarda en el navegador.
 */
@Component({
  selector: 'app-ficha-informe',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="cfg-card" [attr.aria-label]="t.titulo">
      <h2 class="cfg-card__titulo">{{ t.titulo }}</h2>
      <p class="pl-muted">{{ t.texto }}</p>
      <div class="pl-filtros">
        <label>{{ t.desde }}<input type="date" [value]="desde" (input)="desde = $any($event.target).value" /></label>
        <label>{{ t.hasta }}<input type="date" [value]="hasta" (input)="hasta = $any($event.target).value" /></label>
        <button type="button" class="cfg-btn" [disabled]="generando" (click)="generar()">{{ generando ? t.generando : t.boton }}</button>
      </div>
      <p class="cfg-aviso cfg-aviso--error" *ngIf="error" role="status">{{ error }}</p>
    </section>
  `,
})
export class FichaInformeComponent implements OnDestroy {
  @Input() docId = '';
  readonly t = TEXTOS.informe;
  desde = periodoMesAnterior().desde;
  hasta = periodoMesAnterior().hasta;
  generando = false;
  error: string | null = null;
  private fin$ = new Subject<void>();

  constructor(private empresas: CompaniesService, private cd: ChangeDetectorRef) {}

  generar(): void {
    if (this.generando) return;
    this.error = validarPeriodo(this.desde, this.hasta);
    if (this.error) { this.cd.markForCheck(); return; }
    this.generando = true;
    this.empresas.getInformeEjecutivo(this.docId, this.desde, this.hasta).pipe(
      takeUntil(this.fin$),
      finalize(() => { this.generando = false; this.cd.markForCheck(); }),
    ).subscribe({
      next: (res) => {
        guardarBlob(res.body as Blob, nombreDeCabecera(res.headers.get('Content-Disposition'), `informe-ventas-${this.desde}-${this.hasta}.pdf`));
        this.cd.markForCheck();
      },
      error: async (err) => {
        // El cuerpo del error también llega como blob: se lee para ver el mensaje.
        let mensajeServidor: string | undefined;
        try { mensajeServidor = JSON.parse(await (err?.error as Blob).text())?.message; } catch { mensajeServidor = undefined; }
        this.error = mensajeErrorInforme(err?.status, mensajeServidor);
        this.cd.markForCheck();
      },
    });
  }

  ngOnDestroy(): void {
    this.fin$.next();
    this.fin$.complete();
  }
}
