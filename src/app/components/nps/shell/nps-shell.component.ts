import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { esAdministradorSesion } from '../nps-comun';

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
 */
@Component({
  selector: 'app-nps-shell',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './nps-shell.component.html',
  styleUrls: ['./nps-shell.component.scss'],
})
export class NpsShellComponent {
  readonly pestanas: Pestana[] = this.visibles();

  private visibles(): Pestana[] {
    return esAdministradorSesion() ? PESTANAS : PESTANAS.filter((p) => p.ruta === 'seguimiento');
  }
}
