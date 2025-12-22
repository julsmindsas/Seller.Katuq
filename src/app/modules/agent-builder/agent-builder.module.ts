import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

// Pipes
import { SafeHtmlPipe } from '../../shared/pipes/safe-html.pipe';

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
import { TabViewModule } from 'primeng/tabview';
import { ProgressBarModule } from 'primeng/progressbar';
import { SelectButtonModule } from 'primeng/selectbutton';
import { MessagesModule } from 'primeng/messages';
import { MessageModule } from 'primeng/message';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { MenuModule } from 'primeng/menu';

// Routing
import { AgentBuilderRoutingModule } from './agent-builder-routing.module';

// Components
import { AgentBuilderComponent } from './agent-builder.component';
import { GeneralChatComponent } from './general-chat/general-chat.component';
import { WizardComponent } from './wizard/wizard.component';
import { StepBasicInfoComponent } from './wizard/step-basic-info/step-basic-info.component';
import { StepPromptComponent } from './wizard/step-prompt/step-prompt.component';
import { StepToolsComponent } from './wizard/step-tools/step-tools.component';
import { StepReviewComponent } from './wizard/step-review/step-review.component';
import { LibraryComponent } from './library/library.component';
import { AgentCardComponent } from './library/agent-card/agent-card.component';
import { ChatAguiComponent } from './chat-agui/chat-agui.component';

import { A2aMonitorComponent } from './monitoring/a2a-monitor.component';

// Standalone Components
import { ArtifactRendererComponent } from './chat-agui/artifact-renderer/artifact-renderer.component';

@NgModule({
  declarations: [
    AgentBuilderComponent,
    GeneralChatComponent,
    ChatAguiComponent,
    WizardComponent,
    StepBasicInfoComponent,
    StepPromptComponent,
    StepToolsComponent,
    StepReviewComponent,
    LibraryComponent,
    AgentCardComponent,

    A2aMonitorComponent,
    SafeHtmlPipe
  ],
  imports: [
    CommonModule,
    FormsModule,
    AgentBuilderRoutingModule,
    // Standalone Components
    ArtifactRendererComponent,
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
    ConfirmDialogModule,
    TabViewModule,
    ProgressBarModule,
    SelectButtonModule,
    MessagesModule,
    MessageModule,
    ProgressSpinnerModule,
    MenuModule
  ]
})
export class AgentBuilderModule { }
