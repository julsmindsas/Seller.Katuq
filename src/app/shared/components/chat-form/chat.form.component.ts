import { Component } from '@angular/core';

@Component({
  selector: 'app-chat-form',
  templateUrl: './chat-form.component.html',
  styleUrls: ['./chat-form.component.scss']
})
export class ChatFormComponent {
  sendMessage() {
    // Lógica para enviar el mensaje
    console.log('Mensaje enviado');
  }
}
