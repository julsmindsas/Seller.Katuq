import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { EnVivoComercioModule } from './comercio/en-vivo-comercio.module';
import { EnVivoCompartidoModule } from './compartido/en-vivo-compartido.module';
import { EnVivoEscenasModule } from './escenas/en-vivo-escenas.module';
import { EnVivoRoutingModule } from './en-vivo-routing.module';
import { EnVivoComponent } from './en-vivo.component';
import { EnVivoFichaModule } from './ficha/ficha.module';
import { EnVivoOpttiaModule } from './opttia/en-vivo-opttia.module';
import { EnVivoComercioPaginaComponent } from './paginas/en-vivo-comercio-pagina.component';
import { EnVivoKatuqPaginaComponent } from './paginas/en-vivo-katuq-pagina.component';
import { EnVivoPlataformaModule } from './plataforma/en-vivo-plataforma.module';

/**
 * Tablero "En vivo" (D-386). Módulo propio y diferido: el canal, el estado y las
 * escenas 3D bajan solo al entrar a la pantalla.
 *
 * El shell (`app-en-vivo`) y las dos páginas de ruta (comercio y toda Katuq) se declaran aquí; las
 * piezas viven en módulos propios que se importan: `EnVivoCompartidoModule` (héroe, pulso, cifras,
 * etapas, eventos...), `EnVivoFichaModule`, `EnVivoPlataformaModule` (toda Katuq),
 * `EnVivoComercioModule` (centro de mando del comercio), `EnVivoOpttiaModule` y `EnVivoEscenasModule`
 * (las cuatro escenas 3D con el orbe de Opttia; three baja aparte, al montar una escena).
 */
@NgModule({
  imports: [
    CommonModule,
    EnVivoCompartidoModule,
    EnVivoFichaModule,
    EnVivoPlataformaModule,
    EnVivoComercioModule,
    EnVivoOpttiaModule,
    EnVivoEscenasModule,
    EnVivoRoutingModule,
  ],
  declarations: [EnVivoComponent, EnVivoComercioPaginaComponent, EnVivoKatuqPaginaComponent],
})
export class EnVivoModule {}
