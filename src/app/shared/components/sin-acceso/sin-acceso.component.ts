import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';

/**
 * Ticket 1637: lo que ve quien abre por dirección una pantalla que su rol no tiene (MenuRolGuard).
 * Va dentro del marco con menú y no es la 404: esa es para direcciones que no existen.
 */
@Component({
  selector: 'app-sin-acceso',
  standalone: true,
  imports: [CommonModule, RouterModule, TranslateModule],
  template: `
    <div class="container-fluid sin-acceso">
      <div class="card sin-acceso__card">
        <div class="card-body text-center">
          <div class="sin-acceso__icono" aria-hidden="true"><i class="fa fa-lock"></i></div>
          <h1 class="sin-acceso__titulo">{{ 'sinAcceso.titulo' | translate }}</h1>
          <p class="sin-acceso__texto">{{ 'sinAcceso.texto' | translate }}</p>
          <a class="btn btn-primary" routerLink="/welcome">{{ 'sinAcceso.volver' | translate }}</a>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .sin-acceso { display: flex; justify-content: center; padding-top: 48px; }
    .sin-acceso__card { max-width: 480px; width: 100%; }
    .sin-acceso__icono { font-size: 40px; color: var(--theme-deafult, #5f3fe0); margin-bottom: 12px; }
    .sin-acceso__titulo { font-size: 22px; font-weight: 700; margin-bottom: 8px; }
    .sin-acceso__texto { color: #6c757d; margin-bottom: 20px; }
  `],
})
export class SinAccesoComponent {}
