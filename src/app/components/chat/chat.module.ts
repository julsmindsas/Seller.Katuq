import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { PickerModule } from '@ctrl/ngx-emoji-mart';
import { EmojiModule } from '@ctrl/ngx-emoji-mart/ngx-emoji';
import { SharedModule } from '../../shared/shared.module';
import { MarkdownPipe } from '../../shared/pipes/markdown.pipe';
import { ChatRoutingModule } from './chat-routing.module';
import { ChatComponent } from './chat/chat.component';

// import { ChatComponent } from './chat/chat.component';

@NgModule({
  declarations: [MarkdownPipe],
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    ChatRoutingModule,
    PickerModule,
    EmojiModule,
    SharedModule
  ],
  exports: [MarkdownPipe]
})
export class ChatModule { }
