import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';

// Componentes
import { VoiceSalesWizardComponent } from './voice-sales-wizard.component';

// Servicios
import { VoiceAgentSalesService } from '../../../services/voice-agent/voice-agent-sales.service';
import { VoiceSalesIntegrationService } from '../../../services/voice-agent/voice-sales-integration.service';

// Módulos compartidos
import { SharedModule } from '../../shared.module';

@NgModule({
  declarations: [
    VoiceSalesWizardComponent
  ],
  imports: [
    CommonModule,
    FormsModule,
    RouterModule,
    SharedModule
  ],
  exports: [
    VoiceSalesWizardComponent
  ],
  providers: [
    VoiceAgentSalesService,
    VoiceSalesIntegrationService
  ]
})
export class VoiceSalesWizardModule { }
