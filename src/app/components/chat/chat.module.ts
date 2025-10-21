import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { PickerModule } from '@ctrl/ngx-emoji-mart';
import { EmojiModule } from '@ctrl/ngx-emoji-mart/ngx-emoji';
import { SharedModule } from '../../shared/shared.module';
import { MarkdownPipe } from '../../shared/pipes/markdown.pipe';
import { ChatRoutingModule } from './chat-routing.module';

// PrimeNG Modules
import { ButtonModule } from 'primeng/button';
import { TooltipModule } from 'primeng/tooltip';
import { SkeletonModule } from 'primeng/skeleton';
import { BadgeModule } from 'primeng/badge';

@NgModule({
  declarations: [MarkdownPipe],
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    ChatRoutingModule,
    PickerModule,
    EmojiModule,
    SharedModule,
    // PrimeNG
    ButtonModule,
    TooltipModule,
    SkeletonModule,
    BadgeModule
  ],
  exports: [MarkdownPipe]
})
export class ChatModule { }
