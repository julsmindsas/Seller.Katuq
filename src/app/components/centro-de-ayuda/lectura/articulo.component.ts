import { Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { Subject } from 'rxjs';
import { switchMap, takeUntil, tap } from 'rxjs/operators';
import { CentroAyudaService } from '../centro-ayuda.service';
import { ArticuloAyuda, BloqueTexto } from '../centro-ayuda.models';
import { NOMBRE_MODULO, NOMBRE_TIPO, aBloques, fechaCorta, mensajeError } from '../centro-ayuda-comun';

/** Un artículo publicado, de Katuq o de la propia empresa. El texto se pinta con interpolación, nunca como HTML. */
@Component({
  selector: 'app-centro-ayuda-articulo',
  standalone: true,
  imports: [TranslateModule, CommonModule, RouterModule],
  templateUrl: './articulo.component.html',
  styleUrls: ['./articulo.component.scss'],
})
export class ArticuloComponent implements OnInit, OnDestroy {
  readonly NOMBRE_MODULO = NOMBRE_MODULO;
  readonly NOMBRE_TIPO = NOMBRE_TIPO;

  articulo: ArticuloAyuda | null = null;
  bloques: BloqueTexto[] = [];
  cargando = true;
  error: string | null = null;
  noEncontrado = false;

  private readonly destroy$ = new Subject<void>();

  constructor(
    private readonly ruta: ActivatedRoute,
    private readonly ayuda: CentroAyudaService,
    private readonly translate: TranslateService,
  ) {}

  ngOnInit(): void {
    this.ruta.paramMap.pipe(
      tap(() => { this.cargando = true; this.error = null; this.noEncontrado = false; this.articulo = null; }),
      switchMap((p) => this.ayuda.articulo(p.get('id') || '')),
      takeUntil(this.destroy$),
    ).subscribe({
      next: (r) => { this.articulo = r.data; this.bloques = aBloques(r.data.content); this.cargando = false; },
      error: (e) => {
        this.cargando = false;
        if (e?.status === 404) this.noEncontrado = true;
        else this.error = mensajeError(e, this.translate.instant('centroAyuda.errorCargar'));
      },
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  fecha(iso: string | null): string { return fechaCorta(iso); }
}
