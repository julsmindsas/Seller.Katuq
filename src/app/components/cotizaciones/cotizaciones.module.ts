// Importación del decorador NgModule de Angular core
import { NgModule } from '@angular/core';
// Importación del módulo común de Angular que proporciona directivas básicas
import { CommonModule } from '@angular/common';
// Importación de módulos para manejo de formularios en Angular
import { FormsModule, ReactiveFormsModule } from '@angular/forms';

// Importaciones de módulos de PrimeNG (biblioteca de componentes UI)
// Módulo para tablas de datos
import { TableModule } from 'primeng/table';
// Módulo para botones estilizados
import { ButtonModule } from 'primeng/button';
// Módulo para campos de texto
import { InputTextModule } from 'primeng/inputtext';
// Módulo para selector de fechas
import { CalendarModule } from 'primeng/calendar';
// Módulo para menús desplegables
import { DropdownModule } from 'primeng/dropdown';
// Módulo para ventanas de diálogo
import { DialogModule } from 'primeng/dialog';
// Módulo para notificaciones toast
import { ToastModule } from 'primeng/toast';
// Módulo para diálogos de confirmación
import { ConfirmDialogModule } from 'primeng/confirmdialog';
// Módulo para tarjetas UI
import { CardModule } from 'primeng/card';
// Módulo para campos numéricos
import { InputNumberModule } from 'primeng/inputnumber';
// Módulo para áreas de texto
import { InputTextareaModule } from 'primeng/inputtextarea';
// Módulo para checkbox
import { CheckboxModule } from 'primeng/checkbox';
// Módulo para radio buttons
import { RadioButtonModule } from 'primeng/radiobutton';
// Módulo para divisores
import { DividerModule } from 'primeng/divider';
// Módulo para paneles
import { PanelModule } from 'primeng/panel';
// Módulo para tooltips
import { TooltipModule } from 'primeng/tooltip';
// Módulo para badges
import { BadgeModule } from 'primeng/badge';
// Módulo para chips
import { ChipModule } from 'primeng/chip';

// Importación del componente principal de cotizaciones
import { CotizacionesComponent } from './cotizaciones.component';
// Importación del componente de lista de cotizaciones
import { CotizacionesListaComponent } from './cotizaciones-lista/cotizaciones-lista.component';
// Importación del módulo de rutas de cotizaciones
import { CotizacionesRoutingModule } from './cotizaciones-routing.module';
// Importación del módulo compartido de la aplicación
import { SharedModule } from '../../shared/shared.module';
// Importación del módulo de ventas
import { VentasModule } from '../ventas/ventas.module';

// Decorador NgModule que define el módulo de cotizaciones
@NgModule({
  // Declaración de componentes que pertenecen a este módulo
  declarations: [
    CotizacionesComponent,
    CotizacionesListaComponent
  ],
  // Importación de módulos necesarios para este módulo
  imports: [
    CommonModule,                // Módulo común de Angular
    CotizacionesRoutingModule,   // Rutas del módulo
    FormsModule,                 // Soporte para formularios template-driven
    ReactiveFormsModule,         // Soporte para formularios reactivos
    SharedModule,                // Módulo compartido de la aplicación
    // Módulos de PrimeNG
    TableModule,                 // Para tablas
    ButtonModule,                // Para botones
    InputTextModule,             // Para campos de texto
    CalendarModule,              // Para calendario
    DropdownModule,              // Para desplegables
    DialogModule,                // Para diálogos
    ToastModule,                 // Para notificaciones
    ConfirmDialogModule,         // Para diálogos de confirmación
    CardModule,                  // Para tarjetas
    InputNumberModule,           // Para campos numéricos
    InputTextareaModule,         // Para áreas de texto
    CheckboxModule,              // Para checkbox
    RadioButtonModule,           // Para radio buttons
    DividerModule,               // Para divisores
    PanelModule,                 // Para paneles
    TooltipModule,               // Para tooltips
    BadgeModule,                 // Para badges
    ChipModule,                  // Para chips
    VentasModule                 // Para usar customer-section
  ],
  // Array de proveedores de servicios (actualmente vacío)
  providers: []
})
// Definición de la clase del módulo de cotizaciones
export class CotizacionesModule { }
