import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

// PrimeNG Modules
import { StepsModule } from 'primeng/steps';
import { CardModule } from 'primeng/card';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { InputTextareaModule } from 'primeng/inputtextarea';
import { DropdownModule } from 'primeng/dropdown';
import { CheckboxModule } from 'primeng/checkbox';
import { ChipModule } from 'primeng/chip';
import { TooltipModule } from 'primeng/tooltip';
import { ConfirmDialogModule } from 'primeng/confirmdialog';

// Routing
import { AgentBuilderRoutingModule } from './agent-builder-routing.module';

// Components
import { AgentBuilderComponent } from './agent-builder.component';
import { WizardComponent } from './wizard/wizard.component';
import { StepBasicInfoComponent } from './wizard/step-basic-info/step-basic-info.component';
import { StepPromptComponent } from './wizard/step-prompt/step-prompt.component';
import { StepToolsComponent } from './wizard/step-tools/step-tools.component';
import { StepReviewComponent } from './wizard/step-review/step-review.component';
import { LibraryComponent } from './library/library.component';
import { AgentCardComponent } from './library/agent-card/agent-card.component';
import { ExecutorComponent } from './executor/executor.component';
import { MessageBubbleComponent } from './executor/components/message-bubble/message-bubble.component';

@NgModule({
  declarations: [
    AgentBuilderComponent,
    WizardComponent,
    StepBasicInfoComponent,
    StepPromptComponent,
    StepToolsComponent,
    StepReviewComponent,
    LibraryComponent,
    AgentCardComponent,
    ExecutorComponent,
    MessageBubbleComponent
  ],
  imports: [
    CommonModule,
    FormsModule,
    AgentBuilderRoutingModule,
    // PrimeNG
    StepsModule,
    CardModule,
    ButtonModule,
    InputTextModule,
    InputTextareaModule,
    DropdownModule,
    CheckboxModule,
    ChipModule,
    TooltipModule,
    ConfirmDialogModule
  ]
})
export class AgentBuilderModule { }
