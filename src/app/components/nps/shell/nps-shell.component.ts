import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { CompanyFeaturesService } from '../../../shared/services/company-features.service';
import { npsDisponible } from '../../../shared/services/nps/nps.service';
import { empresaSesion, esAdministradorSesion } from '../nps-comun';

import { TranslateModule } from '@ngx-translate/core';
interface Pestana {
  ruta: string;
  texto: string;
  icono: string;
}

const PESTANAS: Pestana[] = [
  { ruta: 'resultados', texto: 'Resultados', icono: 'pi-chart-line' },
  { ruta: 'encuestas', texto: 'Encuestas', icono: 'pi-list' },
  { ruta: 'seguimiento', texto: 'Seguimiento', icono: 'pi-inbox' },
];

/**
 * Marco del módulo NPS (D-490): encabezado y las tres pestañas. Resultados y Encuestas son
 * de la familia Administrador (el servidor responde 403 a los demás); Seguimiento lo ve
 * cualquiera con sesión, con los casos a su nombre (el correo del aviso lo lleva ahí).
 * Sin el módulo (quien llega por la dirección) se explica y no se pide nada al servidor.
 */
@Component({
  selector: 'app-nps-shell',
  standalone: true,
  imports: [TranslateModule, CommonModule, RouterModule],
  templateUrl: './nps-shell.component.html',
  styleUrls: ['./nps-shell.component.scss'],
})
export class NpsShellComponent {
  readonly disponible = npsDisponible(empresaSesion(), this.features.isEnabled('npsModulo'));
  readonly pestanas: Pestana[] = this.visibles();

  constructor(private features: CompanyFeaturesService) {}

  private visibles(): Pestana[] {
    return esAdministradorSesion() ? PESTANAS : PESTANAS.filter((p) => p.ruta === 'seguimiento');
  }
}
