// Importación del decorador NgModule de Angular core
import { NgModule } from '@angular/core';
// Importación de los módulos de enrutamiento de Angular
import { RouterModule, Routes } from '@angular/router';
// Importación del componente principal de cotizaciones
import { CotizacionesComponent } from './cotizaciones.component';
// Importación del componente de lista de cotizaciones
import { CotizacionesListaComponent } from './cotizaciones-lista/cotizaciones-lista.component';

// Definición de las rutas del módulo de cotizaciones
const routes: Routes = [
  {
    // Ruta raíz del módulo
    path: '',
    // Definición de rutas hijas
    children: [
      {
        // Ruta principal de cotizaciones (crear)
        path: '',
        component: CotizacionesComponent,
        // Metadatos para el breadcrumb y título de la página
        data: {
          title: 'Crear Cotización',
          breadcrumb: 'Crear Cotización'
        }
      },
      {
        // Ruta para listado de cotizaciones
        path: 'lista',
        component: CotizacionesListaComponent,
        // Metadatos para el breadcrumb y título de la página de lista
        data: {
          title: 'Listado de Cotizaciones',
          breadcrumb: 'Lista'
        }
      },
      {
        // Ruta para crear nueva cotización (alternativa)
        path: 'crear',
        component: CotizacionesComponent,
        // Metadatos para el breadcrumb y título de la página de creación
        data: {
          title: 'Crear Cotización',
          breadcrumb: 'Crear Cotización'
        }
      },
      {
        // Ruta para editar una cotización existente
        // :id es un parámetro dinámico que representa el identificador de la cotización
        path: 'editar/:id',
        component: CotizacionesComponent,
        // Metadatos para el breadcrumb y título de la página de edición
        data: {
          title: 'Editar Cotización',
          breadcrumb: 'Editar Cotización'
        }
      },
      {
        // Ruta para ver detalles de una cotización
        // :id es un parámetro dinámico que representa el identificador de la cotización
        path: 'ver/:id',
        component: CotizacionesComponent,
        // Metadatos para el breadcrumb y título de la página de visualización
        data: {
          title: 'Ver Cotización',
          breadcrumb: 'Ver Cotización'
        }
      }
    ]
  }
];

// Decorador NgModule que define el módulo de rutas
@NgModule({
  // Importación de las rutas usando RouterModule.forChild() para módulos hijos
  imports: [RouterModule.forChild(routes)],
  // Exportación del RouterModule configurado para que esté disponible en otros módulos
  exports: [RouterModule]
})
// Definición de la clase del módulo de rutas de cotizaciones
export class CotizacionesRoutingModule { }

